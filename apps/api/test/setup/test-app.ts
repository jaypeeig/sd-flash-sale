import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { createDatabase } from "@workspace/database";
import type { Cache } from "cache-manager";
import { AppModule } from "../../src/app.module";
import { DATABASE_CONNECTION } from "../../src/database/database.constants";
import { assertTestDatabaseUrl, truncateAll } from "./test-database";
import type { TestApp } from "./test-app.types";

export const bootstrapTestApp = async (): Promise<TestApp> => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is not set — check vitest.e2e.config.mts.");
  }
  assertTestDatabaseUrl(databaseUrl);

  const { db, pool } = createDatabase(databaseUrl);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE_CONNECTION)
    .useValue(db)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api");
  // Bind a real port up front rather than leaving the server unlistened:
  // supertest lazily calls .listen(0) on first use, and concurrency tests
  // fire many requests at once — enough of them see the server not yet
  // listening at the same instant that they race to listen() it themselves.
  await app.listen(0);

  const cache = moduleRef.get<Cache>(CACHE_MANAGER);

  return {
    app,
    server: app.getHttpServer(),
    db,
    // Cached sale rows must not survive a truncate — otherwise a later test
    // reusing the same id could be served a row from a deleted sale.
    reset: () => Promise.all([truncateAll(db, databaseUrl), cache.clear()]).then(() => undefined),
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
};
