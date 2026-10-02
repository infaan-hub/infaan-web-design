import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { modelNotFound } from "@/lib/errors";
import { fieldString, fieldBool, fieldUrl } from "@/lib/fields";
import { fieldDateTime } from "@/lib/format";
import { fieldDecimal, decimalOut } from "@/lib/decimal";
import { FieldErrors, parseObject, validatePk } from "./catalog";
import { serializePackage } from "./packages";

const SYSTEM_CATEGORY_MSG =
  "System subscriptions must use the system subscription service category.";
const GALLERY_MSG = "Provide exactly 5 gallery images for the system view.";

const systemCreateSchema = z.object({
  name: fieldString({ maxLength: 150 }),
  summary: fieldString({ maxLength: 255 }),
  details: fieldString({ blank: true }).optional(),
  system_url: fieldUrl({ optional: true }),
  admin_url: fieldUrl({ optional: true }),
  display_price: fieldDecimal({ maxDigits: 10, decimalPlaces: 2, optional: true, nullable: true }),
  display_price_currency: fieldString({ maxLength: 10 })
    .transform((value) => value.toUpperCase())
    .optional(),
  cover_image: fieldString(),
  is_active: fieldBool({ optional: true }),
});
const systemPatchSchema = systemCreateSchema.partial();

const systemInclude = {
  service: {
    include: {
      packages: {
        orderBy: [{ service: { name: "asc" as const } }, { tier: "asc" as const }],
        include: { prices: { orderBy: { billingPeriod: "asc" as const } } },
      },
    },
  },
};

/**
 * SubscriptionSystemSerializer.validate_gallery_images: runs only when the
 * key is present. Iterates like `for x in value`: arrays as items,
 * strings as characters, objects as keys; falsey values become [].
 * Exactly 5 truthy entries required; the FILTERED list is stored.
 * Truthy non-iterables raise a TypeError -> 500.
 */
function validateGallery(
  errors: FieldErrors,
  body: Record<string, unknown>
): unknown[] | undefined {
  if (!("gallery_images" in body)) return undefined;
  const value = (body as any).gallery_images;
  if (value === undefined) return undefined;
  if (value === null) {
    errors.add("gallery_images", "This field may not be null.");
    return undefined;
  }
  let items: unknown[];
  if (Array.isArray(value)) items = value.filter(Boolean);
  else if (typeof value === "string") items = [...value].filter(Boolean);
  else if (typeof value === "object") items = Object.keys(value).filter(Boolean);
  else if (typeof value === "number" || typeof value === "boolean") {
    if (!value) items = [];
    else throw new TypeError(`'${value}' object is not iterable`);
  } else items = [];
  if (items.length !== 5) {
    errors.add("gallery_images", GALLERY_MSG);
    return undefined;
  }
  return items;
}

export function serializeSystem(system: any) {
  const packages = (system.service?.packages ?? []).filter((pkg: any) => pkg.isActive);
  const pricePreview: Record<string, unknown>[] = [];
  for (const pkg of packages) {
    for (const price of pkg.prices ?? []) {
      pricePreview.push({
        package_id: pkg.id,
        package_title: pkg.title,
        billing_period: price.billingPeriod,
        amount: decimalOut(price.amount),
        currency: price.currency,
        is_default: price.isDefault,
      });
    }
  }
  return {
    id: system.id,
    service: system.serviceId,
    service_name: system.service?.name ?? "",
    name: system.name,
    summary: system.summary,
    details: system.details,
    system_url: system.systemUrl,
    admin_url: system.adminUrl,
    display_price: decimalOut(system.displayPrice),
    display_price_currency: system.displayPriceCurrency,
    cover_image: system.coverImage,
    gallery_images: system.galleryImages ?? [],
    is_active: system.isActive,
    created_at: fieldDateTime(system.createdAt),
    updated_at: fieldDateTime(system.updatedAt),
    packages: packages.map(serializePackage),
    price_preview: pricePreview,
  };
}

export async function listSystems(isAdmin: boolean) {
  return prisma.subscriptionSystem.findMany({
    where: isAdmin ? undefined : { isActive: true },
    orderBy: [{ service: { name: "asc" } }, { name: "asc" }],
    include: systemInclude,
  });
}

export async function findSystemOr404(id: number, isAdmin: boolean) {
  const system = await prisma.subscriptionSystem.findFirst({
    where: { id, ...(isAdmin ? {} : { isActive: true }) },
    include: systemInclude,
  });
  if (!system) throw modelNotFound("SubscriptionSystem");
  return system;
}

async function serviceCategoryCheck(
  errors: FieldErrors,
  raw: unknown,
  required: boolean
): Promise<number | undefined> {
  let serviceId: number | undefined;
  await validatePk(errors, "service", raw, {
    required,
    find: (id) => prisma.service.findFirst({ where: { id } }),
    onRow: (row) => {
      if (row.category !== "system_subscription")
        errors.add("service", SYSTEM_CATEGORY_MSG);
      serviceId = row.id;
    },
  });
  return serviceId;
}

export async function createSystem(body: Record<string, unknown>) {
  const { data, errors } = parseObject(systemCreateSchema, body);
  const serviceId = await serviceCategoryCheck(errors, body.service, true);
  const gallery = validateGallery(errors, body);
  errors.throwIfAny();
  const system = await prisma.subscriptionSystem.create({
    data: {
      serviceId: serviceId!,
      name: data.name,
      summary: data.summary,
      ...(data.details !== undefined ? { details: data.details } : {}),
      ...(data.system_url !== undefined ? { systemUrl: data.system_url } : {}),
      ...(data.admin_url !== undefined ? { adminUrl: data.admin_url } : {}),
      ...(data.display_price !== undefined ? { displayPrice: data.display_price } : {}),
      ...(data.display_price_currency !== undefined
        ? { displayPriceCurrency: data.display_price_currency }
        : {}),
      coverImage: data.cover_image,
      ...(gallery !== undefined ? { galleryImages: gallery as any } : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
    },
    include: systemInclude,
  });
  return serializeSystem(system);
}

export async function updateSystem(
  id: number,
  body: Record<string, unknown>,
  partial: boolean
) {
  await findSystemOr404(id, true);
  const { data, errors } = parseObject(partial ? systemPatchSchema : systemCreateSchema, body);
  const serviceId = await serviceCategoryCheck(errors, body.service, !partial);
  const serviceProvided = "service" in body;
  const gallery = validateGallery(errors, body);
  errors.throwIfAny();
  await prisma.subscriptionSystem.update({
    where: { id },
    data: {
      ...(serviceProvided && serviceId !== undefined ? { serviceId } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.details !== undefined ? { details: data.details } : {}),
      ...(data.system_url !== undefined ? { systemUrl: data.system_url } : {}),
      ...(data.admin_url !== undefined ? { adminUrl: data.admin_url } : {}),
      ...(data.display_price !== undefined ? { displayPrice: data.display_price } : {}),
      ...(data.display_price_currency !== undefined
        ? { displayPriceCurrency: data.display_price_currency }
        : {}),
      ...(data.cover_image !== undefined ? { coverImage: data.cover_image } : {}),
      ...(gallery !== undefined ? { galleryImages: gallery as any } : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
    },
  });
  const fresh = await prisma.subscriptionSystem.findFirst({
    where: { id },
    include: systemInclude,
  });
  return serializeSystem(fresh);
}

export async function deleteSystem(id: number) {
  const system = await findSystemOr404(id, true);
  // subscriptions.subscription_system = NULL first, then delete
  // (system orders cascade; Prisma does the same per relation rules).
  await prisma.subscriptionSystem.delete({ where: { id: system.id } });
}
