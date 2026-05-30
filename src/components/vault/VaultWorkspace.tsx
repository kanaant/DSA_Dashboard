"use client";

import { useEffect, useState, useCallback } from "react";
import { VaultProject, VaultEntry, VaultStatusComment } from "@/lib/vault-data";
import { VaultSidebar } from "./VaultSidebar";
import { VaultPreviewer } from "./VaultPreviewer";

interface VaultWorkspaceProps {
  initialProjects: VaultProject[];
}

export function VaultWorkspace({ initialProjects }: VaultWorkspaceProps) {
  const [projects, setProjects] = useState<VaultProject[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialProjects.length > 0 ? initialProjects[0].id : null
  );
  
  const [tree, setTree] = useState<VaultEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  
  const [fileContent, setFileContent] = useState<string>("");
  const [fileMimeType, setFileMimeType] = useState<string>("text/plain");
  const [fileComments, setFileComments] = useState<VaultStatusComment[]>([]);
  const [loadingFile, setLoadingFile] = useState<boolean>(false);

  // Load project list
  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/vault");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to load projects list:", err);
    }
  }, []);

  // Load directory tree for active project
  const loadTree = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/vault/tree?project=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree || []);
      }
    } catch (err) {
      console.error("Failed to load directory tree:", err);
    }
  }, []);

  // Load specific file content
  const loadFile = useCallback(async (path: string) => {
    setLoadingFile(true);
    try {
      const res = await fetch(`/api/vault/file?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
        setFileMimeType(data.mimeType || "text/plain");
        setFileComments(data.comments || []);
      }
    } catch (err) {
      console.error("Failed to load file content:", err);
    } finally {
      setLoadingFile(false);
    }
  }, []);

  // Save specific file content
  const saveFile = useCallback(async (path: string, content: string) => {
    try {
      const res = await fetch("/api/vault/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content })
      });
      if (!res.ok) {
        throw new Error("Failed to save file contents.");
      }
      setFileContent(content);
      // Reload stats and projects count
      loadProjects();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [loadProjects]);

  // Handle active project selection
  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setSelectedPath(null);
    setFileContent("");
    setFileMimeType("text/plain");
  };

  // Trigger tree refresh manually or after mutations
  const handleRefresh = useCallback(() => {
    if (activeProjectId) {
      loadTree(activeProjectId);
      loadProjects();
    }
  }, [activeProjectId, loadTree, loadProjects]);

  // Handle file select
  const handleSelectFile = useCallback(async (path: string) => {
    setSelectedPath(path);
    if (path) {
      loadFile(path);
      // Mark file as read (receipts status)
      try {
        const res = await fetch("/api/vault/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path })
        });
        if (res.ok && activeProjectId) {
          loadTree(activeProjectId);
        }
      } catch (err) {
        console.error("Failed to mark file as read:", err);
      }
    } else {
      setFileContent("");
      setFileMimeType("text/plain");
      setFileComments([]);
    }
  }, [loadFile, activeProjectId, loadTree]);

  // Callback when AI Agent finishes generating outputs
  const handleAgentActionComplete = (outputPath: string) => {
    handleRefresh();
    // Auto-select the newly generated file
    handleSelectFile(outputPath);
  };

  // Initial load
  useEffect(() => {
    if (activeProjectId) {
      loadTree(activeProjectId);
    }
  }, [activeProjectId, loadTree]);

  // Real-time Filesystem Event Synchronizer (SSE EventSource)
  useEffect(() => {
    if (!activeProjectId) return;

    const sse = new EventSource(`/api/vault/watch?project=${encodeURIComponent(activeProjectId)}`);

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Vault watch event:", data);
        
        // Refresh directory hierarchy instantly
        handleRefresh();

        // If the modified file is currently selected, refresh its preview too!
        if (selectedPath) {
          const projectRootRel = selectedPath.split("/").slice(1).join("/");
          if (data.path === projectRootRel && data.event === "change") {
            loadFile(selectedPath);
          }
        }
      } catch (err) {
        // Heartbeats might parse weird, ignore them
      }
    };

    sse.onerror = () => {
      // Gracefully close on error and let browser auto-retry or clean up
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [activeProjectId, selectedPath, handleRefresh, loadFile]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative z-10">
      <VaultSidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        tree={tree}
        selectedPath={selectedPath}
        onSelectFile={handleSelectFile}
        onRefresh={handleRefresh}
      />

      <div className="flex-1 min-w-0">
        <VaultPreviewer
          filePath={selectedPath}
          projectId={activeProjectId}
          content={fileContent}
          mimeType={fileMimeType}
          comments={fileComments}
          onSave={saveFile}
          isLoading={loadingFile}
          onActionComplete={handleAgentActionComplete}
          onRefreshComments={() => {
            handleRefresh();
            if (selectedPath) loadFile(selectedPath);
          }}
        />
      </div>
    </div>
  );
}
