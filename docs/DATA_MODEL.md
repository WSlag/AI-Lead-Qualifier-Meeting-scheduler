# Firestore Data Model

## Collection

`leads`

## Lead Document

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "company": "ABC Corp",
  "message": "We need help automating our sales process.",
  "score": 85,
  "priority": "HIGH",
  "intent": "AI Automation",
  "summary": "Potential customer interested in sales automation.",
  "recommendedAction": "Book a discovery call",
  "status": "NEW",
  "source": "WEB_FORM",
  "activityLogged": true,
  "calendarEventCreated": true,
  "calendarEventId": "event-id",
  "calendarEventUrl": "https://calendar.google.com/...",
  "meetingStatus": "SCHEDULED",
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

## Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | |
| `email` | string | yes | |
| `company` | string | no | |
| `message` | string | yes | |
| `score` | number | yes | 0–100, from DeepSeek |
| `priority` | string | yes | LOW / MEDIUM / HIGH |
| `intent` | string | yes | From DeepSeek |
| `summary` | string | yes | From DeepSeek |
| `recommendedAction` | string | yes | From DeepSeek |
| `status` | string | yes | NEW / CONTACTED / QUALIFIED / DISQUALIFIED |

> The browser may only write `status` (and `updatedAt`) — that is the "Mark as Contacted" patch. Create, delete, and every other field write are n8n-only (service account).
| `source` | string | no | e.g. `WEB_FORM` |
| `activityLogged` | boolean | no | Whether the Sheet log succeeded |
| `calendarEventCreated` | boolean | no | |
| `calendarEventId` | string/nil | no | |
| `calendarEventUrl` | string/nil | no | |
| `meetingStatus` | string | no | NONE / SCHEDULED / FAILED / NOT_REQUIRED |
| `createdAt` | timestamp | yes | |
| `updatedAt` | timestamp | yes | |

## Priority Values

- `LOW` — score 0–49
- `MEDIUM` — score 50–79
- `HIGH` — score 80+ (default business rule: `score >= 80`)

## Meeting Status Values

- `NONE` — not applicable / not attempted
- `SCHEDULED` — Calendar event created successfully
- `FAILED` — Calendar creation failed
- `NOT_REQUIRED` — below threshold; no meeting needed

## Design Notes

- Keep the schema small. No additional collections are required for the MVP.
- All writes come from n8n (service account). The browser can only read (`allow read: if true; allow create/update/delete: if false`).
- Updates patch individual fields (`activityLogged`, meeting fields); they never overwrite the whole document.