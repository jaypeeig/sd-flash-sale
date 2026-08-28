import type { FlashSaleRedis } from "./client.types";
import { redisKeys } from "./keys";
import { normalizeEmail } from "./normalize-email";

export interface SyncSaleInput {
  id: string;
  remainingStock: number;
  startsAt: Date;
  endsAt: Date;
  cancelledAt: Date | null;
}

// Replaces a sale's Redis state wholesale from Postgres — used by the
// redis:warm script. Never merges: a stale buyer set or stock count from a
// previous warm must not survive this call.
export const syncSale = async (
  redis: FlashSaleRedis,
  sale: SyncSaleInput,
  buyerEmails: string[],
): Promise<void> => {
  const stockKey = redisKeys.saleStock(sale.id);
  const metaKey = redisKeys.saleMeta(sale.id);
  const buyersKey = redisKeys.saleBuyers(sale.id);

  const pipeline = redis
    .multi()
    .del(stockKey, metaKey, buyersKey)
    .set(stockKey, sale.remainingStock)
    .hset(metaKey, {
      startsAt: sale.startsAt.getTime(),
      endsAt: sale.endsAt.getTime(),
      cancelled: sale.cancelledAt ? "1" : "0",
    });

  if (buyerEmails.length > 0) {
    pipeline.sadd(buyersKey, ...buyerEmails.map(normalizeEmail));
  }

  await pipeline.exec();
};

// Sweeps every flashsale:* key out of Redis — used by the redis:flush
// script, and by the api's reconnect handler after a Redis outage (see
// apps/api/src/redis/redis.provider.ts): stale keys must not silently
// keep answering the purchase gate with counts Postgres never saw.
export const flushSaleKeys = async (redis: FlashSaleRedis): Promise<number> => {
  let cursor = "0";
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      redisKeys.namespacePattern(),
      "COUNT",
      100,
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== "0");

  return deleted;
};
