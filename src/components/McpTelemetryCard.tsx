"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Activity, Cpu, MessageSquare, RadioTower, RefreshCw, Server, ShieldCheck, TerminalSquare, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AGENT_NAME } from "@/lib/brand";

type HermesStatus = {
  online: boolean;
  model: string | null;
  latency: number | null;
  serviceStatus?: "STARTING" | "OFFLINE" | null;
  error?: string;
  terminalBackend?: string;
  sudoEnabled?: boolean;
  skillsCount?: number;
  pluginsCount?: number;
  provider?: string;
  pythonVersion?: string;
  discordActive?: boolean;
  telegramActive?: boolean;
  whatsappActive?: boolean;
  activeSessions?: number;
};

const defaultTelemetry: HermesStatus = {
  online: false,
  model: null,
  latency: null,
  serviceStatus: null,
  error: undefined,
  terminalBackend: "local",
  sudoEnabled: false,
  skillsCount: 0,
  pluginsCount: 0,
  provider: "OpenAI Codex",
  pythonVersion: "3.11",
  discordActive: false,
  telegramActive: false,
  whatsappActive: false,
  activeSessions: 0,
};

interface McpTelemetryCardProps {
  isOpen?: boolean;
  onToggle?: () => void;
  popupClassName?: string;
}

export function McpTelemetryCard({
  isOpen: hoistedIsOpen,
  onToggle: hoistedOnToggle,
  popupClassName,
}: McpTelemetryCardProps = {}) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<HermesStatus>(defaultTelemetry);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const popoverRef = useRef<HTMLDivElement>(null);

  const isOpen = hoistedIsOpen !== undefined ? hoistedIsOpen : localIsOpen;
  const togglePanel = hoistedOnToggle !== undefined ? hoistedOnToggle : () => setLocalIsOpen((prev) => !prev);
  const closePanel = hoistedOnToggle !== undefined ? hoistedOnToggle : () => setLocalIsOpen(false);

  const fetchTelemetry = async (forceSync = false) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(`/api/hermes/status${forceSync ? "?sync=true" : ""}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as HermesStatus;
      setTelemetry({ ...defaultTelemetry, ...data });
      setLastUpdated(new Date());
    } catch {
      setTelemetry((prev) => ({
        ...defaultTelemetry,
        ...prev,
        online: false,
        latency: null,
        serviceStatus: prev.serviceStatus || "OFFLINE",
      }));
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const initialFetch = window.setTimeout(() => void fetchTelemetry(), 0);
    const interval = window.setInterval(() => void fetchTelemetry(), 10000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isOpen && popoverRef.current) {
      popoverRef.current.animate(
        [
          { opacity: 0, transform: "translateY(-20px) scale(0.94)", filter: "blur(10px)" },
          { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0px)" },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );
    }
  }, [isOpen]);

  const platformCount = useMemo(
    () => [telemetry.discordActive, telemetry.telegramActive, telemetry.whatsappActive].filter(Boolean).length,
    [telemetry.discordActive, telemetry.telegramActive, telemetry.whatsappActive]
  );

  return (
    <div className="relative flex flex-col items-center gap-2.5 z-50 shrink-0 select-none">
      
      {/* Unified Circular MCP Gateway Button */}
      <button
        type="button"
        onClick={togglePanel}
        className="group relative flex flex-col items-center justify-center cursor-pointer focus:outline-none transition-transform active:scale-95"
      >
        {/* Heartbeat EKG Orbit halo */}
        <div
          className={`absolute -inset-2.5 sm:-inset-4 rounded-full border border-dashed transition-colors duration-500 ${
            telemetry.online ? "border-[#00d4ff]/20 animate-spin" : "border-rose-500/20 animate-spin"
          }`}
          style={{ animationDuration: telemetry.online ? "35s" : "60s" }}
        />

        {/* Outer aura glowing pulse synced to latency rates */}
        {telemetry.online && telemetry.latency != null && (
          <div
            className="absolute -inset-2 sm:-inset-3 rounded-full bg-[#8b5cf6]/10 opacity-60 animate-ping"
            style={{ animationDuration: `${Math.max(0.65, telemetry.latency / 100)}s` }}
          />
        )}

        {/* Glowing border ring */}
        <div
          className={`absolute -inset-1.5 sm:-inset-2 rounded-full border transition-all duration-500 ${
            telemetry.online
              ? "border-[#00d4ff]/40 shadow-[0_0_12px_rgba(0,212,255,0.25)] group-hover:border-[#8b5cf6]/60"
              : "border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)] group-hover:border-rose-500/70"
          }`}
        />

        {/* Circular Trigger Face (scaled to w-14 h-14 sm:w-24 sm:h-24 matching the agent profile layout) */}
        <div className="relative w-14 h-14 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-white/10 bg-slate-900 shadow-xl transition-all duration-500 flex items-center justify-center">
          <div
            className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${
              telemetry.online 
                ? "from-[#00d4ff]/20 via-transparent to-[#8b5cf6]/20 opacity-100" 
                : "from-rose-500/10 via-transparent to-slate-950/30 opacity-60"
            }`}
          />
          <RadioTower className={`relative z-10 h-6 w-6 sm:h-10 sm:w-10 transition-colors duration-500 ${telemetry.online ? "text-[#00d4ff]" : "text-rose-400"}`} />
        </div>

        {/* Latency Node indicator at bottom-right */}
        <div
          className={`absolute -bottom-1 -right-1 bg-slate-950 border text-[8px] font-black rounded-full px-2 py-0.5 shadow-md flex items-center gap-0.5 z-20 transition-colors duration-500 ${
            telemetry.online ? "border-[#00d4ff]/80 text-[#00d4ff]" : "border-rose-500/80 text-rose-400"
          }`}
        >
          <Activity className={`w-2.5 h-2.5 ${telemetry.online ? "text-emerald-400 animate-pulse" : "text-rose-600 opacity-60"}`} />
          <span>{telemetry.online && telemetry.latency != null ? `${telemetry.latency}ms` : "--"}</span>
        </div>
      </button>

      {/* CONTEXT POPUP: MCP HUD STATUS MONITOR */}
      {isOpen && (
        <>
          {/* Mobile Backdrop blur overlay */}
          <div 
            onClick={closePanel}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 sm:hidden cursor-pointer" 
          />
          <div
            ref={popoverRef}
            className={`fixed inset-x-4 top-[10vh] sm:absolute sm:top-32 w-auto max-w-[340px] sm:w-80 mx-auto sm:mx-0 bg-[#050816] border border-[#8b5cf6]/35 rounded-2xl p-5 shadow-[0_20px_50px_rgba(2,6,23,0.95),inset_0_1px_0_rgba(255,255,255,0.06)] text-left pointer-events-auto z-50 ${
              popupClassName || "sm:right-0"
            }`}
          >
          {/* Laser Top Accent */}
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${telemetry.online ? "via-[#00d4ff]" : "via-rose-500"} to-transparent`} />

          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 select-none">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors duration-500 ${telemetry.online ? "text-[#00d4ff]" : "text-rose-400"}`}>
              <Server className="w-3.5 h-3.5" />
              MCP CONTROL HUD
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Status Segment */}
            <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-white/5 select-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hermes Gateway</span>
              {telemetry.online ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  CONNECTED
                </span>
              ) : telemetry.serviceStatus === "STARTING" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  INITIALIZING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  OFFLINE
                </span>
              )}
            </div>

            {/* Integrated Channels badges */}
            <div className="space-y-1.5 select-none bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                <MessageSquare className="w-2.5 h-2.5 text-[#00d4ff]" />
                Integrated Channels
              </span>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {[
                  { label: "Discord", active: !!telemetry.discordActive, tone: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" },
                  { label: "Telegram", active: !!telemetry.telegramActive, tone: "bg-sky-500/10 border-sky-500/30 text-sky-400" },
                  { label: "WhatsApp", active: !!telemetry.whatsappActive, tone: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border transition-colors duration-500 ${
                      item.active ? item.tone : "bg-slate-900/30 border-white/5 text-slate-500 opacity-60"
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${item.active ? "bg-current animate-pulse" : "bg-slate-600"}`} />
                    {item.label}
                  </span>
                ))}
              </div>
              <div className="text-[10px] leading-normal text-slate-400">
                {platformCount > 0
                  ? `${platformCount} messaging channel${platformCount === 1 ? " is" : "s are"} reflected in the live Hermes status output.`
                  : "No messaging channels are currently configured on this host."}
              </div>
            </div>

            {/* Physical Telemetry 4-item grid details */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold select-none pt-1">
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Activity className={`w-2.5 h-2.5 ${telemetry.online ? "text-emerald-400" : "text-rose-500"}`} />
                  Latency
                </div>
                <div className="text-white font-bold flex items-baseline gap-1 mt-0.5">
                  <span className={`text-sm ${telemetry.online ? "text-[#00d4ff]" : "text-rose-400"}`}>{telemetry.latency != null ? `${telemetry.latency}` : "--"}</span>
                  <span className="text-[9px] text-slate-400">MS</span>
                </div>
              </div>

              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Cpu className="w-2.5 h-2.5 text-indigo-400" />
                  Model
                </div>
                <div className={`font-bold text-[10px] mt-1 tracking-wider overflow-hidden text-ellipsis whitespace-nowrap ${telemetry.online ? "text-[#00d4ff]" : "text-rose-500"}`}>
                  {telemetry.online ? (telemetry.model || "HERMES-AGENT").toUpperCase() : "DISCONNECTED"}
                </div>
              </div>

              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <TerminalSquare className="w-2.5 h-2.5 text-[#00d4ff]" />
                  Backend
                </div>
                <div className="text-white font-bold flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm">{telemetry.terminalBackend || "local"}</span>
                </div>
              </div>

              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-teal-400" />
                  Sudo
                </div>
                <div className="text-white font-bold flex items-baseline gap-1 mt-0.5">
                  <span className={`text-sm ${telemetry.sudoEnabled ? "text-emerald-400" : "text-slate-500"}`}>{telemetry.sudoEnabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>

            {/* Gateway Ecosystem Details */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold select-none">
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                  Loaded Skills
                </span>
                <span className={`text-[10px] font-bold ${telemetry.online && (telemetry.skillsCount ?? 0) > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                  {telemetry.online ? `${telemetry.skillsCount || 0} Enabled` : "0 Enabled"}
                </span>
              </div>
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                  Loaded Plugins
                </span>
                <span className={`text-[10px] font-bold ${telemetry.online && (telemetry.pluginsCount ?? 0) > 0 ? "text-purple-400" : "text-slate-500"}`}>
                  {telemetry.online ? `${telemetry.pluginsCount || 0} Enabled` : "0 Enabled"}
                </span>
              </div>
            </div>

            {/* Hoisted Diagnostics Details */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold select-none">
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                  Active Sessions
                </span>
                <span className={`text-[10px] font-bold ${telemetry.online && (telemetry.activeSessions ?? 0) > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                  {telemetry.online ? `${telemetry.activeSessions || 0} Active` : "0 Active"}
                </span>
              </div>
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                  Provider Link
                </span>
                <span className={`text-[10px] font-bold ${telemetry.online ? "text-[#00d4ff]" : "text-slate-500"}`}>
                  {telemetry.online ? (telemetry.provider || "OpenAI Codex").toUpperCase() : "OFFLINE"}
                </span>
              </div>
            </div>

            {/* Manual Sync Button inside MCP popover */}
            <Button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                void fetchTelemetry(true);
              }}
              disabled={isRefreshing || !telemetry.online}
              variant="outline"
              className={`w-full h-8 bg-[#00d4ff]/10 border-[#00d4ff]/30 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 select-none ${
                telemetry.online && !isRefreshing
                  ? "hover:bg-[#00d4ff]/20 hover:border-[#00d4ff]/50 text-[#00d4ff] cursor-pointer" 
                  : "text-slate-600 border-white/5 bg-slate-900/10 cursor-not-allowed opacity-50"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#00d4ff]" : "text-[#00d4ff]"}`} />
              {isRefreshing ? "SWEEPING NEURAL CHANNELS..." : "RUN NEURAL SCAN"}
            </Button>

            {/* Diagnostics message block */}
            <div className="text-[10px] text-slate-400 leading-normal border-t border-white/5 pt-3.5 select-none font-medium flex gap-2">
              {telemetry.online ? (
                <>
                  <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                  <span>
                    {AGENT_NAME} is registered in the live site context. Gateway status is healthy, telemetry is current, and the control plane is responding at {telemetry.latency || 0}ms.
                  </span>
                </>
              ) : telemetry.serviceStatus === "STARTING" ? (
                <>
                  <Activity className="w-4 h-4 text-amber-500 flex-shrink-0 animate-bounce" />
                  <span className="text-amber-300 font-semibold">
                    Hermes is online but still initializing. Waiting for the local socket to finish binding.
                  </span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span className="text-rose-300">
                    Gateway connection is down. Check the Hermes gateway service and environment variables.
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-slate-500 pt-1">
              <span>{telemetry.pythonVersion ? `Python ${telemetry.pythonVersion}` : "Python 3.11"}</span>
              <span>{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Pending"}</span>
            </div>
          </div>
        </div>
      </>
      )}
    </div>
  );
}
