// Priora v1 — domain types mirroring the Supabase schema
import type { Group, Role, TaskType } from "./constants";

export interface Profile {
  id: string;
  full_name: string | null;
  group: Group | null;
  role: Role;
  created_at: string;
}

export interface Course {
  code: string;
  name: string;
  groups: Group[];
}

export interface CourseGroupSetting {
  course_code: string;
  group: Group;
  expected_sessions: number | null;
  updated_at: string;
}

export interface Task {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  type: TaskType;
  due_date: string; // YYYY-MM-DD
  weight: number | null;
  groups: Group[];
  created_by: string;
  created_at: string;
}

export interface TaskCompletion {
  user_id: string;
  task_id: string;
  completed_at: string;
}

export interface TaskWithCompletion extends Task {
  completed_at: string | null;
  course_name?: string;
}

export interface AttendanceSession {
  id: string;
  course_code: string;
  group: Group;
  date: string;
  counts: boolean;
  created_by: string;
  created_at: string;
}

export interface DeclaredMiss {
  user_id: string;
  session_id: string;
  created_at: string;
}

/** Band the Home feed puts a task in. */
export type TaskBand = "overdue" | "this_week" | "later" | "completed_today";

/** Computed attendance summary for a course + group, per-student. */
export interface AttendanceSummary {
  course_code: string;
  course_name: string;
  expected_sessions: number | null;
  total_counted: number; // sessions logged so far with counts = true
  attended: number; // total_counted - declared misses on counted sessions
  percentage: number; // 0-100
  projected_if_miss: number | null; // null when total_counted = 0
  safe_misses_remaining: number | null; // null when expected_sessions is null
  /** "healthy" | "warning" (within 5% of threshold) | "critical" (below) */
  status: "healthy" | "warning" | "critical";
}
