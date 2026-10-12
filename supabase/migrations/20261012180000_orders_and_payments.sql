-- Orders and payments (Phase 2).
--
-- What is new here, and the rules it keeps:
--   * Order tables hold customers' names, addresses and emails, so none of them is readable by the
--     storefront's `anon` role. The storefront server acts through its own role, `storefront_server`,
--     which can reach only the rows of the store named in its token, and only through the few
--     columns and functions below. It cannot read or change the catalog's cost data, other
--     stores, or anything it is not granted.
--   * An order's identity and amounts never change after it is created. Its status moves only along
--     the allowed edges in app.order_status_transitions (the same table as @dropship/core).
--   * Every status change writes an audit row and, where it applies, queues the customer's email,
--     in the same transaction. The audit log can't be edited.
--   * Stripe webhooks are applied by one function that records the event and changes the order in a
--     single transaction, so a replayed event does nothing and a crash can't lose a payment.

-- Reading the store claim without the auth schema ---------------------------------------------------
-- A custom role cannot be given access to the `auth` schema on Supabase, so the helper reads the
-- JWT claims PostgREST sets directly. This is what auth.jwt() itself does.

create function app.jwt_claim(claim text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> claim
$$;

create or replace function app.current_store_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(app.jwt_claim('store_id'), '')::uuid
$$;

revoke all on function app.jwt_claim(text) from public;
grant execute on function app.jwt_claim(text)
  to anon, authenticated, service_role;
grant execute on function app.current_store_id()
  to anon, authenticated, service_role;

-- The storefront server's role ------------------------------------------------------------------------
-- PostgREST switches to the role named in the token. `authenticator` is the login role it connects
-- as, so it must be allowed to become this one.

create role storefront_server nologin noinherit;
grant storefront_server to authenticator;
grant usage on schema public, app to storefront_server;
grant execute on function app.jwt_claim(text) to storefront_server;
grant execute on function app.current_store_id() to storefront_server;

-- Reference data: statuses and the moves between them -----------------------------------------------

create table app.order_statuses (
  status text primary key
);

insert into app.order_statuses (status) values
  ('pending_payment'), ('paid'), ('supplier_pending'), ('supplier_ordered'), ('shipped'),
  ('delivered'), ('cancelled'), ('supplier_failed'), ('out_of_stock'), ('address_issue'),
  ('refund_requested'), ('refunded'), ('disputed'), ('delivery_overdue');

create table app.order_status_transitions (
  from_status text not null references app.order_statuses (status),
  to_status text not null references app.order_statuses (status),
  primary key (from_status, to_status),
  check (from_status <> to_status)
);

insert into app.order_status_transitions (from_status, to_status) values
  ('pending_payment', 'paid'),
  ('pending_payment', 'cancelled'),
  ('paid', 'supplier_pending'),
  ('paid', 'address_issue'),
  ('paid', 'refund_requested'),
  ('paid', 'refunded'),
  ('supplier_pending', 'supplier_ordered'),
  ('supplier_pending', 'supplier_failed'),
  ('supplier_pending', 'out_of_stock'),
  ('supplier_pending', 'address_issue'),
  ('supplier_pending', 'refund_requested'),
  ('supplier_ordered', 'shipped'),
  ('supplier_ordered', 'supplier_failed'),
  ('supplier_ordered', 'out_of_stock'),
  ('supplier_ordered', 'refund_requested'),
  ('shipped', 'delivered'),
  ('shipped', 'delivery_overdue'),
  ('shipped', 'refund_requested'),
  ('shipped', 'disputed'),
  ('delivery_overdue', 'delivered'),
  ('delivery_overdue', 'refund_requested'),
  ('delivery_overdue', 'disputed'),
  ('delivered', 'refund_requested'),
  ('delivered', 'disputed'),
  ('supplier_failed', 'supplier_pending'),
  ('supplier_failed', 'refund_requested'),
  ('supplier_failed', 'refunded'),
  ('out_of_stock', 'supplier_pending'),
  ('out_of_stock', 'refund_requested'),
  ('out_of_stock', 'refunded'),
  ('address_issue', 'supplier_pending'),
  ('address_issue', 'refund_requested'),
  ('address_issue', 'refunded'),
  ('refund_requested', 'refunded'),
  ('refund_requested', 'supplier_pending'),
  ('refund_requested', 'supplier_ordered'),
  ('refund_requested', 'shipped'),
  ('refund_requested', 'delivery_overdue'),
  ('refund_requested', 'delivered'),
  ('disputed', 'refunded'),
  ('disputed', 'delivered');

-- Internal tables, not exposed through the API (only the public schema is).
revoke all on table app.order_statuses, app.order_status_transitions from public, anon, authenticated;
grant select on table app.order_statuses, app.order_status_transitions to service_role;

-- Which email each milestone sends. Mirrors emailForStatus() in @dropship/core, and a test checks it.
create function app.email_kind_for_status(target_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case target_status
    when 'paid' then 'order_confirmation'
    when 'shipped' then 'order_shipped'
    when 'delivered' then 'order_delivered'
  end
$$;

-- Protection for tables that hold customers' data ------------------------------------------------------
-- Like app.enable_store_rls, but the storefront (anon) gets nothing at all. Operators can read their
-- own stores' rows; writes come from the functions below or, later, the admin app's own policies.

create function app.enable_private_store_rls(target regclass)
returns void
language plpgsql
set search_path = ''
as $$
declare
  policy_name text;
begin
  execute format('alter table %s enable row level security', target);

  execute format('revoke all on table %s from public, anon, authenticated', target);
  execute format('grant select on table %s to authenticated', target);
  execute format('grant all on table %s to service_role', target);

  foreach policy_name in array array['operator_read', 'authenticated_read', 'storefront_read'] loop
    execute format('drop policy if exists %I on %s', policy_name, target);
  end loop;

  execute format(
    'create policy operator_read on %s for select to authenticated
       using ((select app.is_operator_of(store_id)))',
    target
  );
end;
$$;

revoke all on function app.enable_private_store_rls(regclass) from public;

-- Tables ----------------------------------------------------------------------------------------------

-- Lets order lines reference (variant, store), so a line can never point into another store.
alter table public.variants add constraint variants_id_store_id_key unique (id, store_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  -- what the customer quotes, for example PP-7K3M-9Q2X; random, so it can't be counted or guessed
  number text not null,
  status text not null default 'pending_payment' references app.order_statuses (status),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  -- money is an integer in minor units. Prices include VAT, so total = subtotal + shipping, and
  -- tax_minor is the VAT already inside the total (zero while the business is not VAT registered).
  subtotal_minor integer not null check (subtotal_minor >= 0),
  shipping_minor integer not null check (shipping_minor >= 0),
  tax_minor integer not null check (tax_minor >= 0),
  total_minor integer not null check (total_minor >= 0),
  -- collected by Stripe Checkout, so unknown until the order is paid
  customer_email text check (customer_email = lower(customer_email) and customer_email like '%@%'),
  customer_name text,
  customer_phone text,
  shipping_address jsonb,
  stripe_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, number),
  unique (store_id, stripe_session_id),
  unique (id, store_id),
  check (total_minor = subtotal_minor + shipping_minor),
  check (tax_minor <= total_minor)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_id uuid not null,
  -- kept if the product is later removed, but the snapshot below is what the customer bought
  variant_id uuid,
  sku text not null,
  title text not null,
  variant_title text not null,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity between 1 and 100),
  line_total_minor integer not null check (line_total_minor = unit_price_minor * quantity),
  image_path text,
  created_at timestamptz not null default now(),
  foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade,
  foreign key (variant_id, store_id) references public.variants (id, store_id)
    on delete set null (variant_id)
);

-- The audit log: one row per change. Append-only.
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_id uuid not null,
  kind text not null,
  from_status text,
  to_status text,
  -- who or what did it: 'stripe', 'system', or 'user:<id>'
  actor text not null,
  stripe_event_id text,
  detail jsonb not null default '{}'::jsonb,
  -- the real time of the change, so rows written in one transaction still sort in order
  created_at timestamptz not null default clock_timestamp(),
  foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade
);

-- Every Stripe event we have applied, so a replay is recognised and ignored.
create table public.stripe_events (
  store_id uuid not null references public.stores (id) on delete cascade,
  id text not null,
  type text not null,
  order_id uuid,
  outcome text not null,
  received_at timestamptz not null default now(),
  primary key (store_id, id)
);

-- Emails to send, one per order and kind. Created by the status trigger, sent by the storefront.
create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_id uuid not null,
  kind text not null check (kind in ('order_confirmation', 'order_shipped', 'order_delivered')),
  to_address text not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (order_id, kind),
  foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade
);

-- Where an order's parcel is. One per order for now; Phase 3 adds supplier fulfilments.
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_id uuid not null,
  carrier text not null,
  tracking_number text,
  tracking_url text check (tracking_url is null or tracking_url like 'https://%'),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id),
  foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade
);

-- Covering indexes for the foreign keys
create index orders_store_id_created_at_idx on public.orders (store_id, created_at desc);
-- the queue of orders in a given state, for fulfilment and the exceptions inbox
create index orders_status_store_id_idx on public.orders (status, store_id, created_at);
create index order_items_order_id_store_id_idx on public.order_items (order_id, store_id);
create index order_items_store_id_idx on public.order_items (store_id);
create index order_items_variant_id_store_id_idx on public.order_items (variant_id, store_id);
create index order_events_order_id_store_id_idx on public.order_events (order_id, store_id, created_at);
create index order_events_store_id_idx on public.order_events (store_id);
create index email_events_order_id_store_id_idx on public.email_events (order_id, store_id);
create index email_events_store_id_status_idx on public.email_events (store_id, status);
create index shipments_order_id_store_id_idx on public.shipments (order_id, store_id);
create index shipments_store_id_idx on public.shipments (store_id);

select app.enable_private_store_rls('public.orders');
select app.enable_private_store_rls('public.order_items');
select app.enable_private_store_rls('public.order_events');
select app.enable_private_store_rls('public.stripe_events');
select app.enable_private_store_rls('public.email_events');
select app.enable_private_store_rls('public.shipments');

-- Triggers --------------------------------------------------------------------------------------------

-- Writes an audit row. Security definer so that the app's role can cause audit rows to exist
-- without being able to write (or edit) them directly.
create function app.log_order_event(
  target_order uuid,
  target_store uuid,
  event_kind text,
  old_status text,
  new_status text,
  event_detail jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.order_events
    (store_id, order_id, kind, from_status, to_status, actor, stripe_event_id, detail)
  values (
    target_store,
    target_order,
    event_kind,
    old_status,
    new_status,
    coalesce(
      nullif(current_setting('app.actor', true), ''),
      case when app.jwt_claim('sub') is not null then 'user:' || app.jwt_claim('sub') end,
      'system'
    ),
    nullif(current_setting('app.stripe_event_id', true), ''),
    coalesce(event_detail, '{}'::jsonb)
  )
$$;

revoke all on function app.log_order_event(uuid, uuid, text, text, text, jsonb) from public;
grant execute on function app.log_order_event(uuid, uuid, text, text, text, jsonb)
  to storefront_server;

create function app.orders_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending_payment' then
      raise exception 'a new order must start as pending_payment' using errcode = '23514';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if new.id <> old.id
    or new.store_id <> old.store_id
    or new.number <> old.number
    or new.currency <> old.currency
    or new.subtotal_minor <> old.subtotal_minor
    or new.shipping_minor <> old.shipping_minor
    or new.tax_minor <> old.tax_minor
    or new.total_minor <> old.total_minor
    or new.created_at <> old.created_at
  then
    raise exception 'an order''s identity and amounts cannot be changed' using errcode = '23514';
  end if;

  if new.status <> old.status then
    if not exists (
      select 1 from app.order_status_transitions t
      where t.from_status = old.status and t.to_status = new.status
    ) then
      raise exception 'illegal order status change from % to %', old.status, new.status
        using errcode = '23514';
    end if;
    if new.status = 'paid' and new.paid_at is null then
      new.paid_at := now();
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create function app.orders_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_kind text;
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return null;
  end if;

  perform app.log_order_event(
    new.id,
    new.store_id,
    'status_changed',
    case when tg_op = 'UPDATE' then old.status end,
    new.status
  );

  email_kind := app.email_kind_for_status(new.status);
  if email_kind is not null and new.customer_email is not null then
    insert into public.email_events (store_id, order_id, kind, to_address)
    values (new.store_id, new.id, email_kind, new.customer_email)
    on conflict (order_id, kind) do nothing;
  end if;

  return null;
end;
$$;

create trigger orders_before_write
  before insert or update on public.orders
  for each row execute function app.orders_before_write();

create trigger orders_after_write
  after insert or update of status on public.orders
  for each row execute function app.orders_after_write();

create function app.reject_audit_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'the order audit log cannot be edited' using errcode = '42501';
end;
$$;

create trigger order_events_no_update
  before update on public.order_events
  for each row execute function app.reject_audit_change();

-- What storefront_server may do -------------------------------------------------------------------------
-- Each grant is paired with a policy that pins the rows to the token's store.

grant select, insert on table public.orders to storefront_server;
grant update (
  status, customer_email, customer_name, customer_phone, shipping_address,
  stripe_session_id, stripe_payment_intent_id
) on table public.orders to storefront_server;
grant select, insert on table public.order_items to storefront_server;
grant select on table public.order_events to storefront_server;
grant select, insert on table public.stripe_events to storefront_server;
grant select on table public.email_events to storefront_server;
grant update (status, attempts, last_error, provider_message_id, sent_at)
  on table public.email_events to storefront_server;
grant select on table public.shipments to storefront_server;

create policy server_select on public.orders for select to storefront_server
  using (store_id = (select app.current_store_id()));
create policy server_insert on public.orders for insert to storefront_server
  with check (store_id = (select app.current_store_id()));
create policy server_update on public.orders for update to storefront_server
  using (store_id = (select app.current_store_id()))
  with check (store_id = (select app.current_store_id()));

create policy server_select on public.order_items for select to storefront_server
  using (store_id = (select app.current_store_id()));
create policy server_insert on public.order_items for insert to storefront_server
  with check (store_id = (select app.current_store_id()));

create policy server_select on public.order_events for select to storefront_server
  using (store_id = (select app.current_store_id()));

create policy server_select on public.stripe_events for select to storefront_server
  using (store_id = (select app.current_store_id()));
create policy server_insert on public.stripe_events for insert to storefront_server
  with check (store_id = (select app.current_store_id()));

create policy server_select on public.email_events for select to storefront_server
  using (store_id = (select app.current_store_id()));
create policy server_update on public.email_events for update to storefront_server
  using (store_id = (select app.current_store_id()))
  with check (store_id = (select app.current_store_id()));

create policy server_select on public.shipments for select to storefront_server
  using (store_id = (select app.current_store_id()));

-- The storefront's two operations ---------------------------------------------------------------------
-- Both run as the caller (security invoker), so the policies above apply to everything they touch.

-- Records a new order and its lines together. The lines must add up to the subtotal.
create function public.create_order(
  p_number text,
  p_currency text,
  p_subtotal_minor integer,
  p_shipping_minor integer,
  p_tax_minor integer,
  p_total_minor integer,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_store uuid := (select app.current_store_id());
  v_order uuid;
  v_sum bigint;
begin
  if v_store is null then
    raise exception 'the request does not name a store' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'an order needs at least one item' using errcode = '23514';
  end if;

  insert into public.orders
    (store_id, number, currency, subtotal_minor, shipping_minor, tax_minor, total_minor)
  values
    (v_store, p_number, p_currency, p_subtotal_minor, p_shipping_minor, p_tax_minor, p_total_minor)
  returning id into v_order;

  insert into public.order_items
    (store_id, order_id, variant_id, sku, title, variant_title, unit_price_minor, quantity,
     line_total_minor, image_path)
  select
    v_store,
    v_order,
    (item ->> 'variant_id')::uuid,
    item ->> 'sku',
    item ->> 'title',
    item ->> 'variant_title',
    (item ->> 'unit_price_minor')::integer,
    (item ->> 'quantity')::integer,
    (item ->> 'line_total_minor')::integer,
    item ->> 'image_path'
  from jsonb_array_elements(p_items) as item;

  select coalesce(sum(line_total_minor), 0) into v_sum
  from public.order_items
  where order_id = v_order and store_id = v_store;

  if v_sum <> p_subtotal_minor then
    raise exception 'the order lines add up to %, not the subtotal %', v_sum, p_subtotal_minor
      using errcode = '23514';
  end if;

  return v_order;
end;
$$;

-- Applies one Stripe Checkout event to its order. Returns what happened:
--   paid              the order was pending and is now paid (its confirmation email is queued)
--   cancelled         the checkout expired and the pending order is now cancelled
--   duplicate         this event was applied before; nothing changed
--   already_paid      the order was already past payment; nothing changed
--   awaiting_payment  the checkout finished but the money has not arrived yet (slow payment methods)
--   amount_mismatch   the amount or currency Stripe took is not what the order says; needs a person
--   session_mismatch  the event is for a different checkout session than the order's
--   payment_after_cancel  money arrived for an order that had been cancelled; needs a person
--   unknown_order     no such order for this store
--   ignored           an event type or state that needs no action
-- The event is recorded in the same transaction, so a replay is recognised and a crash cannot
-- lose a payment.
create function public.apply_checkout_event(
  p_event_id text,
  p_event_type text,
  p_order_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_payment_status text,
  p_amount_total integer,
  p_currency text,
  p_customer jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_store uuid := (select app.current_store_id());
  v_order public.orders%rowtype;
  v_outcome text;
  v_email text;
begin
  if v_store is null then
    raise exception 'the request does not name a store' using errcode = '42501';
  end if;

  -- Lock the order first: two deliveries of one event, or two events for one order, queue up here
  -- and the second sees what the first did.
  select * into v_order
  from public.orders
  where id = p_order_id and store_id = v_store
  for update;

  if exists (select 1 from public.stripe_events where store_id = v_store and id = p_event_id) then
    return 'duplicate';
  end if;

  if v_order.id is null then
    v_outcome := 'unknown_order';
  elsif v_order.stripe_session_id is not null and v_order.stripe_session_id <> p_session_id then
    v_outcome := 'session_mismatch';
    perform app.log_order_event(v_order.id, v_store, 'session_mismatch', v_order.status, v_order.status,
      jsonb_build_object('event_session', p_session_id, 'order_session', v_order.stripe_session_id));
  elsif p_event_type = 'checkout.session.expired' then
    if v_order.status = 'pending_payment' then
      perform set_config('app.actor', 'stripe', true);
      perform set_config('app.stripe_event_id', p_event_id, true);
      update public.orders set status = 'cancelled' where id = v_order.id and store_id = v_store;
      v_outcome := 'cancelled';
    else
      v_outcome := 'ignored';
    end if;
  elsif p_event_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded') then
    if p_payment_status not in ('paid', 'no_payment_required') then
      v_outcome := 'awaiting_payment';
    elsif v_order.status = 'pending_payment' then
      if p_amount_total is distinct from v_order.total_minor
        or upper(p_currency) is distinct from v_order.currency
      then
        v_outcome := 'amount_mismatch';
        perform app.log_order_event(v_order.id, v_store, 'amount_mismatch', v_order.status, v_order.status,
          jsonb_build_object(
            'expected_minor', v_order.total_minor, 'received_minor', p_amount_total,
            'expected_currency', v_order.currency, 'received_currency', p_currency));
      else
        v_email := lower(btrim(coalesce(p_customer ->> 'email', '')));
        perform set_config('app.actor', 'stripe', true);
        perform set_config('app.stripe_event_id', p_event_id, true);
        update public.orders
        set status = 'paid',
            customer_email = nullif(v_email, ''),
            customer_name = nullif(btrim(coalesce(p_customer ->> 'name', '')), ''),
            customer_phone = nullif(btrim(coalesce(p_customer ->> 'phone', '')), ''),
            shipping_address = p_customer -> 'shipping',
            stripe_session_id = p_session_id,
            stripe_payment_intent_id = p_payment_intent_id
        where id = v_order.id and store_id = v_store;
        v_outcome := 'paid';
      end if;
    elsif v_order.status = 'cancelled' then
      v_outcome := 'payment_after_cancel';
      perform app.log_order_event(v_order.id, v_store, 'payment_after_cancel', v_order.status, v_order.status,
        jsonb_build_object('received_minor', p_amount_total, 'session', p_session_id));
    else
      v_outcome := 'already_paid';
    end if;
  else
    v_outcome := 'ignored';
  end if;

  insert into public.stripe_events (store_id, id, type, order_id, outcome)
  values (v_store, p_event_id, p_event_type, p_order_id, v_outcome)
  on conflict (store_id, id) do nothing;

  return v_outcome;
end;
$$;

-- Only the storefront's role (and the service role) may call them.
revoke all on function public.create_order(text, text, integer, integer, integer, integer, jsonb)
  from public, anon, authenticated;
revoke all on function public.apply_checkout_event(
  text, text, uuid, text, text, text, integer, text, jsonb
) from public, anon, authenticated;
grant execute on function public.create_order(text, text, integer, integer, integer, integer, jsonb)
  to storefront_server, service_role;
grant execute on function public.apply_checkout_event(
  text, text, uuid, text, text, text, integer, text, jsonb
) to storefront_server, service_role;
