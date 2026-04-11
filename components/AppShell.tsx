// Responsive layout shell: bottom tabs on mobile, left sidebar on desktop.
// Content is always rendered in a centered, max-width column to keep the app
// feeling focused rather than spreadsheet-like.
import Link from "next/link";
import type { ReactNode } from "react";
import { isAdminRole, type Role } from "@/lib/constants";
import AppNav from "./AppNav";
import PushRegistrar from "./PushRegistrar";

interface Props {
  role: Role;
  children: ReactNode;
}

export default function AppShell({ role, children }: Props) {
  const showAdmin = isAdminRole(role);

  return (
    <div className="min-h-[100svh] flex flex-col md:flex-row bg-surface-sunk">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-black/[0.06] md:bg-surface md:px-4 md:py-6">
        <Link
          href="/"
          className="px-2 text-xl font-semibold tracking-tight text-ink"
        >
          Priora
        </Link>
        <div className="mt-8">
          <AppNav variant="sidebar" showAdmin={showAdmin} />
        </div>
        <div className="mt-auto pt-6">
          <form action="/logout" method="post">
            <button
              type="submit"
              className="w-full text-left text-sm text-ink-muted hover:text-ink px-3 py-2"
            >
              Sign out
            </button>
          </form>
        </div>
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
        <AppNav variant="tabbar" showAdmin={showAdmin} />
      </nav>

      <PushRegistrar />
    </div>
  );
}
