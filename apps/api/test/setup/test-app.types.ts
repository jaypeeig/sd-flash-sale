import type { INestApplication } from "@nestjs/common";
import type { Server } from "node:http";
import type { Database } from "../../src/database/database.types";
import type { RedisClient } from "../../src/redis/redis.types";

export interface TestApp {
  app: INestApplication;
  server: Server;
  db: Database;
  redis: RedisClient;
  /** Truncates all tables and flushes the Redis namespace. Call between tests for a clean slate. */
  reset: () => Promise<void>;
  /** Closes the Nest app (which also quits the Redis client) and the pg Pool backing it. Call once in afterAll. */
  close: () => Promise<void>;
}
