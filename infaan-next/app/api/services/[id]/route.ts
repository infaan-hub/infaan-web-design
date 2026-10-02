import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import {
  serializeService,
  findServiceOr404,
  updateService,
  deleteService,
} from "@/lib/serializers/catalog";

// catalog.ServiceViewSet detail - get_object before serializer validation.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      const user = await requireAdminOrReadOnly(req);
      const service = await findServiceOr404(await pathId(ctx), isAdmin(user));
      return NextResponse.json(serializeService(service), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await updateService(await pathId(ctx), body, false);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await updateService(await pathId(ctx), body, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      await deleteService(await pathId(ctx));
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
