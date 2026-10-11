# Phase 0 setup: what is done and what needs you

Everything that can be built and verified without external accounts is done. The rest needs
accounts or software that only the owner can set up.

## Working locally

Prerequisites: Node 24 and pnpm 9 (`corepack enable` picks the pinned version).

```
pnpm install
pnpm check                          # typecheck, lint, format check, all tests
STORE=pet-pilot pnpm build          # on Windows PowerShell: $env:STORE = "pet-pilot"; pnpm build
pnpm smoke                          # boots the built storefront and checks it
```

To run the storefront while developing:

```
cd apps/storefront
cp .env.example .env.local          # then fill in REVALIDATE_SECRET
pnpm dev
```

## What the checks cover

- `packages/config`: the store config schema rejects bad values and applies defaults.
- `stores`: every registered store loads and declares the slug it is registered under.
- `packages/db`: migrations run against an embedded Postgres with a Supabase-style shim. Tests prove
  one store can never read or write another's data, for every table that has a `store_id`.
- `apps/storefront`: unit tests for theming, cache tags and the secret check.
- `pnpm smoke`: boots the production build and checks the page, the theme, the locked-down
  revalidation endpoint, and that expiring a cache tag refreshes a cached value.

## Needs you

### 1. Accounts

| Account      | Why                                | Notes                                                                                                                                                  |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supabase     | The shared database, auth and jobs | The free plan is fine for development. Free projects pause after a week idle and are not for real customers, so move to Pro before the pilot goes live |
| Stripe       | Payments                           | Test mode is enough for Phase 0                                                                                                                        |
| Vercel (Pro) | Hosting for the storefront         | Deferred until later. The free Hobby plan is non-commercial only                                                                                       |
| A domain     | Staging and production hostnames   | Needed when the storefront is deployed                                                                                                                 |

### 2. Software for database work

The Supabase CLI, added as an npm dev dependency in the repo. According to Supabase's CLI docs,
`supabase db push` (apply migrations to the hosted project) does not need Docker, and
`supabase gen types --project-id <ref>` reads the hosted project's schema. Docker Desktop is only
needed for a local Supabase stack (`supabase start`) and for `supabase db pull`. It is optional.

The tenant-isolation tests currently run on an embedded Postgres (PGlite). That is real Postgres,
so the row-level security behaviour is genuine, but it is not Supabase itself. Once the hosted
project exists, the same structural checks can run against it.

### 3. One assumption to verify first

The storefront's database isolation relies on a JWT that carries a `store_id` claim. The storefront
server signs a short-lived token per request (or per short window) with the project's JWT signing
key, and the row-level security policies read the claim. This is the standard custom-claims pattern,
but Supabase has been moving projects to asymmetric signing keys, where the private key is not
available to sign with. Before building on this:

1. Create the Supabase project.
2. Check which JWT signing keys it uses and whether a server can mint tokens its API will accept.
3. If not, fall back to a Postgres function that sets the store from a verified secret, or a
   per-store database role. The policies only depend on `app.current_store_id()`, so only that one
   function would change.

## Decisions still open for this phase

See "Open decisions" in the README: hosting (assumed Vercel) and the deployment model (assumed one
deployment per store).
