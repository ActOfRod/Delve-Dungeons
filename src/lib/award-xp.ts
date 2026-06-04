import { createClient } from "@/lib/supabase/server";
import {
  formatXpAwardMessage,
  type XpAwardResult,
} from "@/lib/xp";

export async function awardCharacterXp(
  characterId: string,
  amount: number,
  reason: string,
): Promise<{ result?: XpAwardResult; error?: string }> {
  if (amount <= 0) return { error: "XP amount must be positive." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("award_character_xp", {
    p_character_id: characterId,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) return { error: error.message };
  return { result: data as XpAwardResult };
}

export async function awardCharacterXpWithMessage(
  campaignId: string,
  characterId: string,
  amount: number,
  reason: string,
): Promise<{ result?: XpAwardResult; error?: string }> {
  const { result, error } = await awardCharacterXp(characterId, amount, reason);
  if (error || !result) return { error };

  const supabase = await createClient();
  await supabase.from("messages").insert({
    campaign_id: campaignId,
    sender_type: "system",
    content: formatXpAwardMessage(result),
  });

  return { result };
}
