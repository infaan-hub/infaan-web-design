// Migrates a Django database (SQLite file or Postgres) into the Prisma database.
//
//   npm run db:migrate-django
//   MIGRATE_SOURCE_URL="file:../Backend/db.sqlite3"   (default)
//   MIGRATE_SOURCE_URL="postgresql://user:pass@host/db"
//
// Target = DATABASE_URL + the currently generated Prisma client, so:
//   - local dev: sqlite client (default) -> dev.db
//   - prod cutover: run `prisma generate --schema prisma/schema.postgres.prisma`
//     and point DATABASE_URL at the Neon database.
//
// Model/table/field metadata is parsed from prisma/schema.prisma so the script
// stays in sync with schema changes. Rows keep their Django primary keys;
// existing rows are upserted. Insert order follows FK dependencies.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";

type Field = { name: string; col: string; type: string; required: boolean };
type ModelMeta = { model: string; table: string; fields: Field[] };

const SCALAR_TYPES = ["String", "Int", "Boolean", "DateTime", "Json", "Decimal", "Float"];

function parseSchema(path: string): ModelMeta[] {
  const text = readFileSync(path, "utf8");
  const out: ModelMeta[] = [];
  for (const m of text.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, model, body] = m;
    const mapMatch = body.match(/@@map\("([^"]+)"\)/);
    const table = mapMatch ? mapMatch[1] : model;
    const fields: Field[] = [];
    for (const line of body.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("//") || t.startsWith("@@") || t.includes("@relation")) continue;
      const fm = t.match(/^(\w+)\s+(\w+)(\?)?(?:\s|$)/);
      if (!fm || !SCALAR_TYPES.includes(fm[2])) continue;
      const colm = t.match(/@map\("([^"]+)"\)/);
      fields.push({ name: fm[1], col: colm ? colm[1] : fm[1], type: fm[2], required: !fm[3] });
    }
    out.push({ model, table, fields });
  }
  return out;
}

// FK-safe parent-before-child order (matches schema order).
const ORDER = [
  "User",
  "Service",
  "ServicePackage",
  "PackagePrice",
  "PortfolioItem",
  "SubscriptionSystem",
  "Tenant",
  "Subscription",
  "PackageSubscriptionOrder",
  "SystemSubscriptionOrder",
  "TenantService",
  "TenantServiceAdmin",
  "TenantServiceFeatureAccess",
];

function toIso(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  let s = String(value);
  if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
  s = s.replace(/\.(\d{3})\d*/, ".$1");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    console.warn(`[migrate] unparsable datetime: ${String(value)}`);
    return null;
  }
  return d;
}

function convert(value: unknown, type: string): unknown {
  if (value === null || value === undefined) return null;
  switch (type) {
    case "Boolean":
      if (typeof value === "boolean") return value;
      return value === 1 || value === "1" || value === "t" || value === "true";
    case "Int":
      return typeof value === "number" ? value : Number(value);
    case "DateTime":
      return toIso(value);
    case "Json":
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    case "Decimal":
      return String(value);
    default:
      return value;
  }
}

type Source = {
  tables: Set<string>;
  selectAll: (table: string) => Promise<Record<string, unknown>[]>;
  close: () => Promise<void>;
};

async function openSource(url: string): Promise<Source> {
  if (url.startsWith("postgres")) {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    return {
      tables: new Set(res.rows.map((r: any) => r.table_name)),
      selectAll: async (table) => (await client.query(`SELECT * FROM "${table}"`)).rows,
      close: () => client.end(),
    };
  }
  const file = url.replace(/^file:/, "");
  const abs = resolve(process.cwd(), file);
  if (!existsSync(abs)) {
    throw new Error(
      `[migrate] source not found: ${abs}\n` +
        `Set MIGRATE_SOURCE_URL to a Django database (file:./dump.sqlite3 or postgresql://...).`
    );
  }
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(abs, { readonly: true });
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as { name: string }[];
  return {
    tables: new Set(rows.map((r) => r.name)),
    selectAll: async (table) => db.prepare(`SELECT * FROM "${table}"`).all() as any[],
    close: async () => db.close(),
  };
}

async function main() {
  const sourceUrl = process.env.MIGRATE_SOURCE_URL || "file:../Backend/db.sqlite3";
  const models = parseSchema(resolve(process.cwd(), "prisma/schema.prisma"));
  const byModel = new Map(models.map((m) => [m.model, m]));
  const source = await openSource(sourceUrl);
  console.log(`[migrate] source: ${sourceUrl}`);

  let total = 0;
  for (const modelName of ORDER) {
    const meta = byModel.get(modelName);
    if (!meta) {
      console.warn(`[migrate] model ${modelName} not found in schema, skipping`);
      continue;
    }
    if (!source.tables.has(meta.table)) {
      console.warn(`[migrate] table ${meta.table} missing in source, skipping`);
      continue;
    }
    const rawRows = await source.selectAll(meta.table);
    const delegate = (prisma as any)[modelName[0].toLowerCase() + modelName.slice(1)];
    let count = 0;
    for (const raw of rawRows) {
      const row: Record<string, unknown> = {};
      for (const f of meta.fields) {
        if (!(f.col in raw)) {
          if (f.required) console.warn(`[migrate] ${meta.table}.${f.col} missing in source`);
          continue;
        }
        row[f.name] = convert(raw[f.col], f.type);
      }
      if (typeof row.id !== "number") row.id = Number(row.id);
      await delegate.upsert({ where: { id: row.id }, update: row, create: row });
      count += 1;
    }
    total += count;
    console.log(`[migrate] ${meta.table}: ${count} rows`);
  }

  await source.close();
  console.log(`[migrate] done - ${total} rows migrated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
