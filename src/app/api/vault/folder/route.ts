import { type NextRequest, NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { createDirectory } from "@/lib/vault-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path } = body;

    if (!path) {
      return NextResponse.json(
        { error: "Missing path in request body." },
        { status: 400 }
      );
    }

    await createDirectory(path);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const isAccessDenied = error.message && error.message.includes("ACCESS_DENIED");
    return NextResponse.json(
      { error: error.message || "Failed to create directory." },
      { status: isAccessDenied ? 403 : 500 }
    );
  }
}
