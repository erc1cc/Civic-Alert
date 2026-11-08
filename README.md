# SD Voice Town Hall

A sensorless civic issue reporting system and live Town Hall dashboard for San Diego. Residents call an ElevenLabs voice agent; the backend classifies each report, geocodes the landmarks the caller names, and clusters reports into hotspots.

## Run it
```bash
npm install
npm run build        # installs + builds the React dashboard into client/dist
npm start            # http://localhost:3000: API + dashboard on one port (works in Daytona)
```
For frontend development with hot reload, run `npm run dev:server` and `npm run dev:client` in two terminals, then open http://localhost:5173 (Vite forwards `/api` to port 3000).

- To enable live voice calls, copy `client/.env.example` to `client/.env`, set `VITE_ELEVENLABS_AGENT_ID` (see `agent/ELEVENLABS_SETUP.md`), and rebuild. Without it, use the **"No mic? Simulate a call"** panel.
- Data lives in `server/data/issues.json`. It's created from `server/seed.js` (35 seeded calls) on first run. **↺ Reset** in the UI, or `POST /api/reset`, restores it.
- Server env vars: `PORT`, `ELEVENLABS_WEBHOOK_SECRET` (optional HMAC check), `DISABLE_NOMINATIM=1` (offline: skip the OpenStreetMap geocoding fallback).

## Deploy to Daytona (one command)
1. Create an API key at **app.daytona.io → API Keys**, then `cp .env.example .env` and paste it in as `DAYTONA_API_KEY`.
2. Make sure `client/.env` has your `VITE_ELEVENLABS_AGENT_ID`. The script bakes it into the build.
3. Run:
   ```bash
   npm run deploy:daytona
   ```
   The script creates a **public** sandbox with auto-stop off, uploads the code, runs `npm install && npm run build`, starts the server on port 3000, and prints the public URL. The sandbox id is saved to `.daytona-sandbox`.
4. Re-run the same command after any code change to redeploy to the same sandbox and URL. Options: `RESET_DATA=1` restores the 35 seeded calls, `FRESH=1` creates a brand-new sandbox.
5. To also turn on per-case sandboxes (next section) in the deployed app, set `CASE_SANDBOXES=1` in `.env` and redeploy. The hosting sandbox is labelled `sd-voice-town-hall-host`, so the per-case cleanup sweep never touches it.
6. Add the printed hostname to the ElevenLabs agent's allowlist. For the optional post-call webhook, use the printed webhook URL and put the secret in `.env` as `ELEVENLABS_WEBHOOK_SECRET`, then redeploy.

## Per-case Daytona sandboxes

Set `DAYTONA_API_KEY` and every live case gets its own [Daytona](https://www.daytona.io) sandbox (`server/sandbox.js`); without it the app runs exactly as before.

- **Opens** when a case goes live: a new report, a PIN-reopened draft, or a merge into a case that has none. Preliminary drafts don't get one. Opening runs in the background, so it never slows a voice call. The sandbox starts with the case details in `case.json`, and its id is stored on the issue as `sandbox_id`.
- **Closes (deleted)** when the case resolves (3 "it's gone" votes, or decay), and on **↺ Reset**.
- **Safety nets:** sandboxes are ephemeral and auto-delete after `DAYTONA_IDLE_MINUTES` idle (default 60); a sweep at startup and every 15 min deletes sandboxes whose case is no longer live.
- **Doing work in a case:** `const sb = await openCase(issue)` from `server/sandbox.js`, then use the SDK, e.g. `sb.process.executeCommand(...)`.
- Env vars: `DAYTONA_API_KEY`, optional `DAYTONA_API_URL`, `DAYTONA_IDLE_MINUTES`, `DISABLE_DAYTONA=1`.

## Layout
- `server/index.js`: Express routes, the SSE stream at `/api/stream`, and static hosting
- `server/pipeline.js`: PIN reopen, preliminary drafts, hang-up handling, 800 m dedup with 40% radius shrinking, Tier 1 flagging, decay, and the executive summary
- `server/categories.js`: the 23 Get It Done categories, tiers, and the keyword classifier
- `server/geocode.js`: San Diego landmark/intersection lookup, with Nominatim as a fallback
- `agent/ELEVENLABS_SETUP.md`: voice agent prompt, client tool and webhook setup
- `client/src`: React dashboard (`App.jsx`, `components/MapView.jsx`, `Sidebar.jsx`, `CallWidget.jsx`)
- `scripts/deploy-daytona.mjs`: one-command Daytona deploy (Daytona TypeScript SDK)
- `FRONTEND_PROMPT.md`: the spec the dashboard was built from

## Quick test
```bash
curl -X POST localhost:3000/api/tools/submit-report -H 'Content-Type: application/json' \
  -d '{"transcript":"another huge pothole at 7th and Market"}'
```
