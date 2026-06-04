import {
  HOARD_TREASURE,
  rollHoardTreasure,
  rollIndividualTreasure,
} from "./treasure-tables";
import { rollOnMagicTable } from "./magic-item-tables";
import type { MagicTableId, TreasureCrBand } from "./types";

export interface LootGrantItem {
  name: string;
  quantity: number;
  description?: string;
}

export interface CampaignLootResult {
  summary: string;
  goldGp: number;
  items: LootGrantItem[];
}

/** 0 ≤ n < 1 */
export type LootRng = () => number;

export function createLootRng(): LootRng {
  return () => Math.random();
}

export function crToTreasureBand(cr: number): TreasureCrBand {
  if (cr <= 4) return "0-4";
  if (cr <= 10) return "5-10";
  if (cr <= 16) return "11-16";
  return "17+";
}

function d100(rng: LootRng): number {
  return 1 + Math.floor(rng() * 100);
}

function rollDieSides(sides: number, count: number, rng: LootRng): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += 1 + Math.floor(rng() * sides);
  }
  return total;
}

/** Parse and roll the first NdM (optional × multiplier) in a DMG table cell. */
export function rollDiceFromTableCell(cell: string | null, rng: LootRng): number {
  if (!cell || cell === "–" || cell === "-") return 0;
  const match = cell.match(/(\d+)\s*d\s*(\d+)(?:\s*[x×]\s*(\d+))?/i);
  if (!match) return 0;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const multiplier = match[3] ? Number(match[3]) : 1;
  return rollDieSides(sides, count, rng) * multiplier;
}

/** Convert coin amounts to GP for a single currency stack. */
export function coinsToGoldGp(
  cp: number,
  sp: number,
  ep: number,
  gp: number,
  pp: number,
): number {
  return Math.floor(cp / 100 + sp / 10 + ep / 2 + gp + pp * 10);
}

function parseCoinGrants(
  row: { cp: string | null; sp: string | null; ep: string | null; gp: string | null; pp: string | null },
  rng: LootRng,
): { goldGp: number; parts: string[] } {
  const cp = row.cp ? rollDiceFromTableCell(row.cp, rng) : 0;
  const sp = row.sp ? rollDiceFromTableCell(row.sp, rng) : 0;
  const ep = row.ep ? rollDiceFromTableCell(row.ep, rng) : 0;
  const gp = row.gp ? rollDiceFromTableCell(row.gp, rng) : 0;
  const pp = row.pp ? rollDiceFromTableCell(row.pp, rng) : 0;
  const goldGp = coinsToGoldGp(cp, sp, ep, gp, pp);
  const parts: string[] = [];
  if (cp) parts.push(`${cp} cp`);
  if (sp) parts.push(`${sp} sp`);
  if (ep) parts.push(`${ep} ep`);
  if (gp) parts.push(`${gp} gp`);
  if (pp) parts.push(`${pp} pp`);
  return { goldGp, parts };
}

const MAGIC_ROLL_RE =
  /roll\s*(\d+)d(\d+)\s*times?\s*on\s*magic\s*item\s*table\s*([a-i])/gi;
const MAGIC_ONCE_RE = /roll\s*once\s*on\s*magic\s*item\s*table\s*([a-i])/gi;

export function resolveMagicItemRolls(
  text: string | null,
  rng: LootRng,
): { names: string[]; lines: string[] } {
  if (!text?.trim()) return { names: [], lines: [] };
  const names: string[] = [];
  const lines: string[] = [];
  const source = text.trim();

  let m: RegExpExecArray | null;
  const onceRe = new RegExp(MAGIC_ONCE_RE.source, "gi");
  while ((m = onceRe.exec(source)) !== null) {
    const tableId = m[1]!.toUpperCase() as MagicTableId;
    const entry = rollOnMagicTable(tableId, d100(rng));
    if (entry) {
      names.push(entry.name);
      lines.push(`Table ${tableId}: ${entry.name}`);
    }
  }

  const timesRe = new RegExp(MAGIC_ROLL_RE.source, "gi");
  while ((m = timesRe.exec(source)) !== null) {
    const times = rollDieSides(Number(m[2]), Number(m[1]), rng);
    const tableId = m[3]!.toUpperCase() as MagicTableId;
    for (let i = 0; i < times; i++) {
      const entry = rollOnMagicTable(tableId, d100(rng));
      if (entry) {
        names.push(entry.name);
        lines.push(`Table ${tableId}: ${entry.name}`);
      }
    }
  }

  return { names, lines };
}

function grantFromGemsOrArt(text: string | null, rng: LootRng): LootGrantItem[] {
  if (!text?.trim()) return [];
  const qtyMatch = text.match(/(\d+)\s*d\s*(\d+)/i);
  const quantity = qtyMatch
    ? rollDieSides(Number(qtyMatch[2]), Number(qtyMatch[1]), rng)
    : 1;
  const label = text.replace(/\(\d+\)/g, "").replace(/\s+/g, " ").trim();
  return [{ name: label || "Treasure", quantity: Math.max(1, quantity) }];
}

function rollHoardBaseCoins(band: TreasureCrBand, rng: LootRng): number {
  const coins = HOARD_TREASURE[band].coins;
  let cp = 0;
  let sp = 0;
  let ep = 0;
  let gp = 0;
  let pp = 0;
  if (coins.cp) cp = rollDiceFromTableCell(coins.cp, rng);
  if (coins.sp) sp = rollDiceFromTableCell(coins.sp, rng);
  if (coins.ep && coins.ep !== "–") ep = rollDiceFromTableCell(coins.ep, rng);
  if (coins.gp) gp = rollDiceFromTableCell(coins.gp, rng);
  if (coins.pp) pp = rollDiceFromTableCell(coins.pp, rng);
  return coinsToGoldGp(cp, sp, ep, gp, pp);
}

export function rollIndividualTreasureLoot(
  cr: number,
  rng: LootRng = createLootRng(),
): CampaignLootResult {
  const band = crToTreasureBand(cr);
  const row = rollIndividualTreasure(band, d100(rng));
  if (!row) {
    return { summary: "No treasure (unlucky d100).", goldGp: 0, items: [] };
  }
  const { goldGp, parts } = parseCoinGrants(row, rng);
  const items: LootGrantItem[] = [];
  if (goldGp > 0) {
    items.push({ name: "Gold pieces", quantity: goldGp, description: parts.join(", ") });
  }
  const summary =
    goldGp > 0
      ? `Individual treasure (CR ${cr}): ${parts.join(", ")} → ${goldGp} GP`
      : `Individual treasure (CR ${cr}): nothing`;
  return { summary, goldGp, items };
}

export function rollHoardTreasureLoot(
  cr: number,
  rng: LootRng = createLootRng(),
): CampaignLootResult {
  const band = crToTreasureBand(cr);
  const baseGold = rollHoardBaseCoins(band, rng);
  const row = rollHoardTreasure(band, d100(rng));
  const items: LootGrantItem[] = [];
  const lines: string[] = [];

  if (baseGold > 0) {
    items.push({
      name: "Gold pieces",
      quantity: baseGold,
      description: "Hoard base coins",
    });
    lines.push(`${baseGold} GP (hoard coins)`);
  }

  if (row?.gemsOrArt) {
    for (const g of grantFromGemsOrArt(row.gemsOrArt, rng)) {
      items.push(g);
      lines.push(`${g.quantity}× ${g.name}`);
    }
  }

  if (row?.magicItems) {
    const { names, lines: magicLines } = resolveMagicItemRolls(row.magicItems, rng);
    for (const name of names) {
      items.push({ name, quantity: 1 });
    }
    lines.push(...magicLines);
  }

  const totalGold = items
    .filter((i) => i.name.toLowerCase() === "gold pieces")
    .reduce((s, i) => s + i.quantity, 0);

  const summary =
    lines.length > 0
      ? `Treasure hoard (CR ${cr}): ${lines.join("; ")}`
      : `Treasure hoard (CR ${cr}): coins only or empty roll`;

  return { summary, goldGp: totalGold, items };
}

/** Uses crypto RNG on server; deterministic seed optional for tests. */
export function rollCampaignLoot(
  kind: "individual" | "hoard",
  cr: number,
  rng?: LootRng,
): CampaignLootResult {
  const roll = rng ?? createLootRng();
  const clamped = Math.min(30, Math.max(0, Math.floor(cr)));
  return kind === "individual"
    ? rollIndividualTreasureLoot(clamped, roll)
    : rollHoardTreasureLoot(clamped, roll);
}
