import { createRedis, syncSaleToRedis } from "@workspace/redis";
import { loadRootEnv } from "./env";
import { connect, createLoadTestSale } from "./load-sale";
import { TESTS } from "./tests";

loadRootEnv();

export const STOCK_PROFILES: Record<string, number> = Object.fromEntries(
  TESTS.map((test) => [test.name, test.stock]),
);

export interface PrepareResult {
  productId: string;
  saleId: string;
}

export const prepare = async (testName: string): Promise<PrepareResult> => {
  const totalStock = Number(process.env.STOCK) || STOCK_PROFILES[testName];
  if (!totalStock) {
    throw new Error(
      `Unknown test "${testName}" — expected one of: ${Object.keys(STOCK_PROFILES).join(", ")}.`,
    );
  }

  const { db, pool } = connect();
  const { redis, close: closeRedis } = createRedis();
  try {
    const result = await createLoadTestSale(db, { totalStock });

    // No --force needed: a freshly created load-test sale has zero
    // purchases and full stock, so syncSaleToRedis's "live" check never
    // trips on it, even though its window is already active. This is what
    // makes flash-sale-spike actually exercise the Redis fast path instead
    // of silently falling back to Postgres for the whole run.
    const syncResult = await syncSaleToRedis(db, redis, result.saleId);
    if (!syncResult.synced) {
      throw new Error(`Failed to sync load-test sale into Redis: ${syncResult.reason}`);
    }

    console.log(
      `Prepared load-test sale ${result.saleId} (stock ${totalStock}) for "${testName}", ` +
        `synced into Redis.`,
    );
    return result;
  } finally {
    await pool.end();
    await closeRedis();
  }
};

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const testName = process.argv[2];
  if (!testName) {
    console.error("Usage: tsx scripts/prepare.ts <test-name>");
    process.exit(1);
  }
  await prepare(testName);
}
