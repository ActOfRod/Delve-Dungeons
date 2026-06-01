"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/Modal";
import type { Friendship, Profile } from "@/lib/types";
import {
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/app/actions/social";

export function FriendsDialog({
  open,
  onClose,
  userId,
  friendCode,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  friendCode: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<Friendship[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("friendships")
      .select(
        "*, requester:profiles!requester_id(id,display_name,friend_code), addressee:profiles!addressee_id(id,display_name,friend_code)",
      )
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (data) setRows(data as Friendship[]);
  }, [supabase, userId]);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      void load();
      setError(null);
      setNotice(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, load]);

  const incoming = rows.filter(
    (r) => r.status === "pending" && r.addressee_id === userId,
  );
  const outgoing = rows.filter(
    (r) => r.status === "pending" && r.requester_id === userId,
  );
  const friends = rows.filter((r) => r.status === "accepted");

  function other(r: Friendship): Profile | null {
    return (r.requester_id === userId ? r.addressee : r.requester) ?? null;
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendFriendRequest(code);
      if (res.error) setError(res.error);
      else {
        setNotice("Friend request sent!");
        setCode("");
        await load();
        router.refresh();
      }
    });
  }

  function respond(id: string, accept: boolean) {
    startTransition(async () => {
      await respondToFriendRequest(id, accept);
      await load();
      router.refresh();
    });
  }

  function unfriend(id: string) {
    startTransition(async () => {
      await removeFriend(id);
      await load();
      router.refresh();
    });
  }

  function copyCode() {
    if (!friendCode) return;
    navigator.clipboard?.writeText(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open={open} onClose={onClose} title="Friends">
      <div className="space-y-5">
        {/* Your friend code */}
        <div className="rounded-xl border border-gold/20 bg-black/30 p-4">
          <div className="text-[10px] uppercase tracking-wider text-parchment/50">
            Your friend code
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="font-mono text-xl tracking-[0.3em] text-gold">
              {friendCode ?? "——————"}
            </span>
            <button
              onClick={copyCode}
              className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs text-parchment/80 transition hover:border-gold/60 hover:bg-gold/10"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-parchment/45">
            Share this with friends so they can add you.
          </p>
        </div>

        {/* Add a friend */}
        <form onSubmit={add}>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
            Add a friend by code
          </span>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD2345"
              maxLength={8}
              className="flex-1 rounded-xl border border-gold/20 bg-black/30 px-3 py-2.5 font-mono uppercase tracking-[0.2em] text-parchment placeholder:tracking-normal placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-ember to-ember-bright px-4 font-medium text-ink transition hover:scale-[1.02]"
            >
              Add
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          {notice && <p className="mt-2 text-sm text-green-300">{notice}</p>}
        </form>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <Section title={`Requests (${incoming.length})`}>
            {incoming.map((r) => (
              <Row key={r.id} name={other(r)?.display_name ?? "Adventurer"}>
                <button
                  onClick={() => respond(r.id, true)}
                  className="rounded-lg bg-gradient-to-r from-moss to-green-600 px-3 py-1 text-xs font-medium text-ink"
                >
                  Accept
                </button>
                <button
                  onClick={() => respond(r.id, false)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-parchment/70 hover:text-red-200"
                >
                  Decline
                </button>
              </Row>
            ))}
          </Section>
        )}

        {/* Friends */}
        <Section title={`Friends (${friends.length})`}>
          {friends.length === 0 ? (
            <p className="text-sm text-parchment/40">No friends yet.</p>
          ) : (
            friends.map((r) => (
              <Row key={r.id} name={other(r)?.display_name ?? "Adventurer"}>
                <button
                  onClick={() => unfriend(r.id)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-parchment/60 transition hover:border-blood/40 hover:text-red-200"
                >
                  Remove
                </button>
              </Row>
            ))
          )}
        </Section>

        {/* Outgoing */}
        {outgoing.length > 0 && (
          <Section title={`Pending sent (${outgoing.length})`}>
            {outgoing.map((r) => (
              <Row key={r.id} name={other(r)?.display_name ?? "Adventurer"}>
                <span className="text-xs text-parchment/40">Pending…</span>
                <button
                  onClick={() => unfriend(r.id)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-parchment/60 hover:text-red-200"
                >
                  Cancel
                </button>
              </Row>
            ))}
          </Section>
        )}
      </div>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-parchment/50">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-arcane/40 to-ember/30 text-sm text-parchment">
          {name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-parchment">{name}</span>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
