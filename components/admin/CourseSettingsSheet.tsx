"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "../BottomSheet";
import { useToast } from "../Toast";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Course, CourseGroupSetting } from "@/lib/types";
import type { Group } from "@/lib/constants";

interface Props {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  settings: CourseGroupSetting[];
  adminGroup: Group | null;
}

/**
 * For non-master admins: shows one row per course (scoped to their group).
 * For master admins: collapses to rows per course, and the admin picks the
 * group via the group selector on each row. To keep v1 simple, we show all
 * (course × group) combinations for master admin.
 */
export default function CourseSettingsSheet({
  open,
  onClose,
  courses,
  settings,
  adminGroup,
}: Props) {
  const router = useRouter();
  const toast = useToast();

  // Key = `${course_code}::${group}` → value (as string for input state)
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, string> = {};
    for (const s of settings) {
      init[`${s.course_code}::${s.group}`] =
        s.expected_sessions == null ? "" : String(s.expected_sessions);
    }
    setValues(init);
  }, [open, settings]);

  // Rows to render: for group-scoped admins, one row per course; for master,
  // one row per (course, group) combination that the course participates in.
  const rows: Array<{ course: Course; group: Group }> = [];
  for (const c of courses) {
    if (adminGroup) {
      if (c.groups.includes(adminGroup)) rows.push({ course: c, group: adminGroup });
    } else {
      for (const g of c.groups) rows.push({ course: c, group: g });
    }
  }

  async function saveRow(courseCode: string, group: Group) {
    const key = `${courseCode}::${group}`;
    const raw = values[key]?.trim() ?? "";
    let expected: number | null = null;
    if (raw !== "") {
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) {
        toast.show("Enter a whole number.");
        return;
      }
      expected = Math.round(n);
    }

    setSavingKey(key);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("course_group_settings").upsert(
      {
        course_code: courseCode,
        group,
        expected_sessions: expected,
      },
      { onConflict: "course_code,group" },
    );
    setSavingKey(null);
    if (error) {
      toast.show("Could not save.");
      return;
    }
    toast.show("Saved");
    router.refresh();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Course settings">
      <p className="text-sm text-ink-muted mb-4">
        Set the approximate total number of classes expected this semester.
        This powers attendance projections for students. You can update this
        anytime.
      </p>

      <ul className="space-y-4">
        {rows.map(({ course, group }) => {
          const key = `${course.code}::${group}`;
          return (
            <li key={key}>
              <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
                {course.code} {!adminGroup && `· Group ${group}`}
              </div>
              <div className="font-medium text-ink">{course.name}</div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-sm text-ink-muted" htmlFor={`es-${key}`}>
                  Expected classes this semester
                </label>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id={`es-${key}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="input-field max-w-[120px]"
                  placeholder="Not set"
                  value={values[key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  onBlur={() => saveRow(course.code, group)}
                />
                {savingKey === key && (
                  <span className="text-xs text-ink-muted">Saving…</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
