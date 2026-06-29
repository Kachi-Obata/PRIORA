// POST /api/auth/login
//
// Server-side login proxy. Routing auth through our own API — instead of
// the browser calling Supabase directly — is what lets us enforce rate
// limiting, account lockout, and one fixed generic error message. None of
// that is possible when the client talks straight to Supabase.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getClientIp, logAudit } from "@/lib/audit";
import { checkBodySize } from "@/lib/api-guard";
import {
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  checkLoginLockout,
  recordAuthAttempt,
  GENERIC_LOGIN_ERROR,
  GENERIC_LOCKOUT_ERROR,
} from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const sizeError = checkBodySize(request.headers);
  if (sizeError) return sizeError;

  const ip = getClientIp(request.headers);
  const body = await request.json().catch(() => null);

  // Malformed input gets the exact same message as wrong credentials —
  // never give an attacker a way to distinguish "bad format" from "wrong password".
  if (!body || !isValidEmail(body.email) || !isValidPassword(body.password)) {
    return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 400 });
  }

  const email = normalizeEmail(body.email);

  const { locked } = await checkLoginLockout(email, ip);
  if (locked) {
    await logAudit({
      actorId: null, action: "auth.login", ok: false,
      errorMsg: "locked_out", meta: { email }, ip,
    });
    return NextResponse.json({ error: GENERIC_LOCKOUT_ERROR }, { status: 429 });
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: body.password,
  });

  await recordAuthAttempt({ action: "login", identifier: email, ip, success: !error });

  if (error || !data.user) {
    await logAudit({
      actorId: null, action: "auth.login", ok: false,
      errorMsg: "invalid_credentials", meta: { email }, ip,
    });
    return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
  }

  await logAudit({ actorId: data.user.id, action: "auth.login", meta: { email }, ip });

  return NextResponse.json({ ok: true });
}
