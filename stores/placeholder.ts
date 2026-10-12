// Demo products have no photographs, so each gets a generated illustration served from the
// storefront's /placeholder.svg route. The query string is the whole contract between the seed
// data that builds these URLs and the route that draws them.

export type PlaceholderSpec = {
  // department slug, for the colours
  department: string;
  // collection slug, for the picture
  category: string;
  // product title, printed on the tile
  title: string;
  // which of a product's images this is, starting at 1
  index: number;
};

const SLUG = /^[a-z0-9-]{1,40}$/;
const MAX_TITLE_LENGTH = 80;
const MAX_INDEX = 6;

export const placeholderPath = (spec: PlaceholderSpec): string => {
  const params = new URLSearchParams({
    d: spec.department,
    c: spec.category,
    t: spec.title.slice(0, MAX_TITLE_LENGTH),
    n: String(spec.index),
  });
  return `/placeholder.svg?${params.toString()}`;
};

// Reads and validates the query string. Returns undefined for anything malformed, so the route can
// refuse it instead of drawing attacker-chosen text into an SVG.
export const parsePlaceholderParams = (params: URLSearchParams): PlaceholderSpec | undefined => {
  const department = params.get("d") ?? "";
  const category = params.get("c") ?? "";
  const title = params.get("t") ?? "";
  const index = Number(params.get("n") ?? "1");

  const valid =
    SLUG.test(department) &&
    SLUG.test(category) &&
    title.length > 0 &&
    title.length <= MAX_TITLE_LENGTH &&
    Number.isInteger(index) &&
    index >= 1 &&
    index <= MAX_INDEX;

  return valid ? { department, category, title, index } : undefined;
};
