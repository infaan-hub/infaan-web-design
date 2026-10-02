import { describe, expect, it } from "vitest";
import { callJson, createUser, createAdmin, tokenFor } from "./helpers";
import { prisma } from "@/lib/prisma";
import { GET as servicesList, POST as serviceCreate, PUT as servicesListPut } from "@/app/api/services/route";
import { GET as serviceDetail, PUT as servicePut, PATCH as servicePatch, DELETE as serviceDelete } from "@/app/api/services/[id]/route";
import { POST as priceCreate, GET as priceList } from "@/app/api/prices/route";
import { GET as priceDetail, PUT as pricePut, PATCH as pricePatch, DELETE as priceDelete } from "@/app/api/prices/[id]/route";
import { GET as pkgList, POST as pkgCreate } from "@/app/api/packages/route";
import { GET as pkgDetail, PUT as pkgPut, PATCH as pkgPatch, DELETE as pkgDelete } from "@/app/api/packages/[id]/route";
import { POST as logoCreate, GET as logoList } from "@/app/api/logo-poster-packages/route";
import { GET as logoDetail, DELETE as logoDelete } from "@/app/api/logo-poster-packages/[id]/route";

const TIER_CONFLICT = "An active package with this tier already exists for the selected service.";
const LOGO_SERVICE_MSG = "Use this API only for Logo & Poster Design services.";
const LOGO_PRICES_MSG = "Provide at least one per_task price.";

async function makeService(overrides: Record<string, any> = {}) {
  return prisma.service.create({
    data: {
      name: overrides.name ?? `svc_${Math.random().toString(36).slice(2, 9)}`,
      category: overrides.category ?? "website",
      shortDescription: overrides.shortDescription ?? "short",
      details: overrides.details ?? "details",
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
      description: overrides.description ?? "desc",
      isActive: overrides.isActive ?? true,
    },
  });
}

async function makePrice(packageId: number, overrides: Record<string, any> = {}) {
  return prisma.packagePrice.create({
    data: {
      packageId,
      billingPeriod: overrides.billingPeriod ?? "monthly",
      amount: overrides.amount ?? "10.00",
      currency: overrides.currency ?? "TZS",
      isDefault: overrides.isDefault ?? false,
    },
  });
}

describe("catalog permissions (IsAdminOrReadOnly)", () => {
  it("anon can read services; only active rows are visible", async () => {
    await makeService({ name: "Visible", isActive: true });
    await makeService({ name: "Hidden", isActive: false });

    const anon = await callJson(servicesList, "/api/services/");
    expect(anon.status).toBe(200);
    expect(anon.body.count).toBe(1);
    expect(anon.body.results[0].name).toBe("Visible");
    expect(anon.headers.get("Allow")).toBe("GET, POST, HEAD, OPTIONS");

    const admin = await createAdmin();
    const asAdmin = await callJson(servicesList, "/api/services/", {
      token: await tokenFor(admin.id),
    });
    expect(asAdmin.body.count).toBe(2);
  });

  it("writes: 401 anonymous, 403 customer (with DRF detail + WWW-Authenticate)", async () => {
    const anon = await callJson(serviceCreate, "/api/services/", {
      method: "POST",
      body: { name: "x", category: "website", short_description: "s", details: "d" },
    });
    expect(anon.status).toBe(401);
    expect(anon.body).toEqual({ detail: "Authentication credentials were not provided." });
    expect(anon.headers.get("WWW-Authenticate")).toBe('Bearer realm="api"');

    const customer = await createUser();
    const asCustomer = await callJson(serviceCreate, "/api/services/", {
      method: "POST",
      token: await tokenFor(customer.id),
      body: { name: "x", category: "website", short_description: "s", details: "d" },
    });
    expect(asCustomer.status).toBe(403);
    expect(asCustomer.body).toEqual({ detail: "You do not have permission to perform this action." });
  });

  it("unmapped method: permission gate runs BEFORE 405 (anon 401, customer 403, admin 405)", async () => {
    const anon = await callJson(servicesListPut, "/api/services/", { method: "PUT", body: {} });
    expect(anon.status).toBe(401);

    const customer = await createUser();
    const asCustomer = await callJson(servicesListPut, "/api/services/", {
      method: "PUT",
      token: await tokenFor(customer.id),
      body: {},
    });
    expect(asCustomer.status).toBe(403);

    const admin = await createAdmin();
    const asAdmin = await callJson(servicesListPut, "/api/services/", {
      method: "PUT",
      token: await tokenFor(admin.id),
      body: {},
    });
    expect(asAdmin.status).toBe(405);
    expect(asAdmin.body).toEqual({ detail: 'Method "PUT" not allowed.' });
    expect(asAdmin.headers.get("Allow")).toBe("GET, POST, HEAD, OPTIONS");
  });
});

describe("services CRUD", () => {
  it("POST as admin creates with DRF shape and +03:00 timestamps", async () => {
    const admin = await createAdmin();
    const res = await callJson(serviceCreate, "/api/services/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: {
        name: "Web Design",
        category: "website",
        short_description: "We build sites",
        details: "Full details",
        is_active: "notabool?",
      },
    });
    // invalid boolean -> field error
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ is_active: ["Must be a valid boolean."] });

    const ok = await callJson(serviceCreate, "/api/services/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: {
        name: "Web Design",
        category: "website",
        short_description: "We build sites",
        details: "Full details",
        is_active: "yes",
      },
    });
    expect(ok.status).toBe(201);
    expect(ok.body).toEqual({
      id: expect.any(Number),
      name: "Web Design",
      category: "website",
      short_description: "We build sites",
      details: "Full details",
      is_active: true,
      created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+03:00$/),
      updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+03:00$/),
    });
  });

  it("POST field errors: required, choice, unique, max_length", async () => {
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const missing = await callJson(serviceCreate, "/api/services/", { method: "POST", token, body: {} });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({
      name: ["This field is required."],
      category: ["This field is required."],
      short_description: ["This field is required."],
      details: ["This field is required."],
    });

    const badChoice = await callJson(serviceCreate, "/api/services/", {
      method: "POST",
      token,
      body: { name: "a", category: true, short_description: "s", details: "d" },
    });
    expect(badChoice.body).toEqual({ category: ['"True" is not a valid choice.'] });

    await makeService({ name: "Taken" });
    const dup = await callJson(serviceCreate, "/api/services/", {
      method: "POST",
      token,
      body: { name: "Taken", category: "website", short_description: "s", details: "d" },
    });
    expect(dup.body).toEqual({ name: ["service with this name already exists."] });

    const tooLong = await callJson(serviceCreate, "/api/services/", {
      method: "POST",
      token,
      body: { name: "x".repeat(121), category: "website", short_description: "s", details: "d" },
    });
    expect(tooLong.body).toEqual({ name: ["Ensure this field has no more than 120 characters."] });
  });

  it("detail: model 404 vs malformed pk 404; inactive hidden from anon", async () => {
    const hidden = await makeService({ name: "Hidden", isActive: false });

    const missing = await callJson(serviceDetail, "/api/services/999999/");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ detail: "No Service matches the given query." });

    const malformed = await callJson(serviceDetail, "/api/services/abc/");
    expect(malformed.status).toBe(404);
    expect(malformed.body).toEqual({ detail: "Not found." });

    const anonHidden = await callJson(serviceDetail, `/api/services/${hidden.id}/`);
    expect(anonHidden.status).toBe(404);
    expect(anonHidden.body).toEqual({ detail: "No Service matches the given query." });

    const admin = await createAdmin();
    const adminHidden = await callJson(serviceDetail, `/api/services/${hidden.id}/`, {
      token: await tokenFor(admin.id),
    });
    expect(adminHidden.status).toBe(200);
    expect(adminHidden.body.name).toBe("Hidden");
  });

  it("PUT replaces provided fields (missing required -> 400), PATCH updates only what is given", async () => {
    const service = await makeService({ name: "Original" });
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const putMissing = await callJson(servicePut, `/api/services/${service.id}/`, {
      method: "PUT",
      token,
      body: { category: "website" },
    });
    expect(putMissing.status).toBe(400);
    expect(putMissing.body).toEqual({
      name: ["This field is required."],
      short_description: ["This field is required."],
      details: ["This field is required."],
    });

    const put = await callJson(servicePut, `/api/services/${service.id}/`, {
      method: "PUT",
      token,
      body: {
        name: "Renamed",
        category: "digital_ads",
        short_description: "new short",
        details: "new details",
        is_active: false,
      },
    });
    expect(put.status).toBe(200);
    expect(put.body.name).toBe("Renamed");
    expect(put.body.category).toBe("digital_ads");
    expect(put.body.is_active).toBe(false);

    const patch = await callJson(servicePatch, `/api/services/${service.id}/`, {
      method: "PATCH",
      token,
      body: { is_active: true },
    });
    expect(patch.status).toBe(200);
    expect(patch.body.is_active).toBe(true);
    expect(patch.body.name).toBe("Renamed");
    expect(patch.body.category).toBe("digital_ads");
  });

  it("DELETE removes the service (204 empty body)", async () => {
    const service = await makeService();
    const admin = await createAdmin();
    const res = await callJson(serviceDelete, `/api/services/${service.id}/`, {
      method: "DELETE",
      token: await tokenFor(admin.id),
    });
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();

    const after = await callJson(serviceDetail, `/api/services/${service.id}/`);
    expect(after.status).toBe(404);
  });
});

describe("prices", () => {
  it("POST is always a 500 (`package` is read-only, NOT NULL insert fails)", async () => {
    const admin = await createAdmin();
    const res = await callJson(priceCreate, "/api/prices/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: { package: 1, billing_period: "monthly", amount: "10.00" },
    });
    expect(res.status).toBe(500);
  });

  it("GET list: ordered, decimalOut amounts, anon allowed", async () => {
    const pkg = await makePackage((await makeService()).id, { tier: "gold" });
    await makePrice(pkg.id, { billingPeriod: "weekly", amount: "5" });
    await makePrice(pkg.id, { billingPeriod: "monthly", amount: "10.00" });

    const res = await callJson(priceList, "/api/prices/");
    expect(res.status).toBe(200);
    // ordering: package.service.name, package.tier, billing_period (alphabetical)
    expect(res.body.results.map((p: any) => p.billing_period)).toEqual(["monthly", "weekly"]);
    expect(res.body.results[0].amount).toBe("10.00");
    expect(res.body.results[1].amount).toBe("5.00");
    expect(res.body.results[0].package).toBe(pkg.id);
  });

  it("PUT requires billing_period; PATCH updates amount with decimal validation", async () => {
    const pkg = await makePackage((await makeService()).id);
    const price = await makePrice(pkg.id);
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const putMissing = await callJson(pricePut, `/api/prices/${price.id}/`, {
      method: "PUT",
      token,
      body: { amount: "5.00" },
    });
    expect(putMissing.status).toBe(400);
    expect(putMissing.body).toEqual({ billing_period: ["This field is required."] });

    const patch = await callJson(pricePatch, `/api/prices/${price.id}/`, {
      method: "PATCH",
      token,
      body: { amount: "99.5" },
    });
    expect(patch.status).toBe(200);
    expect(patch.body.amount).toBe("99.50");

    const badPrecision = await callJson(pricePatch, `/api/prices/${price.id}/`, {
      method: "PATCH",
      token,
      body: { amount: "10.000" },
    });
    expect(badPrecision.body).toEqual({
      amount: ["Ensure that there are no more than 2 decimal places."],
    });

    const tooMany = await callJson(pricePatch, `/api/prices/${price.id}/`, {
      method: "PATCH",
      token,
      body: { amount: "12345678901" },
    });
    expect(tooMany.body).toEqual({
      amount: ["Ensure that there are no more than 10 digits in total."],
    });

    const notANumber = await callJson(pricePatch, `/api/prices/${price.id}/`, {
      method: "PATCH",
      token,
      body: { amount: "abc" },
    });
    expect(notANumber.body).toEqual({ amount: ["A valid number is required."] });
  });

  it("DELETE: unreferenced -> 204; referenced by a subscription -> 500 (Django PROTECT)", async () => {
    const service = await makeService();
    const pkg = await makePackage(service.id);
    const price = await makePrice(pkg.id);
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const ok = await callJson(priceDelete, `/api/prices/${price.id}/`, { method: "DELETE", token });
    expect(ok.status).toBe(204);

    const referenced = await makePrice(pkg.id, { billingPeriod: "yearly" });
    const user = await createUser();
    await prisma.subscription.create({
      data: {
        userId: user.id,
        packagePriceId: referenced.id,
        businessName: "Biz",
        contactEmail: "a@b.co",
        contactPhone: "0712345678",
      },
    });
    const blocked = await callJson(priceDelete, `/api/prices/${referenced.id}/`, {
      method: "DELETE",
      token,
    });
    expect(blocked.status).toBe(500);

    const gone = await callJson(priceDetail, `/api/prices/${referenced.id}/`);
    expect(gone.status).toBe(200); // still there
    const notFound = await callJson(priceDetail, "/api/prices/999999/");
    expect(notFound.body).toEqual({ detail: "No PackagePrice matches the given query." });
  });
});

describe("packages", () => {
  it("POST creates with nested prices and returns them", async () => {
    const service = await makeService({ name: "Agency", category: "website" });
    const admin = await createAdmin();
    const res = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: {
        service: service.id,
        tier: "gold",
        title: "Gold Plan",
        description: "Nice",
        features: ["a", "b"],
        prices: [
          { billing_period: "monthly", amount: "10.00" },
          { billing_period: "yearly", amount: "100.00", currency: "usd", is_default: true },
        ],
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.service_name).toBe("Agency");
    expect(res.body.features).toEqual(["a", "b"]);
    expect(res.body.prices).toHaveLength(2);
    expect(res.body.prices[0]).toMatchObject({
      billing_period: "monthly",
      amount: "10.00",
      currency: "TZS",
      is_default: false,
    });
    expect(res.body.prices[1]).toMatchObject({
      billing_period: "yearly",
      amount: "100.00",
      currency: "USD",
      is_default: true,
    });
    expect(res.body.created_at).toMatch(/\+03:00$/);
  });

  it("nested price errors: full-length array with {} for valid entries", async () => {
    const service = await makeService();
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);
    const base = { service: service.id, tier: "silver", title: "t", description: "d" };

    const missingField = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token,
      body: { ...base, prices: [{ billing_period: "monthly", amount: "10.00" }, { amount: "5" }] },
    });
    expect(missingField.status).toBe(400);
    expect(missingField.body).toEqual({
      prices: [{}, { billing_period: ["This field is required."] }],
    });

    const notDict = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token,
      body: { ...base, prices: ["hi"] },
    });
    expect(notDict.body).toEqual({
      prices: [{ non_field_errors: ["Invalid data. Expected a dictionary, but got str."] }],
    });

    const nullList = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token,
      body: { ...base, prices: null },
    });
    expect(nullList.body).toEqual({ prices: ["This field may not be null."] });

    const wrongType = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token,
      body: { ...base, prices: "x" },
    });
    expect(wrongType.body).toEqual({
      prices: ['Expected a list of items but got type "str".'],
    });

    const duplicate = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token,
      body: {
        ...base,
        prices: [
          { billing_period: "monthly", amount: "10.00" },
          { billing_period: "monthly", amount: "20.00", currency: "tzs" },
        ],
      },
    });
    expect(duplicate.body).toEqual({
      prices: ["Each billing period and currency combination must be unique."],
    });
  });

  it("tier conflict and invalid service pk", async () => {
    const service = await makeService();
    await makePackage(service.id, { tier: "silver" });
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const conflict = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token,
      body: { service: service.id, tier: "silver", title: "t", description: "d", prices: [] },
    });
    expect(conflict.status).toBe(400);
    expect(conflict.body).toEqual({ tier: [TIER_CONFLICT] });

    const badPk = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token,
      body: { service: 99999, tier: "gold", title: "t", description: "d", prices: [] },
    });
    expect(badPk.body).toEqual({ service: ['Invalid pk "99999" - object does not exist.'] });

    const nonIntPk = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token,
      body: { service: "abc", tier: "gold", title: "t", description: "d", prices: [] },
    });
    expect(nonIntPk.body).toEqual({ service: ['Invalid pk "abc" - object does not exist.'] });
  });

  it("logo route: wrong service category, per_task-only prices, forced logo serializer", async () => {
    const website = await makeService({ category: "website" });
    const logo = await makeService({ category: "logo_poster" });
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const wrongCategory = await callJson(logoCreate, "/api/logo-poster-packages/", {
      method: "POST",
      token,
      body: { service: website.id, tier: "silver", title: "t", description: "d", prices: [] },
    });
    expect(wrongCategory.status).toBe(400);
    expect(wrongCategory.body).toEqual({ service: [LOGO_SERVICE_MSG] });

    const noPrices = await callJson(logoCreate, "/api/logo-poster-packages/", {
      method: "POST",
      token,
      body: { service: logo.id, tier: "silver", title: "t", description: "d", prices: [] },
    });
    expect(noPrices.body).toEqual({ prices: [LOGO_PRICES_MSG] });

    const filtered = await callJson(logoCreate, "/api/logo-poster-packages/", {
      method: "POST",
      token,
      body: {
        service: logo.id,
        tier: "gold",
        title: "Logo Gold",
        description: "d",
        prices: [
          { billing_period: "monthly", amount: "10.00" },
          { billing_period: "per_task", amount: "50.00" },
        ],
      },
    });
    expect(filtered.status).toBe(201);
    expect(filtered.body.prices).toHaveLength(1);
    expect(filtered.body.prices[0].billing_period).toBe("per_task");
  });

  it("logo route detail/list restricts queryset to logo services", async () => {
    const websitePkg = await makePackage((await makeService({ category: "website" })).id);
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const detail = await callJson(logoDetail, `/api/logo-poster-packages/${websitePkg.id}/`, { token });
    expect(detail.status).toBe(404);
    expect(detail.body).toEqual({ detail: "No ServicePackage matches the given query." });

    const deleted = await callJson(logoDelete, `/api/logo-poster-packages/${websitePkg.id}/`, {
      method: "DELETE",
      token,
    });
    expect(deleted.status).toBe(404);

    const logoSvc = await makeService({ category: "logo_poster" });
    await makePackage(logoSvc.id, { tier: "silver" });
    await makePackage(logoSvc.id, { tier: "gold" });
    const list = await callJson(logoList, "/api/logo-poster-packages/", { token });
    expect(list.status).toBe(200);
    expect(list.body.results).toHaveLength(2);
    expect(list.body.results.every((p: any) => p.service === logoSvc.id)).toBe(true);
  });

  it("PUT requires full fields; PATCH keeps the rest; prices sync on update", async () => {
    const service = await makeService();
    const pkg = await makePackage(service.id, { tier: "silver" });
    await makePrice(pkg.id, { billingPeriod: "monthly" });
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const putMissing = await callJson(pkgPut, `/api/packages/${pkg.id}/`, {
      method: "PUT",
      token,
      body: { tier: "silver" },
    });
    expect(putMissing.status).toBe(400);
    expect(putMissing.body).toEqual({
      service: ["This field is required."],
      title: ["This field is required."],
      description: ["This field is required."],
    });

    const patch = await callJson(pkgPatch, `/api/packages/${pkg.id}/`, {
      method: "PATCH",
      token,
      body: { title: "Updated Title" },
    });
    expect(patch.status).toBe(200);
    expect(patch.body.title).toBe("Updated Title");
    expect(patch.body.tier).toBe("silver");
    expect(patch.body.prices).toHaveLength(1);

    const priceSync = await callJson(pkgPatch, `/api/packages/${pkg.id}/`, {
      method: "PATCH",
      token,
      body: { prices: [{ billing_period: "yearly", amount: "90.00" }] },
    });
    expect(priceSync.status).toBe(200);
    expect(priceSync.body.prices).toHaveLength(1);
    expect(priceSync.body.prices[0].billing_period).toBe("yearly");
    expect(priceSync.body.prices[0].amount).toBe("90.00");
  });

  it("create on inactive (service, tier) reactivates the row", async () => {
    const service = await makeService();
    const existing = await makePackage(service.id, { tier: "silver", title: "Old", isActive: false });
    const admin = await createAdmin();

    const res = await callJson(pkgCreate, "/api/packages/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: {
        service: service.id,
        tier: "silver",
        title: "New Title",
        description: "d",
        prices: [{ billing_period: "monthly", amount: "10.00" }],
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(existing.id);
    expect(res.body.title).toBe("New Title");
    expect(res.body.is_active).toBe(true);
    expect(res.body.prices).toHaveLength(1);
  });

  it("DELETE: unreferenced -> 204 + gone; referenced -> 204 but soft-deleted", async () => {
    const service = await makeService();
    const pkg = await makePackage(service.id);
    const price = await makePrice(pkg.id);
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const hard = await callJson(pkgDelete, `/api/packages/${pkg.id}/`, { method: "DELETE", token });
    expect(hard.status).toBe(204);
    const gone = await callJson(pkgDetail, `/api/packages/${pkg.id}/`);
    expect(gone.status).toBe(404);

    const referencedPkg = await makePackage(service.id, { tier: "gold" });
    const referencedPrice = await makePrice(referencedPkg.id, { billingPeriod: "weekly" });
    const user = await createUser();
    await prisma.subscription.create({
      data: {
        userId: user.id,
        packagePriceId: referencedPrice.id,
        businessName: "Biz",
        contactEmail: "a@b.co",
        contactPhone: "0712345678",
      },
    });
    const soft = await callJson(pkgDelete, `/api/packages/${referencedPkg.id}/`, {
      method: "DELETE",
      token,
    });
    expect(soft.status).toBe(204);

    const stillThere = await callJson(pkgDetail, `/api/packages/${referencedPkg.id}/`, { token });
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.is_active).toBe(false);
  });
});
