import { createDatabase } from "@workspace/database";
import { createRedis } from "../client";
import { loadEnv } from "../load-env";
import { findSyncableSaleIds, syncSaleToRedis } from "../sync";

loadEnv();

// Usage:
//   tsx src/scripts/sync-sale.ts <saleId> [--force]
//   tsx src/scripts/sync-sale.ts --all [--force]
const parseArgs = (argv: string[]): { saleId?: string; all: boolean; force: boolean } => {
  const positional = argv.filter((arg) => arg !== "--force" && arg !== "--all");
  return {
    saleId: positional[0],
    all: argv.includes("--all"),
    force: argv.includes("--force"),
  };
};

const { saleId, all, force } = parseArgs(process.argv.slice(2));

if (!saleId && !all) {
  console.error(
    "Usage: tsx src/scripts/sync-sale.ts <saleId> [--force]\n" +
      "       tsx src/scripts/sync-sale.ts --all [--force]",
  );
  process.exit(1);
}

const { db, pool } = createDatabase();
const { redis, close: closeRedis } = createRedis();

try {
  // --all covers both active and upcoming sales (see findSyncableSaleIds) —
  // an upcoming sale has no purchases yet, so it's never "live" and syncs
  // without needing --force.
  const saleIds = all ? await findSyncableSaleIds(db) : [saleId!];

  if (saleIds.length === 0) {
    console.log("No active or upcoming sales found.");
  }

  let failed = false;
  for (const id of saleIds) {
    const result = await syncSaleToRedis(db, redis, id, { force });
    if (result.synced) {
      console.log(`✓ ${id} — stock=${result.stock} buyers=${result.buyerCount}`);
    } else {
      failed = true;
      console.error(`✗ ${id} — ${result.reason}`);
    }
  }

  if (failed && !all) {
    process.exit(1);
  }
} finally {
  await pool.end();
  await closeRedis();
}
