import type { StoreConfig } from "@dropship/config";
import type { SeedCatalog } from "./seed-types";

export type { SeedCatalog, SeedCollection, SeedProduct, SeedVariant } from "./seed-types";
export { parsePlaceholderParams, placeholderPath } from "./placeholder";
export type { PlaceholderSpec } from "./placeholder";

// Every store must be registered here. Imports are lazy so a deployment only evaluates the
// config it is built for, and the explicit map keeps the bundler able to see each file.
const storeModules = {
  "pet-pilot": {
    config: () => import("./pet-pilot/store.config"),
    seed: () => import("./pet-pilot/seed"),
  },
} as const;

export type StoreSlug = keyof typeof storeModules;

export const storeSlugs = Object.keys(storeModules) as StoreSlug[];

export const isStoreSlug = (value: string): value is StoreSlug =>
  Object.hasOwn(storeModules, value);

const requireStore = (slug: string): (typeof storeModules)[StoreSlug] => {
  if (!isStoreSlug(slug)) {
    const known = storeSlugs.join(", ");
    throw new Error(`Unknown store "${slug}". Registered stores: ${known}`);
  }
  return storeModules[slug];
};

export const loadStoreConfig = async (slug: string): Promise<StoreConfig> => {
  const store = requireStore(slug);

  const configModule = await store.config();
  const config = configModule.default;
  if (config.slug !== slug) {
    throw new Error(`Store registered as "${slug}" declares slug "${config.slug}" in its config`);
  }
  return config;
};

// The store's demo catalog. Used to seed the database and to run the storefront offline.
export const loadStoreSeed = async (slug: string): Promise<SeedCatalog> => {
  const store = requireStore(slug);

  const seedModule = await store.seed();
  return seedModule.default;
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
