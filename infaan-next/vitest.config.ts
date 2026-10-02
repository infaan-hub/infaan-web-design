import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
