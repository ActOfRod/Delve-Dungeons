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

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

// maxUses === null means an unlimited-use code.
export async function createInviteCode(
  maxUses: number | null,
): Promise<{ error?: string; code?: string }> {
  const { supabase, user } = await requireUser();

  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from("invite_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateCode();
  }

  const { error } = await supabase.from("invite_codes").insert({
    code,
    created_by: user.id,
    max_uses: maxUses,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { code };
}

export async function deleteInviteCode(
  id: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("invite_codes")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);
  return { error: error?.message };
}
