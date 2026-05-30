const FALLBACK_AGENT_NAME = "Agent";
const FALLBACK_AGENT_AVATAR = "/def_avatar.png";

function normalisePublicPath(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_NAME?.trim() || FALLBACK_AGENT_NAME;
export const AGENT_AVATAR = normalisePublicPath(process.env.NEXT_PUBLIC_AGENT_AVATAR, FALLBACK_AGENT_AVATAR);
export const AGENT_DASHBOARD_TITLE = `${AGENT_NAME} Agentic Dashboard`;
export const AGENT_DASHBOARD_DESCRIPTION = `DarkSenses ${AGENT_NAME} control-center dashboard with telemetry, vault browsing, and service registry panels.`;
