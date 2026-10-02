import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import {
  serializeSystem,
  findSystemOr404,
  updateSystem,
  deleteSystem,
} from "@/lib/serializers/systems";

// catalog.SubscriptionSystemViewSet detail.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      const user = await requireAdminOrReadOnly(req);
      const system = await findSystemOr404(await pathId(ctx), isAdmin(user));
      return NextResponse.json(serializeSystem(system), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await updateSystem(await pathId(ctx), body, false);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await updateSystem(await pathId(ctx), body, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      await deleteSystem(await pathId(ctx));
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
