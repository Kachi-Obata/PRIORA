"use client";

import BottomSheet from "./BottomSheet";
import { TASK_TYPE_LABEL } from "@/lib/constants";
import { absoluteDateLabel, relativeTimeLabel } from "@/lib/dates";
import type { TaskWithCompletion } from "@/lib/types";

interface Props {
  task: TaskWithCompletion | null;
  attribution: string | null; // e.g., "Group A Rep"
  onClose: () => void;
  onToggleComplete: (task: TaskWithCompletion) => void;
  pending?: boolean;
}

export default function TaskDetailSheet({
  task,
  attribution,
  onClose,
  onToggleComplete,
  pending,
}: Props) {
  if (!task) return null;
  const completed = task.completed_at != null;

  return (
    <BottomSheet open={!!task} onClose={onClose} title="Task">
      <div className="space-y-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-ink-muted">
            {task.course_code}
            {task.course_name && ` — ${task.course_name}`}
          </div>
          <h3 className="mt-1 text-xl font-semibold text-ink leading-tight">
            {task.title}
          </h3>
        </div>

        {task.description && (
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
            {task.description}
          </p>
        )}

        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Type</dt>
            <dd className="font-medium">{TASK_TYPE_LABEL[task.type]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Due</dt>
            <dd className="font-medium text-right">
              {absoluteDateLabel(task.due_date)}
            </dd>
          </div>
          {task.weight != null && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Weight</dt>
              <dd className="font-medium">
                Worth {task.weight}% of your grade
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Posted</dt>
            <dd className="font-medium text-right">
              {attribution ? `${attribution} · ` : ""}
              {relativeTimeLabel(task.created_at)}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          disabled={pending}
          className={completed ? "btn-secondary w-full" : "btn-primary w-full"}
        >
          {completed ? "Mark as not done" : "Mark as done"}
        </button>
      </div>
    </BottomSheet>
  );
}
