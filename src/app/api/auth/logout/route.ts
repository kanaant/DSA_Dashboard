import { NextResponse } from "next/server";

import { authCookieOptions, getAuthCookieName } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const appUrl = new URL(getRequestOrigin(request));
  const response = NextResponse.redirect(new URL("/login", appUrl), {
    status: 303,
  });

  response.cookies.set(getAuthCookieName(), "", {
    ...authCookieOptions,
    maxAge: 0,
  });

  return response;
}
