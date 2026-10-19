-- Rollie store: initial schema
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- All times are Singapore time. Delivery is weekends only, capped per day.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Store settings (single row, edited from the admin page)
-- ---------------------------------------------------------------------------
create table store_settings (
  id                 boolean primary key default true check (id), -- enforces a single row
  store_name         text    not null default 'Rollie',
  daily_order_cap    int     not null default 10 check (daily_order_cap >= 0),
  min_lead_days      int     not null default 1  check (min_lead_days >= 0),  -- earliest delivery = today + this
  max_advance_days   int     not null default 28 check (max_advance_days > 0), -- how far ahead customers can book
  paynow_uen         text,                                                  -- shown under the QR code
  paynow_qr_url      text,                                                  -- static PayNow QR image
  admin_email        text,                                                  -- where new-order alerts go
  updated_at         timestamptz not null default now()
);
insert into store_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Products and inventory
-- ---------------------------------------------------------------------------
create table products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text,
  price_cents  int  not null check (price_cents >= 0),
  image_url    text,
  stock        int  not null default 0 check (stock >= 0),
  is_active    boolean not null default true,  -- hide out-of-season treats
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customers (basic CRM)
-- ---------------------------------------------------------------------------
create table customers (
  id           uuid primary key default gen_random_uuid(),
  full_name    text   not null,
  email        citext not null unique,
  phone        text   not null,
  pet_name     text,
  address      text   not null,
  postal_code  text,
  notes        text,                 -- admin-only notes
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Delivery
-- ---------------------------------------------------------------------------
create table delivery_time_slots (
  code        text primary key,
  label       text not null,
  start_time  time not null,
  end_time    time not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  check (end_time > start_time)
);

insert into delivery_time_slots (code, label, start_time, end_time, sort_order) values
  ('morning',   'Morning (9am – 12pm)',  '09:00', '12:00', 1),
  ('afternoon', 'Afternoon (12pm – 4pm)', '12:00', '16:00', 2),
  ('evening',   'Evening (4pm – 8pm)',    '16:00', '20:00', 3);

-- Weekends you can't deliver (holidays, sold out, etc.)
create table delivery_closed_dates (
  date    date primary key,
  reason  text
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create type order_status as enum ('pending_payment', 'paid', 'delivered', 'cancelled');

create sequence order_ref_seq start 1001;

create table orders (
  id                          uuid primary key default gen_random_uuid(),
  order_ref                   text not null unique default ('RL' || nextval('order_ref_seq')),
  customer_id                 uuid not null references customers(id),
  status                      order_status not null default 'pending_payment',
  delivery_date               date not null check (extract(isodow from delivery_date) in (6, 7)),
  delivery_slot               text not null references delivery_time_slots(code),
  delivery_address            text not null,     -- snapshot at time of order
  pet_name                    text,
  subtotal_cents              int  not null check (subtotal_cents >= 0),
  customer_note               text,
  payment_validated_at        timestamptz,
  confirmation_email_sent_at  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index orders_delivery_date_idx on orders (delivery_date) where status <> 'cancelled';
create index orders_customer_idx on orders (customer_id);

create table order_items (
  order_id          uuid not null references orders(id) on delete cascade,
  product_id        uuid not null references products(id),
  product_name      text not null,   -- snapshot
  unit_price_cents  int  not null check (unit_price_cents >= 0),
  quantity          int  not null check (quantity > 0),
  primary key (order_id, product_id)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger products_touch       before update on products       for each row execute function touch_updated_at();
create trigger customers_touch      before update on customers      for each row execute function touch_updated_at();
create trigger orders_touch         before update on orders         for each row execute function touch_updated_at();
create trigger store_settings_touch before update on store_settings for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Delivery availability: which weekend days can still be booked
-- ---------------------------------------------------------------------------
create function delivery_availability()
returns table (delivery_date date, booked int, cap int, is_full boolean)
language sql stable security definer set search_path = public as $$
  with s as (select * from store_settings),
  today as (select (now() at time zone 'Asia/Singapore')::date as d),
  days as (
    select g::date as d
    from s, today,
         generate_series(today.d + s.min_lead_days, today.d + s.max_advance_days, interval '1 day') g
    where extract(isodow from g) in (6, 7)
      and g::date not in (select date from delivery_closed_dates)
  )
  select days.d,
         coalesce(count(o.id), 0)::int,
         s.daily_order_cap,
         coalesce(count(o.id), 0) >= s.daily_order_cap
  from days
  cross join s
  left join orders o on o.delivery_date = days.d and o.status <> 'cancelled'
  group by days.d, s.daily_order_cap
  order by days.d;
$$;

-- ---------------------------------------------------------------------------
-- place_order: the only way the public site writes data.
-- Checks the date and daily cap, reserves stock, saves the customer, creates the order.
--
-- p_customer: {"full_name","email","phone","pet_name","address","postal_code"}
-- p_items:    [{"product_id": uuid, "quantity": int}, ...]
-- ---------------------------------------------------------------------------
create function place_order(
  p_customer      jsonb,
  p_items         jsonb,
  p_delivery_date date,
  p_delivery_slot text,
  p_note          text default null
) returns table (order_id uuid, order_ref text, subtotal_cents int)
language plpgsql security definer set search_path = public as $$
declare
  v_settings  store_settings;
  v_today     date := (now() at time zone 'Asia/Singapore')::date;
  v_booked    int;
  v_customer  uuid;
  v_order     orders;
  v_item      jsonb;
  v_product   products;
  v_qty       int;
  v_subtotal  int := 0;
begin
  select * into v_settings from store_settings;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty' using errcode = 'P0001';
  end if;

  -- Delivery date rules
  if extract(isodow from p_delivery_date) not in (6, 7) then
    raise exception 'Delivery is only available on Saturdays and Sundays' using errcode = 'P0001';
  end if;
  if p_delivery_date < v_today + v_settings.min_lead_days
     or p_delivery_date > v_today + v_settings.max_advance_days then
    raise exception 'That delivery date is not open for booking' using errcode = 'P0001';
  end if;
  if exists (select 1 from delivery_closed_dates where date = p_delivery_date) then
    raise exception 'We are not delivering on that date' using errcode = 'P0001';
  end if;
  if not exists (select 1 from delivery_time_slots where code = p_delivery_slot and is_active) then
    raise exception 'Please choose a delivery time slot' using errcode = 'P0001';
  end if;

  -- Serialise bookings for the same day so the cap can't be overshot
  perform pg_advisory_xact_lock(hashtext('delivery:' || p_delivery_date::text));
  select count(*) into v_booked from orders
   where delivery_date = p_delivery_date and status <> 'cancelled';
  if v_booked >= v_settings.daily_order_cap then
    raise exception 'Sorry, % is fully booked. Please pick another day.', to_char(p_delivery_date, 'Dy DD Mon')
      using errcode = 'P0001';
  end if;

  -- Customer: create or refresh by email
  insert into customers (full_name, email, phone, pet_name, address, postal_code)
  values (
    trim(p_customer->>'full_name'),
    trim(p_customer->>'email'),
    trim(p_customer->>'phone'),
    nullif(trim(p_customer->>'pet_name'), ''),
    trim(p_customer->>'address'),
    nullif(trim(p_customer->>'postal_code'), '')
  )
  on conflict (email) do update set
    full_name   = excluded.full_name,
    phone       = excluded.phone,
    pet_name    = coalesce(excluded.pet_name, customers.pet_name),
    address     = excluded.address,
    postal_code = coalesce(excluded.postal_code, customers.postal_code)
  returning id into v_customer;

  insert into orders (customer_id, delivery_date, delivery_slot, delivery_address, pet_name, subtotal_cents, customer_note)
  values (
    v_customer, p_delivery_date, p_delivery_slot,
    trim(p_customer->>'address') || coalesce(' ' || nullif(trim(p_customer->>'postal_code'), ''), ''),
    nullif(trim(p_customer->>'pet_name'), ''),
    0, nullif(trim(p_note), '')
  )
  returning * into v_order;

  -- Items: lock each product row, check stock, decrement
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity' using errcode = 'P0001';
    end if;

    select * into v_product from products
     where id = (v_item->>'product_id')::uuid and is_active
     for update;
    if not found then
      raise exception 'One of the treats in your cart is no longer available' using errcode = 'P0001';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Only % left of %', v_product.stock, v_product.name using errcode = 'P0001';
    end if;

    update products set stock = stock - v_qty where id = v_product.id;
    insert into order_items (order_id, product_id, product_name, unit_price_cents, quantity)
    values (v_order.id, v_product.id, v_product.name, v_product.price_cents, v_qty)
    on conflict on constraint order_items_pkey do update set quantity = order_items.quantity + excluded.quantity;
    v_subtotal := v_subtotal + v_product.price_cents * v_qty;
  end loop;

  update orders set subtotal_cents = v_subtotal where id = v_order.id;

  return query select v_order.id, v_order.order_ref, v_subtotal;
end $$;

-- ---------------------------------------------------------------------------
-- Admin helpers (called server-side with the service role key)
-- ---------------------------------------------------------------------------

-- Mark PayNow payment as received. The app sends the confirmation email after this.
create function mark_order_paid(p_order_id uuid) returns orders
language sql security definer set search_path = public as $$
  update orders
     set status = 'paid', payment_validated_at = now()
   where id = p_order_id and status = 'pending_payment'
  returning *;
$$;

-- Cancel an order and put its stock back on the shelf.
create function cancel_order(p_order_id uuid) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  update orders set status = 'cancelled'
   where id = p_order_id and status in ('pending_payment', 'paid')
  returning * into v_order;
  if found then
    update products p set stock = p.stock + oi.quantity
      from order_items oi
     where oi.order_id = p_order_id and oi.product_id = p.id;
  end if;
  return v_order;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- The public (anon) key can only read the catalogue and call place_order /
-- delivery_availability. Everything else goes through the service role on the server.
-- ---------------------------------------------------------------------------
alter table store_settings        enable row level security;
alter table products              enable row level security;
alter table customers             enable row level security;
alter table delivery_time_slots   enable row level security;
alter table delivery_closed_dates enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;

create policy "public reads active products" on products
  for select to anon, authenticated using (is_active);
create policy "public reads active slots" on delivery_time_slots
  for select to anon, authenticated using (is_active);

-- Public-safe view of settings (no admin email)
create view public_store_settings with (security_invoker = false) as
  select store_name, paynow_uen, paynow_qr_url from store_settings;

revoke all on function mark_order_paid(uuid) from public, anon, authenticated;
revoke all on function cancel_order(uuid)    from public, anon, authenticated;
revoke all on public_store_settings from anon, authenticated;
grant select on public_store_settings to anon, authenticated;
grant execute on function place_order(jsonb, jsonb, date, text, text) to anon, authenticated;
grant execute on function delivery_availability() to anon, authenticated;
