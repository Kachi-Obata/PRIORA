// Home page loading state. Shown instantly on navigation while the server
// fetches tasks and attendance data.
import LoadingShell from "@/components/LoadingShell";
import { TaskCardSkeleton } from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <LoadingShell active="home">
      <header className="flex items-center justify-between pt-4 pb-1">
        <h1 className="text-xl font-semibold tracking-tight md:hidden">Priora</h1>
      </header>
      <div className="mt-4 space-y-5">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
