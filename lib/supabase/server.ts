// Server-side Supabase client — respects the user's auth cookies.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — Next won't let us mutate cookies
            // here. That's fine; middleware handles session refresh.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS. Only use in trusted server contexts
 * (cron jobs, notification dispatch). Never expose to the browser.
 */
export function getSupabaseServiceRole() {
  // Lazy import so this never ships to the client
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
