# n8n Workflow Specification

> **LLM:** DeepSeek (no Gemini). n8n has no native DeepSeek node, so the model is called via an **HTTP Request node**.

## Workflow Name

`AI Lead Qualification & Meeting Booker`

## Import

The export file lives at `n8n/workflow.lead-qualifier.json`. Import it in n8n via **Workflows → Import from File**.

## Main Flow

```
Webhook (POST /lead)
  ↓
Validate Lead (Code)
  ↓
DeepSeek Qualification (HTTP Request → chat/completions, json_object)
  ↓
Parse DeepSeek JSON (Code — normalize + validate, generate leadId)
  ↓
Save Lead to Firestore (Google Cloud Firestore, create with documentId)
  ↓
Score >= 80? (IF)
  ├── NO  → Apps Script Log Activity (LOG_ACTIVITY)
  │            ↓
  │         Prepare Activity Log Update (Code — merge leadId)
  │            ↓
  │         Update Lead (Activity Logged) in Firestore (upsert)
  │            ↓
  │         Respond (Lead Low) → JSON {leadId, message}
  │
  └── YES → Apps Script Schedule + Log (QUALIFY_AND_SCHEDULE)
               ↓
            Prepare Scheduled Update (Code — merge leadId)
               ↓
            Update Lead (Scheduled) in Firestore (upsert)
               ↓
            Gmail Notification
               ↓
            Respond (Lead High) → JSON {leadId, message}
```

### Manual Schedule Branch

```
Webhook (POST /schedule)
  ↓
Apps Script Schedule + Log (Manual)
  ↓
Prepare Scheduled Manual Update (Code — merge leadId)
  ↓
Update Lead (Scheduled Manual) in Firestore (upsert)
  ↓
Respond (Manual Schedule) → JSON {message}
```

## 1. Webhook

- Node type: `n8n-nodes-base.webhook` v2
- Method: `POST`
- Path: `/lead` (the full URL is `https://<host>/webhook/lead`)
- Response mode: `responseNode` (responses are sent by Respond to Webhook nodes at each branch end)
- Error handling: `onError: continueRegularOutput`

Expected payload:

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "company": "ABC Corp",
  "message": "We need sales automation."
}
```

## 2. Validation (Code node)

Reject the request when any of the following is true:

- `name` missing/blank
- `email` missing/blank or failing `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- `message` missing/blank

On failure, throw with an error payload carrying `code: 400` so invalid input never reaches DeepSeek.

## 3. DeepSeek (HTTP Request node)

- Method: `POST`
- URL: `https://api.deepseek.com/chat/completions`
- Auth: Header `Authorization: Bearer <DEEPSEEK_API_KEY>` stored in n8n credentials
- Body: `model: deepseek-chat`, `response_format: { type: "json_object" }`, system + user messages (see `docs/AI_SPEC.md`)

## 4. Parse Response (Code node)

- Read `choices[0].message.content`
- `JSON.parse`
- Normalize priority from score if invalid
- Validate `score` within 0–100
- **Generate `leadId`**: `'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)` — used as the Firestore document ID and returned in webhook responses
- Output: `{ leadId, lead: {...validated}, ai: {score, priority, intent, summary, recommendedAction} }`
- Throw on malformed output; **do not** write malformed AI output to Firestore

## 5. Firestore (Google Cloud Firestore)

- Node type: `n8n-nodes-base.googleFirebaseCloudFirestore` v1.1
- Auth: Service Account (`googleApi` credential)
- Project ID: `ai-lead-qualifier-demo` (must match the Firebase project)

### Save Lead to Firestore (create)

- Operation: `create`, resource: `document`
- Database: `(default)`, collection: `leads`
- `documentId` = `{{ $json.leadId }}` (generated in Parse step)
- `columns.values` writes all fields described in `docs/DATA_MODEL.md`:
  - Original lead values + `source`
  - AI qualification: `score`, `priority`, `intent`, `summary`, `recommendedAction`
  - `status: "NEW"`
  - `activityLogged: false`, `calendarEventCreated: false`, `meetingStatus: "NONE"`
  - `createdAt` / `updatedAt`

### Update Lead (upsert)

Updates use `operation: upsert` with `updateKey: "id"` (the input item carries the Firestore document ID as a field named `id`). A Prepare Code node merges the `leadId` into the Apps Script response before the Firestore upsert. This patches only the specified fields without overwriting the entire document.

## 6. High-Priority Branch (IF node)

If `score >= 80`:

Apps Script `QUALIFY_AND_SCHEDULE` payload (from n8n):

```json
{
  "action": "QUALIFY_AND_SCHEDULE",
  "secret": "<WEBHOOK_SECRET — the Header Auth credential value, via {{ $credentials.value }}>",
  "leadId": "<firestore doc id>",
  "name": "...",
  "email": "...",
  "company": "...",
  "score": 85,
  "priority": "HIGH",
  "intent": "...",
  "summary": "...",
  "recommendedAction": "...",
  "source": "WEB_FORM",
  "meetingStart": "<from env DEFAULT_MEETING_START>",
  "meetingDurationMinutes": 30
}
```

On success, a Prepare Code node merges the `leadId` into the Apps Script response item, then a Firestore `upsert` patches the lead document:

```json
{
  "activityLogged": true,
  "calendarEventCreated": true,
  "calendarEventId": "...",
  "calendarEventUrl": "...",
  "meetingStatus": "SCHEDULED",
  "updatedAt": "<now>"
}
```

On Apps Script failure, the update patches with `meetingStatus: "FAILED"` and `calendarEventCreated: false` (computed in the `columns.values` expression). Never mark a meeting scheduled unless Apps Script reports the event.

After `Update Lead (Scheduled)`, a **`Calendar Created?`** IF node gates the next step on the Apps Script response: TRUE branch (event really created) → `Gmail Notification` → `Respond (Lead High)`. FALSE branch (event failed) → `Respond (Lead High - Scheduling Failed)`. Gmail never fires unless the Calendar event actually exists.

- TRUE response: `{ "leadId": "...", "message": "Lead qualified and meeting scheduled." }`
- FALSE response: `{ "leadId": "...", "message": "Lead qualified but the meeting could not be scheduled." }`

> **Auth note:** the Apps Script Web App cannot read HTTP request headers, so the shared secret (the n8n Header Auth credential value, `{{ $credentials.value }}`) is also sent as `"secret"` in every Apps Script request body and validated there (`?secret=` works for manual curl tests).

The `meetingStart` default time comes from the n8n environment variable `DEFAULT_MEETING_START` (e.g. next business day 10:00) — it is not hard-coded in the UI. The optional on-demand scheduler lets the user pick a date/time via the `POST /schedule` webhook, which re-enters the same schedule branch with the user's `meetingStart`.

## 7. Lower-Priority Branch

Apps Script `LOG_ACTIVITY` payload:

```json
{
  "action": "LOG_ACTIVITY",
  "secret": "<WEBHOOK_SECRET — the Header Auth credential value, via {{ $credentials.value }}>",
  "leadId": "<leadId from Parse step>",
  "name": "...",
  "email": "...",
  "company": "...",
  "score": 72,
  "priority": "MEDIUM",
  "intent": "...",
  "source": "WEB_FORM"
}
```

A Prepare Code node merges `leadId` into the Apps Script response, then a Firestore `upsert` patches with `activityLogged` (true/false from `sheetLogged`) and `meetingStatus: "NOT_REQUIRED"`. A `Respond (Lead Low)` node returns `{ "leadId": "...", "message": "Lead received and qualified." }` to the frontend. No Calendar event, no Gmail unless explicitly configured.

## 8. Gmail

- Node type: `n8n-nodes-base.gmail` v2.2
- Resource: `message`, operation: `send`
- Auth: OAuth2 or Service Account (user configures)
- Error handling: `onError: continueRegularOutput` — Gmail failure is logged but never blocks the Respond node or changes `meetingStatus`.

After a **successful** Calendar event (`calendarCreated: true`), send a Gmail notification. Gmail sits on the **TRUE** output of the `Calendar Created?` IF node — the node only runs when Apps Script reported the event:

- To: `NOTIFY_EMAIL` (n8n env)
- Subject: `High-Priority Lead — {name} / {company}`
- Body (HTML): lead fields + AI fields + `[Open Calendar Event]` link to `calendarEventUrl`

Definition of scope: low-priority leads do **not** send Gmail. A failed Calendar attempt does **not** send Gmail (the FALSE branch responds instead). Gmail failure is **logged only** and never changes the lead's `meetingStatus`.

## 9. Webhook Responses

Both webhooks use `responseMode: "responseNode"`. Each execution branch ends with a **Respond to Webhook** node (`n8n-nodes-base.respondToWebhook` v1.5, `respondWith: json`) that returns structured JSON to the frontend:

| Branch | Response |
| --- | --- |
| High priority (Calendar OK) | `{ "leadId": "...", "message": "Lead qualified and meeting scheduled." }` |
| High priority (Calendar failed) | `{ "leadId": "...", "message": "Lead qualified but the meeting could not be scheduled." }` |
| Low priority | `{ "leadId": "...", "message": "Lead received and qualified." }` |
| Manual schedule (Calendar OK) | `{ "leadId": "...", "message": "Discovery call scheduled." }` |
| Manual schedule (Calendar failed) | `{ "leadId": "...", "message": "Discovery call could not be scheduled." }` |

The schedule webhook is gated by a `Calendar Created? (Manual)` IF node so it always replies (previously nothing was wired and the call could hang), and its success response only claims "scheduled" when the event was really created.

The `leadId` enables the frontend's "View Lead" link and the schedule-discovery-call button.

## 10. Duplicate Protection

Before scheduling, the workflow (or the Apps Script handler) must ensure:

- Firestore lead has `calendarEventCreated != true` — if it is already true, do **not** create another event; return the existing `calendarEventUrl`.
- Sheet logging uses `leadId` + action to identify (and skip) duplicate operations.

No distributed locking — a simple check is sufficient for the MVP.

## 11. Error Handling

| Failure | Behavior |
| --- | --- |
| Invalid webhook payload | Client error (400); DeepSeek is not called |
| DeepSeek failure | Workflow execution fails visibly; no Firestore write from malformed output |
| Firestore failure | Downstream processing stops |
| Sheets failure | Logged; Firestore lead retained; `activityLogged: false`; dashboard unaffected |
| Calendar failure | `meetingStatus: "FAILED"`; no false "scheduled" claim; no email |
| Gmail failure | Logged in n8n; lead + calendar event remain valid |

Transient external API failures use bounded retries (n8n default). Avoid infinite retries.