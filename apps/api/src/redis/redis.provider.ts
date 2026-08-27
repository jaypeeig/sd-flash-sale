import { Logger, type Provider } from "@nestjs/common";
import { createRedis, markAllLoadedSalesDesynced } from "@workspace/redis";
import { REDIS_CONNECTION } from "./redis.constants";

const logger = new Logger("Redis");

export const redisProvider: Provider = {
  provide: REDIS_CONNECTION,
  useFactory: () => {
    const { redis } = createRedis();
    redis.on("error", (error: Error) => {
      logger.warn(`Redis connection error: ${error.message}`);
    });

    // If Redis was down for any part of an outage, purchases fell through
    // to Postgres without Redis's stock counters or buyer sets seeing
    // those writes — Redis's copy is now too high, not too low. The
    // moment the connection comes back, sweep every sale currently loaded
    // into Redis and mark it desynced *before* any reservation can read
    // it, so the reservation Lua refuses the fast path until an operator
    // repairs it with redis:sync. Only fires on a genuine reconnect, not
    // on the initial boot connection.
    let wasDown = false;
    redis.on("close", () => {
      wasDown = true;
    });
    redis.on("ready", () => {
      if (!wasDown) return;
      wasDown = false;
      void markAllLoadedSalesDesynced(redis)
        .then((saleIds) => {
          if (saleIds.length > 0) {
            logger.warn(`Redis reconnected — marked desynced: ${saleIds.join(", ")}`);
          }
        })
        .catch((error: unknown) => {
          logger.warn(
            `Redis reconnected but the desync sweep failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    });

    return redis;
  },
};
