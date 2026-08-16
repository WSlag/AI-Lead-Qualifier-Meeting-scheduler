# Project Demo — Client Guide: How the App Works

**Working title:** AI Lead Qualifier & Meeting Booker

> This guide is written for non-technical stakeholders. It explains what the app does, how a lead moves through it step by step, what a salesperson can do with the dashboard, and how the automation (n8n workflow) does the work in the background.

---

## 1. What the App Does

Project Demo is an **AI-powered lead capture, qualification, and booking system**. It takes an incoming sales lead, uses AI (DeepSeek) to instantly score how valuable that lead is, stores every result in a secure database, and — for high-priority leads — automatically schedules a discovery call and notifies the sales team.

In plain terms: it answers the question **"Which leads deserve our attention right now?"** without anyone having to read and judge every form submission by hand.

### Core value

| Before the app | With the app |
| --- | --- |
| Someone manually reads each lead and decides if it's worth following up | DeepSeek scores and prioritizes every lead automatically within seconds |
| High-value leads wait for human judgment | High-priority (score ≥ 80) leads get a discovery call booked automatically |
| Follow-ups are tracked in someone's head or scattered spreadsheets | Every lead, score, and meeting status lives in one dashboard |

---

## 2. The End-to-End Journey of a Lead

Here is a simple, visual summary of what happens from the moment a visitor submits the form to the moment a meeting appears on the calendar.

```
Lead Form → n8n Automation → DeepSeek AI → Database → Dashboard
                                          └─ High-priority (score ≥ 80)?
                                             ├─ Google Calendar → Discovery Call booked
                                             ├─ Google Sheets    → activity logged
                                             └─ Gmail            → team notified
```

**Step-by-step:**

1. **A lead is captured.** A visitor (or a staff member) fills in the Customer Form: Name, Email, Company (optional), and a short Message. The form checks that required fields are filled and the email address is valid before submitting.

2. **The lead is sent to the automation.** The form sends the details to an n8n webhook — the automated workflow engine that orchestrates everything that happens next.

3. **The lead is validated again.** n8n double-checks the data before any AI work happens, so incomplete or invalid submissions are rejected politely (HTTP 400) and never reach the AI.

4. **DeepSeek AI qualifies the lead.** The lead's name, email, company, and message are sent to DeepSeek, which analyzes the request and returns a structured result:
   - **Score** (0–100) — how strong a fit the lead appears to be
   - **Priority** (HIGH / MEDIUM / LOW)
   - **Intent** — the main topic or need
   - **Summary** — a one- or two-sentence read on the lead
   - **Recommended action** — a practical suggested next step

5. **The result is stored.** The lead plus its AI qualification is saved to Firebase Firestore, the app's database (the single source of truth).

6. **The dashboard updates instantly.** The mini-CRM dashboard reads from the database and shows the new lead with its score, priority, and status — usually appearing live on screen.

7. **High-priority leads are acted on automatically.** If the DeepSeek score is **80 or higher**, n8n triggers the next automation steps:
   - A **Google Calendar "Discovery Call"** event is created (30 minutes, invited lead).
   - The activity is appended to a **Google Sheets** log for management visibility.
   - A **Gmail** notification about the new high-priority lead is sent to the configured team inbox, including a link to the calendar event.
   - Lower-priority leads (below 80) still get saved and logged to Sheets, but no calendar event or email is created — they're ready for a human to review at a normal pace.

8. **A human takes over.** A salesperson opens the dashboard, reviews each lead's AI summary and score, marks it "Contacted" when they reach out, and can open the calendar event link or reschedule a discovery call directly from the app.

---

## 3. Capabilities in Detail

### For visitors and prospects (the front door)
- **Customer Form** — a clean, simple form to leave their details and describe a need.
- **Instant feedback** — the form shows clear validation messages and a friendly success screen with a link to view the qualified lead.
- **Honest status** — the user knows if the lead was qualified and, for high-priority leads, whether a meeting was actually scheduled (or if scheduling failed).

### For sales and operations staff (the mini-CRM dashboard)
- **Dashboard overview** — four metric cards at a glance:
  - **Total Leads** (with a weekly trend)
  - **High Priority** count
  - **Average Score** across all leads
  - **New Today**
- **Leads list** — a sortable table of every lead (up to 200 most recent) showing name, company, AI score bar, priority badge, status badge, and creation date. On mobile it collapses into readable cards.
- **Lead detail page** — for each lead you can see:
  - The lead's submitted information (name, email, company, message)
  - The AI qualification: score gauge, priority badge, intent, summary, recommended action
  - The **Status** (NEW / CONTACTED / QUALIFIED / DISQUALIFIED) with a "Mark as Contacted" button
  - **Meeting** status — shows whether a discovery call is scheduled (with an "Open Calendar Event" link), failed, not required, or absent — plus a form to **manually schedule a discovery call** at a chosen date/time
  - **Activity** — whether the lead was logged to Google Workspace
- **Responsive design** — works on desktop and mobile; the lead table collapses into cards on small screens.

### Automations working in the background
- **AI qualification with DeepSeek** — free-form messages turn into structured, scored, prioritized data.
- **Automatic discovery-call scheduling** — score ≥ 80 triggers a Calendar event, Sheets log, and Gmail notification with no manual step.
- **Manual scheduling** — a salesperson can also schedule a discovery call for any lead from the detail page; n8n checks whether one is already booked so duplicate events are never created.
- **Duplicate protection** — the system refuses to create a second calendar event for the same lead (both automatic and manual scheduling paths).
- **Independent failure handling** — Calendar, Google Sheets, and Gmail each fail independently without damaging the lead record. For example:
  - If Sheets is down, the lead is still saved and visible; it's just flagged as not logged.
  - If Calendar fails, the app says the meeting **could not** be scheduled — it never falsely claims success, and no email is sent claiming a meeting that doesn't exist.
  - If Gmail fails, the lead and the calendar event remain valid.

---

## 4. The n8n Workflow — How the Automation Works

n8n is the workflow engine that receives the webhook and orchestrates every automation step. The project contains one importable workflow file (**AI Lead Qualification & Meeting Booker**) with the following pieces.

### The main flow (new lead submission)

```
Webhook (POST /lead)
    ↓
Validate Lead ............ checks name, email, message
    ↓
Valid Lead? (IF) ........ "NO" → respond 400 with error message (never reaches AI)
    ↓ "YES"
DeepSeek Qualification ... HTTP Request to the DeepSeek API (structured JSON result)
    ↓
Parse DeepSeek JSON ..... strips any code fences, validates score 0–100,
                          fixes an invalid priority, generates the lead ID
    ↓
Prepare Lead Document ... flattens all fields for storage
    ↓
Save Lead to Firestore ... writes the lead + AI result to the database
    ↓
Score ≥ 80? (IF)
    ├── "NO" (below 80)
    │    Apps Script "Log Activity" → appends a row to Google Sheets
    │    → Update Lead in Firestore (activityLogged, meetingStatus: NOT_REQUIRED)
    │    → Respond { leadId, "Lead received and qualified." }
    │
    └── "YES" (high priority)
         Apps Script "Schedule + Log" → creates Google Calendar event + Sheets row
         → Update Lead in Firestore (meeting fields, meetingStatus: SCHEDULED/FAILED)
         → Calendar Created? (IF)
              ├── "YES" → Gmail Notification → Respond "Lead qualified and meeting scheduled."
              └── "NO"  → Respond "Lead qualified but the meeting could not be scheduled."
```

Key points about the main flow:

- **Validation happens before AI.** Incomplete or bad data is rejected with a clear 400 response and is never sent to DeepSeek — saving cost and keeping data clean.
- **The AI output is trusted only after checks.** n8n parses the DeepSeek JSON, strips markdown if present, re-verifies the score is within 0–100, and recomputes priority from the score if the model returned something invalid. Malformed output is never written to the database.
- **A simple IF gate decides the priority path.** The `Score ≥ 80?` node splits the flow: above the threshold it schedules and notifies; below it only logs. This is the single business rule that drives the automation.
- **The system only claims success when it's true.** The `Calendar Created?` IF node inspects the Apps Script response. Gmail only fires when the calendar event was genuinely created (`calendarCreated: true`). If scheduling failed, the response honestly says the meeting could not be scheduled.

### The manual schedule flow (on-demand booking from the app)

When a salesperson picks a date/time on the Lead Detail page, the app calls a second webhook to schedule just that one lead:

```
Webhook (POST /schedule)
    ↓
Get Lead (Manual) ........... reads the existing lead from Firestore by its ID
    ↓
Already Scheduled? (IF) ..... "YES" → respond with existing event link (no duplicate!)
    ↓ "NO"
Merge Webhook + Lead ........ joins the chosen meetingStart with the stored lead data
    ↓
Apps Script Schedule + Log ... creates the Calendar event + Sheets row
    ↓
Update Lead in Firestore...... patches meeting fields
    ↓
Calendar Created? (IF)
    ├── "YES" → Respond "Discovery call scheduled."
    └── "NO"  → Respond "Discovery call could not be scheduled."
```

Key points about the manual flow:

- **No double booking.** Before doing anything, n8n fetches the lead and checks an "Already Scheduled?" IF gate. If a meeting already exists, it replies immediately with the existing calendar link and never creates a second event.
- **Uses the lead's real data.** It re-joins the stored lead fields with the chosen meeting time, so the calendar event is created with accurate lead details.

### How n8n talks to the other services

| Service | How n8n connects | What it does |
| --- | --- | --- |
| **DeepSeek** | HTTP Request node → `api.deepseek.com/chat/completions` with an API key stored in n8n's credential store | Scores and classifies the lead |
| **Firebase Firestore** | Google Cloud Firestore node using a service account | Reads, creates, and patches the lead documents |
| **Google Apps Script** | HTTP Request → a Web App URL protected by a shared secret | The bridge to Google: appends Sheets rows and creates Calendar events |
| **Gmail** | Gmail node (send message) | Sends high-priority notifications |

---

## 5. Where Data Lives

- **Firebase Firestore** is the **database / single source of truth**. Every lead, its AI score, status, and meeting state are stored here as one document per lead.
- **Google Sheets** is a lightweight **activity log** for reporting and visibility only — it is *not* a database. The app keeps working even if the spreadsheet is temporarily unavailable.
- **Google Calendar** holds the Discovery Call events.
- **Gmail** sends the notifications.

### The lead record (what's stored per lead)

Each lead document stores the original form data (name, email, company, message) plus the AI qualification (score, priority, intent, summary, recommended action), a workflow status (NEW / CONTACTED / QUALIFIED / DISQUALIFIED), and meeting state (whether an event exists, its calendar link, and the meeting status: NONE / SCHEDULED / FAILED / NOT_REQUIRED).

### Priority bands (business rule)

| Score | Priority | Automatic action |
| --- | --- | --- |
| 0–49 | LOW | Logged to Sheets; human review at normal pace |
| 50–79 | MEDIUM | Logged to Sheets; human review at normal pace |
| 80–100 | HIGH | Calendar discovery call + Sheets log + Gmail notification |

---

## 6. Usability Highlights

- **Clean, professional interface** — a purposeful mini-CRM layout built for quick scanning and fast decisions.
- **Loaded states** while data fetches, **success states** after a submission, **empty states** when there are no leads, and clear **error states** when a service isn't configured or a step failed — the user always knows what's happening.
- **The app degrades gracefully.** If Firebase or n8n isn't configured, the app shows a clear configuration message instead of pretending to work. If a background service (Sheets, Calendar, Gmail) fails for a specific lead, that failure is recorded per lead rather than taking the whole system down.
- **Works on any device** — the lead table collapses into cards on mobile so staff can review leads on the go.
- **No special training required** — the three core actions a salesperson needs (review leads, mark contacted, schedule a call) are single clicks or a small date picker.

---

## 7. Privacy & Security (what to tell a client)

- The AI and Google credentials (DeepSeek key, Apps Script secret, service account, Gmail) are **never exposed to the browser or stored in the repository** — they live in n8n's secure credential store and environment variables.
- The browser may **read** leads and only ever **update one field**: the lead's status (e.g. "Mark as Contacted"). Everything else — creating, deleting, and patching lead data — is done server-side by n8n with a service account. This is enforced by Firestore security rules.
- The Apps Script web app is protected by a shared secret that every automation request must include.
- No passwords or payment or other sensitive customer data is requested or stored.

---

## 8. Configuration / Getting It Running (for the account owner)

The app is used as a web dashboard. Getting it live involves a short setup, all documented in `docs/DEPLOYMENT.md` and `docs/GOOGLE_WORKSPACE.md`:

1. **Firebase** — a Firestore project holding the `leads` collection with the security rules.
2. **n8n** — import the workflow file `n8n/workflow.lead-qualifier.json`, add the DeepSeek / Apps Script / Gmail / Firestore credentials, and set the environment variables (`APPS_SCRIPT_URL`, `NOTIFY_EMAIL`, `DEFAULT_MEETING_START`, `WEBHOOK_SECRET`).
3. **Google Workspace** — create the activity-log spreadsheet and deploy the Apps Script web app (the file `google-apps-script/Code.js`).
4. **Host the frontend** — build the React app (Vite) and deploy it (e.g. Vercel), then point the webhook URLs at the n8n endpoints.

A lead capture form can be pointed at the app's webhook from anywhere — lead capture is not limited to the built-in form.

---

## 9. Quick Reference ("Elevator Summary")

> Project Demo is an AI lead qualifier and meeting booker. A lead submits a short form; a DeepSeek-powered n8n workflow instantly scores the lead from 0 to 100 and stores it in Firestore. Sales staff watch a mini-CRM dashboard of every lead with its score, priority, and status. At 80+ the system automatically books a Google Calendar discovery call, logs it to Google Sheets, and emails the team. Meetings can also be scheduled manually, duplicates are prevented, and failures are handled honestly per lead, so the lead record is never corrupted and no one is ever told a meeting was booked when it wasn't.