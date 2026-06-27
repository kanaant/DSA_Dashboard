import { type NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { saveSeoStatus, VAULT_SEO_DIR } from "@/lib/seo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function runPipeline(action: "all" | "sync" | "optimize" = "all") {
  const env = {
    ...process.env,
    MAQUIFIT_MCP_URL: process.env.WP_API_URL,
    MAQUIFIT_MCP_USER: process.env.WP_API_USERNAME,
    MAQUIFIT_MCP_PASS: process.env.WP_API_PASSWORD,
    MAQUIFIT_INVENTORY_EXPORT_SCRIPT: "/home/dscalez/DSA_Dashboard/scripts/export_inventory.py",
  };

  const pythonBin = "/home/dscalez/maquifit-rankmath-workflow/.venv/bin/python";
  const scriptPath = "/home/dscalez/maquifit-rankmath-workflow/scripts/run_workflow.py";
  const agentScript = ["", "home", "dscalez", "DSA_Dashboard", "scripts", "agent-seo-optimize.js"].join("/");

  if (action === "optimize") {
    console.log("[Pipeline] Starting Hermes Agent SEO optimization...");
    saveSeoStatus({
      status: "running",
      step: "Hermes Agent: Researching trending keywords & optimizing SEO metadata...",
      progress: 20
    });

    const agentProcess = spawn("node", [agentScript], { env });

    let agentError = "";
    agentProcess.stderr.on("data", (data) => {
      agentError += data.toString();
    });

    agentProcess.on("close", async (agentCode) => {
      if (agentCode !== 0) {
        console.error(`[Pipeline] Hermes agent failed with code ${agentCode}. Error: ${agentError}`);
        await saveSeoStatus({
          status: "failed",
          step: `Hermes optimization failed: ${agentError.slice(0, 150)}`,
          progress: 100,
          error: agentError
        });
        return;
      }

      console.log("[Pipeline] Optimization completed successfully!");
    });
    return;
  }

  console.log("[Pipeline] Starting pull workflow from live WordPress site...");
  
  // Run Python workflow
  const pythonProcess = spawn(
    pythonBin,
    [scriptPath, "--data-dir", VAULT_SEO_DIR, "--skip-rankmath"],
    { env }
  );

  let errorOutput = "";
  pythonProcess.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  pythonProcess.on("close", async (code) => {
    if (code !== 0) {
      console.error(`[Pipeline] Python process failed with code ${code}. Error: ${errorOutput}`);
      await saveSeoStatus({
        status: "failed",
        step: `Failed to pull live WordPress data: ${errorOutput.slice(0, 150)}`,
        progress: 100,
        error: errorOutput
      });
      return;
    }

    if (action === "sync") {
      console.log("[Pipeline] Live WordPress pull completed successfully.");
      await saveSeoStatus({
        status: "idle",
        step: "WordPress sync completed successfully.",
        progress: 100,
        lastRun: new Date().toISOString()
      });
      return;
    }

    console.log("[Pipeline] Live WordPress pull completed. Starting Hermes Agent SEO optimization...");
    
    // Run Hermes agent optimizer
    await saveSeoStatus({
      status: "running",
      step: "Hermes Agent: Researching trending keywords & optimizing SEO metadata...",
      progress: 60
    });

    const agentProcess = spawn("node", [agentScript], { env });

    let agentError = "";
    agentProcess.stderr.on("data", (data) => {
      agentError += data.toString();
    });

    agentProcess.on("close", async (agentCode) => {
      if (agentCode !== 0) {
        console.error(`[Pipeline] Hermes agent failed with code ${agentCode}. Error: ${agentError}`);
        await saveSeoStatus({
          status: "failed",
          step: `Hermes optimization failed: ${agentError.slice(0, 150)}`,
          progress: 100,
          error: agentError
        });
        return;
      }

      console.log("[Pipeline] Pipeline completed successfully!");
    });
  });
}

export async function POST(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "all";

    await saveSeoStatus({
      status: "running",
      step: action === "optimize" 
        ? "Hermes Agent: Initializing keyword research..." 
        : "Initializing connections and starting WordPress sync...",
      progress: 10
    });

    // Run the pipeline asynchronously in background
    runPipeline(action);

    return NextResponse.json({ success: true, message: `SEO ${action} pipeline triggered.` });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to trigger SEO refresh." },
      { status: 500 }
    );
  }
}
