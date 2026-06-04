"use client";

import { useMemo, useState, useTransition } from "react";
import type { CampaignMember, Character } from "@/lib/types";
import { grantCampaignLoot } from "./actions";

type Member = CampaignMember & { character?: Character | null };

export function DMLootControls({
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
  const [kind, setKind] = useState<"individual" | "hoard">("individual");
  const [cr, setCr] = useState(1);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function grant() {
    if (!characterId) return;
    setError(null);
    startTransition(async () => {
      const result = await grantCampaignLoot(campaignId, characterId, kind, cr);
      if (result.error) {
        setError(result.error);
        return;
      }
      setLastSummary(result.summary ?? "Treasure granted.");
    });
  }

  return (
    <div className="dd-panel rounded-2xl border-gold/25 p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm uppercase tracking-wide text-gold">
        <span>◎</span> DM Tools — Treasure
      </h2>

      {playable.length === 0 ? (
        <p className="text-xs text-parchment/40">No heroes have joined yet.</p>
      ) : (
        <div className="space-y-2.5">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase text-parchment/40">
              Award to
            </span>
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold"
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
                Table
              </span>
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "individual" | "hoard")}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold"
              >
                <option value="individual" className="bg-ink">
                  Individual creature
                </option>
                <option value="hoard" className="bg-ink">
                  Treasure hoard
                </option>
              </select>
            </label>
            <label className="block w-20">
              <span className="mb-1 block text-[10px] uppercase text-parchment/40">
                CR
              </span>
              <input
                type="number"
                min={0}
                max={30}
                value={cr}
                onChange={(e) => setCr(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm text-parchment outline-none focus:border-gold"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={grant}
            disabled={pending || !characterId}
            className="w-full rounded-xl border border-gold/40 bg-gold/15 py-2 text-sm font-medium text-gold transition hover:bg-gold/25 disabled:opacity-60"
          >
            {pending ? "Rolling…" : "Roll & add to stash"}
          </button>

          {error && (
            <p className="text-xs text-ember-bright" role="alert">
              {error}
            </p>
          )}
          {lastSummary && !error && (
            <p className="text-[10px] leading-snug text-parchment/50">{lastSummary}</p>
          )}
        </div>
      )}
    </div>
  );
}
