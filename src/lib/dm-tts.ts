/** Strip skill-check directives and cap length for faster TTS. */
export function textForDmSpeech(content: string): string {
  const maxChars = parseInt(process.env.GOOGLE_GEMINI_TTS_MAX_CHARS || "1800", 10);
  const cap = Number.isNaN(maxChars) || maxChars < 200 ? 1800 : maxChars;
  const cleaned = content
    .replace(/\[CHECK:\s*[^\]]+\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= cap) return cleaned;
  const slice = cleaned.slice(0, cap);
  const breakAt = slice.lastIndexOf(". ");
  if (breakAt > cap * 0.6) return slice.slice(0, breakAt + 1);
  return `${slice}…`;
}

export function dmSpeechPrompt(text: string): string {
  return `Dramatic dungeon master narration:\n\n${text}`;
}

/** Wrap raw PCM (s16le mono) in a WAV header for browser playback. */
export function pcmToWav(
  pcm: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitDepth = 16,
): Buffer {
  const blockAlign = channels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export const GEMINI_TTS_MODELS = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
] as const;

export const DEFAULT_GEMINI_TTS_VOICE = "Charon";

export function geminiTtsModelsToTry(): string[] {
  const configured = process.env.GOOGLE_GEMINI_TTS_MODEL?.trim();
  const list = configured ? [configured, ...GEMINI_TTS_MODELS] : [...GEMINI_TTS_MODELS];
  return [...new Set(list)];
}

export function geminiTtsVoice(): string {
  return process.env.GOOGLE_GEMINI_TTS_VOICE?.trim() || DEFAULT_GEMINI_TTS_VOICE;
}

/** Synthesize DM narration to WAV via Gemini TTS. Returns null if unavailable. */
export async function synthesizeGeminiTts(text: string): Promise<Buffer | null> {
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
        console.error("[dm-tts] Gemini error:", model, res.status, detail.slice(0, 400));
        if (res.status === 404) continue;
        return null;
      }

      const data = await res.json();
      const inlineData = data?.candidates?.[0]?.content?.parts?.find(
        (part: { inlineData?: { data?: string } }) => part.inlineData?.data,
      )?.inlineData;

      if (!inlineData?.data) {
        console.error("[dm-tts] No audio in response:", model);
        continue;
      }

      return pcmToWav(Buffer.from(inlineData.data, "base64"));
    } catch (err) {
      console.error("[dm-tts] Request failed:", model, err);
    }
  }

  return null;
}
