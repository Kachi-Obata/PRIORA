import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "priora-fo",
  project: "javascript-nextjs",

  // Suppress build-time output unless running in CI.
  silent: !process.env.CI,

  // Upload source maps so Sentry shows real file/line numbers in stack traces.
  // Requires SENTRY_AUTH_TOKEN in your Vercel environment variables.
  // Get it from: Sentry → Settings → Auth Tokens → Create Token (project:releases scope)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Don't expose source maps in the public build output.
  hideSourceMaps: true,

  // Tree-shake Sentry's debug logger out of the production bundle.
  disableLogger: true,
});
