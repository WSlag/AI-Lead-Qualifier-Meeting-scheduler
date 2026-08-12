import type { Priority } from "../types/lead";

const styles: Record<Priority, string> = {
  HIGH: "bg-danger-soft text-danger",
  MEDIUM: "bg-warning-soft text-warning",
  LOW: "bg-success-soft text-success",
};

const dots: Record<Priority, string> = {
  HIGH: "bg-danger",
  MEDIUM: "bg-warning",
  LOW: "bg-success",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[priority]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[priority]}`} aria-hidden />
      {priority}
    </span>
  );
}