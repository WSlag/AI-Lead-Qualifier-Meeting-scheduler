import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  hint?: string;
}

export function MetricCard({ label, value, icon: Icon, trend, hint }: MetricCardProps) {
  const trendingUp = trend?.startsWith("+");
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <p
          className="text-sm font-medium text-muted"
          title={hint}
          aria-label={hint ? `${label}. ${hint}` : label}
        >
          {label}
        </p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-ink">{value}</p>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trendingUp ? "text-success" : "text-danger"
            }`}
            aria-label={`${trendingUp ? "up" : "down"} ${trend.replace(/^[+\-]/, "").trim()}`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}