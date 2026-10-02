import { NextRequest } from "next/server";
import type { RouteContext, RouteHandler } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signAccessToken } from "@/lib/jwt";

export function ctx(params: Record<string, string> = {}): RouteContext {
  return { params: Promise.resolve(params) };
}

export function jsonRequest(
  path: string,
  opts: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {}
): NextRequest {
  const { method = "GET", body, token, headers } = opts;
  const init: RequestInit = {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  };
  if (body !== undefined) (init as any).body = JSON.stringify(body);
  return new NextRequest(`http://localhost:3000${path}`, init);
}

export async function call(
  handler: RouteHandler,
  path: string,
  opts: { method?: string; body?: unknown; token?: string; headers?: Record<string, string>; params?: Record<string, string> } = {}
): Promise<Response> {
  const req = jsonRequest(path, opts);
  // Mirror Next.js routing: derive dynamic params from the URL path.
  let params = opts.params;
  if (!params) {
    const clean = path.split("?")[0].replace(/\/+$/, "");
    const segments = clean.split("/").filter(Boolean);
    params = { id: segments[segments.length - 1] ?? "" };
  }
  return handler(req, ctx(params));
}

export async function callJson(
  handler: RouteHandler,
  path: string,
  opts: { method?: string; body?: unknown; token?: string; headers?: Record<string, string>; params?: Record<string, string> } = {}
): Promise<{ status: number; body: any; headers: Headers }> {
  const res = await call(handler, path, opts);
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body, headers: res.headers };
}

export type UserOverrides = Partial<{
  username: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}>;

export async function createUser(overrides: UserOverrides = {}) {
  const { password = "secret123", ...rest } = overrides;
  return prisma.user.create({
    data: {
      username: rest.username ?? `user_${Math.random().toString(36).slice(2, 10)}`,
      email: rest.email ?? `${Math.random().toString(36).slice(2, 10)}@example.com`,
      password: password.startsWith("$2") || password.startsWith("!") ? password : await hashPassword(password),
      role: rest.role ?? "customer",
      isActive: rest.isActive ?? true,
      isStaff: (rest.role ?? "customer") === "admin",
      isSuperuser: false,
      firstName: rest.firstName ?? "",
      lastName: rest.lastName ?? "",
      phoneNumber: rest.phoneNumber ?? "",
    },
  });
}

export async function createAdmin(overrides: UserOverrides = {}) {
  return createUser({
    username: overrides.username ?? `admin_${Math.random().toString(36).slice(2, 10)}`,
    role: "admin",
    ...overrides,
  });
}

export async function tokenFor(userId: number): Promise<string> {
  return signAccessToken(userId);
}

/** Create a legacy pbkdf2_sha256 password hash for password-compat tests. */
export function legacyPbkdf2(password: string, iterations = 260000, salt = "abcdefghij"): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { pbkdf2Sync } = require("node:crypto");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}
