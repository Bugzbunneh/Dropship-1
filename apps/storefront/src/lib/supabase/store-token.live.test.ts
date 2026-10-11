import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "./env";
import { createStoreClient } from "./store-client";
import { mintStoreToken } from "./store-token";

// Proves the storefront's database isolation end to end against the real Supabase project: a token
// signed here is accepted by the API, scoped to one store by row-level security, and everything
// forged, expired or mis-signed is refused. Run with `pnpm check:live`.
//
// Needs the pilot store to exist: `pnpm store:provision pet-pilot --env-file apps/storefront/.env.local`

const env = readSupabaseEnv();
const unrelatedStoreId = "00000000-0000-4000-8000-00000000dead";

const fetchStores = (authorization: string | undefined): Promise<Response> =>
  fetch(`${env.url}/rest/v1/stores?select=slug`, {
    headers: {
      apikey: env.publishableKey,
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    },
  });

const slugsFrom = async (response: Response): Promise<string[]> => {
  const rows = (await response.json()) as { slug: string }[];
  return rows.map((row) => row.slug);
};

describe("the storefront's store-scoped token against the live API", () => {
  it("is accepted and shows the storefront its own store, and only that", async () => {
    const token = await mintStoreToken({ storeId: env.storeId, signingKey: env.jwtSigningKey });

    const response = await fetchStores(token);

    expect(response.status).toBe(200);
    expect(await slugsFrom(response)).toEqual(["pet-pilot"]);
  });

  it("works through the typed client the pages will use", async () => {
    const client = await createStoreClient();

    const { data, error } = await client.from("stores").select("slug, currency");

    expect(error).toBeNull();
    expect(data).toEqual([{ slug: "pet-pilot", currency: "GBP" }]);
  });

  it("scopes to the store in the claim: a token for another store sees nothing", async () => {
    const token = await mintStoreToken({
      storeId: unrelatedStoreId,
      signingKey: env.jwtSigningKey,
    });

    const response = await fetchStores(token);

    expect(response.status).toBe(200);
    expect(await slugsFrom(response)).toEqual([]);
  });

  it("shows nothing to a request that carries only the publishable key", async () => {
    const response = await fetchStores(undefined);

    expect(response.status).toBe(200);
    expect(await slugsFrom(response)).toEqual([]);
  });

  it("rejects a token signed with the wrong key", async () => {
    const token = await mintStoreToken({
      storeId: env.storeId,
      signingKey: `${env.jwtSigningKey}-tampered`,
    });

    const response = await fetchStores(token);

    expect(response.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const longAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const token = await mintStoreToken({
      storeId: env.storeId,
      signingKey: env.jwtSigningKey,
      now: longAgo,
    });

    const response = await fetchStores(token);

    expect(response.status).toBe(401);
  });

  it("cannot be used to write", async () => {
    const token = await mintStoreToken({ storeId: env.storeId, signingKey: env.jwtSigningKey });

    const response = await fetch(`${env.url}/rest/v1/stores`, {
      method: "POST",
      headers: {
        apikey: env.publishableKey,
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ slug: "zz-should-not-exist", name: "Nope", currency: "GBP" }),
    });

    expect([401, 403]).toContain(response.status);

    const after = await fetchStores(token);
    expect(await slugsFrom(after)).toEqual(["pet-pilot"]);
  });
});
