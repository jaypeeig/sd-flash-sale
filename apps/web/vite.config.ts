import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
