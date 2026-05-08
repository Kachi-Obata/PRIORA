"use client";

// Global error boundary for the (root) layout segment.
// Shown when a route segment throws — most commonly when the app is offline
// and an RSC fetch returns a non-OK response.
//
// Behaviour:
//  • If the browser is offline: shows a friendly offline message.
//  • Otherwise: shows a generic error with a retry button.
//  • Listens for the `online` event and auto-calls `reset()` so the app
//    recovers the moment connectivity is restored — no manual swipe-to-close needed.

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  const isOffline =
    typeof navigator !== "undefined" && !navigator.onLine;

  // Auto-recover as soon as the device is back online.
  useEffect(() => {
    function handleOnline() {
      reset();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [reset]);

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center bg-surface-sunk px-6 text-center">
      <div className="space-y-3 max-w-xs">
        {isOffline ? (
          /* ── Offline state ── */
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 text-ink-soft mx-auto"
              aria-hidden="true"
            >
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M8.5 16.5a5 5 0 0 1 7 0" />
              <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
              <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
              <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
              <path d="M5 12.75a10 10 0 0 1 5.17-2.39" />
              <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth={2} />
            </svg>

            <h1 className="text-lg font-semibold text-ink">You&apos;re offline</h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              This page hasn&apos;t been cached yet. Come back once you&apos;re
              connected — it&apos;ll reload automatically.
            </p>

            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="mt-2 inline-flex items-center justify-center bg-accent text-white font-medium rounded-btn px-4 py-2.5 text-sm transition-colors hover:bg-accent-ink"
            >
              Go to home
            </button>
          </>
        ) : (
          /* ── Generic error state ── */
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 text-ink-soft mx-auto"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2} />
            </svg>

            <h1 className="text-lg font-semibold text-ink">
              Something went wrong
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              {error.message || "An unexpected error occurred. Please try again."}
            </p>

            <button
              type="button"
              onClick={reset}
              className="mt-2 inline-flex items-center justify-center bg-accent text-white font-medium rounded-btn px-4 py-2.5 text-sm transition-colors hover:bg-accent-ink"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
