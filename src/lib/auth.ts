import { SignJWT, jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "darksenses_dashboard_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is missing from the environment.");
  }

  return new TextEncoder().encode(secret);
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}

export function isValidAdminLogin(username: string, password: string) {
  return (
    username === (process.env.ADMIN_USERNAME ?? "") &&
    password === (process.env.ADMIN_PASSWORD ?? "")
  );
}

export async function createAuthToken(username: string) {
  return new SignJWT({ username, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyAuthToken(token: string) {
  return jwtVerify(token, getSecretKey());
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TOKEN_TTL_SECONDS,
};
