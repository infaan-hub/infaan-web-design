import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody } from "@/lib/http";
import { DrfError } from "@/lib/drf";
import { verifyToken, signAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

// rest_framework_simplejwt TokenRefreshView: {refresh} -> {access}
export const { GET, POST, PUT, PATCH, DELETE } = route({
  POST: async (req: NextRequest) => {
    const body = await readBody(req);
    if (body?.refresh === undefined || body?.refresh === "") {
      throw new DrfError(400, { refresh: ["This field is required."] });
    }
    if (typeof body.refresh !== "string") {
      throw new DrfError(400, { refresh: ["Not a valid string."] });
    }
    const payload = await verifyToken(body.refresh, "refresh");
    const user = await prisma.user.findUnique({ where: { id: payload.user_id } });
    if (!user) throw new DrfError(401, { detail: "User not found" });
    if (!user.isActive) throw new DrfError(401, { detail: "User is inactive" });
    const access = await signAccessToken(user.id);
    return NextResponse.json({ access }, { status: 200 });
  },
});
