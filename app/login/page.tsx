import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Priora" };

export default async function LoginPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="min-h-[100svh] flex items-center justify-center px-6 py-10 bg-surface-sunk">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Priora</h1>
          <p className="mt-1 text-sm text-ink-muted">
            See what matters. Act on it.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
