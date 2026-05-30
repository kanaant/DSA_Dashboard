import { NextResponse } from "next/server";
import { isApiRequestAuthenticated } from "@/lib/api-auth";
import os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isApiRequestAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Calculate CPU load using load averages
  const loadAvg = os.loadavg();
  const cpus = os.cpus().length;
  // Convert 1 min load average to a percentage relative to cpu count
  const cpuPercent = Math.min(Math.round((loadAvg[0] / cpus) * 100), 100);

  // Memory usage stats
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryPercent = Math.round((usedMem / totalMem) * 100);

  // Platform and uptime details
  const uptime = Math.round(os.uptime());
  const platform = os.platform();

  return NextResponse.json({
    cpu: cpuPercent,
    memory: memoryPercent,
    totalMem: Math.round(totalMem / (1024 * 1024 * 1024)), // GB
    usedMem: Math.round(usedMem / (1024 * 1024 * 1024)), // GB
    uptime,
    platform,
    refreshedAt: new Date().toISOString()
  });
}
