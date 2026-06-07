import { NextResponse } from "next/server";

import {
  authCookieOptions,
  createAuthToken,
  getAuthCookieName,
  isValidAdminLogin,
} from "@/lib/auth";
import { getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const appUrl = new URL(getRequestOrigin(request));

  if (!isValidAdminLogin(username, password)) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_credentials", appUrl),
      { status: 303 }
    );
  }

  const token = await createAuthToken(username);
  const response = NextResponse.redirect(new URL("/dashboard", appUrl), {
    status: 303,
  });

  response.cookies.set(getAuthCookieName(), token, authCookieOptions);
  return response;
}
