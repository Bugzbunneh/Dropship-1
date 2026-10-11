import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "./env";

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  SUPABASE_JWT_SIGNING_KEY: "a-signing-key-without-spaces",
  STORE_ID: "00000000-0000-4000-8000-0000000000a0",
};

describe("readSupabaseEnv", () => {
  it("reads a complete environment", () => {
    const config = readSupabaseEnv(validEnv);

    expect(config.storeId).toBe(validEnv.STORE_ID);
    expect(config.url).toBe(validEnv.NEXT_PUBLIC_SUPABASE_URL);
  });

  it("names every missing variable in one error", () => {
    const attempt = () => readSupabaseEnv({});

    expect(attempt).toThrow(/NEXT_PUBLIC_SUPABASE_URL is not set/);
    expect(attempt).toThrow(/SUPABASE_JWT_SIGNING_KEY is not set/);
    expect(attempt).toThrow(/STORE_ID is not set/);
  });

  it("treats blank values as missing", () => {
    const attempt = () => readSupabaseEnv({ ...validEnv, STORE_ID: "   " });

    expect(attempt).toThrow(/STORE_ID is not set/);
  });

  it("rejects a signing key with trailing comment text", () => {
    const attempt = () =>
      readSupabaseEnv({ ...validEnv, SUPABASE_JWT_SIGNING_KEY: "realkey used to mint the token" });

    expect(attempt).toThrow(/contains whitespace/);
  });

  it("rejects a non-UUID store id and a non-https URL", () => {
    const attempt = () =>
      readSupabaseEnv({
        ...validEnv,
        STORE_ID: "pet-pilot",
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      });

    expect(attempt).toThrow(/STORE_ID must be a UUID/);
    expect(attempt).toThrow(/must start with https/);
  });

  it("never echoes secret values in its errors", () => {
    const secret = "super secret value with spaces";
    let message = "";
    try {
      readSupabaseEnv({ ...validEnv, SUPABASE_JWT_SIGNING_KEY: secret });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).not.toContain("super secret");
  });
});
