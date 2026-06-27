import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Radar, Sparkles } from "lucide-react";

import { getAuthCookieName, verifyAuthToken } from "@/lib/auth";
import { ThreeBackground } from "@/components/ThreeBackground";
import { DashboardNavBar } from "@/components/DashboardNavBar";
import { HeaderTelemetryDeck } from "@/components/HeaderTelemetryDeck";
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

export default async function SeoImagePage() {
  const adminName = await getAdminName();

  if (!adminName) {
    redirect("/login");
  }

  return (
    <>
      <DashboardNavBar adminName={adminName} />
      <main className="relative min-h-screen overflow-hidden px-3 py-4 pb-36 sm:px-6 sm:py-6 lg:pl-80 lg:pr-8 lg:pb-8 [perspective:1500px]">
        <ThreeBackground />

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

        <div className="mx-auto flex max-w-[1600px] w-full flex-col gap-6 relative z-10">
          <header className="relative z-30 rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] select-none">
            <div className="flex flex-row items-center justify-between gap-4">
              <div className="flex-1 max-w-[72%] sm:max-w-none space-y-2 sm:space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/35 bg-indigo-500/10 px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)] backdrop-blur-md">
                  <Radar className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
                  {AGENT_NAME} SEO Workspace
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    MaquiFit <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Image SEO</span>
                  </h1>
                  <p className="mt-1 sm:mt-2 max-w-3xl text-xs sm:text-sm leading-relaxed text-slate-300">
                    AI-powered image metadata generation, alt tag formatting, and asset renaming.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-end">
                <HeaderTelemetryDeck
                  agentUrl={process.env.HERMES_AGENT_URL ?? "http://192.168.0.101/hermes"}
                  agentApiKey={process.env.HERMES_AGENT_API_KEY ?? "hermes_sk_auth_8fb2c31e90"}
                />
              </div>
            </div>
          </header>

          {/* Image SEO Placeholder View */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-12 text-center backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.7)] flex flex-col items-center justify-center gap-4 select-none animate-in fade-in duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">Image SEO Control Room</h3>
            <p className="max-w-md text-sm leading-relaxed text-slate-400">
              Image SEO & Alt Text Optimization coming soon. Auto-optimize product image filenames, alt tags, and titles using AI computer vision.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
