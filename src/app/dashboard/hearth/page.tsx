import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Character, Profile } from "@/lib/types";
import { HearthClient } from "./HearthClient";

export const dynamic = "force-dynamic";

export default async function HearthPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-dvh">
        <SetupNotice />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: characters }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("characters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const profileRow = profile as Profile | null;

  return (
    <main className="min-h-dvh">
      <AppHeader
        displayName={profileRow?.display_name ?? user.email}
        userId={user.id}
        friendCode={profileRow?.friend_code ?? null}
      />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/dashboard"
          className="text-sm text-parchment/50 transition hover:text-gold"
        >
          ← Back to dashboard
        </Link>
        <header className="mt-4 mb-8">
          <h1 className="font-display text-3xl text-parchment">The Hearth</h1>
          <p className="mt-2 max-w-xl text-sm text-parchment/60">
            Warm up between adventures — daily riddles and puzzles pay gold at
            the counter; weekly and daily challenges are on the board soon.
            Riddle streaks earn a little more each day you keep the flame alive.
          </p>
        </header>
        <div className="dd-panel dd-stash-tile-hearth rounded-2xl p-6 sm:p-8">
          <HearthClient
            characters={(characters as Character[] | null) ?? []}
            hearthState={profileRow?.hearth_state}
          />
        </div>
      </div>
    </main>
  );
}
