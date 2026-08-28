import type { Sale } from "@workspace/shared-types";

export const PHASE_LABELS: Record<Sale["phase"], string> = {
  upcoming: "Upcoming",
  active: "Active",
  ended: "Ended",
  sold_out: "Sold out",
};

export const PHASE_BADGE_STYLES: Record<Sale["phase"], string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  ended: "bg-slate-100 text-slate-600",
  sold_out: "bg-red-100 text-red-600",
};
