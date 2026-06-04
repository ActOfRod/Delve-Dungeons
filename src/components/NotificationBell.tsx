"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppNotification } from "@/lib/types";
import { useNotificationFeed } from "@/lib/use-notification-feed";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  respondToFriendRequest,
} from "@/app/actions/social";

const TYPE_ICON: Record<string, string> = {
  friend_request: "👥",
  friend_accepted: "🤝",
  campaign_invite: "✉️",
  campaign_turn: "⚔️",
  campaign_joined: "🎲",
  campaign_closed: "🪦",
  system: "✦",
};

export function NotificationBell({
  userId,
  variant = "icon",
}: {
  userId: string;
  variant?: "icon" | "menuItem";
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { items, setItems } = useNotificationFeed(userId);
  const [, startTransition] = useTransition();

  const unread = items.filter((n) => !n.read).length;
  const isMenuItem = variant === "menuItem";

  useEffect(() => {
    function onDocumentClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }

  function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      await deleteNotification(id);
    });
  }

  function respond(n: AppNotification, accept: boolean) {
    const friendshipId = String(n.data?.friendship_id ?? "");
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    startTransition(async () => {
      await respondToFriendRequest(friendshipId, accept);
      router.refresh();
    });
  }

  function activate(n: AppNotification) {
    markRead(n.id);
    if (n.type === "campaign_invite" && n.data?.invite_code) {
      setOpen(false);
      router.push(`/dashboard?join=${String(n.data.invite_code)}`);
    } else if (
      (n.type === "campaign_turn" || n.type === "campaign_joined") &&
      n.data?.campaign_id
    ) {
      setOpen(false);
      router.push(`/campaign/${String(n.data.campaign_id)}`);
    }
  }

  return (
    <div ref={ref} className={`relative ${isMenuItem ? "w-full" : ""}`}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className={
          isMenuItem
            ? "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-parchment transition hover:bg-white/5"
            : "relative flex h-9 w-9 items-center justify-center rounded-full border border-gold/20 text-parchment/80 transition hover:border-gold/50 hover:text-parchment"
        }
      >
        <span
          className={
            isMenuItem
              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/20 text-parchment/80"
              : "flex items-center justify-center"
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.7 21a2 2 0 0 1-3.4 0"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        {isMenuItem && <span className="flex-1">Notifications</span>}
        {unread > 0 && (
          <span
            className={
              isMenuItem
                ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1.5 text-[10px] font-bold text-ink"
                : "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-ink"
            }
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`dd-fade-up absolute z-40 mt-2 overflow-hidden rounded-2xl border border-gold/20 bg-ink/95 shadow-2xl backdrop-blur ${
            isMenuItem
              ? "left-0 right-0 w-auto max-h-[min(24rem,60vh)] sm:left-auto sm:right-0 sm:w-80"
              : "right-0 w-80"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="font-display text-sm text-gold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-arcane-bright hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-parchment/40">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`group flex gap-3 border-b border-white/5 px-4 py-3 transition ${
                    n.read ? "opacity-60" : "bg-arcane/5"
                  }`}
                >
                  <div className="mt-0.5 text-lg">
                    {TYPE_ICON[n.type] ?? "✦"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => activate(n)}
                      className="block w-full text-left"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-parchment">
                        {n.title}
                        {!n.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-ember" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-parchment/60">{n.body}</p>
                      )}
                    </button>

                    {n.type === "friend_request" && !n.read && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => respond(n, true)}
                          className="rounded-lg bg-gradient-to-r from-moss to-green-600 px-3 py-1 text-xs font-medium text-ink transition hover:scale-[1.03]"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(n, false)}
                          className="rounded-lg border border-white/15 px-3 py-1 text-xs text-parchment/70 transition hover:border-blood/40 hover:text-red-200"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {n.type === "campaign_invite" && Boolean(n.data?.invite_code) && (
                      <button
                        type="button"
                        onClick={() => activate(n)}
                        className="mt-2 rounded-lg bg-gradient-to-r from-arcane to-arcane-bright px-3 py-1 text-xs font-medium text-ink transition hover:scale-[1.03]"
                      >
                        Join campaign
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    aria-label="Dismiss"
                    className="self-start text-parchment/30 opacity-0 transition hover:text-parchment group-hover:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
