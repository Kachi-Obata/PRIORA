"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Status = "online" | "offline" | "back-online";

export default function OfflineBanner() {
  const [status, setStatus] = useState<Status>("online");

  useEffect(() => {
    // Sync with actual network state on mount (avoids SSR/client mismatch).
    if (!navigator.onLine) setStatus("offline");

    function handleOffline() {
      setStatus("offline");
    }
    function handleOnline() {
      // Brief "back online" confirmation, then disappear.
      setStatus("back-online");
      setTimeout(() => setStatus("online"), 2500);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (status === "online") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium transition-colors",
        status === "offline"
          ? "bg-warn-soft text-warn-ink border-b border-warn/20"
          : "bg-accent-soft text-accent-ink border-b border-accent/20",
      )}
    >
      {status === "offline" ? (
        <>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-warn-ink shrink-0"
            aria-hidden="true"
          />
          You're offline — showing your last-loaded data
        </>
      ) : (
        <>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-accent-ink shrink-0"
            aria-hidden="true"
          />
          Back online
        </>
      )}
    </div>
  );
}
