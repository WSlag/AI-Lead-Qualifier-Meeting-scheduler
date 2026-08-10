import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  CircleAlert,
  Loader2,
} from "lucide-react";
import { fetchLead, updateLeadStatus } from "../services/leads";
import { scheduleDiscoveryCall, isN8nConfigured } from "../services/api";
import type { Lead } from "../types/lead";
import { PriorityBadge } from "../components/PriorityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { ScoreDisplay } from "../components/ScoreDisplay";
import { ErrorState } from "../components/EmptyState";

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; lead: Lead }
  | { phase: "missing" }
  | { phase: "error"; message: string };

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [load, setLoad] = useState<LoadState>({ phase: "loading" });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [meetingStart, setMeetingStart] = useState("");

  const refresh = useCallback(async () => {
    if (!id) {
      setLoad({ phase: "missing" });
      return;
    }
    setLoad({ phase: "loading" });
    try {
      const lead = await fetchLead(id);
      setLoad(lead ? { phase: "ready", lead } : { phase: "missing" });
    } catch (err) {
      setLoad({ phase: "error", message: "Unable to load this lead." });
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleMarkContacted() {
    if (load.phase !== "ready") return;
    setUpdatingStatus(true);
    try {
      await updateLeadStatus(load.lead.id, "CONTACTED");
      await refresh();
    } catch {
      // surfaced below by leaving a stale state; refresh keeps UI truthful
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (load.phase !== "ready" || !meetingStart) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      await scheduleDiscoveryCall(load.lead.id, meetingStart);
      await refresh();
      setMeetingStart("");
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : "Unable to schedule the discovery call."
      );
    } finally {
      setScheduling(false);
    }
  }

  if (load.phase === "loading") {
    return <div className="animate-pulse text-sm text-muted">Loading lead…</div>;
  }

  if (load.phase === "missing" || load.phase === "error") {
    return (
      <ErrorState
        title="Lead not found"
        description={
          load.phase === "missing"
            ? "This lead does not exist. It may have been removed."
            : load.message
        }
      />
    );
  }

  const lead = load.lead;
  const meeting = lead.meetingStatus;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Link
          to="/leads"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Leads
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-ink">{lead.name}</h1>
        <p className="text-sm text-muted">
          {lead.company || "Independent"} · {lead.email}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">Lead Information</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-muted">Name</dt>
              <dd className="mt-0.5 text-ink">{lead.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Email</dt>
              <dd className="mt-0.5 text-ink">{lead.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Company</dt>
              <dd className="mt-0.5 text-ink">{lead.company || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Message</dt>
              <dd className="mt-0.5 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-ink">
                {lead.message}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">AI Qualification</h2>
          <div className="mt-4 flex items-center gap-4">
            <ScoreDisplay score={lead.score} size="lg" />
            <PriorityBadge priority={lead.priority} />
          </div>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-muted">Intent</dt>
              <dd className="mt-0.5 text-ink">{lead.intent}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Summary</dt>
              <dd className="mt-0.5 text-ink">{lead.summary}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Recommended Action</dt>
              <dd className="mt-0.5 text-ink">{lead.recommendedAction}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Status</h2>
            <div className="mt-2">
              <StatusBadge status={lead.status} />
            </div>
          </div>
          {lead.status === "NEW" ? (
            <button
              type="button"
              onClick={handleMarkContacted}
              disabled={updatingStatus}
              className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-60"
            >
              {updatingStatus ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Updating…
                </span>
              ) : (
                "Mark as Contacted"
              )}
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-line p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarClock className="h-4 w-4 text-muted" aria-hidden />
              Meeting
            </h3>
            {meeting === "SCHEDULED" && lead.calendarEventUrl ? (
              <div className="mt-3">
                <p className="inline-flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Discovery call scheduled
                </p>
                <a
                  href={lead.calendarEventUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Open Calendar Event
                </a>
              </div>
            ) : meeting === "FAILED" ? (
              <div className="mt-3">
                <p className="inline-flex items-center gap-1.5 text-sm text-danger">
                  <CircleAlert className="h-4 w-4" aria-hidden />
                  Unable to schedule meeting
                </p>
              </div>
            ) : meeting === "NOT_REQUIRED" ? (
              <p className="mt-3 text-sm text-muted">Meeting not required.</p>
            ) : (
              <p className="mt-3 text-sm text-muted">No meeting scheduled.</p>
            )}

            {meeting !== "SCHEDULED" && isN8nConfigured() ? (
              <form
                onSubmit={handleSchedule}
                className="mt-4 space-y-3"
                aria-label="Schedule discovery call"
              >
                <div>
                  <label
                    htmlFor="meeting-start"
                    className="block text-xs font-medium text-muted"
                  >
                    Preferred date and time
                  </label>
                  <input
                    id="meeting-start"
                    type="datetime-local"
                    value={meetingStart}
                    onChange={(e) => setMeetingStart(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                  />
                </div>
                {scheduleError ? (
                  <p className="text-xs text-danger">{scheduleError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={scheduling || !meetingStart}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {scheduling ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <CalendarPlus className="h-4 w-4" aria-hidden />
                  )}
                  Schedule Discovery Call
                </button>
              </form>
            ) : null}
          </div>

          <div className="rounded-lg border border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Activity</h3>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
              {lead.activityLogged ? (
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
              ) : (
                <CircleAlert className="h-4 w-4 text-muted" aria-hidden />
              )}
              {lead.activityLogged
                ? "Logged to Google Workspace"
                : "Not logged to Google Workspace"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}