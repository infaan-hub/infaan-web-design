# API Reference

Base URL (prod): `https://infaan-web-design.onrender.com/api` · local: `http://127.0.0.1:8000/api`
Source of truth: `Backend/infaan_backend/urls.py`.

**Conventions**
- JSON in/out; trailing slashes on every route (DRF `DefaultRouter`).
- Auth: `Authorization: Bearer <access_token>` (SimpleJWT; access 7 d, refresh 30 d).
- Default permission is `AllowAny`; each route below lists its actual requirement.
- Pagination: `?page=N`, 20 per page (`count`, `next`, `previous`, `results`).
- Errors: `{ "detail": ... }` or per-field `{ "field": ["msg"] }` / `non_field_errors`.
- Roles: `admin` and `customer` on `CustomUser.role`.

---

## 1. Authentication (`accounts`)

| Method | Path | Permission | Body / notes |
|---|---|---|---|
| POST | `/auth/register/` | AllowAny | `{username, first_name?, last_name?, email, phone_number?, password}` (min 8) → forces `role=customer` |
| POST | `/auth/admin/register/` | **AllowAny** | same shape → creates `role=admin` user |
| POST | `/auth/login/` | AllowAny | `{username \| email, password}` → `{access, refresh, user}` |
| POST | `/auth/google/` | AllowAny | `{code, redirect_uri}` + header `X-Requested-With: XmlHttpRequest`; customer-only, auto-creates user |
| POST | `/auth/refresh/` | AllowAny | `{refresh}` → `{access}` (SimpleJWT `TokenRefreshView`) |
| GET | `/auth/me/` | IsAuthenticated | current user profile |

**User object:** `{id, username, first_name, last_name, email, phone_number, role, is_active, is_staff}` (`is_staff` read-only).

## 2. Admin user management

| Method | Path | Permission |
|---|---|---|
| GET, POST | `/users/` | IsAuthenticated + role=admin |
| GET, PUT, PATCH, DELETE | `/users/{id}/` | IsAuthenticated + role=admin |

Write actions use `AdminUserSerializer`: `{username, email, role, is_active, password?}` (defaults to a placeholder password if omitted on create).

## 3. Catalog (read for everyone, write admin-only)

All of these use `IsAdminOrReadOnly`: anonymous/GET sees only active records; any write requires authenticated `role=admin`.

| Resource | Path | Notes |
|---|---|---|
| Services | `/services/` | `{name, category, short_description, details, is_active}`; categories: `logo_poster`, `website`, `system_subscription`, `digital_ads`, `maintenance` |
| Packages | `/packages/` | nested `prices[]`; `{tier, title, description, features[], payment_notes, is_active}`; tiers: `silver/gold/premium/extra`; unique per `(service, tier)`; soft-deletes when prices are referenced by orders |
| Logo/poster packages | `/logo-poster-packages/` | same serializer, filtered to `category=logo_poster`, `per_task` prices only |
| Prices | `/prices/` | `{package, billing_period, amount, currency, is_default}`; periods: `weekly/monthly/yearly/per_task`; currency default `TZS` |
| Portfolio | `/portfolio-items/` | `{name, image_data (base64 text), service?, package?, is_active}` |
| Subscription systems | `/subscription-systems/` | hireable SaaS products; nested `packages`, `price_preview`; `gallery_images` limited to exactly 5 |

## 4. Checkout (authenticated)

| Method | Path | Permission | Body |
|---|---|---|---|
| POST | `/package-subscriptions/checkout/` | IsAuthenticated | package/price + customer details + `payment_contact` → creates `PackageSubscriptionOrder` → `{...order, control_details?}` |
| POST | `/system-subscriptions/checkout/` | IsAuthenticated | system + yearly price + details → creates `SystemSubscriptionOrder`; on `paid`, provisions `Tenant`/`TenantService` + credentials |

## 5. Orders & subscriptions (authenticated)

| Method | Path | Permission / scoping |
|---|---|---|
| GET, POST | `/subscriptions/` | IsAuthenticated; non-admin sees only own rows |
| GET, PUT, PATCH, DELETE | `/subscriptions/{id}/` | update/patch/delete admin-only |
| GET, POST | `/package-subscription-orders/` | same pattern (own rows; writes admin-only) |
| GET, PUT, PATCH, DELETE | `/package-subscription-orders/{id}/` | |
| GET, POST | `/system-subscription-orders/` | same pattern |
| GET, PUT, PATCH, DELETE | `/system-subscription-orders/{id}/` | |

**Order/subscription record:** `status` ∈ `pending|active|completed|expired|suspended|grace_period|cancelled`; `payment_status` ∈ `pending|paid`; plus `payment_method`, `payment_contact`, `amount`, `currency`, `start_date`, `end_date`, `next_billing_date`, `auto_renew`, `grace_period_days` (default 3), read-only `user_details`, `package_details`, `service_access`, `system_details`, `control_details`.

Admin actions used by the frontend: `PATCH` with `{end_date}`, suspend/cancel/block status changes, `{payment_status: "paid"}` (approve), `status: "completed"` (mark done).

## 6. Tenant / system control (admin)

| Method | Path | Permission |
|---|---|---|
| GET | `/tenants/` | IsAuthenticated + admin (read-only viewset) |
| GET | `/tenants/{id}/` | " |
| GET, POST | `/tenant-services/` | IsAuthenticated + admin |
| GET, PUT, PATCH, DELETE | `/tenant-services/{id}/` | " (list re-provisions control records for paid system orders; update stamps `connected_at`) |
| GET, POST | `/tenant-service-admins/` | IsAuthenticated + admin |
| GET, PUT, PATCH, DELETE | `/tenant-service-admins/{id}/` | " |

**TenantService fields:** `domain`, `public_url`, `admin_url`, `service_type` (`django_system|wordpress_site|custom_site|other`), `license_key`, `api_key`, `api_secret`, `connection_status` (`pending|active|inactive`), `is_enabled`, `last_heartbeat_at`, `connected_at`.

## 7. Machine-to-machine (tenant systems → platform)

All `AllowAny` at the transport layer; authenticated by shared secrets in the body. Optional `domain`/`api_key`/`api_secret` are cross-checked when supplied.

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/license/validate/` | `service_id`, `license_key` | verify license → `{valid, ...}` |
| POST | `/subscription/status/` | `service_id`, `license_key` | active/grace status for the licensed system |
| POST | `/features/` | `service_id`, `license_key`, `feature_code`? | feature-flag access check |
| POST | `/admin-access/` | `service_id`, `license_key`, `user_identifier` | tenant admin credential check |
| POST | `/heartbeat/` | `service_id`, `license_key` | stamps `last_heartbeat_at` → `{status:"ok"}` |
| GET | `/keepalive/` | — | health check `{status:"ok"}` (polled every 5 min by CI) |

## 8. Misc

| Method | Path | Notes |
|---|---|---|
| GET | `/` | DRF API root listing |
| * | `/admin/` | Django admin (staff/superuser session) |

---

### Frontend → endpoint map (summary)

| Frontend area | Endpoints |
|---|---|
| Login/Register/Google | `POST /auth/login/`, `/auth/register/`, `/auth/admin/register/`, `/auth/google/`, `/auth/refresh/`, `GET /auth/me/` |
| Catalog loads | `GET /services/`, `/packages/`, `/prices/`, `/portfolio-items/`, `/subscription-systems/` |
| Checkout/receipt | `POST /package-subscriptions/checkout/` or `/system-subscriptions/checkout/`, `GET /{package\|system}-subscription-orders/{id}/` |
| Customer lists | `GET /subscriptions/`, `/package-subscription-orders/`, `/system-subscription-orders/` |
| Admin CRUD | `POST/PUT/DELETE /services/`, `/packages/`, `/logo-poster-packages/`, `/portfolio-items/`, `/subscription-systems/`, `/users/` |
| Admin moderation | `PATCH/DELETE /users/{id}/`, `PATCH` any of the three order routes, `PATCH/DELETE /tenant-services/{id}/` |
| System control page | `GET /tenants/`, `GET /tenant-services/` |
