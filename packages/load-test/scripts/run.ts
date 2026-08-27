import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FORWARDABLE_TUNING_ENV_VARS, todayResultsLabel } from "../shared/constants.ts";
import { loadRootEnv } from "./env";
import { cleanup } from "./cleanup";
import { prepare, STOCK_PROFILES } from "./prepare";
import { DEFAULT_SUITE_STEPS } from "./tests";
import { printVerifyReport, verify } from "./verify";

loadRootEnv();

const packageDir = fileURLToPath(new URL("..", import.meta.url));

interface RunArgs {
  /** undefined = no test named on the CLI, run the default suite. */
  testName: string | undefined;
  keep: boolean;
  label: string;
}

const parseArgs = (argv: string[]): RunArgs => {
  const positional: string[] = [];
  let keep = false;

  for (const arg of argv) {
    if (arg === "--keep") {
      keep = true;
    } else {
      positional.push(arg);
    }
  }

  const testName = positional[0];
  if (testName !== undefined && !(testName in STOCK_PROFILES)) {
    console.error(
      `Unknown test "${testName}" — expected one of: ${Object.keys(STOCK_PROFILES).join(", ")}, ` +
        `or omit it to run the full default suite (${DEFAULT_SUITE_STEPS.join(" -> ")}).\n` +
        `Usage: npm run load-test [-- <test-name>] [--keep]\n` +
        `  results land in results/<today's date>/ — override the directory name with the RESULTS_LABEL env var.`,
    );
    process.exit(1);
  }

  return { testName, keep, label: process.env.RESULTS_LABEL ?? todayResultsLabel() };
};

const preflightHealthCheck = async (baseUrl: string): Promise<void> => {
  try {
    const res = await fetch(`${baseUrl}/health`);
    if (!res.ok) {
      throw new Error(`GET ${baseUrl}/health returned ${res.status}`);
    }
  } catch (error) {
    throw new Error(
      `API isn't reachable at ${baseUrl} — start it first (npm run -w api build && npm run -w api start). ` +
        `Underlying error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const hasNativeK6 = (): boolean =>
  spawnSync("k6", ["version"], { stdio: "ignore" }).error === undefined;

const forwardedTuningEnv = (): Record<string, string> => {
  const forwarded: Record<string, string> = {};
  for (const name of FORWARDABLE_TUNING_ENV_VARS) {
    const value = process.env[name];
    if (value !== undefined) forwarded[name] = value;
  }
  return forwarded;
};

const runK6 = (testName: string, env: Record<string, string>): Promise<number> => {
  const scriptPath = `k6/tests/${testName}.ts`;
  const envArgs = Object.entries(env).flatMap(([key, value]) => ["--env", `${key}=${value}`]);

  const [command, args] = hasNativeK6()
    ? ["k6", ["run", ...envArgs, scriptPath]]
    : [
        "docker",
        [
          "run",
          "--rm",
          "--network",
          "host",
          "-v",
          `${packageDir}:/work`,
          "-w",
          "/work",
          // grafana/k6's image runs as its own non-root user by default,
          // which can't write into the host-owned results/ dir mounted
          // above — run as the host user instead so handleSummary()'s
          // file writes land with the right ownership.
          ...(process.getuid && process.getgid
            ? ["--user", `${process.getuid()}:${process.getgid()}`]
            : []),
          "grafana/k6",
          "run",
          ...envArgs,
          scriptPath,
        ],
      ];

  console.log(`\n> ${command} ${args.join(" ")}\n`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", cwd: packageDir });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
};

interface RunSingleTestOptions {
  baseUrl: string;
  resultsDir: string;
  keep: boolean;
}

const runSingleTest = async (
  testName: string,
  { baseUrl, resultsDir, keep }: RunSingleTestOptions,
): Promise<boolean> => {
  const runId = Date.now().toString(36);
  const { saleId } = await prepare(testName);

  const k6ExitCode = await runK6(testName, {
    BASE_URL: baseUrl,
    SALE_ID: saleId,
    RUN_ID: runId,
    RESULTS_DIR: resultsDir,
    ...forwardedTuningEnv(),
  });

  const verifyResult = await verify(saleId);
  printVerifyReport(verifyResult);

  if (keep) {
    console.log(
      `--keep passed: leaving sale ${saleId} in place (run \`npm run load:cleanup\` when done).`,
    );
  } else {
    await cleanup();
  }

  const ok = k6ExitCode === 0 && verifyResult.ok;
  if (!ok) {
    console.error(
      `\n${testName} FAILED — ${k6ExitCode !== 0 ? `k6 exited ${k6ExitCode}` : ""}${
        k6ExitCode !== 0 && !verifyResult.ok ? " and " : ""
      }${!verifyResult.ok ? "an invariant was violated" : ""}.\n`,
    );
  }
  return ok;
};

const main = async (): Promise<void> => {
  const { testName, keep, label } = parseArgs(process.argv.slice(2));
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000/api";
  const resultsDir = `results/${label}`;
  const steps = testName ? [testName] : DEFAULT_SUITE_STEPS;

  if (!hasNativeK6()) {
    console.log("No local `k6` binary found — falling back to `docker run grafana/k6`.");
  }

  await preflightHealthCheck(baseUrl);
  mkdirSync(`${packageDir}/${resultsDir}`, { recursive: true });

  if (steps.length > 1) {
    console.log(`Running the default suite: ${steps.join(" -> ")} (results -> ${resultsDir}/)`);
  }

  const outcomes: { step: string; ok: boolean }[] = [];
  for (const step of steps) {
    console.log(`\n=== ${step} ===`);
    const ok = await runSingleTest(step, { baseUrl, resultsDir, keep });
    outcomes.push({ step, ok });

    if (!ok && step === "smoke") {
      console.error("smoke failed — aborting before running the heavier baselines.");
      break;
    }
  }

  if (outcomes.length > 1) {
    console.log("\nSuite summary:");
    for (const { step, ok } of outcomes) {
      console.log(`  ${ok ? "✓" : "✗"} ${step}`);
    }
    for (const skipped of steps.slice(outcomes.length)) {
      console.log(`  - ${skipped} (skipped)`);
    }
  }

  const failed = outcomes.length < steps.length || outcomes.some((outcome) => !outcome.ok);
  process.exit(failed ? 1 : 0);
};

await main();
