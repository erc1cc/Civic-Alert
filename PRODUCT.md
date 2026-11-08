# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience: **hackathon judges and demo viewers.** The dashboard's job is to show the concept working end to end in a few minutes. Someone places a voice call, a report lands on the map, and an official triages it.

The roles shown inside the demo are:
- **Residents**, who report by phone call (EN/ES) and confirm or dismiss issues ("still there?") on the map.
- **City staff / Town Hall officials**, who read the "What to focus on" summary, clear the urgent review queue ("Approve & Forward to Crew"), and watch the live call feed.

These roles are depicted. They are not confirmed real users.

## Product Purpose

SD Voice Town Hall is "sensorless civic reporting" for San Diego, CA. People report street-level problems (potholes, dark street lights, illegal dumping, hazards) by talking to a voice agent instead of filling out a form or installing an app. Calls are clustered into issues, ranked by urgency tier, and placed on a map with a location-uncertainty halo. The community verifies them, and they decay out of the system when the calls stop.

Success for this stage: a judge understands the whole loop (call → pin → verify → triage → resolve/decay) from the live demo, and sees that it works with or without the backend.

## Positioning

- **Voice-first, no sensors and no app.** Reports come from ordinary phone conversations, so anyone who can make a call can report.
- **Honest location.** Every pin shows how unsure its location is (`uncertainty_radius_meters`; a dashed halo at ≥ 400 m or on preliminary drafts) instead of faking precision.
- **Self-cleaning map.** Residents vote issues away (3 "not there" votes resolves one), and issues with no new calls drop one tier at a time until they resolve.
- **Human gate on safety.** Tier 1 / flagged reports wait for an official to approve them before they go to a crew.

## Operating Context

- Shown live at a hackathon, usually on a laptop or projector, sometimes with a live ElevenLabs call placed in front of the audience.
- "Simulate 2-Week Decay" exists so the time-based rules can be shown on stage.
- Deep links (`/#SD-101`, `/?layer=heat`) let a presenter jump straight to a moment in the demo.
- Demo resilience: if the backend can't be reached, the app shows **Demo data** and runs on `data/issues.json` with the backend rules copied into the browser. Once connected it shows **Live** and polls every 4 s.

## Capabilities and Constraints

- Existing stack: React 19 + Vite + Tailwind v4, Leaflet with `leaflet.heat`, `@elevenlabs/react`, lucide icons. Esri World Light Gray Canvas basemap (no API key).
- Map layers: Urgency Pins (tier-colored, sized by call count, uncertainty halo; preliminary drafts are hollow) and a Call Heatmap. Filter chips: Roads & Signals / Sanitation & Dumping / Lighting & Parks / Preliminary Drafts.
- Urgency model: four tiers modeled on San Diego's "Get It Done" categories (`frontend/src/lib/categories.js` is the source of truth). Tier 1 Safety Hazard → Tier 4 Low / Routine.
- Issue statuses: `active`, `preliminary` (draft), `flagged_for_review`, `resolved` (hidden).
- Backend contract is in `frontend/README.md`. `/approve` is an addition to the original spec.
- Voice calls need `VITE_ELEVENLABS_AGENT_ID`. Without it, the call button shows as disabled with setup instructions.
- **Hackathon prototype with no City of San Diego partnership.** City processes (Get It Done tiers, crew dispatch, Police/DOT flagging) are modeled, not integrated.

## Brand Commitments

- Name: **SD Voice Town Hall**. Tagline in use: "Sensorless civic reporting · San Diego, CA".
- UN SDG 10 · 11 · 16 framing appears in the header. Whether it stays is undecided.

## Evidence on Hand

- `data/issues.json`: 35 seeded, fictional San Diego issues (29 EN, 6 ES; 27 active, 6 flagged, 2 preliminary) with realistic caller quotes.
- `frontend/public/favicon.svg`: current mark.
- No real usage data, city endorsement, testimonials, metrics, or press. Future work must not make up or imply any of these. Copy such as "forwarded to field crew" describes a simulated action and should not read like a real city integration.

## Product Principles

1. **The demo must never break.** Every surface works with the backend down, without an agent id, and with an empty queue.
2. **Show the loop, not the parts.** Design for a judge seeing it for 3 minutes: the call → pin → triage → resolution path should be readable without anyone explaining it.
3. **Show what the system doesn't know.** Location uncertainty, preliminary status, and call counts stay visible rather than being smoothed into false certainty.
4. **Urgency is the main axis.** Tier ordering and tier color are the system's core signal. Don't let decoration compete with them.
5. **Prototype honesty.** Model city processes clearly, but never claim a partnership, real dispatch, or results that don't exist.

## Accessibility & Inclusion

Not confirmed as binding. The code shows these intentions: bilingual EN/ES calls and content (ES tags in the feed), Atkinson Hyperlegible type, 44 px minimum tap targets, a skip link, and `aria-live` toasts. Treat them as the current baseline to preserve, and confirm with the user before raising them to commitments.
