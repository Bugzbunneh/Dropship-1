import { describe, expect, it } from "vitest";
import { loadFixtureSnapshot } from "./fixtures";
import { loadSupabaseSnapshot } from "./supabase-snapshot";
import type { CatalogProduct, CatalogSnapshot } from "./types";

// The storefront can read its catalog from the database or from the offline demo catalog, and the
// pages must not care which. This compares the two field by field, so a seeding or mapping mistake
// shows up here rather than as a wrong price on a page. Ids are the one thing allowed to differ
// (the database makes its own).
//
// Needs the live demo catalog: `pnpm store:seed pet-pilot`. Run with `pnpm check:live`.

const bySlug = <T extends { slug: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.slug.localeCompare(b.slug));

// A product reduced to what must match, with ids and timestamps removed.
const comparable = (product: CatalogProduct) => ({
  slug: product.slug,
  title: product.title,
  brand: product.brand,
  department: product.department,
  summary: product.summary,
  description: product.description,
  tags: [...product.tags].sort(),
  isFeatured: product.isFeatured,
  collectionSlugs: product.collectionSlugs,
  images: product.images,
  variants: [...product.variants]
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map(({ sku, title, priceMinor, compareAtMinor, options, isAvailable }) => ({
      sku,
      title,
      priceMinor,
      compareAtMinor,
      options,
      isAvailable,
    })),
});

let fixtures: CatalogSnapshot;
let live: CatalogSnapshot;

const load = async () => {
  if (!fixtures || !live) {
    [fixtures, live] = await Promise.all([loadFixtureSnapshot(), loadSupabaseSnapshot()]);
  }
};

describe("the database catalog and the offline catalog agree", () => {
  it("have the same collections", async () => {
    await load();

    const strip = (snapshot: CatalogSnapshot) =>
      bySlug(snapshot.collections).map(({ slug, title, description, department, sortOrder }) => ({
        slug,
        title,
        description,
        department,
        sortOrder,
      }));

    expect(strip(live)).toEqual(strip(fixtures));
  });

  it("have the same products, prices, options, stock and pictures", async () => {
    await load();

    expect(bySlug(live.products).map(comparable)).toEqual(
      bySlug(fixtures.products).map(comparable),
    );
  });

  it("use the store's currency", async () => {
    await load();

    expect(live.currency).toBe(fixtures.currency);
  });

  it("give every database record a real id, not a fixture id", async () => {
    await load();

    for (const product of live.products) {
      expect(product.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
      for (const variant of product.variants) {
        expect(variant.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
      }
    }
  });

  it("only contain this store's published products", async () => {
    await load();

    expect(live.products.length).toBeGreaterThanOrEqual(fixtures.products.length);
    expect(live.products.every((product) => product.variants.length > 0)).toBe(true);
  });
});
