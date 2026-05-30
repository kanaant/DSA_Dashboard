import { NextResponse } from "next/server";

import { authCookieOptions, getAuthCookieName } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
  const response = NextResponse.redirect(new URL("/login", appUrl), {
    status: 303,
  });

  response.cookies.set(getAuthCookieName(), "", {
    ...authCookieOptions,
    maxAge: 0,
  });

  return response;
}
