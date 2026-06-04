import Link from "next/link";
import { Logo } from "@/components/Logo";
import { HeaderActions } from "@/components/HeaderActions";

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/dashboard" className="min-w-0 shrink">
          <Logo />
        </Link>
        {userId ? (
          <HeaderActions
            userId={userId}
            friendCode={friendCode ?? null}
            displayName={displayName}
          />
        ) : null}
      </div>
    </header>
  );
}
