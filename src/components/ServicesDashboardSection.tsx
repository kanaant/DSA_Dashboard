"use client";

import { useEffect, useState } from "react";
import { HardDrive, Loader2, PlugZap, RefreshCw, ServerCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstalledService } from "@/lib/dashboard-data";

const statusStyles = {
  online: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  offline: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  starting: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  unknown: "border-slate-400/20 bg-slate-400/10 text-slate-300",
};

export function ServicesDashboardSection() {
  const [services, setServices] = useState<InstalledService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadServices = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/services", { cache: "no-store" });
      if (!res.ok) throw new Error("Service registry endpoint rejected the request");
      const data = await res.json();
      setServices(data.services || []);
      setRefreshedAt(data.refreshedAt || null);
    } catch {
      setError("Service registry unavailable");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialServices = async () => {
      try {
        const res = await fetch("/api/dashboard/services", { cache: "no-store" });
        if (!res.ok) throw new Error("Service registry endpoint rejected the request");
        const data = await res.json();

        if (isMounted) {
          setServices(data.services || []);
          setRefreshedAt(data.refreshedAt || null);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Service registry unavailable");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialServices();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="services" className="scroll-mt-8">
      <Card className="overflow-hidden border-white/10 bg-slate-950/45 shadow-[0_20px_50px_rgba(2,6,23,0.7)] backdrop-blur-2xl rounded-2xl select-none relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/50 to-transparent" />
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-wide text-white">
                <ServerCog className="h-5 w-5 text-[#c084fc]" />
                Installed Service Registry
              </CardTitle>
              <CardDescription className="text-slate-400">
                Runtime services exposed through a refreshable backend source for install, delete, and modify workflows.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={loadServices}
              disabled={isRefreshing}
              className="h-9 rounded-xl border-[#8b5cf6]/25 bg-[#8b5cf6]/10 text-xs font-bold uppercase tracking-[0.18em] text-[#ddd6fe] hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/10"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Sweep
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-200">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="grid grid-cols-[1.3fr_0.55fr_0.75fr_1.3fr] gap-3 border-b border-white/10 bg-slate-950/55 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <span>Service</span>
              <span>Port</span>
              <span>Status</span>
              <span>Install Path</span>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-[#00d4ff]" />
                Sweeping service registry...
              </div>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="grid grid-cols-1 gap-3 border-b border-white/5 px-4 py-4 last:border-b-0 md:grid-cols-[1.3fr_0.55fr_0.75fr_1.3fr] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <PlugZap className="h-4 w-4 shrink-0 text-[#00d4ff]" />
                      {service.port ? (
                        <a
                          href={service.port === 80 ? "http://192.168.0.101" : `http://192.168.0.101:${service.port}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#00d4ff] hover:underline transition-colors flex items-center gap-1 group/link"
                        >
                          {service.name}
                          <span className="text-[10px] text-slate-500 font-normal transition-all duration-300 group-hover/link:text-[#00d4ff] group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5">↗</span>
                        </a>
                      ) : (
                        <span>{service.name}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{service.description}</p>
                  </div>
                  <div className="font-mono text-sm font-bold text-[#00d4ff]">{service.port ?? "n/a"}</div>
                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusStyles[service.status]}`}>
                      {service.status}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2 font-mono text-[11px] text-slate-300">
                    <HardDrive className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />
                    <span className="truncate">{service.installPath}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {refreshedAt && (
            <div className="mt-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Registry sweep {new Date(refreshedAt).toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
