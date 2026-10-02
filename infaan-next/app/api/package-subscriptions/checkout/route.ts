import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody, expectObject } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { runCheckout } from "@/lib/serializers/subscriptions";

// catalog.PackageSubscriptionCheckoutView - IsAuthenticated, POST only.
export const { GET, POST, PUT, PATCH, DELETE } = route(
  {
    POST: async (req: NextRequest) => {
      const user = await requireUser(req);
      const body = expectObject(await readBody(req));
      const data = await runCheckout(user, body, "package");
      return NextResponse.json(data, { status: 201 });
    },
  },
  { gate: requireUser }
);
