"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { getGoldPiecesGp } from "@/lib/inventory-currency";
import type { Character, InventoryItem } from "@/lib/types";
import {
  archetypeForClass,
  generalShopDayKey,
  generalShopSeed,
  generateGeneralShopStock,
  GENERAL_SHOP_MAX_LEVEL,
  GENERAL_SHOP_MIN_LEVEL,
  isSlotPurchased,
  parseGeneralShopPurchases,
  type GeneralShopListing,
  type ItemRarity,
  type ShopArchetype,
  type ShopStockSlot,
} from "@/lib/shop";
import { purchaseGeneralShopSlot } from "./actions";

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
  const router = useRouter();
  const playable = characters.filter(
    (c) => c.level >= GENERAL_SHOP_MIN_LEVEL && c.level <= GENERAL_SHOP_MAX_LEVEL,
  );
  const [characterId, setCharacterId] = useState(playable[0]?.id ?? "");
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<ShopStockSlot | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const purchases = useMemo(
    () => parseGeneralShopPurchases(selected?.general_shop_purchases),
    [selected?.general_shop_purchases],
  );

  const goldGp = useMemo(
    () => getGoldPiecesGp((selected?.inventory ?? []) as InventoryItem[]),
    [selected?.inventory],
  );

  function buy(slot: ShopStockSlot) {
    if (!selected || isPending) return;
    setPurchaseError(null);
    setPendingSlot(slot);
    startTransition(async () => {
      const result = await purchaseGeneralShopSlot(selected.id, slot);
      setPendingSlot(null);
      if (result.error) {
        setPurchaseError(result.error);
        return;
      }
      router.refresh();
    });
  }

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
            onChange={(e) => {
              setCharacterId(e.target.value);
              setPurchaseError(null);
            }}
            className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment outline-none focus:border-ember focus:ring-2 focus:ring-ember/30"
          >
            {playable.map((c) => (
              <option key={c.id} value={c.id} className="bg-ink">
                {c.name} — Lv {c.level} {c.race} {c.klass}
              </option>
            ))}
          </select>
        </label>
        <div className="text-right">
          <p className="text-xs text-parchment/45">
            Stock for{" "}
            <span className="text-parchment/70">{dayKey}</span>
            {" · "}
            refreshes daily
          </p>
          {selected && (
            <p className="mt-1 font-mono text-sm text-gold">
              {goldGp} GP in pouch
            </p>
          )}
        </div>
      </div>

      {selected && (
        <p className="text-xs text-parchment/45">
          Tailored for{" "}
          <span className="text-ember-bright/90">
            {ARCHETYPE_LABEL[archetypeForClass(selected.klass)]}
          </span>{" "}
          builds ({selected.klass}). Each slot can be bought once per day.
        </p>
      )}

      {purchaseError && (
        <p className="rounded-lg border border-ember/40 bg-ember/10 px-3 py-2 text-sm text-ember-bright" role="alert">
          {purchaseError}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {stock.map((item) => (
          <ShopSlotCard
            key={item.slot}
            item={item}
            purchased={isSlotPurchased(purchases, dayKey, item.slot)}
            canAfford={goldGp >= item.priceGp}
            buying={pendingSlot === item.slot && isPending}
            onBuy={() => buy(item.slot)}
          />
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
            <strong className="text-parchment/55">Slot 2</strong> — PHB mundane
            gear matched to your class (listed PHB price)
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
          Gold is deducted from your hero&apos;s &quot;Gold pieces&quot; stash row.
          Campaign loot and starting wealth both count.
        </p>
      </details>
    </div>
  );
}

function ShopSlotCard({
  item,
  purchased,
  canAfford,
  buying,
  onBuy,
}: {
  item: GeneralShopListing;
  purchased: boolean;
  canAfford: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  const soldOut = purchased;
  const disabled = soldOut || !canAfford || buying;

  let actionLabel = "Buy";
  if (soldOut) actionLabel = "Sold";
  else if (buying) actionLabel = "Buying…";
  else if (!canAfford) actionLabel = "Need more GP";

  return (
    <div
      className={`flex flex-col rounded-xl border bg-black/25 p-4 ${
        soldOut ? "border-white/5 opacity-60" : "border-white/8"
      }`}
    >
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
        <button
          type="button"
          onClick={onBuy}
          disabled={disabled}
          className="rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-transparent disabled:text-parchment/35"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
