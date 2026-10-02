import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { requireAdmin } from "@/lib/auth";
import { serializeTenant, findTenantOr404 } from "@/lib/serializers/tenants";

// catalog.TenantViewSet detail (ReadOnly).
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const tenant = await findTenantOr404(await pathId(ctx));
      return NextResponse.json(serializeTenant(tenant), { status: 200 });
    },
  },
  { gate: requireAdmin }
);
