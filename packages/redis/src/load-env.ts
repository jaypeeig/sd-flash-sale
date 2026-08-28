import { join } from "node:path";
import { config } from "dotenv";

// Dev-time only, for scripts run directly via tsx (redis:warm, redis:flush)
// — kept out of the build the same way @workspace/database excludes its
// own load-env.ts. Unlike that package we're CommonJS throughout, so a
// plain __dirname is enough; no import.meta needed.
export const loadEnv = (): void => {
  config({ path: join(__dirname, "../../../.env") });
};
