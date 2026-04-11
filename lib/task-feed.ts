// Task feed logic. Given a flat list of tasks joined with completion state,
// this is the source of truth for how the Home screen is ordered and grouped.
import { TASK_TYPES, type TaskType } from "./constants";
import { daysBetween, parseDate, today } from "./dates";
import type { TaskBand, TaskWithCompletion } from "./types";

/** Compute which band a task belongs to. */
export function bandFor(task: TaskWithCompletion, now: Date = today()): TaskBand {
  const isCompleted = task.completed_at != null;

  if (isCompleted) {
    // Only show completions from today; the feed query excludes older ones.
    const completedDay = new Date(task.completed_at!);
    completedDay.setHours(0, 0, 0, 0);
    return daysBetween(now, completedDay) === 0 ? "completed_today" : "later";
  }

  const due = parseDate(task.due_date);
  const diff = daysBetween(now, due);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "this_week";
  return "later";
}

/**
 * Sort comparator implementing the spec:
 *   1. Completed sinks to bottom (within completed_today)
 *   2. Band: overdue → this_week → later → completed_today
 *   3. due_date ascending
 *   4. type: exam > test > assignment
 *   5. weight descending, nulls last
 */
const BAND_RANK: Record<TaskBand, number> = {
  overdue: 0,
  this_week: 1,
  later: 2,
  completed_today: 3,
};

const TYPE_RANK: Record<TaskType, number> = {
  exam: 0,
  test: 1,
  assignment: 2,
};

export function sortTasks(
  tasks: TaskWithCompletion[],
  now: Date = today(),
): TaskWithCompletion[] {
  return [...tasks].sort((a, b) => {
    const bandA = bandFor(a, now);
    const bandB = bandFor(b, now);
    if (bandA !== bandB) return BAND_RANK[bandA] - BAND_RANK[bandB];

    // Within a band: earliest due first
    const dateCmp = a.due_date.localeCompare(b.due_date);
    if (dateCmp !== 0) return dateCmp;

    // Then exam > test > assignment
    const typeCmp = TYPE_RANK[a.type] - TYPE_RANK[b.type];
    if (typeCmp !== 0) return typeCmp;

    // Then higher weight first, nulls last
    const wa = a.weight == null ? -Infinity : a.weight;
    const wb = b.weight == null ? -Infinity : b.weight;
    return wb - wa;
  });
}

/** Group sorted tasks by band, dropping empty bands. */
export function groupByBand(
  sorted: TaskWithCompletion[],
  now: Date = today(),
): Array<{ band: TaskBand; tasks: TaskWithCompletion[] }> {
  const buckets = new Map<TaskBand, TaskWithCompletion[]>();
  for (const t of sorted) {
    const b = bandFor(t, now);
    const arr = buckets.get(b) ?? [];
    arr.push(t);
    buckets.set(b, arr);
  }
  const order: TaskBand[] = ["overdue", "this_week", "later", "completed_today"];
  return order
    .filter((b) => (buckets.get(b)?.length ?? 0) > 0)
    .map((b) => ({ band: b, tasks: buckets.get(b)! }));
}

/** Human label for a band header. */
export function bandLabel(band: TaskBand): string | null {
  if (band === "overdue") return "Overdue";
  if (band === "this_week") return "Due this week";
  if (band === "later") return "Coming up";
  return null; // completed_today has no header — they just sit at the bottom
}

// Re-export for convenience
export { TASK_TYPES };
