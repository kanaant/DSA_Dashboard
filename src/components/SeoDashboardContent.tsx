"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  RotateCw, 
  Settings2, 
  FileText, 
  ShoppingBag, 
  Layers, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  UploadCloud, 
  ArrowRight, 
  Globe, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  Clock,
  ShieldCheck,
  Check,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Circular Progress Component for RankMath Score
function RankMathScoreRing({ score }: { score: number | null }) {
  const displayScore = score ?? 0;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  let colorClass = "stroke-rose-500 text-rose-400";
  let bgClass = "bg-rose-500/10";
  if (displayScore >= 80) {
    colorClass = "stroke-emerald-500 text-emerald-400";
    bgClass = "bg-emerald-500/10";
  } else if (displayScore >= 50) {
    colorClass = "stroke-amber-500 text-amber-400";
    bgClass = "bg-amber-500/10";
  }

  return (
    <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/5 ${bgClass} shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-sm`}>
      <svg className="h-12 w-12 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          className="stroke-slate-800"
          strokeWidth="3.5"
          fill="transparent"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          className={`transition-all duration-500 ${colorClass}`}
          strokeWidth="3.5"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-black tracking-tighter">{score !== null ? score : "—"}</span>
    </div>
  );
}

interface CredentialState {
  label: string;
  helper: string;
  present: boolean;
}

function calculateSimulatedScore(title: string, description: string, keyword: string, slug: string): number {
  let score = 30; // Base score

  const t = (title || "").toLowerCase().trim();
  const d = (description || "").toLowerCase().trim();
  const k = (keyword || "").toLowerCase().trim();
  const s = (slug || "").toLowerCase().trim();

  if (!k) {
    if (t.length >= 40 && t.length <= 60) score += 15;
    if (d.length >= 110 && d.length <= 160) score += 15;
    return Math.min(score, 60);
  }

  const keywords = k.split(",").map(x => x.trim()).filter(Boolean);
  if (keywords.length > 0) {
    const primaryK = keywords[0];
    if (t.includes(primaryK)) {
      score += 20;
      if (t.startsWith(primaryK) || t.indexOf(primaryK) < t.length / 2) {
        score += 10;
      }
    }
    if (d.includes(primaryK)) {
      score += 20;
    }
    const cleanSlug = s.replace(/-/g, " ");
    if (cleanSlug.includes(primaryK) || primaryK.split(" ").some(word => cleanSlug.includes(word))) {
      score += 10;
    }
  }

  const titleLen = t.length;
  if (titleLen >= 45 && titleLen <= 60) {
    score += 15;
  } else if (titleLen >= 30 && titleLen < 45) {
    score += 8;
  } else if (titleLen > 60) {
    score += 5;
  }

  const descLen = d.length;
  if (descLen >= 120 && descLen <= 160) {
    score += 15;
  } else if (descLen >= 80 && descLen < 120) {
    score += 8;
  } else if (descLen > 160) {
    score += 5;
  }

  return Math.min(score, 100);
}

export function SeoDashboardContent({ credentials, initialTab = "product" }: { credentials: CredentialState[], initialTab?: "product" | "page" | "post" | "settings" }) {
  const [activeTab, setActiveTab] = useState<"product" | "page" | "post" | "settings">(initialTab);
  const [langFilter, setLangFilter] = useState<"all" | "fr" | "en" | "es">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [state, setState] = useState<any>({
    generated_at: "",
    counts: { items: 0, recommendations: 0, changed: 0 },
    recommendations: []
  });
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [selectedForOptimization, setSelectedForOptimization] = useState<Set<number>>(new Set());
  const [onlyPublished, setOnlyPublished] = useState(true);
  const [excludeIgnored, setExcludeIgnored] = useState(true);
  const [showStagedOnly, setShowStagedOnly] = useState(false);
  const [showIgnoreColumn, setShowIgnoreColumn] = useState(false);
  
  // Pipeline running status
  const [status, setStatus] = useState<any>({
    status: "idle",
    step: "Idle",
    progress: 0
  });

  // Settings state
  const [settings, setSettings] = useState<any>({
    categories: ["product"],
    schedule: "daily",
    dailyHour: 2,
    optimizeScoreThreshold: 80
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Poll status when running
  const statusPollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = async (currentSettings?: any) => {
    try {
      const res = await fetch("/api/seo");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        
        // Auto-select based on score threshold and publish status
        const isOptimized = (data.recommendations || []).some((r: any) => r.notes?.includes("agent-optimized"));
        if (!isOptimized && data.recommendations) {
          const threshold = currentSettings?.optimizeScoreThreshold ?? settings?.optimizeScoreThreshold ?? 80;
          const targetIds = data.recommendations
            .filter((r: any) => {
              const isPublish = r.status === "publish";
              const score = r.current?.score ?? r.raw?.rankmath?.score ?? 0;
              return isPublish && score < threshold;
            })
            .map((r: any) => r.post_id);
          setSelectedForOptimization(new Set(targetIds));
        }
      }
    } catch (err) {
      console.error("Failed to fetch SEO state:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/seo/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
    return null;
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/seo/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.status === "running") {
          // Keep polling
          if (!statusPollRef.current) {
            statusPollRef.current = setInterval(fetchStatus, 2000);
          }
        } else {
          // Stop polling and refresh data
          if (statusPollRef.current) {
            clearInterval(statusPollRef.current);
            statusPollRef.current = null;
            fetchState();
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const settingsData = await fetchSettings();
      await Promise.all([fetchState(settingsData), fetchStatus()]);
      setLoading(false);
    };
    init();

    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, []);

  const triggerRefresh = async (action: "all" | "sync" | "optimize" = "all", postIds?: number[]) => {
    if (status.status === "running") return;
    
    let infoMsg = "Starting WordPress live sync and optimization...";
    if (action === "sync") infoMsg = "Starting WooCommerce/WordPress content pull...";
    if (action === "optimize") infoMsg = "Starting Hermes keyword research & optimization...";
    
    showNotification("info", infoMsg);
    setStatus({ 
      status: "running", 
      step: action === "optimize" ? "Hermes Agent: Initializing..." : "Starting sync...", 
      progress: 5 
    });
    
    try {
      const res = await fetch("/api/seo/refresh", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postIds })
      });
      if (res.ok) {
        // Start polling immediately
        if (!statusPollRef.current) {
          statusPollRef.current = setInterval(fetchStatus, 1500);
        }
      } else {
        showNotification("error", `Failed to start ${action} process.`);
        fetchStatus();
      }
    } catch (err: any) {
      showNotification("error", err.message || `Failed to trigger ${action}.`);
      fetchStatus();
    }
  };

  const handleFieldChange = (postId: number, field: string, value: string) => {
    setState((prev: any) => {
      const recs = prev.recommendations.map((rec: any) => {
        if (rec.post_id === postId) {
          const updatedProposed = { ...rec.proposed, [field]: value };
          
          // Re-calculate simulated score dynamically
          updatedProposed.score = calculateSimulatedScore(
            updatedProposed.rank_math_title,
            updatedProposed.rank_math_description,
            updatedProposed.rank_math_focus_keyword,
            rec.slug
          );
          
          // Re-compute changed_fields
          const changed_fields = [];
          if (updatedProposed.rank_math_title !== rec.current.rank_math_title) {
            changed_fields.push("rank_math_title");
          }
          if (updatedProposed.rank_math_description !== rec.current.rank_math_description) {
            changed_fields.push("rank_math_description");
          }
          if (updatedProposed.rank_math_focus_keyword !== rec.current.rank_math_focus_keyword) {
            changed_fields.push("rank_math_focus_keyword");
          }

          return {
            ...rec,
            proposed: updatedProposed,
            changed_fields
          };
        }
        return rec;
      });

      return {
        ...prev,
        recommendations: recs,
        counts: {
          ...prev.counts,
          changed: recs.filter((r: any) => r.changed_fields && r.changed_fields.length > 0).length
        }
      };
    });
  };

  const handleApprovalChange = (postId: number, approved: boolean) => {
    setState((prev: any) => {
      const recs = prev.recommendations.map((rec: any) => {
        if (rec.post_id === postId) {
          return { ...rec, approved };
        }
        return rec;
      });
      return { ...prev, recommendations: recs };
    });
  };

  const toggleItemIgnore = (postId: number) => {
    setState((prev: any) => {
      const recs = (prev.recommendations || []).map((r: any) => {
        if (r.post_id === postId) {
          const wasIgnored = !!r.ignored;
          return { ...r, ignored: !wasIgnored };
        }
        return r;
      });
      return { ...prev, recommendations: recs };
    });
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state)
      });
      if (res.ok) {
        showNotification("success", "Saved changes locally.");
      } else {
        showNotification("error", "Failed to save changes.");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Error saving changes.");
    } finally {
      setSaving(false);
    }
  };

  const triggerPush = async () => {
    const approvedCount = state.recommendations.filter((r: any) => r.approved).length;
    if (approvedCount === 0) {
      showNotification("info", "Please approve at least one recommendation first.");
      return;
    }

    setPushing(true);
    showNotification("info", `Pushing ${approvedCount} approved updates via SSH to WordPress...`);
    try {
      const res = await fetch("/api/seo/push", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification("success", `Successfully pushed ${data.result.applied} of ${data.result.total} updates to the live site!`);
        // Refresh local state to load updated WordPress settings
        await fetchState();
      } else if (res.ok && !data.success && data.result) {
        showNotification("error", `Pushed ${data.result.applied} but ${data.result.failed} failed. Check server logs.`);
        await fetchState();
      } else {
        showNotification("error", data.error || "Failed to push updates to live site.");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Error pushing updates.");
    } finally {
      setPushing(false);
    }
  };

  const saveSettings = async (updatedSettings: any) => {
    try {
      const res = await fetch("/api/seo/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        setSettings(updatedSettings);
        showNotification("success", "Saved settings successfully.");
      } else {
        showNotification("error", "Failed to save settings.");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Error saving settings.");
    }
  };

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const approveAllVisible = () => {
    setState((prev: any) => {
      const recs = prev.recommendations.map((rec: any) => {
        const matchesTab = rec.content_type === activeTab;
        const matchesLang = langFilter === "all" || rec.language === langFilter;
        const matchesSearch = !searchQuery || 
          rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.slug.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (matchesTab && matchesLang && matchesSearch && rec.changed_fields.length > 0) {
          return { ...rec, approved: true };
        }
        return rec;
      });
      return { ...prev, recommendations: recs };
    });
    showNotification("success", "Approved all visible updates.");
  };

  // Filter recommendations based on active tab and search filters
  const filteredRecs = (state.recommendations || []).filter((rec: any) => {
    if (activeTab === "settings") return false;
    const matchesTab = rec.content_type === activeTab;
    const matchesLang = langFilter === "all" || rec.language === langFilter;
    const matchesStatus = !onlyPublished || rec.status === "publish";
    const matchesIgnore = !excludeIgnored || !rec.ignored;
    const matchesStaged = !showStagedOnly || (rec.notes?.includes("agent-optimized"));
    const matchesSearch = !searchQuery || 
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(rec.post_id).includes(searchQuery);

    return matchesTab && matchesLang && matchesStatus && matchesIgnore && matchesStaged && matchesSearch;
  });

  const totalApproved = (state.recommendations || []).filter((r: any) => r.approved).length;

  const getLanguageCount = (lang: string) => {
    return (state.recommendations || []).filter((r: any) => {
      const matchesTab = activeTab === "settings" ? true : r.content_type === activeTab;
      const matchesLang = lang === "all" ? true : r.language === lang;
      const matchesStatus = !onlyPublished || r.status === "publish";
      const matchesIgnore = !excludeIgnored || !r.ignored;
      const matchesStaged = !showStagedOnly || (r.notes?.includes("agent-optimized"));
      return matchesTab && matchesLang && matchesStatus && matchesIgnore && matchesStaged;
    }).length;
  };

  const isOptimizedState = (state.recommendations || []).some((r: any) => r.notes?.includes("agent-optimized"));
  const allVisibleSelected = filteredRecs.length > 0 && filteredRecs.every((r: any) => selectedForOptimization.has(r.post_id));
  const allVisibleApproved = filteredRecs.length > 0 && filteredRecs.every((r: any) => r.approved);

  const toggleAllVisibleForOptimization = () => {
    setSelectedForOptimization((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredRecs.forEach((r: any) => next.delete(r.post_id));
      } else {
        filteredRecs.forEach((r: any) => next.add(r.post_id));
      }
      return next;
    });
  };

  const toggleAllVisibleForApproval = () => {
    setState((prev: any) => {
      const nextVal = !allVisibleApproved;
      const recs = prev.recommendations.map((rec: any) => {
        const isVisible = filteredRecs.some((vr: any) => vr.post_id === rec.post_id);
        if (isVisible) {
          return { ...rec, approved: nextVal };
        }
        return rec;
      });
      return { ...prev, recommendations: recs };
    });
  };

  const toggleItemForOptimization = (postId: number) => {
    setSelectedForOptimization((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  if (activeTab === "settings") {
    return (
      <div className="space-y-6">
        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <RotateCw className="h-8 w-8 animate-spin text-[#4ade80]" />
            <p className="text-sm font-medium text-slate-400">Loading MaquiFit SEO Control Center...</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2 animate-in fade-in duration-300">
            {/* Scheduler Settings Card */}
            <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-emerald-400" />
                  Cron Schedule Config
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Setup periodic tasks for the Hermes agent to pull, analyze and propose SEO updates automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-slate-300">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Agent Schedule Frequency</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "daily", label: "Daily Sync" },
                      { id: "weekly", label: "Weekly Sync" },
                      { id: "manual", label: "Manual Only" },
                    ].map((sched) => (
                      <button
                        key={sched.id}
                        onClick={() => saveSettings({ ...settings, schedule: sched.id })}
                        className={`px-4 py-3 rounded-2xl border text-sm font-bold text-center transition-all cursor-pointer ${
                          settings.schedule === sched.id
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-white/5 bg-slate-900/40 text-slate-400 hover:border-white/10"
                        }`}
                      >
                        {sched.label}
                      </button>
                    ))}
                  </div>
                </div>

                {settings.schedule === "daily" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Trigger Daily At Hour</label>
                    <select
                      value={settings.dailyHour}
                      onChange={(e) => saveSettings({ ...settings, dailyHour: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, "0")}:00 ({i >= 12 ? "PM" : "AM"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Update Target Types</label>
                  <div className="grid gap-3">
                    {[
                      { id: "product", label: "E-Commerce Products", desc: "WooCommerce products (FR/EN/ES catalog items)" },
                      { id: "page", label: "Static Marketing Pages", desc: "Core navigation landing pages" },
                      { id: "post", label: "Blog Posts & Articles", desc: "Multilingual blog content" },
                    ].map((target) => {
                      const isChecked = settings.categories.includes(target.id);
                      return (
                        <div
                          key={target.id}
                          onClick={() => {
                            const updatedCats = isChecked
                              ? settings.categories.filter((c: string) => c !== target.id)
                              : [...settings.categories, target.id];
                            saveSettings({ ...settings, categories: updatedCats });
                          }}
                          className={`flex items-start gap-4 rounded-2xl border p-4 cursor-pointer transition-colors duration-200 ${
                            isChecked ? "border-emerald-400/20 bg-emerald-400/5" : "border-white/5 bg-slate-900/10 hover:bg-slate-900/35"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white">{target.label}</div>
                            <div className="text-xs text-slate-400 mt-1">{target.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Default Optimization Score Threshold</label>
                  <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white">Optimize Published Items Under:</span>
                      <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                        {settings.optimizeScoreThreshold ?? 80}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={settings.optimizeScoreThreshold ?? 80}
                        onChange={(e) => saveSettings({ ...settings, optimizeScoreThreshold: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400 select-none">
                      After a content pull, the optimization checkbox is automatically checked only for live published items whose current RankMath SEO score is strictly below this threshold.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Readiness Card */}
            <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Connection Readiness
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Connection check on credentials needed to perform the pull and push workflows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {credentials.map((credential) => (
                    <div
                      key={credential.label}
                      className={`rounded-2xl border p-4 transition-colors duration-200 ${
                        credential.present
                          ? "border-emerald-400/20 bg-emerald-400/5"
                          : "border-amber-400/20 bg-amber-400/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white">{credential.label}</div>
                          <div className="mt-1 text-xs leading-relaxed text-slate-400">{credential.helper}</div>
                        </div>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${credential.present ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                          {credential.present ? <Check className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {credential.present ? "Configured" : "Missing"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reset Data Card */}
            <Card className="border-rose-500/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl xl:col-span-2 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trash2 className="h-5 w-5 text-rose-400" />
                  Reset Workflow State
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Permanently purge all pulled and optimized local data, allowing you to start a fresh synchronization.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  This action will delete `workflow_state.json`, `inventory.json`, `translations.json`, and all cache files in your vault. Your cron settings will be preserved, but the dashboard data will be completely cleared.
                </div>
                <button
                  onClick={async () => {
                    const confirmReset = window.confirm("Are you sure you want to delete all cached inventory and SEO recommendations? This cannot be undone.");
                    if (!confirmReset) return;
                    
                    try {
                      showNotification("info", "Resetting data store...");
                      const res = await fetch("/api/seo/refresh", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "reset" })
                      });
                      
                      if (res.ok) {
                        showNotification("success", "Workflow state successfully reset to zero.");
                        setSelectedForOptimization(new Set());
                        await fetchState();
                      } else {
                        showNotification("error", "Failed to reset data.");
                      }
                    } catch (err: any) {
                      showNotification("error", err.message || "Error resetting data.");
                    }
                  }}
                  className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap"
                >
                  Reset Dashboard Data
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Main Control Panel Header */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.7)] flex flex-col md:flex-row gap-6 justify-between items-center select-none">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Custom Language Filter Dropdown */}
          <div className="relative">
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value as any)}
              className="appearance-none bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-white rounded-2xl px-4 py-2.5 pr-10 text-sm font-semibold focus:outline-none transition-all duration-200 cursor-pointer"
            >
              <option value="all">🌐 All Languages ({getLanguageCount("all")})</option>
              <option value="fr">🇫🇷 French (FR) ({getLanguageCount("fr")})</option>
              <option value="en">🇬🇧 English (EN) ({getLanguageCount("en")})</option>
              <option value="es">🇪🇸 Spanish (ES) ({getLanguageCount("es")})</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, slug, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 text-white rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-white/20 placeholder-slate-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Action Controls & Pipeline Status */}
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto justify-end">
          {status.status === "running" && (
            <div className="flex flex-col gap-1 w-full sm:w-60">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                <span className="truncate max-w-[80%]">{status.step}</span>
                <span>{status.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500 rounded-full" 
                  style={{ width: `${status.progress}%` }} 
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Inline Notification (Relocated to left of Sync Button) */}
            {notification && (
              <div className={`flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 shadow-md backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-300 ${
                notification.type === "success" 
                  ? "border-emerald-500/25 bg-emerald-950/45 text-emerald-300"
                  : notification.type === "error"
                  ? "border-rose-500/25 bg-rose-950/45 text-rose-300"
                  : "border-indigo-500/25 bg-indigo-950/45 text-indigo-300"
              }`}>
                {notification.type === "success" ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : notification.type === "info" ? (
                  <Sparkles className="h-4 w-4 shrink-0 text-indigo-400 animate-pulse" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span className="text-xs font-semibold tracking-wide truncate max-w-[120px] sm:max-w-[250px] md:max-w-[320px]">
                  {notification.message}
                </span>
              </div>
            )}

            {/* Sync Button */}
            <button
              onClick={() => triggerRefresh("sync")}
              disabled={status.status === "running" || loading}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                status.status === "running"
                  ? "bg-slate-900 border border-white/5 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              }`}
            >
              <RotateCw className={`h-4 w-4 ${status.status === "running" ? "animate-spin" : ""}`} />
              Sync
            </button>

             {/* Optimize Button */}
            <button
              onClick={() => {
                if (isOptimizedState) {
                  triggerRefresh("optimize");
                } else {
                  triggerRefresh("optimize", Array.from(selectedForOptimization));
                }
              }}
              disabled={
                status.status === "running" || 
                loading || 
                !state.recommendations || 
                state.recommendations.length === 0 ||
                (!isOptimizedState && selectedForOptimization.size === 0)
              }
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                status.status === "running" || loading || !state.recommendations || state.recommendations.length === 0
                  ? "bg-slate-900 border border-white/5 text-slate-500 cursor-not-allowed"
                  : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 cursor-pointer hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {isOptimizedState ? "Optimize" : `Optimize (${selectedForOptimization.size})`}
            </button>

            {/* Publish Button */}
            <button
              onClick={triggerPush}
              disabled={pushing || totalApproved === 0 || status.status === "running" || loading || !state.recommendations || state.recommendations.length === 0}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                totalApproved === 0 || pushing || status.status === "running" || loading || !state.recommendations || state.recommendations.length === 0
                  ? "bg-slate-900 border border-white/5 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Categories Tabs Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 select-none pb-2 sm:pb-0">
        <div className="flex gap-2">
          {[
            { id: "product", label: "Products", icon: ShoppingBag },
            { id: "page", label: "Pages", icon: FileText },
            { id: "post", label: "Posts", icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3.5 border-b-2 text-sm font-extrabold transition-all duration-200 -mb-px cursor-pointer ${
                  isActive
                    ? "border-[#4ade80] text-[#4ade80]"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {tab.label}
                <span className={`ml-1.5 px-2 py-0.5 text-[10px] rounded-full font-black ${
                  isActive ? "bg-[#4ade80]/15 text-[#4ade80]" : "bg-slate-900 text-slate-500"
                }`}>
                  {(state.recommendations || []).filter((r: any) => 
                    r.content_type === tab.id && 
                    (langFilter === "all" || r.language === langFilter) && 
                    (!onlyPublished || r.status === "publish") &&
                    (!excludeIgnored || !r.ignored) &&
                    (!showStagedOnly || r.notes?.includes("agent-optimized"))
                  ).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Checkboxes Filter Container */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400 mr-2 pb-3 sm:pb-0">
          <label className="flex items-center gap-2 hover:text-white cursor-pointer select-none bg-slate-900/30 border border-white/5 rounded-xl px-3 py-1.5 transition-all duration-200">
            <input
              type="checkbox"
              checked={onlyPublished}
              onChange={(e) => setOnlyPublished(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-[#4ade80] accent-[#4ade80] cursor-pointer focus:ring-0"
            />
            <span>Published Only</span>
          </label>

          <div className="flex items-center bg-slate-900/30 border border-white/5 rounded-xl transition-all duration-200 overflow-hidden">
            <div className="flex items-center justify-center pl-3 py-1.5 pr-2 border-r border-white/5 hover:bg-white/[0.02]">
              <input
                type="checkbox"
                checked={excludeIgnored}
                onChange={(e) => setExcludeIgnored(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-[#4ade80] accent-[#4ade80] cursor-pointer focus:ring-0"
                title="Toggle filter: Hide/Show Ignored items"
              />
            </div>
            <button
              onClick={() => setShowIgnoreColumn(!showIgnoreColumn)}
              className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:text-white cursor-pointer select-none flex items-center gap-1.5 ${
                showIgnoreColumn ? "bg-[#4ade80]/10 text-emerald-400 font-bold" : "text-slate-400 hover:bg-white/[0.02]"
              }`}
              title="Click to toggle visibility of the Ignore column"
            >
              <span>Hide Ignored</span>
              {showIgnoreColumn ? (
                <span className="text-[8px] font-black uppercase tracking-wider bg-[#4ade80]/20 text-[#4ade80] px-1.5 py-0.5 rounded border border-[#4ade80]/30 select-none">
                  Col ON
                </span>
              ) : (
                <span className="text-[8px] font-black uppercase tracking-wider bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-white/5 select-none">
                  Col OFF
                </span>
              )}
            </button>
          </div>

          <label className="flex items-center gap-2 hover:text-white cursor-pointer select-none bg-slate-900/30 border border-white/5 rounded-xl px-3 py-1.5 transition-all duration-200">
            <input
              type="checkbox"
              checked={showStagedOnly}
              onChange={(e) => setShowStagedOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-[#4ade80] accent-[#4ade80] cursor-pointer focus:ring-0"
            />
            <span>Staged Only</span>
          </label>
        </div>
      </div>

          {/* Uncheck All Option */}
          {!isOptimizedState && selectedForOptimization.size > 0 && (
            <button
              onClick={() => setSelectedForOptimization(new Set())}
              className="text-xs font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors px-4 py-2 cursor-pointer flex items-center gap-1.5"
            >
              <span>Uncheck All ({selectedForOptimization.size})</span>
            </button>
          )}

      {/* Main Grid View */}
      {loading ? (
        <div className="flex h-96 flex-col items-center justify-center gap-3">
          <RotateCw className="h-8 w-8 animate-spin text-[#4ade80]" />
          <p className="text-sm font-medium text-slate-400">Loading MaquiFit SEO Control Center...</p>
        </div>
      ) : filteredRecs.length === 0 ? (
        /* Empty State */
        <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/10 bg-slate-950/20 p-8 select-none">
          <Info className="h-8 w-8 text-slate-500" />
          <p className="text-sm font-medium text-slate-400">No items found matching the selected filters.</p>
          <button 
            onClick={() => triggerRefresh("sync")}
            className="text-xs font-bold text-[#4ade80] underline hover:text-[#22c55e] cursor-pointer mt-1"
          >
            Pull live data from site
          </button>
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.7)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/40 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="px-6 py-4 text-center w-24">Score</th>
                <th className="px-6 py-4">Title / Name</th>
                <th className="px-6 py-4 w-32">Language</th>
                <th className="px-6 py-4 w-32">Type</th>
                <th className="px-6 py-4 w-28 text-center">Status</th>
                <th className="px-6 py-4 w-32 text-center">Staged</th>
                {showIgnoreColumn && <th className="px-6 py-4 w-28 text-center">Ignore</th>}
                <th className="px-6 py-4 w-36 text-center cursor-pointer hover:text-white transition-colors" onClick={(e) => {
                  e.stopPropagation();
                  if (isOptimizedState) {
                    toggleAllVisibleForApproval();
                  } else {
                    toggleAllVisibleForOptimization();
                  }
                }}>
                  <div className="flex items-center justify-center gap-1.5 select-none">
                    <input
                      type="checkbox"
                      checked={isOptimizedState ? allVisibleApproved : allVisibleSelected}
                      onChange={() => {}} // parent th handles the click
                      className="h-4 w-4 rounded border-white/10 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer pointer-events-none focus:ring-0"
                    />
                    <span>{isOptimizedState ? "Approval" : "Optimize"}</span>
                  </div>
                </th>
                <th className="px-6 py-4 w-20 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecs.map((rec: any) => {
                const isExpanded = !!expandedRows[rec.post_id];
                const isItemOptimized = rec.notes?.includes("agent-optimized");
                const hasChanges = isItemOptimized && rec.changed_fields && rec.changed_fields.length > 0;
                const score = rec.current?.score ?? rec.raw?.rankmath?.score ?? null;
                
                // Score styling matching circular progress ring logic
                let scoreBg = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                if (score !== null) {
                  if (score >= 80) {
                    scoreBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  } else if (score >= 50) {
                    scoreBg = "bg-amber-500/10 text-amber-400 border-amber-400/20";
                  }
                } else {
                  scoreBg = "bg-slate-800/40 text-slate-500 border-slate-800/60";
                }

                return (
                  <React.Fragment key={rec.post_id}>
                    {/* Main Row */}
                    <tr 
                      onClick={() => setExpandedRows(prev => ({ ...prev, [rec.post_id]: !prev[rec.post_id] }))}
                      className={`hover:bg-white/[0.02] transition-colors cursor-pointer select-none ${
                        isExpanded ? "bg-white/[0.01]" : ""
                      } ${
                        rec.notes?.includes("agent-optimized") 
                          ? "bg-indigo-950/5 hover:bg-indigo-950/10" 
                          : ""
                      }`}
                    >
                      {/* Score Badge */}
                      <td className={`px-6 py-4 text-center transition-all duration-200 ${
                        rec.notes?.includes("agent-optimized") 
                          ? "border-l-4 border-indigo-500 bg-indigo-500/5" 
                          : "border-l-4 border-transparent"
                      }`}>
                        <div className="flex items-center justify-center gap-1.5 select-none">
                          <span className={`inline-flex items-center justify-center font-black text-[10px] w-7 h-7 rounded-full border ${scoreBg}`}>
                            {score !== null ? score : "—"}
                          </span>
                          
                          {/* If score has changed and item was optimized, show arrow and new score! */}
                          {rec.notes?.includes("agent-optimized") && rec.proposed?.score !== undefined && rec.proposed?.score !== score && (
                            <>
                              <span className="text-slate-500 font-bold text-xs">➔</span>
                              <span className={`inline-flex items-center justify-center font-black text-[10px] w-7 h-7 rounded-full border ${
                                rec.proposed.score >= 80 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : rec.proposed.score >= 50 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-400/20" 
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}>
                                {rec.proposed.score}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      
                      {/* Title / Name */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-sm truncate leading-tight group-hover:text-emerald-400 transition-colors">
                            {rec.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            ID: {rec.post_id} | {rec.slug}
                          </span>
                        </div>
                      </td>

                      {/* Language */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                          {rec.language === "fr" ? "🇫🇷 FR" : rec.language === "es" ? "🇪🇸 ES" : "🇬🇧 EN"}
                        </span>
                      </td>

                      {/* Content Type */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-400 capitalize">
                          {rec.content_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          rec.status === "publish" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {rec.status || "draft"}
                        </span>
                      </td>

                      {/* Staged Changes Indicator */}
                      <td className="px-6 py-4 text-center">
                        {hasChanges ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 px-2 py-0.5 rounded-full">
                            <Sparkles className="h-3 w-3" />
                            Staged ({rec.changed_fields.length})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold">Aligned</span>
                        )}
                      </td>

                      {/* Ignore Toggle Column */}
                      {showIgnoreColumn && (
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleItemIgnore(rec.post_id)}
                            className={`p-2 bg-slate-900 border rounded-xl transition-all duration-200 cursor-pointer inline-flex items-center justify-center ${
                              rec.ignored
                                ? "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15"
                                : "border-white/5 hover:border-white/10 hover:bg-slate-800"
                            }`}
                            title={rec.ignored ? "Restore item to Active list" : "Ignore item"}
                          >
                            {rec.ignored ? (
                              <EyeOff className="h-4.5 w-4.5 text-rose-400" />
                            ) : (
                              <Eye className="h-4.5 w-4.5 text-slate-400 hover:text-white" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* Selection / Approval Checkbox */}
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isOptimizedState ? (rec.approved || false) : selectedForOptimization.has(rec.post_id)}
                          onChange={(e) => {
                            if (isOptimizedState) {
                              handleApprovalChange(rec.post_id, e.target.checked);
                            } else {
                              toggleItemForOptimization(rec.post_id);
                            }
                          }}
                          className="h-4.5 w-4.5 rounded border-white/10 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                        />
                      </td>

                      {/* Expand / Collapse Button */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                          {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                        </span>
                      </td>
                    </tr>

                    {/* Expanding Row containing Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-6 py-5 bg-slate-950/60 border-t border-b border-white/5">
                          <div className="grid gap-6 lg:grid-cols-2">
                            {/* Current Meta */}
                            <div className="rounded-2xl border border-white/5 bg-slate-900/35 p-4 space-y-3 shadow-inner">
                              <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 flex items-center justify-between select-none">
                                <span className="flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5" />
                                  Current Metadata
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                                  Score: {score !== null ? score : "—"}
                                </span>
                              </h4>
                              <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SEO Title</div>
                                <div className="text-sm font-semibold text-slate-300 mt-0.5 break-words">
                                  {rec.current?.rank_math_title || <span className="italic text-slate-600">No title set</span>}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meta Description</div>
                                <div className="text-xs text-slate-400 mt-0.5 break-words leading-relaxed">
                                  {rec.current?.rank_math_description || <span className="italic text-slate-600">No description set</span>}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Focus Keyword</div>
                                <div className="text-xs text-slate-400 mt-0.5 break-words font-mono">
                                  {rec.current?.rank_math_focus_keyword || <span className="italic text-slate-600">None</span>}
                                </div>
                              </div>
                            </div>

                            {/* Proposed Meta (Editable) */}
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                                hasChanges ? "border-emerald-500/15 bg-emerald-950/5" : "border-white/5 bg-slate-900/35"
                              }`}
                            >
                              <h4 className="text-xs font-black uppercase tracking-[0.16em] text-[#4ade80] flex items-center justify-between select-none">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Proposed Metadata
                                </span>
                                <div className="flex items-center gap-2">
                                  {hasChanges && (
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/25 px-1.5 py-0.5 rounded text-emerald-300">
                                      Staged
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    rec.notes?.includes("agent-optimized")
                                      ? (rec.proposed?.score >= 80 
                                        ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30" 
                                        : rec.proposed?.score >= 50 
                                        ? "bg-amber-500/25 text-amber-300 border border-amber-500/30" 
                                        : "bg-rose-500/25 text-rose-300 border border-rose-500/30")
                                      : "bg-slate-800 text-slate-500"
                                  }`}>
                                    Est. Score: {rec.notes?.includes("agent-optimized") && rec.proposed?.score !== undefined ? rec.proposed.score : "—"}
                                  </span>
                                </div>
                              </h4>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">SEO Title</label>
                                <input
                                  type="text"
                                  value={rec.proposed?.rank_math_title || ""}
                                  onChange={(e) => handleFieldChange(rec.post_id, "rank_math_title", e.target.value)}
                                  className="w-full bg-slate-900/60 border border-white/5 text-sm text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500/30"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Meta Description</label>
                                <textarea
                                  value={rec.proposed?.rank_math_description || ""}
                                  onChange={(e) => handleFieldChange(rec.post_id, "rank_math_description", e.target.value)}
                                  className="w-full min-h-[50px] bg-slate-900/60 border border-white/5 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500/30 leading-relaxed resize-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Focus Keyword</label>
                                <input
                                  type="text"
                                  value={rec.proposed?.rank_math_focus_keyword || ""}
                                  onChange={(e) => handleFieldChange(rec.post_id, "rank_math_focus_keyword", e.target.value)}
                                  className="w-full bg-slate-900/60 border border-white/5 text-xs font-mono text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500/30"
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Action Bar (Approvals / Bulk Operations) */}
      {filteredRecs.length > 0 && (
        <div className="sticky bottom-6 z-40 rounded-3xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.9)] flex justify-between items-center select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              {totalApproved} Approved changes
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={approveAllVisible}
              className="px-4 py-2 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Approve All Visible
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-4 py-2 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              {saving ? "Saving..." : "Save State"}
            </button>
            <button
              onClick={triggerPush}
              disabled={pushing || totalApproved === 0}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                totalApproved === 0 || pushing
                  ? "bg-slate-900 border border-white/5 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer"
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              {pushing ? "Pushing..." : "Push Updates"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
