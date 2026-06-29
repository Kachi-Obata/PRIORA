// POST /api/auth/request-password-reset
//
// Sends a recovery email via Supabase. Always returns the same response
// regardless of whether the email is registered — enumeration-safe, same
// pattern as /api/auth/signup.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getClientIp, logAudit } from "@/lib/audit";
import { checkBodySize } from "@/lib/api-guard";
import {
  isValidEmail,
  normalizeEmail,
  isPasswordResetRateLimited,
  recordAuthAttempt,
  GENERIC_RESET_REQUEST_MESSAGE,
  GENERIC_RESET_RATE_LIMIT_ERROR,
} from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const sizeError = checkBodySize(request.headers);
  if (sizeError) return sizeError;

  const ip = getClientIp(request.headers);
  const body = await request.json().catch(() => null);

  if (!body || !isValidEmail(body.email)) {
    // Same generic message even for a malformed email — don't help an
    // attacker distinguish "bad format" from "not registered".
    return NextResponse.json({ ok: true, message: GENERIC_RESET_REQUEST_MESSAGE });
  }

  const email = normalizeEmail(body.email);

  if (await isPasswordResetRateLimited(email, ip)) {
    return NextResponse.json({ error: GENERIC_RESET_RATE_LIMIT_ERROR }, { status: 429 });
  }

  const supabase = await getSupabaseServer();
  const redirectTo = new URL("/auth/callback?next=/reset-password", request.nextUrl.origin).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  await recordAuthAttempt({ action: "password_reset", identifier: email, ip, success: !error });
  await logAudit({
    actorId: null, action: "auth.password_reset_request", ok: !error,
    errorMsg: error?.message, meta: { email }, ip,
  });

  // Always the same response — Supabase itself doesn't reveal whether the
  // email exists either, and neither do we.
  return NextResponse.json({ ok: true, message: GENERIC_RESET_REQUEST_MESSAGE });
}
