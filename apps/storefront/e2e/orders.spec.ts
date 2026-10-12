import { expect, test } from "@playwright/test";

// The order pages and the payment webhook, as far as they can be checked with the offline demo
// catalog (no database, no Stripe). The whole purchase, paid on Stripe's real test-mode page and
// settled by a replayed webhook, is checked by `pnpm check:live`.

test.describe("finding an order", () => {
  test("asks for the order number and the email it was placed with", async ({ page }) => {
    await page.goto("/orders/lookup");

    await expect(page.getByRole("heading", { level: 1, name: "Find your order" })).toBeVisible();
    await expect(page.getByLabel("Order number")).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
  });

  test("gives the same answer however the details are wrong, and keeps what was typed", async ({
    page,
  }) => {
    await page.goto("/orders/lookup");
    await page.waitForLoadState("networkidle");

    const attempts = [
      { order: "PP-7K3M-9Q2X", email: "nobody@example.com" },
      { order: "not an order number", email: "nobody@example.com" },
      { order: "PP-2222-3333", email: "someone-else@example.com" },
    ];
    const messages: string[] = [];
    for (const attempt of attempts) {
      await page.getByLabel("Order number").fill(attempt.order);
      await page.getByLabel("Email address").fill(attempt.email);
      await page.getByRole("button", { name: "Find my order" }).click();
      const alert = page.getByTestId("order-lookup-form").getByRole("alert");
      await expect(alert).toBeVisible();
      messages.push((await alert.textContent()) ?? "");
      await expect(page.getByLabel("Order number")).toHaveValue(attempt.order);
    }

    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toContain("couldn’t find an order with those details");
  });

  test("sends a visitor with no valid link to the lookup form, with the number filled in", async ({
    page,
  }) => {
    await page.goto("/orders/PP-7K3M-9Q2X");

    await expect(page).toHaveURL(/\/orders\/lookup\?order=PP-7K3M-9Q2X/);
    await expect(page.getByLabel("Order number")).toHaveValue("PP-7K3M-9Q2X");
  });

  test("does not accept a made-up token either", async ({ page }) => {
    await page.goto("/orders/PP-7K3M-9Q2X?t=eyJhbGciOiJIUzI1NiJ9.e30.forged");

    await expect(page).toHaveURL(/\/orders\/lookup/);
  });

  test("is kept out of search engines and out of shared caches", async ({ request }) => {
    for (const path of ["/orders/lookup", "/orders/PP-7K3M-9Q2X", "/checkout/success"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      const headers = response.headers();

      expect(headers["referrer-policy"], path).toBe("no-referrer");
      expect(headers["cache-control"], path).toContain("no-store");
    }

    const lookup = await (await request.get("/orders/lookup")).text();
    expect(lookup).toMatch(/<meta name="robots" content="noindex/);
  });

  test("has no page for a bare /orders or /checkout, or for extra path segments", async ({
    request,
  }) => {
    for (const path of ["/orders", "/checkout", "/orders/PP-7K3M-9Q2X/extra", "/checkout/other"]) {
      const response = await request.get(path, { maxRedirects: 0 });

      expect(response.status(), path).toBe(404);
    }
  });
});

test.describe("returning from payment", () => {
  test("explains politely when there is no order to show", async ({ page }) => {
    await page.goto("/checkout/success");

    await expect(page.getByRole("heading", { name: "We couldn’t find that order" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Find my order" })).toBeVisible();
  });

  test("treats an invented payment session the same way", async ({ page }) => {
    await page.goto("/checkout/success?session_id=cs_test_aaaaaaaaaaaaaaaaaaaaaaaa");

    await expect(page.getByRole("heading", { name: "We couldn’t find that order" })).toBeVisible();
  });

  test("does not leave anything in the address that could be mistaken for an order", async ({
    page,
  }) => {
    await page.goto("/checkout/success?session_id=<script>alert(1)</script>");

    await expect(page.getByRole("heading", { name: "We couldn’t find that order" })).toBeVisible();
    await expect(page.locator("#main script")).toHaveCount(0);
  });
});

test.describe("the payment webhook", () => {
  test("refuses a request that Stripe did not sign", async ({ request }) => {
    const response = await request.post("/api/stripe/webhook", {
      data: { id: "evt_fake", type: "checkout.session.completed" },
    });

    // 400 when it is configured and the signature is missing; 503 when this run has no keys
    expect([400, 503]).toContain(response.status());
  });

  test("refuses a request with a forged signature", async ({ request }) => {
    const response = await request.post("/api/stripe/webhook", {
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
      data: { id: "evt_fake", type: "checkout.session.completed" },
    });

    expect([400, 503]).toContain(response.status());
  });

  test("only answers to POST", async ({ request }) => {
    const response = await request.get("/api/stripe/webhook");

    expect(response.status()).toBe(405);
  });
});

test.describe("the email sweep", () => {
  test("only runs for the deployment's own jobs", async ({ request }) => {
    const anonymous = await request.post("/api/emails/send");
    const wrong = await request.post("/api/emails/send", {
      headers: { "x-revalidate-secret": "not-the-secret" },
    });

    expect(anonymous.status()).toBe(401);
    expect(wrong.status()).toBe(401);
  });

  test("answers for the demo catalog without touching a database", async ({ request }) => {
    const response = await request.post("/api/emails/send", {
      headers: { "x-revalidate-secret": "e2e-secret" },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ sent: 0, failed: 0, skipped: 0 });
  });

  test("only answers to POST", async ({ request }) => {
    expect((await request.get("/api/emails/send")).status()).toBe(405);
  });
});
