// Starts the built storefront and checks the things that must hold before a deployment is trusted:
// the store config loads, the theme (base and per-pet) reaches the page, unknown addresses answer
// 404, the revalidation endpoint is locked down, and expiring a cache tag really refreshes a
// cached value (the round trip that price and stock syncs depend on). It serves the offline demo
// catalog, so it needs no database or credentials. Run `pnpm build` first. Re-run after every
// Next.js upgrade (README risk R1).

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const storeSlug = process.env.STORE ?? "pet-pilot";
const port = process.env.SMOKE_PORT ?? "3123";
const baseUrl = `http://127.0.0.1:${port}`;
const revalidateSecret = randomBytes(24).toString("hex");

const storefrontDirectory = fileURLToPath(new URL("../apps/storefront/", import.meta.url));
const requireFromStorefront = createRequire(path.join(storefrontDirectory, "package.json"));
const nextBinary = requireFromStorefront.resolve("next/dist/bin/next");

const failures = [];

const check = (description, passed, detail = "") => {
  const mark = passed ? "ok  " : "FAIL";
  console.log(`${mark} ${description}${passed || !detail ? "" : ` (${detail})`}`);
  if (!passed) {
    failures.push(description);
  }
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitForServer = async (timeoutMilliseconds) => {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // not listening yet
    }
    await sleep(250);
  }
  throw new Error(`storefront did not start within ${timeoutMilliseconds / 1000}s`);
};

const postRevalidate = (headers, body) =>
  fetch(`${baseUrl}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const readProbe = async () => {
  const response = await fetch(`${baseUrl}/api/probe`);
  const body = await response.json();
  return body.generatedAt;
};

const runChecks = async () => {
  const health = await (await fetch(`${baseUrl}/api/health`)).json();
  check("health reports the configured store", health.store === storeSlug, JSON.stringify(health));

  const homePage = await fetch(baseUrl);
  const html = await homePage.text();
  check("home page responds 200", homePage.status === 200, String(homePage.status));
  check("home page shows the store name", html.includes("Pilot Pets"));
  check("home page carries the store theme", html.includes("--store-primary:#35302B"));
  check("home page uses the store locale", html.includes('lang="en-GB"'));

  const dogsHtml = await (await fetch(`${baseUrl}/dogs`)).text();
  check("dogs section has its own colour", dogsHtml.includes("--store-primary:#F8B036"));
  const catsHtml = await (await fetch(`${baseUrl}/cats`)).text();
  check("cats section has its own colour", catsHtml.includes("--store-primary:#00808C"));

  const unknown = await fetch(`${baseUrl}/no-such-page`);
  check("an unknown address answers 404", unknown.status === 404, String(unknown.status));
  const unknownProduct = await fetch(`${baseUrl}/products/no-such-product`);
  check(
    "an unknown product answers 404",
    unknownProduct.status === 404,
    String(unknownProduct.status),
  );

  const noSecret = await postRevalidate({}, { tags: ["probe:revalidation"] });
  check("revalidate rejects a request with no secret", noSecret.status === 401);

  const wrongSecret = await postRevalidate(
    { "x-revalidate-secret": "wrong" },
    { tags: ["probe:revalidation"] },
  );
  check("revalidate rejects a wrong secret", wrongSecret.status === 401);

  const authHeader = { "x-revalidate-secret": revalidateSecret };
  const badBody = await postRevalidate(authHeader, { tags: ["not a tag"] });
  check("revalidate rejects malformed tags", badBody.status === 400);

  const firstRead = await readProbe();
  const secondRead = await readProbe();
  check(
    "cached value is stable between reads",
    firstRead === secondRead,
    `${firstRead} vs ${secondRead}`,
  );

  const expired = await postRevalidate(authHeader, { tags: ["probe:revalidation"] });
  check("revalidate accepts a correct request", expired.status === 200, String(expired.status));

  const afterExpiry = await readProbe();
  check(
    "expiring the tag refreshes the cached value",
    afterExpiry > firstRead,
    `${firstRead} -> ${afterExpiry}`,
  );
};

const startServer = () =>
  spawn(process.execPath, [nextBinary, "start", "-p", port], {
    cwd: storefrontDirectory,
    env: {
      ...process.env,
      STORE: storeSlug,
      CATALOG_SOURCE: "fixtures",
      REVALIDATE_SECRET: revalidateSecret,
      ENABLE_PROBE: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

const server = startServer();
let serverOutput = "";
server.stdout.on("data", (chunk) => (serverOutput += chunk));
server.stderr.on("data", (chunk) => (serverOutput += chunk));

try {
  await waitForServer(60_000);
  await runChecks();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error("--- server output ---\n" + serverOutput);
  failures.push("smoke test aborted");
} finally {
  server.kill();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed");
