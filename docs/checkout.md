# Checkout and orders (Phase 2): how it works

A customer pays on Stripe's own page, our webhook turns that payment into a paid order, and emails
and a status page follow from the order's state. No account is needed at any point.

## How a purchase flows

1. **Checkout button.** The browser sends only variant ids and quantities. The server reads those
   variants from the database right now (not from the cached catalog), prices the basket from
   scratch (`priceCheckout` in `@dropship/core`: prices, delivery, VAT, limits) and refuses anything
   unavailable.
2. **A pending order is recorded** (`create_order`) with a random, uncountable number such as
   `PP-7K3M-9Q2X`, the lines as a snapshot, and the totals. Then a Stripe Checkout Session is created
   for exactly that order and the customer is sent to it. If Stripe fails, the order is cancelled
   straight away. Each session is tagged with the store and order, on the session and on the payment.
3. **The customer pays on Stripe's page.** Stripe sends them back to `/checkout/success`, which shows
   "Payment received" and refreshes itself until the order is paid. Their cart is cleared.
4. **Stripe calls `POST /api/stripe/webhook`.** The signature is checked over the exact bytes, the
   event is applied to its order by one database function (`apply_checkout_event`) that records the
   event and changes the order in a single transaction, and the response goes out. A replayed event
   answers `duplicate` and changes nothing, so Stripe can retry safely.
5. **The order's status trigger** writes the audit row and queues the confirmation email in the same
   transaction. After the response, the webhook sends whatever is queued for that order.
6. **Later changes** (shipped, delivered) go through the same trigger: audit row, queued email.
   `POST /api/emails/send` sends everything waiting (see "Running orders before the admin app").

The browser can never mark an order paid: only a validly signed Stripe event can.

## The pieces

| Where                                          | What it does                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/core`                                | Order states and the allowed moves, VAT, order numbers, basket pricing  |
| `supabase/migrations/…orders_and_payments.sql` | The order tables, the `storefront_server` role, both database functions |
| `apps/storefront/src/lib/stripe`               | Session builder, webhook event handling, the webhook handler            |
| `apps/storefront/src/lib/orders`               | Database access, access tokens, status wording                          |
| `apps/storefront/src/lib/emails`               | Templates, the Resend provider, the claim-and-send queue                |
| `apps/storefront/src/app/checkout`, `/orders`  | The pages: payment return, order status, find your order                |

### The database

- **`orders`, `order_items`, `order_events`, `stripe_events`, `email_events`, `shipments`.** None is
  readable by the browser-safe `anon` role. Operators can read their own store's rows.
- **`storefront_server`** is a database role of its own. The server signs it a one-minute token
  naming one store; it can reach only that store's rows, only the listed columns, and only the two
  functions. It cannot read the catalog's cost data, other stores, or edit the audit log.
- **State machine.** `app.order_status_transitions` lists the legal moves. A trigger refuses any
  other, and refuses changes to an order's amounts or number. A test checks that this table equals
  `ORDER_TRANSITIONS` in `@dropship/core`.
- **Audit log.** Every status change writes an `order_events` row (who, from, to, which Stripe event).
  It cannot be updated.
- **Emails are queued by the same trigger**, once per order and kind (`unique (order_id, kind)`).

### Prices, VAT and delivery

Prices always include VAT. Delivery is the flat rate in the store config, free over the threshold.
While `tax.vatRegistered` is false nothing is recorded; once true, the VAT already inside each total
is worked out at `tax.vatRateBps` and shown on the order and in emails. Do not turn it on until
registered with HMRC (README R10).

### Who can see an order

- **Straight after paying:** the Stripe session id in the return address (long, random, known only to
  the buyer and Stripe).
- **Later:** order number _and_ the email used, on `/orders/lookup`, or the link in an order email.
  The link carries a signed token for that one order (90 days, read-only, derived from the project's
  signing secret so it can never be a database token). A wrong number, wrong email and missing order
  all give the same answer. Lookups are rate limited.
- Order and return pages are never indexed and never leak their address in a `Referer`.

## Running it

| Variable                | Needed for                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Creating checkouts. A test key (`sk_test_…`) until go-live                                |
| `STRIPE_WEBHOOK_SECRET` | Checking Stripe's signature. Locally, any long random value (the live test signs with it) |
| `NEXT_PUBLIC_SITE_URL`  | Where Stripe returns customers to. Set at **build** time. `http://localhost:3100` locally |
| `RESEND_API_KEY`        | Sending emails. Without it they stay queued                                               |
| `REVALIDATE_SECRET`     | The deployment's internal secret: revalidation and `POST /api/emails/send`                |

```
pnpm check                     # everything that needs no credentials, including the order rules
pnpm e2e                       # browser tests with the demo catalog (CI runs these)
pnpm check:live                # the whole purchase against Supabase and Stripe test mode
```

`pnpm check:live` creates a real order, pays it with a test card on Stripe's real payment page
(driven by a browser), delivers the event Stripe really produces to the webhook handler (twice, to
prove the replay is harmless, and once forged, to prove it is refused), checks the customer-facing
pages and emails, walks the order through its life, and cancels an abandoned checkout. It deletes
what it created. It needs the demo catalog (`pnpm store:seed pet-pilot`) and a browser
(`pnpm --filter @dropship/storefront exec playwright install chromium`).

The demo catalog (`CATALOG_SOURCE=fixtures`) has no database, so checkout there answers "isn't
switched on for this demo catalog".

## Running orders before the admin app

```
pnpm order:show PP-7K3M-9Q2X
pnpm order:advance PP-7K3M-9Q2X supplier_pending
pnpm order:advance PP-7K3M-9Q2X shipped --carrier "Royal Mail" --tracking AB123456789GB --url https://…
pnpm order:advance PP-7K3M-9Q2X delivered --send-emails http://localhost:3100
```

Moves are checked against the same rules as the database. The email for a move is queued
automatically; `--send-emails <site address>` asks a running storefront to send it now. Nothing
sends queued emails on a timer yet: that arrives with the jobs in Phase 3 (README R20).

## Before the first real sale

- Register `https://<domain>/api/stripe/webhook` in Stripe with the three events above, and put its
  signing secret in `STRIPE_WEBHOOK_SECRET`. Switch to live keys.
- Review Stripe's dashboard settings: which payment methods are on (the checkout page offers
  whatever the account has enabled), the statement descriptor, and customer receipts.
- Verify the sending domain in Resend (SPF, DKIM, DMARC), add `RESEND_API_KEY`, and schedule a call to
  `POST /api/emails/send` every few minutes.
- Decide VAT with the accountant, and set `tax.vatRegistered`.
- Put bot protection in front of checkout and lookup (README R18).
- Have the policy pages reviewed and set `policies.reviewed` (README R10).
