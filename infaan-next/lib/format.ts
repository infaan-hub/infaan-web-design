// DRF-compatible serialization formatting (matches settings.py: USE_TZ=True,
// DATETIME_FORMAT=ISO_8601, DATE_FORMAT=iso-8601, TIME_ZONE="Africa/Nairobi").

// Africa/Nairobi has a fixed UTC+3 offset (no DST) - TIME_ZONE in settings.py.
export const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

/** "2025-01-01T12:00:00.123456+03:00" - DRF ISO_8601 with microseconds, Nairobi offset. */
export function drfDateTime(value: Date | null | undefined): string | null {
  if (!value) return null;
  const shifted = new Date(value.getTime() + NAIROBI_OFFSET_MS);
  const iso = shifted.toISOString(); // "...THH:mm:ss.mmmZ"
  // DRF/python: no fraction when microsecond == 0, otherwise 6 digits.
  const match = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{3}))?Z$/);
  if (!match) return iso.replace(/Z$/, "+03:00");
  const [, core, ms] = match;
  if (!ms || ms === "000") return `${core}+03:00`;
  return `${core}.${ms}000+03:00`;
}

/** "2025-01-01" - DateField isoformat (stored date rendered as-is). */
export function drfDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  const y = value.getUTCFullYear().toString().padStart(4, "0");
  const m = (value.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = value.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" (or full ISO) into a Date at UTC midnight; null when invalid. */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Today's date (Africa/Nairobi) as Date at UTC midnight - mirrors timezone.localdate(). */
export function todayDateOnly(): Date {
  const shifted = new Date(Date.now() + NAIROBI_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  );
}

/** Today's date as "YYYY-MM-DD". */
export function todayDateString(): string {
  return drfDate(todayDateOnly())!;
}
