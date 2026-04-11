import { requireOnboardedProfile } from "@/lib/profile";
import { getSupabaseServer } from "@/lib/supabase/server";
import { loadAttendanceSummaries, loadHomeTasks } from "@/lib/data/home";
import AppShell from "@/components/AppShell";
import AttendanceAlertStrip from "@/components/AttendanceAlertStrip";
import TaskFeed from "@/components/TaskFeed";
import GroupBadge from "@/components/GroupBadge";
import { roleLabel, type Role, type Group } from "@/lib/constants";

export const metadata = { title: "Priora" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await requireOnboardedProfile();
  const supabase = await getSupabaseServer();

  const [tasks, summaries] = await Promise.all([
    loadHomeTasks(profile.id, profile.group!),
    loadAttendanceSummaries(profile.id, profile.group!),
  ]);

  // Attribution: look up profiles for the task creators so we can render
  // "Posted by Group A Rep" in the detail sheet.
  const creatorIds = Array.from(new Set(tasks.map((t) => t.created_by)));
  const attribution: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("profiles")
      .select("id, role, \"group\"")
      .in("id", creatorIds);
    const creatorMap = new Map<string, { role: Role; group: Group | null }>();
    for (const c of creators ?? [])
      creatorMap.set(c.id, { role: c.role as Role, group: c.group as Group | null });
    for (const t of tasks) {
      const c = creatorMap.get(t.created_by);
      if (c) attribution[t.id] = roleLabel(c.role, c.group);
    }
  }

  return (
    <AppShell role={profile.role}>
      <header className="flex items-center justify-between pt-4 pb-1">
        <h1 className="text-xl font-semibold tracking-tight md:hidden">Priora</h1>
        <div className="md:ml-auto">
          <GroupBadge group={profile.group!} />
        </div>
      </header>

      <AttendanceAlertStrip summaries={summaries} />

      <TaskFeed
        initialTasks={tasks}
        attribution={attribution}
        userId={profile.id}
        userGroup={profile.group!}
      />
    </AppShell>
  );
}
