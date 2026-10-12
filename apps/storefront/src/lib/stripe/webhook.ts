import type Stripe from "stripe";
import { parseShippingAddress } from "../orders/mappers";
import type { CheckoutEventInput } from "../orders/repository";
import type { CheckoutEventOutcome } from "../orders/types";
import { isUuid } from "../uuid";

// Turns a verified Stripe event into a change to an order. The signature has already been checked
// by the route; this decides whether the event is ours and what to tell the database.

// The events that move an order. Everything else Stripe sends is acknowledged and ignored.
export const HANDLED_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
] as const;

const isHandledType = (type: string): boolean =>
  (HANDLED_EVENT_TYPES as readonly string[]).includes(type);

export type WebhookResult =
  | { handled: false; reason: "unrelated_event" | "other_store" | "no_order" }
  | { handled: true; outcome: CheckoutEventOutcome; orderId: string; eventId: string };

export type WebhookDeps = {
  // this deployment's store, so one Stripe account can serve several stores
  storeId: string;
  apply: (input: CheckoutEventInput) => Promise<CheckoutEventOutcome>;
};

const paymentIntentId = (session: Stripe.Checkout.Session): string => {
  const intent = session.payment_intent;
  if (typeof intent === "string") {
    return intent;
  }
  return intent?.id ?? "";
};

const shippingFrom = (session: Stripe.Checkout.Session) => {
  const details = session.collected_information?.shipping_details;
  if (!details) {
    return null;
  }
  const address = details.address;
  return parseShippingAddress({
    name: details.name,
    line1: address?.line1,
    line2: address?.line2,
    city: address?.city,
    county: address?.state,
    postcode: address?.postal_code,
    country: address?.country,
  });
};

export const checkoutEventInput = (
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  orderId: string,
): CheckoutEventInput => ({
  eventId: event.id,
  eventType: event.type,
  orderId,
  sessionId: session.id,
  paymentIntentId: paymentIntentId(session),
  paymentStatus: session.payment_status,
  amountTotal: session.amount_total ?? 0,
  currency: session.currency ?? "",
  customer: {
    email: session.customer_details?.email ?? session.customer_email ?? null,
    name: session.customer_details?.name ?? null,
    phone: session.customer_details?.phone ?? null,
    shipping: shippingFrom(session),
  },
});

export const processStripeEvent = async (
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookResult> => {
  if (!isHandledType(event.type)) {
    return { handled: false, reason: "unrelated_event" };
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // The same Stripe account can serve several stores, and every store's webhook endpoint hears
  // every event. Ours are the ones tagged with our store.
  if (session.metadata?.["store_id"] !== deps.storeId) {
    return { handled: false, reason: "other_store" };
  }

  const orderId = session.client_reference_id;
  if (!isUuid(orderId)) {
    return { handled: false, reason: "no_order" };
  }

  const outcome = await deps.apply(checkoutEventInput(event, session, orderId));
  return { handled: true, outcome, orderId, eventId: event.id };
};
