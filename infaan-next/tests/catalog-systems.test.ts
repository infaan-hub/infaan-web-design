import { describe, expect, it } from "vitest";
import { callJson, createUser, createAdmin, tokenFor } from "./helpers";
import { prisma } from "@/lib/prisma";
import { GET as portfolioList, POST as portfolioCreate } from "@/app/api/portfolio-items/route";
import { GET as portfolioDetail, PUT as portfolioPut, PATCH as portfolioPatch, DELETE as portfolioDelete } from "@/app/api/portfolio-items/[id]/route";
import { GET as sysList, POST as sysCreate } from "@/app/api/subscription-systems/route";
import { GET as sysDetail, PUT as sysPut, DELETE as sysDelete } from "@/app/api/subscription-systems/[id]/route";

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
    },
  });
}

async function makeSystem(serviceId: number, overrides: Record<string, any> = {}) {
  return prisma.subscriptionSystem.create({
    data: {
      serviceId,
      name: overrides.name ?? "CRM",
      summary: overrides.summary ?? "summary",
      details: overrides.details ?? "",
      systemUrl: overrides.systemUrl ?? "",
      adminUrl: overrides.adminUrl ?? "",
      displayPrice: overrides.displayPrice ?? null,
      displayPriceCurrency: overrides.displayPriceCurrency ?? "TZS",
      coverImage: overrides.coverImage ?? "cover",
      galleryImages: overrides.galleryImages ?? [],
      isActive: overrides.isActive ?? true,
    },
  });
}

describe("portfolio items", () => {
  it("POST: null relations omit service_name/package_title keys entirely", async () => {
    const admin = await createAdmin();
    const res = await callJson(portfolioCreate, "/api/portfolio-items/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: { name: "Standalone", image_data: "data" },
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      name: "Standalone",
      image_data: "data",
      is_active: true,
      service: null,
      package: null,
      created_at: expect.stringMatching(/\+03:00$/),
      updated_at: expect.stringMatching(/\+03:00$/),
    });
    expect(res.body).not.toHaveProperty("service_name");
    expect(res.body).not.toHaveProperty("package_title");
  });

  it("POST: relations present -> nested names included; invalid pk errors", async () => {
    const service = await makeService({ name: "Pixel Co" });
    const pkg = await makePackage(service.id, { title: "Starter Pack" });
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const ok = await callJson(portfolioCreate, "/api/portfolio-items/", {
      method: "POST",
      token,
      body: { name: "Shot", image_data: "img", service: service.id, package: pkg.id },
    });
    expect(ok.status).toBe(201);
    expect(ok.body.service).toBe(service.id);
    expect(ok.body.service_name).toBe("Pixel Co");
    expect(ok.body.package).toBe(pkg.id);
    expect(ok.body.package_title).toBe("Starter Pack");

    const badService = await callJson(portfolioCreate, "/api/portfolio-items/", {
      method: "POST",
      token,
      body: { name: "Shot", image_data: "img", service: 99999 },
    });
    expect(badService.status).toBe(400);
    expect(badService.body).toEqual({ service: ['Invalid pk "99999" - object does not exist.'] });

    const badPackage = await callJson(portfolioCreate, "/api/portfolio-items/", {
      method: "POST",
      token,
      body: { name: "Shot", image_data: "img", package: "abc" },
    });
    expect(badPackage.body).toEqual({ package: ['Invalid pk "abc" - object does not exist.'] });
  });

  it("visibility + detail 404 + PATCH clears relation with null", async () => {
    const service = await makeService();
    const active = await prisma.portfolioItem.create({
      data: { name: "A", imageData: "x", serviceId: service.id, isActive: true },
      include: { service: true, servicePackage: true },
    });
    await prisma.portfolioItem.create({
      data: { name: "B", imageData: "y", isActive: false },
      include: { service: true, servicePackage: true },
    });

    const anonList = await callJson(portfolioList, "/api/portfolio-items/");
    expect(anonList.status).toBe(200);
    expect(anonList.body.count).toBe(1);

    const missing = await callJson(portfolioDetail, "/api/portfolio-items/999999/");
    expect(missing.body).toEqual({ detail: "No PortfolioItem matches the given query." });

    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const patch = await callJson(portfolioPatch, `/api/portfolio-items/${active.id}/`, {
      method: "PATCH",
      token,
      body: { service: null },
    });
    expect(patch.status).toBe(200);
    expect(patch.body.service).toBeNull();
    expect(patch.body).not.toHaveProperty("service_name");

    const del = await callJson(portfolioDelete, `/api/portfolio-items/${active.id}/`, {
      method: "DELETE",
      token,
    });
    expect(del.status).toBe(204);
    const adminList = await callJson(portfolioList, "/api/portfolio-items/", { token });
    expect(adminList.body.count).toBe(1); // inactive B remains, visible to admin
  });

  it("PUT requires name/image_data", async () => {
    const item = await prisma.portfolioItem.create({
      data: { name: "Keep", imageData: "img", isActive: true },
    });
    const admin = await createAdmin();
    const res = await callJson(portfolioPut, `/api/portfolio-items/${item.id}/`, {
      method: "PUT",
      token: await tokenFor(admin.id),
      body: { name: "New" },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ image_data: ["This field is required."] });
  });
});

describe("subscription systems", () => {
  it("POST: service must be system_subscription category", async () => {
    const website = await makeService({ category: "website" });
    const admin = await createAdmin();
    const res = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: {
        service: website.id,
        name: "CRM",
        summary: "s",
        cover_image: "img",
        gallery_images: ["1", "2", "3", "4", "5"],
      },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      service: ["System subscriptions must use the system subscription service category."],
    });

    const badPk = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: { service: 99999, name: "CRM", summary: "s", cover_image: "img" },
    });
    expect(badPk.body).toEqual({ service: ['Invalid pk "99999" - object does not exist.'] });
  });

  it("POST: gallery exactly 5, URLs, decimal, currency uppercase", async () => {
    const service = await makeService({ category: "system_subscription" });
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);
    const base = { service: service.id, name: "CRM", summary: "s", cover_image: "img" };

    const missingCover = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token,
      body: { ...base, cover_image: undefined },
    });
    expect(missingCover.status).toBe(400);
    expect(missingCover.body).toEqual({ cover_image: ["This field is required."] });

    const badGallery = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token,
      body: { ...base, gallery_images: ["1", "2", "3", "4"] },
    });
    expect(badGallery.body).toEqual({
      gallery_images: ["Provide exactly 5 gallery images for the system view."],
    });

    const nullGallery = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token,
      body: { ...base, gallery_images: null },
    });
    expect(nullGallery.body).toEqual({ gallery_images: ["This field may not be null."] });

    const badUrl = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token,
      body: { ...base, system_url: "not a url", gallery_images: ["1", "2", "3", "4", "5"] },
    });
    expect(badUrl.body).toEqual({ system_url: ["Enter a valid URL."] });

    const badPrice = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token,
      body: { ...base, display_price: "abc", gallery_images: ["1", "2", "3", "4", "5"] },
    });
    expect(badPrice.body).toEqual({ display_price: ["A valid number is required."] });

    const ok = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token,
      body: {
        ...base,
        details: "det",
        system_url: " https://example.com/app ",
        admin_url: "",
        display_price: "",
        display_price_currency: "usd",
        gallery_images: ["a", "b", "c", "d", "e"],
        is_active: "on",
      },
    });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({
      service: service.id,
      service_name: service.name,
      name: "CRM",
      summary: "s",
      details: "det",
      system_url: "https://example.com/app",
      admin_url: "",
      display_price: null,
      display_price_currency: "USD",
      cover_image: "img",
      gallery_images: ["a", "b", "c", "d", "e"],
      is_active: true,
      packages: [],
      price_preview: [],
    });
    expect(ok.body.created_at).toMatch(/\+03:00$/);
  });

  it("POST: non-list gallery iterates like a sequence (string chars count)", async () => {
    const service = await makeService({ category: "system_subscription" });
    const admin = await createAdmin();
    const res = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: {
        service: service.id,
        name: "X",
        summary: "s",
        cover_image: "img",
        gallery_images: "abcde",
      },
    });
    // "abcde" iterates as 5 chars -> passes; stored as the filtered list
    expect(res.status).toBe(201);
    expect(res.body.gallery_images).toEqual(["a", "b", "c", "d", "e"]);

    const four = await callJson(sysCreate, "/api/subscription-systems/", {
      method: "POST",
      token: await tokenFor(admin.id),
      body: {
        service: service.id,
        name: "Y",
        summary: "s",
        cover_image: "img",
        gallery_images: "abcd",
      },
    });
    expect(four.status).toBe(400);
    expect(four.body).toEqual({
      gallery_images: ["Provide exactly 5 gallery images for the system view."],
    });
  });

  it("list/detail visibility, nested packages in output, 404s, delete", async () => {
    const service = await makeService({ category: "system_subscription", name: "SysSvc" });
    const pkg = await makePackage(service.id, { tier: "gold", title: "Gold" });
    await prisma.packagePrice.create({
      data: { packageId: pkg.id, billingPeriod: "monthly", amount: "25.00", currency: "TZS", isDefault: true },
    });
    const active = await makeSystem(service.id, { name: "ActiveCRM" });
    const hidden = await makeSystem(service.id, { name: "HiddenCRM", isActive: false });

    const anon = await callJson(sysList, "/api/subscription-systems/");
    expect(anon.status).toBe(200);
    expect(anon.body.count).toBe(1);

    const anonHidden = await callJson(sysDetail, `/api/subscription-systems/${hidden.id}/`);
    expect(anonHidden.status).toBe(404);
    expect(anonHidden.body).toEqual({ detail: "No SubscriptionSystem matches the given query." });

    const anonDetail = await callJson(sysDetail, `/api/subscription-systems/${active.id}/`);
    expect(anonDetail.status).toBe(200);
    expect(anonDetail.body.packages).toHaveLength(1);
    expect(anonDetail.body.packages[0].title).toBe("Gold");
    expect(anonDetail.body.price_preview).toEqual([
      {
        package_id: pkg.id,
        package_title: "Gold",
        billing_period: "monthly",
        amount: "25.00",
        currency: "TZS",
        is_default: true,
      },
    ]);

    const missing = await callJson(sysDetail, "/api/subscription-systems/999999/");
    expect(missing.body).toEqual({ detail: "No SubscriptionSystem matches the given query." });
    const malformed = await callJson(sysDetail, "/api/subscription-systems/abc/");
    expect(malformed.body).toEqual({ detail: "Not found." });

    const admin = await createAdmin();
    const token = await tokenFor(admin.id);
    const adminList = await callJson(sysList, "/api/subscription-systems/", { token });
    expect(adminList.body.count).toBe(2);

    const del = await callJson(sysDelete, `/api/subscription-systems/${active.id}/`, {
      method: "DELETE",
      token,
    });
    expect(del.status).toBe(204);
    const after = await callJson(sysDetail, `/api/subscription-systems/${active.id}/`, { token });
    expect(after.status).toBe(404);
  });

  it("PUT requires service/name/summary/cover_image", async () => {
    const service = await makeService({ category: "system_subscription" });
    const system = await makeSystem(service.id);
    const admin = await createAdmin();
    const res = await callJson(sysPut, `/api/subscription-systems/${system.id}/`, {
      method: "PUT",
      token: await tokenFor(admin.id),
      body: { details: "d" },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      service: ["This field is required."],
      name: ["This field is required."],
      summary: ["This field is required."],
      cover_image: ["This field is required."],
    });
  });
});
