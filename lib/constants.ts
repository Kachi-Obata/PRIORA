// Priora v1 — app-wide constants

/** Attendance threshold. Below this, a student is considered "at risk". */
export const ATTENDANCE_THRESHOLD = 0.75;

/** How close to the threshold triggers a warning (within 5 percentage points). */
export const ATTENDANCE_WARNING_BAND = 0.05;

/** Groups are fixed at the 200-level CS department: A / B / C / D. */
export const GROUPS = ["A", "B", "C", "D"] as const;
export type Group = (typeof GROUPS)[number];

/** Task types — order is display order (exam most serious → assignment least). */
export const TASK_TYPES = ["assignment", "test", "exam"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

/** Display labels for task types. */
export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  assignment: "Assignment",
  test: "Test",
  exam: "Exam",
};

/** Roles. Rep and assistant_rep have identical permissions by design. */
export const ROLES = ["student", "rep", "assistant_rep", "master_admin"] as const;
export type Role = (typeof ROLES)[number];

/** Human label for a role + group, used for attribution. */
export function roleLabel(role: Role, group: Group | null): string {
  if (role === "master_admin") return "Priora Admin";
  const groupPart = group ? `Group ${group} ` : "";
  if (role === "rep") return `${groupPart}Rep`;
  if (role === "assistant_rep") return `${groupPart}Assistant Rep`;
  return `${groupPart}Student`;
}

/** Is this role allowed to post tasks, log sessions, edit course settings? */
export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "rep" || role === "assistant_rep" || role === "master_admin";
}
