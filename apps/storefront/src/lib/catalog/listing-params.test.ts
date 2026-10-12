import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  listingHref,
  PAGE_SIZE,
  parseListingParams,
  toListingSearchParams,
  withoutPrice,
} from "./listing-params";

describe("parseListingParams", () => {
  it("defaults to featured, page 1 and no filters", () => {
    const query = parseListingParams({}, { department: "dogs" });

    expect(query).toEqual({
      department: "dogs",
      brands: [],
      inStockOnly: false,
      onSaleOnly: false,
      sort: "featured",
      page: 1,
    });
  });

  it("reads every filter", () => {
    const query = parseListingParams({
      brand: ["Wagwell", "Fetchworks"],
      min: "10",
      max: "30",
      stock: "1",
      sale: "1",
      sort: "price-asc",
      page: "3",
    });

    expect(query.brands).toEqual(["Wagwell", "Fetchworks"]);
    expect(query.minPriceMinor).toBe(1000);
    expect(query.maxPriceMinor).toBe(3000);
    expect(query.inStockOnly).toBe(true);
    expect(query.onSaleOnly).toBe(true);
    expect(query.sort).toBe("price-asc");
    expect(query.page).toBe(3);
  });

  it("only reads ?q= where search is allowed", () => {
    expect(parseListingParams({ q: "bed" }).search).toBeUndefined();
    expect(parseListingParams({ q: "bed" }, { allowSearch: true }).search).toBe("bed");
  });

  it("defaults to best match when searching, and refuses it otherwise", () => {
    expect(parseListingParams({ q: "bed" }, { allowSearch: true }).sort).toBe("relevance");
    expect(parseListingParams({ sort: "relevance" }).sort).toBe("featured");
  });

  it("ignores junk instead of failing", () => {
    const query = parseListingParams({
      min: "abc",
      max: "-5",
      page: "-2",
      sort: "chaos",
      stock: "yes",
      brand: ["", "  "],
    });

    expect(query.minPriceMinor).toBeUndefined();
    expect(query.maxPriceMinor).toBeUndefined();
    expect(query.page).toBe(1);
    expect(query.sort).toBe("featured");
    expect(query.inStockOnly).toBe(false);
    expect(query.brands).toEqual([]);
  });

  it("caps page numbers, search length and the number of brands", () => {
    const query = parseListingParams(
      { page: "999999", q: "x".repeat(500), brand: Array.from({ length: 40 }, (_, i) => `b${i}`) },
      { allowSearch: true },
    );

    expect(query.page).toBe(200);
    expect(query.search?.length).toBe(80);
    expect(query.brands).toHaveLength(10);
  });

  it("collapses whitespace in a search", () => {
    expect(parseListingParams({ q: "  dog    bed " }, { allowSearch: true }).search).toBe(
      "dog bed",
    );
  });

  it("removes duplicate brands", () => {
    expect(parseListingParams({ brand: ["Wagwell", "Wagwell"] }).brands).toEqual(["Wagwell"]);
  });
});

describe("toListingSearchParams", () => {
  it("leaves out defaults", () => {
    expect(toListingSearchParams(parseListingParams({})).toString()).toBe("");
    expect(
      toListingSearchParams(parseListingParams({ q: "bed" }, { allowSearch: true })).toString(),
    ).toBe("q=bed");
  });

  it("round-trips a full set of filters", () => {
    const original = parseListingParams({
      brand: ["Wagwell"],
      min: "5",
      max: "50",
      stock: "1",
      sale: "1",
      sort: "price-desc",
    });

    const params = toListingSearchParams(original);
    const reparsed = parseListingParams(
      Object.fromEntries(params.entries()) as Record<string, string>,
    );

    expect(reparsed).toEqual(original);
  });

  it("drops the page unless asked to keep it", () => {
    const query = parseListingParams({ page: "4", sort: "name" });

    expect(toListingSearchParams(query).has("page")).toBe(false);
    expect(toListingSearchParams(query, true).get("page")).toBe("4");
  });
});

describe("listingHref and activeFilterCount", () => {
  it("builds links with or without a query string", () => {
    expect(listingHref("/dogs", parseListingParams({}))).toBe("/dogs");
    expect(listingHref("/dogs", parseListingParams({ stock: "1" }))).toBe("/dogs?stock=1");
  });

  it("can drop just the price range from a query", () => {
    const query = parseListingParams({ min: "5", max: "10", stock: "1" });

    const without = withoutPrice(query);

    expect(without.minPriceMinor).toBeUndefined();
    expect(without.maxPriceMinor).toBeUndefined();
    expect(without.inStockOnly).toBe(true);
    expect(query.minPriceMinor).toBe(500);
  });

  it("counts price as one filter however many ends are set", () => {
    const query = parseListingParams({ min: "5", max: "10", brand: ["A", "B"], stock: "1" });

    expect(activeFilterCount(query)).toBe(4);
  });

  it("uses a page size that suits a 2, 3 and 4 column grid", () => {
    expect(PAGE_SIZE % 2).toBe(0);
    expect(PAGE_SIZE % 3).toBe(0);
    expect(PAGE_SIZE % 4).toBe(0);
  });
});
