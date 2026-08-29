-- ============================================================================
--  Rider sign-in: a PIN on top of the link.
--
--  A link on its own is a single secret — forward it once, or lose the phone,
--  and whoever holds it sees the jobs. Two things are now needed: the link
--  (which identifies WHICH rider) and a PIN they know (which proves it is
--  them). Either can be changed without touching the other.
--
--  The PIN is stored as a bcrypt hash, never in the clear, so it cannot be
--  read back out of the database — only checked. You set it, they memorise it;
--  if they forget it you set a new one.
--
--  Run once in the Supabase SQL editor, AFTER add_deliveries.sql.
--  Safe to re-run.
-- ============================================================================

-- Supabase puts extensions in their own schema. Installing here is a no-op if
-- it already exists; what matters is that every function below carries
--   set search_path = public, extensions
-- so crypt() and gen_salt() can actually be found. Without that second schema
-- the PIN check raises "function crypt(text, text) does not exist" and a rider
-- with a PIN set can never sign in.
create extension if not exists pgcrypto with schema extensions;

alter table public.riders
  add column if not exists pin_hash text;

-- Where the job came from, so a rider can tell a job you sent them from one a
-- customer booked themselves.
alter table public.deliveries
  add column if not exists source text not null default 'admin';   -- admin | customer


-- ── Set or clear a rider's PIN (admin only) ─────────────────────────────────
create or replace function public.set_rider_pin(p_rider_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  -- Empty clears it, which turns the PIN gate off for that rider.
  if p_pin is null or length(trim(p_pin)) = 0 then
    update public.riders set pin_hash = null where id = p_rider_id;
    return jsonb_build_object('ok', true, 'cleared', true);
  end if;

  if p_pin !~ '^[0-9]{4,8}$' then
    return jsonb_build_object('ok', false, 'error', 'The PIN must be 4 to 8 digits.');
  end if;

  update public.riders
     set pin_hash = crypt(p_pin, gen_salt('bf'))
   where id = p_rider_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'No such rider.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.set_rider_pin(uuid, text) to authenticated;


-- ── The rider's jobs, now behind the PIN ────────────────────────────────────
-- The single-argument version is dropped: leaving it in place would be a way
-- round the PIN entirely.
drop function if exists public.rider_jobs(text);

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

  -- A rider with a PIN set must supply it. "needsPin" tells the page to ask
  -- rather than showing a failure — a rider opening their link for the first
  -- time has done nothing wrong.
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
           d.parcel_service, d.parcel_fee_kes, d.parcel_ref, d.parcel_receipt_url,
           d.rider_notes, d.customer_token, d.collected_at, d.delivered_at, d.created_at
      from public.deliveries d
     where d.rider_id = v_rider.id
       -- Everything still to do, plus a month of finished work so they can see
       -- what they have earned.
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


-- ── Updating a job needs the PIN too ────────────────────────────────────────
-- Without this the PIN would guard only the list, and anyone holding the link
-- could still mark jobs delivered.
drop function if exists public.rider_update_job(text, uuid, text, text, int, text, text, text);

create or replace function public.rider_update_job(
  p_token       text,
  p_delivery_id uuid,
  p_pin         text default null,
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
set search_path = public, extensions
as $$
declare
  v_rider public.riders%rowtype;
begin
  select * into v_rider from public.riders
   where access_token = p_token and active limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'This link is no longer active.');
  end if;

  if v_rider.pin_hash is not null then
    if p_pin is null or v_rider.pin_hash <> crypt(p_pin, v_rider.pin_hash) then
      return jsonb_build_object('ok', false, 'needsPin', true, 'error', 'Please sign in again.');
    end if;
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
     and d.rider_id = v_rider.id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'That job is not on your list.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.rider_update_job(text, uuid, text, text, text, int, text, text, text) to anon, authenticated;


-- ── Customer-booked jobs are marked as such ─────────────────────────────────
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
set search_path = public, extensions
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
  if p_lat < -5.5 or p_lat > 5.5 or p_lng < 33.0 or p_lng > 42.5 then
    return jsonb_build_object('ok', false, 'error', 'That pin is outside Kenya.');
  end if;
  if coalesce(p_origin_id, '') not in ('cbd', 'industrial') then
    return jsonb_build_object('ok', false, 'error', 'Unknown pickup point.');
  end if;

  -- The browser measures the road distance and the browser can be edited, so
  -- never price below the straight line between the two points.
  select lat, lng into v_olat, v_olng from (values
    ('cbd',        -1.2854649::numeric, 36.8266681::numeric),
    ('industrial', -1.2996869::numeric, 36.839082::numeric)
  ) as o(id, lat, lng) where o.id = p_origin_id;

  v_straight := 2 * 6371 * asin(least(1, sqrt(
      sin(radians(p_lat - v_olat) / 2) ^ 2
    + cos(radians(v_olat)) * cos(radians(p_lat)) * sin(radians(p_lng - v_olng) / 2) ^ 2
  )));

  v_km := greatest(coalesce(p_km, 0), v_straight);
  v_km := greatest(0, least(v_km, 500));

  v_fee := greatest(ceil((v_km * 50) / 10.0) * 10, 300)::int
           + case when coalesce(p_bulky, false) then 150 else 0 end;

  select id into v_rider from public.riders
   where active and is_default order by name limit 1;
  if v_rider is null then
    select id into v_rider from public.riders where active order by name limit 1;
  end if;

  insert into public.deliveries (
    rider_id, customer_name, customer_phone, item_description, invoice_number,
    origin_id, drop_lat, drop_lng, drop_label, distance_km, is_bulky,
    delivery_fee_kes, source, notes
  ) values (
    v_rider,
    nullif(left(coalesce(p_customer_name, ''), 120), ''),
    nullif(left(coalesce(p_customer_phone, ''), 40), ''),
    nullif(left(coalesce(p_item, ''), 300), ''),
    nullif(left(coalesce(p_reference, ''), 60), ''),
    p_origin_id, p_lat, p_lng,
    nullif(left(coalesce(p_label, ''), 200), ''),
    round(v_km, 1), coalesce(p_bulky, false), v_fee,
    'customer',
    'Booked by the customer from their own link.'
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
