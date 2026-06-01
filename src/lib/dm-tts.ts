/** Strip skill-check directives and cap length for TTS input. */
export function textForDmSpeech(content: string): string {
  const cleaned = content
    .replace(/\[CHECK:\s*[^\]]+\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= 3500) return cleaned;
  return `${cleaned.slice(0, 3497)}…`;
}

export function dmSpeechPrompt(text: string): string {
  return (
    "Read the following as a seasoned dungeon master narrating a Dungeons & Dragons " +
    "scene. Use a dramatic, warm storyteller tone. Do not add or change any words:\n\n" +
    text
  );
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
