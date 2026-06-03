"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/lib/types";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaigns";
import { createCampaign, type ActionResult } from "./actions";
import { Submit } from "./CharacterForm";
import type { FriendOption } from "./DashboardClient";

const LENGTH_BADGE: Record<string, string> = {
  Short: "border-moss/40 bg-moss/10 text-green-200",
  Medium: "border-gold/40 bg-gold/10 text-gold",
  Long: "border-arcane/40 bg-arcane/10 text-arcane-bright",
};

function settingWithParty(t: CampaignTemplate): string {
  return `${t.setting} · best for ${t.minPlayers}–${t.maxPlayers} players (level ${t.suggestedLevel})`;
}

function pickDefaultCharacter(
  characters: Character[],
  busyCharacterIds: ReadonlySet<string>,
): string {
  return characters.find((c) => !busyCharacterIds.has(c.id))?.id ?? "";
}

export function CampaignForm({
  characters,
  busyCharacterIds = new Set<string>(),
  friends = [],
  onDone,
}: {
  characters: Character[];
  busyCharacterIds?: ReadonlySet<string>;
  friends?: FriendOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult, FormData>(
    createCampaign,
    {},
  );

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [name, setName] = useState("");
  const [setting, setSetting] = useState("");
  const [description, setDescription] = useState("");
  const [characterId, setCharacterId] = useState(() =>
    pickDefaultCharacter(characters, busyCharacterIds),
  );
  const [dmVoiceEnabled, setDmVoiceEnabled] = useState(false);

  useEffect(() => {
    if (state.ok && state.redirect) {
      router.push(state.redirect);
    } else if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  function pickTemplate(t: CampaignTemplate) {
    setSelectedKey(t.key);
    setName(t.title);
    setSetting(settingWithParty(t));
    setDescription(t.premise);
  }

  function pickCustom() {
    setSelectedKey("custom");
    setName("");
    setSetting("");
    setDescription("");
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Ready-made adventures ------------------------------------------- */}
      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-parchment/60">
          Choose a ready-made adventure
        </span>
        <p className="mb-3 text-xs text-parchment/45">
          New to D&amp;D? Pick one and everything below is filled in for you. You
          can still tweak any of it.
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          {CAMPAIGN_TEMPLATES.map((t) => {
            const active = selectedKey === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTemplate(t)}
                className={`flex flex-col rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-ember/60 bg-ember/10 ring-2 ring-ember/30"
                    : "border-white/10 bg-black/20 hover:border-gold/40"
                }`}
              >
                <span
                  className={`mb-1.5 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    LENGTH_BADGE[t.length]
                  }`}
                >
                  {t.length} · {t.minPlayers}–{t.maxPlayers}P
                </span>
                <span className="font-display text-sm text-parchment">
                  {t.title}
                </span>
                <span className="mt-1 text-[11px] leading-snug text-parchment/55">
                  {t.summary}
                </span>
                <span className="mt-2 text-[10px] uppercase tracking-wide text-parchment/35">
                  {t.sessions} · Lv {t.suggestedLevel}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={pickCustom}
          className={`mt-2 w-full rounded-xl border border-dashed px-3 py-2 text-xs transition ${
            selectedKey === "custom"
              ? "border-arcane/50 bg-arcane/10 text-arcane-bright"
              : "border-white/15 text-parchment/55 hover:border-gold/40"
          }`}
        >
          ✦ Start from scratch (write my own)
        </button>
      </div>

      <div className="border-t border-white/5 pt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
            Campaign name
          </span>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="Grim dark fantasy, lighthearted high adventure…"
            className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
            Premise for the Dungeon Master {selectedKey === "custom" && "(optional)"}
          </span>
          <textarea
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
          >
            <option value="" className="bg-ink">
              Run as Game Master only
            </option>
            {characters.map((c) => {
              const inCampaign = busyCharacterIds.has(c.id);
              return (
                <option key={c.id} value={c.id} className="bg-ink">
                  {c.name} — Lv {c.level} {c.race} {c.klass}
                  {inCampaign ? " (in a campaign)" : ""}
                </option>
              );
            })}
          </select>
          {characterId && (
            <div className="mt-3 rounded-xl border border-arcane/25 bg-arcane/5 p-3">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-arcane-bright">
                AI Dungeon Master
              </span>
              <p className="mb-3 text-[11px] leading-snug text-parchment/50">
                With a hero at the table, Gemini runs the game. Choose how you
                want to experience the narration.
              </p>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    dmVoiceEnabled
                      ? "border-arcane/50 bg-arcane/15 text-parchment"
                      : "border-white/10 text-parchment/60 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="dm_voice_mode"
                    checked={dmVoiceEnabled}
                    onChange={() => setDmVoiceEnabled(true)}
                    className="accent-arcane"
                  />
                  Voice narration
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    !dmVoiceEnabled
                      ? "border-white/20 bg-white/10 text-parchment"
                      : "border-white/10 text-parchment/60 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="dm_voice_mode"
                    checked={!dmVoiceEnabled}
                    onChange={() => setDmVoiceEnabled(false)}
                    className="accent-arcane"
                  />
                  Text only
                </label>
              </div>
              <input
                type="hidden"
                name="dm_voice_enabled"
                value={dmVoiceEnabled ? "true" : "false"}
              />
            </div>
          )}
        </label>

        {friends.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Invite friends
            </span>
            <div className="grid max-h-40 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {friends.map((f) => (
                <label
                  key={f.userId}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-parchment transition hover:border-gold/40"
                >
                  <input
                    type="checkbox"
                    name="invite_friends"
                    value={f.userId}
                    className="accent-ember"
                  />
                  <span className="truncate">
                    {f.displayName ?? "Adventurer"}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-parchment/40">
              They&apos;ll get a notification with a one-tap join link.
            </p>
          </div>
        )}
      </div>

      {state.error && (
        <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <Submit label="Create campaign" />
    </form>
  );
}
