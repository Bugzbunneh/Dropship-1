// Fills a store with its demo catalog in the linked Supabase project, or removes it again.
//
//   pnpm store:seed pet-pilot             create or update the demo catalog
//   pnpm store:seed pet-pilot --remove    delete every product tagged `demo` and the seed's collections
//
// The store must exist first (pnpm store:provision). The catalog comes from stores/<slug>/seed.ts,
// the same data the storefront's offline mode uses. Safe to run again: rows are matched by slug or
// SKU, ids stay stable, and only rows tagged `demo` are ever deleted.

import { buildCatalogRemovalSql, buildCatalogSeedSql } from "@dropship/db";
import { loadStoreSeed, storeSlugs } from "@dropship/stores";
import { runLinkedSql } from "./lib/linked-sql";

const main = async (): Promise<void> => {
  const [slug, ...flags] = process.argv.slice(2);
  if (!slug) {
    throw new Error(`Usage: store:seed <slug> [--remove]. Stores: ${storeSlugs.join(", ")}`);
  }
  const remove = flags.includes("--remove");
  const seed = await loadStoreSeed(slug);

  const sql = remove ? buildCatalogRemovalSql(slug, seed) : buildCatalogSeedSql(slug, seed);
  runLinkedSql(sql);

  if (remove) {
    console.log(`Removed the demo catalog from "${slug}".`);
    return;
  }
  const variantCount = seed.products.reduce((sum, product) => sum + product.variants.length, 0);
  console.log(
    `Seeded "${slug}": ${seed.collections.length} collections, ${seed.products.length} products, ${variantCount} variants.`,
  );
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
