import {
  generateOrderNumber,
  MAX_CART_LINES,
  priceCheckout,
  type CheckoutLine,
  type CheckoutProblem,
  type OrderDraft,
  type PricingContext,
  type PurchasableVariant,
  type RandomBytes,
} from "@dropship/core";
import { isUuid } from "../uuid";
import { buildCheckoutSessionParams, type SessionStore } from "./session";
import type Stripe from "stripe";

// Starting a checkout: price the basket from scratch, record the order, and ask Stripe for the
// payment page. The steps are separate dependencies so the sequence (and what happens when a step
// fails) can be tested without Stripe or a database.

export type StartCheckoutConfig = {
  store: SessionStore;
  origin: string;
  orderPrefix: string;
  pricing: PricingContext;
  shippingCountries: string[];
  deliveryMaxWorkingDays: number;
};

export type CreateOrderResult =
  { ok: true; orderId: string } | { ok: false; reason: "number_taken" };

export type StartCheckoutDeps = {
  loadVariants: (variantIds: string[]) => Promise<PurchasableVariant[]>;
  createOrder: (draft: OrderDraft, number: string) => Promise<CreateOrderResult>;
  cancelOrder: (orderId: string) => Promise<void>;
  attachSession: (orderId: string, sessionId: string) => Promise<void>;
  createSession: (
    params: Stripe.Checkout.SessionCreateParams,
    idempotencyKey: string,
  ) => Promise<{ id: string; url: string | null }>;
  randomBytes: RandomBytes;
  nowSeconds: () => number;
  report: (message: string, error: unknown) => void;
};

export type StartCheckoutResult =
  | { ok: true; url: string; orderNumber: string }
  | { ok: false; reason: "invalid_request" }
  | { ok: false; reason: "cart_problems"; problems: CheckoutProblem[] }
  | { ok: false; reason: "payment_unavailable" };

const MAX_NUMBER_ATTEMPTS = 5;

// The browser's basket is untrusted input: check its shape before anything else.
export const parseCheckoutLines = (value: unknown): CheckoutLine[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CART_LINES) {
    return null;
  }
  const lines: CheckoutLine[] = [];
  for (const entry of value as unknown[]) {
    if (typeof entry !== "object" || entry === null) {
      return null;
    }
    const { variantId, quantity } = entry as Record<string, unknown>;
    if (!isUuid(variantId) || typeof quantity !== "number") {
      return null;
    }
    lines.push({ variantId, quantity });
  }
  return lines;
};

const createWithFreshNumber = async (
  deps: StartCheckoutDeps,
  config: StartCheckoutConfig,
  draft: OrderDraft,
): Promise<{ orderId: string; orderNumber: string } | undefined> => {
  for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt += 1) {
    const orderNumber = generateOrderNumber(config.orderPrefix, deps.randomBytes);
    const created = await deps.createOrder(draft, orderNumber);
    if (created.ok) {
      return { orderId: created.orderId, orderNumber };
    }
  }
  return undefined;
};

export const startCheckout = async (
  rawLines: unknown,
  config: StartCheckoutConfig,
  deps: StartCheckoutDeps,
): Promise<StartCheckoutResult> => {
  const lines = parseCheckoutLines(rawLines);
  if (!lines) {
    return { ok: false, reason: "invalid_request" };
  }

  const variants = await deps.loadVariants(lines.map((line) => line.variantId));
  const priced = priceCheckout(lines, variants, config.pricing);
  if (!priced.ok) {
    return { ok: false, reason: "cart_problems", problems: priced.problems };
  }

  const created = await createWithFreshNumber(deps, config, priced.order);
  if (!created) {
    deps.report("could not find a free order number", undefined);
    return { ok: false, reason: "payment_unavailable" };
  }

  const params = buildCheckoutSessionParams({
    orderId: created.orderId,
    orderNumber: created.orderNumber,
    draft: priced.order,
    store: config.store,
    origin: config.origin,
    shippingCountries: config.shippingCountries,
    deliveryMaxWorkingDays: config.deliveryMaxWorkingDays,
    nowSeconds: deps.nowSeconds(),
  });

  let session: { id: string; url: string | null };
  try {
    // The order id as the idempotency key: a retried request never creates a second payment page.
    session = await deps.createSession(params, `checkout-${created.orderId}`);
  } catch (error) {
    deps.report("Stripe would not create the payment page", error);
    await deps.cancelOrder(created.orderId).catch((cancelError: unknown) => {
      deps.report("could not cancel the order after Stripe failed", cancelError);
    });
    return { ok: false, reason: "payment_unavailable" };
  }

  if (!session.url) {
    deps.report("Stripe returned a payment page with no address", undefined);
    await deps.cancelOrder(created.orderId).catch(() => undefined);
    return { ok: false, reason: "payment_unavailable" };
  }

  // If recording the session fails the customer can still pay: the webhook binds the session to
  // the order when it arrives. So this is reported, not fatal.
  await deps.attachSession(created.orderId, session.id).catch((error: unknown) => {
    deps.report("could not record the checkout session on the order", error);
  });

  return { ok: true, url: session.url, orderNumber: created.orderNumber };
};
