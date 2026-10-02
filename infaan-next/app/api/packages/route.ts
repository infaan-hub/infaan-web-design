import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject, searchParam } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import { paginate } from "@/lib/pagination";
import { serializePackage, listPackages, createPackage } from "@/lib/serializers/packages";

// Packages - admin-write/read, ordered by service name + tier.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      const user = await requireAdminOrReadOnly(req);
      const packages = await listPackages(isAdmin(user), false);
      const page = paginate(req, packages.map(serializePackage), searchParam(req, "page"));
      return NextResponse.json(page, { status: 200 });
    },
    POST: async (req: NextRequest) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await createPackage(body);
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
