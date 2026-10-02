# Migration: Django + React → Next.js

Single Next.js project in `infaan-next/` replacing `Backend/` (Django) and `Frontend/` (Vite/React SPA).

- **Runtime**: Next.js 16 (App Router), React 19, TypeScript.
- **API**: Route Handlers under `app/api/**/route.ts`, all Django paths preserved (incl. trailing slashes via `skipTrailingSlashRedirect`).
- **DB**: Prisma — `prisma/schema.prisma` (SQLite, dev/tests), `prisma/schema.postgres.prisma` (PostgreSQL, prod).
- **Auth**: JWT Bearer (7d access / 30d refresh), bcrypt hashing with legacy Django pbkdf2 verification.
- **Validation**: Zod mirrors of DRF serializers (identical error bodies/wording).
- **Frontend**: the original SPA copied to `infaan-next/frontend/` verbatim (single edit: `API_BASE`), served by `app/[[...path]]/page.jsx` with `ssr: false`.

## 1. Endpoint → route → test checklist

Legend: gate = permission applied to **unmapped** methods (runs before 405, like DRF); mapped methods enforce their own permission inside the handler.

### Auth (`app/api/auth/**`) — no gate (405s have no permission layer, matching DRF)

| Endpoint | Methods | Route file | Tests (auth.test.ts, 18) |
|---|---|---|---|
| POST `/api/auth/register/` | POST | auth/register | creates customer + tokens; password min length; blank username/invalid email; unique username/email |
| POST `/api/auth/login/` | POST | auth/login | username+email login; `non_field_errors` (incl. inactive); required/blank; legacy pbkdf2 rehash |
| POST `/api/auth/refresh/` | POST | auth/refresh | new access token; bad token/field validation |
| GET `/api/auth/me/` | GET (gate requireUser) | auth/me | 401 wording; valid token payload; invalid/wrong-type tokens |
| POST `/api/auth/admin/register/` | POST | auth/admin/register | admin creation (role + is_staff) |
| POST `/api/auth/google/` | POST | auth/google | X-Requested-With required; missing config; code/redirect_uri |
| any other method on the above | — | same files | `methodNotAllowed` → DRF 405 wording |

### Admin users (`app/api/users/**`) — gate requireAdmin

| Endpoint | Methods | Route file | Tests (users.test.ts, 13) |
|---|---|---|---|
| GET/POST `/api/users/` | GET, POST | users | 401/403/admin 200; DRF pagination; AdminUserSerializer create (customer/admin); unique + role choice |
| GET/PUT/PATCH/DELETE `/api/users/{id}/` | GET, PUT, PATCH, DELETE | users/[id] | detail shape; 404s; PUT full replace + defaults; PATCH role→is_staff + collisions; DELETE 204/404; 405 |

### Catalog (IsAdminOrReadOnly: anon reads only active rows; writes need admin) — gate requireAdminOrReadOnly

| Endpoint | Methods | Route file | Tests |
|---|---|---|---|
| GET/POST `/api/services/` | GET, POST | services | catalog.test.ts (20): anon read; 401/403 writes; gate-before-405; POST shape +03:00; field errors; detail 404s; PUT/PATCH; DELETE |
| GET/PUT/PATCH/DELETE `/api/services/{id}/` | GET, PUT, PATCH, DELETE | services/[id] | "services CRUD" |
| GET/POST `/api/packages/` | GET, POST | packages | nested prices create; price errors; tier conflict; inactive (service,tier) reactivation; PUT/PATCH prices sync; DELETE soft/hard |
| GET/PUT/PATCH/DELETE `/api/packages/{id}/` | GET, PUT, PATCH, DELETE | packages/[id] | "packages" |
| GET/POST `/api/prices/` | GET, POST | prices | POST → 500 (read-only `package` + NOT NULL); GET ordered + decimalOut |
| GET/PUT/PATCH/DELETE `/api/prices/{id}/` | GET, PUT, PATCH, DELETE | prices/[id] | PUT billing_period required; PATCH decimal; DELETE 204 / PROTECT→500 |
| GET/POST `/api/logo-poster-packages/` | GET, POST | logo-poster-packages | category gate, per_task-only prices, forced logo serializer, restricted queryset |
| GET/PUT/PATCH/DELETE `/api/logo-poster-packages/{id}/` | GET, PUT, PATCH, DELETE | logo-poster-packages/[id] | logo detail/list queryset |
| GET/POST `/api/portfolio-items/` | GET, POST | portfolio-items | catalog-systems.test.ts (9): null relations omit keys; nested names; invalid pk; visibility; PATCH clears |
| GET/PUT/PATCH/DELETE `/api/portfolio-items/{id}/` | GET, PUT, PATCH, DELETE | portfolio-items/[id] | detail 404s; PUT required name/image_data |
| GET/POST `/api/subscription-systems/` | GET, POST | subscription-systems | system category gate; gallery=5/URLs/decimal/currency; non-list gallery char-iteration |
| GET/PUT/PATCH/DELETE `/api/subscription-systems/{id}/` | GET, PUT, PATCH, DELETE | subscription-systems/[id] | list/detail nested packages; 404s; delete; PUT required fields |

### Subscriptions — gate requireUser (list/create any authenticated; detail writes admin)

| Endpoint | Methods | Route file | Tests (subscriptions.test.ts, 12) |
|---|---|---|---|
| GET/POST `/api/subscriptions/` | GET, POST | subscriptions | 401 + WWW-Authenticate; pagination; field errors (pk/choice/email/int/date/decimal); availability + system object checks; pending defaults; paid window; paid+system provisioning; ordering + scoping; DELETE-on-list 405 |
| GET/PUT/PATCH/DELETE `/api/subscriptions/{id}/` | GET, PUT, PATCH, DELETE | subscriptions/[id] | detail scoping 404s; PATCH flip-to-paid + terminal statuses; PUT full replace + defaults; DELETE non-admin 403 / admin 204 / repeat 404 |

### Orders — gate requireUser (list/create any authenticated; detail writes admin)

| Endpoint | Methods | Route file | Tests (orders-checkouts.test.ts, 9) |
|---|---|---|---|
| GET/POST `/api/package-subscription-orders/` | GET, POST | package-subscription-orders | user writable; no availability check; no window side effect; required fields; scoping + ordering |
| GET/PUT/PATCH/DELETE `/api/package-subscription-orders/{id}/` | GET, PUT, PATCH, DELETE | package-subscription-orders/[id] | scoping 404; admin PUT full fields; DELETE 204 |
| GET/POST `/api/system-subscription-orders/` | GET, POST | system-subscription-orders | subscription_system required; no active/match/yearly checks; list `record_type` + scoping |
| GET/PUT/PATCH/DELETE `/api/system-subscription-orders/{id}/` | GET, PUT, PATCH, DELETE | system-subscription-orders/[id] | model 404 message |

### Checkouts (IsAuthenticated) — gate requireUser

| Endpoint | Methods | Route file | Tests |
|---|---|---|---|
| POST `/api/package-subscriptions/checkout/` | POST | package-subscriptions/checkout | 401 anon; 405 GET + Allow; validation errors; `subscription_system` null/""/"null" accepted; pending/paid windows; **no** provisioning |
| POST `/api/system-subscriptions/checkout/` | POST | system-subscriptions/checkout | pk/inactive/mismatch/yearly validation (correct keys); yearly success → 201 + provisioning; non-yearly rejected |

### Tenants (admin only) — gate requireAdmin

| Endpoint | Methods | Route file | Tests (tenants-control.test.ts, 12) |
|---|---|---|---|
| GET `/api/tenants/` | GET | tenants | 401/403; POST → 405; nested services after provisioning |
| GET `/api/tenants/{id}/` | GET | tenants/[id] | detail scoping |
| GET/POST `/api/tenant-services/` | GET, POST | tenant-services | list re-provisions (ensure side effect); create validation; empty credentials → second create 500; `subscription_*` keys absent when unlinked |
| GET/PUT/PATCH/DELETE `/api/tenant-services/{id}/` | GET, PUT, PATCH, DELETE | tenant-services/[id] | connected_at side effect; 404 messages; PATCH/DELETE |
| GET/POST `/api/tenant-service-admins/` | GET, POST | tenant-service-admins | list shows provisioned admin; POST → 500 (FKs omitted by serializer, mirrors Django IntegrityError) |
| GET/PUT/PATCH/DELETE `/api/tenant-service-admins/{id}/` | GET, PUT, PATCH, DELETE | tenant-service-admins/[id] | PATCH; PUT requires user_identifier; DELETE 204 |

### Control endpoints (AllowAny — no auth)

| Endpoint | Methods | Route file | Tests (tenants-control.test.ts) |
|---|---|---|---|
| GET `/api/keepalive` | GET | keepalive | `{status:"ok"}`; POST → 405 + Allow |
| POST `/api/license/validate/` | POST | license/validate | 400 required; 404 unknown; 403 api_key/api_secret/domain; valid active response; inactive tenant → `allowed:false` |
| POST `/api/subscription/status/` | POST | subscription/status | same shape as license validate |
| POST `/api/features/` | POST | features | active + ordered feature list from provisioning |
| POST `/api/admin-access/` | POST | admin-access | active + admin rows |
| POST `/api/heartbeat/` | POST | heartbeat | timestamp updates; reactivates connection; fixed detail `Heartbeat received.` |

**Suite: 93 tests / 7 files (`npm test`), `npx tsc --noEmit` clean.**

## 2. Assumptions & decisions

1. **One project**: `infaan-next/` contains app + API + Prisma; `Backend/` and `Frontend/` removed at the end of migration. React SPA kept as-is under `frontend/` (one-line edit: `API_BASE = "/api"`; `VITE_GOOGLE_CLIENT_ID` → `NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
2. **SPA in Next**: `app/[[...path]]/page.jsx` renders the original App with `next/dynamic` `ssr:false` (SPA uses `window`/`localStorage` at module state level). Keeps routing/behavior pixel-identical; `/api/**` static routes take precedence over the catch-all.
3. **Dual Prisma schema**: dev/test use `prisma/schema.prisma` + SQLite (`prisma/dev.db`, `prisma/tests.db`); prod uses `prisma/schema.postgres.prisma` (identical models, `provider = "postgresql"`) — `npm run build:prod` generates the postgres client, pushes schema, seeds, then builds. **Run `npm run db:generate` afterwards to restore a dev client.**
4. **Deployment**: single Node web service on Render (`render.yaml`: `rootDir: infaan-next`, `healthCheckPath: /api/keepalive`). Neon `DATABASE_URL` kept (Prisma `@@map` names = Django table names, so existing data is intact). Vercel static service removed; `keepalive.yml` pings the one service. `build.sh`/`start.sh` are thin wrappers into `infaan-next/`.
5. **Tests**: Vitest calls route handlers directly with `NextRequest` (no HTTP server), one shared `tests.db`, `fileParallelism: false`, tables wiped per test. `call()` derives `{id}` from the URL.
6. **DRF parity rules** (all covered by tests): pagination `20/page` + absolute `next/prev` + `Invalid page.` 404; 405 `Method "X" not allowed.` + `Allow` (incl. HEAD/OPTIONS); 401 + `WWW-Authenticate: Bearer realm="api"`; 403 detail wording; login `non_field_errors`; per-field validation runs before object-level checks (error keys prove the ordering); permission checks run before method-not-allowed **for unmapped methods only** (gate), matching `APIView.dispatch`.
7. **Deliberate error-parity quirks** kept: `POST /api/prices/` → 500 (read-only `package` pk + NOT NULL), `POST /api/tenant-service-admins/` → 500 (serializer omits tenant/service FKs → Django IntegrityError), soft-delete on referenced packages.
8. **JWT/access lifetimes** unchanged (7d/30d, refresh returns `{access}`); passwords: new rows bcrypt (10 rounds), existing Django `pbkdf2_sha256$…` rows verify and rehash on login.
9. **Time zone**: `Africa/Nairobi` (+03:00 in serialized timestamps); date-only fields accept `YYYY-MM-DD` and basic `YYYYMMDD`, reject others with DRF's DateField message.
10. **Migration script** `npm run db:migrate-django`: reads either source — SQLite (`MIGRATE_SOURCE_URL=file:../Backend/db.sqlite3`, default) or Postgres (`postgresql://…`) — parses model/table/field metadata from `schema.prisma`, preserves Django primary keys, upserts in FK-safe order. Verified: 77 rows across 14 tables (bcrypt/pbkdf2 hashes, datetimes, FKs, JSON, license keys intact).
11. **Seed** `npm run db:seed` mirrors `seed_infaan_data.py` (5 services, 16 packages, 40 prices, `admin`/`Admin12345!`), idempotent; also runs inside `build:prod` (replaces `SEED_INFAAN_DATA=true`).
12. **CORS** stays on the same env names (`CORS_ALLOWED_ORIGINS`, `CORS_ALLOW_ALL_ORIGINS`) via `middleware.ts` (Next 16 labels it “Proxy”; it runs — verified `Access-Control-Allow-*` on live responses). Same-origin frontend means only the Render origin is needed.
13. **Trailing slashes**: `skipTrailingSlashRedirect: true` → Django-style `/api/…/` URLs work; the SPA calls `/api/…/` unchanged.
14. **First prod `db push` caution**: schema mirrors Django columns 1:1; if push reports drift, inspect before accepting data loss.
