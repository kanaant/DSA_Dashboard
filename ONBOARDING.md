# Agent Dashboard Onboarding

Fresh download? Read this first.

This repo is the DARKSENSES agent / Hermes control-center dashboard. A new agent should use this file as the first stop before touching code, docs, or environment files.

## First look order
1. `ONBOARDING.md`
2. `README.md`
3. `AGENT.md` / `AGENTS.md`
4. `CLAUDE.md`
5. `skills/software-development/dsa-dashboard-onboarding/SKILL.md`

## What you need before setup
- Node.js and npm
- The Hermes CLI (`hermes`) and a running Hermes gateway
- A decision about the public web edge:
  - install and configure nginx, or
  - wire the dashboard into an existing web service
- Human-provided values for the local `.env`

## Required human inputs
The setup flow should ask for:
- Admin username
- Admin password
- Public site URL
- Vault location
- Whether to install nginx or configure an existing web service
- Any site-specific agent name and avatar path you want the dashboard to use

## Hermes API enablement
This step is required and must happen before dashboard setup so the app can reach the control plane on first run.

Run these commands first, then confirm the status endpoint before proceeding:
```bash
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
lines = text.splitlines()
seen = set()
out = []
for line in lines:
  if not line or line.lstrip().startswith('#') or '=' not in line:
    out.append(line)
    continue
  k = line.partition('=')[0].strip()
  if k in updates:
    out.append(f'{k}={updates[k]}')
    seen.add(k)
  else:
    out.append(line)
for k, v in updates.items():
  if k not in seen:
    out.append(f'{k}={v}')
(path).write_text('\n'.join(out) + '\n')
PY

systemctl --user restart hermes-gateway.service
hermes status
curl -sS http://127.0.0.1:8642/health
```

Checklist after enablement:
- `/api/hermes/status` returns `online=true`
- Port `8642` is reachable from the dashboard host
- Gateway is running after the restart

If `ensure_hermes_api` in `setup.sh` is skipped or fails, the dashboard will report Hermes connection refused. Fix the Hermes env first, then continue with the dashboard setup.

Typical values in `~/.hermes/.env`:
- `API_SERVER_ENABLED=true`
- `API_SERVER_HOST=127.0.0.1`
- `API_SERVER_PORT=8642`
- `API_SERVER_MODEL_NAME=hermes-agent`
- `API_SERVER_KEY=<secret bearer token, set later if needed>`
- `API_SERVER_CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000,<public-site-url>`

## Local app setup flow
1. Confirm Node is installed:
   ```bash
   node -v
   npm -v
   ```
2. Copy `env.example` to `.env` and fill the real values.
3. Run `./setup.sh`.
4. Start the app with `npm run dev`.
5. Confirm the app opens at the public URL and that `/login` and `/dashboard` work.

## Files the agent should know about immediately
- `setup.sh` — prompts for the values above and prepares the workspace
- `env.example` — template for the project `.env`
- `src/app/layout.tsx` — app metadata and icons
- `src/app/favicon.ico`, `src/app/icon.png`, `src/app/apple-icon.png` — branded app icons
- `skills/software-development/dsa-dashboard-onboarding/SKILL.md` — reusable onboarding skill bundle

## Validation targets
A fresh agent should verify:
- Node is present
- Hermes status is healthy
- The project `.env` exists and contains real values
- The vault directory exists
- The web edge is configured
- `NEXT_PUBLIC_AGENT_NAME` and `NEXT_PUBLIC_AGENT_AVATAR` in `.env` are set to the selected agent branding
- The dashboard loads and shows the configured agent identity, not a template title or generic icon

## Notes
- Do not expose the Hermes bearer key in browser code.
- Do not invent admin credentials; ask the human.
- Keep the docs thin: this file is the entrypoint, and the reusable workflow lives in the skill bundle.
