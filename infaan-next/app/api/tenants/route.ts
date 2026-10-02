import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { searchParam } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { serializeTenant, listTenants } from "@/lib/serializers/tenants";

// Tenants (read-only) - IsAuthenticated + IsAdminUserRole.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      await requireAdmin(req);
      const tenants = await listTenants();
      const page = paginate(req, tenants.map(serializeTenant), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
  },
  { gate: requireAdmin }
);
