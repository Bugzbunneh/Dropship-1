import { loadActiveStoreConfig, loadStoreSeed, placeholderPath } from "@dropship/stores";
import type { SeedCatalog, SeedProduct } from "@dropship/stores";
import type {
  CatalogCollection,
  CatalogImage,
  CatalogProduct,
  CatalogSnapshot,
  CatalogVariant,
} from "./types";

// The offline catalog: the store's demo seed turned straight into a snapshot, so the storefront
// runs without a database. Used by CI, Playwright and local development without credentials.
// Ids are derived from slugs and SKUs, so they are stable between runs and a cart survives a
// reload.

const IMAGE_SIZE = 800;
const FIRST_PRODUCT_DATE = Date.UTC(2026, 8, 1);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const collectionFromSeed = (collection: SeedCatalog["collections"][number]): CatalogCollection => ({
  id: `fx-col-${collection.slug}`,
  slug: collection.slug,
  title: collection.title,
  description: collection.description,
  department: collection.department,
  sortOrder: collection.sortOrder,
});

const variantFromSeed = (
  variant: SeedProduct["variants"][number],
  position: number,
): CatalogVariant => ({
  id: `fx-var-${variant.sku}`,
  sku: variant.sku,
  title: variant.title,
  priceMinor: variant.priceMinor,
  compareAtMinor: variant.compareAtMinor ?? null,
  options: variant.options ?? {},
  isAvailable: variant.isAvailable !== false,
  position,
});

const imagesFromSeed = (product: SeedProduct): CatalogImage[] => {
  const count = product.imageCount ?? 1;
  return Array.from({ length: count }, (_, offset) => {
    const index = offset + 1;
    return {
      path: placeholderPath({
        department: product.department,
        category: product.collections[0] ?? "",
        title: product.title,
        index,
      }),
      alt: index === 1 ? product.title : `${product.title}, view ${index}`,
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
    };
  });
};

// Later products in the seed are older, so "newest first" is a meaningful order.
const productFromSeed = (product: SeedProduct, index: number): CatalogProduct => {
  const created = new Date(FIRST_PRODUCT_DATE - index * ONE_DAY_MS).toISOString();
  return {
    id: `fx-prod-${product.slug}`,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    department: product.department,
    summary: product.summary,
    description: product.description,
    tags: product.tags,
    isFeatured: product.featured === true,
    createdAt: created,
    updatedAt: created,
    collectionSlugs: product.collections,
    images: imagesFromSeed(product),
    variants: product.variants.map(variantFromSeed),
  };
};

export const snapshotFromSeed = (seed: SeedCatalog, currency: string): CatalogSnapshot => ({
  storeId: "fixtures",
  currency,
  collections: seed.collections.map(collectionFromSeed),
  products: seed.products.map(productFromSeed),
});

export const loadFixtureSnapshot = async (): Promise<CatalogSnapshot> => {
  const config = await loadActiveStoreConfig();
  const seed = await loadStoreSeed(config.slug);
  return snapshotFromSeed(seed, config.currency);
};
