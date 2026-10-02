# Infaan Web and Design — Tech Store Platform

A full-stack platform for selling web/design services, package subscriptions, and hireable SaaS systems (multi-tenant licensing) in Tanzania (TZS pricing).

## Stack

| Layer | Technology |
|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript |
| API | Route Handlers under `/api/**` with documented response contracts |
| Database | Prisma — SQLite locally (`prisma/dev.db`), PostgreSQL (Neon) in production (`prisma/schema.postgres.prisma`) |
| Auth | JWT Bearer (7-day access, 30-day refresh) + Google Sign-In (GIS) |
| Validation | Zod field builders + serializers (stable error bodies/wording) |
| Frontend | Original React SPA (`frontend/`), served client-side by `app/[[...path]]` |
| Tests | Vitest — 93 tests calling route handlers directly against a SQLite test DB |
| Deployment | One Vercel project serving UI + API together (`infaan-next/vercel.json`) |

## Quick start

```bash
cd infaan-next
npm install
npm run dev        # http://localhost:3000 (predev pushes the SQLite schema)
npm run db:seed    # 5 services / 16 packages / 40 prices / admin user (admin / Admin12345!)
npm test           # 93 tests
```

## Deploy (Vercel — one project for the whole system)

The entire system (SPA UI + API + Prisma) deploys as a single Vercel project:

1. Import the repo in Vercel → set **Root Directory** to `infaan-next` (Settings → General).
2. Framework preset: Next.js. Build command comes from `infaan-next/vercel.json`: `npm run build:prod`
   (postgres client `prisma generate` + `db push` + idempotent seed + `next build`). Region `iad1` (same as Neon).
3. Environment variables (Settings → Environment Variables):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon Postgres pooler URL (`postgresql://…?sslmode=require`) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -hex 64` each — **required** (the app refuses to run without them) |
| `JWT_ACCESS_LIFETIME` / `JWT_REFRESH_LIFETIME` | `7d` / `30d` (defaults; optional) |
| `CORS_ALLOWED_ORIGINS` | `https://<project>.vercel.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client id (browser) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth (server) |
| `SYSTEM_SUBSCRIPTION_API_URL` | `https://<project>.vercel.app/api` |

4. Deploy. Every push rebuilds; the seed is idempotent; health check: `GET /api/keepalive`.

## Repository layout

```
Web-App/
├── infaan-next/                 # THE app (Next.js full-stack)
│   ├── app/                     # layout + [[...path]] SPA catch-all + api/**/route.ts (42 endpoints)
│   ├── frontend/                # original React SPA (App.tsx, pages/, components/, styles.css)
│   ├── lib/                     # prisma, jwt, auth, api errors, serializers/, pagination
│   ├── prisma/                  # schema.prisma (sqlite) · schema.postgres.prisma · seed.ts
│   ├── scripts/                 # predev, smoke helpers
│   ├── vercel.json              # Vercel build config (Root Directory = infaan-next)
│   └── tests/                   # vitest suites (auth, users, catalog, subscriptions, orders, tenants)
└── docs/                        # ENDPOINTS.md · DECISIONS.md
```

## Scripts (in `infaan-next/`)

| Script | Purpose |
|---|---|
| `npm run dev` | dev server (auto `prisma db push` first) |
| `npm test` / `npm run test:watch` | Vitest suite |
| `npm run db:seed` | idempotent seed (5 services / 16 packages / 40 prices / admin) |
| `npm run db:generate` | regenerate the SQLite client (after `build:prod`) |
| `npm run build` | local build (sqlite client) |
| `npm run build:prod` | production build (postgres client + `db push` + seed + `next build`) |

## Documentation

- **[docs/ENDPOINTS.md](docs/ENDPOINTS.md)** — endpoint → route → test checklist for all 42 API routes.
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — architecture decisions, contract rules, and assumptions.


