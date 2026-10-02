import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fieldError, modelNotFound } from "@/lib/drf";
import { drfString, drfChoice, drfBool } from "@/lib/zod-drf";
import { drfDateTime } from "@/lib/format";
import { decimalErrorMessage, decimalOut } from "@/lib/decimal";
import {
  BILLING_PERIODS,
  FieldErrors,
  TIERS,
  parseObject,
  serializePrice,
  validatePk,
} from "./catalog";

const TIER_CONFLICT = "An active package with this tier already exists for the selected service.";
const LOGO_SERVICE_MSG = "Use this API only for Logo & Poster Design services.";
const LOGO_PRICES_MSG = "Provide at least one per_task price.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pyTypeName(value: unknown): string {
  if (value === null) return "NoneType";
  if (Array.isArray(value)) return "list";
  switch (typeof value) {
    case "string":
      return "str";
    case "number":
      return Number.isInteger(value) ? "int" : "float";
    case "boolean":
      return "bool";
    case "object":
      return "dict";
    default:
      return "str";
  }
}

function choiceMessage(value: unknown): string {
  const shown = typeof value === "boolean" ? (value ? "True" : "False") : String(value);
  return `"${shown}" is not a valid choice.`;
}

export type NormalizedPrice = {
  billing_period: string;
  amount: string;
  currency: string;
  is_default: boolean;
};

/** DRF per-entry field validation for a nested PackagePrice dict. */
function validatePriceEntry(entry: any): {
  entry?: NormalizedPrice;
  errors?: Record<string, string[]>;
} {
  const errs: Record<string, string[]> = {};

  let billing: string | undefined;
  const bp = entry.billing_period;
  if (bp === undefined) errs.billing_period = ["This field is required."];
  else if (bp === null) errs.billing_period = ["This field may not be null."];
  else if (typeof bp !== "string" || !(BILLING_PERIODS as readonly string[]).includes(bp))
    errs.billing_period = [choiceMessage(bp)];
  else billing = bp;

  let amount: string | undefined;
  const rawAmount = entry.amount;
  if (rawAmount === undefined) errs.amount = ["This field is required."];
  else if (rawAmount === null) errs.amount = ["This field may not be null."];
  else if (typeof rawAmount !== "string" && typeof rawAmount !== "number")
    errs.amount = ["A valid number is required."];
  else {
    const message = decimalErrorMessage(
      typeof rawAmount === "number" ? String(rawAmount) : rawAmount,
      { maxDigits: 10, decimalPlaces: 2 }
    );
    if (message) errs.amount = [message];
    else amount = (typeof rawAmount === "number" ? String(rawAmount) : rawAmount).trim();
  }

  let currency = "TZS";
  const cur = entry.currency;
  if (cur !== undefined && cur !== null) {
    const asString = typeof cur === "number" ? String(cur) : typeof cur === "string" ? cur : null;
    if (asString === null) errs.currency = ["Not a valid string."];
    else {
      const trimmed = asString.trim();
      if (trimmed === "") errs.currency = ["This field may not be blank."];
      else if (trimmed.length > 10)
        errs.currency = ["Ensure this field has no more than 10 characters."];
      else currency = trimmed.toUpperCase();
    }
  } else if (cur === null) {
    errs.currency = ["This field may not be null."];
  }

  let isDefault = false;
  const dflt = entry.is_default;
  if (dflt !== undefined && dflt !== null) {
    if (typeof dflt === "boolean") isDefault = dflt;
    else if (typeof dflt === "string") {
      const v = dflt.toLowerCase();
      if (["true", "t", "yes", "y", "on", "1"].includes(v)) isDefault = true;
      else if (["false", "f", "no", "n", "off", "0"].includes(v)) isDefault = false;
      else errs.is_default = ["Must be a valid boolean."];
    } else if (dflt === 1) isDefault = true;
    else if (dflt === 0) isDefault = false;
    else errs.is_default = ["Must be a valid boolean."];
  } else if (dflt === null) {
    errs.is_default = ["This field may not be null."];
  }

  if (Object.keys(errs).length) return { errors: errs };
  return { entry: { billing_period: billing!, amount: amount!, currency, is_default: isDefault } };
}

/**
 * Validate a `prices` value like PackagePriceSerializer(many=True):
 * full-length per-index error array with {} for valid entries, or a flat
 * field-level message list for non-list/null/duplicate errors.
 * Returns the validated entries when everything passed.
 */
export function validatePriceList(
  raw: unknown,
  errors: FieldErrors
): NormalizedPrice[] | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) {
    errors.add("prices", "This field may not be null.");
    return undefined;
  }
  if (!Array.isArray(raw)) {
    errors.add("prices", `Expected a list of items but got type "${pyTypeName(raw)}".`);
    return undefined;
  }
  const listErrors: Record<string, unknown>[] = [];
  const entries: NormalizedPrice[] = [];
  let anyError = false;
  for (const item of raw) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      listErrors.push({
        non_field_errors: [`Invalid data. Expected a dictionary, but got ${pyTypeName(item)}.`],
      });
      anyError = true;
      continue;
    }
    const result = validatePriceEntry(item);
    if (result.errors) {
      listErrors.push(result.errors);
      anyError = true;
    } else {
      listErrors.push({});
      entries.push(result.entry!);
    }
  }
  if (anyError) {
    errors.set("prices", listErrors);
    return undefined;
  }
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.billing_period}|${entry.currency}`;
    if (seen.has(key)) {
      errors.add(
        "prices",
        "Each billing period and currency combination must be unique."
      );
      return undefined;
    }
    seen.add(key);
  }
  return entries;
}

/** ServicePackageSerializer._normalize_prices: drop non-per_task for logo services. */
function normalizePrices(serviceCategory: string, entries: NormalizedPrice[]): NormalizedPrice[] {
  const normalized: NormalizedPrice[] = [];
  const seen = new Set<string>();
  for (const price of entries) {
    if (!price.billing_period) continue;
    if (serviceCategory === "logo_poster" && price.billing_period !== "per_task") continue;
    const key = `${price.billing_period}|${price.currency}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(price);
  }
  return normalized;
}

const packageCreateSchema = z.object({
  tier: drfChoice(TIERS),
  title: drfString({ maxLength: 150 }),
  description: drfString(),
  // DRF JSONField (strict=False): any JSON value is accepted, null is not.
  features: z.unknown().superRefine((value, ctx) => {
    if (value === null)
      ctx.addIssue({ code: "custom", message: "This field may not be null." });
  }),
  payment_notes: drfString({ maxLength: 255, blank: true }).optional(),
  is_active: drfBool({ optional: true }),
});
const packagePatchSchema = packageCreateSchema.partial();

const pricesInclude = { orderBy: { billingPeriod: "asc" as const } };
const packageInclude = { service: true, prices: pricesInclude };

export function serializePackage(pkg: any) {
  return {
    id: pkg.id,
    service: pkg.serviceId,
    service_name: pkg.service?.name ?? "",
    tier: pkg.tier,
    title: pkg.title,
    description: pkg.description,
    features: pkg.features ?? [],
    payment_notes: pkg.paymentNotes,
    is_active: pkg.isActive,
    created_at: drfDateTime(pkg.createdAt),
    updated_at: drfDateTime(pkg.updatedAt),
    prices: (pkg.prices ?? []).map(serializePrice),
  };
}

function packageWhere(isAdmin: boolean, logoOnly: boolean) {
  const where: any = {};
  if (!isAdmin) where.isActive = true;
  const serviceWhere: any = {};
  if (!isAdmin) serviceWhere.isActive = true;
  if (logoOnly) serviceWhere.category = "logo_poster";
  if (Object.keys(serviceWhere).length) where.service = serviceWhere;
  return where;
}

export async function listPackages(isAdmin: boolean, logoOnly: boolean) {
  return prisma.servicePackage.findMany({
    where: packageWhere(isAdmin, logoOnly),
    orderBy: [{ service: { name: "asc" } }, { tier: "asc" }],
    include: packageInclude,
  });
}

export async function findPackageOr404(id: number, isAdmin: boolean, logoOnly: boolean) {
  const pkg = await prisma.servicePackage.findFirst({
    where: { id, ...packageWhere(isAdmin, logoOnly) },
    include: packageInclude,
  });
  if (!pkg) throw modelNotFound("ServicePackage");
  return pkg;
}

/** ServicePackageViewSet.get_serializer_class: pick LogoPoster serializer.
 * `forceLogoView` = request hit the /logo-poster-packages/ routes (their
 * serializer_class is LogoPosterPackageSerializer), except when the body's
 * service pk is invalid (Django falls back to the base serializer). */
export async function resolveLogoMode(
  body: Record<string, unknown>,
  instance?: { serviceId: number } | null,
  forceLogoView = false
): Promise<boolean> {
  const raw = body.service;
  if (raw !== undefined && raw !== null && raw !== "" && raw !== 0) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return false;
    const service = await prisma.service.findFirst({
      where: { id },
      select: { category: true },
    });
    if (!service) return false;
    return forceLogoView ? true : service.category === "logo_poster";
  }
  if (forceLogoView) return true;
  if (instance) {
    const service = await prisma.service.findFirst({
      where: { id: instance.serviceId },
      select: { category: true },
    });
    return service?.category === "logo_poster";
  }
  return false;
}

async function priceHasHistoricalReferences(id: number) {
  const [subs, packageOrders, systemOrders] = await Promise.all([
    prisma.subscription.count({ where: { packagePriceId: id } }),
    prisma.packageSubscriptionOrder.count({ where: { packagePriceId: id } }),
    prisma.systemSubscriptionOrder.count({ where: { packagePriceId: id } }),
  ]);
  return subs + packageOrders + systemOrders > 0;
}

/** ServicePackageSerializer.update price upsert (delete only unreferenced prices). */
async function syncPrices(packageId: number, incoming: NormalizedPrice[]) {
  const incomingByKey = new Map(
    incoming.map((entry) => [`${entry.billing_period}|${entry.currency}`, entry])
  );
  const existing = await prisma.packagePrice.findMany({ where: { packageId } });
  const existingByKey = new Map(
    existing.map((price) => [`${price.billingPeriod}|${price.currency}`, price])
  );
  for (const [key, entry] of incomingByKey) {
    const current = existingByKey.get(key);
    if (current) {
      await prisma.packagePrice.update({
        where: { id: current.id },
        data: {
          billingPeriod: entry.billing_period,
          amount: entry.amount,
          currency: entry.currency,
          isDefault: entry.is_default,
        },
      });
    } else {
      await prisma.packagePrice.create({
        data: {
          packageId,
          billingPeriod: entry.billing_period,
          amount: entry.amount,
          currency: entry.currency,
          isDefault: entry.is_default,
        },
      });
    }
  }
  for (const [key, current] of existingByKey) {
    if (incomingByKey.has(key)) continue;
    if (await priceHasHistoricalReferences(current.id)) continue;
    await prisma.packagePrice.delete({ where: { id: current.id } });
  }
}

export async function createPackage(body: Record<string, unknown>, forceLogoView = false) {
  const logo = await resolveLogoMode(body, null, forceLogoView);
  const { data, errors } = parseObject(packageCreateSchema, body);
  let serviceRow: any = null;
  const serviceId = await validatePk(errors, "service", body.service, {
    required: true,
    find: (id) => prisma.service.findFirst({ where: { id } }),
    onRow: (row) => (serviceRow = row),
  });
  const prices = validatePriceList(body.prices, errors);
  errors.throwIfAny();

  const conflict = await prisma.servicePackage.findFirst({
    where: { serviceId: serviceId!, tier: data.tier, isActive: true },
  });
  if (conflict) throw fieldError("tier", TIER_CONFLICT);

  let normalized = prices === undefined ? undefined : normalizePrices(serviceRow.category, prices);
  if (logo) {
    if (serviceRow.category !== "logo_poster") throw fieldError("service", LOGO_SERVICE_MSG);
    if (!normalized || !normalized.length) throw fieldError("prices", LOGO_PRICES_MSG);
  }

  const fields = {
    serviceId: serviceId!,
    tier: data.tier,
    title: data.title,
    description: data.description,
    ...(data.features !== undefined ? { features: data.features as any } : {}),
    ...(data.payment_notes !== undefined ? { paymentNotes: data.payment_notes } : {}),
    ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
  };

  const existingInactive = await prisma.servicePackage.findFirst({
    where: { serviceId: serviceId!, tier: data.tier, isActive: false },
  });
  if (existingInactive) {
    const reactivated = await prisma.servicePackage.update({
      where: { id: existingInactive.id },
      data: { ...fields, isActive: data.is_active ?? true },
      include: packageInclude,
    });
    await syncPrices(reactivated.id, normalized ?? []);
    const fresh = await prisma.servicePackage.findFirst({
      where: { id: reactivated.id },
      include: packageInclude,
    });
    return serializePackage(fresh);
  }

  const created = await prisma.servicePackage.create({
    data: fields,
    include: packageInclude,
  });
  await syncPrices(created.id, normalized ?? []);
  const fresh = await prisma.servicePackage.findFirst({
    where: { id: created.id },
    include: packageInclude,
  });
  return serializePackage(fresh);
}

export async function updatePackage(
  id: number,
  body: Record<string, unknown>,
  partial: boolean,
  forceLogoView = false
) {
  const instance = await findPackageOr404(id, true, forceLogoView);
  const logo = await resolveLogoMode(body, instance, forceLogoView);
  const { data, errors } = parseObject(partial ? packagePatchSchema : packageCreateSchema, body);
  let providedServiceRow: any = null;
  const providedService = await validatePk(errors, "service", body.service, {
    required: !partial,
    find: (pk) => prisma.service.findFirst({ where: { id: pk } }),
    onRow: (row) => (providedServiceRow = row),
  });
  const prices = validatePriceList(body.prices, errors);
  errors.throwIfAny();

  const serviceRow =
    providedService !== undefined ? providedServiceRow : instance.service;
  const tier = data.tier ?? instance.tier;
  const conflict = await prisma.servicePackage.findFirst({
    where: { serviceId: serviceRow.id, tier, isActive: true, id: { not: id } },
  });
  if (conflict) throw fieldError("tier", TIER_CONFLICT);

  let normalized: NormalizedPrice[];
  if (prices !== undefined) {
    normalized = normalizePrices(serviceRow.category, prices);
  } else {
    const existingPrices = await prisma.packagePrice.findMany({ where: { packageId: id } });
    normalized = normalizePrices(
      serviceRow.category,
      existingPrices.map((price) => ({
        billing_period: price.billingPeriod,
        amount: String(price.amount),
        currency: price.currency,
        is_default: price.isDefault,
      }))
    );
  }
  if (logo) {
    if (serviceRow.category !== "logo_poster") throw fieldError("service", LOGO_SERVICE_MSG);
    if (!normalized.length) throw fieldError("prices", LOGO_PRICES_MSG);
  }

  await prisma.servicePackage.update({
    where: { id },
    data: {
      ...(providedService !== undefined ? { serviceId: providedService! } : {}),
      ...(data.tier !== undefined ? { tier: data.tier } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.features !== undefined ? { features: data.features as any } : {}),
      ...(data.payment_notes !== undefined ? { paymentNotes: data.payment_notes } : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
    },
  });
  await syncPrices(id, normalized);
  const fresh = await prisma.servicePackage.findFirst({
    where: { id },
    include: packageInclude,
  });
  return serializePackage(fresh);
}

export async function deletePackage(id: number, isAdmin: boolean, logoOnly: boolean) {
  const pkg = await findPackageOr404(id, isAdmin, logoOnly);
  const prices = await prisma.packagePrice.findMany({
    where: { packageId: pkg.id },
    select: { id: true },
  });
  let hasRefs = false;
  for (const price of prices) {
    if (await priceHasHistoricalReferences(price.id)) {
      hasRefs = true;
      break;
    }
  }
  const softDelete = async () => {
    const current = await prisma.servicePackage.findFirst({
      where: { id: pkg.id },
      select: { isActive: true },
    });
    if (current?.isActive)
      await prisma.servicePackage.update({
        where: { id: pkg.id },
        data: { isActive: false },
      });
  };
  if (hasRefs) {
    await softDelete();
    return;
  }
  try {
    await prisma.servicePackage.delete({ where: { id: pkg.id } });
  } catch {
    await softDelete();
  }
}
