// POST /api/tasks
//
// Server-side task creation path. The client could insert into `tasks`
// directly (RLS allows it), but routing through this handler lets us fan out
// push notifications server-side immediately on create.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";
import { isAdminRole, TASK_TYPE_LABEL, type Group, type Role } from "@/lib/constants";
import { relativeDueLabel } from "@/lib/dates";

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, \"group\"")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !isAdminRole(profile.role as Role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { course_code, title, description, type, due_date, weight, groups } = body;

  if (!course_code || !title || !type || !due_date || !Array.isArray(groups) || groups.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Duplicate guard — same course + title (case-insensitive) + due date +
  // overlapping groups means someone already posted this.
  const { data: duplicates } = await supabase
    .from("tasks")
    .select("id, groups")
    .eq("course_code", course_code)
    .ilike("title", title.trim())
    .eq("due_date", due_date);

  if (duplicates && duplicates.length > 0) {
    const overlaps = duplicates.some((d: any) =>
      (d.groups as string[]).some((g: string) => (groups as string[]).includes(g)),
    );
    if (overlaps) {
      return NextResponse.json(
        { error: "A task with this title already exists for this course and due date." },
        { status: 409 },
      );
    }
  }

  const { data: inserted, error } = await supabase
    .from("tasks")
    .insert({
      course_code,
      title,
      description: description ?? null,
      type,
      due_date,
      weight: weight ?? null,
      groups,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fan out push notifications to every student in the affected groups.
  // Use service role so we can read profiles across the whole table.
  try {
    const service = getSupabaseServiceRole();
    const { data: recipients } = await service
      .from("profiles")
      .select("id")
      .in("group", groups as Group[])
      .not("full_name", "is", null);

    const recipientIds = (recipients ?? []).map((r: any) => r.id);
    await sendPushToUsers(recipientIds, {
      title: `New ${type} in ${course_code}`,
      body: `${title} — due ${relativeDueLabel(due_date)}`,
      url: "/",
      tag: `task-${inserted.id}`,
    });
  } catch {
    // Notifications are best-effort; never fail the request because of them.
  }

  return NextResponse.json({ task: inserted });
}
