// Admin page loading state.
import LoadingShell from "@/components/LoadingShell";
import { ActivityEntrySkeleton, Bone } from "@/components/Skeleton";

export default function AdminLoading() {
  return (
    <LoadingShell active="admin">
      <header className="pt-4 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Post tasks, log class sessions, and keep course settings current.
        </p>
      </header>

      {/* Action buttons skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <Bone className="h-16 rounded-btn" />
        <Bone className="h-16 rounded-btn" />
      </div>
      <Bone className="h-12 rounded-btn mt-3" />

      {/* Activity log skeleton */}
      <div className="mt-8">
        <Bone className="h-3 w-28 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <ActivityEntrySkeleton key={i} />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
