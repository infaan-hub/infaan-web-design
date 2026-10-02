import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject, searchParam } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { serializeSystemOrder, listOrders, createOrder } from "@/lib/serializers/subscriptions";

// System subscription orders - IsAuthenticated.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      const user = await requireUser(req);
      const rows = await listOrders("system", user);
      const page = paginate(req, rows.map(serializeSystemOrder), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      const user = await requireUser(req);
      const body = expectObject(await readBody(req));
      const data = await createOrder("system", user, body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireUser }
);
