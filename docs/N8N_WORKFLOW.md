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
Validate Lead (Code — flags valid/invalid, never throws)
  ↓
Valid Lead? (IF)
  ├── NO  → Respond (Validation Error) → 400 {message, errors}
  └── YES → DeepSeek Qualification (HTTP Request → chat/completions, json_object)
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
                         Calendar Created? (IF)
                            ├── YES → Gmail Notification → Respond (Lead High)
                            └── NO  → Respond (Lead High - Scheduling Failed)
```

### Manual Schedule Branch

```
Webhook (POST /schedule)
  ↓
Get Lead (Manual) (Firestore get by leadId)
  ↓
Already Scheduled? (IF — calendarEventCreated == true?)
  ├── YES → Respond (Manual Schedule - Already Scheduled) {leadId, message, calendarEventUrl}
  └── NO  → Merge Webhook + Lead (Code — keep webhook meetingStart, leadId)
               ↓
            Apps Script Schedule + Log (Manual)
               ↓
            Prepare Scheduled Manual Update (Code — merge leadId)
               ↓
            Update Lead (Scheduled Manual) in Firestore (upsert)
               ↓
            Calendar Created? (Manual) (IF)
               ├── YES → Respond (Manual Schedule) → JSON {message}
               └── NO  → Respond (Manual Schedule - Failed) → JSON {leadId, message}
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

Flags the request as invalid when any of the following is true (it does **not** throw):

- `name` missing/blank
- `email` missing/blank or failing `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- `message` missing/blank

The node returns `{ valid: false, errors: {...} }` on failure or `{ valid: true, name, email, company, message, source }` on success. A `Valid Lead?` IF node gates the flow: the **FALSE** output runs a `Respond (Validation Error)` node that answers the webhook with HTTP **400** and `{ ok: false, message, errors }` — so invalid input never reaches DeepSeek and the caller gets a proper client error instead of a hung/500 response.

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

The `meetingStart` default time comes from the n8n environment variable `DEFAULT_MEETING_START` (e.g. next business day 10:00) — it is not hard-coded in the UI. The optional on-demand scheduler lets the user pick a date/time via the `POST /schedule` webhook, which runs a parallel schedule branch (see the Manual Schedule Branch diagram) using the user's `meetingStart`.

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
| Invalid payload | `400` `{ "ok": false, "message": "Invalid lead data.", "errors": {...} }` |
| High priority (Calendar OK) | `{ "leadId": "...", "message": "Lead qualified and meeting scheduled." }` |
| High priority (Calendar failed) | `{ "leadId": "...", "message": "Lead qualified but the meeting could not be scheduled." }` |
| Low priority | `{ "leadId": "...", "message": "Lead received and qualified." }` |
| Manual schedule (Calendar OK) | `{ "leadId": "...", "message": "Discovery call scheduled." }` |
| Manual schedule (Calendar failed) | `{ "leadId": "...", "message": "Discovery call could not be scheduled." }` |
| Manual schedule (already scheduled) | `{ "leadId": "...", "message": "Discovery call already scheduled.", "calendarEventUrl": "..." }` |

The schedule webhook is gated by a `Calendar Created? (Manual)` IF node so it always replies (previously nothing was wired and the call could hang), and its success response only claims "scheduled" when the event was really created.

The `leadId` enables the frontend's "View Lead" link and the schedule-discovery-call button.

## 10. Duplicate Protection

Before any scheduling action the workflow must ensure the Firestore lead has `calendarEventCreated != true` — if it is already true, **do not** create another event; return the existing `calendarEventUrl`.

The **manual schedule branch** implements this with a `Get Lead (Manual)` Firestore read followed by an `Already Scheduled?` IF gate: when `calendarEventCreated` is already `true` the branch responds immediately with the existing `calendarEventUrl` and never calls Apps Script. A `Merge Webhook + Lead` Code node then re-joins the webhook's `meetingStart`/`leadId` (which are not stored on the lead document) with the fetched lead data before the schedule call.

The **main lead branch** cannot double-schedule: the lead document is created in the same execution with `calendarEventCreated: false`, so a fresh lead never re-triggers an event. Combined with Apps Script's `leadId` + action row identity in Sheets, duplicate operations are skipped.

No distributed locking — a simple check is sufficient for the MVP.

## 11. Error Handling

| Failure | Behavior |
| --- | --- |
| Invalid webhook payload | Client error (400); DeepSeek is not called |
| DeepSeek failure | Workflow execution fails visibly; no Firestore write from malformed output |
| Firestore failure | Downstream processing stops |
| Sheets failure | Logged; Firestore lead retained; `activityLogged: false`; dashboard unaffected |
| Calendar failure | `meetingStatus: "FAILED"`; no false "scheduled" claim; no email |
| Sheets + Calendar both fail | Apps Script returns `success: false` (HTTP 200); Firestore patched with `meetingStatus: "FAILED"`; honest "could not be scheduled" response |
| Gmail failure | Logged in n8n; lead + calendar event remain valid |

Apps Script always answers with HTTP 200 and reports outcomes via `success` / `sheetLogged` / `calendarCreated` flags (ContentService web apps cannot return other status codes). n8n reads those flags and never marks a meeting scheduled unless `calendarCreated` is true.

Transient external API failures use bounded retries (n8n default). Avoid infinite retries.