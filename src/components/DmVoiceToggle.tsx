"use client";

export function DmVoiceToggle({
  enabled,
  speaking,
  onToggle,
  onStop,
}: {
  enabled: boolean;
  speaking: boolean;
  onToggle: (enabled: boolean) => void;
  onStop: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-arcane/30 bg-arcane/5 p-0.5">
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
          enabled
            ? "bg-arcane/30 text-arcane-bright"
            : "text-parchment/50 hover:text-parchment/80"
        }`}
        title="Gemini reads DM narration aloud"
      >
        🔊 Voice
      </button>
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
          !enabled
            ? "bg-white/10 text-parchment"
            : "text-parchment/50 hover:text-parchment/80"
        }`}
        title="Show DM text only"
      >
        Text
      </button>
      {speaking && enabled && (
        <button
          type="button"
          onClick={onStop}
          className="rounded-full px-2 py-1 text-[10px] text-parchment/60 hover:text-parchment"
          title="Stop narration"
        >
          Stop
        </button>
      )}
    </div>
  );
}
