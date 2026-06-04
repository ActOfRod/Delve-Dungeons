import { dayIndexForPool, hearthDayKey } from "./day-key";

export interface HearthRiddle {
  id: string;
  prompt: string;
  /** Accepted answers (normalized match). */
  answers: string[];
  hint?: string;
}

export const HEARTH_RIDDLES: HearthRiddle[] = [
  {
    id: "footsteps",
    prompt:
      "The more of me you take, the more you leave behind. What am I?",
    answers: ["footsteps", "footstep", "steps"],
  },
  {
    id: "map",
    prompt:
      "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
    answers: ["map", "a map"],
  },
  {
    id: "echo",
    prompt: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
    answers: ["echo", "an echo"],
  },
  {
    id: "candle",
    prompt: "I'm tall when I'm young, and short when I'm old. What am I?",
    answers: ["candle", "a candle"],
  },
  {
    id: "coin",
    prompt: "I have a head and a tail, but no body. What am I?",
    answers: ["coin", "a coin"],
  },
  {
    id: "keyboard",
    prompt: "I have keys but no locks. I have space but no room. You can enter, but you can't go outside. What am I?",
    answers: ["keyboard", "a keyboard"],
  },
  {
    id: "river",
    prompt: "I can run but never walk. I have a mouth but never talk. I have a bed but never sleep. What am I?",
    answers: ["river", "a river"],
  },
  {
    id: "towel",
    prompt: "What gets wetter the more it dries?",
    answers: ["towel", "a towel"],
  },
  {
    id: "spell",
    prompt: "What is always in front of you but can't be seen?",
    answers: ["future", "the future"],
    hint: "Think of time, not magic.",
  },
  {
    id: "charcoal",
    prompt: "I'm black when I'm clean and white when I'm dirty. What am I?",
    answers: ["chalkboard", "blackboard", "charcoal", "chalk"],
    hint: "Found in a classroom.",
  },
  {
    id: "teapot",
    prompt: "What begins with T, ends with T, and has T in it?",
    answers: ["teapot", "a teapot"],
  },
  {
    id: "age",
    prompt: "What goes up but never comes down?",
    answers: ["age", "your age"],
  },
  {
    id: "stamp",
    prompt: "What can travel around the world while staying in a corner?",
    answers: ["stamp", "a stamp", "postage stamp"],
  },
  {
    id: "fire",
    prompt: "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?",
    answers: ["fire", "a fire", "flame"],
  },
  {
    id: "secret",
    prompt: "If you have me, you want to share me. If you share me, you haven't got me. What am I?",
    answers: ["secret", "a secret"],
  },
  {
    id: "clock",
    prompt: "What has hands but can't clap?",
    answers: ["clock", "a clock", "watch"],
  },
  {
    id: "hole",
    prompt: "What gets bigger the more you take away from it?",
    answers: ["hole", "a hole"],
  },
  {
    id: "mushroom",
    prompt: "What kind of room has no doors or windows?",
    answers: ["mushroom", "a mushroom"],
  },
  {
    id: "table",
    prompt: "What has four legs but can't walk?",
    answers: ["table", "a table", "chair"],
  },
  {
    id: "cloud",
    prompt: "I hold water but I'm not a jar. I float above the realm. What am I?",
    answers: ["cloud", "a cloud", "clouds"],
  },
  {
    id: "grave",
    prompt: "What is the beginning of eternity, the end of time, the start of every end, and the end of every place?",
    answers: ["letter e", "e", "the letter e"],
  },
  {
    id: "riddle",
    prompt: "What belongs to you but others use it more than you do?",
    answers: ["name", "your name"],
  },
  {
    id: "glove",
    prompt: "What has five fingers but is not alive?",
    answers: ["glove", "a glove"],
  },
  {
    id: "coffin",
    prompt: "The person who makes it sells it. The person who buys it never uses it. The person who uses it never knows they're using it. What is it?",
    answers: ["coffin", "a coffin"],
  },
  {
    id: "needle",
    prompt: "What has one eye but can't see?",
    answers: ["needle", "a needle", "hurricane"],
    hint: "Sewing or weather.",
  },
  {
    id: "shadow",
    prompt: "I follow you all day and vanish in the night. What am I?",
    answers: ["shadow", "a shadow"],
  },
  {
    id: "keyboard2",
    prompt: "What has many teeth but cannot bite?",
    answers: ["comb", "a comb", "saw", "gear"],
  },
  {
    id: "egg",
    prompt: "What must be broken before you can use it?",
    answers: ["egg", "an egg"],
  },
  {
    id: "bottle",
    prompt: "What has a neck but no head?",
    answers: ["bottle", "a bottle", "guitar"],
  },
  {
    id: "darkness",
    prompt: "The more there is of me, the less you see. What am I?",
    answers: ["darkness", "dark", "fog"],
  },
  {
    id: "piano",
    prompt: "What has keys but can't open locks?",
    answers: ["piano", "a piano", "keyboard"],
  },
  {
    id: "towel2",
    prompt: "I am taken from a mine and shut in a wooden case, from which I am never released, yet I am used by almost everyone. What am I?",
    answers: ["pencil lead", "graphite", "lead", "pencil"],
  },
];

export function riddleForDay(dayKey = hearthDayKey()): HearthRiddle {
  const idx = dayIndexForPool(dayKey, HEARTH_RIDDLES.length);
  return HEARTH_RIDDLES[idx]!;
}
