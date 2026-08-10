# Architecture

> **LLM note:** This project uses **DeepSeek** (`deepseek-chat`, JSON mode). It does **not** use Gemini.

## Overview

```
                    ┌──────────────────────┐
                    │ React + TypeScript   │
                    │ Lead Form / Mini CRM │
                    └─────────┬────────────┘
                              │ HTTPS Webhook (POST /lead)
                              ▼
                       ┌───────────────┐
                       │     n8n       │
                       │ Orchestrator  │
                       └──────┬────────┘
                              │
                 ┌────────────┼────────────────┐
                 │            │                │
                 ▼            ▼                ▼
             Validate    DeepSeek API      Firestore
                 │            │
                 │            └──────────┐
                 │                       │
                 └──── score >= 80 ? ────┘
                    │                │
                  NO/LOG           YES/SCHEDULE
                    │                │
                    ▼                ▼
                Apps Script      Apps Script
                LOG_ACTIVITY     QUALIFY_AND_SCHEDULE
                    │                ├──► Google Calendar
                    │                └──► Google Sheets
                    │                       │
                    │                       ▼
                    │                    Gmail
                    ▼                       │
            Firestore updated       Firestore updated
```

## Responsibilities

### Frontend (React + TypeScript, Vercel)
- Collect and validate lead information.
- Submit to the n8n webhook.
- Display loading, success, error, and empty states.
- Read lead data from Firestore and render the mini-CRM dashboard.
- **Never** depends on Google Sheets or Apps Script.

### n8n
- Receive webhooks.
- Validate payloads.
- Call DeepSeek.
- Parse and normalize structured AI output.
- Store/update Firestore documents.
- Call the Apps Script Web App for Calendar + Sheets operations.
- Send Gmail notifications.
- Handle retries and failures.

### DeepSeek API
- Analyzes the lead message.
- Produces structured qualification JSON (score, priority, intent, summary, recommendedAction).
- Never writes to the database directly.

### Firebase Firestore
- Persists lead records and qualification/meeting state.
- The application source of truth.
- All writes go through n8n (Admin SDK / service credentials); the browser only reads.

### Google Apps Script
- Exposes a Web App endpoint secured by a shared secret.
- `LOG_ACTIVITY`: appends a lead row to the activity log spreadsheet.
- `QUALIFY_AND_SCHEDULE`: appends a row and creates a Calendar event.

### Google Calendar
- Discovery Call events for high-priority leads.

### Google Sheets
- Operational activity log for management visibility and simple reporting. **Not a database.**

### Gmail
- High-priority lead notification with a link to the Calendar event.

## Data Flow

```
User
  ↓
Lead Form
  ↓
n8n Webhook
  ↓
Validation
  ↓
DeepSeek (json_object)
  ↓
Structured JSON
  ↓
Firestore
  ↓
Mini CRM Dashboard
  ↓
IF score >= 80
  ├─ NO  → Apps Script LOG_ACTIVITY → Sheets → Firestore update
  └─ YES → Apps Script QUALIFY_AND_SCHEDULE → Calendar + Sheets → Gmail → Firestore update
```

## Architectural Principles

1. **Orchestration lives in n8n.** The frontend stays lightweight.
2. **Firestore is the source of truth.** Sheets is a log, never a duplicate database.
3. **No private credentials in browser code.** DeepSeek, Apps Script, and Gmail secrets live in n8n credentials.
4. **The frontend never depends on Google Sheets.** Sheet failures must not break the lead record or the dashboard.
5. **Independent failure handling.** Calendar, Sheets, and Gmail failures are recorded separately and never misrepresented as success.