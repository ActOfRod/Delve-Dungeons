export const DM_DIALOGUE_LENGTHS = ["brief", "measured", "long_winded"] as const;

export type DmDialogueLength = (typeof DM_DIALOGUE_LENGTHS)[number];

export const DEFAULT_DM_DIALOGUE_LENGTH: DmDialogueLength = "measured";

export const DM_DIALOGUE_LENGTH_LABELS: Record<DmDialogueLength, string> = {
  brief: "Brief",
  measured: "Not Brief",
  long_winded: "Long Winded",
};

export function parseDmDialogueLength(
  raw: FormDataEntryValue | null | undefined,
): DmDialogueLength {
  const value = String(raw ?? "").trim();
  if ((DM_DIALOGUE_LENGTHS as readonly string[]).includes(value)) {
    return value as DmDialogueLength;
  }
  return DEFAULT_DM_DIALOGUE_LENGTH;
}

export function dialogueLengthGuide(
  length: DmDialogueLength,
  voiceMode?: boolean,
): string {
  const guides: Record<DmDialogueLength, string> = {
    brief:
      "- Keep narration tight: 1–2 short paragraphs per reply. Deliver mood, outcome, and essential NPC lines without lingering or repeating yourself.",
    measured:
      "- Narrate clearly in 2–4 paragraphs. Include sensory detail, consequences, and NPC dialogue when someone speaks. Second person, present tense.",
    long_winded:
      "- Weave richly in 4–7 paragraphs when the scene calls for it. Layer atmosphere, interior tension, and character voice while still advancing play — never pad without purpose.",
  };

  let guide = guides[length];
  if (voiceMode) {
    guide +=
      " Voice narration is on: favor shorter sentences and slightly fewer paragraphs than this pace might otherwise allow, so lines read well aloud.";
  }
  return guide;
}

export function openingSceneLengthHint(length: DmDialogueLength): string {
  const hints: Record<DmDialogueLength, string> = {
    brief: "1–2 tight paragraphs",
    measured: "3–4 paragraphs",
    long_winded: "5–7 rich paragraphs",
  };
  return hints[length];
}

export function maxOutputTokensForDialogue(
  model: string,
  length: DmDialogueLength,
  envOverride?: number,
): number {
  if (envOverride != null && envOverride > 0) {
    return envOverride;
  }
  const base = /gemini-3/i.test(model) ? 2048 : 1024;
  const scale: Record<DmDialogueLength, number> = {
    brief: 0.5,
    measured: 1,
    long_winded: 1.45,
  };
  return Math.min(4096, Math.round(base * scale[length]));
}
