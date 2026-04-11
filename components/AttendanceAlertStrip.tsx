import Link from "next/link";
import { ChevronRightIcon } from "./Icon";
import type { AttendanceSummary } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  summaries: AttendanceSummary[];
}

/**
 * Shown only when there's something worth alerting about. If every course is
 * healthy (or has no projections yet), this component renders nothing at all —
 * absence of the strip is the good news.
 */
export default function AttendanceAlertStrip({ summaries }: Props) {
  const atRisk = summaries.filter(
    (s) => s.status === "warning" || s.status === "critical",
  );
  if (atRisk.length === 0) return null;

  return (
    <section
      className="mt-3 mb-4 rounded-card overflow-hidden border border-black/[0.06]"
      aria-label="Attendance alerts"
    >
      {atRisk.map((s, i) => {
        const critical = s.status === "critical";
        return (
          <Link
            key={s.course_code}
            href={`/attendance#course-${s.course_code.replace(/\s+/g, "-")}`}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3 text-sm",
              critical
                ? "bg-danger-soft text-danger-ink"
                : "bg-warn-soft text-warn-ink",
              i > 0 && "border-t border-black/[0.04]",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-semibold shrink-0">{s.course_code}</span>
              <span className="text-ink-muted truncate">
                {Math.round(s.percentage)}% ·{" "}
                {s.safe_misses_remaining == null
                  ? "at risk"
                  : s.safe_misses_remaining < 0
                    ? "below threshold"
                    : s.safe_misses_remaining === 0
                      ? "no misses left"
                      : `${s.safe_misses_remaining} miss${s.safe_misses_remaining === 1 ? "" : "es"} left`}
              </span>
            </div>
            <ChevronRightIcon size={16} className="shrink-0 opacity-60" />
          </Link>
        );
      })}
    </section>
  );
}
