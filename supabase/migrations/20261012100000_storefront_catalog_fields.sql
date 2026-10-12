-- Catalog fields the storefront needs: departments (dogs, cats), brands, tags, sale prices,
-- variant options and product images.
--
-- Assumes the catalog tables are empty, which holds until the seed and supplier import run: the new
-- NOT NULL columns have no default, so this fails loudly rather than guessing a department for
-- existing rows.

create function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function app.touch_updated_at() from public;

-- Collections ---------------------------------------------------------------------------------

alter table public.collections
  add column department text not null
    check (department ~ '^[a-z][a-z0-9-]{1,20}$'),
  add column updated_at timestamptz not null default now();

create index collections_store_id_department_idx
  on public.collections (store_id, department, sort_order);

create trigger collections_touch_updated_at
  before update on public.collections
  for each row execute function app.touch_updated_at();

-- Products ------------------------------------------------------------------------------------

alter table public.products
  add column department text not null
    check (department ~ '^[a-z][a-z0-9-]{1,20}$'),
  add column brand text,
  -- one or two sentences for product cards and search results
  add column summary text,
  add column tags text[] not null default '{}',
  add column is_featured boolean not null default false,
  add column updated_at timestamptz not null default now();

create index products_store_id_department_status_idx
  on public.products (store_id, department, status);

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function app.touch_updated_at();

-- Variants ------------------------------------------------------------------------------------

alter table public.variants
  -- the "was" price shown struck through next to a reduced price, in minor units
  add column compare_at_price_minor integer,
  -- the choices that make this variant, for example {"Size": "Medium", "Colour": "Grey"}
  add column options jsonb not null default '{}',
  add constraint variants_compare_at_above_price
    check (compare_at_price_minor is null or compare_at_price_minor > price_minor),
  add constraint variants_options_is_object
    check (jsonb_typeof(options) = 'object');

-- Product images ------------------------------------------------------------------------------

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  -- a site-relative path or an absolute https URL
  path text not null,
  alt text not null,
  position integer not null default 0,
  -- intrinsic size, so pages reserve space and do not shift as images load
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamptz not null default now(),
  foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade
);

create index product_images_product_id_store_id_position_idx
  on public.product_images (product_id, store_id, position);
create index product_images_store_id_idx on public.product_images (store_id);

select app.enable_store_rls(
  'public.product_images',
  'exists (
     select 1 from public.products p
     where p.id = product_images.product_id
       and p.store_id = product_images.store_id
       and p.status = ''active''
   )'
);
