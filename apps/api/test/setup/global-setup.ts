import { createDatabase } from "@workspace/database";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { assertTestDatabaseUrl } from "./test-database";

// XXX: Postgres has no `CREATE DATABASE IF NOT EXISTS`, so check pg_database on
// the maintenance ("postgres") database first.
const ensureDatabaseExists = async (testDatabaseUrl: string): Promise<void> => {
  const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");

  const maintenanceUrl = new URL(testDatabaseUrl);
  maintenanceUrl.pathname = "/postgres";

  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();

  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);

    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
};

export default async function setup(): Promise<void> {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  const migrationsFolder = process.env.MIGRATIONS_FOLDER;

  if (!testDatabaseUrl || !migrationsFolder) {
    throw new Error(
      "TEST_DATABASE_URL / MIGRATIONS_FOLDER are not set — check vitest.e2e.config.mts.",
    );
  }

  assertTestDatabaseUrl(testDatabaseUrl);
  await ensureDatabaseExists(testDatabaseUrl);

  const { db, pool } = createDatabase(testDatabaseUrl);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
