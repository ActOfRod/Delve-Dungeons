import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  dmSpeechPrompt,
  geminiTtsModelsToTry,
  geminiTtsVoice,
  pcmToWav,
  textForDmSpeech,
} from "@/lib/dm-tts";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

async function synthesizeWithGemini(text: string): Promise<Buffer | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return null;

  const speechText = dmSpeechPrompt(textForDmSpeech(text));
  const voiceName = geminiTtsVoice();

  for (const model of geminiTtsModelsToTry()) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: speechText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          }),
        },
      );

      if (!res.ok) {
        const detail = await res.text();
        console.error("[dm/tts] Gemini error:", model, res.status, detail.slice(0, 400));
        if (res.status === 404) continue;
        return null;
      }

      const data = await res.json();
      const inlineData = data?.candidates?.[0]?.content?.parts?.find(
        (part: { inlineData?: { data?: string } }) => part.inlineData?.data,
      )?.inlineData;

      if (!inlineData?.data) {
        console.error("[dm/tts] No audio in response:", model);
        continue;
      }

      const pcm = Buffer.from(inlineData.data, "base64");
      return pcmToWav(pcm);
    } catch (err) {
      console.error("[dm/tts] Request failed:", model, err);
    }
  }

  return null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { campaignId?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { campaignId, text } = body;
  if (!campaignId || !text?.trim()) {
    return NextResponse.json({ error: "Missing campaignId or text" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wav = await synthesizeWithGemini(text);
  if (!wav) {
    return NextResponse.json(
      { error: "Could not synthesize speech. Check GOOGLE_GEMINI_API_KEY and TTS model access." },
      { status: 502 },
    );
  }

  return new NextResponse(new Uint8Array(wav), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
