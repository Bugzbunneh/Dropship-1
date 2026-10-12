import { jwtVerify, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  emailsMatch,
  mintOrderAccessToken,
  normaliseEmail,
  ORDER_ACCESS_LIFETIME_SECONDS,
  verifyOrderAccessToken,
} from "./access";
import { mintStoreToken } from "../supabase/store-token";

const signingKey = "unit-test-signing-key-that-is-long-enough-for-hs256-0123456789";
const orderId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const storeId = "00000000-0000-4000-8000-0000000000a0";
const now = new Date("2026-10-12T12:00:00Z");
const scope = { orderId, storeId, signingKey, now };

describe("order access tokens", () => {
  it("open the order they were minted for", async () => {
    const token = await mintOrderAccessToken(scope);

    expect(await verifyOrderAccessToken(token, scope)).toBe(true);
  });

  it("do not open a different order", async () => {
    const token = await mintOrderAccessToken(scope);

    const other = { ...scope, orderId: "cccccccc-cccc-4ddd-8eee-ffffffffffff" };
    expect(await verifyOrderAccessToken(token, other)).toBe(false);
  });

  it("do not open an order in a different store", async () => {
    const token = await mintOrderAccessToken(scope);

    const other = { ...scope, storeId: "00000000-0000-4000-8000-0000000000b0" };
    expect(await verifyOrderAccessToken(token, other)).toBe(false);
  });

  it("stop working after 90 days", async () => {
    const token = await mintOrderAccessToken(scope);
    const later = new Date(now.getTime() + (ORDER_ACCESS_LIFETIME_SECONDS + 60) * 1000);

    expect(await verifyOrderAccessToken(token, { ...scope, now: later })).toBe(false);
    const justBefore = new Date(now.getTime() + (ORDER_ACCESS_LIFETIME_SECONDS - 60) * 1000);
    expect(await verifyOrderAccessToken(token, { ...scope, now: justBefore })).toBe(true);
  });

  it("are refused when signed with another key", async () => {
    const token = await mintOrderAccessToken({ ...scope, signingKey: `${signingKey}-other` });

    expect(await verifyOrderAccessToken(token, scope)).toBe(false);
  });

  it("are refused when missing, empty or garbage", async () => {
    expect(await verifyOrderAccessToken(undefined, scope)).toBe(false);
    expect(await verifyOrderAccessToken("", scope)).toBe(false);
    expect(await verifyOrderAccessToken("not.a.token", scope)).toBe(false);
  });

  it("are not the same thing as a database token, in either direction", async () => {
    const databaseToken = await mintStoreToken({ storeId, signingKey, now });
    const orderToken = await mintOrderAccessToken(scope);

    // a database token is not an order token...
    expect(await verifyOrderAccessToken(databaseToken, scope)).toBe(false);
    // ...and an order token does not verify with the raw signing secret the database trusts
    await expect(
      jwtVerify(orderToken, new TextEncoder().encode(signingKey), { currentDate: now }),
    ).rejects.toThrow();
  });

  it("are refused if a token for another purpose is signed with the same derived key", async () => {
    const forged = await new SignJWT({ store_id: storeId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(orderId)
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(now.getTime() / 1000) + 600)
      .sign(new TextEncoder().encode(signingKey));

    expect(await verifyOrderAccessToken(forged, scope)).toBe(false);
  });

  it("are refused if the algorithm is switched to none", async () => {
    const [header, payload] = (await mintOrderAccessToken(scope)).split(".");
    const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url",
    );

    expect(header).toBeTruthy();
    expect(await verifyOrderAccessToken(`${noneHeader}.${payload}.`, scope)).toBe(false);
  });
});

describe("emailsMatch", () => {
  it("ignores case and surrounding spaces", () => {
    expect(emailsMatch("  Alex@Example.COM ", "alex@example.com")).toBe(true);
  });

  it("rejects a different address, a missing one, and a near miss", () => {
    expect(emailsMatch("bea@example.com", "alex@example.com")).toBe(false);
    expect(emailsMatch("alex@example.com", null)).toBe(false);
    expect(emailsMatch("alex@example.co", "alex@example.com")).toBe(false);
    expect(emailsMatch("", "alex@example.com")).toBe(false);
  });
});

describe("normaliseEmail", () => {
  it("trims and lower-cases", () => {
    expect(normaliseEmail("  Alex@Example.COM ")).toBe("alex@example.com");
  });
});
