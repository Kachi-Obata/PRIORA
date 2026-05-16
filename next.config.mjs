import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // CSP connect-src: allow Supabase (https + wss) and Sentry's EU ingest.
    const supabaseHost = "https://cbwgymtndindoemtpogb.supabase.co";
    const supabaseWs  = "wss://cbwgymtndindoemtpogb.supabase.co";
    const sentryIngest = "https://o4511393473757184.ingest.de.sentry.io";

    const csp = [
      "default-src 'self'",
      // Next.js requires unsafe-inline + unsafe-eval for its runtime.
      // frame-ancestors + form-action still provide meaningful XSS mitigation.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src 'self' ${supabaseHost} ${supabaseWs} ${sentryIngest}`,
      // Service worker scope
      "worker-src 'self'",
      // Prevent this app being embedded anywhere — primary clickjacking defence.
      "frame-ancestors 'none'",
      // Only allow forms to submit to same origin.
      "form-action 'self'",
      // Prevent <base> tag injection.
      "base-uri 'self'",
    ].join("; ");

    const securityHeaders = [
      // Clickjacking — belt-and-braces alongside frame-ancestors in CSP.
      { key: "X-Frame-Options",           value: "DENY" },
      // Stop browsers guessing content types.
      { key: "X-Content-Type-Options",    value: "nosniff" },
      // Don't leak the full URL to third-party sites via Referer.
      { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
      // Enforce HTTPS for 2 years.
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      // Disable unnecessary browser features.
      { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Content-Security-Policy",   value: csp },
    ];

    return [
      // Apply security headers to every route.
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Service worker — must be uncached and allowed to control the root scope.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type",          value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control",         value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed",value: "/" },
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
