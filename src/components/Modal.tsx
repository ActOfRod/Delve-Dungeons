"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Modals are always closed during SSR (open is client-driven), so guarding on
  // `document` avoids a hydration mismatch while keeping the portal client-only.
  if (!open || typeof document === "undefined") return null;

  // Render through a portal to <body> so the modal escapes any ancestor with
  // a transform/filter (e.g. the backdrop-blur header), which would otherwise
  // trap `position: fixed` and clip the dialog.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="dd-fade-up dd-panel relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-gold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-parchment/60 transition hover:bg-white/5 hover:text-parchment"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
