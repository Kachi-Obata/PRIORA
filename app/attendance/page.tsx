import { requireOnboardedProfile } from "@/lib/profile";
import { loadAttendanceData } from "@/lib/data/attendance";
import AppShell from "@/components/AppShell";
import CourseAttendanceCard from "@/components/attendance/CourseAttendanceCard";

export const metadata = { title: "Attendance · Priora" };
export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const profile = await requireOnboardedProfile();
  const data = await loadAttendanceData(profile.id, profile.group!);

  return (
    <AppShell role={profile.role}>
      <header className="pt-4 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your current standing across every course.
        </p>
      </header>

      {data.length === 0 ? (
        <div className="mt-16 text-center text-ink-muted text-[15px]">
          No courses found for your group.
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((entry) => (
            <CourseAttendanceCard
              key={entry.course.code}
              course={entry.course}
              expectedSessions={entry.expected_sessions}
              sessions={entry.sessions}
              initialMissedIds={Array.from(entry.missed_session_ids)}
              userId={profile.id}
            />
          ))}
        </div>
      )}

      <footer className="mt-8 text-center text-xs text-ink-soft italic">
        These figures are estimates to help you plan. Official records may
        differ.
      </footer>
    </AppShell>
  );
}
