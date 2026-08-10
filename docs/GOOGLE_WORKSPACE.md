# Google Workspace Setup

This guide sets up the Google-side pieces: **Google Sheets** (activity log), **Google Apps Script** (integration web app), **Google Calendar**, and **Gmail**. It is written to stay adaptable to the current Apps Script / Google Cloud UIs — menu labels can change over time.

> **LLM note:** DeepSeek powers AI qualification in n8n. Google Workspace only handles Calendar, Sheets, and Gmail.

## 1. Create the Activity Log Spreadsheet

1. Go to https://sheets.new.
2. Rename the spreadsheet to `AI Lead Qualifier — Activity Log`.
3. Rename the first sheet to `Lead Activity`.
4. Add a header row (13 columns):

```
Timestamp | Lead ID | Name | Email | Company | Score | Priority | Intent | Status | Meeting Status | Calendar Event ID | Source | Action
```

5. Copy the **Spreadsheet ID** from the URL (`docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit`).

> The Apps Script will auto-append this header if it is missing, but creating it now helps.

## 2. Create the Apps Script Project

1. Go to https://script.google.com and create a **New project**.
2. Name it `Project Demo — Workspace Integration`.
3. In the editor, replace `Code.gs` with the contents of `google-apps-script/Code.gs` from this repo.

## 3. Configure Script Properties

The secret and spreadsheet ID must **not** be in the source code.

1. In Apps Script, open **Project Settings** (gear icon).
2. Under **Script properties**, add:

| Key | Value |
| --- | --- |
| `WEBHOOK_SECRET` | a long random string (the shared secret n8n will send as `Authorization: Bearer <secret>`) |
| `SPREADSHEET_ID` | the Spreadsheet ID from step 1 |

3. Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Add Google Services

The script uses Calendar and Sheets advanced/standard services:

- **CalendarApp** and **SpreadsheetApp** are built in (no setup needed).
- For the nicer event HTML link, optionally enable the **Calendar API** advanced service:
  - In the Apps Script editor: **Services (+)** → **Calendar API** → **Add**.

## 5. Authorize

When you deploy or run the script, Apps Script will prompt for authorization:

- Scopes cover: Google Calendar (create/view events) and Google Sheets (read/append the activity log), on the Google account that the script is bound to.

## 6. Create the Calendar Authorization (CalendarApp)

No separate console setup is needed for `CalendarApp.getDefaultCalendar()` — the event is created on the **script owner's default calendar** after the step-5 authorization.

## 7. Deploy as Web App

1. In Apps Script: **Deploy → New deployment**.
2. Select type: **Web app**.
3. Configure:
   - **Execute as:** Me (the script owner)
   - **Who has access:** Anyone (gated by your `WEBHOOK_SECRET` — do not rely on the access dropdown alone)
4. Click **Deploy**, authorize, and copy the **Web App URL** (ends in `/exec`).

## 8. Configure n8n

1. Set n8n environment `APPS_SCRIPT_URL` to the `/exec` URL.
2. Set the n8n Header Auth credential for Apps Script to `Bearer <WEBHOOK_SECRET>` (same secret as step 3).

## 9. Test with a POST Request

```bash
curl -X POST "<APPS_SCRIPT_URL>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <WEBHOOK_SECRET>" \
  -d '{
    "action": "LOG_ACTIVITY",
    "leadId": "test-lead",
    "name": "Sarah Lee",
    "email": "sarah@example.com",
    "company": "XYZ Ltd",
    "score": 72,
    "priority": "MEDIUM",
    "intent": "AI Automation",
    "source": "WEB_FORM"
  }'
```

Expected response:

```json
{
  "success": true,
  "sheetLogged": true,
  "calendarCreated": false,
  "message": "Lead activity recorded."
}
```

Check that a row was appended to the sheet.

## 10. Test Scheduling + Logging

```bash
curl -X POST "<APPS_SCRIPT_URL>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <WEBHOOK_SECRET>" \
  -d '{
    "action": "QUALIFY_AND_SCHEDULE",
    "leadId": "test-lead-2",
    "name": "John Smith",
    "email": "john@example.com",
    "company": "ABC Corp",
    "score": 85,
    "priority": "HIGH",
    "intent": "AI Automation",
    "summary": "Potential customer.",
    "recommendedAction": "Book a discovery call",
    "source": "WEB_FORM",
    "meetingStart": "2026-08-15T10:00:00",
    "meetingDurationMinutes": 30
  }'
```

Expected response:

```json
{
  "success": true,
  "sheetLogged": true,
  "calendarCreated": true,
  "calendarEventId": "...",
  "calendarEventUrl": "https://calendar.google.com/...",
  "message": "Lead activity recorded and discovery call scheduled."
}
```

- Check the Calendar event `Discovery Call — John Smith / ABC Corp`.
- Check the sheet row with `Meeting Status = SCHEDULED`.

## Expected JSON Payload (both actions)

```json
{
  "action": "LOG_ACTIVITY" | "QUALIFY_AND_SCHEDULE",
  "leadId": "...",
  "name": "...",
  "email": "...",
  "company": "...",
  "score": 0-100,
  "priority": "LOW|MEDIUM|HIGH",
  "intent": "...",
  "summary": "... (optional)",
  "recommendedAction": "... (optional)",
  "source": "WEB_FORM",
  "meetingStart": "... (required when scheduling)",
  "meetingDurationMinutes": 30
}
```

## Response Format

Success:

```json
{ "success": true, "sheetLogged": true, "calendarCreated": true, "calendarEventId": "...", "calendarEventUrl": "...", "message": "..." }
```

Failure:

```json
{ "success": false, "sheetLogged": false, "calendarCreated": false, "error": "..." }
```

The Web App always returns pure JSON — never HTML.

## Gmail Setup (n8n)

1. Create a **Google Cloud OAuth client** as described in the cloud console.
   - Enable the **Gmail API** for the project.
   - OAuth consent screen: External, add your Gmail as a **test user**.
   - Create an **OAuth 2.0 Web application** client.
2. In n8n: **Credentials → Gmail OAuth2** → paste Client ID / Client Secret → complete the OAuth flow with the target Gmail.
3. Reference that credential in the **Gmail Notification** node.
4. Set `NOTIFY_EMAIL` (the recipient) in n8n env.

> Known wrinkle: unverified apps with Gmail scopes have refresh tokens that expire after ~7 days. Re-authorize in n8n when the token expires. `meetingStatus` is not affected by Gmail failures.

**Fallback:** if the Cloud project path is blocked, use n8n **SMTP** with a Gmail **App Password** (`smtp.gmail.com:465`, enable 2FA on the account, generate an app password). This demonstrates raw email sending but less Workspace engineering than OAuth2.

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `401` / `Unauthorized` | Wrong `Authorization` header or `WEBHOOK_SECRET` mismatch |
| `400` / invalid body | Ensure valid JSON and required fields (`name`, `email`, `score`, `priority`; `meetingStart` when scheduling) |
| No sheet row | `SPREADSHEET_ID` wrong, or share the sheet with the script's account |
| No calendar event | Calendar scopes not authorized, or `meetingStart` missing/invalid |
| `success: false, calendarCreated: false` | Calendar API error; check `calendarError` field and Apps Script **Executions** logs |
| Access denied on deploy | Re-run deploy and authorize the Calendar/Sheets scopes |

Deploy access recommendation: **Execute as Me + Anyone**, since the shared secret is the real gate. For stricter lockdown, also enable the Google Cloud Identity-Aware Proxy — beyond demo scope.