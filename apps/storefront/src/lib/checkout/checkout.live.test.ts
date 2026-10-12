import { createLinkedProjectClient } from "@dropship/db/testing";
import { loadActiveStoreConfig } from "@dropship/stores";
import { chromium, type Browser, type Page } from "@playwright/test";
import type Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildOrderEmailContext } from "@/lib/emails/context";
import { renderOrderEmail } from "@/lib/emails/templates";
import { emailsMatch, mintOrderAccessToken } from "@/lib/orders/access";
import { findOrderById, findOrderByNumber } from "@/lib/orders/repository";
import { loadOrderForVisitor } from "@/lib/orders/view";
import { createStripeClient } from "@/lib/stripe/client";
import { readStripeEnv } from "@/lib/stripe/env";
import { createWebhookDeps } from "@/lib/stripe/webhook-deps";
import { handleWebhookRequest } from "@/lib/stripe/webhook-handler";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createServerClient } from "@/lib/supabase/server-client";
import { createStoreClient } from "@/lib/supabase/store-client";
import { loadReturnedCheckout } from "./return";
import { startStoreCheckout } from "./start";

// The whole purchase, against the real services: the hosted Supabase project and Stripe's test
// mode. A real order is recorded, paid with a test card on Stripe's own payment page, and the real
// event Stripe produces is delivered to our webhook handler, twice. Run with `pnpm check:live`.
//
// It leaves nothing behind: the orders it creates are deleted at the end and unpaid checkouts are
// expired. Stripe's test-mode records of the payments stay, as they always do.
//
// Needs the demo catalog in the project (`pnpm store:seed pet-pilot`), Stripe test keys, and a
// browser (`pnpm --filter @dropship/storefront exec playwright install chromium`).

const config = await loadActiveStoreConfig();
const supabase = readSupabaseEnv();
const stripeEnv = readStripeEnv(config.stripe);
const stripe = createStripeClient(stripeEnv.secretKey);
const webhookSecret = stripeEnv.webhookSecret;
const database = createLinkedProjectClient();

const CHECKOUT_RETURN = /\/checkout\/success/;
const created = { orderIds: [] as string[], eventIds: [] as string[], sessionIds: [] as string[] };

type Purchase = {
  orderId: string;
  orderNumber: string;
  session: Stripe.Checkout.Session;
  expectedTotalMinor: number;
  variantId: string;
};

const cheapestVariant = async (): Promise<{ id: string; priceMinor: number }> => {
  const client = await createStoreClient();
  const { data, error } = await client
    .from("variants")
    .select("id, price_minor, is_available, products!inner(status)")
    .eq("is_available", true)
    .order("price_minor")
    .limit(1);
  expect(error).toBeNull();
  const variant = data?.[0];
  if (!variant) {
    throw new Error("The project has no variants to buy. Run `pnpm store:seed pet-pilot` first.");
  }
  return { id: variant.id, priceMinor: variant.price_minor };
};

const beginPurchase = async (quantity: number): Promise<Purchase> => {
  const variant = await cheapestVariant();
  const result = await startStoreCheckout([{ variantId: variant.id, quantity }]);
  if (!result.ok) {
    throw new Error(`Checkout did not start: ${JSON.stringify(result)}`);
  }

  const client = await createServerClient(supabase);
  const details = await findOrderByNumber(client, result.orderNumber);
  if (!details?.order.stripeSessionId) {
    throw new Error("The new order has no Stripe session recorded on it");
  }
  created.orderIds.push(details.order.id);
  created.sessionIds.push(details.order.stripeSessionId);

  const session = await stripe.checkout.sessions.retrieve(details.order.stripeSessionId);
  return {
    orderId: details.order.id,
    orderNumber: result.orderNumber,
    session,
    expectedTotalMinor: details.order.totalMinor,
    variantId: variant.id,
  };
};

// Stripe's hosted payment page, driven like a customer would. The address is typed in by hand
// (the page's address suggestions cover the form otherwise) and the card is Stripe's test card.
const payWithTestCard = async (browser: Browser, sessionUrl: string): Promise<void> => {
  const page: Page = await browser.newPage({
    viewport: { width: 1280, height: 1500 },
    locale: "en-GB",
  });
  try {
    // The page redirects to the local site when done; no site is running, so answer for it.
    await page.route(CHECKOUT_RETURN, (route) => route.fulfill({ status: 200, body: "returned" }));

    await page.goto(sessionUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill("Alex.Tester@Example.com");
    await page.locator("#shippingName").fill("Alex Tester");
    await page.getByText("Enter address manually").click();
    await page.locator("#shippingAddressLine1").fill("1 Dog Lane");
    await page.locator("#shippingLocality").fill("Leeds");
    await page.locator("#shippingPostalCode").fill("LS1 1AA");
    await page.locator("#phoneNumber").fill("07400 123456");
    await page.locator("#phoneNumber").blur();
    // the page validates the address in the background before it lets a payment method be chosen
    await page.waitForTimeout(3000);
    const cardRow = await page.locator("#payment-method-label-card").boundingBox();
    if (!cardRow) {
      throw new Error("Stripe's payment page has no Card option: has its layout changed?");
    }
    await page.mouse.click(cardRow.x + 20, cardRow.y + 5);

    await page.locator("#cardNumber").fill("4242424242424242");
    await page.locator("#cardExpiry").fill("12 / 34");
    await page.locator("#cardCvc").fill("123");
    const billingName = page.locator("#billingName");
    if ((await billingName.count()) > 0) {
      await billingName.fill("Alex Tester");
    }

    await page.getByTestId("hosted-payment-submit-button").click();
    await page.waitForURL(CHECKOUT_RETURN, { timeout: 60_000 });
  } finally {
    await page.close();
  }
};

// Stripe produces the event a moment after the payment, so ask until it is there.
const waitForEvent = async (type: string, sessionId: string): Promise<Stripe.Event> => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const events = await stripe.events.list({ type, limit: 30 });
    const found = events.data.find(
      (event) => (event.data.object as { id?: string }).id === sessionId,
    );
    if (found) {
      created.eventIds.push(found.id);
      return found;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Stripe never produced a ${type} event for ${sessionId}`);
};

// Delivers an event the way Stripe would: a signed POST with the exact payload.
const deliver = async (
  event: Stripe.Event,
  signWith: string | undefined = webhookSecret,
): Promise<{ response: Response; emailTasks: (() => Promise<void>)[] }> => {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: signWith ?? "missing",
  });
  const emailTasks: (() => Promise<void>)[] = [];
  const deps = await createWebhookDeps((task) => emailTasks.push(task));
  const response = await handleWebhookRequest(
    new Request("https://example.test/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    }),
    deps,
  );
  return { response, emailTasks };
};

const rowsOf = (sql: string) => database.queryRows(sql);
const q = (value: string): string => `'${value.replaceAll("'", "''")}'`;

let browser: Browser;
let purchase: Purchase;
let completed: Stripe.Event;

beforeAll(async () => {
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set (apps/storefront/.env.local)");
  }
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();

  // Expire any checkout that was never paid, so nothing is left open on Stripe's side.
  await Promise.all(
    created.sessionIds.map((id) => stripe.checkout.sessions.expire(id).catch(() => undefined)),
  );

  // Remove what the test recorded. The audit log goes with its orders (a cascade), and the Stripe
  // events it applied are forgotten so a later run is not mistaken for a replay.
  if (created.orderIds.length > 0) {
    const orderList = created.orderIds.map(q).join(", ");
    const eventList = created.eventIds.length > 0 ? created.eventIds.map(q).join(", ") : "''";
    const cleanup = database.runSql(
      `delete from public.stripe_events where order_id in (${orderList}) or id in (${eventList});
       delete from public.orders where id in (${orderList});`,
    );
    if (!cleanup.succeeded) {
      console.error("Could not clean up the live test's orders:", cleanup.stdout.slice(0, 500));
    }
  }
  database.close();
}, 120_000);

describe("the storefront's database access for orders", () => {
  it("is accepted by the live API as its own role, and sees only this store", async () => {
    const client = await createServerClient(supabase);

    const { data, error } = await client.from("orders").select("store_id");

    expect(error).toBeNull();
    expect((data ?? []).every((row) => row.store_id === supabase.storeId)).toBe(true);
  });

  it("is not available to the browser-safe token: customer data stays closed to it", async () => {
    const client = await createStoreClient();

    const { error } = await client.from("orders").select("id").limit(1);

    expect(error?.code).toBe("42501");
  });
});

describe("a purchase, from the cart to a paid order", () => {
  it("starts a checkout: a pending order, and a Stripe payment page for exactly that order", async () => {
    purchase = await beginPurchase(2);

    const client = await createServerClient(supabase);
    const details = await findOrderById(client, purchase.orderId);
    expect(details?.order).toMatchObject({
      status: "pending_payment",
      currency: "GBP",
      customerEmail: null,
    });
    expect(details?.order.number).toMatch(/^[A-Z]{2,3}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    expect(details?.items).toHaveLength(1);
    expect(details?.items[0]?.quantity).toBe(2);

    // what Stripe will charge is what the order says
    expect(purchase.session.amount_total).toBe(details?.order.totalMinor);
    expect(purchase.session.currency).toBe("gbp");
    expect(purchase.session.status).toBe("open");
    expect(purchase.session.client_reference_id).toBe(purchase.orderId);
    expect(purchase.session.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(purchase.session.adaptive_pricing?.enabled).toBe(false);
  }, 60_000);

  it("tags the Stripe checkout with the store and the order", () => {
    expect(purchase.session.metadata).toEqual({
      store_id: supabase.storeId,
      store_slug: config.slug,
      order_id: purchase.orderId,
      order_number: purchase.orderNumber,
    });
  });

  it("takes a card payment on Stripe's own page", async () => {
    await payWithTestCard(browser, purchase.session.url as string);

    const paid = await stripe.checkout.sessions.retrieve(purchase.session.id, {
      expand: ["payment_intent"],
    });
    expect(paid.payment_status).toBe("paid");
    expect(paid.status).toBe("complete");
    expect(paid.amount_total).toBe(purchase.expectedTotalMinor);
    expect(paid.customer_details?.email).toBe("Alex.Tester@Example.com");

    // the payment itself carries the same tags, for reports and refunds later
    const intent = paid.payment_intent as Stripe.PaymentIntent;
    expect(intent.metadata).toMatchObject({
      store_slug: config.slug,
      order_id: purchase.orderId,
      order_number: purchase.orderNumber,
    });
    expect(intent.description).toContain(purchase.orderNumber);
  }, 120_000);

  it("is still pending until Stripe's event arrives: the browser alone cannot mark it paid", async () => {
    const client = await createServerClient(supabase);

    const details = await findOrderById(client, purchase.orderId);

    expect(details?.order.status).toBe("pending_payment");
  });

  it("is marked paid when Stripe's real event reaches the webhook handler", async () => {
    completed = await waitForEvent("checkout.session.completed", purchase.session.id);

    const { response, emailTasks } = await deliver(completed);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, handled: true, outcome: "paid" });
    expect(emailTasks).toHaveLength(1);

    const client = await createServerClient(supabase);
    const details = await findOrderById(client, purchase.orderId);
    expect(details?.order).toMatchObject({
      status: "paid",
      customerEmail: "alex.tester@example.com",
      customerName: "Alex Tester",
      stripeSessionId: purchase.session.id,
      shippingAddress: {
        name: "Alex Tester",
        line1: "1 Dog Lane",
        city: "Leeds",
        postcode: "LS1 1AA",
        country: "GB",
      },
    });
    expect(details?.order.paidAt).not.toBeNull();
  }, 90_000);

  it("recorded who did it and why, and queued the confirmation email", async () => {
    const audit = await rowsOf(
      `select kind, from_status, to_status, actor, stripe_event_id from public.order_events
       where order_id = ${q(purchase.orderId)} order by created_at`,
    );
    expect(audit).toEqual([
      {
        kind: "status_changed",
        from_status: null,
        to_status: "pending_payment",
        actor: "system",
        stripe_event_id: null,
      },
      {
        kind: "status_changed",
        from_status: "pending_payment",
        to_status: "paid",
        actor: "stripe",
        stripe_event_id: completed.id,
      },
    ]);

    const emails = await rowsOf(
      `select kind, to_address, status from public.email_events where order_id = ${q(purchase.orderId)}`,
    );
    expect(emails).toEqual([
      { kind: "order_confirmation", to_address: "alex.tester@example.com", status: "queued" },
    ]);
  });

  it("does nothing the second time Stripe delivers the same event", async () => {
    const before = await rowsOf(
      `select (select count(*) from public.order_events where order_id = ${q(purchase.orderId)}) as audit,
              (select count(*) from public.email_events where order_id = ${q(purchase.orderId)}) as emails,
              (select count(*) from public.stripe_events where id = ${q(completed.id)}) as seen`,
    );

    const first = await deliver(completed);
    const second = await deliver(completed);

    expect(await first.response.json()).toEqual({
      received: true,
      handled: true,
      outcome: "duplicate",
    });
    expect(await second.response.json()).toEqual({
      received: true,
      handled: true,
      outcome: "duplicate",
    });
    const after = await rowsOf(
      `select (select count(*) from public.order_events where order_id = ${q(purchase.orderId)}) as audit,
              (select count(*) from public.email_events where order_id = ${q(purchase.orderId)}) as emails,
              (select count(*) from public.stripe_events where id = ${q(completed.id)}) as seen`,
    );
    expect(after).toEqual(before);
    expect(before[0]).toMatchObject({ seen: 1 });
  }, 90_000);

  it("refuses an event that was not signed with the webhook secret, and changes nothing", async () => {
    const forged = { ...completed, id: "evt_forged_by_a_stranger" } as Stripe.Event;

    const { response } = await deliver(forged, "whsec_not_the_real_secret");

    expect(response.status).toBe(400);
    const seen = await rowsOf(
      `select 1 from public.stripe_events where id = 'evt_forged_by_a_stranger'`,
    );
    expect(seen).toEqual([]);
  });
});

describe("what the customer can then see", () => {
  it("lands on a page that finds the order from Stripe's session, and knows the money arrived", async () => {
    const returned = await loadReturnedCheckout(purchase.session.id);

    expect(returned.kind).toBe("found");
    if (returned.kind !== "found") {
      return;
    }
    expect(returned.paymentReceived).toBe(true);
    expect(returned.details.order.status).toBe("paid");
    expect(returned.statusUrl).toContain(`/orders/${purchase.orderNumber}?t=`);
  }, 30_000);

  it("shows the order page only to someone holding a valid link", async () => {
    const token = await mintOrderAccessToken({
      orderId: purchase.orderId,
      storeId: supabase.storeId,
      signingKey: supabase.jwtSigningKey,
    });

    expect((await loadOrderForVisitor(purchase.orderNumber, token))?.order.number).toBe(
      purchase.orderNumber,
    );
    expect(await loadOrderForVisitor(purchase.orderNumber, `${token}x`)).toBeNull();
    expect(await loadOrderForVisitor(purchase.orderNumber, undefined)).toBeNull();
    expect(await loadOrderForVisitor("PP-2222-3333", token)).toBeNull();
  }, 30_000);

  it("finds the order by number and email, but not with the wrong email", async () => {
    const client = await createServerClient(supabase);
    const details = await findOrderByNumber(client, purchase.orderNumber);

    expect(emailsMatch(" ALEX.tester@example.com ", details?.order.customerEmail ?? null)).toBe(
      true,
    );
    expect(emailsMatch("someone.else@example.com", details?.order.customerEmail ?? null)).toBe(
      false,
    );
  });

  it("writes a confirmation email for the real order", async () => {
    const client = await createServerClient(supabase);
    const details = await findOrderByNumber(client, purchase.orderNumber);
    const context = await buildOrderEmailContext(details!, config, supabase);

    const email = renderOrderEmail("order_confirmation", context);

    expect(email.subject).toBe(`Thanks, we've got your order ${purchase.orderNumber}`);
    for (const body of [email.html, email.text]) {
      expect(body).toContain(purchase.orderNumber);
      expect(body).toContain("LS1 1AA");
    }
    expect(email.text).toContain(`/orders/${purchase.orderNumber}?t=`);
  }, 30_000);
});

describe("an order's life after payment", () => {
  it("queues the shipped and delivered emails as the order moves, and refuses a move the rules forbid", async () => {
    const orderId = q(purchase.orderId);
    const illegal = database.runSql(
      `update public.orders set status = 'delivered' where id = ${orderId};`,
    );
    expect(illegal.succeeded).toBe(false);
    expect(`${illegal.stdout}${illegal.stderr}`).toContain(
      "illegal order status change from paid to delivered",
    );

    const walked = database.runSql(`
      select set_config('app.actor', 'live-test', false);
      update public.orders set status = 'supplier_pending' where id = ${orderId};
      update public.orders set status = 'supplier_ordered' where id = ${orderId};
      insert into public.shipments (store_id, order_id, carrier, tracking_number, tracking_url, shipped_at)
        values (${q(supabase.storeId)}, ${orderId}, 'Royal Mail', 'AB123456789GB',
                'https://www.royalmail.com/track-your-item', now());
      update public.orders set status = 'shipped' where id = ${orderId};
      update public.orders set status = 'delivered' where id = ${orderId};
    `);
    expect(walked.succeeded).toBe(true);

    const emails = await rowsOf(
      `select kind from public.email_events where order_id = ${orderId} order by kind`,
    );
    expect(emails.map((row) => row["kind"])).toEqual([
      "order_confirmation",
      "order_delivered",
      "order_shipped",
    ]);
    const audit = await rowsOf(
      `select to_status from public.order_events where order_id = ${orderId} order by created_at`,
    );
    expect(audit.map((row) => row["to_status"])).toEqual([
      "pending_payment",
      "paid",
      "supplier_pending",
      "supplier_ordered",
      "shipped",
      "delivered",
    ]);

    const client = await createServerClient(supabase);
    const details = await findOrderById(client, purchase.orderId);
    expect(details?.shipment).toMatchObject({
      carrier: "Royal Mail",
      trackingNumber: "AB123456789GB",
    });
    const shipped = renderOrderEmail(
      "order_shipped",
      await buildOrderEmailContext(details!, config, supabase),
    );
    expect(shipped.text).toContain("AB123456789GB");
  }, 120_000);
});

describe("a checkout that is abandoned", () => {
  it("cancels its order when Stripe says the checkout expired, and shrugs off a repeat", async () => {
    const abandoned = await beginPurchase(1);

    await stripe.checkout.sessions.expire(abandoned.session.id);
    const expired = await waitForEvent("checkout.session.expired", abandoned.session.id);
    const first = await deliver(expired);
    const second = await deliver(expired);

    expect(await first.response.json()).toEqual({
      received: true,
      handled: true,
      outcome: "cancelled",
    });
    expect(await second.response.json()).toEqual({
      received: true,
      handled: true,
      outcome: "duplicate",
    });
    const client = await createServerClient(supabase);
    expect((await findOrderById(client, abandoned.orderId))?.order.status).toBe("cancelled");
  }, 120_000);
});
