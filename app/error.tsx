"use client";

// Global error boundary for the (root) layout segment.
//
// Behaviour:
//  • Offline: shows a friendly message; auto-navigates home when reconnected.
//  • Chunk-load error ("Loading chunk N failed"): Webpack internally caches
//    the failed URL so reset() is a no-op. Hard-navigate to "/" instead.
//  • Any other error: retry with reset(); falls back to hard-nav if that fails.

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Webpack caches failed chunk fetches — reset() won't retry them. */
function isChunkLoadError(err: Error) {
  return (
    err.name === "ChunkLoadError" ||
    err.message?.includes("Loading chunk") ||
    err.message?.includes("Failed to fetch dynamically imported module")
  );
}

function hardNav() {
  window.location.href = "/";
}

export default function GlobalError({ error, reset }: Props) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const chunkError = isChunkLoadError(error);

  // Decide what "recovery" means for this error type.
  const recover = offline || chunkError ? hardNav : reset;

  useEffect(() => {
    // Auto-recover the moment connectivity returns.
    window.addEventListener("online", recover);
    return () => window.removeEventListener("online", recover);
  }, [recover]);

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center bg-surface-sunk px-6 text-center">
      <div className="space-y-3 max-w-xs">
        {offline ? (
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
              So uhhh... This page actually hasn&apos;t been cached yet. Just come back once you&apos;re
              connected — it&apos;ll reload automatically lol.
            </p>

            <button
              type="button"
              onClick={hardNav}
              className="mt-2 inline-flex items-center justify-center bg-accent text-white font-medium rounded-btn px-4 py-2.5 text-sm transition-colors hover:bg-accent-ink"
            >
              Go to home
            </button>
          </>
        ) : (
          /* ── Error state (online) ── */
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
              {chunkError
                ? "A page resource failed to load. Tap below to go back to the app."
                : (error.message || "An unexpected error occurred. Please try again.")}
            </p>

            <button
              type="button"
              onClick={recover}
              className="mt-2 inline-flex items-center justify-center bg-accent text-white font-medium rounded-btn px-4 py-2.5 text-sm transition-colors hover:bg-accent-ink"
            >
              {chunkError ? "Go to home" : "Try again"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
