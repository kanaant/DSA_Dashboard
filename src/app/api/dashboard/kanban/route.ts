import { NextResponse, type NextRequest } from "next/server";

import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { getKanbanItems, updateKanbanItem, type KanbanAction } from "@/lib/dashboard-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actions: KanbanAction[] = ["start", "block", "complete", "unblock", "archive"];

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unexpected Kanban error";
}

export async function GET() {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getKanbanItems();

    return NextResponse.json({
      items,
      sync: {
        mode: "hermes-kanban",
        writable: true,
        upstream: "Hermes Kanban CLI / DB",
      },
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: errorMessage(error),
        sync: {
          mode: "hermes-kanban",
          writable: false,
          upstream: "Hermes Kanban CLI / DB",
        },
      },
      { status: 503 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const action = typeof body?.action === "string" ? body.action.trim() : "";

  if (!id || !actions.includes(action as KanbanAction)) {
    return NextResponse.json(
      {
        error: "Invalid Kanban update",
        allowedActions: actions,
      },
      { status: 400 }
    );
  }

  try {
    const item = await updateKanbanItem(id, action as KanbanAction);

    return NextResponse.json({
      item,
      refreshedAt: new Date().toISOString(),
      action,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: errorMessage(error),
        action,
      },
      { status: 409 }
    );
  }
}
