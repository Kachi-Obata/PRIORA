// POST /api/attendance/sessions
//
// Log a class session. Server-side so we can (a) enforce role checks beyond
// RLS, and (b) fan out attendance-at-risk notifications to any student whose
// attendance now sits in the warning band for this course.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";
import {
  computeAttendance,
  classifyStatus,
} from "@/lib/attendance";
import { isAdminRole, type Group, type Role } from "@/lib/constants";
import { logAudit, getClientIp } from "@/lib/audit";
import { checkBodySize, validateInputs, safeDbError } from "@/lib/api-guard";

export async function POST(request: NextRequest) {
  const sizeError = checkBodySize(request.headers);
  if (sizeError) return sizeError;

  const ip = getClientIp(request.headers);
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

  const { course_code, group, date, counts } = body;
  if (!course_code || !group || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const lengthError = validateInputs({ course_code, group });
  if (lengthError) return lengthError;

  // Duplicate guard — the DB has a unique index on (course_code, group, date)
  // but we check first so the error message is human-readable.
  const { data: existing } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("course_code", course_code)
    .eq("group", group)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    await logAudit({
      actorId: user.id, action: "session.create", ok: false,
      errorMsg: "duplicate",
      meta: { course_code, group, date, counts },
      ip,
    });
    return NextResponse.json(
      { error: "This session has already been logged for that course, group, and date." },
      { status: 409 },
    );
  }

  const { data: inserted, error } = await supabase
    .from("attendance_sessions")
    .insert({
      course_code,
      group,
      date,
      counts: counts ?? true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    await logAudit({
      actorId: user.id, action: "session.create", ok: false,
      errorMsg: error.message,
      meta: { course_code, group, date, counts, error_code: error.code },
      ip,
    });
    // Catch the race condition where two admins submit at the exact same time
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This session has already been logged for that course, group, and date." },
        { status: 409 },
      );
    }
    return safeDbError(error.code);
  }

  await logAudit({
    actorId: user.id, action: "session.create",
    resourceId: inserted.id,
    meta: { course_code, group, date, counts: inserted.counts },
    ip,
  });

  // Fan out at-risk notifications. Only counted sessions can push someone
  // over a threshold.
  if (inserted.counts) {
    try {
      await notifyAtRisk(course_code, group as Group);
    } catch {
      // Best effort
    }
  }

  return NextResponse.json({ session: inserted });
}

/**
 * For each student in the given group, recompute their attendance for this
 * course. If they crossed into the warning or critical band, send a push.
 */
async function notifyAtRisk(courseCode: string, group: Group) {
  const service = getSupabaseServiceRole();

  const [{ data: course }, { data: settings }] = await Promise.all([
    service.from("courses").select("code, name").eq("code", courseCode).maybeSingle(),
    service
      .from("course_group_settings")
      .select("expected_sessions")
      .eq("course_code", courseCode)
      .eq("group", group)
      .maybeSingle(),
  ]);
  if (!course) return;

  const { data: sessions } = await service
    .from("attendance_sessions")
    .select("id, counts")
    .eq("course_code", courseCode)
    .eq("group", group);
  const sessionList = sessions ?? [];
  const countedIds = new Set(sessionList.filter((s: any) => s.counts).map((s: any) => s.id));
  const totalCounted = countedIds.size;
  if (totalCounted === 0) return;

  const { data: students } = await service
    .from("profiles")
    .select("id")
    .eq("group", group)
    .not("full_name", "is", null);
  const studentIds = (students ?? []).map((s: any) => s.id);
  if (studentIds.length === 0) return;

  const { data: misses } = await service
    .from("declared_misses")
    .select("user_id, session_id")
    .in("user_id", studentIds)
    .in("session_id", sessionList.map((s: any) => s.id));

  const missedByUser = new Map<string, number>();
  for (const m of misses ?? []) {
    if (!countedIds.has(m.session_id)) continue;
    missedByUser.set(m.user_id, (missedByUser.get(m.user_id) ?? 0) + 1);
  }

  const toNotify: string[] = [];
  let summaryForMessage: ReturnType<typeof computeAttendance> | null = null;
  for (const uid of studentIds) {
    const missed = missedByUser.get(uid) ?? 0;
    const summary = computeAttendance({
      course_code: courseCode,
      course_name: course.name,
      expected_sessions: settings?.expected_sessions ?? null,
      total_counted: totalCounted,
      declared_misses_on_counted: missed,
    });
    if (summary.status === "warning" || summary.status === "critical") {
      toNotify.push(uid);
      // Use one representative summary for the message (they vary per user
      // by exact count, but for the generic "your attendance is at risk"
      // tone we don't need per-user strings).
      summaryForMessage ??= summary;
    }
  }
  if (toNotify.length === 0) return;

  // Send one notification per user — the dispatcher handles the fan out.
  // The body is a generic-enough string; the Attendance screen is one tap
  // away to see the exact number.
  await sendPushToUsers(toNotify, {
    title: `${courseCode} attendance at risk`,
    body: `You're near the attendance threshold. Check Priora.`,
    url: "/attendance",
    tag: `attendance-${courseCode}-${group}`,
  });
}
