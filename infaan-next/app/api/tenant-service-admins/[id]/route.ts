import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import {
  serializeTenantServiceAdmin,
  findTenantServiceAdminOr404,
  updateTenantServiceAdmin,
  deleteTenantServiceAdmin,
} from "@/lib/serializers/tenants";

// catalog.TenantServiceAdminViewSet detail.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const row = await findTenantServiceAdminOr404(await pathId(ctx));
      return NextResponse.json(serializeTenantServiceAdmin(row), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await updateTenantServiceAdmin(await pathId(ctx), body, false);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await updateTenantServiceAdmin(await pathId(ctx), body, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      await deleteTenantServiceAdmin(await pathId(ctx));
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireAdmin }
);
