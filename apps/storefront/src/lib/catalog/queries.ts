import { activeFilterCount, PAGE_SIZE } from "./listing-params";
import { scoreProduct, tokenise } from "./search";
import type {
  CartVariantInfo,
  CatalogCollection,
  CatalogProduct,
  CatalogSnapshot,
  CatalogVariant,
  ListingFacets,
  ListingQuery,
  ListingResult,
  ProductCard,
  SortKey,
} from "./types";

// Every question the pages ask of the catalog, as pure functions over a snapshot.

// ---- Product cards -----------------------------------------------------------------------------

// The variants a customer can actually buy, or all of them when none are in stock (so a sold-out
// product still shows a price).
const purchasableOrAll = (variants: CatalogVariant[]): CatalogVariant[] => {
  const available = variants.filter((variant) => variant.isAvailable);
  return available.length > 0 ? available : variants;
};

const cheapestOf = (variants: CatalogVariant[]): CatalogVariant | undefined =>
  [...variants].sort((a, b) => a.priceMinor - b.priceMinor || a.position - b.position)[0];

// A product with a single variant has nothing to choose, so a card can offer "Add to cart".
const quickAddVariantOf = (product: CatalogProduct): string | null => {
  const [only] = product.variants;
  return product.variants.length === 1 && only?.isAvailable ? only.id : null;
};

export const toCard = (product: CatalogProduct): ProductCard => {
  const pool = purchasableOrAll(product.variants);
  const cheapest = cheapestOf(pool);

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    department: product.department,
    summary: product.summary,
    image: product.images[0] ?? null,
    priceFromMinor: cheapest?.priceMinor ?? 0,
    compareAtMinor: cheapest?.compareAtMinor ?? null,
    hasPriceRange: new Set(pool.map((variant) => variant.priceMinor)).size > 1,
    inStock: product.variants.some((variant) => variant.isAvailable),
    variantCount: product.variants.length,
    quickAddVariantId: quickAddVariantOf(product),
    isFeatured: product.isFeatured,
  };
};

// ---- Lookups -----------------------------------------------------------------------------------

export const findProduct = (snapshot: CatalogSnapshot, slug: string): CatalogProduct | undefined =>
  snapshot.products.find((product) => product.slug === slug);

export const findCollection = (
  snapshot: CatalogSnapshot,
  department: string,
  slug: string,
): CatalogCollection | undefined =>
  snapshot.collections.find(
    (collection) => collection.department === department && collection.slug === slug,
  );

export type CollectionSummary = CatalogCollection & { productCount: number };

// A department's collections in display order, with how many products each holds. Empty ones are
// left out so nobody follows a link to a blank page.
export const collectionsOf = (
  snapshot: CatalogSnapshot,
  department: string,
): CollectionSummary[] => {
  const countsBySlug = new Map<string, number>();
  for (const product of snapshot.products) {
    for (const slug of product.collectionSlugs) {
      countsBySlug.set(slug, (countsBySlug.get(slug) ?? 0) + 1);
    }
  }

  return snapshot.collections
    .filter((collection) => collection.department === department)
    .map((collection) => ({ ...collection, productCount: countsBySlug.get(collection.slug) ?? 0 }))
    .filter((collection) => collection.productCount > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
};

const byFeaturedThenNewest = (a: CatalogProduct, b: CatalogProduct): number =>
  Number(b.isFeatured) - Number(a.isFeatured) || b.createdAt.localeCompare(a.createdAt);

const inStock = (product: CatalogProduct): boolean =>
  product.variants.some((variant) => variant.isAvailable);

export const featuredCards = (
  snapshot: CatalogSnapshot,
  options: { department?: string; limit: number },
): ProductCard[] => {
  const inScope = snapshot.products.filter(
    (product) => !options.department || product.department === options.department,
  );
  return inScope.filter(inStock).sort(byFeaturedThenNewest).slice(0, options.limit).map(toCard);
};

export const saleCards = (
  snapshot: CatalogSnapshot,
  options: { department?: string; limit: number },
): ProductCard[] =>
  snapshot.products
    .filter((product) => !options.department || product.department === options.department)
    .map(toCard)
    .filter((card) => card.inStock && card.compareAtMinor !== null)
    .slice(0, options.limit);

export const newestCards = (
  snapshot: CatalogSnapshot,
  options: { department?: string; limit: number },
): ProductCard[] =>
  snapshot.products
    .filter((product) => !options.department || product.department === options.department)
    .filter(inStock)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title))
    .slice(0, options.limit)
    .map(toCard);

// Products worth showing next to this one: shared collections first, then the same department.
export const relatedCards = (
  snapshot: CatalogSnapshot,
  product: CatalogProduct,
  limit: number,
): ProductCard[] => {
  const ownCollections = new Set(product.collectionSlugs);

  const scored = snapshot.products
    .filter((candidate) => candidate.id !== product.id && inStock(candidate))
    .map((candidate) => {
      const shared = candidate.collectionSlugs.filter((slug) => ownCollections.has(slug)).length;
      const sameDepartment = candidate.department === product.department ? 1 : 0;
      return { candidate, score: shared * 3 + sameDepartment + (candidate.isFeatured ? 0.5 : 0) };
    })
    .filter((entry) => entry.score >= 1)
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title));

  return scored.slice(0, limit).map((entry) => toCard(entry.candidate));
};

// ---- Cart lookups ------------------------------------------------------------------------------

export const cartVariantInfo = (
  snapshot: CatalogSnapshot,
  variantIds: string[],
): CartVariantInfo[] => {
  const wanted = new Set(variantIds);
  const found: CartVariantInfo[] = [];

  for (const product of snapshot.products) {
    for (const variant of product.variants) {
      if (!wanted.has(variant.id)) {
        continue;
      }
      found.push({
        variantId: variant.id,
        productSlug: product.slug,
        productTitle: product.title,
        brand: product.brand,
        department: product.department,
        variantTitle: variant.title,
        options: variant.options,
        priceMinor: variant.priceMinor,
        compareAtMinor: variant.compareAtMinor,
        isAvailable: variant.isAvailable,
        image: product.images[0] ?? null,
      });
    }
  }
  return found;
};

// ---- Listing -----------------------------------------------------------------------------------

type Scored = { product: CatalogProduct; card: ProductCard; score: number };

const collectionTitlesOf = (snapshot: CatalogSnapshot, product: CatalogProduct): string[] => {
  const titles: string[] = [];
  for (const slug of product.collectionSlugs) {
    const collection = snapshot.collections.find((candidate) => candidate.slug === slug);
    if (collection) {
      titles.push(collection.title);
    }
  }
  return titles;
};

// The products a listing is about, before any filters: a department, a collection, or a search.
const productsInScope = (snapshot: CatalogSnapshot, query: ListingQuery): Scored[] => {
  const searchTokens = query.search ? tokenise(query.search) : [];
  const searching = query.search !== undefined;

  const scored: Scored[] = [];
  for (const product of snapshot.products) {
    if (query.department && product.department !== query.department) {
      continue;
    }
    if (query.collection && !product.collectionSlugs.includes(query.collection)) {
      continue;
    }
    const score = searching
      ? scoreProduct(searchTokens, product, collectionTitlesOf(snapshot, product))
      : 0;
    if (searching && score === 0) {
      continue;
    }
    scored.push({ product, card: toCard(product), score });
  }
  return scored;
};

type FilterParts = { brand: boolean; price: boolean; stock: boolean; sale: boolean };

const passesFilters = (entry: Scored, query: ListingQuery, apply: FilterParts): boolean => {
  const { card } = entry;
  if (apply.brand && query.brands.length > 0 && !query.brands.includes(card.brand ?? "")) {
    return false;
  }
  if (apply.price) {
    if (query.minPriceMinor !== undefined && card.priceFromMinor < query.minPriceMinor) {
      return false;
    }
    if (query.maxPriceMinor !== undefined && card.priceFromMinor > query.maxPriceMinor) {
      return false;
    }
  }
  if (apply.stock && query.inStockOnly && !card.inStock) {
    return false;
  }
  if (apply.sale && query.onSaleOnly && card.compareAtMinor === null) {
    return false;
  }
  return true;
};

const ALL_FILTERS: FilterParts = { brand: true, price: true, stock: true, sale: true };

const compareFor = (sort: SortKey): ((a: Scored, b: Scored) => number) => {
  const byTitle = (a: Scored, b: Scored): number => a.card.title.localeCompare(b.card.title);
  // sold-out products always sink to the bottom, whatever the sort
  const inStockFirst = (a: Scored, b: Scored): number =>
    Number(b.card.inStock) - Number(a.card.inStock);

  const primary: Record<SortKey, (a: Scored, b: Scored) => number> = {
    relevance: (a, b) => b.score - a.score,
    featured: (a, b) => Number(b.card.isFeatured) - Number(a.card.isFeatured),
    newest: (a, b) => b.product.createdAt.localeCompare(a.product.createdAt),
    "price-asc": (a, b) => a.card.priceFromMinor - b.card.priceFromMinor,
    "price-desc": (a, b) => b.card.priceFromMinor - a.card.priceFromMinor,
    name: byTitle,
  };

  return (a, b) => inStockFirst(a, b) || primary[sort](a, b) || byTitle(a, b);
};

const brandFacets = (entries: Scored[]): ListingFacets["brands"] => {
  const counts = new Map<string, number>();
  for (const { card } of entries) {
    if (card.brand) {
      counts.set(card.brand, (counts.get(card.brand) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

// Whole-pound bounds of the prices in scope, in minor units, for the price filter.
const priceBounds = (entries: Scored[]): { min: number; max: number } => {
  if (entries.length === 0) {
    return { min: 0, max: 0 };
  }
  const prices = entries.map((entry) => entry.card.priceFromMinor);
  return {
    min: Math.floor(Math.min(...prices) / 100) * 100,
    max: Math.ceil(Math.max(...prices) / 100) * 100,
  };
};

export const runListing = (
  snapshot: CatalogSnapshot,
  query: ListingQuery,
  pageSize: number = PAGE_SIZE,
): ListingResult => {
  const inScope = productsInScope(snapshot, query);

  // Each facet counts what the customer would get by choosing it, so it ignores its own filter.
  const forBrandCounts = inScope.filter((entry) =>
    passesFilters(entry, query, { ...ALL_FILTERS, brand: false }),
  );
  const matching = inScope.filter((entry) => passesFilters(entry, query, ALL_FILTERS));
  const bounds = priceBounds(inScope);

  const facets: ListingFacets = {
    brands: brandFacets(forBrandCounts),
    priceMinMinor: bounds.min,
    priceMaxMinor: bounds.max,
    inStockCount: matching.filter((entry) => entry.card.inStock).length,
    onSaleCount: matching.filter((entry) => entry.card.compareAtMinor !== null).length,
  };

  const sorted = [...matching].sort(compareFor(query.sort));
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    cards: sorted.slice(start, start + pageSize).map((entry) => entry.card),
    total: sorted.length,
    page,
    pageSize,
    pageCount,
    facets,
    activeFilterCount: activeFilterCount(query),
  };
};

// Fast suggestions for the search box: matching product titles, best first.
export const suggestProducts = (
  snapshot: CatalogSnapshot,
  text: string,
  limit: number,
): ProductCard[] => {
  const tokens = tokenise(text);
  if (tokens.length === 0) {
    return [];
  }
  return snapshot.products
    .map((product) => ({
      product,
      score: scoreProduct(tokens, product, collectionTitlesOf(snapshot, product)),
    }))
    .filter((entry) => entry.score > 0 && inStock(entry.product))
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title))
    .slice(0, limit)
    .map((entry) => toCard(entry.product));
};
