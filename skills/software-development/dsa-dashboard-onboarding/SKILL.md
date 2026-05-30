---
name: agent-dashboard-onboarding
description: Use when a freshly downloaded DARKSENSES agent dashboard needs to be brought online, including Hermes API enablement, env setup, vault creation, and edge configuration.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [nextjs, onboarding, hermes, dashboard, setup, nginx, env]
    related_skills: [nextjs-dashboard-bootstrap, hermes-dashboard-command-center, hermes-agent]
---

# Agent Dashboard Onboarding Skill

## Overview
Use this skill when you are the first agent to touch a freshly downloaded copy of the DARKSENSES agent dashboard package.

The goal is to turn a raw zip/unpacked folder into a working dashboard environment without guessing any human-owned values. The skill covers the first-look order, the required questions to ask the human, the Hermes API enablement step, the project `.env`, vault creation, dependency install, and web-edge setup.

See `references/onboarding-checklist.md` for the short operator checklist.

## When to Use
- The repository was just downloaded or unpacked
- The agent does not know the admin credentials yet
- The public URL is not defined yet
- The vault location is not defined yet
- Hermes API support must be enabled before the dashboard can connect to the control plane
- nginx or an existing reverse proxy must be chosen during setup

Do not use this skill for feature development once the app is already online.

## First Look Order
1. Open `ONBOARDING.md`
2. Read `README.md`
3. Read `AGENTS.md` or `AGENT.md`
4. Read `CLAUDE.md`
5. Inspect `setup.sh` and `env.example`
6. Ask the human for missing values instead of inventing them

## Required Questions for the Human
Ask for:
- Admin username
- Admin password
- Public site URL
- Vault path
- nginx vs existing web service
- Any site-specific agent name and avatar path for the dashboard

## Setup Flow
1. Confirm Node and npm exist.
2. Confirm the Hermes gateway is available.
3. Enable the Hermes API server in `~/.hermes/.env` following the onboarding doc.
4. Fill the project `.env` from `env.example`.
5. Run `./setup.sh`.
6. Start the app with `npm run dev`.
7. Validate the login page, dashboard routes, Hermes status endpoint, and branded icons.

## Common Pitfalls
- Do not write placeholder credentials into `.env`.
- Do not expose the Hermes bearer token in client-side code.
- Do not skip the vault path; the dashboard expects a concrete storage location.
- Do not assume nginx is desired; ask before changing the web edge.
- Do not accept template titles or generic icons as "done".

## Verification Checklist
- [ ] `node -v` and `npm -v` work
- [ ] `hermes status` reports a healthy gateway
- [ ] `~/.hermes/.env` has API server enabled
- [ ] `.env` contains real values
- [ ] Vault path exists
- [ ] Dependencies are installed
- [ ] The selected edge configuration is applied
- [ ] `/login` and `/dashboard` load
- [ ] The app title and favicon are branded
- [ ] The dashboard can reach Hermes through its proxy/status route
