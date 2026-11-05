/**
 * Add the 34" 165Hz ultrawide to /monitors.
 *
 * Its price is DECIDED, not calculated: neither supplier sheet carries a 34"
 * at 165Hz (they go 100 → 180 → 200 → 240), so there is no factory cost to
 * price from. buying_override_kes holds the owner's figure and factory_usd is
 * left empty rather than back-solved — a supplier cost that was never paid
 * makes the margin view lie and drifts the price on the next rate change.
 *
 *   node scripts/add-monitor-34-165hz.cjs --dry-run
 *   node scripts/add-monitor-34-165hz.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const val = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1].trim();
const URL_ = val('VITE_SUPABASE_URL');
const KEY = val('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

/** Owner's decision, 2026-11-05: 38,000 on the card — above the 100Hz, below the 180Hz. */
const CARD_KES = 38000;
const SHIPPING_KES = 13100; // 34" freight 11,700 + $10 × 135, rounded to the hundred

const ROW = {
  size_inches: 34,
  series: 'MX',
  // Derived from its 180Hz sibling (HP-MX342GU) with the refresh spelled out,
  // because the supplier has no code for this one. Buyers see "Ref MX342GU-165".
  model_code: 'HP-MX342GU-165',
  width_px: 3440,
  height_px: 1440,
  res_label: 'UWQHD',
  refresh_hz: 165,
  curved: true,
  base_type: 'Lifting',
  factory_usd: null,
  buying_override_kes: CARD_KES - SHIPPING_KES,
  image_url: 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1785856956/WhatsApp_Image_2026-07-30_at_17.54.13_dwloab.jpg',
  available_colors: ['Black', 'White'],
  is_active: true,
  sort_order: 845, // between the 100Hz (840) and the 180Hz (850)
};

(async () => {
  const existing = await fetch(`${URL_}/rest/v1/monitor_models?select=model_code,refresh_hz,factory_usd,buying_override_kes,sort_order&size_inches=eq.34&order=sort_order`, { headers: H });
  const rows = await existing.json();
  console.log('34" models now:');
  rows.forEach(r => console.log(`  ${r.model_code.padEnd(18)} ${String(r.refresh_hz).padStart(3)}Hz  factory $${r.factory_usd ?? '—'}  decided ${r.buying_override_kes ?? '—'}`));

  if (rows.some(r => r.refresh_hz === 165)) throw new Error('A 34" 165Hz already exists — nothing to do.');

  console.log('\nadding:');
  console.log(`  ${ROW.model_code} ${ROW.refresh_hz}Hz  buying ${ROW.buying_override_kes.toLocaleString()} + shipping ${SHIPPING_KES.toLocaleString()} = ${CARD_KES.toLocaleString()}`);
  if (DRY) { console.log('\nDRY RUN — nothing written.'); return; }

  const ins = await fetch(`${URL_}/rest/v1/monitor_models`, { method: 'POST', headers: H, body: JSON.stringify(ROW) });
  const body = await ins.text();
  if (ins.status >= 300) throw new Error(`insert failed: ${ins.status} ${body.slice(0, 300)}`);

  const check = await fetch(`${URL_}/rest/v1/monitor_models?select=model_code,refresh_hz,factory_usd,buying_override_kes,is_active&size_inches=eq.34&order=sort_order`, { headers: H });
  const after = await check.json();
  console.log('\n34" models after:');
  after.forEach(r => console.log(`  ${r.model_code.padEnd(18)} ${String(r.refresh_hz).padStart(3)}Hz  factory $${r.factory_usd ?? '—'}  decided ${r.buying_override_kes ?? '—'}  ${r.is_active ? 'live' : 'hidden'}`));

  const saved = after.find(r => r.refresh_hz === 165);
  if (!saved || Number(saved.buying_override_kes) !== ROW.buying_override_kes) {
    throw new Error('The row did NOT land as intended.');
  }
  console.log('\nVerified: saved and read back.');
})().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
