import type { Character, InventoryItem, ItemCategory } from "./types";

export type InventoryFilter = "all" | "weapon" | "armor" | "potion" | "key" | "currency";

export interface DisplayInventoryItem extends InventoryItem {
  source: "vault" | "character";
  characterId?: string;
  characterName?: string;
}

const WEAPON_KEYWORDS =
  /\b(axe|bow|crossbow|dagger|dart|glaive|halberd|hammer|javelin|lance|mace|maul|morningstar|pike|quarterstaff|rapier|scimitar|sickle|spear|staff|sword|trident|warhammer|whip|weapon)\b/i;

const ARMOR_KEYWORDS =
  /\b(armor|breastplate|chain mail|chain shirt|half plate|hide|leather|padded|plate|ring mail|scale mail|shield|splint|studded)\b/i;

const POTION_KEYWORDS = /\b(potion|elixir|philter|draught|oil of)\b/i;

const KEY_KEYWORDS =
  /\b(feature|proficienc|holy symbol|spellbook|focus|symbol|letter|pedigree|map|trophy|charm|token|insignia|passage|contact|identity|discovery|rank|secrets|demand|incense|vestments|prayer|wheel|book of lore)\b/i;

const PACK_KEYWORDS = /\bpack\b/i;

const CURRENCY_KEYWORDS =
  /\b(gold pieces?|gp\b|platinum pieces?|electrum pieces?|silver pieces?|copper pieces?|coins?)\b/i;

const META_KEYWORDS = /\bbackground\b/i;

/** Background skill/tool rows stored on characters — not physical stash loot. */
export function isProficiencyRecordItem(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "skill proficiencies" || n === "tool proficiencies";
}

/** Background/class feature rows (e.g. "Folk Hero feature") — character sheet metadata, not gear. */
export function isCharacterFeatureItem(name: string): boolean {
  return /\bfeature$/i.test(name.trim());
}

export function isCharacterAttributeItem(name: string): boolean {
  return isProficiencyRecordItem(name) || isCharacterFeatureItem(name);
}

export function filterPhysicalInventoryItems<T extends InventoryItem>(items: T[]): T[] {
  return items.filter((item) => !isCharacterAttributeItem(item.name));
}

export function categorizeItemName(name: string): ItemCategory {
  const n = name.trim();
  if (CURRENCY_KEYWORDS.test(n)) return "currency";
  if (POTION_KEYWORDS.test(n)) return "potion";
  if (ARMOR_KEYWORDS.test(n)) return "armor";
  if (WEAPON_KEYWORDS.test(n)) return "weapon";
  if (KEY_KEYWORDS.test(n) || META_KEYWORDS.test(n) || PACK_KEYWORDS.test(n)) {
    return "key";
  }
  return "other";
}

export function ensureItemId(item: InventoryItem): InventoryItem {
  if (item.id) return item;
  return {
    ...item,
    id: crypto.randomUUID(),
  };
}

export function normalizeInventoryItems(
  items: InventoryItem[],
  options?: { klass?: string; inferEquipped?: boolean },
): InventoryItem[] {
  const normalized = items.map((raw) => {
    const item = ensureItemId(raw);
    return {
      ...item,
      category: item.category ?? categorizeItemName(item.name),
    };
  });

  if (!options?.inferEquipped) return normalized;
  return applyEquippedInference(normalized, options.klass);
}

/** Marks worn starting gear (armor, shield, primary weapon) for the equipped badge. */
export function applyEquippedInference(
  items: InventoryItem[],
  klass?: string,
): InventoryItem[] {
  let markedArmor = false;
  let markedShield = false;
  let markedWeapon = false;

  return items.map((item) => {
    if (item.equipped != null) return item;
    const cat = item.category ?? categorizeItemName(item.name);
    const name = item.name.toLowerCase();

    if (cat === "armor" && !markedArmor && !name.includes("pack")) {
      markedArmor = true;
      return { ...item, equipped: true };
    }
    if (name.includes("shield") && !markedShield) {
      markedShield = true;
      return { ...item, equipped: true };
    }
    if (
      cat === "weapon" &&
      !markedWeapon &&
      !name.includes("bolt") &&
      !name.includes("arrow") &&
      item.quantity <= 2
    ) {
      markedWeapon = true;
      return { ...item, equipped: true };
    }

    // Casters: spellbook / focus often "ready"
    if (
      klass &&
      /wizard|cleric|druid|sorcerer|warlock|bard/i.test(klass) &&
      (name.includes("spellbook") ||
        name.includes("focus") ||
        name.includes("holy symbol") ||
        name.includes("druidic"))
    ) {
      return { ...item, equipped: true };
    }

    return item;
  });
}

function isGoldPiecesName(name: string): boolean {
  return normalizeGoldName(name) === "gold pieces";
}

function normalizeGoldName(name: string): string {
  return name.trim().toLowerCase();
}

/** Merge rolled or purchased items into a character or vault inventory. */
export function mergeInventoryGrants(
  inventory: InventoryItem[],
  grants: { name: string; quantity: number; description?: string }[],
  options?: { klass?: string },
): InventoryItem[] {
  const next = normalizeInventoryItems([...inventory], {
    klass: options?.klass,
    inferEquipped: false,
  });

  for (const grant of grants) {
    const qty = Math.max(1, grant.quantity);
    if (isGoldPiecesName(grant.name)) {
      const idx = next.findIndex((i) => isGoldPiecesName(i.name));
      if (idx >= 0) {
        const row = next[idx]!;
        next[idx] = {
          ...row,
          quantity: row.quantity + qty,
          description: grant.description ?? row.description,
        };
      } else {
        next.push(
          ensureItemId({
            name: "Gold pieces",
            quantity: qty,
            description: grant.description,
            category: "currency",
          }),
        );
      }
      continue;
    }

    const key = grant.name.trim().toLowerCase();
    const existing = next.find((i) => i.name.trim().toLowerCase() === key);
    if (existing) {
      existing.quantity += qty;
      if (grant.description && !existing.description) {
        existing.description = grant.description;
      }
    } else {
      next.push(
        ensureItemId({
          name: grant.name.trim(),
          quantity: qty,
          description: grant.description,
          category: categorizeItemName(grant.name),
        }),
      );
    }
  }

  return next;
}

export function enrichNewItems(
  items: { name: string; quantity: number; description?: string }[],
  klass: string,
): InventoryItem[] {
  return applyEquippedInference(
    items.map((entry) => ({
      id: crypto.randomUUID(),
      name: entry.name,
      quantity: entry.quantity,
      description: entry.description,
      category: categorizeItemName(entry.name),
    })),
    klass,
  );
}

export function aggregatePlayerInventory(
  vaultItems: InventoryItem[],
  characters: Character[],
): DisplayInventoryItem[] {
  const rows: DisplayInventoryItem[] = [];

  for (const item of filterPhysicalInventoryItems(normalizeInventoryItems(vaultItems))) {
    rows.push({ ...item, source: "vault" });
  }

  for (const character of characters) {
    const inv = filterPhysicalInventoryItems(
      normalizeInventoryItems(
        (character.inventory ?? []) as InventoryItem[],
        { klass: character.klass, inferEquipped: true },
      ),
    );
    for (const item of inv) {
      rows.push({
        ...item,
        source: "character",
        characterId: character.id,
        characterName: character.name,
      });
    }
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function filterInventory(
  items: DisplayInventoryItem[],
  filter: InventoryFilter,
): DisplayInventoryItem[] {
  if (filter === "all") return items;
  if (filter === "weapon") {
    return items.filter((i) => (i.category ?? categorizeItemName(i.name)) === "weapon");
  }
  if (filter === "armor") {
    return items.filter((i) => (i.category ?? categorizeItemName(i.name)) === "armor");
  }
  if (filter === "potion") {
    return items.filter((i) => (i.category ?? categorizeItemName(i.name)) === "potion");
  }
  if (filter === "currency") {
    return items.filter(
      (i) => (i.category ?? categorizeItemName(i.name)) === "currency",
    );
  }
  if (filter === "key") {
    return items.filter((i) => {
      const cat = i.category ?? categorizeItemName(i.name);
      return cat === "key" || cat === "other";
    });
  }
  return items;
}

/** Count inventory rows (stacks), not units — e.g. 20 bolts = 1 item, 100 GP = 1 item. */
export function countInventoryItems(items: DisplayInventoryItem[]): number {
  return items.length;
}
