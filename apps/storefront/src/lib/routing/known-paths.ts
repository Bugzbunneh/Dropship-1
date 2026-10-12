import type { CatalogSnapshot } from "../catalog/types";

// Decides whether a URL matches a real page. The proxy uses this to answer unknown URLs with a true
// 404 status. Pages whose content depends on request-time data are streamed, and a streamed page
// has already sent "200 OK" by the time it discovers its product or category does not exist (a
// "soft 404", which search engines dislike and which lets bots fill the cache with junk URLs).

export type RouteKnowledge = {
  departments: string[];
  collections: { department: string; slug: string }[];
  productSlugs: string[];
};

export const STATIC_PATHS: readonly string[] = [
  "/",
  "/cart",
  "/search",
  "/delivery",
  "/returns",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
];

export const knowledgeFromCatalog = (
  departmentSlugs: string[],
  snapshot: CatalogSnapshot,
): RouteKnowledge => ({
  departments: departmentSlugs,
  collections: snapshot.collections.map((collection) => ({
    department: collection.department,
    slug: collection.slug,
  })),
  productSlugs: snapshot.products.map((product) => product.slug),
});

const decodeSegment = (segment: string): string | undefined => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
};

export const isKnownPath = (pathname: string, knowledge: RouteKnowledge): boolean => {
  const segments = pathname.split("/").filter(Boolean).map(decodeSegment);
  if (segments.some((segment) => segment === undefined)) {
    return false;
  }
  const [first, second, ...rest] = segments as string[];
  const normalised = `/${segments.join("/")}`;

  if (STATIC_PATHS.includes(normalised)) {
    return true;
  }
  if (first === "products") {
    return second !== undefined && rest.length === 0 && knowledge.productSlugs.includes(second);
  }
  if (first === undefined || !knowledge.departments.includes(first)) {
    return false;
  }
  if (second === undefined) {
    return true;
  }
  if (rest.length > 0) {
    return false;
  }
  return (
    second === "all" ||
    knowledge.collections.some(
      (collection) => collection.department === first && collection.slug === second,
    )
  );
};
