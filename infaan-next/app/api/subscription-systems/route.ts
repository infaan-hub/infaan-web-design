import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject, searchParam } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { serializeSystem, listSystems, createSystem } from "@/lib/serializers/systems";

// catalog.SubscriptionSystemViewSet - IsAdminOrReadOnly.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      const user = await requireAdminOrReadOnly(req);
      const systems = await listSystems(isAdmin(user));
      const page = paginate(req, systems.map(serializeSystem), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await createSystem(body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
