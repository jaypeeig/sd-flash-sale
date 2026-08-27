import type { Options } from "k6/options";
import { arrivalRatePerSecond, durationSeconds, rampSeconds } from "../config/environment.ts";
import { rampingArrivalRate } from "../config/options.ts";
import { generousLatencyThresholds } from "../config/thresholds.ts";
import { createHandleSummary } from "../lib/summary.ts";
import { attemptFlashSalePurchase } from "../scenarios/flash-sale-purchase.ts";

// The actual flash-sale moment: ramp up, hold a sustained thundering herd,
// ramp down — onto a small-stock sale (prepare.ts gives this test's sale a
// stock far smaller than the request volume below). scripts/verify.ts
// checks the invariants this is really here to prove — exactly
// `total_stock` successes, remaining_stock never negative, no duplicate
// emails — an arrival-rate executor is what actually exercises that, since
// a fixed VU count self-throttles as latency rises.
const scenario = rampingArrivalRate({
  peakRatePerSecond: arrivalRatePerSecond(1250),
  rampUpSeconds: rampSeconds(10),
  sustainSeconds: durationSeconds(120),
  rampDownSeconds: rampSeconds(20),
  maxVus: 5000,
  thresholds: generousLatencyThresholds,
});

export const options: Options = scenario.options;

export default attemptFlashSalePurchase;

export const handleSummary = createHandleSummary("flash-sale-spike", scenario);
