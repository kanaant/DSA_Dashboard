"use client";

import { useState, useEffect, useRef } from "react";
import { Activity, Cpu, Globe, Key, Shield, X, Heart, AlertTriangle, MessageSquare } from "lucide-react";
import { gsap } from "gsap";

import { Button } from "@/components/ui/button";
import { AGENT_AVATAR, AGENT_NAME } from "@/lib/brand";

interface AgentProfileCardProps {
  agentUrl: string;
  agentApiKey: string;
  isOpen?: boolean;
  onToggle?: () => void;
  popupClassName?: string;
}

export function AgentProfileCard({
  agentUrl,
  agentApiKey,
  isOpen: hoistedIsOpen,
  onToggle: hoistedOnToggle,
  popupClassName,
}: AgentProfileCardProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [bpm, setBpm] = useState(0);
  const [modelName, setModelName] = useState<string>("hermes-agent");
  const [latency, setLatency] = useState<number | null>(null);
  const [serviceStatus, setServiceStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const isOpen = hoistedIsOpen !== undefined ? hoistedIsOpen : localIsOpen;
  const togglePanel = hoistedOnToggle !== undefined ? hoistedOnToggle : () => setLocalIsOpen((prev) => !prev);
  const closePanel = hoistedOnToggle !== undefined ? hoistedOnToggle : () => setLocalIsOpen(false);

  // Extended Telemetry States initialized from LocalStorage for persistence
  const [discordActive, setDiscordActive] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hermes_discord_active") === "true";
    }
    return false;
  });
  const [telegramActive, setTelegramActive] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hermes_telegram_active") === "true";
    }
    return false;
  });
  const [whatsappActive, setWhatsappActive] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hermes_whatsapp_active") === "true";
    }
    return false;
  });
  const [activeSessions, setActiveSessions] = useState(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("hermes_active_sessions");
      return v ? parseInt(v, 10) : 0;
    }
    return 0;
  });
  const [skillsCount, setSkillsCount] = useState(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("hermes_skills_count");
      return v ? parseInt(v, 10) : 0;
    }
    return 0;
  });
  const [pluginsCount, setPluginsCount] = useState(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("hermes_plugins_count");
      return v ? parseInt(v, 10) : 0;
    }
    return 0;
  });
  const [provider, setProvider] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hermes_provider") || "OpenAI Codex";
    }
    return "OpenAI Codex";
  });
  const [pythonVersion, setPythonVersion] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hermes_python_version") || "";
    }
    return "";
  });
  
  const popoverRef = useRef<HTMLDivElement>(null);

  // Mask the API key for secure HUD telemetry display
  const maskApiKey = (key: string) => {
    if (!key) return "UNSET";
    if (key.length <= 12) return "••••••••••••";
    return `${key.slice(0, 10)}••••••••${key.slice(-4)}`;
  };

  // Background Loop: Poll Next.js proxy endpoint /api/hermes/status every 10 seconds (Latency/Online only)
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/hermes/status");
        if (!res.ok) throw new Error("API Route unreachable");
        
        const data = await res.json();
        
        if (isMounted) {
          setIsOnline(data.online);
          if (data.online) {
            setModelName(data.model || "hermes-agent");
            setLatency(data.latency);
            
            // Map latency to organic heart rates
            const computedBpm = Math.max(65, Math.min(110, 65 + Math.round((data.latency || 10) / 3)));
            setBpm(computedBpm);
            setServiceStatus(null);
          } else {
            setLatency(null);
            setBpm(0);
            setServiceStatus(data.serviceStatus || "OFFLINE");
          }
        }
      } catch {
        if (isMounted) {
          setIsOnline(false);
          setLatency(null);
          setBpm(0);
          setServiceStatus("OFFLINE");
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Manual Trigger: Executes a heavy background subprocess sync via GET ?sync=true
  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);

    try {
      const res = await fetch("/api/hermes/status?sync=true");
      if (!res.ok) throw new Error("Synchronization failed");
      
      const data = await res.json();
      
      if (data.online) {
        setDiscordActive(!!data.discordActive);
        setTelegramActive(!!data.telegramActive);
        setWhatsappActive(!!data.whatsappActive);
        setActiveSessions(data.activeSessions || 0);
        setSkillsCount(data.skillsCount || 0);
        setPluginsCount(data.pluginsCount || 0);
        setProvider(data.provider || "OpenAI Codex");
        setPythonVersion(data.pythonVersion || "");

        // Persist values in LocalStorage
        localStorage.setItem("hermes_discord_active", String(!!data.discordActive));
        localStorage.setItem("hermes_telegram_active", String(!!data.telegramActive));
        localStorage.setItem("hermes_whatsapp_active", String(!!data.whatsappActive));
        localStorage.setItem("hermes_active_sessions", String(data.activeSessions || 0));
        localStorage.setItem("hermes_skills_count", String(data.skillsCount || 0));
        localStorage.setItem("hermes_plugins_count", String(data.pluginsCount || 0));
        localStorage.setItem("hermes_provider", data.provider || "OpenAI Codex");
        localStorage.setItem("hermes_python_version", data.pythonVersion || "");
      }
    } catch (err) {
      console.error("Error sweeping telemetry parameters:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // GSAP animation triggers when toggling context panel
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      gsap.fromTo(
        popoverRef.current,
        {
          opacity: 0,
          scale: 0.9,
          y: -20,
          filter: "blur(10px)",
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.45,
          ease: "back.out(1.4)",
        }
      );
    }
  }, [isOpen]);


  return (
    <div className="relative flex flex-col items-center select-none gap-2.5 z-50 shrink-0">
      
      {/* Dynamic Floating HUD Profile Button */}
      <button
        onClick={togglePanel}
        className="group relative flex flex-col items-center justify-center cursor-pointer focus:outline-none transition-transform active:scale-95"
      >
        {/* Heartbeat EKG Pulse Trace (Turns red and spins slower when offline) */}
        <div 
          className={`absolute -inset-4 rounded-full border border-dashed transition-colors duration-500 ${
            isOnline 
              ? "border-[#00d4ff]/20 animate-spin animate-spin-slow" 
              : "border-rose-500/20 animate-spin"
          }`} 
          style={{ animationDuration: isOnline ? "35s" : "60s" }}
        />
        
        {/* Pulsing visual feedback glow synced to heartbeat rate (Disabled when offline) */}
        {isOnline && bpm > 0 && (
          <div 
            className="absolute -inset-3 rounded-full bg-[#8b5cf6]/10 opacity-60 animate-ping"
            style={{ animationDuration: `${60 / bpm}s` }}
          />
        )}
        
        {/* Dual circular neon frame (Cyan when online, Red warning when offline) */}
        <div className={`absolute -inset-2 rounded-full border transition-all duration-500 ${
          isOnline 
            ? "border-[#00d4ff]/40 shadow-[0_0_12px_rgba(0,212,255,0.25)] group-hover:border-[#8b5cf6]/60" 
            : "border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)] group-hover:border-rose-500/70"
        }`} />
        
        {/* Circular Avatar (Colored by default when online, grayscale only when offline) */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-slate-900 shadow-xl transition-all duration-500">
          <img
            src={AGENT_AVATAR}
            alt={`${AGENT_NAME} agent profile`}
            className={`w-full h-full object-cover transition-all duration-500 ${
              isOnline 
                ? "opacity-100 scale-100 group-hover:scale-105" 
                : "grayscale opacity-50 contrast-125 border-rose-950"
            }`}
          />
          {!isOnline && (
            <div className="absolute inset-0 bg-rose-950/20 mix-blend-color" />
          )}
        </div>

        {/* Live Heartbeat BPM Node Indicator */}
        <div className={`absolute -bottom-1 -right-1 bg-slate-950 border text-[8px] font-black rounded-full px-2 py-0.5 shadow-md flex items-center gap-0.5 z-20 transition-colors duration-500 ${
          isOnline 
            ? "border-[#00d4ff]/80 text-[#00d4ff]" 
            : "border-rose-500/80 text-rose-400"
        }`}>
          <Activity className={`w-2.5 h-2.5 ${isOnline ? "text-[#00d4ff] animate-pulse" : "text-rose-600 opacity-60"}`} />
          <span>{isOnline && bpm > 0 ? bpm : "--"}</span>
        </div>
      </button>

      {/* CONTEXT POPUP: HERMES AGENT HUD STATUS MONITOR */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute top-32 w-80 bg-[#050816] border border-[#8b5cf6]/35 rounded-2xl p-5 shadow-[0_20px_50px_rgba(2,6,23,0.95),inset_0_1px_0_rgba(255,255,255,0.06)] text-left pointer-events-auto z-50 ${
            popupClassName || "right-0"
          }`}
        >
          {/* Laser Top Accent */}
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent ${
            isOnline ? "via-[#00d4ff]" : "via-rose-500"
          }`} />

          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 select-none">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors duration-500 ${
              isOnline ? "text-[#00d4ff]" : "text-rose-400"
            }`}>
              <Shield className="w-3.5 h-3.5" />
              {AGENT_NAME} AGENT HUD
            </div>
            <button
              onClick={closePanel}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Telemetry Metrics Deck */}
          <div className="space-y-3.5">
            
            {/* Status Segment */}
            <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-white/5 select-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{AGENT_NAME} CONTROL LOOP</span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  ACTIVE SYNC
                </span>
              ) : serviceStatus === "STARTING" ? (
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

            {/* Messaging Platform Nodes */}
            <div className="space-y-1.5 select-none bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                <MessageSquare className="w-2.5 h-2.5 text-[#00d4ff]" />
                CONNECTED CHANNELS
              </span>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border transition-colors duration-500 ${
                  isOnline && discordActive 
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                    : "bg-slate-900/30 border-white/5 text-slate-500 opacity-60"
                }`}>
                  <span className={`w-1 h-1 rounded-full ${isOnline && discordActive ? "bg-indigo-400 animate-pulse" : "bg-slate-600"}`} />
                  DISCORD
                </span>
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border transition-colors duration-500 ${
                  isOnline && telegramActive 
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-400" 
                    : "bg-slate-900/30 border-white/5 text-slate-500 opacity-60"
                }`}>
                  <span className={`w-1 h-1 rounded-full ${isOnline && telegramActive ? "bg-sky-400 animate-pulse" : "bg-slate-600"}`} />
                  TELEGRAM
                </span>
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border transition-colors duration-500 ${
                  isOnline && whatsappActive 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-slate-900/30 border-white/5 text-slate-500 opacity-60"
                }`}>
                  <span className={`w-1 h-1 rounded-full ${isOnline && whatsappActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  WHATSAPP
                </span>
              </div>
            </div>

            {/* URL Parameter details */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 select-none">
                <Globe className="w-2.5 h-2.5 text-[#8b5cf6]" />
                HERMES GATEWAY URL
              </span>
              <div className="text-[11px] font-medium text-slate-300 font-mono bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 overflow-x-auto whitespace-nowrap">
                {agentUrl || "http://127.0.0.1:8642"}
              </div>
            </div>

            {/* Secret API Key telemetry */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 select-none">
                <Key className="w-2.5 h-2.5 text-[#00d4ff]" />
                GATEWAY TOKEN
              </span>
              <div className="text-[11px] font-medium text-slate-300 font-mono bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 whitespace-nowrap flex justify-between items-center">
                <span>{maskApiKey(agentApiKey)}</span>
                <span className="text-[9px] bg-[#00d4ff]/10 text-[#00d4ff] px-1.5 py-0.5 rounded font-sans uppercase font-bold tracking-wider select-none">
                  SECURE
                </span>
              </div>
            </div>

            {/* Physical Telemetry 4-item grid details */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold select-none pt-1">
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Heart className={`w-2.5 h-2.5 ${isOnline ? "text-rose-500 fill-rose-500 animate-pulse" : "text-rose-700 opacity-60"}`} />
                  PULSE
                </div>
                <div className="text-white font-bold flex items-baseline gap-1 mt-0.5">
                  {isOnline && bpm > 0 ? (
                    <>
                      <span className="text-sm">{bpm}</span>
                      <span className="text-[9px] text-slate-400">BPM</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-rose-500">--</span>
                      <span className="text-[9px] text-rose-600 font-bold">FLAT</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Cpu className="w-2.5 h-2.5 text-indigo-400" />
                  MODEL
                </div>
                <div className={`font-bold text-[10px] mt-1 tracking-wider overflow-hidden text-ellipsis whitespace-nowrap ${
                  isOnline ? "text-[#00d4ff]" : "text-rose-500"
                }`}>
                  {isOnline ? modelName.toUpperCase() : "DISCONNECTED"}
                </div>
              </div>

              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Shield className="w-2.5 h-2.5 text-teal-400" />
                  SESSIONS
                </div>
                <div className="text-white font-bold flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm">{isOnline ? activeSessions : 0}</span>
                  <span className="text-[9px] text-slate-400">SESS</span>
                </div>
              </div>

              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Globe className="w-2.5 h-2.5 text-[#8b5cf6]" />
                  PROVIDER
                </div>
                <div className={`font-bold text-[10px] mt-1 tracking-wider overflow-hidden text-ellipsis whitespace-nowrap ${
                  isOnline ? "text-[#00d4ff]" : "text-rose-500"
                }`}>
                  {isOnline ? provider.toUpperCase() : "OFFLINE"}
                </div>
              </div>
            </div>

            {/* Gateway Ecosystem Details */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold select-none">
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                  SKILLS
                </span>
                <span className={`text-[10px] font-bold ${isOnline && skillsCount > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                  {isOnline && skillsCount > 0 ? `${skillsCount} Enabled` : "0 Enabled"}
                </span>
              </div>
              <div className="bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                  PLUGINS
                </span>
                <span className={`text-[10px] font-bold ${isOnline && pluginsCount > 0 ? "text-purple-400" : "text-slate-500"}`}>
                  {isOnline && pluginsCount > 0 ? `${pluginsCount} Enabled` : "0 Enabled"}
                </span>
              </div>
            </div>

            {/* Manual Ecosystem Sync Command Button */}
            <Button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              variant="outline"
              className={`w-full h-8 bg-[#8b5cf6]/10 border-[#8b5cf6]/30 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 select-none ${
                isOnline && !isSyncing
                  ? "hover:bg-[#8b5cf6]/20 hover:border-[#8b5cf6]/50 text-[#c084fc] cursor-pointer" 
                  : "text-slate-600 border-white/5 bg-slate-900/10 cursor-not-allowed opacity-50"
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#00d4ff]" : "text-[#c084fc]"}`} />
              {isSyncing ? "SYNCING GATEWAY..." : "FORCE SYNC"}
            </Button>

            {/* Diagnostics check warning */}
            <div className="text-[10px] text-slate-400 leading-normal border-t border-white/5 pt-3.5 select-none font-medium flex gap-2">
              {isOnline ? (
                <>
                  <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                  <span>
                  {AGENT_NAME} is registered inside the live site context. Gateway telemetry is current and responsive at {latency || 0}ms. Environment: Python {pythonVersion || "3.11"}.
                  </span>
                </>
              ) : serviceStatus === "STARTING" ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 animate-bounce" />
                  <span className="text-amber-300 font-semibold">
                    Gateway service is active but the API server is initializing. Awaiting local socket binding on port 8642...
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span className="text-rose-300">
                    Gateway connection is down. Check the Hermes service daemon and environment variables.
                  </span>
                </>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
