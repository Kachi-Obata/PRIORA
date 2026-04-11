// Server-side data loaders for the Home screen.
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  computeAttendance,
  type AttendanceInputs,
} from "@/lib/attendance";
import { formatDate, parseDate, today } from "@/lib/dates";
import type { AttendanceSummary, TaskWithCompletion } from "@/lib/types";
import type { Group } from "@/lib/constants";

/**
 * Fetch the tasks the current user should see on Home, joined with their
 * personal completion state, filtering out old completions per the spec.
 */
export async function loadHomeTasks(
  userId: string,
  userGroup: Group,
): Promise<TaskWithCompletion[]> {
  const supabase = await getSupabaseServer();

  // Tasks for user's group (RLS also enforces this — defense in depth)
  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, course_code, title, description, type, due_date, weight, groups, created_by, created_at",
    )
    .contains("groups", [userGroup])
    .order("due_date", { ascending: true });

  if (!tasks || tasks.length === 0) return [];

  const { data: completions } = await supabase
    .from("task_completions")
    .select("task_id, completed_at")
    .eq("user_id", userId)
    .in(
      "task_id",
      tasks.map((t) => t.id),
    );

  const completionByTask = new Map<string, string>();
  for (const c of completions ?? []) completionByTask.set(c.task_id, c.completed_at);

  // Course names for the detail sheet header
  const courseCodes = Array.from(new Set(tasks.map((t) => t.course_code)));
  const { data: courses } = await supabase
    .from("courses")
    .select("code, name")
    .in("code", courseCodes);
  const nameByCode = new Map<string, string>();
  for (const c of courses ?? []) nameByCode.set(c.code, c.name);

  const todayIso = formatDate(today());

  const out: TaskWithCompletion[] = [];
  for (const t of tasks) {
    const completedAt = completionByTask.get(t.id) ?? null;
    // Spec: completed tasks only appear on the day they were completed.
    // Older completions vanish from the feed.
    if (completedAt) {
      const completedDay = formatDate(parseDate(completedAt.slice(0, 10)));
      if (completedDay !== todayIso) continue;
    }
    out.push({
      ...(t as any),
      completed_at: completedAt,
      course_name: nameByCode.get(t.course_code),
    });
  }
  return out;
}

/**
 * Compute attendance summaries for each of the user's courses.
 * Used by the Home alert strip and by the Attendance screen.
 */
export async function loadAttendanceSummaries(
  userId: string,
  userGroup: Group,
): Promise<AttendanceSummary[]> {
  const supabase = await getSupabaseServer();

  const { data: courses } = await supabase
    .from("courses")
    .select("code, name, groups")
    .contains("groups", [userGroup])
    .order("code", { ascending: true });

  if (!courses || courses.length === 0) return [];

  const codes = courses.map((c) => c.code);

  const [{ data: sessions }, { data: settings }] = await Promise.all([
    supabase
      .from("attendance_sessions")
      .select("id, course_code, \"group\", date, counts")
      .eq("group", userGroup)
      .in("course_code", codes),
    supabase
      .from("course_group_settings")
      .select("course_code, expected_sessions")
      .eq("group", userGroup)
      .in("course_code", codes),
  ]);

  const sessionList = sessions ?? [];
  const countedSessionIds = new Set(
    sessionList.filter((s) => s.counts).map((s) => s.id),
  );

  const { data: misses } = await supabase
    .from("declared_misses")
    .select("session_id")
    .eq("user_id", userId)
    .in(
      "session_id",
      sessionList.map((s) => s.id),
    );
  const missedSessionIds = new Set((misses ?? []).map((m) => m.session_id));

  const expectedByCode = new Map<string, number | null>();
  for (const s of settings ?? [])
    expectedByCode.set(s.course_code, s.expected_sessions);

  return courses.map((course) => {
    const courseSessions = sessionList.filter(
      (s) => s.course_code === course.code,
    );
    const countedForCourse = courseSessions.filter((s) => s.counts);
    const missedCounted = countedForCourse.filter((s) =>
      missedSessionIds.has(s.id) && countedSessionIds.has(s.id),
    ).length;

    const input: AttendanceInputs = {
      course_code: course.code,
      course_name: course.name,
      expected_sessions: expectedByCode.get(course.code) ?? null,
      total_counted: countedForCourse.length,
      declared_misses_on_counted: missedCounted,
    };
    return computeAttendance(input);
  });
}
