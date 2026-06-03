// PHB class & background starting equipment (Player's Handbook p. 47–113, 125–141).

import type { CharacterClass } from "./dnd";

export interface StartingGearItem {
  name: string;
  quantity: number;
  description?: string;
}

export interface EquipmentPick {
  label: string;
  items: StartingGearItem[];
}

export interface EquipmentChoiceGroup {
  id: string;
  prompt: string;
  options: EquipmentPick[];
}

export interface ClassEquipmentDefinition {
  choices: EquipmentChoiceGroup[];
  fixed: StartingGearItem[];
}

const PACK_CONTENTS: Record<string, string> = {
  "Burglar's pack":
    "Backpack, ball bearings, string, bell, candles, crowbar, hammer, pitons, lantern, oil, rations, tinderbox, waterskin, 50 ft. hempen rope",
  "Diplomat's pack":
    "Chest, map/scroll cases, fine clothes, ink, pen, lamp, oil, paper, perfume, sealing wax, soap",
  "Dungeoneer's pack":
    "Backpack, crowbar, hammer, pitons, torches, tinderbox, rations, waterskin, 50 ft. hempen rope",
  "Entertainer's pack":
    "Backpack, bedroll, costumes, candles, rations, waterskin, disguise kit",
  "Explorer's pack":
    "Backpack, bedroll, mess kit, tinderbox, torches, rations, waterskin, 50 ft. hempen rope",
  "Priest's pack":
    "Backpack, blanket, candles, tinderbox, alms box, incense, censer, vestments, rations, waterskin",
  "Scholar's pack":
    "Backpack, book of lore, ink, pen, parchment, bag of sand, small knife",
};

function pack(name: string): StartingGearItem {
  return {
    name,
    quantity: 1,
    description: PACK_CONTENTS[name],
  };
}

function item(name: string, quantity = 1, description?: string): StartingGearItem {
  return { name, quantity, description };
}

export const CLASS_STARTING_EQUIPMENT: Record<CharacterClass, ClassEquipmentDefinition> = {
  Barbarian: {
    choices: [
      {
        id: "primary",
        prompt: "Primary weapon",
        options: [
          { label: "Greataxe", items: [item("Greataxe")] },
          { label: "Any martial melee weapon", items: [item("Martial melee weapon", 1, "Player's choice")] },
        ],
      },
      {
        id: "secondary",
        prompt: "Secondary weapons",
        options: [
          { label: "Two handaxes", items: [item("Handaxe", 2)] },
          { label: "Any simple weapon", items: [item("Simple weapon", 1, "Player's choice")] },
        ],
      },
    ],
    fixed: [pack("Explorer's pack"), item("Javelin", 4)],
  },
  Bard: {
    choices: [
      {
        id: "weapon",
        prompt: "Weapon",
        options: [
          { label: "Rapier", items: [item("Rapier")] },
          { label: "Longsword", items: [item("Longsword")] },
          { label: "Any simple weapon", items: [item("Simple weapon", 1, "Player's choice")] },
        ],
      },
      {
        id: "pack",
        prompt: "Equipment pack",
        options: [
          { label: "Diplomat's pack", items: [pack("Diplomat's pack")] },
          { label: "Entertainer's pack", items: [pack("Entertainer's pack")] },
        ],
      },
      {
        id: "instrument",
        prompt: "Musical instrument",
        options: [
          { label: "Lute", items: [item("Lute")] },
          { label: "Any musical instrument", items: [item("Musical instrument", 1, "Player's choice")] },
        ],
      },
    ],
    fixed: [item("Leather armor"), item("Dagger")],
  },
  Cleric: {
    choices: [
      {
        id: "weapon",
        prompt: "Weapon",
        options: [
          { label: "Mace", items: [item("Mace")] },
          { label: "Warhammer", items: [item("Warhammer", 1, "If proficient")] },
        ],
      },
      {
        id: "armor",
        prompt: "Armor",
        options: [
          { label: "Scale mail", items: [item("Scale mail")] },
          { label: "Leather armor", items: [item("Leather armor")] },
          { label: "Chain mail", items: [item("Chain mail", 1, "If proficient")] },
        ],
      },
      {
        id: "ranged",
        prompt: "Ranged weapon",
        options: [
          {
            label: "Light crossbow and 20 bolts",
            items: [item("Light crossbow"), item("Crossbow bolts", 20)],
          },
          { label: "Any simple weapon", items: [item("Simple weapon", 1, "Player's choice")] },
        ],
      },
      {
        id: "pack",
        prompt: "Equipment pack",
        options: [
          { label: "Priest's pack", items: [pack("Priest's pack")] },
          { label: "Explorer's pack", items: [pack("Explorer's pack")] },
        ],
      },
    ],
    fixed: [item("Shield"), item("Holy symbol")],
  },
  Druid: {
    choices: [
      {
        id: "shield",
        prompt: "Shield or weapon",
        options: [
          { label: "Wooden shield", items: [item("Wooden shield")] },
          { label: "Any simple weapon", items: [item("Simple weapon", 1, "Player's choice")] },
        ],
      },
      {
        id: "melee",
        prompt: "Melee weapon",
        options: [
          { label: "Scimitar", items: [item("Scimitar")] },
          { label: "Any simple melee weapon", items: [item("Simple melee weapon", 1, "Player's choice")] },
        ],
      },
    ],
    fixed: [
      item("Leather armor"),
      pack("Explorer's pack"),
      item("Druidic focus"),
    ],
  },
  Fighter: {
    choices: [
      {
        id: "armor",
        prompt: "Armor & ranged",
        options: [
          { label: "Chain mail", items: [item("Chain mail")] },
          {
            label: "Leather armor, longbow, and 20 arrows",
            items: [item("Leather armor"), item("Longbow"), item("Arrows", 20)],
          },
        ],
      },
      {
        id: "martial",
        prompt: "Martial weapons",
        options: [
          {
            label: "Martial weapon and shield",
            items: [item("Martial weapon", 1, "Player's choice"), item("Shield")],
          },
          { label: "Two martial weapons", items: [item("Martial weapon", 2, "Player's choice")] },
        ],
      },
      {
        id: "secondary",
        prompt: "Secondary weapon",
        options: [
          {
            label: "Light crossbow and 20 bolts",
            items: [item("Light crossbow"), item("Crossbow bolts", 20)],
          },
          { label: "Two handaxes", items: [item("Handaxe", 2)] },
        ],
      },
      {
        id: "pack",
        prompt: "Equipment pack",
        options: [
          { label: "Dungeoneer's pack", items: [pack("Dungeoneer's pack")] },
          { label: "Explorer's pack", items: [pack("Explorer's pack")] },
        ],
      },
    ],
    fixed: [],
  },
  Monk: {
    choices: [
      {
        id: "weapon",
        prompt: "Weapon",
        options: [
          { label: "Shortsword", items: [item("Shortsword")] },
          { label: "Any simple weapon", items: [item("Simple weapon", 1, "Player's choice")] },
        ],
      },
    ],
    fixed: [pack("Dungeoneer's pack"), item("Dart", 10)],
  },
  Paladin: {
    choices: [],
    fixed: [
      item("Martial weapon", 1, "Player's choice"),
      item("Shield"),
      item("Javelin", 5),
      pack("Priest's pack"),
      item("Chain mail"),
      item("Holy symbol"),
    ],
  },
  Ranger: {
    choices: [
      {
        id: "armor",
        prompt: "Armor",
        options: [
          { label: "Scale mail", items: [item("Scale mail")] },
          { label: "Leather armor", items: [item("Leather armor")] },
        ],
      },
      {
        id: "weapons",
        prompt: "Melee weapons",
        options: [
          { label: "Two shortswords", items: [item("Shortsword", 2)] },
          { label: "Two simple melee weapons", items: [item("Simple melee weapon", 2, "Player's choice")] },
        ],
      },
    ],
    fixed: [
      pack("Dungeoneer's pack"),
      item("Longbow"),
      item("Quiver"),
      item("Arrows", 20),
    ],
  },
  Rogue: {
    choices: [
      {
        id: "primary",
        prompt: "Primary weapon",
        options: [
          { label: "Rapier", items: [item("Rapier")] },
          { label: "Shortsword", items: [item("Shortsword")] },
        ],
      },
      {
        id: "ranged",
        prompt: "Ranged or backup",
        options: [
          {
            label: "Shortbow and 20 arrows",
            items: [item("Shortbow"), item("Arrows", 20)],
          },
          { label: "Shortsword", items: [item("Shortsword")] },
        ],
      },
      {
        id: "pack",
        prompt: "Equipment pack",
        options: [
          { label: "Burglar's pack", items: [pack("Burglar's pack")] },
          { label: "Dungeoneer's pack", items: [pack("Dungeoneer's pack")] },
          { label: "Explorer's pack", items: [pack("Explorer's pack")] },
        ],
      },
    ],
    fixed: [item("Leather armor"), item("Dagger", 2), item("Thieves' tools")],
  },
  Sorcerer: {
    choices: [
      {
        id: "weapon",
        prompt: "Weapon",
        options: [
          {
            label: "Light crossbow and 20 bolts",
            items: [item("Light crossbow"), item("Crossbow bolts", 20)],
          },
          { label: "Any simple weapon", items: [item("Simple weapon", 1, "Player's choice")] },
        ],
      },
      {
        id: "focus",
        prompt: "Spellcasting focus",
        options: [
          { label: "Component pouch", items: [item("Component pouch")] },
          { label: "Arcane focus", items: [item("Arcane focus")] },
        ],
      },
      {
        id: "pack",
        prompt: "Equipment pack",
        options: [
          { label: "Dungeoneer's pack", items: [pack("Dungeoneer's pack")] },
          { label: "Explorer's pack", items: [pack("Explorer's pack")] },
        ],
      },
    ],
    fixed: [item("Dagger", 2)],
  },
  Warlock: {
    choices: [
      {
        id: "weapon",
        prompt: "Weapon",
        options: [
          {
            label: "Light crossbow and 20 bolts",
            items: [item("Light crossbow"), item("Crossbow bolts", 20)],
          },
          { label: "Any simple weapon", items: [item("Simple weapon", 1, "Player's choice")] },
        ],
      },
      {
        id: "focus",
        prompt: "Spellcasting focus",
        options: [
          { label: "Component pouch", items: [item("Component pouch")] },
          { label: "Arcane focus", items: [item("Arcane focus")] },
        ],
      },
      {
        id: "pack",
        prompt: "Equipment pack",
        options: [
          { label: "Scholar's pack", items: [pack("Scholar's pack")] },
          { label: "Dungeoneer's pack", items: [pack("Dungeoneer's pack")] },
        ],
      },
    ],
    fixed: [
      item("Leather armor"),
      item("Simple weapon", 1, "Player's choice"),
      item("Dagger", 2),
    ],
  },
  Wizard: {
    choices: [
      {
        id: "weapon",
        prompt: "Weapon",
        options: [
          { label: "Quarterstaff", items: [item("Quarterstaff")] },
          { label: "Dagger", items: [item("Dagger")] },
        ],
      },
      {
        id: "focus",
        prompt: "Spellcasting focus",
        options: [
          { label: "Component pouch", items: [item("Component pouch")] },
          { label: "Arcane focus", items: [item("Arcane focus")] },
        ],
      },
    ],
    fixed: [pack("Scholar's pack"), item("Spellbook")],
  },
};

/** PHB background equipment (p. 125–141). */
export const BACKGROUND_STARTING_GEAR: Record<string, StartingGearItem[]> = {
  Acolyte: [
    item("Holy symbol"),
    item("Prayer book or prayer wheel"),
    item("Incense sticks", 5),
    item("Vestments"),
    item("Common clothes"),
    item("Gold pieces", 15, "Belt pouch"),
  ],
  Charlatan: [
    item("Fine clothes"),
    item("Disguise kit"),
    item("Tools of the con", 1, "Forgery kit"),
    item("Gold pieces", 15, "Belt pouch"),
  ],
  Criminal: [
    item("Crowbar"),
    item("Dark common clothes with hood"),
    item("Gold pieces", 15, "Belt pouch"),
  ],
  Entertainer: [
    item("Costume"),
    item("Favor from an admirer"),
    item("Gold pieces", 15, "Belt pouch"),
  ],
  "Folk Hero": [
    item("Artisan's tools", 1, "Player's choice"),
    item("Shovel"),
    item("Iron pot"),
    item("Common clothes"),
    item("Gold pieces", 10, "Belt pouch"),
  ],
  "Guild Artisan": [
    item("Artisan's tools", 1, "Player's choice"),
    item("Letter of introduction from guild"),
    item("Traveler's clothes"),
    item("Gold pieces", 15, "Belt pouch"),
  ],
  Hermit: [
    item("Scroll case"),
    item("Winter blanket"),
    item("Herbalism kit"),
    item("Common clothes"),
    item("Gold pieces", 5, "Belt pouch"),
  ],
  Noble: [
    item("Fine clothes"),
    item("Signet ring"),
    item("Scroll of pedigree"),
    item("Gold pieces", 25, "Belt pouch"),
  ],
  Outlander: [
    item("Staff"),
    item("Hunting trap"),
    item("Trophy from an animal"),
    item("Traveler's clothes"),
    item("Gold pieces", 10, "Belt pouch"),
  ],
  Sage: [
    item("Ink bottle"),
    item("Quill"),
    item("Small knife"),
    item("Letter from a dead colleague"),
    item("Common clothes"),
    item("Gold pieces", 10, "Belt pouch"),
  ],
  Sailor: [
    item("Belaying pin"),
    item("Silk rope", 1, "50 feet"),
    item("Lucky charm"),
    item("Common clothes"),
    item("Gold pieces", 10, "Belt pouch"),
  ],
  Soldier: [
    item("Insignia of rank"),
    item("Trophy from a fallen enemy"),
    item("Deck of cards or bone set"),
    item("Common clothes"),
    item("Gold pieces", 10, "Belt pouch"),
  ],
  Urchin: [
    item("Small knife"),
    item("Map of your home city"),
    item("Pet mouse"),
    item("Token from parents"),
    item("Common clothes"),
    item("Gold pieces", 10, "Belt pouch"),
  ],
};

export function getClassEquipmentDefinition(
  cls: string,
): ClassEquipmentDefinition | undefined {
  return CLASS_STARTING_EQUIPMENT[cls as CharacterClass];
}

export function defaultClassEquipmentChoices(cls: string): Record<string, number> {
  const def = getClassEquipmentDefinition(cls);
  if (!def) return {};
  const choices: Record<string, number> = {};
  for (const group of def.choices) {
    choices[group.id] = 0;
  }
  return choices;
}

export function resolveClassEquipment(
  cls: string,
  choiceIndexes: Record<string, number>,
): StartingGearItem[] {
  const def = getClassEquipmentDefinition(cls);
  if (!def) {
    return [item("Basic adventuring gear")];
  }

  const resolved: StartingGearItem[] = [];

  for (const group of def.choices) {
    const index = choiceIndexes[group.id] ?? 0;
    const pick = group.options[Math.min(Math.max(0, index), group.options.length - 1)];
    if (pick) {
      resolved.push(...pick.items);
    }
  }

  resolved.push(...def.fixed);
  return resolved;
}

export function resolveBackgroundEquipment(background: string): StartingGearItem[] {
  return BACKGROUND_STARTING_GEAR[background] ?? [];
}
