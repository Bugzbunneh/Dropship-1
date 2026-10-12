import "server-only";
import { catalogSource } from "../catalog";
import { mintOrderAccessToken } from "../orders/access";
import { orderStatusUrl } from "../orders/links";
import { findOrderById } from "../orders/repository";
import type { OrderDetails } from "../orders/types";
import { siteOrigin } from "../site";
import { getStripeContext } from "../stripe/client";
import { getStoreConfig } from "../store";
import { readSupabaseEnv } from "../supabase/env";
import { createServerClient } from "../supabase/server-client";
import { isUuid } from "../uuid";

// What the page a customer lands on after Stripe needs to know. The customer arrives with Stripe's
// checkout session id in the address. It is long, random, and known only to them and Stripe, so
// holding it is proof they just checked out: it is what lets them see their order without logging in.

export type ReturnedCheckout =
  | { kind: "not_found" }
  | {
      kind: "found";
      details: OrderDetails;
      // Stripe has the money, whether or not our webhook has caught up yet
      paymentReceived: boolean;
      // the customer left Stripe's page without finishing
      abandoned: boolean;
      statusUrl: string;
    };

const SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export const loadReturnedCheckout = async (rawSessionId: unknown): Promise<ReturnedCheckout> => {
  // the offline demo catalog has no database or payments, so there is nothing to find
  if (
    typeof rawSessionId !== "string" ||
    !SESSION_ID_PATTERN.test(rawSessionId) ||
    catalogSource() === "fixtures"
  ) {
    return { kind: "not_found" };
  }

  const [config, supabase, { stripe }] = await Promise.all([
    getStoreConfig(),
    Promise.resolve(readSupabaseEnv()),
    getStripeContext(),
  ]);

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(rawSessionId);
  } catch {
    return { kind: "not_found" };
  }

  // one Stripe account serves every store: only show checkouts that belong to this one
  const orderId = session.client_reference_id;
  if (session.metadata?.["store_id"] !== supabase.storeId || !isUuid(orderId)) {
    return { kind: "not_found" };
  }

  const client = await createServerClient(supabase);
  const details = await findOrderById(client, orderId);
  if (!details) {
    return { kind: "not_found" };
  }

  const token = await mintOrderAccessToken({
    orderId,
    storeId: supabase.storeId,
    signingKey: supabase.jwtSigningKey,
  });

  return {
    kind: "found",
    details,
    paymentReceived: session.payment_status === "paid",
    abandoned: session.status === "open" || session.status === "expired",
    statusUrl: orderStatusUrl(siteOrigin(config), details.order.number, token),
  };
};
