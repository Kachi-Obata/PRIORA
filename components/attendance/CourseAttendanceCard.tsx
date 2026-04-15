"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  computeAttendance,
  safeMissesPhrase,
} from "@/lib/attendance";
import { shortDateLabel } from "@/lib/dates";
import type { AttendanceSession, Course } from "@/lib/types";
import { ChevronDownIcon } from "../Icon";
import { cn } from "@/lib/cn";

interface Props {
  course: Course;
  expectedSessions: number | null;
  sessions: AttendanceSession[]; // already reverse-chronological
  initialMissedIds: string[];
  userId: string;
}

export default function CourseAttendanceCard({
  course,
  expectedSessions,
  sessions,
  initialMissedIds,
  userId,
}: Props) {
  const [missed, setMissed] = useState<Set<string>>(
    () => new Set(initialMissedIds),
  );
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  // Recompute summary as the user toggles misses. Pure function → cheap.
  const summary = useMemo(() => {
    const countedSessions = sessions.filter((s) => s.counts);
    const missedCounted = countedSessions.filter((s) => missed.has(s.id)).length;
    return computeAttendance({
      course_code: course.code,
      course_name: course.name,
      expected_sessions: expectedSessions,
      total_counted: countedSessions.length,
      declared_misses_on_counted: missedCounted,
    });
  }, [sessions, missed, course, expectedSessions]);

  const toggleMiss = useCallback(
    (sessionId: string) => {
      const wasMissed = missed.has(sessionId);
      // Optimistic
      setMissed((prev) => {
        const n = new Set(prev);
        if (wasMissed) n.delete(sessionId);
        else n.add(sessionId);
        return n;
      });

      startTransition(async () => {
        const supabase = getSupabaseBrowser();
        try {
          if (wasMissed) {
            const { error } = await supabase
              .from("declared_misses")
              .delete()
              .eq("user_id", userId)
              .eq("session_id", sessionId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("declared_misses")
              .insert({ user_id: userId, session_id: sessionId });
            if (error) throw error;
          }
        } catch {
          // Revert on failure
          setMissed((prev) => {
            const n = new Set(prev);
            if (wasMissed) n.add(sessionId);
            else n.delete(sessionId);
            return n;
          });
        }
      });
    },
    [missed, userId],
  );

  const hasProjections = expectedSessions != null && summary.total_counted > 0;
  // Line 3 of the attendance block. Only renders when expected_sessions is set
  // AND at least one counted session has been logged. Anything else means
  // there's no meaningful "safe misses" number to show yet.
  const safeMissesLine =
    expectedSessions != null && summary.total_counted > 0
      ? safeMissesPhrase(summary.safe_misses_remaining)
      : null;
  const statusTone =
    summary.status === "critical"
      ? "border-l-danger"
      : summary.status === "warning"
        ? "border-l-warn"
        : "border-l-transparent";

  const anchor = `course-${course.code.replace(/\s+/g, "-")}`;

  return (
    <article
      id={anchor}
      className={cn(
        "card p-5 border-l-[3px] scroll-mt-24",
        statusTone,
      )}
    >
      <header>
        <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
          {course.code}
        </div>
        <h3 className="mt-0.5 text-base font-semibold text-ink leading-tight">
          {course.name}
        </h3>
      </header>

      {summary.total_counted === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No classes logged yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-[28px] font-semibold tabular-nums num-transition",
                summary.status === "critical" && "text-danger-ink",
                summary.status === "warning" && "text-warn-ink",
              )}
            >
              {Math.round(summary.percentage)}%
            </span>
            <span className="text-sm text-ink-muted">
              ({summary.attended}/{summary.total_counted} sessions)
            </span>
          </div>

          {hasProjections && summary.projected_if_miss != null && (
            <p className="text-sm text-ink-muted">
              If you miss the next class →{" "}
              <span className="text-ink font-medium tabular-nums">
                {Math.round(summary.projected_if_miss)}%
              </span>
            </p>
          )}

          {safeMissesLine && (
            <p
              className={cn(
                "text-sm font-medium text-ink",
                summary.safe_misses_remaining != null &&
                  summary.safe_misses_remaining < 0 &&
                  "text-danger-ink",
                summary.safe_misses_remaining === 0 && "text-warn-ink",
              )}
            >
              {safeMissesLine}
            </p>
          )}

          {expectedSessions == null && (
            <p className="text-xs text-ink-muted">
              Projections available once your rep sets the expected class count.
            </p>
          )}
        </div>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-black/[0.04]">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
            aria-expanded={expanded}
          >
            <ChevronDownIcon
              size={16}
              className={cn(
                "transition-transform",
                expanded ? "rotate-0" : "-rotate-90",
              )}
            />
            Session history
          </button>
          {expanded && (
            <ul className="mt-3 space-y-1">
              {sessions.map((s) => {
                const isMissed = missed.has(s.id);
                const doesntCount = !s.counts;
                return (
                  <li key={s.id}>
                    <label
                      className={cn(
                        "flex items-center gap-3 py-2 text-sm cursor-pointer",
                        doesntCount && "opacity-55",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isMissed}
                        onChange={() => toggleMiss(s.id)}
                        className="w-4 h-4 accent-accent"
                      />
                      <span className="flex-1 tabular-nums">
                        {shortDateLabel(s.date)}
                      </span>
                      <span className="text-ink-muted">
                        {isMissed ? "I missed this" : "I attended"}
                        {doesntCount && (
                          <span className="ml-1 text-2xs">
                            (does not count)
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
