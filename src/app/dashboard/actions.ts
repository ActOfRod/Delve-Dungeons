"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ABILITIES,
  BACKGROUNDS,
  CLASSES,
  RACES,
  applyRacialBonuses,
  buildStartingInventory,
  generateInviteCode,
  getRacialBonuses,
  isValidPointBuy,
  isValidRolledArray,
  isValidStandardArray,
  startingHp,
  unarmoredAc,
  type AbilityGenMethod,
  type AbilityKey,
  type AbilityScores,
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
  const method = String(formData.get("ability_method") || "pointbuy") as AbilityGenMethod;
  const equipmentOption = String(formData.get("equipment_option") || "kit") as
    | "kit"
    | "wealth";

  if (!name) return { error: "Your hero needs a name." };
  if (!RACES.includes(race as (typeof RACES)[number])) {
    return { error: "Pick a valid race." };
  }
  if (!CLASSES.includes(klass as (typeof CLASSES)[number])) {
    return { error: "Pick a valid class." };
  }
  if (!BACKGROUNDS.some((b) => b.name === background)) {
    return { error: "Pick a valid background." };
  }

  const halfElfA = String(formData.get("half_elf_a") || "") as AbilityKey;
  const halfElfB = String(formData.get("half_elf_b") || "") as AbilityKey;
  const halfElfChoices =
    race === "Half-Elf" && halfElfA && halfElfB && halfElfA !== halfElfB
      ? ([halfElfA, halfElfB] as [AbilityKey, AbilityKey])
      : undefined;

  if (race === "Half-Elf" && !halfElfChoices) {
    return { error: "Half-Elf needs two different +1 ability choices." };
  }

  // Reconstruct base scores from final submitted values minus racial bonuses.
  const submitted = {} as AbilityScores;
  for (const ability of ABILITIES) {
    const raw = Number(formData.get(`ability_${ability.key}`));
    submitted[ability.key] = Number.isNaN(raw) ? 10 : Math.round(raw);
  }

  const bonuses = getRacialBonuses(race, halfElfChoices);
  const base = {} as AbilityScores;
  for (const ability of ABILITIES) {
    base[ability.key] = submitted[ability.key] - (bonuses[ability.key] ?? 0);
  }

  if (method === "pointbuy" && !isValidPointBuy(base)) {
    return { error: "Invalid point-buy scores (8–15, max 27 points)." };
  }
  if (method === "standard" && !isValidStandardArray(base)) {
    return { error: "Assign each standard-array score exactly once." };
  }
  if (method === "roll") {
    const pool = String(formData.get("rolled_pool") || "")
      .split(",")
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    if (!isValidRolledArray(base, pool)) {
      return { error: "Assign each rolled score exactly once." };
    }
  }

  const abilities = applyRacialBonuses(base, race, halfElfChoices);
  for (const ability of ABILITIES) {
    if (abilities[ability.key] < 1 || abilities[ability.key] > 20) {
      return { error: "Ability scores must stay between 1 and 20." };
    }
  }

  let goldRoll: { gp: number; notation: string } | undefined;
  if (equipmentOption === "wealth") {
    const gp = Number(formData.get("starting_gold"));
    const notation = String(formData.get("starting_gold_notation") || "");
    if (Number.isNaN(gp) || gp < 1) {
      return { error: "Roll starting wealth before creating your hero." };
    }
    goldRoll = { gp, notation };
  }

  const kitChoices: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("kit_choice_")) {
      const choiceId = key.slice("kit_choice_".length);
      const index = Number(value);
      if (!Number.isNaN(index)) kitChoices[choiceId] = index;
    }
  }

  const maxHp = startingHp(klass, abilities.con);
  const inventory = buildStartingInventory(
    klass,
    background,
    equipmentOption,
    goldRoll,
    kitChoices,
  );

  const { error } = await supabase.from("characters").insert({
    user_id: user.id,
    name,
    race,
    klass,
    level: 1,
    abilities,
    max_hp: maxHp,
    current_hp: maxHp,
    armor_class: unarmoredAc(abilities.dex),
    background,
    bio: bio || null,
    inventory,
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
  const dmVoiceEnabled =
    characterId && formData.get("dm_voice_enabled") === "true";

  if (!name) return { error: "Give your campaign a name." };

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
      active_character_id: characterId || null,
      dm_voice_enabled: dmVoiceEnabled,
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
    role: characterId ? "player" : "dm",
    turn_order: 0,
  });

  if (memberError) return { error: memberError.message };

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
      (me as { display_name: string | null } | null)?.display_name ?? "A friend";
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

  const { data, error } = await supabase.rpc("join_campaign_by_code", {
    p_code: code,
    p_character_id: characterId,
  });
  if (error) return { error: error.message };

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        campaign_id: string;
        campaign_name: string;
        owner_id: string;
        is_new: boolean;
      }
    | undefined;
  if (!row) return { error: "No campaign found for that code." };

  if (row.is_new && row.owner_id !== user.id) {
    const { data: character } = await supabase
      .from("characters")
      .select("name")
      .eq("id", characterId)
      .maybeSingle();
    const heroName =
      (character as { name: string } | null)?.name ?? "A new hero";
    await supabase.from("notifications").insert({
      user_id: row.owner_id,
      type: "campaign_joined",
      title: "A hero joined your party",
      body: `${heroName} joined "${row.campaign_name}".`,
      data: { campaign_id: row.campaign_id },
    });
  }

  revalidatePath("/dashboard");
  return { ok: true, redirect: `/campaign/${row.campaign_id}` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
