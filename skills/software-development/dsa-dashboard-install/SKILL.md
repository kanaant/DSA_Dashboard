---
name: dsa-dashboard-install
description: Fresh DSA Dashboard setup for Hermes
title: DSA Dashboard Install
triggers:
  - dsa dashboard
  - DSA_Dashboard
  - agentic dashboard
  - DarkSenses dashboard
preferred_client: terminal
---

# DSA Dashboard Install

Use this skill when installing or reinstalling `~/DSA_Dashboard-*.zip` into `~/html`, or the webroot of the web server being used.

## Known issue: interactive `setup.sh` vs piping
The shipped `setup.sh` uses `read` without non-interactive fallbacks. If STDIN is not a TTY, prompts may be silently skipped and variables get shifted, causing bad `.env` values.
Two fixes:
1. **Preferred**: patch `setup.sh` so `prompt_default` and `prompt_secret` fall back to `IFS= read -r` when STDIN is piped.
2. **Quick installer**: write the `.env` directly with the intended values.

## Fixed installer sequence

```bash
set -euo pipefail
cd ~/html

python3 - <<'PY'
import json, secrets
from pathlib import Path
html_dir = Path.home() / 'html'
vault = Path.home() / 'vault'
vault.mkdir(parents=True, exist_ok=True)
env = {
  'AUTH_SECRET': secrets.token_urlsafe(32),
  'ADMIN_USERNAME': '{ADMIN_USERNAME}',
  'ADMIN_PASSWORD': '{ADMIN_PASSWORD}',
  'NEXT_PUBLIC_APP_URL': '{NEXT_PUBLIC_APP_URL}',
  'NEXT_PUBLIC_SITE_URL': '{NEXT_PUBLIC_SITE_URL}',
  'NEXT_PUBLIC_AGENT_NAME': '{NEXT_PUBLIC_AGENT_NAME}',
  'NEXT_PUBLIC_AGENT_AVATAR': '{NEXT_PUBLIC_AGENT_AVATAR}',
  'HERMES_AGENT_URL': '{HERMES_AGENT_URL}',
  'HERMES_AGENT_API_KEY': '{HERMES_AGENT_API_KEY}',
  'HERMES_AGENT_MODEL_NAME': '{HERMES_AGENT_MODEL_NAME}',
  'HERMES_HOME': str(Path.home() / '.hermes'),
  'VAULT_PATH': str(vault),
}
(html_dir / '.env').write_text('\n'.join(f'{k}={json.dumps(v)}' for k, v in env.items()) + '\n')
PY

python3 - <<'PY'
from pathlib import Path
path = Path.home() / '.hermes' / '.env'
text = path.read_text()
updates = {
  'API_SERVER_ENABLED': 'true',
  'API_SERVER_HOST': '127.0.0.1',
  'API_SERVER_PORT': '8642',
  'API_SERVER_MODEL_NAME': 'hermes-agent',
}
key = '{HERMES_AGENT_API_KEY}'
if key:
    updates['API_SERVER_KEY'] = key
seen = set()
out = []
for line in text.splitlines():
    if not line or line.startswith('#') or '=' not in line:
        out.append(line)
        continue
    k = line.partition('=')[0].strip()
    if k in updates:
        out.append(f"{k}={updates[k]}")
        seen.add(k)
    else:
        out.append(line)
for k, v in updates.items():
    if k not in seen:
        out.append(f"{k}={v}")
path.write_text('\n'.join(out) + '\n')
PY

systemctl --user restart hermes-gateway.service
npm install
npm run dev
```

## Verification

```bash
hermes status | grep -E 'Gateway Service|Status'
curl -sS http://127.0.0.1:8642/health
curl -sS -o /dev/null -w 'index_%{http_code}' http://127.0.0.1:3000
curl -sS -o /dev/null -w 'login_%{http_code}' http://127.0.0.1:3000/login
curl -sS -o /dev/null -w 'dashboard_%{http_code}' http://127.0.0.1:3000/dashboard
curl -sS -o /dev/null -w 'health_%{http_code}' http://127.0.0.1:3000/api/hermes/status
```

## Backup the cleaned install

```bash
latest_zip=~/DSA_Dashboard-$(date +%Y%m%d-%H%M).zip
cd ~/html && zip -r "$latest_zip" . -x "node_modules/*" ".next/*"
```

## Placeholder values to replace
- `{ADMIN_USERNAME}`: dashboard admin
- `{ADMIN_PASSWORD}`: dashboard admin password
- `{NEXT_PUBLIC_APP_URL}` / `{NEXT_PUBLIC_SITE_URL}`: usually `http://localhost:3000`
- `{NEXT_PUBLIC_AGENT_NAME}`: agent display name
- `{NEXT_PUBLIC_AGENT_AVATAR}`: public avatar path
- `{HERMES_AGENT_URL}`: Hermes API URL
- `{HERMES_AGENT_API_KEY}`: Hermes bearer token
- `{HERMES_AGENT_MODEL_NAME}`: Hermes model name
