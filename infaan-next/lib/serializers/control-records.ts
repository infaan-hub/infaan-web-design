import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getEffectiveStatus } from "@/lib/subscriptions";

// catalog.serializers: build_feature_codes / build_service_connection_details /
// ensure_subscription_control_records / ensure_system_order_control_records

export function buildFeatureCodes(features: unknown): string[] {
  const codes: string[] = [];
  for (const feature of (Array.isArray(features) ? features : []) || []) {
    const code = String(feature).toLowerCase().split(/\s+/).filter(Boolean).join("-");
    if (code) codes.push(code.slice(0, 120));
  }
  return codes;
}

function apiBaseUrl(): string {
  return (process.env.SYSTEM_SUBSCRIPTION_API_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
}

export function buildServiceConnectionDetails(ts: any) {
  const api = apiBaseUrl();
  return {
    tenant_id: ts.tenantId,
    tenant_name: ts.tenant.businessName,
    service_id: ts.id,
    service_name: ts.name,
    license_key: ts.licenseKey,
    api_key: ts.apiKey,
    api_secret: ts.apiSecret,
    api_url: api,
    license_validate_url: api ? `${api}/license/validate/` : "",
    subscription_status_url: api ? `${api}/subscription/status/` : "",
    features_url: api ? `${api}/features/` : "",
    admin_access_url: api ? `${api}/admin-access/` : "",
    heartbeat_url: api ? `${api}/heartbeat/` : "",
    connection_status: ts.connectionStatus,
    admin_url: ts.adminUrl,
    public_url: ts.publicUrl,
    is_enabled: ts.isEnabled,
  };
}

export function issueCredentials() {
  return {
    licenseKey: `LIC-${randomBytes(8).toString("hex").toUpperCase()}`,
    apiKey: `API-${randomBytes(10).toString("hex").toUpperCase()}`,
    apiSecret: randomBytes(24).toString("hex"),
  };
}

export type EnsureInput = {
  userId: number;
  businessName: string;
  subscriptionSystemId: number;
  packagePriceId: number;
  status: string;
  paymentStatus: string;
  endDate: Date | null;
  gracePeriodDays: number;
};

const includeScope = {
  user: true,
  packagePrice: { include: { servicePackage: true } },
  subscriptionSystem: true,
} as const;

async function getOrCreateTenant(ownerId: number, businessName: string) {
  let tenant = await prisma.tenant.findFirst({ where: { ownerId, businessName } });
  if (!tenant)
    tenant = await prisma.tenant.create({
      data: { ownerId, businessName, status: "active" },
    });
  if (tenant.status !== "active")
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: "active" },
    });
  return tenant;
}

async function syncFeaturesAndAdmins(
  serviceId: number,
  tenantId: number,
  features: unknown,
  userIdentifier: string
) {
  const codes = buildFeatureCodes(features);
  const existingRows = await prisma.tenantServiceFeatureAccess.findMany({
    where: { serviceId },
  });
  const existing = new Map(existingRows.map((row) => [row.featureCode, row]));
  for (const code of codes) {
    const row = existing.get(code);
    if (row) {
      if (!row.enabled)
        await prisma.tenantServiceFeatureAccess.update({
          where: { id: row.id },
          data: { enabled: true },
        });
    } else {
      await prisma.tenantServiceFeatureAccess.create({
        data: { serviceId, featureCode: code, enabled: true },
      });
    }
  }
  for (const [code, row] of existing) {
    if (!codes.includes(code) && row.enabled)
      await prisma.tenantServiceFeatureAccess.update({
        where: { id: row.id },
        data: { enabled: false },
      });
  }
  const admin = await prisma.tenantServiceAdmin.findFirst({
    where: { tenantId, serviceId, userIdentifier },
  });
  if (!admin)
    await prisma.tenantServiceAdmin.create({
      data: { tenantId, serviceId, userIdentifier, role: "tenant_admin", isActive: true },
    });
}

/** ensure_subscription_control_records (subscription requires paid + system). */
export async function ensureSubscriptionControlRecords(subscriptionId: number): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: includeScope,
  });
  if (!sub || !sub.subscriptionSystemId || sub.paymentStatus !== "paid") return;
  const system = sub.subscriptionSystem!;
  const tenant = await getOrCreateTenant(sub.userId, sub.businessName);
  const credentials = issueCredentials();

  let service = await prisma.tenantService.findUnique({
    where: { subscriptionId: sub.id },
  });
  if (!service)
    service = await prisma.tenantService.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: sub.id,
        subscriptionSystemId: system.id,
        name: system.name,
        serviceType: "django_system",
        publicUrl: system.systemUrl || "",
        adminUrl: system.adminUrl || "",
        licenseKey: credentials.licenseKey,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        connectionStatus: "active",
        isEnabled: true,
        connectedAt: new Date(),
      },
    });

  const patch: Record<string, unknown> = {};
  if (service.tenantId !== tenant.id) patch.tenantId = tenant.id;
  if (service.subscriptionSystemId !== system.id) patch.subscriptionSystemId = system.id;
  if (service.name !== system.name) patch.name = system.name;
  if (!service.publicUrl && system.systemUrl) patch.publicUrl = system.systemUrl;
  if (!service.adminUrl && system.adminUrl) patch.adminUrl = system.adminUrl;

  const effective = getEffectiveStatus(sub);
  const active = effective === "active" || effective === "grace_period";
  let desiredTenant = tenant.status;
  if (active) {
    desiredTenant = "active";
    if (service.connectionStatus === "pending") patch.connectionStatus = "active";
    if (!service.connectedAt) patch.connectedAt = new Date();
  } else {
    desiredTenant = "inactive";
    if (service.connectionStatus !== "inactive") patch.connectionStatus = "inactive";
    if (service.isEnabled) patch.isEnabled = false;
  }
  if (Object.keys(patch).length)
    service = await prisma.tenantService.update({ where: { id: service.id }, data: patch });
  if (tenant.status !== desiredTenant)
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: desiredTenant },
    });

  await syncFeaturesAndAdmins(
    service.id,
    tenant.id,
    sub.packagePrice.servicePackage.features,
    sub.user.email || sub.user.username
  );
}

/** ensure_system_order_control_records (order requires paid + system; tenant stays active). */
export async function ensureSystemOrderControlRecords(orderId: number): Promise<void> {
  const order = await prisma.systemSubscriptionOrder.findUnique({
    where: { id: orderId },
    include: includeScope,
  });
  if (!order || !order.subscriptionSystemId || order.paymentStatus !== "paid") return;
  const system = order.subscriptionSystem!;
  const tenant = await getOrCreateTenant(order.userId, order.businessName);
  const credentials = issueCredentials();

  let service = await prisma.tenantService.findUnique({
    where: { systemOrderId: order.id },
  });
  if (!service)
    service = await prisma.tenantService.create({
      data: {
        tenantId: tenant.id,
        systemOrderId: order.id,
        subscriptionSystemId: system.id,
        name: system.name,
        serviceType: "django_system",
        publicUrl: system.systemUrl || "",
        adminUrl: system.adminUrl || "",
        licenseKey: credentials.licenseKey,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        connectionStatus: "active",
        isEnabled: true,
        connectedAt: new Date(),
      },
    });

  const patch: Record<string, unknown> = {};
  if (service.tenantId !== tenant.id) patch.tenantId = tenant.id;
  if (service.subscriptionId !== null) patch.subscriptionId = null;
  if (service.subscriptionSystemId !== system.id) patch.subscriptionSystemId = system.id;
  if (service.name !== system.name) patch.name = system.name;
  if (!service.publicUrl && system.systemUrl) patch.publicUrl = system.systemUrl;
  if (!service.adminUrl && system.adminUrl) patch.adminUrl = system.adminUrl;

  const effective = getEffectiveStatus(order);
  const active = effective === "active" || effective === "grace_period";
  if (active) {
    if (service.connectionStatus === "pending") patch.connectionStatus = "active";
    if (!service.connectedAt) patch.connectedAt = new Date();
  } else {
    if (service.connectionStatus !== "inactive") patch.connectionStatus = "inactive";
    if (service.isEnabled) patch.isEnabled = false;
  }
  if (Object.keys(patch).length)
    service = await prisma.tenantService.update({ where: { id: service.id }, data: patch });

  await syncFeaturesAndAdmins(
    service.id,
    tenant.id,
    order.packagePrice.servicePackage.features,
    order.user.email || order.user.username
  );
}


