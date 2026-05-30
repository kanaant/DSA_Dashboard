import { type NextRequest, NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { readFileContent, writeFile, deleteEntry, renameEntry } from "@/lib/vault-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Read file content
export async function GET(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter." }, { status: 400 });
  }

  try {
    const file = await readFileContent(path);
    return NextResponse.json(file);
  } catch (error: any) {
    const isAccessDenied = error.message && error.message.includes("ACCESS_DENIED");
    return NextResponse.json(
      { error: error.message || "Failed to read file." },
      { status: isAccessDenied ? 403 : 500 }
    );
  }
}

// PUT: Create or update file
export async function PUT(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path: filePath, content, createdByAgent } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: "Missing path or content in request body." },
        { status: 400 }
      );
    }

    await writeFile(filePath, content, !!createdByAgent);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const isAccessDenied = error.message && error.message.includes("ACCESS_DENIED");
    return NextResponse.json(
      { error: error.message || "Failed to write file." },
      { status: isAccessDenied ? 403 : 500 }
    );
  }
}

// DELETE: Delete file or folder
export async function DELETE(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter." }, { status: 400 });
  }

  try {
    await deleteEntry(path);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const isAccessDenied = error.message && error.message.includes("ACCESS_DENIED");
    return NextResponse.json(
      { error: error.message || "Failed to delete item." },
      { status: isAccessDenied ? 403 : 500 }
    );
  }
}

// PATCH: Rename or move file/folder
export async function PATCH(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { oldPath, newPath } = body;

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "Missing oldPath or newPath in request body." },
        { status: 400 }
      );
    }

    await renameEntry(oldPath, newPath);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const isAccessDenied = error.message && error.message.includes("ACCESS_DENIED");
    return NextResponse.json(
      { error: error.message || "Failed to rename/move item." },
      { status: isAccessDenied ? 403 : 500 }
    );
  }
}
