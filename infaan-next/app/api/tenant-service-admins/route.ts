import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject, searchParam } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import {
  serializeTenantServiceAdmin,
  listTenantServiceAdmins,
  createTenantServiceAdmin,
} from "@/lib/serializers/tenants";

// Tenant service admins - IsAuthenticated + IsAdminUserRole.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      await requireAdmin(req);
      const rows = await listTenantServiceAdmins();
      const page = paginate(req, rows.map(serializeTenantServiceAdmin), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      await requireAdmin(req);
      const body = expectObject(await readBody(req));
      const data = await createTenantServiceAdmin(body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireAdmin }
);
