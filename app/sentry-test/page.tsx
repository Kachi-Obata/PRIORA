// TEMPORARY — delete this file after confirming Sentry is working.
"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryTestPage() {
  const [sent, setSent] = useState(false);

  function sendTestError() {
    Sentry.captureException(new Error("Priora Sentry test — delete /app/sentry-test after verifying"));
    setSent(true);
  }

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center bg-surface-sunk px-6 text-center gap-4">
      <h1 className="text-lg font-semibold text-ink">Sentry test</h1>
      <button
        type="button"
        onClick={sendTestError}
        disabled={sent}
        className="inline-flex items-center justify-center bg-accent text-white font-medium rounded-btn px-4 py-2.5 text-sm transition-colors hover:bg-accent-ink disabled:opacity-50"
      >
        {sent ? "Event sent ✓" : "Send test error to Sentry"}
      </button>
      {sent && (
        <p className="text-sm text-ink-muted">
          Check Sentry → Issues for &quot;Priora Sentry test&quot;
        </p>
      )}
    </div>
  );
}
