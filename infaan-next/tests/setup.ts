import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach } from "vitest";

// --- load .env (Next loads it automatically; vitest needs a hand) ---
const envPath = path.resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

// Tests always run against a dedicated SQLite database.
process.env.DATABASE_URL = "file:./tests.db";

const globalState = globalThis as unknown as { __infaanTestDbReady?: boolean };

function ensureSchema() {
  if (globalState.__infaanTestDbReady) return;
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "pipe",
    env: { ...process.env },
  });
  globalState.__infaanTestDbReady = true;
}

beforeAll(() => {
  ensureSchema();
});

beforeEach(async () => {
  // import lazily so the client picks up DATABASE_URL set above
  const { prisma } = await import("@/lib/prisma");
  const order = [
    "catalog_tenantservicefeatureaccess",
    "catalog_tenantserviceadmin",
    "catalog_tenantservice",
    "catalog_tenant",
    "catalog_packagesubscriptionorder",
    "catalog_systemsubscriptionorder",
    "catalog_subscription",
    "catalog_portfolioitem",
    "catalog_packageprice",
    "catalog_subscriptionsystem",
    "catalog_servicepackage",
    "catalog_service",
    "accounts_customuser",
  ];
  for (const table of order) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});
