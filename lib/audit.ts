// Server-side audit logging.
//
// Call logAudit() from any API route after an action succeeds or fails.
// Always fire-and-await, but errors are swallowed so a logging failure
// never breaks the actual request.
//
// Client-side deletes are captured automatically via Postgres triggers
// in 0004_audit_log.sql — no need to call logAudit() from the client.

import { getSupabaseServiceRole } from "./supabase/server";

export interface AuditPayload {
  /** Supabase auth user ID of the person who triggered the action. */
  actorId: string | null;
  /**
   * Dot-namespaced action name.
   * Convention: "<resource>.<verb>"
   * Examples: "task.create", "session.create", "push.subscribe"
   */
  action: string;
  /** Primary key of the affected row, cast to string. */
  resourceId?: string | null;
  /** Arbitrary structured context — course_code, group, title, etc. */
  meta?: Record<string, unknown>;
  /** false when the action was attempted but failed. Default true. */
  ok?: boolean;
  /** Human-readable error detail when ok = false. */
  errorMsg?: string;
  /** Best-effort client IP from x-forwarded-for. */
  ip?: string | null;
}

/**
 * Write one row to audit_log via the service role.
 * Never throws — audit failures must not block the main response.
 */
export async function logAudit({
  actorId,
  action,
  resourceId,
  meta,
  ok = true,
  errorMsg,
  ip,
}: AuditPayload): Promise<void> {
  try {
    const service = getSupabaseServiceRole();
    await service.from("audit_log").insert({
      actor_id: actorId ?? null,
      action,
      resource_id: resourceId ?? null,
      meta: meta ?? null,
      ok,
      error_msg: errorMsg ?? null,
      ip: ip ?? null,
    });
  } catch {
    // Intentionally swallowed. Log to stderr so Vercel function logs catch it.
    console.error("[audit] Failed to write audit row for action:", action);
  }
}

/** Extract the best-guess client IP from Next.js request headers. */
export function getClientIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}
