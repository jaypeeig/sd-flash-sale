import type { PurchaseOutcome, Sale } from "@workspace/shared-types";

export const OUTCOME_STYLES: Record<PurchaseOutcome, string> = {
  success: "border-green-200 bg-green-50 text-green-700",
  already_purchased: "border-slate-200 bg-slate-50 text-slate-600",
  sold_out: "border-red-200 bg-red-50 text-red-700",
  sale_not_active: "border-red-200 bg-red-50 text-red-700",
};

export const OUTCOME_IS_ERROR: Record<PurchaseOutcome, boolean> = {
  success: false,
  already_purchased: false,
  sold_out: true,
  sale_not_active: true,
};

export const NON_ACTIVE_LABELS: Record<Exclude<Sale["phase"], "active">, string> = {
  upcoming: "Not yet available",
  ended: "Sale ended",
  sold_out: "Sold out",
};

export const MIN_LOADING_MS = 1000;
