import type { InventoryItem } from "./types";
import { ensureItemId, normalizeInventoryItems } from "./inventory";

function isGoldPiecesName(name: string): boolean {
  return name.trim().toLowerCase() === "gold pieces";
}

export function getGoldPiecesGp(inventory: InventoryItem[]): number {
  const row = inventory.find((i) => isGoldPiecesName(i.name));
  return row?.quantity ?? 0;
}

export function spendGoldPieces(
  inventory: InventoryItem[],
  amountGp: number,
): { inventory: InventoryItem[] } | { error: string } {
  const cost = Math.max(0, Math.floor(amountGp));
  if (cost === 0) {
    return { inventory: normalizeInventoryItems(inventory) };
  }

  const gold = getGoldPiecesGp(inventory);
  if (gold < cost) {
    return {
      error: `Not enough gold — need ${cost} GP, have ${gold} GP.`,
    };
  }

  const remaining = gold - cost;
  let found = false;
  const next = normalizeInventoryItems(inventory).flatMap((item) => {
    if (!isGoldPiecesName(item.name)) return [item];
    found = true;
    if (remaining <= 0) return [];
    return [{ ...item, quantity: remaining }];
  });

  if (!found && remaining > 0) {
    return {
      inventory: [
        ...next,
        ensureItemId({
          name: "Gold pieces",
          quantity: remaining,
          category: "currency",
        }),
      ],
    };
  }

  return { inventory: next };
}
