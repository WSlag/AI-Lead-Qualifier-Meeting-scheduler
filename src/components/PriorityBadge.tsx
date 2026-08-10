import type { Priority } from "../types/lead";

const styles: Record<Priority, string> = {
  HIGH: "bg-danger-soft text-danger",
  MEDIUM: "bg-warning-soft text-warning",
  LOW: "bg-success-soft text-success",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}