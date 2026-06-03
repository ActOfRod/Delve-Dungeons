import type { ItemRarity } from "./item-rarity";

export type ShopArchetype =
  | "martial"
  | "agile"
  | "caster"
  | "divine";

export interface ShopCatalogEntry {
  name: string;
  rarity: ItemRarity;
  description?: string;
}

/** Class → tailored stock pool for slots 2–4. */
export function archetypeForClass(klass: string): ShopArchetype {
  switch (klass) {
    case "Fighter":
    case "Barbarian":
    case "Paladin":
      return "martial";
    case "Rogue":
    case "Ranger":
    case "Monk":
      return "agile";
    case "Wizard":
    case "Sorcerer":
    case "Warlock":
    case "Bard":
      return "caster";
    case "Cleric":
    case "Druid":
      return "divine";
    default:
      return "martial";
  }
}

type SlotPools = Record<2 | 3 | 4, ShopCatalogEntry[]>;

const MARTIAL_POOLS: SlotPools = {
  2: [
    {
      name: "Potion of Growth",
      rarity: "common",
      description: "Doubles size; +1d4 melee damage for 1d4 hours.",
    },
    {
      name: "Immovable Rod",
      rarity: "uncommon",
      description: "Anchors in place; supports up to 8,000 lb.",
    },
  ],
  3: [
    {
      name: "+1 Shield",
      rarity: "uncommon",
      description: "+3 total bonus to AC while wielded.",
    },
    {
      name: "Adamantine Chain Mail",
      rarity: "uncommon",
      description: "Critical hits against you become normal hits.",
    },
  ],
  4: [
    {
      name: "+1 Greatsword",
      rarity: "uncommon",
      description: "+1 to attack and damage rolls.",
    },
    {
      name: "+1 Longsword",
      rarity: "uncommon",
      description: "+1 to attack and damage rolls.",
    },
    {
      name: "Vicious Battleaxe",
      rarity: "rare",
      description: "+7 damage on a critical hit (once per turn).",
    },
  ],
};

const AGILE_POOLS: SlotPools = {
  2: [
    {
      name: "Clawfoot Pods",
      rarity: "common",
      description: "Minor movement buffs for tricky footing.",
    },
    {
      name: "Boots of Elvenkind",
      rarity: "uncommon",
      description: "Advantage on Dexterity (Stealth) checks.",
    },
  ],
  3: [
    {
      name: "+1 Leather Armor",
      rarity: "uncommon",
      description: "Lightweight +1 armor.",
    },
    {
      name: "Cloak of Protection",
      rarity: "uncommon",
      description: "+1 to AC and saving throws.",
    },
  ],
  4: [
    {
      name: "+1 Rapier",
      rarity: "uncommon",
      description: "+1 to attack and damage rolls.",
    },
    {
      name: "+1 Shortbow",
      rarity: "uncommon",
      description: "+1 to attack and damage rolls.",
    },
    {
      name: "Bracers of Flying Daggers",
      rarity: "rare",
      description: "Throw daggers as an action without consuming ammo.",
    },
  ],
};

const CASTER_POOLS: SlotPools = {
  2: [
    {
      name: "Spell Scroll (1st level)",
      rarity: "common",
      description: "Cast a 1st-level spell once without a slot.",
    },
    {
      name: "Spell Scroll (2nd level)",
      rarity: "uncommon",
      description: "Cast a 2nd-level spell once without a slot.",
    },
    {
      name: "Bag of Holding",
      rarity: "uncommon",
      description: "Extradimensional storage; 500 lb, 64 ft³.",
    },
  ],
  3: [
    {
      name: "Cloak of Elvenkind",
      rarity: "uncommon",
      description: "Advantage on Stealth; Perception checks against you have disadvantage.",
    },
    {
      name: "Bracers of Defense",
      rarity: "rare",
      description: "+2 AC while wearing no armor or light armor only.",
    },
  ],
  4: [
    {
      name: "+1 Arcane Focus",
      rarity: "uncommon",
      description: "+1 to spell attack rolls and save DCs.",
    },
    {
      name: "Rod of the Keeper",
      rarity: "uncommon",
      description: "+1 to spell attack rolls and save DCs.",
    },
    {
      name: "Pearl of Power",
      rarity: "uncommon",
      description: "Regain one expended 3rd-level spell slot once per dawn.",
    },
  ],
};

const DIVINE_POOLS: SlotPools = {
  2: [
    {
      name: "Slippers of Spider Climbing",
      rarity: "uncommon",
      description: "Climb walls and ceilings without using your hands.",
    },
    {
      name: "Keoghtom's Ointment",
      rarity: "uncommon",
      description: "Extra healing charges for field medicine.",
    },
  ],
  3: [
    {
      name: "Sentinel Shield",
      rarity: "uncommon",
      description: "Advantage on Initiative and Wisdom (Perception) checks.",
    },
    {
      name: "+1 Leather Armor",
      rarity: "uncommon",
      description: "Lightweight +1 armor.",
    },
  ],
  4: [
    {
      name: "+1 Amulet of the Devout",
      rarity: "uncommon",
      description: "+1 spell save DC; one extra Channel Divinity per long rest.",
    },
    {
      name: "+1 Quarterstaff",
      rarity: "uncommon",
      description: "+1 to attack and damage rolls.",
    },
    {
      name: "Pearl of Power",
      rarity: "uncommon",
      description: "Regain one expended 3rd-level spell slot once per dawn.",
    },
  ],
};

const POOLS_BY_ARCHETYPE: Record<ShopArchetype, SlotPools> = {
  martial: MARTIAL_POOLS,
  agile: AGILE_POOLS,
  caster: CASTER_POOLS,
  divine: DIVINE_POOLS,
};

export function getPoolForArchetype(
  archetype: ShopArchetype,
  slot: 2 | 3 | 4,
): ShopCatalogEntry[] {
  return POOLS_BY_ARCHETYPE[archetype][slot];
}
