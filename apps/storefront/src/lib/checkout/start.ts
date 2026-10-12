import "server-only";
import { orderPrefixForSlug } from "@dropship/core";
import { randomBytes } from "node:crypto";
import { catalogSource } from "../catalog";
import { loadPurchasableVariants } from "../catalog/purchasable";
import {
  attachCheckoutSession,
  cancelPendingOrder,
  createPendingOrder,
  OrderNumberTakenError,
} from "../orders/repository";
import { siteOrigin } from "../site";
import { createStripeClient } from "../stripe/client";
import {
  startCheckout,
  type StartCheckoutDeps,
  type StartCheckoutResult,
} from "../stripe/checkout";
import { readStripeEnv } from "../stripe/env";
import { getStoreConfig } from "../store";
import { readSupabaseEnv } from "../supabase/env";
import { createServerClient } from "../supabase/server-client";

export type StoreCheckoutResult =
  | StartCheckoutResult
  // the offline demo catalog has no database to record orders in
  | { ok: false; reason: "demo_mode" };

const report = (message: string, error: unknown): void => {
  console.error(`[checkout] ${message}`, error ?? "");
};

// Starts a checkout for this deployment's store with the real database and the real Stripe.
export const startStoreCheckout = async (rawLines: unknown): Promise<StoreCheckoutResult> => {
  if (catalogSource() === "fixtures") {
    return { ok: false, reason: "demo_mode" };
  }

  const config = await getStoreConfig();
  const supabase = readSupabaseEnv();
  const stripeEnv = readStripeEnv(config.stripe);
  const stripe = createStripeClient(stripeEnv.secretKey);
  const client = await createServerClient(supabase);

  const deps: StartCheckoutDeps = {
    loadVariants: loadPurchasableVariants,
    createOrder: async (draft, number) => {
      try {
        return { ok: true, orderId: await createPendingOrder(client, draft, number) };
      } catch (error) {
        if (error instanceof OrderNumberTakenError) {
          return { ok: false, reason: "number_taken" };
        }
        throw error;
      }
    },
    cancelOrder: (orderId) => cancelPendingOrder(client, orderId),
    attachSession: (orderId, sessionId) => attachCheckoutSession(client, orderId, sessionId),
    createSession: async (params, idempotencyKey) => {
      const session = await stripe.checkout.sessions.create(params, { idempotencyKey });
      return { id: session.id, url: session.url };
    },
    randomBytes: (length) => new Uint8Array(randomBytes(length)),
    nowSeconds: () => Math.floor(Date.now() / 1000),
    report,
  };

  return startCheckout(
    rawLines,
    {
      store: { id: supabase.storeId, slug: config.slug, name: config.name },
      origin: siteOrigin(config),
      orderPrefix: orderPrefixForSlug(config.slug),
      pricing: {
        currency: config.currency,
        shipping: config.shipping,
        vat: { registered: config.tax.vatRegistered, rateBps: config.tax.vatRateBps },
      },
      shippingCountries: config.shippingCountries,
      deliveryMaxWorkingDays: config.policies.deliveryMaxWorkingDays,
    },
    deps,
  );
};
