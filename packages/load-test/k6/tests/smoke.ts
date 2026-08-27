import { sleep } from "k6";
import type { Options } from "k6/options";
import { saleId } from "../config/environment.ts";
import { constantVus } from "../config/options.ts";
import { baselineThresholds } from "../config/thresholds.ts";
import { getHealth, getSaleById, listSales } from "../lib/client.ts";
import { createHandleSummary } from "../lib/summary.ts";
import { attemptPurchase } from "../scenarios/purchase.ts";

// Cheap pre-flight: is the API up, is the load-test sale actually prepared,
// do all four endpoints respond. Safe to run in CI — one VU, 30s.
export const options: Options = constantVus({
  vus: 1,
  durationSeconds: 30,
  thresholds: baselineThresholds,
});

export default (): void => {
  getHealth();
  listSales();
  getSaleById(saleId());
  attemptPurchase();
  sleep(1);
};

export const handleSummary = createHandleSummary("smoke");
