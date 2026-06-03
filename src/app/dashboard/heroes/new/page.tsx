import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profile } from "@/lib/types";
import { NewHeroClient } from "./NewHeroClient";

export const dynamic = "force-dynamic";

export default async function NewHeroPage() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

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
          <h1 className="font-display text-3xl text-parchment">Create a hero</h1>
          <p className="mt-2 max-w-xl text-sm text-parchment/60">
            Level 1 Dungeons &amp; Dragons 5e — choose a background, generate
            ability scores with point buy, the standard array, or rolled dice,
            then pick starting equipment or rolled wealth.
          </p>
        </header>
        <div className="dd-panel rounded-2xl p-6 sm:p-8">
          <NewHeroClient />
        </div>
      </div>
    </main>
  );
}
