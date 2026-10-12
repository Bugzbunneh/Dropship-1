import { absoluteUrl } from "../site";
import { decimalString } from "../money";
import type { CatalogProduct } from "../catalog/types";

// Structured data (schema.org JSON-LD) that lets search engines show prices, availability and
// breadcrumbs in results. Everything here comes from the catalog; nothing is invented, so there are
// deliberately no ratings or review counts until real reviews exist (Phase 5).

export type JsonLd = Record<string, unknown>;

// JSON placed inside a <script> tag must not be able to close it, so "<" is escaped.
export const serialiseJsonLd = (data: JsonLd | JsonLd[]): string =>
  JSON.stringify(data).replace(/</g, "\\u003c");

type ProductContext = {
  product: CatalogProduct;
  origin: string;
  path: string;
  currency: string;
  locale: string;
};

const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";

const offersFor = ({ product, origin, path, currency, locale }: ProductContext): JsonLd => {
  const url = absoluteUrl(origin, path);
  const available = product.variants.filter((variant) => variant.isAvailable);
  const pool = available.length > 0 ? available : product.variants;
  const prices = pool.map((variant) => variant.priceMinor);
  const availability = available.length > 0 ? IN_STOCK : OUT_OF_STOCK;
  const format = (minor: number): string => decimalString(minor, currency, locale);

  if (product.variants.length === 1) {
    return {
      "@type": "Offer",
      url,
      price: format(prices[0] ?? 0),
      priceCurrency: currency,
      availability,
      itemCondition: "https://schema.org/NewCondition",
    };
  }
  return {
    "@type": "AggregateOffer",
    url,
    lowPrice: format(Math.min(...prices)),
    highPrice: format(Math.max(...prices)),
    offerCount: product.variants.length,
    priceCurrency: currency,
    availability,
    itemCondition: "https://schema.org/NewCondition",
  };
};

export const productJsonLd = (context: ProductContext): JsonLd => {
  const { product, origin } = context;
  const description = product.summary ?? product.description[0];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(description ? { description } : {}),
    image: product.images.map((image) => absoluteUrl(origin, image.path)),
    sku: product.variants[0]?.sku,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: offersFor(context),
  };
};

export type Crumb = { name: string; path: string };

export const breadcrumbJsonLd = (crumbs: Crumb[], origin: string): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: absoluteUrl(origin, crumb.path),
  })),
});

type SiteContext = { name: string; origin: string; email?: string | undefined };

export const organizationJsonLd = ({ name, origin, email }: SiteContext): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name,
  url: origin,
  ...(email ? { email } : {}),
});

// Lets search engines offer a search box for the site in their results.
export const websiteJsonLd = ({ name, origin }: SiteContext): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name,
  url: origin,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${origin}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});
