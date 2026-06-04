"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/app/dashboard/actions";
import { NotificationBell } from "@/components/NotificationBell";
import { FriendsDialog } from "@/components/FriendsDialog";
import { InviteCodesDialog } from "@/components/InviteCodesDialog";

function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={
          className ||
          "rounded-full border border-gold/20 px-4 py-1.5 text-sm text-parchment/80 transition hover:border-gold/50 hover:text-parchment"
        }
      >
        Sign out
      </button>
    </form>
  );
}

function InviteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  );
}

function FriendsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  );
}

const iconButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-full border border-gold/20 text-parchment/80 transition hover:border-gold/50 hover:text-parchment";

const menuRowClass =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-parchment transition hover:bg-white/5";

export function HeaderActions({
  userId,
  friendCode,
  displayName,
}: {
  userId: string;
  friendCode: string | null;
  displayName?: string | null;
}) {
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function openInvites() {
    setMenuOpen(false);
    setInvitesOpen(true);
  }

  function openFriends() {
    setMenuOpen(false);
    setFriendsOpen(true);
  }

  return (
    <>
      {displayName && (
        <span className="hidden max-w-[10rem] truncate text-sm text-parchment/70 md:inline">
          {displayName}
        </span>
      )}

      {/* Desktop */}
      <div className="hidden items-center gap-2 md:flex">
        <button
          type="button"
          onClick={() => setInvitesOpen(true)}
          aria-label="Invite testers"
          className={iconButtonClass}
        >
          <InviteIcon />
        </button>
        <button
          type="button"
          onClick={() => setFriendsOpen(true)}
          aria-label="Friends"
          className={iconButtonClass}
        >
          <FriendsIcon />
        </button>
        <NotificationBell userId={userId} />
        <SignOutButton />
      </div>

      {/* Mobile menu */}
      <div className="relative md:hidden">
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className={iconButtonClass}
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setMenuOpen(false)}
            />
            <nav
              className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gold/20 bg-ink/95 py-2 shadow-2xl backdrop-blur-md"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className={menuRowClass}
                onClick={openInvites}
              >
                <span className={`${iconButtonClass} h-8 w-8 shrink-0`}>
                  <InviteIcon />
                </span>
                Invite testers
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuRowClass}
                onClick={openFriends}
              >
                <span className={`${iconButtonClass} h-8 w-8 shrink-0`}>
                  <FriendsIcon />
                </span>
                Friends
              </button>
              <div className="border-t border-white/5 px-2 py-2">
                <NotificationBell userId={userId} variant="menuItem" />
              </div>
              <div className="border-t border-white/5 px-3 py-2">
                <SignOutButton className="w-full rounded-xl border border-gold/20 px-4 py-2.5 text-sm text-parchment/80 transition hover:border-gold/50 hover:text-parchment" />
              </div>
            </nav>
          </>
        )}
      </div>

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
