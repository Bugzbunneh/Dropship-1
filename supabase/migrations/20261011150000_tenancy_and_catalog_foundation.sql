-- Tenancy foundation: stores, operators and the first catalog tables.
--
-- Isolation rules (see "Multi-store model" in the README):
--   * every store-owned table carries a NOT NULL store_id referencing stores(id)
--   * every table has row-level security enabled, applied through app.enable_store_rls()
--   * the storefront reads with a JWT carrying a `store_id` claim and can only see that store's
--     published rows; operators are matched through the operators table
--   * cost and margin data must never live on a storefront-readable table, because row-level
--     security cannot hide individual columns. Keep it in operator-only tables.

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

-- Tables ---------------------------------------------------------------------------------------

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9-]{1,30}[a-z0-9]$'),
  name text not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

create table public.operators (
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  role text not null check (role in ('owner', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (store_id, slug),
  -- lets child tables reference (id, store_id) so a row can never point into another store
  unique (id, store_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  unique (store_id, slug),
  unique (id, store_id)
);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  sku text not null,
  title text not null,
  -- money is an integer in minor units (pence) with a currency code, never a float
  price_minor integer not null check (price_minor >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  is_available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (store_id, sku),
  foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade
);

create table public.product_collections (
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  collection_id uuid not null,
  position integer not null default 0,
  primary key (product_id, collection_id),
  foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade,
  foreign key (collection_id, store_id) references public.collections (id, store_id)
    on delete cascade
);

create index variants_product_id_idx on public.variants (product_id);
create index product_collections_collection_id_idx on public.product_collections (collection_id);
create index operators_store_id_idx on public.operators (store_id);

-- Helpers --------------------------------------------------------------------------------------

-- The store the current request is acting for, taken from the signed JWT. Null when absent,
-- which makes every storefront policy match nothing.
create function app.current_store_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'store_id', '')::uuid
$$;

-- True when the signed-in user holds one of the given roles for the store. Security definer so it
-- can read operators without that table's own policies getting in the way.
create function app.is_operator_of(
  target_store uuid,
  allowed_roles text[] default array['owner', 'operator', 'viewer']
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operators o
    where o.user_id = (select auth.uid())
      and o.store_id = target_store
      and o.role = any (allowed_roles)
  )
$$;

revoke all on function app.current_store_id() from public;
revoke all on function app.is_operator_of(uuid, text[]) from public;
grant execute on function app.current_store_id() to anon, authenticated, service_role;
grant execute on function app.is_operator_of(uuid, text[]) to anon, authenticated, service_role;

-- Applies the standard protections to a store-owned table. Every future table with a store_id
-- should be passed through this in its own migration.
--   storefront_visible: extra SQL condition for what the storefront may see, e.g. status = 'active'
create function app.enable_store_rls(target regclass, storefront_visible text default 'true')
returns void
language plpgsql
as $$
begin
  execute format('alter table %s enable row level security', target);

  -- privileges are the outer fence, policies the inner one
  execute format('revoke all on table %s from public, anon, authenticated', target);
  execute format('grant select on table %s to anon', target);
  execute format('grant select, insert, update, delete on table %s to authenticated', target);
  execute format('grant all on table %s to service_role', target);

  execute format(
    'create policy storefront_read on %s for select to anon, authenticated
       using (store_id = (select app.current_store_id()) and (%s))',
    target, storefront_visible
  );
  execute format(
    'create policy operator_read on %s for select to authenticated
       using ((select app.is_operator_of(store_id)))',
    target
  );
  execute format(
    'create policy operator_insert on %s for insert to authenticated
       with check ((select app.is_operator_of(store_id, array[''owner'', ''operator''])))',
    target
  );
  execute format(
    'create policy operator_update on %s for update to authenticated
       using ((select app.is_operator_of(store_id, array[''owner'', ''operator''])))
       with check ((select app.is_operator_of(store_id, array[''owner'', ''operator''])))',
    target
  );
  execute format(
    'create policy operator_delete on %s for delete to authenticated
       using ((select app.is_operator_of(store_id, array[''owner'', ''operator''])))',
    target
  );
end;
$$;

revoke all on function app.enable_store_rls(regclass, text) from public;

-- Row-level security ----------------------------------------------------------------------------

select app.enable_store_rls(
  'public.collections',
  'collections.is_published'
);

select app.enable_store_rls(
  'public.products',
  'products.status = ''active'''
);

select app.enable_store_rls(
  'public.variants',
  'exists (
     select 1 from public.products p
     where p.id = variants.product_id
       and p.store_id = variants.store_id
       and p.status = ''active''
   )'
);

select app.enable_store_rls(
  'public.product_collections',
  'exists (
     select 1 from public.products p
     where p.id = product_collections.product_id
       and p.store_id = product_collections.store_id
       and p.status = ''active''
   )
   and exists (
     select 1 from public.collections c
     where c.id = product_collections.collection_id
       and c.store_id = product_collections.store_id
       and c.is_published
   )'
);

-- stores: the storefront sees its own row, operators see the stores they work on.
-- Writes go through the service role only (create-store script, migrations).
alter table public.stores enable row level security;
revoke all on table public.stores from public, anon, authenticated;
grant select on table public.stores to anon, authenticated;
grant all on table public.stores to service_role;

create policy storefront_read on public.stores for select to anon, authenticated
  using (id = (select app.current_store_id()));
create policy operator_read on public.stores for select to authenticated
  using ((select app.is_operator_of(id)));

-- operators: a user can see their own memberships. Writes go through the service role only.
alter table public.operators enable row level security;
revoke all on table public.operators from public, anon, authenticated;
grant select on table public.operators to authenticated;
grant all on table public.operators to service_role;

create policy own_memberships on public.operators for select to authenticated
  using (user_id = (select auth.uid()));
