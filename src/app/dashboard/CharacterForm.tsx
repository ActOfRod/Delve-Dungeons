"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ABILITIES,
  BACKGROUNDS,
  CLASSES,
  POINT_BUY_TOTAL,
  RACES,
  STANDARD_ARRAY_VALUES,
  abilityModifier,
  applyRacialBonuses,
  formatModifier,
  getBackground,
  getRacialBonuses,
  isValidPointBuy,
  isValidStandardArray,
  pointBuySpent,
  proficiencyBonus,
  rollAbilityScoreSet,
  rollStartingGold,
  startingHp,
  unarmoredAc,
  type AbilityGenMethod,
  type AbilityKey,
  type AbilityScores,
} from "@/lib/dnd";
import { createCharacter, type ActionResult } from "./actions";

const UNASSIGNED_SCORES: AbilityScores = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
};

const POINT_BUY_START: AbilityScores = {
  str: 8,
  dex: 8,
  con: 8,
  int: 8,
  wis: 8,
  cha: 8,
};

function assignStandardArray(): AbilityScores {
  const next = { ...UNASSIGNED_SCORES };
  ABILITIES.forEach((ability, index) => {
    next[ability.key] = STANDARD_ARRAY_VALUES[index] ?? 10;
  });
  return next;
}

export function CharacterForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult, FormData>(
    createCharacter,
    {},
  );

  const [race, setRace] = useState<string>(RACES[0]);
  const [klass, setKlass] = useState<string>(CLASSES[0]);
  const [background, setBackground] = useState<string>(BACKGROUNDS[0].name);
  const [method, setMethod] = useState<AbilityGenMethod>("pointbuy");
  const [baseScores, setBaseScores] = useState<AbilityScores>(POINT_BUY_START);
  const [rolledPool, setRolledPool] = useState<number[]>([]);
  const [halfElfA, setHalfElfA] = useState<AbilityKey>("str");
  const [halfElfB, setHalfElfB] = useState<AbilityKey>("dex");
  const [equipmentOption, setEquipmentOption] = useState<"kit" | "wealth">("kit");
  const [goldPreview, setGoldPreview] = useState<{ gp: number; notation: string } | null>(
    null,
  );

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);

  const halfElfChoices = useMemo(
    (): [AbilityKey, AbilityKey] | undefined =>
      race === "Half-Elf" && halfElfA !== halfElfB ? [halfElfA, halfElfB] : undefined,
    [race, halfElfA, halfElfB],
  );

  const finalScores = useMemo(
    () => applyRacialBonuses(baseScores, race, halfElfChoices),
    [baseScores, race, halfElfChoices],
  );

  const racialBonuses = useMemo(
    () => getRacialBonuses(race, halfElfChoices),
    [race, halfElfChoices],
  );

  const bgDef = getBackground(background);
  const profBonus = proficiencyBonus(1);
  const maxHp = startingHp(klass, finalScores.con);
  const ac = unarmoredAc(finalScores.dex);
  const pointsRemaining = POINT_BUY_TOTAL - pointBuySpent(baseScores);
  const scoresValid =
    method === "pointbuy"
      ? isValidPointBuy(baseScores)
      : method === "standard"
        ? isValidStandardArray(baseScores)
        : rolledPool.length === 0 || isValidStandardArray(baseScores);

  const halfElfValid = race !== "Half-Elf" || halfElfA !== halfElfB;

  function switchMethod(next: AbilityGenMethod) {
    setMethod(next);
    if (next === "pointbuy") setBaseScores({ ...POINT_BUY_START });
    if (next === "standard") setBaseScores(assignStandardArray());
    if (next === "roll") {
      setBaseScores({ ...UNASSIGNED_SCORES });
      setRolledPool([]);
    }
  }

  function adjustPointBuy(key: AbilityKey, delta: number) {
    setBaseScores((prev) => {
      const next = { ...prev, [key]: prev[key] + delta };
      if (next[key] < 8 || next[key] > 15) return prev;
      if (!isValidPointBuy(next)) return prev;
      return next;
    });
  }

  function assignFromPool(key: AbilityKey, value: number) {
    setBaseScores((prev) => {
      const next = { ...prev, [key]: value };
      if (method === "roll" && rolledPool.length > 0 && !isValidStandardArray(next)) {
        return prev;
      }
      if (method === "standard" && !isValidStandardArray(next)) return prev;
      return next;
    });
  }

  function handleRollScores() {
    const pool = rollAbilityScoreSet();
    setRolledPool(pool);
    setBaseScores({ ...UNASSIGNED_SCORES });
  }

  function handleRollGold() {
    setGoldPreview(rollStartingGold(klass));
    setEquipmentOption("wealth");
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="ability_method" value={method} />
      {method === "roll" && rolledPool.length > 0 && (
        <input type="hidden" name="rolled_pool" value={rolledPool.join(",")} />
      )}
      <input type="hidden" name="equipment_option" value={equipmentOption} />
      {equipmentOption === "wealth" && goldPreview && (
        <>
          <input type="hidden" name="starting_gold" value={goldPreview.gp} />
          <input type="hidden" name="starting_gold_notation" value={goldPreview.notation} />
        </>
      )}
      {race === "Half-Elf" && (
        <>
          <input type="hidden" name="half_elf_a" value={halfElfA} />
          <input type="hidden" name="half_elf_b" value={halfElfB} />
        </>
      )}
      {ABILITIES.map((a) => (
        <input
          key={a.key}
          type="hidden"
          name={`ability_${a.key}`}
          value={finalScores[a.key]}
        />
      ))}

      {/* Basics ----------------------------------------------------------- */}
      <section className="space-y-4">
        <SectionLabel>Character basics</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField name="name" label="Name" placeholder="Tasha Brightblade" required />
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Level
            </span>
            <div className="flex h-[42px] items-center rounded-xl border border-gold/20 bg-black/30 px-3 text-parchment">
              1
              <span className="ml-2 text-xs text-parchment/40">(starting hero)</span>
            </div>
          </div>
          <SelectField
            name="race"
            label="Race / ancestry"
            value={race}
            onChange={setRace}
            options={[...RACES]}
          />
          <SelectField
            name="klass"
            label="Class"
            value={klass}
            onChange={setKlass}
            options={[...CLASSES]}
          />
        </div>
        <SelectField
          name="background"
          label="Background"
          value={background}
          onChange={setBackground}
          options={BACKGROUNDS.map((b) => b.name)}
        />
        {bgDef && (
          <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-xs text-parchment/55">
            <span className="text-parchment/75">Skills:</span> {bgDef.skills.join(", ")}
            <span className="mx-2 text-parchment/25">·</span>
            <span className="text-parchment/75">Tools:</span> {bgDef.tools}
            <span className="mx-2 text-parchment/25">·</span>
            <span className="text-parchment/75">Feature:</span> {bgDef.feature}
          </div>
        )}
      </section>

      {/* Ability scores --------------------------------------------------- */}
      <section className="space-y-3 border-t border-white/5 pt-4">
        <SectionLabel>Ability scores</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["pointbuy", "Point buy (27 pts)"],
              ["standard", "Standard array"],
              ["roll", "Roll 4d6 drop lowest"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchMethod(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                method === key
                  ? "border-arcane/50 bg-arcane/15 text-arcane-bright"
                  : "border-white/10 text-parchment/55 hover:border-gold/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {method === "pointbuy" && (
          <p className="text-xs text-parchment/45">
            Scores 8–15 only. Points remaining:{" "}
            <span className={pointsRemaining < 0 ? "text-red-300" : "text-gold"}>
              {pointsRemaining}
            </span>{" "}
            / {POINT_BUY_TOTAL}
          </p>
        )}

        {method === "roll" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRollScores}
              className="rounded-lg border border-gold/25 bg-black/25 px-3 py-1.5 text-xs text-gold transition hover:border-gold/50"
            >
              Roll six scores
            </button>
            {rolledPool.length > 0 && (
              <span className="text-xs text-parchment/50">
                Rolled: {rolledPool.join(", ")} — assign each once below
              </span>
            )}
          </div>
        )}

        {race === "Half-Elf" && (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-arcane/20 bg-arcane/5 p-3">
            <span className="col-span-2 text-xs text-parchment/55">
              Half-Elf: +2 Charisma, +1 to two other abilities (pick two):
            </span>
            <MiniSelect label="+1 to" value={halfElfA} onChange={setHalfElfA} />
            <MiniSelect label="+1 to" value={halfElfB} onChange={setHalfElfB} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map((a) => {
            const bonus = racialBonuses[a.key] ?? 0;
            return (
              <div
                key={a.key}
                className="rounded-lg border border-gold/15 bg-black/20 p-2 text-center"
              >
                <div className="text-[10px] uppercase text-parchment/50">{a.short}</div>
                {method === "pointbuy" ? (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustPointBuy(a.key, -1)}
                      className="rounded border border-white/10 px-1.5 text-parchment/60 hover:border-gold/30"
                    >
                      −
                    </button>
                    <span className="w-6 text-parchment">{baseScores[a.key]}</span>
                    <button
                      type="button"
                      onClick={() => adjustPointBuy(a.key, 1)}
                      className="rounded border border-white/10 px-1.5 text-parchment/60 hover:border-gold/30"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <select
                    value={baseScores[a.key]}
                    onChange={(e) => assignFromPool(a.key, Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gold/10 bg-black/40 py-1 text-center text-sm text-parchment outline-none focus:border-arcane"
                  >
                    <option value={0} className="bg-ink">
                      —
                    </option>
                    {(method === "standard"
                      ? [...STANDARD_ARRAY_VALUES]
                      : rolledPool
                    ).map((value) => (
                      <option key={value} value={value} className="bg-ink">
                        {value}
                      </option>
                    ))}
                  </select>
                )}
                <div className="mt-0.5 text-[10px] text-gold">
                  {bonus > 0 && (
                    <span className="text-parchment/40">
                      {baseScores[a.key]}
                      {bonus > 0 ? `+${bonus}` : ""} →{" "}
                    </span>
                  )}
                  {finalScores[a.key]}{" "}
                  ({formatModifier(abilityModifier(finalScores[a.key]))})
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Derived stats & equipment ---------------------------------------- */}
      <section className="space-y-3 border-t border-white/5 pt-4">
        <SectionLabel>Starting resources</SectionLabel>
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatChip label="Hit points" value={`${maxHp}`} hint="Max hit die + CON" />
          <StatChip label="Armor class" value={`${ac}`} hint="Unarmored (10 + DEX)" />
          <StatChip label="Proficiency" value={formatModifier(profBonus)} hint="Level 1" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEquipmentOption("kit")}
            className={`rounded-lg border px-3 py-2 text-xs transition ${
              equipmentOption === "kit"
                ? "border-ember/40 bg-ember/10 text-parchment"
                : "border-white/10 text-parchment/55 hover:border-gold/30"
            }`}
          >
            Class starting equipment
          </button>
          <button
            type="button"
            onClick={handleRollGold}
            className={`rounded-lg border px-3 py-2 text-xs transition ${
              equipmentOption === "wealth"
                ? "border-ember/40 bg-ember/10 text-parchment"
                : "border-white/10 text-parchment/55 hover:border-gold/30"
            }`}
          >
            Roll starting wealth
          </button>
        </div>
        {equipmentOption === "wealth" && goldPreview && (
          <p className="text-xs text-gold">{goldPreview.notation}</p>
        )}
      </section>

      <TextAreaField
        name="bio"
        label="Backstory (optional)"
        placeholder="A short hook the Dungeon Master can weave into the story…"
      />

      {state.error && (
        <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      {!scoresValid && (
        <p className="text-xs text-parchment/45">
          {method === "pointbuy"
            ? "Spend up to 27 points across scores of 8–15."
            : "Assign each score exactly once."}
        </p>
      )}

      <Submit
        label="Create hero"
        disabled={!scoresValid || !halfElfValid || (equipmentOption === "wealth" && !goldPreview)}
      />
    </form>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-medium uppercase tracking-wide text-parchment/60">
      {children}
    </span>
  );
}

function StatChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-gold/15 bg-black/20 p-2">
      <div className="text-[10px] uppercase text-parchment/45">{label}</div>
      <div className="text-lg text-parchment">{value}</div>
      <div className="text-[10px] text-parchment/35">{hint}</div>
    </div>
  );
}

function MiniSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AbilityKey;
  onChange: (key: AbilityKey) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 text-parchment/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AbilityKey)}
        className="w-full rounded-lg border border-gold/15 bg-black/30 px-2 py-1.5 text-parchment outline-none focus:border-arcane"
      >
        {ABILITIES.map((a) => (
          <option key={a.key} value={a.key} className="bg-ink">
            {a.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
        {label}
      </span>
      <select
        name={name}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-ink">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
        {label}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
      />
    </label>
  );
}

export function Submit({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-gradient-to-r from-ember to-ember-bright py-3 font-medium text-ink shadow-lg shadow-ember/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Working…" : label}
    </button>
  );
}
