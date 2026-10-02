import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { searchParam } from "@/lib/http";
import { serializeUser } from "@/lib/serializers/users";
import { listUsers, createAdminUserRecord } from "@/lib/serializers/admin-users";

// Users - IsAuthenticated + IsAdminUserRole, ordered by id.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      await requireAdmin(req);
      const users = await listUsers();
      const page = paginate(req, users.map(serializeUser), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      await requireAdmin(req);
      const body = await readBody(req);
      const data = await createAdminUserRecord(body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireAdmin }
);
