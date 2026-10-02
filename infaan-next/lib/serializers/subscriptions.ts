import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, fieldError, modelNotFound } from "@/lib/errors";
import { fieldString, fieldChoice, fieldBool, fieldInt, fieldDateOnly, parse } from "@/lib/fields";
import { fieldDateTime, fieldDate, todayDateOnly } from "@/lib/format";
import { decimalOut, fieldDecimal } from "@/lib/decimal";
import { isAdmin, type AuthUser } from "@/lib/auth";
import {
  PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  assignServiceWindow,
  canAccessService,
  durationDays,
  getEffectiveStatus,
} from "@/lib/subscriptions";
import {
  buildServiceConnectionDetails,
  ensureSubscriptionControlRecords,
  ensureSystemOrderControlRecords,
} from "./control-records";
import { validatePk, FieldErrors, parseObject } from "./catalog";

// catalog.SubscriptionSerializer / checkout serializers / order serializers

const AVAILABILITY_MSG = "This package is not currently available.";
const SYSTEM_INACTIVE_MSG = "This system is not currently active.";
const SYSTEM_MISMATCH_MSG = "Selected system must match the package service.";
const YEARLY_ONLY_MSG = "System subscriptions use yearly pricing only.";
const PACKAGE_CHECKOUT_SYSTEM_MSG =
  "Use the system subscription checkout API for system subscriptions.";

export const subscriptionInclude = {
  user: true,
  packagePrice: { include: { servicePackage: { include: { service: true } } } },
  subscriptionSystem: true,
  tenantService: { include: { tenant: true } },
} as const;

export const packageOrderInclude = {
  user: true,
  packagePrice: { include: { servicePackage: { include: { service: true } } } },
} as const;

// ---------------------------------------------------------------------------
// Writable-field schemas (shared by /subscriptions/ CRUD and both checkouts)
// ---------------------------------------------------------------------------

export const statusChoice = fieldChoice(SUBSCRIPTION_STATUSES);
export const paymentStatusChoice = fieldChoice(PAYMENT_STATUSES);

/** Checkout/payment fields common to Subscription, both orders and checkouts. */
function paymentShape(opts: { checkoutCurrencyBlank?: boolean }) {
  return {
    payment_status: paymentStatusChoice.optional(),
    payment_method: fieldString({ maxLength: 30, blank: true }).optional(),
    payment_contact: fieldString({ maxLength: 120, blank: true }).optional(),
    payment_amount: fieldDecimal({ maxDigits: 12, decimalPlaces: 2, optional: true, nullable: true }),
    payment_currency: opts.checkoutCurrencyBlank
      ? fieldString({ maxLength: 10, blank: true }).optional()
      : fieldString({ maxLength: 10 }).optional(),
    business_name: fieldString({ maxLength: 120 }),
    contact_email: fieldString({ email: true }),
    contact_phone: fieldString({ maxLength: 30 }),
    notes: fieldString({ blank: true }).optional(),
    start_date: fieldDateOnly({ optional: true, nullable: true }),
    end_date: fieldDateOnly({ optional: true, nullable: true }),
    next_billing_date: fieldDateOnly({ optional: true, nullable: true }),
    auto_renew: fieldBool({ optional: true }),
    grace_period_days: fieldInt({ min: 0, optional: true }),
  };
}

// SubscriptionSerializer write fields (user/created_at/updated_at read-only).
export const subscriptionCreateSchema = z.object({
  ...paymentShape({}),
  status: statusChoice.optional(),
});

// BaseCheckoutSerializer: allow_blank currency; NO end/next billing fields
// (window computed server-side from start_date + duration).
const { end_date: _coEnd, next_billing_date: _coNext, ...checkoutScalars } = paymentShape({
  checkoutCurrencyBlank: true,
});
const checkoutCreateSchema = z.object({ ...checkoutScalars });

export const subscriptionPatchSchema = subscriptionCreateSchema.partial();
export const orderPatchSchema = subscriptionCreateSchema.partial();

// ---------------------------------------------------------------------------
// Output serializers
// ---------------------------------------------------------------------------

function userDetails(user: any) {
  return { id: user.id, username: user.username, email: user.email, role: user.role };
}

function packageDetails(price: any) {
  const pkg = price.servicePackage;
  return {
    service: pkg.service.name,
    tier: pkg.tier,
    title: pkg.title,
    features: pkg.features ?? [],
    payment_notes: pkg.paymentNotes,
    billing_period: price.billingPeriod,
    amount: decimalOut(price.amount),
    currency: price.currency,
  };
}

function serviceAccess(record: any) {
  return {
    status: getEffectiveStatus(record),
    can_access: canAccessService(record),
    start_date: fieldDate(record.startDate),
    end_date: fieldDate(record.endDate),
    next_billing_date: fieldDate(record.nextBillingDate),
    grace_period_days: record.gracePeriodDays,
  };
}

function systemDetails(system: any) {
  if (!system) return null;
  return {
    id: system.id,
    name: system.name,
    summary: system.summary,
    system_url: system.systemUrl,
    admin_url: system.adminUrl,
    display_price: decimalOut(system.displayPrice),
    display_price_currency: system.displayPriceCurrency,
    cover_image: system.coverImage,
    gallery_images: system.galleryImages ?? [],
    is_active: system.isActive,
  };
}

function controlDetails(record: any) {
  const ts = record.tenantService;
  return ts ? buildServiceConnectionDetails(ts) : null;
}

export function serializeSubscription(sub: any) {
  return {
    id: sub.id,
    user: sub.userId,
    package_price: sub.packagePriceId,
    subscription_system: sub.subscriptionSystemId,
    status: sub.status,
    payment_status: sub.paymentStatus,
    payment_method: sub.paymentMethod,
    payment_contact: sub.paymentContact,
    payment_amount: decimalOut(sub.paymentAmount),
    payment_currency: sub.paymentCurrency,
    business_name: sub.businessName,
    contact_email: sub.contactEmail,
    contact_phone: sub.contactPhone,
    notes: sub.notes,
    start_date: fieldDate(sub.startDate),
    end_date: fieldDate(sub.endDate),
    next_billing_date: fieldDate(sub.nextBillingDate),
    auto_renew: sub.autoRenew,
    grace_period_days: sub.gracePeriodDays,
    created_at: fieldDateTime(sub.createdAt),
    updated_at: fieldDateTime(sub.updatedAt),
    user_details: userDetails(sub.user),
    package_details: packageDetails(sub.packagePrice),
    service_access: serviceAccess(sub),
    system_details: systemDetails(sub.subscriptionSystem),
    control_details: controlDetails(sub),
  };
}

export function serializePackageOrder(order: any) {
  return {
    id: order.id,
    user: order.userId,
    package_price: order.packagePriceId,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    payment_contact: order.paymentContact,
    payment_amount: decimalOut(order.paymentAmount),
    payment_currency: order.paymentCurrency,
    business_name: order.businessName,
    contact_email: order.contactEmail,
    contact_phone: order.contactPhone,
    notes: order.notes,
    start_date: fieldDate(order.startDate),
    end_date: fieldDate(order.endDate),
    next_billing_date: fieldDate(order.nextBillingDate),
    auto_renew: order.autoRenew,
    grace_period_days: order.gracePeriodDays,
    created_at: fieldDateTime(order.createdAt),
    updated_at: fieldDateTime(order.updatedAt),
    user_details: userDetails(order.user),
    package_details: packageDetails(order.packagePrice),
    service_access: serviceAccess(order),
    system_details: null,
    control_details: null,
    record_type: "package_subscription",
  };
}

export function serializeSystemOrder(order: any) {
  return {
    id: order.id,
    user: order.userId,
    package_price: order.packagePriceId,
    subscription_system: order.subscriptionSystemId,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    payment_contact: order.paymentContact,
    payment_amount: decimalOut(order.paymentAmount),
    payment_currency: order.paymentCurrency,
    business_name: order.businessName,
    contact_email: order.contactEmail,
    contact_phone: order.contactPhone,
    notes: order.notes,
    start_date: fieldDate(order.startDate),
    end_date: fieldDate(order.endDate),
    next_billing_date: fieldDate(order.nextBillingDate),
    auto_renew: order.autoRenew,
    grace_period_days: order.gracePeriodDays,
    created_at: fieldDateTime(order.createdAt),
    updated_at: fieldDateTime(order.updatedAt),
    user_details: userDetails(order.user),
    package_details: packageDetails(order.packagePrice),
    service_access: serviceAccess(order),
    system_details: systemDetails(order.subscriptionSystem),
    control_details: controlDetails(order),
    record_type: "system_subscription",
  };
}

// ---------------------------------------------------------------------------
// Shared write helpers
// ---------------------------------------------------------------------------

async function findPriceRow(id: number) {
  return prisma.packagePrice.findFirst({
    where: { id },
    include: { servicePackage: { include: { service: true } } },
  });
}
async function findSystemRow(id: number) {
  return prisma.subscriptionSystem.findFirst({ where: { id } });
}
async function findUserRow(id: number) {
  return prisma.user.findFirst({ where: { id } });
}

/** validate_package_price availability check (only when the row exists). */
function availabilityError(price: any): string | null {
  if (!price.servicePackage.isActive || !price.servicePackage.service.isActive) return AVAILABILITY_MSG;
  return null;
}

/** SubscriptionSerializer.validate: system active + service match. */
function systemObjectError(systemRow: any, priceRow: any): string | null {
  if (!systemRow) return null;
  if (!systemRow.isActive) return SYSTEM_INACTIVE_MSG;
  if (priceRow && systemRow.serviceId !== priceRow.servicePackage.serviceId) return SYSTEM_MISMATCH_MSG;
  return null;
}

const WRITE_FIELD_MAP: Record<string, string> = {
  status: "status",
  payment_status: "paymentStatus",
  payment_method: "paymentMethod",
  payment_contact: "paymentContact",
  payment_amount: "paymentAmount",
  payment_currency: "paymentCurrency",
  business_name: "businessName",
  contact_email: "contactEmail",
  contact_phone: "contactPhone",
  notes: "notes",
  start_date: "startDate",
  end_date: "endDate",
  next_billing_date: "nextBillingDate",
  auto_renew: "autoRenew",
  grace_period_days: "gracePeriodDays",
};

// Serializer full-replace: fields with serializer defaults reset when
// absent on PUT; fields without defaults (dates, payment_amount) are kept.
const PUT_DEFAULTS: Record<string, unknown> = {
  status: "pending",
  payment_status: "pending",
  payment_method: "",
  payment_contact: "",
  payment_currency: "TZS",
  notes: "",
  auto_renew: false,
  grace_period_days: 3,
};

function mapScalars(data: Record<string, any>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    patch[WRITE_FIELD_MAP[key]] = value;
  }
  return patch;
}

function applyPutDefaults(patch: Record<string, unknown>, data: Record<string, any>) {
  for (const [key, value] of Object.entries(PUT_DEFAULTS)) {
    if (data[key] === undefined) patch[WRITE_FIELD_MAP[key]] = value;
  }
}

// ---------------------------------------------------------------------------
// Subscription CRUD
// ---------------------------------------------------------------------------

export async function listSubscriptions(requester: AuthUser) {
  const where = isAdmin(requester) ? {} : { userId: requester.id };
  return prisma.subscription.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: subscriptionInclude,
  });
}

export async function findSubscriptionOr404(id: number, requester: AuthUser) {
  const where: Record<string, unknown> = { id };
  if (!isAdmin(requester)) where.userId = requester.id;
  const sub = await prisma.subscription.findFirst({ where, include: subscriptionInclude });
  if (!sub) throw modelNotFound("Subscription");
  return sub;
}

export async function createSubscription(requester: AuthUser, body: Record<string, unknown>) {
  const { data, errors } = parseObject(subscriptionCreateSchema, body);
  const rows: any = {};
  const priceId = await validatePk(errors, "package_price", body.package_price, {
    required: true,
    find: findPriceRow,
    onRow: (row) => {
      rows.price = row;
      const avail = availabilityError(row);
      if (avail) errors.add("package_price", avail);
    },
  });
  const systemId = await validatePk(errors, "subscription_system", body.subscription_system, {
    required: false,
    nullable: true,
    find: findSystemRow,
    onRow: (row) => {
      rows.system = row;
    },
  });
  errors.throwIfAny();
  const sysMsg = systemObjectError(rows.system, rows.price);
  if (sysMsg) {
    errors.add("subscription_system", sysMsg);
    errors.throwIfAny();
  }

  const paid = data.payment_status === "paid";
  const start = data.start_date ?? todayDateOnly();
  // Construct with validated data, then status/window override.
  const record: any = {
    ...mapScalars(data),
    userId: requester.id,
    packagePriceId: priceId!,
    subscriptionSystemId: systemId ?? null,
    status: paid ? "active" : "pending",
    startDate: start,
    endDate: null,
    nextBillingDate: null,
  };
  if (paid) assignServiceWindow(record, durationDays(rows.price.billingPeriod), start);
  const created = await prisma.subscription.create({ data: record });
  try {
    await ensureSubscriptionControlRecords(created.id);
  } catch (err) {
    console.error("[api] control-records provisioning failed:", err);
  }
  const full = await prisma.subscription.findUnique({
    where: { id: created.id },
    include: subscriptionInclude,
  });
  return serializeSubscription(full);
}

export async function updateSubscription(
  id: number,
  requester: AuthUser,
  body: Record<string, unknown>,
  partial: boolean
) {
  const sub = await findSubscriptionOr404(id, requester);
  const { data, errors } = parseObject(
    partial ? subscriptionPatchSchema : subscriptionCreateSchema,
    body
  );
  const rows: any = {};
  const priceId = await validatePk(errors, "package_price", body.package_price, {
    required: !partial,
    find: findPriceRow,
    onRow: (row) => {
      rows.price = row;
      const avail = availabilityError(row);
      if (avail) errors.add("package_price", avail);
    },
  });
  const systemId = await validatePk(errors, "subscription_system", body.subscription_system, {
    required: false,
    nullable: true,
    find: findSystemRow,
    onRow: (row) => {
      rows.system = row;
    },
  });
  errors.throwIfAny();

  // validate(): explicit-null/absent system falls back to the instance value.
  const priceRow = rows.price ?? sub.packagePrice;
  let checkSystemRow: any = rows.system ?? null;
  if (typeof systemId !== "number") checkSystemRow = sub.subscriptionSystem ?? null;
  const sysMsg = systemObjectError(checkSystemRow, priceRow);
  if (sysMsg) {
    errors.add("subscription_system", sysMsg);
    errors.throwIfAny();
  }

  const patch: Record<string, unknown> = {};
  if (priceId !== undefined) patch.packagePriceId = priceId;
  if (systemId !== undefined) patch.subscriptionSystemId = systemId;
  Object.assign(patch, mapScalars(data));
  if (!partial) applyPutDefaults(patch, data);

  const nextPayment = (patch.paymentStatus as string) ?? sub.paymentStatus;
  const nextStatus = (patch.status as string) ?? sub.status;
  const TERMINAL = ["cancelled", "suspended", "completed"];
  if (nextPayment === "paid" && !TERMINAL.includes(nextStatus)) {
    const merged = {
      status: nextStatus,
      paymentStatus: nextPayment,
      endDate: ("endDate" in patch ? patch.endDate : sub.endDate) as Date | null,
      gracePeriodDays:
        (patch.gracePeriodDays as number | undefined) ?? sub.gracePeriodDays,
    };
    patch.status = getEffectiveStatus(merged);
    const curStart = ("startDate" in patch ? patch.startDate : sub.startDate) as Date | null;
    const curEnd = ("endDate" in patch ? patch.endDate : sub.endDate) as Date | null;
    if (!curStart || !curEnd) {
      const priceRow2 =
        typeof patch.packagePriceId === "number"
          ? await findPriceRow(patch.packagePriceId)
          : sub.packagePrice;
      const tmp: any = { startDate: curStart ?? todayDateOnly(), endDate: null, nextBillingDate: null };
      assignServiceWindow(tmp, durationDays(priceRow2.billingPeriod));
      patch.startDate = tmp.startDate;
      patch.endDate = tmp.endDate;
      patch.nextBillingDate = tmp.nextBillingDate;
    }
  }

  const updated = await prisma.subscription.update({ where: { id: sub.id }, data: patch });
  try {
    await ensureSubscriptionControlRecords(updated.id);
  } catch (err) {
    console.error("[api] control-records provisioning failed:", err);
  }
  const full = await prisma.subscription.findUnique({
    where: { id: sub.id },
    include: subscriptionInclude,
  });
  return serializeSubscription(full);
}

export async function deleteSubscription(id: number, requester: AuthUser) {
  const sub = await findSubscriptionOr404(id, requester);
  await prisma.subscription.delete({ where: { id: sub.id } });
}

// ---------------------------------------------------------------------------
// Order CRUD (package-subscription orders /
// system-subscription orders) - plain serializer semantics:
// no availability/system checks, no window side effects on write.
// ---------------------------------------------------------------------------

export type OrderKind = "package" | "system";

const TERMINAL_STATUSES = ["cancelled", "suspended", "completed"];

function orderDelegate(kind: OrderKind) {
  return kind === "system"
    ? (prisma.systemSubscriptionOrder as any)
    : (prisma.packageSubscriptionOrder as any);
}

function orderInclude(kind: OrderKind) {
  return kind === "system" ? subscriptionInclude : packageOrderInclude;
}

function orderSerializer(kind: OrderKind, row: any) {
  return kind === "system" ? serializeSystemOrder(row) : serializePackageOrder(row);
}

function orderModelName(kind: OrderKind) {
  return kind === "system" ? "SystemSubscriptionOrder" : "PackageSubscriptionOrder";
}

export async function listOrders(kind: OrderKind, requester: AuthUser) {
  const where = isAdmin(requester) ? {} : { userId: requester.id };
  return orderDelegate(kind).findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: orderInclude(kind),
  });
}

export async function findOrderOr404(
  kind: OrderKind,
  id: number,
  requester: AuthUser
) {
  const where: Record<string, unknown> = { id };
  if (!isAdmin(requester)) where.userId = requester.id;
  const row = await orderDelegate(kind).findFirst({ where, include: orderInclude(kind) });
  if (!row) throw modelNotFound(orderModelName(kind));
  return row;
}

export async function createOrder(
  kind: OrderKind,
  requester: AuthUser,
  body: Record<string, unknown>
) {
  const { data, errors } = parseObject(subscriptionCreateSchema, body);
  const rows: any = {};
  const userId = await validatePk(errors, "user", body.user, {
    required: true,
    find: findUserRow,
    onRow: (row) => {
      rows.user = row;
    },
  });
  const priceId = await validatePk(errors, "package_price", body.package_price, {
    required: true,
    find: findPriceRow,
    onRow: (row) => {
      rows.price = row;
    },
  });
  let systemId: number | null | undefined;
  if (kind === "system") {
    systemId = await validatePk(errors, "subscription_system", body.subscription_system, {
      required: true,
      find: findSystemRow,
      onRow: (row) => {
        rows.system = row;
      },
    });
  }
  errors.throwIfAny();

  const record: any = {
    userId: userId!,
    packagePriceId: priceId!,
    ...mapScalars(data),
  };
  if (kind === "system") record.subscriptionSystemId = systemId!;
  const created = await orderDelegate(kind).create({ data: record });
  const full = await orderDelegate(kind).findFirst({
    where: { id: created.id },
    include: orderInclude(kind),
  });
  return orderSerializer(kind, full);
}

export async function updateOrder(
  kind: OrderKind,
  id: number,
  requester: AuthUser,
  body: Record<string, unknown>,
  partial: boolean
) {
  const row = await findOrderOr404(kind, id, requester);
  const { data, errors } = parseObject(
    partial ? orderPatchSchema : subscriptionCreateSchema,
    body
  );
  const userId = await validatePk(errors, "user", body.user, {
    required: !partial,
    find: findUserRow,
    onRow: () => {},
  });
  const priceId = await validatePk(errors, "package_price", body.package_price, {
    required: !partial,
    find: findPriceRow,
    onRow: () => {},
  });
  let systemId: number | null | undefined;
  if (kind === "system") {
    systemId = await validatePk(errors, "subscription_system", body.subscription_system, {
      required: !partial,
      find: findSystemRow,
      onRow: () => {},
    });
  }
  errors.throwIfAny();

  const patch: Record<string, unknown> = {};
  if (userId !== undefined) patch.userId = userId;
  if (priceId !== undefined) patch.packagePriceId = priceId;
  if (kind === "system" && systemId !== undefined) patch.subscriptionSystemId = systemId;
  Object.assign(patch, mapScalars(data));
  if (!partial) applyPutDefaults(patch, data);

  await orderDelegate(kind).update({ where: { id: row.id }, data: patch });
  const full = await orderDelegate(kind).findFirst({
    where: { id: row.id },
    include: orderInclude(kind),
  });
  return orderSerializer(kind, full);
}

export async function deleteOrder(
  kind: OrderKind,
  id: number,
  requester: AuthUser
) {
  const row = await findOrderOr404(kind, id, requester);
  await orderDelegate(kind).delete({ where: { id: row.id } });
}

// ---------------------------------------------------------------------------
// Checkouts (create_checkout_response / *CheckoutView) - 201 responses.
// ---------------------------------------------------------------------------

export async function runCheckout(
  requester: AuthUser,
  body: Record<string, unknown>,
  kind: OrderKind
) {
  const { data, errors } = parseObject(checkoutCreateSchema, body);
  const rows: any = {};
  const priceId = await validatePk(errors, "package_price", body.package_price, {
    required: true,
    find: findPriceRow,
    onRow: (row) => {
      rows.price = row;
      const avail = availabilityError(row);
      if (avail) errors.add("package_price", avail);
    },
  });
  let systemId: number | null | undefined;
  if (kind === "system") {
    systemId = await validatePk(errors, "subscription_system", body.subscription_system, {
      required: true,
      find: findSystemRow,
      onRow: (row) => {
        rows.system = row;
      },
    });
  }
  errors.throwIfAny();

  if (kind === "system") {
    // SystemSubscriptionCheckoutSerializer.validate: active -> match -> yearly.
    if (!rows.system.isActive) errors.add("subscription_system", SYSTEM_INACTIVE_MSG);
    else if (rows.system.serviceId !== rows.price.servicePackage.serviceId)
      errors.add("subscription_system", SYSTEM_MISMATCH_MSG);
    else if (rows.price.billingPeriod !== "yearly")
      errors.add("package_price", YEARLY_ONLY_MSG);
  } else {
    // ServiceCheckoutSerializer.validate: body subscription_system must be
    // None/""/"null" (field is read-only on the package checkout).
    const raw = body.subscription_system;
    if (raw !== undefined && raw !== null && raw !== "" && raw !== "null")
      errors.add("subscription_system", PACKAGE_CHECKOUT_SYSTEM_MSG);
  }
  errors.throwIfAny();

  const paid = data.payment_status === "paid";
  const start = data.start_date ?? todayDateOnly();
  // Construct with validated data, then status/window override.
  const record: any = {
    ...mapScalars(data),
    userId: requester.id,
    packagePriceId: priceId!,
    status: paid ? "active" : "pending",
    startDate: start,
    endDate: null,
    nextBillingDate: null,
  };
  if (kind === "system") record.subscriptionSystemId = systemId!;
  if (paid) assignServiceWindow(record, durationDays(rows.price.billingPeriod), start);

  const created = await orderDelegate(kind).create({ data: record });
  if (kind === "system") {
    try {
      await ensureSystemOrderControlRecords(created.id);
    } catch (err) {
      console.error("[api] control-records provisioning failed:", err);
    }
  }
  const full = await orderDelegate(kind).findFirst({
    where: { id: created.id },
    include: orderInclude(kind),
  });
  return orderSerializer(kind, full);
}

export { TERMINAL_STATUSES };
