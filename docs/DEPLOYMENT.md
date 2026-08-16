# Deployment

> **LLM:** DeepSeek (no Gemini).

## Frontend (Vercel)

```bash
npm install
npm run build   # outputs to dist/
```

### Vercel settings

- Framework: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

Add the frontend environment variables in Vercel (from `.env.example`, filled with your Firebase web config):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_N8N_WEBHOOK_URL
VITE_N8N_SCHEDULE_WEBHOOK_URL
VITE_N8N_WEBHOOK_TOKEN  # same value as the n8n env var WEBHOOK_SECRET
```

## Firebase

Project: `ai-lead-qualifier-demo` (web app display name: **Project Demo**)

- Firestore database: created (native, `nam5`, free tier).
- Rules: deployed via `firebase deploy --only firestore:rules -P ai-lead-qualifier-demo` (see `docs/SECURITY.md`).
- Firebase Auth is optional and not enabled for the MVP.

The Firebase web config used by the app is populated in `.env` (public values only).

## n8n

1. Import `n8n/workflow.lead-qualifier.json`.
2. Create credentials:
   - **Header Auth** for DeepSeek: value `Bearer <DEEPSEEK_API_KEY>`
   - **Header Auth** for Apps Script: value `Bearer <APPS_SCRIPT_SECRET>`
   - **Gmail OAuth2** (Google Cloud OAuth client) — see `docs/GOOGLE_WORKSPACE.md`
    - **Google Cloud Firestore credential** (Service Account — `googleApi` type) for the Firestore nodes
3. Set environment values (or edit node fields):
   - `WEBHOOK_SECRET` — shared secret gating both n8n webhooks (as `token` in the request body) and the Apps Script Web App (as `secret`). Must equal Vercel's `VITE_N8N_WEBHOOK_TOKEN`.
   - `APPS_SCRIPT_URL` — the `/exec` Web App URL
   - `NOTIFY_EMAIL` — Gmail recipient
   - `DEFAULT_MEETING_START` — default booking time (e.g. next business day 10:00)
4. Activate the webhook. The lead webhook URL is `https://<host>/webhook/lead`, and the optional schedule webhook is `https://<host>/webhook/schedule`. Put these in Vercel as `VITE_N8N_WEBHOOK_URL` and `VITE_N8N_SCHEDULE_WEBHOOK_URL`, and set `VITE_N8N_WEBHOOK_TOKEN` to the same value as the n8n `WEBHOOK_SECRET`. Do not publish your real host URL in public docs.

### n8n hosting

- Recommended: self-hosted n8n via Docker Compose, or n8n Cloud.
- The webhook must be reachable from the browser: either a public n8n instance or a tunnel (n8n Cloud free tier provides a public webhook URL).

## Google Apps Script

1. Create a project at https://script.google.com.
2. Add `google-apps-script/Code.js`.
3. Follow `docs/GOOGLE_WORKSPACE.md` for Calendar/Sheets setup, properties (`WEBHOOK_SECRET`, `SPREADSHEET_ID`), and Web App deployment.
4. Copy the `/exec` URL into n8n's `APPS_SCRIPT_URL`.

## DeepSeek

- Create a DeepSeek API key (https://platform.deepseek.com).
- Add it to n8n credentials as part of the DeepSeek Header Auth credential.
- **Never** put the key in `VITE_` variables.

## Post-Deployment Verification

1. Open the Vercel URL.
2. Submit a test lead.
3. Confirm n8n receives it, DeepSeek returns structured output, and Firestore stores the result.
4. Confirm the dashboard displays the lead.
5. Test a high-priority lead:
   - Calendar event created
   - Sheets row appended
   - Gmail received
6. Test a low-priority lead: Sheets row only, no event/email.