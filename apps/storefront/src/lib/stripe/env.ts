// What the storefront needs to talk to Stripe, read from the environment. Server only.
//
// The names of the variables come from the store's config (stripe.secretKeyEnv and so on), so each
// store can point at its own keys. The keys themselves never appear in the repo.

export type StripeEnv = {
  secretKey: string;
  // unset until the webhook endpoint is registered (or `stripe listen` is running)
  webhookSecret: string | undefined;
  mode: "test" | "live";
};

export type StripeEnvNames = {
  secretKeyEnv: string;
  webhookSecretEnv: string;
};

type Environment = Record<string, string | undefined>;

const SECRET_KEY_PATTERN = /^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/;

const present = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const readStripeEnv = (names: StripeEnvNames, env: Environment = process.env): StripeEnv => {
  const secretKey = present(env[names.secretKeyEnv]);
  if (!secretKey) {
    throw new Error(`Stripe is not configured: ${names.secretKeyEnv} is not set`);
  }
  const match = SECRET_KEY_PATTERN.exec(secretKey);
  if (!match) {
    throw new Error(
      `Stripe is not configured: ${names.secretKeyEnv} is not a Stripe secret key (sk_test_..., sk_live_...)`,
    );
  }

  return {
    secretKey,
    webhookSecret: present(env[names.webhookSecretEnv]),
    mode: match[2] === "live" ? "live" : "test",
  };
};

// The webhook route cannot work, and must not pretend to, without its signing secret.
export const requireWebhookSecret = (stripe: StripeEnv, names: StripeEnvNames): string => {
  if (!stripe.webhookSecret) {
    throw new Error(`Stripe webhooks are not configured: ${names.webhookSecretEnv} is not set`);
  }
  return stripe.webhookSecret;
};
