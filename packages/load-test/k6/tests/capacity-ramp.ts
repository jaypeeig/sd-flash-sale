import type { Options } from "k6/options";
import type { RateStage } from "../config/options.ts";
import { steppedArrivalRate } from "../config/options.ts";
import { baselineThresholds } from "../config/thresholds.ts";
import { createStageTracker } from "../lib/capacity-stages.ts";
import { createHandleSummary } from "../lib/summary.ts";
import { attemptPurchase } from "../scenarios/purchase.ts";

// flash-sale-spike holds one fixed rate — a good number to test against,
// but not one that tells you where the ceiling actually is, and picking it
// wrong just makes k6 itself the bottleneck (see summary.ts's VU-cap
// warning). This steps the arrival rate through flat plateaus (see
// steppedArrivalRate's jump-then-hold shape) against deep stock (prepare.ts
// gives this test the same 2,000,000-unit profile purchase-baseline used to
// use, so every request pays the real insert+decrement transaction, never
// the cheap sold_out early return) so the per-stage table in the summary
// shows exactly which rate holds and which one breaks, instead of
// inferring it from a target that may never land.
const STAGES: RateStage[] = [
  { ratePerSecond: 250, durationSeconds: 45 },
  { ratePerSecond: 500, durationSeconds: 45 },
  { ratePerSecond: 1000, durationSeconds: 45 },
  { ratePerSecond: 1250, durationSeconds: 45 },
  { ratePerSecond: 1500, durationSeconds: 45 },
  { ratePerSecond: 2000, durationSeconds: 45 },
];

const tracker = createStageTracker(STAGES);

const scenario = steppedArrivalRate({
  stages: STAGES,
  thresholds: baselineThresholds,
});

export const options: Options = scenario.options;

export default (): void => {
  const startedAt = Date.now();
  attemptPurchase();
  tracker.recordIteration(Date.now() - startedAt);
};

export const handleSummary = createHandleSummary("capacity-ramp", scenario);
