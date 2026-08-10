interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-md bg-line/70 ${className}`} aria-hidden />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div>
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}