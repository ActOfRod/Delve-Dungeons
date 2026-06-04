"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mergeInventoryGrants } from "@/lib/inventory";
import { getGoldPiecesGp, spendGoldPieces } from "@/lib/inventory-currency";
import { createClient } from "@/lib/supabase/server";
import {
  GENERAL_SHOP_MAX_LEVEL,
  GENERAL_SHOP_MIN_LEVEL,
  generalShopDayKey,
  generalShopSeed,
  getGeneralShopListing,
  isSlotPurchased,
  markSlotPurchased,
  parseGeneralShopPurchases,
  type ShopStockSlot,
} from "@/lib/shop";
import type { InventoryItem } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function purchaseGeneralShopSlot(
  characterId: string,
  slot: ShopStockSlot,
): Promise<{ error?: string; ok?: boolean }> {
  if (slot < 1 || slot > 4) {
    return { error: "Invalid shop slot." };
  }

  const { supabase, user } = await requireUser();
  const dayKey = generalShopDayKey();

  const { data: character, error: fetchErr } = await supabase
    .from("characters")
    .select("id, user_id, name, klass, level, inventory, general_shop_purchases")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!character) return { error: "Character not found." };

  const level = character.level as number;
  if (level < GENERAL_SHOP_MIN_LEVEL || level > GENERAL_SHOP_MAX_LEVEL) {
    return {
      error: `The General only trades with levels ${GENERAL_SHOP_MIN_LEVEL}–${GENERAL_SHOP_MAX_LEVEL}.`,
    };
  }

  const purchases = parseGeneralShopPurchases(character.general_shop_purchases);
  if (isSlotPurchased(purchases, dayKey, slot)) {
    return { error: "That slot was already bought today." };
  }

  const seed = generalShopSeed(user.id, characterId, dayKey);
  const listing = getGeneralShopListing(
    character.klass as string,
    level,
    seed,
    slot,
  );
  if (!listing) return { error: "That listing is not on today's counter." };

  const inventory = (character.inventory ?? []) as InventoryItem[];
  if (getGoldPiecesGp(inventory) < listing.priceGp) {
    return {
      error: `Not enough gold — need ${listing.priceGp} GP.`,
    };
  }

  const spent = spendGoldPieces(inventory, listing.priceGp);
  if ("error" in spent) return { error: spent.error };

  const nextInventory = mergeInventoryGrants(
    spent.inventory,
    [
      {
        name: listing.name,
        quantity: listing.quantity,
        description: listing.description,
      },
    ],
    { klass: character.klass as string },
  );

  const nextPurchases = markSlotPurchased(purchases, dayKey, slot);

  const { error: updateErr } = await supabase
    .from("characters")
    .update({
      inventory: nextInventory,
      general_shop_purchases: nextPurchases,
    })
    .eq("id", characterId)
    .eq("user_id", user.id);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/dashboard/general");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/vault");
  return { ok: true };
}
