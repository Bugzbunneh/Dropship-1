import { describe, expect, it } from "vitest";
import { isAuthorised } from "./secret";

describe("isAuthorised", () => {
  it("accepts the matching secret", () => {
    expect(isAuthorised("s3cret-value", "s3cret-value")).toBe(true);
  });

  it("rejects a different secret, including a prefix of the real one", () => {
    expect(isAuthorised("s3cret", "s3cret-value")).toBe(false);
    expect(isAuthorised("other", "s3cret-value")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isAuthorised(null, "s3cret-value")).toBe(false);
    expect(isAuthorised("", "s3cret-value")).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    expect(isAuthorised("anything", undefined)).toBe(false);
    expect(isAuthorised("", "")).toBe(false);
  });
});
