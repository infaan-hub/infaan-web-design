import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject, searchParam } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { serializeService, listServices, createService } from "@/lib/serializers/catalog";

// catalog.ServiceViewSet - IsAdminOrReadOnly, ordered by name.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      const user = await requireAdminOrReadOnly(req);
      const services = await listServices(isAdmin(user));
      const page = paginate(req, services.map(serializeService), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await createService(body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
