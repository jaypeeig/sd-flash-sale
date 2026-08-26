import type { Provider } from "@nestjs/common";
import { createDatabase } from "@workspace/database";
import { DATABASE_CONNECTION } from "./database.constants";

export const databaseProvider: Provider = {
  provide: DATABASE_CONNECTION,
  useFactory: () => createDatabase().db,
};
