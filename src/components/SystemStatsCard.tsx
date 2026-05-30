"use client";

import { useEffect, useState } from "react";
import { Cpu, Database, HardDrive, Loader2, RefreshCw, Server } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SystemStats {
  cpu: number;
  memory: number;
  totalMem: number;
  usedMem: number;
  uptime: number;
  platform: string;
  refreshedAt: string;
}

export function SystemStatsCard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Stats registry endpoint rejected the request");
      const data = await res.json();
      setStats(data);
    } catch {
      setError("System telemetry link offline");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <Card className="overflow-hidden border-white/10 bg-slate-950/45 shadow-[0_20px_50px_rgba(2,6,23,0.7)] backdrop-blur-2xl rounded-2xl select-none relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/50 to-transparent" />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-white text-xl font-bold tracking-wide flex items-center gap-2">
              <Server className="h-5 w-5 text-[#00d4ff]" />
              Host System Telemetry
            </CardTitle>
            <CardDescription className="text-slate-400">
              Live hardware and virtualization resource utilization metrics.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            onClick={fetchStats}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-lg p-0 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && !stats ? (
          <div className="flex h-40 items-center justify-center text-xs text-slate-400 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#00d4ff]" />
            Gathering system resources...
          </div>
        ) : error && !stats ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-200">
            {error}
          </div>
        ) : stats ? (
          <>
            {/* CPU utilization bar */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-slate-900/20 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-[#00d4ff]" />
                  Host CPU Utilization
                </span>
                <span className="text-[#00d4ff] font-mono">{stats.cpu}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-950/60 border border-white/5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] transition-all duration-500"
                  style={{ width: `${stats.cpu}%` }}
                />
              </div>
            </div>

            {/* Memory utilization bar */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-slate-900/20 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-[#8b5cf6]" />
                  Physical Memory Load
                </span>
                <span className="text-[#c084fc] font-mono">
                  {stats.usedMem}G <span className="text-slate-500 text-[10px] font-normal">/ {stats.totalMem}G</span> ({stats.memory}%)
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-950/60 border border-white/5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-pink-500 transition-all duration-500"
                  style={{ width: `${stats.memory}%` }}
                />
              </div>
            </div>

            {/* Platform & Uptime details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-slate-900/20 p-3 flex flex-col justify-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">System Platform</span>
                <span className="text-xs font-bold text-white font-mono mt-1 capitalize">{stats.platform} Host</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/20 p-3 flex flex-col justify-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Uptime</span>
                <span className="text-xs font-bold text-emerald-400 font-mono mt-1">{formatUptime(stats.uptime)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-900/20 p-3 text-[10px] text-slate-500 font-mono text-center uppercase tracking-widest">
              Live link synced: {new Date(stats.refreshedAt).toLocaleTimeString()}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
