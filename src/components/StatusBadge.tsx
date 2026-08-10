import type { LeadStatus } from "../types/lead";

const styles: Record<LeadStatus, string> = {
  NEW: "bg-primary-soft text-primary",
  CONTACTED: "bg-warning-soft text-warning",
  QUALIFIED: "bg-success-soft text-success",
  DISQUALIFIED: "bg-slate-100 text-muted",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}