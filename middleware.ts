import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { getRequestOrigin } from "@/lib/request-origin";

const AUTH_COOKIE_NAME = "darksenses_dashboard_session";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is missing from the environment.");
  }

  return new TextEncoder().encode(secret);
}

async function isAuthenticated(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await isAuthenticated(request);
  const origin = getRequestOrigin(request);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(authed ? "/dashboard" : "/login", origin));
  }

  if (pathname.startsWith("/dashboard") && !authed) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (pathname === "/login" && authed) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};
