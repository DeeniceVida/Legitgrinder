-- ============================================================================
--  Hub pickups and paid in-person consultations.
--
--  Built ahead of the shop opening and SWITCHED OFF. Both switches live in
--  booking_settings and default to false: until the owner turns one on, the
--  public site behaves exactly as it did before this file, and only a signed-in
--  admin can make a test booking.
--
--  Money rule: a consultation slot is locked only after the SERVER has checked
--  the payment with Paystack (functions/api/confirm-consultation.ts). The
--  browser saying "paid" is never enough.
--
--  Run once in the Supabase SQL editor. Safe to re-run: nothing here overwrites
--  a setting the owner has changed in the dashboard.
-- ============================================================================


-- -- Settings: one row, every rule the owner may want to change ---------------
create table if not exists public.booking_settings (
  id                        int primary key default 1 check (id = 1),
  consultations_enabled     boolean not null default false,
  pickups_enabled           boolean not null default false,
  hub_name                  text not null default 'LegitGrinder Hub',
  hub_address               text not null default '',
  hub_map_url               text not null default '',
  consultation_fee_kes      int  not null default 4000,
  consultation_credit_days  int  not null default 7,
  -- Slot labels per weekday, keyed by day number: 0 = Sunday ... 6 = Saturday.
  consultation_slots        jsonb not null default
    '{"4": ["10:00 AM - 11:30 AM", "12:00 PM - 1:30 PM", "2:30 PM - 4:00 PM"],
      "5": ["10:00 AM - 11:30 AM", "12:00 PM - 1:30 PM", "2:30 PM - 4:00 PM"]}',
  pickup_slots              jsonb not null default
    '{"3": ["2:00 PM - 3:30 PM", "3:30 PM - 5:00 PM", "5:00 PM - 6:30 PM"],
      "6": ["10:00 AM - 12:00 PM", "12:00 PM - 2:00 PM", "2:00 PM - 4:00 PM"]}',
  -- A slot stops taking bookings at this hour, Nairobi time, the day before.
  cutoff_hour               int  not null default 17,
  consultation_days_ahead   int  not null default 28,
  pickup_days_ahead         int  not null default 14,
  updated_at                timestamptz not null default now()
);

insert into public.booking_settings (id) values (1) on conflict (id) do nothing;

alter table public.booking_settings enable row level security;

drop policy if exists "anyone reads booking settings" on public.booking_settings;
create policy "anyone reads booking settings" on public.booking_settings
  for select using (true);

drop policy if exists "admin edits booking settings" on public.booking_settings;
create policy "admin edits booking settings" on public.booking_settings
  for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- -- Consultation bookings ----------------------------------------------------
create table if not exists public.consultation_bookings (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique,
  client_name      text not null,
  client_phone     text not null,
  client_email     text not null,
  products         text not null,
  quantity         text not null,
  budget           text not null,
  slot_date        date not null,
  slot_label       text not null,
  amount_kes       int  not null,
  status           text not null default 'pending_payment'
                   check (status in ('pending_payment', 'confirmed', 'paid_conflict', 'cancelled', 'completed')),
  paid_kes         int,
  paystack_id      text,
  paid_at          timestamptz,
  credit_expires   date,
  credited_invoice text,
  notes            text,
  created_at       timestamptz not null default now()
);

-- The database itself refuses two confirmed bookings for one slot, so two
-- customers paying at the same second cannot both get it.
create unique index if not exists consultation_one_per_slot
  on public.consultation_bookings (slot_date, slot_label) where status = 'confirmed';

alter table public.consultation_bookings enable row level security;

drop policy if exists "admin manages consultation bookings" on public.consultation_bookings;
create policy "admin manages consultation bookings" on public.consultation_bookings
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- -- Pickup bookings ----------------------------------------------------------
create table if not exists public.pickup_bookings (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  client_name    text,
  client_phone   text,
  client_email   text,
  item           text,
  slot_date      date not null,
  slot_label     text not null,
  status         text not null default 'booked'
                 check (status in ('booked', 'collected', 'missed', 'cancelled')),
  collected_at   timestamptz,
  created_at     timestamptz not null default now()
);

create unique index if not exists pickup_one_per_invoice
  on public.pickup_bookings (invoice_number) where status <> 'cancelled';

alter table public.pickup_bookings enable row level security;

drop policy if exists "admin manages pickup bookings" on public.pickup_bookings;
create policy "admin manages pickup bookings" on public.pickup_bookings
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- -- The server's proof of identity -------------------------------------------
-- Only the SHA-256 fingerprint of the token is stored. The token itself lives
-- in Cloudflare (BOOKING_SERVER_TOKEN) and nowhere in this repository. No
-- policies: nobody can read this table except the functions below.
create table if not exists public.booking_server_secret (
  id            int primary key default 1 check (id = 1),
  token_sha256  text not null
);
alter table public.booking_server_secret enable row level security;
insert into public.booking_server_secret (id, token_sha256)
values (1, 'ae4805e94e3df75df0694955d135444ea9cc9257fc77b926e8950e64a0c2b23b')
on conflict (id) do nothing;


-- -- Helpers ------------------------------------------------------------------
create or replace function public.booking_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Open until cutoff_hour, Nairobi time, on the day before the slot.
create or replace function public.booking_slot_open(p_date date, p_cutoff int)
returns boolean
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'Africa/Nairobi')
       < ((p_date - 1)::timestamp + make_interval(hours => p_cutoff));
$$;


-- -- Which consultation slots are taken ---------------------------------------
-- Dates and slot names only. Never who booked them.
create or replace function public.consultation_taken_slots(p_from date, p_to date)
returns table (slot_date date, slot_label text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_to > p_from + 62 then
    p_to := p_from + 62;
  end if;
  return query
    select b.slot_date, b.slot_label
      from public.consultation_bookings b
     where b.slot_date between p_from and p_to
       and (b.status = 'confirmed'
            -- A payment in progress holds the slot for 20 minutes, so two
            -- people are not both sent to Paystack for the same hour.
            or (b.status = 'pending_payment' and b.created_at > now() - interval '20 minutes'));
end;
$$;

grant execute on function public.consultation_taken_slots(date, date) to anon, authenticated;


-- -- Start a consultation booking (unpaid) ------------------------------------
create or replace function public.create_consultation_booking(
  p_name     text,
  p_phone    text,
  p_email    text,
  p_products text,
  p_quantity text,
  p_budget   text,
  p_date     date,
  p_slot     text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s        public.booking_settings%rowtype;
  v_ref    text;
  v_id     uuid;
  v_today  date := (now() at time zone 'Africa/Nairobi')::date;
begin
  select * into s from public.booking_settings where id = 1;

  if not s.consultations_enabled and not public.booking_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'In-person consultations are not open for booking yet.');
  end if;

  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = ''
     or coalesce(trim(p_products), '') = '' or coalesce(trim(p_quantity), '') = ''
     or coalesce(trim(p_budget), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'Please answer every question.');
  end if;

  if coalesce(p_email, '') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok', false, 'error', 'That email address does not look right.');
  end if;

  if p_date is null or p_date > v_today + s.consultation_days_ahead then
    return jsonb_build_object('ok', false, 'error', 'Please choose one of the dates shown.');
  end if;

  if not coalesce(jsonb_exists(s.consultation_slots -> (extract(dow from p_date)::int)::text, p_slot), false) then
    return jsonb_build_object('ok', false, 'error', 'That time is not one we offer.');
  end if;

  if not public.booking_slot_open(p_date, s.cutoff_hour) then
    return jsonb_build_object('ok', false, 'error', 'Bookings for that day have closed. Please choose a later date.');
  end if;

  if exists (
    select 1 from public.consultation_bookings b
     where b.slot_date = p_date and b.slot_label = p_slot
       and (b.status = 'confirmed'
            or (b.status = 'pending_payment' and b.created_at > now() - interval '20 minutes'))
  ) then
    return jsonb_build_object('ok', false, 'taken', true, 'error', 'Someone has just taken that slot. Please pick another.');
  end if;

  v_ref := 'LGC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.consultation_bookings (
    reference, client_name, client_phone, client_email,
    products, quantity, budget, slot_date, slot_label, amount_kes
  ) values (
    v_ref, left(trim(p_name), 120), left(trim(p_phone), 40), lower(left(trim(p_email), 160)),
    left(trim(p_products), 1000), left(trim(p_quantity), 200), left(trim(p_budget), 200),
    p_date, p_slot, s.consultation_fee_kes
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'reference', v_ref, 'bookingId', v_id, 'amountKes', s.consultation_fee_kes);
end;
$$;

grant execute on function public.create_consultation_booking(text, text, text, text, text, text, date, text) to anon, authenticated;


-- -- Confirm a booking after the server has verified payment ------------------
-- Callable only with the server token. Without this gate, anyone could mark
-- their own booking paid without paying.
create or replace function public.confirm_consultation_booking(
  p_reference   text,
  p_paid_kes    int,
  p_paystack_id text,
  p_token       text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s  public.booking_settings%rowtype;
  b  public.consultation_bookings%rowtype;
  v_status text;
begin
  if p_token is null
     or encode(digest(p_token, 'sha256'), 'hex')
        <> (select token_sha256 from public.booking_server_secret where id = 1) then
    return jsonb_build_object('ok', false, 'error', 'Not authorised.');
  end if;

  select * into s from public.booking_settings where id = 1;
  select * into b from public.consultation_bookings where reference = p_reference for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'We could not find that booking.');
  end if;

  -- Paystack retries callbacks. A second confirmation must not re-send emails
  -- or move the credit date.
  if b.status in ('confirmed', 'paid_conflict', 'completed') then
    v_status := b.status;
  elsif coalesce(p_paid_kes, 0) < b.amount_kes then
    return jsonb_build_object('ok', false, 'underpaid', true,
      'error', 'The amount paid is less than the consultation fee.');
  else
    begin
      update public.consultation_bookings
         set status = 'confirmed', paid_kes = p_paid_kes, paystack_id = p_paystack_id,
             paid_at = now(), credit_expires = b.slot_date + s.consultation_credit_days
       where id = b.id;
      v_status := 'confirmed';
    exception when unique_violation then
      -- Someone else's payment for the same slot landed first. This person
      -- has still paid, so keep the money on record and flag it for the owner.
      update public.consultation_bookings
         set status = 'paid_conflict', paid_kes = p_paid_kes, paystack_id = p_paystack_id,
             paid_at = now()
       where id = b.id;
      v_status := 'paid_conflict';
    end;
  end if;

  select * into b from public.consultation_bookings where id = b.id;

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'alreadyDone', b.paid_at < now() - interval '5 seconds',
    'reference', b.reference,
    'clientName', b.client_name,
    'clientPhone', b.client_phone,
    'clientEmail', b.client_email,
    'products', b.products,
    'quantity', b.quantity,
    'budget', b.budget,
    'slotDate', b.slot_date,
    'slotLabel', b.slot_label,
    'amountKes', b.amount_kes,
    'paidKes', b.paid_kes,
    'creditExpires', b.credit_expires,
    'creditDays', s.consultation_credit_days,
    'hubName', s.hub_name,
    'hubAddress', s.hub_address,
    'hubMapUrl', s.hub_map_url
  );
end;
$$;

grant execute on function public.confirm_consultation_booking(text, int, text, text) to anon, authenticated;


-- -- Book a collection slot for a paid shop order -----------------------------
create or replace function public.book_pickup(
  p_invoice_number text,
  p_name           text,
  p_phone          text,
  p_email          text,
  p_item           text,
  p_date           date,
  p_slot           text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s       public.booking_settings%rowtype;
  v_today date := (now() at time zone 'Africa/Nairobi')::date;
  v_id    uuid;
begin
  select * into s from public.booking_settings where id = 1;

  if not s.pickups_enabled and not public.booking_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Hub collection is not open yet.');
  end if;

  -- Only a real order can hold a slot.
  if not exists (select 1 from public.invoices where invoice_number = p_invoice_number) then
    return jsonb_build_object('ok', false, 'error', 'We could not find that order.');
  end if;

  if p_date is null or p_date > v_today + s.pickup_days_ahead then
    return jsonb_build_object('ok', false, 'error', 'Please choose one of the collection days shown.');
  end if;

  if not coalesce(jsonb_exists(s.pickup_slots -> (extract(dow from p_date)::int)::text, p_slot), false) then
    return jsonb_build_object('ok', false, 'error', 'That is not a collection slot.');
  end if;

  if not public.booking_slot_open(p_date, s.cutoff_hour) then
    return jsonb_build_object('ok', false, 'closed', true,
      'error', 'Collection for that day has closed. Choose a later day, or have it delivered.');
  end if;

  select id into v_id from public.pickup_bookings
   where invoice_number = p_invoice_number and status <> 'cancelled' limit 1;

  if v_id is not null then
    update public.pickup_bookings
       set slot_date = p_date, slot_label = p_slot
     where id = v_id;
  else
    insert into public.pickup_bookings (invoice_number, client_name, client_phone, client_email, item, slot_date, slot_label)
    values (p_invoice_number, nullif(left(trim(coalesce(p_name, '')), 120), ''),
            nullif(left(trim(coalesce(p_phone, '')), 40), ''),
            nullif(lower(left(trim(coalesce(p_email, '')), 160)), ''),
            nullif(left(trim(coalesce(p_item, '')), 300), ''),
            p_date, p_slot);
  end if;

  return jsonb_build_object('ok', true, 'slotDate', p_date, 'slotLabel', p_slot,
    'hubName', s.hub_name, 'hubAddress', s.hub_address, 'hubMapUrl', s.hub_map_url);
end;
$$;

grant execute on function public.book_pickup(text, text, text, text, text, date, text) to anon, authenticated;


-- ------------------------------------------------------------------
-- Ran clean? Want: tables_found = 4, functions_found = 6, both_switches_off = true.
-- ------------------------------------------------------------------
select
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name in ('booking_settings', 'consultation_bookings', 'pickup_bookings', 'booking_server_secret')
  ) as tables_found,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('booking_is_admin', 'booking_slot_open', 'consultation_taken_slots',
                        'create_consultation_booking', 'confirm_consultation_booking', 'book_pickup')
  ) as functions_found,
  (select not consultations_enabled and not pickups_enabled from public.booking_settings where id = 1)
    as both_switches_off;
