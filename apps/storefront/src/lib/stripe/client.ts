import "server-only";
import { getStoreConfig } from "@/lib/store";
import Stripe from "stripe";
import { readStripeEnv, type StripeEnv } from "./env";

export type StripeContext = {
  stripe: Stripe;
  env: StripeEnv;
};

// A Stripe client for this store's keys. The SDK pins the API version it was written against, so
// responses do not change shape underneath us; upgrading is a deliberate package update.
export const createStripeClient = (secretKey: string): Stripe =>
  new Stripe(secretKey, {
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: "dropship-storefront" },
  });

export const getStripeContext = async (): Promise<StripeContext> => {
  const config = await getStoreConfig();
  const env = readStripeEnv(config.stripe);
  return { stripe: createStripeClient(env.secretKey), env };
};
