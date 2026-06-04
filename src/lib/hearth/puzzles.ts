import { dayIndexForPool, hearthDayKey } from "./day-key";

export interface HearthPuzzle {
  id: string;
  prompt: string;
  options: string[];
  /** Index into options. */
  correctIndex: number;
}

export const HEARTH_PUZZLES: HearthPuzzle[] = [
  {
    id: "odd-weapon",
    prompt: "Which item is NOT a simple melee weapon in the PHB?",
    options: ["Dagger", "Mace", "Longbow", "Club"],
    correctIndex: 2,
  },
  {
    id: "odd-armor",
    prompt: "Which armor is light armor?",
    options: ["Chain mail", "Leather", "Plate", "Splint"],
    correctIndex: 1,
  },
  {
    id: "dice-avg",
    prompt: "What is the average roll of a fair d20?",
    options: ["9", "10.5", "11", "12"],
    correctIndex: 1,
  },
  {
    id: "con-mod",
    prompt: "Ability score 14 gives what modifier?",
    options: ["+1", "+2", "+3", "+4"],
    correctIndex: 1,
  },
  {
    id: "proficiency",
    prompt: "At level 5, proficiency bonus is…",
    options: ["+2", "+3", "+4", "+5"],
    correctIndex: 1,
  },
  {
    id: "healing-potion",
    prompt: "A standard Potion of Healing restores…",
    options: ["1d4+1", "2d4+2", "4d4+4", "8d4+8"],
    correctIndex: 1,
  },
  {
    id: "ac-unarmored",
    prompt: "Default unarmored AC (no shield) is…",
    options: ["8 + Dex", "10 + Dex", "11 + Dex", "12 + Dex"],
    correctIndex: 1,
  },
  {
    id: "spell-slot-1",
    prompt: "A 1st-level spell uses a spell slot of level…",
    options: ["Cantrip", "1st", "2nd", "Any"],
    correctIndex: 1,
  },
  {
    id: "initiative",
    prompt: "Initiative is rolled with…",
    options: ["d6", "d10", "d20", "d100"],
    correctIndex: 2,
  },
  {
    id: "short-rest",
    prompt: "A short rest is at least how many minutes?",
    options: ["10", "30", "60", "480"],
    correctIndex: 2,
  },
  {
    id: "long-rest",
    prompt: "A long rest is at least how many hours?",
    options: ["4", "6", "8", "24"],
    correctIndex: 2,
  },
  {
    id: "crit",
    prompt: "A natural 20 on an attack roll is typically…",
    options: ["Auto miss", "Critical hit", "Free action", "Max HP"],
    correctIndex: 1,
  },
  {
    id: "gold-pp",
    prompt: "How many gold pieces equal one platinum piece?",
    options: ["5", "10", "20", "100"],
    correctIndex: 1,
  },
  {
    id: "torch",
    prompt: "Bright light from a typical torch reaches…",
    options: ["5 ft", "20 ft", "60 ft", "120 ft"],
    correctIndex: 1,
  },
  {
    id: "stealth",
    prompt: "Stealth is a check using…",
    options: ["Strength", "Dexterity", "Wisdom", "Charisma"],
    correctIndex: 1,
  },
  {
    id: "perception",
    prompt: "Passive Perception equals 10 + …",
    options: ["Stealth", "Perception modifier", "Investigation", "Insight"],
    correctIndex: 1,
  },
  {
    id: "rage",
    prompt: "Which class has the Rage feature?",
    options: ["Fighter", "Barbarian", "Monk", "Paladin"],
    correctIndex: 1,
  },
  {
    id: "sneak",
    prompt: "Sneak Attack is a hallmark of the…",
    options: ["Ranger", "Rogue", "Bard", "Cleric"],
    correctIndex: 1,
  },
  {
    id: "lay-hands",
    prompt: "Lay on Hands is used by…",
    options: ["Cleric", "Paladin", "Druid", "Warlock"],
    correctIndex: 1,
  },
  {
    id: "wild-shape",
    prompt: "Wild Shape belongs to the…",
    options: ["Ranger", "Druid", "Sorcerer", "Wizard"],
    correctIndex: 1,
  },
  {
    id: "second-wind",
    prompt: "Second Wind is a feature of the…",
    options: ["Fighter", "Barbarian", "Monk", "Rogue"],
    correctIndex: 0,
  },
  {
    id: "bardic",
    prompt: "Bardic Inspiration comes from the…",
    options: ["Bard", "Warlock", "Cleric", "Fighter"],
    correctIndex: 0,
  },
  {
    id: "death-save",
    prompt: "How many death save successes stabilize you?",
    options: ["1", "2", "3", "5"],
    correctIndex: 2,
  },
  {
    id: "exhaustion",
    prompt: "Exhaustion levels cap at…",
    options: ["3", "5", "6", "10"],
    correctIndex: 2,
  },
  {
    id: "concentration",
    prompt: "Concentration is broken by taking damage and failing a Con save against DC…",
    options: ["5", "10 or half damage", "15", "20"],
    correctIndex: 1,
  },
  {
    id: "opportunity",
    prompt: "Leaving an enemy's reach without Disengage often provokes…",
    options: ["Bonus attack", "Opportunity attack", "Counterspell", "Reaction heal"],
    correctIndex: 1,
  },
  {
    id: "cover-half",
    prompt: "Half cover grants a bonus to AC and Dex saves of…",
    options: ["+1", "+2", "+5", "+10"],
    correctIndex: 1,
  },
  {
    id: "invisible",
    prompt: "Attack rolls against an invisible creature have…",
    options: ["Advantage", "Disadvantage", "Auto hit", "No modifier"],
    correctIndex: 1,
  },
  {
    id: "prone",
    prompt: "Melee attacks against a prone target have…",
    options: ["Advantage", "Disadvantage", "No effect", "Auto crit"],
    correctIndex: 0,
  },
  {
    id: "grapple",
    prompt: "Grappling usually uses an Athletics check contested by…",
    options: ["Acrobatics or Athletics", "Stealth", "Insight", "Arcana"],
    correctIndex: 0,
  },
  {
    id: "identify",
    prompt: "The Identify spell is typically…",
    options: ["Cantrip", "1st level", "3rd level", "9th level"],
    correctIndex: 1,
  },
  {
    id: "bag-holding",
    prompt: "A Bag of Holding is commonly considered…",
    options: ["Common", "Uncommon", "Rare", "Legendary"],
    correctIndex: 1,
  },
];

export function puzzleForDay(dayKey = hearthDayKey()): HearthPuzzle {
  const idx = dayIndexForPool(dayKey, HEARTH_PUZZLES.length);
  return HEARTH_PUZZLES[idx]!;
}
