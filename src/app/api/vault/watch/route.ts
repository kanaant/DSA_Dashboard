import { type NextRequest } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { safeResolvePath } from "@/lib/vault-data";
import chokidar from "chokidar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const project = searchParams.get("project");

  if (!project) {
    return new Response("Missing project parameter", { status: 400 });
  }

  let projectPath: string;
  try {
    projectPath = safeResolvePath(project);
  } catch (error: any) {
    return new Response(error.message || "Invalid path", { status: 403 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Create chokidar watcher
      const watcher = chokidar.watch(projectPath, {
        ignored: [/(^|[\/\\])\../, "**/.*"], // Ignore dotfiles and hidden folders (including .vault-meta.json)
        persistent: true,
        ignoreInitial: true,
      });

      const sendEvent = (event: string, itemPath: string) => {
        // Compute path relative to project folder
        const relative = itemPath.replace(projectPath, "").replace(/^[/\\]+/, "");
        const payload = JSON.stringify({ event, path: relative });
        
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (e) {
          // Controller might be closed
          watcher.close();
        }
      };

      watcher
        .on("add", (p) => sendEvent("add", p))
        .on("change", (p) => sendEvent("change", p))
        .on("unlink", (p) => sendEvent("unlink", p))
        .on("addDir", (p) => sendEvent("addDir", p))
        .on("unlinkDir", (p) => sendEvent("unlinkDir", p));

      // Keepalive heartbeat every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          watcher.close();
        }
      }, 15000);

      // Handle stream cancel (client disconnect)
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        watcher.close();
      });
    },
    cancel() {
      // Handled by request abort
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
