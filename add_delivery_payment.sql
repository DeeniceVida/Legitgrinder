-- ============================================================================
--  Paying the rider.
--
--  The fee was agreed on the page and then paid "somehow" at the door, with
--  nothing recorded. A parcel customer is not even at the counter when the
--  rider drops it off, so there was no door to pay at.
--
--  Now:
--    1. The customer's tracking link shows the fee and the rider's number
--       (the phone saved on the Riders list — the owner chose that number),
--       with a box to paste the M-Pesa confirmation message.
--    2. The rider sees that message on the job and confirms it after checking
--       their own M-Pesa — or marks it paid in cash at the door.
--    3. The dashboard shows Unpaid / Customer says paid / Paid.
--
--  The site CANNOT see the money arrive: it goes to the rider's own M-Pesa.
--  A pasted message is a claim. Only the rider's confirmation makes it paid.
--
--  The rider's number is shown ONLY on the customer's own tracking link, only
--  once a rider is assigned, and only until the fee is paid.
--
--  Run once in the Supabase SQL editor, AFTER add_delivery_precision.sql.
--  Safe to re-run. rider_jobs and delivery_status keep their exact argument
--  lists — only what they return grows — so nothing already calling them breaks.
-- ============================================================================

alter table public.deliveries
  add column if not exists payment_status       text not null default 'unpaid',
  add column if not exists payment_method       text,
  add column if not exists payment_message      text,
  add column if not exists payment_reported_at  timestamptz,
  add column if not exists payment_confirmed_at timestamptz;

alter table public.deliveries drop constraint if exists deliveries_payment_status_chk;
alter table public.deliveries add constraint deliveries_payment_status_chk
  check (payment_status in ('unpaid', 'reported', 'paid'));

alter table public.deliveries drop constraint if exists deliveries_payment_method_chk;
alter table public.deliveries add constraint deliveries_payment_method_chk
  check (payment_method is null or payment_method in ('mpesa', 'cash'));

comment on column public.deliveries.payment_status is
  'unpaid → reported (customer pasted an M-Pesa message) → paid (rider confirmed).';


-- ── The customer says they have paid ────────────────────────────────────────
create or replace function public.customer_report_payment(p_token text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_msg text := trim(coalesce(p_message, ''));
begin
  if p_token is null or length(p_token) < 12 then
    return jsonb_build_object('ok', false, 'error', 'Invalid link');
  end if;
  if length(v_msg) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Paste the whole M-Pesa message you received.');
  end if;

  update public.deliveries
     set payment_status      = 'reported',
         payment_method      = 'mpesa',
         payment_message     = left(v_msg, 1000),
         payment_reported_at = now()
   where customer_token = p_token
     and rider_id is not null
     -- Once the rider has confirmed it, nobody can overwrite it from a link.
     and payment_status <> 'paid';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'This delivery is already marked paid, or has no rider yet.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.customer_report_payment(text, text) to anon, authenticated;


-- ── The rider confirms it (or takes cash, or undoes a mistake) ──────────────
create or replace function public.rider_confirm_payment(
  p_token       text,
  p_pin         text,
  p_delivery_id uuid,
  p_method      text
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

  if coalesce(p_method, '') not in ('mpesa', 'cash', 'undo') then
    return jsonb_build_object('ok', false, 'error', 'Unknown payment choice.');
  end if;

  if p_method = 'undo' then
    -- Back to where it was before the rider confirmed: a pasted message stays.
    update public.deliveries d
       set payment_status       = case when d.payment_message is not null then 'reported' else 'unpaid' end,
           payment_method       = case when d.payment_message is not null then 'mpesa' else null end,
           payment_confirmed_at = null
     where d.id = p_delivery_id and d.rider_id = v_rider.id;
  else
    update public.deliveries d
       set payment_status       = 'paid',
           payment_method       = p_method,
           payment_confirmed_at = now()
     where d.id = p_delivery_id and d.rider_id = v_rider.id;
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'That job is not on your list.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.rider_confirm_payment(text, text, uuid, text) to anon, authenticated;


-- ── The rider's list now carries the payment ────────────────────────────────
-- Same body as add_delivery_precision.sql, plus the five payment columns.
create or replace function public.rider_jobs(p_token text, p_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rider  public.riders%rowtype;
  v_jobs   jsonb;
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
    if p_pin is null then
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
           d.rider_notes, d.customer_token, d.collected_at, d.delivered_at, d.created_at,
           d.drop_building, d.drop_unit, d.drop_gate, d.drop_instructions,
           d.rider_eta_code, d.rider_eta_minutes, d.rider_eta_at,
           d.payment_status, d.payment_method, d.payment_message,
           d.payment_reported_at, d.payment_confirmed_at
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


-- ── The customer's link now carries the payment, and who to pay ─────────────
-- Same body as add_delivery_precision.sql, plus payment and the rider's number.
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
           'createdAt', d.created_at,
           'dropBuilding', d.drop_building,
           'dropUnit', d.drop_unit,
           'dropGate', d.drop_gate,
           'dropInstructions', d.drop_instructions,
           'riderEtaCode', d.rider_eta_code,
           'riderEtaMinutes', d.rider_eta_minutes,
           'riderEtaAt', d.rider_eta_at,
           'paymentStatus', d.payment_status,
           'paymentMethod', d.payment_method,
           'paymentMessage', d.payment_message,
           'paymentConfirmedAt', d.payment_confirmed_at,
           -- Who to pay. Only once a rider holds the job, and only while
           -- there is still something to pay — a paid job has no reason to
           -- keep a phone number on a shareable page.
           'riderPayPhone', case
                              when r.id is not null and d.payment_status <> 'paid'
                              then r.phone
                            end
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


-- ------------------------------------------------------------------
-- Ran clean? Want: columns_added = 5, functions_found = 4.
-- ------------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'deliveries'
      and column_name in ('payment_status', 'payment_method', 'payment_message',
                          'payment_reported_at', 'payment_confirmed_at')
  ) as columns_added,
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('customer_report_payment', 'rider_confirm_payment', 'rider_jobs', 'delivery_status')
  ) as functions_found;
