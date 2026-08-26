import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

export const createDatabase = (connectionString: string = getDatabaseUrl()) => {
  const pool = new Pool({ connectionString });
  return { db: drizzle(pool, { schema }), pool };
};
