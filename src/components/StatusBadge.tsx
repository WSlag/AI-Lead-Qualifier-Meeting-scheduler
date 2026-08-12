import type { LeadStatus } from "../types/lead";

const styles: Record<LeadStatus, string> = {
  NEW: "bg-primary-soft text-primary",
  CONTACTED: "bg-warning-soft text-warning",
  QUALIFIED: "bg-success-soft text-success",
  DISQUALIFIED: "bg-slate-100 text-muted",
};

const dots: Record<LeadStatus, string> = {
  NEW: "bg-primary",
  CONTACTED: "bg-warning",
  QUALIFIED: "bg-success",
  DISQUALIFIED: "bg-muted",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[status]}`}
        aria-hidden
      />
      {status}
    </span>
  );
}