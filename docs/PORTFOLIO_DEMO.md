# Portfolio Demo Script

**Working title:** Project Demo (AI Lead Qualifier & Meeting Booker)

> **LLM:** DeepSeek (no Gemini).

## 60-Second Explanation

"I built a lightweight AI Lead Qualifier to show how I turn a business requirement into a working automation. A lead enters through a React form, n8n receives the webhook, **DeepSeek** analyzes and scores the lead, and the result is stored in Firebase Firestore. The dashboard is a small mini-CRM. High-priority leads automatically get a **Google Calendar discovery call** through Apps Script, the activity is logged to **Google Sheets**, and **Gmail** notifies the team. I kept it small on purpose so each integration is clear, testable, and easy to maintain."

## 5-Minute Demo

1. **Submit a lead** — `John Smith`, `ABC Corp`, "We need sales automation."
2. **AI qualification** — show the DeepSeek result: `Score: 85`, `Priority: HIGH`, `Intent: AI Automation`.
3. **Firestore** — open the `leads` document in the Firebase console.
4. **Mini CRM** — show the lead appearing in the dashboard.
5. **Google Workspace automation**:
   - **Google Calendar**: `Discovery Call — John Smith / ABC Corp`
   - **Google Sheets**: activity log row for `John Smith | 85 | HIGH | SCHEDULED`
   - **Gmail**: high-priority notification

## Engineering decisions to mention

- Secrets are not committed; DeepSeek keys live in n8n credentials only.
- Validation runs before any AI processing.
- AI output is structured JSON (`json_object`) and normalized defensively in a Code node.
- Apps Script is the Google Workspace gate — a shared secret protects the Web App.
- Firestore rules allow clients to read, plus patch only the lead `status` field; all other writes are server-side (n8n).
- Gmail only fires after a confirmed Calendar event (`calendarCreated: true`), so an email never claims a meeting that wasn't booked.
- Google Sheets is an activity log — **not** a second database.
- Failures are handled independently (Calendar, Sheets, Gmail each logged separately).

## Interview positioning

Demonstrates practical ability in:

- n8n (workflow orchestration, webhooks, branching, error handling)
- DeepSeek API (structured JSON output, prompt engineering)
- Firebase / Firestore (data model, security rules)
- Google Apps Script + Calendar + Sheets + Gmail (Workspace integration)
- REST / webhooks / JSON
- TypeScript + React (mini-CRM UI)
- Git / GitHub
- AI-assisted development

## Why DeepSeek?

The task was to demonstrate an LLM-powered automation; DeepSeek was chosen for its clean OpenAI-compatible API, cheap JSON-mode structure output, and easy n8n integration (HTTP Request node). The docs and code consistently say **DeepSeek** — there is no Gemini reference anywhere.