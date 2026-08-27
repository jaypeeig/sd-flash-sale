import { Redis, type RedisOptions } from "ioredis";
import { REDIS_DEFAULT_OPTIONS } from "./client.constants";
import { getRedisUrl } from "./env";

export const createRedis = (
  connectionString: string = getRedisUrl(),
  options: RedisOptions = {},
) => {
  const redis = new Redis(connectionString, { ...REDIS_DEFAULT_OPTIONS, ...options });
  return {
    redis,
    close: async () => {
      await redis.quit();
    },
  };
};
