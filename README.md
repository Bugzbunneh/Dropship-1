# Dropship-1

A self-hosted dropshipping platform core. We build the commerce engine once, then stand up as many niche stores on top of it as we like: pet products, home gym accessories, golf, and whatever comes next.

> **Status: planning.** Nothing is built yet. This README is the plan, and the roadmap checkboxes get ticked as phases land.
>
> **Team and pace:** two of us, no deadlines. We optimise for building it correctly, not quickly.
>
> **Ownership:** these stores are a long-term business we run ourselves. None are built to be sold.

## Why this exists

- Every store sells something different, but the plumbing is the same: catalog, cart, checkout, supplier orders, tracking, emails, refunds, reporting. We want to build that plumbing once.
- We are deliberately **not using Shopify**. Owning the functionality costs more up front but pays back across every site: no per-store platform subscription or app fees (hosting and payment processing still cost money), no platform limits on how far we can automate, and full control of our data and fulfilment logic.
- The end goal is stores that are **profitable and low maintenance**. Automation is a core feature, not an afterthought. A store's normal state is running itself, and a human is only pulled in for exceptions.

## Goals and non-goals

**Goals**

- One codebase, many stores.
- **Shared infrastructure, separate storefronts.** One backend and one admin run every store, and each store has its own branded storefront and domain. Maintenance stays flat as the store count grows.
- A store-agnostic core. Anything niche-specific lives in store config, content and theme, never in core code.
- Automation first: catalog sync, order placement, tracking, customer emails and reporting run without us.
- Supplier-agnostic. Suppliers plug in through adapters, so switching or adding one doesn't touch the core.
- Profit-aware. Margin rules are built in, so a supplier price change can't quietly turn a sale into a loss.
- UK first, with room to expand to other markets later.

**Non-goals (for now)**

- A multi-vendor marketplace.
- Holding stock or running a warehouse.
- A public page builder. We configure stores in code and config.
- Native mobile apps. The storefront is mobile-first web.
- Markets outside the UK.
- Selling stores to other people.

## Design principles

1. **Config over code.** A new store should be a folder of config, content and theme tokens, not a fork.
2. **Automate by default, escalate exceptions.** Failures land in one exceptions inbox with a suggested action, rather than needing us to go looking.
3. **Adapters at the edges.** Suppliers, payments, email and shipment tracking all sit behind interfaces.
4. **Money is integers.** Amounts are stored in minor units (pence/cents) with a currency code. No floats.
5. **Idempotent and auditable.** Webhooks and jobs are safe to retry, and every order state change is recorded.
6. **Prove it on a real store, then generalise.** We build against one pilot store and only call the core "reusable" once a second, different niche runs on it without core changes.
7. **Isolation lives in the database.** Every store-owned table carries a `store_id` and is protected by row-level security, and automated tests prove that one store can't read another's data. Keeping `store_id` on every table also means a busy store could be split out into its own project later.

## UK first

- **Market and currency.** UK customers, GBP, UK locale. Currency, locale and shipping countries are already part of store config and money is stored as minor units plus a currency code, so adding markets later should not need schema changes.
- **Delivery promise: no more than 5 working days from order to delivery.** This is a working assumption we will experiment with, so it is measured from day one (see Automation and Success measures). The delivery estimate shown to customers and supplier eligibility both derive from it. In practice it means suppliers must ship from UK stock (or nearby EU stock), because typical long-haul shipping will not meet it.
- **Compliance to settle with an accountant and, where needed, a solicitor.** Not legal advice, just the list we know we must check: VAT registration and treatment, UK consumer rights (distance-selling cancellation and refund rules), UK GDPR and PECR consent for marketing email, and product rules that apply to the niche. Pet products include regulated categories (for example veterinary treatments and pet food labelling), which will shape which products we choose.

## Proposed stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Package manager | pnpm (workspaces) | Monorepo, see Architecture |
| Framework and build | Next.js (App Router) | Replaces Vite and React Router from our usual stack. It brings its own bundler and router, see below |
| Language | TypeScript | Strict mode |
| UI | React + Tailwind CSS | Mobile-first |
| Server state | TanStack React Query | For interactive client-side data such as search and live cart totals. Server components fetch most page data |
| Client state | Zustand | Cart and UI state |
| Database, auth, storage | Supabase, **one project shared by all stores** | Postgres with row-level security for tenant isolation and for customer and operator access |
| Webhooks and scheduled jobs | Supabase Edge Functions + pg_cron, backed by a Postgres job queue | Jobs loop over stores. Data changes call Next.js on-demand revalidation so pages refresh |
| Payments | Stripe (Checkout, Tax) | One Stripe account for all stores, see Risks to revisit |
| Transactional email | Resend or Postmark, with React Email templates | |
| Hosting | Vercel (recommended, to confirm) | Pro plan needed: the free Hobby plan is non-commercial only |
| Lint and format | oxlint, Prettier | |
| Tests | Vitest (unit), Playwright (checkout end-to-end) | |
| Monitoring | Sentry plus uptime checks | |

**Why Next.js, and what it changes from our usual stack.** A plain Vite single-page app is a poor fit for a store. Product pages need to be crawlable, fast on first load (paid traffic lands directly on them), and produce correct link previews and Product structured data. Next.js is the most mature option for that:

- **Incremental static regeneration.** Product and collection pages are served from the CDN and refreshed when data changes. Our stock and price sync jobs trigger revalidation of just the affected pages, so pages stay fast and stay current.
- **Built-ins for SEO and speed.** Metadata API, sitemap and robots generation, and image optimisation come with the framework.
- **Mature e-commerce ecosystem**, with more examples and more people who have solved the same problems.

What we give up: Vite and React Router are replaced by Next.js's own tooling, TanStack React Query has a narrower role because server components do most data fetching, and we are tied more closely to Vercel (see R1).

Alternatives considered:

- **React Router framework mode** is lighter and runs anywhere, including plain Node. It has no built-in incremental static regeneration or image optimisation, and a smaller e-commerce ecosystem. Its portability mattered most when we might sell stores, so it lost its main advantage.
- **Astro** is excellent for mostly-static catalogs, but it moves us further from the stack we already know.

## Architecture

### Repository layout (proposed)

```
apps/
  storefront/     The shared customer-facing Next.js app, configured per store
  admin/          One operator back office for all stores, with a store switcher
packages/
  core/           Pure TypeScript domain logic: pricing, cart, order state machine
  suppliers/      Supplier adapter interface and implementations
  db/             Schema, migrations, generated types
  ui/             Shared components and theme tokens
  config/         Store config schema and shared tooling config
stores/
  <store-slug>/   Config, theme tokens, copy, logo. Little or no code
supabase/
  migrations/
  functions/      Webhooks and scheduled jobs
scripts/
  create-store    Add a store: database row, config folder, deployment and domain
```

Secrets (Supabase keys, Stripe keys, supplier credentials) live in each deployment's environment or a secret manager, never in the repo.

### Multi-store model

- **One shared backend, many storefront deployments.** Every table that belongs to a store carries a `store_id`, enforced by row-level security. Each store's storefront is a separate deployment of the same app with its own domain and `STORE` setting, so it picks up its own config and theme.
- **One admin for everything.** The operator back office sees all stores, with a store switcher and an all-stores overview. We do not run one admin per store.
- **Why shared:** supplier sync, order fulfilment, email, alerts and reporting are built and run once for all stores, which is what keeps maintenance low as the store count grows. There is one database to migrate, back up and monitor.
- **Trade-off:** a bug in tenant isolation affects every store, and a database incident or runaway job does too. We mitigate with automated tenant-isolation tests, per-store limits on jobs, and by keeping `store_id` everywhere so a high-volume store can be split into its own project later. See R6 and R7.
- **Payments:** all stores use one Stripe account for now. Stripe keys are read from per-store config, and every Stripe object is tagged with the store slug in metadata. That keeps per-store reporting simple and makes a split possible if we ever want one.

### Store config

Each store declares, in typed and validated config: name and domain, currency, locale and shipping countries, theme tokens, navigation and collections, supplier sources, pricing rules, policy text, analytics IDs, email sender, and Stripe key references.

### Core data model (sketch)

`stores`, `products`, `variants`, `collections`, `suppliers`, `supplier_products` (mapping to our products), `pricing_rules`, `carts`, `customers`, `orders`, `order_items`, `fulfilments` (the supplier-side order), `shipments` (tracking, including delivery time), `discounts`, `email_events`, `job_runs`, `alerts`. Every table except `stores` carries `store_id`.

## How an order flows

1. Customer checks out through Stripe Checkout (hosted, which keeps card data away from us).
2. Stripe webhook arrives. We create the order idempotently and send the confirmation email.
3. A fulfilment job places the order with the supplier through its adapter.
4. A tracking sync job picks up the tracking number and sends the shipped email.
5. Delivery is detected and the order closes, optionally triggering a review request.

**Order states:** `pending_payment` → `paid` → `supplier_pending` → `supplier_ordered` → `shipped` → `delivered`

**Exception states** (each raises an alert and appears in the exceptions inbox): `supplier_failed`, `out_of_stock`, `address_issue`, `refund_requested`, `refunded`, `disputed`, `delivery_overdue`.

## Automation

| Job | Cadence | What it does |
| --- | --- | --- |
| Catalog import | On demand, then scheduled | Pulls supplier products, maps them to our schema, applies pricing rules, queues new items for approval |
| Stock and price sync | Frequent | Updates availability and cost; reprices to hold margin, or hides products that fall below the margin floor. Changes beyond a set size per run need approval. Triggers revalidation of the affected pages |
| Supplier order placement | Event-driven | Sends paid orders to the supplier, with retries and idempotency |
| Tracking sync | Frequent | Updates shipment status and triggers shipped and delivered emails |
| Delivery time monitor | Daily | Compares actual delivery time with the 5 working day promise, flags overdue orders, and records per-supplier delivery stats |
| Abandoned cart | Scheduled | Reminder emails with sensible limits |
| Exception alerts | Event-driven | Sends failures to Slack, Discord or email, with a suggested action |
| Reconciliation | Daily | Checks that every paid order has a supplier order and flags mismatches |
| Profit report | Daily and weekly | Revenue, cost of goods, payment fees, refunds, net margin per store |

## Roadmap

Each phase ends with an exit criterion, so we know when it is actually done. There are no dates: a phase is done when its exit criterion is met.

### Phase 0: Foundations
- [ ] Settle the open decisions due in this phase (hosting and the deployment model, see below)
- [x] pnpm workspace monorepo with TypeScript, oxlint, Prettier and CI (typecheck, lint, format check, tests). The CI workflow is written and every step passes locally; it first runs on GitHub when this is pushed
- [x] Store config schema and loader
- [x] Initial schema, migrations and row-level security (`store_id` on every store-owned table), tested against an embedded Postgres
- [ ] Supabase project created (free plan for development), migrations applied to it, and generated types (see `docs/phase-0-setup.md`)
- [x] Tenant-isolation test harness, so every new table is checked from the start
- [x] Storefront boots from a store config, with a verified revalidation round trip (`pnpm smoke`)
- [ ] Storefront calling Supabase and Stripe in test mode, run locally
- [ ] Storefront deployed to the host (deferred: Vercel comes later)
- [ ] Staging and production environments (needs a domain and the host). Local development works today

**Exit:** an empty storefront boots from a store config in CI and deploys to staging.

### Phase 1: Storefront
- [ ] Layout and theming from store config, responsive and mobile-first
- [ ] Collections, product listing, product detail (variants and images), search and filters
- [ ] Persistent cart and shipping estimates
- [ ] SEO: metadata, Product JSON-LD, sitemap, robots, Open Graph, incremental static regeneration for product pages, optimised images
- [ ] Policy, FAQ and contact pages, written for UK consumer law

**Exit:** a seeded catalog can be browsed on a phone, with good Core Web Vitals.

### Phase 2: Checkout and orders
- [ ] Stripe Checkout and an idempotent webhook that creates orders
- [ ] Tax (UK VAT) and shipping rates
- [ ] Order state machine with an audit log
- [ ] Transactional emails (confirmation, shipped, delivered)
- [ ] Guest order lookup and status page
- [ ] Stripe objects tagged with the store slug

**Exit:** a test-mode purchase works end-to-end, including a safely replayed webhook.

### Phase 3: Supplier and fulfilment automation
- [ ] Choose the pilot's real products (the owner is consulted at this point)
- [ ] Supplier adapter interface, with contract tests
- [ ] First supplier adapter, from a supplier that ships from UK or nearby EU stock
- [ ] Catalog import, pricing rules (markup, rounding, margin floor) and publish flow
- [ ] Stock and price sync jobs, with a per-run change limit and page revalidation
- [ ] Automatic supplier order placement on payment
- [ ] Tracking sync with shipped and delivered emails
- [ ] Delivery time capture per order and the delivery time monitor

**Exit:** a real order goes from payment to delivery with no manual steps.

### Phase 4: Admin and operations (pilot store goes live here)
- [ ] Admin app with Supabase Auth, an operator role and a store switcher
- [ ] Exceptions inbox with one-click actions
- [ ] Product curation (approve, hide, edit) and a pricing rule editor
- [ ] Refunds and cancellations that update Stripe and the supplier together
- [ ] Alerting, a job-run dashboard, reconciliation
- [ ] Daily and weekly profit reports
- [ ] Error monitoring and uptime checks

**Exit:** the pilot store is live and can be run in a few minutes a day.

### Phase 5: Growth and conversion
- [ ] Abandoned cart and post-purchase email flows, review requests
- [ ] Discount codes, free-shipping threshold, bundles and upsells
- [ ] Product feeds (Google Merchant Center, Meta) and pixels with server-side conversion events
- [ ] Product reviews and optional customer accounts

**Exit:** conversion and repeat-purchase levers are in place and measurable.

### Phase 6: Multi-store
- [ ] Store template and a `create-store` script (database row, config folder, deployment, domain)
- [ ] All-stores overview in the admin: orders, exceptions and profit
- [ ] Per-store limits on jobs, so one store can't starve the others
- [ ] Launch a second store in a different niche

**Exit:** the second store is up with no changes to core code, and a new store takes about a day to launch.

## How we'll know it's working

- **No-touch order rate:** the share of orders that reach delivery without human involvement.
- **Delivery within 5 working days:** the share of orders delivered inside the promise, per supplier.
- **Operator time:** hours per week per store.
- **Net margin:** after cost of goods, payment fees and refunds.
- **Running cost per store per month:** hosting, database and tooling.
- **Refund and dispute rate.**
- **Time to launch a new store.**

## Risks and how the core handles them

| Risk | Mitigation in the core |
| --- | --- |
| Supplier price rises erode margin | Price sync with a margin floor that reprices or hides the product |
| Item goes out of stock after purchase | Frequent stock sync, plus an exceptions inbox with refund or substitute actions |
| Slow shipping leads to complaints and chargebacks | 5 working day limit, delivery estimates shown up front, proactive tracking emails, self-service order status, delivery time monitor |
| Disputes and chargebacks | Clear policies, tracking evidence stored on the order, dispute webhook alerts |
| Supplier API changes or outages | Adapter isolation, contract tests, alerts on repeated failures |
| One store seeing another's data | Row-level security on every store-owned table plus automated tenant-isolation tests |
| Tax, VAT and consumer-law compliance | Stripe Tax and per-store policy templates. Code doesn't solve the legal side, so we get proper accounting and legal advice before launch |

## Risks to revisit

Known trade-offs of the choices above. None block progress. Each has a trigger for when we look at it again.

| # | Risk | Why it matters | Mitigation or plan | Revisit when |
| --- | --- | --- | --- | --- |
| R1 | **Next.js runs best on Vercel, costs money there, and changes quickly** | Vercel is a soft lock-in, not a hard one: self-hosting is supported, but multi-instance caching, shared encryption keys and streaming proxies become ours to run. Vercel Pro is $20 a month with one deploying seat and $20 of usage credit included, extra deploying seats are $20 each, and traffic, functions and images are billed on top (checked 2026-10-11). The caching model has changed between major versions (Next.js 16 reportedly made caching opt-in), and our design leans on revalidation | Keep Vercel to rendering, CDN and builds only, with state, jobs and files staying in Supabase. Put all revalidation behind one module, tag pages by store and product, and run a Playwright test that a price change appears on the page after a sync, on every upgrade. Pin versions and read upgrade notes. Set spend alerts. The exit is self-hosting on Node with a shared cache handler | When the pilot goes live, at each new store, at each Next.js major version, and if monthly hosting cost passes a threshold we set |
| R2 | **Config over code may not stretch** | A niche that needs a different product page or checkout pushes towards forks or a pile of options in the core | Keep store differences to theme tokens and content; add extension points to the core rather than forking | When the pilot store needs something unusual, and at Phase 6 |
| R3 | **Edge Functions and the Postgres job queue have limits** | Edge Functions have execution limits and a Postgres queue is a pragmatic choice rather than a specialist one. With a shared project, every store's jobs compete for the same capacity | Small batched jobs, idempotent retries, `job_runs` visibility, per-store limits. Separate worker or queue service if needed | If jobs time out, or at sustained higher order volume |
| R4 | **Stripe fit for dropshipping** | Hosted Checkout limits customisation. Stripe Tax costs extra and may not cover everything. Stripe can restrict or freeze accounts it sees as high risk, which dropshipping with slow delivery can look like | Fast UK delivery, clear policies, tracking evidence, low dispute rate. Read Stripe's current terms for the business model before launch | Before go-live (Phase 4) |
| R5 | **One shared Stripe account across all stores** | A freeze or dispute spike on one store puts every store's payments at risk. Stripe also wants every business website declared | Store-slug metadata on every Stripe object and per-store Stripe keys in config, so a store can move to its own account if needed | Before the second store, and once dispute rates are measurable |
| R6 | **Tenant isolation bug in the shared database** | A mistake in a row-level security policy could expose one store's customers or orders to another | Row-level security on every store-owned table, a test harness that checks each table, and review of every migration | Continuously: on every schema change, and at Phase 2 before real orders flow |
| R7 | **Shared backend means a shared blast radius** | A database incident, runaway job or one very busy store can affect every store, and one Supabase project has finite connections and compute. Splitting a store out later takes work | Backups and point-in-time recovery, per-store job limits, monitoring, scaling compute as load grows (a Pro project is about $25 a month, checked 2026-10-11). `store_id` on every table keeps a split possible | At the second and third stores, and if one store dominates load |
| R8 | **Margin floor could mass-reprice or hide the catalog** | A bad supplier feed could wipe out or distort prices across the store | Per-run change limit, approval above a threshold, alerts on large changes | Phase 3, when the sync jobs are built |
| R9 | **5 working day delivery narrows suppliers** | Only UK or nearby EU stock qualifies, which means a smaller catalog and possibly thinner margins | Treat the limit as an experiment, measure delivery times per supplier, relax or tighten using real data | Phase 3 supplier selection, and after the first 50 orders |
| R10 | **UK compliance** | VAT registration, consumer rights, UK GDPR/PECR and pet-product rules all apply | Accountant and solicitor before launch, Stripe Tax, policy templates | Before the pilot goes live |
| R11 | **Deployment model: one deployment per store, or one for all** | Separate deployments isolate rollbacks but multiply builds, projects and settings. One deployment routed by hostname is simpler to run but a bad release hits every store | Start with a deployment per store, scripted in `create-store`. Revisit if the number of stores makes this a chore | At the third store |

## Open decisions

### Decided

- **Shared backend** (2026-10-11). One Supabase project for all stores, with `store_id` and row-level security. This reverses an earlier choice of a backend per store, which only made sense if we might sell stores. See R6 and R7.
- **Next.js** (2026-10-11), replacing React Router framework mode. See R1.
- **Stores are for us to run, not to sell** (2026-10-11).
- **UK first** (2026-10-11). GBP and UK compliance for now; other markets later.
- **Delivery: 5 working days at most** (2026-10-11), as an experiment that is measured from day one. Read as order placed to delivered. See R9.
- **Pilot niche: pet products** (2026-10-11). The exact products are chosen with the owner when we reach Phase 3.
- **One Stripe account for now** (2026-10-11). See R5.
- **Free Supabase plan during development** (2026-10-11). Free projects pause after a week of inactivity and have no place holding real customers or orders, so the project moves to Pro before the pilot goes live (R7).
- **Deployment to Vercel is deferred** (2026-10-11). Development runs locally until then.
- **No deadlines** (2026-10-11). Correctness over speed, and the roadmap order stands.

### Still open

Each decision names the phase that needs it.

1. **Hosting** (needed in Phase 0). **Vercel**, versus self-hosting on Node/Docker or Cloudflare through an adapter. Vercel is the simplest fit for Next.js and its cost is tracked in R1. Working assumption until confirmed: Vercel.
2. **Deployment model** (needed in Phase 0). A deployment per store, or one deployment routed by hostname (R11). Working assumption until confirmed: a deployment per store.
3. **First supplier** (needed in Phase 3). Must ship from UK or nearby EU stock and meet the delivery limit. Candidates are not yet evaluated.
4. **Business and legal setup** (needed before the pilot goes live, Phase 4). Accountant for VAT and the Stripe account arrangement (R5, R10).
