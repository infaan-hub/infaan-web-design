import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import {
  serializeTenantService,
  findTenantServiceOr404,
  updateTenantService,
  deleteTenantService,
} from "@/lib/serializers/tenants";

// catalog.TenantServiceViewSet detail - perform_update sets connected_at.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const ts = await findTenantServiceOr404(await pathId(ctx));
      return NextResponse.json(serializeTenantService(ts), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await updateTenantService(await pathId(ctx), body, false);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await updateTenantService(await pathId(ctx), body, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      await deleteTenantService(await pathId(ctx));
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireAdmin }
);
