// The sourcing fee rule, checked at the places it can go wrong.
// Pure arithmetic — touches nothing, writes nothing.
import { serviceFeeFor, FEE_THRESHOLD_KES, FEE_CARD_TEXT } from '../../utils/serviceFee.ts';

const results = [];
const check = (label, cond, got) => { results.push([label, cond]); if (!cond && got !== undefined) console.log('      got:', JSON.stringify(got)); };

// The published card, word for word. Figures are written out rather than read
// from the constants, so a rate changed by accident still fails here.
check('up to 50k is the flat fee', serviceFeeFor(18000) === 4050, serviceFeeFor(18000));
check('up to 50k, business', serviceFeeFor(18000, true) === 4550, serviceFeeFor(18000, true));
check('exactly 50k is still flat', serviceFeeFor(50000) === 4050, serviceFeeFor(50000));
// The floor holds well past the threshold: 5% only overtakes 4,050 at 81,000.
check('the floor still applies above 50k', serviceFeeFor(60000) === 4050, serviceFeeFor(60000));
check('5% takes over once it beats the floor', serviceFeeFor(100000) === 5000, serviceFeeFor(100000));
check('above 50k is 5%', serviceFeeFor(92000) === 4600, serviceFeeFor(92000));
check('above 50k, business is 7%', serviceFeeFor(201800, true) === 14200, serviceFeeFor(201800, true));

// A fee must never fall as the order grows — the trap in any tiered rate.
let prev = 0, dips = [];
for (let v = 1000; v <= 500000; v += 500) {
  const f = serviceFeeFor(v);
  if (f < prev) dips.push(v);
  prev = f;
}
check('the fee never drops as the order grows', dips.length === 0, dips.slice(0, 5));

let prevB = 0; const dipsB = [];
for (let v = 1000; v <= 500000; v += 500) {
  const f = serviceFeeFor(v, true);
  if (f < prevB) dipsB.push(v);
  prevB = f;
}
check('same for business goods', dipsB.length === 0, dipsB.slice(0, 5));

// Crossing the threshold must not pay LESS than just under it.
check('just over 50k beats just under', serviceFeeFor(FEE_THRESHOLD_KES + 1) >= serviceFeeFor(FEE_THRESHOLD_KES),
  [serviceFeeFor(FEE_THRESHOLD_KES), serviceFeeFor(FEE_THRESHOLD_KES + 1)]);

// Rounding and edges.
check('rounded up to the hundred', serviceFeeFor(101450) === 5100, serviceFeeFor(101450));
check('no goods, no fee', serviceFeeFor(0) === 0 && serviceFeeFor(-500) === 0);
check('rubbish input is not a fee', serviceFeeFor(NaN) === 0 && serviceFeeFor(undefined) === 0);

// Business always pays at least the personal rate, never less.
const cheaper = [];
for (let v = 1000; v <= 400000; v += 1000) if (serviceFeeFor(v, true) < serviceFeeFor(v)) cheaper.push(v);
check('business goods never cost less than personal', cheaper.length === 0, cheaper.slice(0, 5));

// The card customers read is generated from the same numbers.
check('the published wording matches the rule',
  FEE_CARD_TEXT.includes('50,000') && FEE_CARD_TEXT.includes('5%') && FEE_CARD_TEXT.includes('7%'), FEE_CARD_TEXT);

console.log('\nwhat it quotes:');
for (const v of [7000, 20000, 50000, 50500, 75000, 92000, 150000, 303700]) {
  console.log(`  goods ${String(v).padStart(7)} → ${String(serviceFeeFor(v)).padStart(6)} personal · ${String(serviceFeeFor(v, true)).padStart(6)} business`);
}

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
