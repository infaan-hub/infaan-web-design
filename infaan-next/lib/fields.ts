import { z } from "zod";
import { ApiError } from "./errors";

/**
 * Translates Zod validation issues into API field error bodies:
 * {field: ["message"]} / {non_field_errors: ["message"]} with canonical wording.
 */
export function zodToApiError(error: z.ZodError, rawData?: unknown): ApiError {
  return new ApiError(400, zodToFields(error, rawData));
}

/** Field-error map for merging with manually collected errors. */
export function zodToFields(error: z.ZodError, rawData?: unknown): Record<string, unknown[]> {
  const fields: Record<string, unknown[]> = {};
  const nonField: string[] = [];

  for (const issue of error.issues) {
    const message = issueToApiMessage(issue, rawData);
    if (!issue.path.length) {
      nonField.push(message);
    } else {
      const key = String(issue.path[0]);
      (fields[key] ||= []).push(message);
    }
  }
  if (nonField.length) fields.non_field_errors = nonField;
  return fields;
}

function valueAtPath(data: unknown, path: PropertyKey[]): unknown {
  let current: any = data;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key as any];
  }
  return current;
}

function issueToApiMessage(issue: any, rawData?: unknown): string {
  const resolved = (): unknown =>
    issue.input !== undefined ? issue.input : valueAtPath(rawData, issue.path);
  switch (issue.code) {
    case "invalid_type": {
      const input = resolved();
      if (input === undefined) return "This field is required.";
      if (input === null) return "This field may not be null.";
      const expected = String(issue.expected || "string");
      if (expected === "int" || expected === "integer") return "A valid integer is required.";
      if (expected === "number") return "A valid number is required.";
      if (expected === "boolean") return "Must be a valid boolean.";
      if (expected === "date") return "Date has a recognized format.";
      if (expected === "datetime") return "Datetime has a recognized format.";
      if (expected === "string") return "Not a valid string.";
      return `Not a valid ${expected}.`;
    }
    case "too_small": {
      const origin = issue.origin || "string";
      const min = issue.minimum;
      if (origin === "string" && Number(min) === 1) return "This field may not be blank.";
      if (origin === "string") return `This field must have at least ${min} characters.`;
      return `Ensure this value is greater than or equal to ${min}.`;
    }
    case "too_big": {
      const origin = issue.origin || "string";
      const max = issue.maximum;
      if (origin === "string") return `Ensure this field has no more than ${max} characters.`;
      return `Ensure this value is less than or equal to ${max}.`;
    }
    case "invalid_format": {
      if (issue.format === "email") return "Enter a valid email address.";
      return "Datetime has a recognized format.";
    }
    case "invalid_value": {
      const value = resolved();
      if (value === undefined) return "This field is required.";
      if (value === null) return "This field may not be null.";
      // Choice messages render booleans as True/False.
      const shown =
        typeof value === "boolean" ? (value ? "True" : "False") : String(value);
      return `"${shown}" is not a valid choice.`;
    }
    default:
      return issue.message || "Invalid input.";
  }
}

/** Run a Zod schema and throw the API-shaped 400 error. */
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw zodToApiError(result.error, data);
  return result.data;
}

// ---------------------------------------------------------------------------
// Reusable field builders (trim + blank + length + email)
// ---------------------------------------------------------------------------

/** Required string: trims, rejects blank, enforces max_length/email. */
export function fieldString(opts: { maxLength?: number; blank?: boolean; email?: boolean } = {}) {
  let inner = z.string().trim();
  if (!opts.blank) inner = inner.min(1);
  if (opts.maxLength !== undefined) inner = inner.max(opts.maxLength);
  if (opts.email) inner = inner.email();
  // Coerce ints/floats to strings but reject bools/objects.
  return z.preprocess(
    (value) => (typeof value === "number" ? String(value) : value),
    inner
  ) as unknown as z.ZodType<string>;
}

/** Optional string (required=False): absent allowed; provided values still validated. */
export function fieldOptString(opts: { maxLength?: number; blank?: boolean; email?: boolean } = {}) {
  return fieldString(opts).optional();
}

// Absolute-URL validator (schemes http/https/ftp/ftps, domain or localhost or IPv4).
const ABSOLUTE_URL_RE =
  /^(?:https?|ftps?):\/\/(?:[^\s:@/]+(?::[^\s@/]*)?@)?(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*(?:\.(?:[a-z]{2,}|xn--[a-z0-9]{1,63}))|localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;

/**
 * URL field (max_length=200): trims, blank "" allowed (validators skip
 * empty values), otherwise must be a valid absolute URL.
 */
export function fieldUrl(opts: { optional?: boolean } = {}) {
  const schema = fieldString({ maxLength: 200, blank: true }).superRefine((value, ctx) => {
    if (value === "") return;
    if (!ABSOLUTE_URL_RE.test(value))
      ctx.addIssue({ code: "custom", message: "Enter a valid URL." });
  });
  return opts.optional ? schema.optional() : schema;
}

/**
 * Date field (iso-8601): accepts "YYYY-MM-DD" and
 * basics ("YYYYMMDD"); invalid -> "Date has wrong format. Use one of these
 * formats instead: YYYY-MM-DD."; outputs a UTC-midnight Date.
 */
const DATE_HYPHEN_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const DATE_BASIC_RE = /^(\d{4})(\d{2})(\d{2})$/;

export function parseIsoDate(value: string): Date | null {
  let y: number, m: number, d: number;
  const hyphen = DATE_HYPHEN_RE.exec(value);
  if (hyphen) {
    y = Number(hyphen[1]);
    m = Number(hyphen[2]);
    d = Number(hyphen[3]);
  } else {
    const basic = DATE_BASIC_RE.exec(value);
    if (!basic) return null;
    y = Number(basic[1]);
    m = Number(basic[2]);
    d = Number(basic[3]);
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
    return null; // e.g. 2026-13-01 -> invalid
  return date;
}

export function fieldDateOnly(opts: { optional?: boolean; nullable?: boolean } = {}) {
  const DATE_INVALID =
    "Date has wrong format. Use one of these formats instead: YYYY-MM-DD.";
  const core = z
    .unknown()
    .superRefine((value, ctx) => {
      if (value === undefined) {
        if (!opts.optional) ctx.addIssue({ code: "custom", message: "This field is required." });
        return;
      }
      if (value === null) {
        if (!opts.nullable) ctx.addIssue({ code: "custom", message: "This field may not be null." });
        return;
      }
      if (typeof value !== "string" || !parseIsoDate(value))
        ctx.addIssue({ code: "custom", message: DATE_INVALID });
    })
    .transform((value): Date | null | undefined => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      return parseIsoDate(value as string);
    });
  const schema = core as unknown as z.ZodType<Date | null | undefined>;
  return opts.optional ? schema.optional() : schema;
}

/**
 * Integer field semantics: numeric strings (integer parse,
 * ".0*" suffix stripped, fractions/bools rejected), min/max messages,
 * missing -> "This field is required." (unless optional).
 */
function fieldIntValue(value: unknown): number | null {
  if (typeof value === "boolean") return null; // str(True) -> invalid
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === "string") {
    const stripped = value.trim().replace(/\.0+$/, "");
    if (!/^[+-]?\d+$/.test(stripped)) return null;
    return Number(stripped);
  }
  return null;
}

export function fieldInt(opts: { min?: number; max?: number; optional?: boolean } = {}) {
  const core = z
    .unknown()
    .superRefine((value, ctx) => {
      if (value === undefined) {
        if (!opts.optional) ctx.addIssue({ code: "custom", message: "This field is required." });
        return;
      }
      if (value === null) {
        ctx.addIssue({ code: "custom", message: "This field may not be null." });
        return;
      }
      const n = fieldIntValue(value);
      if (n === null) {
        ctx.addIssue({ code: "custom", message: "A valid integer is required." });
        return;
      }
      if (opts.min !== undefined && n < opts.min)
        ctx.addIssue({
          code: "custom",
          message: `Ensure this value is greater than or equal to ${opts.min}.`,
        });
      if (opts.max !== undefined && n > opts.max)
        ctx.addIssue({
          code: "custom",
          message: `Ensure this value is less than or equal to ${opts.max}.`,
        });
    })
    .transform((value): number | null | undefined => {
      if (value === undefined || value === null) return value as any;
      return fieldIntValue(value)!;
    });
  const schema = core as unknown as z.ZodType<number | null | undefined>;
  return opts.optional ? schema.optional() : schema;
}

/** Optional integer with min_value semantics. */
export function fieldOptInt(opts: { min?: number; max?: number } = {}) {
  return fieldInt({ ...opts, optional: true });
}

/** Choice field: exact match, message `"x" is not a valid choice.` */
export function fieldChoice(choices: readonly string[]) {
  return z.enum(choices as unknown as [string, ...string[]]);
}

/**
 * Boolean field (bools, 0/1, and the string sets
 * t/y/yes/true/on/1 -> true; f/n/no/false/off/0 -> false).
 */
export function fieldBool(opts: { optional?: boolean } = {}) {
  const core = z.preprocess((value) => {
    if (typeof value === "string") {
      const v = value.toLowerCase();
      if (["true", "t", "yes", "y", "on", "1"].includes(v)) return true;
      if (["false", "f", "no", "n", "off", "0"].includes(v)) return false;
    }
    if (value === 1) return true;
    if (value === 0) return false;
    return value;
  }, z.boolean()) as unknown as z.ZodType<boolean>;
  return opts.optional ? (core as any).optional() : core;
}
