// Attendance page loading state.
import LoadingShell from "@/components/LoadingShell";
import { AttendanceCardSkeleton } from "@/components/Skeleton";

export default function AttendanceLoading() {
  return (
    <LoadingShell active="attendance">
      <header className="pt-4 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your current standing across every course.
        </p>
      </header>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <AttendanceCardSkeleton key={i} />
        ))}
      </div>
    </LoadingShell>
  );
}
