"use client";

import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  FileText, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  RotateCw, 
  Info,
  ArrowUpRight,
  Globe
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SeoDashboardAnalytics() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/seo");
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error("Failed to fetch SEO stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <RotateCw className="h-8 w-8 animate-spin text-[#00d4ff]" />
        <p className="text-sm font-medium text-slate-400">Analyzing SEO profile and statistics...</p>
      </div>
    );
  }

  if (!state || !state.recommendations || state.recommendations.length === 0) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/10 bg-slate-950/20 p-8 select-none">
        <Info className="h-8 w-8 text-slate-500" />
        <p className="text-sm font-medium text-slate-400">No SEO data available. Pull live data first.</p>
      </div>
    );
  }

  const recs = (state.recommendations || []).filter((r: any) => !r.ignored);
  const totalItems = recs.length;

  // 1. Categories stats
  const products = recs.filter((r: any) => r.content_type === "product");
  const pages = recs.filter((r: any) => r.content_type === "page");
  const posts = recs.filter((r: any) => r.content_type === "post");

  // 2. Language stats
  const frItems = recs.filter((r: any) => r.language === "fr");
  const enItems = recs.filter((r: any) => r.language === "en");
  const esItems = recs.filter((r: any) => r.language === "es");

  // 3. Optimization pipeline states
  const optimized = recs.filter((r: any) => r.notes?.includes("agent-optimized"));
  const pending = recs.filter((r: any) => !r.notes?.includes("agent-optimized"));
  const approved = recs.filter((r: any) => r.approved);
  const staged = recs.filter((r: any) => r.changed_fields && r.changed_fields.length > 0 && !r.approved);

  // 4. Scores math
  const getAverageScore = (items: any[], type: "current" | "proposed") => {
    if (items.length === 0) return 0;
    const total = items.reduce((acc: number, curr: any) => {
      const val = type === "current" 
        ? (curr.current?.score ?? 0)
        : (curr.notes?.includes("agent-optimized") ? (curr.proposed?.score ?? 0) : (curr.current?.score ?? 0));
      return acc + val;
    }, 0);
    return Math.round(total / items.length);
  };

  const avgCurrent = getAverageScore(recs, "current");
  const avgProposed = getAverageScore(recs, "proposed");
  const scoreUplift = avgProposed - avgCurrent;

  // 5. Score distributions
  const getDistribution = (items: any[], type: "current" | "proposed") => {
    let good = 0; // 80-100
    let fair = 0; // 50-79
    let poor = 0; // <50

    items.forEach((item: any) => {
      const score = type === "current"
        ? (item.current?.score ?? 0)
        : (item.notes?.includes("agent-optimized") ? (item.proposed?.score ?? 0) : (item.current?.score ?? 0));
      
      if (score >= 80) good++;
      else if (score >= 50) fair++;
      else poor++;
    });

    return { good, fair, poor };
  };

  const currentDist = getDistribution(recs, "current");
  const proposedDist = getDistribution(recs, "proposed");

  // 6. Quick wins (low scores that can be optimized)
  const quickWins = [...recs]
    .filter((r: any) => (r.current?.score ?? 0) < 60)
    .sort((a: any, b: any) => (a.current?.score ?? 0) - (b.current?.score ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Metric 1: Catalog */}
        <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Profiled Items</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{totalItems}</span>
                <span className="text-xs text-slate-500">items</span>
              </div>
              <div className="flex gap-2 text-[10px] font-black text-slate-400">
                <span className="flex items-center gap-0.5"><ShoppingBag className="h-3 w-3" /> {products.length}</span>
                <span className="flex items-center gap-0.5"><FileText className="h-3 w-3" /> {pages.length}</span>
                <span className="flex items-center gap-0.5"><Layers className="h-3 w-3" /> {posts.length}</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl border border-white/5 bg-slate-900/60 flex items-center justify-center text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.15)]">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: SEO Health */}
        <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">SEO Health Index</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{avgCurrent}%</span>
                {scoreUplift > 0 && (
                  <span className="text-xs font-black text-emerald-400 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-0.5" /> +{scoreUplift}% Potential
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">
                Average local estimated score across catalog.
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl border border-white/5 bg-slate-900/60 flex items-center justify-center text-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.15)]">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Optimization Coverage */}
        <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Optimization Coverage</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {Math.round((optimized.length / totalItems) * 100)}%
                </span>
                <span className="text-xs text-slate-500">({optimized.length}/{totalItems})</span>
              </div>
              <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-full"
                  style={{ width: `${(optimized.length / totalItems) * 100}%` }}
                />
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl border border-white/5 bg-slate-900/60 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <Sparkles className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Staged Pipeline */}
        <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Staging Pipeline</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{approved.length}</span>
                <span className="text-xs text-slate-500">approved / {staged.length} staged</span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Waiting to push back to WP.
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl border border-white/5 bg-slate-900/60 flex items-center justify-center text-[#4ade80] shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Score Distribution Chart */}
        <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#00d4ff]" />
              Health Score Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Comparison of current SEO scores vs proposed/optimized scores across catalog items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Visual Chart Bars */}
            <div className="space-y-4">
              
              {/* Distribution Row 1: Good (80+) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Good (Score 80–100)</span>
                  <span>Current: {currentDist.good} | Optimized: {proposedDist.good}</span>
                </div>
                <div className="h-3 w-full bg-slate-900 rounded-full flex overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500/30 transition-all duration-500"
                    style={{ width: `${(currentDist.good / totalItems) * 100}%` }}
                    title={`Current: ${currentDist.good}`}
                  />
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-500 border-l border-emerald-300"
                    style={{ width: `${Math.max(0, ((proposedDist.good - currentDist.good) / totalItems) * 100)}%` }}
                    title={`Uplift to: ${proposedDist.good}`}
                  />
                </div>
              </div>

              {/* Distribution Row 2: Fair (50-79) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Fair (Score 50–79)</span>
                  <span>Current: {currentDist.fair} | Optimized: {proposedDist.fair}</span>
                </div>
                <div className="h-3 w-full bg-slate-900 rounded-full flex overflow-hidden">
                  <div 
                    className="h-full bg-amber-500/30 transition-all duration-500"
                    style={{ width: `${(currentDist.fair / totalItems) * 100}%` }}
                    title={`Current: ${currentDist.fair}`}
                  />
                  <div 
                    className="h-full bg-amber-400 transition-all duration-500 border-l border-amber-300"
                    style={{ width: `${Math.max(0, ((proposedDist.fair - currentDist.fair) / totalItems) * 100)}%` }}
                    title={`Change to: ${proposedDist.fair}`}
                  />
                </div>
              </div>

              {/* Distribution Row 3: Poor (<50) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Critical (Score &lt; 50)</span>
                  <span>Current: {currentDist.poor} | Optimized: {proposedDist.poor}</span>
                </div>
                <div className="h-3 w-full bg-slate-900 rounded-full flex overflow-hidden">
                  <div 
                    className="h-full bg-rose-500/30 transition-all duration-500"
                    style={{ width: `${(currentDist.poor / totalItems) * 100}%` }}
                    title={`Current: ${currentDist.poor}`}
                  />
                  <div 
                    className="h-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, ((proposedDist.poor - currentDist.poor) / totalItems) * 100)}%` }}
                    title={`Change to: ${proposedDist.poor}`}
                  />
                </div>
              </div>

            </div>

            <div className="p-4 rounded-2xl bg-slate-900/30 border border-white/5 text-xs text-slate-400 select-none leading-relaxed flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-[#00d4ff]" />
              <div>
                The bright color segment represents the **potential SEO lift** after applying all staging recommendations. 
                Optimizing your catalog will increase good profiles from **{currentDist.good}** to **{proposedDist.good}** items.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Segment Performance */}
        <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-400" />
              Segment & Language Performance
            </CardTitle>
            <CardDescription className="text-slate-400">
              Average SEO scores grouped by content type and language.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* Left: Content Type Averages */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">By Content Type</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Products ({products.length})</span>
                    <span>{getAverageScore(products, "current")}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00d4ff] rounded-full" style={{ width: `${getAverageScore(products, "current")}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Pages ({pages.length})</span>
                    <span>{getAverageScore(pages, "current")}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${getAverageScore(pages, "current")}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Posts ({posts.length})</span>
                    <span>{getAverageScore(posts, "current")}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${getAverageScore(posts, "current")}%` }} />
                  </div>
                </div>

              </div>

              {/* Right: Language Averages */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">By Language</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>🇨🇦 French ({frItems.length})</span>
                    <span>{getAverageScore(frItems, "current")}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${getAverageScore(frItems, "current")}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>🇺🇸 English ({enItems.length})</span>
                    <span>{getAverageScore(enItems, "current")}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-400 rounded-full" style={{ width: `${getAverageScore(enItems, "current")}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>🇪🇸 Spanish ({esItems.length})</span>
                    <span>{getAverageScore(esItems, "current")}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${getAverageScore(esItems, "current")}%` }} />
                  </div>
                </div>

              </div>

            </div>

          </CardContent>
        </Card>
      </div>

      {/* Quick Wins Card (Low scores) */}
      <Card className="border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-xl rounded-3xl select-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Top Actionable SEO Quick Wins
            </CardTitle>
            <CardDescription className="text-slate-400">
              Low-scoring published items with high optimization potential. Fix these first to maximize traffic improvements.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/35 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Lang</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {quickWins.map((item: any) => (
                  <tr key={item.post_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-500">#{item.post_id}</td>
                    <td className="px-4 py-3 font-semibold text-white truncate max-w-[240px]" title={item.title}>
                      {item.title}
                    </td>
                    <td className="px-4 py-3 capitalize font-medium">{item.content_type}</td>
                    <td className="px-4 py-3 uppercase font-bold text-[10px] text-slate-400">
                      {item.language === "fr" ? "🇫🇷 FR" : item.language === "en" ? "🇬🇧 EN" : "🇪🇸 ES"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                        (item.current?.score ?? 0) >= 80 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : (item.current?.score ?? 0) >= 50
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {item.current?.score ?? "—"}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a 
                        href={`/dashboard/seo?tab=${item.content_type}&id=${item.post_id}`} 
                        className="inline-flex items-center gap-1 text-[#00d4ff] hover:text-[#00d4ff]/80 font-bold hover:underline"
                      >
                        Optimize <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
