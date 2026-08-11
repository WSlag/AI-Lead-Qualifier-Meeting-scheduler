# n8n Workflow — Re-Wiring Guide (Step by Step)

> Workflow: **AI Lead Qualification & Meeting Booker** · ID `ZLs19D1POQ29mHm4`
> This guide walks you through every node in order, what it does, what data it passes on, and how to wire it in the editor. The repo file `n8n/workflow.lead-qualifier.json` is the reference — it already has these fixes applied.

---

## Big picture

Two independent entries feed one shared "schedule" branch:

```
ENTRY 1 (main)                  ENTRY 2 (manual schedule)
Webhook POST /lead              Webhook POST /schedule
   ↓                              ↓
Validate Lead                   Apps Script Schedule + Log (Manual)
   ↓                              ↓
DeepSeek Qualification          Update Lead (Scheduled Manual)
   ↓                              ↓
Parse DeepSeek JSON             Calendar Created? (Manual)  (IF)
   ↓                              ├─ TRUE  → Respond (Manual Schedule)
Save Lead to Firestore           └─ FALSE → Respond (Manual Schedule - Failed)
   ↓
Score >= 80?  (IF)
   ├── TRUE  → Apps Script Schedule + Log  → Update Lead (Scheduled) → Calendar Created?  (IF)
   │            ├─ TRUE  → Gmail Notification → Respond (Lead High)
   │            └─ FALSE → Respond (Lead High - Scheduling Failed)
   └── FALSE → Apps Script Log Activity    → Update Lead (Activity Logged)
```

n8n wiring facts you need up front:

1. **Output ports:** nodes emit on small circles on the right edge; input ports are on the left edge. Drag from an output circle to the next node's left edge.
2. **IF node outputs (critical):** the IF node has exactly two outputs — the **top/first one is TRUE**, the **bottom/second one is FALSE**. The export formerly had these swapped; the repo copy is now corrected. When you re-wire, connect **TRUE → Apps Script Schedule + Log** and **FALSE → Apps Script Log Activity**.
3. **Credentials are not in this file** — they live in the n8n credential store and must be re-attached per node (open any node whose warning shows "Set credential needed" and pick the matching saved credential). See the Credentials table at the end.
4. After wiring, the workflow is **inactive** until you flick **Active** (bottom-toggle in the editor) — do that last, after testing.

---

## Node-by-node (in execution order)

### Node 1 — `Lead Webhook`  (Webhook node)

- `HTTP Method`: **POST**
- `Path`: **`lead`** → full URL `https://n8n.getgoph.com/webhook/lead`
- `Response Mode`: **Respond to Webhook** ("onReceived") — answer immediately so the browser form doesn't hang; the rest of the pipeline runs in the background.
- `Options`: none.

**What it does:** receives the lead JSON from the React form:

```json
{ "name": "John Smith", "email": "john@example.com", "company": "ABC Corp", "message": "We need sales automation." }
```

**Wire here:** from this node's output → next node **`Validate Lead`**.

---

### Node 2 — `Validate Lead`  (Code node)

- `Mode` (JavaScript): the code trims `name`/`email`/`message`, checks presence + email regex, and **throws** with `{ code: 400, errors }` on invalid input so bad leads never reach DeepSeek or cost you tokens.

**Output shape** (valid leads only):

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "company": "ABC Corp",
  "message": "We need sales automation.",
  "source": "WEB_FORM"
}
```

**Wire here:** output → next node **`DeepSeek Qualification`**.

---

### Node 3 — `DeepSeek Qualification`  (HTTP Request node)

- `Method`: **POST**
- `URL`: **`https://api.deepseek.com/chat/completions`**
- `Authentication`: **Generic Credential Type** → **Header Auth**, credential = `DEEPSEEK_API_KEY` (your saved DeepSeek header-auth credential, not the key text).
- `Send Headers`: ON → Header row: name `Authorization`, value `=Bearer {{$credentials.value}}`
- `Send Body`: ON → `Body Content Type`: **JSON** → send the JSON body with `model: "deepseek-chat"`, `response_format: { type: "json_object" }`, and the system + user messages. The user message interpolates the lead via `{{ $json.name }}` etc. (these resolve from the input item = `Validate Lead` output).

**What it does:** asks DeepSeek to score the lead 0–100 and return JSON `{ score, priority, intent, summary, recommendedAction }`.

**Output:** the raw API body:
```json
{ "id": "...", "choices": [ { "message": { "role": "assistant", "content": "{ \"score\": 88, \"priority\": \"HIGH\", ... }" } } ], "usage": { ... } }
```
The HTTP node by default returns **only the body** at the top level of `$json` (no `body` wrapper) — this matters for Node 4.

**Wire here:** output → next node **`Parse DeepSeek JSON`**.

---

### Node 4 — `Parse DeepSeek JSON`  (Code node)

The code:
1. Reads `$input.item.json.choices[0].message.content` (DeepSeek's quoted JSON) and `JSON.parse`s it.
2. Normalizes `priority` from `score` if invalid, and rejects scores outside 0–100.
3. Returns a clean, re-shaped object:

```json
{
  "lead": { "name": "...", "email": "...", "company": "...", "message": "...", "source": "WEB_FORM" },
  "ai": { "score": 88, "priority": "HIGH", "intent": "...", "summary": "...", "recommendedAction": "..." }
}
```

> **Fix applied:** the line `lead: raw.body || raw` was wrong — the HTTP node returns the body directly, so `raw.body` is undefined and `lead` would have been the DeepSeek response itself (blank name/email downstream). It now uses `lead: $('Validate Lead').first().json` so the original form data rides along.

**Wire here:** output → next node **`Save Lead to Firestore`**.

---

### Node 5 — `Save Lead to Firestore`  (Firebase → Firestore node)

- `Operation`: **Create** · `Resource`: **Document** · `Collection`: **`leads`**.
- Fields panel (map to input `$json.lead.*` and `$json.ai.*`):
  - `name = {{ $json.lead.name }}`, `email`, `company`, `message`
  - `score = {{ $json.ai.score }}`, `priority`, `intent`, `summary`, `recommendedAction`
  - `status = "NEW"`
  - `source = {{ $json.lead.source }}`
  - `activityLogged = false`, `calendarEventCreated = false`, `meetingStatus = "NONE"`
  - `createdAt = {{ $now.toISOString() }}`, `updatedAt = {{ $now.toISOString() }}`

**What it does:** persists the lead + AI verdict as the system of record (source of truth; Sheets later is only a log).

**Output:** the created document, including the auto-generated Firestore doc **`id`** — this is the `leadId` used everywhere downstream.

**Wire here:** output → next node **`Score >= 80?`**.

---

### Node 6 — `Score >= 80?`  (IF node)

- Condition: `Number` **greater or equal**: left value `={{ $('Parse DeepSeek JSON').item.json.ai.score ?? 0 }}`, right value **`80`**.
- `Type validation`: **Strict**.

**Two outputs — wiring is the whole game here:**

| Output (port) | Connect to |
| --- | --- |
| **TRUE** (top / first port, index 0) | **`Apps Script Schedule + Log`** |
| **FALSE** (bottom / second port, index 1) | **`Apps Script Log Activity`** |

Score ≥ 80 ⇒ book the discovery call + notify. Score < 80 ⇒ just log the activity, no meeting.

---

### Branch A — LOW‑priority (FALSE output of the IF)

### Node 7 — `Apps Script Log Activity`  (HTTP Request node)

- `Method`: **POST**
- `URL`: **`={{ $env.APPS_SCRIPT_URL }}`** (the deployed Apps Script Web App URL; set as an n8n environment variable)
- `Authentication`: **Generic → Header Auth** (`appsScriptSecret` credential) — sets header `Authorization: Bearer {{$credentials.value}}`; the JSON body also includes `"secret": {{ $credentials.value }}` (this is the field Apps Script actually validates).
- `Send Body`: JSON with `"action": "LOG_ACTIVITY"`, `leadId = {{ $('Save Lead to Firestore').item.json.id }}`, plus name/email/company/score/priority/intent/source (from `{{ $('Parse DeepSeek JSON').item.json.* }}`).

**What it does:** asks Apps Script to append a row to the activity-log spreadsheet.

**Output:** `{ success, sheetLogged, calendarCreated, calendarEventId, calendarEventUrl, calendarError, message }` (`calendarCreated` stays `false` for this action).

**Wire here:** output → **`Update Lead (Activity Logged)`**.

---

### Node 8 — `Update Lead (Activity Logged)`  (Firebase → Firestore node)

- `Operation`: **Update** · `Collection`: **`leads`** · `ID (Document)`: **`={{ $('Save Lead to Firestore').item.json.id }}`**
- Fields:
  - `activityLogged = {{ $('Apps Script Log Activity').item.json.sheetLogged }}`
  - `meetingStatus = "NOT_REQUIRED"`
  - `updatedAt = {{ $now.toISOString() }}`

**Wire here:** end of branch (no further node).

---

### Branch B — HIGH‑priority (TRUE output of the IF)

### Node 9 — `Apps Script Schedule + Log`  (HTTP Request node)

- `Method`: **POST** · `URL`: **`={{ $env.APPS_SCRIPT_URL }}`** · Header auth (`appsScriptSecret`); the body also carries `"secret": {{ $credentials.value }}`.
- `Send Body`: JSON with `"action": "QUALIFY_AND_SCHEDULE"`:
  - `leadId = {{ $json.id }}` (input here is the Firestore-created doc, so `$json.id` is the doc id ✓ — keep this one as `$json.id`)
  - `name/email/company/score/priority/intent/summary/recommendedAction/source` from `{{ $('Parse DeepSeek JSON').item.json.* }}`
  - `meetingStart = {{ $env.DEFAULT_MEETING_START }}` (e.g. next business day 10:00)
  - `meetingDurationMinutes = 30`

**What it does:** Apps Script logs the row **and** creates a Google Calendar discovery-call event.

**Output:** `{ success, sheetLogged, calendarCreated, calendarEventId, calendarEventUrl, calendarError, message }`.

**Wire here:** output → **`Update Lead (Scheduled)`**.

---

### Node 10 — `Update Lead (Scheduled)`  (Firebase → Firestore node)

- `Operation`: **Update** · `Collection`: **`leads`** · `ID (Document)`: **`={{ $('Save Lead to Firestore').item.json.id }}`**

> **Fix applied:** the old file used `={{ $json.id }}` here — but the input at this node is the Apps Script **response**, which has no `id` field, so it could never find the doc to update. It must reference the Firestore doc id from Node 5.

- Fields:
  - `activityLogged = {{ $json.sheetLogged }}`
  - `calendarEventCreated = {{ $json.calendarCreated }}`
  - `calendarEventId = {{ $json.calendarEventId }}`
  - `calendarEventUrl = {{ $json.calendarEventUrl }}`
  - `meetingStatus = {{ $json.calendarCreated ? 'SCHEDULED' : 'FAILED' }}` — never marks SCHEDULED unless Apps Script really did create the event.
  - `updatedAt = {{ $now.toISOString() }}`

**Wire here:** output → **`Calendar Created?`**.

---

### Node 10b — `Calendar Created?`  (IF node)

Added gate between the Firestore update and Gmail. Condition: **Boolean equals true** on the Apps Script response — left value `={{ $('Apps Script Schedule + Log').item.json.calendarCreated }}`, operator `boolean / true`.

| Output (port) | Connect to |
| --- | --- |
| **TRUE** (top, index 0) | **`Gmail Notification`** |
| **FALSE** (bottom, index 1) | **`Respond (Lead High - Scheduling Failed)`** |

Ensures a Gmail "meeting scheduled" email is only sent when Calendar really created the event; otherwise the frontend gets an honest failure response.

---

### Node 10c — `Respond (Lead High - Scheduling Failed)`  (Respond to Webhook node)

- `respondWith`: **json**
- `responseBody`: `={\n  "leadId": "={{ $('Parse DeepSeek JSON').item.json.leadId }}",\n  "message": "Lead qualified but the meeting could not be scheduled."\n}`

**Wire here:** receives the FALSE port of `Calendar Created?`; end of branch.

---

### Node 11 — `Gmail Notification`  (Gmail node)

- Operation: **Send**.
- `To`: **`={{ $env.NOTIFY_EMAIL }}`**
- `Subject`: `=High-Priority Lead — {{ $('Parse DeepSeek JSON').item.json.lead.name }} / {{ $('Parse DeepSeek JSON').item.json.lead.company }}`
- `HTML body`: lead + AI fields, ending with the calendar link `<a href="{{ $('Apps Script Schedule + Log').item.json.calendarEventUrl }}">Open Calendar Event</a>`.

Runs **only** on the TRUE output of `Calendar Created?` — a failed Calendar attempt never emails.

**What it does:** emails the sales owner a digest + one-click calendar link for every high-priority lead whose meeting was successfully booked.

**Wire here:** output → **`Respond (Lead High)`**.

---

### Entry 2 — on-demand scheduling (manual pick of date/time)

### Node 12 — `Lead Webhook (Schedule)`  (Webhook node)

- `HTTP Method`: **POST** · `Path`: **`schedule`** → `https://n8n.getgoph.com/webhook/schedule`
- `Response Mode`: Respond to Webhook.

**What it does:** lets the mini-CRM "Schedule later" action fire with a user-chosen start time. Payload example:

```json
{ "leadId": "aBc123...", "name": "...", "email": "...", "company": "...",
  "score": 88, "priority": "HIGH", "intent": "...", "summary": "...", "recommendedAction": "...",
  "source": "WEB_FORM", "meetingStart": "2026-08-12T10:00:00.000Z", "meetingDurationMinutes": 30 }
```

**Wire here:** output → **`Apps Script Schedule + Log (Manual)`**.

---

### Node 13 — `Apps Script Schedule + Log (Manual)`  (HTTP Request node)

Identical to Node 9, except the body reads straight from this webhook's payload: `leadId = {{ $json.leadId }}` (payload key is `leadId`), `name/email/…/score/priority/…` via `{{ $json.* }}`, and `meetingStart = {{ $json.meetingStart }}` (the user's pick, not the env default).

> **Fix applied:** the old file used `{{ $json.id }}` for leadId here; the schedule payload has no `id` key, so it now uses `{{ $json.leadId }}`.

**Wire here:** output → **`Update Lead (Scheduled Manual)`**.

---

### Node 14 — `Update Lead (Scheduled Manual)`  (Firebase → Firestore node)

- `Operation`: **Update** · `Collection`: **`leads`** · `ID (Document)`: **`={{ $('Lead Webhook (Schedule)').item.json.leadId }}`**
- Fields: same as Node 10 (`activityLogged`, `calendarEventCreated`, `calendarEventId`, `calendarEventUrl`, `meetingStatus = FAILED/SCHEDULED`, `updatedAt`).

**Wire here:** output → **`Calendar Created? (Manual)`**.

---

### Node 14b — `Calendar Created? (Manual)`  (IF node)

Same gate as Node 10b, for the manual branch — left value `={{ $('Apps Script Schedule + Log (Manual)').item.json.calendarCreated }}`, operator `boolean / true`.

| Output (port) | Connect to |
| --- | --- |
| **TRUE** (top, index 0) | **`Respond (Manual Schedule)`** |
| **FALSE** (bottom, index 1) | **`Respond (Manual Schedule - Failed)`** |

---

### Node 14c — `Respond (Manual Schedule - Failed)`  (Respond to Webhook node)

- `respondWith`: **json**
- `responseBody`: `={\n  "leadId": "={{ $('Lead Webhook (Schedule)').first().json.leadId }}",\n  "message": "Discovery call could not be scheduled."\n}`

**Wire here:** receives the FALSE port of `Calendar Created? (Manual)`; end of branch.

> This wire was previously missing, so the schedule webhook (in `responseNode` mode) got no reply and the "Schedule later" button could hang. It now always answers — "Discovery call scheduled." only when the event was really created, otherwise the honest failure message. `Respond (Manual Schedule)` itself is the TRUE output of the gate.

---

## Wiring summary table

| From node | Output port | To node |
| --- | --- | --- |
| Lead Webhook | main | Validate Lead |
| Validate Lead | main | DeepSeek Qualification |
| DeepSeek Qualification | main | Parse DeepSeek JSON |
| Parse DeepSeek JSON | main | Save Lead to Firestore |
| Save Lead to Firestore | main | Score >= 80? |
| Score >= 80? | **TRUE** (1st/top) | Apps Script Schedule + Log |
| Score >= 80? | **FALSE** (2nd/bottom) | Apps Script Log Activity |
| Apps Script Schedule + Log | main | Update Lead (Scheduled) |
| Apps Script Log Activity | main | Update Lead (Activity Logged) |
| Update Lead (Scheduled) | main | Calendar Created? |
| Calendar Created? | **TRUE** (1st/top) | Gmail Notification |
| Calendar Created? | **FALSE** (2nd/bottom) | Respond (Lead High - Scheduling Failed) |
| Gmail Notification | main | Respond (Lead High) |
| Lead Webhook (Schedule) | main | Apps Script Schedule + Log (Manual) |
| Apps Script Schedule + Log (Manual) | main | Update Lead (Scheduled Manual) |
| Update Lead (Scheduled Manual) | main | Calendar Created? (Manual) |
| Calendar Created? (Manual) | **TRUE** (1st/top) | Respond (Manual Schedule) |
| Calendar Created? (Manual) | **FALSE** (2nd/bottom) | Respond (Manual Schedule - Failed) |

## Environment variables n8n must have

| Env var | Used by | Meaning |
| --- | --- | --- |
| `APPS_SCRIPT_URL` | Nodes 7, 9, 13 | Deployed Apps Script Web App URL |
| `NOTIFY_EMAIL` | Node 11 | Recipient of high-priority lead alert |
| `DEFAULT_MEETING_START` | Node 9 | Default meeting time (ISO, e.g. next business day 10:00) |

## Credentials to attach (open each node, pick the saved credential)

| Node(s) | Credential (in n8n credential store) |
| --- | --- |
| DeepSeek Qualification | HTTP Header Auth (`DEEPSEEK_API_KEY`) |
| Apps Script ×3 (7, 9, 13) | HTTP Header Auth (`appsScriptSecret`) |
| Save Lead to Firestore, Update Lead ×3 | Google Cloud / Firebase service account |
| Gmail Notification | Google account (OAuth) |

> **Auth note:** Apps Script web apps cannot read HTTP request headers, so the workflow also sends the Apps Script Header Auth credential's value (`{{ $credentials.value }}`) as `"secret"` inside each Apps Script request body. Set that credential's **value** to `WEBHOOK_SECRET`; the `Authorization` header it also sends is harmless but ignored by Apps Script.

## Suggested check-out sequence

1. Re-wire Node 6 (the IF) — TRUE → Schedule, FALSE → Log.
2. Re-wire every missing connection per the table (the live copy was missing 6 wires).
3. Verify the three expression fixes landed (Nodes 4, 10, 13). Optional — you can also just re-import `n8n/workflow.lead-qualifier.json` and attach credentials, since the repo file already contains all fixes.
4. Test end-to-end: **Execute Workflow** with a test payload where `name/email/message` are filled. Confirm the Firestore doc appears with real `name`/`email` and a correct `ai.score`.
5. Fire a second test with a low-score message, confirm it goes to `Log Activity` (meetingStatus `NOT_REQUIRED`), and a third with a high-score message to check Calendar event + Gmail + `meetingStatus: SCHEDULED`. Then simulate a Calendar failure to confirm the `Calendar Created?` FALSE branch responds with the honest "could not be scheduled" message and **no Gmail**.
6. Only after tests pass: flick the workflow **Active**.