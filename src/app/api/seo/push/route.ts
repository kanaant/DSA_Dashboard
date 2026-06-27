import { type NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { VAULT_SEO_DIR } from "@/lib/seo-data";
import path from "path";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = {
    ...process.env,
    MAQUIFIT_MCP_URL: process.env.WP_API_URL,
    MAQUIFIT_MCP_USER: process.env.WP_API_USERNAME,
    MAQUIFIT_MCP_PASS: process.env.WP_API_PASSWORD,
  };

  const pythonBin = "/home/dscalez/maquifit-rankmath-workflow/.venv/bin/python";
  const pushScript = "/home/dscalez/maquifit-rankmath-workflow/scripts/push_updates.py";
  const statePath = path.join(VAULT_SEO_DIR, "workflow_state.json");
  const inventoryPath = path.join(VAULT_SEO_DIR, "inventory.json");

  try {
    const { stdout } = await execFileAsync(
      pythonBin,
      [pushScript, "--state", statePath, "--inventory", inventoryPath],
      { env }
    );
    const result = JSON.parse(stdout);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Failed to push updates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to push updates." },
      { status: 500 }
    );
  }
}
