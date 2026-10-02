import { z } from "zod";

/**
 * DRF DecimalField parity (rest_framework/fields.py: to_internal_value +
 * validate_precision). Messages and check order: max_digits (total) ->
 * max_decimal_places -> max_whole_digits.
 */

export type DecimalOptions = {
  maxDigits: number;
  decimalPlaces: number;
};

export type DecimalStats = {
  total: number;
  decimalPlaces: number;
  wholeDigits: number;
};

/**
 * digit stats exactly like DRF validate_precision() over
 * decimal.Decimal(raw).as_tuple(): sign is ignored, leading zeros are
 * stripped (all-zero coefficients collapse to a single 0), underscores are
 * accepted by Python's Decimal constructor. Returns null when the string is
 * not a finite decimal number.
 */
export function decimalStats(raw: string): DecimalStats | null {
  const normalized = raw.trim().replace(/_/g, "");
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(normalized);
  if (!m) return null;
  const [, , intPart0, fracPart0, expPart] = m;
  const intPart = intPart0 || "";
  const fracPart = fracPart0 || "";
  if (!intPart && !fracPart) return null;

  const exponent = (expPart ? parseInt(expPart, 10) : 0) - fracPart.length;
  const all = intPart + fracPart;
  const firstNonZero = all.search(/[1-9]/);
  const coeffLen = firstNonZero === -1 ? (all ? 1 : 0) : all.length - firstNonZero;
  if (coeffLen === 0) return null;

  if (exponent >= 0) {
    const total = coeffLen + exponent;
    return { total, decimalPlaces: 0, wholeDigits: total };
  }
  const abs = Math.abs(exponent);
  if (coeffLen > abs) {
    return { total: coeffLen, decimalPlaces: abs, wholeDigits: coeffLen - abs };
  }
  return { total: abs, decimalPlaces: abs, wholeDigits: 0 };
}

/** Validate a plain-decimal string; returns the DRF error message or null. */
export function decimalErrorMessage(raw: string, opts: DecimalOptions): string | null {
  const trimmed = raw.trim();
  if (trimmed.length > 1000) return "String value too large.";
  const stats = decimalStats(trimmed);
  if (!stats) return "A valid number is required.";
  if (stats.total > opts.maxDigits)
    return `Ensure that there are no more than ${opts.maxDigits} digits in total.`;
  if (stats.decimalPlaces > opts.decimalPlaces)
    return `Ensure that there are no more than ${opts.decimalPlaces} decimal places.`;
  const maxWhole = opts.maxDigits - opts.decimalPlaces;
  if (stats.wholeDigits > maxWhole)
    return `Ensure that there are no more than ${maxWhole} digits before the decimal point.`;
  return null;
}

/**
 * Decimal field with DRF semantics: missing -> "This field is required.",
 * null -> "This field may not be null." (unless nullable), blank/non-numeric
 * -> "A valid number is required.", then precision messages. Output: string
 * (null when nullable and blank/null).
 */
export function drfDecimal(
  opts: DecimalOptions & { optional?: boolean; nullable?: boolean }
) {
  const core = z
    .unknown()
    .superRefine((value, ctx) => {
      if (value === undefined) {
        ctx.addIssue({ code: "custom", message: "This field is required." });
        return;
      }
      if (value === null) {
        if (!opts.nullable)
          ctx.addIssue({ code: "custom", message: "This field may not be null." });
        return;
      }
      if (opts.nullable && typeof value === "string" && value.trim() === "") return;
      if (typeof value !== "string" && typeof value !== "number") {
        ctx.addIssue({ code: "custom", message: "A valid number is required." });
        return;
      }
      const raw = typeof value === "number" ? String(value) : value;
      const message = decimalErrorMessage(raw, opts);
      if (message) ctx.addIssue({ code: "custom", message });
    })
    .transform((value): string | null => {
      if (opts.nullable && (value === null || (typeof value === "string" && value.trim() === "")))
        return null;
      const out = typeof value === "number" ? String(value) : (value as string);
      return out.trim();
    });
  const schema = core as unknown as z.ZodType<string | null>;
  return opts.optional ? schema.optional() : schema;
}

/** Required nullable decimal (allow_null=True): blank "" and null -> null. */
export function drfOptDecimal(opts: DecimalOptions) {
  return drfDecimal({ ...opts, nullable: true });
}

/**
 * Serialize a decimal for output: always exactly `places` fraction digits.
 * DRF to_representation quantizes to decimal_places, and str(Decimal) of any
 * DRF-written value already has scale N (input was quantized on write).
 */
export function decimalOut(
  value: string | number | null | undefined,
  places = 2
): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (raw === "") return null;
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPart = "0", fracPart = ""] = unsigned.split(".");
  const frac = fracPart.padEnd(places, "0").slice(0, places);
  const body = places > 0 ? `${intPart}.${frac}` : intPart;
  return negative ? `-${body}` : body;
}
