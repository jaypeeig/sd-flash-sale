// Single place every k6 script reads __ENV through — so a knob's default
// lives in exactly one spot, and `scripts/run.ts` has one contract to honor
// when it spawns k6.

const requireEnv = (name: string): string => {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`Missing required --env ${name} (set by scripts/run.ts).`);
  }
  return value;
};

const optionalEnv = (name: string, fallback: string): string => __ENV[name] ?? fallback;

const optionalNumberEnv = (name: string, fallback: number): number => {
  const raw = __ENV[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`--env ${name}=${raw} is not a number.`);
  }
  return parsed;
};

export const baseUrl = optionalEnv("BASE_URL", "http://localhost:3000/api");

// Set by scripts/prepare.ts; every test but a hand-run smoke check requires it.
export const saleId = (): string => requireEnv("SALE_ID");

// Ties emails/log lines to one invocation of scripts/run.ts, so cleanup and
// verify can find exactly the rows this run created.
export const runId = optionalEnv("RUN_ID", "local");

// Where handleSummary() writes <test>.json / <test>.md — scripts/run.ts sets
// this to results/<RESULTS_LABEL>/
export const resultsDir = optionalEnv("RESULTS_DIR", "results/postgres-baseline");

export const durationSeconds = (fallback: number): number =>
  optionalNumberEnv("DURATION_SECONDS", fallback);

export const arrivalRatePerSecond = (fallback: number): number =>
  optionalNumberEnv("ARRIVAL_RATE", fallback);

export const rampSeconds = (fallback: number): number =>
  optionalNumberEnv("RAMP_SECONDS", fallback);

// Share of purchase attempts (0-1) that target the repeat-email pool instead
// of a fresh email — see lib/identity.ts's purchaseEmail().
export const emailRepeatShare = (fallback: number): number =>
  optionalNumberEnv("EMAIL_REPEAT_SHARE", fallback);

export const emailRepeatPoolSize = (fallback: number): number =>
  optionalNumberEnv("EMAIL_REPEAT_POOL_SIZE", fallback);
