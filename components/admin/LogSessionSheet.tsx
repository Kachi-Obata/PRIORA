"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "../BottomSheet";
import { useToast } from "../Toast";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { GROUPS, type Group } from "@/lib/constants";
import { formatDate, today } from "@/lib/dates";
import type { Course } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  adminId: string;
  adminGroup: Group | null;
}

export default function LogSessionSheet({
  open,
  onClose,
  courses,
  adminId,
  adminGroup,
}: Props) {
  const router = useRouter();
  const toast = useToast();

  const [courseCode, setCourseCode] = useState("");
  const [group, setGroup] = useState<Group | "">(adminGroup ?? "");
  const [date, setDate] = useState(formatDate(today()));
  const [counts, setCounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCourseCode("");
      setGroup(adminGroup ?? "");
      setDate(formatDate(today()));
      setCounts(true);
      setError(null);
    }
  }, [open, adminGroup]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!courseCode) return setError("Pick a course.");
    if (!group) return setError("Pick a group.");
    if (!date) return setError("Pick a date.");

    setSubmitting(true);
    const supabase = getSupabaseBrowser();
    const { error: insertError } = await supabase.from("attendance_sessions").insert({
      course_code: courseCode,
      group,
      date,
      counts,
      created_by: adminId,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    toast.show("Session logged");
    setSubmitting(false);
    onClose();
    router.refresh();
  }

  // Filter courses to ones that include the selected group (or any if master)
  const availableCourses = group
    ? courses.filter((c) => c.groups.includes(group))
    : courses;

  return (
    <BottomSheet open={open} onClose={onClose} title="Log a session">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="ls-group">
            Group
          </label>
          {adminGroup ? (
            <div className="input-field flex items-center font-medium">
              Group {adminGroup}
            </div>
          ) : (
            <select
              id="ls-group"
              value={group}
              onChange={(e) => {
                setGroup(e.target.value as Group);
                setCourseCode("");
              }}
              className="input-field"
              required
            >
              <option value="">Select a group…</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  Group {g}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="label" htmlFor="ls-course">
            Course
          </label>
          <select
            id="ls-course"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="input-field"
            required
            disabled={!group}
          >
            <option value="">Select a course…</option>
            {availableCourses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="ls-date">
            Date
          </label>
          <input
            id="ls-date"
            type="date"
            value={date}
            max={formatDate(today())}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            required
          />
        </div>

        <label className="flex items-center gap-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={counts}
            onChange={(e) => setCounts(e.target.checked)}
            className="w-5 h-5 accent-accent"
          />
          <span className="text-sm font-medium">Counts toward attendance</span>
        </label>

        {error && (
          <p className="text-sm text-danger-ink" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Logging…" : "Log session"}
        </button>
      </form>
    </BottomSheet>
  );
}
