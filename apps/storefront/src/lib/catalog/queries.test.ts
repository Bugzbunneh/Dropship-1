import { loadStoreSeed } from "@dropship/stores";
import { beforeAll, describe, expect, it } from "vitest";
import { snapshotFromSeed } from "./fixtures";
import { parseListingParams } from "./listing-params";
import {
  cartVariantInfo,
  collectionsOf,
  featuredCards,
  findCollection,
  findProduct,
  newestCards,
  relatedCards,
  runListing,
  saleCards,
  suggestProducts,
  toCard,
} from "./queries";
import type { CatalogProduct, CatalogSnapshot, ListingQuery } from "./types";

let snapshot: CatalogSnapshot;

beforeAll(async () => {
  const seed = await loadStoreSeed("pet-pilot");
  snapshot = snapshotFromSeed(seed, "GBP");
});

const query = (raw: Record<string, string | string[]>, options = {}): ListingQuery =>
  parseListingParams(raw, options);

const slugsOf = (result: { cards: { slug: string }[] }): string[] =>
  result.cards.map((card) => card.slug);

describe("toCard", () => {
  it("prices a product from its cheapest buyable variant", () => {
    const bed = findProduct(snapshot, "cloud-comfort-orthopaedic-dog-bed")!;

    const card = toCard(bed);

    expect(card.priceFromMinor).toBe(3499);
    expect(card.hasPriceRange).toBe(true);
    expect(card.inStock).toBe(true);
    expect(card.variantCount).toBe(6);
  });

  it("shows the sale price of the variant it is pricing from", () => {
    const puzzleBall = findProduct(snapshot, "treat-dispensing-puzzle-ball")!;
    const saleLead = findProduct(snapshot, "reflective-dog-lead")!;

    expect(toCard(puzzleBall).compareAtMinor).toBeNull();
    expect(toCard(saleLead).compareAtMinor).toBe(1299);
    expect(toCard(saleLead).priceFromMinor).toBe(999);
  });

  it("ignores sold-out variants when choosing the price", () => {
    const bed = findProduct(snapshot, "cloud-comfort-orthopaedic-dog-bed")!;
    const onlyExpensiveLeft: CatalogProduct = {
      ...bed,
      variants: bed.variants.map((variant) => ({
        ...variant,
        isAvailable: variant.priceMinor === 5499,
      })),
    };

    expect(toCard(onlyExpensiveLeft).priceFromMinor).toBe(5499);
  });

  it("still shows a price for a product that is entirely sold out, and marks it out of stock", () => {
    const hammock = findProduct(snapshot, "window-perch-hammock")!;
    const soldOut: CatalogProduct = {
      ...hammock,
      variants: hammock.variants.map((variant) => ({ ...variant, isAvailable: false })),
    };

    const card = toCard(soldOut);

    expect(card.inStock).toBe(false);
    expect(card.priceFromMinor).toBe(2199);
  });

  it("offers one-click add only when there is exactly one buyable choice", () => {
    const lead = toCard(findProduct(snapshot, "reflective-dog-lead")!);
    const bed = toCard(findProduct(snapshot, "cloud-comfort-orthopaedic-dog-bed")!);
    const soldOutLead = toCard({
      ...findProduct(snapshot, "reflective-dog-lead")!,
      variants: findProduct(snapshot, "reflective-dog-lead")!.variants.map((v) => ({
        ...v,
        isAvailable: false,
      })),
    });

    expect(lead.quickAddVariantId).toBe("fx-var-PP-RDL");
    expect(bed.quickAddVariantId).toBeNull();
    expect(soldOutLead.quickAddVariantId).toBeNull();
  });

  it("does not claim a price range for a single-price product", () => {
    expect(toCard(findProduct(snapshot, "waterproof-travel-blanket")!).hasPriceRange).toBe(false);
  });

  it("uses the first image", () => {
    const card = toCard(findProduct(snapshot, "tall-sisal-scratching-post")!);

    expect(card.image?.path).toContain("/placeholder.svg?");
    expect(card.image?.width).toBe(800);
  });
});

describe("collections", () => {
  it("lists a department's collections in display order with product counts", () => {
    const dogs = collectionsOf(snapshot, "dogs");

    expect(dogs.map((c) => c.slug)).toEqual([
      "dog-beds",
      "dog-toys",
      "dog-walking",
      "dog-feeding",
      "dog-treats",
      "dog-grooming",
    ]);
    expect(dogs.every((collection) => collection.productCount > 0)).toBe(true);
  });

  it("counts a product in every collection it belongs to", () => {
    const beds = collectionsOf(snapshot, "dogs").find((c) => c.slug === "dog-beds");

    // two beds plus the travel blanket, which also sits in walking
    expect(beds?.productCount).toBe(3);
  });

  it("finds a collection only within its own department", () => {
    expect(findCollection(snapshot, "dogs", "dog-beds")?.title).toBe("Beds & Blankets");
    expect(findCollection(snapshot, "cats", "dog-beds")).toBeUndefined();
  });

  it("leaves out collections with no products", () => {
    const withEmpty: CatalogSnapshot = {
      ...snapshot,
      collections: [
        ...snapshot.collections,
        {
          id: "x",
          slug: "empty",
          title: "Empty",
          description: null,
          department: "dogs",
          sortOrder: 99,
        },
      ],
    };

    expect(collectionsOf(withEmpty, "dogs").map((c) => c.slug)).not.toContain("empty");
  });
});

describe("runListing", () => {
  it("shows only the department's products", () => {
    const dogs = runListing(snapshot, query({}, { department: "dogs" }));
    const cats = runListing(snapshot, query({}, { department: "cats" }));

    expect(dogs.total + cats.total).toBe(snapshot.products.length);
    expect(dogs.cards.every((card) => card.department === "dogs")).toBe(true);
  });

  it("filters by collection, including products that sit in several", () => {
    const result = runListing(snapshot, query({}, { department: "dogs", collection: "dog-beds" }));

    expect(slugsOf(result).sort()).toEqual([
      "cloud-comfort-orthopaedic-dog-bed",
      "cosy-donut-calming-dog-bed",
      "waterproof-travel-blanket",
    ]);
  });

  it("puts featured products first and sold-out products last by default", () => {
    const result = runListing(snapshot, query({}, { department: "dogs" }), 100);

    const featuredFlags = result.cards
      .filter((card) => card.inStock)
      .map((card) => card.isFeatured);
    const firstNonFeatured = featuredFlags.indexOf(false);
    expect(featuredFlags.slice(firstNonFeatured).every((flag) => !flag)).toBe(true);
    expect(result.cards.slice(-1)[0]?.inStock).toBe(true);
  });

  it("filters by brand and counts brands without applying the brand filter to them", () => {
    const result = runListing(snapshot, query({ brand: "Wagwell" }, { department: "dogs" }), 100);

    expect(result.cards.every((card) => card.brand === "Wagwell")).toBe(true);
    expect(result.facets.brands.map((b) => b.name)).toContain("Fetchworks");
    expect(result.activeFilterCount).toBe(1);
  });

  it("allows several brands at once", () => {
    const result = runListing(
      snapshot,
      query({ brand: ["Wagwell", "Fetchworks"] }, { department: "dogs" }),
      100,
    );

    expect(new Set(result.cards.map((card) => card.brand))).toEqual(
      new Set(["Wagwell", "Fetchworks"]),
    );
  });

  it("filters by price range in whole pounds", () => {
    const result = runListing(
      snapshot,
      query({ min: "10", max: "20" }, { department: "dogs" }),
      100,
    );

    expect(result.cards.length).toBeGreaterThan(0);
    for (const card of result.cards) {
      expect(card.priceFromMinor).toBeGreaterThanOrEqual(1000);
      expect(card.priceFromMinor).toBeLessThanOrEqual(2000);
    }
  });

  it("reports price bounds of the whole scope, whatever filters are on", () => {
    const filtered = runListing(snapshot, query({ min: "30" }, { department: "dogs" }));
    const unfiltered = runListing(snapshot, query({}, { department: "dogs" }));

    expect(filtered.facets.priceMinMinor).toBe(unfiltered.facets.priceMinMinor);
    expect(filtered.facets.priceMaxMinor).toBe(unfiltered.facets.priceMaxMinor);
    expect(unfiltered.facets.priceMinMinor % 100).toBe(0);
  });

  it("filters to in-stock and on-sale products", () => {
    const sale = runListing(snapshot, query({ sale: "1" }), 100);
    const stocked = runListing(snapshot, query({ stock: "1" }), 100);

    expect(sale.cards.length).toBeGreaterThan(0);
    expect(sale.cards.every((card) => card.compareAtMinor !== null)).toBe(true);
    expect(stocked.cards.every((card) => card.inStock)).toBe(true);
  });

  it("sorts by price in both directions, keeping sold-out products last", () => {
    const low = runListing(snapshot, query({ sort: "price-asc" }, { department: "cats" }), 100);
    const high = runListing(snapshot, query({ sort: "price-desc" }, { department: "cats" }), 100);

    const prices = (cards: { priceFromMinor: number }[]) =>
      cards.map((card) => card.priceFromMinor);
    expect(prices(low.cards)).toEqual([...prices(low.cards)].sort((a, b) => a - b));
    expect(prices(high.cards)).toEqual([...prices(high.cards)].sort((a, b) => b - a));
  });

  it("sorts by name and by newest", () => {
    const byName = runListing(snapshot, query({ sort: "name" }, { department: "dogs" }), 100);
    const newest = runListing(snapshot, query({ sort: "newest" }, { department: "dogs" }), 100);

    const titles = byName.cards.map((card) => card.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    expect(newest.cards[0]?.slug).toBe("cloud-comfort-orthopaedic-dog-bed");
  });

  it("paginates, and clamps a page that is too high", () => {
    const first = runListing(snapshot, query({}, { department: "dogs" }), 5);
    const beyond = runListing(snapshot, query({ page: "99" }, { department: "dogs" }), 5);

    expect(first.cards).toHaveLength(5);
    expect(first.pageCount).toBe(Math.ceil(first.total / 5));
    expect(beyond.page).toBe(first.pageCount);
    expect(beyond.cards.length).toBeGreaterThan(0);
  });

  it("returns an empty, well-formed result when nothing matches", () => {
    const result = runListing(snapshot, query({ min: "9000" }, { department: "dogs" }));

    expect(result.total).toBe(0);
    expect(result.cards).toEqual([]);
    expect(result.pageCount).toBe(1);
  });
});

describe("search", () => {
  const search = (text: string, extra: Record<string, string> = {}) =>
    runListing(snapshot, query({ q: text, ...extra }, { allowSearch: true }), 100);

  it("finds products by title words", () => {
    expect(slugsOf(search("sisal scratching"))).toContain("tall-sisal-scratching-post");
  });

  it("treats plurals the same as singulars", () => {
    expect(slugsOf(search("beds"))).toEqual(slugsOf(search("bed")));
    expect(slugsOf(search("harnesses"))).toContain("padded-everyday-harness");
  });

  it("matches the start of the last word, for search as you type", () => {
    expect(slugsOf(search("scrat"))).toContain("tall-sisal-scratching-post");
  });

  it("needs every word to match", () => {
    const results = slugsOf(search("dog bed"));

    expect(results).toContain("cosy-donut-calming-dog-bed");
    expect(results.every((slug) => !slug.startsWith("plush-round-cat"))).toBe(true);
  });

  it("finds by brand and by collection", () => {
    expect(slugsOf(search("wagwell")).length).toBeGreaterThanOrEqual(4);
    expect(slugsOf(search("grooming"))).toContain("soft-slicker-brush");
  });

  it("ranks title matches above description matches", () => {
    const results = slugsOf(search("brush"));

    expect(results[0]).toBe("soft-slicker-brush");
  });

  it("returns nothing for words that match nothing", () => {
    expect(search("zzzqqq").total).toBe(0);
  });

  it("ignores accents and punctuation", () => {
    expect(slugsOf(search("Orthopædic!"))).toEqual([]);
    expect(slugsOf(search("  DOG   bed  "))).toEqual(slugsOf(search("dog bed")));
  });

  it("combines with filters", () => {
    const results = search("bed", { brand: "Hearth & Paw" });

    expect(results.cards.length).toBeGreaterThan(0);
    expect(results.cards.every((card) => card.brand === "Hearth & Paw")).toBe(true);
  });

  it("sorts by best match by default", () => {
    expect(query({ q: "bed" }, { allowSearch: true }).sort).toBe("relevance");
  });

  it("suggests products as the customer types", () => {
    const suggestions = suggestProducts(snapshot, "cat tr", 5);

    expect(suggestions[0]?.slug).toBe("multi-level-cat-tree");
    expect(suggestProducts(snapshot, "", 5)).toEqual([]);
    expect(suggestProducts(snapshot, "bed", 3)).toHaveLength(3);
  });
});

describe("home page lists", () => {
  it("feature in-stock products, featured first", () => {
    const featured = featuredCards(snapshot, { limit: 8 });

    expect(featured).toHaveLength(8);
    expect(featured.every((card) => card.inStock && card.isFeatured)).toBe(true);
  });

  it("can be limited to a department", () => {
    const cats = featuredCards(snapshot, { department: "cats", limit: 4 });

    expect(cats.every((card) => card.department === "cats")).toBe(true);
  });

  it("find reduced-price products and the newest arrivals", () => {
    expect(saleCards(snapshot, { limit: 10 }).length).toBeGreaterThan(0);
    expect(newestCards(snapshot, { limit: 4 })).toHaveLength(4);
  });
});

describe("relatedCards", () => {
  it("never includes the product itself and favours shared collections", () => {
    const bed = findProduct(snapshot, "cosy-donut-calming-dog-bed")!;

    const related = relatedCards(snapshot, bed, 4);

    expect(related).toHaveLength(4);
    expect(related.map((card) => card.slug)).not.toContain(bed.slug);
    expect(related[0]?.slug).toBe("cloud-comfort-orthopaedic-dog-bed");
  });

  it("stays within the same department when the collection is small", () => {
    const fountain = findProduct(snapshot, "flowing-water-fountain-2l")!;

    const related = relatedCards(snapshot, fountain, 3);

    expect(related.every((card) => card.department === "cats")).toBe(true);
  });
});

describe("cartVariantInfo", () => {
  it("returns current details for known variants and drops unknown ids", () => {
    const info = cartVariantInfo(snapshot, [
      "fx-var-PP-CCB-M-OAT",
      "fx-var-PP-RDL",
      "not-a-variant",
    ]);

    expect(info.map((line) => line.variantId).sort()).toEqual([
      "fx-var-PP-CCB-M-OAT",
      "fx-var-PP-RDL",
    ]);
    const lead = info.find((line) => line.variantId === "fx-var-PP-RDL")!;
    expect(lead.priceMinor).toBe(999);
    expect(lead.compareAtMinor).toBe(1299);
    expect(lead.productSlug).toBe("reflective-dog-lead");
  });

  it("reports sold-out variants as unavailable", () => {
    const [line] = cartVariantInfo(snapshot, ["fx-var-PP-CCB-L-SLATE"]);

    expect(line?.isAvailable).toBe(false);
  });
});
