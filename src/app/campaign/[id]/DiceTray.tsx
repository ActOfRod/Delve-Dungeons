"use client";

import { useState } from "react";
import { DICE, rollDice, type DieType } from "@/lib/dnd";

export function DiceTray({
  onRoll,
}: {
  onRoll: (
    notation: string,
    rolls: number[],
    modifier: number,
    total: number,
  ) => Promise<void>;
}) {
  const [die, setDie] = useState<DieType>("d20");
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [last, setLast] = useState<string | null>(null);

  async function roll() {
    const result = rollDice(die, count, modifier);
    const notation = `${count}${die}${
      modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ""
    }`;
    setLast(`${notation} → ${result.total}`);
    await onRoll(notation, result.rolls, modifier, result.total);
  }

  return (
    <div className="dd-panel rounded-2xl p-4">
      <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-parchment/70">
        Dice Tray
      </h2>
      <div className="grid grid-cols-4 gap-1.5">
        {DICE.map((d) => (
          <button
            key={d}
            onClick={() => setDie(d)}
            className={`rounded-lg border py-1.5 text-xs font-medium transition ${
              die === d
                ? "border-gold/60 bg-gold/15 text-gold"
                : "border-white/10 bg-black/20 text-parchment/70 hover:border-gold/30"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="flex flex-1 flex-col">
          <span className="mb-1 text-[10px] uppercase text-parchment/40">Count</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
            }
            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm text-parchment outline-none focus:border-arcane"
          />
        </label>
        <label className="flex flex-1 flex-col">
          <span className="mb-1 text-[10px] uppercase text-parchment/40">
            Modifier
          </span>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(Number(e.target.value) || 0)}
            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm text-parchment outline-none focus:border-arcane"
          />
        </label>
      </div>

      <button
        onClick={() => void roll()}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-arcane to-arcane-bright py-2 text-sm font-medium text-ink transition hover:scale-[1.02]"
      >
        Roll
      </button>
      {last && (
        <p className="mt-2 text-center text-xs text-gold">{last}</p>
      )}
    </div>
  );
}
