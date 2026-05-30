"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Bot, ChevronDown, ChevronRight, Edit3, FileCode, FileSignature,
  FileText, Folder, FolderOpen, FolderPlus, Plus, RefreshCw, Sparkles, Trash2
} from "lucide-react";
import { VaultEntry } from "@/lib/vault-data";

interface VaultFileTreeProps {
  entries: VaultEntry[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
  projectId: string;
}

export function VaultFileTree({
  entries,
  selectedPath,
  onSelectFile,
  onRefresh,
  projectId
}: VaultFileTreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    isDirectory: boolean;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingInPath, setCreatingInPath] = useState<{
    parentPath: string;
    type: "file" | "folder";
  } | null>(null);
  const [createValue, setCreateValue] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentActionText, setAgentActionText] = useState("");

  const triggerAgentAction = async (action: "summarize" | "refactor" | "diagram", targetPath: string) => {
    setAgentLoading(true);
    setAgentActionText(action === "summarize" ? "Summarizing" : action === "refactor" ? "Refactoring" : "Visualizing");
    try {
      const res = await fetch("/api/vault/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, filePath: targetPath, projectId })
      });
      if (res.ok) {
        const data = await res.json();
        onRefresh();
        onSelectFile(data.outputPath);
      } else {
        const data = await res.json();
        alert(`AI Operation failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`AI Operation error: ${err.message}`);
    } finally {
      setAgentLoading(false);
      setAgentActionText("");
    }
  };

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside, ignoring button 2 (right-click)
  useEffect(() => {
    setMounted(true);
    const closeMenu = (e: MouseEvent) => {
      if (e.button !== 2 && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("mousedown", closeMenu);
    return () => window.removeEventListener("mousedown", closeMenu);
  }, []);

  const toggleExpand = (dirPath: string) => {
    setExpandedDirs((prev) => ({
      ...prev,
      [dirPath]: !prev[dirPath]
    }));
  };

  // Right-Click Context Menu Trigger
  const handleContextMenu = (
    e: React.MouseEvent,
    entryPath: string,
    isDirectory: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Position menu near cursor
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: entryPath,
      isDirectory
    });
  };

  // CRUD API Calls
  const handleCreate = async () => {
    if (!creatingInPath || !createValue.trim()) return;

    const relativeNewPath = creatingInPath.parentPath
      ? `${creatingInPath.parentPath}/${createValue.trim()}`
      : `${projectId}/${createValue.trim()}`;

    try {
      const endpoint = creatingInPath.type === "folder" ? "/api/vault/folder" : "/api/vault/file";
      const method = creatingInPath.type === "folder" ? "POST" : "PUT";

      const payload = creatingInPath.type === "folder"
        ? { path: relativeNewPath }
        : { path: relativeNewPath, content: "# " + createValue.trim() + "\n" };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Creation failed");

      setCreatingInPath(null);
      setCreateValue("");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRename = async () => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      return;
    }

    // Calculate new path by replacing basename
    const segments = renamingPath.split("/");
    const oldName = segments[segments.length - 1];
    if (oldName === renameValue.trim()) {
      setRenamingPath(null);
      return;
    }

    segments[segments.length - 1] = renameValue.trim();
    const newPath = segments.join("/");

    try {
      const res = await fetch("/api/vault/file", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath: renamingPath, newPath })
      });

      if (!res.ok) throw new Error("Rename failed");

      setRenamingPath(null);
      setRenameValue("");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (targetPath: string) => {
    if (!confirm("Are you sure you want to permanently delete this item?")) return;

    try {
      const res = await fetch(`/api/vault/file?path=${encodeURIComponent(targetPath)}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Delete failed");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, entryPath: string) => {
    e.dataTransfer.setData("text/plain", entryPath);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, destPath: string) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData("text/plain");

    if (!sourcePath || sourcePath === destPath) return;

    try {
      const res = await fetch("/api/vault/file", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath: sourcePath, newPath: destPath })
      });

      if (!res.ok) throw new Error("Move operation failed");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // File Icon Selector
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "md") return <FileText className="h-4 w-4 text-[#00d4ff]" />;
    if (ext === "html") return <FileCode className="h-4 w-4 text-emerald-400" />;
    if (ext === "mmd" || ext === "excalidraw") return <FileSignature className="h-4 w-4 text-[#c084fc]" />;
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  // Recursive Tree Node Renderer
  const renderNode = (node: VaultEntry, depth: number = 0) => {
    const isExpanded = expandedDirs[node.path] || false;
    const isSelected = selectedPath === node.path;
    const isRenaming = renamingPath === node.path;
    const isAgent = node.createdBy === "agent";

    return (
      <div key={node.path} className="select-none">
        {/* Row Element */}
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, node.path)}
          onDragOver={handleDragOver}
          onDrop={(e) => node.isDirectory ? handleDrop(e, node.path) : undefined}
          onContextMenu={(e) => handleContextMenu(e, node.path, node.isDirectory)}
          onClick={(e) => {
            e.stopPropagation();
            if (node.isDirectory) {
              toggleExpand(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`group flex items-center gap-2 rounded-xl py-1.5 pr-2 text-xs transition-all duration-200 cursor-pointer ${isSelected
              ? "bg-[#00d4ff]/10 text-white border-l-2 border-[#00d4ff]"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
        >
          {node.isDirectory ? (
            <span className="text-slate-500">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          ) : (
            <span className="w-3.5 flex items-center justify-center shrink-0">
              {!node.isRead && (
                <span 
                  className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse"
                  title="Unread document"
                />
              )}
            </span>
          )}

          <span className="shrink-0">
            {node.isDirectory ? (
              isExpanded ? <FolderOpen className="h-4 w-4 text-[#8b5cf6]" /> : <Folder className="h-4 w-4 text-[#8b5cf6]" />
            ) : (
              getFileIcon(node.name)
            )}
          </span>

          {isRenaming ? (
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setRenamingPath(null);
              }}
              onBlur={handleRename}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-[#050816] text-[#00d4ff] border border-[#00d4ff]/30 px-1 py-0.5 rounded font-mono text-[11px] focus:outline-none"
            />
          ) : (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
              <span className="truncate font-mono tracking-wide">{node.name}</span>
              {node.commentsCount && node.commentsCount > 0 ? (
                <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 px-1 text-[8px] font-black uppercase text-[#00d4ff] select-none font-mono">
                  {node.commentsCount}
                </span>
              ) : null}
            </div>
          )}

          {isAgent && !isRenaming && (
            <div className="flex h-4.5 items-center gap-1.5 rounded bg-[#00d4ff]/15 px-1.5 text-[8px] font-black uppercase tracking-widest text-[#00d4ff] opacity-80 group-hover:opacity-100">
              <Bot className="h-2.5 w-2.5" />
              AI
            </div>
          )}

          {!isRenaming && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node.path);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-all rounded hover:bg-white/5"
              title="Delete item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Child creation input row if triggered */}
        {creatingInPath?.parentPath === node.path && (
          <div
            style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
            className="flex items-center gap-2 py-1.5 pr-2"
          >
            {creatingInPath.type === "folder" ? (
              <Folder className="h-4 w-4 text-[#8b5cf6]" />
            ) : (
              <FileText className="h-4 w-4 text-[#00d4ff]" />
            )}
            <input
              type="text"
              autoFocus
              placeholder={`New ${creatingInPath.type}...`}
              value={createValue}
              onChange={(e) => setCreateValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setCreatingInPath(null);
              }}
              onBlur={() => {
                setCreatingInPath(null);
                setCreateValue("");
              }}
              className="flex-1 bg-[#050816] text-[#00d4ff] border border-white/10 px-1 py-0.5 rounded font-mono text-[11px] focus:outline-none"
            />
          </div>
        )}

        {/* Children Render */}
        {node.isDirectory && isExpanded && node.children && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="space-y-1 relative min-h-full flex-1 flex flex-col"
      onContextMenu={(e) => handleContextMenu(e, "", true)}
      onClick={() => onSelectFile("")}
    >
      {agentLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-slate-950/90 border border-[#00d4ff]/25 shadow-inner backdrop-blur-sm select-none p-4 text-center font-mono">
          <div className="relative mb-3 flex h-8 w-8 items-center justify-center">
            <RefreshCw className="h-4.5 w-4.5 text-[#00d4ff] animate-spin" />
            <div className="absolute inset-0 rounded-full border border-[#00d4ff]/30 animate-ping" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#00d4ff] animate-pulse">🤖 HERMES AI ACTIVE</span>
          <span className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest">{agentActionText}...</span>
        </div>
      )}

      {/* Top level creation block when root is clicked */}
      {creatingInPath?.parentPath === "" && (
        <div className="flex items-center gap-2 py-1.5 px-2">
          {creatingInPath.type === "folder" ? (
            <Folder className="h-4 w-4 text-[#8b5cf6]" />
          ) : (
            <FileText className="h-4 w-4 text-[#00d4ff]" />
          )}
          <input
            type="text"
            autoFocus
            placeholder={`New ${creatingInPath.type}...`}
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setCreatingInPath(null);
            }}
            onBlur={() => {
              setCreatingInPath(null);
              setCreateValue("");
            }}
            className="flex-1 bg-[#050816] text-[#00d4ff] border border-white/10 px-1 py-0.5 rounded font-mono text-[11px] focus:outline-none"
          />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
          Empty project workspace.
        </div>
      ) : (
        entries.map((entry) => renderNode(entry, 0))
      )}

      {/* SOLID HUD Context Menu Popover */}
      {contextMenu && mounted && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            position: "fixed",
            zIndex: 9999
          }}
          className="w-48 overflow-hidden rounded-xl border border-white/10 bg-[#050816] p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.95)]"
        >
          <div className="px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 mb-1 select-none">
            Directory Actions
          </div>

          {contextMenu.isDirectory ? (
            <>
              <button
                onClick={() => {
                  setCreatingInPath({ parentPath: contextMenu.path, type: "file" });
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5 text-[#00d4ff]" />
                New File
              </button>
              <button
                onClick={() => {
                  setCreatingInPath({ parentPath: contextMenu.path, type: "folder" });
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <FolderPlus className="h-3.5 w-3.5 text-[#8b5cf6]" />
                New Folder
              </button>
            </>
          ) : (
            <>
              {/* AI Agent operations in Context Menu */}
              <div className="px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-[#00d4ff] border-t border-b border-white/5 my-1 select-none flex items-center gap-1">
                <Bot className="h-2.5 w-2.5 animate-pulse" />
                Hermes Agent
              </div>
              <button
                onClick={() => {
                  triggerAgentAction("summarize", contextMenu.path);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-slate-300 transition-colors hover:bg-[#00d4ff]/10 hover:text-[#00d4ff]"
              >
                <FileText className="h-3.5 w-3.5 text-[#00d4ff]" />
                Summarize Brief
              </button>

              {["js", "jsx", "ts", "tsx", "py", "css", "html", "json"].includes(contextMenu.path.split(".").pop()?.toLowerCase() || "") && (
                <button
                  onClick={() => {
                    triggerAgentAction("refactor", contextMenu.path);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-slate-300 transition-colors hover:bg-[#8b5cf6]/10 hover:text-[#c084fc]"
                >
                  <Bot className="h-3.5 w-3.5 text-[#8b5cf6]" />
                  Refactor Code
                </button>
              )}

              <button
                onClick={() => {
                  triggerAgentAction("diagram", contextMenu.path);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-slate-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <FileSignature className="h-3.5 w-3.5 text-emerald-500" />
                Flow Diagram
              </button>
            </>
          )}

          {contextMenu.path && (
            <>
              <div className="h-px bg-white/5 my-1" />
              <button
                onClick={() => {
                  setRenamingPath(contextMenu.path);
                  setRenameValue(contextMenu.path.split("/").pop() || "");
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                Rename (F2)
              </button>
              <button
                onClick={() => {
                  handleDelete(contextMenu.path);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
