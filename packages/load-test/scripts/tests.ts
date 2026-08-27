// The suite's roster and its default run order, in one place. Previously
// two hand-synced lists — prepare.ts's STOCK_PROFILES (what tests exist and
// how much stock each needs) and run.ts's DEFAULT_SUITE_STEPS (what order
// the default suite runs them in) — that happened to always list the same
// names. Add a test by adding one entry here; both derive from it.
export interface TestProfile {
  name: string;
  /** Per-test stock profile — the whole reason each test measures what it
   * claims to: a deep stock never sells out during the run (so it measures
   * the real transaction, not the cheap sold_out early return), a shallow
   * one guarantees a thundering herd actually exhausts it. */
  stock: number;
  purpose: string;
  /** false = runnable via `npm run load-test -- <name>` but skipped by the
   * default no-argument suite. For a diagnostic test like capacity-ramp,
   * which exists to be run deliberately and takes several minutes on its
   * own — not something every default suite invocation should pay for. */
  includeInDefaultSuite?: boolean;
}

export const TESTS: readonly TestProfile[] = [
  {
    name: "smoke",
    stock: 10_000,
    purpose: "Wiring check: is the API up, does every endpoint respond.",
  },
  {
    name: "flash-sale-spike",
    stock: 5_000,
    purpose: "The real flash-sale moment: a thundering herd onto a sale that sells out.",
  },
  {
    name: "capacity-ramp",
    stock: 2_000_000,
    purpose:
      "Diagnostic: step the arrival rate through flat plateaus to find the throughput/latency knee, instead of inferring it from a target rate that may never be delivered.",
    includeInDefaultSuite: false,
  },
];

export const DEFAULT_SUITE_STEPS: readonly string[] = TESTS.filter(
  (test) => test.includeInDefaultSuite !== false,
).map((test) => test.name);
