import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listStoreOwnedTables } from "./tenancy-checks";
import {
  createTestDatabase,
  ids,
  queryRowsOf,
  rowsAs,
  seedTwoStores,
  type Session,
} from "./testing";

let db: PGlite;
let storeOwnedTables: string[];

beforeAll(async () => {
  db = await createTestDatabase();
  await seedTwoStores(db);
  storeOwnedTables = await listStoreOwnedTables(queryRowsOf(db));
});

afterAll(async () => {
  await db.close();
});

const isPermissionDenied = (error: unknown): boolean =>
  error instanceof Error && error.message.includes("permission denied");

// The distinct store ids a session can see in a table. A table the role may not even select from
// reveals nothing, which is as safe as an empty result.
const visibleStoreIds = async (session: Session, table: string): Promise<string[]> => {
  try {
    const rows = await rowsAs(db, session, `select distinct store_id from public.${table}`);
    return rows.map((row) => String(row["store_id"]));
  } catch (error) {
    if (isPermissionDenied(error)) {
      return [];
    }
    throw error;
  }
};

const titlesAs = async (session: Session, table: string): Promise<string[]> => {
  const rows = await rowsAs(db, session, `select title from public.${table} order by title`);
  return rows.map((row) => String(row["title"]));
};

const storefrontA: Session = { role: "anon", storeId: ids.storeA };
const storefrontB: Session = { role: "anon", storeId: ids.storeB };
const ownerA: Session = { role: "authenticated", userId: ids.ownerA };
const viewerA: Session = { role: "authenticated", userId: ids.viewerA };
const ownerB: Session = { role: "authenticated", userId: ids.ownerB };
const signedInCustomerOnA: Session = {
  role: "authenticated",
  userId: ids.nobody,
  storeId: ids.storeA,
};

describe("the test setup is not vacuous", () => {
  it("finds the store-owned tables", () => {
    expect(storeOwnedTables).toContain("products");
    expect(storeOwnedTables).toContain("variants");
    expect(storeOwnedTables.length).toBeGreaterThanOrEqual(5);
  });

  it("has seed rows for both stores in every store-owned table", async () => {
    for (const table of storeOwnedTables) {
      const rows = await db.query<{ store_id: string }>(
        `select distinct store_id from public.${table}`,
      );
      const storeIds = rows.rows.map((row) => row.store_id).sort();

      expect(storeIds, `${table} needs seed rows for both stores`).toEqual(
        [ids.storeA, ids.storeB].sort(),
      );
    }
  });

  it("lets the service role see every store", async () => {
    const rows = await rowsAs(
      db,
      { role: "service_role" },
      "select distinct store_id from public.products",
    );

    expect(rows).toHaveLength(2);
  });
});

describe("reads never cross stores, in every store-owned table", () => {
  it("storefront A sees only store A", async () => {
    for (const table of storeOwnedTables) {
      const seen = await visibleStoreIds(storefrontA, table);

      expect(seen, table).not.toContain(ids.storeB);
    }
  });

  it("storefront B sees only store B", async () => {
    for (const table of storeOwnedTables) {
      const seen = await visibleStoreIds(storefrontB, table);

      expect(seen, table).not.toContain(ids.storeA);
    }
  });

  it("an operator of A sees only store A, and does see some of it", async () => {
    for (const table of storeOwnedTables) {
      const seen = await visibleStoreIds(ownerA, table);

      expect(seen, table).toEqual([ids.storeA]);
    }
  });

  it("an operator of B sees only store B", async () => {
    for (const table of storeOwnedTables) {
      const seen = await visibleStoreIds(ownerB, table);

      expect(seen, table).toEqual([ids.storeB]);
    }
  });

  it("a read-only operator of A sees only store A", async () => {
    for (const table of storeOwnedTables) {
      const seen = await visibleStoreIds(viewerA, table);

      expect(seen, table).not.toContain(ids.storeB);
    }
  });

  it("a request with no store claim and no operator role sees nothing", async () => {
    const anonymous: Session = { role: "anon" };
    const strangerWithoutClaim: Session = { role: "authenticated", userId: ids.nobody };

    for (const table of storeOwnedTables) {
      expect(await visibleStoreIds(anonymous, table), table).toEqual([]);
      expect(await visibleStoreIds(strangerWithoutClaim, table), table).toEqual([]);
    }
  });
});

describe("the storefront only sees published data", () => {
  it("shows active products and hides drafts", async () => {
    expect(await titlesAs(storefrontA, "products")).toEqual(["Dog bed"]);
    expect(await titlesAs(storefrontB, "products")).toEqual(["Cat tree"]);
  });

  it("shows published collections and hides the rest", async () => {
    expect(await titlesAs(storefrontA, "collections")).toEqual(["Dogs"]);
  });

  it("shows variants of active products only", async () => {
    expect(await titlesAs(storefrontA, "variants")).toEqual(["Medium"]);
  });

  it("shows product-collection links only when both sides are visible", async () => {
    const links = await rowsAs(
      db,
      storefrontA,
      "select product_id from public.product_collections",
    );

    expect(links.map((row) => row["product_id"])).toEqual([ids.productActiveA]);
  });

  it("treats a signed-in customer on store A like any storefront visitor", async () => {
    expect(await titlesAs(signedInCustomerOnA, "products")).toEqual(["Dog bed"]);
  });

  it("lets operators see drafts of their own store", async () => {
    expect(await titlesAs(ownerA, "products")).toEqual(["Dog bed", "Dog coat"]);
    expect(await titlesAs(viewerA, "products")).toEqual(["Dog bed", "Dog coat"]);
  });
});

describe("writes", () => {
  // No `returning` here on purpose: returning rows also checks the select policies, which would
  // let a broken insert policy slip through unnoticed.
  const insertProduct = (storeId: string) =>
    `insert into public.products (store_id, slug, title, department) values ('${storeId}', 'new-thing', 'New thing', 'dogs')`;

  it("lets an operator write to their own store", async () => {
    const rows = await rowsAs(db, ownerA, `${insertProduct(ids.storeA)} returning id`);

    expect(rows).toHaveLength(1);
  });

  it("stops an operator inserting into another store", async () => {
    const attempt = rowsAs(db, ownerA, insertProduct(ids.storeB));

    await expect(attempt).rejects.toThrow(/row-level security/);
  });

  it("stops an operator moving a row into another store", async () => {
    const attempt = rowsAs(
      db,
      ownerA,
      `update public.products set store_id = '${ids.storeB}' where id = '${ids.productActiveA}'`,
    );

    await expect(attempt).rejects.toThrow(/row-level security/);
  });

  it("silently ignores updates and deletes aimed at another store's rows", async () => {
    const updated = await rowsAs(
      db,
      ownerA,
      `update public.products set title = 'Hacked' where id = '${ids.productActiveB}' returning id`,
    );
    const deleted = await rowsAs(
      db,
      ownerA,
      `delete from public.products where id = '${ids.productActiveB}' returning id`,
    );

    expect(updated).toEqual([]);
    expect(deleted).toEqual([]);
  });

  it("stops a read-only operator writing at all", async () => {
    const attempt = rowsAs(db, viewerA, insertProduct(ids.storeA));

    await expect(attempt).rejects.toThrow(/row-level security/);
  });

  it("stops a read-only operator updating rows", async () => {
    const updated = await rowsAs(
      db,
      viewerA,
      `update public.products set title = 'Nope' where id = '${ids.productActiveA}' returning id`,
    );

    expect(updated).toEqual([]);
  });

  it("gives the storefront no write access anywhere", async () => {
    for (const table of storeOwnedTables) {
      const attempt = rowsAs(db, storefrontA, `delete from public.${table}`);

      await expect(attempt, table).rejects.toThrow(/permission denied/);
    }
  });

  it("gives a signed-in customer no write access to the catalog", async () => {
    const attempt = rowsAs(db, signedInCustomerOnA, insertProduct(ids.storeA));

    await expect(attempt).rejects.toThrow(/row-level security/);
  });
});

describe("stores and operators", () => {
  it("shows the storefront only its own store row", async () => {
    const rows = await rowsAs(db, storefrontA, "select id from public.stores");

    expect(rows.map((row) => row["id"])).toEqual([ids.storeA]);
  });

  it("shows an operator only the stores they work on", async () => {
    const rows = await rowsAs(db, ownerA, "select id from public.stores");

    expect(rows.map((row) => row["id"])).toEqual([ids.storeA]);
  });

  it("lets nobody but the service role create or change stores", async () => {
    const attempt = rowsAs(
      db,
      ownerA,
      "insert into public.stores (slug, name, currency) values ('store-c', 'Store C', 'GBP')",
    );

    await expect(attempt).rejects.toThrow(/permission denied/);
  });

  it("shows a user only their own memberships", async () => {
    const rows = await rowsAs(db, ownerA, "select user_id from public.operators");

    expect(rows.map((row) => row["user_id"])).toEqual([ids.ownerA]);
  });

  it("stops users granting themselves access", async () => {
    const attempt = rowsAs(
      db,
      signedInCustomerOnA,
      `insert into public.operators (user_id, store_id, role) values ('${ids.nobody}', '${ids.storeA}', 'owner')`,
    );

    await expect(attempt).rejects.toThrow(/permission denied/);
  });

  it("hides memberships from the storefront", async () => {
    const attempt = rowsAs(db, storefrontA, "select * from public.operators");

    await expect(attempt).rejects.toThrow(/permission denied/);
  });
});

describe("cross-store references are impossible at the database level", () => {
  it("rejects a variant that points at another store's product", async () => {
    const attempt = db.query(
      `insert into public.variants (store_id, product_id, sku, title, price_minor, currency)
       values ('${ids.storeA}', '${ids.productActiveB}', 'X-1', 'Mixed up', 100, 'GBP')`,
    );

    await expect(attempt).rejects.toThrow(/foreign key/);
  });

  it("rejects linking a product to another store's collection", async () => {
    const attempt = db.query(
      `insert into public.product_collections (store_id, product_id, collection_id)
       values ('${ids.storeA}', '${ids.productDraftA}', '${ids.collectionPublishedB}')`,
    );

    await expect(attempt).rejects.toThrow(/foreign key/);
  });
});

describe("money", () => {
  it("refuses negative prices", async () => {
    const attempt = db.query(
      `insert into public.variants (store_id, product_id, sku, title, price_minor, currency)
       values ('${ids.storeA}', '${ids.productActiveA}', 'NEG-1', 'Negative', -1, 'GBP')`,
    );

    await expect(attempt).rejects.toThrow(/check constraint/);
  });
});
