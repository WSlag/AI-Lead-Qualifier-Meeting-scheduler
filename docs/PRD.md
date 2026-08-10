# Product Requirements Document — Project Demo (AI Lead Qualifier & Meeting Booker)

## 1. Product Overview

**Product:** Project Demo
**Working title:** AI Lead Qualifier & Meeting Booker

A small, portfolio-ready demonstration of a production-minded workflow for capturing, qualifying, storing, scheduling, logging, and notifying around sales leads using AI automation.

**LLM:** DeepSeek (`deepseek-chat`, JSON mode). There is **no Gemini** anywhere in this project.

## 2. Problem

Sales and marketing teams receive many leads but lack a quick way to identify which ones deserve immediate attention and next actions. Most qualification is done manually, so high-value leads get delayed.

The system automates the first qualification step and the follow-up scheduling step while staying understandable and easy to maintain.

## 3. Goal

Build an MVP that:

- Captures lead information through a web form.
- Sends the lead to an automation workflow.
- Uses DeepSeek to score and classify the lead.
- Stores the result in Firebase Firestore.
- Displays the result in an internal mini-CRM dashboard.
- Creates a Google Calendar discovery call for high-priority leads.
- Records operational activity in a Google Sheets activity log.
- Notifies the team via Gmail for high-priority leads.

## 4. Target User

Primary user: sales or operations staff reviewing incoming leads.

## 5. MVP Features

### F1 — Lead Form
Fields: Name, Email, Company, Message.
The form validates required fields and email format.

### F2 — Lead Submission
The frontend sends the form data to an n8n webhook.

### F3 — AI Qualification (DeepSeek)
DeepSeek returns:
- `score` from 0–100
- `priority`: LOW, MEDIUM, or HIGH
- `intent`
- `summary`
- `recommendedAction`

### F4 — Firestore Storage
The original lead plus the AI qualification result are stored in Firestore.

### F5 — Dashboard (Mini CRM)
Display: total leads, high-priority leads, average score, new today, and recent leads with score, priority, status.

### F6 — High-Priority Scheduling
When `score >= 80`, n8n calls the Apps Script Web App to create a Google Calendar **Discovery Call** event and record the activity in Google Sheets.

### F7 — Operational Activity Log
Every successfully qualified lead is logged to Google Sheets. Calendar/Gmail failures are recorded as separate activity rows.

### F8 — Gmail Notification
After a successful Calendar event, n8n sends a notification email to the configured recipient.

### F9 — Duplicate Protection
No duplicate Calendar events or Sheet rows are created for the same lead action.

### F10 — Error Handling
Failures are visible through n8n execution history and useful application error messages. The frontend never claims success when the backend failed.

## 6. Non-Goals

Do not build:

- Full CRM functionality
- Multi-tenant architecture
- Complex user permissions (beyond optional Firebase Auth later)
- WhatsApp/Meta Ads/HubSpot/Zoho/ClickUp integrations
- Advanced analytics
- Autonomous agent loops
- Payment functionality
- Google Sheets as the primary database

## 7. System of Record Split

| Layer | Ownership |
| --- | --- |
| Firebase Firestore | Application database / source of truth |
| React Dashboard | User interface / mini CRM |
| Google Sheets | Operational activity log (reporting/visibility only) |
| Google Calendar | Meeting management |
| Gmail | Notification |
| Google Apps Script | Google Workspace integration |
| n8n | Workflow orchestration |
| DeepSeek | AI lead qualification |

The frontend never depends on Google Sheets. The app continues to work if the Sheet is temporarily unavailable.

## 8. Acceptance Criteria

The MVP is accepted when:

1. A valid lead can be submitted.
2. n8n receives the webhook.
3. DeepSeek returns valid structured qualification data.
4. The lead is saved to Firestore.
5. The dashboard displays the stored lead.
6. High-priority leads create a Calendar event and log a Sheet row.
7. Gmail notification fires for high-priority leads.
8. Lower-priority leads log a Sheet row only.
9. Duplicate triggers do not create duplicate events.
10. Invalid submissions are rejected cleanly.
11. API failures never expose secrets.
12. The frontend builds successfully.
13. Setup instructions are documented.

## 9. Success Criteria

A reviewer should understand the complete workflow in less than five minutes and see a working end-to-end demonstration.