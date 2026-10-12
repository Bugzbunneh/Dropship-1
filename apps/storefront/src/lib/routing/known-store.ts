import { loadActiveStoreConfig } from "@dropship/stores";
import { loadSnapshot } from "../catalog/load";
import { isKnownPath, knowledgeFromCatalog, type RouteKnowledge } from "./known-paths";

// What the proxy knows about the store's pages, kept in this process's memory. The catalog is read
// at most once a minute, and again (at most every few seconds) when a URL looks unknown, so a
// product that was only just published is not turned away. If the catalog can't be read at all, the
// answer is "carry on": a database blip must never turn real pages into 404s.

const MAX_AGE_MS = 60_000;
const MIN_REFRESH_GAP_MS = 5_000;

let cached: { knowledge: RouteKnowledge; loadedAt: number } | undefined;

const load = async (): Promise<RouteKnowledge | undefined> => {
  try {
    const [config, snapshot] = await Promise.all([loadActiveStoreConfig(), loadSnapshot()]);
    const knowledge = knowledgeFromCatalog(
      config.departments.map((department) => department.slug),
      snapshot,
    );
    cached = { knowledge, loadedAt: Date.now() };
    return knowledge;
  } catch {
    return undefined;
  }
};

const currentKnowledge = async (): Promise<RouteKnowledge | undefined> => {
  if (cached && Date.now() - cached.loadedAt < MAX_AGE_MS) {
    return cached.knowledge;
  }
  // stale or missing: refresh, but fall back to the old copy rather than failing
  return (await load()) ?? cached?.knowledge;
};

export type PathVerdict = "known" | "unknown" | "undetermined";

export const verdictForPath = async (pathname: string): Promise<PathVerdict> => {
  const knowledge = await currentKnowledge();
  if (!knowledge) {
    return "undetermined";
  }
  if (isKnownPath(pathname, knowledge)) {
    return "known";
  }

  // It looks unknown, but the catalog may have changed since it was cached: look once more.
  const old = cached;
  if (old && Date.now() - old.loadedAt >= MIN_REFRESH_GAP_MS) {
    const fresh = await load();
    if (fresh) {
      return isKnownPath(pathname, fresh) ? "known" : "unknown";
    }
    return "undetermined";
  }
  return "unknown";
};
