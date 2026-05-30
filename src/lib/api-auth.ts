import { cookies } from "next/headers";

import { getAuthCookieName, verifyAuthToken } from "@/lib/auth";

export async function isApiRequestAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;

  if (!token) {
    return false;
  }

  try {
    await verifyAuthToken(token);
    return true;
  } catch {
    return false;
  }
}
