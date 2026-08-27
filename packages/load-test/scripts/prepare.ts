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
  try {
    const result = await createLoadTestSale(db, { totalStock });
    console.log(
      `Prepared load-test sale ${result.saleId} (stock ${totalStock}) for "${testName}".`,
    );
    return result;
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
