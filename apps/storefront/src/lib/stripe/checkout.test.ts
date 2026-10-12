import type { PurchasableVariant } from "@dropship/core";
import { describe, expect, it, vi } from "vitest";
import {
  parseCheckoutLines,
  startCheckout,
  type CreateOrderResult,
  type StartCheckoutConfig,
  type StartCheckoutDeps,
} from "./checkout";

const variantId = "11111111-2222-4333-8444-555555555555";

const config: StartCheckoutConfig = {
  store: { id: "00000000-0000-4000-8000-0000000000a0", slug: "pet-pilot", name: "Pilot Pets" },
  origin: "https://pilotpets.example.com",
  orderPrefix: "PP",
  pricing: {
    currency: "GBP",
    shipping: { flatRateMinor: 399, freeThresholdMinor: 3500 },
    vat: { registered: false, rateBps: 2000 },
  },
  shippingCountries: ["GB"],
  deliveryMaxWorkingDays: 5,
};

const variant: PurchasableVariant = {
  variantId,
  sku: "DOG-BED-M",
  productTitle: "Cloud Comfort Dog Bed",
  variantTitle: "Medium",
  currency: "GBP",
  priceMinor: 2999,
  isAvailable: true,
  imagePath: null,
};

// Every dependency is a mock by default; a test replaces the ones it wants to behave differently.
const setup = (overrides: Partial<StartCheckoutDeps> = {}) => {
  const mocks = {
    loadVariants: vi.fn(async () => [variant]),
    createOrder: vi.fn(async (): Promise<CreateOrderResult> => ({ ok: true, orderId: "order-1" })),
    cancelOrder: vi.fn(async () => undefined),
    attachSession: vi.fn(async () => undefined),
    createSession: vi.fn(async () => ({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    })),
    randomBytes: (length: number) => new Uint8Array(length).fill(3),
    nowSeconds: () => 1_800_000_000,
    report: vi.fn(),
  };
  // The overrides are mocks too, so the inspection helpers below stay valid.
  return { ...mocks, ...overrides } as unknown as typeof mocks;
};

describe("parseCheckoutLines", () => {
  it("accepts a well-formed basket", () => {
    expect(parseCheckoutLines([{ variantId, quantity: 2 }])).toEqual([{ variantId, quantity: 2 }]);
  });

  it.each([
    ["not an array", { variantId, quantity: 1 }],
    ["empty", []],
    ["a line that is not an object", ["nope"]],
    ["a variant that is not a UUID", [{ variantId: "fx-var-PP-RDL", quantity: 1 }]],
    ["a quantity that is not a number", [{ variantId, quantity: "2" }]],
    ["null", null],
  ])("rejects %s", (_name, value) => {
    expect(parseCheckoutLines(value)).toBeNull();
  });

  it("rejects an oversized basket", () => {
    const many = Array.from({ length: 41 }, () => ({ variantId, quantity: 1 }));

    expect(parseCheckoutLines(many)).toBeNull();
  });
});

describe("startCheckout", () => {
  it("records the order, opens the payment page and links the two", async () => {
    const deps = setup();

    const result = await startCheckout([{ variantId, quantity: 1 }], config, deps);

    expect(result).toMatchObject({
      ok: true,
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
    expect(deps.createOrder).toHaveBeenCalledOnce();
    const [draft, number] = deps.createOrder.mock.calls[0] as unknown as [
      { totalMinor: number; shippingMinor: number },
      string,
    ];
    expect(draft).toMatchObject({ totalMinor: 3398, shippingMinor: 399 });
    expect(number).toMatch(/^PP-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    expect(deps.attachSession).toHaveBeenCalledWith("order-1", "cs_test_1");
    expect(deps.cancelOrder).not.toHaveBeenCalled();
  });

  it("asks Stripe for exactly the recorded order, with the order as the idempotency key", async () => {
    const deps = setup();

    await startCheckout([{ variantId, quantity: 1 }], config, deps);

    const [params, key] = deps.createSession.mock.calls[0] as unknown as [
      { client_reference_id: string; metadata: Record<string, string> },
      string,
    ];
    expect(params.client_reference_id).toBe("order-1");
    expect(params.metadata["store_slug"]).toBe("pet-pilot");
    expect(key).toBe("checkout-order-1");
  });

  it("prices from the database, ignoring anything else the browser might claim", async () => {
    const deps = setup({
      loadVariants: vi.fn(async () => [{ ...variant, priceMinor: 5000 }]),
    });

    await startCheckout([{ variantId, quantity: 1 }], config, deps);

    const [draft] = deps.createOrder.mock.calls[0] as unknown as [{ subtotalMinor: number }];
    expect(draft.subtotalMinor).toBe(5000);
  });

  it("refuses a malformed request without touching the database or Stripe", async () => {
    const deps = setup();

    const result = await startCheckout("nonsense", config, deps);

    expect(result).toEqual({ ok: false, reason: "invalid_request" });
    expect(deps.loadVariants).not.toHaveBeenCalled();
    expect(deps.createOrder).not.toHaveBeenCalled();
  });

  it("names the lines that cannot be bought, and creates nothing", async () => {
    const deps = setup({ loadVariants: vi.fn(async () => [{ ...variant, isAvailable: false }]) });

    const result = await startCheckout([{ variantId, quantity: 1 }], config, deps);

    expect(result).toEqual({
      ok: false,
      reason: "cart_problems",
      problems: [{ reason: "unavailable", variantId }],
    });
    expect(deps.createOrder).not.toHaveBeenCalled();
    expect(deps.createSession).not.toHaveBeenCalled();
  });

  it("tries another order number if the first is taken", async () => {
    const createOrder = vi
      .fn<StartCheckoutDeps["createOrder"]>()
      .mockResolvedValueOnce({ ok: false, reason: "number_taken" })
      .mockResolvedValueOnce({ ok: true, orderId: "order-2" });
    const deps = setup({ createOrder });

    const result = await startCheckout([{ variantId, quantity: 1 }], config, deps);

    expect(result.ok).toBe(true);
    expect(createOrder).toHaveBeenCalledTimes(2);
  });

  it("gives up cleanly if no order number is ever free", async () => {
    const createOrder = vi.fn(async (): Promise<CreateOrderResult> => ({
      ok: false,
      reason: "number_taken",
    }));
    const deps = setup({ createOrder });

    const result = await startCheckout([{ variantId, quantity: 1 }], config, deps);

    expect(result).toEqual({ ok: false, reason: "payment_unavailable" });
    expect(deps.createSession).not.toHaveBeenCalled();
  });

  it("cancels the order when Stripe refuses, so nothing is left waiting for payment", async () => {
    const deps = setup({
      createSession: vi.fn(async () => {
        throw new Error("Stripe is down");
      }),
    });

    const result = await startCheckout([{ variantId, quantity: 1 }], config, deps);

    expect(result).toEqual({ ok: false, reason: "payment_unavailable" });
    expect(deps.cancelOrder).toHaveBeenCalledWith("order-1");
    expect(deps.attachSession).not.toHaveBeenCalled();
    expect(deps.report).toHaveBeenCalled();
  });

  it("treats a payment page with no address as a failure", async () => {
    const deps = setup({ createSession: vi.fn(async () => ({ id: "cs_test_1", url: null })) });

    const result = await startCheckout([{ variantId, quantity: 1 }], config, deps);

    expect(result).toEqual({ ok: false, reason: "payment_unavailable" });
    expect(deps.cancelOrder).toHaveBeenCalledWith("order-1");
  });

  it("still sends the customer to pay if recording the session fails afterwards", async () => {
    const deps = setup({
      attachSession: vi.fn(async () => {
        throw new Error("database blip");
      }),
    });

    const result = await startCheckout([{ variantId, quantity: 1 }], config, deps);

    expect(result.ok).toBe(true);
    expect(deps.cancelOrder).not.toHaveBeenCalled();
    expect(deps.report).toHaveBeenCalled();
  });

  it("survives a failure while cancelling after a Stripe failure", async () => {
    const deps = setup({
      createSession: vi.fn(async () => {
        throw new Error("Stripe is down");
      }),
      cancelOrder: vi.fn(async () => {
        throw new Error("database is down too");
      }),
    });

    const result = await startCheckout([{ variantId, quantity: 1 }], config, deps);

    expect(result).toEqual({ ok: false, reason: "payment_unavailable" });
  });
});
