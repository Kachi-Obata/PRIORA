// Profile-loading helpers for server components.
import { redirect } from "next/navigation";
import { getSupabaseServer } from "./supabase/server";
import type { Profile } from "./types";
import { isAdminRole } from "./constants";

/**
 * Resolve the signed-in profile, redirecting through auth/onboarding as needed.
 *
 * - No session → /login
 * - Session but profile row missing full_name or group → /onboarding
 * - Otherwise → returns a fully-populated Profile
 */
export async function requireOnboardedProfile(): Promise<Profile> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, \"group\", role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.full_name || !profile.group) {
    redirect("/onboarding");
  }

  return profile as Profile;
}

/**
 * Same as above but asserts the user is a rep / assistant_rep / master_admin.
 * Redirects students back to Home.
 */
export async function requireAdminProfile(): Promise<Profile> {
  const profile = await requireOnboardedProfile();
  if (!isAdminRole(profile.role)) redirect("/");
  return profile;
}
