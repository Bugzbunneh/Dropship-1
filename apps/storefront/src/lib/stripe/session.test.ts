import type { OrderDraft } from "@dropship/core";
import { describe, expect, it } from "vitest";
import {
  buildCheckoutSessionParams,
  CHECKOUT_LIFETIME_SECONDS,
  stripeMetadata,
  type SessionInput,
} from "./session";

const draft: OrderDraft = {
  currency: "GBP",
  subtotalMinor: 4997,
  shippingMinor: 0,
  taxMinor: 0,
  totalMinor: 4997,
  items: [
    {
      variantId: "11111111-2222-4333-8444-555555555555",
      sku: "DOG-BED-M",
      title: "Cloud Comfort Dog Bed",
      variantTitle: "Medium",
      unitPriceMinor: 2999,
      quantity: 1,
      lineTotalMinor: 2999,
      imagePath: "/placeholder.svg?d=dogs",
    },
    {
      variantId: "66666666-7777-4888-8999-aaaaaaaaaaaa",
      sku: "BALL",
      title: "Bouncy Ball",
      variantTitle: "Default Title",
      unitPriceMinor: 999,
      quantity: 2,
      lineTotalMinor: 1998,
      imagePath: "https://cdn.example.com/ball.jpg",
    },
  ],
};

const input: SessionInput = {
  orderId: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
  orderNumber: "PP-7K3M-9Q2X",
  draft,
  store: { id: "00000000-0000-4000-8000-0000000000a0", slug: "pet-pilot", name: "Pilot Pets" },
  origin: "https://pilotpets.example.com",
  shippingCountries: ["GB"],
  deliveryMaxWorkingDays: 5,
  nowSeconds: 1_800_000_000,
};

describe("buildCheckoutSessionParams", () => {
  const params = buildCheckoutSessionParams(input);

  it("takes a one-off payment in the order's currency", () => {
    expect(params.mode).toBe("payment");
    expect(params.currency).toBe("gbp");
  });

  it("never offers the customer a converted price", () => {
    expect(params.adaptive_pricing).toEqual({ enabled: false });
  });

  it("charges exactly the order's lines, taken from the recorded order", () => {
    const lines = params.line_items ?? [];

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      quantity: 1,
      price_data: { currency: "gbp", unit_amount: 2999 },
    });
    expect(lines[1]).toMatchObject({ quantity: 2, price_data: { unit_amount: 999 } });
    const total = lines.reduce(
      (sum, line) => sum + (line.price_data?.unit_amount ?? 0) * (line.quantity ?? 0),
      0,
    );
    expect(total).toBe(draft.subtotalMinor);
  });

  it("names a product with its option only when there is a real option", () => {
    const names = (params.line_items ?? []).map((line) => line.price_data?.product_data?.name);

    expect(names).toEqual(["Cloud Comfort Dog Bed (Medium)", "Bouncy Ball"]);
  });

  it("shows only pictures Stripe can fetch", () => {
    const images = (params.line_items ?? []).map((line) => line.price_data?.product_data?.images);

    expect(images).toEqual([[], ["https://cdn.example.com/ball.jpg"]]);
  });

  it("offers one delivery option priced from the order, with the delivery promise", () => {
    const [option] = params.shipping_options ?? [];

    expect(params.shipping_options).toHaveLength(1);
    expect(option?.shipping_rate_data).toMatchObject({
      type: "fixed_amount",
      display_name: "Free delivery",
      fixed_amount: { amount: 0, currency: "gbp" },
      delivery_estimate: { maximum: { unit: "business_day", value: 5 } },
    });
  });

  it("labels a paid delivery charge plainly", () => {
    const paid = buildCheckoutSessionParams({
      ...input,
      draft: { ...draft, shippingMinor: 399, totalMinor: 5397 },
    });

    expect(paid.shipping_options?.[0]?.shipping_rate_data).toMatchObject({
      display_name: "Standard delivery",
      fixed_amount: { amount: 399 },
    });
  });

  it("collects the delivery address only for countries the store ships to", () => {
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ["GB"] });
    expect(params.phone_number_collection).toEqual({ enabled: true });
  });

  it("ties the payment back to the order and the store, on the session and on the payment", () => {
    const expected = {
      store_id: "00000000-0000-4000-8000-0000000000a0",
      store_slug: "pet-pilot",
      order_id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
      order_number: "PP-7K3M-9Q2X",
    };

    expect(params.client_reference_id).toBe(input.orderId);
    expect(params.metadata).toEqual(expected);
    expect(params.payment_intent_data?.metadata).toEqual(expected);
    expect(stripeMetadata(input)).toEqual(expected);
    expect(params.payment_intent_data?.description).toBe("Pilot Pets order PP-7K3M-9Q2X");
  });

  it("returns the customer to the site, and to the cart if they back out", () => {
    expect(params.success_url).toBe(
      "https://pilotpets.example.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(params.cancel_url).toBe("https://pilotpets.example.com/cart?checkout=cancelled");
  });

  it("lets the payment page expire a little after Stripe's 30 minute minimum", () => {
    expect(params.expires_at).toBe(input.nowSeconds + CHECKOUT_LIFETIME_SECONDS);
    expect(CHECKOUT_LIFETIME_SECONDS).toBeGreaterThan(30 * 60);
  });

  it("does not ask Stripe to work out tax: prices already include VAT", () => {
    expect(params).not.toHaveProperty("automatic_tax");
  });

  it("links the terms and returns policy beside the pay button", () => {
    expect(JSON.stringify(params.custom_text)).toContain("https://pilotpets.example.com/terms");
    expect(JSON.stringify(params.custom_text)).toContain("https://pilotpets.example.com/returns");
  });
});
