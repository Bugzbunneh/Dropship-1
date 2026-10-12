import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateOrderNumber, normaliseOrderNumber, orderPrefixForSlug } from "./order-number";

const realRandom = (length: number): Uint8Array => new Uint8Array(randomBytes(length));

describe("orderPrefixForSlug", () => {
  it("uses the initials of each word", () => {
    expect(orderPrefixForSlug("pet-pilot")).toBe("PP");
    expect(orderPrefixForSlug("golf-shop-uk")).toBe("GSU");
    expect(orderPrefixForSlug("a-b-c-d")).toBe("ABC");
  });

  it("falls back to the first letters of a single word", () => {
    expect(orderPrefixForSlug("pawsome")).toBe("PA");
  });
});

describe("generateOrderNumber", () => {
  it("has a prefix and two groups of four", () => {
    expect(generateOrderNumber("PP", realRandom)).toMatch(
      /^PP-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/,
    );
  });

  it("never uses look-alike characters", () => {
    for (let index = 0; index < 500; index += 1) {
      const body = generateOrderNumber("PP", realRandom).slice(3);
      expect(body).not.toMatch(/[01OIL]/);
    }
  });

  it("is repeatable from the same random bytes", () => {
    const fixed = (length: number): Uint8Array => new Uint8Array(length).fill(5);
    // byte 5 is the sixth character, "7"
    expect(generateOrderNumber("PP", fixed)).toBe("PP-7777-7777");
  });

  it("skips bytes that would make some characters likelier than others", () => {
    const calls: number[] = [];
    const sequence = [255, 250, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const scripted = (length: number): Uint8Array => {
      calls.push(length);
      return new Uint8Array(sequence.slice(0, length));
    };
    // 255 and 250 are above 247 and are dropped, so the first four characters come from 0,1,2,3
    expect(generateOrderNumber("PP", scripted).startsWith("PP-2345-")).toBe(true);
  });

  it("does not collide across a large sample", () => {
    const seen = new Set<string>();
    for (let index = 0; index < 20_000; index += 1) {
      seen.add(generateOrderNumber("PP", realRandom));
    }
    expect(seen.size).toBe(20_000);
  });
});

describe("normaliseOrderNumber", () => {
  it("accepts what people type", () => {
    expect(normaliseOrderNumber("pp-7k3m-9q2x")).toBe("PP-7K3M-9Q2X");
    expect(normaliseOrderNumber("PP 7K3M 9Q2X")).toBe("PP-7K3M-9Q2X");
    expect(normaliseOrderNumber("  pp7k3m9q2x ")).toBe("PP-7K3M-9Q2X");
  });

  it("rejects anything that could not be an order number", () => {
    expect(normaliseOrderNumber("")).toBeUndefined();
    expect(normaliseOrderNumber("PP-7K3M")).toBeUndefined();
    expect(normaliseOrderNumber("PP-7K3M-9Q2X-AAAA")).toBeUndefined();
    // look-alike characters are never issued
    expect(normaliseOrderNumber("PP-0K3M-9Q2X")).toBeUndefined();
    expect(normaliseOrderNumber("1; drop table orders")).toBeUndefined();
  });
});
