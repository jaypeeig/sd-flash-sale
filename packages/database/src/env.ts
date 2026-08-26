import { config } from "dotenv";
import { fileURLToPath } from "node:url";

export const loadEnv = (): void => {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
};

export const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env at the repo root.");
  }
  return url;
};
