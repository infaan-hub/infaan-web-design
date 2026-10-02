# Infaan Web and Design — Tech Store Platform

A full-stack platform for selling web/design services, package subscriptions, and hireable SaaS systems (multi-tenant licensing) in Tanzania (TZS pricing).

## Stack

| Layer | Technology |
|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript |
| API | Route Handlers under `/api/**` (Django REST Framework-compatible responses) |
| Database | Prisma — SQLite locally (`prisma/dev.db`), PostgreSQL (Neon) in production (`prisma/schema.postgres.prisma`) |
| Auth | JWT Bearer (7-day access, 30-day refresh) + Google Sign-In (GIS) |
| Validation | Zod mirrors of the DRF serializers (identical error bodies/wording) |
| Frontend | Original React SPA (`frontend/`), served client-side by `app/[[...path]]` |
| Tests | Vitest — 93 tests calling route handlers directly against a SQLite test DB |
| Deployment | Single Node web service on Render; CI keepalive pings `/api/keepalive` every 5 min |

## Quick start

```bash
cd infaan-next
npm install
npm run dev        # http://localhost:3000 (predev pushes the SQLite schema)
npm run db:seed    # 5 services / 16 packages / 40 prices / admin user (admin / Admin12345!)
npm test           # 93 tests
```

## Repository layout

```
Web-App/
├── infaan-next/                 # THE app (Next.js full-stack)
│   ├── app/                     # layout + [[...path]] SPA catch-all + api/**/route.ts (42 endpoints)
│   ├── frontend/                # original React SPA (App.jsx, pages/, components/, styles.css)
│   ├── lib/                     # prisma, jwt, auth, drf-compatible errors, serializers/, pagination
│   ├── prisma/                  # schema.prisma (sqlite) · schema.postgres.prisma · seed.ts
│   ├── scripts/                 # predev, migrate-django-db (sqlite|postgres source)
│   └── tests/                   # vitest suites (auth, users, catalog, subscriptions, orders, tenants)
├── docs/                        # ARCHITECTURE.md · API.md · MODELS.md · MIGRATION.md
├── render.yaml                  # single Node service (Render)
└── build.sh / start.sh          # wrappers into infaan-next/
```

## Scripts (in `infaan-next/`)

| Script | Purpose |
|---|---|
| `npm run dev` | dev server (auto `prisma db push` first) |
| `npm test` / `npm run test:watch` | Vitest suite |
| `npm run db:seed` | idempotent seed (mirrors Django `seed_infaan_data`) |
| `npm run db:generate` | regenerate the SQLite client (after `build:prod`) |
| `npm run db:migrate-django` | copy rows from a Django DB (`MIGRATE_SOURCE_URL=file:…` or `postgresql://…`) |
| `npm run build` | local build (sqlite client) |
| `npm run build:prod` | production build (postgres client + `db push` + seed + `next build`) |

## Documentation

- **[docs/MIGRATION.md](docs/MIGRATION.md)** — Django→Next migration: endpoint→route→test checklist, decisions & assumptions.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — system components, auth/checkout/licensing flows (Django-era topology notes superseded by MIGRATION.md).
- **[docs/API.md](docs/API.md)** — REST API reference (paths/methods unchanged in the port).
- **[docs/MODELS.md](docs/MODELS.md)** — data-model reference (table names unchanged; Prisma `@@map` matches Django).
