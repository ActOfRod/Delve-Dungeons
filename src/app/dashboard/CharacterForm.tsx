"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ABILITIES,
  CLASSES,
  DEFAULT_ABILITIES,
  RACES,
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from "@/lib/dnd";
import { createCharacter, type ActionResult } from "./actions";

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function CharacterForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult, FormData>(
    createCharacter,
    {},
  );
  const [abilities, setAbilities] =
    useState<Record<AbilityKey, number>>(DEFAULT_ABILITIES);

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);

  function applyStandardArray() {
    const keys = ABILITIES.map((a) => a.key);
    const next = { ...abilities };
    keys.forEach((k, i) => (next[k] = STANDARD_ARRAY[i] ?? 10));
    setAbilities(next);
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField name="name" label="Name" placeholder="Tasha Brightblade" required />
        <TextField
          name="background"
          label="Background"
          placeholder="Sage, Soldier, Urchin…"
        />
        <SelectField name="race" label="Race" options={[...RACES]} />
        <SelectField name="klass" label="Class" options={[...CLASSES]} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-parchment/60">
            Ability scores
          </span>
          <button
            type="button"
            onClick={applyStandardArray}
            className="text-xs text-arcane-bright hover:underline"
          >
            Use standard array
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map((a) => (
            <div
              key={a.key}
              className="rounded-lg border border-gold/15 bg-black/20 p-2 text-center"
            >
              <label className="text-[10px] uppercase text-parchment/50">
                {a.short}
              </label>
              <input
                type="number"
                name={`ability_${a.key}`}
                min={1}
                max={20}
                value={abilities[a.key]}
                onChange={(e) =>
                  setAbilities((prev) => ({
                    ...prev,
                    [a.key]: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-md border border-gold/10 bg-black/40 py-1 text-center text-parchment outline-none focus:border-arcane"
              />
              <div className="mt-0.5 text-[10px] text-gold">
                {formatModifier(abilityModifier(abilities[a.key]))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <TextAreaField
        name="bio"
        label="Backstory (optional)"
        placeholder="A short hook the Dungeon Master can weave into the story…"
      />

      {state.error && (
        <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <Submit label="Create hero" />
    </form>
  );
}

function TextField({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
        {label}
      </span>
      <select
        name={name}
        className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-ink">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
        {label}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
      />
    </label>
  );
}

export function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-r from-ember to-ember-bright py-3 font-medium text-ink shadow-lg shadow-ember/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Working…" : label}
    </button>
  );
}
