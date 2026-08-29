import type { INestApplication } from "@nestjs/common";
import type { Channel } from "@workspace/queue";
import type { Server } from "node:http";
import type { Database } from "../../src/database/database.types";
import type { Redis } from "../../src/redis/redis.types";

export interface TestApp {
  app: INestApplication;
  server: Server;
  db: Database;
  redis: Redis;
  queue: Channel;
  /** Truncates all tables, flushes the (dedicated) test Redis db, and
   * purges the purchase-writes queue. Call between tests for a clean slate. */
  reset: () => Promise<void>;
  /** Closes the Nest app, the pg Pool, and the RabbitMQ connection. Call once in afterAll. */
  close: () => Promise<void>;
  drainQueue: () => Promise<void>;
}
