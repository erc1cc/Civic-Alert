# Live Map: Demo Notes

Quick notes for whoever is presenting the live map (`/map`). Read the **tour** to know what everything on screen means, use the **demo flow** for the presentation itself, and keep the **technical notes** for questions.

**Live site:** https://3000-40ecbd28-7a69-485c-bc22-16f03ec22065.daytonaproxy01.net/map

---

## The one-line pitch

> "Residents report street problems by *talking*: no app, no GPS. The voice agent turns the caller's landmarks into a pin, every extra caller makes the pin more precise, and the city sees it all here, live."

---

## Before you present (2 minutes)

- [ ] Open the live site once and click **I Understand, Continue** on Daytona's warning page, so judges never see it.
- [ ] Open **Presenter controls** (bottom of the sidebar) and click **Reset map to the 35 starting issues**.
- [ ] Check the badge in the top-right corner says **LIVE**. If it says demo data, the backend isn't reachable.
- [ ] Do one test call, allow the microphone, then **Reset** again.
- [ ] Use a browser window **at least 1280 px wide**, so the sidebar sits beside the map.

---

## Tour of the screen

### Top bar (floating over the map)

| Control | What it does |
|---|---|
| **Urgency pins / Call heatmap** | Switches the map view. *Pins* show each issue. *Heatmap* hides the pins and shows where calls concentrate (blue, darker = more calls, peaking around 17 calls at one spot). The heatmap is blue on purpose, so it never gets confused with the urgency colors. |
| **Simulate 2 weeks** | Fast-forwards time with no new calls. See [how decay works](#how-the-2-week-decay-works). |
| **Category chips** | **Roads & Signals**, **Sanitation & Dumping**, **Lighting & Parks**, **Preliminary Drafts**. Each shows a count. You can select more than one, and selecting none shows everything. |

### Reading a pin

| What you see | What it means |
|---|---|
| **Color** | Urgency tier: 🟥 **red** = Tier 1 safety hazard, 🟧 **orange** = Tier 2 high, 🟨 **amber** = Tier 3 medium, 🟡 **yellow** = Tier 4 routine. |
| **Size** | Number of calls. More callers make a bigger pin, which stops growing at 17 calls. |
| **Halo** (the shaded circle) | **How sure we are of the location.** Small = pinpointed. Large = only roughly known. The halo is **dashed** when the uncertainty is 400 m or more. |
| **Hollow, dashed pin** | A **preliminary draft**: the caller was in a rush and got a PIN to finish later. |
| **Green ring** | A staff member approved it and it was sent to the (simulated) crew. |
| **Hover** | Title, tier and call count. |
| **Click** | Popup: tier, category, when it was first reported, number of calls, location ± radius, the latest caller quote, draft PIN if any, and **Still there / Gone** buttons. |

**Still there / Gone:** anyone can vote. **Three "Gone" votes remove the pin.** This is how neighbors close issues without the City having to report back.

### Sidebar

| Section | What it's for |
|---|---|
| **Call San Diego Voice Town Hall** | Starts a real voice call with the ElevenLabs agent. A **live transcript** shows what you say ("You"), what the agent says ("Agent"), and a ✓ line saying how the report was filed (new issue, merged, draft + PIN). |
| **Stats line** | Open issues, total calls, safety hazards, drafts. |
| **Needs review** | Tier 1 safety hazards waiting for a person. **Approve for crew** sends one to the simulated crew queue. You get a **5-second Undo**, and approved items collect under **Approved for crew**. |
| **Hotspots** | The most-called issue in each field (Infrastructure, Sanitation, Lighting & Parks). Effectively the agenda for a town-hall meeting. |
| **Recent calls** | The latest reports. Click one to fly to it. |
| **Presenter controls** | **Simulate 2 weeks** (same as the top bar) and **Reset map to the 35 starting issues**. Reset undoes everything, including decay. |

---

## Suggested demo flow (about 3 minutes)

1. **Overview (30 s).** Point at the red pins: *"Red is a safety hazard. Orange, amber and yellow are progressively less urgent."* Point at a big halo vs a tight one: *"The halo is how sure we are of the location. We don't have GPS, so we're honest about it."*
2. **Heatmap (15 s).** Toggle **Call heatmap**: *"Downtown at 7th & Market and North Park are where the city is hurting."* Toggle back.
3. **Live call (60 s).** Click the call button and say: *"There's a huge pothole on 7th Avenue near Market Street, by the parking garage."* Watch the transcript. The call **merges** into the existing 7th & Eighth pothole: the call count goes up and the **halo shrinks**. *"Seventeen neighbors described it differently; together they pinpoint it."*
4. **Human in the loop (20 s).** In **Needs review**, click **Approve for crew** on the dark signal at University & 30th: *"Safety hazards are never auto-dispatched; a person approves them."* The pin gets a green ring.
5. **Community verification (15 s).** Open a routine pin (e.g. graffiti in Pacific Beach) and click **Gone** three times. The pin disappears.
6. **Decay (30 s).** Click **Simulate 2 weeks**. The map zooms out, pins step down a color, and a summary lists what **resolved automatically**. *"No repair-truck integration needed: silence plus neighbor votes tell us what's fixed. But safety hazards are never closed just because nobody called."*
7. **Reset** afterwards, under Presenter controls.

**No mic, or the call misbehaves?** Keep talking and skip the call: opening pins, approving, voting and decay all work without voice. Describe what a call would have done ("a caller saying 'by Petco Park' adds to this pin and tightens its halo").

---

## How the 2-week decay works

**What it simulates:** two weeks pass and *nobody calls about anything*. The city doesn't hear back from repair crews, so the absence of new calls is the signal that something may have been fixed.

**When you click Simulate 2 weeks:**

1. The map zooms out to the whole city, so everyone sees the change.
2. The browser calls `POST /api/simulate-decay`.
3. The server goes through every open issue, including drafts, and moves its *first reported* and *last reported* times **14 days into the past**. Then:
   - **Held:** Tier 1 issues, and anything still waiting for review, **don't change**. Silence isn't proof that a hazard is gone.
   - **Resolved:** Tier 4 issues are closed and leave the map.
   - **Downgraded:** everything else drops one tier (Tier 2 → 3, Tier 3 → 4), so pins turn a calmer color.
4. A summary card shows each tier's count *before → after*, the number resolved, the **names of the issues that resolved automatically**, and how many hazards were held.

**Good to know:**

- **Clicks add up:** each click is *another* two weeks. Click twice and a Tier 3 issue becomes Tier 4, then resolves on the third click.
- **New calls reset the clock:** a new call about an issue sets its *last reported* time to now. Real-world decay would only touch issues that went quiet; the button simulates a city where *everything* went quiet.
- **It changes the live data:** decay updates the real backend, and everyone viewing the site sees it. Use **Reset** to undo.
- **Example from the starting data:** 26 issues drop a tier, 4 resolve (three graffiti reports and an abandoned car), and 5 safety hazards are held.

---

## Other technical notes (for Q&A)

**Finding a location without GPS**
- The agent collects cross streets, a landmark or a neighborhood.
- The server matches them against a built-in list of **79 San Diego intersections, landmarks and streets**, with OpenStreetMap as a fallback.
- The match sets the halo: about **50 m** for an intersection, **150–400 m** for a landmark, **1 km** for a single street, a neighborhood or a draft.

**Merging and the shrinking halo**
- A new report merges into an existing issue if one with the **same category** is open **within 800 m**.
- On a merge, the call count goes up, the pin moves toward the more precisely located report (tighter reports pull harder), and the halo **shrinks at least 40%**, to no less than **30 m**.
- That's the "17 callers triangulate one pothole" effect.

**Categories and tiers**
- Every report is mapped to one of San Diego's **23 Get It Done categories**. The voice agent picks the category, and keyword matching is the backup.
- A few context rules raise the tier: a car **blocking a hydrant** becomes Tier 1, and **broken playground equipment** becomes Tier 2.

**How a call can end**

| Situation | Result |
|---|---|
| Caller describes the problem and a place | The agent files the report and reads back the result |
| Caller is in a rush | **Draft + 3-digit PIN**. Calling back with the PIN completes the draft and shrinks it to **60 m** |
| Caller hangs up mid-call | The browser sends what was said (and the agent's read-backs). If there's a problem type and a place, it's plotted with a wide **800 m** halo. Otherwise it's dropped |
| Emergency | The agent tells them to dial 911, and nothing is filed |

**Live updates:** the map checks the server every **4 seconds**, so a voice report appears within a few seconds of the agent filing it.

**Where it runs**
- One Node/Express server serves both the API and the website.
- Issues are stored in a JSON file on the server, with no database.
- It's hosted in a **Daytona** sandbox: public, never auto-stops, and redeployed with `npm run deploy:daytona`.
- Optionally, every live case gets its own Daytona sandbox, which is deleted when the case resolves (`CASE_SANDBOXES=1`).

**Voice**
- An **ElevenLabs** Conversational AI agent handles the call. It hears the caller, generates its replies, and speaks them back.
- When it has enough information, it calls the page's `submit_report` tool, and the server's reply is what the agent says back to the caller.

---

## Likely questions

- **"What stops fake reports?"** A single call is one small pin. Weight comes from *independent* callers. Safety hazards need a person's approval, and neighbors can vote issues off the map.
- **"Is this connected to the real City system?"** Not yet. The categories and tiers match Get It Done one-to-one, so forwarding to the City's API is the next step. "Approve for crew" is simulated.
- **"What's stored about callers?"** Only what they said about the problem and the approximate location. No phone number, name or GPS.
- **"Why do safety hazards not decay?"** Because "nobody called for two weeks" doesn't mean a downed tree or a dark signal was fixed. A person has to clear it.
