import { NextRequest } from "next/server";
import { invalidPage } from "./drf";

export const PAGE_SIZE = 20;

export type Paginated = {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
};

/**
 * DRF PageNumberPagination (PAGE_SIZE=20) with the standard
 * {count, next, previous, results} shape and absolute next/prev URLs.
 * Invalid page ("abc", "0", beyond last) -> 404 {"detail": "Invalid page."}.
 */
export function paginate(req: NextRequest, items: any[], pageParam?: string): Paginated {
  const count = items.length;
  let pageNum = 1;
  if (pageParam !== undefined) {
    if (!/^\d+$/.test(pageParam)) throw invalidPage();
    pageNum = Number(pageParam);
    if (pageNum < 1) throw invalidPage();
  }
  const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (pageNum > lastPage) throw invalidPage();

  const start = (pageNum - 1) * PAGE_SIZE;
  const url = new URL(req.url);
  const pageUrl = (p: number) => {
    const u = new URL(url.toString());
    u.searchParams.set("page", String(p));
    return u.toString();
  };

  return {
    count,
    next: pageNum < lastPage ? pageUrl(pageNum + 1) : null,
    previous: pageNum > 1 ? pageUrl(pageNum - 1) : null,
    results: items.slice(start, start + PAGE_SIZE),
  };
}
