import { config } from "dotenv";
import { fileURLToPath } from "node:url";

export const loadEnv = (): void => {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
};
