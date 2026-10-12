import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  priceCheckout,
  type PricingContext,
  type PurchasableVariant,
} from "./checkout";

const context: PricingContext = {
  currency: "GBP",
  shipping: { flatRateMinor: 399, freeThresholdMinor: 3500 },
  vat: { registered: false, rateBps: 2000 },
};

const variant = (overrides: Partial<PurchasableVariant> = {}): PurchasableVariant => ({
  variantId: "v1",
  sku: "SKU-1",
  productTitle: "Cloud Comfort Dog Bed",
  variantTitle: "Medium",
  currency: "GBP",
  priceMinor: 2000,
  isAvailable: true,
  imagePath: "/placeholder.svg?d=dogs",
  ...overrides,
});

describe("priceCheckout", () => {
  it("prices a basket from the catalog, not from the request", () => {
    const result = priceCheckout([{ variantId: "v1", quantity: 2 }], [variant()], context);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.order.subtotalMinor).toBe(4000);
    expect(result.order.shippingMinor).toBe(0);
    expect(result.order.totalMinor).toBe(4000);
    expect(result.order.items).toEqual([
      {
        variantId: "v1",
        sku: "SKU-1",
        title: "Cloud Comfort Dog Bed",
        variantTitle: "Medium",
        unitPriceMinor: 2000,
        quantity: 2,
        lineTotalMinor: 4000,
        imagePath: "/placeholder.svg?d=dogs",
      },
    ]);
  });

  it("charges delivery below the free threshold", () => {
    const result = priceCheckout([{ variantId: "v1", quantity: 1 }], [variant()], context);

    expect(result.ok && result.order.shippingMinor).toBe(399);
    expect(result.ok && result.order.totalMinor).toBe(2399);
  });

  it("makes delivery free at exactly the threshold", () => {
    const result = priceCheckout(
      [{ variantId: "v1", quantity: 1 }],
      [variant({ priceMinor: 3500 })],
      context,
    );

    expect(result.ok && result.order.shippingMinor).toBe(0);
  });

  it("records the VAT inside the total once registered, without adding to it", () => {
    const registered = { ...context, vat: { registered: true, rateBps: 2000 } };
    const result = priceCheckout([{ variantId: "v1", quantity: 1 }], [variant()], registered);

    expect(result.ok && result.order.totalMinor).toBe(2399);
    // 2399 / 6 = 399.83 -> 400
    expect(result.ok && result.order.taxMinor).toBe(400);
  });

  it("records no VAT while unregistered", () => {
    const result = priceCheckout([{ variantId: "v1", quantity: 1 }], [variant()], context);

    expect(result.ok && result.order.taxMinor).toBe(0);
  });

  it("merges a variant listed twice into one line", () => {
    const result = priceCheckout(
      [
        { variantId: "v1", quantity: 1 },
        { variantId: "v1", quantity: 2 },
      ],
      [variant()],
      context,
    );

    expect(result.ok && result.order.items).toHaveLength(1);
    expect(result.ok && result.order.items[0]?.quantity).toBe(3);
  });

  it("refuses an empty basket", () => {
    expect(priceCheckout([], [], context)).toEqual({
      ok: false,
      problems: [{ reason: "empty_cart" }],
    });
  });

  it("names every problem line, so the customer can fix them in one go", () => {
    const result = priceCheckout(
      [
        { variantId: "gone", quantity: 1 },
        { variantId: "soldout", quantity: 1 },
        { variantId: "v1", quantity: 1 },
      ],
      [variant(), variant({ variantId: "soldout", isAvailable: false })],
      context,
    );

    expect(result).toEqual({
      ok: false,
      problems: [
        { reason: "not_found", variantId: "gone" },
        { reason: "unavailable", variantId: "soldout" },
      ],
    });
  });

  it.each([0, -1, 1.5, Number.NaN, MAX_LINE_QUANTITY + 1])(
    "refuses a quantity of %s",
    (quantity) => {
      const result = priceCheckout([{ variantId: "v1", quantity }], [variant()], context);

      expect(result).toEqual({
        ok: false,
        problems: [{ reason: "invalid_quantity", variantId: "v1" }],
      });
    },
  );

  it("refuses more lines than a cart may hold", () => {
    const lines = Array.from({ length: MAX_CART_LINES + 1 }, (_, index) => ({
      variantId: `v${index}`,
      quantity: 1,
    }));

    expect(priceCheckout(lines, [], context)).toEqual({
      ok: false,
      problems: [{ reason: "too_many_lines" }],
    });
  });

  it("refuses a variant priced in another currency", () => {
    const result = priceCheckout(
      [{ variantId: "v1", quantity: 1 }],
      [variant({ currency: "EUR" })],
      context,
    );

    expect(result).toEqual({
      ok: false,
      problems: [{ reason: "currency_mismatch", variantId: "v1" }],
    });
  });

  it("refuses a non-integer price from a bad data source", () => {
    const result = priceCheckout(
      [{ variantId: "v1", quantity: 1 }],
      [variant({ priceMinor: 19.99 })],
      context,
    );

    expect(result.ok).toBe(false);
  });

  it("refuses a total below the payment provider's minimum", () => {
    const free = { ...context, shipping: { flatRateMinor: 0, freeThresholdMinor: 0 } };
    const result = priceCheckout(
      [{ variantId: "v1", quantity: 1 }],
      [variant({ priceMinor: 10 })],
      free,
    );

    expect(result).toEqual({ ok: false, problems: [{ reason: "below_minimum" }] });
  });
});
