import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";

import { AGENT_NAME } from "@/lib/brand";

const execFileAsync = promisify(execFile);

const HERMES_BIN = process.env.HERMES_BIN ?? `${os.homedir()}/.local/bin/hermes`;

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

type SystemdScope = "system" | "user";

interface ServiceCandidate {
  id: string;
  name: string;
  unit: string;
  scope: SystemdScope;
  port: number | null;
  installPathFallback: string;
  description: string;
}

const SERVICE_CANDIDATES: ServiceCandidate[] = [
  {
    id: "hermes-gateway",
    name: `${AGENT_NAME} Hermes Gateway`,
    unit: "hermes-gateway.service",
    scope: "user",
    port: Number(process.env.HERMES_AGENT_PORT || "8642"),
    installPathFallback: `${os.homedir()}/.config/systemd/user/hermes-gateway.service`,
    description: `OpenAI-compatible local agent gateway for ${AGENT_NAME} telemetry and completions.`,
  },
  {
    id: "vera-dash",
    name: `${AGENT_NAME} Dashboard`,
    unit: "dsa-dashboard.service",
    scope: "system",
    port: 3000,
    installPathFallback: "/etc/systemd/system/dsa-dashboard.service",
    description: "Authenticated Next.js command dashboard served behind the local proxy.",
  },
  {
    id: "ssh-server",
    name: "OpenSSH Server",
    unit: "ssh.service",
    scope: "system",
    port: 22,
    installPathFallback: "/lib/systemd/system/ssh.service",
    description: "Secure remote shell service for administrative access.",
  },
  {
    id: "cron",
    name: "Cron Scheduler",
    unit: "cron.service",
    scope: "system",
    port: null,
    installPathFallback: "/lib/systemd/system/cron.service",
    description: "Time-based job scheduler used for recurring maintenance tasks.",
  },
  {
    id: "chrony",
    name: "Chrony Time Sync",
    unit: "chrony.service",
    scope: "system",
    port: null,
    installPathFallback: "/lib/systemd/system/chrony.service",
    description: "NTP time synchronisation daemon keeping the system clock aligned.",
  },
  {
    id: "php-fpm-8-4",
    name: "PHP-FPM 8.4",
    unit: "php8.4-fpm.service",
    scope: "system",
    port: null,
    installPathFallback: "/lib/systemd/system/php8.4-fpm.service",
    description: "FastCGI process manager for PHP-based site workloads.",
  },
  {
    id: "open-vm-tools",
    name: "Open VM Tools",
    unit: "open-vm-tools.service",
    scope: "system",
    port: null,
    installPathFallback: "/lib/systemd/system/open-vm-tools.service",
    description: "Guest integration tools for virtualized environments.",
  },
  {
    id: "modem-manager",
    name: "ModemManager",
    unit: "ModemManager.service",
    scope: "system",
    port: null,
    installPathFallback: "/lib/systemd/system/ModemManager.service",
    description: "Mobile broadband and modem control daemon.",
  },
  {
    id: "multipathd",
    name: "Multipath Daemon",
    unit: "multipathd.service",
    scope: "system",
    port: null,
    installPathFallback: "/lib/systemd/system/multipathd.service",
    description: "Storage multipath coordination service for redundant block devices.",
  },
  {
    id: "networkd-dispatcher",
    name: "Networkd Dispatcher",
    unit: "networkd-dispatcher.service",
    scope: "system",
    port: null,
    installPathFallback: "/lib/systemd/system/networkd-dispatcher.service",
    description: "Dispatch hooks for network interface state changes.",
  },
  {
    id: "fwupd",
    name: "Firmware Update Daemon",
    unit: "fwupd.service",
    scope: "system",
    port: null,
    installPathFallback: "/lib/systemd/system/fwupd.service",
    description: "System firmware update service.",
  },
];

function systemdEnv(scope: SystemdScope) {
  if (scope !== "user") {
    return process.env;
  }

  const uid = typeof process.getuid === "function" ? process.getuid() : 1000;
  const runtimeDir = `/run/user/${uid}`;

  return {
    ...process.env,
    XDG_RUNTIME_DIR: runtimeDir,
    DBUS_SESSION_BUS_ADDRESS: `unix:path=${runtimeDir}/bus`,
  };
}

async function runSystemctl(scope: SystemdScope, args: string[]) {
  const { stdout } = await execFileAsync("systemctl", [...(scope === "user" ? ["--user"] : []), ...args], {
    env: systemdEnv(scope),
    maxBuffer: 1024 * 1024,
  });

  return stdout.trim();
}

async function getSystemdProperty(scope: SystemdScope, unit: string, property: string) {
  try {
    const value = await runSystemctl(scope, ["show", unit, "--property", property, "--value"]);
    return value || null;
  } catch {
    return null;
  }
}

async function getSystemdStatus(unit: string, scope: SystemdScope): Promise<InstalledService["status"]> {
  try {
    const state = await runSystemctl(scope, ["is-active", unit]);

    if (state === "active") return "online";
    if (state === "activating") return "starting";
    if (state === "inactive" || state === "failed") return "offline";
    return "unknown";
  } catch {
    return "offline";
  }
}

async function inspectService(candidate: ServiceCandidate): Promise<InstalledService | null> {
  const [loadState, status, fragmentPath] = await Promise.all([
    getSystemdProperty(candidate.scope, candidate.unit, "LoadState"),
    getSystemdStatus(candidate.unit, candidate.scope),
    getSystemdProperty(candidate.scope, candidate.unit, "FragmentPath"),
  ]);

  if (loadState !== "loaded") {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    port: candidate.port,
    status,
    installPath: fragmentPath || candidate.installPathFallback,
    source: "systemd",
    description: candidate.description,
  };
}

export async function getInstalledServices(): Promise<InstalledService[]> {
  const services = await Promise.all(SERVICE_CANDIDATES.map((candidate) => inspectService(candidate)));
  return services.filter((service): service is InstalledService => service !== null);
}
