import { describe, expect, it } from "vitest";
import { callJson, createUser, createAdmin, tokenFor } from "./helpers";
import { prisma } from "@/lib/prisma";
import { todayDateString } from "@/lib/format";
import { POST as subCreate } from "@/app/api/subscriptions/route";
import { GET as tenantList, POST as tenantPost } from "@/app/api/tenants/route";
import { GET as tenantDetail } from "@/app/api/tenants/[id]/route";
import { GET as tsList, POST as tsCreate } from "@/app/api/tenant-services/route";
import {
  GET as tsDetail,
  PATCH as tsPatch,
  DELETE as tsDelete,
} from "@/app/api/tenant-services/[id]/route";
import { GET as tsaList, POST as tsaCreate } from "@/app/api/tenant-service-admins/route";
import { PATCH as tsaPatch, PUT as tsaPut, DELETE as tsaDelete } from "@/app/api/tenant-service-admins/[id]/route";

async function makeService(overrides: Record<string, any> = {}) {
  return prisma.service.create({
    data: {
      name: overrides.name ?? `svc_${Math.random().toString(36).slice(2, 9)}`,
      category: "website",
      shortDescription: "short",
      details: "details",
      isActive: overrides.isActive ?? true,
    },
  });
}

async function makePackage(serviceId: number, overrides: Record<string, any> = {}) {
  return prisma.servicePackage.create({
    data: {
      serviceId,
      tier: overrides.tier ?? "silver",
      title: overrides.title ?? "Base",
      description: "desc",
      isActive: true,
      features: overrides.features ?? ["SEO audit", "Fast delivery"],
    },
  });
}

async function makePrice(packageId: number, overrides: Record<string, any> = {}) {
  return prisma.packagePrice.create({
    data: {
      packageId,
      billingPeriod: overrides.billingPeriod ?? "yearly",
      amount: overrides.amount ?? "300.00",
      currency: "TZS",
    },
  });
}

async function makeSystem(serviceId: number) {
  return prisma.subscriptionSystem.create({
    data: {
      serviceId,
      name: "Helpdesk",
      summary: "summary",
      details: "",
      systemUrl: "https://help.example.com",
      adminUrl: "",
      displayPrice: null,
      displayPriceCurrency: "TZS",
      coverImage: "cover",
      galleryImages: [],
      isActive: true,
    },
  });
}

/** Creates a paid system subscription -> provisions tenant/service/admin/features. */
async function provision(token: string) {
  const svc = await makeService();
  const pkg = await makePackage(svc.id);
  const price = await makePrice(pkg.id);
  const system = await makeSystem(svc.id);
  const res = await callJson(subCreate, "/api/subscriptions/", {
    method: "POST",
    token,
    body: {
      package_price: price.id,
      subscription_system: system.id,
      payment_status: "paid",
      business_name: "Provision Co",
      contact_email: "ops@provision.test",
      contact_phone: "+255733333333",
    },
  });
  if (res.status !== 201) throw new Error(`provision failed: ${JSON.stringify(res.body)}`);
  const service = await prisma.tenantService.findFirst({ where: { subscriptionId: res.body.id } });
  return { sub: res.body, service, system, price, pkg, svc };
}

describe("tenants", () => {
  it("read-only + admin only: anon 401, customer 403, list 405 for POST", async () => {
    const anon = await callJson(tenantList, "/api/tenants/");
    expect(anon.status).toBe(401);

    const customer = await createUser();
    const forbidden = await callJson(tenantList, "/api/tenants/", {
      token: await tokenFor(customer.id),
    });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ detail: "You do not have permission to perform this action." });

    const admin = await createAdmin();
    const list = await callJson(tenantList, "/api/tenants/", {
      token: await tokenFor(admin.id),
    });
    expect(list.status).toBe(200);
    expect(list.body).toEqual({ count: 0, next: null, previous: null, results: [] });

    const post = await callJson(tenantPost, "/api/tenants/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: {},
    });
    expect(post.status).toBe(405);
    expect(post.body).toEqual({ detail: 'Method "POST" not allowed.' });
    expect(post.headers.get("Allow")).toContain("GET");
    expect(post.headers.get("Allow")).not.toContain("POST");
  });

  it("list/detail expose nested services after provisioning", async () => {
    const user = await createUser();
    const admin = await createAdmin();
    const { service } = await provision(await tokenFor(user.id));

    const list = await callJson(tenantList, "/api/tenants/", {
      token: await tokenFor(admin.id),
    });
    expect(list.body.count).toBe(1);
    const tenant = list.body.results[0];
    expect(tenant).toMatchObject({
      business_name: "Provision Co",
      status: "active",
      owner: user.id,
      owner_details: { id: user.id, username: user.username, email: user.email, role: "customer" },
    });
    expect(tenant.services).toHaveLength(1);
    expect(tenant.services[0]).toMatchObject({
      id: service!.id,
      tenant_name: "Provision Co",
      name: "Helpdesk",
      service_type: "django_system",
      license_key: expect.stringMatching(/^LIC-/),
      connection_status: "active",
      is_enabled: true,
      subscription_status: "active",
      subscription_payment_status: "paid",
      subscription_end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      computed_active: true,
      api_url: expect.any(String),
      license_validate_url: expect.stringMatching(/\/license\/validate\/$/),
    });
    expect(tenant.services[0].feature_access).toEqual([
      { id: expect.any(Number), feature_code: "fast-delivery", enabled: true },
      { id: expect.any(Number), feature_code: "seo-audit", enabled: true },
    ]);
    expect(tenant.services[0].admins).toEqual([
      {
        id: expect.any(Number),
        user_identifier: user.email,
        role: "tenant_admin",
        is_active: true,
      },
    ]);

    const detail = await callJson(tenantDetail, `/api/tenants/${tenant.id}/`, {
      token: await tokenFor(admin.id),
    });
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(tenant.id);

    const missing = await callJson(tenantDetail, "/api/tenants/424242/", {
      token: await tokenFor(admin.id),
    });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ detail: "No Tenant matches the given query." });
  });
});

describe("tenant services", () => {
  it("list runs provisioning side effect; admin only", async () => {
    const user = await createUser();
    const admin = await createAdmin();
    const denied = await callJson(tsList, "/api/tenant-services/", {
      token: await tokenFor(user.id),
    });
    expect(denied.status).toBe(403);

    const before = await callJson(tsList, "/api/tenant-services/", {
      token: await tokenFor(admin.id),
    });
    expect(before.body.count).toBe(0);

    await provision(await tokenFor(user.id));
    // Drop the control row, then confirm GET re-provisions it.
    await prisma.tenantService.deleteMany();

    const after = await callJson(tsList, "/api/tenant-services/", {
      token: await tokenFor(admin.id),
    });
    expect(after.body.count).toBe(1);
    expect(after.body.results[0]).toMatchObject({
      name: "Helpdesk",
      computed_active: true,
      subscription_status: "active",
    });
    expect(after.body.results[0].feature_access).toHaveLength(2);
  });

  it("create: validates tenant/name; credentials default to empty (unique -> 500)", async () => {
    const admin = await createAdmin();
    const { service } = await (async () => {
      const user = await createUser();
      return provision(await tokenFor(user.id));
    })();

    const missing = await callJson(tsCreate, "/api/tenant-services/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: { name: "New svc" },
    });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({ tenant: ["This field is required."] });

    const noName = await callJson(tsCreate, "/api/tenant-services/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: { tenant: service!.tenantId },
    });
    expect(noName.status).toBe(400);
    expect(noName.body).toEqual({ name: ["This field is required."] });

    // No subscription -> subscription_* keys are absent entirely (field skipped).
    const created = await callJson(tsCreate, "/api/tenant-services/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: { tenant: service!.tenantId, name: "Manual svc" },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      tenant: service!.tenantId,
      name: "Manual svc",
      license_key: "",
      api_key: "",
      api_secret: "",
      connection_status: "pending",
      is_enabled: true,
      feature_access: [],
      admins: [],
    });
    expect(created.body).not.toHaveProperty("subscription_status");
    expect(created.body).not.toHaveProperty("subscription_payment_status");
    expect(created.body).not.toHaveProperty("subscription_end_date");

    const duplicate = await callJson(tsCreate, "/api/tenant-services/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: { tenant: service!.tenantId, name: "Second" },
    });
    expect(duplicate.status).toBe(500);
  });

  it("detail/PATCH/DELETE: connected_at side effect + 404 message", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const { service } = await provision(await tokenFor(user.id));

    const patched = await callJson(tsPatch, `/api/tenant-services/${service!.id}/`, {
      method: "PATCH",
      token: await tokenFor(admin.id),
      body: { connection_status: "active", name: "Renamed svc" },
    });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ name: "Renamed svc", connection_status: "active" });
    expect(patched.body.connected_at).toMatch(/\+03:00$/);

    const removed = await callJson(tsDelete, `/api/tenant-services/${service!.id}/`, {
      method: "DELETE",
      token: await tokenFor(admin.id),
    });
    expect(removed.status).toBe(204);

    const missing = await callJson(tsDetail, `/api/tenant-services/${service!.id}/`, {
      token: await tokenFor(admin.id),
    });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ detail: "No TenantService matches the given query." });
  });
});

describe("tenant service admins", () => {
  it("list shows provisioned admin; create always 500; PATCH/PUT/DELETE", async () => {
    const user = await createUser();
    const admin = await createAdmin();
    const { service } = await provision(await tokenFor(user.id));

    const denied = await callJson(tsaList, "/api/tenant-service-admins/", {
      token: await tokenFor(user.id),
    });
    expect(denied.status).toBe(403);

    const list = await callJson(tsaList, "/api/tenant-service-admins/", {
      token: await tokenFor(admin.id),
    });
    expect(list.status).toBe(200);
    expect(list.body.count).toBe(1);
    expect(list.body.results[0]).toMatchObject({
      user_identifier: user.email,
      role: "tenant_admin",
      is_active: true,
    });

    // Serializer omits tenant/service FKs -> IntegrityError -> 500.
    const created = await callJson(tsaCreate, "/api/tenant-service-admins/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: { user_identifier: "someone@example.com" },
    });
    expect(created.status).toBe(500);

    const row = list.body.results[0];
    const patched = await callJson(tsaPatch, `/api/tenant-service-admins/${row.id}/`, {
      method: "PATCH",
      token: await tokenFor(admin.id),
      body: { is_active: false },
    });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ user_identifier: user.email, is_active: false });

    const putMissing = await callJson(tsaPut, `/api/tenant-service-admins/${row.id}/`, {
      method: "PUT",
      token: await tokenFor(admin.id),
      body: { role: "viewer" },
    });
    expect(putMissing.status).toBe(400);
    expect(putMissing.body).toEqual({ user_identifier: ["This field is required."] });

    const removed = await callJson(tsaDelete, `/api/tenant-service-admins/${row.id}/`, {
      method: "DELETE",
      token: await tokenFor(admin.id),
    });
    expect(removed.status).toBe(204);
    expect(service!.id).toBeGreaterThan(0);
  });
});

describe("control endpoints", () => {
  it("keepalive: GET ok; POST 405 with Allow", async () => {
    const getRes = await callJson(
      (await import("@/app/api/keepalive/route")).GET,
      "/api/keepalive/"
    );
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual({ status: "ok" });

    const postRes = await callJson(
      (await import("@/app/api/keepalive/route")).POST,
      "/api/keepalive/",
      { method: "POST" }
    );
    expect(postRes.status).toBe(405);
    expect(postRes.body).toEqual({ detail: 'Method "POST" not allowed.' });
    expect(postRes.headers.get("Allow")).toContain("GET");
    expect(postRes.headers.get("Allow")).not.toContain("POST");
  });

  it("license/validate: 400/404/403 then valid active response", async () => {
    const { POST: licensePost } = await import("@/app/api/license/validate/route");
    const { GET: licenseGet } = await import("@/app/api/license/validate/route");

    const noBody = await callJson(licensePost, "/api/license/validate/", {
      method: "POST",
      body: {},
    });
    expect(noBody.status).toBe(400);
    expect(noBody.body).toEqual({ detail: "service_id and license_key are required." });

    const missing = await callJson(licensePost, "/api/license/validate/", {
      method: "POST",
      body: { service_id: 1, license_key: "LIC-nope" },
    });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ detail: "Managed service not found." });

    const user = await createUser();
    const { service } = await provision(await tokenFor(user.id));
    const creds = {
      service_id: service!.id,
      license_key: service!.licenseKey,
    };

    const badKey = await callJson(licensePost, "/api/license/validate/", {
      method: "POST",
      body: { ...creds, api_key: "API-wrong" },
    });
    expect(badKey.status).toBe(403);
    expect(badKey.body).toEqual({ detail: "Invalid API key." });

    const badSecret = await callJson(licensePost, "/api/license/validate/", {
      method: "POST",
      body: { ...creds, api_secret: "wrong-secret" },
    });
    expect(badSecret.status).toBe(403);
    expect(badSecret.body).toEqual({ detail: "Invalid API secret." });

    const ok = await callJson(licensePost, "/api/license/validate/", {
      method: "POST",
      body: creds,
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({
      allowed: true,
      status: "active",
      end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      detail: "Subscription is active.",
    });

    const wrongMethod = await callJson(licenseGet, "/api/license/validate/");
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get("Allow")).toContain("POST");
    expect(wrongMethod.headers.get("Allow")).not.toContain("GET");
  });

  it("license/validate: domain matching + inactive tenant disables access", async () => {
    const { POST: licensePost } = await import("@/app/api/license/validate/route");
    const user = await createUser();
    const { service } = await provision(await tokenFor(user.id));
    await prisma.tenantService.update({
      where: { id: service!.id },
      data: { domain: "Example.COM" },
    });
    const creds = { service_id: service!.id, license_key: service!.licenseKey };

    const mismatch = await callJson(licensePost, "/api/license/validate/", {
      method: "POST",
      body: { ...creds, domain: "other.com" },
    });
    expect(mismatch.status).toBe(403);
    expect(mismatch.body).toEqual({ detail: "Domain does not match the registered service." });

    const match = await callJson(licensePost, "/api/license/validate/", {
      method: "POST",
      body: { ...creds, domain: "example.com" },
    });
    expect(match.status).toBe(200);
    expect(match.body.allowed).toBe(true);

    await prisma.tenant.updateMany({ data: { status: "inactive" } });
    const disabled = await callJson(licensePost, "/api/license/validate/", {
      method: "POST",
      body: creds,
    });
    expect(disabled.status).toBe(200);
    expect(disabled.body).toMatchObject({ allowed: false, status: "active" });
    expect(disabled.body.detail).toBe("Subscription is not active.");
  });

  it("features + admin-access reflect provisioning", async () => {
    const { POST: featuresPost } = await import("@/app/api/features/route");
    const { POST: adminPost } = await import("@/app/api/admin-access/route");
    const user = await createUser();
    const { service } = await provision(await tokenFor(user.id));
    const creds = { service_id: service!.id, license_key: service!.licenseKey };

    const features = await callJson(featuresPost, "/api/features/", {
      method: "POST",
      body: creds,
    });
    expect(features.status).toBe(200);
    expect(features.body).toEqual({
      active: true,
      features: [
        { feature_code: "fast-delivery", enabled: true },
        { feature_code: "seo-audit", enabled: true },
      ],
    });

    const admins = await callJson(adminPost, "/api/admin-access/", {
      method: "POST",
      body: creds,
    });
    expect(admins.status).toBe(200);
    expect(admins.body).toEqual({
      active: true,
      admin_allowed: true,
      admins: [
        { user_identifier: user.email, role: "tenant_admin", active: true },
      ],
    });
  });

  it("heartbeat: updates timestamp, reactivates connection, fixed detail", async () => {
    const { POST: heartbeatPost } = await import("@/app/api/heartbeat/route");
    const user = await createUser();
    const { service } = await provision(await tokenFor(user.id));
    await prisma.tenantService.update({
      where: { id: service!.id },
      data: { connectionStatus: "inactive", isEnabled: false, connectedAt: null },
    });
    const creds = { service_id: service!.id, license_key: service!.licenseKey };

    const res = await callJson(heartbeatPost, "/api/heartbeat/", {
      method: "POST",
      body: creds,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      allowed: false,
      status: "active",
      end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      detail: "Heartbeat received.",
    });
    const fresh = await prisma.tenantService.findFirst({ where: { id: service!.id } });
    expect(fresh).toMatchObject({ connectionStatus: "active", isEnabled: false });
    expect(fresh!.lastHeartbeatAt).toBeInstanceOf(Date);
    expect(fresh!.connectedAt).toBeInstanceOf(Date);

    const second = await callJson(heartbeatPost, "/api/heartbeat/", {
      method: "POST",
      body: creds,
    });
    expect(second.body.detail).toBe("Heartbeat received.");
  });

  it("subscription/status matches license response shape", async () => {
    const { POST: statusPost } = await import("@/app/api/subscription/status/route");
    const user = await createUser();
    const { service } = await provision(await tokenFor(user.id));
    const res = await callJson(statusPost, "/api/subscription/status/", {
      method: "POST",
      body: { service_id: service!.id, license_key: service!.licenseKey },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      allowed: true,
      status: "active",
      end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      detail: "Subscription is active.",
    });
    expect(res.body.end_date >= todayDateString()).toBe(true);
  });
});
