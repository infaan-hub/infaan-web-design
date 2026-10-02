import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { requireUser, requireAdmin } from "@/lib/auth";
import {
  serializeSubscription,
  findSubscriptionOr404,
  updateSubscription,
  deleteSubscription,
} from "@/lib/serializers/subscriptions";

// catalog.SubscriptionViewSet detail - update/partial_update/destroy require admin.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      const user = await requireUser(req);
      const sub = await findSubscriptionOr404(await pathId(ctx), user);
      return NextResponse.json(serializeSubscription(sub), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      const admin = await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await updateSubscription(await pathId(ctx), admin, body, false);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      const admin = await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await updateSubscription(await pathId(ctx), admin, body, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      const admin = await requireAdmin(req);
      await deleteSubscription(await pathId(ctx), admin);
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireUser }
);
