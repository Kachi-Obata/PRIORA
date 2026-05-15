// Next.js instrumentation hook — loads the correct Sentry config depending
// on which runtime the current server function is executing in.
// This file must live in the project root (not inside /app).

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
