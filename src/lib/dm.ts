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
  "Begin the adventure at the START of the story — wherever the heroes are when the action first opens, not at a later destination. Use the premise for context but do not quote DM instructions from it (e.g. 'Begin by…', 'Open as…', 'lead them to…'). Set one vivid scene, establish the hook, and invite the heroes to act. Do not call for a skill check yet.";

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
type SceneLocation = "settlement" | "court" | "wilderness" | "dungeon" | "generic";

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

/** Opening mood lines that match WHERE the scene starts, not the adventure theme alone. */
const OPENING_ATMOSPHERE: Record<
  SceneLocation,
  Record<CampaignTheme, string[]>
> = {
  settlement: {
    crypt: [
      "Rain drums the roof while the hearth sputters; locals fall quiet whenever the cliffside crypt is mentioned.",
      "Through the tavern windows, lightning briefly catches the sealed crypt door on the distant cliff.",
      "Ale, wet wool, and nervous laughter — the village pretends tonight is normal, but nobody sleeps easy.",
    ],
    road: [
      "The inn's common room buzzes with travelers' rumors — caravans lost, roads unsafe, coin for those brave enough.",
      "Mud from the road cakes the floorboards; every stranger here has a story and a reason to keep moving.",
    ],
    crown: [
      "Even in this provincial hall, court gossip travels fast — the capital's troubles reach every corner of the realm.",
      "Firelight glints off travel-worn cloaks; everyone here has business with power, one way or another.",
    ],
    generic: [
      "The room hums with low voices and the clink of cups — a calm before whatever comes next.",
      "Firelight throws long shadows; for now, you have a moment to plan.",
    ],
  },
  court: {
    crypt: THEME_ATMOSPHERE.crypt,
    road: THEME_ATMOSPHERE.road,
    crown: [
      "Incense and wax polish cannot mask the grief hanging over the hall.",
      "Guards stand rigid as statues; every word here carries weight.",
      "Mourning banners droop in the draft — the kingdom waits for someone to act.",
    ],
    generic: THEME_ATMOSPHERE.generic,
  },
  wilderness: {
    crypt: THEME_ATMOSPHERE.crypt,
    road: [
      "The caravan creaks forward beneath a sky the color of old blood.",
      "Smoke tinges the air though no fire is in sight — something burns somewhere ahead.",
      "Miles of road stretch behind you; whatever comes next has not shown its face yet.",
    ],
    crown: THEME_ATMOSPHERE.crown,
    generic: THEME_ATMOSPHERE.generic,
  },
  dungeon: {
    crypt: THEME_ATMOSPHERE.crypt,
    road: THEME_ATMOSPHERE.road,
    crown: THEME_ATMOSPHERE.crown,
    generic: THEME_ATMOSPHERE.generic,
  },
  generic: {
    crypt: THEME_ATMOSPHERE.crypt,
    road: THEME_ATMOSPHERE.road,
    crown: THEME_ATMOSPHERE.crown,
    generic: THEME_ATMOSPHERE.generic,
  },
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

const GM_INSTRUCTION =
  /\b(begin by|begin in|open as|start by|start in|lead them|introduce the heroes|then lead)\b/i;

const SCENE_CUE =
  /\b(party gathers|you gather|you stand|you sit|you arrive|you find yourselves|summoned to|caravan rolls|rolls out at|throne room|tavern|at dawn|at the .+ tavern)\b/i;

interface ParsedPremise {
  hook: string;
  scene: string;
}

/** Split premise text into player-facing hook + starting scene (works for any campaign). */
function parseCampaignPremise(ctx: DMContext): ParsedPremise {
  const raw = ctx.campaign.description?.trim() ?? "";
  const setting = ctx.campaign.setting?.trim() ?? "";
  const partySize = ctx.party.length || 1;

  if (!raw) {
    return {
      hook: setting
        ? `${setting}. The adventure "${ctx.campaign.name}" begins.`
        : `Rumors of "${ctx.campaign.name}" have drawn you in — the truth waits to be uncovered.`,
      scene: "You take your first look at the situation, senses sharp, options open.",
    };
  }

  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const hookParts: string[] = [];
  let scene = "";

  for (const sentence of sentences) {
    if (GM_INSTRUCTION.test(sentence)) {
      if (
        !scene &&
        /^(?:Open as|Begin in|Start in|The party gathers)/i.test(sentence)
      ) {
        scene = cleanSceneSentence(sentence, partySize);
        continue;
      }

      const beforeInstruction = sentence
        .split(/\.\s*(?:Begin|Open as|Start by|Start in|Then lead)/i)[0]
        ?.trim();
      if (beforeInstruction && SCENE_CUE.test(beforeInstruction) && !scene) {
        scene = cleanSceneSentence(beforeInstruction, partySize);
      }
      continue;
    }

    if (SCENE_CUE.test(sentence) && !scene) {
      scene = cleanSceneSentence(sentence, partySize);
      continue;
    }

    hookParts.push(sentence);
  }

  const hook = hookParts.slice(0, 2).join(" ");
  if (!scene) {
    scene = defaultOpeningScene(inferTheme(ctx), ctx.party);
  }

  return { hook, scene };
}

function inferSceneLocation(scene: string, hook: string): SceneLocation {
  const text = `${scene} ${hook}`.toLowerCase();
  if (/\b(tavern|inn|alehouse|taproom|common room|village|town|lantern)\b/.test(text)) {
    return "settlement";
  }
  if (/\b(throne room|palace|capital|court|chamber|regent|summoned to the)\b/.test(text)) {
    return "court";
  }
  if (/\b(caravan|road|trail|wagon|rolls out|highway|journey|at dawn)\b/.test(text)) {
    return "wilderness";
  }
  if (/\b(crypt|vault|tomb|catacomb|dungeon|underground|sealed door|stairs into)\b/.test(text)) {
    return "dungeon";
  }
  return "generic";
}

function openingAtmosphere(
  scene: string,
  hook: string,
  theme: CampaignTheme,
  seed: number,
): string {
  const location = inferSceneLocation(scene, hook);
  return pick(OPENING_ATMOSPHERE[location][theme], seed + 1);
}

/** Keep DM narration in consistent second person after party→you conversions. */
function alignSecondPerson(text: string, partySize = 1): string {
  const group = partySize > 1 ? "you all" : "you";
  return text
    .replace(/\bbetween them\b/gi, `between ${group}`)
    .replace(/\bbefore them\b/gi, `before ${group}`)
    .replace(/\bamong them\b/gi, `among ${group}`)
    .replace(/\bbehind them\b/gi, `behind ${group}`)
    .replace(/\baround them\b/gi, `around ${group}`)
    .replace(/\bfor them\b/gi, `for ${group}`)
    .replace(/\bthe party\b/gi, group);
}

function cleanSceneSentence(sentence: string, partySize = 1): string {
  let s = sentence.trim();
  s = s.replace(/\.\s*(Begin|Open as|Start by|Start in|Then lead)[^.]*$/i, ".");
  s = s.replace(/,\s*then lead[^.]*$/i, "");

  const replacements: [RegExp, string][] = [
    [/^The party gathers/i, "You gather"],
    [/^Open as /i, ""],
    [/^Begin in /i, "You are in "],
    [/^Start in /i, "You are in "],
    [/^Summoned to /i, "You have been summoned to "],
  ];
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(s)) {
      s = s.replace(pattern, replacement);
      break;
    }
  }

  if (!/^You\b/i.test(s)) {
    s = `You are there: ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
  }

  if (!/[.!?]$/.test(s)) s += ".";
  return alignSecondPerson(s, partySize);
}

function defaultOpeningScene(
  theme: CampaignTheme,
  party: DMContext["party"],
): string {
  const group =
    party.length > 1
      ? "You and your companions stand together"
      : "You stand alone";
  const beats: Record<CampaignTheme, string> = {
    crypt: `${group} at the edge of somewhere best left sealed — yet here you are.`,
    road: `${group} on the road, the horizon wide and the reason for your journey clear enough to keep walking.`,
    crown: `${group} where duty and danger both demand an answer.`,
    generic: `${group}, ready to act, the story waiting for your first move.`,
  };
  return beats[theme];
}

function openingLead(theme: CampaignTheme, seed: number): string {
  const leads: Record<CampaignTheme, string[]> = {
    crypt: [
      "Rain or torch-smoke, the air already tastes of trouble.",
      "The dead have been restless, and the living are afraid to say it aloud.",
    ],
    road: [
      "The road ahead promises miles, risk, and answers in equal measure.",
      "Something has gone wrong out here — you can feel it before you see it.",
    ],
    crown: [
      "The realm holds its breath; great matters turn on what you do next.",
      "Power and peril share the same hallways tonight.",
    ],
    generic: [
      "Adventure begins the way most do — with a problem too large to ignore.",
      "The scene is set; the stakes are real.",
    ],
  };
  return pick(leads[theme], seed);
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
  const { hook, scene } = parseCampaignPremise(ctx);
  const atmosphere = openingAtmosphere(scene, hook, theme, seed);
  const lead = openingLead(theme, seed);

  const parts = [`${lead}\n\n${hook}`, scene, atmosphere, pick(PROMPTS, seed + 2)];
  return parts.filter(Boolean).join("\n\n");
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
  return alignSecondPerson(body, ctx.party.length || 1);
}
