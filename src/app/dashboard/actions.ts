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

  // Invite selected friends — drop a notification with the join code.
  const inviteIds = formData
    .getAll("invite_friends")
    .map(String)
    .filter(Boolean);
  if (inviteIds.length) {
    const { data: me } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const fromName =
      (me as { display_name: string | null } | null)?.display_name ??
      "A friend";
    await supabase.from("notifications").insert(
      inviteIds.map((uid) => ({
        user_id: uid,
        type: "campaign_invite",
        title: "Campaign invite",
        body: `${fromName} invited you to "${name}".`,
        data: {
          campaign_id: campaign.id,
          invite_code: inviteCode,
          campaign_name: name,
        },
      })),
    );
  }

  revalidatePath("/dashboard");
  return { ok: true, redirect: `/campaign/${campaign.id}` };
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) return { error: "Campaign not found." };
  if (campaign.owner_id !== user.id)
    return { error: "Only the Game Master can close this campaign." };

  // Notify the other members before the campaign (and its rows) cascade away.
  const { data: members } = await supabase
    .from("campaign_members")
    .select("user_id")
    .eq("campaign_id", id);

  const others = (members ?? [])
    .map((m) => (m as { user_id: string }).user_id)
    .filter((uid) => uid !== user.id);

  if (others.length) {
    await supabase.from("notifications").insert(
      others.map((uid) => ({
        user_id: uid,
        type: "campaign_closed",
        title: "Campaign closed",
        body: `The Game Master closed "${campaign.name}".`,
        data: { campaign_id: id, campaign_name: campaign.name },
      })),
    );
  }

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
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
    .select("id, name, owner_id")
    .eq("invite_code", code)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!campaign) return { error: "No campaign found for that code." };

  // Was the player already a member? (Avoid spamming a "joined" notification.)
  const { data: priorMembership } = await supabase
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaign.id)
    .eq("user_id", user.id)
    .maybeSingle();

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

  // Let the Game Master know a hero has joined.
  if (!priorMembership && campaign.owner_id !== user.id) {
    const { data: character } = await supabase
      .from("characters")
      .select("name")
      .eq("id", characterId)
      .maybeSingle();
    const heroName =
      (character as { name: string } | null)?.name ?? "A new hero";
    await supabase.from("notifications").insert({
      user_id: campaign.owner_id,
      type: "campaign_joined",
      title: "A hero joined your party",
      body: `${heroName} joined "${campaign.name}".`,
      data: { campaign_id: campaign.id },
    });
  }

  revalidatePath("/dashboard");
  return { ok: true, redirect: `/campaign/${campaign.id}` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
