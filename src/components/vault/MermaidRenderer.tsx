"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  chart: string;
}

// Global initialization to avoid double-init issues
let mermaidInitialized = false;

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          background: "#050816",
          primaryColor: "#8b5cf6",
          primaryTextColor: "#ffffff",
          lineColor: "#00d4ff",
          secondaryColor: "#00d4ff",
          tertiaryColor: "#050816",
        },
        securityLevel: "loose",
      });
      mermaidInitialized = true;
    }
  }, []);

  useEffect(() => {
    let active = true;
    setSvg("");
    setError(null);

    const renderChart = async () => {
      if (!containerRef.current) return;
      
      const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
      
      try {
        // Clean chart input
        const cleanChart = chart.trim();
        
        // Parse verification first
        await mermaid.parse(cleanChart);
        
        // Render
        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanChart);
        
        if (active) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error("Mermaid parsing/rendering error:", err);
        if (active) {
          setError(err.message || "Failed to parse Mermaid diagram syntax.");
        }
      }
    };

    renderChart();

    return () => {
      active = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-4 font-mono text-xs text-rose-300">
        <div className="font-extrabold uppercase mb-2">Mermaid Render Error</div>
        <p className="whitespace-pre-wrap">{error}</p>
        <pre className="mt-4 overflow-x-auto rounded border border-rose-500/10 bg-slate-950 p-2 font-mono text-[10px] text-slate-400">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex h-48 items-center justify-center text-slate-500 text-xs font-mono">
        <span className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent mr-2" />
        Processing flowchart vectors...
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center overflow-x-auto bg-[#050816] p-6 rounded-2xl border border-white/5 shadow-inner"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
