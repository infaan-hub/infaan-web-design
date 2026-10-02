import { describe, expect, it } from "vitest";
import { callJson, createUser, createAdmin, tokenFor } from "./helpers";
import { prisma } from "@/lib/prisma";
import { GET as list, POST as create, PUT as listPut } from "@/app/api/users/route";
import { GET as detail, PUT as put, PATCH as patch, DELETE as remove } from "@/app/api/users/[id]/route";
import { POST as login } from "@/app/api/auth/login/route";

describe("GET /api/users/", () => {
  it("requires admin (401 anonymous, 403 customer, 200 admin)", async () => {
    const anon = await callJson(list, "/api/users/");
    expect(anon.status).toBe(401);
    expect(anon.body).toEqual({ detail: "Authentication credentials were not provided." });

    const customer = await createUser();
    const asCustomer = await callJson(list, "/api/users/", { token: await tokenFor(customer.id) });
    expect(asCustomer.status).toBe(403);
    expect(asCustomer.body).toEqual({ detail: "You do not have permission to perform this action." });

    const admin = await createAdmin();
    const asAdmin = await callJson(list, "/api/users/", { token: await tokenFor(admin.id) });
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body).toHaveProperty("count");
    expect(asAdmin.body).toHaveProperty("results");
    expect(Array.isArray(asAdmin.body.results)).toBe(true);
  });

  it("paginates with DRF shape (page size 20, absolute next/prev)", async () => {
    for (let i = 0; i < 22; i++) {
      await prisma.user.create({
        data: {
          username: `bulk${i}`,
          email: `bulk${i}@example.com`,
          password: "!fast",
          role: "customer",
          isActive: true,
          isStaff: false,
          isSuperuser: false,
        },
      });
    }
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const page1 = await callJson(list, "/api/users/?page=1", { token });
    expect(page1.status).toBe(200);
    expect(page1.body.count).toBe(23);
    expect(page1.body.results).toHaveLength(20);
    expect(page1.body.previous).toBeNull();
    expect(page1.body.next).toMatch(/^http:\/\/localhost:3000\/api\/users\/\?page=2$/);

    const page2 = await callJson(list, "/api/users/?page=2", { token });
    expect(page2.status).toBe(200);
    expect(page2.body.results).toHaveLength(3);
    expect(page2.body.next).toBeNull();
    expect(page2.body.previous).toMatch(/page=1$/);

    const bad = await callJson(list, "/api/users/?page=abc", { token });
    expect(bad.status).toBe(404);
    expect(bad.body).toEqual({ detail: "Invalid page." });

    const beyond = await callJson(list, "/api/users/?page=99", { token });
    expect(beyond.status).toBe(404);
    expect(beyond.body).toEqual({ detail: "Invalid page." });
  });
});

describe("POST /api/users/", () => {
  it("creates users via AdminUserSerializer (defaults, no is_staff in output)", async () => {
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);

    const res = await callJson(create, "/api/users/", {
      method: "POST",
      token,
      body: { username: "newbie", email: "newbie@example.com" }, // no password -> ChangeMe123!
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      username: "newbie",
      first_name: "",
      last_name: "",
      email: "newbie@example.com",
      phone_number: "",
      role: "customer",
      is_active: true,
    });
    expect(res.body).not.toHaveProperty("is_staff");
    expect(res.body).not.toHaveProperty("password");

    // default password (ChangeMe123!) works
    const loginRes = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { username: "newbie", password: "ChangeMe123!" },
    });
    expect(loginRes.status).toBe(200);
  });

  it("creates admins with is_staff true", async () => {
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);
    const res = await callJson(create, "/api/users/", {
      method: "POST",
      token,
      body: { username: "ops", email: "ops@example.com", password: "newpass1234", role: "admin" },
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("admin");
    const row = await prisma.user.findUnique({ where: { username: "ops" } });
    expect(row!.isStaff).toBe(true);
  });

  it("validates unique fields and invalid role choice", async () => {
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);
    await createUser({ username: "duped", email: "duped@example.com" });

    const dup = await callJson(create, "/api/users/", {
      method: "POST",
      token,
      body: { username: "duped", email: "other@example.com" },
    });
    expect(dup.body).toEqual({ username: ["This field must be unique."] });

    const badRole = await callJson(create, "/api/users/", {
      method: "POST",
      token,
      body: { username: "okuser", email: "ok@example.com", role: "superuser" },
    });
    expect(badRole.status).toBe(400);
    expect(badRole.body.role).toEqual(['"superuser" is not a valid choice.']);
  });
});

describe("/api/users/{id}/", () => {
  it("GET detail returns UserSerializer shape (with is_staff)", async () => {
    const admin = await createAdmin();
    const target = await createUser({ username: "viewed", email: "viewed@example.com" });
    const res = await callJson(detail, `/api/users/${target.id}/`, {
      token: await tokenFor(admin.id),
      params: { id: String(target.id) },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: target.id,
      username: "viewed",
      first_name: "",
      last_name: "",
      email: "viewed@example.com",
      phone_number: "",
      role: "customer",
      is_active: true,
      is_staff: false,
    });
  });

  it("404s for missing or malformed ids", async () => {
    const admin = await createAdmin();
    const token = await tokenFor(admin.id);
    const missing = await callJson(detail, "/api/users/999999/", { token, params: { id: "999999" } });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ detail: "No CustomUser matches the given query." });

    const malformed = await callJson(detail, "/api/users/abc/", { token, params: { id: "abc" } });
    expect(malformed.status).toBe(404);
    expect(malformed.body).toEqual({ detail: "Not found." });
  });

  it("PUT replaces values (defaults apply for role/is_active; omitted names untouched)", async () => {
    const admin = await createAdmin();
    const target = await createUser({
      username: "before",
      email: "before@example.com",
      firstName: "Keep",
      lastName: "Me",
    });
    const res = await callJson(put, `/api/users/${target.id}/`, {
      method: "PUT",
      token: await tokenFor(admin.id),
      params: { id: String(target.id) },
      body: { username: "after", email: "after@example.com" },
    });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("after");
    expect(res.body.role).toBe("customer");
    expect(res.body.is_active).toBe(true);
    const row = await prisma.user.findUnique({ where: { id: target.id } });
    expect(row!.firstName).toBe("Keep"); // omitted non-default fields untouched (DRF semantics)
    expect(row!.lastName).toBe("Me");
  });

  it("PUT enforces required username/email", async () => {
    const admin = await createAdmin();
    const target = await createUser();
    const res = await callJson(put, `/api/users/${target.id}/`, {
      method: "PUT",
      token: await tokenFor(admin.id),
      params: { id: String(target.id) },
      body: { phone_number: "0711111111" },
    });
    expect(res.status).toBe(400);
    expect(res.body.username).toEqual(["This field is required."]);
    expect(res.body.email).toEqual(["This field is required."]);
  });

  it("PATCH updates subset and recomputes is_staff with role", async () => {
    const admin = await createAdmin();
    const target = await createUser({ username: "roleplay", email: "roleplay@example.com" });
    const res = await callJson(patch, `/api/users/${target.id}/`, {
      method: "PATCH",
      token: await tokenFor(admin.id),
      params: { id: String(target.id) },
      body: { role: "admin" },
    });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
    const row = await prisma.user.findUnique({ where: { id: target.id } });
    expect(row!.isStaff).toBe(true);
    expect(row!.username).toBe("roleplay");
  });

  it("PATCH rejects unique collisions", async () => {
    const admin = await createAdmin();
    const target = await createUser({ username: "first", email: "first@example.com" });
    await createUser({ username: "second", email: "second@example.com" });
    const res = await callJson(patch, `/api/users/${target.id}/`, {
      method: "PATCH",
      token: await tokenFor(admin.id),
      params: { id: String(target.id) },
      body: { username: "second" },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ username: ["This field must be unique."] });
  });

  it("DELETE removes the user (204 then 404)", async () => {
    const admin = await createAdmin();
    const target = await createUser();
    const del = await callJson(remove, `/api/users/${target.id}/`, {
      method: "DELETE",
      token: await tokenFor(admin.id),
      params: { id: String(target.id) },
    });
    expect(del.status).toBe(204);
    expect(del.body).toBeNull();

    const gone = await callJson(detail, `/api/users/${target.id}/`, {
      token: await tokenFor(admin.id),
      params: { id: String(target.id) },
    });
    expect(gone.status).toBe(404);
  });

  it("returns DRF 405 for unsupported methods", async () => {
    const admin = await createAdmin();
    const res = await callJson(listPut, "/api/users/", { method: "PUT", token: await tokenFor(admin.id) });
    expect(res.status).toBe(405);
    expect(res.body).toEqual({ detail: 'Method "PUT" not allowed.' });
    expect(res.headers.get("allow")).toBe("GET, POST, HEAD, OPTIONS");
  });
});
