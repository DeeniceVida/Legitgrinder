-- ============================================================================
--  A private booking link, so one client can book while bookings are still off.
--
--  Consultations are switched off to the public — there is no shop and no
--  fixed meeting place yet. But a client has asked to meet, and he should be
--  able to send that one person a link that works, without opening booking to
--  everybody who lands on /consultation.
--
--  The link carries a code: /consultation?invite=<code>. The code is checked
--  HERE, in the database, not in the page — a page can be edited by anyone
--  with a browser. Anybody without the code still gets "not open for booking
--  yet", exactly as before.
--
--  Switching consultations on makes the code irrelevant; it keeps working.
--  Regenerating it from Admin → Bookings kills every link already sent.
--
--  The function below is the one already running, with three lines added: the
--  argument, the test, and the gate. Everything else — the email check, the
--  120-day limit, the length caps, the 20-minute hold — is untouched.
--
--  Run once in the Supabase SQL editor, AFTER add_bookings.sql. Safe to re-run.
-- ============================================================================

alter table public.booking_settings
  add column if not exists invite_code text;

-- A first code, so the link exists the moment he opens the dashboard. Short
-- enough to read down a phone, long enough not to be guessed.
update public.booking_settings
   set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
 where id = 1 and coalesce(invite_code, '') = '';

comment on column public.booking_settings.invite_code is
  'Code in /consultation?invite=… — lets an invited client book while consultations are switched off. Regenerate to void every link already sent.';


create or replace function public.create_consultation_booking(
  p_name     text,
  p_phone    text,
  p_email    text,
  p_products text,
  p_quantity text,
  p_budget   text,
  p_date     date,
  p_slot     text,
  p_invite   text default null
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
  v_invited boolean;
  v_today  date := (now() at time zone 'Africa/Nairobi')::date;
begin
  select * into s from public.booking_settings where id = 1;

  v_invited := coalesce(s.invite_code, '') <> ''
                and upper(coalesce(trim(p_invite), '')) = upper(s.invite_code);

  if not s.consultations_enabled and not public.booking_is_admin() and not v_invited then
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

  if p_date is null or p_date > v_today + 120 then
    return jsonb_build_object('ok', false, 'error', 'Please choose one of the dates shown.');
  end if;

  -- Only a time the founder has actually opened on his calendar.
  if not exists (select 1 from public.consultation_days d where d.day = p_date and p_slot = any(d.slots)) then
    return jsonb_build_object('ok', false, 'taken', true,
      'error', 'That time is no longer available. Please choose one shown on the calendar.');
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
    return jsonb_build_object('ok', false, 'taken', true, 'error', 'Someone has just taken that time. Please pick another.');
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

grant execute on function public.create_consultation_booking(text, text, text, text, text, text, date, text, text) to anon, authenticated;

-- The 8-argument version would otherwise sit beside the new one and the API
-- could not choose between them.
drop function if exists public.create_consultation_booking(text, text, text, text, text, text, date, text);


-- ------------------------------------------------------------------
-- Ran clean? Want: code_length = 10, one_function = 1, still_off = true.
-- The code itself is not printed here — read it in Admin → Bookings,
-- which has a copy button.
-- ------------------------------------------------------------------
select
  length(coalesce(invite_code, '')) as code_length,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_consultation_booking') as one_function,
  not consultations_enabled as still_off
from public.booking_settings where id = 1;
