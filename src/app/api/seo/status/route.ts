import { NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { loadSeoStatus } from "@/lib/seo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await loadSeoStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load SEO status." },
      { status: 500 }
    );
  }
}
