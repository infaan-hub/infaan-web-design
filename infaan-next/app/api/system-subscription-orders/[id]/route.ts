import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { requireUser, requireAdmin } from "@/lib/auth";
import {
  serializeSystemOrder,
  findOrderOr404,
  updateOrder,
  deleteOrder,
} from "@/lib/serializers/subscriptions";

// catalog.SystemSubscriptionOrderViewSet detail - writes require admin.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      const user = await requireUser(req);
      const row = await findOrderOr404("system", await pathId(ctx), user);
      return NextResponse.json(serializeSystemOrder(row), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      const admin = await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await updateOrder("system", await pathId(ctx), admin, body, false);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      const admin = await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await updateOrder("system", await pathId(ctx), admin, body, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      const admin = await requireAdmin(req);
      await deleteOrder("system", await pathId(ctx), admin);
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireUser }
);
