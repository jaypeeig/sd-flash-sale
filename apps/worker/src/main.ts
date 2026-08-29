import { resolve } from "node:path";
import { createDatabase, writePurchaseBatch } from "@workspace/database";
import { connect, drainPurchaseWrites, type DrainHandle } from "@workspace/queue";
import { config } from "dotenv";

// Same as apps/api/src/main.ts: dev-time-only, this file just doesn't exist
// (or is empty) in the container, so it's a silent no-op there and the k8s
// envFrom values stand.
config({ path: resolve(process.cwd(), "../../.env") });

const optionalNumberEnv = (name: string): number | undefined => {
  const raw = process.env[name];
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const log = (message: string): void => {
  console.log(`[worker] ${message}`);
};

const main = async (): Promise<void> => {
  const { db, pool } = createDatabase();
  const { channel, close: closeQueue } = await connect();

  let handle: DrainHandle | undefined;
  let shuttingDown = false;

  // terminationGracePeriodSeconds: 30 on the k8s Deployment is the budget
  // this has to work within — stop() waits out the in-flight batch before
  // the connection and pool close underneath it.
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${signal} received — finishing the in-flight batch, then shutting down...`);
    await handle?.stop();
    await closeQueue();
    await pool.end();
    log("Shut down cleanly.");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  handle = await drainPurchaseWrites({
    channel,
    prefetch: optionalNumberEnv("QUEUE_PREFETCH"),
    batchSize: optionalNumberEnv("QUEUE_BATCH_SIZE"),
    batchWindowMs: optionalNumberEnv("QUEUE_BATCH_WINDOW_MS"),
    maxAttempts: optionalNumberEnv("QUEUE_MAX_ATTEMPTS"),
    retryBackoffMs: optionalNumberEnv("QUEUE_RETRY_BACKOFF_MS"),
    writeBatch: async (entries) => {
      const written = await writePurchaseBatch(db, entries);
      if (written > 0) {
        log(`Wrote ${written} purchase(s) from a batch of ${entries.length}.`);
      }
    },
    onDeadLettered: (entries, error) => {
      console.error(
        `[worker] Dead-lettered a batch of ${entries.length} purchase write(s) after exhausting retries: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    },
  });

  log("Draining flash-sale.purchase-writes...");
};

void main().catch((error: unknown) => {
  console.error("[worker] Fatal error during startup:", error);
  process.exitCode = 1;
});
