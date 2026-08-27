import type { createRedis } from "@workspace/redis";

export type RedisClient = ReturnType<typeof createRedis>["redis"];
