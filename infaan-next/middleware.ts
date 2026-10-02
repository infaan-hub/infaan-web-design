import { NextRequest, NextResponse } from "next/server";

// Mirrors django-cors-headers behavior for /api/* (settings: CORS_ALLOWED_ORIGINS,
// CORS_ALLOW_CREDENTIALS=True, default methods/headers).

const ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const DEFAULT_ALLOW_HEADERS =
  "Accept, Origin, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Cache-Control, X-CSRFToken";

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, "");
}

function allowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((item) => normalizeOrigin(item.trim()))
    .filter(Boolean);
}

function originAllowed(origin: string): boolean {
  const allowAll = (process.env.CORS_ALLOW_ALL_ORIGINS || "").toLowerCase();
  if (["1", "true", "yes", "on"].includes(allowAll)) return true;
  return allowedOrigins().includes(normalizeOrigin(origin));
}

function setCorsHeaders(headers: Headers, origin: string, requestedHeaders: string | null) {
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.append("Vary", "Origin");
  if (requestedHeaders !== null) {
    headers.set("Access-Control-Allow-Headers", requestedHeaders || DEFAULT_ALLOW_HEADERS);
  }
}

export async function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const isPreflight = req.method === "OPTIONS" && req.headers.has("access-control-request-method");

  if (origin && originAllowed(origin)) {
    if (isPreflight) {
      const res = new NextResponse(null, { status: 200 });
      setCorsHeaders(res.headers, origin, req.headers.get("access-control-request-headers"));
      res.headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
      res.headers.set("Access-Control-Max-Age", "86400");
      return res;
    }
    const res = NextResponse.next();
    setCorsHeaders(res.headers, origin, null);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
