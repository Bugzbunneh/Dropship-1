import { describe, expect, it } from "vitest";
import type { CartVariantInfo } from "../catalog/types";
import { summariseCart } from "./totals";

const rules = { flatRateMinor: 399, freeThresholdMinor: 3500 };

const info = (overrides: Partial<CartVariantInfo> & { variantId: string }): CartVariantInfo => ({
  productSlug: "p",
  productTitle: "Product",
  brand: null,
  department: "dogs",
  variantTitle: "Default",
  options: {},
  priceMinor: 1000,
  compareAtMinor: null,
  isAvailable: true,
  image: null,
  ...overrides,
});

describe("summariseCart", () => {
  it("totals lines and adds the flat delivery charge below the threshold", () => {
    const summary = summariseCart(
      [{ variantId: "a", quantity: 2 }],
      [info({ variantId: "a", priceMinor: 1000 })],
      rules,
    );

    expect(summary.subtotalMinor).toBe(2000);
    expect(summary.shippingMinor).toBe(399);
    expect(summary.totalMinor).toBe(2399);
    expect(summary.itemCount).toBe(2);
  });

  it("makes delivery free at the threshold", () => {
    const summary = summariseCart(
      [{ variantId: "a", quantity: 1 }],
      [info({ variantId: "a", priceMinor: 3500 })],
      rules,
    );

    expect(summary.shippingMinor).toBe(0);
    expect(summary.totalMinor).toBe(3500);
    expect(summary.freeShippingRemainingMinor).toBe(0);
    expect(summary.freeShippingProgress).toBe(1);
  });

  it("reports how far the basket is from free delivery", () => {
    const summary = summariseCart(
      [{ variantId: "a", quantity: 1 }],
      [info({ variantId: "a", priceMinor: 1750 })],
      rules,
    );

    expect(summary.freeShippingRemainingMinor).toBe(1750);
    expect(summary.freeShippingProgress).toBeCloseTo(0.5);
  });

  it("works out savings against the was-price", () => {
    const summary = summariseCart(
      [{ variantId: "a", quantity: 3 }],
      [info({ variantId: "a", priceMinor: 999, compareAtMinor: 1299 })],
      rules,
    );

    expect(summary.savingsMinor).toBe(900);
  });

  it("keeps sold-out items visible but free, and flags them", () => {
    const summary = summariseCart(
      [
        { variantId: "a", quantity: 1 },
        { variantId: "b", quantity: 2 },
      ],
      [
        info({ variantId: "a", priceMinor: 1000 }),
        info({ variantId: "b", priceMinor: 5000, isAvailable: false }),
      ],
      rules,
    );

    expect(summary.lines).toHaveLength(2);
    expect(summary.subtotalMinor).toBe(1000);
    expect(summary.itemCount).toBe(1);
    expect(summary.hasUnavailableLines).toBe(true);
  });

  it("copes with a variant that has left the catalog", () => {
    const summary = summariseCart([{ variantId: "gone", quantity: 1 }], [], rules);

    expect(summary.lines[0]?.info).toBeUndefined();
    expect(summary.subtotalMinor).toBe(0);
    expect(summary.shippingMinor).toBe(0);
    expect(summary.hasUnavailableLines).toBe(true);
  });

  it("charges nothing for an empty cart", () => {
    const summary = summariseCart([], [], rules);

    expect(summary.totalMinor).toBe(0);
    expect(summary.shippingMinor).toBe(0);
    expect(summary.freeShippingRemainingMinor).toBe(3500);
  });
});
