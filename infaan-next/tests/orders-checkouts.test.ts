import { describe, expect, it } from "vitest";
import { callJson, createUser, createAdmin, tokenFor } from "./helpers";
import { prisma } from "@/lib/prisma";
import { todayDateString } from "@/lib/format";
import { GET as pkgOrderList, POST as pkgOrderCreate } from "@/app/api/package-subscription-orders/route";
import {
  GET as pkgOrderDetail,
  PUT as pkgOrderPut,
  PATCH as pkgOrderPatch,
  DELETE as pkgOrderDelete,
} from "@/app/api/package-subscription-orders/[id]/route";
import { GET as sysOrderList, POST as sysOrderCreate } from "@/app/api/system-subscription-orders/route";
import { GET as sysOrderDetail } from "@/app/api/system-subscription-orders/[id]/route";
import { POST as pkgCheckout, GET as pkgCheckoutGet } from "@/app/api/package-subscriptions/checkout/route";
import { POST as sysCheckout, GET as sysCheckoutGet } from "@/app/api/system-subscriptions/checkout/route";

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
      features: overrides.features ?? ["Feature A"],
    },
  });
}

async function makePrice(packageId: number, overrides: Record<string, any> = {}) {
  return prisma.packagePrice.create({
    data: {
      packageId,
      billingPeriod: overrides.billingPeriod ?? "monthly",
      amount: overrides.amount ?? "75.00",
      currency: "TZS",
    },
  });
}

async function makeSystem(serviceId: number, overrides: Record<string, any> = {}) {
  return prisma.subscriptionSystem.create({
    data: {
      serviceId,
      name: overrides.name ?? "ERP",
      summary: "summary",
      details: "",
      systemUrl: "https://erp.example.com",
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

function body(priceId: number, extra: Record<string, any> = {}) {
  return {
    package_price: priceId,
    business_name: "Order Co",
    contact_email: "orders@co.test",
    contact_phone: "+255722222222",
    ...extra,
  };
}

describe("package subscription orders", () => {
  it("create: user writable, no availability check, no window side effect", async () => {
    const user = await createUser();
    const other = await createUser();
    const inactive = await makeService({ isActive: false });
    const pkg = await makePackage(inactive.id);
    const price = await makePrice(pkg.id);

    const res = await callJson(pkgOrderCreate, "/api/package-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: other.id, payment_status: "paid" }),
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      user: other.id,
      package_price: price.id,
      status: "pending",
      payment_status: "paid",
      start_date: null,
      end_date: null,
      record_type: "package_subscription",
      system_details: null,
      control_details: null,
      service_access: {
        status: "active",
        can_access: true,
        start_date: null,
        end_date: null,
      },
    });
  });

  it("create: missing user/package_price required; list scoping + ordering", async () => {
    const user = await createUser();
    const admin = await createAdmin();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);

    const missing = await callJson(pkgOrderCreate, "/api/package-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: { business_name: "X" },
    });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({
      user: ["This field is required."],
      package_price: ["This field is required."],
      contact_email: ["This field is required."],
      contact_phone: ["This field is required."],
    });

    const first = await callJson(pkgOrderCreate, "/api/package-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id }),
    });
    const second = await callJson(pkgOrderCreate, "/api/package-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id }),
    });

    const mine = await callJson(pkgOrderList, "/api/package-subscription-orders/", {
      token: await tokenFor(user.id),
    });
    expect(mine.body.count).toBe(2);
    expect(mine.body.results.map((r: any) => r.id)).toEqual([second.body.id, first.body.id]);

    const others = await callJson(pkgOrderList, "/api/package-subscription-orders/", {
      token: await tokenFor(admin.id),
    });
    expect(others.body.count).toBe(2);
  });

  it("detail: scoping 404, PUT requires admin + full fields, DELETE 204", async () => {
    const user = await createUser();
    const stranger = await createUser();
    const admin = await createAdmin();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);
    const created = await callJson(pkgOrderCreate, "/api/package-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id }),
    });

    const own = await callJson(pkgOrderDetail, `/api/package-subscription-orders/${created.body.id}/`, {
      token: await tokenFor(user.id),
    });
    expect(own.status).toBe(200);

    const other = await callJson(pkgOrderDetail, `/api/package-subscription-orders/${created.body.id}/`, {
      token: await tokenFor(stranger.id),
    });
    expect(other.status).toBe(404);
    expect(other.body).toEqual({ detail: "No PackageSubscriptionOrder matches the given query." });

    const userPut = await callJson(pkgOrderPut, `/api/package-subscription-orders/${created.body.id}/`, {
      method: "PUT",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id }),
    });
    expect(userPut.status).toBe(403);

    const adminPut = await callJson(pkgOrderPut, `/api/package-subscription-orders/${created.body.id}/`, {
      method: "PUT",
      token: await tokenFor(admin.id),
      body: body(price.id, { user: user.id, status: "active", business_name: "Updated Co" }),
    });
    expect(adminPut.status).toBe(200);
    expect(adminPut.body).toMatchObject({ status: "active", business_name: "Updated Co" });

    const removed = await callJson(pkgOrderDelete, `/api/package-subscription-orders/${created.body.id}/`, {
      method: "DELETE",
      token: await tokenFor(admin.id),
    });
    expect(removed.status).toBe(204);
  });
});

describe("system subscription orders", () => {
  it("create: subscription_system required, no active/match/yearly checks", async () => {
    const user = await createUser();
    const svc = await makeService();
    const otherSvc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id, { billingPeriod: "monthly" });
    const inactiveSystem = await makeSystem(otherSvc.id, { isActive: false });

    const missing = await callJson(sysOrderCreate, "/api/system-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id }),
    });
    expect(missing.status).toBe(400);
    expect(missing.body.subscription_system).toEqual(["This field is required."]);

    const invalidPk = await callJson(sysOrderCreate, "/api/system-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id, subscription_system: 424242 }),
    });
    expect(invalidPk.status).toBe(400);
    expect(invalidPk.body.subscription_system).toEqual([
      'Invalid pk "424242" - object does not exist.',
    ]);

    // Plain serializer: inactive/mismatch/yearly checks do NOT run here.
    const ok = await callJson(sysOrderCreate, "/api/system-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id, subscription_system: inactiveSystem.id }),
    });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({
      subscription_system: inactiveSystem.id,
      status: "pending",
      record_type: "system_subscription",
      system_details: { id: inactiveSystem.id, name: "ERP", is_active: false },
      control_details: null,
    });
  });

  it("list: scoping + record_type; detail 404 model message", async () => {
    const user = await createUser();
    const admin = await createAdmin();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);
    const system = await makeSystem(svc.id);
    const created = await callJson(sysOrderCreate, "/api/system-subscription-orders/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id, subscription_system: system.id }),
    });

    const mine = await callJson(sysOrderList, "/api/system-subscription-orders/", {
      token: await tokenFor(user.id),
    });
    expect(mine.body.count).toBe(1);
    expect(mine.body.results[0].record_type).toBe("system_subscription");

    const adminList = await callJson(sysOrderList, "/api/system-subscription-orders/", {
      token: await tokenFor(admin.id),
    });
    expect(adminList.body.count).toBe(1);

    const missing = await callJson(sysOrderDetail, "/api/system-subscription-orders/999999/", {
      token: await tokenFor(user.id),
    });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ detail: "No SystemSubscriptionOrder matches the given query." });
  });
});

describe("checkouts", () => {
  it("package checkout: 401 anon, 405 GET (user), validation errors", async () => {
    const anon = await callJson(pkgCheckout, "/api/package-subscriptions/checkout/", {
      method: "POST",
      body: {},
    });
    expect(anon.status).toBe(401);

    const user = await createUser();
    const getRes = await callJson(pkgCheckoutGet, "/api/package-subscriptions/checkout/", {
      token: await tokenFor(user.id),
    });
    expect(getRes.status).toBe(405);
    expect(getRes.body).toEqual({ detail: 'Method "GET" not allowed.' });
    expect(getRes.headers.get("Allow")).toContain("POST");

    const anonGet = await callJson(pkgCheckoutGet, "/api/package-subscriptions/checkout/");
    expect(anonGet.status).toBe(401);

    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id);

    const missing = await callJson(pkgCheckout, "/api/package-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: {},
    });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({
      package_price: ["This field is required."],
      business_name: ["This field is required."],
      contact_email: ["This field is required."],
      contact_phone: ["This field is required."],
    });

    const systemBody = await callJson(pkgCheckout, "/api/package-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { subscription_system: 5 }),
    });
    expect(systemBody.status).toBe(400);
    expect(systemBody.body).toEqual({
      subscription_system: ["Use the system subscription checkout API for system subscriptions."],
    });
    for (const allowed of [null, "", "null"]) {
      const okNull = await callJson(pkgCheckout, "/api/package-subscriptions/checkout/", {
        method: "POST",
        token: await tokenFor(user.id),
        body: body(price.id, { subscription_system: allowed }),
      });
      expect(okNull.status).toBe(201);
    }
  });

  it("package checkout: pending defaults; paid monthly window; no provisioning", async () => {
    const user = await createUser();
    const svc = await makeService();
    const pkg = await makePackage(svc.id);
    const price = await makePrice(pkg.id, { billingPeriod: "monthly" });

    const pending = await callJson(pkgCheckout, "/api/package-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { user: user.id }),
    });
    expect(pending.status).toBe(201);
    const today = todayDateString();
    expect(pending.body).toMatchObject({
      user: user.id,
      status: "pending",
      payment_status: "pending",
      payment_method: "",
      payment_currency: "TZS",
      auto_renew: false,
      grace_period_days: 3,
      start_date: today,
      end_date: null,
      record_type: "package_subscription",
      control_details: null,
    });

    const paid = await callJson(pkgCheckout, "/api/package-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(price.id, { payment_status: "paid", payment_amount: "99.5" }),
    });
    expect(paid.status).toBe(201);
    expect(paid.body).toMatchObject({
      status: "active",
      payment_amount: "99.50",
      start_date: today,
      end_date: addDays(today, 30),
      next_billing_date: addDays(today, 30),
      service_access: { status: "active", can_access: true },
      control_details: null,
    });
    const exists = await prisma.tenantService.findFirst();
    expect(exists).toBeNull();
  });

  it("system checkout: validation (pk, inactive, mismatch, yearly)", async () => {
    const user = await createUser();
    const svc = await makeService();
    const otherSvc = await makeService();
    const pkg = await makePackage(svc.id);
    const monthly = await makePrice(pkg.id, { billingPeriod: "monthly" });
    const system = await makeSystem(svc.id);
    const inactiveSystem = await makeSystem(otherSvc.id, { isActive: false });
    const otherActiveSystem = await makeSystem(otherSvc.id);

    const invalid = await callJson(sysCheckout, "/api/system-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(monthly.id, { subscription_system: 777 }),
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.subscription_system).toEqual(['Invalid pk "777" - object does not exist.']);

    const inactive = await callJson(sysCheckout, "/api/system-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(monthly.id, { subscription_system: inactiveSystem.id }),
    });
    expect(inactive.status).toBe(400);
    expect(inactive.body).toEqual({ subscription_system: ["This system is not currently active."] });

    const mismatch = await callJson(sysCheckout, "/api/system-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(monthly.id, { subscription_system: otherActiveSystem.id }),
    });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body).toEqual({
      subscription_system: ["Selected system must match the package service."],
    });

    const yearlyPkgPrice = await makePrice(pkg.id, { billingPeriod: "yearly", amount: "900.00" });
    const wrong = await callJson(sysCheckout, "/api/system-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(yearlyPkgPrice.id, { subscription_system: inactiveSystem.id }),
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body).toEqual({ subscription_system: ["This system is not currently active."] });
  });

  it("system checkout: yearly success provisions control records", async () => {
    const user = await createUser();
    const svc = await makeService({ name: "SysSvc" });
    const pkg = await makePackage(svc.id);
    const yearly = await makePrice(pkg.id, { billingPeriod: "yearly", amount: "1200.00" });
    const system = await makeSystem(svc.id);

    const res = await callJson(sysCheckout, "/api/system-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(yearly.id, { subscription_system: system.id, payment_status: "paid" }),
    });
    expect(res.status).toBe(201);
    const today = todayDateString();
    expect(res.body).toMatchObject({
      user: user.id,
      subscription_system: system.id,
      status: "active",
      start_date: today,
      end_date: addDays(today, 365),
      record_type: "system_subscription",
      system_details: { id: system.id, name: system.name },
      control_details: {
        license_key: expect.stringMatching(/^LIC-/),
        connection_status: "active",
        is_enabled: true,
      },
    });

    const service = await prisma.tenantService.findFirst({
      where: { systemOrderId: res.body.id },
    });
    expect(service).not.toBeNull();
    expect(service!.subscriptionId).toBeNull();

    const nonYearly = await makePrice(pkg.id, { billingPeriod: "monthly", amount: "100.00" });
    const notYearly = await callJson(sysCheckout, "/api/system-subscriptions/checkout/", {
      method: "POST",
      token: await tokenFor(user.id),
      body: body(nonYearly.id, { subscription_system: system.id }),
    });
    expect(notYearly.status).toBe(400);
    expect(notYearly.body).toEqual({ package_price: ["System subscriptions use yearly pricing only."] });
  });
});
