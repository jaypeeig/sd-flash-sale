import type { RedisOptions } from "ioredis";

// Tuned to fail fast under load rather than hang: a stuck Redis should never
// stall a request, it should reject quickly so the caller can degrade.
export const REDIS_DEFAULT_OPTIONS = {
  connectTimeout: 2_000,
  maxRetriesPerRequest: 2,
  retryStrategy: (times: number) => Math.min(times * 200, 5_000),
} as const satisfies RedisOptions;
