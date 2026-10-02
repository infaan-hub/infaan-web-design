import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { verifyToken } from "./jwt";
import { DrfError, unauthorized, userInactive, permissionDenied } from "./drf";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
};

function toAuthUser(user: any): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isStaff: user.isStaff,
    isSuperuser: user.isSuperuser,
  };
}

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const parts = header.split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]) return null;
  return parts[1];
}

/** DRF JWTAuthentication: returns null when no (valid scheme) credentials present. */
export async function authenticate(req: NextRequest): Promise<AuthUser | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const payload = await verifyToken(token, "access");
  const user = await prisma.user.findUnique({ where: { id: payload.user_id } });
  if (!user) throw new DrfError(401, { detail: "User not found" });
  if (!user.isActive) throw userInactive();
  return toAuthUser(user);
}

/** IsAuthenticated: raises 401 when unauthenticated. */
export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const user = await authenticate(req);
  if (!user) throw unauthorized();
  return user;
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return !!user && user.role === "admin";
}

/** IsAdminUserRole: authenticated + role=admin, else 403. */
export async function requireAdmin(req: NextRequest): Promise<AuthUser> {
  const user = await requireUser(req);
  if (!isAdmin(user)) throw permissionDenied();
  return user;
}

/** IsAdminOrReadOnly: safe methods pass with any (or no) auth; writes need admin. */
export async function requireAdminOrReadOnly(req: NextRequest): Promise<AuthUser | null> {
  const user = await authenticate(req);
  const safe = ["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
  if (!safe && !isAdmin(user)) {
    if (!user) throw unauthorized();
    throw permissionDenied();
  }
  return user;
}
