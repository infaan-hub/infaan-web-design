import { NextRequest, NextResponse } from "next/server";
import { route } from "@/lib/route";
import { readBody } from "@/lib/http";
import { registerUser } from "@/lib/serializers/users";

export const { GET, POST, PUT, PATCH, DELETE } = route({
  POST: async (req: NextRequest) => {
    const body = await readBody(req);
    const data = await registerUser(body);
    return NextResponse.json(data, { status: 201 });
  },
});
