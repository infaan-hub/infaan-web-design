import { describe, expect, it } from "vitest";
import { callJson, createUser, tokenFor, djangoPbkdf2 } from "./helpers";
import { prisma } from "@/lib/prisma";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as adminRegister } from "@/app/api/auth/admin/register/route";
import { POST as login, GET as loginGet } from "@/app/api/auth/login/route";
import { POST as refresh } from "@/app/api/auth/refresh/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as google } from "@/app/api/auth/google/route";
import { signRefreshToken } from "@/lib/jwt";

const userShape = {
  id: expect.any(Number),
  username: "alice",
  first_name: "Al",
  last_name: "Ice",
  email: "alice@example.com",
  phone_number: "0712345678",
  role: "customer",
  is_active: true,
  is_staff: false,
};

describe("POST /api/auth/register/", () => {
  it("creates a customer and returns tokens + UserSerializer payload", async () => {
    const res = await callJson(register, "/api/auth/register/", {
      method: "POST",
      body: {
        username: "alice",
        first_name: "Al",
        last_name: "Ice",
        email: "alice@example.com",
        phone_number: "0712345678",
        password: "supersecret",
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.access).toEqual(expect.any(String));
    expect(res.body.refresh).toEqual(expect.any(String));
    expect(res.body.user).toEqual(userShape);

    // password stored as bcrypt
    const row = await prisma.user.findUnique({ where: { username: "alice" } });
    expect(row!.password.startsWith("$2")).toBe(true);
  });

  it("requires password with DRF min length message", async () => {
    const base = { username: "bob", email: "bob@example.com" };
    const missing = await callJson(register, "/api/auth/register/", {
      method: "POST",
      body: base,
    });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({ password: ["This field is required."] });

    const short = await callJson(register, "/api/auth/register/", {
      method: "POST",
      body: { ...base, password: "1234567" },
    });
    expect(short.status).toBe(400);
    expect(short.body).toEqual({ password: ["This field must have at least 8 characters."] });
  });

  it("rejects blank username and invalid email with DRF wording", async () => {
    const blank = await callJson(register, "/api/auth/register/", {
      method: "POST",
      body: { username: "  ", email: "c@example.com", password: "supersecret" },
    });
    expect(blank.body).toEqual({ username: ["This field may not be blank."] });

    const badEmail = await callJson(register, "/api/auth/register/", {
      method: "POST",
      body: { username: "carl", email: "not-an-email", password: "supersecret" },
    });
    expect(badEmail.body).toEqual({ email: ["Enter a valid email address."] });
  });

  it("enforces unique username and email", async () => {
    await createUser({ username: "taken", email: "taken@example.com" });
    const res = await callJson(register, "/api/auth/register/", {
      method: "POST",
      body: { username: "taken", email: "other@example.com", password: "supersecret" },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ username: ["This field must be unique."] });

    const res2 = await callJson(register, "/api/auth/register/", {
      method: "POST",
      body: { username: "fresh", email: "taken@example.com", password: "supersecret" },
    });
    expect(res2.body).toEqual({ email: ["This field must be unique."] });
  });
});

describe("POST /api/auth/login/", () => {
  it("logs in with username and with email identifier", async () => {
    await createUser({ username: "dave", email: "dave@example.com", password: "password123" });

    const byName = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { username: "dave", password: "password123" },
    });
    expect(byName.status).toBe(200);
    expect(byName.body.access).toEqual(expect.any(String));
    expect(byName.body.user.username).toBe("dave");

    const byEmail = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { username: "DAVE@example.com", password: "password123" },
    });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.user.username).toBe("dave");
  });

  it("returns DRF non_field_errors for bad credentials (incl. inactive users)", async () => {
    await createUser({ username: "erin", password: "password123" });
    const bad = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { username: "erin", password: "wrongpass1" },
    });
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ non_field_errors: ["Invalid username or password."] });

    await createUser({ username: "frank", password: "password123", isActive: false });
    const inactive = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { username: "frank", password: "password123" },
    });
    expect(inactive.status).toBe(400);
    expect(inactive.body).toEqual({ non_field_errors: ["Invalid username or password."] });
  });

  it("validates required/blank fields", async () => {
    const missingUser = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { password: "x" },
    });
    expect(missingUser.body).toEqual({ username: ["This field is required."] });

    const blankUser = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { username: "", password: "x" },
    });
    expect(blankUser.body).toEqual({ username: ["This field may not be blank."] });

    const missingPass = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { username: "someone" },
    });
    expect(missingPass.body).toEqual({ password: ["This field is required."] });
  });

  it("accepts legacy Django pbkdf2 passwords and rehashes to bcrypt", async () => {
    await prisma.user.create({
      data: {
        username: "legacy",
        email: "legacy@example.com",
        password: djangoPbkdf2("legacy-pass-1"),
        role: "customer",
        isActive: true,
        isStaff: false,
        isSuperuser: false,
      },
    });
    const res = await callJson(login, "/api/auth/login/", {
      method: "POST",
      body: { username: "legacy", password: "legacy-pass-1" },
    });
    expect(res.status).toBe(200);
    const row = await prisma.user.findUnique({ where: { username: "legacy" } });
    expect(row!.password.startsWith("$2")).toBe(true);
  });
});

describe("POST /api/auth/refresh/", () => {
  it("issues a new access token for a valid refresh token", async () => {
    const user = await createUser();
    const refreshTok = await signRefreshToken(user.id);
    const res = await callJson(refresh, "/api/auth/refresh/", {
      method: "POST",
      body: { refresh: refreshTok },
    });
    expect(res.status).toBe(200);
    expect(res.body.access).toEqual(expect.any(String));
    expect(Object.keys(res.body)).toEqual(["access"]);
  });

  it("validates the refresh field and rejects bad tokens", async () => {
    const missing = await callJson(refresh, "/api/auth/refresh/", { method: "POST", body: {} });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({ refresh: ["This field is required."] });

    const bad = await callJson(refresh, "/api/auth/refresh/", {
      method: "POST",
      body: { refresh: "garbage.token.here" },
    });
    expect(bad.status).toBe(401);
    expect(bad.body).toEqual({ detail: "Token is invalid or expired" });
  });
});

describe("GET /api/auth/me/", () => {
  it("requires authentication with DRF wording", async () => {
    const res = await callJson(me, "/api/auth/me/");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ detail: "Authentication credentials were not provided." });
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
  });

  it("returns the current user for a valid access token", async () => {
    const user = await createUser({ username: "grace", email: "grace@example.com" });
    const token = await tokenFor(user.id);
    const res = await callJson(me, "/api/auth/me/", { token });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("grace");
    expect(res.body.is_staff).toBe(false);
  });

  it("rejects invalid and wrong-type tokens", async () => {
    const bad = await callJson(me, "/api/auth/me/", { token: "nonsense" });
    expect(bad.status).toBe(401);
    expect(bad.body).toEqual({ detail: "Token is invalid or expired" });

    const user = await createUser();
    const refreshTok = await signRefreshToken(user.id);
    const wrongType = await callJson(me, "/api/auth/me/", { token: refreshTok });
    expect(wrongType.status).toBe(401);
    expect(wrongType.body).toEqual({ detail: "Given token not valid for any token type" });
  });
});

describe("POST /api/auth/admin/register/", () => {
  it("creates an admin user (role + is_staff)", async () => {
    const res = await callJson(adminRegister, "/api/auth/admin/register/", {
      method: "POST",
      body: {
        username: "rootadmin",
        email: "root@example.com",
        password: "adminpass123",
        first_name: "Root",
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.is_staff).toBe(true);
  });
});

describe("POST /api/auth/google/", () => {
  it("requires the X-Requested-With header", async () => {
    const res = await callJson(google, "/api/auth/google/", { method: "POST", body: { code: "x" } });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ detail: "Invalid Google login request." });
  });

  it("reports missing server configuration", async () => {
    const prevId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const prevSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    process.env.GOOGLE_OAUTH_CLIENT_ID = "";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "";
    try {
      const res = await callJson(google, "/api/auth/google/", {
        method: "POST",
        body: { code: "x", redirect_uri: "http://localhost:3000/" },
        headers: { "x-requested-with": "XmlHttpRequest" },
      });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ detail: "Google OAuth is not configured on the server." });
    } finally {
      process.env.GOOGLE_OAUTH_CLIENT_ID = prevId;
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = prevSecret;
    }
  });

  it("requires code and redirect_uri when configured", async () => {
    const prevId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const prevSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    try {
      const res = await callJson(google, "/api/auth/google/", {
        method: "POST",
        body: {},
        headers: { "x-requested-with": "XmlHttpRequest" },
      });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ detail: "Google authorization code is required." });
    } finally {
      process.env.GOOGLE_OAUTH_CLIENT_ID = prevId;
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = prevSecret;
    }
  });
});

describe("methodNotAllowed", () => {
  it("returns DRF 405 for unsupported methods", async () => {
    const res = await callJson(loginGet, "/api/auth/login/", { method: "GET" });
    expect(res.status).toBe(405);
    expect(res.body).toEqual({ detail: 'Method "GET" not allowed.' });
    expect(res.headers.get("allow")).toBe("POST, OPTIONS");
  });
});
