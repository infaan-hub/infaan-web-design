import { prisma } from "@/lib/prisma";
import { ApiError, notFound } from "@/lib/errors";
import { parse } from "@/lib/fields";
import { hashPassword } from "@/lib/password";
import { adminUserSchema, checkUnique } from "./users";

/** AdminUserSerializer output: same as UserSerializer without is_staff. */
export function serializeAdminUserRecord(user: any) {
  return {
    id: user.id,
    username: user.username,
    first_name: user.firstName ?? "",
    last_name: user.lastName ?? "",
    email: user.email,
    phone_number: user.phoneNumber ?? "",
    role: user.role,
    is_active: user.isActive,
  };
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { id: "asc" } });
}

export async function findUserOr404(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("No CustomUser matches the given query.");
  return user;
}

export async function createAdminUserRecord(body: unknown) {
  const data = parse(adminUserSchema, body);
  const role = data.role ?? "customer";
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
      isStaff: role === "admin",
      password: await hashPassword(data.password ?? "ChangeMe123!"),
    },
  });
  return serializeAdminUserRecord(user);
}

export async function updateAdminUserRecord(id: number, body: unknown, partial: boolean) {
  const current = await findUserOr404(id);
  const schema = partial ? adminUserSchema.partial() : adminUserSchema;
  const data = parse(schema, body);

  // Uniqueness validated against merged (PUT requires both fields anyway).
  await checkUnique(data.username ?? current.username, data.email ?? current.email, id);

  const updates: Record<string, any> = {};
  if (data.username !== undefined) updates.username = data.username;
  if (data.email !== undefined) updates.email = data.email;
  if (data.first_name !== undefined) updates.firstName = data.first_name;
  if (data.last_name !== undefined) updates.lastName = data.last_name;
  if (data.phone_number !== undefined) updates.phoneNumber = data.phone_number;
  if (data.password !== undefined) updates.password = await hashPassword(data.password);

  const role = partial ? (data.role !== undefined ? data.role : current.role) : data.role ?? "customer";
  if (!partial) {
    updates.role = role;
    updates.isActive = data.is_active ?? true;
  } else {
    if (data.role !== undefined) updates.role = data.role;
    if (data.is_active !== undefined) updates.isActive = data.is_active;
  }
  // save() always recomputes is_staff from role/superuser.
  updates.isStaff = role === "admin";

  const user = await prisma.user.update({ where: { id }, data: updates });
  return serializeAdminUserRecord(user);
}

export async function deleteUserRecord(id: number) {
  await findUserOr404(id);
  await prisma.user.delete({ where: { id } });
}
