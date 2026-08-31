-- ============================================================================
--  Parcels don't need a map. They need a receiver.
--
--  Dropping a parcel at a courier is not a journey to a pin — the rider goes
--  to a counter in town, and what actually matters is what the COURIER needs
--  in order to book it: who is receiving, their phone, and which town it is
--  going to. Asking that customer to drop a map pin was asking the wrong
--  question entirely.
--
--  So a parcel job:
--    • has NO coordinates, and needs none
--    • is priced at the flat drop-off fee, because every courier office in
--      town falls inside the minimum fare from either pickup point anyway
--    • carries the receiver's details through to the rider's phone
--
--  Run once in the Supabase SQL editor, AFTER add_delivery_types.sql.
--  Safe to re-run.
-- ============================================================================

alter table public.deliveries
  add column if not exists receiver_name        text,
  add column if not exists receiver_phone       text,
  add column if not exists receiver_destination text,
  add column if not exists parcel_notes         text;

comment on column public.deliveries.receiver_destination is
  'The town or branch the parcel is travelling to. Free text — the courier decides its own network.';


-- ── The customer books it ───────────────────────────────────────────────────
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
  p_parcel_notes   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rider uuid;
  v_fee   int;
  v_km    numeric;
  v_straight numeric;
  v_olat  numeric;
  v_olng  numeric;
  v_type  text;
  v_label text;
  v_token text;
begin
  if coalesce(p_origin_id, '') not in ('cbd', 'industrial') then
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
    -- either pickup point, so measuring a route would produce the same number
    -- with extra steps — and a wrong pin would produce a wrong one.
    v_km  := 0;
    v_fee := 300 + case when coalesce(p_bulky, false) then 150 else 0 end;
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
      ('industrial', -1.2996869::numeric, 36.839082::numeric)
    ) as o(id, lat, lng) where o.id = p_origin_id;

    -- The browser measures the distance and the browser can be edited, so
    -- never price below the straight line between the two points.
    v_straight := 2 * 6371 * asin(least(1, sqrt(
        sin(radians(p_lat - v_olat) / 2) ^ 2
      + cos(radians(v_olat)) * cos(radians(p_lat)) * sin(radians(p_lng - v_olng) / 2) ^ 2
    )));

    v_km := greatest(coalesce(p_km, 0), v_straight);
    v_km := greatest(0, least(v_km, 500));
    v_fee := greatest(ceil((v_km * 50) / 10.0) * 10, 300)::int
             + case when coalesce(p_bulky, false) then 150 else 0 end;
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
    delivery_fee_kes, source, notes
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
    'Booked by the customer from their own link.'
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

grant execute on function public.request_delivery(text, text, text, text, text, text, text, numeric, numeric, text, numeric, boolean, text, text, text, text, text) to anon, authenticated;

-- The 13-argument version would otherwise sit alongside the new one and the
-- API would not know which to call.
drop function if exists public.request_delivery(text, text, text, text, text, text, text, numeric, numeric, text, numeric, boolean, text);


-- ── The rider needs the receiver's details at the counter ───────────────────
create or replace function public.rider_jobs(p_token text, p_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rider public.riders%rowtype;
  v_jobs jsonb;
  v_earned int;
begin
  if p_token is null or length(p_token) < 12 then
    return jsonb_build_object('ok', false, 'error', 'Invalid link');
  end if;

  select * into v_rider from public.riders
   where access_token = p_token and active limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'This link is no longer active.');
  end if;

  if v_rider.pin_hash is not null then
    if p_pin is null or length(p_pin) = 0 then
      return jsonb_build_object('ok', false, 'needsPin', true, 'riderName', split_part(v_rider.name, ' ', 1));
    end if;
    if v_rider.pin_hash <> crypt(p_pin, v_rider.pin_hash) then
      return jsonb_build_object('ok', false, 'needsPin', true, 'error', 'That PIN is not right.');
    end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(j) order by j.created_at desc), '[]'::jsonb)
    into v_jobs
  from (
    select d.id, d.customer_name, d.customer_phone, d.item_description,
           d.invoice_number, d.origin_id, d.drop_lat, d.drop_lng, d.drop_label,
           d.distance_km, d.is_bulky, d.delivery_fee_kes, d.status, d.source,
           d.delivery_type, d.courier_name,
           d.receiver_name, d.receiver_phone, d.receiver_destination, d.parcel_notes,
           d.parcel_service, d.parcel_fee_kes, d.parcel_ref, d.parcel_receipt_url,
           d.rider_notes, d.customer_token, d.collected_at, d.delivered_at, d.created_at
      from public.deliveries d
     where d.rider_id = v_rider.id
       and (d.status <> 'delivered' or d.delivered_at > now() - interval '30 days')
  ) j;

  select coalesce(sum(delivery_fee_kes), 0) into v_earned
    from public.deliveries
   where rider_id = v_rider.id
     and status = 'delivered'
     and delivered_at > now() - interval '30 days';

  return jsonb_build_object(
    'ok', true,
    'rider', jsonb_build_object('name', v_rider.name),
    'earned30d', v_earned,
    'jobs', v_jobs
  );
end;
$$;

grant execute on function public.rider_jobs(text, text) to anon, authenticated;


-- ── And the customer sees what they told us ─────────────────────────────────
create or replace function public.delivery_status(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
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
           'deliveryType', d.delivery_type,
           'courierName', d.courier_name,
           'receiverName', d.receiver_name,
           'receiverPhone', d.receiver_phone,
           'receiverDestination', d.receiver_destination,
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
