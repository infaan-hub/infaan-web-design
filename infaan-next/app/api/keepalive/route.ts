import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { keepaliveResponse } from "@/lib/serializers/control";

// catalog.KeepAliveView - AllowAny, GET only.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    GET: async (_req: NextRequest) => {
      return NextResponse.json(keepaliveResponse(), { status: 200 });
    },
  }
);
