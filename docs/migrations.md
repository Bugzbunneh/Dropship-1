# Managing database migrations

The database lives in one hosted Supabase project (free plan while we develop). Every change to
it is a SQL file in `supabase/migrations/`, applied in order and recorded in the project's
migration history. Nothing is ever changed by hand in the dashboard.

The Supabase CLI is a dev dependency, already logged in and linked to the `Dropship-1` project.
Docker is not needed. The CLI signs in with a temporary database role, so no database password
is needed either.

## Making a change

1. **Create the file.** `pnpm db:new <name>` creates `supabase/migrations/<timestamp>_<name>.sql`.
2. **Write the SQL.** Follow the rules in `20261011150000_tenancy_and_catalog_foundation.sql`:
   - every store-owned table has a `store_id uuid not null references stores (id)`,
   - apply the standard protections with `select app.enable_store_rls('public.<table>', '<visible to the storefront>')`,
   - cost and margin data never goes on a table the storefront can read (row-level security hides
     rows, not columns),
   - tables that hold customers' details (orders and the like) use `app.enable_private_store_rls`
     instead, so the storefront's `anon` role gets nothing, and the server's `storefront_server`
     role is granted only what it needs, each grant paired with a policy that pins the token's store,
   - money is an integer in minor units with a currency code,
   - every function pins `set search_path = ''`.
3. **Add seed rows.** Put rows for _both_ stores in `packages/db/src/testing/seed.ts`. The tests
   fail if a store-owned table has no rows for both stores, so they can never pass by checking
   nothing.
4. **Test locally.** `pnpm test` applies every migration to an embedded Postgres and runs the
   tenant-isolation tests and the structural checks. Fix anything it reports before going on.
5. **Dry run.** `pnpm db:dry-run` prints exactly which migrations would be applied.
6. **Apply.** `pnpm db:push`, or `pnpm db:sync` to do everything below in one go.
7. **Regenerate types.** `pnpm db:types` rewrites `packages/db/src/database.types.ts` from the
   hosted schema. Commit it with the migration.
8. **Audit the live project.** `pnpm db:advisors` runs Supabase's own security and performance
   advisors and fails on warnings. `pnpm db:check-remote` runs our structural rules and
   behavioural isolation scenarios against the real database.

`pnpm db:sync` runs 6 to 8 in order.

## Rules

- **Never edit a migration that has been applied.** Add a new one. History must match what ran.
- **Never `db push` something that has not passed `pnpm test`.**
- Check `pnpm db:status` to compare local migration files with what the hosted project has.

## What the live checks do

`pnpm db:check-remote` is read-only in effect. The behavioural scenarios run inside a single
statement that seeds two throwaway stores, acts as each kind of user (storefront, operator,
read-only operator, stranger) using the project's real `auth.jwt()` and API roles, and then
raises an exception on purpose. The exception rolls everything back, so nothing is committed. A
final query confirms nothing was left behind.

The Supabase CLI signs in with a temporary database role of a fixed name, so only one CLI process
can talk to the database at a time. The remote test config runs its files sequentially for that
reason.

## Moving to the Pro plan

Free projects pause after a week of inactivity. Before real customers or orders, upgrade the
project to Pro (README risk R7). Migrations, types and checks work the same on either plan.
