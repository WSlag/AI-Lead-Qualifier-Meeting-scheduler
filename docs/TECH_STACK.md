# Technology Stack

> **LLM:** DeepSeek. This project intentionally does not use Gemini.

## Frontend

| Technology | Purpose |
| --- | --- |
| React | Lead form and mini-CRM dashboard |
| TypeScript | Type safety and maintainable application code |
| Vite | Fast development and build tooling |
| Tailwind CSS | Simple, responsive UI styling |
| React Router | Page routing |
| lucide-react | UI icons |
| Vitest + Testing Library | Unit tests |

## Automation

| Technology | Purpose |
| --- | --- |
| n8n | Workflow orchestration: webhook, DeepSeek call, Firestore, Apps Script, Gmail, branching, error handling |
| Webhooks | HTTP entry points (`POST /lead`, optional `POST /schedule`) |
| REST APIs / JSON | DeepSeek chat completions and Apps Script Web App payloads |

## AI

| Technology | Purpose |
| --- | --- |
| DeepSeek API (`deepseek-chat`) | Lead classification, scoring, summary, recommended action via `response_format: json_object` |

No Gemini, no other LLM. All documentation, code comments, and env names use DeepSeek.

## Database

| Technology | Purpose |
| --- | --- |
| Firebase Firestore | NoSQL database — source of truth for leads, AI results, and meeting state |

## Google Workspace

| Technology | Purpose |
| --- | --- |
| Google Apps Script | Web App integration layer (Calendar + Sheets) |
| Google Calendar | Discovery Call meeting management |
| Google Sheets | Operational activity log |
| Gmail | High-priority lead notifications |

## Hosting

| Technology | Purpose |
| --- | --- |
| Vercel | Frontend hosting (React/Vite) |
| n8n | Self-hosted via Docker Compose or n8n Cloud |

## Version Control & Development

| Technology | Purpose |
| --- | --- |
| GitHub | Source control, documentation, portfolio presentation |
| VS Code + OpenCode + DeepSeek | Development environment and AI-assisted coding |

## n8n node usage

Because n8n has **no native DeepSeek node**, the DeepSeek call is made through the **HTTP Request node**. Since the DeepSeek API is OpenAI-compatible, an alternative is an OpenAI node configured with base URL `https://api.deepseek.com`. This project's workflow uses the HTTP Request node for simplicity and transparency.