import { Redis, type RedisOptions } from "ioredis";
import { REDIS_DEFAULT_OPTIONS } from "./client.constants";
import type { FlashSaleRedis } from "./client.types";
import { getRedisUrl } from "./env";
import { RELEASE_PURCHASE_LUA } from "./release-purchase";
import { RESERVE_PURCHASE_LUA } from "./reserve-purchase";

export const createRedis = (
  connectionString: string = getRedisUrl(),
  options: RedisOptions = {},
): { redis: FlashSaleRedis; close: () => Promise<void> } => {
  const redis = new Redis(connectionString, {
    ...REDIS_DEFAULT_OPTIONS,
    ...options,
  }) as FlashSaleRedis;

  redis.defineCommand("reservePurchase", { numberOfKeys: 4, lua: RESERVE_PURCHASE_LUA });
  redis.defineCommand("releasePurchase", { numberOfKeys: 2, lua: RELEASE_PURCHASE_LUA });

  return {
    redis,
    close: async () => {
      await redis.quit();
    },
  };
};
