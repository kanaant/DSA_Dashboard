import { NextResponse } from "next/server";

import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { getInstalledServices } from "@/lib/dashboard-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    services: await getInstalledServices(),
    source: "dashboard-service-registry",
    refreshedAt: new Date().toISOString(),
  });
}
