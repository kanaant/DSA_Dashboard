import { type NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Telemetry {
  discordActive: boolean;
  telegramActive: boolean;
  whatsappActive: boolean;
  activeSessions: number;
  terminalBackend: string;
  sudoEnabled: boolean;
  skillsCount: number;
  pluginsCount: number;
  provider: string;
  pythonVersion: string;
}

let cachedTelemetry: Telemetry | null = null;

async function getTelemetry(forceSync: boolean): Promise<Telemetry> {
  // Bypasses slow CLI execution if cached data is available and sync is not forced
  if (cachedTelemetry && !forceSync) {
    return cachedTelemetry;
  }

  const sysEnv = {
    ...process.env,
    XDG_RUNTIME_DIR: "/run/user/1000",
    DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
    HOME: "/home/dscalez",
  };

  try {
    const [statusResult, skillsResult, pluginsResult] = await Promise.all([
      execAsync("/home/dscalez/.local/bin/hermes status", { env: sysEnv }).catch(() => ({ stdout: "" })),
      execAsync("/home/dscalez/.local/bin/hermes skills list | tail -n 2", { env: sysEnv }).catch(() => ({ stdout: "" })),
      execAsync("/home/dscalez/.local/bin/hermes plugins list", { env: sysEnv }).catch(() => ({ stdout: "" })),
    ]);

    const statusOut = statusResult.stdout;
    const skillsOut = skillsResult.stdout;
    const pluginsOut = pluginsResult.stdout;

    // Parse statusOut
    const discordActive = /Discord\s+✓ configured/i.test(statusOut);
    const telegramActive = /Telegram\s+✓ configured/i.test(statusOut);
    const whatsappActive = /WhatsApp\s+✓ configured/i.test(statusOut);

    const sessionMatch = statusOut.match(/Active:\s+(\d+)\s+session/i);
    const activeSessions = sessionMatch ? parseInt(sessionMatch[1], 10) : 0;

    const backendMatch = statusOut.match(/Backend:\s+([^\n\r]+)/i);
    const terminalBackend = backendMatch ? backendMatch[1].trim() : "local";

    const sudoEnabled = /Sudo:\s+✓ enabled/i.test(statusOut);

    const providerMatch = statusOut.match(/Provider:\s+([^\n\r]+)/i);
    const provider = providerMatch ? providerMatch[1].trim() : "OpenAI Codex";

    const pythonMatch = statusOut.match(/Python:\s+([^\n\r]+)/i);
    const pythonVersion = pythonMatch ? pythonMatch[1].trim() : "3.11";

    // Parse skillsOut: "0 hub-installed, 85 builtin, 4 local — 89 enabled, 0 disabled"
    const skillsMatch = skillsOut.match(/—\s+(\d+)\s+enabled/i);
    const skillsCount = skillsMatch ? parseInt(skillsMatch[1], 10) : 89;

    // Parse pluginsOut: Count occurrences of "│ enabled │"
    const pluginsCount = (pluginsOut.match(/│\s+enabled\s+│/g) || []).length;

    cachedTelemetry = {
      discordActive,
      telegramActive,
      whatsappActive,
      activeSessions,
      terminalBackend,
      sudoEnabled,
      skillsCount,
      pluginsCount,
      provider,
      pythonVersion,
    };
    return cachedTelemetry;
  } catch {
    return cachedTelemetry || {
      discordActive: true,
      telegramActive: false,
      whatsappActive: false,
      activeSessions: 1,
      terminalBackend: "local",
      sudoEnabled: true,
      skillsCount: 89,
      pluginsCount: 0,
      provider: "OpenAI Codex",
      pythonVersion: "3.11",
    };
  }
}

export async function GET(request: NextRequest) {
  const url = process.env.HERMES_AGENT_URL;
  const apiKey = process.env.HERMES_AGENT_API_KEY;
  const defaultModel = process.env.HERMES_AGENT_MODEL_NAME || "hermes-agent";

  if (!url || !apiKey) {
    return NextResponse.json(
      {
        online: false,
        model: null,
        latency: null,
        error: "Hermes environment variables not configured in .env",
      },
      { status: 500 }
    );
  }

  // Parse custom sync query parameter to trigger heavy commands
  const searchParams = request.nextUrl.searchParams;
  const forceSync = searchParams.get("sync") === "true";

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${url}/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const latency = Date.now() - startTime;
      let model = defaultModel;
      if (data && data.data && data.data[0]) {
        model = data.data[0].id;
      }

      // Load extended telemetry data (optionally forcing full rescan of subprocesses)
      const telemetry = await getTelemetry(forceSync);

      return NextResponse.json({
        online: true,
        model,
        latency,
        ...telemetry,
      });
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    // Port check failed. Let's do a fallback check using systemctl to see if the service is running.
    const sysEnv = {
      ...process.env,
      XDG_RUNTIME_DIR: "/run/user/1000",
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
    };

    let isServiceActive = false;
    try {
      const { stdout } = await execAsync("systemctl --user is-active hermes-gateway.service", {
        env: sysEnv,
      });
      isServiceActive = stdout.trim() === "active";
    } catch (cliErr: unknown) {
      const stdout = typeof cliErr === "object" && cliErr !== null && "stdout" in cliErr
        ? String((cliErr as { stdout?: unknown }).stdout || "")
        : "";
      isServiceActive = stdout.trim() === "active";
    }

    const telemetry = cachedTelemetry || {
      discordActive: false,
      telegramActive: false,
      whatsappActive: false,
      activeSessions: 0,
      terminalBackend: "local",
      sudoEnabled: false,
      skillsCount: 0,
      pluginsCount: 0,
      provider: "OpenAI Codex",
      pythonVersion: "3.11",
    };

    return NextResponse.json({
      online: false,
      model: null,
      latency: null,
      serviceStatus: isServiceActive ? "STARTING" : "OFFLINE",
      error: "Connection refused",
      ...telemetry,
    });
  }
}
