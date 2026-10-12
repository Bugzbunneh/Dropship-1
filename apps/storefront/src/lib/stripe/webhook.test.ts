import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutEventInput } from "../orders/repository";
import type { CheckoutEventOutcome } from "../orders/types";
import { checkoutEventInput, processStripeEvent } from "./webhook";

const storeId = "00000000-0000-4000-8000-0000000000a0";
const orderId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";

const sessionObject = (overrides: Record<string, unknown> = {}): Stripe.Checkout.Session =>
  ({
    id: "cs_test_123",
    object: "checkout.session",
    client_reference_id: orderId,
    metadata: { store_id: storeId, store_slug: "pet-pilot", order_id: orderId },
    payment_status: "paid",
    amount_total: 3398,
    currency: "gbp",
    payment_intent: "pi_123",
    customer_details: { email: "Alex@Example.com", name: "Alex Example", phone: "07700 900123" },
    collected_information: {
      shipping_details: {
        name: "Alex Example",
        address: {
          line1: "1 Dog Lane",
          line2: null,
          city: "Leeds",
          state: "West Yorkshire",
          postal_code: "LS1 1AA",
          country: "GB",
        },
      },
    },
    ...overrides,
  }) as unknown as Stripe.Checkout.Session;

const eventOf = (type: string, session: Stripe.Checkout.Session, id = "evt_1"): Stripe.Event =>
  ({ id, type, data: { object: session } }) as unknown as Stripe.Event;

const dependencies = (outcome: CheckoutEventOutcome = "paid") => {
  const apply = vi.fn<(input: CheckoutEventInput) => Promise<CheckoutEventOutcome>>(
    async () => outcome,
  );
  return { apply, deps: { storeId, apply } };
};

describe("checkoutEventInput", () => {
  it("carries what the database needs, with the address in our shape", () => {
    const event = eventOf("checkout.session.completed", sessionObject());

    const input = checkoutEventInput(event, sessionObject(), orderId);

    expect(input).toEqual({
      eventId: "evt_1",
      eventType: "checkout.session.completed",
      orderId,
      sessionId: "cs_test_123",
      paymentIntentId: "pi_123",
      paymentStatus: "paid",
      amountTotal: 3398,
      currency: "gbp",
      customer: {
        email: "Alex@Example.com",
        name: "Alex Example",
        phone: "07700 900123",
        shipping: {
          name: "Alex Example",
          line1: "1 Dog Lane",
          city: "Leeds",
          county: "West Yorkshire",
          postcode: "LS1 1AA",
          country: "GB",
        },
      },
    });
  });

  it("copes with an expanded payment intent and a missing address", () => {
    const session = sessionObject({
      payment_intent: { id: "pi_expanded" },
      collected_information: null,
    });

    const input = checkoutEventInput(
      eventOf("checkout.session.completed", session),
      session,
      orderId,
    );

    expect(input.paymentIntentId).toBe("pi_expanded");
    expect(input.customer.shipping).toBeNull();
  });

  it("falls back to the email given up front when Stripe has no customer details", () => {
    const session = sessionObject({ customer_details: null, customer_email: "early@example.com" });

    const input = checkoutEventInput(
      eventOf("checkout.session.completed", session),
      session,
      orderId,
    );

    expect(input.customer.email).toBe("early@example.com");
  });
});

describe("processStripeEvent", () => {
  it.each([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.expired",
  ])("applies %s to its order", async (type) => {
    const { apply, deps } = dependencies("paid");

    const result = await processStripeEvent(eventOf(type, sessionObject()), deps);

    expect(result).toEqual({ handled: true, outcome: "paid", orderId, eventId: "evt_1" });
    expect(apply).toHaveBeenCalledOnce();
  });

  it("passes the database's verdict back, whatever it is", async () => {
    const { deps } = dependencies("duplicate");

    const result = await processStripeEvent(
      eventOf("checkout.session.completed", sessionObject()),
      deps,
    );

    expect(result).toMatchObject({ handled: true, outcome: "duplicate" });
  });

  it("acknowledges and ignores events that do not move an order", async () => {
    const { apply, deps } = dependencies();

    for (const type of [
      "charge.succeeded",
      "payment_intent.created",
      "checkout.session.async_payment_failed",
    ]) {
      const result = await processStripeEvent(eventOf(type, sessionObject()), deps);

      expect(result).toEqual({ handled: false, reason: "unrelated_event" });
    }
    expect(apply).not.toHaveBeenCalled();
  });

  it("leaves another store's checkouts alone", async () => {
    const { apply, deps } = dependencies();
    const session = sessionObject({
      metadata: { store_id: "00000000-0000-4000-8000-0000000000b0", store_slug: "other-store" },
    });

    const result = await processStripeEvent(eventOf("checkout.session.completed", session), deps);

    expect(result).toEqual({ handled: false, reason: "other_store" });
    expect(apply).not.toHaveBeenCalled();
  });

  it("leaves checkouts that carry no store tag alone", async () => {
    const { apply, deps } = dependencies();

    const result = await processStripeEvent(
      eventOf("checkout.session.completed", sessionObject({ metadata: null })),
      deps,
    );

    expect(result).toEqual({ handled: false, reason: "other_store" });
    expect(apply).not.toHaveBeenCalled();
  });

  it("ignores a tagged session whose reference is not an order id", async () => {
    const { apply, deps } = dependencies();

    const result = await processStripeEvent(
      eventOf("checkout.session.completed", sessionObject({ client_reference_id: "not-a-uuid" })),
      deps,
    );

    expect(result).toEqual({ handled: false, reason: "no_order" });
    expect(apply).not.toHaveBeenCalled();
  });

  it("lets a database failure through, so the route can answer 500 and Stripe retries", async () => {
    const failing = {
      storeId,
      apply: async (): Promise<CheckoutEventOutcome> => {
        throw new Error("database is down");
      },
    };

    const attempt = processStripeEvent(
      eventOf("checkout.session.completed", sessionObject()),
      failing,
    );

    await expect(attempt).rejects.toThrow("database is down");
  });
});
