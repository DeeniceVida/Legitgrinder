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
