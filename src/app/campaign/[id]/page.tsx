import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import type {
  Campaign,
  CampaignMember,
  Character,
  DiceRoll,
  Message,
  Profile,
} from "@/lib/types";
import { CampaignRoom } from "./CampaignRoom";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-dvh">
        <SetupNotice />
      </main>
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/campaign/${id}`);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle<Campaign>();

  if (!campaign) notFound();

  const { data: myMembership } = await supabase
    .from("campaign_members")
    .select("*, character:characters(*)")
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .maybeSingle<CampaignMember & { character?: Character | null }>();

  if (!myMembership) {
    // Not a member yet — bounce to the dashboard to join with the code.
    redirect("/dashboard");
  }

  const [{ data: rawMembers }, { data: messages }, { data: rolls }] =
    await Promise.all([
      // NOTE: profiles can't be embedded here (no FK from campaign_members to
      // profiles), so we fetch and merge display names separately below.
      supabase
        .from("campaign_members")
        .select("*, character:characters(*)")
        .eq("campaign_id", id)
        .order("turn_order", { ascending: true }),
      supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase
        .from("dice_rolls")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const memberRows =
    (rawMembers as (CampaignMember & { character?: Character | null })[]) ?? [];
  const memberUserIds = memberRows.map((m) => m.user_id);
  const { data: memberProfiles } = memberUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, friend_code")
        .in("id", memberUserIds)
    : { data: [] };
  const profileById = new Map(
    ((memberProfiles as Profile[]) ?? []).map((p) => [p.id, p]),
  );
  const members = memberRows.map((m) => ({
    ...m,
    profile: profileById.get(m.user_id) ?? null,
  }));

  return (
    <CampaignRoom
      initialCampaign={campaign}
      currentUserId={user.id}
      myMembership={
        myMembership as CampaignMember & {
          character?: Character | null;
          profile?: Profile | null;
        }
      }
      initialMembers={members}
      initialMessages={(messages as Message[]) ?? []}
      initialRolls={(rolls as DiceRoll[]) ?? []}
    />
  );
}
