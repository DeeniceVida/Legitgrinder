/**
 * Add new phone models + capacities to the Pricelist from a pasted price list.
 *
 * Back Market's bot protection now refuses curl AND a real browser (a Cloudflare
 * "verify you are human" checkbox), so sync-backmarket.cjs cannot reach it and
 * the prices have to be read off the site by hand. This takes them from a plain
 * text file and does the rest: the KES maths, the model rows, the variant rows.
 *
 * File format — one line per capacity, blank lines and # comments ignored:
 *
 *    iPhone 17 | 256GB | 749
 *    iPhone 17 | 512GB | 879
 *
 * The USD figure is Back Market's GOOD-condition price, which is what the
 * automated sync always used (schema.org JSON-LD), so new rows sit on the same
 * basis as the existing 180.
 *
 *    node scripts/add-phone-models.cjs scripts/new-phone-prices.txt --dry-run
 *    node scripts/add-phone-models.cjs scripts/new-phone-prices.txt
 *
 * Every write is verified with a read-back — an anon key silently writes zero
 * rows under RLS, so "no error" never means "it landed".
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const FILE = ARGS.find((a) => !a.startsWith('--')) || path.join(__dirname, 'new-phone-prices.txt');

// Mirrors utils/priceCalculations.ts + constants.ts. If those change, change these.
const KES_PER_USD = 135;
const FEES = { SHIPPING_FLAT_USD: 20, SHIPPING_PERCENT: 0.035, THRESHOLD_USD: 750, SERVICE_FEE_FIXED_USD: 30, SERVICE_FEE_PERCENT_LARGE: 0.045 };
const calculateKES = (usd) => {
  const shipping = FEES.SHIPPING_FLAT_USD + usd * FEES.SHIPPING_PERCENT;
  const service = usd <= FEES.THRESHOLD_USD ? FEES.SERVICE_FEE_FIXED_USD : usd * FEES.SERVICE_FEE_PERCENT_LARGE;
  return Math.ceil((usd + shipping + service) * KES_PER_USD);
};

/** Which brand and series a model name belongs to, matching the rows already there. */
function classify(name) {
  const n = name.trim();
  if (/^iPhone/i.test(n)) {
    if (/^iPhone SE/i.test(n)) return { brand: 'iphone', series: 'SE' };
    if (/^iPhone Air/i.test(n)) return { brand: 'iphone', series: '17 Series' }; // launched with the 17s
    if (/^iPhone Duo/i.test(n)) return { brand: 'iphone', series: '18 Series' };
    const gen = (n.match(/^iPhone\s+(\d+)/i) || [])[1];
    return { brand: 'iphone', series: gen ? `${gen} Series` : 'Other' };
  }
  if (/^Pixel/i.test(n)) {
    // Only the original "Pixel Fold" sits in its own series — Pixel 9 Pro Fold
    // is filed under "9 Series", so a numbered fold follows its generation.
    if (/^Pixel Fold$/i.test(n)) return { brand: 'pixel', series: 'Fold Series' };
    const gen = (n.match(/^Pixel\s+(\d+)/i) || [])[1];
    return { brand: 'pixel', series: gen ? `${gen} Series` : 'Other' };
  }
  if (/^S\d/i.test(n)) {
    const gen = (n.match(/^S(\d+)/i) || [])[1];
    return { brand: 'samsung', series: gen ? `S${gen} Series` : 'Other' };
  }
  return null;
}

function parseFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const rows = [];
  raw.split(/\r?\n/).forEach((line, i) => {
    const l = line.trim();
    if (!l || l.startsWith('#')) return;
    const parts = l.split('|').map((p) => p.trim());
    if (parts.length < 3) throw new Error(`Line ${i + 1}: expected "Model | capacity | usd", got: ${l}`);
    const [name, capacity, usdRaw] = parts;
    const usd = parseFloat(String(usdRaw).replace(/[^0-9.]/g, ''));
    if (!(usd > 0)) throw new Error(`Line ${i + 1}: "${usdRaw}" is not a price`);
    if (!/^\d+(GB|TB)$/i.test(capacity)) throw new Error(`Line ${i + 1}: capacity should look like 256GB or 1TB, got "${capacity}"`);
    const cls = classify(name);
    if (!cls) throw new Error(`Line ${i + 1}: cannot tell which brand "${name}" is`);
    rows.push({ name, capacity: capacity.toUpperCase(), usd, ...cls });
  });
  return rows;
}

function loadEnv() {
  const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  return Object.fromEntries(
    raw.split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  );
}

(async () => {
  const rows = parseFile(FILE);
  const env = loadEnv();
  const URL_ = env.VITE_SUPABASE_URL;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from .env.local — anon-key writes are silently blocked by RLS.');
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const api = async (p, method = 'GET', body) => {
    const r = await fetch(URL_ + p, { method, headers: H, ...(body ? { body: JSON.stringify(body) } : {}) });
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch { /* not json */ }
    if (r.status >= 300) throw new Error(`${method} ${p} → ${r.status} ${t.slice(0, 300)}`);
    return j;
  };

  const existing = await api('/rest/v1/pricelist_models?select=id,name,brand');
  const byName = new Map(existing.map((m) => [m.name.toLowerCase(), m]));

  const models = [...new Map(rows.map((r) => [r.name.toLowerCase(), r])).values()];
  console.log(`${rows.length} capacities across ${models.length} models${DRY_RUN ? '  (DRY RUN — nothing written)' : ''}\n`);

  for (const m of models) {
    const mine = rows.filter((r) => r.name.toLowerCase() === m.name.toLowerCase());
    const known = byName.get(m.name.toLowerCase());
    console.log(`${known ? 'exists ' : 'NEW    '} ${m.brand}/${m.series}  ${m.name}`);
    for (const r of mine) console.log(`         ${r.capacity.padEnd(6)} $${String(r.usd).padEnd(7)} → KES ${calculateKES(r.usd).toLocaleString()}`);
    if (DRY_RUN) continue;

    let modelId = known?.id;
    if (!modelId) {
      const [created] = await api('/rest/v1/pricelist_models', 'POST', { name: m.name, brand: m.brand, series: m.series });
      modelId = created?.id;
      if (!modelId) throw new Error(`Model ${m.name} did not come back from the insert — nothing was written.`);
    }

    const have = await api(`/rest/v1/pricelist_variants?model_id=eq.${modelId}&select=id,capacity,price_kes,is_manual_override`);
    for (const r of mine) {
      const kes = calculateKES(r.usd);
      const hit = have.find((v) => v.capacity.toUpperCase() === r.capacity);
      if (hit?.is_manual_override) { console.log(`         ${r.capacity} left alone — manual override`); continue; }
      const body = { price_usd: r.usd, price_kes: kes, last_updated: new Date().toISOString(), status: 'active' };
      const out = hit
        ? await api(`/rest/v1/pricelist_variants?id=eq.${hit.id}`, 'PATCH', { ...body, previous_price_kes: hit.price_kes })
        : await api('/rest/v1/pricelist_variants', 'POST', { model_id: modelId, capacity: r.capacity, is_manual_override: false, ...body });
      if (!out?.length) throw new Error(`${m.name} ${r.capacity}: the write returned no rows — it did NOT land.`);
    }
  }

  if (!DRY_RUN) {
    const after = await api('/rest/v1/pricelist_models?select=id,name');
    const names = new Set(after.map((x) => x.name.toLowerCase()));
    const missing = models.filter((m) => !names.has(m.name.toLowerCase()));
    console.log(`\nVerified: ${after.length} models on the list${missing.length ? ` — MISSING: ${missing.map((m) => m.name).join(', ')}` : ', all requested models present'}`);
  }
})().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
