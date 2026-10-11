import { revalidateTag } from "next/cache";

// The only place the storefront calls Next.js cache invalidation. Next.js has changed this API
// between major versions (README risk R1), so keeping it in one function means an upgrade touches
// one file. Tag names live in ./tags.

// { expire: 0 } means stale content is never served: the next request waits for fresh data. That is
// what price and stock changes need, and the only form that works from outside a Server Action.
export const expireTags = (tags: string[]): void => {
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }
};
