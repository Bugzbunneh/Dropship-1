import type { PGlite } from "@electric-sql/pglite";
import { loadStoreSeed, type SeedCatalog } from "@dropship/stores";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildCatalogRemovalSql, buildCatalogSeedSql } from "./seed-catalog";
import { createTestDatabase, ids, rowsAs } from "./testing";

let db: PGlite;
let seed: SeedCatalog;

const SLUG = "seed-test";

const count = async (table: string): Promise<number> => {
  const result = await db.query<{ n: number }>(
    `select count(*)::int as n from public.${table} where store_id = '${ids.storeA}'`,
  );
  return result.rows[0]?.n ?? 0;
};

const productIds = async (): Promise<string[]> => {
  const result = await db.query<{ id: string }>(
    `select id from public.products where store_id = '${ids.storeA}' order by slug`,
  );
  return result.rows.map((row) => row.id);
};

beforeAll(async () => {
  db = await createTestDatabase();
  seed = await loadStoreSeed("pet-pilot");
  await db.exec(
    `insert into public.stores (id, slug, name, currency) values ('${ids.storeA}', '${SLUG}', 'Seed test', 'GBP')`,
  );
});

afterAll(async () => {
  await db.close();
});

describe("buildCatalogSeedSql", () => {
  it("fails clearly when the store has not been provisioned", async () => {
    await expect(db.exec(buildCatalogSeedSql("no-such-store", seed))).rejects.toThrow(
      /does not exist/,
    );
  });

  it("creates the whole catalog", async () => {
    await db.exec(buildCatalogSeedSql(SLUG, seed));

    expect(await count("collections")).toBe(seed.collections.length);
    expect(await count("products")).toBe(seed.products.length);
    const variantTotal = seed.products.reduce((sum, product) => sum + product.variants.length, 0);
    expect(await count("variants")).toBe(variantTotal);
    const imageTotal = seed.products.reduce((sum, product) => sum + (product.imageCount ?? 1), 0);
    expect(await count("product_images")).toBe(imageTotal);
    const linkTotal = seed.products.reduce((sum, product) => sum + product.collections.length, 0);
    expect(await count("product_collections")).toBe(linkTotal);
  });

  it("stores prices, sale prices and options faithfully", async () => {
    const result = await db.query<{
      price_minor: number;
      compare_at_price_minor: number;
      options: object;
    }>(
      `select price_minor, compare_at_price_minor, options from public.variants where sku = 'PP-CCB-L-OAT'`,
    );

    expect(result.rows[0]).toEqual({
      price_minor: 5499,
      compare_at_price_minor: 6999,
      options: { Size: "Large", Colour: "Oat" },
    });
  });

  it("uses the store's own currency", async () => {
    const result = await db.query<{ currency: string }>(
      "select distinct currency from public.variants",
    );

    expect(result.rows).toEqual([{ currency: "GBP" }]);
  });

  it("is idempotent: running it again changes nothing and keeps every id", async () => {
    const before = await productIds();

    await db.exec(buildCatalogSeedSql(SLUG, seed));

    expect(await productIds()).toEqual(before);
    expect(await count("products")).toBe(seed.products.length);
    expect(await count("variants")).toBe(
      seed.products.reduce((sum, product) => sum + product.variants.length, 0),
    );
  });

  it("removes demo products, variants and links that left the seed", async () => {
    const [first, ...rest] = seed.products;
    const smaller: SeedCatalog = {
      ...seed,
      products: [{ ...first!, variants: first!.variants.slice(0, 2) }, ...rest.slice(0, 4)],
    };

    await db.exec(buildCatalogSeedSql(SLUG, smaller));

    expect(await count("products")).toBe(5);
    expect(await count("variants")).toBe(
      smaller.products.reduce((sum, product) => sum + product.variants.length, 0),
    );
  });

  it("never deletes a product that is not demo data", async () => {
    await db.exec(`
      insert into public.products (store_id, slug, title, department, status, tags)
      values ('${ids.storeA}', 'real-product', 'Real product', 'dogs', 'active', array['supplier']);
    `);

    await db.exec(buildCatalogSeedSql(SLUG, seed));
    const real = await db.query(`select slug from public.products where slug = 'real-product'`);

    expect(real.rows).toHaveLength(1);
  });

  it("produces data the storefront can actually read, through row-level security", async () => {
    const storefront = { role: "anon", storeId: ids.storeA } as const;

    const products = await rowsAs(db, storefront, "select slug from public.products");
    const images = await rowsAs(db, storefront, "select path from public.product_images limit 3");

    expect(products.length).toBe(seed.products.length + 1);
    expect(images.every((row) => String(row["path"]).startsWith("/placeholder.svg?"))).toBe(true);
  });
});

describe("buildCatalogRemovalSql", () => {
  it("removes demo data and the seed's collections but keeps real products", async () => {
    await db.exec(buildCatalogRemovalSql(SLUG, seed));

    const remaining = await db.query<{ slug: string }>(
      `select slug from public.products where store_id = '${ids.storeA}'`,
    );
    expect(remaining.rows).toEqual([{ slug: "real-product" }]);
    expect(await count("collections")).toBe(0);
    expect(await count("variants")).toBe(0);
  });

  it("does nothing for a store that does not exist", async () => {
    await expect(db.exec(buildCatalogRemovalSql("no-such-store", seed))).resolves.toBeDefined();
  });
});
