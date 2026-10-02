import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

// Mirrors Backend/catalog/management/commands/seed_infaan_data.py:
// upsert services by name, packages by (service, tier), prices by
// (package, billing_period, currency); create admin user when absent.

type SeedPrice = [period: string, amount: string];

type SeedPackage = {
  tier: string;
  title: string;
  description: string;
  paymentNotes: string;
  features: string[];
  prices: SeedPrice[];
};

type SeedService = {
  name: string;
  category: string;
  shortDescription: string;
  details: string;
  packages: SeedPackage[];
};

const services: SeedService[] = [
  {
    name: "Website Developing and Design",
    category: "website",
    shortDescription: "Business websites and web application systems for growing brands.",
    details:
      "Silver covers ordinary hosting, Gold covers full hosting, and Premium covers web applications with hosting, database, and fixing.",
    packages: [
      {
        tier: "silver",
        title: "Silver Web Services",
        description: "A starter business website package with ordinary hosting.",
        paymentNotes: "1 year payment",
        features: ["1 business website", "Ordinary hosting", "1 year payment"],
        prices: [
          ["weekly", "45.00"],
          ["monthly", "150.00"],
          ["yearly", "1200.00"],
        ],
      },
      {
        tier: "gold",
        title: "Gold Web Services",
        description: "A business website package with full hosting included.",
        paymentNotes: "1 year payment",
        features: ["1 business website", "Full hosting", "1 year payment"],
        prices: [
          ["weekly", "65.00"],
          ["monthly", "220.00"],
          ["yearly", "1800.00"],
        ],
      },
      {
        tier: "premium",
        title: "Premium Web Services",
        description: "A full web application system with premium infrastructure support.",
        paymentNotes: "Full hosting, database and fixing",
        features: ["1 web application system", "Full hosting", "Database setup", "Fixing support"],
        prices: [
          ["weekly", "120.00"],
          ["monthly", "400.00"],
          ["yearly", "3200.00"],
        ],
      },
      {
        tier: "extra",
        title: "Web Maintenance Package",
        description: "Fixing and maintenance for an existing web system.",
        paymentNotes: "Payment per task",
        features: ["Fixing existing system", "Maintenance support", "Paid per task"],
        prices: [["per_task", "80.00"]],
      },
    ],
  },
  {
    name: "System Developing and Subscription Service",
    category: "system_subscription",
    shortDescription:
      "Develop custom systems and hire existing systems by weekly, monthly, or yearly subscription time.",
    details:
      "This service covers custom system development and timed subscription access for ready systems with normal billing, payment, and receipt flow.",
    packages: [
      {
        tier: "silver",
        title: "Silver System Subscription",
        description: "A starter package for subscribing to an existing business system by time.",
        paymentNotes: "Best for weekly or monthly hired access",
        features: [
          "Use existing system",
          "Weekly, monthly, or yearly billing",
          "Access stops after end date",
          "Normal billing and receipt flow",
        ],
        prices: [
          ["weekly", "55.00"],
          ["monthly", "180.00"],
          ["yearly", "1450.00"],
        ],
      },
      {
        tier: "gold",
        title: "Gold System Development & Subscription",
        description: "Subscription access plus setup and customization for a specific business workflow.",
        paymentNotes: "Includes setup and support",
        features: [
          "Existing system subscription",
          "Workflow setup",
          "User access configuration",
          "Weekly, monthly, or yearly billing",
        ],
        prices: [
          ["weekly", "85.00"],
          ["monthly", "290.00"],
          ["yearly", "2350.00"],
        ],
      },
      {
        tier: "premium",
        title: "Premium Custom System Development",
        description: "Develop a dedicated system and manage subscription use with full support.",
        paymentNotes: "Custom system with managed subscription access",
        features: [
          "Custom system development",
          "Database and deployment setup",
          "Subscription timing control",
          "Billing, payment, and receipt support",
        ],
        prices: [
          ["weekly", "140.00"],
          ["monthly", "480.00"],
          ["yearly", "3850.00"],
        ],
      },
      {
        tier: "extra",
        title: "System Subscription Maintenance Package",
        description: "One-time changes, extension, or fixing for an existing subscribed system.",
        paymentNotes: "Payment per task",
        features: [
          "Fix subscribed system",
          "Adjust access time or settings",
          "One-time maintenance work",
        ],
        prices: [["per_task", "95.00"]],
      },
    ],
  },
  {
    name: "Logo & Poster Design",
    category: "logo_poster",
    shortDescription: "Design packages for branding, posters, and print-ready assets.",
    details: "Silver focuses on design only, Gold adds printing, and Premium adds branding.",
    packages: [
      {
        tier: "silver",
        title: "Silver Logo & Poster Package",
        description: "Logo and poster design only.",
        paymentNotes: "Design only",
        features: ["1 logo design", "1 poster design"],
        prices: [
          ["weekly", "25.00"],
          ["monthly", "90.00"],
          ["yearly", "700.00"],
        ],
      },
      {
        tier: "gold",
        title: "Gold Logo & Poster Package",
        description: "Design plus printing support.",
        paymentNotes: "Includes printing",
        features: ["1 logo design", "1 poster design", "Printing"],
        prices: [
          ["weekly", "40.00"],
          ["monthly", "130.00"],
          ["yearly", "980.00"],
        ],
      },
      {
        tier: "premium",
        title: "Premium Logo & Poster Package",
        description: "Branding-ready design package with print support.",
        paymentNotes: "Printing and branding included",
        features: ["1 logo design", "1 poster design", "Printing", "Branding"],
        prices: [
          ["weekly", "55.00"],
          ["monthly", "180.00"],
          ["yearly", "1350.00"],
        ],
      },
    ],
  },
  {
    name: "Digital Ads",
    category: "digital_ads",
    shortDescription: "Google Ads setup and maintenance packages for campaigns.",
    details: "Silver excludes billing, Gold adds ad maintenance, and Premium includes billing plus maintenance.",
    packages: [
      {
        tier: "silver",
        title: "Silver Digital Ads Services",
        description: "Basic Google Ads setup without billing management.",
        paymentNotes: "No billing",
        features: ["1 Google Ads setup", "No billing"],
        prices: [
          ["weekly", "30.00"],
          ["monthly", "110.00"],
          ["yearly", "840.00"],
        ],
      },
      {
        tier: "gold",
        title: "Gold Digital Ads Services",
        description: "Google Ads setup with maintenance support and no billing.",
        paymentNotes: "No billing, maintenance included",
        features: ["1 Google Ads setup", "Ads maintenance", "No billing"],
        prices: [
          ["weekly", "45.00"],
          ["monthly", "160.00"],
          ["yearly", "1200.00"],
        ],
      },
      {
        tier: "premium",
        title: "Premium Digital Ads Services",
        description: "Managed Google Ads including billing and maintenance service.",
        paymentNotes: "Billing and maintenance included",
        features: ["1 Google Ads setup", "Billing support", "Maintenance service"],
        prices: [
          ["weekly", "65.00"],
          ["monthly", "230.00"],
          ["yearly", "1750.00"],
        ],
      },
      {
        tier: "extra",
        title: "Digital Ads Maintenance Package",
        description: "Fixing existing ad campaigns paid per task.",
        paymentNotes: "Payment per task",
        features: ["Fixing existing ads", "Paid per task"],
        prices: [["per_task", "60.00"]],
      },
    ],
  },
  {
    name: "Maintenance & Fix Web System",
    category: "maintenance",
    shortDescription: "Repair and maintenance service for existing web systems.",
    details: "Task-based support for fixing current websites or web systems.",
    packages: [
      {
        tier: "extra",
        title: "System Maintenance Package",
        description: "Fixing the existing system with task-based pricing.",
        paymentNotes: "Payment per task",
        features: ["Fixing existing system", "Maintenance support", "Paid per task"],
        prices: [["per_task", "90.00"]],
      },
    ],
  },
];

const priceIsDefault = (period: string) => period === "monthly" || period === "per_task";

async function main() {
  for (const serviceData of services) {
    const { packages, ...serviceFields } = serviceData;
    const service = await prisma.service.upsert({
      where: { name: serviceData.name },
      update: {
        category: serviceFields.category,
        shortDescription: serviceFields.shortDescription,
        details: serviceFields.details,
      },
      create: serviceFields,
    });

    for (const pkg of packages) {
      const { prices, ...pkgFields } = pkg;
      const row = await prisma.servicePackage.upsert({
        where: { serviceId_tier: { serviceId: service.id, tier: pkg.tier } },
        update: {
          title: pkgFields.title,
          description: pkgFields.description,
          paymentNotes: pkgFields.paymentNotes,
          features: pkgFields.features,
        },
        create: { serviceId: service.id, ...pkgFields },
      });

      for (const [period, amount] of prices) {
        const isDefault = priceIsDefault(period);
        await prisma.packagePrice.upsert({
          where: {
            packageId_billingPeriod_currency: {
              packageId: row.id,
              billingPeriod: period,
              currency: "TZS",
            },
          },
          update: { amount, isDefault },
          create: {
            packageId: row.id,
            billingPeriod: period,
            amount,
            currency: "TZS",
            isDefault,
          },
        });
      }
    }
  }

  const adminExists = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@infaan.com",
        password: await hashPassword("Admin12345!"),
        isSuperuser: true,
        isStaff: true,
        isActive: true,
        role: "admin",
      },
    });
  }

  console.log("Infaan Web and Design data seeded successfully.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
