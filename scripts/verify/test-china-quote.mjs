// The China quoting maths. Pure arithmetic — writes nothing, sends nothing.
//
// The app's imports are extensionless, which Vite resolves and bare Node does
// not, so the module is bundled here with esbuild (already a dependency) and
// the REAL code is what gets tested — not a copy of it that could drift.
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = 'C:/Users/ADMIN/Downloads/copy-of-legitgrinder (2)';
const bundled = async (entry) => {
  const out = path.join(os.tmpdir(), `${path.basename(entry, '.ts')}-${process.pid}.mjs`);
  await build({ entryPoints: [`${ROOT}/utils/${entry}`], bundle: true, format: 'esm', outfile: out, logLevel: 'silent' });
  const mod = await import(`file://${out.replace(/\\/g, '/')}`);
  fs.unlinkSync(out);
  return mod;
};

const {
  seaFreightKES, airFreightKES, goodsToKES, quoteChina,
  SEA_RATE_KES_PER_CBM, AIR_RATE_USD_PER_KG,
} = await bundled('chinaQuote.ts');
const { serviceFeeFor } = await bundled('serviceFee.ts');

const results = [];
const check = (l, c, got) => { results.push([l, c]); if (!c && got !== undefined) console.log('      got:', JSON.stringify(got)); };

// His own example, the one he gave over the phone.
check('0.1 CBM is 7,000 by sea', seaFreightKES(0.1) === 7000, seaFreightKES(0.1));
check('1 CBM is 70,000', seaFreightKES(1) === 70000, seaFreightKES(1));
check('2.5 CBM is 175,000', seaFreightKES(2.5) === 175000, seaFreightKES(2.5));

// Air: $16.50/kg at 135.
check('1 kg of air freight is 2,227.50', airFreightKES(1) === 16.5 * 135, airFreightKES(1));
check('20 kg is 44,550', airFreightKES(20) === 44550, airFreightKES(20));

check('rates are the ones he gave', SEA_RATE_KES_PER_CBM === 70000 && AIR_RATE_USD_PER_KG === 16.5);

// Currency switch.
check('USD converts at 135', goodsToKES(100, 'USD') === 13500, goodsToKES(100, 'USD'));
check('KES is taken as typed', goodsToKES(13500, 'KES') === 13500, goodsToKES(13500, 'KES'));

// A whole quote, worked by hand:
//   $300 goods = 40,500 · +5% = 42,525 → 42,600 buying
//   0.3 CBM = 21,000 freight
//   fee: 42,600 is under 50,000 → 3,000 flat
const q = quoteChina({ goodsKES: goodsToKES(300, 'USD'), freightKES: seaFreightKES(0.3) });
check('a worked sea quote adds up', q.buyingKES === 42600 && q.freightKES === 21000
  && q.serviceFeeKES === 3000 && q.totalKES === 66600, q);

// The same goods by air at 25kg: freight 25 × 16.5 × 135 = 55,687.50 → 55,700
const qa = quoteChina({ goodsKES: goodsToKES(300, 'USD'), freightKES: airFreightKES(25) });
check('a worked air quote adds up', qa.freightKES === 55700 && qa.totalKES === 42600 + 55700 + 3000, qa);

// The 5% can be switched off.
const noTx = quoteChina({ goodsKES: 100000, freightKES: 0, addTransaction: false });
check('without the 5%, buying price is the goods', noTx.buyingKES === 100000 && noTx.transactionKES === 0, noTx);
const withTx = quoteChina({ goodsKES: 100000, freightKES: 0 });
check('with the 5%, it is added before the fee', withTx.buyingKES === 105000
  && withTx.serviceFeeKES === serviceFeeFor(105000), withTx);

// Business goods pay the higher fee, never a lower one.
const pers = quoteChina({ goodsKES: 200000, freightKES: 10000 });
const biz = quoteChina({ goodsKES: 200000, freightKES: 10000, business: true });
check('business goods cost the customer more', biz.totalKES > pers.totalKES, [pers.totalKES, biz.totalKES]);

// The parts must always reconcile to the total — a breakdown that doesn't is
// worse than no breakdown.
let bad = 0;
for (let g = 5000; g <= 500000; g += 7500) {
  for (const f of [0, 7000, 44550, 175000]) {
    const r = quoteChina({ goodsKES: g, freightKES: f });
    if (r.buyingKES + r.freightKES + r.serviceFeeKES !== r.totalKES) bad++;
  }
}
check('every quote reconciles to its parts', bad === 0, bad);

// Nothing typed yet must not quote a fee on nothing.
const empty = quoteChina({ goodsKES: 0, freightKES: 0 });
check('no goods, no quote', empty.totalKES === 0 && empty.serviceFeeKES === 0, empty);

console.log('\nwhat it quotes for a $300 carton:');
for (const [label, f] of [['0.1 CBM sea', seaFreightKES(0.1)], ['0.5 CBM sea', seaFreightKES(0.5)], ['10kg air', airFreightKES(10)], ['30kg air', airFreightKES(30)]]) {
  const r = quoteChina({ goodsKES: goodsToKES(300, 'USD'), freightKES: f });
  console.log(`  ${label.padEnd(12)} total ${String(Math.round(r.totalKES)).padStart(7)} · your fee ${r.serviceFeeKES}`);
}

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
