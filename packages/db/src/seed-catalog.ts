import { placeholderPath, type SeedCatalog, type SeedProduct } from "@dropship/stores";

// Turns a store's demo catalog into SQL. One DO block, so it is applied entirely or not at all, and
// safe to run again: rows are matched by slug or SKU and updated in place, so ids stay stable and
// anything removed from the seed is removed from the database. Only rows tagged `demo` are ever
// deleted, so real products are never touched.

const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const textArray = (values: string[]): string =>
  values.length === 0 ? "array[]::text[]" : `array[${values.map(quote).join(", ")}]::text[]`;

const jsonObject = (value: Record<string, string>): string =>
  `${quote(JSON.stringify(value))}::jsonb`;

const values = (rows: string[][]): string =>
  rows.map((row) => `(${row.join(", ")})`).join(",\n    ");

// The first collection a product is in is where its placeholder pictures take their subject from.
const mainCollectionOf = (product: SeedProduct): string => product.collections[0] ?? "";

const collectionRows = (seed: SeedCatalog): string[][] =>
  seed.collections.map((collection) => [
    quote(collection.slug),
    quote(collection.title),
    quote(collection.description),
    quote(collection.department),
    String(collection.sortOrder),
  ]);

const productRows = (seed: SeedCatalog): string[][] =>
  seed.products.map((product) => [
    quote(product.slug),
    quote(product.title),
    quote(product.brand),
    quote(product.department),
    quote(product.summary),
    quote(product.description.join("\n\n")),
    textArray(product.tags),
    String(product.featured === true),
  ]);

const variantRows = (seed: SeedCatalog): string[][] =>
  seed.products.flatMap((product) =>
    product.variants.map((variant, position) => [
      quote(product.slug),
      quote(variant.sku),
      quote(variant.title),
      String(variant.priceMinor),
      variant.compareAtMinor === undefined ? "null::integer" : String(variant.compareAtMinor),
      jsonObject(variant.options ?? {}),
      String(variant.isAvailable !== false),
      String(position),
    ]),
  );

const imageRows = (seed: SeedCatalog): string[][] =>
  seed.products.flatMap((product) => {
    const count = product.imageCount ?? 1;
    return Array.from({ length: count }, (_, offset) => {
      const index = offset + 1;
      const path = placeholderPath({
        department: product.department,
        category: mainCollectionOf(product),
        title: product.title,
        index,
      });
      const alt = index === 1 ? product.title : `${product.title}, view ${index}`;
      return [quote(product.slug), quote(path), quote(alt), String(index - 1)];
    });
  });

const productCollectionRows = (seed: SeedCatalog): string[][] =>
  seed.products.flatMap((product) =>
    product.collections.map((collectionSlug, position) => [
      quote(product.slug),
      quote(collectionSlug),
      String(position),
    ]),
  );

export const buildCatalogSeedSql = (storeSlug: string, seed: SeedCatalog): string => {
  const productSlugs = textArray(seed.products.map((product) => product.slug));
  const skus = textArray(
    seed.products.flatMap((product) => product.variants.map((variant) => variant.sku)),
  );

  return `
do $seed$
declare
  v_store uuid;
  v_currency char(3);
begin
  select id, currency into v_store, v_currency from public.stores where slug = ${quote(storeSlug)};
  if v_store is null then
    raise exception 'store % does not exist: provision it first', ${quote(storeSlug)};
  end if;

  -- demo products that are no longer in the seed (variants, images and links go with them)
  delete from public.products
  where store_id = v_store and 'demo' = any (tags) and slug <> all (${productSlugs});

  insert into public.collections (store_id, slug, title, description, department, sort_order, is_published)
  select v_store, c.slug, c.title, c.description, c.department, c.sort_order, true
  from (values
    ${values(collectionRows(seed))}
  ) as c(slug, title, description, department, sort_order)
  on conflict (store_id, slug) do update set
    title = excluded.title, description = excluded.description, department = excluded.department,
    sort_order = excluded.sort_order, is_published = true;

  insert into public.products (store_id, slug, title, brand, department, summary, description, tags, is_featured, status)
  select v_store, p.slug, p.title, p.brand, p.department, p.summary, p.description, p.tags, p.is_featured, 'active'
  from (values
    ${values(productRows(seed))}
  ) as p(slug, title, brand, department, summary, description, tags, is_featured)
  on conflict (store_id, slug) do update set
    title = excluded.title, brand = excluded.brand, department = excluded.department,
    summary = excluded.summary, description = excluded.description, tags = excluded.tags,
    is_featured = excluded.is_featured, status = 'active';

  insert into public.variants (store_id, product_id, sku, title, price_minor, compare_at_price_minor, currency, options, is_available, position)
  select v_store, p.id, x.sku, x.title, x.price_minor, x.compare_at, v_currency, x.options, x.is_available, x.position
  from (values
    ${values(variantRows(seed))}
  ) as x(product_slug, sku, title, price_minor, compare_at, options, is_available, position)
  join public.products p on p.store_id = v_store and p.slug = x.product_slug
  on conflict (store_id, sku) do update set
    product_id = excluded.product_id, title = excluded.title, price_minor = excluded.price_minor,
    compare_at_price_minor = excluded.compare_at_price_minor, options = excluded.options,
    is_available = excluded.is_available, position = excluded.position;

  -- variants of seeded products that the seed no longer lists
  delete from public.variants v
  using public.products p
  where v.product_id = p.id and p.store_id = v_store and p.slug = any (${productSlugs})
    and v.sku <> all (${skus});

  -- images and collection links are replaced wholesale for seeded products
  delete from public.product_images
  where store_id = v_store
    and product_id in (select id from public.products where store_id = v_store and slug = any (${productSlugs}));

  insert into public.product_images (store_id, product_id, path, alt, position, width, height)
  select v_store, p.id, x.path, x.alt, x.position, 800, 800
  from (values
    ${values(imageRows(seed))}
  ) as x(product_slug, path, alt, position)
  join public.products p on p.store_id = v_store and p.slug = x.product_slug;

  delete from public.product_collections
  where store_id = v_store
    and product_id in (select id from public.products where store_id = v_store and slug = any (${productSlugs}));

  insert into public.product_collections (store_id, product_id, collection_id, position)
  select v_store, p.id, c.id, x.position
  from (values
    ${values(productCollectionRows(seed))}
  ) as x(product_slug, collection_slug, position)
  join public.products p on p.store_id = v_store and p.slug = x.product_slug
  join public.collections c on c.store_id = v_store and c.slug = x.collection_slug;
end
$seed$;
`;
};

// Removes the demo data again: every product tagged `demo` and the seed's own collections.
export const buildCatalogRemovalSql = (storeSlug: string, seed: SeedCatalog): string => `
do $remove$
declare
  v_store uuid;
begin
  select id into v_store from public.stores where slug = ${quote(storeSlug)};
  if v_store is null then
    return;
  end if;

  delete from public.products where store_id = v_store and 'demo' = any (tags);
  delete from public.collections
  where store_id = v_store and slug = any (${textArray(seed.collections.map((c) => c.slug))});
end
$remove$;
`;
