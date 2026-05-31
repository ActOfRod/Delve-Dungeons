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
    .select("*")
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .maybeSingle<CampaignMember>();

  if (!myMembership) {
    // Not a member yet — bounce to the dashboard to join with the code.
    redirect("/dashboard");
  }

  const [{ data: members }, { data: messages }, { data: rolls }] =
    await Promise.all([
      supabase
        .from("campaign_members")
        .select("*, character:characters(*), profile:profiles(*)")
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
      initialMembers={
        (members as (CampaignMember & {
          character?: Character | null;
          profile?: Profile | null;
        })[]) ?? []
      }
      initialMessages={(messages as Message[]) ?? []}
      initialRolls={(rolls as DiceRoll[]) ?? []}
    />
  );
}
