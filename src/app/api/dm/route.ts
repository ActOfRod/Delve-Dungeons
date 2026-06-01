import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSystemPrompt,
  buildTranscript,
  checkResultUserPrompt,
  offlineCheckResultNarration,
  offlineDMNarration,
  offlineOpeningNarration,
  openingUserPrompt,
  parseCheckDirective,
  type CheckResultContext,
  type DMContext,
} from "@/lib/dm";
import { SKILLS } from "@/lib/dnd";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Campaign, Character, DiceRoll, Message, PendingCheck } from "@/lib/types";

export const runtime = "nodejs";

/** Models that work on the Gemini API as of mid-2026 (2.0 Flash is deprecated). */
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

type DMGenerationMode = "opening" | "action" | "checkResult";

function buildPromptMessages(
  ctx: DMContext,
  latestInput: string,
  mode: DMGenerationMode,
  checkResult?: CheckResultContext,
): { role: "user" | "assistant"; content: string }[] {
  const messages = [...buildTranscript(ctx)];
  if (mode === "opening") {
    messages.push({ role: "user", content: openingUserPrompt() });
  } else if (mode === "checkResult" && checkResult) {
    messages.push({
      role: "user",
      content: checkResultUserPrompt(checkResult),
    });
  } else if (mode === "action" && latestInput && messages.length === 0) {
    // Player line not in transcript yet (edge case).
    messages.push({ role: "user", content: latestInput });
  }
  return messages;
}

/** Gemini requires alternating user/model turns — merge consecutive same-role lines. */
function toGeminiContents(
  messages: { role: "user" | "assistant"; content: string }[],
): { role: "user" | "model"; parts: { text: string }[] }[] {
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const message of messages) {
    const role = message.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last?.role === role) {
      last.parts[0].text += `\n\n${message.content}`;
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }
  return contents;
}

function extractGeminiText(data: {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}): string | undefined {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) return undefined;
  const text = parts
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("\n")
    .trim();
  return text || undefined;
}

function geminiModelsToTry(): string[] {
  const configured = process.env.GOOGLE_GEMINI_MODEL?.trim();
  const list = configured
    ? [configured, ...GEMINI_FALLBACK_MODELS]
    : GEMINI_FALLBACK_MODELS;
  return [...new Set(list)];
}

function geminiMaxOutputTokens(model: string): number {
  const env = process.env.GOOGLE_GEMINI_MAX_OUTPUT_TOKENS;
  if (env) {
    const parsed = parseInt(env, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  // Gemini 3 "thinking" consumes part of the output budget.
  return /gemini-3/i.test(model) ? 2048 : 1024;
}

async function requestGemini(
  apiKey: string,
  model: string,
  contents: { role: "user" | "model"; parts: { text: string }[] }[],
  systemPrompt: string,
): Promise<
  | { ok: true; text: string }
  | { ok: false; status: number; detail: string; retry: boolean }
> {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.9,
    maxOutputTokens: geminiMaxOutputTokens(model),
  };
  if (/gemini-3/i.test(model)) {
    generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig,
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    return {
      ok: false,
      status: res.status,
      detail,
      retry: res.status === 404,
    };
  }

  const data = await res.json();
  const text = extractGeminiText(data);
  if (!text) {
    return {
      ok: false,
      status: 200,
      detail: JSON.stringify(data).slice(0, 500),
      retry: true,
    };
  }
  return { ok: true, text };
}

async function generateWithGemini(
  ctx: DMContext,
  latestInput: string,
  mode: DMGenerationMode,
  checkResult?: CheckResultContext,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return null;

  const messages = buildPromptMessages(ctx, latestInput, mode, checkResult);
  const contents = toGeminiContents(messages);
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: openingUserPrompt() }] });
  }

  const systemPrompt = buildSystemPrompt(ctx);

  try {
    for (const model of geminiModelsToTry()) {
      const result = await requestGemini(apiKey, model, contents, systemPrompt);
      if (result.ok) {
        const primary = process.env.GOOGLE_GEMINI_MODEL?.trim() || GEMINI_FALLBACK_MODELS[0];
        if (model !== primary) {
          console.warn("[dm] Gemini succeeded with fallback model:", model);
        }
        return result.text;
      }

      console.error(
        "[dm] Gemini error:",
        model,
        result.status,
        result.detail.slice(0, 500),
      );

      if (!result.retry) return null;
    }
    return null;
  } catch (err) {
    console.error("[dm] Gemini request failed:", err);
    return null;
  }
}

async function generateWithOpenAI(
  ctx: DMContext,
  latestInput: string,
  mode: DMGenerationMode,
  checkResult?: CheckResultContext,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages: { role: string; content: string }[] = [
    { role: "system", content: buildSystemPrompt(ctx) },
    ...buildPromptMessages(ctx, latestInput, mode, checkResult),
  ];

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
        max_tokens: 1024,
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

async function generateWithAI(
  ctx: DMContext,
  latestInput: string,
  mode: DMGenerationMode,
  checkResult?: CheckResultContext,
): Promise<string | null> {
  return (
    (await generateWithGemini(ctx, latestInput, mode, checkResult)) ??
    (await generateWithOpenAI(ctx, latestInput, mode, checkResult))
  );
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

  let body: { campaignId?: string; opening?: boolean; checkResult?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const campaignId = body.campaignId;
  const openingRequested = body.opening === true;
  const checkResultRequested = body.checkResult === true;
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

  const { count: messageCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  const opening = openingRequested || ((messageCount ?? 0) === 0 && !checkResultRequested);

  if (opening && (messageCount ?? 0) > 0) {
    const { data: existingOpening } = await supabase
      .from("messages")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("sender_type", "dm")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingOpening) {
      return NextResponse.json({ message: existingOpening, check: null });
    }
  }

  const { data: humanDm } = await supabase
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("role", "dm")
    .limit(1)
    .maybeSingle();

  if (opening && humanDm) {
    return NextResponse.json(
      { error: "A human Game Master is running this table." },
      { status: 400 },
    );
  }

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

  let resolvedCheck: CheckResultContext | null = null;
  if (checkResultRequested) {
    const { data: roll } = await supabase
      .from("dice_rolls")
      .select("*")
      .eq("campaign_id", campaignId)
      .not("skill", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<DiceRoll>();

    if (roll?.skill && roll.dc != null && roll.success != null) {
      resolvedCheck = {
        characterName: roll.character_name ?? "A hero",
        skill: roll.skill,
        dc: roll.dc,
        total: roll.total,
        success: roll.success,
      };

      // Avoid double-narrating if the DM already responded to this roll.
      const { data: dmAfterRoll } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("sender_type", "dm")
        .gt("created_at", roll.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<Message>();

      if (dmAfterRoll) {
        return NextResponse.json({ message: dmAfterRoll, check: null });
      }
    }
  }

  const lastPlayerLine =
    [...recentMessages].reverse().find((m) => m.sender_type === "player")
      ?.content ?? "";

  let generated: string;
  if (opening) {
    generated =
      (await generateWithAI(ctx, "", "opening")) ??
      offlineOpeningNarration(ctx);
  } else if (resolvedCheck) {
    generated =
      (await generateWithAI(ctx, "", "checkResult", resolvedCheck)) ??
      offlineCheckResultNarration(ctx, resolvedCheck);
  } else {
    generated =
      (await generateWithAI(ctx, lastPlayerLine, "action")) ??
      offlineDMNarration(ctx, lastPlayerLine);
  }

  const directive =
    opening || resolvedCheck ? null : parseCheckDirective(generated);
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
