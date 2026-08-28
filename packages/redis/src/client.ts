import { Redis, type RedisOptions } from "ioredis";
import type { FlashSaleRedis } from "./client.types";
import { getRedisUrl } from "./env";
import { readLuaScript } from "./lua";

// Tuned to fail fast under load rather than hang: a stuck Redis should
// never stall a request — it should reject quickly so the purchase flow
// can fall back to Postgres. maxRetriesPerRequest: 1 + connectTimeout is
// what makes that possible — a command issued while disconnected gets one
// bounded retry, then rejects (proven: ~0.3s against an unreachable host).
//
// XXX: deliberately NOT enableOfflineQueue: false — that combines badly
// with lazyConnect, since ioredis then refuses to auto-connect on a
// command instead of queuing it ("Stream isn't writeable"), which broke
// both `quit()` on a never-used client (needed on teardown, see
// RedisModule.onModuleDestroy) and the readiness ping's ability to
// self-heal a cold connection. The bounded retry above already gives us
// fail-fast without it.
//
// lazyConnect mirrors how @workspace/database's pg Pool behaves — no
// socket opens until the first command — so compiling the Nest app (e.g.
// in unit tests) never requires a real Redis to be running.
const REDIS_DEFAULT_OPTIONS: RedisOptions = {
  connectTimeout: 2_000,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy: (times: number) => Math.min(times * 200, 5_000),
};

export const createRedis = (
  connectionString: string = getRedisUrl(),
  options: RedisOptions = {},
): { redis: FlashSaleRedis; close: () => Promise<void> } => {
  const redis = new Redis(connectionString, {
    ...REDIS_DEFAULT_OPTIONS,
    ...options,
  }) as FlashSaleRedis;

  redis.defineCommand("reservePurchase", {
    numberOfKeys: 3,
    lua: readLuaScript("reserve-purchase"),
  });

  return {
    redis,
    close: async () => {
      await redis.quit();
    },
  };
};
