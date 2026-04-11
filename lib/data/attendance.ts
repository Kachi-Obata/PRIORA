// Server-side loader for the Attendance screen. Returns per-course data
// including every logged session so the history list can be rendered.
import { getSupabaseServer } from "@/lib/supabase/server";
import type { AttendanceSession, Course } from "@/lib/types";
import type { Group } from "@/lib/constants";

export interface AttendanceCourseData {
  course: Course;
  expected_sessions: number | null;
  sessions: AttendanceSession[]; // reverse-chronological
  missed_session_ids: Set<string>;
}

export async function loadAttendanceData(
  userId: string,
  userGroup: Group,
): Promise<AttendanceCourseData[]> {
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
      .select("id, course_code, \"group\", date, counts, created_by, created_at")
      .eq("group", userGroup)
      .in("course_code", codes)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("course_group_settings")
      .select("course_code, expected_sessions")
      .eq("group", userGroup)
      .in("course_code", codes),
  ]);

  const sessionList = (sessions ?? []) as AttendanceSession[];

  const { data: misses } = await supabase
    .from("declared_misses")
    .select("session_id")
    .eq("user_id", userId)
    .in(
      "session_id",
      sessionList.map((s) => s.id),
    );
  const missedIds = new Set((misses ?? []).map((m) => m.session_id));

  const expectedByCode = new Map<string, number | null>();
  for (const s of settings ?? [])
    expectedByCode.set(s.course_code, s.expected_sessions);

  return courses.map((course) => ({
    course: course as Course,
    expected_sessions: expectedByCode.get(course.code) ?? null,
    sessions: sessionList.filter((s) => s.course_code === course.code),
    missed_session_ids: new Set(
      sessionList
        .filter((s) => s.course_code === course.code && missedIds.has(s.id))
        .map((s) => s.id),
    ),
  }));
}
