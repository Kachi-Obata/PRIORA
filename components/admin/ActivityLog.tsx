"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { relativeTimeLabel } from "@/lib/dates";
import type { AdminActivityEntry } from "@/lib/data/admin";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { TrashIcon } from "../Icon";
import { ToastProvider, useToast } from "../Toast";

interface Props {
  entries: AdminActivityEntry[];
}

export default function ActivityLog(props: Props) {
  // Wrap in a local ToastProvider so delete feedback works even when rendered
  // outside the AdminActions sheet (ActivityLog is mounted separately).
  return (
    <ToastProvider>
      <ActivityLogInner {...props} />
    </ToastProvider>
  );
}

function ActivityLogInner({ entries: initialEntries }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [entries, setEntries] = useState(initialEntries);
  const [confirming, setConfirming] = useState<AdminActivityEntry | null>(null);

  // Stay in sync with the server once a background refresh lands (our own
  // delete below, the 5-minute auto-refresh, or a pull-to-refresh).
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  function handleDelete(entry: AdminActivityEntry) {
    // Optimistic: the row disappears and the dialog closes immediately.
    // The actual delete happens in the background — the admin never waits.
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setConfirming(null);

    startTransition(async () => {
      const supabase = getSupabaseBrowser();
      const table = entry.kind === "task" ? "tasks" : "attendance_sessions";
      const { error } = await supabase.from(table).delete().eq("id", entry.raw_id);

      if (error) {
        // Roll back — put it back in its original position.
        setEntries((prev) => {
          if (prev.some((e) => e.id === entry.id)) return prev;
          return [...prev, entry].sort((a, b) =>
            b.created_at.localeCompare(a.created_at),
          );
        });
        toast.show("Couldn't delete. Please try again.");
        return;
      }

      toast.show(entry.kind === "task" ? "Task deleted" : "Session deleted");
      // Keep the server/router cache in sync for next navigation — fired
      // after the UI has already updated, so it never blocks anything.
      router.refresh();
    });
  }

  if (entries.length === 0) {
    return (
      <div className="mt-4 text-sm text-ink-muted text-center py-8">
        No admin activity yet.
      </div>
    );
  }

  return (
    <>
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
              {e.can_delete && (e.kind === "task" || e.kind === "session") && (
                <button
                  type="button"
                  aria-label={
                    e.kind === "task" ? "Delete task" : "Delete session"
                  }
                  className="shrink-0 -m-1 p-2 rounded-btn text-ink-muted hover:text-danger-ink hover:bg-danger-soft transition-colors"
                  onClick={() => setConfirming(e)}
                >
                  <TrashIcon size={18} strokeWidth={1.8} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {confirming && (
        <ConfirmDialog
          entry={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={() => handleDelete(confirming)}
        />
      )}
    </>
  );
}

interface ConfirmProps {
  entry: AdminActivityEntry;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialog({ entry, onCancel, onConfirm }: ConfirmProps) {
  const heading =
    entry.kind === "task" ? "Delete this task?" : "Delete this session?";
  const body =
    entry.kind === "task"
      ? "It will be removed from all students' feeds."
      : "Students' attendance stats will update automatically.";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-heading"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-heading" className="text-base font-semibold text-ink">
          {heading}
        </h3>
        <p className="mt-2 text-sm text-ink-muted">{body}</p>
        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center bg-danger text-white font-medium rounded-btn px-4 py-3 min-h-[44px] transition-colors hover:bg-danger-ink"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
