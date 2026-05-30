import { type NextRequest, NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { markFileAsRead } from "@/lib/vault-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path: filePath } = body;

    if (!filePath) {
      return NextResponse.json({ error: "Missing path parameter." }, { status: 400 });
    }

    await markFileAsRead(filePath);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to mark file as read." },
      { status: 500 }
    );
  }
}
