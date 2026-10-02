# System Architecture

Infaan Web and Design is a two-tier web application: a Django REST backend serving a JSON API under `/api/`, and a React SPA that owns all client-side routing, state, and network I/O.

## 1. High-level diagram

```
┌──────────────────────────────┐        ┌───────────────────────────────────┐
│  React SPA (Vercel)          │        │  Django API (Render)              │
│  Frontend/src/App.jsx        │  HTTPS  │  infaan_backend (single URLconf)  │
│  · hand-rolled History router│ ─────► │  · SimpleJWT auth (Bearer)        │
│  · fetch + 401-refresh retry │  JSON  │  · accounts app (users/auth)      │
│  · ~55 useState slices       │        │  · catalog app (commerce/licensing)│
│  · localStorage persistence  │ ◄───── │  · WhiteNoise static + CORS       │
└──────────────────────────────┘        └──────────────┬────────────────────┘
        │  Google GIS popup                             │
        ▼                                               ▼
┌──────────────────┐                        ┌────────────────────────┐
│ Google OAuth 2.0 │                        │ PostgreSQL (Neon)      │
│ (code flow)      │                        │ or local SQLite        │
└──────────────────┘                        └────────────────────────┘
                                                      ▲
        ┌─────────────────────────────────────────────┘
        │  license_key / api_key / api_secret (machine auth)
┌───────┴──────────────────────────────┐
│ Customer-deployed tenant systems     │  POST /api/license/validate/
│ (Django/WordPress/custom sites)      │  POST /api/subscription/status/
│ polling heartbeats every N minutes   │  POST /api/heartbeat/, /api/features/
└──────────────────────────────────────┘
```

## 2. Backend (`Backend/`)

**Project:** `infaan_backend` — settings at `infaan_backend/settings.py`, all routes in `infaan_backend/urls.py` (there are no per-app `urls.py`).

### Installed apps
- Django core (admin, auth, sessions, messages, staticfiles)
- `corsheaders`, `rest_framework`
- `accounts` — custom user model + authentication
- `catalog` — commerce, subscriptions, multi-tenant licensing

### Middleware order (settings.py:42)
1. `SecurityMiddleware`
2. `WhiteNoiseMiddleware` — compressed manifest static files
3. `CorsMiddleware`
4. `infaan_backend.middleware.ApiCorsFallbackMiddleware` — custom: manually answers `OPTIONS` preflights on `/api/*` and re-applies CORS headers when the origin matches the allow-list
5. Session, Common, CSRF, Auth, Messages, XFrameOptions

### REST framework config
- **Auth:** `JWTAuthentication` (Bearer) → `SessionAuthentication` fallback
- **Default permission:** `AllowAny` — every endpoint opts in explicitly
- **Pagination:** `PageNumberPagination`, `PAGE_SIZE = 20`
- **JWT lifetimes:** access 7 days, refresh 30 days; `AUTH_HEADER_TYPES = ("Bearer",)`

### Settings / env
- `.env` loaded via `python-dotenv`; helpers `env_bool()` / `env_list()`
- DB: `DATABASE_URL` (Postgres via `dj_database_url`, `conn_max_age=600`) else `db.sqlite3`
- `AUTH_USER_MODEL = "accounts.CustomUser"`; `TIME_ZONE = "Africa/Nairobi"`, `USE_TZ = True`
- `DEBUG` defaults **False**; fallback `SECRET_KEY` exists when env unset (dev-only risk)
- CORS: allow-list defaults to `localhost:5173`, `CORS_ALLOW_CREDENTIALS = True`
- `SYSTEM_SUBSCRIPTION_API_URL` — base URL used when calling back into self
- Google OAuth: `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
- Email: `EMAIL_BACKEND` from env (console default); SMTP host/user/password are hard-coded empty — the `EMAIL_HOST*` values in `.env.example` are currently not read

### Apps in brief
- **accounts:** `CustomUser(AbstractUser)` with `email` (unique), `role` (`admin`|`customer`), `phone_number`; `save()` forces `is_staff` from role/superuser. Views: register, admin-register, login (username or email), Google login, JWT refresh, `me`, `UserViewSet` (admin-only CRUD). Permission class `IsAdminUserRole`.
- **catalog:** 13 models (see [MODELS.md](MODELS.md)) covering services → packages → prices, portfolio, hireable subscription systems, three near-identical subscription/order lifecycles, and tenant provisioning (`Tenant`, `TenantService`, feature access, tenant admins). Permission class `IsAdminOrReadOnly`. Business logic such as `ensure_subscription_control_records()` runs inside serializers (not signals) to provision tenants/licenses when payment becomes `paid`.

## 3. Frontend (`Frontend/`)

### Structure
- **`src/App.jsx` (~1,670 lines)** is the system hub: hand-rolled History-API router, route guards, the entire fetch layer (`apiRequest` with one-shot 401→refresh→retry), Google login bootstrap, data loaders, admin CRUD handlers, and ~55 `useState` slices packaged into a single `app` object prop-drilled to every page.
- **`src/pages/`** — 23 presentational pages (public / customer / admin), zero direct HTTP calls.
- **`src/components/`** — `AppLayout` (role-aware sidebar/header, theme), hero animations (GSAP `BounceCards`, ogl `SpecularButton`), `AboutUsSection`.
- **`src/lib/`** — `paymentGateways.js`, `serviceCatalog.js`, `utils.js` (`cn`).
- No react-router, no axios, no Redux/Context/React Query — state lives in App + `localStorage` (keys prefixed `infaan_`).

### Routing & guards
- `/` → `/home`; unknown paths render `HomePage`.
- Customer paths (`/dashboard`, `/profile`, `/subscription`, `/package`, `/package-time`, `/system-subscription-time`, `/billing`, `/booking`, `/billing-history`) → `/login` when logged out; → `/admin-dashboard` if role ≠ customer.
- Admin paths (`/admin-dashboard`, `/admin/users`, `/admin-subscription`, `/system-control`, `/bookings-services`, `/booked-service`, `/booking-history`) → `/admin/login` when logged out; → `/dashboard` if role ≠ admin.
- Sidebar nav is defined in `components/AppLayout.jsx` and filtered by role/state.

### Auth handling
- Tokens in `localStorage`: `infaan_token`, `infaan_refresh_token`, `infaan_user`.
- Every request sends `Authorization: Bearer <access>`; on 401, `refreshAccessToken()` posts `/auth/refresh/`, stores the new access token, retries once; refresh failure clears auth state.
- Google: GIS `initCodeClient` popup → `POST /auth/google/` with `{ code, redirect_uri }` + `X-Requested-With: XmlHttpRequest`.

## 4. Core business flows

### A. Package checkout (services / logo-poster / maintenance…)
1. Home/Dashboard → `/package` (GET `/services/`, `/packages/`, `/prices/`) → select package
2. `/package-time` — pick billing period (weekly/monthly/yearly/per_task)
3. `/billing` — customer details + payment gateway (card/PayPal/Mixx), fee/total
4. `/booking` — `POST /api/package-subscriptions/checkout/` (auth required) → creates `PackageSubscriptionOrder` → receipt ticket (canvas JPEG download) with `control_details` when applicable
5. Admin approves payment / marks done via `PATCH /api/package-subscription-orders/{id}/`

### B. System subscription checkout (hireable SaaS systems)
1. `/system-subscription` → `/system-subscription-time` (yearly price only)
2. `/billing` → `/booking` — `POST /api/system-subscriptions/checkout/` → creates `SystemSubscriptionOrder`
3. When `payment_status = paid`, serializer logic (`ensure_system_order_control_records`) provisions `Tenant` + `TenantService` + license/API credentials + feature access + tenant admin records
4. Customer sees license key / API key / URLs on the receipt (`control_details`)

### C. Machine-to-machine licensing (tenant systems → platform)
Tenant systems authenticate with shared secrets (no JWT), all `AllowAny` at transport level:
- `POST /api/license/validate/` — `service_id` + `license_key` (+ optional `api_key`/`api_secret`/`domain`)
- `POST /api/subscription/status/` — active/grace-period status
- `POST /api/features/` — feature-flag check
- `POST /api/admin-access/` — tenant admin credential check
- `POST /api/heartbeat/` — stamps `TenantService.last_heartbeat_at`
- `GET /api/keepalive/` — health ping used by GitHub Actions every 5 minutes

### D. Lifecycle states
Order/subscription `status`: `pending → active → completed`, with `expired`, `suspended`, `grace_period`, `cancelled` branches; `payment_status`: `pending|paid`. Access logic (`can_access_service()`) allows active + 3-day grace period (`grace_period_days`, `next_billing_date`). The same lifecycle methods are duplicated across `Subscription`, `PackageSubscriptionOrder`, `SystemSubscriptionOrder`.

## 5. Deployment topology

| Piece | Where | Config |
|---|---|---|
| API | Render service `infaan-backend` | `rootDir: Backend`, build `./build.sh` (migrate → collectstatic → optional seed), start: gunicorn on `$PORT` (Procfile) |
| DB | Neon Postgres | `DATABASE_URL` env on Render |
| SPA | Vercel | `Frontend/vercel.json` SPA rewrites; `.env.production` points at Render API |
| Static | WhiteNoise | `STATIC_ROOT = staticfiles/` |
| Keepalive | GitHub Actions | `.github/workflows/keepalive.yml` — curl `/api/keepalive/` + frontend every 5 min (prevents Render cold-stop) |

Repo-root `build.sh` / `start.sh` simply delegate into `Backend/`.

## 6. Known architectural observations

- Single-URLconf backend; no signals, tasks (no Celery), tests, or OpenAPI schema.
- Role checks are string comparisons (`role == "admin"`) in two permission classes.
- `/api/auth/admin/register/` is `AllowAny` — it creates admin-role users.
- Machine endpoints rely on shared secrets over `AllowAny` views — fine for license checks, but secrets should rotate and never be logged.
- Frontend is a single-file state monolith; splitting `App.jsx` (router, api client, contexts) is the main refactor candidate.
- `ui/accordion.jsx` and `ui/tabs.jsx` import radix packages not in `package.json` (safe only because unused).
- Committed secrets: `Backend/.env.example` and `render.yaml` contain real-looking credentials — rotate and replace with placeholders.
