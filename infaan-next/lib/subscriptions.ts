// catalog.Subscription / PackageSubscriptionOrder / SystemSubscriptionOrder
// date-window + effective-status logic (models.py: get_duration_days,
// assign_service_window, get_effective_status, can_access_service).
// Date fields are stored as UTC-midnight Dates and compared as "YYYY-MM-DD"
// strings (lexicographic == chronological), with today = Africa/Nairobi.

import { fieldDate, todayDateString } from "@/lib/format";

export const SUBSCRIPTION_STATUSES = [
  "pending",
  "active",
  "completed",
  "expired",
  "suspended",
  "grace_period",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = ["pending", "paid"] as const;

const DURATION_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
  yearly: 365,
  per_task: 30,
};

export type StatusRecord = {
  status: string;
  paymentStatus: string;
  endDate: Date | null;
  gracePeriodDays: number;
};

export function durationDays(billingPeriod: string): number {
  return DURATION_DAYS[billingPeriod] ?? 30;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** assign_service_window: start = reference/start/today, end = start + duration, next_billing = end. */
export function assignServiceWindow(
  record: { startDate: Date | null; endDate: Date | null; nextBillingDate: Date | null; packagePrice?: any },
  duration: number,
  referenceDate?: Date | null
): void {
  const start =
    referenceDate ?? record.startDate ?? ((): Date => {
      const today = todayDateString();
      return new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)));
    })();
  record.startDate = start;
  record.endDate = addDays(start, duration);
  record.nextBillingDate = record.endDate;
}

/**
 * get_effective_status: terminal statuses pass through; no end_date ->
 * active/pending by payment; unpaid -> pending; within window -> active;
 * within grace -> grace_period; else expired.
 */
export function getEffectiveStatus(record: StatusRecord, todayStr?: string): string {
  if (["cancelled", "suspended", "completed"].includes(record.status)) return record.status;

  const endStr = record.endDate ? fieldDate(record.endDate) : null;
  if (!endStr) return record.paymentStatus === "paid" ? "active" : "pending";
  if (record.paymentStatus !== "paid") return "pending";

  const today = todayStr ?? todayDateString();
  if (today <= endStr) return "active";

  const graceEnd = fieldDate(addDays(record.endDate!, record.gracePeriodDays))!;
  if (today <= graceEnd) return "grace_period";
  return "expired";
}

export function canAccessService(record: StatusRecord, todayStr?: string): boolean {
  return ["active", "grace_period"].includes(getEffectiveStatus(record, todayStr));
}
