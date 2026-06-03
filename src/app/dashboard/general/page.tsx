import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Character, Profile } from "@/lib/types";
import { GENERAL_SHOP_MAX_LEVEL, GENERAL_SHOP_MIN_LEVEL } from "@/lib/shop";
import { GeneralShopClient } from "./GeneralShopClient";

export const dynamic = "force-dynamic";

export default async function GeneralShopPage() {
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
          <h1 className="font-display text-3xl text-parchment">The General</h1>
          <p className="mt-2 max-w-xl text-sm text-parchment/60">
            The local shop for adventurers of levels {GENERAL_SHOP_MIN_LEVEL}–
            {GENERAL_SHOP_MAX_LEVEL}. Today&apos;s counter holds four wares —
            always two healing potions, plus three pieces matched to your class.
            Stock refreshes each day.
          </p>
        </header>
        <div className="dd-panel dd-stash-tile-general rounded-2xl p-6 sm:p-8">
          <GeneralShopClient
            characters={(characters as Character[] | null) ?? []}
            userId={user.id}
          />
        </div>
      </div>
    </main>
  );
}
