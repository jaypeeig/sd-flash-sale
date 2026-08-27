import { resultsDir } from "../config/environment.ts";
import type { PurchaseOutcome } from "./api.types.ts";
import { purchaseErrorMetricName, purchaseOutcomeMetricNames } from "./metrics.ts";
import type { SummaryData, SummaryMetric } from "./summary.types.ts";

// What a rate-based test's options.ts builder configured — passed in by the
// test file itself (see config/options.ts's BuiltScenario) rather than read
// back out of `data`, since k6 doesn't expose per-scenario config to
// handleSummary. Absent entirely for constant-vus tests (smoke), which have
// no target rate or VU cap to compare against.
export interface LoadProfile {
  targetRatePerSecond: number;
  maxVus: number;
}

const ms = (value: number | undefined): string =>
  value === undefined ? "—" : `${value.toFixed(1)}ms`;
const pct = (value: number | undefined): string =>
  value === undefined ? "—" : `${(value * 100).toFixed(2)}%`;

const metric = (data: SummaryData, name: string): SummaryMetric | undefined => data.metrics[name];

const requestsPerSecond = (data: SummaryData): number => {
  const totalRequests = metric(data, "http_reqs")?.values.count ?? 0;
  const durationSeconds = data.state.testRunDurationMs / 1000;
  return durationSeconds > 0 ? totalRequests / durationSeconds : 0;
};

// Rendered first, above every other table: an arrival-rate scenario states a
// target request rate, but k6 only ever *tries* to hit it — once in-flight
// iterations exceed maxVUs, the excess is silently discarded as
// dropped_iterations rather than slowing the offered rate down. Without this
// table, "achieved req/s" reads as a measured system limit when it may only
// be the load generator running out of VUs. Absent entirely when no
// LoadProfile was passed in (smoke's constant-vus shape has no target rate
// to compare against, and never produces dropped_iterations anyway).
const renderLoadDeliveredTable = (
  data: SummaryData,
  loadProfile: LoadProfile | undefined,
): string | undefined => {
  if (!loadProfile) return undefined;
  const { targetRatePerSecond, maxVus } = loadProfile;

  const achieved = requestsPerSecond(data);
  const droppedCount = metric(data, "dropped_iterations")?.values.count ?? 0;
  const completedCount = metric(data, "iterations")?.values.count ?? 0;
  const droppedShare =
    droppedCount + completedCount > 0 ? droppedCount / (droppedCount + completedCount) : undefined;

  const vusUsed = metric(data, "vus_max")?.values.max;
  const hitVuCap = vusUsed !== undefined && vusUsed >= maxVus && droppedCount > 0;

  const rows: [string, string][] = [
    ["Target rate", `${targetRatePerSecond}/s`],
    [
      "Achieved rate",
      `${achieved.toFixed(1)}/s (${((achieved / targetRatePerSecond) * 100).toFixed(0)}% of target)`,
    ],
    ["Dropped iterations", `${droppedCount} (${pct(droppedShare)} of offered)`],
    ["VUs used / cap", `${vusUsed ?? "—"} / ${maxVus}`],
  ];

  const table = [
    "| Load delivered | Value |",
    "| --- | --- |",
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ].join("\n");

  return hitVuCap
    ? `${table}\n\n> ⚠️ Hit the VU cap with iterations still dropping — the rate above is a load-generator ceiling, not evidence of a system limit. Raise \`maxVus\` (or lower the target rate) to find the real one.`
    : table;
};

const renderOverallTable = (data: SummaryData): string => {
  const httpDuration = metric(data, "http_req_duration");
  const rows: [string, string][] = [
    ["Requests", `${metric(data, "http_reqs")?.values.count ?? 0}`],
    ["Requests/sec", requestsPerSecond(data).toFixed(1)],
    ["Failed requests", pct(metric(data, "http_req_failed")?.values.rate)],
    ["Checks passed", pct(metric(data, "checks")?.values.rate)],
    ["Latency p50", ms(httpDuration?.values.med)],
    ["Latency p95", ms(httpDuration?.values["p(95)"])],
    ["Latency p99", ms(httpDuration?.values["p(99)"])],
    ["Latency max", ms(httpDuration?.values.max)],
  ];

  return ["| Metric | Value |", "| --- | --- |", ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join(
    "\n",
  );
};

// http_req_blocked is DNS lookup + TCP/TLS connect time, on the generator
// side — not the API doing anything. It isn't tagged per endpoint (unlike
// the NAMED_TRENDS below), so it gets its own table rather than a row in
// renderEndpointTable. Worth surfacing on its own: a tail as long as the
// server-side latency tail would otherwise read as API slowness when it's
// actually connection churn.
const renderConnectionOverheadTable = (data: SummaryData): string | undefined => {
  const blocked = metric(data, "http_req_blocked");
  if (!blocked) return undefined;

  const rows: [string, string][] = [
    ["avg", ms(blocked.values.avg)],
    ["p95", ms(blocked.values["p(95)"])],
    ["max", ms(blocked.values.max)],
  ];
  return [
    "| Connection overhead (http_req_blocked) | Value |",
    "| --- | --- |",
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ].join("\n");
};

const CAPACITY_ITERATIONS_PREFIX = "capacity_iterations_rate_";
const CAPACITY_DURATION_PREFIX = "capacity_purchase_duration_rate_";

// Only capacity-ramp's metrics ever start with these prefixes (see
// lib/capacity-stages.ts) — every other test's data has none, so this stays
// generic (no testName check) and simply renders nothing for them.
const renderCapacityStagesTable = (data: SummaryData): string | undefined => {
  const rates = Object.keys(data.metrics)
    .filter((key) => key.startsWith(CAPACITY_ITERATIONS_PREFIX))
    .map((key) => Number(key.slice(CAPACITY_ITERATIONS_PREFIX.length)))
    .filter((rate) => !Number.isNaN(rate))
    .sort((a, b) => a - b);
  if (rates.length === 0) return undefined;

  const lines = rates.map((rate) => {
    const iterations = metric(data, `${CAPACITY_ITERATIONS_PREFIX}${rate}`);
    const duration = metric(data, `${CAPACITY_DURATION_PREFIX}${rate}`);
    return `| ${rate}/s | ${iterations?.values.count ?? 0} | ${ms(duration?.values.med)} | ${ms(duration?.values["p(95)"])} | ${ms(duration?.values.max)} |`;
  });

  return [
    "| Stage (target rate) | Iterations completed | p50 | p95 | max |",
    "| --- | --- | --- | --- | --- |",
    ...lines,
  ].join("\n");
};

const NAMED_TRENDS: [label: string, metricName: string][] = [
  ["GET /sales", "list_sales_duration"],
  ["GET /sales/:id", "get_sale_duration"],
  ["POST /sales/:id/purchase", "purchase_duration"],
];

const renderEndpointTable = (data: SummaryData): string | undefined => {
  const rows = NAMED_TRENDS.map(([label, name]) => [label, metric(data, name)] as const).filter(
    (row): row is [string, SummaryMetric] => row[1] !== undefined,
  );
  if (rows.length === 0) return undefined;

  const lines = rows.map(
    ([label, trend]) =>
      `| ${label} | ${ms(trend.values.avg)} | ${ms(trend.values["p(95)"])} | ${ms(trend.values.max)} |`,
  );
  return ["| Endpoint | avg | p95 | max |", "| --- | --- | --- | --- |", ...lines].join("\n");
};

// Includes purchase_outcome_error alongside the four documented
// PurchaseResult outcomes so this table's counts always sum to http_reqs
// (minus the read-only GET calls) — a request that never parsed into a known
// outcome still shows up here instead of vanishing from the accounting.
const renderPurchaseOutcomeTable = (data: SummaryData): string | undefined => {
  const namedRows = purchaseOutcomeMetricNames.map(
    (outcome) => [outcome, metric(data, `purchase_outcome_${outcome}`)] as const,
  );
  const errorRow = ["error", metric(data, purchaseErrorMetricName)] as const;

  const rows = [...namedRows, errorRow].filter(
    (row): row is [PurchaseOutcome | "error", SummaryMetric] =>
      row[1] !== undefined && (row[1].values.count ?? 0) > 0,
  );
  if (rows.length === 0) return undefined;

  const lines = rows.map(([outcome, counter]) => `| ${outcome} | ${counter.values.count ?? 0} |`);
  return ["| Purchase outcome | Count |", "| --- | --- |", ...lines].join("\n");
};

const renderMarkdown = (
  testName: string,
  data: SummaryData,
  loadProfile: LoadProfile | undefined,
): string => {
  const sections = [
    `# ${testName}`,
    "",
    renderLoadDeliveredTable(data, loadProfile),
    renderOverallTable(data),
    renderCapacityStagesTable(data),
    renderConnectionOverheadTable(data),
    renderEndpointTable(data),
    renderPurchaseOutcomeTable(data),
  ];
  return sections.filter((section): section is string => section !== undefined).join("\n\n") + "\n";
};

// k6 only recognizes a `handleSummary` export from the file it runs
// directly, so every tests/*.ts re-exports the result of this factory
// (`export const handleSummary = createHandleSummary("flash-sale-spike")`)
// rather than duplicating the write-two-files logic per test. `loadProfile`
// is the target rate + VU cap the same test file's options.ts builder
// configured (see BuiltScenario) — omit it for a constant-vus test like
// smoke, which has neither.
export const createHandleSummary = (testName: string, loadProfile?: LoadProfile) => {
  return (data: SummaryData): Record<string, string> => {
    const markdown = renderMarkdown(testName, data, loadProfile);
    return {
      [`${resultsDir}/${testName}.json`]: JSON.stringify(data, null, 2),
      [`${resultsDir}/${testName}.md`]: markdown,
      stdout: markdown,
    };
  };
};
