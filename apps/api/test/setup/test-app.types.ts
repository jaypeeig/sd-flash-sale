import type { INestApplication } from "@nestjs/common";
import type { Server } from "node:http";
import type { Database } from "../../src/database/database.types";
import type { Redis } from "../../src/redis/redis.types";

export interface TestApp {
  app: INestApplication;
  server: Server;
  db: Database;
  redis: Redis;
  /** Truncates all tables and flushes the (dedicated) test Redis db. Call between tests for a clean slate. */
  reset: () => Promise<void>;
  /** Closes the Nest app and the pg Pool backing it. Call once in afterAll. */
  close: () => Promise<void>;
}
