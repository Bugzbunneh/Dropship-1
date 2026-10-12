# Phase 0 setup: status and what still needs you

## Working locally

Prerequisites: Node 24 and pnpm 9 (`corepack enable` picks the pinned version). Phase 1 added
the shop itself, the demo catalog and browser tests: see `docs/storefront.md`. Without
`CATALOG_SOURCE=fixtures` the build reads the live database, so it needs the credentials below.

```
pnpm install
pnpm check                          # typecheck, lint, format check, all tests
STORE=pet-pilot CATALOG_SOURCE=fixtures pnpm build   # PowerShell: set $env:STORE and $env:CATALOG_SOURCE first
pnpm smoke                          # boots the built storefront and checks it
pnpm dev --filter @dropship/storefront   # or: cd apps/storefront && pnpm dev
```

### Environment files

All gitignored. Next.js loads both, and `.env.local` wins over `.env`.

| File                         | Holds                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `apps/storefront/.env`       | Your secrets: `SUPABASE_JWT_SIGNING_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`                             |
| `apps/storefront/.env.local` | Values that are not secrets, plus a generated `REVALIDATE_SECRET`: the project URL, the publishable key, `STORE_ID` |

`apps/storefront/.env.example` lists every variable. Put each comment on its own line: everything
after the first `=` on a line is the value, and the app refuses a signing key that contains
whitespace.

## What the checks cover

- `packages/config`: the store config schema rejects bad values and applies defaults.
- `stores`: every registered store loads and declares the slug it is registered under.
- `packages/db` (local, part of `pnpm test`): migrations run against an embedded Postgres with a
  Supabase-style shim. Tests prove one store can never read or write another's data for every
  table that has a `store_id`, and a structural checker enforces the tenancy rules.
- `apps/storefront`: unit tests for theming, cache tags, the secret check, environment
  validation and the store token.
- `pnpm smoke`: boots the production build and checks the page, the theme, the locked-down
  revalidation endpoint, and that expiring a cache tag refreshes a cached value.

Live checks, which use real credentials and never run in CI:

- `pnpm db:check-remote`: structural rules and isolation scenarios against the hosted database.
  See `docs/migrations.md`.
- `pnpm check:live`: the storefront's signed token against the live Supabase API, and the Stripe
  keys against Stripe's test mode.

## Done

### The Supabase project

- Project `Dropship-1`, London (eu-west-2), free plan, linked to this repo.
- Both migrations applied and recorded in the project's history.
- Types generated into `packages/db/src/database.types.ts`.
- Supabase's security advisors report no findings. The performance advisors report only INFO
  notes about indexes that are unused because the database has no traffic yet.
- The `pet-pilot` store row exists (`pnpm store:provision pet-pilot`), and its id is `STORE_ID`.
- Everything is managed through `pnpm db:*` scripts. See `docs/migrations.md`.

### The storefront's database token (README risk R12)

The storefront signs a short-lived token carrying `store_id` with the project's legacy JWT
secret, and Supabase's row-level security shows it only that store's published rows. Proven live:

- the API accepts the token and shows the storefront its own store, and only that,
- a token for another store sees nothing, and so does the publishable key alone,
- a token signed with the wrong key, or an expired one, gets a 401,
- the token cannot write.

Supabase is retiring legacy keys over time. The forward path is to generate our own signing key
(`supabase gen signing-key`) and import it in the dashboard, so the server keeps a key it can sign
with. Only `mintStoreToken` and `app.current_store_id()` depend on how the claim is delivered.

### Stripe (test mode)

Both keys are test-mode keys, and Stripe accepts the secret key and answers in test mode. Nothing
else is built on Stripe yet: checkout and the webhook are Phase 2, and `STRIPE_WEBHOOK_SECRET` is
not needed until then.

## Still needs you

| Item         | Why                              | Notes                                                         |
| ------------ | -------------------------------- | ------------------------------------------------------------- |
| Vercel (Pro) | Hosting for the storefront       | Deferred. The free Hobby plan is non-commercial only          |
| A domain     | Staging and production hostnames | Needed when the storefront is deployed                        |
| Supabase Pro | Live customers and orders        | Free projects pause after a week idle. Do this before go-live |

## Decisions still open for this phase

See "Open decisions" in the README: hosting (assumed Vercel) and the deployment model (assumed one
deployment per store).
