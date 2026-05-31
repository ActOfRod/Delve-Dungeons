"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_ABILITIES,
  generateInviteCode,
  startingHp,
  type AbilityKey,
} from "@/lib/dnd";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export type ActionResult = { error?: string; ok?: boolean; redirect?: string };

export async function createCharacter(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") || "").trim();
  const race = String(formData.get("race") || "Human");
  const klass = String(formData.get("klass") || "Fighter");
  const background = String(formData.get("background") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  if (!name) return { error: "Your hero needs a name." };

  const abilities = { ...DEFAULT_ABILITIES };
  for (const key of Object.keys(abilities) as AbilityKey[]) {
    const raw = Number(formData.get(`ability_${key}`));
    if (!Number.isNaN(raw)) {
      abilities[key] = Math.min(20, Math.max(1, Math.round(raw)));
    }
  }

  const maxHp = startingHp(klass, abilities.con);

  const { error } = await supabase.from("characters").insert({
    user_id: user.id,
    name,
    race,
    klass,
    level: 1,
    abilities,
    max_hp: maxHp,
    current_hp: maxHp,
    armor_class: 10 + Math.floor((abilities.dex - 10) / 2),
    background: background || null,
    bio: bio || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCharacter(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createCampaign(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const setting = String(formData.get("setting") || "").trim();
  const characterId = String(formData.get("character_id") || "").trim();

  if (!name) return { error: "Give your campaign a name." };

  // Generate a unique invite code (retry a few times on collision).
  let inviteCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from("campaigns")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      name,
      description: description || null,
      setting: setting || null,
      owner_id: user.id,
      invite_code: inviteCode,
      status: "active",
    })
    .select()
    .single();

  if (error || !campaign) {
    return { error: error?.message || "Could not create campaign." };
  }

  const { error: memberError } = await supabase.from("campaign_members").insert({
    campaign_id: campaign.id,
    user_id: user.id,
    character_id: characterId || null,
    role: "dm",
    turn_order: 0,
  });

  if (memberError) return { error: memberError.message };

  revalidatePath("/dashboard");
  return { ok: true, redirect: `/campaign/${campaign.id}` };
}

export async function joinCampaign(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const code = String(formData.get("invite_code") || "")
    .trim()
    .toUpperCase();
  const characterId = String(formData.get("character_id") || "").trim();

  if (!code) return { error: "Enter an invite code." };
  if (!characterId) return { error: "Choose a character to bring." };

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!campaign) return { error: "No campaign found for that code." };

  // Determine the next turn order slot.
  const { count } = await supabase
    .from("campaign_members")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id);

  const { error: joinError } = await supabase
    .from("campaign_members")
    .upsert(
      {
        campaign_id: campaign.id,
        user_id: user.id,
        character_id: characterId,
        role: "player",
        turn_order: count ?? 1,
      },
      { onConflict: "campaign_id,user_id" },
    );

  if (joinError) return { error: joinError.message };

  revalidatePath("/dashboard");
  return { ok: true, redirect: `/campaign/${campaign.id}` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
