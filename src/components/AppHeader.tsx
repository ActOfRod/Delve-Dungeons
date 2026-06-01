import Link from "next/link";
import { Logo } from "@/components/Logo";
import { HeaderActions } from "@/components/HeaderActions";
import { signOut } from "@/app/dashboard/actions";

export function AppHeader({
  displayName,
  userId,
  friendCode,
}: {
  displayName?: string | null;
  userId?: string;
  friendCode?: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          {displayName && (
            <span className="hidden text-sm text-parchment/70 sm:inline">
              {displayName}
            </span>
          )}
          {userId && (
            <HeaderActions userId={userId} friendCode={friendCode ?? null} />
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-gold/20 px-4 py-1.5 text-sm text-parchment/80 transition hover:border-gold/50 hover:text-parchment"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
