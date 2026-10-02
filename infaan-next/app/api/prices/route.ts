import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject, searchParam } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { serializePrice, listPrices, createPrice } from "@/lib/serializers/catalog";

// Prices - admin-write/read.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      const user = await requireAdminOrReadOnly(req);
      const prices = await listPrices(isAdmin(user));
      const page = paginate(req, prices.map(serializePrice), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await createPrice(body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
