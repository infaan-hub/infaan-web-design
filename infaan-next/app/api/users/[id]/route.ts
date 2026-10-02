import { NextRequest, NextResponse } from "next/server";
import { route, RouteContext, pathId } from "@/lib/route";
import { readBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import {
  findUserOr404,
  updateAdminUserRecord,
  deleteUserRecord,
  serializeAdminUserRecord,
} from "@/lib/serializers/admin-users";

export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const user = await findUserOr404(await pathId(ctx));
      const { serializeUser } = await import("@/lib/serializers/users");
      return NextResponse.json(serializeUser(user), { status: 200 });
    },
    PUT: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const body = await readBody(req);
      const data = await updateAdminUserRecord(await pathId(ctx), body, false);
      return NextResponse.json(data, { status: 200 });
    },
    PATCH: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      const body = await readBody(req);
      const data = await updateAdminUserRecord(await pathId(ctx), body, true);
      return NextResponse.json(data, { status: 200 });
    },
    DELETE: async (req: NextRequest, ctx?: RouteContext) => {
      await requireAdmin(req);
      await deleteUserRecord(await pathId(ctx));
      return new NextResponse(null, { status: 204 });
    },
  },
  { gate: requireAdmin }
);
