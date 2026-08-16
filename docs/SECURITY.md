# Security

## Principles

- **Never commit secrets.** API keys, service-account files, and app passwords stay out of the repo.
- **DeepSeek keys never reach the browser.** They live in n8n credentials only.
- **Apps Script shared secret** is stored in Apps Script Script Properties, never in `Code.gs` source, React code, GitHub, or public docs.
- Use environment variables for configuration.
- Restrict Firestore access appropriately.

## Environment Variables

Frontend (`.env`, only **public** values):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_N8N_WEBHOOK_URL
VITE_N8N_SCHEDULE_WEBHOOK_URL
VITE_N8N_WEBHOOK_TOKEN
```

Firebase web config values are designed to be public in browser apps — they are **not** secrets. Latent risks are handled by security rules (clients may only read, plus patch the lead `status` field) and the fact that all other writes happen server-side through n8n.

`VITE_N8N_WEBHOOK_TOKEN` must equal the n8n environment variable `WEBHOOK_SECRET`. It gates the two n8n webhooks (the workflow rejects requests whose `token` does not match, HTTP 401). Because it ships in the browser bundle, treat it as a **deterrent against casual/bot abuse, not authentication** — production should gate webhooks behind an auth-enabled BFF or real auth.

DeepSeek, Apps Script secret, Gmail, and service-account credentials are **server-only**:

- n8n credentials: `DEEPSEEK_API_KEY`, Apps Script `appsScriptSecret` (Header Auth credential; its value is echoed into the request body as `secret`)
- n8n environment values: `APPS_SCRIPT_URL`, `NOTIFY_EMAIL`, `DEFAULT_MEETING_START`
- Apps Script Script Properties: `WEBHOOK_SECRET`, `SPREADSHEET_ID`

Do **not** prefix any of these with `VITE_`.

## Firestore

Deployed rules (`firestore.rules`):

```
match /leads/{leadId} {
  allow read: if true;                                   // demo: public read for the dashboard
  allow create, delete: if false;                        // create/delete via n8n service account
  allow update: if request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(["status", "updatedAt"])
    && request.resource.data.status is string;           // "Mark as Contacted" only
}
match /{document=**} {
  allow read, write: if false;                           // nothing else is exposed
}
```

- The browser can only read, plus patch a small allowlist of fields (`status`, `updatedAt`) for the "Mark as Contacted" action. Create, delete, and every other field write are n8n-only.
- n8n uses an Admin SDK or authenticated service account, which bypasses these rules to write.
- **Warning:** `allow read: if true` exposes **all** lead documents — including PII (`name`, `email`, `company`, `message`) — to anyone who knows the project ID. The project ID (`ai-lead-qualifier-demo`) appears in the public repo (n8n workflow, docs), and the deployed bundle exposes the Firebase web config, so the `leads` collection is effectively public-readable via the Firestore REST API. Firestore rules cannot restrict which fields a read returns. Public read is acceptable for this portfolio demo **only if all data is fake/demo**. Before real leads, either (a) move PII into a private collection/subcollection (readable only by the service account) and keep a non-PII projection public for the dashboard, or (b) gate all reads behind Firebase Auth / an auth-enabled BFF.

## n8n

- API credentials are stored in n8n's credential store, not inline in workflow files.
- The Apps Script Web App endpoint is protected by a shared secret sent in the JSON **body** (`"secret"`, or a `?secret=` query parameter) and validated in Apps Script before any Calendar/Sheets action. Apps Script web apps cannot read HTTP request headers, so the `Authorization: Bearer` header alone would never authenticate.
- Both n8n webhooks (`/lead`, `/schedule`) are gated by a **`Check Webhook Secret`** Code node that compares the request's `token` field to the n8n environment variable `WEBHOOK_SECRET` and returns HTTP **401** on mismatch, before any expensive or stateful node runs. The token is sent by the frontend from `VITE_N8N_WEBHOOK_TOKEN`. Note this is a deterrent, not authentication — the token is in the browser bundle. Do **not** publish your live n8n host/URLs in public docs; use `https://<host>/webhook/...` placeholders. For production, add real auth (BFF) and rate limiting.

## Google Apps Script

- The Web App runs authorization **as the script owner's Google account** and validates the secret sent in each request body.
- No OAuth tokens reach the frontend.
- `LOG_ACTIVITY` and `QUALIFY_AND_SCHEDULE` both re-validate the secret.

## Production Note

This is a portfolio demo. Before production use, add:

- Real authentication (Firebase Auth) and authorization
- Rate limiting on the webhook and Web App
- Audit logging
- Stricter validation
- Restrict Firestore read access to authenticated users
- Rotate and restrict the shared secret