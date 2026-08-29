export const LOAD_TEST_EMAIL_DOMAIN = "loadtest.invalid";

export const FORWARDABLE_TUNING_ENV_VARS = [
  "DURATION_SECONDS",
  "ARRIVAL_RATE",
  "RAMP_SECONDS",
  "MAX_VUS",
  "EMAIL_REPEAT_SHARE",
  "EMAIL_REPEAT_POOL_SIZE",
] as const;

// XXX: default results dir name when RESULTS_LABEL isn't set — local date, so
// an unlabeled run never overwrites a previous day's results.
export const todayResultsLabel = (): string => {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
