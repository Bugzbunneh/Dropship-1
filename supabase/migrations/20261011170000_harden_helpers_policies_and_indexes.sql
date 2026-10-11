-- Fixes the findings from Supabase's database advisors on the first migration:
--   * helper functions did not pin their search_path (security advisor 0011)
--   * signed-in users had two permissive SELECT policies per table (performance advisor 0006)
--   * composite foreign keys had no covering index (performance advisor 0001)
-- Behaviour is unchanged: the same rows are visible and writable to the same people.

-- Pin search_path ------------------------------------------------------------------------------

alter function app.current_store_id() set search_path = '';

-- Standard store policies, version 2 ------------------------------------------------------------
--
-- anon (the storefront):    sees its own store's published rows
-- authenticated:            the same, plus everything in stores they operate, in ONE policy so
--                           Postgres evaluates a single expression per row
-- writes:                   owners and operators of the row's store only
--
-- The helper first drops any earlier version of these policies, so it can be re-run on a table.
create or replace function app.enable_store_rls(target regclass, storefront_visible text default 'true')
returns void
language plpgsql
set search_path = ''
as $$
declare
  policy_name text;
begin
  execute format('alter table %s enable row level security', target);

  -- privileges are the outer fence, policies the inner one
  execute format('revoke all on table %s from public, anon, authenticated', target);
  execute format('grant select on table %s to anon', target);
  execute format('grant select, insert, update, delete on table %s to authenticated', target);
  execute format('grant all on table %s to service_role', target);

  foreach policy_name in array array[
    'storefront_read', 'operator_read', 'authenticated_read',
    'operator_insert', 'operator_update', 'operator_delete'
  ] loop
    execute format('drop policy if exists %I on %s', policy_name, target);
  end loop;

  execute format(
    'create policy storefront_read on %s for select to anon
       using (store_id = (select app.current_store_id()) and (%s))',
    target, storefront_visible
  );
  execute format(
    'create policy authenticated_read on %s for select to authenticated
       using (
         (store_id = (select app.current_store_id()) and (%s))
         or (select app.is_operator_of(store_id))
       )',
    target, storefront_visible
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

-- Re-apply to the existing tables (same visibility rules as the first migration)

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
drop policy if exists storefront_read on public.stores;
drop policy if exists operator_read on public.stores;
drop policy if exists authenticated_read on public.stores;

create policy storefront_read on public.stores for select to anon
  using (id = (select app.current_store_id()));
create policy authenticated_read on public.stores for select to authenticated
  using (
    id = (select app.current_store_id())
    or (select app.is_operator_of(id))
  );

-- Covering indexes for the composite foreign keys -----------------------------------------------

drop index if exists public.variants_product_id_idx;
create index variants_product_id_store_id_idx
  on public.variants (product_id, store_id);

drop index if exists public.product_collections_collection_id_idx;
create index product_collections_product_id_store_id_idx
  on public.product_collections (product_id, store_id);
create index product_collections_collection_id_store_id_idx
  on public.product_collections (collection_id, store_id);
create index product_collections_store_id_idx
  on public.product_collections (store_id);
