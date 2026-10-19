-- ============================================================================
--  Pickup points become rows the owner can edit, not a list in the code.
--
--  Five points went in by hand in four days, each one a code change AND a
--  migration, with the customer-facing failure — "Unknown pickup point" at the
--  last step of the form — waiting whenever the two got out of step.
--
--  They now live in one table. Admin → Riders & Deliveries → Pickup points
--  adds and edits them, the quote reads them, and this function prices from
--  them. Adding the sixth will be a row, and nothing else.
--
--  The seed below is exactly the five live points, with the owner's own pins,
--  so running this changes no quote and no existing delivery. Deliveries keep
--  the origin_id they were booked with even if a point is later retired.
--
--  Run once in the Supabase SQL editor, AFTER add_delivery_origins_aquantuo_tumamziko.sql. Safe to re-run.
-- ============================================================================

create table if not exists public.delivery_origins (
  -- A short slug, because it is written into every delivery row and into the
  -- link the owner sends (?from=…).
  id           text primary key check (id ~ '^[a-z][a-z0-9_]{1,31}$'),
  /** What a CUSTOMER sees — an area, never the premises. */
  name         text not null,
  /** Customer-safe one-liner, e.g. "Goods coming out of clearing". */
  detail       text not null default '',
  /** Dashboard only: the firm, the street, the gate. Never shown to a customer. */
  admin_detail text not null default '',
  lat          numeric(9,6) not null check (lat between -5.5 and 5.5),
  lng          numeric(9,6) not null check (lng between 33.0 and 42.5),
  /** Retired rather than deleted, so old deliveries still name where they came from. */
  active       boolean not null default true,
  sort_order   int not null default 100,
  created_at   timestamptz not null default now()
);

insert into public.delivery_origins (id, name, detail, admin_detail, lat, lng, sort_order) values
  ('cbd',        'Nairobi CBD',    'Items already in Nairobi',    'Dynamic Mall, Shop ML 135, Tom Mboya Street',              -1.285465, 36.826668, 10),
  ('industrial', 'Industrial Area','Goods coming out of clearing','Salihiya World Cargo',                                     -1.299687, 36.839082, 20),
  ('tumamziko',  'Industrial Area','Goods coming out of clearing','Tuma Mziko Limited, Homa Bay Road, Industrial Area',       -1.304722, 36.847500, 30),
  ('safariline', 'Eastleigh',      'Goods coming out of clearing','Safariline Cargo, Captain Mungai Street (off 4th Street), Eastleigh', -1.273027, 36.847682, 40),
  ('aquantuo',   'Imara Daima',    'Goods coming out of clearing','Aquantuo Kenya, Gatoto Road, Imara Daima',                 -1.318691, 36.868580, 50)
on conflict (id) do nothing;

alter table public.delivery_origins enable row level security;

-- The public quote needs to read them; the areas are already on the page.
drop policy if exists "origins readable" on public.delivery_origins;
create policy "origins readable" on public.delivery_origins
  for select using (true);

-- Only an admin adds, edits or retires a pickup point.
drop policy if exists "admin manages origins" on public.delivery_origins;
create policy "admin manages origins" on public.delivery_origins
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


create or replace function public.request_delivery(
  p_customer_name  text,
  p_customer_phone text,
  p_customer_email text,
  p_item           text,
  p_origin_id      text,
  p_delivery_type  text,
  p_courier_name   text,
  p_lat            numeric,
  p_lng            numeric,
  p_label          text,
  p_km             numeric,
  p_bulky          boolean default false,
  p_reference      text default null,
  p_receiver_name  text default null,
  p_receiver_phone text default null,
  p_receiver_dest  text default null,
  p_parcel_notes   text default null,
  p_building       text default null,
  p_unit           text default null,
  p_gate           text default null,
  p_instructions   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rider uuid;
  v_rate  int;
  v_min   int;
  v_bulky int;
  v_fee   int;
  v_km    numeric;
  v_straight numeric;
  v_olat  numeric;
  v_olng  numeric;
  v_type  text;
  v_label text;
  v_token text;
begin
  select rate_per_km, minimum_fee, bulky_surcharge
    into v_rate, v_min, v_bulky
    from public.delivery_pricing where id = 1;
  v_rate  := coalesce(v_rate, 60);
  v_min   := coalesce(v_min, 300);
  v_bulky := coalesce(v_bulky, 150);

  perform 1 from public.delivery_origins where id = p_origin_id and active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Unknown pickup point.');
  end if;

  v_type := case when lower(coalesce(p_delivery_type, '')) = 'parcel' then 'parcel' else 'doorstep' end;

  if v_type = 'parcel' then
    -- What the courier will ask for at the counter.
    if coalesce(trim(p_courier_name), '') = '' then
      return jsonb_build_object('ok', false, 'error', 'Please tell us which courier you are using.');
    end if;
    if coalesce(trim(p_receiver_name), '') = '' then
      return jsonb_build_object('ok', false, 'error', 'Please give the name of whoever is receiving it.');
    end if;
    if coalesce(trim(p_receiver_phone), '') = '' then
      return jsonb_build_object('ok', false, 'error', 'The courier needs a phone number for the receiver.');
    end if;
    if coalesce(trim(p_receiver_dest), '') = '' then
      return jsonb_build_object('ok', false, 'error', 'Please say which town it is going to.');
    end if;

    -- Flat. Every courier office in town sits inside the minimum fare from
    -- any pickup point, so measuring a route would produce the same number
    -- with extra steps — and a wrong pin would produce a wrong one.
    v_km  := 0;
    v_fee := v_min + case when coalesce(p_bulky, false) then v_bulky else 0 end;
    v_label := trim(p_courier_name) || ' → ' || trim(p_receiver_dest);

  else
    -- Doorstep still needs the pin: the ride really is to their door.
    if p_lat is null or p_lng is null then
      return jsonb_build_object('ok', false, 'error', 'We need your location pin.');
    end if;
    if p_lat < -5.5 or p_lat > 5.5 or p_lng < 33.0 or p_lng > 42.5 then
      return jsonb_build_object('ok', false, 'error', 'That pin is outside Kenya.');
    end if;

    select lat, lng into v_olat, v_olng
      from public.delivery_origins where id = p_origin_id and active;

    -- The browser measures the distance and the browser can be edited, so
    -- never price below the straight line between the two points.
    v_straight := 2 * 6371 * asin(least(1, sqrt(
        sin(radians(p_lat - v_olat) / 2) ^ 2
      + cos(radians(v_olat)) * cos(radians(p_lat)) * sin(radians(p_lng - v_olng) / 2) ^ 2
    )));

    v_km := greatest(coalesce(p_km, 0), v_straight);
    v_km := greatest(0, least(v_km, 500));
    v_fee := greatest(ceil((v_km * v_rate) / 10.0) * 10, v_min)::int
             + case when coalesce(p_bulky, false) then v_bulky else 0 end;
    v_label := nullif(left(coalesce(p_label, ''), 200), '');
  end if;

  select id into v_rider from public.riders
   where active and is_default order by name limit 1;
  if v_rider is null then
    select id into v_rider from public.riders where active order by name limit 1;
  end if;

  insert into public.deliveries (
    rider_id, customer_name, customer_phone, customer_email, item_description,
    invoice_number, origin_id, delivery_type, courier_name,
    receiver_name, receiver_phone, receiver_destination, parcel_notes,
    drop_lat, drop_lng, drop_label, distance_km, is_bulky,
    delivery_fee_kes, source, notes,
    drop_building, drop_unit, drop_gate, drop_instructions
  ) values (
    v_rider,
    nullif(left(coalesce(p_customer_name, ''), 120), ''),
    nullif(left(coalesce(p_customer_phone, ''), 40), ''),
    nullif(lower(left(coalesce(p_customer_email, ''), 160)), ''),
    nullif(left(coalesce(p_item, ''), 300), ''),
    nullif(left(coalesce(p_reference, ''), 60), ''),
    p_origin_id, v_type,
    nullif(left(coalesce(p_courier_name, ''), 120), ''),
    nullif(left(coalesce(p_receiver_name, ''), 120), ''),
    nullif(left(coalesce(p_receiver_phone, ''), 40), ''),
    nullif(left(coalesce(p_receiver_dest, ''), 160), ''),
    nullif(left(coalesce(p_parcel_notes, ''), 500), ''),
    case when v_type = 'parcel' then null else p_lat end,
    case when v_type = 'parcel' then null else p_lng end,
    v_label,
    case when v_type = 'parcel' then null else round(v_km, 1) end,
    coalesce(p_bulky, false), v_fee,
    'customer',
    'Booked by the customer from their own link.',
    -- Address detail belongs to a doorstep job only. A parcel goes to a
    -- counter; nobody is looking for a gate.
    case when v_type = 'parcel' then null else nullif(left(coalesce(p_building, ''), 160), '') end,
    case when v_type = 'parcel' then null else nullif(left(coalesce(p_unit, ''), 60), '') end,
    case when v_type = 'parcel' then null else nullif(left(coalesce(p_gate, ''), 120), '') end,
    case when v_type = 'parcel' then null else nullif(left(coalesce(p_instructions, ''), 500), '') end
  )
  returning customer_token into v_token;

  return jsonb_build_object(
    'ok', true,
    'customerToken', v_token,
    'deliveryFeeKES', v_fee,
    'deliveryType', v_type,
    'assigned', v_rider is not null
  );
end;
$$;

grant execute on function public.request_delivery(text, text, text, text, text, text, text, numeric, numeric, text, numeric, boolean, text, text, text, text, text, text, text, text, text) to anon, authenticated;


-- ------------------------------------------------------------------
-- Ran clean? Want: points = 5, reads_table = true, no_hardcoded_list = true.
-- ------------------------------------------------------------------
select
  (select count(*) from public.delivery_origins where active) as points,
  (select position('from public.delivery_origins' in pg_get_functiondef(p.oid)) > 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'request_delivery' limit 1
  ) as reads_table,
  (select position('''safariline''' in pg_get_functiondef(p.oid)) = 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'request_delivery' limit 1
  ) as no_hardcoded_list;
