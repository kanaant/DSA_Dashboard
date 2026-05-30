#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env"
HERMES_ENV_FILE="${HERMES_ENV_FILE:-$HOME/.hermes/.env}"
DEFAULT_VAULT_PATH="${DEFAULT_VAULT_PATH:-$HOME/vault}"
DEFAULT_HERMES_URL="${DEFAULT_HERMES_URL:-http://127.0.0.1:8642}"
DEFAULT_HERMES_MODEL="${DEFAULT_HERMES_MODEL:-hermes-agent}"
DEFAULT_SITE_URL="${DEFAULT_SITE_URL:-http://localhost:3000}"
DEFAULT_AGENT_NAME="${DEFAULT_AGENT_NAME:-Agent}"
DEFAULT_AGENT_AVATAR="${DEFAULT_AGENT_AVATAR:-/def_avatar.png}"
DEFAULT_EDGE_MODE="${DEFAULT_EDGE_MODE:-existing}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

_ANSWER=""
_read() {
  if [ -t 0 ]; then
    read -r -p "$1" _ANSWER || _ANSWER=""
  else
    IFS= read -r _ANSWER || _ANSWER=""
  fi
  RETURNED="$_ANSWER"
}
prompt_default() {
  local var_name="$1"
  local label="$2"
  local default_value="$3"
  local current_value="${!var_name:-}"
  local response=""
  if [[ -n "$current_value" ]]; then
    default_value="$current_value"
  fi
  _read "$label [$default_value]: "
  if [[ -n "$RETURNED" ]]; then
    printf -v "$var_name" '%s' "$RETURNED"
  else
    printf -v "$var_name" '%s' "$default_value"
  fi
}
prompt_secret() {
  local var_name="$1"
  local label="$2"
  local response=""
  if [ -t 0 ]; then
    read -r -s -p "$label: " response || response=""
    echo
  else
    IFS= read -r response || response=""
  fi
  if [[ -n "$response" ]]; then
    printf -v "$var_name" '%s' "$response"
  elif [[ -z "${!var_name:-}" ]]; then
    echo "A value is required for $label." >&2
    exit 1
  fi
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n'
  else
    python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(32))
PY
  fi
}

quote_env_value() {
  python3 - "$1" <<'PY'
import json
import sys
print(json.dumps(sys.argv[1]))
PY
}

write_env_file() {
  cat > "$ENV_FILE" <<EOF
AUTH_SECRET=$(quote_env_value "$AUTH_SECRET")
ADMIN_USERNAME=$(quote_env_value "$ADMIN_USERNAME")
ADMIN_PASSWORD=$(quote_env_value "$ADMIN_PASSWORD")
NEXT_PUBLIC_APP_URL=$(quote_env_value "$NEXT_PUBLIC_APP_URL")
NEXT_PUBLIC_SITE_URL=$(quote_env_value "$NEXT_PUBLIC_SITE_URL")
NEXT_PUBLIC_AGENT_NAME=$(quote_env_value "$NEXT_PUBLIC_AGENT_NAME")
NEXT_PUBLIC_AGENT_AVATAR=$(quote_env_value "$NEXT_PUBLIC_AGENT_AVATAR")
HERMES_AGENT_URL=$(quote_env_value "$HERMES_AGENT_URL")
HERMES_AGENT_API_KEY=$(quote_env_value "$HERMES_AGENT_API_KEY")
HERMES_AGENT_MODEL_NAME=$(quote_env_value "$HERMES_AGENT_MODEL_NAME")
HERMES_HOME=$(quote_env_value "$HERMES_HOME")
VAULT_PATH=$(quote_env_value "$VAULT_PATH")
EOF
}

ensure_hermes_api() {
  if [[ "${ENABLE_HERMES_API:-1}" != "1" ]]; then
    echo "Hermes API update skipped by request (ENABLE_HERMES_API!=1)."
    return 0
  fi

  if [[ ! -f "$HERMES_ENV_FILE" ]]; then
    echo "Hermes env file not found: $HERMES_ENV_FILE" >&2
    echo "Create it first, then set API_SERVER_ENABLED=true and restart hermes-gateway.service." >&2
    return 0
  fi

  python3 - "$HERMES_ENV_FILE" "${HERMES_AGENT_API_KEY}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
api_key = sys.argv[2]
text = path.read_text()
lines = text.splitlines()
keys = {
    "API_SERVER_ENABLED": "true",
    "API_SERVER_HOST": "127.0.0.1",
    "API_SERVER_PORT": "8642",
    "API_SERVER_MODEL_NAME": "hermes-agent",
}
if api_key:
    keys["API_SERVER_KEY"] = api_key

seen = set()
out = []
for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        out.append(line)
        continue
    k, _, _ = line.partition("=")
    if k in keys:
        out.append(f"{k}={keys[k]}")
        seen.add(k)
    else:
        out.append(line)
for k, v in keys.items():
    if k not in seen:
        out.append(f"{k}={v}")
path.write_text("\n".join(out) + "\n")
PY

  echo "Hermes API settings updated in $HERMES_ENV_FILE"
  echo "CRITICAL: Restarting the Hermes gateway will sever any active agent connection."
  echo "Verify if it's already online first with: curl -sS --max-time 3 http://127.0.0.1:8642/health"
  echo "If offline, restart using: systemctl --user restart hermes-gateway.service && hermes status"
}

configure_nginx() {
  local site_url="$1"
  local server_name
  server_name="$(python3 - "$site_url" <<'PY'
from urllib.parse import urlparse
import sys
u = urlparse(sys.argv[1])
print(u.hostname or sys.argv[1])
PY
)"

  local nginx_conf="/tmp/dsa-dashboard.nginx.conf"
  cat > "$nginx_conf" <<EOF
server {
    listen 80;
    server_name ${server_name};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  echo "Generated nginx config: $nginx_conf"
  if command -v sudo >/dev/null 2>&1; then
    echo "Attempting to install nginx site configuration..."
    sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    sudo cp "$nginx_conf" /etc/nginx/sites-available/dsa-dashboard.conf
    if [[ ! -e /etc/nginx/sites-enabled/dsa-dashboard.conf ]]; then
      sudo ln -s /etc/nginx/sites-available/dsa-dashboard.conf /etc/nginx/sites-enabled/dsa-dashboard.conf
    fi
    sudo nginx -t
    sudo systemctl reload nginx
    echo "nginx configured and reloaded."
  else
    echo "sudo is unavailable; copy the generated config into your nginx service manually."
  fi
}

configure_existing_service() {
  local site_url="$1"
  local server_name
  server_name="$(python3 - "$site_url" <<'PY'
from urllib.parse import urlparse
import sys
u = urlparse(sys.argv[1])
print(u.hostname or sys.argv[1])
PY
)"

  local out_file="$ROOT_DIR/deploy/existing-web-service-proxy.conf.example"
  mkdir -p "$ROOT_DIR/deploy"
  cat > "$out_file" <<EOF
# Example reverse-proxy block for an existing web service
# server_name: ${server_name}
# upstream: http://127.0.0.1:3000

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF
  echo "Wrote existing-service proxy example to $out_file"
}

require_cmd node
require_cmd npm

if command -v hermes >/dev/null 2>&1; then
  echo "Hermes CLI detected: $(command -v hermes)"
else
  echo "Hermes CLI not found on PATH. The dashboard can still be prepared, but Hermes API enablement must be done separately." >&2
fi

prompt_default ADMIN_USERNAME "Admin username" "${ADMIN_USERNAME:-admin}"
prompt_secret ADMIN_PASSWORD "Admin password"
prompt_default AUTH_SECRET "AUTH_SECRET (leave blank to generate a new one)" "${AUTH_SECRET:-}"
if [[ -z "${AUTH_SECRET:-}" ]]; then
  AUTH_SECRET="$(generate_secret)"
  echo "Generated AUTH_SECRET."
fi
prompt_default NEXT_PUBLIC_SITE_URL "Public site URL" "$DEFAULT_SITE_URL"
NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_SITE_URL}"
prompt_default NEXT_PUBLIC_AGENT_NAME "Agent name" "$DEFAULT_AGENT_NAME"
prompt_default NEXT_PUBLIC_AGENT_AVATAR "Agent avatar public path" "$DEFAULT_AGENT_AVATAR"
prompt_default VAULT_PATH "Vault path" "$DEFAULT_VAULT_PATH"
prompt_default HERMES_AGENT_URL "Hermes API URL" "$DEFAULT_HERMES_URL"
prompt_secret HERMES_AGENT_API_KEY "Hermes API key / bearer token"
prompt_default HERMES_AGENT_MODEL_NAME "Hermes model name" "$DEFAULT_HERMES_MODEL"
prompt_default HERMES_HOME "Hermes home path" "$HOME/.hermes"
prompt_default EDGE_MODE "Web edge mode (nginx or existing)" "$DEFAULT_EDGE_MODE"

mkdir -p "$VAULT_PATH"
write_env_file

echo "Created $ENV_FILE"
echo "Vault directory ready: $VAULT_PATH"

echo "Installing project dependencies..."
npm install

ensure_hermes_api

case "${EDGE_MODE,,}" in
  nginx)
    if command -v sudo >/dev/null 2>&1; then
      configure_nginx "$NEXT_PUBLIC_SITE_URL"
    else
      echo "sudo is unavailable; writing nginx example config and continuing."
      configure_existing_service "$NEXT_PUBLIC_SITE_URL"
    fi
    ;;
  existing)
    configure_existing_service "$NEXT_PUBLIC_SITE_URL"
    ;;
  *)
    echo "Unknown edge mode: $EDGE_MODE" >&2
    echo "Use 'nginx' or 'existing'." >&2
    exit 1
    ;;
esac

echo "Setup complete."
echo "Next: npm run dev"
echo "Then verify: /login, /dashboard, and /api/hermes/status"
