# DARKSENSES Agent Command Dashboard

Fresh download? Start with `ONBOARDING.md`.

This repository contains the DarkSenses agent control-center dashboard for Hermes: a dark, glassy command-center UI with telemetry, vault browsing, and service registry panels.

## Read first
- `ONBOARDING.md`
- `AGENT.md` / `AGENTS.md`
- `CLAUDE.md`
- `setup.sh`
- `env.example`
- `skills/software-development/dsa-dashboard-onboarding/SKILL.md`

## Quick start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `env.example` and fill the real values.
3. Run the setup helper:
   ```bash
   ./setup.sh
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

## App identity
- App title: Agentic Dashboard
- Brand: DarkSenses / configurable agent name
- Icons live in `src/app/`

## Agent note
If you are an AI agent, use the onboarding doc and the skill bundle before making changes. Do not guess admin credentials, public URLs, or vault paths.
