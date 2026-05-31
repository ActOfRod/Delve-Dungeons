"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Character } from "@/lib/types";
import { joinCampaign, type ActionResult } from "./actions";
import { Submit } from "./CharacterForm";

export function JoinForm({
  characters,
  onDone,
}: {
  characters: Character[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult, FormData>(
    joinCampaign,
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

  if (characters.length === 0) {
    return (
      <div className="text-center text-sm text-parchment/70">
        <p>You need a hero before you can join a campaign.</p>
        <p className="mt-2 text-parchment/50">
          Close this and create one with{" "}
          <span className="text-ember">+ New hero</span> first.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
          Invite code
        </span>
        <input
          name="invite_code"
          required
          placeholder="ABC123"
          maxLength={6}
          className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-center font-mono text-lg uppercase tracking-[0.4em] text-parchment placeholder:tracking-normal placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
          Bring a hero
        </span>
        <select
          name="character_id"
          required
          defaultValue=""
          className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
        >
          <option value="" disabled className="bg-ink">
            Choose a character…
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

      <Submit label="Join campaign" />
      <p className="text-center text-xs text-parchment/40">
        <Link href="/dashboard" className="hover:underline">
          Looking to start your own? Create a campaign instead.
        </Link>
      </p>
    </form>
  );
}
