import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { requireUser } from "@/lib/auth";
import { serializeUser } from "@/lib/serializers/users";

export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (req: NextRequest) => {
      const user = await requireUser(req);
      const full = await import("@/lib/prisma").then((m) =>
        m.prisma.user.findUnique({ where: { id: user.id } })
      );
      return NextResponse.json(serializeUser(full), { status: 200 });
    },
  },
  { gate: requireUser }
);
