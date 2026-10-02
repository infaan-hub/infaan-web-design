# API Endpoints → Routes → Tests

Single Next.js project in `infaan-next/`. The API lives in Route Handlers under `app/api/**/route.ts` (42 endpoints); trailing-slash URLs (`/api/…/`) work via `skipTrailingSlashRedirect`.

Legend: **gate** = permission applied to **unmapped** methods (runs before 405); mapped methods enforce their own permission inside the handler.

## 1. Endpoint → route → test checklist

### Auth (`app/api/auth/**`) — no gate (405s have no permission layer)

| Endpoint | Methods | Route file | Tests (auth.test.ts, 18) |
|---|---|---|---|
| POST `/api/auth/register/` | POST | auth/register | creates customer + tokens; password min length; blank username/invalid email; unique username/email |
| POST `/api/auth/login/` | POST | auth/login | username+email login; `non_field_errors` (incl. inactive); required/blank; legacy pbkdf2 rehash |
| POST `/api/auth/refresh/` | POST | auth/refresh | new access token; bad token/field validation |
| GET `/api/auth/me/` | GET (gate requireUser) | auth/me | 401 wording; valid token payload; invalid/wrong-type tokens |
| POST `/api/auth/admin/register/` | POST | auth/admin/register | admin creation (role + is_staff) |
| POST `/api/auth/google/` | POST | auth/google | X-Requested-With required; missing config; code/redirect_uri |
| any other method on the above | — | same files | `methodNotAllowed` → 405 wording |

### Admin users (`app/api/users/**`) — gate requireAdmin

| Endpoint | Methods | Route file | Tests (users.test.ts, 13) |
|---|---|---|---|
| GET/POST `/api/users/` | GET, POST | users | 401/403/admin 200; pagination; AdminUserSerializer create (customer/admin); unique + role choice |
| GET/PUT/PATCH/DELETE `/api/users/{id}/` | GET, PUT, PATCH, DELETE | users/[id] | detail shape; 404s; PUT full replace + defaults; PATCH role→is_staff + collisions; DELETE 204/404; 405 |

### Catalog (anon reads only active rows; writes need admin) — gate requireAdminOrReadOnly

| Endpoint | Methods | Route file | Tests |
|---|---|---|---|
| GET/POST `/api/services/` | GET, POST | services | catalog.test.ts (20): anon read; 401/403 writes; gate-before-405; POST shape +03:00; field errors; detail 404s; PUT/PATCH; DELETE |
| GET/PUT/PATCH/DELETE `/api/services/{id}/` | GET, PUT, PATCH, DELETE | services/[id] | "services CRUD" |
| GET/POST `/api/packages/` | GET, POST | packages | nested prices create; price errors; tier conflict; inactive (service,tier) reactivation; PUT/PATCH prices sync; DELETE soft/hard |
| GET/PUT/PATCH/DELETE `/api/packages/{id}/` | GET, PUT, PATCH, DELETE | packages/[id] | "packages" |
| GET/POST `/api/prices/` | GET, POST | prices | POST → 500 (read-only `package` + NOT NULL); GET ordered + decimalOut |
| GET/PUT/PATCH/DELETE `/api/prices/{id}/` | GET, PUT, PATCH, DELETE | prices/[id] | PUT billing_period required; PATCH decimal; DELETE 204 / referenced → 500 |
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
| GET/POST `/api/tenant-service-admins/` | GET, POST | tenant-service-admins | list shows provisioned admin; POST → 500 (serializer omits tenant/service FKs → NOT NULL violation) |
| GET/PUT/PATCH/DELETE `/api/tenant-service-admins/{id}/` | GET, PUT, PATCH, DELETE | tenant-service-admins/[id] | PATCH; PUT requires user_identifier; DELETE 204 |

### Control endpoints (no auth)

| Endpoint | Methods | Route file | Tests (tenants-control.test.ts) |
|---|---|---|---|
| GET `/api/keepalive` | GET | keepalive | `{status:"ok"}`; POST → 405 + Allow |
| POST `/api/license/validate/` | POST | license/validate | 400 required; 404 unknown; 403 api_key/api_secret/domain; valid active response; inactive tenant → `allowed:false` |
| POST `/api/subscription/status/` | POST | subscription/status | same shape as license validate |
| POST `/api/features/` | POST | features | active + ordered feature list from provisioning |
| POST `/api/admin-access/` | POST | admin-access | active + admin rows |
| POST `/api/heartbeat/` | POST | heartbeat | timestamp updates; reactivates connection; fixed detail `Heartbeat received.` |

**Suite: 93 tests / 7 files (`npm test`), `npx tsc --noEmit` clean.**
