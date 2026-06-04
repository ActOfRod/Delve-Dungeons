"use client";

import type { CampaignMember, Character, Profile } from "@/lib/types";
import { abilityModifier, formatModifier } from "@/lib/dnd";
import { xpProgress } from "@/lib/xp";

type Member = CampaignMember & {
  character?: Character | null;
  profile?: Profile | null;
};

export function PartyPanel({
  members,
  online,
  activeCharacterId,
  currentUserId,
  isMyTurn,
  hasCharacter,
  onAdvanceTurn,
  onClaimSpotlight,
}: {
  members: Member[];
  online: Set<string>;
  activeCharacterId: string | null;
  currentUserId: string;
  isMyTurn: boolean;
  hasCharacter: boolean;
  onAdvanceTurn: () => void;
  onClaimSpotlight: () => void;
}) {
  const activeMember = members.find(
    (m) => m.character_id && m.character_id === activeCharacterId,
  );
  const activeName = activeMember?.character?.name;

  return (
    <div className="dd-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-wide text-parchment/70">
          The Party
        </h2>
        <span className="text-xs text-parchment/40">{members.length} at table</span>
      </div>

      {/* Whose turn banner */}
      <div className="mb-3 rounded-xl border border-gold/25 bg-gradient-to-r from-gold/10 to-transparent p-3">
        <div className="text-[10px] uppercase tracking-wider text-parchment/50">
          Current turn
        </div>
        {activeName ? (
          <div className="mt-0.5 font-display text-base text-gold">
            {activeName}
            {isMyTurn && (
              <span className="ml-2 rounded bg-ember/20 px-1.5 py-0.5 text-[10px] uppercase text-ember-bright">
                You
              </span>
            )}
          </div>
        ) : (
          <div className="mt-0.5 text-sm italic text-parchment/60">
            The Dungeon Master narrates…
          </div>
        )}
      </div>

      <div className="space-y-2">
        {members.map((m) => {
          const isActive =
            m.character_id && m.character_id === activeCharacterId;
          const isOnline = online.has(m.user_id);
          const name =
            m.character?.name ||
            m.profile?.display_name ||
            (m.role === "dm" ? "Dungeon Master" : "Spectator");
          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                isActive
                  ? "border-gold/50 bg-gold/10"
                  : "border-white/5 bg-black/20"
              }`}
            >
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-arcane/40 to-ember/30 font-display text-sm text-parchment">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink ${
                    isOnline ? "bg-moss" : "bg-parchment/20"
                  }`}
                  title={isOnline ? "Online" : "Away"}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm text-parchment">{name}</span>
                  {m.role === "dm" && (
                    <span className="rounded bg-arcane/20 px-1.5 py-0.5 text-[9px] uppercase text-arcane-bright">
                      DM
                    </span>
                  )}
                  {m.user_id === currentUserId && (
                    <span className="text-[10px] text-parchment/40">(you)</span>
                  )}
                </div>
                {m.character && (
                  <div className="space-y-1 text-[11px] text-parchment/50">
                    <div className="flex items-center gap-2">
                      <span>
                        Lv {m.character.level} {m.character.klass}
                      </span>
                      <span className="text-red-300/70">
                        {m.character.current_hp}/{m.character.max_hp} HP
                      </span>
                    </div>
                    {(() => {
                      const xp = m.character.xp ?? 0;
                      const prog = xpProgress(m.character.level, xp);
                      if (prog.xpForNextLevel == null) {
                        return (
                          <span className="text-gold/80">{xp.toLocaleString()} XP (max level)</span>
                        );
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-black/40">
                            <div
                              className="h-full rounded-full bg-gold/70"
                              style={{ width: `${prog.progressPercent}%` }}
                            />
                          </div>
                          <span className="shrink-0 tabular-nums text-[10px] text-parchment/40">
                            {prog.xpIntoLevel}/{prog.xpForNextLevel}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              {m.character && (
                <div className="text-right text-[10px] text-gold">
                  AC {m.character.armor_class}
                  <div className="text-parchment/40">
                    DEX {formatModifier(abilityModifier(m.character.abilities.dex))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        {hasCharacter && !isMyTurn && (
          <button
            onClick={onClaimSpotlight}
            className="flex-1 rounded-xl border border-gold/20 py-2 text-xs text-parchment/80 transition hover:border-gold/50 hover:bg-gold/10"
          >
            Take spotlight
          </button>
        )}
        <button
          onClick={onAdvanceTurn}
          className="flex-1 rounded-xl bg-gradient-to-r from-arcane to-arcane-bright py-2 text-xs font-medium text-ink transition hover:scale-[1.02]"
        >
          End turn →
        </button>
      </div>
    </div>
  );
}
