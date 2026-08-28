import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Load the repo-root .env the same way main.ts does, before anything below
// reads process.env.DATABASE_URL.
loadDotenv({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const deriveTestDatabaseUrl = (databaseUrl: string): string => {
  const url = new URL(databaseUrl);
  if (!url.pathname.endsWith("_test")) {
    url.pathname = `${url.pathname}_test`;
  }
  return url.toString();
};

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  (process.env.DATABASE_URL ? deriveTestDatabaseUrl(process.env.DATABASE_URL) : undefined);

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set and DATABASE_URL is unavailable to derive it from — copy .env.example to .env at the repo root.",
  );
}

// Unlike Postgres, isolation here is a separate Redis logical database
// (index 1, see .env.example) rather than a separate name — no derivation
// needed, just require it explicitly.
const testRedisUrl = process.env.TEST_REDIS_URL;

if (!testRedisUrl) {
  throw new Error("TEST_REDIS_URL is not set — copy .env.example to .env at the repo root.");
}

const migrationsFolder = fileURLToPath(new URL("../../packages/database/drizzle", import.meta.url));

// globalSetup runs in the main process before workers start — hand it these
// through process.env directly rather than relying on `test.env`, which is
// only guaranteed to reach the worker/test environment.
process.env.TEST_DATABASE_URL = testDatabaseUrl;
process.env.MIGRATIONS_FOLDER = migrationsFolder;

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        target: "es2022",
        keepClassNames: true,
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["test/**/*.e2e.test.ts"],
    setupFiles: ["reflect-metadata"],
    globalSetup: ["./test/setup/global-setup.ts"],
    // Every file shares one flashsale_test database and truncates between
    // tests — running files in parallel would let them truncate each other
    // mid-test.
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      REDIS_URL: testRedisUrl,
      TEST_REDIS_URL: testRedisUrl,
      MIGRATIONS_FOLDER: migrationsFolder,
    },
  },
});
