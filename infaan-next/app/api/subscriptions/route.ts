import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject, searchParam } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { serializeSubscription, listSubscriptions, createSubscription } from "@/lib/serializers/subscriptions";

// catalog.SubscriptionViewSet - IsAuthenticated (any user; admin sees all).
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      const user = await requireUser(req);
      const subs = await listSubscriptions(user);
      const page = paginate(req, subs.map(serializeSubscription), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      const user = await requireUser(req);
      const body = expectObject(await readBody(req));
      const data = await createSubscription(user, body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireUser }
);
