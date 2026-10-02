import { SignJWT, jwtVerify } from "jose";
import { invalidToken } from "./errors";

// JWT payload: token_type, exp, iat, jti, user_id.

function secret(name: string, fallback: string): Uint8Array {
  // Access and refresh tokens are signed with the same key, which lets us
  // distinguish "wrong token type" from tampered tokens.
  const provided = process.env.JWT_ACCESS_SECRET || process.env[name];
  if (!provided && process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be set in production`);
  }
  return new TextEncoder().encode(provided || fallback);
}

function lifetimeSeconds(name: string, fallbackSeconds: number): number {
  const raw = process.env[name];
  if (!raw) return fallbackSeconds;
  const m = /^(\d+)\s*([dhms])$/.exec(raw.trim());
  if (!m) return fallbackSeconds;
  const n = Number(m[1]);
  switch (m[2]) {
    case "d":
      return n * 86400;
    case "h":
      return n * 3600;
    case "m":
      return n * 60;
    default:
      return n;
  }
}

export function accessTokenLifetime(): number {
  return lifetimeSeconds("JWT_ACCESS_LIFETIME", 7 * 86400);
}

export function refreshTokenLifetime(): number {
  return lifetimeSeconds("JWT_REFRESH_LIFETIME", 30 * 86400);
}

export type TokenPayload = {
  token_type: "access" | "refresh";
  user_id: number;
  exp: number;
  iat: number;
  jti: string;
};

async function sign(payload: Omit<TokenPayload, "exp" | "iat" | "jti">, seconds: number, keyName: string, fallback: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ token_type: payload.token_type, user_id: payload.user_id, jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + seconds)
    .sign(secret(keyName, fallback));
}

export async function signAccessToken(userId: number): Promise<string> {
  return sign({ token_type: "access", user_id: userId }, accessTokenLifetime(), "JWT_ACCESS_SECRET", "dev-access-secret-please-change-in-production-0123456789");
}

export async function signRefreshToken(userId: number): Promise<string> {
  return sign({ token_type: "refresh", user_id: userId }, refreshTokenLifetime(), "JWT_REFRESH_SECRET", "dev-refresh-secret-please-change-in-production-0123456789");
}

export async function verifyToken(token: string, expectedType: "access" | "refresh"): Promise<TokenPayload> {
  const isRefresh = expectedType === "refresh";
  const key = secret(
    isRefresh ? "JWT_REFRESH_SECRET" : "JWT_ACCESS_SECRET",
    isRefresh
      ? "dev-refresh-secret-please-change-in-production-0123456789"
      : "dev-access-secret-please-change-in-production-0123456789"
  );
  let payload: any;
  try {
    const result = await jwtVerify(token, key, { algorithms: ["HS256"] });
    payload = result.payload;
  } catch (err: any) {
    if (err?.code === "ERR_JWT_EXPIRED") throw invalidToken("Token is invalid or expired");
    throw invalidToken("Token is invalid or expired");
  }
  if (payload.token_type !== expectedType) {
    throw invalidToken(expectedType === "refresh" ? "Token has wrong type" : "Given token not valid for any token type");
  }
  return {
    token_type: payload.token_type,
    user_id: Number(payload.user_id),
    exp: Number(payload.exp),
    iat: Number(payload.iat),
    jti: String(payload.jti ?? ""),
  };
}
