// The catalog as the storefront sees it. A snapshot holds a whole store's published catalog in one
// plain, serialisable object: cheap to cache, and every query below is a pure function over it.

export type CatalogImage = {
  path: string;
  alt: string;
  width: number;
  height: number;
};

export type CatalogVariant = {
  id: string;
  sku: string;
  title: string;
  priceMinor: number;
  // the "was" price, shown struck through; always above priceMinor when present
  compareAtMinor: number | null;
  options: Record<string, string>;
  isAvailable: boolean;
  position: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  department: string;
  summary: string | null;
  // paragraphs
  description: string[];
  tags: string[];
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  collectionSlugs: string[];
  images: CatalogImage[];
  variants: CatalogVariant[];
};

export type CatalogCollection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  department: string;
  sortOrder: number;
};

export type CatalogSnapshot = {
  storeId: string;
  currency: string;
  collections: CatalogCollection[];
  products: CatalogProduct[];
};

// What a product card needs, and nothing more.
export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  department: string;
  summary: string | null;
  image: CatalogImage | null;
  // the lowest price a customer can buy it for today
  priceFromMinor: number;
  // the "was" price of that same variant, when it is reduced
  compareAtMinor: number | null;
  // true when variants differ in price, so the card says "From £x"
  hasPriceRange: boolean;
  inStock: boolean;
  variantCount: number;
  // set when the product has exactly one buyable choice, so it can be added straight from a card
  quickAddVariantId: string | null;
  isFeatured: boolean;
};

export type SortKey = "relevance" | "featured" | "newest" | "price-asc" | "price-desc" | "name";

export type ListingQuery = {
  department?: string;
  collection?: string;
  search?: string;
  brands: string[];
  minPriceMinor?: number;
  maxPriceMinor?: number;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  sort: SortKey;
  page: number;
};

export type ListingFacets = {
  brands: { name: string; count: number }[];
  // price bounds of everything in scope, in minor units, for the price filter
  priceMinMinor: number;
  priceMaxMinor: number;
  inStockCount: number;
  onSaleCount: number;
};

export type ListingResult = {
  cards: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: ListingFacets;
  // number of filters the customer has applied, for the "Filters (2)" button
  activeFilterCount: number;
};

// What the cart shows for a line, looked up fresh from the catalog so prices are never trusted
// from the browser.
export type CartVariantInfo = {
  variantId: string;
  productSlug: string;
  productTitle: string;
  brand: string | null;
  department: string;
  variantTitle: string;
  options: Record<string, string>;
  priceMinor: number;
  compareAtMinor: number | null;
  isAvailable: boolean;
  image: CatalogImage | null;
};
