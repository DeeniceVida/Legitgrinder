/**
 * Mark one product option as an optional EXTRA, so its price is added to
 * whatever the customer chose instead of replacing it.
 *
 *   node scripts/set-variant-addon.cjs <productId> "<option name>" [--type NewGroup] [--dry-run]
 *
 * Reads the product, changes only that one option, writes it back and reads it
 * again to prove it landed — a Supabase write that matches no row reports no
 * error at all.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const typeIdx = args.indexOf('--type');
const newType = typeIdx > -1 ? args[typeIdx + 1] : null;
const [productId, optionName] = args.filter((a, i) => !a.startsWith('--') && (typeIdx === -1 || i !== typeIdx + 1));
if (!productId || !optionName) throw new Error('Usage: set-variant-addon.cjs <productId> "<option name>" [--type NewGroup] [--dry-run]');

const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const val = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1].trim();
const URL_ = val('VITE_SUPABASE_URL');
const KEY = val('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

(async () => {
  const get = await fetch(`${URL_}/rest/v1/products?id=eq.${productId}&select=name,shop_variants`, { headers: H });
  const [p] = await get.json();
  if (!p) throw new Error('No product with that id');
  console.log(`${p.name}`);
  console.log('before:'); p.shop_variants.forEach(v => console.log('  ', v.type, '|', v.name, '| KES', v.priceKES, '| addOn', v.addOn === true));

  const hits = p.shop_variants.filter(v => v.name === optionName);
  if (hits.length !== 1) throw new Error(`Expected exactly one option named "${optionName}", found ${hits.length}`);

  const next = p.shop_variants.map(v => (v.name === optionName
    ? { ...v, addOn: true, ...(newType ? { type: newType } : {}) }
    : v));

  if (DRY) {
    console.log('\nafter (DRY RUN — nothing written):');
    next.forEach(v => console.log('  ', v.type, '|', v.name, '| KES', v.priceKES, '| addOn', v.addOn === true));
    return;
  }

  const put = await fetch(`${URL_}/rest/v1/products?id=eq.${productId}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ shop_variants: next }),
  });
  const body = await put.text();
  if (put.status >= 300) throw new Error(`write failed: ${put.status} ${body.slice(0, 200)}`);

  const check = await fetch(`${URL_}/rest/v1/products?id=eq.${productId}&select=shop_variants`, { headers: H });
  const [after] = await check.json();
  const saved = after.shop_variants.find(v => v.name === optionName);
  console.log('\nafter:'); after.shop_variants.forEach(v => console.log('  ', v.type, '|', v.name, '| KES', v.priceKES, '| addOn', v.addOn === true));
  if (!saved?.addOn) throw new Error('The write did NOT land — the option is still not an add-on.');
  console.log('\nVerified: saved and read back.');
})().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
