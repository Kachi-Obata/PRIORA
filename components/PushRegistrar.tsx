"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Registers the service worker and subscribes to Web Push on mount.
 * No prompt UI — if the user has already granted permission, we refresh the
 * subscription silently. If they haven't, we skip (Priora never nags).
 *
 * A visible "Enable notifications" affordance can be added later on an
 * explicit user action (settings screen, banner) — out of scope for v1.
 */
export default function PushRegistrar() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");

        // Only proceed if permission is already granted. We don't ask here.
        if (Notification.permission !== "granted") return;

        const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapid) return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid),
          });
        }

        const supabase = getSupabaseBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subscription: sub }),
        });
      } catch {
        // Ignore — push is a nice-to-have, not a blocker.
      }
    })();
  }, []);

  return null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
