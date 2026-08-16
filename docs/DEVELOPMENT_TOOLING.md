# Development Tooling — Skills & MCPs

This document lists the coding-agent skills and MCP servers recommended (and available) when working on **Project Demo**.

> **LLM note:** the build assistant is DeepSeek. The app's AI qualification also uses DeepSeek. No Gemini.

## MCP Servers

### context7
Used for up-to-date library/framework documentation during development:
- React / Vite / Tailwind CSS
- Firebase JS SDK (Firestore web)
- n8n node parameters
- DeepSeek API (`response_format: json_object`, OpenAI-compatible base URL)

### n8n MCP
Used when modifying or validating the n8n workflow:
- Locate node types and correct parameter formats for Webhook, HTTP Request, IF, Code, Firebase, Gmail
- Validate the imported workflow
- Confirm no native DeepSeek node exists (use HTTP Request / OpenAI-base-URL)

No other MCP servers are required. Google Apps Script work is a single `Code.gs` file edited in the repo and pasted into script.google.com.

## Coding Skills

| Skill | When to use | Why |
| --- | --- | --- |
| `vibe-coding` | Any code change | Disciplined inspect → plan → implement → test loop |
| `frontend-design` | UI/UX work | Materializes the design spec (tokens, spacing, states) before components |
| `n8n-workflow-patterns` | Workflow edits | Webhook + HTTP-API orchestration pattern this project uses |
| `n8n-architect` | Workflow design/review | Workflow structure and error handling |
| `n8n-mcp-tools-expert` | Before any n8n MCP tool call | Avoids wrong nodeType/parameter formats |
| `n8n-node-configuration` | Node setup | Required fields for HTTP, Webhook, Firestore, Gmail nodes |
| `n8n-expression-syntax` | Node wiring | Correct `{{ }}` expressions between nodes |
| `n8n-code-javascript` | Code nodes | Payload validation + DeepSeek JSON parsing/normalization |
| `n8n-validation-expert` | After workflow validation | Interpret validation warnings/errors from n8n-mcp |
| `production-readiness` | Before deploy | Security and reliability audit |
| `ui-debugger` | Only when UI bugs occur | Not used pre-emptively |

## Local Verification Commands

```bash
npm install
npm run typecheck   # tsc -b
npm run build       # tsc -b && vite build
npm test            # vitest run
```

## Environment Variables (what lands where)

**Browser (`VITE_` prefix in Vercel / `.env`):**
- `VITE_FIREBASE_*` (public web config)
- `VITE_N8N_WEBHOOK_URL`
- `VITE_N8N_SCHEDULE_WEBHOOK_URL`
- `VITE_N8N_WEBHOOK_TOKEN` (must equal the n8n env var `WEBHOOK_SECRET`; sent as `token` to gate both webhooks)

**Server-side only — n8n credentials/env and Apps Script properties:**
- `DEEPSEEK_API_KEY`, `APPS_SCRIPT_URL`, `NOTIFY_EMAIL`, `DEFAULT_MEETING_START`
- Apps Script properties: `WEBHOOK_SECRET`, `SPREADSHEET_ID`

## Rules for the assistant

- Mentioned docs/stack always say **DeepSeek**, never Gemini (`grep -i gemini` must be empty on commit).
- Never write secrets to the repo, README, or code.
- Google Sheets is an activity log, not a database; the frontend never depends on it.