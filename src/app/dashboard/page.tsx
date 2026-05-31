import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Campaign, Character, CampaignMember, Profile } from "@/lib/types";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  const [{ data: profile }, { data: characters }, { data: memberships }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_members")
        .select("*, campaign:campaigns(*), character:characters(*)")
        .eq("user_id", user.id),
    ]);

  const campaigns =
    (memberships as (CampaignMember & { campaign: Campaign | null })[] | null)
      ?.map((m) => ({ membership: m as CampaignMember, campaign: m.campaign }))
      .filter(
        (c): c is { membership: CampaignMember; campaign: Campaign } =>
          c.campaign !== null,
      ) ?? [];

  return (
    <main className="min-h-dvh">
      <AppHeader
        displayName={(profile as Profile | null)?.display_name ?? user.email}
      />
      <DashboardClient
        characters={(characters as Character[] | null) ?? []}
        campaigns={campaigns}
      />
    </main>
  );
}
