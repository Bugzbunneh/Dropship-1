import type { Database } from "@dropship/db";
import { createStoreClient } from "../supabase/store-client";
import { readSupabaseEnv } from "../supabase/env";
import type {
  CatalogCollection,
  CatalogImage,
  CatalogProduct,
  CatalogSnapshot,
  CatalogVariant,
} from "./types";

// Reads the store's published catalog from Supabase. The client carries the store-scoped token, so
// row-level security already limits every query to this store's active products.

type Tables = Database["public"]["Tables"];
type CollectionRow = Tables["collections"]["Row"];
type VariantRow = Tables["variants"]["Row"];
type ImageRow = Tables["product_images"]["Row"];
type ProductRow = Tables["products"]["Row"] & {
  variants: VariantRow[];
  product_images: ImageRow[];
  product_collections: { collection_id: string; position: number }[];
};

// PostgREST returns at most 1000 rows a request, so read in pages.
const PAGE_SIZE = 500;

const optionsFromJson = (value: unknown): Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const options: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      options[key] = entry;
    }
  }
  return options;
};

const collectionFromRow = (row: CollectionRow): CatalogCollection => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  department: row.department,
  sortOrder: row.sort_order,
});

const variantFromRow = (row: VariantRow): CatalogVariant => ({
  id: row.id,
  sku: row.sku,
  title: row.title,
  priceMinor: row.price_minor,
  compareAtMinor: row.compare_at_price_minor,
  options: optionsFromJson(row.options),
  isAvailable: row.is_available,
  position: row.position,
});

const imageFromRow = (row: ImageRow): CatalogImage => ({
  path: row.path,
  alt: row.alt,
  width: row.width,
  height: row.height,
});

const byPosition = <T extends { position: number }>(a: T, b: T): number => a.position - b.position;

const productFromRow = (
  row: ProductRow,
  slugByCollectionId: Map<string, string>,
): CatalogProduct => {
  const links = [...row.product_collections].sort(byPosition);
  const collectionSlugs = links.flatMap((link) => {
    const slug = slugByCollectionId.get(link.collection_id);
    return slug ? [slug] : [];
  });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    department: row.department,
    summary: row.summary,
    description: row.description ? row.description.split(/\n{2,}/) : [],
    tags: row.tags,
    isFeatured: row.is_featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    collectionSlugs,
    images: [...row.product_images].sort(byPosition).map(imageFromRow),
    variants: [...row.variants].sort(byPosition).map(variantFromRow),
  };
};

type Client = Awaited<ReturnType<typeof createStoreClient>>;

const fetchAllCollections = async (client: Client): Promise<CollectionRow[]> => {
  const { data, error } = await client
    .from("collections")
    .select("*")
    .order("sort_order")
    .limit(PAGE_SIZE);
  if (error) {
    throw new Error(`Could not load collections: ${error.message}`);
  }
  return data;
};

const fetchAllProducts = async (client: Client): Promise<ProductRow[]> => {
  const rows: ProductRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("products")
      .select("*, variants(*), product_images(*), product_collections(collection_id, position)")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Could not load products: ${error.message}`);
    }
    rows.push(...(data as ProductRow[]));
    if (data.length < PAGE_SIZE) {
      return rows;
    }
  }
};

export const loadSupabaseSnapshot = async (): Promise<CatalogSnapshot> => {
  const env = readSupabaseEnv();
  const client = await createStoreClient(env);

  const [collectionRows, productRows] = await Promise.all([
    fetchAllCollections(client),
    fetchAllProducts(client),
  ]);

  const slugByCollectionId = new Map(collectionRows.map((row) => [row.id, row.slug]));
  const storeResult = await client.from("stores").select("currency").single();
  if (storeResult.error) {
    throw new Error(`Could not load the store: ${storeResult.error.message}`);
  }

  return {
    storeId: env.storeId,
    currency: storeResult.data.currency,
    collections: collectionRows.map(collectionFromRow),
    products: productRows
      .filter((row) => row.variants.length > 0)
      .map((row) => productFromRow(row, slugByCollectionId)),
  };
};
