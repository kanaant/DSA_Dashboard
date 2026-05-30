import { type NextRequest, NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { getDirectoryTree } from "@/lib/vault-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const project = searchParams.get("project");
  const path = searchParams.get("path") || "";

  if (!project) {
    return NextResponse.json(
      { error: "Missing project query parameter." },
      { status: 400 }
    );
  }

  try {
    const tree = await getDirectoryTree(project, path);
    return NextResponse.json({ tree });
  } catch (error: any) {
    const isAccessDenied = error.message && error.message.includes("ACCESS_DENIED");
    return NextResponse.json(
      { error: error.message || "Failed to retrieve directory tree." },
      { status: isAccessDenied ? 403 : 500 }
    );
  }
}
