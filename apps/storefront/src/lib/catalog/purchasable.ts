import "server-only";
import type { PurchasableVariant } from "@dropship/core";
import { createStoreClient } from "../supabase/store-client";
import { isUuid } from "../uuid";

// What checkout needs to know about the variants in a basket, read from the database right now.
// The cached catalog snapshot is fine for showing prices, but a charge must never rest on a copy
// that is up to an hour old, so checkout asks the database itself.

type ImageRow = { path: string; position: number };
type ProductRow = { title: string; status: string; product_images: ImageRow[] };
type VariantRow = {
  id: string;
  sku: string;
  title: string;
  price_minor: number;
  currency: string;
  is_available: boolean;
  products: ProductRow | null;
};

const firstImagePath = (images: ImageRow[]): string | null => {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return sorted[0]?.path ?? null;
};

const fromRow = (row: VariantRow): PurchasableVariant | undefined => {
  // Row-level security only shows variants of active products, so a missing product means the
  // variant is not for sale.
  if (!row.products || row.products.status !== "active") {
    return undefined;
  }
  return {
    variantId: row.id,
    sku: row.sku,
    productTitle: row.products.title,
    variantTitle: row.title,
    currency: row.currency,
    priceMinor: row.price_minor,
    isAvailable: row.is_available,
    imagePath: firstImagePath(row.products.product_images),
  };
};

export const loadPurchasableVariants = async (
  variantIds: readonly string[],
): Promise<PurchasableVariant[]> => {
  // ids that are not UUIDs cannot exist in the database; asking for them would only be an error
  const ids = variantIds.filter(isUuid);
  if (ids.length === 0) {
    return [];
  }

  const client = await createStoreClient();
  const { data, error } = await client
    .from("variants")
    .select(
      "id, sku, title, price_minor, currency, is_available, products(title, status, product_images(path, position))",
    )
    .in("id", ids);
  if (error) {
    throw new Error(`Could not read the basket's products: ${error.message}`);
  }

  const rows = data as unknown as VariantRow[];
  return rows.flatMap((row) => {
    const variant = fromRow(row);
    return variant ? [variant] : [];
  });
};
