import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { synthesizeGeminiTts } from "@/lib/dm-tts";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

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

  const wav = await synthesizeGeminiTts(text);
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
