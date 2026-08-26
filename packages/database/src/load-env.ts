import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// ESM-only (import.meta) — for dev-time scripts (drizzle-kit, tsx) run
// directly against source. Kept out of env.ts so that file can still be
// compiled to CommonJS for apps/api to consume.
export const loadEnv = (): void => {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
};
