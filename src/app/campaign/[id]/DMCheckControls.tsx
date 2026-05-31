"use client";

import { useMemo, useState, useTransition } from "react";
import type { CampaignMember, Character } from "@/lib/types";
import { DC_PRESETS, SKILLS } from "@/lib/dnd";
import { requestCheck } from "./actions";

type Member = CampaignMember & { character?: Character | null };

export function DMCheckControls({
  campaignId,
  members,
  activeCharacterId,
}: {
  campaignId: string;
  members: Member[];
  activeCharacterId: string | null;
}) {
  const playable = useMemo(
    () => members.filter((m) => m.character_id && m.character),
    [members],
  );

  const [characterId, setCharacterId] = useState<string>(
    activeCharacterId ?? playable[0]?.character_id ?? "",
  );
  const [skill, setSkill] = useState("Perception");
  const [dc, setDc] = useState(15);
  const [pending, startTransition] = useTransition();

  function request() {
    const target = playable.find((m) => m.character_id === characterId);
    if (!target?.character) return;
    const skillDef = SKILLS.find((s) => s.name === skill);
    startTransition(async () => {
      await requestCheck(campaignId, {
        character_id: target.character!.id,
        character_name: target.character!.name,
        skill,
        ability: skillDef?.ability ?? "wis",
        dc,
        requested_at: new Date().toISOString(),
      });
    });
  }

  return (
    <div className="dd-panel rounded-2xl border-arcane/30 p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm uppercase tracking-wide text-arcane-bright">
        <span>✦</span> DM Tools — Request a check
      </h2>

      {playable.length === 0 ? (
        <p className="text-xs text-parchment/40">
          No heroes have joined yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase text-parchment/40">
              Who rolls
            </span>
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-parchment outline-none focus:border-arcane"
            >
              {playable.map((m) => (
                <option key={m.id} value={m.character_id ?? ""} className="bg-ink">
                  {m.character?.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <label className="block flex-1">
              <span className="mb-1 block text-[10px] uppercase text-parchment/40">
                Skill
              </span>
              <select
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-parchment outline-none focus:border-arcane"
              >
                {SKILLS.map((s) => (
                  <option key={s.name} value={s.name} className="bg-ink">
                    {s.name} ({s.ability.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-20">
              <span className="mb-1 block text-[10px] uppercase text-parchment/40">
                DC
              </span>
              <input
                type="number"
                min={1}
                max={40}
                value={dc}
                onChange={(e) => setDc(Number(e.target.value) || 10)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm text-parchment outline-none focus:border-arcane"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-1">
            {DC_PRESETS.map((p) => (
              <button
                key={p.dc}
                onClick={() => setDc(p.dc)}
                className={`rounded-md border px-1.5 py-0.5 text-[10px] transition ${
                  dc === p.dc
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-white/10 text-parchment/50 hover:border-gold/30"
                }`}
              >
                {p.label} {p.dc}
              </button>
            ))}
          </div>

          <button
            onClick={request}
            disabled={pending || !characterId}
            className="w-full rounded-xl bg-gradient-to-r from-ember to-ember-bright py-2 text-sm font-medium text-ink transition hover:scale-[1.02] disabled:opacity-60"
          >
            {pending ? "Calling…" : "Call for the check"}
          </button>
        </div>
      )}
    </div>
  );
}
