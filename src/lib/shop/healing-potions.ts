import type { GeneralShopListing } from "./general-shop";
import type { ItemRarity } from "./item-rarity";

/** Chance slot 1 stocks a Supreme Healing Potion (quantity always 1). */
export const SUPREME_HEALING_SPAWN_PERCENT = 10;

interface HealingPotionTier {
  name: string;
  rarity: ItemRarity;
  healFormula: string;
  maxQuantity: number;
  unitPriceGp: number;
  /** Relative weight when rolling among non-supreme potions (should sum to 100). */
  weight: number;
}

/** Standard tiers when supreme does not appear (90% of slot 1 rolls). */
const HEALING_POTION_TIERS: HealingPotionTier[] = [
  {
    name: "Potion of Healing",
    rarity: "common",
    healFormula: "2d4+2",
    maxQuantity: 5,
    unitPriceGp: 50,
    weight: 70,
  },
  {
    name: "Greater Healing Potion",
    rarity: "uncommon",
    healFormula: "4d4+4",
    maxQuantity: 3,
    unitPriceGp: 150,
    weight: 20,
  },
  {
    name: "Superior Healing Potion",
    rarity: "rare",
    healFormula: "8d4+8",
    maxQuantity: 2,
    unitPriceGp: 450,
    weight: 10,
  },
];

const SUPREME_HEALING: Omit<HealingPotionTier, "weight" | "maxQuantity"> & {
  maxQuantity: 1;
} = {
  name: "Supreme Healing Potion",
  rarity: "very_rare",
  healFormula: "10d4+20",
  maxQuantity: 1,
  unitPriceGp: 1350,
};

function randomIntInclusive(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function listingFromTier(
  tier: HealingPotionTier | typeof SUPREME_HEALING,
  quantity: number,
): GeneralShopListing {
  const plural = quantity > 1 ? "Each potion" : "Restores";
  return {
    slot: 1,
    name: tier.name,
    quantity,
    rarity: tier.rarity,
    priceGp: tier.unitPriceGp * quantity,
    category: "Potions",
    description: `${plural} restores ${tier.healFormula} HP.`,
  };
}

/** Roll slot 1: always a healing potion line, tier and quantity vary. */
export function rollHealingPotionStock(random: () => number): GeneralShopListing {
  if (random() * 100 < SUPREME_HEALING_SPAWN_PERCENT) {
    return listingFromTier(SUPREME_HEALING, 1);
  }

  const roll = random() * 100;
  let cumulative = 0;
  for (const tier of HEALING_POTION_TIERS) {
    cumulative += tier.weight;
    if (roll < cumulative) {
      const quantity = randomIntInclusive(1, tier.maxQuantity, random);
      return listingFromTier(tier, quantity);
    }
  }

  const fallback = HEALING_POTION_TIERS[0]!;
  return listingFromTier(
    fallback,
    randomIntInclusive(1, fallback.maxQuantity, random),
  );
}
