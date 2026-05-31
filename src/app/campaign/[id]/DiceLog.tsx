"use client";

import type { DiceRoll } from "@/lib/types";

export function DiceLog({ rolls }: { rolls: DiceRoll[] }) {
  return (
    <div className="dd-panel rounded-2xl p-4">
      <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-parchment/70">
        Roll Log
      </h2>
      {rolls.length === 0 ? (
        <p className="text-xs text-parchment/40">No rolls yet.</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {rolls.map((r) => (
            <li
              key={r.id}
              className="dd-fade-up flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <div className="truncate text-xs text-parchment/80">
                  {r.character_name || "Someone"}
                  {r.skill && (
                    <span className="text-parchment/50"> · {r.skill}</span>
                  )}
                </div>
                <div className="text-[10px] text-parchment/40">
                  {r.notation}
                  {r.modifier
                    ? r.modifier > 0
                      ? ` +${r.modifier}`
                      : ` ${r.modifier}`
                    : ""}
                  {r.dc != null ? ` vs DC ${r.dc}` : ""}
                </div>
              </div>
              <div
                className={`shrink-0 rounded-md px-2 py-0.5 text-sm font-bold ${
                  r.success == null
                    ? "bg-white/5 text-gold"
                    : r.success
                      ? "bg-moss/20 text-green-200"
                      : "bg-blood/20 text-red-200"
                }`}
              >
                {r.total}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
