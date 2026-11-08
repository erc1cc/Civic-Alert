# SD Voice Town Hall — Live Demo Script (≈4 minutes)

**Roles:** 🎤 **Presenter** talks to the judges · 📞 **Caller** speaks to the voice agent (one person can do both)
**Screen:** the dashboard in full screen at the Daytona URL, with the browser window **≥1280 px wide** so the sidebar sits beside the map.

---

## Before you go on stage (T-5 min)

- [ ] Open the Daytona preview URL. Check that the header dot says **San Diego · Live** (green).
- [ ] Click **↺ Reset** (35 seeded calls, PIN 402 draft restored).
- [ ] Make one throwaway test call to warm up the mic, then **↺ Reset** again.
- [ ] Check that the **mic bar** moves when you talk. If not, switch the connection to **WebSocket**.
- [ ] Open a **second tab** of the dashboard with **"No mic? Simulate a call"** expanded. That's your fallback.
- [ ] Turn off notifications, plug in the laptop, and turn the volume up so judges hear the agent.
- [ ] Map on **Urgency Pins**, no filter chips selected, zoomed out to all of San Diego.

---

## 0:00 — The hook (20 s)

🎤 *"San Diego's Get It Done app needs a smartphone, GPS, and an account. A lot of residents don't have all of those, like seniors, unhoused neighbors, and people without data plans. So the people who most need city services are often the least likely to get them."*

🎤 *"SD Voice Town Hall turns any phone call into a mapped, prioritized city work order. We use **zero GPS and zero sensors**. The location comes from how people naturally describe a place: 'by Petco Park,' 'the corner of 7th and Market.'"*

---

## 0:20 — Tour the dashboard (40 s)

👉 **Point at the map.**
🎤 *"This is live San Diego. Every pin is a resident call. Color is urgency, using the City's own Get It Done categories: dark red is a safety hazard, yellow is routine."*

👉 **Point at the soft circle around a pin.**
🎤 *"The circle around each pin is our **location uncertainty**. With no GPS, a vague call like 'somewhere near Snapdragon' gets a big fuzzy circle. Watch what happens when more people call."*

👉 **Point at the sidebar, "What to Focus On."**
🎤 *"This side is for a council member running a town hall. It summarizes the top issues automatically: a dark traffic signal in North Park, flagged for police and DOT, and a huge pothole downtown with 17 calls this week."*

---

## 1:00 — LIVE CALL #1: corroboration shrinks the circle (45 s) ⭐ the key moment

👉 Click **🎙️ Call San Diego Voice Town Hall**.
📞 *"Hi, there's a huge pothole on 7th Avenue near Market Street, right by the parking garage. Cars are swerving into the bike lane."*
(Answer the agent's follow-ups briefly. If asked where: *"7th and Market."*)

👀 **What happens:** the map flies downtown, the popup opens, and the toast says **"Merged into SD-101 (18 calls) — radius 200 m → 50 m"**. The circle visibly shrinks.

🎤 *"We didn't add a duplicate pin. The system recognized the same problem within 800 meters and merged it. Each caller describes the location differently, so every extra call **triangulates** the spot and the circle tightens. Eighteen neighbors, one precise work order."*

---

## 1:45 — LIVE CALL #2: landmark only, no street names (25 s)

👉 Click the call button again.
📞 *"Someone dumped a bunch of mattresses and an old couch. I don't know the street names, but it's right by Petco Park."*

👀 The map flies to East Village and the call **merges into the existing dumping report at 14th & Imperial** (SD-104, now 7 calls).

🎤 *"No cross streets, no GPS: just 'by Petco Park.' The system knew there was already a dumping report a few blocks away and recognized it as the same pile. A different description of the same place adds another call to the report and tightens the circle."*

---

## 2:10 — LIVE CALL #3: new hazard → human in the loop (35 s)

📞 *"A big tree branch fell across the road near Chicano Park in Barrio Logan. It's blocking a whole lane."*

👀 A new **Tier 1** pin appears with a pulsing ring, and a card appears in **🚨 Urgent review queue**.

🎤 *"Safety hazards never get auto-dispatched by an AI. They go to a human reviewer first."*
👉 Click **✓ Approve & Forward to Crew**.
🎤 *"One click and it's routed to Urban Forestry, with an audit trail."*

---

## 2:45 — PIN flow: "I'm in a rush" (25 s)

📞 *"There's trash dumped near Snapdragon Stadium but I'm in a hurry. Can I finish this later?"*

👀 The agent reads back a **3-digit PIN**, and a dashed draft circle (1 km) appears.

🎤 *"Real callers hang up, or they're driving. We save a draft and give them a PIN. One caller from this morning already did that with PIN 402…"*

👉 **Optional, if time allows:** call back with *"My PIN is 4-0-2. The broken sidewalk is at University and Ray."* The draft snaps to a **60 m** pinpoint.

---

## 3:10 — Heatmap + community verification (25 s)

👉 Click **🔥 Call Volume Heatmap**.
🎤 *"Switch to call volume and you see where the city is hurting. Downtown and North Park are the hotspots a council member should be talking about tonight."*

👉 Switch back to **📍 Urgency Pins**, open any routine pin (e.g. graffiti in Pacific Beach), and click **👎 No** three times.
🎤 *"Residents can also say a problem is gone. Three 'it's fixed' votes and it drops off the map, with no integration with repair trucks needed."*

---

## 3:35 — Time decay (15 s)

👉 Click **⏱️ Simulate 2-Week Decay**.
🎤 *"If two weeks pass with no new calls, urgency fades by a tier and routine issues close themselves. The map shows what's still a problem, not what was a problem."*

---

## 3:50 — Close (15 s)

🎤 *"Under the hood: an **ElevenLabs** voice agent takes the call, our pipeline classifies it into the City's 23 categories, geocodes landmarks, merges duplicates, and pushes it live. It all runs in a **Daytona** sandbox. It supports UN Sustainable Development Goals 10, 11 and 16 (reduced inequality, sustainable cities, and accountable institutions), and all a resident needs is a voice."*

🎤 *"Thank you — happy to take questions."*

---

## 🛟 If something breaks

| Problem | Do this, and keep talking |
|---|---|
| Agent can't hear you / call won't connect | Switch to the **second tab** → **No mic? Simulate a call** → click the matching preset (🎯, 📍, 🌳, 📝, 🔓) → **Submit**. Say: *"Same pipeline, here's the text version."* |
| Agent doesn't file the report | Click **End call**. The hang-up handler files what it heard (wide 800 m circle). Narrate it as the "caller hung up" case. |
| Map doesn't update | Refresh the page. Data lives on the server, nothing is lost. |
| Header says "Reconnecting…" | The Daytona sandbox may have slept: reload. Before the demo, keep auto-stop disabled. |
| Messed-up state | **↺ Reset** restores the seeded city in one click. |

---

## 💬 Likely judge questions

**"How do you get location without GPS?"**
A built-in lookup of San Diego intersections and landmarks, with OpenStreetMap as a fallback. Every location carries an honest uncertainty radius: about 50 m for an intersection, 150–400 m for a landmark, 1 km for a neighborhood or a vague report. More callers means a tighter radius.

**"What stops spam or false reports?"**
A single call is one small pin. Weight comes from **independent corroboration** (call count), Tier 1 issues require **human approval**, and the community can vote issues off the map.

**"Does this connect to the real Get It Done system?"**
We use the City's exact 23 categories and urgency tiers, so each issue maps one-to-one to a Get It Done ticket. Forwarding to the City's API is the next step.

**"Why voice instead of an app?"**
Phones are universal; smartphones, data plans and app literacy aren't. Voice also captures details people would never type.

**"What happens to callers' data?"**
We store transcript snippets and an approximate location, with no phone number, name or GPS trace.

**"How would this scale?"**
The pipeline is stateless except for the issue store. Swap the JSON file for Postgres/PostGIS and it handles a whole city.
