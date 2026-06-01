import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  Campaign,
  Character,
  CampaignMember,
  Friendship,
  Profile,
} from "@/lib/types";
import { DashboardClient, type FriendOption } from "./DashboardClient";

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

  const [
    { data: profile },
    { data: characters },
    { data: memberships },
    { data: friendRows },
  ] = await Promise.all([
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
    supabase
      .from("friendships")
      .select(
        "*, requester:profiles!requester_id(id,display_name), addressee:profiles!addressee_id(id,display_name)",
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ]);

  const friends: FriendOption[] = ((friendRows as Friendship[] | null) ?? [])
    .map((r) => {
      const p = r.requester_id === user.id ? r.addressee : r.requester;
      return p ? { userId: p.id, displayName: p.display_name } : null;
    })
    .filter((f): f is FriendOption => f !== null);

  const campaigns =
    (memberships as (CampaignMember & { campaign: Campaign | null })[] | null)
      ?.map((m) => ({ membership: m as CampaignMember, campaign: m.campaign }))
      .filter(
        (c): c is { membership: CampaignMember; campaign: Campaign } =>
          c.campaign !== null,
      ) ?? [];

  const profileRow = profile as Profile | null;

  return (
    <main className="min-h-dvh">
      <AppHeader
        displayName={profileRow?.display_name ?? user.email}
        userId={user.id}
        friendCode={profileRow?.friend_code ?? null}
      />
      <DashboardClient
        currentUserId={user.id}
        characters={(characters as Character[] | null) ?? []}
        campaigns={campaigns}
        friends={friends}
      />
    </main>
  );
}
