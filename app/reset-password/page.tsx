import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { title: "Reset password · Priora" };

export default async function ResetPasswordPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-[100svh] flex items-center justify-center px-6 py-10 bg-surface-sunk">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Priora</h1>
          <p className="mt-1 text-sm text-ink-muted">Set a new password</p>
        </div>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="card p-6 space-y-4 text-center">
            <p className="text-sm text-ink-muted">
              This link has expired or is invalid. Request a new one from the
              sign-in page.
            </p>
            <Link href="/login" className="btn-primary w-full inline-flex">
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
