// Core Dungeons & Dragons domain helpers: dice, classes, races, ability scores.

export type DieType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

export const DICE: DieType[] = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

export const DIE_SIDES: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

export const CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const;
export type CharacterClass = (typeof CLASSES)[number];

export const RACES = [
  "Human",
  "Elf",
  "Dwarf",
  "Halfling",
  "Dragonborn",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Tiefling",
] as const;
export type CharacterRace = (typeof RACES)[number];

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITIES: { key: AbilityKey; label: string; short: string }[] = [
  { key: "str", label: "Strength", short: "STR" },
  { key: "dex", label: "Dexterity", short: "DEX" },
  { key: "con", label: "Constitution", short: "CON" },
  { key: "int", label: "Intelligence", short: "INT" },
  { key: "wis", label: "Wisdom", short: "WIS" },
  { key: "cha", label: "Charisma", short: "CHA" },
];

export type AbilityScores = Record<AbilityKey, number>;

export const DEFAULT_ABILITIES: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

// Maps the common D&D 5e skills to their governing ability.
export const SKILLS: { name: string; ability: AbilityKey }[] = [
  { name: "Acrobatics", ability: "dex" },
  { name: "Animal Handling", ability: "wis" },
  { name: "Arcana", ability: "int" },
  { name: "Athletics", ability: "str" },
  { name: "Deception", ability: "cha" },
  { name: "History", ability: "int" },
  { name: "Insight", ability: "wis" },
  { name: "Intimidation", ability: "cha" },
  { name: "Investigation", ability: "int" },
  { name: "Medicine", ability: "wis" },
  { name: "Nature", ability: "int" },
  { name: "Perception", ability: "wis" },
  { name: "Performance", ability: "cha" },
  { name: "Persuasion", ability: "cha" },
  { name: "Religion", ability: "int" },
  { name: "Sleight of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" },
  { name: "Survival", ability: "wis" },
];

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function proficiencyBonus(level: number): number {
  return Math.floor((Math.max(1, level) - 1) / 4) + 2;
}

export interface RollResult {
  die: DieType;
  count: number;
  rolls: number[];
  modifier: number;
  total: number;
}

// Cryptographically-seeded-enough dice for a game; uses crypto when available.
function randomInt(maxExclusive: number): number {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

export function rollDie(die: DieType): number {
  return randomInt(DIE_SIDES[die]) + 1;
}

export function rollDice(die: DieType, count = 1, modifier = 0): RollResult {
  const rolls: number[] = [];
  for (let i = 0; i < Math.max(1, count); i++) {
    rolls.push(rollDie(die));
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { die, count: Math.max(1, count), rolls, modifier, total };
}

export interface SkillCheckOutcome extends RollResult {
  dc: number;
  success: boolean;
  natural20: boolean;
  natural1: boolean;
}

// A d20 skill check against a difficulty class.
export function rollSkillCheck(modifier: number, dc: number): SkillCheckOutcome {
  const base = rollDie("d20");
  const total = base + modifier;
  return {
    die: "d20",
    count: 1,
    rolls: [base],
    modifier,
    total,
    dc,
    success: total >= dc,
    natural20: base === 20,
    natural1: base === 1,
  };
}

// Difficulty class presets used by the AI DM and manual check requests.
export const DC_PRESETS = [
  { label: "Very Easy", dc: 5 },
  { label: "Easy", dc: 10 },
  { label: "Medium", dc: 15 },
  { label: "Hard", dc: 20 },
  { label: "Very Hard", dc: 25 },
  { label: "Nearly Impossible", dc: 30 },
];

const HIT_DIE_BY_CLASS: Partial<Record<CharacterClass, number>> = {
  Barbarian: 12,
  Fighter: 10,
  Paladin: 10,
  Ranger: 10,
  Bard: 8,
  Cleric: 8,
  Druid: 8,
  Monk: 8,
  Rogue: 8,
  Warlock: 8,
  Sorcerer: 6,
  Wizard: 6,
  Wizard: 6,
};

export const STANDARD_ARRAY_VALUES = [15, 14, 13, 12, 10, 8] as const;

export type AbilityGenMethod = "pointbuy" | "standard" | "roll";

export const POINT_BUY_TOTAL = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

export const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export interface BackgroundDefinition {
  name: string;
  skills: [string, string];
  tools: string;
  feature: string;
}

export const BACKGROUNDS: BackgroundDefinition[] = [
  { name: "Acolyte", skills: ["Insight", "Religion"], tools: "Holy symbol", feature: "Shelter of the Faithful" },
  { name: "Charlatan", skills: ["Deception", "Sleight of Hand"], tools: "Disguise kit, forgery kit", feature: "False Identity" },
  { name: "Criminal", skills: ["Deception", "Stealth"], tools: "Thieves' tools, gaming set", feature: "Criminal Contact" },
  { name: "Entertainer", skills: ["Acrobatics", "Performance"], tools: "Musical instrument", feature: "By Popular Demand" },
  { name: "Folk Hero", skills: ["Animal Handling", "Survival"], tools: "Artisan's tools, vehicles (land)", feature: "Rustic Hospitality" },
  { name: "Guild Artisan", skills: ["Insight", "Persuasion"], tools: "Artisan's tools", feature: "Guild Membership" },
  { name: "Hermit", skills: ["Medicine", "Religion"], tools: "Herbalism kit", feature: "Discovery" },
  { name: "Noble", skills: ["History", "Persuasion"], tools: "Gaming set", feature: "Position of Privilege" },
  { name: "Outlander", skills: ["Athletics", "Survival"], tools: "Musical instrument", feature: "Wanderer" },
  { name: "Sage", skills: ["Arcana", "History"], tools: "Two languages", feature: "Researcher" },
  { name: "Sailor", skills: ["Athletics", "Perception"], tools: "Navigator's tools, vehicles (water)", feature: "Ship's Passage" },
  { name: "Soldier", skills: ["Athletics", "Intimidation"], tools: "Gaming set, vehicles (land)", feature: "Military Rank" },
  { name: "Urchin", skills: ["Sleight of Hand", "Stealth"], tools: "Disguise kit, thieves' tools", feature: "City Secrets" },
];

export function getBackground(name: string): BackgroundDefinition | undefined {
  return BACKGROUNDS.find((b) => b.name === name);
}

export function pointBuySpent(scores: AbilityScores): number {
  return ABILITIES.reduce(
    (sum, ability) => sum + (POINT_BUY_COST[scores[ability.key]] ?? 99),
    0,
  );
}

export function isValidPointBuy(scores: AbilityScores): boolean {
  for (const ability of ABILITIES) {
    const score = scores[ability.key];
    if (score < POINT_BUY_MIN || score > POINT_BUY_MAX) return false;
    if (!(score in POINT_BUY_COST)) return false;
  }
  return pointBuySpent(scores) <= POINT_BUY_TOTAL;
}

export function isValidStandardArray(scores: AbilityScores): boolean {
  const got = ABILITIES.map((a) => scores[a.key]).sort((a, b) => b - a);
  if (got.some((value) => value < 1)) return false;
  const want = [...STANDARD_ARRAY_VALUES].sort((a, b) => b - a);
  return got.every((value, index) => value === want[index]);
}

export function isValidRolledArray(scores: AbilityScores, pool: number[]): boolean {
  if (pool.length !== 6) return false;
  const got = ABILITIES.map((a) => scores[a.key]).sort((a, b) => b - a);
  const want = [...pool].sort((a, b) => b - a);
  return got.every((value, index) => value === want[index]);
}

export function rollFourDropLowest(): number {
  const rolls = [rollDie("d6"), rollDie("d6"), rollDie("d6"), rollDie("d6")];
  rolls.sort((a, b) => b - a);
  return rolls[0] + rolls[1] + rolls[2];
}

export function rollAbilityScoreSet(): number[] {
  return Array.from({ length: 6 }, () => rollFourDropLowest());
}

export function getRacialBonuses(
  race: string,
  halfElfChoices?: [AbilityKey, AbilityKey],
): Partial<AbilityScores> {
  switch (race) {
    case "Human":
      return { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 };
    case "Elf":
      return { dex: 2 };
    case "Dwarf":
      return { con: 2 };
    case "Halfling":
      return { dex: 2 };
    case "Dragonborn":
      return { str: 2, cha: 1 };
    case "Gnome":
      return { int: 2 };
    case "Half-Elf": {
      const bonuses: Partial<AbilityScores> = { cha: 2 };
      if (halfElfChoices) {
        for (const key of halfElfChoices) {
          bonuses[key] = (bonuses[key] ?? 0) + 1;
        }
      }
      return bonuses;
    }
    case "Half-Orc":
      return { str: 2, con: 1 };
    case "Tiefling":
      return { cha: 2, int: 1 };
    default:
      return {};
  }
}

export function applyRacialBonuses(
  base: AbilityScores,
  race: string,
  halfElfChoices?: [AbilityKey, AbilityKey],
): AbilityScores {
  const bonuses = getRacialBonuses(race, halfElfChoices);
  const final = { ...base };
  for (const ability of ABILITIES) {
    final[ability.key] = Math.min(20, base[ability.key] + (bonuses[ability.key] ?? 0));
  }
  return final;
}

export function unarmoredAc(dex: number): number {
  return 10 + abilityModifier(dex);
}

const STARTING_GOLD_FORMULA: Partial<
  Record<CharacterClass, { dice: number; sides: number; multiplier: number }>
> = {
  Barbarian: { dice: 2, sides: 4, multiplier: 10 },
  Bard: { dice: 5, sides: 4, multiplier: 10 },
  Cleric: { dice: 5, sides: 4, multiplier: 10 },
  Druid: { dice: 2, sides: 4, multiplier: 10 },
  Fighter: { dice: 5, sides: 4, multiplier: 10 },
  Monk: { dice: 5, sides: 4, multiplier: 1 },
  Paladin: { dice: 5, sides: 4, multiplier: 10 },
  Ranger: { dice: 5, sides: 4, multiplier: 10 },
  Rogue: { dice: 4, sides: 4, multiplier: 10 },
  Sorcerer: { dice: 3, sides: 4, multiplier: 10 },
  Warlock: { dice: 4, sides: 4, multiplier: 10 },
  Wizard: { dice: 4, sides: 4, multiplier: 10 },
};

export function rollStartingGold(cls: string): { gp: number; notation: string } {
  const formula = STARTING_GOLD_FORMULA[cls as CharacterClass] ?? {
    dice: 4,
    sides: 4,
    multiplier: 10,
  };
  const rolls: number[] = [];
  for (let i = 0; i < formula.dice; i += 1) {
    rolls.push(randomInt(formula.sides) + 1);
  }
  const gp = rolls.reduce((a, b) => a + b, 0) * formula.multiplier;
  const notation =
    formula.multiplier === 1
      ? `${formula.dice}d${formula.sides}`
      : `${formula.dice}d${formula.sides} × ${formula.multiplier}`;
  return { gp, notation: `${notation} = ${gp} gp` };
}

const CLASS_STARTER_KITS: Partial<Record<CharacterClass, string[]>> = {
  Barbarian: ["Greataxe or martial weapon", "Two handaxes", "Explorer's pack", "Four javelins"],
  Bard: ["Rapier or longsword", "Diplomat's pack or entertainer's pack", "Lute or musical instrument", "Leather armor, dagger"],
  Cleric: ["Mace or warhammer", "Scale mail or leather armor", "Light crossbow", "Priest's pack", "Shield, holy symbol"],
  Druid: ["Wooden shield", "Scimitar", "Leather armor", "Explorer's pack", "Druidic focus"],
  Fighter: ["Chain mail or leather armor", "Martial weapon and shield", "Light crossbow", "Dungeoneer's pack"],
  Monk: ["Shortsword", "Dungeoneer's pack", "Ten darts"],
  Paladin: ["Martial weapon and shield", "Five javelins", "Priest's pack", "Chain mail", "Holy symbol"],
  Ranger: ["Scale mail or leather armor", "Two shortswords", "Dungeoneer's pack", "Longbow and quiver"],
  Rogue: ["Rapier or shortsword", "Shortbow", "Burglar's pack or dungeoneer's pack", "Leather armor, two daggers, thieves' tools"],
  Sorcerer: ["Light crossbow", "Component pouch or arcane focus", "Dungeoneer's pack", "Two daggers"],
  Warlock: ["Light crossbow", "Component pouch or arcane focus", "Scholar's pack", "Leather armor, dagger"],
  Wizard: ["Quarterstaff or dagger", "Component pouch or arcane focus", "Scholar's pack", "Spellbook"],
};

export function classStarterKit(cls: string): string[] {
  return CLASS_STARTER_KITS[cls as CharacterClass] ?? ["Basic adventuring gear"];
}

export function buildStartingInventory(
  cls: string,
  background: string,
  option: "kit" | "wealth",
  goldRoll?: { gp: number; notation: string },
): { name: string; quantity: number; description?: string }[] {
  const bg = getBackground(background);
  const items: { name: string; quantity: number; description?: string }[] = [];

  if (option === "wealth" && goldRoll) {
    items.push({
      name: "Gold pieces",
      quantity: goldRoll.gp,
      description: `Rolled ${goldRoll.notation}`,
    });
  } else {
    for (const entry of classStarterKit(cls)) {
      items.push({ name: entry, quantity: 1 });
    }
  }

  if (bg) {
    items.push({
      name: `${bg.name} feature`,
      quantity: 1,
      description: bg.feature,
    });
    items.push({
      name: "Background proficiencies",
      quantity: 1,
      description: `${bg.skills.join(", ")} · ${bg.tools}`,
    });
  }

  return items;
}

// Reasonable starting HP for a freshly created character.
export function startingHp(cls: string, con: number): number {
  const hitDie = HIT_DIE_BY_CLASS[cls as CharacterClass] ?? 8;
  return hitDie + abilityModifier(con);
}

const ADVENTURER_TITLES = [
  "the Bold",
  "the Unseen",
  "Stormborn",
  "of the Ember Vale",
  "the Wanderer",
  "Brightblade",
  "the Quiet",
  "Ironfoot",
  "the Cursed",
  "Dawnseeker",
];

export function randomTitle(): string {
  return ADVENTURER_TITLES[Math.floor(Math.random() * ADVENTURER_TITLES.length)];
}

// Six-character human-friendly invite code (no ambiguous characters).
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}
