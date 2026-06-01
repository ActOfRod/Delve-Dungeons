"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function displayNameFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  return (data as { display_name: string | null } | null)?.display_name ?? "An adventurer";
}

export async function sendFriendRequest(
  code: string,
): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user } = await requireUser();
  const clean = code.trim().toUpperCase();
  if (!clean) return { error: "Enter a friend code." };

  const { data: target } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("friend_code", clean)
    .maybeSingle();

  if (!target) return { error: "No adventurer found with that code." };
  if (target.id === user.id) return { error: "That's your own friend code!" };

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted")
      return { error: "You're already friends." };
    return { error: "A friend request is already pending." };
  }

  const { data: friendship, error } = await supabase
    .from("friendships")
    .insert({
      requester_id: user.id,
      addressee_id: target.id,
      status: "pending",
    })
    .select()
    .single();
  if (error) return { error: error.message };

  const fromName = await displayNameFor(supabase, user.id);
  await supabase.from("notifications").insert({
    user_id: target.id,
    type: "friend_request",
    title: "New friend request",
    body: `${fromName} wants to be your friend.`,
    data: { friendship_id: friendship.id, from_user_id: user.id },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function respondToFriendRequest(
  friendshipId: string,
  accept: boolean,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  const { data: friendship } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();

  if (!friendship) return { error: "Request not found." };
  if (friendship.addressee_id !== user.id)
    return { error: "This request isn't yours to answer." };

  const { error } = await supabase
    .from("friendships")
    .update({
      status: accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", friendshipId);
  if (error) return { error: error.message };

  // Clear the originating notification.
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .contains("data", { friendship_id: friendshipId });

  if (accept) {
    const myName = await displayNameFor(supabase, user.id);
    await supabase.from("notifications").insert({
      user_id: friendship.requester_id,
      type: "friend_accepted",
      title: "Friend request accepted",
      body: `${myName} accepted your friend request.`,
      data: { from_user_id: user.id },
    });
  }

  revalidatePath("/dashboard");
  return {};
}

export async function removeFriend(
  friendshipId: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return {};
}

export async function markNotificationRead(
  id: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);
  return { error: error?.message };
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  return { error: error?.message };
}

export async function deleteNotification(
  id: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return { error: error?.message };
}
