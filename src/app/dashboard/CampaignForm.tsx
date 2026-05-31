"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/lib/types";
import { createCampaign, type ActionResult } from "./actions";
import { Submit } from "./CharacterForm";

export function CampaignForm({
  characters,
  onDone,
}: {
  characters: Character[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult, FormData>(
    createCampaign,
    {},
  );

  useEffect(() => {
    if (state.ok && state.redirect) {
      router.push(state.redirect);
    } else if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
          Campaign name
        </span>
        <input
          name="name"
          required
          placeholder="The Lost Mines of Phandelver"
          className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
          Setting / tone
        </span>
        <input
          name="setting"
          placeholder="Grim dark fantasy, lighthearted high adventure…"
          className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
          Premise for the Dungeon Master (optional)
        </span>
        <textarea
          name="description"
          rows={3}
          placeholder="The party meets in a rain-soaked tavern on the edge of the Sword Coast…"
          className="w-full resize-none rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
          Bring a hero (optional)
        </span>
        <select
          name="character_id"
          defaultValue=""
          className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
        >
          <option value="" className="bg-ink">
            Run as Game Master only
          </option>
          {characters.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink">
              {c.name} — Lv {c.level} {c.race} {c.klass}
            </option>
          ))}
        </select>
      </label>

      {state.error && (
        <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <Submit label="Create campaign" />
    </form>
  );
}
