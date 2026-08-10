# Project Demo — AI Lead Qualifier & Meeting Booker

A lightweight AI-powered sales automation demo: capture leads, qualify them with **DeepSeek**, store results in Firebase, schedule discovery calls through Google Calendar (via Apps Script), log activity to Google Sheets, and notify the team by Gmail.

> **LLM:** DeepSeek (`deepseek-chat`, JSON mode). This project intentionally does **not** use Gemini — every doc, code comment, and env name says DeepSeek.

## Flow

```
Lead Form → n8n → DeepSeek → Firestore → Mini CRM Dashboard
                                         └─ score >= 80
                                            ├─ Google Calendar (Apps Script)
                                            ├─ Google Sheets activity log
                                            └─ Gmail notification
```

## Core Features

- Lead capture form with validation
- n8n webhook integration
- DeepSeek AI lead qualification (structured JSON)
- Firestore persistence (source of truth)
- Mini-CRM dashboard with score/priority/status
- Google Calendar Discovery Call for high-priority leads
- Google Sheets operational activity log
- Gmail notifications for high-priority leads
- Duplicate protection (no double events/rows)
- Independent error handling (Calendar/Sheets/Gmail)

## Technology

- React · TypeScript · Vite · Tailwind CSS · React Router · lucide-react
- n8n (HTTP Request node → DeepSeek)
- **DeepSeek API** — lead scoring/classification
- Firebase Firestore + security rules
- Google Apps Script · Google Calendar · Google Sheets · Gmail
- Vercel (frontend) · GitHub · Vitest

## Project Structure

```text
.
├── AGENTS.md
├── README.md
├── .env.example
├── firebase.json / firestore.rules / firestore.indexes.json
├── docs/
│   ├── PRD.md              Product requirements
│   ├── ARCHITECTURE.md     System design
│   ├── TECH_STACK.md       Technologies
│   ├── DATA_MODEL.md       Firestore schema
│   ├── N8N_WORKFLOW.md     Workflow spec
│   ├── AI_SPEC.md          DeepSeek spec
│   ├── SECURITY.md         Security posture
│   ├── TESTING.md          Test plan
│   ├── DEPLOYMENT.md       Deployment steps
│   ├── GOOGLE_WORKSPACE.md Apps Script / Calendar / Sheets / Gmail setup
│   ├── PORTFOLIO_DEMO.md   Demo + interview script
│   └── DEVELOPMENT_TOOLING.md  Skills & MCPs used during development
├── google-apps-script/
│   ├── Code.gs             Apps Script Web App
│   └── appsscript.json
├── n8n/
│   └── workflow.lead-qualifier.json   n8n workflow import
├── src/
│   ├── components/         Layout, MetricCard, LeadTable, badges, ScoreDisplay, Loading/Empty states
│   ├── pages/              Dashboard, Leads, LeadDetail, NewLead
│   ├── services/           firebase.ts, leads.ts, api.ts
│   ├── types/lead.ts
│   └── App.tsx
└── public/
```

## Getting Started (Local)

```bash
npm install
npm run dev          # http://localhost:5173
```

Copy `.env.example` → `.env` and add your Firebase web config and n8n webhook URLs (or use the provided `.env` for the `ai-lead-qualifier-demo` project).

```bash
npm run typecheck
npm run build
npm test
```

## Setup Steps

1. **Firebase** — project `ai-lead-qualifier-demo`, Firestore created (native, `nam5`), rules deployed (`firebase deploy --only firestore:rules -P ai-lead-qualifier-demo`). Web app display name: **Project Demo**.
2. **n8n** — import `n8n/workflow.lead-qualifier.json`, add DeepSeek + Apps Script + Gmail + Firestore credentials, set `APPS_SCRIPT_URL`, `NOTIFY_EMAIL`, `DEFAULT_MEETING_START`.
3. **Google Workspace** — follow `docs/GOOGLE_WORKSPACE.md` (Spreadsheet, Apps Script, properties, Web App deploy, Gmail OAuth).
4. **Vercel** — deploy with Vite settings, add `VITE_*` variables.

See `docs/DEPLOYMENT.md` for the full walkthrough.

## Repository Rules

- The AI integration is **DeepSeek**. Searching for `gemini` (case-insensitive) should return nothing; if it ever does, fix the naming.
- Never commit secrets: DeepSeek key → n8n credentials; Apps Script secret → Script Properties; service account → n8n credential.
- Google Sheets is an operational **activity log**, not a database. Firestore is the source of truth.
- The frontend must keep working if the Sheet or Gmail is down.

## Portfolio

This project demonstrates: n8n, DeepSeek API, Firebase/Firestore, Google Workspace (Apps Script + Calendar + Sheets + Gmail), REST/webhooks, JSON, React, TypeScript, Tailwind, git, and AI-assisted development. See `docs/PORTFOLIO_DEMO.md` for the demo script.