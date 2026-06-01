"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/Modal";
import type { InviteCode } from "@/lib/types";
import { createInviteCode, deleteInviteCode } from "@/app/actions/invites";

const USE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "1 use", value: 1 },
  { label: "5 uses", value: 5 },
  { label: "25 uses", value: 25 },
  { label: "Unlimited", value: null },
];

export function InviteCodesDialog({
  open,
  onClose,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [maxUses, setMaxUses] = useState<number | null>(5);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    if (data) setCodes(data as InviteCode[]);
  }, [supabase, userId]);

  useEffect(() => {
    // Load the creator's codes when the dialog opens (setState resolves async).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void load();
  }, [open, load]);

  function generate() {
    startTransition(async () => {
      await createInviteCode(maxUses);
      await load();
    });
  }

  function remove(id: string) {
    setCodes((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      await deleteInviteCode(id);
      await load();
    });
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  function signupLink(code: string): string {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/login?mode=signup&invite=${code}`;
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite testers">
      <div className="space-y-5">
        <p className="text-sm text-parchment/65">
          Sign-ups are invite-only during testing. Generate a code and share it
          (or the link) with someone you want to bring into the game.
        </p>

        <div className="rounded-xl border border-gold/20 bg-black/30 p-4">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
            New invite code
          </span>
          <div className="flex items-center gap-2">
            <select
              value={maxUses === null ? "null" : String(maxUses)}
              onChange={(e) =>
                setMaxUses(
                  e.target.value === "null" ? null : Number(e.target.value),
                )
              }
              className="flex-1 rounded-xl border border-gold/20 bg-black/40 px-3 py-2.5 text-parchment outline-none transition focus:border-arcane"
            >
              {USE_OPTIONS.map((o) => (
                <option
                  key={o.label}
                  value={o.value === null ? "null" : String(o.value)}
                  className="bg-ink"
                >
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={generate}
              disabled={pending}
              className="rounded-xl bg-gradient-to-r from-ember to-ember-bright px-5 py-2.5 font-medium text-ink transition hover:scale-[1.02] disabled:opacity-60"
            >
              {pending ? "…" : "Generate"}
            </button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-parchment/50">
            Your codes ({codes.length})
          </h3>
          {codes.length === 0 ? (
            <p className="text-sm text-parchment/40">
              No invite codes yet. Generate one above.
            </p>
          ) : (
            <div className="space-y-2">
              {codes.map((c) => {
                const exhausted =
                  c.max_uses !== null && c.uses >= c.max_uses;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/5 bg-black/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono text-lg tracking-[0.25em] ${
                          exhausted ? "text-parchment/30 line-through" : "text-gold"
                        }`}
                      >
                        {c.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copy(c.code, `code-${c.id}`)}
                          className="rounded-lg border border-gold/30 px-2.5 py-1 text-xs text-parchment/80 transition hover:border-gold/60 hover:bg-gold/10"
                        >
                          {copied === `code-${c.id}` ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => copy(signupLink(c.code), `link-${c.id}`)}
                          className="rounded-lg border border-arcane/30 px-2.5 py-1 text-xs text-arcane-bright transition hover:border-arcane/60 hover:bg-arcane/10"
                        >
                          {copied === `link-${c.id}` ? "Copied!" : "Copy link"}
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          aria-label="Delete code"
                          className="rounded-lg px-2 py-1 text-parchment/40 transition hover:text-red-300"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M6 6l12 12M18 6L6 18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-parchment/45">
                      {c.max_uses === null
                        ? `${c.uses} used · unlimited`
                        : `${c.uses} / ${c.max_uses} used`}
                      {exhausted && " · exhausted"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
