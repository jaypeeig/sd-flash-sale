import type { Options } from "k6/options";

// k6's default summaryTrendStats omits p(99) entirely — every trend in
// lib/summary.ts reads `values["p(99)"]`, so without this override that row
// renders "—" no matter how the run actually went. Applied to every scenario
// shape below so no test can silently regress back to the default.
const SUMMARY_TREND_STATS: NonNullable<Options["summaryTrendStats"]> = [
  "avg",
  "min",
  "med",
  "p(90)",
  "p(95)",
  "p(99)",
  "max",
];

// k6's handleSummary only ever receives a handful of global fields under
// `data.options` (summaryTrendStats, summaryTimeUnit, noColor) — the
// per-scenario config (target rate, maxVUs) that lib/summary.ts's
// Load-delivered table needs is *not* in there, confirmed against an actual
// run's exported JSON. So every rate-based builder below hands its target
// rate and VU cap back directly, for the test file to pass on to
// createHandleSummary — no attempt to recover them from summary data.
export interface BuiltScenario {
  options: Options;
  targetRatePerSecond: number;
  maxVus: number;
}

interface RampingArrivalRateConfig {
  /** Requests started per second at the top of the ramp, held for `sustainSeconds`. */
  peakRatePerSecond: number;
  rampUpSeconds?: number;
  sustainSeconds: number;
  rampDownSeconds?: number;
  /** Upper bound on concurrent in-flight iterations — headroom over `peakRatePerSecond`. */
  maxVus?: number;
  thresholds?: Options["thresholds"];
}

// The actual flash-sale shape: arrival rate (not VU count, which
// self-throttles as latency rises and would under-represent a real
// thundering herd) that ramps up to peak, sustains it, then ramps back
// down — rather than jumping straight to peak, which would conflate a cold
// start with steady-state behaviour.
export const rampingArrivalRate = ({
  peakRatePerSecond,
  rampUpSeconds = 30,
  sustainSeconds,
  rampDownSeconds = 30,
  maxVus = peakRatePerSecond * 3,
  thresholds,
}: RampingArrivalRateConfig): BuiltScenario => ({
  options: {
    scenarios: {
      spike: {
        executor: "ramping-arrival-rate",
        startRate: 0,
        timeUnit: "1s",
        preAllocatedVUs: Math.min(maxVus, peakRatePerSecond),
        maxVUs: maxVus,
        stages: [
          { target: peakRatePerSecond, duration: `${rampUpSeconds}s` },
          { target: peakRatePerSecond, duration: `${sustainSeconds}s` },
          { target: 0, duration: `${rampDownSeconds}s` },
        ],
      },
    },
    thresholds,
    summaryTrendStats: SUMMARY_TREND_STATS,
  },
  targetRatePerSecond: peakRatePerSecond,
  maxVus,
});

interface ConstantVusConfig {
  vus: number;
  durationSeconds: number;
  thresholds?: Options["thresholds"];
}

// The smoke test's shape: one (or a handful of) VUs, fixed duration, no ramp.
export const constantVus = ({ vus, durationSeconds, thresholds }: ConstantVusConfig): Options => ({
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus,
      duration: `${durationSeconds}s`,
    },
  },
  thresholds,
  summaryTrendStats: SUMMARY_TREND_STATS,
});

export interface RateStage {
  /** Requests/sec target for this stage. */
  ratePerSecond: number;
  durationSeconds: number;
}

interface SteppedArrivalRateConfig {
  /** Held in order, each a flat plateau — a jump in latency or
   * dropped_iterations should land cleanly on one stage's numbers instead
   * of blurring across a transition. */
  stages: RateStage[];
  maxVus?: number;
  thresholds?: Options["thresholds"];
}

// ramping-arrival-rate always ramps *linearly* from the previous stage's
// target to the next over that stage's full duration — one k6 stage per
// RateStage would mean the rate is still climbing for the entire window,
// never actually flat. Splitting each RateStage into a short jump (reach
// the target) followed by a hold (stay there) is what makes "plateau" true:
// the jump is real ramp-up noise, but it's now a small, fixed-size sliver
// at the front of each stage rather than the whole thing.
const JUMP_SECONDS = 2;

const toK6Stages = (stages: RateStage[]): { target: number; duration: string }[] =>
  stages.flatMap((stage) => {
    const jumpSeconds = Math.min(JUMP_SECONDS, stage.durationSeconds);
    const holdSeconds = stage.durationSeconds - jumpSeconds;
    const jump = { target: stage.ratePerSecond, duration: `${jumpSeconds}s` };
    return holdSeconds > 0
      ? [jump, { target: stage.ratePerSecond, duration: `${holdSeconds}s` }]
      : [jump];
  });

// capacity-ramp's shape: a staircase of flat-rate plateaus rather than one
// continuous ramp, so the summary can attribute a break to a specific
// offered rate instead of an interpolated point on a slope.
export const steppedArrivalRate = ({
  stages,
  maxVus = Math.max(...stages.map((stage) => stage.ratePerSecond)) * 3,
  thresholds,
}: SteppedArrivalRateConfig): BuiltScenario => ({
  options: {
    scenarios: {
      "capacity-ramp": {
        executor: "ramping-arrival-rate",
        startRate: 0,
        timeUnit: "1s",
        preAllocatedVUs: Math.min(maxVus, stages[0]?.ratePerSecond ?? 1),
        maxVUs: maxVus,
        stages: toK6Stages(stages),
      },
    },
    thresholds,
    summaryTrendStats: SUMMARY_TREND_STATS,
  },
  targetRatePerSecond: Math.max(...stages.map((stage) => stage.ratePerSecond)),
  maxVus,
});
