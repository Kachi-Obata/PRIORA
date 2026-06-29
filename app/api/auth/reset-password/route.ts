// POST /api/auth/reset-password
//
// Sets a new password. Requires an active recovery session — established by
// /auth/callback after the user clicks the link in their email. There is no
// "old password" check here by design: the email link itself is the proof
// of ownership for a forgotten-password flow.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getClientIp, logAudit } from "@/lib/audit";
import { checkBodySize } from "@/lib/api-guard";
import { isValidPassword, GENERIC_RESET_LINK_EXPIRED_ERROR } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const sizeError = checkBodySize(request.headers);
  if (sizeError) return sizeError;

  const ip = getClientIp(request.headers);
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: GENERIC_RESET_LINK_EXPIRED_ERROR }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !isValidPassword(body.password)) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password: body.password });

  if (error) {
    await logAudit({
      actorId: user.id, action: "auth.password_reset", ok: false,
      errorMsg: error.message, ip,
    });
    return NextResponse.json({ error: "Couldn't set your new password. Please try again." }, { status: 400 });
  }

  await logAudit({ actorId: user.id, action: "auth.password_reset", ip });

  return NextResponse.json({ ok: true });
}
