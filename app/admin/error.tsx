"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: Props) {
  const isOffline =
    typeof navigator !== "undefined" && !navigator.onLine;

  useEffect(() => {
    function handleOnline() {
      reset();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [reset]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <p className="text-sm font-medium text-ink-muted">
        {isOffline
          ? "You're offline — this page hasn't been cached yet."
          : (error.message || "Failed to load admin data.")}
      </p>
      {!isOffline && (
        <button
          type="button"
          onClick={reset}
          className="mt-4 text-sm text-accent underline underline-offset-2"
        >
          Try again
        </button>
      )}
      {isOffline && (
        <p className="mt-2 text-xs text-ink-soft">
          Reconnect and this page will reload automatically.
        </p>
      )}
    </div>
  );
}
