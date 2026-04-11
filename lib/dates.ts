// Date helpers. All operate in the user's local timezone; `due_date` is a
// calendar date so "today" / "tomorrow" never drifts from what the user sees.

/** Today's date at local midnight (00:00). */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parse a YYYY-MM-DD date string into a local-midnight Date. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Format a Date as YYYY-MM-DD (local). */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole-day difference (positive = future, negative = past). */
export function daysBetween(from: Date, to: Date): number {
  const MS = 24 * 60 * 60 * 1000;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / MS);
}

/**
 * Relative due-date label for the task feed.
 *
 * - `today` → "Today"
 * - `tomorrow` → "Tomorrow"
 * - 2..7 days → "In N days"
 * - > 7 days → absolute short date ("Apr 22")
 * - past → "N days overdue"
 */
export function relativeDueLabel(dueIso: string, now: Date = today()): string {
  const due = parseDate(dueIso);
  const diff = daysBetween(now, due);

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  if (diff > 7)
    return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diff === -1) return "1 day overdue";
  return `${Math.abs(diff)} days overdue`;
}

/** Absolute, fully-spelled date used in the task detail sheet. */
export function absoluteDateLabel(dueIso: string): string {
  return parseDate(dueIso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "2 hours ago", "Yesterday", "3 days ago", etc. for timestamps. */
export function relativeTimeLabel(isoTs: string): string {
  const then = new Date(isoTs);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Short date used in session history rows. */
export function shortDateLabel(dateIso: string): string {
  return parseDate(dateIso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
