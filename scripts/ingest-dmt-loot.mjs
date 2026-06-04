/**
 * Parses DungeonMasterTools.github.io HTML (MIT) into src/lib/loot data files.
 * Run: node scripts/ingest-dmt-loot.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_DIR = path.join(__dirname, "dmt-html");
const OUT_DIR = path.join(__dirname, "../src/lib/loot");

function readHtml(name) {
  return fs.readFileSync(path.join(HTML_DIR, name), "utf8");
}

function decodeHtml(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCostGp(text) {
  const t = text.toLowerCase().replace(/,/g, "").trim();
  if (!t || t === "—" || t === "-") return null;
  const m = t.match(/([\d.]+)\s*(cp|sp|ep|gp|pp)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2];
  const mult = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 }[unit];
  return Math.round(n * mult * 100) / 100;
}

function parseD100Range(cell) {
  const t = cell.replace(/\s/g, "").replace(/–/g, "-").replace(/—/g, "-");
  if (t === "00") return { min: 100, max: 100 };
  const openHigh = t.match(/^(\d{1,2})-0+$/);
  if (openHigh) {
    return { min: parseInt(openHigh[1], 10), max: 100 };
  }
  const single = t.match(/^(\d{1,2})$/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { min: n, max: n };
  }
  const range = t.match(/^(\d{1,2})-(\d{1,2})$/);
  if (range) {
    let max = parseInt(range[2], 10);
    if (max === 0) max = 100;
    return { min: parseInt(range[1], 10), max };
  }
  return null;
}

function normalizeMagicName(name) {
  return name
    .replace(/\s+/g, " ")
    .replace(/\bloun\b/gi, "Ioun")
    .replace(/(\d)(st|nd|rd|th)\s*level/gi, "$1$2 level")
    .replace(/(\d)(st|nd|rd|th)level/gi, "$1$2 level")
    .replace(/Poti on/gi, "Potion")
    .replace(/Clamoured/gi, "Glamoured")
    .replace(/sharpnes\b/gi, "sharpness")
    .replace(/,\s*\+/g, ", +")
    .replace(/\+\s+/g, "+")
    .trim();
}

function parseMagicTables(html) {
  const tables = {};
  const tableBlocks = html.split(/<h3>Magic Item Table ([A-I])<\/h3>/i);
  for (let i = 1; i < tableBlocks.length; i += 2) {
    const id = tableBlocks[i].toUpperCase();
    const block = tableBlocks[i + 1];
    const rowRe =
      /<tr>\s*<td>([^<]*)<\/td>\s*<td>([^<]*?)<\/td>(?:\s*<td>([^<]*?)<\/td>)?\s*(?:<\/tr>|\s*<tr>)/gi;
    const entries = [];
    const seen = new Set();
    for (const row of block.matchAll(rowRe)) {
      const rangeCell = decodeHtml(row[1]);
      const name = normalizeMagicName(decodeHtml(row[3] ?? row[2]));
      if (!name || rangeCell.toLowerCase() === "d100") continue;
      if (rangeCell === "-" || name.startsWith("1:") || name.match(/^\d[-:]/)) {
        continue;
      }
      const range = parseD100Range(rangeCell);
      if (!range) continue;
      const key = `${range.min}-${range.max}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ ...range, name });
    }
    entries.sort((a, b) => a.min - b.min);
    tables[id] = entries;
  }
  return tables;
}

function parseMundaneSection(html, sectionName, category) {
  const items = [];
  const re = new RegExp(
    `<h3>${sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h3>[\\s\\S]*?<table[^>]*>([\\s\\S]*?)</table>`,
    "i",
  );
  const m = html.match(re);
  if (!m) return items;

  const table = m[1];
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  let prefix = "";

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      decodeHtml(c[1]),
    );
    if (cells.length < 2) continue;
    const h = cells[0].toLowerCase();
    if (h === "item" || h === "name" || h.includes("cost") && cells.length === 2 && h.includes("pay")) {
      continue;
    }

    if (cells.length === 2) {
      const [a, b] = cells;
      const cost = parseCostGp(b);
      if (cost == null && !a) continue;
      if (cost == null && a && !b) {
        if (a.startsWith("Light ") || a.startsWith("Medium ") || a.startsWith("Heavy ") || a.startsWith("Simple ") || a.startsWith("Martial ")) {
          prefix = a;
        }
        continue;
      }
      const name = prefix ? `${prefix} — ${a}` : a;
      if (cost != null && name) {
        items.push({ name, costGp: cost, category });
      }
      continue;
    }

    if (cells.length >= 3) {
      const name = cells[0];
      const cost = parseCostGp(cells[1]);
      if (!name || cost == null) continue;
      if (name.toLowerCase() === "armor" || name.toLowerCase() === "name") continue;
      const entry = { name, costGp: cost, category };
      if (cells[2] && !cells[2].match(/^\d+d/)) {
        entry.notes = cells.slice(2).join("; ");
      }
      items.push(entry);
    }
  }
  return items;
}

function parseWeapons(html) {
  const items = [];
  const re = /<h3>Weapons<\/h3>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i;
  const m = html.match(re);
  if (!m) return items;
  const rows = [...m[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  let group = "";

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      decodeHtml(c[1]),
    );
    if (cells.length < 3) continue;
    if (cells[0].toLowerCase() === "name") continue;
    if (cells.length === 3 && !parseCostGp(cells[1])) {
      group = cells[0];
      continue;
    }
    const name = group ? `${group} — ${cells[0]}` : cells[0];
    const cost = parseCostGp(cells[1]);
    if (!name || cost == null) continue;
    items.push({
      name,
      costGp: cost,
      category: "weapon",
      notes: cells.slice(2).filter(Boolean).join("; ") || undefined,
    });
  }
  return items;
}

function parseArmor(html) {
  const items = [];
  const re = /<h3>Armor<\/h3>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i;
  const m = html.match(re);
  if (!m) return items;
  const rows = [...m[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  let group = "";

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      decodeHtml(c[1]),
    );
    if (cells.length < 3) continue;
    if (cells[0].toLowerCase() === "armor") continue;
    if (cells[1].toLowerCase() === "cost") continue;
    if (!parseCostGp(cells[1]) && cells[0].includes("Armor")) {
      group = cells[0].replace(/²/g, "").trim();
      continue;
    }
    const name = group ? `${group} — ${cells[0].replace(/²/g, "").trim()}` : cells[0].replace(/²/g, "").trim();
    const cost = parseCostGp(cells[1]);
    if (!name || cost == null) continue;
    const cat = name.toLowerCase() === "shield" ? "shield" : "armor";
    items.push({
      name,
      costGp: cost,
      category: cat,
      notes: `AC ${cells[2]}${cells[3] ? `; ${cells[3]}` : ""}`,
    });
  }
  return items;
}

function parseTreasureIndividual(html) {
  const bands = {};
  const sections = [
    ["0-4", /Individual Treasure: Challenge 0-4/i],
    ["5-10", /Individual Treasure: Challenge 5-10/i],
    ["11-16", /Individual Treasure: Challenge 11-16/i],
    ["17+", /Individual Treasure: Challenge 17\+/i],
  ];
  for (const [band, re] of sections) {
    const idx = html.search(re);
    if (idx < 0) continue;
    const slice = html.slice(idx, idx + 8000);
    const tableM = slice.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableM) continue;
    const rows = [...tableM[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
    const entries = [];
    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
        decodeHtml(c[1]),
      );
      if (cells.length < 6) continue;
      if (cells[0].toLowerCase() === "d100") continue;
      const range = parseD100Range(cells[0].replace(/\s/g, ""));
      if (!range) continue;
      entries.push({
        ...range,
        cp: cells[1] === "–" || cells[1] === "-" ? null : cells[1],
        sp: cells[2] === "–" || cells[2] === "-" ? null : cells[2],
        ep: cells[3] === "–" || cells[3] === "-" ? null : cells[3],
        gp: cells[4] === "–" || cells[4] === "-" ? null : cells[4],
        pp: cells[5] === "–" || cells[5] === "-" ? null : cells[5],
      });
    }
    bands[band] = entries;
  }
  return bands;
}

function parseTreasureHoard(html) {
  const bands = {};
  const sections = [
    ["0-4", /Treasure Hoard: Challenge 0-4/i],
    ["5-10", /Treasure Hoard: Challenge 5-10/i],
    ["11-16", /Treasure Hoard: Challenge 11-16/i],
    ["17+", /Treasure Hoard: Challenge 17\+/i],
  ];
  for (const [band, re] of sections) {
    const idx = html.search(re);
    if (idx < 0) continue;
    const slice = html.slice(idx, idx + 25000);
    const tables = [...slice.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
    if (tables.length < 2) continue;

    const coinCells = [...tables[0][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (c) => decodeHtml(c[1]),
    );
    const headerIdx = coinCells.findIndex((c) => c.toLowerCase() === "coins");
    const start = headerIdx >= 0 ? headerIdx + 1 : 5;
    const coins = {
      cp: coinCells[start] ?? undefined,
      sp: coinCells[start + 1] ?? undefined,
      ep: coinCells[start + 2] ?? undefined,
      gp: coinCells[start + 3] ?? undefined,
      pp: coinCells[start + 4] ?? undefined,
    };

    const rows = [...tables[1][1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
    const entries = [];
    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
        decodeHtml(c[1]),
      );
      if (cells.length < 3) continue;
      if (cells[0].toLowerCase() === "d100") continue;
      const range = parseD100Range(cells[0].replace(/\s/g, ""));
      if (!range) continue;
      entries.push({
        ...range,
        gemsOrArt: cells[1] === "–" || cells[1] === "-" ? null : cells[1],
        magicItems: cells[2] === "–" || cells[2] === "-" ? null : cells[2],
      });
    }
    bands[band] = { coins, entries };
  }
  return bands;
}

function parseGemArtTable(html, sectionRe, valueGp) {
  const idx = html.search(sectionRe);
  if (idx < 0) return [];
  const slice = html.slice(idx, idx + 12000);
  const tableM = slice.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableM) return [];
  const rows = [...tableM[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  const entries = [];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      decodeHtml(c[1]),
    );
    if (cells.length < 2) continue;
    const die = cells[0].match(/^d(\d+)$/i);
    if (!die) continue;
    const name = cells[1];
    if (!name || name.toLowerCase().includes("gemstone")) continue;
    entries.push({
      die: `d${die[1]}`,
      name,
      valueGp,
    });
  }
  return entries;
}

function esc(str) {
  return JSON.stringify(str);
}

function writeFile(name, content) {
  fs.writeFileSync(path.join(OUT_DIR, name), content, "utf8");
}

function main() {
  const indexHtml = readHtml("index.html");
  const itemsHtml = readHtml("items.html");
  const treasureHtml = readHtml("treasure.html");

  const magicTables = parseMagicTables(indexHtml);
  const mundane = [
    ...parseArmor(itemsHtml),
    ...parseWeapons(itemsHtml),
    ...parseMundaneSection(itemsHtml, "Tools", "tool"),
    ...parseMundaneSection(itemsHtml, "Adventuring Gear", "gear"),
    ...parseMundaneSection(itemsHtml, "Mounts", "mount"),
    ...parseMundaneSection(itemsHtml, "Tack, Harness, and Drawn Vehicles", "vehicle"),
    ...parseMundaneSection(itemsHtml, "Waterborne Vehicles", "vehicle"),
    ...parseMundaneSection(itemsHtml, "Food, Drink, and Lodging", "service"),
    ...parseMundaneSection(itemsHtml, "Services", "service"),
    ...parseMundaneSection(itemsHtml, "Lifestyle Expenses", "service"),
  ];

  const individualTreasure = parseTreasureIndividual(treasureHtml);
  const hoardTreasure = parseTreasureHoard(treasureHtml);

  const gems = [
    ...parseGemArtTable(treasureHtml, /<h3>Gems<\/h3>/i, null),
  ];
  const artObjects = [];

  fs.mkdirSync(OUT_DIR, { recursive: true });

  writeFile(
    "types.ts",
    `/** Loot data types — ingested from DungeonMasterTools.github.io (MIT). */

export type MagicTableId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

export type MundaneCategory =
  | "weapon"
  | "armor"
  | "shield"
  | "tool"
  | "gear"
  | "mount"
  | "vehicle"
  | "service";

export interface MundaneItem {
  name: string;
  costGp: number;
  category: MundaneCategory;
  notes?: string;
}

export interface MagicTableEntry {
  min: number;
  max: number;
  name: string;
}

export interface IndividualTreasureEntry {
  min: number;
  max: number;
  cp: string | null;
  sp: string | null;
  ep: string | null;
  gp: string | null;
  pp: string | null;
}

export type TreasureCrBand = "0-4" | "5-10" | "11-16" | "17+";

export interface HoardTreasureEntry {
  min: number;
  max: number;
  gemsOrArt: string | null;
  magicItems: string | null;
}

export interface HoardTreasureBand {
  coins: {
    cp?: string;
    sp?: string;
    ep?: string;
    gp?: string;
    pp?: string;
  };
  entries: HoardTreasureEntry[];
}

export interface GemEntry {
  die: string;
  name: string;
  valueGp: number | null;
}
`,
  );

  const magicLines = Object.entries(magicTables)
    .map(([id, entries]) => {
      const body = entries
        .map((e) => `    { min: ${e.min}, max: ${e.max}, name: ${esc(e.name)} }`)
        .join(",\n");
      return `  ${id}: [\n${body},\n  ]`;
    })
    .join(",\n");

  writeFile(
    "magic-item-tables.ts",
    `import type { MagicTableEntry, MagicTableId } from "./types";

/** DMG magic item tables A–I (d100). Names normalized; generics kept as-is. */
export const MAGIC_ITEM_TABLES: Record<MagicTableId, MagicTableEntry[]> = {
${magicLines},
};

export const MAGIC_TABLE_IDS = Object.keys(MAGIC_ITEM_TABLES) as MagicTableId[];

export function rollOnMagicTable(
  tableId: MagicTableId,
  roll: number,
): MagicTableEntry | null {
  const d100 = ((Math.floor(roll) - 1 + 100) % 100) + 1;
  return (
    MAGIC_ITEM_TABLES[tableId].find((e) => d100 >= e.min && d100 <= e.max) ?? null
  );
}
`,
  );

  const mundaneBody = mundane
    .map((item) => {
      const notes = item.notes ? `, notes: ${esc(item.notes)}` : "";
      return `  { name: ${esc(item.name)}, costGp: ${item.costGp}, category: ${esc(item.category)}${notes} },`;
    })
    .join("\n");

  writeFile(
    "mundane-items.ts",
    `import type { MundaneCategory, MundaneItem } from "./types";

/** PHB-style equipment from DungeonMasterTools items.html */
export const MUNDANE_ITEMS: MundaneItem[] = [
${mundaneBody}
];

export function mundaneItemsByCategory(category: MundaneCategory): MundaneItem[] {
  return MUNDANE_ITEMS.filter((i) => i.category === category);
}

export function findMundaneItem(name: string): MundaneItem | undefined {
  const key = name.trim().toLowerCase();
  return MUNDANE_ITEMS.find((i) => i.name.toLowerCase() === key);
}
`,
  );

  const indBody = Object.entries(individualTreasure)
    .map(([band, entries]) => {
      const rows = entries
        .map(
          (e) =>
            `      { min: ${e.min}, max: ${e.max}, cp: ${e.cp ? esc(e.cp) : "null"}, sp: ${e.sp ? esc(e.sp) : "null"}, ep: ${e.ep ? esc(e.ep) : "null"}, gp: ${e.gp ? esc(e.gp) : "null"}, pp: ${e.pp ? esc(e.pp) : "null"} },`,
        )
        .join("\n");
      return `  "${band}": [\n${rows}\n  ]`;
    })
    .join(",\n");

  const hoardBody = Object.entries(hoardTreasure)
    .map(([band, data]) => {
      const rows = data.entries
        .map(
          (e) =>
            `      { min: ${e.min}, max: ${e.max}, gemsOrArt: ${e.gemsOrArt ? esc(e.gemsOrArt) : "null"}, magicItems: ${e.magicItems ? esc(e.magicItems) : "null"} },`,
        )
        .join("\n");
      return `  "${band}": {
    coins: ${JSON.stringify(data.coins)},
    entries: [
${rows}
    ],
  }`;
    })
    .join(",\n");

  writeFile(
    "treasure-tables.ts",
    `import type {
  HoardTreasureBand,
  HoardTreasureEntry,
  IndividualTreasureEntry,
  TreasureCrBand,
} from "./types";

export const INDIVIDUAL_TREASURE: Record<TreasureCrBand, IndividualTreasureEntry[]> = {
${indBody},
};

export const HOARD_TREASURE: Record<TreasureCrBand, HoardTreasureBand> = {
${hoardBody},
};

export function rollIndividualTreasure(
  band: TreasureCrBand,
  d100: number,
): IndividualTreasureEntry | null {
  const row = INDIVIDUAL_TREASURE[band].find((e) => d100 >= e.min && d100 <= e.max);
  return row ?? null;
}

export function rollHoardTreasure(
  band: TreasureCrBand,
  d100: number,
): HoardTreasureEntry | null {
  const row = HOARD_TREASURE[band].entries.find((e) => d100 >= e.min && d100 <= e.max);
  return row ?? null;
}
`,
  );

  writeFile(
    "index.ts",
    `export type {
  GemEntry,
  HoardTreasureBand,
  HoardTreasureEntry,
  IndividualTreasureEntry,
  MagicTableEntry,
  MagicTableId,
  MundaneCategory,
  MundaneItem,
  TreasureCrBand,
} from "./types";

export {
  MAGIC_ITEM_TABLES,
  MAGIC_TABLE_IDS,
  rollOnMagicTable,
} from "./magic-item-tables";

export {
  MUNDANE_ITEMS,
  findMundaneItem,
  mundaneItemsByCategory,
} from "./mundane-items";

export {
  HOARD_TREASURE,
  INDIVIDUAL_TREASURE,
  rollHoardTreasure,
  rollIndividualTreasure,
} from "./treasure-tables";

export const LOOT_DATA_SOURCE =
  "https://dungeonmastertools.github.io/ (MIT; tables adapted from DMG/PHB reference)";
`,
  );

  const counts = {
    magic: Object.values(magicTables).reduce((n, t) => n + t.length, 0),
    mundane: mundane.length,
    individual: Object.values(individualTreasure).reduce((n, t) => n + t.length, 0),
    hoard: Object.values(hoardTreasure).reduce((n, t) => n + t.entries.length, 0),
  };
  console.log("Generated src/lib/loot:", counts);
}

main();
