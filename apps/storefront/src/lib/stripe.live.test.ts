import { describe, expect, it } from "vitest";

// Confirms the Stripe keys are test-mode keys and that Stripe accepts the secret key. Read-only:
// it asks for the balance and creates nothing. Run with `pnpm check:live`.

const secretKey = process.env["STRIPE_SECRET_KEY"] ?? "";
const publishableKey = process.env["STRIPE_PUBLISHABLE_KEY"] ?? "";

describe("Stripe test-mode keys", () => {
  it("are test keys, never live ones", () => {
    expect(secretKey.startsWith("sk_test_")).toBe(true);
    expect(publishableKey.startsWith("pk_test_")).toBe(true);
  });

  it("have the right shape and no stray text", () => {
    expect(secretKey).toMatch(/^sk_test_[A-Za-z0-9]+$/);
    expect(publishableKey).toMatch(/^pk_test_[A-Za-z0-9]+$/);
  });

  it("are accepted by Stripe, and the account answers in test mode", async () => {
    const response = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const body = (await response.json()) as { livemode?: boolean; error?: { type?: string } };

    expect(response.status, `Stripe said: ${body.error?.type ?? "ok"}`).toBe(200);
    expect(body.livemode).toBe(false);
  });
});
