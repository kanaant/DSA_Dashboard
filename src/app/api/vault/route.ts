import { NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { getProjects } from "@/lib/vault-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await getProjects();
    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch projects." },
      { status: 500 }
    );
  }
}
