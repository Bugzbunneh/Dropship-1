import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/remote-*.test.ts"],
    // The Supabase CLI signs in with a temporary database role of a fixed name. Two CLI processes
    // at once create and drop that same role under each other, so every call must be sequential.
    fileParallelism: false,
    // Every query is a CLI call to the Management API, so allow for network latency.
    testTimeout: 120_000,
    hookTimeout: 300_000,
  },
});
