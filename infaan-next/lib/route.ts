import { NextRequest, NextResponse } from "next/server";
import { ApiError, methodNotAllowed, notFound } from "./errors";

export type RouteContext = { params?: Promise<Record<string, string>> | Record<string, string> };

export type RouteHandler = (req: NextRequest, ctx?: RouteContext) => Promise<Response> | Response;

/**
 * Path-pk parsing: int()-convertible values (0, negative, +/-,
 * leading zeros) reach the object lookup (missing row -> model 404); anything
 * else (abc, 1.5, 1e2) -> 404 {"detail": "Not found."}.
 */
export async function pathId(ctx?: RouteContext, key = "id"): Promise<number> {
  const params: any = ctx?.params ?? {};
  const resolved = typeof params?.then === "function" ? await params : params;
  const raw = String(resolved?.[key] ?? "");
  if (!/^[-+]?\d+$/.test(raw)) throw notFound();
  return Number(raw);
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof METHODS)[number];

/**
 * Permission gate runs for methods NOT mapped by the route (permission
 * checks before method-not-allowed): throws 401/403, otherwise 405.
 */
export type RouteGate = (req: NextRequest, ctx?: RouteContext) => Promise<unknown>;

export type RouteOptions = { gate?: RouteGate };

function errorWrap(fn: RouteHandler, allow: string): RouteHandler {
  return async (req, ctx) => {
    try {
      const res = await fn(req, ctx);
      res.headers.set("Allow", allow);
      return res;
    } catch (err) {
      if (err instanceof ApiError) {
        const res = NextResponse.json(err.body, { status: err.status });
        if (err.status === 401) res.headers.set("WWW-Authenticate", 'Bearer realm="api"');
        res.headers.set("Allow", allow);
        return res;
      }
      console.error("[api] unhandled error:", err);
      return NextResponse.json({ detail: "Internal server error." }, { status: 500 });
    }
  };
}

function allowHeader(methods: Partial<Record<HttpMethod, RouteHandler>>) {
  const allowed: string[] = [];
  for (const m of METHODS) if (methods[m]) allowed.push(m);
  if (methods.GET) allowed.push("HEAD");
  allowed.push("OPTIONS");
  return allowed.join(", ");
}

/**
 * Builds route handler exports with consistent API behavior:
 * - unsupported methods -> permission gate (if given) then 405
 *   {"detail": "Method \"X\" not allowed."}
 * - Allow header on every response (standard response headers)
 * Destructure only the handler keys (GET/POST/PUT/PATCH/DELETE) in route files.
 */
export function route(
  methods: Partial<Record<HttpMethod, RouteHandler>>,
  options: RouteOptions = {}
) {
  const allow = allowHeader(methods);
  const build = (m: HttpMethod): RouteHandler => {
    const impl = methods[m];
    return errorWrap(
      impl
        ? impl
        : async (req, ctx) => {
            if (options.gate) await options.gate(req, ctx);
            throw methodNotAllowed(m);
          },
      allow
    );
  };
  return {
    GET: build("GET"),
    POST: build("POST"),
    PUT: build("PUT"),
    PATCH: build("PATCH"),
    DELETE: build("DELETE"),
  };
}
