import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Live tests need real credentials, so they only run through `pnpm check:live`.
    exclude: ["src/**/*.live.test.ts", "node_modules"],
  },
});
