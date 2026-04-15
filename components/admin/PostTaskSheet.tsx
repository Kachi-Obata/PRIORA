"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "../BottomSheet";
import { useToast } from "../Toast";
import { GROUPS, TASK_TYPES, TASK_TYPE_LABEL, type Group } from "@/lib/constants";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  adminId: string;
  adminGroup: Group | null; // null for master_admin (no filtering)
  personalGroup: Group | null; // the admin's actual group (for pre-selection)
}

export default function PostTaskSheet({
  open,
  onClose,
  courses,
  adminId,
  adminGroup,
  personalGroup,
}: Props) {
  const router = useRouter();
  const toast = useToast();

  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof TASK_TYPES)[number]>("assignment");
  const [dueDate, setDueDate] = useState("");
  const [weight, setWeight] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      setCourseCode("");
      setTitle("");
      setDescription("");
      setType("assignment");
      setDueDate("");
      setWeight("");
      // Pre-select the admin's own group (works for both rep and master_admin)
      setGroups(personalGroup ? [personalGroup] : []);
      setError(null);
    }
  }, [open, personalGroup]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.code === courseCode),
    [courses, courseCode],
  );

  // When the course changes, pre-fill groups.
  // - Rep / assistant_rep: only their own group (from the course's groups[])
  // - Master admin: their personal group if the course includes it, otherwise
  //   just the first group. They can toggle any group on/off from there.
  useEffect(() => {
    if (!selectedCourse) return;
    if (adminGroup) {
      // Group-scoped admin — only their own group
      setGroups(selectedCourse.groups.filter((g) => g === adminGroup));
    } else {
      // Master admin — default to their personal group if the course has it
      const defaultGroup = personalGroup && selectedCourse.groups.includes(personalGroup)
        ? [personalGroup]
        : selectedCourse.groups.slice(0, 1);
      setGroups(defaultGroup);
    }
  }, [selectedCourse, adminGroup, personalGroup]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!courseCode) return setError("Pick a course.");
    if (!title.trim()) return setError("What's due?");
    if (!dueDate) return setError("Pick a due date.");
    if (groups.length === 0) return setError("Select at least one group.");

    let weightNum: number | null = null;
    if (weight.trim()) {
      const n = Number(weight);
      if (Number.isNaN(n) || n < 0 || n > 100)
        return setError("Weight must be a number between 0 and 100.");
      weightNum = n;
    }

    setSubmitting(true);
    // Go through the API route so notifications fan out server-side.
    // (The RLS policies still apply because the route uses the user's session.)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          course_code: courseCode,
          title: title.trim(),
          description: description.trim() || null,
          type,
          due_date: dueDate,
          weight: weightNum,
          groups,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Failed to post task" }));
        throw new Error(payload.error || "Failed to post task");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post task");
      setSubmitting(false);
      return;
    }

    toast.show("Task posted");
    setSubmitting(false);
    onClose();
    router.refresh();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Post a task">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="pt-course">
            Course
          </label>
          <select
            id="pt-course"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="pt-title">
            What's due?
          </label>
          <input
            id="pt-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="e.g. Chapter 3 exercises, midterm prep..."
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="pt-desc">
            Description
          </label>
          <textarea
            id="pt-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-[72px]"
            placeholder="Any additional details (optional)"
            rows={3}
          />
        </div>

        <div>
          <span className="label">Type</span>
          <div className="grid grid-cols-3 gap-2">
            {TASK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "py-2.5 rounded-btn border text-sm font-medium transition-colors",
                  type === t
                    ? "bg-accent-soft border-accent text-accent-ink"
                    : "border-ink-faint text-ink-muted hover:border-ink-soft",
                )}
                aria-pressed={type === t}
              >
                {TASK_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pt-due">
            Due date
          </label>
          <input
            id="pt-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="pt-weight">
            % of grade
          </label>
          <input
            id="pt-weight"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="input-field"
            placeholder="e.g. 15"
          />
        </div>

        <div>
          <span className="label">Groups</span>
          <div className="grid grid-cols-4 gap-2">
            {GROUPS.map((g) => {
              const selected = groups.includes(g);
              const allowedByCourse =
                !selectedCourse || selectedCourse.groups.includes(g);
              const allowedByRole = !adminGroup || adminGroup === g;
              const disabled = !allowedByCourse || !allowedByRole;
              return (
                <button
                  key={g}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setGroups((prev) =>
                      selected ? prev.filter((x) => x !== g) : [...prev, g],
                    )
                  }
                  className={cn(
                    "py-2.5 rounded-btn border text-sm font-semibold transition-colors",
                    selected
                      ? "bg-accent-soft border-accent text-accent-ink"
                      : "border-ink-faint text-ink",
                    disabled && "opacity-40 cursor-not-allowed",
                  )}
                  aria-pressed={selected}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger-ink" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Posting…" : "Post task"}
        </button>
      </form>
    </BottomSheet>
  );
}
