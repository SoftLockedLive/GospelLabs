import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Dates are shown in the learner's time zone; tests use a fixed one so they pass anywhere.
    env: { TZ: "UTC" },
  },
});
