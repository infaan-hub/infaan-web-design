import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DrfError, modelNotFound } from "@/lib/drf";
import { drfString, drfChoice, drfBool, zodToFields } from "@/lib/zod-drf";
import { drfDateTime } from "@/lib/format";
import { decimalOut, drfDecimal } from "@/lib/decimal";

export const SERVICE_CATEGORIES = [
  "logo_poster",
  "website",
  "system_subscription",
  "digital_ads",
  "maintenance",
] as const;
export const TIERS = ["silver", "gold", "premium", "extra"] as const;
export const BILLING_PERIODS = ["weekly", "monthly", "yearly", "per_task"] as const;

// ---------------------------------------------------------------------------
// Field-error accumulation (DRF collects all field errors before object-level
// validate(); each field contributes at most its own messages).
// ---------------------------------------------------------------------------

export class FieldErrors {
  readonly fields: Record<string, unknown[]> = {};

  add(field: string, message: string) {
    const cur = this.fields[field];
    if (Array.isArray(cur)) cur.push(message);
    else this.fields[field] = [message];
  }

  /** Set a field's whole value (used for nested per-index price errors). */
  set(field: string, value: unknown[]) {
    this.fields[field] = value;
  }

  merge(extra: Record<string, unknown[]>) {
    for (const [key, value] of Object.entries(extra)) {
      const cur = this.fields[key];
      if (Array.isArray(cur) && Array.isArray(value)) cur.push(...value);
      else this.fields[key] = value;
    }
  }

  get isEmpty() {
    return Object.keys(this.fields).length === 0;
  }

  throwIfAny() {
    if (!this.isEmpty) throw new DrfError(400, this.fields);
  }
}

/**
 * Parse each field of an Zod object schema independently, mirroring DRF's
 * per-field loop: a field error does not stop other fields from validating,
 * and invalid fields are simply absent from `data`.
 * Issues are parsed against the FIELD schema (path is empty), so they are
 * attributed to that field key rather than non_field_errors.
 */
export function parseObject(
  schema: z.ZodObject<any>,
  body: Record<string, unknown>
): { data: Record<string, any>; errors: FieldErrors } {
  const errors = new FieldErrors();
  const data: Record<string, any> = {};
  for (const key of Object.keys(schema.shape)) {
    const result = schema.shape[key].safeParse(body[key]);
    if (result.success) {
      data[key] = result.data;
      continue;
    }
    // Field-schema issues have empty paths: pass the field's raw value so
    // messages can resolve the offending input (zod omits issue.input).
    const fieldErrors = zodToFields(result.error, body[key]);
    for (const [k, messages] of Object.entries(fieldErrors)) {
      if (k === "non_field_errors") for (const m of messages as unknown[]) errors.add(key, String(m));
      else errors.merge({ [k]: messages });
    }
  }
  return { data, errors };
}

// ---------------------------------------------------------------------------
// Primary-key fields (DRF PrimaryKeyRelatedField)
// ---------------------------------------------------------------------------

function pkShown(value: unknown): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

export function pkMissingMessage(value: unknown): string {
  return `Invalid pk "${pkShown(value)}" - object does not exist.`;
}

function toPk(value: unknown): number | null {
  const id = typeof value === "number" ? value : Number(value);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

export type PkOptions = {
  required: boolean;
  nullable?: boolean;
};

/**
 * Validate a PrimaryKeyRelatedField: required/null handling, then existence
 * (Invalid pk ...). Returns the numeric id, null (explicit null), or
 * undefined (absent/skipped/failed). `onRow` runs only when the row exists
 * (e.g. category checks) and may push errors.
 */
export async function validatePk(
  errors: FieldErrors,
  field: string,
  raw: unknown,
  opts: PkOptions & {
    find: (id: number) => Promise<any>;
    onRow?: (row: any) => void;
  }
): Promise<number | null | undefined> {
  if (raw === undefined) {
    if (opts.required) errors.add(field, "This field is required.");
    return undefined;
  }
  if (raw === null) {
    if (opts.nullable) return null;
    errors.add(field, "This field may not be null.");
    return undefined;
  }
  const id = toPk(raw);
  const row = id !== null ? await opts.find(id) : null;
  if (!row) {
    errors.add(field, pkMissingMessage(raw));
    return undefined;
  }
  if (opts.onRow) opts.onRow(row);
  return id;
}

// ---------------------------------------------------------------------------
// Service (catalog.ServiceViewSet)
// ---------------------------------------------------------------------------

export function serializeService(service: any) {
  return {
    id: service.id,
    name: service.name,
    category: service.category,
    short_description: service.shortDescription,
    details: service.details,
    is_active: service.isActive,
    created_at: drfDateTime(service.createdAt),
    updated_at: drfDateTime(service.updatedAt),
  };
}

export const serviceCreateSchema = z.object({
  name: drfString({ maxLength: 120 }),
  category: drfChoice(SERVICE_CATEGORIES),
  short_description: drfString({ maxLength: 255 }),
  details: drfString(),
  is_active: drfBool({ optional: true }),
});

export const servicePatchSchema = serviceCreateSchema.partial();

export async function listServices(isAdmin: boolean) {
  return prisma.service.findMany({
    where: isAdmin ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function findServiceOr404(id: number, isAdmin: boolean) {
  const service = await prisma.service.findFirst({
    where: { id, ...(isAdmin ? {} : { isActive: true }) },
  });
  if (!service) throw modelNotFound("Service");
  return service;
}

async function serviceNameConflict(name: string, excludeId?: number) {
  return prisma.service.findFirst({
    where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

export async function createService(body: Record<string, unknown>) {
  const { data, errors } = parseObject(serviceCreateSchema, body);
  if (!errors.fields.name && data.name !== undefined) {
    if (await serviceNameConflict(data.name))
      errors.add("name", "service with this name already exists.");
  }
  errors.throwIfAny();
  const service = await prisma.service.create({
    data: {
      name: data.name,
      category: data.category,
      shortDescription: data.short_description,
      details: data.details,
      isActive: data.is_active ?? true,
    },
  });
  return serializeService(service);
}

export async function updateService(
  id: number,
  body: Record<string, unknown>,
  partial: boolean
) {
  const service = await findServiceOr404(id, true);
  const schema = partial ? servicePatchSchema : serviceCreateSchema;
  const { data, errors } = parseObject(schema, body);
  if (!errors.fields.name && data.name !== undefined) {
    if (await serviceNameConflict(data.name, id))
      errors.add("name", "service with this name already exists.");
  }
  errors.throwIfAny();
  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.short_description !== undefined
        ? { shortDescription: data.short_description }
        : {}),
      ...(data.details !== undefined ? { details: data.details } : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
    },
  });
  return serializeService(updated);
}

export async function deleteService(id: number) {
  const service = await findServiceOr404(id, true);
  // Django CASCADE: packages -> prices; a price referenced by subscriptions
  // is PROTECTED and the delete surfaces as a 500 (errorWrap).
  await prisma.service.delete({ where: { id: service.id } });
}

// ---------------------------------------------------------------------------
// PackagePrice (catalog.PackagePriceViewSet - `package` is read-only)
// ---------------------------------------------------------------------------

export function serializePrice(price: any) {
  return {
    id: price.id,
    package: price.packageId,
    billing_period: price.billingPeriod,
    amount: decimalOut(price.amount),
    currency: price.currency,
    is_default: price.isDefault,
    created_at: drfDateTime(price.createdAt),
    updated_at: drfDateTime(price.updatedAt),
  };
}

export const priceCreateSchema = z.object({
  billing_period: drfChoice(BILLING_PERIODS),
  amount: drfDecimal({ maxDigits: 10, decimalPlaces: 2 }),
  currency: drfString({ maxLength: 10 })
    .transform((value) => value.toUpperCase())
    .optional(),
  is_default: drfBool({ optional: true }),
});

export const pricePatchSchema = priceCreateSchema.partial();

export async function listPrices(isAdmin: boolean) {
  return prisma.packagePrice.findMany({
    where: isAdmin
      ? undefined
      : { servicePackage: { isActive: true, service: { isActive: true } } },
    orderBy: [
      { servicePackage: { service: { name: "asc" } } },
      { servicePackage: { tier: "asc" } },
      { billingPeriod: "asc" },
    ],
    include: { servicePackage: { include: { service: true } } },
  });
}

export async function findPriceOr404(id: number, isAdmin: boolean) {
  const price = await prisma.packagePrice.findFirst({
    where: {
      id,
      ...(isAdmin
        ? {}
        : { servicePackage: { isActive: true, service: { isActive: true } } }),
    },
  });
  if (!price) throw modelNotFound("PackagePrice");
  return price;
}

export async function createPrice(body: Record<string, unknown>) {
  const { data, errors } = parseObject(priceCreateSchema, body);
  errors.throwIfAny();
  // DRF `package` is read-only -> insert without package -> NOT NULL violation
  // in Django (500); Prisma rejects the missing required argument (also 500).
  const price = await prisma.packagePrice.create({
    data: {
      billingPeriod: data.billing_period,
      amount: data.amount,
      currency: data.currency ?? "TZS",
      isDefault: data.is_default ?? false,
    } as any,
  });
  return serializePrice(price);
}

export async function updatePrice(id: number, body: Record<string, unknown>, partial = false) {
  await findPriceOr404(id, true);
  const { data, errors } = parseObject(partial ? pricePatchSchema : priceCreateSchema, body);
  errors.throwIfAny();
  const updated = await prisma.packagePrice.update({
    where: { id },
    data: {
      ...(data.billing_period !== undefined ? { billingPeriod: data.billing_period } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.is_default !== undefined ? { isDefault: data.is_default } : {}),
    },
  });
  return serializePrice(updated);
}

export async function deletePrice(id: number) {
  const price = await findPriceOr404(id, true);
  // Django PROTECT: referenced price delete -> ProtectedError -> 500.
  await prisma.packagePrice.delete({ where: { id: price.id } });
}

// ---------------------------------------------------------------------------
// PortfolioItem (catalog.PortfolioItemViewSet)
// ---------------------------------------------------------------------------

export async function listPortfolioItems(isAdmin: boolean) {
  return prisma.portfolioItem.findMany({
    where: isAdmin ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    include: { service: true, servicePackage: true },
  });
}

export async function findPortfolioItemOr404(id: number, isAdmin: boolean) {
  const item = await prisma.portfolioItem.findFirst({
    where: { id, ...(isAdmin ? {} : { isActive: true }) },
    include: { service: true, servicePackage: true },
  });
  if (!item) throw modelNotFound("PortfolioItem");
  return item;
}

export function serializePortfolioItem(item: any) {
  const out: Record<string, unknown> = {
    id: item.id,
    name: item.name,
    image_data: item.imageData,
    is_active: item.isActive,
    service: item.serviceId,
    package: item.packageId,
    created_at: drfDateTime(item.createdAt),
    updated_at: drfDateTime(item.updatedAt),
  };
  // DRF source="service.name" / "package.title" is skipped entirely when the
  // relation is null (SkipField) -> key absent from the response.
  if (item.serviceId !== null && item.serviceId !== undefined && item.service)
    out.service_name = item.service.name;
  if (item.packageId !== null && item.packageId !== undefined && item.servicePackage)
    out.package_title = item.servicePackage.title;
  return out;
}

const portfolioSchema = z.object({
  name: drfString({ maxLength: 150 }),
  image_data: drfString(),
  is_active: drfBool({ optional: true }),
});
const portfolioPatchSchema = portfolioSchema.partial();

export async function createPortfolioItem(body: Record<string, unknown>) {
  const { data, errors } = parseObject(portfolioSchema, body);
  const serviceId = await validatePk(errors, "service", body.service, {
    required: false,
    nullable: true,
    find: (id) => prisma.service.findFirst({ where: { id } }),
  });
  const packageId = await validatePk(errors, "package", body.package, {
    required: false,
    nullable: true,
    find: (id) => prisma.servicePackage.findFirst({ where: { id } }),
  });
  errors.throwIfAny();
  const item = await prisma.portfolioItem.create({
    data: {
      name: data.name,
      imageData: data.image_data,
      isActive: data.is_active ?? true,
      serviceId: serviceId ?? null,
      packageId: packageId ?? null,
    },
    include: { service: true, servicePackage: true },
  });
  return serializePortfolioItem(item);
}

export async function updatePortfolioItem(
  id: number,
  body: Record<string, unknown>,
  partial: boolean
) {
  await findPortfolioItemOr404(id, true);
  const { data, errors } = parseObject(
    partial ? portfolioPatchSchema : portfolioSchema,
    body
  );
  const serviceProvided = "service" in body;
  const serviceId = await validatePk(errors, "service", body.service, {
    required: false,
    nullable: true,
    find: (pk) => prisma.service.findFirst({ where: { id: pk } }),
  });
  const packageProvided = "package" in body;
  const packageId = await validatePk(errors, "package", body.package, {
    required: false,
    nullable: true,
    find: (pk) => prisma.servicePackage.findFirst({ where: { id: pk } }),
  });
  errors.throwIfAny();
  const updated = await prisma.portfolioItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.image_data !== undefined ? { imageData: data.image_data } : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
      ...(serviceProvided ? { serviceId: serviceId ?? null } : {}),
      ...(packageProvided ? { packageId: packageId ?? null } : {}),
    },
    include: { service: true, servicePackage: true },
  });
  return serializePortfolioItem(updated);
}

export async function deletePortfolioItem(id: number) {
  const item = await findPortfolioItemOr404(id, true);
  await prisma.portfolioItem.delete({ where: { id: item.id } });
}
