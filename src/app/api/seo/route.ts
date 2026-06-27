import { type NextRequest, NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { loadSeoState, saveSeoState, loadIgnoredIds, saveIgnoredIds } from "@/lib/seo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await loadSeoState();
    const ignoredIds = await loadIgnoredIds();
    const ignoredSet = new Set(ignoredIds);

    if (state.recommendations) {
      state.recommendations = state.recommendations.map((r: any) => ({
        ...r,
        ignored: ignoredSet.has(r.post_id)
      }));
    }

    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load SEO state." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Extract and persist ignored post IDs separately
    const ignoredIds: number[] = (body.recommendations || [])
      .filter((r: any) => r.ignored)
      .map((r: any) => r.post_id);
    await saveIgnoredIds(ignoredIds);

    await saveSeoState(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save SEO state." },
      { status: 500 }
    );
  }
}
