import { describe, expect, it } from "vitest";
import {
  loadStoreConfig,
  loadStoreSeed,
  parsePlaceholderParams,
  placeholderPath,
  storeSlugs,
} from "./index";

const duplicates = (values: string[]): string[] =>
  values.filter((value, index) => values.indexOf(value) !== index);

describe("every store's demo catalog", () => {
  it.each(storeSlugs)("%s: has unique slugs and SKUs", async (slug) => {
    const seed = await loadStoreSeed(slug);

    expect(duplicates(seed.products.map((product) => product.slug))).toEqual([]);
    expect(duplicates(seed.collections.map((collection) => collection.slug))).toEqual([]);
    const skus = seed.products.flatMap((product) => product.variants.map((variant) => variant.sku));
    expect(duplicates(skus)).toEqual([]);
  });

  it.each(storeSlugs)("%s: only uses departments the store defines", async (slug) => {
    const config = await loadStoreConfig(slug);
    const seed = await loadStoreSeed(slug);
    const departments = config.departments.map((department) => department.slug);

    for (const collection of seed.collections) {
      expect(departments, `collection ${collection.slug}`).toContain(collection.department);
    }
    for (const product of seed.products) {
      expect(departments, `product ${product.slug}`).toContain(product.department);
    }
  });

  it.each(storeSlugs)(
    "%s: products only join collections of their own department",
    async (slug) => {
      const seed = await loadStoreSeed(slug);
      const collectionBySlug = new Map(seed.collections.map((c) => [c.slug, c]));

      for (const product of seed.products) {
        expect(product.collections.length, `${product.slug} needs a collection`).toBeGreaterThan(0);
        for (const collectionSlug of product.collections) {
          const collection = collectionBySlug.get(collectionSlug);
          expect(collection, `${product.slug} -> ${collectionSlug}`).toBeDefined();
          expect(collection?.department, `${product.slug} -> ${collectionSlug}`).toBe(
            product.department,
          );
        }
      }
    },
  );

  it.each(storeSlugs)(
    "%s: prices are positive whole numbers and sales are real reductions",
    async (slug) => {
      const seed = await loadStoreSeed(slug);

      for (const product of seed.products) {
        for (const variant of product.variants) {
          expect(Number.isInteger(variant.priceMinor), variant.sku).toBe(true);
          expect(variant.priceMinor, variant.sku).toBeGreaterThan(0);
          if (variant.compareAtMinor !== undefined) {
            expect(variant.compareAtMinor, variant.sku).toBeGreaterThan(variant.priceMinor);
          }
        }
      }
    },
  );

  it.each(storeSlugs)("%s: every product has a variant that can be bought", async (slug) => {
    const seed = await loadStoreSeed(slug);

    for (const product of seed.products) {
      const buyable = product.variants.filter((variant) => variant.isAvailable !== false);
      expect(buyable.length, product.slug).toBeGreaterThan(0);
    }
  });

  it.each(storeSlugs)("%s: variants of one product offer the same option names", async (slug) => {
    const seed = await loadStoreSeed(slug);

    for (const product of seed.products) {
      const optionSets = product.variants.map((variant) =>
        Object.keys(variant.options ?? {})
          .sort()
          .join("|"),
      );
      expect(new Set(optionSets).size, product.slug).toBe(1);
    }
  });

  it.each(storeSlugs)("%s: is marked as demo data throughout", async (slug) => {
    const seed = await loadStoreSeed(slug);

    for (const product of seed.products) {
      expect(product.tags, product.slug).toContain("demo");
    }
  });

  it.each(storeSlugs)("%s: is big enough to exercise filters and pagination", async (slug) => {
    const config = await loadStoreConfig(slug);
    const seed = await loadStoreSeed(slug);

    expect(seed.products.length).toBeGreaterThanOrEqual(24);
    for (const department of config.departments) {
      const inDepartment = seed.products.filter(
        (product) => product.department === department.slug,
      );
      expect(inDepartment.length, department.slug).toBeGreaterThanOrEqual(8);
      expect(
        inDepartment.filter((product) => product.featured).length,
        department.slug,
      ).toBeGreaterThanOrEqual(3);
    }
    const brands = new Set(seed.products.map((product) => product.brand));
    expect(brands.size).toBeGreaterThanOrEqual(4);
    expect(seed.products.some((product) => product.variants.some((v) => v.compareAtMinor))).toBe(
      true,
    );
    expect(
      seed.products.some((product) => product.variants.some((v) => v.isAvailable === false)),
    ).toBe(true);
  });
});

describe("placeholder image paths", () => {
  const spec = { department: "dogs", category: "dog-beds", title: "Cloud Comfort Bed", index: 2 };

  it("round-trip through the query string", () => {
    const path = placeholderPath(spec);

    const parsed = parsePlaceholderParams(new URL(path, "https://example.com").searchParams);

    expect(parsed).toEqual(spec);
  });

  it("refuse malformed input instead of drawing it", () => {
    const bad = (query: string) => parsePlaceholderParams(new URLSearchParams(query));

    expect(bad("d=dogs&c=dog-beds&t=&n=1")).toBeUndefined();
    expect(bad("d=DOGS&c=dog-beds&t=x&n=1")).toBeUndefined();
    expect(bad("d=dogs&c=../../etc&t=x&n=1")).toBeUndefined();
    expect(bad("d=dogs&c=dog-beds&t=x&n=99")).toBeUndefined();
    expect(bad(`d=dogs&c=dog-beds&t=${"x".repeat(200)}&n=1`)).toBeUndefined();
  });
});
