import { Link } from "react-router-dom";
import type { Lead } from "../types/lead";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { ScoreDisplay } from "./ScoreDisplay";

export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface LeadTableProps {
  leads: Lead[];
}

export function LeadTable({ leads }: LeadTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="hidden grid-cols-[2fr_1fr_0.75fr_0.8fr] items-center gap-4 border-b border-line bg-canvas px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted md:grid lg:grid-cols-[2fr_1fr_0.75fr_0.75fr_0.8fr_0.75fr]">
        <span>Lead</span>
        <span className="hidden lg:block">Company</span>
        <span>Score</span>
        <span className="hidden md:block">Priority</span>
        <span>Status</span>
        <span className="hidden lg:block">Created</span>
      </div>
      <div className="divide-y divide-line">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            to={`/leads/${lead.id}`}
            className="block transition-colors hover:bg-canvas"
          >
            <div className="grid grid-cols-1 items-center gap-3 px-6 py-3 md:grid-cols-[2fr_1fr_0.75fr_0.8fr] md:gap-4 lg:grid-cols-[2fr_1fr_0.75fr_0.75fr_0.8fr_0.75fr]">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{lead.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{lead.email}</p>
              </div>
              <span className="hidden lg:block">{lead.company || "—"}</span>
              <div>
                <span className="mr-1 text-xs uppercase tracking-wide text-muted md:hidden">Score: </span>
                <ScoreDisplay score={lead.score} />
              </div>
              <span className="hidden md:block">
                <PriorityBadge priority={lead.priority} />
              </span>
              <div>
                <span className="mr-1 text-xs uppercase tracking-wide text-muted md:hidden">Status: </span>
                <StatusBadge status={lead.status} />
              </div>
              <span className="hidden lg:block lg:text-right">{formatDate(lead.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}