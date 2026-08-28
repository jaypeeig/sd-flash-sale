import { createRedis, redisKeys } from "@workspace/redis";
import { loadRootEnv } from "./env";
import { connect, deleteLoadTestRows } from "./load-sale";

loadRootEnv();

// Best-effort — a Redis that's down here just leaves a few harmless
// flashsale:* keys behind for a sale id that no longer exists in Postgres
// and will never be purchased again.
const removeFromRedis = async (saleIds: string[]): Promise<void> => {
  if (saleIds.length === 0) return;

  const { redis, close } = createRedis();
  try {
    const keys = saleIds.flatMap((id) => [
      redisKeys.saleStock(id),
      redisKeys.saleMeta(id),
      redisKeys.saleBuyers(id),
    ]);
    await redis.del(...keys);
  } catch (error) {
    console.warn(
      `Could not remove load-test keys from Redis: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  } finally {
    await close();
  }
};

export const cleanup = async (): Promise<void> => {
  const { db, pool } = connect();
  try {
    const saleIds = await deleteLoadTestRows(db);
    await removeFromRedis(saleIds);
    console.log("Removed the load-test product, sale, and any purchases against it.");
  } finally {
    await pool.end();
  }
};

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  await cleanup();
}
