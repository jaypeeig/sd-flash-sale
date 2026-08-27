export interface MetricValues {
  count?: number;
  rate?: number;
  avg?: number;
  min?: number;
  med?: number;
  max?: number;
  "p(90)"?: number;
  "p(95)"?: number;
  "p(99)"?: number;
}

export interface SummaryMetric {
  type: "counter" | "gauge" | "rate" | "trend";
  contains: "default" | "time" | "data";
  values: MetricValues;
}

// NB: this deliberately does NOT include per-scenario config (target rate,
// maxVUs) — k6's handleSummary only ever puts a handful of global fields
// under `data.options` (summaryTrendStats, summaryTimeUnit, noColor), not
// the scenarios block itself. lib/summary.ts gets the target rate and VU
// cap it needs from each test's own options.ts builder instead — see
// config/options.ts's BuiltScenario.
export interface SummaryData {
  metrics: Record<string, SummaryMetric>;
  state: {
    testRunDurationMs: number;
  };
}
