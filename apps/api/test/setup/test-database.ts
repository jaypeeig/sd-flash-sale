import { products, purchases, sales } from "@workspace/database";
import { sql } from "drizzle-orm";
import type { Database } from "../../src/database/database.types";

export const assertTestDatabaseUrl = (databaseUrl: string): void => {
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run against database "${databaseName}" — the e2e suite only ever runs ` +
        `against a database whose name ends in "_test" (got: ${databaseUrl}).`,
    );
  }
};

export const truncateAll = async (db: Database, databaseUrl: string): Promise<void> => {
  assertTestDatabaseUrl(databaseUrl);

  await db.execute(sql`truncate table ${purchases}, ${sales}, ${products} cascade`);
};
