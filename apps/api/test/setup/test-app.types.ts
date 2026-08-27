import type { INestApplication } from "@nestjs/common";
import type { Server } from "node:http";
import type { Database } from "../../src/database/database.types";

export interface TestApp {
  app: INestApplication;
  server: Server;
  db: Database;
  /** Truncates all tables. Call between tests for a clean slate. */
  reset: () => Promise<void>;
  /** Closes the Nest app and the pg Pool backing it. Call once in afterAll. */
  close: () => Promise<void>;
}
