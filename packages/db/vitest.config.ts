import { defineConfig } from "vitest/config";

// The remote checks talk to the hosted Supabase project, so they only run through
// `pnpm db:check-remote` (see vitest.remote.config.ts), never as part of `pnpm test` or CI.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/remote-*.test.ts", "node_modules"],
  },
});
