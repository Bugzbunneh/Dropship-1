// Cache tags tie cached pages and data to the things that change them. Sync jobs name the tags to
// expire, so the format lives in one place and is validated before it reaches Next.js.

export const storeTag = (storeId: string): string => `store:${storeId}`;
export const productTag = (productId: string): string => `product:${productId}`;
export const collectionTag = (collectionId: string): string => `collection:${collectionId}`;

// Used by the local revalidation round-trip check and nothing else.
export const probeTag = "probe:revalidation";

const MAX_TAGS_PER_REQUEST = 100;
// Next.js ignores tags longer than 256 characters, which would make revalidation silently do nothing.
const MAX_TAG_LENGTH = 256;
const TAG_PATTERN = /^[a-z]+:[A-Za-z0-9_-]+$/;

export type TagListResult = { ok: true; tags: string[] } | { ok: false; error: string };

const isValidTag = (value: unknown): value is string =>
  typeof value === "string" && value.length <= MAX_TAG_LENGTH && TAG_PATTERN.test(value);

// Reads the JSON body of a revalidation request: { "tags": ["product:123", ...] }.
export const parseTagList = (body: unknown): TagListResult => {
  const hasTags = typeof body === "object" && body !== null && "tags" in body;
  const tags = hasTags ? (body as { tags: unknown }).tags : undefined;

  if (!Array.isArray(tags) || tags.length === 0) {
    return { ok: false, error: "body must be { tags: string[] } with at least one tag" };
  }
  if (tags.length > MAX_TAGS_PER_REQUEST) {
    return { ok: false, error: `at most ${MAX_TAGS_PER_REQUEST} tags per request` };
  }
  if (!tags.every(isValidTag)) {
    return { ok: false, error: "every tag must look like kind:id, e.g. product:123" };
  }
  return { ok: true, tags: [...new Set(tags)] };
};
