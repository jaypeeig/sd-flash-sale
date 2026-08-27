import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

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
    include: ["src/**/*.test.ts"],
    setupFiles: ["reflect-metadata"],
    env: {
      // DatabaseModule reads this as soon as AppModule is compiled — pg's
      // Pool connects lazily, so no real database is needed for tests that
      // never issue a query (e.g. health.controller.test.ts).
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
