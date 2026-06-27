import { type NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import { VAULT_SEO_DIR } from "@/lib/seo-data";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// SSH + WP-CLI push
// The MCP adapter's rank-math/update-post-seo-meta ability hangs on the live
// server, so we fall back to proven SSH + `wp post meta update` commands.
// ---------------------------------------------------------------------------

const SSH_HOST = process.env.MAQUIFIT_SSH_HOST!;
const SSH_PORT = process.env.MAQUIFIT_SSH_PORT || "22";
const SSH_USER = process.env.MAQUIFIT_SSH_USER!;
const SSH_PASS = process.env.MAQUIFIT_SSH_PASS!;
const SITE_PATH = "/home/saveurde/maquifit.ca";

function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

async function sshUpdateMeta(
  postId: number,
  metaUpdates: Record<string, string>
): Promise<{ ok: boolean; output: string; error?: string }> {
  // Build a chain of `wp post meta update` commands
  const commands = Object.entries(metaUpdates)
    .map(([key, value]) => `wp post meta update ${postId} ${key} ${shellEscape(value)}`)
    .join(" && ");

  const remoteCmd = `cd ${SITE_PATH} && ${commands}`;

  const sshArgs = [
    "-p", SSH_PASS,
    "ssh",
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ConnectTimeout=15",
    "-p", SSH_PORT,
    `${SSH_USER}@${SSH_HOST}`,
    remoteCmd,
  ];

  try {
    const { stdout, stderr } = await execFileAsync("sshpass", sshArgs, {
      timeout: 30_000,
    });
    const success = stdout.includes("Success") || stdout.includes("Updated");
    return { ok: success, output: stdout.trim(), error: stderr.trim() || undefined };
  } catch (err: any) {
    return {
      ok: false,
      output: err.stdout?.trim() || "",
      error: err.stderr?.trim() || err.message,
    };
  }
}

export async function POST(request: NextRequest) {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SSH_HOST || !SSH_USER || !SSH_PASS) {
    return NextResponse.json(
      { error: "SSH credentials are not configured. Cannot push updates." },
      { status: 500 }
    );
  }

  const statePath = path.join(VAULT_SEO_DIR, "workflow_state.json");
  const inventoryPath = path.join(VAULT_SEO_DIR, "inventory.json");

  try {
    // 1. Read workflow state and find approved recommendations
    const stateContent = await fs.readFile(statePath, "utf-8");
    const state = JSON.parse(stateContent);
    const recs: any[] = state?.recommendations || [];
    const approved = recs.filter((r) => r.approved);

    if (approved.length === 0) {
      return NextResponse.json(
        { error: "No approved recommendations to push." },
        { status: 400 }
      );
    }

    // 2. Push each approved recommendation via SSH
    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const rec of approved) {
      const metaUpdates: Record<string, string> = {};

      if (rec.proposed.rank_math_title && rec.proposed.rank_math_title !== rec.current.rank_math_title) {
        metaUpdates.rank_math_title = rec.proposed.rank_math_title;
      }
      if (rec.proposed.rank_math_description && rec.proposed.rank_math_description !== rec.current.rank_math_description) {
        metaUpdates.rank_math_description = rec.proposed.rank_math_description;
      }
      if (rec.proposed.rank_math_focus_keyword && rec.proposed.rank_math_focus_keyword !== rec.current.rank_math_focus_keyword) {
        metaUpdates.rank_math_focus_keyword = rec.proposed.rank_math_focus_keyword;
      }

      if (Object.keys(metaUpdates).length === 0) {
        // Nothing actually changed — skip but still count as success
        results.push({ post_id: rec.post_id, status: "skipped", reason: "no changes" });
        successCount++;
        continue;
      }

      console.log(`[Push] Updating post ${rec.post_id} (${rec.title}): ${Object.keys(metaUpdates).join(", ")}`);
      const result = await sshUpdateMeta(rec.post_id, metaUpdates);
      results.push({ post_id: rec.post_id, ...result });

      if (result.ok) {
        successCount++;
      } else {
        failCount++;
        console.error(`[Push] Failed for post ${rec.post_id}: ${result.error}`);
      }
    }

    // 3. Update local state to reflect successful pushes
    const approvedIds = new Set<number>();

    state.recommendations = state.recommendations.map((rec: any) => {
      if (rec.approved) {
        const pushResult = results.find((r) => r.post_id === rec.post_id);
        if (pushResult?.ok || pushResult?.status === "skipped") {
          approvedIds.add(Number(rec.post_id));
          // Promote proposed → current
          rec.current = {
            ...rec.current,
            rank_math_title: rec.proposed.rank_math_title,
            rank_math_description: rec.proposed.rank_math_description,
            rank_math_focus_keyword: rec.proposed.rank_math_focus_keyword,
            score: rec.proposed.score,
            yoast_title: rec.proposed.yoast_title,
            yoast_description: rec.proposed.yoast_description,
          };
          rec.changed_fields = [];
          rec.approved = false;
        }
      }
      return rec;
    });
    state.counts.changed = state.recommendations.filter(
      (r: any) => r.changed_fields && r.changed_fields.length > 0
    ).length;
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");

    // 4. Update inventory.json and live-inventory.json for pushed items
    if (approvedIds.size > 0) {
      const updatedMetadata = new Map<number, any>();
      state.recommendations.forEach((rec: any) => {
        if (approvedIds.has(Number(rec.post_id))) {
          updatedMetadata.set(Number(rec.post_id), rec.current);
        }
      });

      // Update inventory.json
      try {
        const invContent = await fs.readFile(inventoryPath, "utf-8");
        const inventory = JSON.parse(invContent);
        if (Array.isArray(inventory)) {
          const updatedInventory = inventory.map((item: any) => {
            const itemId = Number(item.id);
            if (approvedIds.has(itemId)) {
              const meta = updatedMetadata.get(itemId);
              if (meta) {
                item.rankmath = {
                  ...item.rankmath,
                  seo_title: meta.rank_math_title,
                  meta_description: meta.rank_math_description,
                  focus_keyword: meta.rank_math_focus_keyword,
                  score: meta.score,
                };
                item.raw = {
                  ...item.raw,
                  rank_math_title: meta.rank_math_title,
                  rank_math_description: meta.rank_math_description,
                  rank_math_focus_keyword: meta.rank_math_focus_keyword,
                  rank_math_seo_score: String(meta.score),
                };
              }
            }
            return item;
          });
          await fs.writeFile(inventoryPath, JSON.stringify(updatedInventory, null, 2), "utf-8");
        }
      } catch (err) {
        console.error("Failed to update inventory.json post-push:", err);
      }

      // Update live-inventory.json
      try {
        const livePath = path.join(VAULT_SEO_DIR, "live-inventory.json");
        const liveContent = await fs.readFile(livePath, "utf-8");
        const liveInventory = JSON.parse(liveContent);
        if (liveInventory && liveInventory.items) {
          Object.keys(liveInventory.items).forEach((type) => {
            if (Array.isArray(liveInventory.items[type])) {
              liveInventory.items[type] = liveInventory.items[type].map((item: any) => {
                const itemId = Number(item.id);
                if (approvedIds.has(itemId)) {
                  const meta = updatedMetadata.get(itemId);
                  if (meta) {
                    item.rank_math_title = meta.rank_math_title;
                    item.rank_math_description = meta.rank_math_description;
                    item.rank_math_focus_keyword = meta.rank_math_focus_keyword;
                    item.rank_math_seo_score = String(meta.score);
                  }
                }
                return item;
              });
            }
          });
          await fs.writeFile(livePath, JSON.stringify(liveInventory, null, 2), "utf-8");
        }
      } catch (err) {
        console.error("Failed to update live-inventory.json post-push:", err);
      }
    }

    return NextResponse.json({
      success: failCount === 0,
      result: {
        applied: successCount,
        failed: failCount,
        total: approved.length,
        results,
      },
    });
  } catch (error: any) {
    console.error("Failed to push updates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to push updates." },
      { status: 500 }
    );
  }
}
