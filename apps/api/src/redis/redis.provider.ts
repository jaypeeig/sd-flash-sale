import { Logger, type Provider } from "@nestjs/common";
import { createRedis, flushSaleKeys } from "@workspace/redis";
import { REDIS_CONNECTION } from "./redis.constants";

const logger = new Logger("Redis");

export const redisProvider: Provider = {
  provide: REDIS_CONNECTION,
  useFactory: () => {
    const { redis } = createRedis();

    // Never throw here — a dead Redis must not stop the app from booting
    // or serving; the purchase flow degrades to Postgres instead (see
    // PurchaseReserveService.reserve()).
    redis.on("error", (error: Error) => {
      logger.warn(`Redis connection error: ${error.message}`);
    });

    // While Redis was down, purchases went through Postgres only — Redis's
    // stock counts and buyer sets never saw those writes, so its copy is
    // now stale. Rather than guess how stale, wipe every sale key on
    // reconnect and log loudly: purchases keep going to Postgres until an
    // operator re-runs `redis:warm`. Only fires on a genuine reconnect,
    // not the first connect at boot.
    let wasDown = false;
    redis.on("close", () => {
      wasDown = true;
    });
    redis.on("ready", () => {
      if (!wasDown) return;
      wasDown = false;

      void flushSaleKeys(redis)
        .then((deleted) => {
          logger.error(
            `Redis reconnected after an outage — flushed ${deleted} stale flashsale:* key(s). ` +
              "Purchases will keep hitting Postgres directly until an operator runs " +
              "`npm run -w @workspace/redis redis:warm`.",
          );
        })
        .catch((error: unknown) => {
          logger.error(
            `Redis reconnected but the post-outage flush failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    });

    return redis;
  },
};
