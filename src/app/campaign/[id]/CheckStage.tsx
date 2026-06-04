"use client";

import { useEffect, useRef, useState } from "react";
import type { PendingCheck } from "@/lib/types";
import { formatModifier, rollDie } from "@/lib/dnd";
import { Die } from "@/components/Dice";

export function CheckStage({
  pendingCheck,
  amITarget,
  modifier,
  dmThinking = false,
  onResolve,
}: {
  pendingCheck: PendingCheck | null;
  amITarget: boolean;
  modifier: number;
  dmThinking?: boolean;
  onResolve: (rolls: number[], total: number, modifier: number) => Promise<void>;
}) {
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(20);
  const [resolved, setResolved] = useState<{
    natural: number;
    total: number;
    success: boolean;
  } | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear any running roll animation when the stage unmounts. A new check
  // remounts this component via its `key`, giving us fresh local state.
  useEffect(() => {
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  if (!pendingCheck) return null;

  async function roll() {
    if (rolling || resolved || dmThinking) return;
    setRolling(true);

    // Tumble animation: flash random faces for ~900ms then settle.
    animRef.current = setInterval(() => setFace(rollDie("d20")), 70);
    await new Promise((r) => setTimeout(r, 900));
    if (animRef.current) clearInterval(animRef.current);

    const natural = rollDie("d20");
    setFace(natural);
    const total = natural + modifier;
    const success = total >= pendingCheck!.dc;
    setResolved({ natural, total, success });
    setRolling(false);
    await onResolve([natural], total, modifier);
  }

  return (
    <div className="dd-fade-up rounded-2xl border border-ember/40 bg-gradient-to-br from-ember/10 via-black/40 to-arcane/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ember-bright">
            <span className="dd-pulse">⚄</span> Skill check
          </div>
          <h3 className="mt-1 font-display text-xl text-parchment">
            {pendingCheck.skill} Check
            <span className="ml-2 text-sm text-gold">DC {pendingCheck.dc}</span>
          </h3>
          <p className="text-sm text-parchment/60">
            {amITarget
              ? "The dice are in your hands."
              : `${pendingCheck.character_name} must roll.`}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Die value={face} sides={20} rolling={rolling} size={72} />

          {amITarget ? (
            <div className="text-center">
              {!resolved ? (
                <>
                  <button
                    onClick={() => void roll()}
                    disabled={rolling || dmThinking}
                    className="rounded-xl bg-gradient-to-r from-ember to-ember-bright px-6 py-3 font-display font-medium text-ink shadow-lg shadow-ember/30 transition hover:scale-[1.03] disabled:opacity-60"
                  >
                    {dmThinking ? "DM is setting the scene…" : rolling ? "Rolling…" : "Roll d20"}
                  </button>
                  <div className="mt-1.5 text-xs text-parchment/50">
                    modifier {formatModifier(modifier)}
                  </div>
                </>
              ) : (
                <ResolvedBadge
                  natural={resolved.natural}
                  total={resolved.total}
                  success={resolved.success}
                />
              )}
            </div>
          ) : (
            <div className="text-center">
              {resolved ? (
                <ResolvedBadge
                  natural={resolved.natural}
                  total={resolved.total}
                  success={resolved.success}
                />
              ) : (
                <div className="flex items-center gap-2 text-sm text-parchment/60">
                  <span className="dd-pulse h-2 w-2 rounded-full bg-ember-bright" />
                  Waiting for the roll…
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResolvedBadge({
  natural,
  total,
  success,
}: {
  natural: number;
  total: number;
  success: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-2 ${
        success
          ? "border-moss/50 bg-moss/15 text-green-200"
          : "border-blood/50 bg-blood/15 text-red-200"
      }`}
    >
      <div className="text-2xl font-bold">{total}</div>
      <div className="text-[11px] uppercase tracking-wide">
        {natural === 20
          ? "Natural 20!"
          : natural === 1
            ? "Natural 1!"
            : success
              ? "Success"
              : "Failure"}
      </div>
    </div>
  );
}
