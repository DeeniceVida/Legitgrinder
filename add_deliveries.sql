-- ============================================================================
--  Rider deliveries — the job, the drop, and the courier receipt.
--
--  Riders have no accounts and no passwords. Each rider gets ONE private link
--  (/rider/<token>) that lists their jobs; each delivery gets its own link
--  (/delivery/<token>) that the customer can open to watch it and collect the
--  courier receipt. Both tokens are unguessable and both are revocable.
--
--  Everything a token-holder can do goes through the SECURITY DEFINER
--  functions at the bottom. The tables themselves stay admin-only, so a leaked
--  token exposes exactly one rider's jobs or one delivery — never the roster,
--  never another customer.
--
--  Run once in the Supabase SQL editor, AFTER add_riders.sql. Safe to re-run.
--
--  ⚠ ORDER MATTERS: add_rider_pin.sql runs AFTER this one and REPLACES
--  rider_jobs and rider_update_job with versions that require a PIN. If you
--  re-run this file afterwards you will recreate the older PIN-less versions
--  alongside them, the API will not know which to call, and the rider page
--  will break. Re-run add_rider_pin.sql immediately after if you ever do.
-- ============================================================================

-- ── 1. Each rider gets a revocable link ─────────────────────────────────────
alter table public.riders
  add column if not exists access_token text;

update public.riders
  set access_token = encode(gen_random_bytes(12), 'hex')
  where access_token is null;

alter table public.riders
  alter column access_token set default encode(gen_random_bytes(12), 'hex');

create unique index if not exists riders_access_token_idx
  on public.riders (access_token);


-- ── 2. The deliveries ───────────────────────────────────────────────────────
create table if not exists public.deliveries (
  id               uuid primary key default gen_random_uuid(),
  rider_id         uuid references public.riders(id) on delete set null,
  /** The customer's own link to this one delivery. */
  customer_token   text not null unique default encode(gen_random_bytes(12), 'hex'),

  customer_name    text,
  customer_phone   text,
  item_description text,
  /** Ties it to an order when there is one. Free-text: off-platform sales too. */
  invoice_number   text,

  origin_id        text not null default 'cbd',   -- 'cbd' | 'industrial'
  drop_lat         numeric,
  drop_lng         numeric,
  drop_label       text,                          -- "Westlands, Rhapta Road"

  distance_km      numeric,
  is_bulky         boolean not null default false,
  /** The rider's fee, as agreed. Stored, not recomputed — the rules may change. */
  delivery_fee_kes int,

  status           text not null default 'assigned',  -- assigned | collected | delivered

  -- The onward courier leg (Wells Fargo, a matatu service). Charged at COST:
  -- we deliberately do not maintain a price list for other people's services.
  parcel_service   text,
  parcel_fee_kes   int,
  parcel_ref       text,
  parcel_receipt_url text,

  rider_notes      text,
  notes            text,

  collected_at     timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists deliveries_rider_idx on public.deliveries (rider_id, status, created_at desc);
create index if not exists deliveries_status_idx on public.deliveries (status, created_at desc);

alter table public.deliveries enable row level security;

-- The tables are admin-only. Riders and customers reach them solely through
-- the functions below.
drop policy if exists "admin manages deliveries" on public.deliveries;
create policy "admin manages deliveries" on public.deliveries
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- ── 3. What a rider sees ────────────────────────────────────────────────────
-- Returns that rider's open jobs only. Never the roster, never another rider.
create or replace function public.rider_jobs(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_jobs jsonb;
begin
  if p_token is null or length(p_token) < 12 then
    return jsonb_build_object('ok', false, 'error', 'Invalid link');
  end if;

  select * into v_rider from public.riders
   where access_token = p_token and active limit 1;

  if not found then
    -- Covers both a wrong token and a rider who has been deactivated, which is
    -- how a link is revoked.
    return jsonb_build_object('ok', false, 'error', 'This link is no longer active.');
  end if;

  select coalesce(jsonb_agg(to_jsonb(j) order by j.created_at desc), '[]'::jsonb)
    into v_jobs
  from (
    select d.id, d.customer_name, d.customer_phone, d.item_description,
           d.invoice_number, d.origin_id, d.drop_lat, d.drop_lng, d.drop_label,
           d.distance_km, d.is_bulky, d.delivery_fee_kes, d.status,
           d.parcel_service, d.parcel_fee_kes, d.parcel_ref, d.parcel_receipt_url,
           d.rider_notes, d.customer_token, d.collected_at, d.delivered_at, d.created_at
      from public.deliveries d
     where d.rider_id = v_rider.id
       -- Delivered jobs drop off the list after a week so the page stays useful.
       and (d.status <> 'delivered' or d.delivered_at > now() - interval '7 days')
  ) j;

  return jsonb_build_object(
    'ok', true,
    'rider', jsonb_build_object('name', v_rider.name),
    'jobs', v_jobs
  );
end;
$$;

grant execute on function public.rider_jobs(text) to anon, authenticated;


-- ── 4. What a rider can change ──────────────────────────────────────────────
-- Only their own job, and only these fields. A rider cannot alter the fee they
-- were promised, reassign work, or touch anyone else's delivery.
create or replace function public.rider_update_job(
  p_token       text,
  p_delivery_id uuid,
  p_status      text default null,
  p_service     text default null,
  p_parcel_fee  int  default null,
  p_parcel_ref  text default null,
  p_receipt_url text default null,
  p_notes       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider_id uuid;
begin
  select id into v_rider_id from public.riders
   where access_token = p_token and active limit 1;
  if v_rider_id is null then
    return jsonb_build_object('ok', false, 'error', 'This link is no longer active.');
  end if;

  if p_status is not null and p_status not in ('assigned', 'collected', 'delivered') then
    return jsonb_build_object('ok', false, 'error', 'Unknown status');
  end if;

  update public.deliveries d
     set status             = coalesce(p_status, d.status),
         parcel_service     = coalesce(p_service, d.parcel_service),
         parcel_fee_kes     = coalesce(p_parcel_fee, d.parcel_fee_kes),
         parcel_ref         = coalesce(p_parcel_ref, d.parcel_ref),
         parcel_receipt_url = coalesce(p_receipt_url, d.parcel_receipt_url),
         rider_notes        = coalesce(p_notes, d.rider_notes),
         collected_at       = case when p_status = 'collected' and d.collected_at is null
                                   then now() else d.collected_at end,
         delivered_at       = case when p_status = 'delivered' and d.delivered_at is null
                                   then now() else d.delivered_at end
   where d.id = p_delivery_id
     and d.rider_id = v_rider_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'That job is not on your list.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.rider_update_job(text, uuid, text, text, int, text, text, text) to anon, authenticated;


-- ── 5. What the customer sees ───────────────────────────────────────────────
-- One delivery. Deliberately returns the rider's FIRST NAME and no phone
-- number: the customer needs to know who is coming, not the rider's contacts.
create or replace function public.delivery_status(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if p_token is null or length(p_token) < 12 then
    return jsonb_build_object('ok', false, 'error', 'Invalid link');
  end if;

  select jsonb_build_object(
           'ok', true,
           'customerName', d.customer_name,
           'item', d.item_description,
           'invoiceNumber', d.invoice_number,
           'dropLabel', d.drop_label,
           'distanceKm', d.distance_km,
           'deliveryFeeKES', d.delivery_fee_kes,
           'isBulky', d.is_bulky,
           'status', d.status,
           'riderFirstName', split_part(coalesce(r.name, ''), ' ', 1),
           'parcelService', d.parcel_service,
           'parcelFeeKES', d.parcel_fee_kes,
           'parcelRef', d.parcel_ref,
           'parcelReceiptUrl', d.parcel_receipt_url,
           'collectedAt', d.collected_at,
           'deliveredAt', d.delivered_at,
           'createdAt', d.created_at
         )
    into v
    from public.deliveries d
    left join public.riders r on r.id = d.rider_id
   where d.customer_token = p_token
   limit 1;

  if v is null then
    return jsonb_build_object('ok', false, 'error', 'We could not find that delivery.');
  end if;
  return v;
end;
$$;

grant execute on function public.delivery_status(text) to anon, authenticated;


-- ── 6. Somewhere to put the receipt photos ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('delivery-receipts', 'delivery-receipts', true)
on conflict (id) do nothing;

-- Riders upload without an account, so inserts are open on this bucket only.
-- They can add but never overwrite or remove: a receipt, once uploaded, is
-- evidence and must not be replaceable by whoever holds the link.
drop policy if exists "riders upload receipts" on storage.objects;
create policy "riders upload receipts" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'delivery-receipts');

drop policy if exists "receipts are readable" on storage.objects;
create policy "receipts are readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'delivery-receipts');


-- ── 7. The customer asks for delivery themselves ────────────────────────────
-- The flow: their group-buy email offers "collect from CBD, or have it
-- delivered?". Delivered takes them to a page where they drop a pin, see the
-- fee, and confirm. That confirmation lands here.
--
-- The fee is RECOMPUTED here and the client's figure ignored. Anything the
-- browser sends can be edited, and a delivery that books itself for KES 0 is
-- a delivery someone has to argue about later.
create or replace function public.request_delivery(
  p_customer_name  text,
  p_customer_phone text,
  p_item           text,
  p_origin_id      text,
  p_lat            numeric,
  p_lng            numeric,
  p_label          text,
  p_km             numeric,
  p_bulky          boolean default false,
  p_reference      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider uuid;
  v_fee   int;
  v_km    numeric;
  v_straight numeric;
  v_olat  numeric;
  v_olng  numeric;
  v_token text;
begin
  if p_lat is null or p_lng is null then
    return jsonb_build_object('ok', false, 'error', 'We need your location pin.');
  end if;
  -- Roughly Kenya. Stops a stray pin from booking a delivery to another country.
  if p_lat < -5.5 or p_lat > 5.5 or p_lng < 33.0 or p_lng > 42.5 then
    return jsonb_build_object('ok', false, 'error', 'That pin is outside Kenya.');
  end if;
  if coalesce(p_origin_id, '') not in ('cbd', 'industrial') then
    return jsonb_build_object('ok', false, 'error', 'Unknown pickup point.');
  end if;

  -- The browser sends the ROAD distance it measured, and the browser can be
  -- edited. Claiming 0.1km for a trip across town would under-quote the fee,
  -- and the rider is the one who would find out.
  --
  -- So: never accept less than the straight line between the two points.
  -- Road distance is always at least that, so a genuine routed figure passes
  -- untouched while a made-up one is floored at the honest minimum.
  select lat, lng into v_olat, v_olng from (values
    ('cbd',        -1.2854649::numeric, 36.8266681::numeric),
    ('industrial', -1.2996869::numeric, 36.839082::numeric)
  ) as o(id, lat, lng) where o.id = p_origin_id;

  -- Haversine, in kilometres.
  v_straight := 2 * 6371 * asin(least(1, sqrt(
      sin(radians(p_lat - v_olat) / 2) ^ 2
    + cos(radians(v_olat)) * cos(radians(p_lat)) * sin(radians(p_lng - v_olng) / 2) ^ 2
  )));

  v_km := greatest(coalesce(p_km, 0), v_straight);
  v_km := greatest(0, least(v_km, 500));

  -- Priced by the same rules as the site: KES 50/km rounded up to the
  -- nearest 10, floor of 300, plus 150 if bulky.
  v_fee := greatest(ceil((v_km * 50) / 10.0) * 10, 300)::int
           + case when coalesce(p_bulky, false) then 150 else 0 end;

  -- Straight to whoever is on duty, so it is on their phone immediately.
  select id into v_rider from public.riders
   where active and is_default order by name limit 1;
  if v_rider is null then
    select id into v_rider from public.riders where active order by name limit 1;
  end if;

  insert into public.deliveries (
    rider_id, customer_name, customer_phone, item_description, invoice_number,
    origin_id, drop_lat, drop_lng, drop_label, distance_km, is_bulky,
    delivery_fee_kes, notes
  ) values (
    v_rider,
    nullif(left(coalesce(p_customer_name, ''), 120), ''),
    nullif(left(coalesce(p_customer_phone, ''), 40), ''),
    nullif(left(coalesce(p_item, ''), 300), ''),
    nullif(left(coalesce(p_reference, ''), 60), ''),
    p_origin_id, p_lat, p_lng,
    nullif(left(coalesce(p_label, ''), 200), ''),
    round(v_km, 1), coalesce(p_bulky, false), v_fee,
    'Requested by the customer from their own link.'
  )
  returning customer_token into v_token;

  return jsonb_build_object(
    'ok', true,
    'customerToken', v_token,
    'deliveryFeeKES', v_fee,
    'assigned', v_rider is not null
  );
end;
$$;

grant execute on function public.request_delivery(text, text, text, text, numeric, numeric, text, numeric, boolean, text) to anon, authenticated;
