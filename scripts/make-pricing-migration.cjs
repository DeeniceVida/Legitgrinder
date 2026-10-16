/**
 * Build add_delivery_pricing_settings.sql from the function as it stands, so
 * the only differences are the lines that read the fee rules from a table
 * instead of having them typed into the function. Retyping 150 lines of SQL by
 * hand is how a clause quietly goes missing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'add_delivery_rate_60.sql'), 'utf8');

const start = src.indexOf('create or replace function public.request_delivery(');
const end = src.indexOf('-- ------------------------------------------------------------------');
if (start < 0 || end < 0 || end < start) throw new Error('Could not find the function in the source file');

let body = src.slice(start, end).trimEnd();

/** Each replacement must hit exactly once, or the function is not what we think it is. */
const swap = (from, to) => {
  const parts = body.split(from);
  if (parts.length !== 2) throw new Error(`Expected exactly one match for: ${from.slice(0, 60)}… (found ${parts.length - 1})`);
  body = parts.join(to);
};

// 1. Somewhere to keep the rules we are about to read.
swap(`declare
  v_rider uuid;`, `declare
  v_rider uuid;
  v_rate  int;
  v_min   int;
  v_bulky int;`);

// 2. Read them before anything is priced. Defaults match the seeded row, so a
//    missing table can never produce a free delivery.
swap(`begin
  if coalesce(p_origin_id, '')`, `begin
  select rate_per_km, minimum_fee, bulky_surcharge
    into v_rate, v_min, v_bulky
    from public.delivery_pricing where id = 1;
  v_rate  := coalesce(v_rate, 60);
  v_min   := coalesce(v_min, 300);
  v_bulky := coalesce(v_bulky, 150);

  if coalesce(p_origin_id, '')`);

// 3. The parcel leg: flat at the minimum, plus the bulky surcharge.
swap(`    v_fee := 300 + case when coalesce(p_bulky, false) then 150 else 0 end;`,
     `    v_fee := v_min + case when coalesce(p_bulky, false) then v_bulky else 0 end;`);

// 4. The doorstep leg: rate per km, rounded up to the ten, floored at the minimum.
swap(`    v_fee := greatest(ceil((v_km * 60) / 10.0) * 10, 300)::int
             + case when coalesce(p_bulky, false) then 150 else 0 end;`,
     `    v_fee := greatest(ceil((v_km * v_rate) / 10.0) * 10, v_min)::int
             + case when coalesce(p_bulky, false) then v_bulky else 0 end;`);

const header = `-- ============================================================================
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


`;

const check = `
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
`;

fs.writeFileSync(path.join(ROOT, 'add_delivery_pricing_settings.sql'), header + body + '\n\n' + check, 'utf8');
console.log('add_delivery_pricing_settings.sql written');
