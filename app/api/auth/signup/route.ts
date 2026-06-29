// POST /api/auth/signup
//
// Server-side signup proxy. Validates input, rate-limits by IP, and always
// returns the identical response whether or not the email is already
// registered — Supabase's signUp() reveals "User already registered" by
// default, which leaks account existence. We normalize that here.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getClientIp, logAudit } from "@/lib/audit";
import { checkBodySize } from "@/lib/api-guard";
import {
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  isSignupRateLimited,
  recordAuthAttempt,
  GENERIC_SIGNUP_MESSAGE,
} from "@/lib/auth-guard";

const ALREADY_REGISTERED_MARKERS = ["already registered", "already exists", "user_already_exists"];

export async function POST(request: NextRequest) {
  const sizeError = checkBodySize(request.headers);
  if (sizeError) return sizeError;

  const ip = getClientIp(request.headers);
  const body = await request.json().catch(() => null);

  if (!body || !isValidEmail(body.email) || !isValidPassword(body.password)) {
    return NextResponse.json(
      { error: "Enter a valid email and a password of at least 6 characters." },
      { status: 400 },
    );
  }

  const email = normalizeEmail(body.email);

  if (await isSignupRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many signups from this network. Please try again later." },
      { status: 429 },
    );
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signUp({ email, password: body.password });

  await recordAuthAttempt({ action: "signup", identifier: email, ip, success: !error });

  if (error) {
    const isDuplicate = ALREADY_REGISTERED_MARKERS.some((marker) =>
      error.message.toLowerCase().includes(marker),
    );

    if (isDuplicate) {
      // Respond exactly as if signup succeeded — never reveal the account
      // already exists. Logged server-side only, never surfaced to the client.
      await logAudit({
        actorId: null, action: "auth.signup_blocked", ok: false,
        errorMsg: "duplicate_email", meta: { email }, ip,
      });
      return NextResponse.json({ ok: true, message: GENERIC_SIGNUP_MESSAGE });
    }

    // Any other failure — Supabase's own rate limit, rejected password, etc.
    // Safe to surface generically without leaking provider internals.
    await logAudit({
      actorId: null, action: "auth.signup_blocked", ok: false,
      errorMsg: error.message, meta: { email }, ip,
    });
    return NextResponse.json(
      { error: "Couldn't create your account. Please try again." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: GENERIC_SIGNUP_MESSAGE });
}
