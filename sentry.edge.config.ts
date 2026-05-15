// Sentry Edge Runtime initialisation.
// Covers middleware and any edge API routes.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://703c3d2a6362162d77ae5ad6636a44f1@o4511393473757184.ingest.de.sentry.io/4511393493614672",

  tracesSampleRate: 0.1,

  enabled: process.env.NODE_ENV === "production",
});
