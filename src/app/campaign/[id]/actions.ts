"use server";

import { revalidatePath } from "next/cache";
import { awardCharacterXpWithMessage } from "@/lib/award-xp";
import { createClient } from "@/lib/supabase/server";
import { xpForSuccessfulCheck } from "@/lib/xp";
import type { CampaignMember, PendingCheck } from "@/lib/types";

async function requireMember(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const };

  const { data: membership } = await supabase
    .from("campaign_members")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "You are not part of this campaign." as const };
  return { supabase, user, membership: membership as CampaignMember };
}

export async function postMessage(
  campaignId: string,
  content: string,
  characterId: string | null,
  characterName: string | null,
): Promise<{ error?: string }> {
  const ctx = await requireMember(campaignId);
  if ("error" in ctx) return { error: ctx.error };
  const trimmed = content.trim();
  if (!trimmed) return {};

  const { error } = await ctx.supabase.from("messages").insert({
    campaign_id: campaignId,
    sender_type: "player",
    user_id: ctx.user.id,
    character_id: characterId,
    character_name: characterName,
    content: trimmed,
  });
  if (error) return { error: error.message };
  return {};
}

export async function postSystemMessage(
  campaignId: string,
  content: string,
): Promise<{ error?: string }> {
  const ctx = await requireMember(campaignId);
  if ("error" in ctx) return { error: ctx.error };
  const { error } = await ctx.supabase.from("messages").insert({
    campaign_id: campaignId,
    sender_type: "system",
    content,
  });
  return { error: error?.message };
}

// Advances the spotlight to the next adventurer in initiative order.
export async function advanceTurn(
  campaignId: string,
): Promise<{ error?: string }> {
  const ctx = await requireMember(campaignId);
  if ("error" in ctx) return { error: ctx.error };

  const { data: campaign } = await ctx.supabase
    .from("campaigns")
    .select("active_character_id, name")
    .eq("id", campaignId)
    .single();

  const { data: members } = await ctx.supabase
    .from("campaign_members")
    .select("user_id, character_id, character:characters(name), turn_order")
    .eq("campaign_id", campaignId)
    .not("character_id", "is", null)
    .order("turn_order", { ascending: true });

  const order = (members ?? []).filter((m) => m.character_id);
  if (order.length === 0) return {};

  const currentIndex = order.findIndex(
    (m) => m.character_id === campaign?.active_character_id,
  );
  const next = order[(currentIndex + 1) % order.length];

  const { error } = await ctx.supabase
    .from("campaigns")
    .update({ active_character_id: next.character_id, pending_check: null })
    .eq("id", campaignId);
  if (error) return { error: error.message };

  const nextName =
    (next.character as { name?: string } | null)?.name ?? "the next hero";
  await ctx.supabase.from("messages").insert({
    campaign_id: campaignId,
    sender_type: "system",
    content: `It is now ${nextName}'s turn.`,
  });

  // Notify the player whose turn it now is (so they know even if not looking).
  const nextUserId = (next as { user_id?: string }).user_id;
  if (nextUserId && nextUserId !== ctx.user.id) {
    await ctx.supabase.from("notifications").insert({
      user_id: nextUserId,
      type: "campaign_turn",
      title: "It's your turn!",
      body: `${nextName}, you're up in "${campaign?.name ?? "your campaign"}".`,
      data: { campaign_id: campaignId },
    });
  }

  revalidatePath(`/campaign/${campaignId}`);
  return {};
}

export async function setActiveCharacter(
  campaignId: string,
  characterId: string | null,
): Promise<{ error?: string }> {
  const ctx = await requireMember(campaignId);
  if ("error" in ctx) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("campaigns")
    .update({ active_character_id: characterId })
    .eq("id", campaignId);
  return { error: error?.message };
}

// Announces a skill check to the whole table. The targeted player rolls; the
// rest see a "check in progress" indicator.
export async function requestCheck(
  campaignId: string,
  check: PendingCheck,
): Promise<{ error?: string }> {
  const ctx = await requireMember(campaignId);
  if ("error" in ctx) return { error: ctx.error };
  if (ctx.membership.role !== "dm") {
    return { error: "Only the Game Master can request checks." };
  }

  const { error } = await ctx.supabase
    .from("campaigns")
    .update({ pending_check: check })
    .eq("id", campaignId);
  if (error) return { error: error.message };

  await ctx.supabase.from("messages").insert({
    campaign_id: campaignId,
    sender_type: "system",
    content: `The Dungeon Master calls for a DC ${check.dc} ${check.skill} check from ${check.character_name}.`,
  });
  return {};
}

export async function clearCheck(
  campaignId: string,
): Promise<{ error?: string }> {
  const ctx = await requireMember(campaignId);
  if ("error" in ctx) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("campaigns")
    .update({ pending_check: null })
    .eq("id", campaignId);
  return { error: error?.message };
}

export interface SubmitRollInput {
  characterId: string | null;
  characterName: string | null;
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  skill?: string | null;
  dc?: number | null;
  success?: boolean | null;
  // When true, this roll resolves the campaign's pending check.
  resolvesPendingCheck?: boolean;
}

export async function submitRoll(
  campaignId: string,
  input: SubmitRollInput,
): Promise<{ error?: string }> {
  const ctx = await requireMember(campaignId);
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase.from("dice_rolls").insert({
    campaign_id: campaignId,
    user_id: ctx.user.id,
    character_id: input.characterId,
    character_name: input.characterName,
    notation: input.notation,
    rolls: input.rolls,
    modifier: input.modifier,
    total: input.total,
    skill: input.skill ?? null,
    dc: input.dc ?? null,
    success: input.success ?? null,
  });
  if (error) return { error: error.message };

  if (input.resolvesPendingCheck) {
    await ctx.supabase
      .from("campaigns")
      .update({ pending_check: null })
      .eq("id", campaignId);

    const verdict =
      input.success == null
        ? ""
        : input.success
          ? " — success!"
          : " — failure.";
    await ctx.supabase.from("messages").insert({
      campaign_id: campaignId,
      sender_type: "system",
      content: `${input.characterName ?? "A hero"} rolled ${input.total} for the ${input.skill} check (DC ${input.dc})${verdict}`,
    });

    if (input.success && input.characterId && input.dc != null) {
      const amount = xpForSuccessfulCheck(input.dc);
      await awardCharacterXpWithMessage(
        campaignId,
        input.characterId,
        amount,
        `successful ${input.skill} check (DC ${input.dc})`,
      );
    }
  }
  return {};
}

export async function setDmVoiceEnabled(
  campaignId: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  const ctx = await requireMember(campaignId);
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("campaigns")
    .update({ dm_voice_enabled: enabled })
    .eq("id", campaignId);

  if (error) return { error: error.message };
  revalidatePath(`/campaign/${campaignId}`);
  return {};
}
