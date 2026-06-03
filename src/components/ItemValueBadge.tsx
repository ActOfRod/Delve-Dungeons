import { formatGpValue, getItemStackValueGp } from "@/lib/item-values";
import type { InventoryItem } from "@/lib/types";

export function ItemValueBadge({
  item,
}: {
  item: Pick<InventoryItem, "name" | "quantity">;
}) {
  const gp = getItemStackValueGp(item);
  if (gp <= 0) return null;

  return (
    <span
      className="shrink-0 rounded-full border border-gold/40 bg-gold/15 px-3.5 py-1.5 text-xs font-medium text-gold"
      title="Estimated value"
    >
      {formatGpValue(gp)}
    </span>
  );
}
