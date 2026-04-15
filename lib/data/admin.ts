// Server-side loader for the Admin screen. Pulls the courses the admin can
// manage, existing course_group_settings rows, and a merged activity log.
import { getSupabaseServer } from "@/lib/supabase/server";
import type {
  AttendanceSession,
  Course,
  CourseGroupSetting,
  Task,
} from "@/lib/types";
import { roleLabel, type Group, type Role } from "@/lib/constants";

export interface AdminActivityEntry {
  /** Composite key — e.g. "task-<uuid>" — unique across kinds. Use `raw_id` for DB ops. */
  id: string;
  /** The underlying row UUID — what you pass to the delete API. */
  raw_id: string;
  kind: "task" | "session" | "settings";
  summary: string; // one-line description of the action
  course_code: string;
  group_label: string; // "Group A", "Group A, B", …
  created_by_label: string; // "Group A Rep" etc.
  created_at: string;
  /** True if the current admin is allowed to delete this entry (master, or creator). */
  can_delete: boolean;
}

export interface AdminData {
  courses: Course[];
  settings: CourseGroupSetting[];
  activity: AdminActivityEntry[];
}

export async function loadAdminData(
  adminId: string,
  adminRole: Role,
  adminGroup: Group | null,
): Promise<AdminData> {
  const supabase = await getSupabaseServer();
  const isMaster = adminRole === "master_admin";

  // Courses the admin can manage
  const courseQuery = supabase
    .from("courses")
    .select("code, name, groups")
    .order("code", { ascending: true });
  const { data: courses } = isMaster
    ? await courseQuery
    : await courseQuery.contains("groups", [adminGroup!]);

  // Settings for those courses, scoped to the admin's group (master sees all)
  let settings: CourseGroupSetting[] = [];
  if (courses && courses.length > 0) {
    const codes = courses.map((c) => c.code);
    const settingsQuery = supabase
      .from("course_group_settings")
      .select("course_code, \"group\", expected_sessions, updated_at")
      .in("course_code", codes);
    const { data } = isMaster
      ? await settingsQuery
      : await settingsQuery.eq("group", adminGroup!);
    settings = (data ?? []) as CourseGroupSetting[];
  }

  // Activity log: tasks + attendance sessions (+ settings changes),
  // merged and sorted by created_at desc.
  //
  // Non-master admins only see activity for their own group.
  const taskQuery = supabase
    .from("tasks")
    .select(
      "id, course_code, title, type, groups, created_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(30);

  const sessionQuery = supabase
    .from("attendance_sessions")
    .select("id, course_code, \"group\", date, counts, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const [taskRes, sessionRes] = isMaster
    ? await Promise.all([taskQuery, sessionQuery])
    : await Promise.all([
        taskQuery.contains("groups", [adminGroup!]),
        sessionQuery.eq("group", adminGroup!),
      ]);

  const recentTasks = (taskRes.data ?? []) as Task[];
  const recentSessions = (sessionRes.data ?? []) as AttendanceSession[];

  // Resolve creators for attribution
  const creatorIds = Array.from(
    new Set([
      ...recentTasks.map((t) => t.created_by),
      ...recentSessions.map((s) => s.created_by),
    ]),
  );
  const creatorMap = new Map<string, { role: Role; group: Group | null }>();
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("profiles")
      .select("id, role, \"group\"")
      .in("id", creatorIds);
    for (const c of creators ?? [])
      creatorMap.set(c.id, {
        role: c.role as Role,
        group: c.group as Group | null,
      });
  }

  const entries: AdminActivityEntry[] = [];
  for (const t of recentTasks) {
    const c = creatorMap.get(t.created_by);
    entries.push({
      id: `task-${t.id}`,
      raw_id: t.id,
      kind: "task",
      summary: `Posted ${t.type}: ${t.title}`,
      course_code: t.course_code,
      group_label: `Group ${t.groups.join(", ")}`,
      created_by_label: c ? roleLabel(c.role, c.group) : "Admin",
      created_at: t.created_at,
      can_delete: isMaster || t.created_by === adminId,
    });
  }
  for (const s of recentSessions) {
    const c = creatorMap.get(s.created_by);
    entries.push({
      id: `session-${s.id}`,
      raw_id: s.id,
      kind: "session",
      summary: `Logged a class session${s.counts ? "" : " (does not count)"}`,
      course_code: s.course_code,
      group_label: `Group ${s.group}`,
      created_by_label: c ? roleLabel(c.role, c.group) : "Admin",
      created_at: s.created_at,
      can_delete: isMaster || s.created_by === adminId,
    });
  }
  entries.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    courses: (courses ?? []) as Course[],
    settings,
    activity: entries.slice(0, 30),
  };
}
