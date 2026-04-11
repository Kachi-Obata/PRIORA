// Attendance math. Keep these pure — no I/O — so they're trivial to reason
// about and identical on server, client, and in the notification dispatcher.
import { ATTENDANCE_THRESHOLD, ATTENDANCE_WARNING_BAND } from "./constants";
import type { AttendanceSummary } from "./types";

export interface AttendanceInputs {
  course_code: string;
  course_name: string;
  expected_sessions: number | null;
  /** Number of sessions logged with counts = true. */
  total_counted: number;
  /** How many of those the student has declared as missed. */
  declared_misses_on_counted: number;
}

/** Core summary used by the Home alert strip and Attendance screen. */
export function computeAttendance(input: AttendanceInputs): AttendanceSummary {
  const attended = Math.max(0, input.total_counted - input.declared_misses_on_counted);
  const percentage =
    input.total_counted === 0 ? 0 : (attended / input.total_counted) * 100;

  const projectedIfMiss =
    input.total_counted === 0
      ? null
      : (attended / (input.total_counted + 1)) * 100;

  const safeMissesRemaining = computeSafeMissesRemaining({
    expected_sessions: input.expected_sessions,
    current_misses: input.declared_misses_on_counted,
  });

  const status = classifyStatus(percentage, input.total_counted);

  return {
    course_code: input.course_code,
    course_name: input.course_name,
    expected_sessions: input.expected_sessions,
    total_counted: input.total_counted,
    attended,
    percentage,
    projected_if_miss: projectedIfMiss,
    safe_misses_remaining: safeMissesRemaining,
    status,
  };
}

/**
 * How many more sessions can the student miss while staying at or above
 * threshold, given expected_sessions.
 *
 * - null if expected_sessions is unset (no projection possible)
 * - negative values are clamped to 0 at the UI layer, but the negative is
 *   surfaced so callers can detect "already below threshold"
 */
export function computeSafeMissesRemaining(args: {
  expected_sessions: number | null;
  current_misses: number;
}): number | null {
  if (args.expected_sessions == null) return null;
  const maxTotalMisses = Math.floor(args.expected_sessions * (1 - ATTENDANCE_THRESHOLD));
  return maxTotalMisses - args.current_misses;
}

/** Status tier for a course's current attendance. */
export function classifyStatus(
  percentage: number,
  totalCounted: number,
): AttendanceSummary["status"] {
  // With zero sessions there is nothing to warn about.
  if (totalCounted === 0) return "healthy";
  const p = percentage / 100;
  if (p < ATTENDANCE_THRESHOLD) return "critical";
  if (p < ATTENDANCE_THRESHOLD + ATTENDANCE_WARNING_BAND) return "warning";
  return "healthy";
}

/** User-facing phrasing for "safe misses remaining". */
export function safeMissesPhrase(remaining: number | null): string | null {
  if (remaining == null) return null;
  if (remaining < 0) return "You're below the attendance threshold.";
  if (remaining === 0) return "You cannot miss any more classes.";
  if (remaining === 1) return "You can miss 1 more class.";
  return `You can miss ${remaining} more classes.`;
}
