"use client";

// Keeps the three main pages (Home, Attendance, Admin) feeling instant:
//
//   1. A quiet background timer calls router.refresh() every 5 minutes
//      while the app is actually visible — catches data that changed while
//      the user sat on one page without switching tabs.
//   2. A hand-rolled pull-to-refresh gesture lets the user force a refresh
//      on demand by swiping down from the top of the page.
//
// Both paths wrap router.refresh() in useTransition so the existing content
// stays on screen the whole time — no loading.tsx skeleton flash. The user
// sees what they saw before, instantly, while fresh data swaps in quietly
// underneath.

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PULL_THRESHOLD = 70;                  // px of drag needed to trigger a refresh
const MAX_PULL = 100;                       // visual cap on how far the indicator travels
const REFRESH_REST_OFFSET = 56;             // where content sits while "refreshing" is shown
const MIN_REFRESH_DURATION_MS = 500;        // floor so the spinner doesn't just flicker

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragOffset, setDragOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 1. Quiet background refresh, paused when the app isn't in the foreground.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        startTransition(() => router.refresh());
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router, startTransition]);

  // 2. Pull-down-to-refresh gesture. Only arms when scrolled to the very top
  //    — otherwise this would fight with normal scrolling.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current == null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setDragOffset(0);
        return;
      }
      setDragOffset(Math.min(MAX_PULL, delta * 0.5)); // damped — elastic, not 1:1
      e.preventDefault();
    }

    function onTouchEnd() {
      if (startY.current == null) return;
      const triggered = dragOffset >= PULL_THRESHOLD;
      startY.current = null;
      setDragOffset(0);
      if (triggered) {
        setRefreshing(true);
        startTransition(() => router.refresh());
        setTimeout(() => setRefreshing(false), MIN_REFRESH_DURATION_MS);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragOffset, refreshing, router, startTransition]);

  const offset = refreshing ? REFRESH_REST_OFFSET : dragOffset;

  return (
    <div ref={rootRef} className="relative">
      <div
        className="absolute inset-x-0 top-0 flex justify-center pt-3 pointer-events-none"
        style={{ opacity: offset > 0 ? 1 : 0 }}
        aria-hidden="true"
      >
        <div
          className={cn(
            "w-6 h-6 rounded-full border-2 border-accent border-t-transparent",
            refreshing && "animate-spin",
          )}
          style={
            !refreshing
              ? { transform: `rotate(${(offset / PULL_THRESHOLD) * 360}deg)` }
              : undefined
          }
        />
      </div>
      <div
        style={{
          transform: offset > 0 ? `translateY(${offset}px)` : undefined,
          transition: offset === 0 ? "transform 200ms ease-out" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
