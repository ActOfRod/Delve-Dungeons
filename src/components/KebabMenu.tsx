"use client";

import { useEffect, useRef, useState } from "react";

export interface KebabItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}

export function KebabMenu({
  items,
  label = "Open menu",
}: {
  items: KebabItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-parchment/60 transition hover:bg-white/10 hover:text-parchment"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open && (
        <div className="dd-fade-up absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-gold/20 bg-ink/95 py-1 shadow-2xl backdrop-blur">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                item.danger ? "text-red-300" : "text-parchment/90"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
