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
