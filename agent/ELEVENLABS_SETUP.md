# ElevenLabs Agent Setup — "SD Voice Town Hall" Intake Agent

Create one Conversational AI agent at elevenlabs.io → Agents.

## 1. Basics
- **Name:** SD Voice Town Hall
- **Language:** English, plus **Spanish** as an additional language (turn on language detection).
- **LLM:** any fast model is fine.
- **First message:** `San Diego Voice Town Hall, non-emergency line. Hola, también hablo español. What problem would you like to report?`
- **Security:** if the browser calls the agent directly, make the agent public (or use signed URLs) and add your frontend origin to the allowlist.

## 2. System prompt
```
You are the San Diego Voice Town Hall intake operator, a calm, friendly, non-emergency 311 operator
for the City of San Diego. If the caller describes a life-threatening emergency (fire, crime in progress,
injury), tell them to hang up and dial 911 immediately.

Reply in the caller's language (English or Spanish). Keep each turn to one or two short sentences.

The city uses NO GPS. Your job is to pin down the location from words alone:
1. Ask what the problem is. Map it to one of these official categories:
   Traffic Signal Issue, Tree Maintenance, Stormwater, Pothole, Street Light Maintenance, Dead Animal,
   Illegal Dumping, Encampment, Sidewalk Repair Issue, ADA Compliance,
   Environmental Services Code Compliance, Missed Collection, Vegetation Encroachment, ROW Maintenance,
   Traffic Signal Timing, Parks Issue, Building and Land Use Enforcement, Oversized Vehicle,
   Parking Violation, Parking - 72-Hours, Street Sweeping, Graffiti - Code Enforcement, Graffiti - Public.
2. Ask where it is: the nearest cross streets first. If they don't know, ask for a nearby landmark
   (a business, park, stadium, pier, school, trolley stop), then the neighborhood.
   Ask at most 3 location questions.
3. Ask one follow-up that affects urgency (Is it blocking traffic? Is anyone hurt?
   Is a fire hydrant blocked? Is playground equipment broken?).
4. If the caller says they are in a hurry or want to finish later, call submit_report with
   wants_to_finish_later=true, read the PIN back slowly digit by digit, and end the call.
5. If the caller says they already have a PIN from an earlier call, collect it and pass it as pin_code.
6. Once you have the problem and a location, call submit_report. Then read the tool's "message"
   field to the caller word for word and say goodbye.
```

## 3. Client tool: `submit_report`
In the agent's Tools settings → **Add tool → Client tool**. Turn on **"Wait for response"**. The browser runs this tool and posts to `POST /api/tools/submit-report`.

| Parameter | Type | Description |
|---|---|---|
| `category` | string | One of the 23 official categories |
| `problem_description` | string | One-sentence summary in the caller's words |
| `cross_street_1` | string | First cross street, if known |
| `cross_street_2` | string | Second cross street, if known |
| `landmark` | string | Nearby landmark, if given |
| `location_description` | string | Any other location words the caller used |
| `neighborhood` | string | e.g. North Park, Pacific Beach |
| `language` | string | `en` or `es` |
| `wants_to_finish_later` | boolean | Caller is in a rush and will call back |
| `pin_code` | string | 3-digit PIN the caller gave from an earlier call |

*Option:* if the backend has a public URL (Daytona preview), make this a **Webhook (server) tool** that POSTs straight to `https://<public-url>/api/tools/submit-report`. Then the browser doesn't need to run it.

## 4. Post-call webhook (optional, needs a public URL)
In the agent's Workspace settings → **Post-call webhook**, set the URL to `https://<public-url>/api/webhook/voice-report`. Put the signing secret in the `ELEVENLABS_WEBHOOK_SECRET` env var on the server.
In **Analysis → Data collection**, add the same fields as the tool table above, plus a boolean `ended_early`. The backend reads them from `analysis.data_collection_results`.
The backend dedupes by `conversation_id`, so a call submitted by the tool **and** sent by the webhook is only counted once.

## 5. Hang-ups (Case 2)
If the call disconnects before `submit_report` runs, the frontend posts whatever transcript it has to `/api/tools/submit-report` with `ended_early: true`. The backend plots it with an 800 m radius if it can find a problem type and a location. Otherwise it drops the report.
