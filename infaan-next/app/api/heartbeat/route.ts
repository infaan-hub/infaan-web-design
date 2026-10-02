import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { resolveManagedService, heartbeat } from "@/lib/serializers/control";

// catalog.HeartbeatView - AllowAny, POST only.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    POST: async (req: NextRequest) => {
      const body = expectObject(await readBody(req));
      const { service, error } = await resolveManagedService(body);
      if (error) throw error;
      const data = await heartbeat(service);
      return NextResponse.json(data, { status: 200 });
    },
  }
);
