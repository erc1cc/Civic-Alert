# SD Voice Town Hall

A sensorless civic issue reporting system and live Town Hall dashboard for San Diego. Residents call a bilingual ElevenLabs voice agent; the backend classifies each report, geocodes the landmarks the caller names, and clusters reports into hotspots.

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
- `server/categories.js`: the 23 Get It Done categories, tiers, and the EN/ES keyword classifier
- `server/geocode.js`: San Diego landmark/intersection lookup, with Nominatim as a fallback
- `agent/ELEVENLABS_SETUP.md`: voice agent prompt, client tool and webhook setup
- `client/src`: React dashboard (`App.jsx`, `components/MapView.jsx`, `Sidebar.jsx`, `CallWidget.jsx`)
- `FRONTEND_PROMPT.md`: the spec the dashboard was built from

## Quick test
```bash
curl -X POST localhost:3000/api/tools/submit-report -H 'Content-Type: application/json' \
  -d '{"transcript":"another huge pothole at 7th and Market"}'
```
