import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Flame, Gauge, CalendarClock } from "lucide-react";
import { subscribeLeads } from "../services/leads";
import type { Lead } from "../types/lead";
import { MetricCard } from "../components/MetricCard";
import { LeadTable } from "../components/LeadTable";
import { LoadingState } from "../components/LoadingState";
import { EmptyState, ErrorState } from "../components/EmptyState";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Dashboard() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = subscribeLeads(
      (next) => {
        setLeads(next);
        setError(null);
      },
      (err) => setError(err)
    );
    return unsub;
  }, []);

  if (error) {
    return (
      <ErrorState
        title="Dashboard unavailable"
        description="Firebase is not configured. Add the VITE_FIREBASE_* variables to connect the dashboard to Firestore."
      />
    );
  }

  const today = new Date();
  const computed = leads ?? [];
  const total = computed.length;
  const highPriority = computed.filter((l) => l.priority === "HIGH").length;
  const avgScore =
    total === 0 ? 0 : Math.round(computed.reduce((a, l) => a + l.score, 0) / total);
  const newToday = computed.filter((l) => isSameDay(new Date(l.createdAt), today)).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted">Monitor and qualify incoming leads.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Leads" value={total} icon={Users} />
        <MetricCard label="High Priority" value={highPriority} icon={Flame} />
        <MetricCard label="Average Score" value={avgScore} icon={Gauge} />
        <MetricCard label="New Today" value={newToday} icon={CalendarClock} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Recent Leads</h2>
          <Link
            to="/leads"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {leads === null ? (
          <LoadingState rows={5} />
        ) : leads.length === 0 ? (
          <EmptyState
            title="No leads yet"
            description="Submit your first lead to see AI qualification results."
            action={
              <Link
                to="/new"
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Add Lead
              </Link>
            }
          />
        ) : (
          <LeadTable leads={leads.slice(0, 8)} />
        )}
      </section>
    </div>
  );
}