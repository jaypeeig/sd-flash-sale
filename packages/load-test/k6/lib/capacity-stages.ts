import exec from "k6/execution";
import { Counter, Trend } from "k6/metrics";
import type { RateStage } from "../config/options.ts";

export interface StageTracker {
  /** Call once per iteration with how long the whole attempt took (ms) —
   * bucketed into whichever stage is current when the iteration finishes. */
  recordIteration: (durationMs: number) => void;
}

// Which stage an iteration lands in is derived from the same RateStage[]
// steppedArrivalRate() turns into scenario stages, so this always agrees
// with what the executor is actually doing — neither side hand-tracks the
// other's state, they both read off one shared array.
//
// exec.instance.currentTestRunDuration is elapsed milliseconds since the
// scenario started, which is exactly what the cumulative stage boundaries
// below are computed in.
export const createStageTracker = (stages: readonly RateStage[]): StageTracker => {
  const stageNames = stages.map((stage) => `rate_${stage.ratePerSecond}`);

  let cumulativeMs = 0;
  const boundariesMs = stages.map((stage) => (cumulativeMs += stage.durationSeconds * 1000));

  const iterationCounters = new Map(
    stageNames.map((name) => [name, new Counter(`capacity_iterations_${name}`)]),
  );
  const purchaseDurationTrends = new Map(
    stageNames.map((name) => [name, new Trend(`capacity_purchase_duration_${name}`, true)]),
  );

  return {
    recordIteration: (durationMs) => {
      const elapsedMs = exec.instance.currentTestRunDuration;
      const boundaryIndex = boundariesMs.findIndex((boundary) => elapsedMs < boundary);
      const stageName = stageNames[boundaryIndex === -1 ? stageNames.length - 1 : boundaryIndex];
      if (stageName === undefined) return;

      iterationCounters.get(stageName)?.add(1);
      purchaseDurationTrends.get(stageName)?.add(durationMs);
    },
  };
};
