import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody } from "@/lib/http";
import { DrfError } from "@/lib/drf";
import { prisma } from "@/lib/prisma";
import { buildAuthResponse, findUserByEmailInsensitive } from "@/lib/serializers/users";
import { unusablePassword } from "@/lib/password";

// accounts.views.GoogleLoginView - Google authorization code flow.

function error400(detail: string) {
  return new DrfError(400, { detail });
}

function allowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((o) => o.replace(/\/+$/, "").trim())
    .filter(Boolean);
}

function originAllowed(origin: string): boolean {
  if (!origin) return false;
  const allowAll = (process.env.CORS_ALLOW_ALL_ORIGINS || "").toLowerCase();
  if (["1", "true", "yes", "on"].includes(allowAll)) return true;
  if (allowedOrigins().includes(origin.replace(/\/+$/, ""))) return true;
  const regexes = (process.env.CORS_ALLOWED_ORIGIN_REGEXES || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return regexes.some((pattern) => {
    try {
      return new RegExp(`^(?:${pattern})`).test(origin);
    } catch {
      return false;
    }
  });
}

function normalizeRedirectOrigin(redirectUri: string): string {
  try {
    const url = new URL((redirectUri || "").trim());
    if (url.protocol && url.host) return `${url.protocol}//${url.host}`;
  } catch {
    /* ignore */
  }
  return "";
}

async function exchangeGoogleCode(code: string, redirectUri: string): Promise<any> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!response.ok) throw new Error("token exchange failed");
  return response.json();
}

async function fetchGoogleUserinfo(accessToken: string): Promise<any> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("userinfo failed");
  return response.json();
}

async function resolveUniqueUsername(email: string): Promise<string> {
  const base =
    email
      .split("@")[0]
      .replace(/[^a-zA-Z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || "customer";
  let username = base.slice(0, 150);
  let suffix = 1;
  while (suffix < 10000) {
    const clash = await prisma.user.findFirst({
      where: { username, NOT: { email } },
      select: { id: true },
    });
    if (!clash) return username;
    suffix += 1;
    username = `${base.slice(0, 140)}_${suffix}`;
  }
  return username;
}

export const { GET, POST, PUT, PATCH, DELETE } = route({
  POST: async (req: NextRequest) => {
    if (req.headers.get("x-requested-with") !== "XmlHttpRequest") {
      throw error400("Invalid Google login request.");
    }
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
      throw error400("Google OAuth is not configured on the server.");
    }
    const body = await readBody(req);
    const code = body?.code;
    const redirectUri = body?.redirect_uri;
    if (!code || !redirectUri) {
      throw error400("Google authorization code is required.");
    }
    if (!originAllowed(normalizeRedirectOrigin(String(redirectUri)))) {
      throw error400("This origin is not allowed for Google login.");
    }

    let userinfo: any;
    try {
      const tokenData = await exchangeGoogleCode(String(code), String(redirectUri));
      userinfo = await fetchGoogleUserinfo(tokenData.access_token);
    } catch {
      throw error400("Unable to verify the Google login.");
    }

    const email = userinfo.email;
    if (!email || !userinfo.email_verified) {
      throw error400("Google account email is not verified.");
    }

    const existing = await findUserByEmailInsensitive(email);
    if (existing && existing.role !== "customer") {
      throw error400("Google login is available for customer accounts only.");
    }

    let user = existing;
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: await resolveUniqueUsername(email),
          email,
          firstName: userinfo.given_name ?? "",
          lastName: userinfo.family_name ?? "",
          role: "customer",
          isActive: true,
          isStaff: false,
          isSuperuser: false,
          password: unusablePassword(),
        },
      });
    } else {
      const given = userinfo.given_name ?? "";
      const family = userinfo.family_name ?? "";
      if (user.firstName !== given || user.lastName !== family) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { firstName: given, lastName: family },
        });
      }
    }

    const data = await buildAuthResponse(user);
    return NextResponse.json(data, { status: 200 });
  },
});
