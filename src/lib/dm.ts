import type { Campaign, Character, Message } from "./types";

export interface DMContext {
  campaign: Pick<Campaign, "name" | "description" | "setting">;
  party: Pick<Character, "name" | "race" | "klass" | "level">[];
  recentMessages: Pick<Message, "sender_type" | "character_name" | "content">[];
  activeCharacterName?: string | null;
}

export interface CheckResultContext {
  characterName: string;
  skill: string;
  dc: number;
  total: number;
  success: boolean;
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
- After a player resolves a check, narrate the success or failure and its consequences before moving on.
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

const OPENING_USER_PROMPT =
  "Begin the adventure. Set the opening scene based on the premise and setting. Introduce the situation the party faces as they arrive. Do not call for a skill check yet — end by inviting the heroes to act.";

export function openingUserPrompt(): string {
  return OPENING_USER_PROMPT;
}

export function checkResultUserPrompt(result: CheckResultContext): string {
  return `${result.characterName} rolled ${result.total} on a ${result.skill} check against DC ${result.dc} — ${result.success ? "SUCCESS" : "FAILURE"}. Narrate what happens as a result of this roll. Do not call for another skill check in this response.`;
}

// ---------------------------------------------------------------------------
// Offline fallback DM — used when OPENAI_API_KEY is not configured so the game
// is fully playable out of the box.
// ---------------------------------------------------------------------------
type CampaignTheme = "crypt" | "road" | "crown" | "generic";

const OPENERS = [
  "The torchlight gutters as",
  "A hush falls over the chamber while",
  "Somewhere in the dark,",
  "The air grows cold the moment",
  "Dust drifts through a shaft of pale light as",
  "Your heart pounds in your ears as",
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

const THEME_ATMOSPHERE: Record<CampaignTheme, string[]> = {
  crypt: [
    "Damp stone sweats beneath your boots; the air tastes of turned earth and old prayers.",
    "Somewhere below, chains whisper against rock — or perhaps it is only the wind lying.",
    "Green-tinged darkness clings to the archway like a living thing.",
  ],
  road: [
    "Ash-scented wind rattles the wagon canvas; the road ahead disappears into haze.",
    "Wheel ruts in the mud tell a story of hurried flight — and something pursuing.",
    "Distant smoke stains the horizon a bruised orange.",
  ],
  crown: [
    "Banners hang limp in a capital holding its breath between hope and civil war.",
    "Court whispers follow you like shadows; every smile hides a knife.",
    "The weight of a broken realm presses on every mile of road you travel.",
  ],
  generic: [
    "Damp stone walls press close, slick with centuries of moss.",
    "Faint scratching echoes from a passage you cannot see.",
    "Shadows pool in the corners, refusing to be banished by your light.",
  ],
};

const ACTION_REACTIONS: Record<string, Record<CampaignTheme, string[]>> = {
  door: {
    crypt: [
      "The iron door groans on rusted hinges, exhaling a breath of cold grave-air.",
      "The lock yields with a wet click; beyond, stairs spiral into utter black.",
    ],
    road: [
      "The bar gives way and daylight spills into a space that should not exist here.",
      "The door swings open onto a hidden cellar stacked with stolen guild crates.",
    ],
    crown: [
      "Ancient wards flicker as the seal breaks — someone will know you entered.",
      "The chamber beyond is silent, as if the castle itself is holding its breath.",
    ],
    generic: [
      "The door yields; beyond it, the unknown waits.",
      "Hinges scream in protest as the way forward opens.",
    ],
  },
  search: {
    crypt: [
      "Your fingers trace symbols carved by hands long since crumbled to dust.",
      "You sift through debris that might once have been a mourner's offering.",
    ],
    road: [
      "You scour the wagon wreckage for anything the raiders missed.",
      "Mud-caked ledgers and broken seals hint at a larger conspiracy.",
    ],
    crown: [
      "You examine the records for the name that keeps surfacing in every rumor.",
      "Hidden compartments and forged seals tell a tale of betrayal at court.",
    ],
    generic: [
      "You search carefully, leaving no stone unturned.",
      "Details emerge from the chaos — some helpful, some troubling.",
    ],
  },
  talk: {
    crypt: [
      "Your words echo off the vault; for a moment, something answers from the deep.",
      "The elder's fear loosens slightly — gratitude and dread war in their eyes.",
    ],
    road: [
      "The merchant's voice steadies as they realize you might actually help.",
      "A guarded confession spills out between clenched teeth.",
    ],
    crown: [
      "The regent's grief cracks open into desperate hope.",
      "A courtier's mask slips, revealing genuine fear beneath the polish.",
    ],
    generic: [
      "Your words land; the scene shifts in response.",
      "Someone listens — and what they say next changes the stakes.",
    ],
  },
  move: {
    crypt: [
      "Each step downward carries cold air up to meet you; the torch shrinks in the widening dark.",
      "The stairs spiral beneath your feet — somewhere below, something shifts in the black.",
      "Stone steps swallow your footfalls; the light above grows weaker with every descent.",
    ],
    road: [
      "The path narrows ahead; mud sucks at your boots with every stride.",
      "You press on — the horizon offers no hint of rest.",
    ],
    crown: [
      "Marble halls give way to older stone; the crown's history weighs on every corridor.",
      "Guards' eyes track your passage; you are expected, but not trusted.",
    ],
    generic: [
      "You press forward; the way opens before you.",
      "Each step carries you deeper into the unknown.",
    ],
  },
  default: {
    crypt: [
      "The crypt answers your boldness with silence — the kind that listens back.",
      "Stone and shadow react to your move; the adventure tightens around you.",
    ],
    road: [
      "The road throws another hardship at you; the party presses on.",
      "Fortune and danger trade places in the space of a heartbeat.",
    ],
    crown: [
      "The realm's troubles mirror your action — every choice ripples outward.",
      "Politics and peril intertwine as the party acts.",
    ],
    generic: [
      "The world reacts to your choice; the story moves forward.",
      "Consequences gather like storm clouds on the horizon.",
    ],
  },
};

const CHECK_SUCCESS: Record<string, string[]> = {
  Perception: [
    "Your instincts pay off — a detail snaps into focus that everyone else missed.",
    "You catch the subtle wrongness before it becomes a ambush.",
  ],
  Investigation: [
    "The clue was hiding in plain sight; now the path forward is clearer.",
    "Pieces click together — someone went to great lengths to hide this.",
  ],
  Stealth: [
    "You melt into shadow; the danger passes within arm's reach.",
    "Not a board creaks, not a breath betrays you.",
  ],
  Insight: [
    "The mask slips — you see the truth behind the words.",
    "Something in their eyes tells you exactly what they are not saying.",
  ],
  Arcana: [
    "The weave of magic reveals its pattern; you understand what you face.",
    "Runes and resonance align — the spell's nature is laid bare.",
  ],
  default: [
    "Fortune favors you; the attempt succeeds.",
    "Skill and nerve carry the day.",
  ],
};

const CHECK_FAILURE: Record<string, string[]> = {
  Perception: [
    "The shadows keep their secret — something watches, and you do not see it.",
    "You scan the area but the telltale sign eludes you.",
  ],
  Investigation: [
    "The trail goes cold; whatever was here, someone covered their tracks well.",
    "Nothing yields its secret — yet.",
  ],
  Stealth: [
    "A loose stone clatters; heads turn your way.",
    "Your foot finds the one board that groans.",
  ],
  Insight: [
    "Their expression gives away nothing; you cannot read them.",
    "The lie holds — for now.",
  ],
  Arcana: [
    "The magic resists your understanding; it writhes away from your grasp.",
    "The symbols swim before your eyes, refusing to resolve.",
  ],
  default: [
    "The attempt falls short; the obstacle remains.",
    "Close, perhaps — but not enough.",
  ],
};

function pick<T>(arr: T[], seed: number): T {
  const index = ((Math.trunc(seed) % arr.length) + arr.length) % arr.length;
  return arr[index]!;
}

function pickFresh(arr: string[], seed: number, recentText: string): string {
  const fresh = arr.filter((line) => !recentText.includes(line));
  return pick(fresh.length > 0 ? fresh : arr, seed);
}

function recentDmText(ctx: DMContext): string {
  return ctx.recentMessages
    .filter((m) => m.sender_type === "dm")
    .map((m) => m.content)
    .join("\n");
}

function narrationSeed(playerInput: string, messageCount: number): number {
  return (
    playerInput.length * 31 +
    messageCount * 17 +
    (Date.now() % 1_000_000_007)
  );
}

function inferTheme(ctx: DMContext): CampaignTheme {
  const text =
    `${ctx.campaign.name} ${ctx.campaign.description ?? ""} ${ctx.campaign.setting ?? ""}`.toLowerCase();
  if (/crypt|undead|hollow|lantern|buried|grave|village/.test(text)) {
    return "crypt";
  }
  if (/trade|caravan|road|ember|fire|cult|merchant/.test(text)) {
    return "road";
  }
  if (/crown|kingdom|realm|shard|throne|regent|duke/.test(text)) {
    return "crown";
  }
  return "generic";
}

function actionCategory(input: string): keyof typeof ACTION_REACTIONS {
  const lower = input.toLowerCase();
  if (
    /go down|head down|descend|climb down|walk down|step down|down the stairs|down the steps|down into|proceed down|continue down|move down|go deeper|venture down/.test(
      lower,
    ) ||
    (/stairs|steps|ladder|passage|corridor|tunnel|hallway/.test(lower) &&
      /go|walk|head|move|step|descend|enter|continue|proceed|venture/.test(
        lower,
      ) &&
      !/open|unlock|key/.test(lower))
  ) {
    return "move";
  }
  if (/open|unlock|key|door|gate|bar|latch/.test(lower)) return "door";
  if (/search|inspect|examine|look|study|read|investigate/.test(lower)) {
    return "search";
  }
  if (/talk|speak|ask|tell|persuade|convince|greet|question/.test(lower)) {
    return "talk";
  }
  return "default";
}

/** Turn "I open the door" into second-person DM narration: "You open the door". */
function formatPlayerEcho(input: string): string {
  const trimmed = input.trim().replace(/[.!?]+$/, "");
  if (/^I['']m\s+/i.test(trimmed)) {
    return `You're ${trimmed.replace(/^I['']m\s+/i, "")}`;
  }
  if (/^I\s+/i.test(trimmed)) {
    return `You ${trimmed.replace(/^I\s+/i, "")}`;
  }
  if (/^you\s+/i.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return `You ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

function shouldCallForCheck(input: string, seed: number): boolean {
  const lower = input.toLowerCase();
  if (actionCategory(input) === "move" && /dark|stairs|descend|black|shadow/.test(lower)) {
    return seed % 3 === 0;
  }
  const risky =
    /search|inspect|sneak|listen|pick|lock|trap|climb|track|hide|arcane|read|study|examine|look closely|investigate/.test(
      lower,
    );
  if (risky) return seed % 2 === 0;
  return seed % 6 === 0;
}

export function offlineOpeningNarration(ctx: DMContext): string {
  const theme = inferTheme(ctx);
  const seed =
    (ctx.campaign.name?.length ?? 0) * 11 +
    (ctx.campaign.description?.length ?? 0) * 3 +
    ctx.party.length * 17;
  const atmosphere = pick(THEME_ATMOSPHERE[theme], seed + 1);
  const who =
    ctx.party.length > 1
      ? "The party gathers"
      : ctx.party[0]?.name
        ? `${ctx.party[0].name} arrives`
        : "You arrive";
  const premise =
    ctx.campaign.description?.trim() ||
    ctx.campaign.setting?.trim() ||
    "A new adventure beckons from the shadows.";

  return `${pick(OPENERS, seed)} ${who} at the threshold of "${ctx.campaign.name}".\n\n${premise}\n\n${atmosphere}\n\n${pick(PROMPTS, seed + 2)}`;
}

export function offlineCheckResultNarration(
  ctx: DMContext,
  result: CheckResultContext,
): string {
  const theme = inferTheme(ctx);
  const seed = narrationSeed(`${result.total}-${result.skill}`, ctx.recentMessages.length);
  const outcomes = result.success
    ? (CHECK_SUCCESS[result.skill] ?? CHECK_SUCCESS.default)
    : (CHECK_FAILURE[result.skill] ?? CHECK_FAILURE.default);
  const outcome = pick(outcomes, seed);
  const margin = result.total - result.dc;
  const close = !result.success && margin >= -2;
  const possessive =
    ctx.activeCharacterName &&
    result.characterName.toLowerCase() === ctx.activeCharacterName.toLowerCase()
      ? "Your"
      : `${result.characterName}'s`;

  let body = `${possessive} ${result.skill} check ${result.success ? "succeeds" : "fails"} (${result.total} vs DC ${result.dc}). ${outcome}`;

  if (close) {
    body += " You were so close — the margin between triumph and disaster was razor-thin.";
  }

  if (result.success) {
    body += `\n\n${pickFresh(THEME_ATMOSPHERE[theme], seed + 2, recentDmText(ctx))}`;
  } else {
    body += `\n\n${pickFresh(ACTION_REACTIONS.default[theme], seed + 3, recentDmText(ctx))}`;
  }

  body += `\n\n${pick(PROMPTS, seed + 4)}`;
  return body;
}

export function offlineDMNarration(
  ctx: DMContext,
  playerInput: string,
): string {
  const theme = inferTheme(ctx);
  const seed = narrationSeed(playerInput, ctx.recentMessages.length || 1);
  const recentText = recentDmText(ctx);
  const category = actionCategory(playerInput);
  const reaction = pickFresh(ACTION_REACTIONS[category][theme], seed + 1, recentText);
  const atmosphere = pickFresh(THEME_ATMOSPHERE[theme], seed + 2, recentText);

  const echo = playerInput
    ? `${formatPlayerEcho(playerInput)}.`
    : "You steady yourself and take stock of the situation.";

  let body = `${echo}\n\n${reaction}`;
  if (!body.includes(atmosphere.slice(0, 24))) {
    body += ` ${atmosphere}`;
  }

  if (shouldCallForCheck(playerInput, seed)) {
    const c = pick(CHECK_SKILLS, seed + 3);
    body += `\n\nThe moment calls for a test of skill.\n[CHECK: ${c.skill} | DC ${c.dc}]`;
  } else {
    body += `\n\n${pick(PROMPTS, seed + 4)}`;
  }
  return body;
}
