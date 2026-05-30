import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  Archive,
  Radar, 
  Server, 
  Rows3, 
  ArrowUpRight, 
  Play
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthCookieName, verifyAuthToken } from "@/lib/auth";
import { ThreeBackground } from "@/components/ThreeBackground";
import { DashboardNavBar } from "@/components/DashboardNavBar";
import { HeaderTelemetryDeck } from "@/components/HeaderTelemetryDeck";
import { getInstalledServices, getKanbanItems } from "@/lib/dashboard-data";
import type { InstalledService, KanbanItem } from "@/lib/dashboard-data";
import { getProjects } from "@/lib/vault-data";
import { AGENT_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

async function getAdminName() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await verifyAuthToken(token);
    return typeof payload.username === "string" ? payload.username : "admin";
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const adminName = await getAdminName();

  if (!adminName) {
    redirect("/login");
  }

  // Fetch telemetry server-side
  let services: InstalledService[] = [];
  let kanbanItems: KanbanItem[] = [];
  let vaultProjects: any[] = [];
  
  try {
    services = await getInstalledServices();
  } catch (err) {
    console.error("Failed to query services on overview server loader:", err);
  }
  try {
    kanbanItems = await getKanbanItems();
  } catch (err) {
    console.error("Failed to query kanban items on overview server loader:", err);
  }
  try {
    vaultProjects = await getProjects();
  } catch (err) {
    console.error("Failed to query vault projects on overview server loader:", err);
  }

  const onlineServices = services.filter((s) => s.status === "online").length;
  const totalServices = services.length;

  const backlogCount = kanbanItems.filter((i) => i.status === "backlog").length;
  const activeCount = kanbanItems.filter((i) => i.status === "active").length;
  const blockedCount = kanbanItems.filter((i) => i.status === "blocked").length;
  const doneCount = kanbanItems.filter((i) => i.status === "done").length;
  const totalTasks = kanbanItems.length;

  const totalProjects = vaultProjects.length;
  const totalVaultFiles = vaultProjects.reduce((acc, p) => acc + (p.fileCount || 0), 0);
  const totalAgentVaultFiles = vaultProjects.reduce((acc, p) => acc + (p.agentFileCount || 0), 0);

  return (
    <>
      <DashboardNavBar adminName={adminName} />
      <main className="relative min-h-screen overflow-hidden px-3 py-4 pb-36 sm:px-6 sm:py-6 lg:pl-80 lg:pr-8 lg:pb-8 [perspective:1500px]">
        {/* Immersive 3D interactive particle background */}
        <ThreeBackground />
  
        {/* Deep Background Grid Overlay */}
        <div 
          className="absolute inset-0 -z-5 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="mx-auto flex max-w-7xl flex-col gap-6 relative z-10">
          
          {/* Header command bar */}
          <header className="relative z-30 rounded-2xl border border-white/10 bg-slate-950/45 p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] select-none">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/35 bg-[#8b5cf6]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#00d4ff] shadow-[0_0_20px_rgba(139,92,246,0.15)] backdrop-blur-md">
                  <Radar className="h-4 w-4 animate-pulse text-[#00d4ff]" />
                  {AGENT_NAME} Operations Center
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
                    Welcome back, <span className="bg-gradient-to-r from-[#00d4ff] via-[#8b5cf6] to-[#d946ef] bg-clip-text text-transparent">{adminName}</span>.
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                    This is your premium mission command console. Quick navigation summaries below direct you to core systems status and active workflow pipelines.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-4 lg:items-end">
                <HeaderTelemetryDeck 
                  agentUrl={process.env.HERMES_AGENT_URL ?? "http://192.168.0.101/hermes"} 
                  agentApiKey={process.env.HERMES_AGENT_API_KEY ?? "hermes_sk_auth_8fb2c31e90"} 
                />
              </div>
            </div>
          </header>

          {/* Dynamic Summary Cards Row */}
          <section className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
            
            {/* Services running summary card */}
            <Link href="/dashboard/services" className="group block focus:outline-none">
              <Card className="relative overflow-hidden border-white/10 bg-slate-950/45 p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.7)] hover:border-[#00d4ff]/40 transition-all duration-300 rounded-3xl h-full flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/40 to-transparent" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#00d4ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.2)]">
                      <Server className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      LIVE telemetry
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2 group-hover:text-[#00d4ff] transition-colors duration-200">
                    Active Core Services
                    <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                  </h2>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    Check running status for proxy mappings, edge relays, database adapters, and the daemon agent controllers.
                  </p>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Online Rate</div>
                      <div className="mt-1 text-3xl font-extrabold text-white tracking-tight">
                        {onlineServices} <span className="text-sm font-semibold text-slate-500">/ {totalServices}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4 flex flex-col justify-center">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status Grid</div>
                      <div className="mt-1.5 flex gap-1 items-center">
                        {services.map((s) => (
                          <div
                            key={s.id}
                            className={`h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor] ${
                              s.status === "online" 
                                ? "text-emerald-400 bg-emerald-400" 
                                : s.status === "starting" 
                                ? "text-amber-400 bg-amber-400" 
                                : "text-rose-400 bg-rose-400"
                            }`}
                            title={`${s.name}: ${s.status}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#00d4ff] font-bold uppercase tracking-wider">
                  <span>Manage active systems</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#00d4ff]/10 group-hover:bg-[#00d4ff]/20 transition-colors duration-200">
                    <Play className="h-3 w-3 fill-current" />
                  </div>
                </div>
              </Card>
            </Link>

            {/* Kanban summary card */}
            <Link href="/dashboard/kanban" className="group block focus:outline-none">
              <Card className="relative overflow-hidden border-white/10 bg-slate-950/45 p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.7)] hover:border-[#8b5cf6]/40 transition-all duration-300 rounded-3xl h-full flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/40 to-transparent" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#8b5cf6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 text-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                      <Rows3 className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-[#8b5cf6]/25 bg-[#8b5cf6]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#d8b4fe]">
                      SYNCED relay
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2 group-hover:text-[#c084fc] transition-colors duration-200">
                    Hermes Task Pipeline
                    <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                  </h2>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    View active objectives and queue statuses synced directly to your local Hermes daemon command scheduler.
                  </p>

                  <div className="mt-8 grid grid-cols-4 gap-2">
                    {[
                      { count: activeCount, label: "Active", border: "border-cyan-500/25", text: "text-cyan-400 bg-cyan-950/20" },
                      { count: blockedCount, label: "Blocked", border: "border-rose-500/25", text: "text-rose-400 bg-rose-950/20" },
                      { count: backlogCount, label: "Backlog", border: "border-slate-800", text: "text-slate-400 bg-slate-900/40" },
                      { count: doneCount, label: "Done", border: "border-emerald-500/25", text: "text-emerald-400 bg-emerald-950/20" },
                    ].map((st) => (
                      <div key={st.label} className={`rounded-xl border p-2 text-center ${st.border} ${st.text}`}>
                        <div className="text-lg font-extrabold">{st.count}</div>
                        <div className="text-[9px] uppercase tracking-wider font-semibold opacity-85">{st.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#c084fc] font-bold uppercase tracking-wider">
                  <span>Enter command scheduler</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#8b5cf6]/10 group-hover:bg-[#8b5cf6]/20 transition-colors duration-200">
                    <Play className="h-3 w-3 fill-current" />
                  </div>
                </div>
              </Card>
            </Link>

            {/* Project Vault summary card */}
            <Link href="/dashboard/vault" className="group block focus:outline-none md:col-span-2 lg:col-span-1">
              <Card className="relative overflow-hidden border-white/10 bg-slate-950/45 p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.7)] hover:border-[#d946ef]/40 transition-all duration-300 rounded-3xl h-full flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d946ef]/40 to-transparent" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#d946ef]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d946ef]/30 bg-[#d946ef]/10 text-[#d946ef] shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                      <Archive className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-[#d946ef]/25 bg-[#d946ef]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">
                      SECURED jail
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2 group-hover:text-[#d946ef] transition-colors duration-200">
                    Jailed Document Vault
                    <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                  </h2>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    Access real-time GFM files, sandboxed HTML elements, Mermaid vectors, and autonomous agent outputs jailed securely.
                  </p>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Project Spaces</div>
                      <div className="mt-1 text-3xl font-extrabold text-white tracking-tight">
                        {totalProjects} <span className="text-sm font-semibold text-slate-500">spaces</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tracked Files</div>
                      <div className="mt-1 text-3xl font-extrabold text-white tracking-tight">
                        {totalVaultFiles} <span className="text-xs font-semibold text-[#00d4ff]">({totalAgentVaultFiles} AI)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#d946ef] font-bold uppercase tracking-wider">
                  <span>Enter document command center</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#d946ef]/10 group-hover:bg-[#d946ef]/20 transition-colors duration-200">
                    <Play className="h-3 w-3 fill-current" />
                  </div>
                </div>
              </Card>
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
