import fs from "fs/promises";
import path from "path";
import os from "os";

// Types
export interface VaultProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  fileCount: number;
  agentFileCount: number;
  lastModified: string;
}

export interface VaultEntry {
  name: string;
  path: string; // Relative to VAULT_PATH
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  createdBy: "user" | "agent" | "unknown";
  isRead?: boolean;
  commentsCount?: number;
  children?: VaultEntry[];
}

export interface VaultStatusComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface VaultStatus {
  readTimestamps: Record<string, string>; // Maps file relative paths (relative to project) to their ISO read timestamps
  comments: Record<string, VaultStatusComment[]>; // Maps file relative paths to arrays of comments
}

export interface VaultMeta {
  description?: string;
  createdAt?: string;
  agentFiles?: string[];
}

// Get the root vault path, jailed boundaries
export function getVaultRoot(): string {
  const root = process.env.VAULT_PATH || `${os.homedir()}/vault`;
  return path.resolve(root);
}

// Security boundary check: resolves path and ensures it remains inside VAULT_PATH
export function safeResolvePath(relativePath: string): string {
  const root = getVaultRoot();
  
  // Clean null bytes and check for traversal hacks
  if (relativePath.includes("\0")) {
    throw new Error("ACCESS_DENIED: Invalid path signature.");
  }
  
  const resolved = path.resolve(root, relativePath);
  
  // Enforce jail check
  if (!resolved.startsWith(root)) {
    throw new Error("ACCESS_DENIED: Out-of-bounds path traversal detected.");
  }
  
  return resolved;
}

// Helper to count files in a directory recursively
async function countFilesInDir(dirPath: string): Promise<{ total: number; lastModified: Date }> {
  let count = 0;
  let maxModified = new Date(0);

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const stat = await fs.stat(entryPath);
      
      if (stat.mtime > maxModified) {
        maxModified = stat.mtime;
      }

      if (entry.isDirectory()) {
        const sub = await countFilesInDir(entryPath);
        count += sub.total;
        if (sub.lastModified > maxModified) {
          maxModified = sub.lastModified;
        }
      } else {
        count++;
      }
    }
  } catch (error) {
    // Ignore read errors for individual directories
  }

  return { total: count, lastModified: maxModified };
}

// Level 1: Get all project spaces (subfolders inside VAULT_PATH)
export async function getProjects(): Promise<VaultProject[]> {
  const root = getVaultRoot();
  const projects: VaultProject[] = [];

  try {
    // Ensure root exists
    await fs.mkdir(root, { recursive: true });
    
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(root, entry.name);
        const metaPath = path.join(projectPath, ".vault-meta.json");
        
        let meta: VaultMeta = {};
        try {
          const metaContent = await fs.readFile(metaPath, "utf-8");
          meta = JSON.parse(metaContent);
        } catch {
          // If no meta, create default
          meta = {
            description: `Automated space for ${entry.name}`,
            createdAt: new Date().toISOString(),
            agentFiles: []
          };
          try {
            await fs.mkdir(projectPath, { recursive: true });
            await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
          } catch {}
        }

        const counts = await countFilesInDir(projectPath);
        
        // Exclude system files from counts if desired, but we keep it simple
        const agentFiles = meta.agentFiles || [];

        projects.push({
          id: entry.name,
          name: entry.name.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          description: meta.description || "",
          createdAt: meta.createdAt || new Date().toISOString(),
          fileCount: counts.total,
          agentFileCount: agentFiles.length,
          lastModified: counts.lastModified.toISOString()
        });
      }
    }
  } catch (error) {
    console.error("Failed to read vault projects directory:", error);
  }

  return projects;
}

// Read project metadata
export async function getVaultMeta(projectId: string): Promise<VaultMeta> {
  const projectPath = safeResolvePath(projectId);
  const metaPath = path.join(projectPath, ".vault-meta.json");
  
  try {
    const metaContent = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(metaContent);
  } catch {
    return {
      description: `Vault project space for ${projectId}`,
      createdAt: new Date().toISOString(),
      agentFiles: []
    };
  }
}

// Update project metadata
export async function updateVaultMeta(projectId: string, meta: VaultMeta): Promise<void> {
  const projectPath = safeResolvePath(projectId);
  const metaPath = path.join(projectPath, ".vault-meta.json");
  
  // Ensure metadata preserves defaults
  const current = await getVaultMeta(projectId);
  const updated = {
    ...current,
    ...meta,
    agentFiles: Array.from(new Set([...(current.agentFiles || []), ...(meta.agentFiles || [])]))
  };

  await fs.writeFile(metaPath, JSON.stringify(updated, null, 2), "utf-8");
}

// Read status telemetry (read status & comments)
export async function getVaultStatus(projectId: string): Promise<VaultStatus> {
  const projectPath = safeResolvePath(projectId);
  const statusPath = path.join(projectPath, ".vault-status.json");
  
  try {
    const statusContent = await fs.readFile(statusPath, "utf-8");
    return JSON.parse(statusContent);
  } catch {
    return {
      readTimestamps: {},
      comments: {}
    };
  }
}

// Update status telemetry
export async function updateVaultStatus(projectId: string, status: VaultStatus): Promise<void> {
  const projectPath = safeResolvePath(projectId);
  const statusPath = path.join(projectPath, ".vault-status.json");
  await fs.writeFile(statusPath, JSON.stringify(status, null, 2), "utf-8");
}

// Mark file as read (store timestamp)
export async function markFileAsRead(relativePath: string): Promise<void> {
  const segments = relativePath.split(path.sep);
  const projectId = segments[0];
  if (!projectId) return;

  const projectRootAbs = safeResolvePath(projectId);
  const fullPath = safeResolvePath(relativePath);
  const relativeToProject = path.relative(projectRootAbs, fullPath);

  const status = await getVaultStatus(projectId);
  if (!status.readTimestamps) status.readTimestamps = {};
  status.readTimestamps[relativeToProject] = new Date().toISOString();
  await updateVaultStatus(projectId, status);
}

// Add a comment to a file
export async function addComment(
  relativePath: string,
  author: string,
  text: string
): Promise<VaultStatusComment> {
  const segments = relativePath.split(path.sep);
  const projectId = segments[0];
  if (!projectId) throw new Error("Invalid project ID");

  const projectRootAbs = safeResolvePath(projectId);
  const fullPath = safeResolvePath(relativePath);
  const relativeToProject = path.relative(projectRootAbs, fullPath);

  const status = await getVaultStatus(projectId);
  if (!status.comments) status.comments = {};
  if (!status.comments[relativeToProject]) {
    status.comments[relativeToProject] = [];
  }

  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const comment: VaultStatusComment = {
    id,
    author,
    text,
    timestamp: new Date().toISOString()
  };

  status.comments[relativeToProject].push(comment);
  await updateVaultStatus(projectId, status);
  return comment;
}

// Delete a comment from a file
export async function deleteComment(relativePath: string, commentId: string): Promise<void> {
  const segments = relativePath.split(path.sep);
  const projectId = segments[0];
  if (!projectId) return;

  const projectRootAbs = safeResolvePath(projectId);
  const fullPath = safeResolvePath(relativePath);
  const relativeToProject = path.relative(projectRootAbs, fullPath);

  const status = await getVaultStatus(projectId);
  if (!status.comments || !status.comments[relativeToProject]) return;

  status.comments[relativeToProject] = status.comments[relativeToProject].filter(
    (c) => c.id !== commentId
  );
  await updateVaultStatus(projectId, status);
}

// Level 3: Recursive directory tree builder
export async function getDirectoryTree(
  projectId: string,
  subPath: string = ""
): Promise<VaultEntry[]> {
  const projectRootRelative = path.join(projectId, subPath);
  const fullPath = safeResolvePath(projectRootRelative);
  
  const meta = await getVaultMeta(projectId);
  const agentFiles = new Set(meta.agentFiles || []);

  // Fetch status telemetry
  const status = await getVaultStatus(projectId);
  const readTimestamps = status.readTimestamps || {};
  const comments = status.comments || {};

  const buildTree = async (currentFullPath: string): Promise<VaultEntry[]> => {
    const entries: VaultEntry[] = [];
    const files = await fs.readdir(currentFullPath, { withFileTypes: true });

    for (const file of files) {
      // Ignore dotfiles, metadata files, and status meta files
      if (file.name === ".vault-meta.json" || file.name === ".vault-status.json" || file.name.startsWith(".")) {
        continue;
      }

      const filePath = path.join(currentFullPath, file.name);
      const stat = await fs.stat(filePath);
      
      const rootAbs = getVaultRoot();
      const relativeToRoot = path.relative(rootAbs, filePath);
      
      // Determine authorship relative to project root
      const relativeToProject = path.relative(path.join(rootAbs, projectId), filePath);
      const isAgent = agentFiles.has(relativeToProject);
      
      // Determine read/unread status
      // A file is unread if modified time is after the last read timestamp (or if no read timestamp exists)
      const readTime = readTimestamps[relativeToProject];
      const isRead = !file.isDirectory()
        ? (!!readTime && new Date(readTime) >= stat.mtime)
        : true; // Folders are read by default
        
      const fileComments = comments[relativeToProject] || [];

      const entry: VaultEntry = {
        name: file.name,
        path: relativeToRoot,
        isDirectory: file.isDirectory(),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        createdBy: isAgent ? "agent" : "user",
        isRead,
        commentsCount: fileComments.length
      };

      if (file.isDirectory()) {
        entry.children = await buildTree(filePath);
        // Sort folders first, then alphabetically
        entry.children.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
      }

      entries.push(entry);
    }

    return entries;
  };

  const tree = await buildTree(fullPath);
  
  // Sort top level: folders first, then files
  tree.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return tree;
}

// CRUD Operations
export async function readFileContent(relativePath: string): Promise<{ content: string; mimeType: string; isBinary?: boolean; comments?: VaultStatusComment[] }> {
  const fullPath = safeResolvePath(relativePath);
  
  // Check if directory
  const stat = await fs.stat(fullPath);
  if (stat.isDirectory()) {
    throw new Error("Cannot read directory as file.");
  }

  const ext = path.extname(fullPath).toLowerCase();
  let mimeType = "text/plain";
  let isBinary = false;
  
  if (ext === ".html") mimeType = "text/html";
  else if (ext === ".json" || ext === ".excalidraw") mimeType = "application/json";
  else if (ext === ".md") mimeType = "text/markdown";
  else if (ext === ".mmd") mimeType = "text/x-mermaid";
  // Images
  else if (ext === ".png") { mimeType = "image/png"; isBinary = true; }
  else if (ext === ".jpg" || ext === ".jpeg") { mimeType = "image/jpeg"; isBinary = true; }
  else if (ext === ".gif") { mimeType = "image/gif"; isBinary = true; }
  else if (ext === ".webp") { mimeType = "image/webp"; isBinary = true; }
  else if (ext === ".svg") { mimeType = "image/svg+xml"; isBinary = true; }
  // Docs & PDFs
  else if (ext === ".pdf") { mimeType = "application/pdf"; isBinary = true; }
  else if (ext === ".doc") { mimeType = "application/msword"; isBinary = true; }
  else if (ext === ".docx") { mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; isBinary = true; }
  else if (ext === ".xls") { mimeType = "application/vnd.ms-excel"; isBinary = true; }
  else if (ext === ".xlsx") { mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; isBinary = true; }
  else if (ext === ".gdoc") { mimeType = "application/vnd.google-apps.document"; isBinary = true; }
  else if (ext === ".gsheet") { mimeType = "application/vnd.google-apps.spreadsheet"; isBinary = true; }

  // Extract comments relative to project
  const segments = relativePath.split(path.sep);
  const projectId = segments[0];
  let fileComments: VaultStatusComment[] = [];
  
  if (projectId) {
    const projectRootAbs = safeResolvePath(projectId);
    const relativeToProject = path.relative(projectRootAbs, fullPath);
    const status = await getVaultStatus(projectId);
    fileComments = (status.comments && status.comments[relativeToProject]) || [];
  }

  if (isBinary) {
    const buffer = await fs.readFile(fullPath);
    const content = `data:${mimeType};base64,${buffer.toString("base64")}`;
    return { content, mimeType, isBinary: true, comments: fileComments };
  } else {
    const content = await fs.readFile(fullPath, "utf-8");
    return { content, mimeType, comments: fileComments };
  }
}

export async function writeFile(relativePath: string, content: string, createdByAgent: boolean = false): Promise<void> {
  const fullPath = safeResolvePath(relativePath);
  
  // Extract project name from relative path to register in metadata
  const segments = relativePath.split(path.sep);
  const projectId = segments[0];

  // Write content
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  
  // Check if content is a Data URL (base64 binary file)
  const base64Regex = /^data:([^;]+);base64,(.*)$/;
  const match = typeof content === "string" ? content.match(base64Regex) : null;

  if (match) {
    const buffer = Buffer.from(match[2], "base64");
    await fs.writeFile(fullPath, buffer);
  } else {
    await fs.writeFile(fullPath, content, "utf-8");
  }

  // If created by agent, update .vault-meta.json
  if (createdByAgent && projectId) {
    const projectRootAbs = safeResolvePath(projectId);
    const fileRelative = path.relative(projectRootAbs, fullPath);
    await updateVaultMeta(projectId, { agentFiles: [fileRelative] });
  }
}

export async function createDirectory(relativePath: string): Promise<void> {
  const fullPath = safeResolvePath(relativePath);
  await fs.mkdir(fullPath, { recursive: true });
}

export async function deleteEntry(relativePath: string): Promise<void> {
  const fullPath = safeResolvePath(relativePath);
  const stat = await fs.stat(fullPath);

  if (stat.isDirectory()) {
    await fs.rm(fullPath, { recursive: true, force: true });
  } else {
    await fs.unlink(fullPath);
  }
}

export async function renameEntry(oldPath: string, newPath: string): Promise<void> {
  const oldFullPath = safeResolvePath(oldPath);
  const newFullPath = safeResolvePath(newPath);

  // Ensure same project space or handle meta shifts
  await fs.rename(oldFullPath, newFullPath);
}

export async function moveEntry(sourcePath: string, destPath: string): Promise<void> {
  const srcFullPath = safeResolvePath(sourcePath);
  const destFullPath = safeResolvePath(destPath);

  // If dest is directory, we place source inside it
  const destStat = await fs.stat(destFullPath);
  let finalDest = destFullPath;
  if (destStat.isDirectory()) {
    finalDest = path.join(destFullPath, path.basename(srcFullPath));
  }

  await fs.rename(srcFullPath, finalDest);
}
