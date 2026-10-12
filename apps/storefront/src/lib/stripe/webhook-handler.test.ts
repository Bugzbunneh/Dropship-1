import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutEventOutcome } from "../orders/types";
import { handleWebhookRequest, type WebhookHandlerDeps } from "./webhook-handler";

const storeId = "00000000-0000-4000-8000-0000000000a0";
const orderId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";

const checkoutEvent = (type = "checkout.session.completed"): Stripe.Event =>
  ({
    id: "evt_1",
    type,
    data: {
      object: {
        id: "cs_test_1",
        client_reference_id: orderId,
        metadata: { store_id: storeId },
        payment_status: "paid",
        amount_total: 3398,
        currency: "gbp",
        payment_intent: "pi_1",
        customer_details: { email: "alex@example.com", name: "Alex", phone: null },
        collected_information: null,
      },
    },
  }) as unknown as Stripe.Event;

const request = (signature: string | null = "t=1,v1=abc", body = "{}"): Request =>
  new Request("https://shop.example.com/api/stripe/webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  });

const setup = (outcome: CheckoutEventOutcome = "paid", event: Stripe.Event = checkoutEvent()) => {
  const mocks = {
    verify: vi.fn(async () => event),
    apply: vi.fn(async () => outcome),
    sendEmails: vi.fn(async () => undefined),
    log: vi.fn(),
  };
  const scheduled: (() => Promise<void>)[] = [];
  const deps: WebhookHandlerDeps = {
    ...mocks,
    storeId,
    afterResponse: (task) => scheduled.push(task),
  };
  return { deps, mocks, scheduled };
};

const bodyOf = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("handleWebhookRequest", () => {
  it("applies a valid event and says what happened", async () => {
    const { deps, mocks } = setup("paid");

    const response = await handleWebhookRequest(request(), deps);

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ received: true, handled: true, outcome: "paid" });
    expect(mocks.apply).toHaveBeenCalledOnce();
  });

  it("checks the signature against the exact body it was sent", async () => {
    const { deps, mocks } = setup();

    await handleWebhookRequest(request("t=1,v1=abc", '{"exact": "bytes"}'), deps);

    expect(mocks.verify).toHaveBeenCalledWith('{"exact": "bytes"}', "t=1,v1=abc");
  });

  it("refuses a request with no signature, touching nothing", async () => {
    const { deps, mocks } = setup();

    const response = await handleWebhookRequest(request(null), deps);

    expect(response.status).toBe(400);
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("refuses a bad signature, touching nothing", async () => {
    const { deps, mocks } = setup();
    mocks.verify.mockRejectedValueOnce(new Error("No signatures found matching"));

    const response = await handleWebhookRequest(request(), deps);

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: "invalid signature" });
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("acknowledges events that are not ours or not about orders, without applying them", async () => {
    const { deps, mocks } = setup("paid", checkoutEvent("charge.succeeded"));

    const response = await handleWebhookRequest(request(), deps);

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toMatchObject({ handled: false, reason: "unrelated_event" });
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("answers 500 when applying the event fails, so Stripe tries again", async () => {
    const { deps, mocks } = setup();
    mocks.apply.mockRejectedValueOnce(new Error("database is down"));

    const response = await handleWebhookRequest(request(), deps);

    expect(response.status).toBe(500);
    expect(mocks.log).toHaveBeenCalledWith(expect.stringContaining("evt_1"), expect.any(Error));
  });

  describe("sending emails", () => {
    it.each(["paid", "duplicate", "already_paid"] as const)(
      "schedules them after a %s outcome, so an interrupted first delivery is finished",
      async (outcome) => {
        const { deps, mocks, scheduled } = setup(outcome);

        await handleWebhookRequest(request(), deps);
        expect(mocks.sendEmails).not.toHaveBeenCalled();
        await scheduled[0]?.();

        expect(scheduled).toHaveLength(1);
        expect(mocks.sendEmails).toHaveBeenCalledWith(orderId);
      },
    );

    it.each(["cancelled", "awaiting_payment", "ignored", "unknown_order"] as const)(
      "does not schedule them after a %s outcome",
      async (outcome) => {
        const { deps, scheduled } = setup(outcome);

        await handleWebhookRequest(request(), deps);

        expect(scheduled).toHaveLength(0);
      },
    );

    it("never lets a failure to send undo or hide the payment", async () => {
      const { deps, mocks, scheduled } = setup("paid");
      mocks.sendEmails.mockRejectedValueOnce(new Error("mail provider is down"));

      const response = await handleWebhookRequest(request(), deps);
      await expect(scheduled[0]?.()).resolves.toBeUndefined();

      expect(response.status).toBe(200);
      expect(mocks.log).toHaveBeenCalledWith("could not send order emails", expect.any(Error));
    });
  });

  describe("when money and order disagree", () => {
    it.each([
      "amount_mismatch",
      "session_mismatch",
      "payment_after_cancel",
      "unknown_order",
    ] as const)(
      "logs %s loudly but still answers 200, because retrying cannot fix it",
      async (outcome) => {
        const { deps, mocks } = setup(outcome);

        const response = await handleWebhookRequest(request(), deps);

        expect(response.status).toBe(200);
        expect(mocks.log).toHaveBeenCalledWith(expect.stringContaining("NEEDS ATTENTION"));
      },
    );

    it("does not raise the alarm for ordinary outcomes", async () => {
      const { deps, mocks } = setup("paid");

      await handleWebhookRequest(request(), deps);

      expect(mocks.log).not.toHaveBeenCalled();
    });
  });
});
