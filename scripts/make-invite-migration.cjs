/**
 * Build add_booking_invite_link.sql from the booking function as it stands.
 *
 * Written after I retyped that function by hand and silently lost the email
 * check, the 120-day limit and every length cap. Only three things should
 * differ: the new argument, the invited test, and the gate that uses it.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'add_bookings.sql'), 'utf8').replace(/\r\n/g, '\n');

const start = src.indexOf('create or replace function public.create_consultation_booking(');
const endMark = 'grant execute on function public.create_consultation_booking(text, text, text, text, text, text, date, text) to anon, authenticated;';
const end = src.indexOf(endMark);
if (start < 0 || end < 0) throw new Error('Could not find the booking function');

let body = src.slice(start, end).trimEnd();

const swap = (a, b) => {
  const n = body.split(a).length - 1;
  if (n !== 1) throw new Error(`expected 1 match, found ${n}: ${a.slice(0, 60)}`);
  body = body.split(a).join(b);
};

// 1. The new argument, last so every existing caller still lines up.
swap('  p_slot     text\n)', '  p_slot     text,\n  p_invite   text default null\n)');

// 2. Somewhere to hold the answer.
swap('  v_today  date :=', '  v_invited boolean;\n  v_today  date :=');

// 3. The test itself, and the gate. An empty code in settings must never let
//    an empty code in a link through, or the gate opens itself.
swap(
  '  if not s.consultations_enabled and not public.booking_is_admin() then',
  `  v_invited := coalesce(s.invite_code, '') <> ''
                and upper(coalesce(trim(p_invite), '')) = upper(s.invite_code);

  if not s.consultations_enabled and not public.booking_is_admin() and not v_invited then`
);

const header = `-- ============================================================================
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


`;

const footer = `grant execute on function public.create_consultation_booking(text, text, text, text, text, text, date, text, text) to anon, authenticated;

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
`;

fs.writeFileSync(path.join(ROOT, 'add_booking_invite_link.sql'), header + body + '\n\n' + footer, 'utf8');
console.log('add_booking_invite_link.sql regenerated from the live function');
