# Onboarding checklist for the agent dashboard

Use this checklist when a fresh zip is unpacked and the agent needs to bring the site online.

1. Read `ONBOARDING.md`.
2. Confirm the machine has Node.js and npm.
3. Confirm the Hermes gateway is running and the Hermes API server is enabled in `~/.hermes/.env`.
4. Ask the human for:
   - admin username
   - admin password
   - public site URL
   - vault path
   - nginx or existing web service
5. Copy `env.example` to `.env` and fill the real values.
6. Run `./setup.sh`.
7. Start the app with `npm run dev`.
8. Validate:
   - `/login`
   - `/dashboard`
   - `/api/hermes/status`
   - branded title and icons
