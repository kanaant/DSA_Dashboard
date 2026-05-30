import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Radar } from "lucide-react";

import { getAuthCookieName, verifyAuthToken } from "@/lib/auth";
import { ThreeBackground } from "@/components/ThreeBackground";
import { DashboardNavBar } from "@/components/DashboardNavBar";
import { HeaderTelemetryDeck } from "@/components/HeaderTelemetryDeck";
import { KanbanDashboardSection } from "@/components/KanbanDashboardSection";
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

export default async function KanbanPage() {
  const adminName = await getAdminName();

  if (!adminName) {
    redirect("/login");
  }

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
                  {AGENT_NAME} Kanban Relay Board
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
                    Hermes <span className="bg-gradient-to-r from-[#00d4ff] via-[#8b5cf6] to-[#d946ef] bg-clip-text text-transparent">Kanban Task Control</span>
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                    Direct live integration to the local Hermes Agent cli. Drag and drop, start, block, complete, and track active tasks in real-time.
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

          <KanbanDashboardSection />
        </div>
      </main>
    </>
  );
}
