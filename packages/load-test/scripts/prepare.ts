import { createRedis, syncSale, type SyncSaleInput } from "@workspace/redis";
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

// Warms the freshly created sale into Redis so a run actually exercises the
// fast path instead of silently falling back to the Postgres-only flow the
// whole time — mirrors `redis:warm`, just scoped to this one sale. Never
// fails the run: if Redis isn't reachable, the purchase endpoint degrades
// to Postgres on its own (see PurchasesService.reserve()), so a load-test
// run against a down Redis is still a valid (if differently-labeled) run.
const warmIntoRedis = async (sale: SyncSaleInput): Promise<void> => {
  const { redis, close } = createRedis();
  try {
    await syncSale(redis, sale, []);
  } catch (error) {
    console.warn(
      `Could not warm sale ${sale.id} into Redis — the run will use the Postgres fallback: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  } finally {
    await close();
  }
};

export const prepare = async (testName: string): Promise<PrepareResult> => {
  const totalStock = Number(process.env.STOCK) || STOCK_PROFILES[testName];
  if (!totalStock) {
    throw new Error(
      `Unknown test "${testName}" — expected one of: ${Object.keys(STOCK_PROFILES).join(", ")}.`,
    );
  }

  const { db, pool } = connect();
  try {
    const { productId, sale } = await createLoadTestSale(db, { totalStock });
    await warmIntoRedis(sale);
    console.log(
      `Prepared load-test sale ${sale.id} (stock ${totalStock}) for "${testName}", warmed into Redis.`,
    );
    return { productId, saleId: sale.id };
  } finally {
    await pool.end();
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
