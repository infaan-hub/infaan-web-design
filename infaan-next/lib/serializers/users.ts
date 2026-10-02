import { prisma } from "@/lib/prisma";
import { DrfError } from "@/lib/drf";
import { parse, drfString, drfOptString, drfChoice, drfBool, zodToDrf } from "@/lib/zod-drf";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Serializers (accounts): UserSerializer / RegisterSerializer / AdminUserSerializer
// ---------------------------------------------------------------------------

export function serializeUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    first_name: user.firstName ?? user.first_name ?? "",
    last_name: user.lastName ?? user.last_name ?? "",
    email: user.email,
    phone_number: user.phoneNumber ?? user.phone_number ?? "",
    role: user.role,
    is_active: user.isActive ?? user.is_active,
    is_staff: user.isStaff ?? user.is_staff,
  };
}

/** DRF CharField(min_length=8, write_only): blank -> blank msg; else min length. */
function passwordField() {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") ctx.addIssue({ code: "custom", message: "This field may not be blank." });
      else if (value.length < 8)
        ctx.addIssue({ code: "custom", message: "This field must have at least 8 characters." });
    });
}

/** DRF EmailField: blank -> blank msg, then max_length, then email format (single error). */
function emailField() {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") {
        ctx.addIssue({ code: "custom", message: "This field may not be blank." });
        return;
      }
      if (value.length > 254) {
        ctx.addIssue({ code: "custom", message: "Ensure this field has no more than 254 characters." });
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        ctx.addIssue({ code: "custom", message: "Enter a valid email address." });
      }
    });
}

const registerSchema = z.object({
  username: drfString({ maxLength: 150 }),
  first_name: drfOptString({ maxLength: 150, blank: true }),
  last_name: drfOptString({ maxLength: 150, blank: true }),
  email: emailField(),
  phone_number: drfOptString({ maxLength: 30, blank: true }),
  password: passwordField(),
});

export const adminUserSchema = z.object({
  username: drfString({ maxLength: 150 }),
  first_name: drfOptString({ maxLength: 150, blank: true }),
  last_name: drfOptString({ maxLength: 150, blank: true }),
  email: emailField(),
  phone_number: drfOptString({ maxLength: 30, blank: true }),
  password: passwordField().optional(),
  role: drfChoice(["admin", "customer"]).optional(),
  is_active: drfBool({ optional: true }),
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().trim().min(1),
});

export async function checkUnique(username: string, email: string, excludeId?: number) {
  const errors: Record<string, string[]> = {};
  const byUsername = await prisma.user.findFirst({
    where: { username, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (byUsername) errors.username = ["This field must be unique."];
  const byEmail = await prisma.user.findFirst({
    where: { email, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (byEmail) errors.email = ["This field must be unique."];
  if (Object.keys(errors).length) throw new DrfError(400, errors);
}

export async function buildAuthResponse(user: any) {
  const [access, refresh] = await Promise.all([signAccessToken(user.id), signRefreshToken(user.id)]);
  return { access, refresh, user: serializeUser(user) };
}

export async function registerUser(body: unknown) {
  const data = parse(registerSchema, body);
  await checkUnique(data.username, data.email);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      firstName: data.first_name ?? "",
      lastName: data.last_name ?? "",
      email: data.email,
      phoneNumber: data.phone_number ?? "",
      role: "customer",
      isStaff: false,
      isSuperuser: false,
      isActive: true,
      password: await hashPassword(data.password),
    },
  });
  return buildAuthResponse(user);
}

export async function registerAdminUser(body: unknown, forceRole: string | null = null) {
  const data = parse(adminUserSchema, body);
  const role = forceRole ?? data.role ?? "customer";
  await checkUnique(data.username, data.email);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      firstName: data.first_name ?? "",
      lastName: data.last_name ?? "",
      email: data.email,
      phoneNumber: data.phone_number ?? "",
      role,
      isActive: data.is_active ?? true,
      isSuperuser: false,
      // Django CustomUser.save(): is_staff = is_superuser or role == admin
      isStaff: role === "admin",
      password: await hashPassword(data.password ?? "ChangeMe123!"),
    },
  });
  return buildAuthResponse(user);
}

export async function findUserByEmailInsensitive(email: string) {
  return prisma.$queryRaw<any[]>`
    SELECT * FROM accounts_customuser WHERE LOWER(email) = LOWER(${email}) LIMIT 1
  `.then((rows) => rows[0] ?? null);
}

export async function loginUser(body: unknown) {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const raw: any = body || {};
    const errors: Record<string, string[]> = {};
    if (raw.username === undefined) errors.username = ["This field is required."];
    else if (String(raw.username).trim() === "") errors.username = ["This field may not be blank."];
    if (raw.password === undefined) errors.password = ["This field is required."];
    else if (raw.password === null) errors.password = ["This field may not be null."];
    else if (String(raw.password).trim() === "") errors.password = ["This field may not be blank."];
    if (!Object.keys(errors).length) throw zodToDrf(parsed.error);
    throw new DrfError(400, errors);
  }
  const { username, password } = parsed.data;
  let loginName = username;
  if (username.includes("@")) {
    const byEmail = await findUserByEmailInsensitive(username);
    if (byEmail) loginName = byEmail.username;
  }
  const user = await prisma.user.findUnique({ where: { username: loginName } });
  const invalid = new DrfError(400, { non_field_errors: ["Invalid username or password."] });
  if (!user) throw invalid;
  const { valid, needsRehash } = await verifyPassword(password, user.password);
  if (!valid) throw invalid;
  if (!user.isActive) throw invalid; // Django ModelBackend refuses inactive users -> same message
  if (needsRehash) {
    await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(password) } });
  }
  return buildAuthResponse(user);
}
