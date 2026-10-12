import type { PGlite } from "@electric-sql/pglite";

// Fixed ids keep test failures readable. "A" and "B" are two independent stores.
export const ids = {
  storeA: "00000000-0000-4000-8000-0000000000a0",
  storeB: "00000000-0000-4000-8000-0000000000b0",
  ownerA: "00000000-0000-4000-8000-0000000000a1",
  viewerA: "00000000-0000-4000-8000-0000000000a2",
  ownerB: "00000000-0000-4000-8000-0000000000b1",
  nobody: "00000000-0000-4000-8000-0000000000c1",
  productActiveA: "00000000-0000-4000-8000-00000000a0a1",
  productDraftA: "00000000-0000-4000-8000-00000000a0d1",
  productActiveB: "00000000-0000-4000-8000-00000000b0a1",
  productDraftB: "00000000-0000-4000-8000-00000000b0d1",
  collectionPublishedA: "00000000-0000-4000-8000-0000000c0a01",
  collectionHiddenA: "00000000-0000-4000-8000-0000000c0a02",
  collectionPublishedB: "00000000-0000-4000-8000-0000000c0b01",
  collectionHiddenB: "00000000-0000-4000-8000-0000000c0b02",
} as const;

type StoreSlugs = { storeA: string; storeB: string };

// SQL that creates two stores with a published and an unpublished slice of every store-owned
// table. The slugs are a parameter so the live-database checks can use names that can never
// collide with a real store.
export const buildSeedSql = (
  slugs: StoreSlugs = { storeA: "store-a", storeB: "store-b" },
): string => `
insert into auth.users (id) values
  ('${ids.ownerA}'), ('${ids.viewerA}'), ('${ids.ownerB}'), ('${ids.nobody}');

insert into public.stores (id, slug, name, currency) values
  ('${ids.storeA}', '${slugs.storeA}', 'Store A', 'GBP'),
  ('${ids.storeB}', '${slugs.storeB}', 'Store B', 'GBP');

insert into public.operators (user_id, store_id, role) values
  ('${ids.ownerA}', '${ids.storeA}', 'owner'),
  ('${ids.viewerA}', '${ids.storeA}', 'viewer'),
  ('${ids.ownerB}', '${ids.storeB}', 'owner');

insert into public.collections (id, store_id, slug, title, department, is_published) values
  ('${ids.collectionPublishedA}', '${ids.storeA}', 'dogs', 'Dogs', 'dogs', true),
  ('${ids.collectionHiddenA}', '${ids.storeA}', 'secret', 'Secret', 'dogs', false),
  ('${ids.collectionPublishedB}', '${ids.storeB}', 'cats', 'Cats', 'cats', true),
  ('${ids.collectionHiddenB}', '${ids.storeB}', 'secret', 'Secret', 'cats', false);

insert into public.products (id, store_id, slug, title, department, status) values
  ('${ids.productActiveA}', '${ids.storeA}', 'dog-bed', 'Dog bed', 'dogs', 'active'),
  ('${ids.productDraftA}', '${ids.storeA}', 'dog-coat', 'Dog coat', 'dogs', 'draft'),
  ('${ids.productActiveB}', '${ids.storeB}', 'cat-tree', 'Cat tree', 'cats', 'active'),
  ('${ids.productDraftB}', '${ids.storeB}', 'cat-bowl', 'Cat bowl', 'cats', 'draft');

insert into public.variants (store_id, product_id, sku, title, price_minor, currency) values
  ('${ids.storeA}', '${ids.productActiveA}', 'A-BED-1', 'Medium', 2999, 'GBP'),
  ('${ids.storeA}', '${ids.productDraftA}', 'A-COAT-1', 'Small', 1999, 'GBP'),
  ('${ids.storeB}', '${ids.productActiveB}', 'B-TREE-1', 'Large', 5999, 'GBP'),
  ('${ids.storeB}', '${ids.productDraftB}', 'B-BOWL-1', 'Steel', 899, 'GBP');

insert into public.product_images (store_id, product_id, path, alt, width, height) values
  ('${ids.storeA}', '${ids.productActiveA}', '/placeholder.svg?t=a-bed', 'Dog bed', 800, 800),
  ('${ids.storeA}', '${ids.productDraftA}', '/placeholder.svg?t=a-coat', 'Dog coat', 800, 800),
  ('${ids.storeB}', '${ids.productActiveB}', '/placeholder.svg?t=b-tree', 'Cat tree', 800, 800),
  ('${ids.storeB}', '${ids.productDraftB}', '/placeholder.svg?t=b-bowl', 'Cat bowl', 800, 800);

insert into public.product_collections (store_id, product_id, collection_id) values
  ('${ids.storeA}', '${ids.productActiveA}', '${ids.collectionPublishedA}'),
  ('${ids.storeA}', '${ids.productDraftA}', '${ids.collectionHiddenA}'),
  ('${ids.storeB}', '${ids.productActiveB}', '${ids.collectionPublishedB}'),
  ('${ids.storeB}', '${ids.productDraftB}', '${ids.collectionHiddenB}');
`;

// Two stores, each with a published and an unpublished slice of every store-owned table.
// Whenever a table with a store_id is added, add rows for both stores here: the tests fail if
// a table is left empty, so they can never pass by checking nothing.
export const seedTwoStores = async (db: PGlite): Promise<void> => {
  await db.exec(buildSeedSql());
};
