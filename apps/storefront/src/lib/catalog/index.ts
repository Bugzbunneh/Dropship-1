import { cacheLife, cacheTag } from "next/cache";
import { storeTag } from "../tags";
import { loadSnapshot } from "./load";
import type { CatalogSnapshot } from "./types";

export { catalogSource } from "./load";
export type { CatalogSource } from "./load";

// The whole published catalog, cached. Pages call this and then ask it questions with the pure
// functions in ./queries. The cache is tagged with the store, so a sync job refreshes every page by
// expiring that one tag through POST /api/revalidate (see lib/tags).
export const getSnapshot = async (): Promise<CatalogSnapshot> => {
  "use cache";
  cacheLife("hours");

  const snapshot = await loadSnapshot();
  cacheTag(storeTag(snapshot.storeId));
  return snapshot;
};
