import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { modelNotFound } from "@/lib/errors";
import { fieldString, fieldChoice, fieldBool, fieldUrl } from "@/lib/fields";
import { fieldDateTime, fieldDate } from "@/lib/format";
import { FieldErrors, parseObject, validatePk } from "./catalog";
import { buildServiceConnectionDetails, ensureSubscriptionControlRecords } from "./control-records";
import { canAccessService } from "@/lib/subscriptions";

// catalog tenant serializers (TenantSerializer / TenantServiceSerializer /
// TenantServiceAdminSerializer) + write paths.

const TENANT_STATUSES = ["pending", "active", "inactive", "suspended"] as const;
const SERVICE_TYPES = ["django_system", "wordpress_site", "custom_site", "other"] as const;
const CONNECTION_STATUSES = ["pending", "active", "inactive"] as const;

export function serializeTenantServiceAdmin(row: any) {
  return {
    id: row.id,
    user_identifier: row.userIdentifier,
    role: row.role,
    is_active: row.isActive,
  };
}

function serializeFeatureAccess(rows: any[]) {
  return rows.map((row) => ({
    id: row.id,
    feature_code: row.featureCode,
    enabled: row.enabled,
  }));
}

/** Tenant service: subscription_* keys ABSENT when subscription null (field skipped). */
export function serializeTenantService(ts: any) {
  const connection = buildServiceConnectionDetails(ts);
  const sub = ts.subscription;
  const record = ts.systemOrder || sub;
  const computedActive = (() => {
    if (!record) return false;
    if (record.paymentStatus !== "paid") return false;
    if (ts.tenant.status !== "active") return false;
    return canAccessService(record) && ts.connectionStatus === "active" && ts.isEnabled;
  })();

  const out: Record<string, unknown> = {
    id: ts.id,
    tenant: ts.tenantId,
    tenant_name: ts.tenant.businessName,
    subscription: ts.subscriptionId,
    subscription_system: ts.subscriptionSystemId,
    name: ts.name,
    service_type: ts.serviceType,
    domain: ts.domain,
    public_url: ts.publicUrl,
    admin_url: ts.adminUrl,
    license_key: ts.licenseKey,
    api_key: ts.apiKey,
    api_secret: ts.apiSecret,
    api_url: connection.api_url,
    license_validate_url: connection.license_validate_url,
    subscription_status_url: connection.subscription_status_url,
    features_url: connection.features_url,
    admin_access_url: connection.admin_access_url,
    heartbeat_url: connection.heartbeat_url,
    connection_status: ts.connectionStatus,
    is_enabled: ts.isEnabled,
    last_heartbeat_at: fieldDateTime(ts.lastHeartbeatAt),
    connected_at: fieldDateTime(ts.connectedAt),
  };
  if (sub) {
    // Source traversal over a null relation skips the field entirely.
    out.subscription_status = sub.status;
    out.subscription_payment_status = sub.paymentStatus;
    out.subscription_end_date = fieldDate(sub.endDate);
  }
  out.computed_active = computedActive;
  out.feature_access = serializeFeatureAccess(ts.featureAccess ?? []);
  out.admins = (ts.admins ?? []).map(serializeTenantServiceAdmin);
  return out;
}

export function serializeTenant(tenant: any) {
  return {
    id: tenant.id,
    business_name: tenant.businessName,
    status: tenant.status,
    owner: tenant.ownerId,
    owner_details: {
      id: tenant.owner.id,
      username: tenant.owner.username,
      email: tenant.owner.email,
      role: tenant.owner.role,
    },
    services: (tenant.services ?? []).map(serializeTenantService),
  };
}

// ---------------------------------------------------------------------------
// Write schemas
// ---------------------------------------------------------------------------

const tenantServiceCreateSchema = z.object({
  name: fieldString({ maxLength: 150 }),
  service_type: fieldChoice(SERVICE_TYPES).optional(),
  domain: fieldString({ maxLength: 255, blank: true }).optional(),
  public_url: fieldUrl({ optional: true }),
  admin_url: fieldUrl({ optional: true }),
  connection_status: fieldChoice(CONNECTION_STATUSES).optional(),
  is_enabled: fieldBool({ optional: true }),
});
const tenantServicePatchSchema = tenantServiceCreateSchema.partial();

const TENANT_SERVICE_PUT_DEFAULTS: Record<string, unknown> = {
  service_type: "django_system",
  connection_status: "pending",
  is_enabled: true,
};

const tenantServiceAdminCreateSchema = z.object({
  user_identifier: fieldString({ maxLength: 150 }),
  role: fieldString({ maxLength: 60 }).optional(),
  is_active: fieldBool({ optional: true }),
});
const tenantServiceAdminPatchSchema = tenantServiceAdminCreateSchema.partial();

const TENANT_ADMIN_PUT_DEFAULTS: Record<string, unknown> = {
  role: "admin",
  is_active: true,
};

const TENANT_SERVICE_FIELD_MAP: Record<string, string> = {
  name: "name",
  service_type: "serviceType",
  domain: "domain",
  public_url: "publicUrl",
  admin_url: "adminUrl",
  connection_status: "connectionStatus",
  is_enabled: "isEnabled",
};

const TENANT_ADMIN_FIELD_MAP: Record<string, string> = {
  user_identifier: "userIdentifier",
  role: "role",
  is_active: "isActive",
};

const tsInclude = {
  tenant: true,
  subscription: true,
  systemOrder: true,
  featureAccess: { orderBy: { featureCode: "asc" as const } },
  admins: { orderBy: { userIdentifier: "asc" as const } },
};

const tenantInclude = {
  owner: true,
  services: {
    orderBy: [{ tenant: { businessName: "asc" as const } }, { name: "asc" as const }],
    include: tsInclude,
  },
};

// ---------------------------------------------------------------------------
// Queries / CRUD
// ---------------------------------------------------------------------------

async function findTenantRow(id: number) {
  return prisma.tenant.findFirst({ where: { id } });
}
async function findSubscriptionRow(id: number) {
  return prisma.subscription.findFirst({ where: { id } });
}
async function findSystemRow(id: number) {
  return prisma.subscriptionSystem.findFirst({ where: { id } });
}

export async function listTenants() {
  return prisma.tenant.findMany({
    orderBy: [{ businessName: "asc" }, { id: "asc" }],
    include: tenantInclude,
  });
}

export async function findTenantOr404(id: number) {
  const tenant = await prisma.tenant.findFirst({ where: { id }, include: tenantInclude });
  if (!tenant) throw modelNotFound("Tenant");
  return tenant;
}

/** Tenant services list: provisions control records first. */
async function runEnsureSideEffect() {
  const subs = await prisma.subscription.findMany({
    where: { NOT: { subscriptionSystemId: null }, paymentStatus: "paid" },
    select: { id: true },
  });
  for (const sub of subs) {
    try {
      await ensureSubscriptionControlRecords(sub.id);
    } catch (err) {
      console.error("[api] control-records provisioning failed:", err);
    }
  }
}

export async function listTenantServices() {
  await runEnsureSideEffect();
  return prisma.tenantService.findMany({
    orderBy: [{ tenant: { businessName: "asc" } }, { name: "asc" }],
    include: tsInclude,
  });
}

export async function findTenantServiceOr404(id: number) {
  await runEnsureSideEffect();
  const ts = await prisma.tenantService.findFirst({ where: { id }, include: tsInclude });
  if (!ts) throw modelNotFound("TenantService");
  return ts;
}

export async function createTenantService(body: Record<string, unknown>) {
  const { data, errors } = parseObject(tenantServiceCreateSchema, body);
  const tenantId = await validatePk(errors, "tenant", body.tenant, {
    required: true,
    find: findTenantRow,
  });
  const subscriptionId = await validatePk(errors, "subscription", body.subscription, {
    required: false,
    nullable: true,
    find: findSubscriptionRow,
  });
  const subscriptionSystemId = await validatePk(errors, "subscription_system", body.subscription_system, {
    required: false,
    nullable: true,
    find: findSystemRow,
  });
  errors.throwIfAny();

  const record: Record<string, unknown> = {
    tenantId: tenantId!,
    subscriptionId: subscriptionId ?? null,
    subscriptionSystemId: subscriptionSystemId ?? null,
    // Read-only credential fields: model defaults land as "".
    licenseKey: "",
    apiKey: "",
    apiSecret: "",
  };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) record[TENANT_SERVICE_FIELD_MAP[key]] = value;
  }
  const created = await prisma.tenantService.create({ data: record as any });
  const full = await prisma.tenantService.findUnique({ where: { id: created.id }, include: tsInclude });
  return serializeTenantService(full);
}

export async function updateTenantService(
  id: number,
  body: Record<string, unknown>,
  partial: boolean
) {
  const ts = await findTenantServiceOr404(id);
  const { data, errors } = parseObject(
    partial ? tenantServicePatchSchema : tenantServiceCreateSchema,
    body
  );
  const tenantId = await validatePk(errors, "tenant", body.tenant, {
    required: !partial,
    find: findTenantRow,
  });
  const subscriptionId = await validatePk(errors, "subscription", body.subscription, {
    required: false,
    nullable: true,
    find: findSubscriptionRow,
  });
  const subscriptionSystemId = await validatePk(errors, "subscription_system", body.subscription_system, {
    required: false,
    nullable: true,
    find: findSystemRow,
  });
  errors.throwIfAny();

  const patch: Record<string, unknown> = {};
  if (tenantId !== undefined) patch.tenantId = tenantId;
  if (subscriptionId !== undefined) patch.subscriptionId = subscriptionId;
  if (subscriptionSystemId !== undefined) patch.subscriptionSystemId = subscriptionSystemId;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) patch[TENANT_SERVICE_FIELD_MAP[key]] = value;
  }
  if (!partial) {
    for (const [key, value] of Object.entries(TENANT_SERVICE_PUT_DEFAULTS)) {
      if (data[key] === undefined) patch[TENANT_SERVICE_FIELD_MAP[key]] = value;
    }
  }

  let updated = await prisma.tenantService.update({ where: { id: ts.id }, data: patch as any });
  if (updated.connectionStatus === "active" && !updated.connectedAt) {
    updated = await prisma.tenantService.update({
      where: { id: ts.id },
      data: { connectedAt: new Date() },
    });
  }
  const full = await prisma.tenantService.findUnique({ where: { id: ts.id }, include: tsInclude });
  return serializeTenantService(full);
}

export async function deleteTenantService(id: number) {
  const ts = await findTenantServiceOr404(id);
  await prisma.tenantService.delete({ where: { id: ts.id } });
}

// ---------------------------------------------------------------------------
// TenantServiceAdmin - create omits tenant/service FKs (not in serializer
// fields), which surface as a 500 IntegrityError; Prisma mirrors this
// with a missing-required-argument error.
// ---------------------------------------------------------------------------

export async function listTenantServiceAdmins() {
  return prisma.tenantServiceAdmin.findMany({
    orderBy: [{ service: { name: "asc" } }, { userIdentifier: "asc" }],
  });
}

export async function findTenantServiceAdminOr404(id: number) {
  const row = await prisma.tenantServiceAdmin.findFirst({ where: { id } });
  if (!row) throw modelNotFound("TenantServiceAdmin");
  return row;
}

export async function createTenantServiceAdmin(body: Record<string, unknown>) {
  const { data, errors } = parseObject(tenantServiceAdminCreateSchema, body);
  errors.throwIfAny();
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) record[TENANT_ADMIN_FIELD_MAP[key]] = value;
  }
  const created = await prisma.tenantServiceAdmin.create({ data: record as any });
  return serializeTenantServiceAdmin(created);
}

export async function updateTenantServiceAdmin(
  id: number,
  body: Record<string, unknown>,
  partial: boolean
) {
  const row = await findTenantServiceAdminOr404(id);
  const { data, errors } = parseObject(
    partial ? tenantServiceAdminPatchSchema : tenantServiceAdminCreateSchema,
    body
  );
  errors.throwIfAny();
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) patch[TENANT_ADMIN_FIELD_MAP[key]] = value;
  }
  if (!partial) {
    for (const [key, value] of Object.entries(TENANT_ADMIN_PUT_DEFAULTS)) {
      if (data[key] === undefined) patch[TENANT_ADMIN_FIELD_MAP[key]] = value;
    }
  }
  const updated = await prisma.tenantServiceAdmin.update({ where: { id: row.id }, data: patch as any });
  return serializeTenantServiceAdmin(updated);
}

export async function deleteTenantServiceAdmin(id: number) {
  const row = await findTenantServiceAdminOr404(id);
  await prisma.tenantServiceAdmin.delete({ where: { id: row.id } });
}
