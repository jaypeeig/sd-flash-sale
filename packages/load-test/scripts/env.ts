import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Same dotenv-from-source pattern as packages/database/src/load-env.ts,
// three levels up from scripts/ (scripts -> load-test -> packages -> root)
// rather than that file's two, and duplicated rather than imported because
// load-env.ts isn't part of @workspace/database's public exports.
export const loadRootEnv = (): void => {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
};
