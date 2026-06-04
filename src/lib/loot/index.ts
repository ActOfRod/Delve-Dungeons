export type {
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

export {
  crToTreasureBand,
  rollCampaignLoot,
  rollHoardTreasureLoot,
  rollIndividualTreasureLoot,
  resolveMagicItemRolls,
  type CampaignLootResult,
  type LootGrantItem,
  type LootRng,
} from "./roll-loot";
