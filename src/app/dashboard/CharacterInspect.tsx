"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import type { Character, InventoryItem } from "@/lib/types";
import { ABILITIES, abilityModifier, formatModifier } from "@/lib/dnd";

interface CampaignRef {
  id: string;
  name: string;
  status: string;
}

export function CharacterInspect({
  character,
  currentUserId,
  onClose,
}: {
  character: Character | null;
  currentUserId: string;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [campaigns, setCampaigns] = useState<CampaignRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!character) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setCampaigns([]);
    /* eslint-enable react-hooks/set-state-in-effect */
    (async () => {
      const { data } = await supabase
        .from("campaign_members")
        .select("campaign:campaigns(id,name,status)")
        .eq("character_id", character.id)
        .eq("user_id", currentUserId);
      const list = ((data ?? [])
        .map((r) => (r as unknown as { campaign: CampaignRef | null }).campaign)
        .filter(Boolean) as CampaignRef[]);
      setCampaigns(list);
      setLoading(false);
    })();
  }, [character, supabase, currentUserId]);

  if (!character) return null;

  const inventory = (character.inventory ?? []) as InventoryItem[];
  const hpPct = Math.max(
    0,
    Math.min(100, Math.round((character.current_hp / character.max_hp) * 100)),
  );

  return (
    <Modal open={!!character} onClose={onClose} title={character.name}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-parchment/70">
            Level {character.level} {character.race} {character.klass}
          </p>
          <span className="rounded-lg border border-gold/25 px-2.5 py-1 text-xs text-gold">
            AC {character.armor_class}
          </span>
        </div>

        {/* HP bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="uppercase tracking-wide text-parchment/50">
              Hit Points
            </span>
            <span className="text-red-200">
              {character.current_hp} / {character.max_hp}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blood to-red-400"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* Ability scores */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-parchment/50">
            Ability Scores
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ABILITIES.map((a) => (
              <div
                key={a.key}
                className="rounded-lg border border-gold/15 bg-black/20 p-2 text-center"
              >
                <div className="text-[10px] uppercase text-parchment/40">
                  {a.short}
                </div>
                <div className="text-lg text-parchment">
                  {character.abilities[a.key]}
                </div>
                <div className="text-[11px] text-gold">
                  {formatModifier(abilityModifier(character.abilities[a.key]))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {(character.background || character.bio) && (
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            {character.background && (
              <p className="text-xs text-parchment/50">
                Background:{" "}
                <span className="text-parchment/80">{character.background}</span>
              </p>
            )}
            {character.bio && (
              <p className="mt-1 text-sm italic text-parchment/70">
                “{character.bio}”
              </p>
            )}
          </div>
        )}

        {/* Active campaigns */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-parchment/50">
            Active campaigns
          </div>
          {loading ? (
            <p className="text-sm text-parchment/40">Loading…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-parchment/40">
              Not currently in any campaign.
            </p>
          ) : (
            <div className="space-y-1.5">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="text-parchment">{c.name}</span>
                  <span className="text-xs uppercase text-parchment/40">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-parchment/50">
            Inventory
          </div>
          {inventory.length === 0 ? (
            <p className="text-sm text-parchment/40">
              No items yet — item trading between friends is coming soon.
            </p>
          ) : (
            <div className="space-y-1.5">
              {inventory.map((item, i) => (
                <div
                  key={item.id ?? i}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="text-parchment">{item.name}</span>
                  <span className="text-xs text-gold">×{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
