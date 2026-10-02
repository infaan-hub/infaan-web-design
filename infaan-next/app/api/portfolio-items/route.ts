import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject, searchParam } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { serializePortfolioItem, listPortfolioItems, createPortfolioItem } from "@/lib/serializers/catalog";

// Portfolio items - admin-write/read, ordered by name.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      const user = await requireAdminOrReadOnly(req);
      const items = await listPortfolioItems(isAdmin(user));
      const page = paginate(req, items.map(serializePortfolioItem), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await createPortfolioItem(body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
