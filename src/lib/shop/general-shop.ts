import { getPoolForArchetype, archetypeForClass, type ShopCatalogEntry } from "./catalog";
import {
  nearestRarity,
  rollPriceForSlot,
  rollRarityForSlot,
  SHOP_SLOT_DROP_RATES,
  type ItemRarity,
  type ShopStockSlot,
} from "./item-rarity";

export const GENERAL_SHOP_MIN_LEVEL = 1;
export const GENERAL_SHOP_MAX_LEVEL = 5;

export interface GeneralShopListing {
  slot: ShopStockSlot;
  name: string;
  quantity: number;
  rarity: ItemRarity;
  priceGp: number;
  category: string;
  description?: string;
}

export function generalShopDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function generalShopSeed(
  userId: string,
  characterId: string,
  dayKey = generalShopDayKey(),
): string {
  return `general:${userId}:${characterId}:${dayKey}`;
}

/** Deterministic PRNG from a string seed (daily stock). */
export function createSeededRandom(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state ^ seed.charCodeAt(i)) >>> 0;
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  if (state === 0) state = 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}

function pickFromPool(
  pool: ShopCatalogEntry[],
  rarity: ItemRarity,
  random: () => number,
): ShopCatalogEntry {
  const matches = pool.filter((e) => e.rarity === rarity);
  if (matches.length > 0) {
    return matches[Math.floor(random() * matches.length)]!;
  }
  const available = new Set(pool.map((e) => e.rarity));
  const fallback = nearestRarity(rarity, available);
  const bucket = fallback
    ? pool.filter((e) => e.rarity === fallback)
    : pool;
  return bucket[Math.floor(random() * bucket.length)]!;
}

function slot1Potions(): GeneralShopListing {
  return {
    slot: 1,
    name: "Potion of Healing",
    quantity: 2,
    rarity: "common",
    priceGp: 100,
    category: "Potions",
    description: "Each potion restores 2d4+2 hit points.",
  };
}

function rollStockSlot(
  slot: 2 | 3 | 4,
  archetype: ReturnType<typeof archetypeForClass>,
  random: () => number,
): GeneralShopListing {
  const rarity = rollRarityForSlot(slot, random);
  const entry = pickFromPool(getPoolForArchetype(archetype, slot), rarity, random);
  const priceGp = rollPriceForSlot(slot, random);
  return {
    slot,
    name: entry.name,
    quantity: 1,
    rarity: entry.rarity,
    priceGp,
    category: SHOP_SLOT_DROP_RATES[slot].label,
    description: entry.description,
  };
}

/**
 * Generate four shop listings for levels 1–5.
 * Slot 1 is always two healing potions; slots 2–4 use class-tailored pools.
 */
export function generateGeneralShopStock(
  klass: string,
  level: number,
  seed: string,
): GeneralShopListing[] {
  const clampedLevel = Math.min(
    GENERAL_SHOP_MAX_LEVEL,
    Math.max(GENERAL_SHOP_MIN_LEVEL, level),
  );
  void clampedLevel; // reserved for future level-scaled tables

  const random = createSeededRandom(seed);
  const archetype = archetypeForClass(klass);

  return [
    slot1Potions(),
    rollStockSlot(2, archetype, random),
    rollStockSlot(3, archetype, random),
    rollStockSlot(4, archetype, random),
  ];
}
