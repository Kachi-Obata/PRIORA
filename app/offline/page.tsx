// Shown by the service worker when the user is offline and the requested
// page hasn't been cached yet. Keep this page static — no data fetching,
// no auth — so the SW can pre-cache it on install.
//
// IMPORTANT: This page is sometimes returned by the SW as a fallback response
// for a *different* URL (e.g. the user navigated to /attendance but the SW
// served this HTML). In that case Next.js cannot hydrate the page, so any
// onClick handler will be dead. The "Try again" link is therefore a plain <a>
// so it works with zero JavaScript. The useEffect auto-redirect is a bonus for
// when hydration did succeed.
"use client";

import { useEffect } from "react";

export default function OfflinePage() {
  // If JS did hydrate, auto-redirect to home the moment connectivity returns.
  useEffect(() => {
    function handleOnline() {
      window.location.href = "/";
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center bg-surface-sunk px-6 text-center">
      <div className="space-y-3 max-w-xs">
        {/* wifi-off icon */}
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
          This page hasn&apos;t been loaded before, so there&apos;s no cached
          version to show. Once you&apos;re back online the app will reload
          automatically.
        </p>

        {/* Plain <a> — works even if React never hydrates this page. */}
        <a
          href="/"
          className="mt-2 inline-flex items-center justify-center bg-accent text-white font-medium rounded-btn px-4 py-2.5 text-sm transition-colors hover:bg-accent-ink"
        >
          Try again
        </a>
      </div>
    </div>
  );
}
