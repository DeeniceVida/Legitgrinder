/**
 * Build add_delivery_rate_60.sql from the function as it currently stands, so
 * the only difference between the live function and the new one is the rate.
 * Retyping a 150-line function by hand is how a clause goes missing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'add_delivery_origin_safariline.sql'), 'utf8');

const start = src.indexOf('create or replace function public.request_delivery(');
const end = src.indexOf('-- ------------------------------------------------------------------');
if (start < 0 || end < 0 || end < start) throw new Error('Could not find the function in the source file');

const body = src.slice(start, end).replace(/\(v_km \* 50\)/g, '(v_km * 60)');
if (!body.includes('(v_km * 60)') || body.includes('(v_km * 50)')) throw new Error('Rate substitution did not apply cleanly');

const header = `-- ============================================================================
--  The rider's rate goes from KES 50 to KES 60 per kilometre.
--
--  Owner's decision, 2026-10-16. The rate lives in TWO places — RATE_PER_KM in
--  utils/delivery.ts, the figure quoted on the page, and inside
--  request_delivery, the fee actually written against the delivery. If only
--  one moves, the page promises a number the booking then contradicts.
--
--  Everything else is unchanged: minimum KES 300, bulky +KES 150, parcels flat
--  at the minimum, and the fee still floored at the straight-line distance from
--  the pickup pin so an edited browser cannot under-quote. Deliveries already
--  booked keep the fee they were quoted.
--
--  Run once in the Supabase SQL editor, AFTER add_delivery_origin_safariline.sql.
--  Safe to re-run.
-- ============================================================================

`;

const check = `
-- ------------------------------------------------------------------
-- Ran clean? Want: rate_is_60 = true, a_10km_drop = 600.
-- ------------------------------------------------------------------
select
  (select position('v_km * 60' in pg_get_functiondef(p.oid)) > 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'request_delivery' limit 1
  ) as rate_is_60,
  greatest(ceil((10 * 60) / 10.0) * 10, 300)::int as a_10km_drop;
`;

fs.writeFileSync(path.join(ROOT, 'add_delivery_rate_60.sql'), header + body.trimEnd() + '\n\n' + check, 'utf8');
console.log('add_delivery_rate_60.sql written');
