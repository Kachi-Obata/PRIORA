// Priora service worker — offline caching + Web Push.
//
// Cache strategy:
//   /_next/static/*   → CacheFirst  (content-hashed filenames, never stale)
//   page navigations  → NetworkFirst → cache → /offline fallback
//   RSC payloads      → NetworkFirst → cache  (same URL, Accept: text/x-component)
//   /api/*            → NetworkOnly  (always live; never cache personal data)
//   push events       → existing handlers below
//
// Bump CACHE_VERSION whenever you ship a breaking UI change so old caches
// are flushed on the next activate.

const CACHE_VERSION = "v4";
const STATIC_CACHE = `priora-static-${CACHE_VERSION}`;
const CONTENT_CACHE = `priora-content-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, CONTENT_CACHE];

const OFFLINE_URL = "/offline";

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CONTENT_CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
  // Activate immediately — don't wait for old SW tabs to close.
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Never cache API routes — they need live data.
  if (url.pathname.startsWith("/api/")) return;

  // Next.js static assets — content-hashed, safe to cache forever.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Full-page navigations — NetworkFirst, fall back to cached page, then /offline HTML.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // RSC navigation payloads (Accept: text/x-component) — NetworkFirst, but on failure
  // return a 503 so React's error boundary handles it rather than trying to render
  // the /offline HTML as RSC data (which causes "Application error").
  if (request.headers.get("Accept")?.includes("text/x-component")) {
    event.respondWith(networkFirstRSC(request));
    return;
  }

  // Static files in /public (manifest, icons, sw itself).
  if (
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Everything else: network only.
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Serve from cache; fetch + cache if missing. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/**
 * Try the network first. On success, update the cache and return the fresh
 * response. On failure (offline / timeout), serve the cached version.
 * If there's no cached version, serve the offline fallback page.
 *
 * IMPORTANT: we generate the fallback HTML inline rather than returning the
 * pre-cached Next.js /offline page. The Next.js page references JS chunks
 * (e.g. app/offline/page-xxxx.js) that won't be in the static cache — loading
 * them fails when offline, which causes React to throw "Loading chunk N failed"
 * instead of showing a friendly UI. An inline HTML string has no chunk deps.
 */
async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(CONTENT_CACHE);
  try {
    const response = await fetch(request);
    // Only cache successful, non-opaque responses.
    if (response.ok && response.status < 400) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last resort: a fully self-contained offline page (no external chunks).
    return offlineFallbackResponse();
  }
}

/** Inline offline fallback — zero JS chunk dependencies. */
function offlineFallbackResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline — Priora</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100svh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f4f4f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1f;
      padding: 24px;
      text-align: center;
    }
    .card { max-width: 280px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    svg { color: #a0a0aa; }
    h1 { font-size: 1.125rem; font-weight: 600; }
    p { font-size: 0.875rem; line-height: 1.6; color: #6b6b75; }
    a {
      display: inline-flex; align-items: center; justify-content: center;
      margin-top: 8px; padding: 10px 16px;
      background: #0d9488; color: #fff;
      font-size: 0.875rem; font-weight: 500;
      border-radius: 10px; text-decoration: none;
      transition: background 0.15s;
    }
    a:hover { background: #0f766e; }
  </style>
  <script>
    // Auto-navigate home the moment connectivity returns.
    window.addEventListener('online', function () { window.location.href = '/'; });
  </script>
</head>
<body>
  <div class="card">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="1.5"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M8.5 16.5a5 5 0 0 1 7 0"/>
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65"/>
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/>
      <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/>
      <path d="M5 12.75a10 10 0 0 1 5.17-2.39"/>
      <line x1="12" y1="20" x2="12.01" y2="20" stroke-width="2"/>
    </svg>
    <h1>You're offline</h1>
    <p>This page hasn't been loaded before, so there's no cached version to show.
       Once you're back online the app will reload automatically.</p>
    <a href="/">Try again</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * For RSC payloads: try network first, serve cached RSC on failure.
 * If there's no cache either, return a 503 so React's error boundary
 * can show a friendly offline message — never return the /offline HTML,
 * which React would try (and fail) to parse as RSC data.
 */
async function networkFirstRSC(request) {
  const cache = await caches.open(CONTENT_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.status < 400) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("Service unavailable — you appear to be offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Priora", body: event.data.text() };
  }

  const title = payload.title || "Priora";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/" },
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl).catch(() => {});
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
