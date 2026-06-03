import type { AbilityScores } from "./dnd";

export type SenderType = "player" | "dm" | "system";
export type CampaignStatus = "active" | "paused" | "completed";
export type MemberRole = "dm" | "player";

export type ItemCategory = "weapon" | "armor" | "potion" | "key" | "other";

export interface InventoryItem {
  id?: string;
  name: string;
  quantity: number;
  description?: string;
  category?: ItemCategory;
  /** Worn or wielded — item stays in inventory with an equipped badge. */
  equipped?: boolean;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  friend_code: string | null;
  vault_inventory: InventoryItem[];
  created_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  label: string | null;
  max_uses: number | null;
  uses: number;
  created_at: string;
}

export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
  // Optional embedded profiles.
  requester?: Profile | null;
  addressee?: Profile | null;
}

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "campaign_invite"
  | "campaign_turn"
  | "campaign_joined"
  | "campaign_closed"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  race: string;
  klass: string;
  level: number;
  abilities: AbilityScores;
  max_hp: number;
  current_hp: number;
  armor_class: number;
  background: string | null;
  bio: string | null;
  inventory: InventoryItem[];
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  setting: string | null;
  owner_id: string;
  invite_code: string;
  status: CampaignStatus;
  // The character whose turn it currently is (null = open table / DM narrating).
  active_character_id: string | null;
  // A pending skill check surfaced to every connected player in realtime.
  pending_check: PendingCheck | null;
  /** When true, Gemini TTS reads AI DM narration aloud for this table. */
  dm_voice_enabled: boolean;
  created_at: string;
}

export interface CampaignMember {
  id: string;
  campaign_id: string;
  user_id: string;
  character_id: string | null;
  role: MemberRole;
  turn_order: number;
  joined_at: string;
  // Joined data (optional, populated by selects).
  character?: Character | null;
  profile?: Profile | null;
}

export interface Message {
  id: string;
  campaign_id: string;
  sender_type: SenderType;
  user_id: string | null;
  character_id: string | null;
  character_name: string | null;
  content: string;
  created_at: string;
}

export interface SkillCheckRequest {
  skill: string;
  ability: string;
  dc: number;
}

export interface DiceRoll {
  id: string;
  campaign_id: string;
  user_id: string;
  character_id: string | null;
  character_name: string | null;
  // e.g. "d20", "2d6"
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  // Populated when this roll resolves a skill check.
  skill: string | null;
  dc: number | null;
  success: boolean | null;
  created_at: string;
}

// A pending skill check announced to the table. Stored on the campaign row so
// every connected player sees the same "a check is happening" indicator.
export interface PendingCheck {
  character_id: string;
  character_name: string;
  skill: string;
  ability: string;
  dc: number;
  requested_at: string;
}
