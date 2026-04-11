import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "Welcome · Priora" };

export default async function OnboardingPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, \"group\"")
    .eq("id", user.id)
    .maybeSingle();

  // Already onboarded? Send them home.
  if (profile?.full_name && profile?.group) redirect("/");

  return (
    <main className="min-h-[100svh] flex items-center justify-center px-6 py-10 bg-surface-sunk">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Priora
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Let's get you set up.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
