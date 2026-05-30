"use client";

import { useState } from "react";
import { Activity, ChevronDown, Cpu, Database, FolderHeart, FolderPlus, Plus, RefreshCw, Sparkles, Upload } from "lucide-react";
import { VaultProject, VaultEntry } from "@/lib/vault-data";
import { VaultFileTree } from "./VaultFileTree";

interface VaultSidebarProps {
  projects: VaultProject[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  tree: VaultEntry[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
}

export function VaultSidebar({
  projects,
  activeProjectId,
  onSelectProject,
  tree,
  selectedPath,
  onSelectFile,
  onRefresh
}: VaultSidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    uploaded: number;
    currentName: string;
  } | null>(null);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch("/api/vault/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newProjectName.trim() })
      });
      if (res.ok) {
        const projId = newProjectName.trim();
        setCreatingProject(false);
        setNewProjectName("");
        onRefresh();
        onSelectProject(projId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeProjectId) return;

    let targetDir = activeProjectId;
    if (selectedPath) {
      const hasExt = selectedPath.split("/").pop()?.includes(".");
      if (hasExt) {
        targetDir = selectedPath.split("/").slice(0, -1).join("/");
      } else {
        targetDir = selectedPath;
      }
    }

    const total = files.length;
    setUploadProgress({ total, uploaded: 0, currentName: files[0].name });

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setUploadProgress({ total, uploaded: i, currentName: file.name });

      const relativePath = file.webkitRelativePath || file.name;
      const uploadPath = `${targetDir}/${relativePath}`;

      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target?.result as string);
        reader.readAsDataURL(file);
      });

      try {
        await fetch("/api/vault/file", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: uploadPath, content })
        });
      } catch (err) {
        console.error("Upload failed for:", relativePath, err);
      }
    }

    setUploadProgress(null);
    onRefresh();
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Calculate stats
  const totalFiles = activeProject?.fileCount || 0;
  const agentFiles = activeProject?.agentFileCount || 0;
  const userFiles = Math.max(0, totalFiles - agentFiles);
  const aiRatio = totalFiles > 0 ? Math.round((agentFiles / totalFiles) * 100) : 0;

  return (
    <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
      {/* LEVEL 1: Project Space Switcher */}
      <div className="relative z-40 rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-2xl shadow-[0_12px_30px_rgba(2,6,23,0.4)]">
        <div className="flex justify-between items-center mb-1.5 select-none">
          <label className="block text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">
            Level 1: Project Space
          </label>
          <button
            onClick={() => setCreatingProject(!creatingProject)}
            className="text-[9px] font-black uppercase text-[#00d4ff] hover:underline"
          >
            {creatingProject ? "CANCEL" : "+ CREATE"}
          </button>
        </div>

        {creatingProject && (
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="New project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
                if (e.key === "Escape") setCreatingProject(false);
              }}
              className="flex-1 bg-[#050816] text-[#00d4ff] border border-white/10 px-2 py-1.5 rounded-lg font-mono text-xs focus:outline-none focus:border-[#00d4ff]/30"
            />
            <button
              onClick={handleCreateProject}
              className="flex h-7 items-center justify-center rounded-lg border border-[#00d4ff]/35 bg-[#00d4ff]/10 px-2.5 text-[9px] font-black uppercase text-[#00d4ff]"
            >
              ADD
            </button>
          </div>
        )}

        <button
          onClick={() => setDropdownOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/35 p-3 font-mono text-xs font-extrabold text-white transition-all duration-300 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5"
        >
          <div className="flex items-center gap-2">
            <FolderHeart className="h-4 w-4 text-[#8b5cf6]" />
            <span className="truncate">{activeProject?.name || "Select Project Space"}</span>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${dropdownOpen ? "rotate-180 text-[#00d4ff]" : ""}`} />
        </button>

        {/* SOLID DROPDOWN PANEL */}
        {dropdownOpen && (
          <div className="absolute inset-x-4 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#050816] p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.95)]">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-center text-[10px] text-slate-500 font-mono">
                No project spaces found
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project.id);
                    setDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-xs font-bold transition-colors hover:bg-white/5 hover:text-white ${project.id === activeProjectId ? "bg-[#00d4ff]/10 text-[#00d4ff]" : "text-slate-400"
                    }`}
                >
                  <span>{project.name}</span>
                  {project.id === activeProjectId && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] shadow-[0_0_8px_#00d4ff]" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* LEVEL 2: Functional Core / Telemetry Stats */}
      {activeProject && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-2xl shadow-[0_12px_30px_rgba(2,6,23,0.4)] space-y-3">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.24em] text-[#00d4ff] flex items-center gap-1.5 mb-1 select-none">
              <Activity className="h-3 w-3 animate-pulse" />
              Level 2: Telemetry Metrics
            </div>
            <h2 className="text-sm font-extrabold text-white truncate font-mono">
              {activeProject.name}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {activeProject.description || "Auxiliary project vault workspace."}
            </p>
          </div>

          <div className="h-px bg-white/5" />

          {/* Metric telemetry bars */}
          <div className="space-y-2 select-none">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5 text-slate-500" />
                Host Files: {userFiles}
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-[#00d4ff]" />
                Agent Files: {agentFiles}
              </span>
            </div>

            {/* Glowing AI vs User metric bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-white/5 relative flex">
              <div
                style={{ width: `${100 - aiRatio}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-[#8b5cf6] transition-all duration-500"
              />
              <div
                style={{ width: `${aiRatio}%` }}
                className="h-full bg-gradient-to-r from-[#00d4ff] to-cyan-400 transition-all duration-500 shadow-[0_0_10px_#00d4ff]"
              />
            </div>

            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">
              <span>USER BOUNDS</span>
              <span className="text-[#00d4ff] flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                {aiRatio}% AI-INJECTED
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 3: File Explorer Tree */}
      <div
        onClick={() => onSelectFile("")}
        className="flex-1 rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-2xl shadow-[0_12px_30px_rgba(2,6,23,0.4)] flex flex-col min-h-[40vh] relative"
      >
        <div className="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500 mb-3 border-b border-white/5 pb-2.5 select-none flex flex-col sm:flex-row sm:items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
          <span>Level 3: Directory Tree</span>
          <div className="flex gap-1.5 items-center">
            {activeProjectId && (
              <>
                {/* Upload File */}
                <label className="h-7 bg-slate-900/60 border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 rounded-lg px-2.5 text-[8px] uppercase tracking-wider font-black flex items-center gap-1 cursor-pointer transition-all duration-300 shadow-sm shadow-emerald-950/20 active:scale-95 select-none">
                  <Upload className="h-3 w-3" />
                  <span>Doc</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".md,.txt,.html,.mmd,.excalidraw,.json,.js,.ts,.tsx,.py,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.svg,.gdoc,.gsheet"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !activeProjectId) return;
                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        const content = evt.target?.result as string;
                        let targetPath = `${activeProjectId}/${file.name}`;
                        if (selectedPath) {
                          const hasExt = selectedPath.split("/").pop()?.includes(".");
                          const parent = hasExt ? selectedPath.split("/").slice(0, -1).join("/") : selectedPath;
                          targetPath = `${parent}/${file.name}`;
                        }
                        try {
                          const res = await fetch("/api/vault/file", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ path: targetPath, content })
                          });
                          if (res.ok) {
                            onRefresh();
                            onSelectFile(targetPath);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>

                {/* Upload Folder */}
                <label className="h-7 bg-slate-900/60 border border-white/10 hover:border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/10 text-[#c084fc] rounded-lg px-2.5 text-[8px] uppercase tracking-wider font-black flex items-center gap-1 cursor-pointer transition-all duration-300 shadow-sm shadow-purple-950/20 active:scale-95 select-none">
                  <FolderPlus className="h-3 w-3" />
                  <span>Folder</span>
                  <input
                    type="file"
                    className="hidden"
                    {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                    onChange={handleUploadFolder}
                  />
                </label>
              </>
            )}
            <button
              onClick={(ev) => { ev.stopPropagation(); onRefresh(); }}
              className="group h-7 bg-slate-900/60 border border-white/10 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 text-[#00d4ff] rounded-lg px-2.5 text-[8px] uppercase tracking-wider font-black flex items-center gap-1 cursor-pointer transition-all duration-300 shadow-sm shadow-cyan-950/20 active:scale-95 select-none"
            >
              <RefreshCw className="h-3 w-3 transition-transform duration-500 group-hover:rotate-180" />
              <span>Resync</span>
            </button>
          </div>
        </div>

        {/* Floating Upload Progress Indicator */}
        {uploadProgress && (
          <div className="mb-3 rounded-xl border border-[#00d4ff]/25 bg-[#00d4ff]/5 p-3 font-mono text-[10px] text-slate-300 relative select-none overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-extrabold text-[#00d4ff] uppercase tracking-wider animate-pulse">INGESTING TELESYNC...</span>
              <span>{uploadProgress.uploaded}/{uploadProgress.total}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full border border-white/5 overflow-hidden">
              <div
                style={{ width: `${Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)}%` }}
                className="h-full bg-gradient-to-r from-[#00d4ff] to-cyan-400 shadow-[0_0_8px_#00d4ff] transition-all duration-300"
              />
            </div>
            <div className="mt-1.5 text-[8px] text-slate-500 truncate">
              FILE: {uploadProgress.currentName}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1" onClick={(e) => e.stopPropagation()}>
          {activeProjectId ? (
            <VaultFileTree
              entries={tree}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onRefresh={onRefresh}
              projectId={activeProjectId}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center p-6 text-slate-600 font-mono text-[10px] uppercase tracking-widest">
              Awaiting active project space re-routing...
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
