# Testing Plan

## Frontend Tests (Vitest + Testing Library)

Run with `npm test` (`vitest run`).

| ID | Scenario | Expected |
| --- | --- | --- |
| T1 | Valid form | submission starts; button disables and shows "Qualifying…" |
| T2 | Missing name | validation error `Name is required.`; no webhook request |
| T3 | Invalid email | validation error `Enter a valid email address.`; no webhook request |
| T4 | Missing message | validation error `Message is required.`; no webhook request |
| T5 | Error cleared on edit | correcting a field removes its error immediately |

Type guard unit tests cover `isPriority`, `isLeadStatus`, `isMeetingStatus`.

## n8n / Workflow Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| T6 | Valid webhook payload | webhook accepted; validation passes |
| T7 | Invalid payload (missing name/email/message) | validation fails; DeepSeek **not** called |
| T8 | DeepSeek success | valid JSON; score 0–100; priority normalized |
| T9 | DeepSeek failure / malformed JSON | workflow fails visibly; no malformed Firestore record |
| T10 | Firestore create | lead document exists with expected fields |
| T11 | High-priority lead (score >= 80) | Apps Script returns `calendarCreated: true`; event exists; `meetingStatus: SCHEDULED` |
| T12 | Sheets log success | row appended; `activityLogged: true` |
| T13 | Sheets log failure | `activityLogged: false`; Firestore lead retained; dashboard unaffected |
| T14 | Calendar failure | `calendarCreated: false`; `meetingStatus: FAILED`; no Gmail |
| T15 | Gmail failure | lead + Calendar event valid; failure logged; `meetingStatus` unchanged |
| T16 | Duplicate scheduling | `calendarEventCreated == true` returns existing event; no second event/row |
| T17 | Bad Apps Script secret | 401 / `success: false`; no event created |
| T18 | Low/medium priority | Sheet log only; `meetingStatus: NOT_REQUIRED`; no email |
| T19 | Optional on-demand schedule | event created at selected date/time via `/schedule` |

## Build Checks

- `npm run typecheck` — TypeScript project references
- `npm run build` — `tsc -b && vite build`
- `npm test` — Vitest suite

## Manual End-to-End Test

1. Open the deployed frontend.
2. Submit a realistic lead (`John Smith / ABC Corp`).
3. Open n8n → check execution history (validation → DeepSeek → Firestore → branch).
4. Confirm DeepSeek output in the parse node.
5. Open Firebase → `leads` collection → confirm the document.
6. Confirm the dashboard shows the lead with correct score/priority.
7. For a high-scoring lead, confirm:
   - Google Calendar event `Discovery Call — John Smith / ABC Corp`
   - Activity log row in Google Sheets
   - Gmail notification received
8. Re-submit the same lead (duplicate test).
9. Verify a low/medium lead logs to Sheets but creates no event/email.