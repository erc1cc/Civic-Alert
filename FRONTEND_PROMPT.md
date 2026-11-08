# Frontend Build Prompt — paste this into Claude Code on the frontend computer

> Build **only the frontend** for "SD Voice Town Hall". A teammate already built and tested the backend. Don't create or change any backend code. Talk to it only through the HTTP API below.

---

## 1. Project context
SD Voice Town Hall is a real-time civic issue tracker and Town Hall dashboard for **San Diego, CA** (UN SDGs 10, 11, 16). It uses **no GPS or hardware sensors**. Residents report issues by talking to an **ElevenLabs Conversational AI voice agent**, which works like a non-emergency 311 operator. The backend classifies each report, geocodes the landmarks the caller mentions, and merges duplicate reports. Each merge shrinks the issue's uncertainty radius, which shows that multiple callers have triangulated the spot. The dashboard updates live in front of the judges.

**Time limit:** it has to be demo-ready fast. Keep it simple and good-looking.

## 2. Stack & setup
- **Vite + React 19**, **Tailwind CSS v4** (`@tailwindcss/vite`), **Leaflet 1.9.4** + **react-leaflet 5**, **leaflet.heat 0.2.0**, **@elevenlabs/react 1.21.1**.
- Put the app in a `client/` folder. If `client/package.json` already exists with these deps, reuse it.
- `vite.config.js`: proxy `/api` → `http://localhost:3000`. Read an optional `VITE_API_BASE` env var (default `''`) and prefix every API call with it, so the frontend can also point at a remote backend such as a Daytona preview URL. The backend sends `Access-Control-Allow-Origin: *`.
- Read the ElevenLabs agent ID from `VITE_ELEVENLABS_AGENT_ID`.
- `npm run build` must output to `client/dist`. The backend serves that folder on port 3000, so production needs only one port.
- **leaflet.heat gotcha:** it expects a global `L`. Create `src/leafletSetup.js` containing `import L from 'leaflet'; window.L = L; export default L;`, then import it **before** `import 'leaflet.heat'`. Also import `leaflet/dist/leaflet.css`.

## 3. Backend API contract (already implemented, runs on port 3000)

### `IssueObject`
```ts
{
  id: string;                 // "SD-101"
  pin_code: string | null;    // 3 digits, set when status === "preliminary"
  status: "active" | "preliminary" | "flagged_for_review" | "resolved";
  category: string;           // one of the 23 Get It Done categories
  tier: 1 | 2 | 3 | 4;        // 1 = critical safety hazard
  title: string;              // "Huge pothole at 7th & Eighth"
  descriptions: string[];     // caller snippets (EN or ES)
  lat: number; lng: number;
  uncertainty_radius_meters: number;  // 30–1000
  call_count: number;
  first_reported_at: string;  // ISO
  last_reported_at: string;   // ISO
  still_there_yes: number;
  still_there_no: number;     // >= 3 → backend marks resolved and drops it from /api/issues
  neighborhood: string;       // "North Park"
  location_label: string;     // "University Ave & 30th St"
  flagged_for_review: boolean;  // true while a Tier 1 issue awaits staff approval
  forwarded_to_crew: boolean;
}
```

### Endpoints
| Method & path | Body | Returns |
|---|---|---|
| `GET /api/issues` | – | open issues only (`active`, `flagged_for_review`, `preliminary`). `?all=1` also returns resolved ones |
| `GET /api/summary` | – | `{ focus: [{ field, issue_id, headline, call_count, tier, dept, neighborhood }], stats: { open, tier1, awaiting_review, preliminary, resolved, calls_this_week } }`. `focus` holds up to 3 items; `field` is `Safety`, `Infrastructure`, `Sanitation` or `Lighting & Parks` |
| `GET /api/feed` | – | the last 50 pipeline events `{ at, action, issue_id, message, radius_before?, radius_after? }`, newest first |
| `GET /api/meta` | – | `{ categories: [{ name, tier, group, short, dept }], tier_colors, groups }`. `group` is `roads`, `sanitation` or `lighting_parks` |
| `GET /api/stream` | – | **Server-Sent Events.** `event: issues` sends the full open-issue array (on connect and after every change). `event: report` sends one feed event |
| `POST /api/issues/:id/verify` | `{ "still_there": true \| false }` | the updated issue |
| `POST /api/issues/:id/approve` | – | the updated issue (`flagged_for_review` → `active`, `forwarded_to_crew: true`) |
| `POST /api/simulate-decay` | `{ "days": 14 }` (optional) | `{ dropped, resolved }`. Every open issue drops one tier; Tier 4 issues resolve |
| `POST /api/reset` | – | restores the 35 seeded issues |
| `POST /api/tools/submit-report` | see below | `{ action, issue_id, pin_code, message }` |

`submit-report` body (every field optional):
`{ conversation_id, transcript, category, problem_description, cross_street_1, cross_street_2, landmark, location_description, neighborhood, wants_to_finish_later: bool, ended_early: bool, pin_code }`.
`action` is one of `created | merged | preliminary | reopened | rejected | duplicate`. The backend classifies the category and geocodes the location from free text, so `{ "transcript": "pothole at 7th and Market" }` alone works.

Use EventSource on `/api/stream` for live data. Fall back to polling `/api/issues` every 5 s if the stream errors. After any action (verify, approve, decay, report), refetch `/api/summary`, or refetch it whenever an `issues` event arrives.

## 4. Tiers, colors, filter groups
| Tier | Meaning | Color |
|---|---|---|
| 1 | Safety hazard, respond within hours | `#991b1b` (darkest red) |
| 2 | High urgency, 1–3 days | `#ea580c` (red-orange) |
| 3 | Medium, days to 2 weeks | `#d97706` (amber) |
| 4 | Low, routine | `#eab308` (yellow) |

Filter chips (use `group` from `/api/meta`):
- **Roads & Signals** = `roads`
- **Sanitation & Dumping** = `sanitation`
- **Lighting & Parks** = `lighting_parks`
- **Preliminary Drafts** = `status === "preliminary"`

Chips are multi-select toggles. When none are selected, show everything.

## 5. Layout: one screen, three personas
Use a dark, sleek, modern style that works on a projector. A thin header shows the app name, "San Diego · Live", a pulsing live dot, and the stats from `/api/summary`: Open, Tier 1, Awaiting review, Calls this week.

### A. Main map (left, 70% width)
- Leaflet map centered on `[32.755, -117.18]`, zoom 12. Fit it so Downtown, North Park, Mission Valley and Pacific Beach are all visible. Use CARTO Dark Matter tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) with attribution.
- **Floating pill bar at the top of the map** (like an air-quality or weather map): a segmented toggle between **Urgency Pins** and **Heatmap**, with the four category filter chips underneath.
- **Urgency Pins view (default):**
  - For each issue, draw a translucent `Circle` with radius = `uncertainty_radius_meters` in the tier color (fill opacity ~0.15, thin stroke), plus a solid `CircleMarker` at the center. Scale the marker radius with `call_count`: about 6 px, growing to 14 px.
  - Preliminary issues get a **dashed** circle and a hollow marker.
  - Tier 1 issues that are `flagged_for_review` get a pulsing ring (CSS animation).
  - **Hover** shows a tooltip with the title. **Click** opens a popup with:
    - the category, a colored "Tier N" badge, and the title
    - `"Reported 4 days ago • 17 calls"`, using relative time from `first_reported_at`
    - the location label and "± N m"
    - up to 3 most recent descriptions in italics
    - if preliminary, `PIN 402 — awaiting caller`
    - **"Is this issue still here?" [👍 Yes] [👎 No]**, which calls `/verify`. Show the yes/no counts. On the third "No" the backend resolves the issue, so the pin disappears live; fade it out if you can.
- **Heatmap view:** hide every pin and circle, and render only a `leaflet.heat` layer. Weight each point by `call_count`: intensity = `min(1, call_count / 17)`, and add a few points jittered within the issue's radius so busy spots form blobs. Gradient `{0.2:'#fde047', 0.4:'#f59e0b', 0.6:'#ea580c', 0.8:'#b91c1c', 1:'#7f1d1d'}`, radius ~35, blur ~25.
- A tier legend sits bottom-left on the map.
- **Live report animation:** when a `report` SSE event arrives with an `issue_id`, `flyTo` that issue, open its popup, and briefly pulse it. Show a toast with `event.message`, e.g. "Merged into SD-101 (18 calls) — radius 200 m → 50 m". Watching the radius circle visibly shrink is the key moment for the judges.

### B. Town Hall sidebar (right, 30% width, scrollable)
Top to bottom:
1. **Voice call widget.** A large button: `🎙️ Call San Diego Voice Town Hall`. It uses `@elevenlabs/react`; see section 6. While connected, show the status (Connecting / Listening / Agent speaking), a live transcript of the last few messages, and an "End call" button.
   Next to it are `⏱️ Simulate 2-Week Decay` (POSTs `/api/simulate-decay`, then toasts "N issues dropped a tier, M resolved") and a small `↺ Reset demo` button (POSTs `/api/reset`).
2. **"What to Focus On" AI executive summary card.** Render `summary.focus`. Each row shows a field label (Safety / Infrastructure / Sanitation / Lighting & Parks), the **bold headline** (e.g. "HUGE POTHOLE AT 7TH & EIGHTH — 17 calls this week"), and the neighborhood. Clicking a row flies the map to that issue.
3. **Human-in-the-loop urgent review queue.** List issues where `status === "flagged_for_review"`, sorted by `call_count`. Each card shows the title, location, call count and time, plus an **[Approve & Forward to Crew]** button that POSTs `/approve`. Use an empty state of "✓ No hazards awaiting review".
4. **Live feed.** Use `/api/feed` and `report` SSE events, showing the newest first: an icon per `action` (created / merged / preliminary / reopened / resolved / approved / decay / rejected), the message, and relative time. Clicking an item flies to its issue.
5. **Text call simulator** (collapsible, labeled "No mic? Simulate a call"). This is a backup for the demo if the mic or Wi-Fi fails. It has:
   - a textarea for a transcript and checkboxes for "Caller hung up early" and "In a rush — finish later"
   - a PIN field and a Submit button that POSTs `/api/tools/submit-report`
   - preset buttons that fill the form:
     - "There's another huge pothole at 7th and Market by the parking garage" (merges into SD-101 and shrinks its radius)
     - "The traffic light at University and 30th is completely dark" (merges into SD-201)
     - "A tree fell across the road near Chicano Park" (new Tier 1 issue that appears in the review queue)
     - "Trash dumped somewhere by Snapdragon, gotta run" with *finish later* checked (returns a PIN)
     - PIN `402` + "the sidewalk is cracked at University and Ray" (reopens a preliminary draft and shrinks it to 60 m)
   - Show the returned `message` and, if there is one, the `pin_code` in large text.

## 6. ElevenLabs voice integration (`@elevenlabs/react` v1.x API)
- Wrap the app in `<ConversationProvider>`. `useConversation` throws if it isn't inside the provider.
- Inside it:
  ```js
  const convo = useConversation({
    clientTools: { submit_report: async (params) => { /* POST /api/tools/submit-report with {...params, conversation_id: convo.getId()} */ return json.message; } },
    onMessage: (m) => /* append to live transcript; m has { source: 'user'|'ai', message } (log it to confirm the shape) */,
    onConnect, onDisconnect, onError,
  });
  convo.startSession({ agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID, connectionType: 'webrtc' });
  ```
  The `status`, `isSpeaking` and `endSession()` values come from the hook. Request mic permission with `navigator.mediaDevices.getUserMedia({ audio: true })` before starting.
- The client tool **returns `message` as a string**. The agent reads it to the caller, including the spoken PIN for preliminary reports.
- **Hang-up handling (Case 2):** keep a ref that tracks whether `submit_report` ran during this call. In `onDisconnect`, if it didn't run and the user said anything, POST the collected user transcript to `/api/tools/submit-report` with `{ transcript, ended_early: true, conversation_id }`.
- If `VITE_ELEVENLABS_AGENT_ID` is missing, disable the call button and show a tooltip pointing to the text simulator.

## 7. Done when
- On load, 35 seeded issues show as colored pins and radius circles in the four clusters, and the heatmap toggle shows hotspots with Downtown 7th & Eighth glowing deep red.
- The filter chips and the view toggle work.
- Clicking 👎 three times on a pin removes it live.
- Running each simulator preset updates the map, the feed, the summary and the review queue within about 1 s, and the merge preset visibly shrinks a radius.
- Approve & Forward removes the card from the queue. Simulate Decay recolors pins a tier lighter and removes the Tier 4 issues.
- `npm run build` passes, and `client/dist` served by the backend at `http://localhost:3000` works.
- A voice call with a configured agent ID connects, and a spoken report appears on the map.
