# AGENTS.md

Fresh agent entrypoint: `ONBOARDING.md`

Use the onboarding skill bundle when starting from a downloaded zip:
- `skills/software-development/dsa-dashboard-onboarding/SKILL.md`

If you need the one-line alias, `AGENT.md` points to the same first-look flow.

Core operational facts:
- Node.js is required
- Hermes API must be enabled in `~/.hermes/.env`
- `setup.sh` prepares the project `.env`, vault path, and edge configuration
- Ask the human for admin credentials, public URL, vault location, and nginx vs existing-web-service choice

Keep the repo docs thin. `ONBOARDING.md` is the source of truth for initial setup.
