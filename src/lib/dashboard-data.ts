import { execFile, exec } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";

import { AGENT_NAME } from "@/lib/brand";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const HERMES_BIN = process.env.HERMES_BIN ?? "/home/dscalez/.local/bin/hermes";

export type KanbanStatus = "backlog" | "active" | "blocked" | "done";
export type HermesTaskStatus =
  | "triage"
  | "todo"
  | "scheduled"
  | "ready"
  | "running"
  | "blocked"
  | "review"
  | "done"
  | "archived";
export type KanbanAction = "start" | "block" | "complete" | "unblock" | "archive";

export interface KanbanItem {
  id: string;
  title: string;
  detail: string;
  status: KanbanStatus;
  rawStatus: HermesTaskStatus;
  priority: "low" | "medium" | "high";
  source: string;
  assignee: string | null;
  sessionId: string | null;
  updatedAt: string;
}

export interface InstalledService {
  id: string;
  name: string;
  port: number | null;
  status: "online" | "offline" | "starting" | "unknown";
  installPath: string;
  source: "systemd" | "process" | "configured";
  description: string;
}

interface HermesTaskRow {
  id: string;
  title: string;
  body: string | null;
  assignee: string | null;
  status: HermesTaskStatus;
  priority: number;
  created_by: string | null;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  workspace_path: string | null;
  result: string | null;
  session_id: string | null;
}

function hermesEnv() {
  return {
    ...process.env,
    HERMES_BIN,
  };
}

function formatTimestamp(seconds: number | null | undefined) {
  if (!seconds) {
    return new Date().toISOString();
  }

  return new Date(seconds * 1000).toISOString();
}

function mapPriority(priority: number): KanbanItem["priority"] {
  if (priority >= 6) return "high";
  if (priority >= 3) return "medium";
  return "low";
}

function groupStatus(status: HermesTaskStatus): KanbanStatus {
  if (status === "blocked") return "blocked";
  if (status === "done" || status === "archived") return "done";
  if (status === "running" || status === "review") return "active";
  return "backlog";
}

function summariseDetail(task: HermesTaskRow) {
  const fragments = [task.body?.trim() || task.result?.trim() || "No task body provided."];

  if (task.assignee) {
    fragments.push(`Assignee: ${task.assignee}`);
  }

  if (task.workspace_path) {
    fragments.push(task.workspace_path);
  }

  if (task.session_id) {
    fragments.push(`Session: ${task.session_id.slice(0, 10)}`);
  }

  return fragments.join(" · ");
}

function mapTaskToItem(task: HermesTaskRow): KanbanItem {
  return {
    id: task.id,
    title: task.title,
    detail: summariseDetail(task),
    status: groupStatus(task.status),
    rawStatus: task.status,
    priority: mapPriority(task.priority),
    source: task.created_by ?? "hermes",
    assignee: task.assignee,
    sessionId: task.session_id,
    updatedAt: formatTimestamp(task.completed_at ?? task.started_at ?? task.created_at),
  };
}

async function runHermesKanban(args: string[]) {
  const { stdout } = await execFileAsync(HERMES_BIN, ["kanban", ...args], {
    env: hermesEnv(),
    maxBuffer: 8 * 1024 * 1024,
  });

  return stdout;
}

async function getHermesTasks(): Promise<HermesTaskRow[]> {
  const stdout = await runHermesKanban(["list", "--json", "--sort", "updated"]);
  const parsed = JSON.parse(stdout);

  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected Hermes Kanban response shape");
  }

  return parsed as HermesTaskRow[];
}

async function getHermesTaskById(id: string): Promise<HermesTaskRow | null> {
  const tasks = await getHermesTasks();
  return tasks.find((task) => task.id === id) ?? null;
}

async function ensureTaskExists(taskId: string): Promise<HermesTaskRow> {
  const task = await getHermesTaskById(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} was not found in Hermes Kanban`);
  }
  return task;
}

async function promoteTask(taskId: string) {
  await runHermesKanban(["promote", taskId, `Moved from the ${AGENT_NAME} dashboard`]);
}

async function unblockTask(taskId: string) {
  await runHermesKanban(["unblock", taskId]);
}

async function claimTask(taskId: string) {
  await runHermesKanban(["claim", taskId]);
}

async function blockTask(taskId: string) {
  await runHermesKanban(["block", taskId, `Moved from the ${AGENT_NAME} dashboard`]);
}

async function completeTask(taskId: string) {
  await runHermesKanban(["complete", taskId, "--result", `Completed from the ${AGENT_NAME} dashboard`]);
}

async function archiveTask(taskId: string) {
  await runHermesKanban(["archive", taskId]);
}

async function startTask(task: HermesTaskRow) {
  switch (task.status) {
    case "ready":
      break;
    case "todo":
    case "blocked":
      await promoteTask(task.id);
      break;
    case "scheduled":
      await unblockTask(task.id);
      break;
    case "triage":
      throw new Error("This task is still in triage and needs specification before it can be started.");
    case "running":
    case "review":
    case "done":
    case "archived":
      throw new Error(`Task ${task.id} is already ${task.status}; it cannot be started again.`);
    default:
      throw new Error(`Unsupported task status: ${task.status}`);
  }

  const readyTask = await ensureTaskExists(task.id);
  if (readyTask.status === "todo") {
    await promoteTask(task.id);
  }

  const currentTask = await ensureTaskExists(task.id);
  if (currentTask.status !== "ready") {
    throw new Error(`Task ${task.id} could not be promoted to ready (current status: ${currentTask.status}).`);
  }

  await claimTask(task.id);
}

export async function getKanbanItems(): Promise<KanbanItem[]> {
  const tasks = await getHermesTasks();
  return tasks.map(mapTaskToItem);
}

export async function updateKanbanItem(
  id: string,
  action: KanbanAction
): Promise<KanbanItem> {
  const task = await ensureTaskExists(id);

  switch (action) {
    case "start":
      await startTask(task);
      break;
    case "block":
      if (task.status !== "running" && task.status !== "ready") {
        throw new Error(`Task ${task.id} must be running or ready before it can be blocked (current status: ${task.status}).`);
      }
      await blockTask(task.id);
      break;
    case "complete":
      if (task.status !== "running" && task.status !== "ready" && task.status !== "blocked") {
        throw new Error(`Task ${task.id} must be running, ready, or blocked before it can be completed (current status: ${task.status}).`);
      }
      await completeTask(task.id);
      break;
    case "unblock":
      if (task.status !== "blocked" && task.status !== "scheduled") {
        throw new Error(`Task ${task.id} must be blocked or scheduled before it can be unblocked (current status: ${task.status}).`);
      }
      await unblockTask(task.id);
      break;
    case "archive":
      await archiveTask(task.id);
      break;
    default: {
      const unreachable: never = action;
      throw new Error(`Unsupported kanban action: ${String(unreachable)}`);
    }
  }

  const refreshed = await ensureTaskExists(id);
  return mapTaskToItem(refreshed);
}

async function getSystemdStatus(unit: string): Promise<InstalledService["status"]> {
  try {
    const { stdout } = await execAsync(`systemctl --user is-active ${unit}`, {
      env: {
        ...process.env,
        XDG_RUNTIME_DIR: "/run/user/1000",
        DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
      },
    });

    const state = stdout.trim();
    if (state === "active") return "online";
    if (state === "activating") return "starting";
    if (state === "inactive" || state === "failed") return "offline";
    return "unknown";
  } catch {
    return "offline";
  }
}

async function isPortListening(port: number) {
  try {
    const { stdout } = await execAsync(`ss -ltn '( sport = :${port} )'`);
    return stdout.includes(`:${port}`);
  } catch {
    return false;
  }
}

export async function getInstalledServices(): Promise<InstalledService[]> {
  const hermesPort = Number(process.env.HERMES_AGENT_PORT || "8642");
  const appPort = 3000;
  const hermesHome = process.env.HERMES_HOME || "/home/dscalez/.hermes";
  const appPath = process.cwd();

  const [hermesStatus, appListening, nginxListening] = await Promise.all([
    getSystemdStatus("hermes-gateway.service"),
    isPortListening(appPort),
    isPortListening(80),
  ]);

  return [
    {
      id: "hermes-gateway",
      name: "Hermes Gateway",
      port: hermesPort,
      status: hermesStatus,
      installPath: existsSync(hermesHome) ? hermesHome : "/home/dscalez/.hermes",
      source: "systemd",
      description: `OpenAI-compatible local agent gateway for ${AGENT_NAME} telemetry and completions.`,
    },
    {
      id: "dsa-dashboard",
      name: `${AGENT_NAME} Dashboard`,
      port: appPort,
      status: appListening ? "online" : "unknown",
      installPath: appPath,
      source: "process",
      description: "Authenticated Next.js command dashboard served behind the local proxy.",
    },
    {
      id: "nginx-edge",
      name: "Nginx Edge Proxy",
      port: 80,
      status: nginxListening ? "online" : "unknown",
      installPath: "/etc/nginx",
      source: "configured",
      description: "LAN-facing reverse proxy forwarding dashboard traffic to the app runtime.",
    },
  ];
}
