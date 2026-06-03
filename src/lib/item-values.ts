import type { InventoryItem, ItemCategory } from "./types";
import { categorizeItemName, isCharacterSheetRecordItem } from "./inventory";

/** Per-unit value in gold pieces (PHB equipment prices, rounded for play). */
const ITEM_VALUE_GP: Record<string, number> = {
  // Weapons — martial
  greataxe: 30,
  halberd: 20,
  "martial melee weapon": 15,
  "martial weapon": 18,
  longsword: 15,
  warhammer: 15,
  rapier: 25,
  scimitar: 25,
  shortsword: 10,
  longbow: 50,
  shortbow: 25,
  "light crossbow": 25,
  // Weapons — simple
  "simple melee weapon": 2,
  "simple weapon": 1,
  mace: 5,
  quarterstaff: 1,
  staff: 2,
  dagger: 2,
  handaxe: 5,
  javelin: 1,
  dart: 1,
  // Ammunition (per unit listed quantity in starting kits)
  quiver: 1,

  // Armor & shields
  "leather armor": 10,
  "chain mail": 75,
  "scale mail": 50,
  shield: 10,
  "wooden shield": 5,

  // Packs
  "burglar's pack": 16,
  "diplomat's pack": 39,
  "dungeoneer's pack": 12,
  "entertainer's pack": 40,
  "explorer's pack": 10,
  "priest's pack": 19,
  "scholar's pack": 40,

  // Adventuring gear
  "arcane focus": 10,
  "component pouch": 25,
  spellbook: 50,
  "holy symbol": 5,
  "druidic focus": 5,
  "thieves' tools": 25,
  "disguise kit": 25,
  "herbalism kit": 5,
  "artisan's tools": 15,
  crowbar: 2,
  "hunting trap": 5,
  "ink bottle": 10,
  quill: 2,
  "small knife": 1,
  shovel: 2,
  "iron pot": 2,
  "scroll case": 1,
  "silk rope": 10,
  "incense sticks": 1,
  vestments: 5,
  "winter blanket": 5,
  "basic adventuring gear": 10,
  "musical instrument": 30,
  lute: 35,
  costume: 5,
  "common clothes": 1,
  "fine clothes": 15,
  "traveler's clothes": 2,
  "dark common clothes with hood": 1,
  "signet ring": 5,
  "scroll of pedigree": 10,
  "letter of introduction from guild": 5,
  "letter from a dead colleague": 5,
  "map of your home city": 5,
  "deck of cards or bone set": 1,
  "prayer book or prayer wheel": 5,
  "tools of the con": 25,
  "insignia of rank": 5,
  "trophy from a fallen enemy": 5,
  "trophy from an animal": 5,
  "lucky charm": 5,
  "favor from an admirer": 5,
  "token from parents": 1,
  "pet mouse": 1,
  "belaying pin": 2,

  // Currency
  "gold pieces": 1,
  "gold piece": 1,

  // Meta / narrative (no trade value)
  "skill proficiencies": 0,
  "tool proficiencies": 0,
};

/** PHB: 1 gp per 20 arrows or bolts. */
const AMMO_PRICING: Record<string, { bundleSize: number; bundleGp: number }> = {
  arrows: { bundleSize: 20, bundleGp: 1 },
  "crossbow bolts": { bundleSize: 20, bundleGp: 1 },
};

const CATEGORY_DEFAULT_GP: Record<ItemCategory, number> = {
  weapon: 10,
  armor: 25,
  potion: 50,
  key: 5,
  currency: 1,
  other: 2,
};

function normalizeItemName(name: string): string {
  return name.trim().toLowerCase();
}

/** Background / class feature rows like "Acolyte feature". */
function isNarrativeMetaItem(name: string): boolean {
  return /\b(feature|proficienc)\b/i.test(name);
}

export function getItemUnitValueGp(name: string): number {
  const key = normalizeItemName(name);
  if (key in ITEM_VALUE_GP) return ITEM_VALUE_GP[key]!;
  if (isNarrativeMetaItem(name) || isCharacterSheetRecordItem(name)) return 0;

  const cat = categorizeItemName(name);
  return CATEGORY_DEFAULT_GP[cat];
}

export function getItemStackValueGp(item: Pick<InventoryItem, "name" | "quantity">): number {
  const qty = Math.max(1, item.quantity);
  const ammoKey = normalizeItemName(item.name);
  const ammo = AMMO_PRICING[ammoKey];
  if (ammo) {
    return Math.max(1, Math.ceil(qty / ammo.bundleSize)) * ammo.bundleGp;
  }
  return getItemUnitValueGp(item.name) * qty;
}

export function formatGpValue(gp: number): string {
  if (gp <= 0) return "—";
  return `${gp} GP`;
}
