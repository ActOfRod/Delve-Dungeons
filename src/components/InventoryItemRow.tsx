"use client";

import type { DisplayInventoryItem } from "@/lib/inventory";
import { categorizeItemName } from "@/lib/inventory";

export function InventoryItemRow({
  item,
  showLocation = true,
}: {
  item: DisplayInventoryItem;
  showLocation?: boolean;
}) {
  const category = item.category ?? categorizeItemName(item.name);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-parchment">{item.name}</span>
          {item.quantity > 1 && (
            <span className="text-xs text-gold">×{item.quantity}</span>
          )}
          {item.equipped && (
            <span
              className="rounded border border-arcane/40 bg-arcane/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-arcane-bright"
              title="Equipped"
            >
              E
            </span>
          )}
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-parchment/40">
            {category}
          </span>
        </div>
        {item.description && (
          <p className="mt-1 text-xs text-parchment/45">{item.description}</p>
        )}
        {showLocation && item.source === "character" && item.characterName && (
          <p className="mt-1 text-xs text-parchment/40">
            Carried by {item.characterName}
          </p>
        )}
        {showLocation && item.source === "vault" && (
          <p className="mt-1 text-xs text-parchment/40">In your vault</p>
        )}
      </div>
    </div>
  );
}
