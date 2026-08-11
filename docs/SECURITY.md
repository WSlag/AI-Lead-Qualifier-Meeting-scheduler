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
```

Firebase web config values are designed to be public in browser apps — they are **not** secrets. Latent risks are handled by security rules (clients may only read, plus patch the lead `status` field) and the fact that all other writes happen server-side through n8n.

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
- Public read is acceptable for this portfolio demo. **Production** must gate read behind authentication or an auth-enabled BFF.

## n8n

- API credentials are stored in n8n's credential store, not inline in workflow files.
- The Apps Script Web App endpoint is protected by a shared secret sent in the JSON **body** (`"secret"`, or a `?secret=` query parameter) and validated in Apps Script before any Calendar/Sheets action. Apps Script web apps cannot read HTTP request headers, so the `Authorization: Bearer` header alone would never authenticate.
- Webhook endpoints are discoverable; for production, add a shared secret or IP allowlist.

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