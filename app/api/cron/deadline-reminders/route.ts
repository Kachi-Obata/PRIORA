// GET /api/cron/deadline-reminders
//
// Vercel Cron hits this daily (configured in vercel.json). It finds every
// task due tomorrow, then for each affected user that has NOT marked the
// task complete, sends a push notification.
//
// Protected by CRON_SECRET via bearer token — Vercel passes this automatically
// when configured through vercel.json.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";
import { formatDate, relativeDueLabel } from "@/lib/dates";
import type { Group } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceRole();

  // "Tomorrow" in server time. The server is UTC on Vercel; the app is a
  // single-campus single-timezone deployment, so this is close enough.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = formatDate(tomorrow);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, course_code, title, type, due_date, groups")
    .eq("due_date", tomorrowIso);

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ tasks: 0, sent: 0 });
  }

  let totalSent = 0;

  for (const task of tasks) {
    // Everyone in the task's groups who has NOT completed it.
    const { data: groupStudents } = await supabase
      .from("profiles")
      .select("id")
      .in("group", task.groups as Group[])
      .not("full_name", "is", null);

    const candidateIds = (groupStudents ?? []).map((s: any) => s.id);
    if (candidateIds.length === 0) continue;

    const { data: completions } = await supabase
      .from("task_completions")
      .select("user_id")
      .eq("task_id", task.id)
      .in("user_id", candidateIds);

    const completedSet = new Set((completions ?? []).map((c: any) => c.user_id));
    const toNotify = candidateIds.filter((id) => !completedSet.has(id));
    if (toNotify.length === 0) continue;

    const result = await sendPushToUsers(toNotify, {
      title: `${task.course_code} ${task.type} due tomorrow`,
      body: task.title,
      url: "/",
      tag: `reminder-${task.id}`,
    });
    totalSent += result.sent;
  }

  return NextResponse.json({ tasks: tasks.length, sent: totalSent });
}
