import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { resolveManagedService, buildControlResponse } from "@/lib/serializers/control";

// catalog.SubscriptionStatusView - AllowAny, POST only.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    POST: async (req: NextRequest) => {
      const body = expectObject(await readBody(req));
      const { service, error } = await resolveManagedService(body);
      if (error) throw error;
      return NextResponse.json(buildControlResponse(service), { status: 200 });
    },
  }
);
