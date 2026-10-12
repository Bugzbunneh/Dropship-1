import type Stripe from "stripe";
import type { CheckoutEventInput } from "../orders/repository";
import { NEEDS_ATTENTION_OUTCOMES, type CheckoutEventOutcome } from "../orders/types";
import { processStripeEvent } from "./webhook";

// What happens to a request on the webhook endpoint, with everything it touches passed in. The
// route supplies the real Stripe, database and email code; tests supply fakes (or the real thing
// against Stripe's test mode, see checkout.live.test.ts).
//
// Answers: 200 tells Stripe to stop retrying, 4xx says "this was never valid", 5xx says "try again
// later", which is right for anything that might work next time, such as the database being down.

export type WebhookHandlerDeps = {
  // checks Stripe's signature over the exact body and returns the event; throws if it is not valid
  verify: (body: string, signature: string) => Promise<Stripe.Event>;
  storeId: string;
  apply: (input: CheckoutEventInput) => Promise<CheckoutEventOutcome>;
  // runs after the response has gone out (Next.js `after`)
  afterResponse: (task: () => Promise<void>) => void;
  sendEmails: (orderId: string) => Promise<unknown>;
  log: (message: string, error?: unknown) => void;
};

const json = (body: Record<string, unknown>, status: number): Response =>
  Response.json(body, { status });

// Even on a replay, and after an order was already paid: if the first delivery was interrupted
// before its emails went out, a later one finishes the job. Emails are claimed before sending, so
// none is ever sent twice.
const OUTCOMES_THAT_MAY_OWE_EMAILS: readonly CheckoutEventOutcome[] = [
  "paid",
  "duplicate",
  "already_paid",
];

export const handleWebhookRequest = async (
  request: Request,
  deps: WebhookHandlerDeps,
): Promise<Response> => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "missing signature" }, 400);
  }

  // The signature covers the exact bytes Stripe sent, so read the body as text, untouched.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await deps.verify(body, signature);
  } catch {
    return json({ error: "invalid signature" }, 400);
  }

  try {
    const result = await processStripeEvent(event, { storeId: deps.storeId, apply: deps.apply });

    if (!result.handled) {
      return json({ received: true, handled: false, reason: result.reason }, 200);
    }

    if (NEEDS_ATTENTION_OUTCOMES.includes(result.outcome)) {
      // Money and order disagree. Logged loudly for now; Phase 4's exceptions inbox picks these up.
      deps.log(
        `NEEDS ATTENTION: event ${result.eventId} for order ${result.orderId}: ${result.outcome}`,
      );
    }

    if (OUTCOMES_THAT_MAY_OWE_EMAILS.includes(result.outcome)) {
      deps.afterResponse(async () => {
        await deps.sendEmails(result.orderId).catch((error: unknown) => {
          deps.log("could not send order emails", error);
        });
      });
    }

    return json({ received: true, handled: true, outcome: result.outcome }, 200);
  } catch (error) {
    deps.log(`could not process event ${event.id}`, error);
    return json({ error: "processing failed" }, 500);
  }
};
