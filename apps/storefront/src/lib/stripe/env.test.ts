import { describe, expect, it } from "vitest";
import { readStripeEnv, requireWebhookSecret } from "./env";

const names = { secretKeyEnv: "STRIPE_SECRET_KEY", webhookSecretEnv: "STRIPE_WEBHOOK_SECRET" };
const testKey = "sk_test_abcdefghijklmnopqrstuvwxyz";

describe("readStripeEnv", () => {
  it("reads a test key and says it is test mode", () => {
    const env = readStripeEnv(names, { STRIPE_SECRET_KEY: testKey });

    expect(env).toEqual({ secretKey: testKey, webhookSecret: undefined, mode: "test" });
  });

  it("recognises live keys and restricted keys", () => {
    expect(readStripeEnv(names, { STRIPE_SECRET_KEY: "sk_live_abcdefghijklmnop" }).mode).toBe(
      "live",
    );
    expect(readStripeEnv(names, { STRIPE_SECRET_KEY: "rk_test_abcdefghijklmnop" }).mode).toBe(
      "test",
    );
  });

  it("reads the webhook secret when there is one", () => {
    const env = readStripeEnv(names, {
      STRIPE_SECRET_KEY: testKey,
      STRIPE_WEBHOOK_SECRET: " whsec_abc ",
    });

    expect(env.webhookSecret).toBe("whsec_abc");
  });

  it("uses the variable names the store's config gives", () => {
    const env = readStripeEnv(
      { secretKeyEnv: "SHOP_TWO_STRIPE_KEY", webhookSecretEnv: "SHOP_TWO_WEBHOOK" },
      { SHOP_TWO_STRIPE_KEY: testKey, STRIPE_SECRET_KEY: "sk_live_wrongstorekey123" },
    );

    expect(env.mode).toBe("test");
  });

  it("names the missing variable", () => {
    expect(() => readStripeEnv(names, {})).toThrow("STRIPE_SECRET_KEY is not set");
    expect(() => readStripeEnv(names, { STRIPE_SECRET_KEY: "   " })).toThrow("is not set");
  });

  it("refuses something that is not a secret key, without echoing it", () => {
    const attempt = () => readStripeEnv(names, { STRIPE_SECRET_KEY: "pk_test_publishablekey1234" });

    expect(attempt).toThrow("not a Stripe secret key");
    expect(attempt).not.toThrow(/pk_test_publishablekey1234/);
  });
});

describe("requireWebhookSecret", () => {
  it("returns the secret", () => {
    const env = readStripeEnv(names, {
      STRIPE_SECRET_KEY: testKey,
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    });

    expect(requireWebhookSecret(env, names)).toBe("whsec_x");
  });

  it("fails loudly when the endpoint has no secret to check signatures with", () => {
    const env = readStripeEnv(names, { STRIPE_SECRET_KEY: testKey });

    expect(() => requireWebhookSecret(env, names)).toThrow("STRIPE_WEBHOOK_SECRET is not set");
  });
});
