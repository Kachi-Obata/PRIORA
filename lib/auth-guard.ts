// Server-side auth hardening: input validation, generic error messages, and
// DB-backed rate limiting / lockout for login and signup.
//
// Login and signup are routed through our own API routes (app/api/auth/*)
// specifically so this file gets a chance to run before Supabase Auth is
// ever called — none of this is possible if the browser talks to Supabase
// directly.

import { getSupabaseServiceRole } from "./supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

export function isValidPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 6 && password.length <= 128;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Fixed, controlled messages — never forward raw provider error text to the
// client. One message for every login failure so it never reveals which part
// (email vs password) was wrong, or whether the account exists at all.
export const GENERIC_LOGIN_ERROR = "Incorrect email or password.";
export const GENERIC_LOCKOUT_ERROR = "Too many attempts. Please wait a few minutes and try again.";
export const GENERIC_SIGNUP_MESSAGE = "Check your email to confirm your account, or sign in if you already have one.";
export const GENERIC_RESET_REQUEST_MESSAGE = "If an account exists for that email, we've sent a password reset link.";
export const GENERIC_RESET_RATE_LIMIT_ERROR = "Too many reset requests. Please wait a while and try again.";
export const GENERIC_RESET_LINK_EXPIRED_ERROR = "This link has expired or is invalid. Please request a new one.";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IDENTIFIER = 5;
const MAX_FAILURES_PER_IP = 20;
const MAX_SIGNUPS_PER_IP_PER_HOUR = 5;
const MAX_RESET_REQUESTS_PER_EMAIL_PER_HOUR = 3;
const MAX_RESET_REQUESTS_PER_IP_PER_HOUR = 10;

/**
 * Sliding-window lockout check for login. Self-resetting — once the oldest
 * failure ages out of the window, access returns automatically. Never a
 * permanent lock.
 */
export async function checkLoginLockout(
  identifier: string,
  ip: string | null,
): Promise<{ locked: boolean }> {
  const service = getSupabaseServiceRole();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count: byIdentifier } = await service
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("action", "login")
    .eq("identifier", identifier)
    .eq("success", false)
    .gte("ts", since);

  if ((byIdentifier ?? 0) >= MAX_FAILURES_PER_IDENTIFIER) return { locked: true };

  if (ip) {
    const { count: byIp } = await service
      .from("auth_attempts")
      .select("id", { count: "exact", head: true })
      .eq("action", "login")
      .eq("ip", ip)
      .eq("success", false)
      .gte("ts", since);

    if ((byIp ?? 0) >= MAX_FAILURES_PER_IP) return { locked: true };
  }

  return { locked: false };
}

/** IP-based throttle for signups — slows mass fake-account creation. */
export async function isSignupRateLimited(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const service = getSupabaseServiceRole();
  const since = new Date(Date.now() - 60 * 60_000).toISOString();

  const { count } = await service
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("action", "signup")
    .eq("ip", ip)
    .gte("ts", since);

  return (count ?? 0) >= MAX_SIGNUPS_PER_IP_PER_HOUR;
}

/** IP + email throttle for password reset requests — prevents email-bombing a victim. */
export async function isPasswordResetRateLimited(
  identifier: string,
  ip: string | null,
): Promise<boolean> {
  const service = getSupabaseServiceRole();
  const since = new Date(Date.now() - 60 * 60_000).toISOString();

  const { count: byIdentifier } = await service
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("action", "password_reset")
    .eq("identifier", identifier)
    .gte("ts", since);

  if ((byIdentifier ?? 0) >= MAX_RESET_REQUESTS_PER_EMAIL_PER_HOUR) return true;

  if (ip) {
    const { count: byIp } = await service
      .from("auth_attempts")
      .select("id", { count: "exact", head: true })
      .eq("action", "password_reset")
      .eq("ip", ip)
      .gte("ts", since);

    if ((byIp ?? 0) >= MAX_RESET_REQUESTS_PER_IP_PER_HOUR) return true;
  }

  return false;
}

/** Record one login, signup, or password reset attempt — never throws. */
export async function recordAuthAttempt(params: {
  action: "login" | "signup" | "password_reset";
  identifier: string;
  ip: string | null;
  success: boolean;
}): Promise<void> {
  try {
    const service = getSupabaseServiceRole();
    await service.from("auth_attempts").insert({
      action: params.action,
      identifier: params.identifier,
      ip: params.ip,
      success: params.success,
    });
  } catch {
    console.error("[auth-guard] Failed to record auth attempt for action:", params.action);
  }
}
