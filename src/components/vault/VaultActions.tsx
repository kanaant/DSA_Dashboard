"use client";

import { useState } from "react";
import { Cpu, FileText, GitFork, RefreshCw, Sparkles } from "lucide-react";

interface VaultActionsProps {
  filePath: string;
  projectId: string;
  onActionComplete: (outputPath: string) => void;
}

export function VaultActions({ filePath, projectId, onActionComplete }: VaultActionsProps) {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileExt = filePath.split(".").pop()?.toLowerCase() || "";
  const isCodeFile = ["js", "jsx", "ts", "tsx", "py", "css", "html", "json"].includes(fileExt);

  const triggerAgent = async (action: "summarize" | "refactor" | "diagram") => {
    setLoading(true);
    setCurrentAction(action);
    setError(null);

    try {
      const res = await fetch("/api/vault/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          filePath,
          projectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger agent.");
      }

      onActionComplete(data.outputPath);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while communicating with Hermes.");
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_30px_rgba(2,6,23,0.45)] backdrop-blur-md relative overflow-hidden">
      {/* Background neon laser border lines */}
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/40 to-transparent" />

      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-[#00d4ff] animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#00d4ff]">
          Autonomous Agent Actions
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="relative mb-3 flex h-10 w-10 items-center justify-center">
            <RefreshCw className="h-6 w-6 text-[#00d4ff] animate-spin" />
            <div className="absolute inset-0 rounded-full border border-[#00d4ff]/20 animate-ping" />
          </div>
          <p className="text-xs font-bold text-slate-200">
            Hermes Agent: Processing {currentAction === "summarize" ? "Summary" : currentAction === "refactor" ? "Code Optimization" : "Flowchart Diagram"}...
          </p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest animate-pulse">
            Local LLM inference active
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative group/btn w-full">
              <button
                onClick={() => triggerAgent("summarize")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-black/35 px-3 py-2 text-xs font-bold text-white transition-all duration-300 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 hover:text-[#00d4ff]"
              >
                <FileText className="h-3.5 w-3.5" />
                Summarize Brief
              </button>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-[200] mb-2.5 w-48 -translate-x-1/2 scale-95 rounded-xl border border-white/10 bg-[#050816] p-2.5 text-center text-[10px] text-slate-400 opacity-0 shadow-[0_10px_25px_rgba(0,0,0,0.85)] transition-all duration-200 group-hover/btn:scale-100 group-hover/btn:opacity-100 font-mono leading-relaxed select-none">
                <span className="text-[#00d4ff] font-bold block mb-1">SUMMARIZE BRIEF</span>
                Extracts key metrics, system limits, and objectives into a concise Markdown brief.
                <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 bg-[#050816] rotate-45 border-r border-b border-white/10" />
              </div>
            </div>

            {isCodeFile ? (
              <div className="relative group/btn w-full">
                <button
                  onClick={() => triggerAgent("refactor")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-black/35 px-3 py-2 text-xs font-bold text-white transition-all duration-300 hover:border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/10 hover:text-[#c084fc]"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Refactor Code
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-[200] mb-2.5 w-48 -translate-x-1/2 scale-95 rounded-xl border border-white/10 bg-[#050816] p-2.5 text-center text-[10px] text-slate-400 opacity-0 shadow-[0_10px_25px_rgba(0,0,0,0.85)] transition-all duration-200 group-hover/btn:scale-100 group-hover/btn:opacity-100 font-mono leading-relaxed select-none">
                  <span className="text-[#c084fc] font-bold block mb-1">REFACTOR CODE</span>
                  Optimizes algorithms, audits syntax security, and hardens code structure.
                  <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 bg-[#050816] rotate-45 border-r border-b border-white/10" />
                </div>
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="relative group/btn w-full">
              <button
                onClick={() => triggerAgent("diagram")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-black/35 px-3 py-2 text-xs font-bold text-white transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <GitFork className="h-3.5 w-3.5 rotate-90" />
                Flow Diagram
              </button>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-[200] mb-2.5 w-48 -translate-x-1/2 scale-95 rounded-xl border border-white/10 bg-[#050816] p-2.5 text-center text-[10px] text-slate-400 opacity-0 shadow-[0_10px_25px_rgba(0,0,0,0.85)] transition-all duration-200 group-hover/btn:scale-100 group-hover/btn:opacity-100 font-mono leading-relaxed select-none">
                <span className="text-emerald-400 font-bold block mb-1">FLOW DIAGRAM</span>
                Converts textual specifications or logic flows into an interactive Mermaid.js diagram.
                <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 bg-[#050816] rotate-45 border-r border-b border-white/10" />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-2 text-[10px] font-bold text-rose-400 border border-rose-500/20 bg-rose-500/5 p-2 rounded-lg text-center">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
