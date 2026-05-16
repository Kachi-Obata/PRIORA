// Shared API route hardening helpers.
//
// checkBodySize   — rejects payloads over the limit before parsing JSON
// validateInputs  — enforces max lengths on user-supplied strings
// safeDbError     — never leak raw Postgres/Supabase internals to the client

import { NextResponse } from "next/server";

// 16 KB is more than enough for any form in this app.
// Anything larger is either a bug or an intentional DoS probe.
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Returns a 413 response if Content-Length exceeds the limit.
 * Returns null when the request is acceptable.
 */
export function checkBodySize(headers: Headers): NextResponse | null {
  const raw = headers.get("content-length");
  if (raw) {
    const bytes = parseInt(raw, 10);
    if (!isNaN(bytes) && bytes > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }
  }
  return null;
}

// Maximum character lengths for every user-supplied field.
export const MAX_LENGTHS = {
  course_code:  20,
  title:       200,
  description: 2000,
  full_name:   100,
  group:         1,
} as const;

type FieldName = keyof typeof MAX_LENGTHS;

/**
 * Validates string length for the given fields.
 * Returns a 422 response on the first violation, or null when all pass.
 */
export function validateInputs(
  fields: Partial<Record<FieldName, unknown>>,
): NextResponse | null {
  for (const [field, value] of Object.entries(fields) as [FieldName, unknown][]) {
    if (typeof value === "string" && value.length > MAX_LENGTHS[field]) {
      return NextResponse.json(
        { error: `${field} exceeds maximum length of ${MAX_LENGTHS[field]} characters.` },
        { status: 422 },
      );
    }
  }
  return null;
}

/**
 * Converts a raw Supabase/Postgres error into a safe client-facing message.
 * The real error is logged server-side (audit_log + Sentry) — never expose
 * table names, constraint names, or column details to the browser.
 */
export function safeDbError(code?: string): NextResponse {
  // Duplicate key — these are safe to surface; we handle them explicitly above
  // so this branch is a last-resort race condition catch.
  if (code === "23505") {
    return NextResponse.json({ error: "This record already exists." }, { status: 409 });
  }
  // Foreign key, check constraint, etc.
  if (code?.startsWith("23")) {
    return NextResponse.json({ error: "Invalid data submitted." }, { status: 422 });
  }
  return NextResponse.json(
    { error: "Something went wrong on our end. Please try again." },
    { status: 500 },
  );
}

// Maximum push subscriptions a single user may hold.
// A user rarely needs more than 3 (phone, laptop, tablet).
export const MAX_PUSH_SUBS_PER_USER = 10;
