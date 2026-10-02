import { NextRequest } from "next/server";
import { DrfError, badRequest } from "./drf";

/** DRF JSONParser: malformed body -> 400 {"detail": "JSON parse error - ..."}. */
export async function readBody(req: NextRequest): Promise<any> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err: any) {
    throw new DrfError(400, { detail: `JSON parse error - ${err?.message || "invalid JSON"}` });
  }
}

/** First value of a query param (undefined when absent). */
export function searchParam(req: NextRequest, key: string): string | undefined {
  return req.nextUrl.searchParams.get(key) ?? undefined;
}

/** Ensure body is a JSON object; DRF treats lists/scalars for object serializers as parse errors. */
export function expectObject(body: any): Record<string, any> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest({ detail: "JSON parse error - expected object" });
  }
  return body;
}
