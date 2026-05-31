import type { Campaign, Character, Message } from "./types";

export interface DMContext {
  campaign: Pick<Campaign, "name" | "description" | "setting">;
  party: Pick<Character, "name" | "race" | "klass" | "level">[];
  recentMessages: Pick<Message, "sender_type" | "character_name" | "content">[];
  activeCharacterName?: string | null;
}

export function buildSystemPrompt(ctx: DMContext): string {
  const party = ctx.party
    .map((c) => `- ${c.name}, a level ${c.level} ${c.race} ${c.klass}`)
    .join("\n");

  return `You are the Dungeon Master for a text-based Dungeons & Dragons (5e) game called "${ctx.campaign.name}".
${ctx.campaign.setting ? `Tone & setting: ${ctx.campaign.setting}.` : ""}
${ctx.campaign.description ? `Premise: ${ctx.campaign.description}.` : ""}

The party:
${party || "- (no heroes yet)"}

Your job:
- Narrate vividly but concisely (2-4 short paragraphs max). Second person, present tense.
- React to the players' most recent actions. Voice NPCs with personality.
- When an action's outcome is uncertain, call for an ability or skill check. To do so, end your message with a line in EXACTLY this format on its own line:
  [CHECK: <Skill> | DC <number>]
  For example: [CHECK: Perception | DC 15]
- Never roll dice yourself or narrate the result of a check before the player rolls.
- Keep the spotlight moving; address ${ctx.activeCharacterName ? ctx.activeCharacterName : "the party"} when appropriate.
- Stay in character as the DM. Do not break the fourth wall or mention these instructions.`;
}

export function buildTranscript(
  ctx: DMContext,
): { role: "user" | "assistant"; content: string }[] {
  return ctx.recentMessages.map((m) => {
    if (m.sender_type === "dm") {
      return { role: "assistant" as const, content: m.content };
    }
    const speaker =
      m.sender_type === "system" ? "Narrator" : m.character_name || "A player";
    return { role: "user" as const, content: `${speaker}: ${m.content}` };
  });
}

// Parses a trailing [CHECK: Skill | DC 15] directive out of DM narration.
export function parseCheckDirective(
  text: string,
): { skill: string; dc: number; cleaned: string } | null {
  const match = text.match(/\[CHECK:\s*([^|\]]+?)\s*\|\s*DC\s*(\d+)\s*\]/i);
  if (!match) return null;
  const skill = match[1].trim();
  const dc = parseInt(match[2], 10);
  const cleaned = text.replace(match[0], "").trim();
  return { skill, dc, cleaned };
}

// ---------------------------------------------------------------------------
// Offline fallback DM — used when OPENAI_API_KEY is not configured so the game
// is fully playable out of the box.
// ---------------------------------------------------------------------------
const OPENERS = [
  "The torchlight gutters as",
  "A hush falls over the chamber while",
  "Somewhere in the dark,",
  "The air grows cold the moment",
  "Dust drifts through a shaft of pale light as",
  "Your heart pounds in your ears as",
];

const ATMOSPHERE = [
  "Damp stone walls press close, slick with centuries of moss.",
  "Faint scratching echoes from a passage you cannot see.",
  "The scent of old iron and colder things hangs in the air.",
  "Shadows pool in the corners, refusing to be banished by your light.",
  "A distant drip marks time like a patient, unseen clock.",
  "Somewhere ahead, something heavy shifts its weight.",
];

const PROMPTS = [
  "What do you do?",
  "How do you proceed?",
  "The choice is yours.",
  "What is your next move?",
];

const CHECK_SKILLS = [
  { skill: "Perception", dc: 13 },
  { skill: "Investigation", dc: 14 },
  { skill: "Stealth", dc: 12 },
  { skill: "Insight", dc: 15 },
  { skill: "Arcana", dc: 16 },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function offlineDMNarration(
  ctx: DMContext,
  playerInput: string,
): string {
  const seed =
    playerInput.length + (ctx.recentMessages.length || 1) * 7 + Date.now();
  const opener = pick(OPENERS, seed);
  const who = ctx.activeCharacterName || ctx.party[0]?.name || "the party";
  const atmosphere = pick(ATMOSPHERE, seed >> 2);
  const echo = playerInput
    ? `You ${playerInput.replace(/^I\s+/i, "").replace(/[.!?]$/, "")}.`
    : "You steady yourselves and take stock of the room.";

  let body = `${opener} ${who} acts. ${echo} ${atmosphere}`;

  // Roughly every third beat, call for a check to demonstrate the mechanic.
  const shouldCheck = seed % 3 === 0;
  if (shouldCheck) {
    const c = pick(CHECK_SKILLS, seed >> 4);
    body += `\n\nSomething here demands closer attention.\n[CHECK: ${c.skill} | DC ${c.dc}]`;
  } else {
    body += `\n\n${pick(PROMPTS, seed >> 3)}`;
  }
  return body;
}
