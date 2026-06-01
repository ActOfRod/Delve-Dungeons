"use client";

import { useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { FriendsDialog } from "@/components/FriendsDialog";
import { InviteCodesDialog } from "@/components/InviteCodesDialog";

export function HeaderActions({
  userId,
  friendCode,
}: {
  userId: string;
  friendCode: string | null;
}) {
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setInvitesOpen(true)}
        aria-label="Invite testers"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/20 text-parchment/80 transition hover:border-gold/50 hover:text-parchment"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="m4 7 8 6 8-6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setFriendsOpen(true)}
        aria-label="Friends"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/20 text-parchment/80 transition hover:border-gold/50 hover:text-parchment"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M3.5 19a5.5 5.5 0 0 1 11 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M16 6.5a3 3 0 0 1 0 5.5M17 19a5.5 5.5 0 0 0-1.8-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <NotificationBell userId={userId} />

      <FriendsDialog
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        userId={userId}
        friendCode={friendCode}
      />

      <InviteCodesDialog
        open={invitesOpen}
        onClose={() => setInvitesOpen(false)}
        userId={userId}
      />
    </>
  );
}
