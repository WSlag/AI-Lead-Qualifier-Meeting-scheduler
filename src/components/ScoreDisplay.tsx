import { Gauge } from "lucide-react";

interface ScoreDisplayProps {
  score: number;
  size?: "sm" | "lg";
}

export function ScoreDisplay({ score, size = "sm" }: ScoreDisplayProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const pct = `${clamped}%`;
  const barColor =
    clamped <= 40 ? "bg-danger" : clamped <= 70 ? "bg-warning" : "bg-success";
  return (
    <div className={size === "lg" ? "w-full max-w-md" : "w-full max-w-[160px]"}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Gauge className="h-3.5 w-3.5" aria-hidden />
          AI Score
        </span>
        <span className="text-sm font-semibold text-ink">
          {clamped}<span className="text-muted"> / 100</span>
        </span>
      </div>
      <div
        className={`mt-1.5 rounded-full bg-line ${size === "lg" ? "h-2.5" : "h-2"}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="AI score"
      >
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: pct }}
        />
      </div>
    </div>
  );
}