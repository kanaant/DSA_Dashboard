"use client";

import { useEffect, useState } from "react";
import { BookOpen, Copy, Eye, FileCode, MessageSquare, Save, Send, ShieldAlert, Sparkles, Terminal, Trash2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

import { MermaidRenderer } from "./MermaidRenderer";
import { VaultActions } from "./VaultActions";
import { VaultStatusComment } from "@/lib/vault-data";

interface VaultPreviewerProps {
  filePath: string | null;
  projectId: string | null;
  content: string;
  mimeType: string;
  comments: VaultStatusComment[];
  onSave: (filePath: string, updatedContent: string) => Promise<void>;
  isLoading: boolean;
  onActionComplete: (outputPath: string) => void;
  onRefreshComments: () => void;
}

export function VaultPreviewer({
  filePath,
  projectId,
  content,
  mimeType,
  comments,
  onSave,
  isLoading,
  onActionComplete,
  onRefreshComments
}: VaultPreviewerProps) {
  const [viewMode, setViewMode] = useState<"render" | "raw">("render");
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    setEditorContent(content);
    // Default to render for previewable files, raw for code/json
    const ext = filePath?.split(".").pop()?.toLowerCase() || "";
    const isCode = ["js", "jsx", "ts", "tsx", "py", "css", "json", "excalidraw"].includes(ext);
    setViewMode(isCode ? "raw" : "render");
  }, [content, filePath]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-2xl border border-white/5 bg-slate-950/45 backdrop-blur-2xl">
        <div className="relative mb-4 flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#00d4ff]/10" />
          <div className="absolute inset-0 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-bold text-slate-300 animate-pulse uppercase tracking-[0.2em]">
          Decrypting Vault Object...
        </p>
      </div>
    );
  }

  if (!filePath) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-2xl border border-white/5 bg-slate-950/45 p-8 text-center backdrop-blur-2xl relative select-none">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/20 to-transparent" />
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/5 bg-slate-900/50 text-[#00d4ff]/40 shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]">
          <BookOpen className="h-10 w-10 animate-pulse text-[#00d4ff]/45" />
        </div>
        <h3 className="text-lg font-extrabold uppercase tracking-[0.2em] text-white">
          Secure Object Previewer
        </h3>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
          SELECT A SHIELD-CONFEDERATED FILE OBJECT FROM THE CORE DIRECTORY TREE ON THE LEFT TO COMMENCE TELEMETRY PREVIEW.
        </p>
      </div>
    );
  }

  const fileExt = filePath.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(fileExt);
  const isPdf = fileExt === "pdf";
  const isOfficeDoc = ["doc", "docx", "xls", "xlsx", "gdoc", "gsheet"].includes(fileExt);
  
  const isPreviewable = ["md", "html", "mmd", "excalidraw"].includes(fileExt) || isImage || isPdf || isOfficeDoc;
  const isTextPreviewable = ["md", "html", "mmd", "excalidraw"].includes(fileExt);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(filePath, editorContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !filePath) return;
    try {
      const res = await fetch("/api/vault/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: filePath,
          author: "Operator", // Default author is Operator
          text: newCommentText.trim()
        })
      });
      if (res.ok) {
        setNewCommentText("");
        onRefreshComments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Excalidraw Static SVG Renderer (read-only parser)
  const renderExcalidraw = () => {
    try {
      const data = JSON.parse(content);
      const elements = data.elements || [];
      if (elements.length === 0) {
        return <div className="text-center py-10 text-slate-500 text-xs font-mono">Excalidraw contains no elements.</div>;
      }

      // Compute bounding box
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      elements.forEach((el: any) => {
        if (el.isDeleted) return;
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 0));
        maxY = Math.max(maxY, el.y + (el.height || 0));
      });

      const padding = 40;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;
      const viewX = minX - padding;
      const viewY = minY - padding;

      return (
        <div className="flex flex-col items-center justify-center p-6 bg-[#050816] rounded-2xl border border-white/5 shadow-inner overflow-auto max-h-[60vh]">
          <svg
            width="100%"
            height="100%"
            viewBox={`${viewX} ${viewY} ${width} ${height}`}
            className="max-w-full"
            style={{ minWidth: Math.min(width, 600), maxHeight: "50vh" }}
          >
            {elements.map((el: any) => {
              if (el.isDeleted) return null;
              
              const stroke = el.strokeColor || "#00d4ff";
              const fill = el.backgroundColor === "transparent" ? "none" : (el.backgroundColor || "rgba(0, 212, 255, 0.1)");
              const strokeWidth = el.strokeWidth || 2;
              const rounded = el.roundness ? 8 : 0;

              if (el.type === "rectangle") {
                return (
                  <rect
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    stroke={stroke}
                    fill={fill}
                    strokeWidth={strokeWidth}
                    rx={rounded}
                    ry={rounded}
                  />
                );
              }

              if (el.type === "ellipse") {
                return (
                  <ellipse
                    key={el.id}
                    cx={el.x + el.width / 2}
                    cy={el.y + el.height / 2}
                    rx={el.width / 2}
                    ry={el.height / 2}
                    stroke={stroke}
                    fill={fill}
                    strokeWidth={strokeWidth}
                  />
                );
              }

              if (el.type === "arrow" || el.type === "line") {
                const points = el.points || [];
                if (points.length < 2) return null;
                const pathData = points
                  .map((p: any, idx: number) => `${idx === 0 ? "M" : "L"} ${el.x + p[0]} ${el.y + p[1]}`)
                  .join(" ");

                return (
                  <path
                    key={el.id}
                    d={pathData}
                    stroke={stroke}
                    fill="none"
                    strokeWidth={strokeWidth}
                    markerEnd={el.type === "arrow" ? "url(#arrowhead)" : undefined}
                  />
                );
              }

              if (el.type === "text") {
                return (
                  <text
                    key={el.id}
                    x={el.x}
                    y={el.y + (el.height || 18) / 1.4}
                    fill={stroke}
                    fontSize={el.fontSize || 16}
                    fontFamily="monospace"
                    textAnchor="start"
                  >
                    {el.text}
                  </text>
                );
              }

              return null;
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="8"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff" />
              </marker>
            </defs>
          </svg>
        </div>
      );
    } catch {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-rose-400 font-mono text-xs">
          <ShieldAlert className="h-8 w-8 mb-2" />
          Excalidraw parse failed. Invalid JSON structure.
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* File Header Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-2xl shadow-[0_12px_30px_rgba(2,6,23,0.4)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00d4ff]/20 bg-[#00d4ff]/10 text-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.08)]">
            {isPreviewable ? <Eye className="h-4.5 w-4.5" /> : <FileCode className="h-4.5 w-4.5" />}
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">
              Jailed Object Path
            </div>
            <div className="text-sm font-bold text-white font-mono">{filePath}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {copied ? (
            <button className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-400 select-none">
              Copied!
            </button>
          ) : (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-black/30 px-3.5 py-2 text-xs font-bold text-slate-300 transition-all duration-300 hover:border-white/10 hover:bg-black/50 hover:text-white"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          )}

          {isTextPreviewable && (
            <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
              <button
                onClick={() => setViewMode("render")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-300 ${
                  viewMode === "render"
                    ? "bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_10px_rgba(0,212,255,0.1)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Render
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-300 ${
                  viewMode === "raw"
                    ? "bg-[#8b5cf6]/15 text-[#c084fc] shadow-[0_0_10px_rgba(139,92,246,0.1)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                Raw
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === "render" && isPreviewable ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.6)] min-h-[50vh]">
          {fileExt === "md" && (
            <article className="max-w-none text-slate-300">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeHighlight]}
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-black text-white mt-8 mb-4 border-b border-white/10 pb-2 tracking-wide font-mono uppercase">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold text-[#00d4ff] mt-6 mb-3 tracking-wide">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-bold text-slate-200 mt-5 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-sm text-slate-300 leading-relaxed mb-4">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-sm text-slate-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-sm text-slate-300">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-[#00d4ff] pl-4 italic text-slate-400 my-4 bg-slate-900/30 p-3 rounded-r-2xl font-mono text-[11px] leading-relaxed">{children}</blockquote>,
                  hr: () => <hr className="my-6 border-t border-white/10" />,
                  table: ({ children }) => <div className="overflow-x-auto my-6 border border-white/10 rounded-xl bg-slate-950/40"><table className="w-full text-left border-collapse text-xs sm:text-sm">{children}</table></div>,
                  thead: ({ children }) => <thead className="bg-slate-900/60 border-b border-white/10 font-bold uppercase tracking-wider text-[10px] text-slate-400">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
                  tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
                  th: ({ children }) => <th className="p-3 font-semibold">{children}</th>,
                  td: ({ children }) => <td className="p-3 text-slate-300 leading-relaxed">{children}</td>,
                  strong: ({ children }) => <strong className="font-extrabold text-white">{children}</strong>,
                  em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                  a: ({ href, children }) => <a href={href} className="text-[#00d4ff] font-bold hover:underline hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>,
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const lang = match ? match[1] : "";
                    const codeString = String(children).replace(/\n$/, "");
                    
                    if (!inline && lang === "mermaid") {
                      return <MermaidRenderer chart={codeString} />;
                    }
                    
                    return (
                      <code className={`${className} bg-slate-900/70 border border-white/5 text-[#c084fc] px-1.5 py-0.5 rounded font-mono text-xs`} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          )}

          {fileExt === "html" && (
            <div className="relative">
              <div className="absolute top-2 left-4 z-20 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-[#050816] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                Sandboxed HTML Container
              </div>
              <iframe
                srcDoc={content}
                sandbox="allow-scripts"
                className="w-full min-h-[55vh] rounded-xl border border-white/5 bg-[#050816] shadow-2xl relative z-10"
              />
            </div>
          )}

          {fileExt === "mmd" && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-[#00d4ff] w-max">
                Mermaid Flowchart Vector
              </div>
              <MermaidRenderer chart={content} />
            </div>
          )}

          {fileExt === "excalidraw" && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-[#c084fc] w-max">
                Excalidraw SVG Canvas
              </div>
              {renderExcalidraw()}
            </div>
          )}

          {/* Raster Image visualizer */}
          {isImage && (
            <div className="flex flex-col items-center justify-center p-4 bg-[#050816] rounded-2xl border border-white/5 shadow-inner overflow-auto max-h-[60vh] select-none">
              <img
                src={content}
                alt={filePath.split("/").pop()}
                className="max-w-full max-h-[50vh] rounded-lg border border-white/10 shadow-2xl object-contain animate-fadeIn"
              />
              <span className="mt-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                RAW RASTER RENDER ({fileExt})
              </span>
            </div>
          )}

          {/* Sandboxed PDF previewer */}
          {isPdf && (
            <div className="relative">
              <div className="absolute top-2 left-4 z-20 flex items-center gap-1.5 rounded-full border border-[#00d4ff]/30 bg-[#050816] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-[#00d4ff]">
                Secure PDF Sandbox Document
              </div>
              <iframe
                src={content}
                className="w-full min-h-[55vh] rounded-xl border border-white/5 bg-[#050816] shadow-2xl relative z-10"
              />
            </div>
          )}

          {/* Office/Google doc download and external suites command deck */}
          {isOfficeDoc && (
            <div className="flex flex-col items-center justify-center p-8 text-center relative select-none bg-slate-900/10 rounded-2xl border border-white/5 min-h-[40vh]">
              <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/20 to-transparent" />
              
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/5 bg-[#050816] text-[#8b5cf6] shadow-[0_0_20px_rgba(139,92,246,0.15)] relative">
                <FileCode className="h-10 w-10 text-[#c084fc] animate-pulse" />
                <div className="absolute -bottom-1.5 -right-1.5 rounded-md bg-[#8b5cf6] px-1.5 py-0.5 text-[8px] font-black uppercase text-white tracking-widest shadow-md">
                  {fileExt}
                </div>
              </div>

              <h3 className="text-base font-extrabold uppercase tracking-[0.15em] text-white">
                Secure Binary Artifact
              </h3>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400 font-mono">
                OBJECT: {filePath.split("/").pop()}
              </p>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-slate-500">
                This document object is stored securely inside the jailed sandbox. It can be downloaded and opened with external suites (like Google Workspace, Office 365, or local system tools).
              </p>

              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <a
                  href={content}
                  download={filePath.split("/").pop()}
                  className="h-9 px-5 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] text-[10px] uppercase tracking-wider font-black flex items-center justify-center gap-1.5 rounded-xl transition-all duration-300 active:scale-95 border border-white/10"
                >
                  <Save className="h-4 w-4" />
                  <span>Download Object</span>
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Raw Code / Text Editor */
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.6)]">
          <div className="relative">
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="w-full min-h-[50vh] rounded-xl border border-white/5 bg-[#050816] p-4 font-mono text-xs text-[#00d4ff] shadow-inner focus:border-[#00d4ff]/30 focus:outline-none"
              style={{
                backgroundImage: "linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px)",
                backgroundSize: "100% 24px",
                lineHeight: "24px"
              }}
            />

            {/* Floating Editor Actions */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              {saveSuccess && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/20 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                  Success
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-4 py-2 text-xs font-bold text-[#00d4ff] transition-all duration-300 hover:border-[#00d4ff]/50 hover:bg-[#00d4ff]/20"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document comments Notes Board */}
      {filePath && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(2,6,23,0.6)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 select-none">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#00d4ff]" />
              Secure Notes Board
            </h3>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest bg-slate-900 border border-white/5 px-2 py-0.5 rounded-md">
              {comments.length} transmitted notes
            </span>
          </div>

          {/* Comment list */}
          {comments.length === 0 ? (
            <div className="text-center py-6 text-slate-500 font-mono text-[9px] uppercase tracking-wider select-none">
              No tactical notes recorded on this object.
            </div>
          ) : (
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="group flex gap-3 rounded-xl border border-white/5 bg-slate-900/20 p-3 hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/5 text-[#00d4ff]">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">{comment.author}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(comment.timestamp).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this note?")) return;
                            try {
                              const res = await fetch("/api/vault/comments", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ path: filePath, commentId: comment.id })
                              });
                              if (res.ok) {
                                onRefreshComments();
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[#a8a29e] hover:text-rose-400 transition-all rounded hover:bg-white/5 cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed break-words">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Record tactical comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddComment();
              }}
              className="flex-1 bg-[#050816] text-[#00d4ff] border border-white/10 px-3 py-2 rounded-xl font-mono text-xs focus:outline-none focus:border-[#00d4ff]/30 placeholder-slate-600"
            />
            <button
              onClick={handleAddComment}
              className="h-9 px-4 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 shadow-sm shadow-cyan-950/20 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Transmit</span>
            </button>
          </div>
        </div>
      )}

      {/* Autonomous AI Operations Deck */}
      {projectId && (
        <VaultActions
          filePath={filePath}
          projectId={projectId}
          onActionComplete={onActionComplete}
        />
      )}
    </div>
  );
}
