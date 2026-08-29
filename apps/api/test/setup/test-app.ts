import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { createDatabase, writePurchaseBatch } from "@workspace/database";
import {
  connect,
  drainPurchaseWrites,
  PURCHASE_WRITES_DEAD_QUEUE,
  PURCHASE_WRITES_QUEUE,
} from "@workspace/queue";
import { createRedis } from "@workspace/redis";
import type { Cache } from "cache-manager";
import { AppModule } from "../../src/app.module";
import { DATABASE_CONNECTION } from "../../src/database/database.constants";
import { QUEUE_CONNECTION } from "../../src/queue/queue.constants";
import { REDIS_CONNECTION } from "../../src/redis/redis.constants";
import { assertTestDatabaseUrl, truncateAll } from "./test-database";
import type { TestApp } from "./test-app.types";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const bootstrapTestApp = async (): Promise<TestApp> => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is not set — check vitest.e2e.config.mts.");
  }
  assertTestDatabaseUrl(databaseUrl);

  const redisUrl = process.env.TEST_REDIS_URL;
  if (!redisUrl) {
    throw new Error("TEST_REDIS_URL is not set — check vitest.e2e.config.mts.");
  }

  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (!rabbitmqUrl) {
    throw new Error("RABBITMQ_URL is not set — check vitest.e2e.config.mts.");
  }

  const { db, pool } = createDatabase(databaseUrl);
  const { redis } = createRedis(redisUrl);

  const { channel: queue, close: closeQueue } = await connect(rabbitmqUrl);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE_CONNECTION)
    .useValue(db)
    .overrideProvider(REDIS_CONNECTION)
    .useValue(redis)
    .overrideProvider(QUEUE_CONNECTION)
    .useValue({ getChannel: () => queue, close: async () => undefined })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api");

  await app.listen(0);

  const cache = moduleRef.get<Cache>(CACHE_MANAGER);

  return {
    app,
    server: app.getHttpServer(),
    db,
    redis,
    queue,
    // Cached sale rows must not survive a truncate — otherwise a later test
    // reusing the same id could be served a row from a deleted sale. Same
    // logic for Redis: flushdb (not just the flashsale:* keys) since the
    // test database (index 1) is dedicated to this suite. purgeQueue clears
    // out anything a previous test published but never drained.
    reset: () =>
      Promise.all([
        truncateAll(db, databaseUrl),
        cache.clear(),
        redis.flushdb(),
        queue.purgeQueue(PURCHASE_WRITES_QUEUE),
        queue.purgeQueue(PURCHASE_WRITES_DEAD_QUEUE),
      ]).then(() => undefined),
    close: async () => {
      // app.close() runs RedisModule.onModuleDestroy, which already quits
      // this redis connection, and QueueModule.onModuleDestroy, whose
      // close() is a no-op on the overridden provider above — only the pg
      // pool and this suite's own RabbitMQ connection need closing here.
      await app.close();
      await pool.end();
      await closeQueue();
    },
    // Stands in for apps/worker, which doesn't run during these tests: runs
    // the same drain loop against whatever's currently queued, then stops.
    // The default 50ms batch window means messages published moments ago
    // are already pending — the extra settle wait covers the rest.
    drainQueue: async () => {
      const handle = await drainPurchaseWrites({
        channel: queue,
        writeBatch: async (entries) => {
          await writePurchaseBatch(db, entries);
        },
      });
      await sleep(300);
      await handle.stop();
    },
  };
};
