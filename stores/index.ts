import type { StoreConfig } from "@dropship/config";

// Every store must be registered here. Imports are lazy so a deployment only evaluates the
// config it is built for, and the explicit map keeps the bundler able to see each file.
const storeModules = {
  "pet-pilot": () => import("./pet-pilot/store.config"),
} as const;

export type StoreSlug = keyof typeof storeModules;

export const storeSlugs = Object.keys(storeModules) as StoreSlug[];

export const isStoreSlug = (value: string): value is StoreSlug =>
  Object.hasOwn(storeModules, value);

export const loadStoreConfig = async (slug: string): Promise<StoreConfig> => {
  if (!isStoreSlug(slug)) {
    const known = storeSlugs.join(", ");
    throw new Error(`Unknown store "${slug}". Registered stores: ${known}`);
  }

  const storeModule = await storeModules[slug]();
  const config = storeModule.default;
  if (config.slug !== slug) {
    throw new Error(`Store registered as "${slug}" declares slug "${config.slug}" in its config`);
  }
  return config;
};

// Deployments pick their store with the STORE environment variable.
export const loadActiveStoreConfig = async (
  env: Record<string, string | undefined> = process.env,
): Promise<StoreConfig> => {
  const slug = env["STORE"];
  if (!slug) {
    throw new Error(`STORE is not set. Set it to one of: ${storeSlugs.join(", ")}`);
  }
  return loadStoreConfig(slug);
};
