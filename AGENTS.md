# AGENTS.md — Agent Instructions

## Project Goal

Build and maintain **Project Demo** (AI Lead Qualifier & Meeting Booker): a small portfolio-ready AI automation that captures leads, qualifies them with **DeepSeek**, stores them in Firebase Firestore, schedules Google Calendar discovery calls via Google Apps Script, logs operational activity to Google Sheets, and notifies via Gmail. n8n orchestrates everything.

**LLM policy: DeepSeek, not Gemini.** Every doc, comment, env name, and workflow field uses DeepSeek. Before finishing any change, run `rg -i gemini` (or equivalent); there must be zero matches.

## Read First

Before making changes, read:

- `README.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/TECH_STACK.md`
- `docs/DATA_MODEL.md`
- `docs/N8N_WORKFLOW.md`
- `docs/AI_SPEC.md`
- `docs/SECURITY.md`
- `docs/DEVELOPMENT_TOOLING.md`

## Coding Rules

- Use TypeScript.
- Prefer small, readable components and functions.
- Do not introduce unnecessary frameworks or dependencies.
- Keep business logic separate from UI components.
- Use environment variables for client configuration; **never** hard-code credentials.
- DeepSeek keys, Apps Script secrets, Gmail tokens, and service accounts must **never** reach browser code or the repo.
- Do not modify the architecture without updating the relevant documentation.
- Do not create fake integrations when a real integration is specified.
- Keep the MVP small.
- **Google Sheets is an activity log, not a database.** Firestore is the source of truth, and the frontend never depends on Sheets.

## Naming

- AI = **DeepSeek**. Do not introduce or reintroduce "Gemini" (model, node, env, docs).
- The n8n DeepSeek call uses the HTTP Request node (no native DeepSeek node exists). The OpenAI-compatible base URL alternative is only a fallback.

## UI Rules

- Clean, professional, minimal mini-CRM (see design tokens: canvas `#F8FAFC`, ink `#0F172A`, primary `#2563EB`, etc. in `src/index.css`).
- Responsive on desktop and mobile; lead table collapses to cards.
- Include loading, success, error, and empty states.
- No fake data in "connected" mode; if a service (Firebase/n8n) is unconfigured, show a clear configuration state.

## Testing Rules

Before considering a feature complete:

1. Run the relevant tests (`npm test`).
2. Run type/build checks (`npm run typecheck`, `npm run build`).
3. Verify error states for Calendar, Sheets, Gmail, DeepSeek, Firestore.
4. Verify Firestore data shape (`docs/DATA_MODEL.md`).
5. Verify the n8n workflow import (`n8n/workflow.lead-qualifier.json`) matches `docs/N8N_WORKFLOW.md`.
6. Update documentation if behavior changed.

## Security

- Firestore rules: read-only for browsers; all writes via n8n service account (`firestore.rules`).
- Apps Script Web App gates on `Authorization: Bearer <WEBHOOK_SECRET>` (Script Property).
- DeepSeek/Gmail/service credentials live in n8n's credential store.

## Names that must not appear (unless intentionally documented as legacy or errors)

- `gemini`
- (Correct names: `deepseek`, `DeepSeek`, `deepseek-chat`, `DEEPSEEK_API_KEY`)

## Definition of Done

A feature is done only when:

- It works locally.
- It passes the relevant checks.
- It follows the architecture.
- It handles expected errors.
- It does not expose secrets.
- Its documentation is accurate.
- `rg -i gemini` returns no matches.

## Agent Behavior

When requirements are unclear:

- Prefer the simplest implementation consistent with the PRD.
- Do not add scope just because something is technically possible.
- Explain significant architectural changes before making them.
- Skills & MCPs to use are listed in `docs/DEVELOPMENT_TOOLING.md`.