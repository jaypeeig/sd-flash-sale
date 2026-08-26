import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl, loadEnv } from "./src/env";

loadEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
