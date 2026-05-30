"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive, CheckCircle2, CircleDot, Loader2, Play, RefreshCw, RotateCcw, Rows3, Ban } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KanbanAction, KanbanItem, KanbanStatus } from "@/lib/dashboard-data";

const laneConfig: Array<{
  id: KanbanStatus;
  label: string;
  signal: string;
  rawStatuses: KanbanItem["rawStatus"][];
  summary: string;
}> = [
  {
    id: "backlog",
    label: "Backlog",
    signal: "bg-slate-400",
    rawStatuses: ["triage", "todo", "scheduled", "ready"],
    summary: "Queued work and ready-to-start cards",
  },
  {
    id: "active",
    label: "Active",
    signal: "bg-[#00d4ff]",
    rawStatuses: ["running", "review"],
    summary: "Tasks in motion or awaiting review",
  },
  {
    id: "blocked",
    label: "Blocked",
    signal: "bg-rose-400",
    rawStatuses: ["blocked"],
    summary: "Tasks waiting on external input",
  },
  {
    id: "done",
    label: "Done",
    signal: "bg-emerald-400",
    rawStatuses: ["done"],
    summary: "Completed work in the Hermes board",
  },
];

const statusIcon: Record<KanbanItem["rawStatus"], LucideIcon> = {
  triage: CircleDot,
  todo: CircleDot,
  scheduled: CircleDot,
  ready: Play,
  running: Loader2,
  blocked: AlertTriangle,
  review: CheckCircle2,
  done: CheckCircle2,
  archived: Archive,
};

const actionMeta: Record<
  KanbanAction,
  { label: string; icon: LucideIcon; className: string }
> = {
  start: {
    label: "Start",
    icon: Play,
    className: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300/40 hover:bg-cyan-400/20",
  },
  block: {
    label: "Block",
    icon: Ban,
    className: "border-rose-400/25 bg-rose-400/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-400/20",
  },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300/40 hover:bg-emerald-400/20",
  },
  unblock: {
    label: "Unblock",
    icon: RotateCcw,
    className: "border-amber-400/25 bg-amber-400/10 text-amber-100 hover:border-amber-300/40 hover:bg-amber-400/20",
  },
  archive: {
    label: "Archive",
    icon: Archive,
    className: "border-slate-400/25 bg-slate-400/10 text-slate-100 hover:border-slate-300/40 hover:bg-slate-400/20",
  },
};

function priorityTone(priority: KanbanItem["priority"]) {
  switch (priority) {
    case "high":
      return "border-rose-400/20 bg-rose-400/10 text-rose-200";
    case "medium":
      return "border-amber-400/20 bg-amber-400/10 text-amber-200";
    default:
      return "border-slate-400/20 bg-slate-400/10 text-slate-200";
  }
}

function getTaskActions(item: KanbanItem): KanbanAction[] {
  switch (item.rawStatus) {
    case "triage":
      return [];
    case "todo":
    case "scheduled":
    case "ready":
      return ["start"];
    case "running":
      return ["block", "complete"];
    case "review":
      return ["complete"];
    case "blocked":
      return ["unblock"];
    case "done":
      return ["archive"];
    case "archived":
      return [];
    default:
      return [];
  }
}

function getTriageHint(item: KanbanItem) {
  if (item.rawStatus !== "triage") {
    return null;
  }

  return "Needs specification before it can be started.";
}

function formatUpdatedAt(updatedAt: string) {
  try {
    return new Date(updatedAt).toLocaleString();
  } catch {
    return updatedAt;
  }
}

export function KanbanDashboardSection() {
  const [items, setItems] = useState<KanbanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const groupedItems = useMemo(
    () =>
      laneConfig.map((lane) => ({
        ...lane,
        items: items.filter((item) => lane.rawStatuses.includes(item.rawStatus)),
      })),
    [items]
  );

  const loadItems = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/kanban", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Kanban endpoint rejected the request");
      }

      setItems(data.items || []);
      setRefreshedAt(data.refreshedAt || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kanban source unavailable");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const runAction = async (id: string, action: KanbanAction) => {
    const actionKey = `${id}:${action}`;
    setPendingAction(actionKey);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Kanban update failed");
      }

      setItems((current) => current.map((item) => (item.id === id ? data.item : item)));
      setRefreshedAt(data.refreshedAt || new Date().toISOString());
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Kanban update did not commit");
    } finally {
      setPendingAction(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialItems = async () => {
      try {
        const res = await fetch("/api/dashboard/kanban", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Kanban endpoint rejected the request");
        }

        if (isMounted) {
          setItems(data.items || []);
          setRefreshedAt(data.refreshedAt || null);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Kanban source unavailable");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialItems();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="kanban" className="scroll-mt-24">
      <Card className="relative overflow-hidden rounded-2xl border-white/10 bg-slate-950/45 shadow-[0_20px_50px_rgba(2,6,23,0.7)] backdrop-blur-2xl select-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/50 to-transparent" />
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-wide text-white">
                <Rows3 className="h-5 w-5 text-[#00d4ff]" />
                Hermes Kanban Relay
              </CardTitle>
              <CardDescription className="text-slate-400">
                Live cards are pulled from the Hermes Kanban board, so the dashboard mirrors the real orchestration source instead of a mock store.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              onClick={loadItems}
              disabled={isRefreshing}
              className="h-9 rounded-xl border-[#00d4ff]/25 bg-[#00d4ff]/10 text-xs font-bold uppercase tracking-[0.18em] text-[#b9f4ff] hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/10"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-200">
              {error}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-4">
            {groupedItems.map((lane) => {
              const laneCount = lane.items.length;

              return (
                <div key={lane.id} className="min-h-64 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${lane.signal} shadow-[0_0_12px_currentColor]`} />
                        <h3 className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">{lane.label}</h3>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{lane.summary}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      {laneCount}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="rounded-xl border border-white/5 bg-slate-900/30 p-4 text-xs text-slate-500">
                        Loading lane data...
                      </div>
                    ) : laneCount === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/20 p-4 text-xs text-slate-500">
                        No active signal.
                      </div>
                    ) : (
                      lane.items.map((item) => {
                        const Icon = statusIcon[item.rawStatus];
                        const actions = getTaskActions(item);
                        const triageHint = getTriageHint(item);
                        const isPending = pendingAction === `${item.id}:${actions[0] ?? ""}` || pendingAction?.startsWith(`${item.id}:`) === true;

                        return (
                          <article
                            key={item.id}
                            className="rounded-xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_12px_30px_rgba(2,6,23,0.35)]"
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#00d4ff]">
                                <Icon className={`h-3.5 w-3.5 ${item.rawStatus === "running" ? "animate-spin" : ""}`} />
                                <span className="truncate">{item.rawStatus}</span>
                              </div>
                              <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${priorityTone(item.priority)}`}>
                                {item.priority}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold leading-snug text-white">{item.title}</h4>
                            <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.detail}</p>

                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              {item.assignee && (
                                <span className="rounded-full border border-white/10 bg-slate-900/40 px-2.5 py-1">
                                  {item.assignee}
                                </span>
                              )}
                              <span className="rounded-full border border-white/10 bg-slate-900/40 px-2.5 py-1">
                                {formatUpdatedAt(item.updatedAt)}
                              </span>
                              <span className="rounded-full border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 px-2.5 py-1 text-[#c4b5fd]">
                                {item.source}
                              </span>
                            </div>

                            {triageHint && (
                              <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] font-medium text-amber-100">
                                {triageHint}
                              </div>
                            )}

                            {actions.length > 0 ? (
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {actions.map((action) => {
                                  const meta = actionMeta[action];
                                  const IconComponent = meta.icon;
                                  const disabled = Boolean(isPending);

                                  return (
                                    <Button
                                      key={action}
                                      variant="outline"
                                      disabled={disabled}
                                      onClick={() => runAction(item.id, action)}
                                      className={`h-9 rounded-lg border text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-200 ${meta.className}`}
                                    >
                                      <IconComponent className="mr-2 h-3.5 w-3.5" />
                                      {meta.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                No direct action available
                              </div>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {refreshedAt && (
            <div className="mt-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Board refreshed {new Date(refreshedAt).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
