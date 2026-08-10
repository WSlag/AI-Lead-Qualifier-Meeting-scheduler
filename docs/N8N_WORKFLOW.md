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
Parse DeepSeek JSON (Code — normalize + validate)
  ↓
Save Lead to Firestore
  ↓
Score >= 80? (IF)
  ├── NO  → Apps Script Log Activity (LOG_ACTIVITY) → Sheets row
  └── YES → Apps Script Schedule + Log (QUALIFY_AND_SCHEDULE)
               ↓
           Update Lead (Scheduled) in Firestore
               ↓
           Gmail Notification
```

## 1. Webhook

- Method: `POST`
- Path: `/lead` (the full URL is `https://<host>/webhook/lead`)

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
- Throw on malformed output; **do not** write malformed AI output to Firestore

## 5. Firestore (Create)

Write a new document in `leads/{leadId}` with the fields described in `docs/DATA_MODEL.md`:

- Original lead values + `source`
- AI qualification: `score`, `priority`, `intent`, `summary`, `recommendedAction`
- `status: "NEW"`
- `activityLogged: false`, `calendarEventCreated: false`, `meetingStatus: "NONE"`
- `createdAt` / `updatedAt`

## 6. High-Priority Branch (IF node)

If `score >= 80`:

Apps Script `QUALIFY_AND_SCHEDULE` payload (from n8n):

```json
{
  "action": "QUALIFY_AND_SCHEDULE",
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

On success, patch the Firestore doc:

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

On Apps Script failure, patch with `meetingStatus: "FAILED"` and `calendarEventCreated: false`. Never mark a meeting scheduled unless Apps Script reports the event.

The `meetingStart` default time comes from the n8n environment variable `DEFAULT_MEETING_START` (e.g. next business day 10:00) — it is not hard-coded in the UI. The optional on-demand scheduler lets the user pick a date/time via the `POST /schedule` webhook, which re-enters the same schedule branch with the user's `meetingStart`.

## 7. Lower-Priority Branch

Apps Script `LOG_ACTIVITY` payload:

```json
{
  "action": "LOG_ACTIVITY",
  "leadId": "<firestore doc id>",
  "name": "...",
  "email": "...",
  "company": "...",
  "score": 72,
  "priority": "MEDIUM",
  "intent": "...",
  "source": "WEB_FORM"
}
```

Patch Firestore with `activityLogged` (true/false) and `meetingStatus: "NOT_REQUIRED"`. No Calendar event, no Gmail unless explicitly configured.

## 8. Gmail

After a **successful** Calendar event (`calendarCreated: true`), send a Gmail notification:

- Subject: `High-Priority Lead — {name} / {company}`
- To: `NOTIFY_EMAIL` (n8n env)
- Body: lead fields + AI fields + `[Open Calendar Event]` link to `calendarEventUrl`

Definition of scope: low-priority leads do **not** send Gmail. Gmail failure is **logged only** and never changes the lead's `meetingStatus`.

## 9. Duplicate Protection

Before scheduling, the workflow (or the Apps Script handler) must ensure:

- Firestore lead has `calendarEventCreated != true` — if it is already true, do **not** create another event; return the existing `calendarEventUrl`.
- Sheet logging uses `leadId` + action to identify (and skip) duplicate operations.

No distributed locking — a simple check is sufficient for the MVP.

## 10. Error Handling

| Failure | Behavior |
| --- | --- |
| Invalid webhook payload | Client error (400); DeepSeek is not called |
| DeepSeek failure | Workflow execution fails visibly; no Firestore write from malformed output |
| Firestore failure | Downstream processing stops |
| Sheets failure | Logged; Firestore lead retained; `activityLogged: false`; dashboard unaffected |
| Calendar failure | `meetingStatus: "FAILED"`; no false "scheduled" claim; no email |
| Gmail failure | Logged in n8n; lead + calendar event remain valid |

Transient external API failures use bounded retries (n8n default). Avoid infinite retries.