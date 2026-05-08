// Static shell used by loading.tsx files. Mirrors AppShell's layout but
// needs no data — it renders instantly from the Next.js router cache so the
// nav and frame appear the moment the user taps a tab.
import { HomeIcon, AttendanceIcon, AdminIcon } from "./Icon";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type ActiveTab = "home" | "attendance" | "admin";

const TABS = [
  { id: "home" as const, href: "/", label: "Home", Icon: HomeIcon },
  { id: "attendance" as const, href: "/attendance", label: "Attendance", Icon: AttendanceIcon },
  { id: "admin" as const, href: "/admin", label: "Admin", Icon: AdminIcon },
];

interface Props {
  active: ActiveTab;
  showAdmin?: boolean;
  children: ReactNode;
}

export default function LoadingShell({ active, showAdmin = true, children }: Props) {
  const tabs = showAdmin ? TABS : TABS.filter((t) => t.id !== "admin");

  return (
    <div className="min-h-[100svh] flex flex-col md:flex-row bg-surface-sunk">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-black/[0.06] md:bg-surface md:px-4 md:py-6">
        <span className="px-2 text-xl font-semibold tracking-tight text-ink">
          Priora
        </span>
        <nav className="mt-8">
          <ul className="space-y-1">
            {tabs.map(({ id, label, Icon }) => (
              <li key={id}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium",
                    active === id
                      ? "bg-accent-soft text-accent-ink"
                      : "text-ink-muted",
                  )}
                >
                  <Icon size={20} />
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 mx-auto w-full max-w-[640px] px-4 pb-24 md:pb-10 pt-safe">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-black/[0.06] pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map(({ id, label, Icon }) => (
            <li key={id}>
              <span
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-2xs font-medium",
                  active === id ? "text-accent-ink" : "text-ink-muted",
                )}
              >
                <Icon size={22} />
                <span>{label}</span>
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
