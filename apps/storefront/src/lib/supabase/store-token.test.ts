import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { mintStoreToken, STORE_TOKEN_LIFETIME_SECONDS } from "./store-token";

const signingKey = "unit-test-signing-key-that-is-long-enough-for-hs256-0123456789";
const storeId = "00000000-0000-4000-8000-0000000000a0";
const now = new Date("2026-10-11T12:00:00Z");

// Verifies as of the moment the token was minted, so the tests do not depend on the real clock.
const verify = (token: string, key: string) =>
  jwtVerify(token, new TextEncoder().encode(key), { algorithms: ["HS256"], currentDate: now });

describe("mintStoreToken", () => {
  it("signs a token the same key can verify", async () => {
    const token = await mintStoreToken({ storeId, signingKey, now });

    const { payload } = await verify(token, signingKey);

    expect(payload["store_id"]).toBe(storeId);
  });

  it("always acts as the anon role, never an elevated one", async () => {
    const token = await mintStoreToken({ storeId, signingKey, now });

    const { payload } = await verify(token, signingKey);

    expect(payload["role"]).toBe("anon");
  });

  it("expires after the configured lifetime", async () => {
    const token = await mintStoreToken({ storeId, signingKey, now });

    const { payload } = await jwtVerify(token, new TextEncoder().encode(signingKey), {
      currentDate: now,
    });

    const issuedAt = payload.iat ?? 0;
    expect((payload.exp ?? 0) - issuedAt).toBe(STORE_TOKEN_LIFETIME_SECONDS);
    expect(issuedAt).toBe(Math.floor(now.getTime() / 1000));
  });

  it("is rejected once it has expired", async () => {
    const token = await mintStoreToken({ storeId, signingKey, now });
    const wellAfterExpiry = new Date(now.getTime() + 2 * STORE_TOKEN_LIFETIME_SECONDS * 1000);

    const attempt = jwtVerify(token, new TextEncoder().encode(signingKey), {
      currentDate: wellAfterExpiry,
    });

    await expect(attempt).rejects.toThrow(/exp/);
  });

  it("cannot be verified with a different key", async () => {
    const token = await mintStoreToken({ storeId, signingKey, now });

    await expect(
      verify(token, "some-other-key-of-similar-length-0123456789012345"),
    ).rejects.toThrow();
  });

  it("carries the store it was minted for, and nothing else sensitive", async () => {
    const token = await mintStoreToken({ storeId, signingKey, now });

    const { payload } = await verify(token, signingKey);

    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "iss", "role", "store_id"]);
  });
});
