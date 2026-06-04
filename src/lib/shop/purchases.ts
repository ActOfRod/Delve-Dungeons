import type { ShopStockSlot } from "./item-rarity";

/** Per-day list of shop slot numbers already bought at The General. */
export type GeneralShopPurchases = Record<string, number[]>;

export function parseGeneralShopPurchases(raw: unknown): GeneralShopPurchases {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: GeneralShopPurchases = {};
  for (const [day, slots] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(slots)) continue;
    const nums = slots
      .map((s) => Number(s))
      .filter((n) => n >= 1 && n <= 4 && Number.isInteger(n));
    if (nums.length > 0) out[day] = [...new Set(nums)];
  }
  return out;
}

export function purchasedSlotsForDay(
  purchases: GeneralShopPurchases,
  dayKey: string,
): ShopStockSlot[] {
  return (purchases[dayKey] ?? []) as ShopStockSlot[];
}

export function isSlotPurchased(
  purchases: GeneralShopPurchases,
  dayKey: string,
  slot: ShopStockSlot,
): boolean {
  return purchasedSlotsForDay(purchases, dayKey).includes(slot);
}

export function markSlotPurchased(
  purchases: GeneralShopPurchases,
  dayKey: string,
  slot: ShopStockSlot,
): GeneralShopPurchases {
  const prev = purchases[dayKey] ?? [];
  if (prev.includes(slot)) return purchases;
  return { ...purchases, [dayKey]: [...prev, slot] };
}
