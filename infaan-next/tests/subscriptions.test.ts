import { describe, expect, it } from "vitest";
import { callJson, createUser, createAdmin, tokenFor } from "./helpers";
import { prisma } from "@/lib/prisma";
import { todayDateString } from "@/lib/format";
import {
  GET as subList,
  POST as subCreate,
  DELETE as subListDelete,
} from "@/app/api/subscriptions/route";
import {
  GET as subDetail,
  PUT as subPut,
  PATCH as subPatch,
  DELETE as subDelete,
} from "@/app/api/subscriptions/[id]/route";

async function makeService(overrides: Record<string, any> = {}) {
  return prisma.service.create({
    data: {
      name: overrides.name ?? `svc_${Math.random().toString(36).slice(2, 9)}`,
      category: overrides.category ?? "website",
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
      isActive: overrides.isActive ?? true,
      features: overrides.features ?? ["SEO audit", "Fast delivery"],
      paymentNotes: overrides.paymentNotes ?? "M-Pesa",
    },
  });
}

async function makePrice(packageId: number, overrides: Record<string, any> = {}) {
  return prisma.packagePrice.create({
    data: {
      packageId,
      billingPeriod: overrides.billingPeriod ?? "monthly",
      amount: overrides.amount ?? "50.00",
      currency: "TZS",
    },
  });
}

async function makeSystem(serviceId: number, overrides: Record<string, any> = {}) {
  return prisma.subscriptionSystem.create({
    data: {
      serviceId,
      name: overrides.name ?? "CRM",
      summary: "summary",
      details: "",
      systemUrl: overrides.systemUrl ?? "https://crm.example.com",
      adminUrl: "",
      displayPrice: null,
      displayPriceCurrency: "TZS",
      coverImage: "cover",
      galleryImages: [],
      isActive: overrides.isActive ?? true,
    },
  });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(Date.parse(`${dateStr}T00:00:00Z`));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function baseBody(priceId: number, extra: Record<string, any> = {}) {
  return {
    package_price: priceId,
    business_name: "Acme Ltd",
    contact_email: "billing@acme.test",
    contact_phone: "+255700000000",
    ...extra,
  };
}

describe("subscriptions API", () => {
  it("list: 401 anon with WWW-Authenticate; paginated for users", async () => {
    const anon = await callJson(subList, "/api/subscriptions/");
    expect(anon.status).toBe(401);
    expect(anon.headers.get("WWW-Authenticate")).toBe('Bearer realm="api"');

    const user = await createUser();
    const res = await callJson(subList, "/api/subscriptions/", {
      token: await tokenFor(user.id),
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 0, next: null, previous: null, results: [] });
    expect(res.headers.get("Allow")).toContain("GET");
  });

  it("detail writes: anon 401, authenticated non-admin 403, unmapped DELETE list 405", async () => {
    const user = await createUser();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);
    const sub = await prisma.subscription.create({
      data: { userId: user.id, packagePriceId: price.id, businessName: "A", contactEmail: "a@b.co", contactPhone: "1" },
    });

    const anon = await callJson(subPut, `/api/subscriptions/${sub.id}/`, {
      method: "PUT",
      body: baseBody(price.id),
    });
    expect(anon.status).toBe(401);

    const forbidden = await callJson(subPut, `/api/subscriptions/${sub.id}/`, {
      method: "PUT",
      token: await tokenFor(user.id),
      body: baseBody(price.id),
    });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ detail: "You do not have permission to perform this action." });

    const mismatch = await callJson(subListDelete, "/api/subscriptions/", {
      method: "DELETE",
      token: await tokenFor(user.id),
    });
    expect(mismatch.status).toBe(405);
    expect(mismatch.body).toEqual({ detail: 'Method "DELETE" not allowed.' });
    expect(mismatch.headers.get("Allow")).toContain("GET");
    expect(mismatch.headers.get("Allow")).toContain("POST");
  });

  it("POST: collects DRF field errors (required, pk, email, int, date, choice, decimal)", async () => {
    const user = await createUser();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);

    const res = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: {
        package_price: 999999,
        status: "bogus",
        payment_status: "bogus2",
        contact_email: "not-an-email",
        grace_period_days: -1,
        start_date: "13/05/2026",
        payment_amount: 10.999,
      },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      package_price: ['Invalid pk "999999" - object does not exist.'],
      status: ['"bogus" is not a valid choice.'],
      payment_status: ['"bogus2" is not a valid choice.'],
      business_name: ["This field is required."],
      contact_email: ["Enter a valid email address."],
      contact_phone: ["This field is required."],
      grace_period_days: ["Ensure this value is greater than or equal to 0."],
      start_date: ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD."],
      payment_amount: ["Ensure that there are no more than 2 decimal places."],
    });
  });

  it("POST: availability + subscription_system object checks", async () => {
    const user = await createUser();
    const inactive = await makeService({ isActive: false });
    const pkgInactive = await makePackage(inactive.id);
    const priceInactive = await makePrice(pkgInactive.id);

    const off = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: baseBody(priceInactive.id),
    });
    expect(off.status).toBe(400);
    expect(off.body).toEqual({ package_price: ["This package is not currently available."] });

    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);
    const otherSvc = await makeService();
    const system = await makeSystem(otherSvc.id);
    const inactiveSystem = await makeSystem(svc.id, { isActive: false });

    const badSystem = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: baseBody(price.id, { subscription_system: inactiveSystem.id }),
    });
    expect(badSystem.status).toBe(400);
    expect(badSystem.body).toEqual({ subscription_system: ["This system is not currently active."] });

    const mismatch = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: baseBody(price.id, { subscription_system: system.id }),
    });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body).toEqual({
      subscription_system: ["Selected system must match the package service."],
    });
  });

  it("POST pending: model defaults, start=today, no window; full response shape", async () => {
    const user = await createUser();
    const svc = await makeService({ name: "Web Build" });
    const pkg = await makePackage(svc.id, { tier: "gold", title: "Growth" });
    const price = await makePrice(pkg.id);

    const res = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: baseBody(price.id),
    });
    expect(res.status).toBe(201);
    const today = todayDateString();
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      user: user.id,
      package_price: price.id,
      subscription_system: null,
      status: "pending",
      payment_status: "pending",
      payment_method: "",
      payment_contact: "",
      payment_amount: null,
      payment_currency: "TZS",
      business_name: "Acme Ltd",
      contact_email: "billing@acme.test",
      contact_phone: "+255700000000",
      notes: "",
      start_date: today,
      end_date: null,
      next_billing_date: null,
      auto_renew: false,
      grace_period_days: 3,
      user_details: { id: user.id, username: user.username, email: user.email, role: "customer" },
      package_details: {
        service: "Web Build",
        tier: "gold",
        title: "Growth",
        features: ["SEO audit", "Fast delivery"],
        payment_notes: "M-Pesa",
        billing_period: "monthly",
        amount: "50.00",
        currency: "TZS",
      },
      service_access: {
        status: "pending",
        can_access: false,
        start_date: today,
        end_date: null,
        next_billing_date: null,
        grace_period_days: 3,
      },
      system_details: null,
      control_details: null,
    });
    expect(res.body.created_at).toMatch(/\+03:00$/);
    expect(res.body).not.toHaveProperty("record_type");
  });
});

describe("subscriptions write flows", () => {
  it("POST paid: status active + monthly window (today..today+30), user field read-only", async () => {
    const owner = await createUser();
    const other = await createUser();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id, { billingPeriod: "monthly" });

    const res = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(owner.id),
      body: baseBody(price.id, { payment_status: "paid", user: other.id, payment_amount: 1000.5 }),
    });
    expect(res.status).toBe(201);
    const today = todayDateString();
    expect(res.body).toMatchObject({
      user: owner.id,
      status: "active",
      payment_status: "paid",
      payment_amount: "1000.50",
      start_date: today,
      end_date: addDays(today, 30),
      next_billing_date: addDays(today, 30),
      service_access: {
        status: "active",
        can_access: true,
        start_date: today,
        end_date: addDays(today, 30),
      },
    });
  });

  it("POST paid + system: provisions control records (control_details, tenant)", async () => {
    const user = await createUser();
    const svc = await makeService();
    const pkg = await makePackage(svc.id, { billingPeriod: undefined });
    const price = await makePrice(pkg.id, { billingPeriod: "yearly" });
    const system = await makeSystem(svc.id);

    const res = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: baseBody(price.id, { payment_status: "paid", subscription_system: system.id }),
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("active");
    expect(res.body.system_details).toMatchObject({
      id: system.id,
      name: "CRM",
      system_url: "https://crm.example.com",
      is_active: true,
    });
    expect(res.body.control_details).toMatchObject({
      license_key: expect.stringMatching(/^LIC-/),
      api_key: expect.stringMatching(/^API-/),
      api_secret: expect.stringMatching(/^[0-9a-f]{48}$/),
      connection_status: "active",
      is_enabled: true,
      license_validate_url: expect.stringMatching(/\/license\/validate\/$/),
    });

    const service = await prisma.tenantService.findFirst({ where: { subscriptionId: res.body.id } });
    expect(service).not.toBeNull();
    const tenant = await prisma.tenant.findFirst({ where: { id: service!.tenantId } });
    expect(tenant).toMatchObject({ ownerId: user.id, status: "active" });
  });

  it("list: ordering -created_at, per-user scoping, admin sees all", async () => {
    const a = await createUser();
    const b = await createUser();
    const admin = await createAdmin();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);

    const first = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(a.id),
      body: baseBody(price.id),
    });
    const second = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(a.id),
      body: baseBody(price.id),
    });
    await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(b.id),
      body: baseBody(price.id),
    });

    const forA = await callJson(subList, "/api/subscriptions/", {
      token: await tokenFor(a.id),
    });
    expect(forA.body.count).toBe(2);
    expect(forA.body.results.map((r: any) => r.id)).toEqual([second.body.id, first.body.id]);

    const forAdmin = await callJson(subList, "/api/subscriptions/", {
      token: await tokenFor(admin.id),
    });
    expect(forAdmin.body.count).toBe(3);
  });

  it("detail: own 200, other user 404 model message, non-numeric pk 404 detail", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const admin = await createAdmin();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);
    const created = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(owner.id),
      body: baseBody(price.id),
    });

    const own = await callJson(subDetail, `/api/subscriptions/${created.body.id}/`, {
      token: await tokenFor(owner.id),
    });
    expect(own.status).toBe(200);
    expect(own.body.id).toBe(created.body.id);

    const strangerRes = await callJson(subDetail, `/api/subscriptions/${created.body.id}/`, {
      token: await tokenFor(stranger.id),
    });
    expect(strangerRes.status).toBe(404);
    expect(strangerRes.body).toEqual({ detail: "No Subscription matches the given query." });

    const adminRes = await callJson(subDetail, `/api/subscriptions/${created.body.id}/`, {
      token: await tokenFor(admin.id),
    });
    expect(adminRes.status).toBe(200);

    const badPk = await callJson(subDetail, "/api/subscriptions/abc/", {
      token: await tokenFor(owner.id),
    });
    expect(badPk.status).toBe(404);
    expect(badPk.body).toEqual({ detail: "Not found." });
  });

  it("PATCH: admin flips to paid -> status active + window assigned; cancelled stays terminal", async () => {
    const user = await createUser();
    const admin = await createAdmin();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);
    const created = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: baseBody(price.id),
    });

    const flipped = await callJson(subPatch, `/api/subscriptions/${created.body.id}/`, {
      method: "PATCH",
      token: await tokenFor(admin.id),
      body: { payment_status: "paid" },
    });
    expect(flipped.status).toBe(200);
    const today = todayDateString();
    expect(flipped.body).toMatchObject({
      status: "active",
      payment_status: "paid",
      start_date: today,
      end_date: addDays(today, 30),
      next_billing_date: addDays(today, 30),
    });

    const cancelled = await callJson(subPatch, `/api/subscriptions/${created.body.id}/`, {
      method: "PATCH",
      token: await tokenFor(admin.id),
      body: { status: "cancelled" },
    });
    expect(cancelled.body.status).toBe("cancelled");
    expect(cancelled.body.service_access.status).toBe("cancelled");
  });

  it("PUT: full replace resets default fields, requires core fields, package_price required", async () => {
    const user = await createUser();
    const admin = await createAdmin();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);
    const created = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: baseBody(price.id, { payment_method: "M-Pesa" }),
    });

    const missing = await callJson(subPut, `/api/subscriptions/${created.body.id}/`, {
      method: "PUT",
      token: await tokenFor(admin.id),
      body: { payment_method: "Airtel" },
    });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({
      package_price: ["This field is required."],
      business_name: ["This field is required."],
      contact_email: ["This field is required."],
      contact_phone: ["This field is required."],
    });

    const full = await callJson(subPut, `/api/subscriptions/${created.body.id}/`, {
      method: "PUT",
      token: await tokenFor(admin.id),
      body: baseBody(price.id, { business_name: "  Renamed  ", contact_phone: "  +255711111111 " }),
    });
    expect(full.status).toBe(200);
    expect(full.body).toMatchObject({
      business_name: "Renamed",
      contact_phone: "+255711111111",
      payment_method: "",
      notes: "",
      auto_renew: false,
      grace_period_days: 3,
      payment_currency: "TZS",
    });
  });

  it("DELETE: non-admin 403, admin 204, second delete 404", async () => {
    const user = await createUser();
    const admin = await createAdmin();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);
    const created = await callJson(subCreate, "/api/subscriptions/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: baseBody(price.id),
    });

    const denied = await callJson(subDelete, `/api/subscriptions/${created.body.id}/`, {
      method: "DELETE",
      token: await tokenFor(user.id),
    });
    expect(denied.status).toBe(403);

    const removed = await callJson(subDelete, `/api/subscriptions/${created.body.id}/`, {
      method: "DELETE",
      token: await tokenFor(admin.id),
    });
    expect(removed.status).toBe(204);

    const again = await callJson(subDetail, `/api/subscriptions/${created.body.id}/`, {
      token: await tokenFor(admin.id),
    });
    expect(again.status).toBe(404);
  });
});
