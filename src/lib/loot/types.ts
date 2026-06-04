/** Loot data types — ingested from DungeonMasterTools.github.io (MIT). */

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
