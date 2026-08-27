import { Logger, type Provider } from "@nestjs/common";
import { createRedis } from "@workspace/redis";
import { REDIS_CONNECTION } from "./redis.constants";

const logger = new Logger("Redis");

export const redisProvider: Provider = {
  provide: REDIS_CONNECTION,
  useFactory: () => {
    const { redis } = createRedis();
    redis.on("error", (error: Error) => {
      logger.warn(`Redis connection error: ${error.message}`);
    });
    return redis;
  },
};
