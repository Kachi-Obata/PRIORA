"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./Icon";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Slides up from the bottom on mobile; centers as a modal on desktop.
 * Same container, different container styles — content is identical.
 */
export default function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full md:max-w-md md:w-[440px] bg-surface rounded-t-[20px] md:rounded-card max-h-[90svh] flex flex-col shadow-xl animate-slide-up">
        {title && (
          <header className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-ink-muted hover:text-ink"
              aria-label="Close"
            >
              <CloseIcon size={20} />
            </button>
          </header>
        )}
        <div className="overflow-y-auto px-5 pb-6 pt-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
