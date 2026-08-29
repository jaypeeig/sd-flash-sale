import { join } from "node:path";
import { config } from "dotenv";

export const loadEnv = (): void => {
  config({ path: join(__dirname, "../../../.env") });
};
