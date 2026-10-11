import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findTenancyViolations } from "./tenancy-checks";
import { createTestDatabase, queryRowsOf } from "./testing";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db.close();
});

describe("findTenancyViolations", () => {
  it("finds nothing wrong with the migrated schema", async () => {
    const violations = await findTenancyViolations(queryRowsOf(db));

    expect(violations).toEqual([]);
  });

  it("flags a table that skips row-level security and store_id", async () => {
    await db.exec("create table public.leaky (id int primary key, secret text)");

    const violations = await findTenancyViolations(queryRowsOf(db));
    await db.exec("drop table public.leaky");

    expect(violations).toContain("leaky: row-level security is not enabled");
    expect(violations).toContain("leaky: has no NOT NULL store_id column");
    expect(violations).toContain("leaky: store_id does not reference stores(id)");
    expect(violations).toContain("leaky: the anon role can write to it");
  });

  it("flags a store_id column that is nullable or unreferenced", async () => {
    await db.exec("create table public.loose (id int primary key, store_id uuid)");

    const violations = await findTenancyViolations(queryRowsOf(db));
    await db.exec("drop table public.loose");

    expect(violations).toContain("loose: has no NOT NULL store_id column");
    expect(violations).toContain("loose: store_id does not reference stores(id)");
  });

  it("flags privileges granted to everyone", async () => {
    await db.exec("create table public.open_table (id int)");
    await db.exec("grant select on public.open_table to public");

    const violations = await findTenancyViolations(queryRowsOf(db));
    await db.exec("drop table public.open_table");

    expect(violations).toContain("open_table: privileges are granted to PUBLIC");
  });

  it("flags security definer functions in the public schema", async () => {
    await db.exec(`
      create function public.sneaky() returns int
      language sql security definer as 'select 1'
    `);

    const violations = await findTenancyViolations(queryRowsOf(db));
    await db.exec("drop function public.sneaky()");

    expect(violations).toContain(
      "function sneaky: security definer functions must not live in public",
    );
  });

  it("is clean again once the bad objects are removed", async () => {
    const violations = await findTenancyViolations(queryRowsOf(db));

    expect(violations).toEqual([]);
  });
});
