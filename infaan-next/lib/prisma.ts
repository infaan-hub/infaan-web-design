import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __infaanPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.__infaanPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__infaanPrisma = prisma;
}
