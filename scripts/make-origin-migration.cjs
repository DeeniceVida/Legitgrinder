/**
 * Build the migration that teaches request_delivery a new pickup point, from
 * the function as it currently stands, so the only differences are the id and
 * its coordinates. Retyping 150 lines of SQL by hand is how a clause goes
 * missing — and this is the second pickup point in a month.
 *
 *   node scripts/make-origin-migration.cjs <source.sql> <id> <lat> <lng> <out.sql> "<Place, street, area>"
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const [sourceFile, id, lat, lng, outFile, where] = process.argv.slice(2);
if (!sourceFile || !id || !lat || !lng || !outFile) {
  throw new Error('Usage: make-origin-migration.cjs <source.sql> <id> <lat> <lng> <out.sql> "<description>"');
}
if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error('The id must be lower-case letters, digits and underscores');
if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) throw new Error('Coordinates must be numbers');

// Git hands these files back with CRLF on Windows; match against LF only.
const src = fs.readFileSync(path.join(ROOT, sourceFile), 'utf8').replace(/\r\n/g, '\n');
const start = src.indexOf('create or replace function public.request_delivery(');
const end = src.indexOf('-- ------------------------------------------------------------------');
if (start < 0 || end < 0 || end < start) throw new Error('Could not find the function in the source file');

let body = src.slice(start, end).trimEnd();

const swap = (from, to) => {
  const parts = body.split(from);
  if (parts.length !== 2) throw new Error(`Expected exactly one match for: ${from.slice(0, 70)}… (found ${parts.length - 1})`);
  body = parts.join(to);
};

// 1. The accepted list.
const listMatch = body.match(/if coalesce\(p_origin_id, ''\) not in \(([^)]+)\) then/);
if (!listMatch) throw new Error('Could not find the accepted-origins list');
if (listMatch[1].includes(`'${id}'`)) throw new Error(`'${id}' is already in the accepted list`);
swap(listMatch[0], listMatch[0].replace(listMatch[1], `${listMatch[1]}, '${id}'`));

// 2. The coordinates it prices from, lined up with the rows above it.
const coordMatch = body.match(/ {6}\('[a-z_]+', *(-?\d+\.\d+)::numeric, *(-?\d+\.\d+)::numeric\)\n( *\) as o\(id, lat, lng\))/);
if (!coordMatch) throw new Error('Could not find the end of the coordinates list');
swap(coordMatch[0], `${coordMatch[0].split('\n')[0]},\n      ('${id}', ${Number(lat)}::numeric, ${Number(lng)}::numeric)\n${coordMatch[3]}`);

const header = `-- ============================================================================
--  A new pickup point: ${where || id}.
--
--  A pickup point lives in TWO places — ORIGINS in utils/delivery.ts for the
--  quote the customer sees, and inside request_delivery for the price the
--  server will accept. A point added only to the first is refused at the last
--  step with "Unknown pickup point", after the customer has filled the form in.
--
--  Coordinates are the owner's own pin (${lat}, ${lng}), not a guess at the
--  middle of the area: the first guess at Industrial Area was ~1.7km out, about
--  KES 85 on every quote from there.
--
--  Nothing else changes — same arguments, same fee rules read from
--  delivery_pricing, same floor at the straight-line distance.
--
--  Run once in the Supabase SQL editor, AFTER ${sourceFile}. Safe to re-run.
-- ============================================================================

comment on column public.deliveries.origin_id is
  'Where the rider collects. Mirrors ORIGINS in utils/delivery.ts.';

`;

const check = `
-- ------------------------------------------------------------------
-- Ran clean? Want: accepts_${id} = true, still_one_function = 1.
-- ------------------------------------------------------------------
select
  (select position('${id}' in pg_get_functiondef(p.oid)) > 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'request_delivery' limit 1
  ) as accepts_${id},
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'request_delivery'
  ) as still_one_function;
`;

fs.writeFileSync(path.join(ROOT, outFile), header + body + '\n\n' + check, 'utf8');
console.log(`${outFile} written`);
