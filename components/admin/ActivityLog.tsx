import { relativeTimeLabel } from "@/lib/dates";
import type { AdminActivityEntry } from "@/lib/data/admin";

interface Props {
  entries: AdminActivityEntry[];
}

export default function ActivityLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="mt-4 text-sm text-ink-muted text-center py-8">
        No admin activity yet.
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
                {e.course_code} · {e.group_label}
              </div>
              <div className="mt-0.5 text-[15px] text-ink leading-snug">
                {e.summary}
              </div>
              <div className="mt-1 text-xs text-ink-muted">
                {e.created_by_label} · {relativeTimeLabel(e.created_at)}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
