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

const CACHE_VERSION = "v2";
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

  // Page navigations (full HTML) and RSC navigation fetches
  // (same URL, but with Accept: text/x-component from the Next.js router).
  // NetworkFirst: use fresh data when online, fall back to cache when offline.
  if (request.mode === "navigate" || request.headers.get("Accept")?.includes("text/x-component")) {
    event.respondWith(networkFirstWithOfflineFallback(request));
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
    // Last resort: the pre-cached offline page.
    return cache.match(OFFLINE_URL);
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
