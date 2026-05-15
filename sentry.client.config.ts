// Sentry client-side (browser) initialisation.
// Runs in the user's browser — captures JS errors, chunk load failures,
// unhandled promise rejections, and records session replays on error.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://703c3d2a6362162d77ae5ad6636a44f1@o4511393473757184.ingest.de.sentry.io/4511393493614672",

  // Session Replay: record what the user did before an error occurred.
  // 100% of error sessions are replayed; 5% of all sessions are sampled.
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,   // mask text for privacy
      blockAllMedia: true, // block images/video in replays
    }),
  ],

  // Capture 10% of page loads as performance traces.
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Only send events in production — keeps dev noise out of Sentry.
  enabled: process.env.NODE_ENV === "production",
});
