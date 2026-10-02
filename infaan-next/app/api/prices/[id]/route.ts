import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import {
  serializePrice,
  findPriceOr404,
  updatePrice,
  deletePrice,
} from "@/lib/serializers/catalog";

// catalog.PackagePriceViewSet detail - get_object before validation.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      const user = await requireAdminOrReadOnly(req);
      const price = await findPriceOr404(await pathId(ctx), isAdmin(user));
      return NextResponse.json(serializePrice(price), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await updatePrice(await pathId(ctx), body, false);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await updatePrice(await pathId(ctx), body, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      await deletePrice(await pathId(ctx));
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
