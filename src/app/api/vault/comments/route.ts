import { type NextRequest, NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { addComment, deleteComment } from "@/lib/vault-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: Add a new comment to a file
export async function POST(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path: filePath, author, text } = body;

    if (!filePath || !author || !text) {
      return NextResponse.json(
        { error: "Missing path, author, or text parameter in request body." },
        { status: 400 }
      );
    }

    const comment = await addComment(filePath, author, text);
    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add comment." },
      { status: 500 }
    );
  }
}

// DELETE: Delete a comment from a file
export async function DELETE(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path: filePath, commentId } = body;

    if (!filePath || !commentId) {
      return NextResponse.json(
        { error: "Missing path or commentId parameter in request body." },
        { status: 400 }
      );
    }

    await deleteComment(filePath, commentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete comment." },
      { status: 500 }
    );
  }
}
