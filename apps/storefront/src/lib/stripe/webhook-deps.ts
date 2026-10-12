import "server-only";
import { sendOrderEmails } from "../emails/send";
import { applyCheckoutEvent } from "../orders/repository";
import { getStoreConfig } from "../store";
import { readSupabaseEnv } from "../supabase/env";
import { createServerClient } from "../supabase/server-client";
import { getStripeContext } from "./client";
import { requireWebhookSecret } from "./env";
import type { WebhookHandlerDeps } from "./webhook-handler";

const log = (message: string, error?: unknown): void => {
  console.error(`[stripe webhook] ${message}`, error ?? "");
};

// The real Stripe, database and email code for this deployment's store. Throws if Stripe or its
// webhook secret is not configured, which the route turns into a 503 (so Stripe retries later
// instead of the event being lost).
export const createWebhookDeps = async (
  afterResponse: WebhookHandlerDeps["afterResponse"],
): Promise<WebhookHandlerDeps> => {
  const config = await getStoreConfig();
  const { stripe, env } = await getStripeContext();
  const secret = requireWebhookSecret(env, config.stripe);
  const supabase = readSupabaseEnv();
  const client = await createServerClient(supabase);

  return {
    verify: (body, signature) => stripe.webhooks.constructEventAsync(body, signature, secret),
    storeId: supabase.storeId,
    apply: (input) => applyCheckoutEvent(client, input),
    afterResponse,
    sendEmails: (orderId) => sendOrderEmails(orderId),
    log,
  };
};
