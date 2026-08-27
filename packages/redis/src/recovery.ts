import type { FlashSaleRedis } from "./client.types";
import { redisKeys, saleIdFromStockKey } from "./keys";

// Called once per Redis reconnect (see apps/api/src/redis/redis.provider.ts)
// — not per request. Closes the write-during-outage race that a
// mark-on-fallback-success alone can't: if Redis was unreachable for an
// entire outage, nothing ever got the chance to write a sale's desynced
// flag, so the moment it reconnects it would otherwise serve stale
// (too-high) stock as if nothing had happened. This sweep marks every
// sale currently loaded into Redis as desynced the instant the connection
// comes back, before any reservation can read it.
export const markAllLoadedSalesDesynced = async (redis: FlashSaleRedis): Promise<string[]> => {
  const saleIds: string[] = [];
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      redisKeys.saleStockPattern(),
      "COUNT",
      100,
    );
    cursor = nextCursor;

    for (const key of keys) {
      const saleId = saleIdFromStockKey(key);
      if (saleId) saleIds.push(saleId);
    }
  } while (cursor !== "0");

  if (saleIds.length > 0) {
    const pipeline = redis.multi();
    for (const saleId of saleIds) {
      pipeline.set(redisKeys.saleDesynced(saleId), "1");
    }
    await pipeline.exec();
  }

  return saleIds;
};
