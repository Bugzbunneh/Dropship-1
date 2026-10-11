import { defineConfig } from "vitest/config";

// Live tests call real services (the hosted Supabase project and Stripe's test mode) with the
// keys in apps/storefront/.env and .env.local. They never run in CI. Use `pnpm check:live`.
//
// Node's loadEnvFile does not overwrite variables that are already set, so load the file with the
// higher priority first, matching how Next.js layers .env.local over .env.
const loadIfPresent = (file: string): void => {
  try {
    process.loadEnvFile(file);
  } catch {
    // the file does not exist; the tests report any variable they need
  }
};

loadIfPresent(".env.local");
loadIfPresent(".env");

export default defineConfig({
  test: {
    include: ["src/**/*.live.test.ts"],
    testTimeout: 30_000,
  },
});
