import type { createDatabase } from "@workspace/database";

export type Database = ReturnType<typeof createDatabase>["db"];
