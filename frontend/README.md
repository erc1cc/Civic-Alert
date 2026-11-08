# SD Voice Town Hall — Frontend

React + Vite + Tailwind v4 + Leaflet (`leaflet.heat`) + ElevenLabs React SDK.

```bash
cd frontend
npm install
cp .env.example .env      # add VITE_ELEVENLABS_AGENT_ID
npm run dev               # http://localhost:5173
```

`/api/*` is proxied to `API_TARGET` (default `http://localhost:8000`), e.g. `API_TARGET=http://localhost:3001 npm run dev`.
Inside Daytona, either keep the proxy or set `VITE_API_BASE` to the backend's preview URL.

If the backend is unreachable the header shows **Demo data** and the app runs on `../data/issues.json`
(35 seeded San Diego issues) with the verify / approve / decay rules mirrored in the browser.
Once the backend responds it switches to **Live** and polls `GET /api/issues` every 4 s.

## Backend contract

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/issues` | – | `IssueObject[]` (or `{ issues: [...] }`) |
| POST | `/api/issues/:id/verify` | `{ "still_there": boolean }` | updated issue (`status: "resolved"` once `still_there_no >= 3`) |
| POST | `/api/issues/:id/approve` | – | updated issue (`flagged_for_review: false`, `status: "active"`) |
| POST | `/api/simulate-decay` | – | optional `{ downgraded, resolved }` counts |
| POST | `/api/webhook/voice-report` | ElevenLabs payload | called by ElevenLabs, not the UI |

`/approve` was not in the original spec. The "Approve & Forward to Crew" button needs it.

The UI treats an issue as flagged when `status === "flagged_for_review"` **or** `flagged_for_review === true`,
and hides `status === "resolved"`.

## Map

- **Urgency Pins**: tier-colored markers (sized by `call_count`) with a translucent halo of
  `uncertainty_radius_meters`. The halo is dashed when the radius is ≥ 400 m or the issue is preliminary. Preliminary drafts are hollow pins.
- **Call Heatmap**: `leaflet.heat` weighted by `call_count` (17+ calls = deep crimson).
- **Filter chips**: Roads & Signals / Sanitation & Dumping / Lighting & Parks / Preliminary Drafts (multi-select; none = all).
- Deep links: `/#SD-101` opens that issue, `/?layer=heat` opens the heatmap.

Basemap: Esri World Light Gray Canvas (no API key; CARTO now requires one).
