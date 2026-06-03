"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/lib/types";
import {
  archetypeForClass,
  generalShopDayKey,
  generalShopSeed,
  generateGeneralShopStock,
  GENERAL_SHOP_MAX_LEVEL,
  GENERAL_SHOP_MIN_LEVEL,
  type GeneralShopListing,
  type ItemRarity,
  type ShopArchetype,
} from "@/lib/shop";

const ARCHETYPE_LABEL: Record<ShopArchetype, string> = {
  martial: "martial warrior",
  agile: "agile combatant",
  caster: "full spellcaster",
  divine: "divine & nature support",
};

const RARITY_STYLE: Record<ItemRarity, string> = {
  common: "border-white/20 bg-white/10 text-parchment/70",
  uncommon: "border-moss/40 bg-moss/10 text-green-200",
  rare: "border-arcane/40 bg-arcane/15 text-arcane-bright",
  very_rare: "border-gold/50 bg-gold/15 text-gold",
};

export function GeneralShopClient({
  characters,
  userId,
}: {
  characters: Character[];
  userId: string;
}) {
  const playable = characters.filter(
    (c) => c.level >= GENERAL_SHOP_MIN_LEVEL && c.level <= GENERAL_SHOP_MAX_LEVEL,
  );
  const [characterId, setCharacterId] = useState(playable[0]?.id ?? "");

  const selected = playable.find((c) => c.id === characterId);
  const dayKey = generalShopDayKey();

  const stock = useMemo(() => {
    if (!selected) return [];
    return generateGeneralShopStock(
      selected.klass,
      selected.level,
      generalShopSeed(userId, selected.id, dayKey),
    );
  }, [selected, userId, dayKey]);

  if (characters.length === 0) {
    return (
      <p className="text-sm text-parchment/50">
        Roll up a hero first — The General stocks gear for levels{" "}
        {GENERAL_SHOP_MIN_LEVEL}–{GENERAL_SHOP_MAX_LEVEL}.
      </p>
    );
  }

  if (playable.length === 0) {
    return (
      <p className="text-sm text-parchment/50">
        The General currently serves adventurers of levels{" "}
        {GENERAL_SHOP_MIN_LEVEL}–{GENERAL_SHOP_MAX_LEVEL}. Level up or create a
        hero in that range to browse today&apos;s stock.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/55">
            Shopping as
          </span>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment outline-none focus:border-ember focus:ring-2 focus:ring-ember/30"
          >
            {playable.map((c) => (
              <option key={c.id} value={c.id} className="bg-ink">
                {c.name} — Lv {c.level} {c.race} {c.klass}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-parchment/45">
          Stock for{" "}
          <span className="text-parchment/70">{dayKey}</span>
          {" · "}
          refreshes daily
        </p>
      </div>

      {selected && (
        <p className="text-xs text-parchment/45">
          Tailored for{" "}
          <span className="text-ember-bright/90">
            {ARCHETYPE_LABEL[archetypeForClass(selected.klass)]}
          </span>{" "}
          builds ({selected.klass}). Purchases coming soon.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {stock.map((item) => (
          <ShopSlotCard key={item.slot} item={item} />
        ))}
      </div>

      <details className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-xs text-parchment/45">
        <summary className="cursor-pointer font-medium text-parchment/60">
          How slots 2–4 are rolled
        </summary>
        <ul className="mt-3 list-inside list-disc space-y-1.5">
          <li>
            <strong className="text-parchment/55">Slot 1</strong> — healing potions
            (70% standard / 18% greater / 9% superior / 10% supreme; qty 1–5)
          </li>
          <li>
            <strong className="text-parchment/55">Slot 2</strong> — Utility: 60%
            common / 35% uncommon / 5% rare (50–250 GP)
          </li>
          <li>
            <strong className="text-parchment/55">Slot 3</strong> — Defense: 40%
            / 50% / 10% (100–500 GP)
          </li>
          <li>
            <strong className="text-parchment/55">Slot 4</strong> — Offense: 20%
            / 60% / 20% (150–800 GP)
          </li>
        </ul>
        <p className="mt-2">
          The same drop tables will drive magic item finds in campaigns later.
        </p>
      </details>
    </div>
  );
}

function ShopSlotCard({ item }: { item: GeneralShopListing }) {
  return (
    <div className="flex flex-col rounded-xl border border-white/8 bg-black/25 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-parchment/40">
          Slot {item.slot} · {item.category}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${RARITY_STYLE[item.rarity]}`}
        >
          {item.rarity}
        </span>
      </div>
      <h3 className="font-display text-lg text-parchment">{item.name}</h3>
      {item.quantity > 1 && (
        <p className="mt-0.5 text-xs text-gold">×{item.quantity}</p>
      )}
      {item.description && (
        <p className="mt-2 text-xs leading-snug text-parchment/50">
          {item.description}
        </p>
      )}
      <div className="mt-4 flex items-end justify-between gap-2">
        <span className="rounded-full border border-gold/40 bg-gold/15 px-3.5 py-1.5 text-xs font-medium text-gold">
          {item.priceGp} GP
        </span>
        <span className="text-[10px] text-parchment/35">Buy soon</span>
      </div>
    </div>
  );
}
