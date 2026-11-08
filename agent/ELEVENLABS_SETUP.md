# ElevenLabs Agent Setup — "SD Voice Town Hall" Intake Agent

Create one Conversational AI agent at elevenlabs.io → Agents.

## 1. Basics
- **Name:** SD Voice Town Hall
- **Language:** English only (no additional languages).
- **LLM:** any fast model is fine.
- **First message:** `San Diego Voice Town Hall, non-emergency line. What problem would you like to report?`
- **Security:** if the browser calls the agent directly, make the agent public (or use signed URLs) and add your frontend origin to the allowlist.

## 2. System prompt
```
You are the San Diego Voice Town Hall intake operator: a calm, friendly, FAST non-emergency 311 line
for the City of San Diego. Speak English. One short sentence per turn.

If the caller describes a life-threatening emergency (fire, crime in progress, someone injured),
tell them to hang up and dial 911.

YOUR ONLY GOAL: call the submit_report tool as quickly as possible. You need exactly two things:
  (a) WHAT the problem is, and
  (b) ANY location clue: cross streets, one street name, a landmark (business, park, stadium, pier,
      school, trolley stop), or just a neighborhood. A vague location is fine; the city's map handles it.

Rules:
- As soon as you have (a) and (b), call submit_report IMMEDIATELY. Do not ask for confirmation first.
- Ask at most TWO questions in the whole call. Never ask the same thing twice.
- If location is missing, ask once: "What are the nearest cross streets, or a landmark nearby?"
  If they don't know, file it with whatever they said (neighborhood is enough).
- Do NOT ask whether it's an emergency, whether it's on public or private property, the exact
  size, or any other detail unless the caller volunteers it.
- If the caller says "send it", "that's it", "file it", or sounds impatient,
  call submit_report right away with what you have.
- If the caller is in a hurry / wants to finish later, call submit_report with
  wants_to_finish_later=true.
- If the caller says they have a PIN from an earlier call, put the 3 digits in pin_code.

Filling the tool:
- category: the closest of: Traffic Signal Issue, Tree Maintenance, Stormwater, Pothole,
  Street Light Maintenance, Dead Animal, Illegal Dumping, Encampment, Sidewalk Repair Issue,
  ADA Compliance, Environmental Services Code Compliance, Missed Collection, Vegetation Encroachment,
  ROW Maintenance, Traffic Signal Timing, Parks Issue, Building and Land Use Enforcement,
  Oversized Vehicle, Parking Violation, Parking - 72-Hours, Street Sweeping,
  Graffiti - Code Enforcement, Graffiti - Public.
- Put street names in cross_street_1 / cross_street_2, landmarks in landmark, and copy the caller's
  location words into location_description.

After the tool returns, read its "message" to the caller word for word (including any PIN, digit by
digit), say goodbye, and end the call.
```

## 3. Client tool: `submit_report`
In the agent's Tools settings → **Add tool → Client tool** (not "Webhook", and attach it to *this* agent, not just the workspace tool library). Name it exactly `submit_report`. Turn on **"Wait for response"**. The browser runs this tool and posts to `POST /api/tools/submit-report`.

| Parameter | Type | Description |
|---|---|---|
| `category` | string | One of the 23 official categories |
| `problem_description` | string | One-sentence summary in the caller's words |
| `cross_street_1` | string | First cross street, if known |
| `cross_street_2` | string | Second cross street, if known |
| `landmark` | string | Nearby landmark, if given |
| `location_description` | string | Any other location words the caller used |
| `neighborhood` | string | e.g. North Park, Pacific Beach |
| `wants_to_finish_later` | boolean | Caller is in a rush and will call back |
| `pin_code` | string | 3-digit PIN the caller gave from an earlier call |

*Option:* if the backend has a public URL (Daytona preview), make this a **Webhook (server) tool** that POSTs straight to `https://<public-url>/api/tools/submit-report`. Then the browser doesn't need to run it.

## 4. Post-call webhook (optional, needs a public URL)
In the agent's Workspace settings → **Post-call webhook**, set the URL to `https://<public-url>/api/webhook/voice-report`. Put the signing secret in the `ELEVENLABS_WEBHOOK_SECRET` env var on the server.
In **Analysis → Data collection**, add the same fields as the tool table above, plus a boolean `ended_early`. The backend reads them from `analysis.data_collection_results`.
The backend dedupes by `conversation_id`, so a call submitted by the tool **and** sent by the webhook is only counted once.

## 5. Hang-ups (Case 2)
If the call disconnects before `submit_report` runs, the frontend posts whatever transcript it has to `/api/tools/submit-report` with `ended_early: true`. The backend plots it with an 800 m radius if it can find a problem type and a location. Otherwise it drops the report.

## 6. Troubleshooting: "Call ended early, missing …"
That feed message means the call ended **without the agent running `submit_report`**, so the app fell back to guessing from the transcript.
- Open the browser console (Cmd+Option+J) during a call. If the tool runs you'll see `[voice] submit_report called by agent`. If you never see it, the agent isn't calling the tool.
- A red toast saying `Agent called tool "…"` means the tool name in ElevenLabs doesn't match `submit_report`.
- In ElevenLabs → the agent → **Conversation history**, open the call. The tool calls show there. If there are none, re-paste the prompt above; the old prompt let the agent keep asking questions.
- Check the **system tools**: if "End call" is enabled, the prompt above tells the agent to file before ending. The agent should never end the call before the tool runs.
