// GET /auth/callback
//
// Supabase email links (password reset, email confirmation) redirect here
// with a PKCE `code` param. We exchange it for a session — this must happen
// server-side so the session cookie gets set via our cookie-aware client.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// Only allow redirecting to known internal paths after the exchange —
// never forward an arbitrary `next` value (open-redirect guard).
const ALLOWED_NEXT_PATHS = ["/reset-password"];

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const rawNext = request.nextUrl.searchParams.get("next");
  const next = ALLOWED_NEXT_PATHS.includes(rawNext ?? "") ? rawNext! : "/";

  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/reset-password?expired=1", request.url));
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
