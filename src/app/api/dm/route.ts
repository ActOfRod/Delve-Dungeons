import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSystemPrompt,
  buildTranscript,
  offlineDMNarration,
  parseCheckDirective,
  type DMContext,
} from "@/lib/dm";
import { SKILLS } from "@/lib/dnd";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Campaign, Character, Message, PendingCheck } from "@/lib/types";

export const runtime = "nodejs";

async function generateWithOpenAI(
  ctx: DMContext,
  latestInput: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages = [
    { role: "system", content: buildSystemPrompt(ctx) },
    ...buildTranscript(ctx),
  ];
  if (latestInput) {
    messages.push({ role: "user", content: latestInput });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 500,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return content?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { campaignId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const campaignId = body.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }

  // Membership check (RLS will also enforce this on reads/writes).
  const { data: membership } = await supabase
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single<Campaign>();
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: members } = await supabase
    .from("campaign_members")
    .select("character:characters(*)")
    .eq("campaign_id", campaignId);

  const party = ((members ?? [])
    .map((m) => (m as unknown as { character: Character | null }).character)
    .filter(Boolean) as Character[]).map((c) => ({
    name: c.name,
    race: c.race,
    klass: c.klass,
    level: c.level,
  }));

  const { data: recent } = await supabase
    .from("messages")
    .select("sender_type, character_name, content")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(16);

  const recentMessages = ((recent as Pick<
    Message,
    "sender_type" | "character_name" | "content"
  >[] | null) ?? []).reverse();

  let activeCharacterName: string | null = null;
  if (campaign.active_character_id) {
    const { data: activeChar } = await supabase
      .from("characters")
      .select("name")
      .eq("id", campaign.active_character_id)
      .maybeSingle();
    activeCharacterName = (activeChar as { name: string } | null)?.name ?? null;
  }

  const ctx: DMContext = {
    campaign: {
      name: campaign.name,
      description: campaign.description,
      setting: campaign.setting,
    },
    party,
    recentMessages,
    activeCharacterName,
  };

  const lastPlayerLine =
    [...recentMessages].reverse().find((m) => m.sender_type === "player")
      ?.content ?? "";

  const generated =
    (await generateWithOpenAI(ctx, "")) ??
    offlineDMNarration(ctx, lastPlayerLine);

  const directive = parseCheckDirective(generated);
  const narration = directive ? directive.cleaned : generated;

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      campaign_id: campaignId,
      sender_type: "dm",
      content: narration,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If the DM called for a check, record it on the campaign so all connected
  // players see the "skill check in progress" indicator in realtime.
  if (directive) {
    const skillDef = SKILLS.find(
      (s) => s.name.toLowerCase() === directive.skill.toLowerCase(),
    );
    const target = campaign.active_character_id
      ? { id: campaign.active_character_id, name: activeCharacterName }
      : null;

    const pending: PendingCheck = {
      character_id: target?.id ?? "",
      character_name: target?.name ?? "the party",
      skill: directive.skill,
      ability: skillDef?.ability ?? "wis",
      dc: directive.dc,
      requested_at: new Date().toISOString(),
    };

    await supabase
      .from("campaigns")
      .update({ pending_check: pending })
      .eq("id", campaignId);
  }

  return NextResponse.json({ message: inserted, check: directive ?? null });
}
