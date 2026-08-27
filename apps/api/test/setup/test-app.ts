import { Test } from "@nestjs/testing";
import { createDatabase } from "@workspace/database";
import { createRedis, redisKeys } from "@workspace/redis";
import { AppModule } from "../../src/app.module";
import { DATABASE_CONNECTION } from "../../src/database/database.constants";
import { REDIS_CONNECTION } from "../../src/redis/redis.constants";
import type { RedisClient } from "../../src/redis/redis.types";
import { assertTestDatabaseUrl, truncateAll } from "./test-database";
import type { TestApp } from "./test-app.types";

const flushRedisNamespace = async (redis: RedisClient) => {
  const keys = await redis.keys(redisKeys.namespacePattern());
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};

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

  const { db, pool } = createDatabase(databaseUrl);
  // RedisModule (unlike DatabaseModule) implements onModuleDestroy and
  // calls redis.quit() there — app.close() below already closes this
  // client, so there's no separate disposer to call here.
  const { redis } = createRedis(redisUrl);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE_CONNECTION)
    .useValue(db)
    .overrideProvider(REDIS_CONNECTION)
    .useValue(redis)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api");
  // Bind a real port up front rather than leaving the server unlistened:
  // supertest lazily calls .listen(0) on first use, and concurrency tests
  // fire many requests at once — enough of them see the server not yet
  // listening at the same instant that they race to listen() it themselves.
  await app.listen(0);

  return {
    app,
    server: app.getHttpServer(),
    db,
    redis,
    reset: async () => {
      await truncateAll(db, databaseUrl);
      await flushRedisNamespace(redis);
    },
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
};
