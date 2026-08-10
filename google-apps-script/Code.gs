/**
 * Project Demo â€” Google Apps Script integration
 *
 * Exposes a Web App endpoint consumed by the n8n workflow.
 * Responsibilities:
 *   - Validate an Authorization: Bearer <secret> header (Script Property WEBHOOK_SECRET)
 *   - action "LOG_ACTIVITY":          log a lead row to Google Sheets
 *   - action "QUALIFY_AND_SCHEDULE":  log a lead row + create a Google Calendar event
 *
 * Requires an Apps Script bound to a Google account with access to the configured
 * spreadsheet and calendar. No third-party credentials are stored in this file.
 */

var PROP_SECRET = "WEBHOOK_SECRET";
var PROP_SPREADSHEET_ID = "SPREADSHEET_ID";

/**
 * GET is not used by the API. It returns a short text probe so the web app can be
 * opened in a browser without errors.
 */
function doGet() {
  return respond_({ success: false, error: "Use POST with a valid bearer token." });
}

/**
 * Main entry point for all POST requests from n8n.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond_({ success: false, error: "Missing body." });
    }

    if (!authorized_(e)) {
      return respond_({ success: false, error: "Unauthorized." });
    }

    var payload = parseJsonSafe_(e.postData.contents);
    if (!payload) {
      return respond_({ success: false, error: "Invalid JSON payload." });
    }

    var validation = validatePayload_(payload);
    if (!validation.ok) {
      return respond_({ success: false, error: validation.error });
    }

    var action = String(payload.action || "LOG_ACTIVITY");

    var sheetLogged = logLeadToSheet_(payload, action);
    var calendarCreated = false;
    var eventId = null;
    var eventUrl = null;
    var calendarError = null;

    if (action === "QUALIFY_AND_SCHEDULE") {
      try {
        var event = createCalendarEvent_(payload);
        if (event) {
          calendarCreated = true;
          eventId = event.id;
          eventUrl = event.url;
        }
      } catch (err) {
        calendarError = String(err && err.message ? err.message : err);
      }
    }

    if (!sheetLogged && calendarError) {
      return respond_(
        {
          success: false,
          sheetLogged: false,
          calendarCreated: false,
          error: "Unable to write activity log and create calendar event.",
        },
        500
      );
    }

    return respond_({
      success: true,
      sheetLogged: sheetLogged,
      calendarCreated: calendarCreated,
      calendarEventId: eventId,
      calendarEventUrl: eventUrl,
      calendarError: calendarError,
      message: calendarCreated
        ? "Lead activity recorded and discovery call scheduled."
        : "Lead activity recorded.",
    });
  } catch (err) {
    Logger.log("doPost error: " + err);
    return respond_(
      { success: false, sheetLogged: false, calendarCreated: false, error: "Unexpected error." },
      500
    );
  }
}

/**
 * Returns true when the Authorization header matches the configured shared secret.
 */
function authorized_(e) {
  var expected = PropertiesService.getScriptProperties().getProperty(PROP_SECRET);
  if (!expected) return false;
  var auth = (e.parameter && e.parameter.Authorization) || (e.parameter && e.parameter.authorization);
  var headers = (e.postData && e.postData.headers) || {};
  auth = auth || headers["Authorization"] || headers["authorization"];
  if (!auth) return false;
  var token = String(auth).replace(/^Bearer\s+/i, "").trim();
  return token === expected;
}

/**
 * Basic structural validation. Required: name, email, score, priority.
 * For scheduling actions also require meetingStart.
 */
function validatePayload_(p) {
  if (!p.name || String(p.name).trim() === "") return { ok: false, error: "name is required." };
  if (!p.email || String(p.email).trim() === "") return { ok: false, error: "email is required." };
  if (p.score === undefined || typeof Number(p.score) !== "number" || isNaN(Number(p.score))) {
    return { ok: false, error: "score is required and must be numeric." };
  }
  if (!p.priority || String(p.priority).trim() === "") return { ok: false, error: "priority is required." };
  var action = String(p.action || "LOG_ACTIVITY");
  if (action === "QUALIFY_AND_SCHEDULE" && !p.meetingStart) {
    return { ok: false, error: "meetingStart is required to schedule." };
  }
  return { ok: true };
}

/**
 * Appends a single row to the configured activity log spreadsheet.
 * Creates the header row on first use.
 */
function logLeadToSheet_(p, action) {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
  if (!spreadsheetId) {
    Logger.log("No SPREADSHEET_ID configured.");
    return false;
  }
  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (err) {
    Logger.log("Cannot open spreadsheet: " + err);
    return false;
  }

  var sheet = ss.getSheetByName("Lead Activity");
  if (!sheet) {
    sheet = ss.insertSheet("Lead Activity");
    sheet.appendRow([
      "Timestamp", "Lead ID", "Name", "Email", "Company", "Score", "Priority",
      "Intent", "Status", "Meeting Status", "Calendar Event ID", "Source", "Action",
    ]);
  }

  var now = new Date();
  var actionNote;
  if (p.scheduledActionNote) {
    actionNote = p.scheduledActionNote;
  } else if (action === "QUALIFY_AND_SCHEDULE") {
    actionNote = "Discovery call scheduled";
  } else {
    actionNote = "Lead qualified";
  }

  var row = [
    formatTimestamp_(now),
    String(p.leadId || ""),
    String(p.name),
    String(p.email),
    String(p.company || ""),
    Number(p.score),
    String(p.priority),
    String(p.intent || ""),
    String(p.status || "NEW"),
    action === "QUALIFY_AND_SCHEDULE" ? "SCHEDULED" : "NOT_REQUIRED",
    String(p.calendarEventId || ""),
    String(p.source || "WEB_FORM"),
    actionNote,
  ];

  try {
    sheet.appendRow(row);
    return true;
  } catch (err) {
    Logger.log("appendRow failed: " + err);
    return false;
  }
}

/**
 * Creates a Google Calendar event on the authorized account's default calendar.
 */
function createCalendarEvent_(p) {
  var start = new Date(p.meetingStart);
  if (isNaN(start.getTime())) {
    throw new Error("Invalid meetingStart timestamp.");
  }
  var minutes = Number(p.meetingDurationMinutes) || 30;
  var end = new Date(start.getTime() + minutes * 60 * 1000);

  var title = "Discovery Call â€” " + p.name + " / " + (p.company || "â€”");
  var description =
    "AI Lead Qualification\n\n" +
    "Lead: " + p.name + "\n" +
    "Company: " + (p.company || "â€”") + "\n" +
    "Email: " + p.email + "\n\n" +
    "AI Score: " + p.score + "\n" +
    "Priority: " + p.priority + "\n" +
    "Intent: " + (p.intent || "â€”") + "\n\n" +
    "AI Summary: " + (p.summary || "â€”") + "\n\n" +
    "Recommended Action: " + (p.recommendedAction || "â€”") + "\n\n" +
    "Created automatically by Project Demo.";

  var options = { description: description };
  if (p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email))) {
    options.guests = String(p.email);
  }

  var event = CalendarApp.getDefaultCalendar().createEvent(title, start, end, options);
  return {
    id: event.getId(),
    url: eventHtmlLink_(event),
  };
}

/**
 * Best-effort HTML link to the calendar event.
 */
function eventHtmlLink_(event) {
  // Prefer the official calendar API link when the advanced service is available.
  try {
    var details = Calendar.Events.get(
      "primary",
      event.getId(),
      { timeZone: Session.getScriptTimeZone() }
    );
    if (details.htmlLink) return details.htmlLink;
  } catch (err) {
    Logger.log("htmlLink lookup failed: " + err);
  }
  return "https://calendar.google.com/calendar/event?eid=" + encodeURIComponent(event.getId());
}

function formatTimestamp_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}

function parseJsonSafe_(str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}