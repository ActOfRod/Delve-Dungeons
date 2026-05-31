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
};

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
