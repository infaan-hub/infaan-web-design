import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.create({
    data: { username: "smoke", email: "smoke@test.com", password: "x" },
  });
  const svc = await prisma.service.create({
    data: { name: "Smoke Service", category: "website", shortDescription: "s", details: "d" },
  });
  const pkg = await prisma.servicePackage.create({
    data: { serviceId: svc.id, tier: "gold", title: "Gold", description: "d", features: ["a", "b"] },
  });
  const price = await prisma.packagePrice.create({
    data: { packageId: pkg.id, billingPeriod: "monthly", amount: "150000.50" },
  });
  const back = await prisma.packagePrice.findUnique({
    where: { id: price.id },
    include: { servicePackage: { include: { service: true } } },
  });
  console.log("user:", u.id, "amount:", back!.amount.toString(), "features:", JSON.stringify(back!.servicePackage.features), "svc:", back!.servicePackage.service.name);
  await prisma.packagePrice.delete({ where: { id: price.id } });
  await prisma.servicePackage.delete({ where: { id: pkg.id } });
  await prisma.service.delete({ where: { id: svc.id } });
  await prisma.user.delete({ where: { id: u.id } });
  console.log("OK");
}

main().finally(() => prisma.$disconnect());
