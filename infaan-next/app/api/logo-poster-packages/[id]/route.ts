import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { isAdmin, requireAdminOrReadOnly } from "@/lib/auth";
import {
  serializePackage,
  findPackageOr404,
  updatePackage,
  deletePackage,
} from "@/lib/serializers/packages";

// catalog.LogoPosterPackageViewSet detail - always logo_poster packages.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      const user = await requireAdminOrReadOnly(req);
      const pkg = await findPackageOr404(await pathId(ctx), isAdmin(user), true);
      return NextResponse.json(serializePackage(pkg), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await updatePackage(await pathId(ctx), body, false, true);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdminOrReadOnly(req);
      const body = expectObject(await readBody(req));
      const data = await updatePackage(await pathId(ctx), body, true, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      const user = await requireAdminOrReadOnly(req);
      await deletePackage(await pathId(ctx), isAdmin(user), true);
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireAdminOrReadOnly }
);
