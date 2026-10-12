import type { ListingQuery, SortKey } from "./types";

// Filters live in the URL (so pages can be shared, bookmarked and cached), written the same way
// everywhere: ?brand=Wagwell&min=10&max=30&stock=1&sale=1&sort=price-asc&page=2&q=bed
// Prices in the URL are whole pounds; internally everything is minor units.

type RawParams = Record<string, string | string[] | undefined>;

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Best match",
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name: A to Z",
};

const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

export const PAGE_SIZE = 24;
const MAX_PAGE = 200;
const MAX_BRANDS = 10;
const MAX_SEARCH_LENGTH = 80;
const MAX_PRICE_POUNDS = 100_000;

const firstValue = (raw: string | string[] | undefined): string | undefined =>
  Array.isArray(raw) ? raw[0] : raw;

const allValues = (raw: string | string[] | undefined): string[] => {
  if (raw === undefined) {
    return [];
  }
  return Array.isArray(raw) ? raw : [raw];
};

const wholePounds = (raw: string | undefined): number | undefined => {
  if (raw === undefined || !/^\d{1,6}$/.test(raw)) {
    return undefined;
  }
  const pounds = Number(raw);
  return pounds <= MAX_PRICE_POUNDS ? pounds : undefined;
};

const isSortKey = (value: string | undefined): value is SortKey =>
  value !== undefined && (SORT_KEYS as string[]).includes(value);

const cleanSearch = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_LENGTH);
  return trimmed ? trimmed : undefined;
};

type ParseOptions = {
  department?: string;
  collection?: string;
  // search pages read ?q= and default to "best match"
  allowSearch?: boolean;
};

// Reads the URL into a query. Anything unknown or malformed is ignored rather than rejected, so a
// mangled link still shows a page.
export const parseListingParams = (raw: RawParams, options: ParseOptions = {}): ListingQuery => {
  const search = options.allowSearch ? cleanSearch(firstValue(raw["q"])) : undefined;
  const requestedSort = firstValue(raw["sort"]);
  const defaultSort: SortKey = search ? "relevance" : "featured";
  // relevance only makes sense when there is a search to be relevant to
  const sort =
    isSortKey(requestedSort) && (requestedSort !== "relevance" || search)
      ? requestedSort
      : defaultSort;

  const minPounds = wholePounds(firstValue(raw["min"]));
  const maxPounds = wholePounds(firstValue(raw["max"]));
  const pageNumber = Number(firstValue(raw["page"]) ?? "1");
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? Math.min(pageNumber, MAX_PAGE) : 1;

  const brands = [
    ...new Set(
      allValues(raw["brand"])
        .map((brand) => brand.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_BRANDS);

  return {
    ...(options.department ? { department: options.department } : {}),
    ...(options.collection ? { collection: options.collection } : {}),
    ...(search ? { search } : {}),
    brands,
    ...(minPounds !== undefined ? { minPriceMinor: minPounds * 100 } : {}),
    ...(maxPounds !== undefined ? { maxPriceMinor: maxPounds * 100 } : {}),
    inStockOnly: firstValue(raw["stock"]) === "1",
    onSaleOnly: firstValue(raw["sale"]) === "1",
    sort,
    page,
  };
};

// The URL query string for a listing, leaving out anything that is the default. Changing a filter
// goes back to page 1 unless the caller keeps the page.
export const toListingSearchParams = (query: ListingQuery, keepPage = false): URLSearchParams => {
  const params = new URLSearchParams();
  const defaultSort: SortKey = query.search ? "relevance" : "featured";

  if (query.search) {
    params.set("q", query.search);
  }
  for (const brand of query.brands) {
    params.append("brand", brand);
  }
  if (query.minPriceMinor !== undefined) {
    params.set("min", String(Math.floor(query.minPriceMinor / 100)));
  }
  if (query.maxPriceMinor !== undefined) {
    params.set("max", String(Math.ceil(query.maxPriceMinor / 100)));
  }
  if (query.inStockOnly) {
    params.set("stock", "1");
  }
  if (query.onSaleOnly) {
    params.set("sale", "1");
  }
  if (query.sort !== defaultSort) {
    params.set("sort", query.sort);
  }
  if (keepPage && query.page > 1) {
    params.set("page", String(query.page));
  }
  return params;
};

// "/dogs/dog-beds" + the query's filters, ready to use as a link.
export const listingHref = (path: string, query: ListingQuery, keepPage = false): string => {
  const queryString = toListingSearchParams(query, keepPage).toString();
  return queryString ? `${path}?${queryString}` : path;
};

// The same query without its price range, for "remove this filter" links.
export const withoutPrice = (query: ListingQuery): ListingQuery => {
  const copy = { ...query };
  delete copy.minPriceMinor;
  delete copy.maxPriceMinor;
  return copy;
};

export const activeFilterCount = (query: ListingQuery): number => {
  const priceActive = query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined;
  return (
    query.brands.length +
    (priceActive ? 1 : 0) +
    (query.inStockOnly ? 1 : 0) +
    (query.onSaleOnly ? 1 : 0)
  );
};
