// Pre-made campaigns so players new to D&D can jump straight in without having
// to invent a setting or premise. Selecting one fills in the creation form.

export type CampaignLength = "Short" | "Medium" | "Long";

export interface CampaignTemplate {
  key: string;
  title: string;
  length: CampaignLength;
  minPlayers: number;
  maxPlayers: number;
  // Rough play-time expectation, shown on the picker card.
  sessions: string;
  suggestedLevel: number;
  // Short tone descriptor stored on the campaign's `setting`.
  setting: string;
  // One-line blurb shown in the picker.
  summary: string;
  // Detailed opening the AI Dungeon Master uses to kick off the story.
  premise: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "sunless-crypt",
    title: "The Sunless Crypt",
    length: "Short",
    minPlayers: 2,
    maxPlayers: 4,
    sessions: "1–2 sessions",
    suggestedLevel: 1,
    setting: "Classic dungeon crawl — grim but heroic",
    summary:
      "A haunted crypt beneath a sleepy village. The perfect first adventure.",
    premise:
      "The village of Hollowmere has buried its dead in the cliffside crypt for generations — but this past week the dead have not stayed buried. Livestock vanish in the night, a sickly green light seeps from the crypt's sealed door, and the village elder has offered every coin she has to anyone brave enough to descend. The party gathers at the Drowned Lantern tavern as a cold rain falls, the heavy crypt key on the table between them. Begin by introducing the heroes to one another and to the elder's plea, then lead them through the rain to the crypt's groaning iron door.",
  },
  {
    key: "embers-trade-road",
    title: "Embers of the Trade Road",
    length: "Medium",
    minPlayers: 3,
    maxPlayers: 6,
    sessions: "4–6 sessions",
    suggestedLevel: 3,
    setting: "Sword-and-sorcery overland adventure",
    summary:
      "A burning caravan, vanished merchants, and a cult hiding in the hills.",
    premise:
      "The Trade Road between Karth and Vellmoor has always been dangerous, but lately entire caravans simply vanish — leaving only scorched wagons and strange ash-sigils seared into the earth. A desperate merchant guild hires the party to escort the next caravan and discover what is taking the others. What begins as a bandit problem unravels into something far stranger: a fire-worshipping cult awakening an ember-bound horror beneath the hills. Open as the caravan rolls out at dawn beneath an unnaturally red sky, the air already smelling faintly of smoke.",
  },
  {
    key: "shattered-crown",
    title: "The Shattered Crown",
    length: "Long",
    minPlayers: 5,
    maxPlayers: 8,
    sessions: "10+ sessions",
    suggestedLevel: 5,
    setting: "Epic high-fantasy saga",
    summary:
      "A kingdom without a ruler, a crown broken to pieces, a realm to save.",
    premise:
      "King Aldric is dead, and the Crown of Eld — the ancient artifact that bound the realm's warring duchies in an uneasy peace — has been shattered into five shards and scattered by unknown hands. Without it, the dukes sharpen their knives and old horrors stir along the borders. Summoned to the capital as the late king's last loyal agents, the party must recover the five shards from mountain holds, drowned cities, and the Feywild itself before the realm tears itself apart — or before whoever broke the crown reforges it for their own dark ends. Begin in the throne room of a kingdom in mourning, where the grief-stricken regent reveals the theft and begs the heroes for aid.",
  },
];

export function getCampaignTemplate(key: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.key === key);
}
