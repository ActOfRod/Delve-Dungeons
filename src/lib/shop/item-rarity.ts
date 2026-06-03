/** Magic item rarity (D&D 5e). Shared by The General shop and future campaign loot tables. */
export type ItemRarity = "common" | "uncommon" | "rare" | "very_rare";

export type ShopStockSlot = 1 | 2 | 3 | 4;

export interface SlotDropRates {
  label: string;
  common: number;
  uncommon: number;
  rare: number;
  priceMinGp: number;
  priceMaxGp: number;
}

/** Slots 2–4 drop tables (slot 1 is always potions). */
export const SHOP_SLOT_DROP_RATES: Record<2 | 3 | 4, SlotDropRates> = {
  2: {
    label: "Utility & Minor Magic",
    common: 60,
    uncommon: 35,
    rare: 5,
    priceMinGp: 50,
    priceMaxGp: 250,
  },
  3: {
    label: "Defensive Gear & Armor",
    common: 40,
    uncommon: 50,
    rare: 10,
    priceMinGp: 100,
    priceMaxGp: 500,
  },
  4: {
    label: "Offensive Weapon / Focus",
    common: 20,
    uncommon: 60,
    rare: 20,
    priceMinGp: 150,
    priceMaxGp: 800,
  },
};

export function rollRarityForSlot(
  slot: 2 | 3 | 4,
  random: () => number,
): ItemRarity {
  const table = SHOP_SLOT_DROP_RATES[slot];
  const roll = random() * 100;
  if (roll < table.common) return "common";
  if (roll < table.common + table.uncommon) return "uncommon";
  return "rare";
}

export function rollPriceForSlot(slot: 2 | 3 | 4, random: () => number): number {
  const { priceMinGp, priceMaxGp } = SHOP_SLOT_DROP_RATES[slot];
  return (
    priceMinGp +
    Math.floor(random() * (priceMaxGp - priceMinGp + 1))
  );
}

const RARITY_ORDER: ItemRarity[] = ["common", "uncommon", "rare", "very_rare"];

export function nearestRarity(
  target: ItemRarity,
  available: Set<ItemRarity>,
): ItemRarity | null {
  if (available.has(target)) return target;
  const idx = RARITY_ORDER.indexOf(target);
  for (let d = 1; d < 3; d++) {
    if (idx - d >= 0 && available.has(RARITY_ORDER[idx - d]!)) {
      return RARITY_ORDER[idx - d]!;
    }
    if (idx + d < 3 && available.has(RARITY_ORDER[idx + d]!)) {
      return RARITY_ORDER[idx + d]!;
    }
  }
  return available.values().next().value ?? null;
}
