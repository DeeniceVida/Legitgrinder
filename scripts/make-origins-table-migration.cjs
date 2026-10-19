/**
 * Build add_delivery_origins_table.sql from the function as it stands.
 *
 * The pickup points stop being a list typed into the function and become rows
 * it looks up, so adding one is an insert from the dashboard rather than a
 * migration. Only two places in the function change: the accepted-id check and
 * where the coordinates come from.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = 'add_delivery_origins_aquantuo_tumamziko.sql';
const src = fs.readFileSync(path.join(ROOT, SOURCE), 'utf8').replace(/\r\n/g, '\n');

const start = src.indexOf('create or replace function public.request_delivery(');
const end = src.indexOf('-- ------------------------------------------------------------------');
if (start < 0 || end < 0 || end < start) throw new Error('Could not find the function in the source file');
let body = src.slice(start, end).trimEnd();

const swap = (from, to) => {
  const parts = body.split(from);
  if (parts.length !== 2) throw new Error(`Expected exactly one match for: ${from.slice(0, 70)}… (found ${parts.length - 1})`);
  body = parts.join(to);
};

// 1. The accepted list becomes a lookup. An inactive point is refused the same
//    as an unknown one, so retiring a place is a tick, not a deletion.
const listMatch = body.match(/ {2}if coalesce\(p_origin_id, ''\) not in \([^)]+\) then\n\s*return jsonb_build_object\('ok', false, 'error', 'Unknown pickup point\.'\);\n {2}end if;/);
if (!listMatch) throw new Error('Could not find the accepted-origins check');
swap(listMatch[0], `  perform 1 from public.delivery_origins where id = p_origin_id and active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Unknown pickup point.');
  end if;`);

// 2. The coordinates come from the same row rather than from a values list.
const coordMatch = body.match(/ {4}select lat, lng into v_olat, v_olng from \(values\n(?: {6}\([^\n]*\n)+ {4}\) as o\(id, lat, lng\) where o\.id = p_origin_id;/);
if (!coordMatch) throw new Error('Could not find the coordinates list');
swap(coordMatch[0], `    select lat, lng into v_olat, v_olng
      from public.delivery_origins where id = p_origin_id and active;`);

const header = `-- ============================================================================
--  Pickup points become rows the owner can edit, not a list in the code.
--
--  Five points went in by hand in four days, each one a code change AND a
--  migration, with the customer-facing failure — "Unknown pickup point" at the
--  last step of the form — waiting whenever the two got out of step.
--
--  They now live in one table. Admin → Riders & Deliveries → Pickup points
--  adds and edits them, the quote reads them, and this function prices from
--  them. Adding the sixth will be a row, and nothing else.
--
--  The seed below is exactly the five live points, with the owner's own pins,
--  so running this changes no quote and no existing delivery. Deliveries keep
--  the origin_id they were booked with even if a point is later retired.
--
--  Run once in the Supabase SQL editor, AFTER ${SOURCE}. Safe to re-run.
-- ============================================================================

create table if not exists public.delivery_origins (
  -- A short slug, because it is written into every delivery row and into the
  -- link the owner sends (?from=…).
  id           text primary key check (id ~ '^[a-z][a-z0-9_]{1,31}$'),
  /** What a CUSTOMER sees — an area, never the premises. */
  name         text not null,
  /** Customer-safe one-liner, e.g. "Goods coming out of clearing". */
  detail       text not null default '',
  /** Dashboard only: the firm, the street, the gate. Never shown to a customer. */
  admin_detail text not null default '',
  lat          numeric(9,6) not null check (lat between -5.5 and 5.5),
  lng          numeric(9,6) not null check (lng between 33.0 and 42.5),
  /** Retired rather than deleted, so old deliveries still name where they came from. */
  active       boolean not null default true,
  sort_order   int not null default 100,
  created_at   timestamptz not null default now()
);

insert into public.delivery_origins (id, name, detail, admin_detail, lat, lng, sort_order) values
  ('cbd',        'Nairobi CBD',    'Items already in Nairobi',    'Dynamic Mall, Shop ML 135, Tom Mboya Street',              -1.285465, 36.826668, 10),
  ('industrial', 'Industrial Area','Goods coming out of clearing','Salihiya World Cargo',                                     -1.299687, 36.839082, 20),
  ('tumamziko',  'Industrial Area','Goods coming out of clearing','Tuma Mziko Limited, Homa Bay Road, Industrial Area',       -1.304722, 36.847500, 30),
  ('safariline', 'Eastleigh',      'Goods coming out of clearing','Safariline Cargo, Captain Mungai Street (off 4th Street), Eastleigh', -1.273027, 36.847682, 40),
  ('aquantuo',   'Imara Daima',    'Goods coming out of clearing','Aquantuo Kenya, Gatoto Road, Imara Daima',                 -1.318691, 36.868580, 50)
on conflict (id) do nothing;

alter table public.delivery_origins enable row level security;

-- The public quote needs to read them; the areas are already on the page.
drop policy if exists "origins readable" on public.delivery_origins;
create policy "origins readable" on public.delivery_origins
  for select using (true);

-- Only an admin adds, edits or retires a pickup point.
drop policy if exists "admin manages origins" on public.delivery_origins;
create policy "admin manages origins" on public.delivery_origins
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


`;

const check = `
-- ------------------------------------------------------------------
-- Ran clean? Want: points = 5, reads_table = true, no_hardcoded_list = true.
-- ------------------------------------------------------------------
select
  (select count(*) from public.delivery_origins where active) as points,
  (select position('from public.delivery_origins' in pg_get_functiondef(p.oid)) > 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'request_delivery' limit 1
  ) as reads_table,
  (select position('''safariline''' in pg_get_functiondef(p.oid)) = 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'request_delivery' limit 1
  ) as no_hardcoded_list;
`;

fs.writeFileSync(path.join(ROOT, 'add_delivery_origins_table.sql'), header + body + '\n\n' + check, 'utf8');
console.log('add_delivery_origins_table.sql written');
