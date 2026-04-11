"use client";

import { CheckIcon } from "./Icon";
import { TASK_TYPE_LABEL } from "@/lib/constants";
import { relativeDueLabel } from "@/lib/dates";
import type { TaskWithCompletion } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  task: TaskWithCompletion;
  overdue: boolean;
  onToggleComplete: (task: TaskWithCompletion) => void;
  onOpen: (task: TaskWithCompletion) => void;
  pending?: boolean;
}

export default function TaskCard({
  task,
  overdue,
  onToggleComplete,
  onOpen,
  pending,
}: Props) {
  const completed = task.completed_at != null;

  return (
    <div
      className={cn(
        "card flex items-start gap-3 p-4 transition-colors",
        overdue && !completed && "border-l-[3px] border-l-danger",
        completed && "opacity-60",
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task);
        }}
        disabled={pending}
        className={cn(
          "shrink-0 mt-0.5 w-6 h-6 rounded-md border-[1.5px] flex items-center justify-center transition-colors",
          completed
            ? "bg-accent border-accent text-white"
            : "border-ink-soft hover:border-accent",
        )}
        aria-label={completed ? "Mark as not done" : "Mark as done"}
        aria-pressed={completed}
      >
        {completed && <CheckIcon size={16} strokeWidth={2.4} />}
      </button>

      {/* Body */}
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
          {task.course_code}
        </div>
        <div
          className={cn(
            "mt-0.5 text-[15.5px] font-medium text-ink leading-snug",
            completed && "line-through text-ink-muted",
          )}
        >
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-muted">
          <span>{TASK_TYPE_LABEL[task.type]}</span>
          <span aria-hidden>·</span>
          <span
            className={cn(
              overdue && !completed && "text-danger-ink font-medium",
            )}
          >
            {relativeDueLabel(task.due_date)}
          </span>
          {task.weight != null && (
            <>
              <span aria-hidden>·</span>
              <span>{formatWeight(task.weight)} of grade</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}

function formatWeight(w: number): string {
  // Strip trailing zeros so "15.0" → "15%"
  const n = Math.round(w * 10) / 10;
  return Number.isInteger(n) ? `${n}%` : `${n}%`;
}
