import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // The real package throws unless it is imported by server-side React code. Tests run in
      // plain Node, so they get an empty stand-in.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Live tests need real credentials, so they only run through `pnpm check:live`.
    exclude: ["src/**/*.live.test.ts", "node_modules"],
  },
});
