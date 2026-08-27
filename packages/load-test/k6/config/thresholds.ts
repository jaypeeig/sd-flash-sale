import type { Options } from "k6/options";

// Non-negotiable regardless of test intensity: nearly every response matched
// its expected shape (see lib/client.ts's checks), and failures stay under
// 1%. All four PurchaseResult outcomes are HTTP 200, so a real failure rate
// means transport/5xx errors, not business-logic "no".
//
// `checks` is >0.99 rather than ==1.00 on purpose: at flash-sale-spike's
// volume (600k+ requests) a single dropped connection during the thundering
// herd trips a handful of checks, and requiring literally zero failures out
// of hundreds of thousands of requests makes this threshold fail for a
// reason unrelated to http_req_failed below — two gates reading the same
// underlying signal should agree on the verdict.
export const baselineThresholds: Options["thresholds"] = {
  checks: ["rate>0.99"],
  http_req_failed: ["rate<0.01"],
};

// Baselines record latency, they don't gate on it — these are generous on
// purpose so a slow-but-correct run still reports its numbers instead of
// aborting. Tighten per-test only if a specific SLO is being asserted.
export const generousLatencyThresholds: Options["thresholds"] = {
  ...baselineThresholds,
  http_req_duration: ["p(95)<5000"],
};
