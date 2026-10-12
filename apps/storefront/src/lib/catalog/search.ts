import type { CatalogProduct } from "./types";

// A small, predictable product search: every word the customer types has to match something, words
// are compared without plurals ("beds" finds "bed"), and the last word may be a prefix so results
// appear as they type. Matches in the title count for far more than matches in the description.
// This runs over the cached catalog snapshot, which is fine for a few thousand products; the
// README's risk R13 covers moving it into the database when a store outgrows that.

const STOP_WORDS = new Set(["a", "an", "and", "for", "in", "of", "the", "to", "with"]);

const stripAccents = (text: string): string => text.normalize("NFKD").replace(/[̀-ͯ]/g, "");

// Drops a plural ending: dogs -> dog, berries -> berry, brushes -> brush, glass -> glass.
export const stem = (word: string): string => {
  if (word.length > 4 && word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.length > 4 && /(ches|shes|sses|xes)$/.test(word)) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
};

export const tokenise = (text: string): string[] => {
  const lowered = stripAccents(text).toLowerCase();
  const words = lowered.split(/[^a-z0-9]+/).filter(Boolean);
  return words.filter((word) => !STOP_WORDS.has(word)).map(stem);
};

type Field = { terms: string[]; exact: number; prefix: number };

const fieldsOf = (product: CatalogProduct, collectionTitles: string[]): Field[] => [
  { terms: tokenise(product.title), exact: 10, prefix: 6 },
  { terms: tokenise(product.brand ?? ""), exact: 8, prefix: 4 },
  { terms: product.tags.flatMap(tokenise), exact: 6, prefix: 3 },
  { terms: collectionTitles.flatMap(tokenise), exact: 5, prefix: 2 },
  { terms: tokenise(product.department), exact: 4, prefix: 0 },
  { terms: tokenise(product.summary ?? ""), exact: 2, prefix: 1 },
  { terms: product.description.flatMap(tokenise), exact: 1, prefix: 0 },
];

const bestScoreFor = (token: string, fields: Field[], allowPrefix: boolean): number => {
  let best = 0;
  for (const field of fields) {
    if (field.terms.includes(token)) {
      best = Math.max(best, field.exact);
    } else if (
      allowPrefix &&
      field.prefix > 0 &&
      field.terms.some((term) => term.startsWith(token))
    ) {
      best = Math.max(best, field.prefix);
    }
  }
  return best;
};

// 0 means "does not match". Higher is a better match.
export const scoreProduct = (
  queryTokens: string[],
  product: CatalogProduct,
  collectionTitles: string[],
): number => {
  if (queryTokens.length === 0) {
    return 0;
  }
  const fields = fieldsOf(product, collectionTitles);
  const lastIndex = queryTokens.length - 1;

  let total = 0;
  for (const [index, token] of queryTokens.entries()) {
    const score = bestScoreFor(token, fields, index === lastIndex);
    if (score === 0) {
      return 0;
    }
    total += score;
  }

  const titleTerms = tokenise(product.title);
  const everyWordInTitle = queryTokens.every(
    (token, index) =>
      titleTerms.includes(token) ||
      (index === lastIndex && titleTerms.some((t) => t.startsWith(token))),
  );
  const bonus = (everyWordInTitle ? 5 : 0) + (product.isFeatured ? 0.5 : 0);
  return total + bonus;
};
