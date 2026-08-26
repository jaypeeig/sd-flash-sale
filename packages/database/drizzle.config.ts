import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./src/env";
import { loadEnv } from "./src/load-env";

loadEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
