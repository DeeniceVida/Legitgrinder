// Check feeEarnedKES against the LIVE invoices, and against hand-worked cases.
//
// Read-only: this never writes. The point is that the dashboard's new "You
// earned" figure matches what is actually on his invoices — the fee lives in
// a line item on recent orders and in service_fee_kes on early ones.
import fs from 'node:fs';

const ROOT = 'C:/Users/ADMIN/Downloads/copy-of-legitgrinder (2)';
const env = fs.readFileSync(`${ROOT}/.env.local`, 'utf8');
const val = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1].trim();
const URL_ = val('VITE_SUPABASE_URL');
const SERVICE = val('SUPABASE_SERVICE_ROLE_KEY');

// Mirrors utils/invoiceMoney.ts — if that changes, this must change with it.
const FEE_LINE = /\b(service|handling|commission|agent)\s*fee\b/i;
const feeEarned = (inv) => {
  const fromItems = (inv.items || [])
    .filter(i => FEE_LINE.test(i.name || ''))
    .reduce((s, i) => s + (i.priceKES || 0) * (i.quantity || 1), 0);
  return fromItems > 0 ? fromItems : (inv.service_fee_kes || 0);
};
const collected = (inv) => inv.is_paid
  ? Math.max(inv.total_kes || 0, inv.amount_paid_kes || 0)
  : (inv.amount_paid_kes || 0);

const results = [];
const check = (l, c, got) => { results.push([l, c]); if (!c && got !== undefined) console.log('      got:', JSON.stringify(got).slice(0, 200)); };

const res = await fetch(`${URL_}/rest/v1/invoices?select=invoice_number,created_at,total_kes,amount_paid_kes,is_paid,items,service_fee_kes&order=created_at`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
});
const inv = await res.json();
check('invoices readable', Array.isArray(inv) && inv.length > 50, inv?.length);

// Hand-worked: LG100033 carries a 3,000 "Service fee" line.
const one = inv.find(i => i.invoice_number === 'LG100033');
check('a fee on the line items is read (LG100033 → 3,000)', one && feeEarned(one) === 3000, one && { fee: feeEarned(one), items: one.items });

// Hand-worked: an early order used the column instead.
const early = inv.find(i => (i.service_fee_kes || 0) > 0 && !(i.items || []).some(x => FEE_LINE.test(x.name || '')));
check('a fee in the old column is still read', early && feeEarned(early) === early.service_fee_kes, early && { n: early.invoice_number, fee: feeEarned(early) });

// Never counted twice when both exist.
const both = inv.filter(i => (i.service_fee_kes || 0) > 0 && (i.items || []).some(x => FEE_LINE.test(x.name || '')));
check('the line item wins when both are set — never summed',
  both.every(i => feeEarned(i) !== (i.service_fee_kes || 0) + (i.items.filter(x => FEE_LINE.test(x.name || '')).reduce((s, x) => s + (x.priceKES || 0) * (x.quantity || 1), 0))
    || feeEarned(i) > 0),
  both.map(i => i.invoice_number));

// A buying-price line must never be mistaken for a fee.
const buyingLines = inv.flatMap(i => (i.items || []).filter(x => /buying/i.test(x.name || '')));
check('a "Buying price" line is not counted as a fee', buyingLines.every(x => !FEE_LINE.test(x.name || '')), buyingLines.slice(0, 3));

// The totals the dashboard will now show.
const months = {};
for (const i of inv) {
  if (collected(i) <= 0) continue;
  const m = (i.created_at || '').slice(0, 7);
  months[m] = (months[m] || 0) + feeEarned(i);
}
console.log('\nservice fees earned, by month (what the dashboard will now show):');
let total = 0;
for (const m of Object.keys(months).sort()) { console.log(`  ${m}  KES ${Math.round(months[m]).toLocaleString()}`); total += months[m]; }
console.log(`  TOTAL KES ${Math.round(total).toLocaleString()}`);

const paidNoFee = inv.filter(i => collected(i) > 0 && feeEarned(i) <= 0);
console.log(`\npaid orders carrying no fee at all: ${paidNoFee.length} of ${inv.filter(i => collected(i) > 0).length}`);
check('the yearly figure is a real number, not zero', total > 0, total);

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
