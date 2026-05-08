// Skeleton blocks used by loading.tsx files.
import { cn } from "@/lib/cn";

/** A single pulsing placeholder block. */
export function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-ink-faint/50 rounded-card animate-pulse",
        className,
      )}
      aria-hidden="true"
    />
  );
}

/** Skeleton that looks like a task card. */
export function TaskCardSkeleton() {
  return (
    <div className="card p-4 flex items-start gap-3">
      <Bone className="shrink-0 w-6 h-6 rounded-md mt-0.5" />
      <div className="flex-1 space-y-2">
        <Bone className="h-2.5 w-16" />
        <Bone className="h-4 w-4/5" />
        <Bone className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

/** Skeleton that looks like a course attendance card. */
export function AttendanceCardSkeleton() {
  return (
    <div className="card p-5">
      <Bone className="h-2.5 w-20 mb-2" />
      <Bone className="h-4 w-3/5 mb-4" />
      <Bone className="h-8 w-24 mb-2" />
      <Bone className="h-3 w-2/5" />
    </div>
  );
}

/** Skeleton that looks like an activity log entry. */
export function ActivityEntrySkeleton() {
  return (
    <div className="card p-4 space-y-2">
      <Bone className="h-2.5 w-24" />
      <Bone className="h-4 w-3/4" />
      <Bone className="h-2.5 w-1/3" />
    </div>
  );
}
