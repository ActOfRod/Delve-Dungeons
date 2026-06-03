"use client";

import { useMemo, useState } from "react";
import type { Character, InventoryItem } from "@/lib/types";
import {
  aggregatePlayerInventory,
  countInventoryItems,
  filterInventory,
  type InventoryFilter,
} from "@/lib/inventory";
import { InventoryItemRow } from "@/components/InventoryItemRow";

const FILTERS: { key: InventoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "weapon", label: "Weapons" },
  { key: "armor", label: "Armor" },
  { key: "potion", label: "Potions" },
  { key: "currency", label: "Currency" },
  { key: "key", label: "Key Items" },
];

export function VaultClient({
  vaultItems,
  characters,
}: {
  vaultItems: InventoryItem[];
  characters: Character[];
}) {
  const [filter, setFilter] = useState<InventoryFilter>("all");

  const allItems = useMemo(
    () => aggregatePlayerInventory(vaultItems, characters),
    [vaultItems, characters],
  );

  const filtered = useMemo(
    () => filterInventory(allItems, filter),
    [allItems, filter],
  );

  const equippedCount = allItems.filter((i) => i.equipped).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 text-sm text-parchment/60">
        <span>
          <span className="text-parchment">{countInventoryItems(allItems)}</span> items
          total
        </span>
        <span>
          <span className="text-parchment">{vaultItems.length}</span> in vault
        </span>
        <span>
          <span className="text-parchment">{equippedCount}</span> equipped on heroes
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === key
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-white/10 text-parchment/55 hover:border-gold/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="dd-panel rounded-2xl border-dashed p-10 text-center">
          <p className="text-sm text-parchment/50">
            {filter === "all"
              ? "No items yet. Gear from your heroes and anything you stash in the vault will appear here."
              : `No ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? "items"} in this filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <InventoryItemRow key={`${item.source}-${item.id}-${item.characterId}`} item={item} />
          ))}
        </div>
      )}

      <p className="text-xs text-parchment/40">
        Equipped items show an{" "}
        <span className="rounded border border-arcane/40 bg-arcane/20 px-1 font-bold text-arcane-bright">
          E
        </span>{" "}
        badge and stay in this list. Player trading is coming soon.
      </p>
    </div>
  );
}
