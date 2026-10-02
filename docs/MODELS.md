# Data Models

Source: `Backend/accounts/models.py` (1 model) and `Backend/catalog/models.py` (1 abstract + 12 concrete). All catalog models inherit `TimeStampedModel` (`created_at` auto_now_add, `updated_at` auto_now) except where noted. Database: PostgreSQL (prod) / SQLite (local).

## Entity relationships (overview)

```
CustomUser ──< Subscription / PackageSubscriptionOrder / SystemSubscriptionOrder
     │                          │ PROTECT
     └─< Tenant                 ▼
           │              PackagePrice >── ServicePackage >── Service
           ├─< TenantService ──┬─ OneToOne Subscription (legacy)
           │                   ├─ OneToOne SystemSubscriptionOrder
           │                   ├─ FK SubscriptionSystem >── Service
           │                   └─< TenantServiceAdmin
           │                   └─< TenantServiceFeatureAccess
           └─< TenantServiceAdmin (tenant-level)

Service ─< SubscriptionSystem, ServicePackage ─< PackagePrice
Service/ServicePackage ──SET_NULL── PortfolioItem
```

---

## `accounts` app

### CustomUser (`AbstractUser`) — `accounts/models.py`
| Field | Type | Notes |
|---|---|---|
| (inherited) | | `username` unique, `password`, `first_name`, `last_name`, `is_staff`, `is_active`, `is_superuser`, `last_login`, `date_joined` |
| `email` | EmailField, **unique** | required login identifier alternative |
| `role` | CharField(20) | `choices`: `admin` \| `customer`; default `customer` |
| `phone_number` | CharField(30), blank | |

- `AUTH_USER_MODEL = "accounts.CustomUser"`.
- `save()` forces `is_staff = is_superuser or role == ADMIN`.
- `REQUIRED_FIELDS = ["email"]`; `__str__` = `"username (role)"`.
- Admin: `CustomUserAdmin` extends `UserAdmin` with an "Infaan Profile" fieldset.

> Historical: `EmailOTP` existed (migrations 0003/0004) and was removed.

---

## `catalog` app

### TimeStampedModel (abstract)
`created_at` (auto_now_add), `updated_at` (auto_now).

### Service
| Field | Type | Notes |
|---|---|---|
| `name` | CharField(120), unique | |
| `category` | CharField(30) | `logo_poster`, `website`, `system_subscription`, `digital_ads`, `maintenance` |
| `short_description` | CharField(255) | |
| `details` | TextField | |
| `is_active` | Boolean, default True | soft visibility toggle for anon users |

Ordering: `["name"]`. Reverse: `packages`, `portfolio_items`, `subscription_systems`.

### ServicePackage
| Field | Type | Notes |
|---|---|---|
| `service` | FK → Service, CASCADE, `related_name="packages"` | |
| `tier` | CharField(20) | `silver`, `gold`, `premium`, `extra` |
| `title` | CharField(150) | |
| `description` | TextField | |
| `features` | JSONField(list), blank | bullet feature list |
| `payment_notes` | CharField(255), blank | |
| `is_active` | Boolean, default True | |

`unique_together ("service", "tier")`; ordering `["service__name", "tier"]`.
`ServicePackageViewSet` soft-deletes (sets `is_active=False`) when prices are referenced by orders.

### PackagePrice
| Field | Type | Notes |
|---|---|---|
| `package` | FK → ServicePackage, CASCADE, `related_name="prices"` | |
| `billing_period` | CharField(20) | `weekly`, `monthly`, `yearly`, `per_task` |
| `amount` | Decimal(10,2) | |
| `currency` | CharField(10), default `TZS` | |
| `is_default` | Boolean, default False | seeds mark monthly/per_task as default |

`unique_together ("package", "billing_period", "currency")`. **PROTECT** from deletion by any order/subscription referencing it.

### PortfolioItem
| Field | Type | Notes |
|---|---|---|
| `service` | FK → Service, SET_NULL, null/blank, `related_name="portfolio_items"` | |
| `package` | FK → ServicePackage, SET_NULL, null/blank | |
| `name` | CharField(150) | |
| `image_data` | TextField | base64 image payload |
| `is_active` | Boolean, default True | |

### SubscriptionSystem (hireable SaaS product)
| Field | Type | Notes |
|---|---|---|
| `service` | FK → Service, CASCADE, `related_name="subscription_systems"` | |
| `name` | CharField(150) | |
| `summary` | CharField(255) | |
| `details` | TextField, blank | |
| `system_url`, `admin_url` | URLField, blank | demo/production links |
| `display_price` | Decimal(10,2), null | marketing price |
| `display_price_currency` | CharField(10), default `TZS` | |
| `cover_image` | TextField | base64 |
| `gallery_images` | JSONField(list) | API enforces exactly 5 images |
| `is_active` | Boolean, default True | |

Ordering `["service__name", "name"]`. Destroy nulls `subscriptions.subscription_system`.

### Tenant
| Field | Type | Notes |
|---|---|---|
| `owner` | FK → CustomUser, CASCADE, `related_name="tenants"` | customer who bought the system |
| `business_name` | CharField(150) | |
| `status` | CharField(20) | `pending`, `active`, `inactive`, `suspended`; default `pending` |

Ordering `["business_name", "id"]`.

### TenantService (a deployed/licensed instance)
| Field | Type | Notes |
|---|---|---|
| `tenant` | FK → Tenant, CASCADE, `related_name="services"` | |
| `subscription` | **OneToOne** → Subscription, CASCADE, null, `related_name="tenant_service"` | legacy link |
| `system_order` | **OneToOne** → SystemSubscriptionOrder, CASCADE, null, `related_name="tenant_service"` | primary link |
| `subscription_system` | FK → SubscriptionSystem, SET_NULL, null | which product |
| `name` | CharField(150) | |
| `service_type` | CharField(30) | `django_system`, `wordpress_site`, `custom_site`, `other` |
| `domain` | CharField(255), blank | |
| `public_url`, `admin_url` | URLField, blank | |
| `license_key` | CharField(64), **unique** | `LIC-` + 16 hex (see below) |
| `api_key` | CharField(64), **unique** | `API-` + 20 hex |
| `api_secret` | CharField(64) | 48 hex |
| `connection_status` | CharField(20) | `pending`, `active`, `inactive` |
| `is_enabled` | Boolean, default True | |
| `last_heartbeat_at` | DateTime, null | stamped by `POST /api/heartbeat/` |
| `connected_at` | DateTime, null | stamped on admin update |

Statics: `build_license_key()` → `LIC-{token_hex(8).upper()}`, `build_api_key()` → `API-{token_hex(10).upper()}`, `build_api_secret()` → `token_hex(24)`, `issue_credentials()` bundles all three.
`is_subscription_active()` requires: paid linked order + `tenant.status == active` + effective status active/grace + `connection_status == active` + `is_enabled`.

### TenantServiceAdmin
| Field | Type | Notes |
|---|---|---|
| `tenant` | FK → Tenant, CASCADE, `related_name="service_admins"` | |
| `service` | FK → TenantService, CASCADE, `related_name="admins"` | |
| `user_identifier` | CharField(150) | login id on the tenant system |
| `role` | CharField(60), default `"admin"` | |
| `is_active` | Boolean, default True | |

`unique_together ("service", "user_identifier")`.

### TenantServiceFeatureAccess
| Field | Type | Notes |
|---|---|---|
| `service` | FK → TenantService, CASCADE, `related_name="feature_access"` | |
| `feature_code` | CharField(120) | checked by `POST /api/features/` |
| `enabled` | Boolean, default True | |

`unique_together ("service", "feature_code")`.

---

## Subscription / order lifecycles

The three classes below are **near-identical copies** of the same lifecycle logic (they do not share a base class).

### Subscription
| Field | Type | Notes |
|---|---|---|
| `user` | FK → CustomUser, CASCADE, `related_name="subscriptions"` | |
| `package_price` | FK → PackagePrice, **PROTECT** | |
| `subscription_system` | FK → SubscriptionSystem, SET_NULL, null | optional system linkage |
| `status` | CharField(20) | `pending`, `active`, `completed`, `expired`, `suspended`, `grace_period`, `cancelled` — default `pending` |
| `payment_status` | CharField(20) | `pending`, `paid` |
| `payment_method` | CharField(30), blank | e.g. card / paypal / mixx |
| `payment_contact` | CharField(120), blank | submitted contact/card details |
| `payment_amount` | Decimal(12,2), null | |
| `payment_currency` | CharField(10), default `TZS` | |
| `business_name` | CharField(120) | |
| `contact_email` | EmailField | |
| `contact_phone` | CharField(30) | |
| `notes` | TextField, blank | |
| `start_date`, `end_date`, `next_billing_date` | DateField, null | service window |
| `auto_renew` | Boolean, default False | |
| `grace_period_days` | PositiveInteger, default 3 | |

Ordering `["-created_at"]`.

**Methods**
- `get_duration_days()` — from billing period: weekly→7, monthly→30, yearly→365, per_task→30 (default 30).
- `assign_service_window(ref?)` — sets `start_date`, `end_date = start + duration`, `next_billing_date = end_date`.
- `get_effective_status(ref?)` — terminal states (`cancelled|suspended|completed`) short-circuit; unpaid→`pending`; `today ≤ end_date`→`active`; within grace→`grace_period`; else `expired`.
- `can_access_service(ref?)` — effective status ∈ {`active`, `grace_period`}.

### PackageSubscriptionOrder
Identical fields/methods to `Subscription` **except**: no `subscription_system`; FKs are `user` → `related_name="package_subscription_orders"` and `package_price` → `related_name="package_subscription_orders"`. Created by `POST /api/package-subscriptions/checkout/`.

### SystemSubscriptionOrder
Identical to `Subscription` plus `subscription_system` FK → SubscriptionSystem **CASCADE** (`related_name="system_orders"`); related names `system_subscription_orders`. Created by `POST /api/system-subscriptions/checkout/` (yearly price only). When paid, serializer-level `ensure_system_order_control_records()` provisions `Tenant`, `TenantService` (+ issued credentials), `TenantServiceFeatureAccess` (from `build_feature_codes()`), and `TenantServiceAdmin`.

---

## Business-logic helpers (serializers, not signals)

In `catalog/serializers.py` (module-level functions):
- `build_feature_codes()` — default feature flags for a provisioned system.
- `build_service_connection_details()` — assembles `control_details` (license/API keys, URLs) for receipts.
- `ensure_subscription_control_records()` / `ensure_system_order_control_records()` — idempotent provisioning of tenant + service + admins + feature access when an order is `paid`; teardown on unpaid/cancelled.

Admin registration exists for `Service`, `ServicePackage`, `PackagePrice`, `Subscription`, `SubscriptionSystem` only; the tenant/order models are managed through the API.

## Seeding

`python manage.py seed_infaan_data` (`catalog/management/commands/seed_infaan_data.py`) upserts 5 services, 16 packages, and TZS prices (default = monthly or per_task), and creates superuser `admin` / `admin@infaan.com` / `Admin12345!` if absent. Run automatically during Render build when `SEED_INFAAN_DATA=true`.
