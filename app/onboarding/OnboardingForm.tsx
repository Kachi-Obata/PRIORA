"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { GROUPS, type Group } from "@/lib/constants";
import { cn } from "@/lib/cn";

export default function OnboardingForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmed = fullName.trim();
    if (!trimmed) {
      setError("Please enter your name.");
      return;
    }
    if (!group) {
      setError("Please choose your group.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: trimmed, group })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-6">
      <div>
        <label className="label" htmlFor="full_name">
          Your name
        </label>
        <input
          id="full_name"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input-field"
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <span className="label">Your group</span>
        <div className="grid grid-cols-2 gap-3">
          {GROUPS.map((g) => {
            const selected = group === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={cn(
                  "min-h-[64px] rounded-card border-2 font-semibold text-lg transition-all",
                  selected
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-ink-faint bg-surface text-ink hover:border-ink-soft",
                )}
                aria-pressed={selected}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger-ink" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Setting up…" : "Continue"}
      </button>
    </form>
  );
}
