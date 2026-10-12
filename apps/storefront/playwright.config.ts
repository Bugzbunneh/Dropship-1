import { defineConfig, devices } from "@playwright/test";

// End-to-end tests drive the real production build in a browser, on a desktop and a phone. They use
// the offline demo catalog (CATALOG_SOURCE=fixtures), so they need no database or credentials and
// run the same locally and in CI. Build first (`pnpm build`), then `pnpm e2e`.

const port = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
    env: {
      STORE: "pet-pilot",
      CATALOG_SOURCE: "fixtures",
      REVALIDATE_SECRET: "e2e-secret",
      ENABLE_PROBE: "true",
    },
  },
});
