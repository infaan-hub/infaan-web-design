import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { fieldDate } from "@/lib/format";
import { canAccessService, getEffectiveStatus } from "@/lib/subscriptions";

// catalog.views control endpoints: _resolve_managed_service +
// LicenseValidateView / SubscriptionStatusView / FeatureAccessView /
// AdminAccessView / HeartbeatView / KeepAliveView (all AllowAny).

function apiBase(): string {
  return (process.env.SYSTEM_SUBSCRIPTION_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
}

export type ResolveResult = { service?: any; error?: ApiError };

export async function resolveManagedService(body: any): Promise<ResolveResult> {
  const service_id = body.service_id;
  const license_key = body.license_key;
  const api_key = body.api_key;
  const api_secret = body.api_secret;
  // Non-string domain values -> 500 (strip/lower are string-only).
  const domain = (body.domain || "").trim().toLowerCase();

  if (!service_id || !license_key)
    return { error: new ApiError(400, { detail: "service_id and license_key are required." }) };

  const idArg =
    typeof service_id === "string" && /^[-+]?[0-9]+$/.test(service_id)
      ? Number(service_id)
      : service_id;
  const service = await prisma.tenantService.findFirst({
    where: { id: idArg as any, licenseKey: String(license_key) },
    include: {
      tenant: true,
      subscription: true,
      systemOrder: true,
      featureAccess: { orderBy: { featureCode: "asc" } },
      admins: { orderBy: { userIdentifier: "asc" } },
    },
  });
  if (!service)
    return { error: new ApiError(404, { detail: "Managed service not found." }) };
  if (api_key && service.apiKey !== api_key)
    return { error: new ApiError(403, { detail: "Invalid API key." }) };
  if (api_secret && service.apiSecret !== api_secret)
    return { error: new ApiError(403, { detail: "Invalid API secret." }) };
  if (domain && service.domain && service.domain.toLowerCase() !== domain)
    return { error: new ApiError(403, { detail: "Domain does not match the registered service." }) };
  return { service };
}

/** TenantService.is_subscription_active (system_order preferred over subscription). */
export function isSubscriptionActive(service: any): boolean {
  const record = service.systemOrder || service.subscription;
  if (!record) return false;
  if (record.paymentStatus !== "paid") return false;
  if (service.tenant.status !== "active") return false;
  return (
    canAccessService(record) && service.connectionStatus === "active" && service.isEnabled
  );
}

export function buildControlResponse(service: any, detail?: string | null) {
  const record = service.systemOrder || service.subscription;
  if (!record)
    return {
      allowed: false,
      status: "inactive",
      end_date: null,
      detail: detail || "Subscription record not found.",
    };
  const allowed = isSubscriptionActive(service);
  return {
    allowed,
    status: getEffectiveStatus(record),
    end_date: fieldDate(record.endDate),
    detail:
      detail === undefined || detail === null
        ? allowed
          ? "Subscription is active."
          : "Subscription is not active."
        : detail,
  };
}

export function featuresResponse(service: any) {
  return {
    active: isSubscriptionActive(service),
    features: service.featureAccess.map((row: any) => ({
      feature_code: row.featureCode,
      enabled: row.enabled,
    })),
  };
}

export function adminAccessResponse(service: any) {
  const active = isSubscriptionActive(service);
  return {
    active,
    admin_allowed: active,
    admins: service.admins
      .filter((row: any) => row.isActive)
      .map((row: any) => ({
        user_identifier: row.userIdentifier,
        role: row.role,
        active: row.isActive,
      })),
  };
}

export async function heartbeat(service: any) {
  const now = new Date();
  if (service.connectionStatus !== "active") {
    await prisma.tenantService.update({
      where: { id: service.id },
      data: {
        lastHeartbeatAt: now,
        connectionStatus: "active",
        connectedAt: service.connectedAt ?? now,
      },
    });
  } else {
    await prisma.tenantService.update({
      where: { id: service.id },
      data: { lastHeartbeatAt: now },
    });
  }
  const fresh = await prisma.tenantService.findFirst({
    where: { id: service.id },
    include: {
      tenant: true,
      subscription: true,
      systemOrder: true,
      featureAccess: { orderBy: { featureCode: "asc" } },
      admins: { orderBy: { userIdentifier: "asc" } },
    },
  });
  return buildControlResponse(fresh, "Heartbeat received.");
}

export function keepaliveResponse() {
  return { status: "ok" };
}

export const CONTROL_API_BASE = apiBase();
