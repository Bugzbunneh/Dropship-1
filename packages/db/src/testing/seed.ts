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
  orderA: "00000000-0000-4000-8000-0000000d0a01",
  orderB: "00000000-0000-4000-8000-0000000d0b01",
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

-- One paid order per store, reached the way a real one is: created pending, then paid. The
-- status trigger writes the audit row and queues the confirmation email.
insert into public.orders
  (id, store_id, number, currency, subtotal_minor, shipping_minor, tax_minor, total_minor) values
  ('${ids.orderA}', '${ids.storeA}', 'AA-AAAA-2222', 'GBP', 2999, 399, 0, 3398),
  ('${ids.orderB}', '${ids.storeB}', 'BB-BBBB-2222', 'GBP', 5999, 0, 0, 5999);

insert into public.order_items
  (store_id, order_id, variant_id, sku, title, variant_title, unit_price_minor, quantity, line_total_minor)
values
  ('${ids.storeA}', '${ids.orderA}', (select id from public.variants where sku = 'A-BED-1'),
    'A-BED-1', 'Dog bed', 'Medium', 2999, 1, 2999),
  ('${ids.storeB}', '${ids.orderB}', (select id from public.variants where sku = 'B-TREE-1'),
    'B-TREE-1', 'Cat tree', 'Large', 5999, 1, 5999);

update public.orders
set status = 'paid', customer_email = 'alex@example.com', customer_name = 'Alex A',
    shipping_address = '{"name": "Alex A", "line1": "1 Dog Lane", "city": "Leeds", "postcode": "LS1 1AA", "country": "GB"}'
where id = '${ids.orderA}';
update public.orders
set status = 'paid', customer_email = 'bea@example.com', customer_name = 'Bea B',
    shipping_address = '{"name": "Bea B", "line1": "2 Cat Close", "city": "York", "postcode": "YO1 1AA", "country": "GB"}'
where id = '${ids.orderB}';

insert into public.stripe_events (store_id, id, type, order_id, outcome) values
  ('${ids.storeA}', 'evt_seed_a', 'checkout.session.completed', '${ids.orderA}', 'paid'),
  ('${ids.storeB}', 'evt_seed_b', 'checkout.session.completed', '${ids.orderB}', 'paid');

insert into public.shipments (store_id, order_id, carrier) values
  ('${ids.storeA}', '${ids.orderA}', 'Royal Mail'),
  ('${ids.storeB}', '${ids.orderB}', 'Evri');
`;

// Two stores, each with a published and an unpublished slice of every store-owned table.
// Whenever a table with a store_id is added, add rows for both stores here: the tests fail if
// a table is left empty, so they can never pass by checking nothing.
export const seedTwoStores = async (db: PGlite): Promise<void> => {
  await db.exec(buildSeedSql());
};
