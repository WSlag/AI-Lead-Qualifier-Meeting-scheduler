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
      <div className="hidden grid-cols-[2fr_1fr_0.75fr_0.75fr_0.8fr_0.75fr] items-center gap-4 border-b border-line bg-canvas px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
        <span>Lead</span>
        <span>Company</span>
        <span>Score</span>
        <span>Priority</span>
        <span>Status</span>
        <span>Created</span>
      </div>
      <div className="divide-y divide-line">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            to={`/leads/${lead.id}`}
            className="block transition-colors hover:bg-canvas"
          >
            <div className="grid grid-cols-1 items-center gap-2 px-5 py-3 sm:grid-cols-[2fr_1fr_0.75fr_0.75fr_0.8fr_0.75fr] sm:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                <p className="truncate text-xs text-muted">{lead.email}</p>
              </div>
              <span className="text-sm text-muted sm:block">
                <span className="mr-1 text-xs uppercase text-muted sm:hidden">Company: </span>
                {lead.company || "—"}
              </span>
              <div className="sm:col-span-1">
                <span className="mr-1 text-xs uppercase text-muted sm:hidden">Score: </span>
                <ScoreDisplay score={lead.score} />
              </div>
              <span className="sm:col-span-1">
                <span className="mr-1 text-xs uppercase text-muted sm:hidden">Priority: </span>
                <PriorityBadge priority={lead.priority} />
              </span>
              <span className="sm:col-span-1">
                <span className="mr-1 text-xs uppercase text-muted sm:hidden">Status: </span>
                <StatusBadge status={lead.status} />
              </span>
              <span className="text-sm text-muted sm:col-span-1 sm:text-right">
                <span className="mr-1 text-xs uppercase text-muted sm:hidden">Created: </span>
                {formatDate(lead.createdAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}