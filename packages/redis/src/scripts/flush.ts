import { createRedis } from "../client";
import { loadEnv } from "../load-env";
import { redisKeys } from "../keys";

loadEnv();

const { redis, close } = createRedis();

// SCAN over the namespace and delete in batches — never FLUSHALL/FLUSHDB,
// which would also wipe anything else sharing this Redis instance.
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

console.log(`Flushed ${deleted} key(s) under "${redisKeys.namespacePattern()}".`);

await close();
