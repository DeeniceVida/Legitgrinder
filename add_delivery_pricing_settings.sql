-- ============================================================================
--  The fee rules move out of the code and into a table the owner can edit.
--
--  Rate, minimum and bulky surcharge were typed in two places — utils/delivery.ts
--  for the quote shown, and inside request_delivery for the fee written — so
--  every price change meant a code edit AND a migration, with a real chance of
--  the page promising one number while the booking recorded another.
--
--  They now live in ONE row that both sides read: Admin → Riders & Deliveries
--  edits it, the page quotes from it, and this function prices from it. The
--  defaults below are today's live numbers, so running this changes no price.
--
--  Deliveries already booked keep the fee they were quoted — nothing is
--  recalculated, ever.
--
--  Run once in the Supabase SQL editor, AFTER add_delivery_rate_60.sql.
--  Safe to re-run.
-- ============================================================================

create table if not exists public.delivery_pricing (
  -- One row, forever. The check is what stops a second one appearing and the
  -- two sides of the site disagreeing about which is real.
  id              int primary key default 1 check (id = 1),
  rate_per_km     int not null default 60  check (rate_per_km between 1 and 1000),
  minimum_fee     int not null default 300 check (minimum_fee between 0 and 20000),
  bulky_surcharge int not null default 150 check (bulky_surcharge between 0 and 20000),
  updated_at      timestamptz not null default now()
);

insert into public.delivery_pricing (id, rate_per_km, minimum_fee, bulky_surcharge)
values (1, 60, 300, 150)
on conflict (id) do nothing;

alter table public.delivery_pricing enable row level security;

-- Anyone pricing a delivery needs to read it; the quote is public already.
drop policy if exists "pricing readable" on public.delivery_pricing;
create policy "pricing readable" on public.delivery_pricing
  for select using (true);

-- Only an admin changes what a delivery costs.
drop policy if exists "admin edits pricing" on public.delivery_pricing;
create policy "admin edits pricing" on public.delivery_pricing
  for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
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

  if coalesce(p_origin_id, '') not in ('cbd', 'industrial', 'safariline') then
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

    select lat, lng into v_olat, v_olng from (values
      ('cbd',        -1.2854649::numeric, 36.8266681::numeric),
      ('industrial', -1.2996869::numeric, 36.839082::numeric),
      ('safariline', -1.273027::numeric,  36.847682::numeric)
    ) as o(id, lat, lng) where o.id = p_origin_id;

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
-- Ran clean? Want: rate 60, minimum 300, bulky 150, reads_table = true.
-- ------------------------------------------------------------------
select
  p.rate_per_km, p.minimum_fee, p.bulky_surcharge,
  (select position('from public.delivery_pricing' in pg_get_functiondef(f.oid)) > 0
     from pg_proc f join pg_namespace n on n.oid = f.pronamespace
    where n.nspname = 'public' and f.proname = 'request_delivery' limit 1
  ) as reads_table
from public.delivery_pricing p where p.id = 1;
