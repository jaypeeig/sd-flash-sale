import type { PurchaseOutcome, Sale } from "@workspace/shared-types";

export const OUTCOME_STYLES: Record<PurchaseOutcome, string> = {
  success: "text-green-700",
  already_purchased: "text-slate-600",
  sold_out: "text-red-600",
  sale_not_active: "text-red-600",
};

export const NON_ACTIVE_LABELS: Record<Exclude<Sale["phase"], "active">, string> = {
  upcoming: "Not yet available",
  ended: "Sale ended",
  sold_out: "Sold out",
};
