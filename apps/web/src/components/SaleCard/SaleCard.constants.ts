import type { Sale } from "@workspace/shared-types";

export const PHASE_LABELS: Record<Sale["phase"], string> = {
  upcoming: "Upcoming",
  active: "Active",
  ended: "Ended",
  sold_out: "Sold out",
};
