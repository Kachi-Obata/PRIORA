"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon, AttendanceIcon, HomeIcon } from "./Icon";
import { cn } from "@/lib/cn";

interface Item {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  match: (pathname: string) => boolean;
}

const BASE_ITEMS: Item[] = [
  {
    href: "/",
    label: "Home",
    icon: HomeIcon,
    match: (p) => p === "/",
  },
  {
    href: "/attendance",
    label: "Attendance",
    icon: AttendanceIcon,
    match: (p) => p.startsWith("/attendance"),
  },
];

const ADMIN_ITEM: Item = {
  href: "/admin",
  label: "Admin",
  icon: AdminIcon,
  match: (p) => p.startsWith("/admin"),
};

interface Props {
  variant: "sidebar" | "tabbar";
  showAdmin: boolean;
}

export default function AppNav({ variant, showAdmin }: Props) {
  const pathname = usePathname();
  const items = showAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;

  if (variant === "sidebar") {
    return (
      <ul className="space-y-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent-ink"
                    : "text-ink-muted hover:bg-surface-sunk hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  // tabbar
  return (
    <ul
      className="grid"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-2xs font-medium transition-colors",
                active ? "text-accent-ink" : "text-ink-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
