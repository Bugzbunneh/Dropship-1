# Storefront (Phase 1): how it works

A phone-first shop for the pilot store: browse by pet, search, filter, product pages, a cart that
survives a reload, delivery dates, and the UK policy pages. Checkout is Phase 2, so the cart's
checkout button says "coming soon" for now.

## Working with it

```
pnpm install
pnpm check                          # typecheck, lint, format check, unit tests
pnpm store:seed pet-pilot           # put the demo catalog in the live database
pnpm store:seed pet-pilot --remove  # take it out again
pnpm dev --filter @dropship/storefront
```

To run with no database or credentials, serve the built-in demo catalog. In PowerShell:

```
$env:CATALOG_SOURCE = "fixtures"
pnpm build
pnpm smoke                          # boots the build, checks theme, 404s, revalidation
pnpm --filter @dropship/storefront exec playwright install chromium   # once
pnpm e2e                            # browser tests, desktop and phone
```

CI does exactly this. Live-database checks (`pnpm check:live`, `pnpm db:check-remote`) need real
credentials and run from a developer machine only.

| Variable               | Effect                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `CATALOG_SOURCE`       | `fixtures` serves the demo catalog. Anything else reads Supabase, so a broken production fails loudly  |
| `ALLOW_INDEXING`       | Search engines may index the site only when this is `true`. Baked into page metadata at **build** time |
| `NEXT_PUBLIC_SITE_URL` | Public address for canonical links, social previews and the sitemap. Defaults to the store's domain    |

## Pages

| Address                                    | What it is                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `/`                                        | Home: pick a pet, best sellers, reduced prices, new in, delivery and returns at a glance |
| `/dogs`, `/cats`                           | A pet's section in its own colours: categories, favourites, offers                       |
| `/dogs/dog-beds` (and so on)               | A category with filters, sorting and pages                                               |
| `/dogs/all`, `/cats/all`                   | Everything for one pet                                                                   |
| `/products/<slug>`                         | Product page: pictures, options, price, delivery date, related products                  |
| `/search?q=`                               | Search results, plus suggestions while typing                                            |
| `/cart`                                    | The full cart (a drawer opens from anywhere else)                                        |
| `/delivery` `/returns` `/privacy` `/terms` | Policy pages written for UK consumer law                                                 |
| `/faq` `/contact`                          | Questions and how to reach us                                                            |
| `/sitemap.xml` `/robots.txt`               | Per-request, and empty or disallowing unless indexing is on                              |

## Colours: one per pet

The base theme is warm and neutral. Each department (pet) overrides only the roles that give it
character: its main colour, the text on it, a tint for sections, a darker colour for headings and
links, and a decorative accent. Dogs are warm amber, cats are teal. Anything inside a pet's section
(including its products) is wrapped in `DepartmentTheme`, which sets the `--store-*` CSS variables
for that subtree.

Each colour has one job, so contrast can be checked per pairing. `stores/index.test.ts` fails if
any pairing drops below WCAG AA (4.5:1 for text, 3:1 for icons and borders) or if two pets
share a main colour. `accent` is decoration only and is never put behind text.

To add a pet, add an entry to `departments` in the store's `store.config.ts` and give its products
that `department`. The slug cannot be an address the app already uses (the schema refuses it).

Fonts are limited to the ones loaded through `next/font` (`SUPPORTED_FONTS` in the config
package). They use `display: optional`: if a font is not ready within about 100ms the page keeps
the fallback for that view, so a slow connection never sees text jump when the font arrives. The
fonts are preloaded, so on a normal connection they are there in time.

## Catalog, caching and search

- The whole store's catalog is read once into a `CatalogSnapshot` and cached with
  `'use cache'`, tagged `store:<id>`. Every listing, search, filter, sort, related-products list
  and cart price lookup is a pure function over that snapshot (`src/lib/catalog`).
- Two loaders produce the same snapshot: Supabase (a store-scoped token, so row-level security
  does the isolation) and the offline demo catalog. A test compares the two against the live
  database so they cannot drift.
- Search is in memory: lower-casing, simple stemming and prefix matching on the last word typed.
  Filters and sort live in the address (`brand`, `min`, `max`, `stock`, `sale`, `sort`, `page`,
  `q`), so a filtered view can be shared and the back button works.
- A price or stock sync refreshes pages with `POST /api/revalidate` (header `x-revalidate-secret`,
  tags such as `product:<id>`). All tag handling is in `src/lib/revalidation.ts`.
- This design suits a catalog of up to a few thousand products. Past that, listing and search move
  into SQL (README risk R13).

## Cart and delivery

- The cart is stored in the browser (`dropship-cart`) as variant ids and quantities only. Prices
  and stock are looked up fresh through a server action, so a stale cart can never show an old
  price.
- Delivery is a flat rate, free over a threshold (both in the store config), with a progress bar
  toward free delivery.
- Delivery dates count working days, skipping weekends and England and Wales bank holidays. The
  bank holiday list is embedded and covers 2026 and 2027; a test fails when it is time to add the
  next years (README risk R14). Dates are worked out in the browser so cached pages stay cached.

## Search engines

- Every page has a title, description, canonical link and Open Graph tags. Product pages carry
  `Product` and `BreadcrumbList` structured data, and every page declares the organisation and a
  search box.
- Search results are `noindex` on purpose (thin, endless pages).
- Staging and previews are `noindex` unless `ALLOW_INDEXING=true` at build time.
- Pictures go through the Next.js image optimiser when they are real photos. The demo catalog's
  illustrations are generated SVGs (`/placeholder.svg`) until real product photos arrive.

## Real 404s

With Cache Components a page streams, so a missing product would otherwise answer "200 OK" and
only then show "not found" (a soft 404). `src/proxy.ts` checks every page address against a short
cached list of known addresses first and answers unknown ones with a genuine 404. If the catalog
cannot be read it lets the request through rather than blocking the site.

Self-hosting note: `next start -H <address>` makes this rewrite fail with a 500, because Next
treats the rewrite as a separate server and tries to reach it by the wrong host name. Start with
the default host (as the smoke and e2e tests do). Re-check when deploying (README risk R15).

## Tests

| Layer                   | What it covers                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Unit (`pnpm test`)      | Config, colours and contrast, catalog queries, search, cart maths, working days, SEO |
| `pnpm smoke`            | The production build boots, themes both pets, answers 404, locks down revalidation   |
| `pnpm e2e` (Playwright) | Browsing, search and filters, cart, SEO, a phone layout; each on desktop and Pixel 7 |
| Accessibility (in e2e)  | axe-core scans of every page type against WCAG 2.2 AA, heading order, tap sizes      |
| `pnpm check:live`       | The live Supabase and Stripe test mode, and the demo catalog against the database    |

## Performance (checked 2026-10-12)

Lighthouse, mobile, against the production build reading the live catalog:

| Page           | Perf | A11y | Best practices | SEO | LCP (simulated) | LCP (throttled) | CLS | TBT   |
| -------------- | ---- | ---- | -------------- | --- | --------------- | --------------- | --- | ----- |
| Home           | 92   | 100  | 100            | 100 | 3.2 s           | 1.9 s           | 0   | 10 ms |
| Cats section   | 94   | 100  | 100            | 100 | 3.0 s           | 1.8 s           | 0   | 10 ms |
| Category       | 96   | 100  | 100            | 100 | 2.8 s           | 1.8 s           | 0   | 10 ms |
| Product        | 95   | 100  | 100            | 100 | 2.9 s           | 1.8 s           | 0   | 10 ms |
| Search results | 96   | 100  | 100            | 66  | 2.8 s           | not run         | 0   | 10 ms |

- "Simulated" is Lighthouse's default model of a slow phone on slow 4G. It estimates from the list
  of requests and scripts rather than measuring them, and is deliberately pessimistic. It puts
  largest contentful paint (LCP) a little over the 2.5 s "good" line.
- "Throttled" applies the slow-4G and 4x slower CPU limits to a real browser and measures. It
  passes everywhere. On this machine without throttling, the largest element appears at about 0.16 s.
- The search page's SEO score is the deliberate `noindex`.
- Most of the page's script is the framework itself (react-dom is about 70 KB of the ~160 KB).
- What decides this for real is field data from real visitors. Re-measure on the deployed site
  with PageSpeed Insights and Search Console (README risk R16).

## Not done yet, on purpose

- Checkout, payment and orders (Phase 2).
- Real products and photos (Phase 3). Until then the 31 demo products are tagged `demo`, and
  `pnpm store:seed pet-pilot --remove` takes them out.
- Policy pages are drafts. They show a notice until `policies.reviewed` is true and the business
  details (name, address, email) are filled in the store config (README risk R10).
- Deployment (Vercel is deferred).
