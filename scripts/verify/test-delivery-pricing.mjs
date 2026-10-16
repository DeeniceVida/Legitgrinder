// Verify add_delivery_pricing_settings.sql against the LIVE database.
//
// The point of the migration is that request_delivery prices from the table
// rather than from a number typed into it, so the only honest test changes the
// table and watches the fee follow. It does that with the rate set to 1, where
// every trip falls back to the KES 300 minimum — a real customer booking in
// the two-second window pays the ordinary minimum fare and is never overcharged.
//
// The rules are restored, and every test row deleted, in the finally block.
import fs from 'node:fs';

const env = fs.readFileSync('C:/Users/ADMIN/Downloads/copy-of-legitgrinder (2)/.env.local', 'utf8');
const val = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1].trim();
const URL_ = val('VITE_SUPABASE_URL');
const SERVICE = val('SUPABASE_SERVICE_ROLE_KEY');
const ANON = val('VITE_SUPABASE_ANON_KEY');

const api = async (path, { key = SERVICE, method = 'GET', body, prefer } = {}) => {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { }
  return { status: res.status, json, text };
};
const rpc = (fn, args, key = ANON) => api(`/rest/v1/rpc/${fn}`, { key, method: 'POST', body: args });

const results = [];
const check = (l, c, got) => { results.push([l, c]); if (!c && got !== undefined) console.log('      got:', JSON.stringify(got).slice(0, 300)); };
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');

const setRules = (p) => api('/rest/v1/delivery_pricing?id=eq.1', { method: 'PATCH', prefer: 'return=representation', body: p });

// Karen, a long way from the CBD pin — far enough that the rate, not the
// minimum, decides the fee at any normal rate.
const FAR = { lat: -1.3733, lng: 36.7073 };
const book = () => rpc('request_delivery', {
  p_customer_name: 'ZZ PRICING TEST', p_customer_phone: '0700000000', p_customer_email: null,
  p_item: 'Pricing test', p_origin_id: 'cbd', p_delivery_type: 'doorstep', p_courier_name: null,
  p_lat: FAR.lat, p_lng: FAR.lng, p_label: 'Karen', p_km: 20, p_bulky: false, p_reference: 'ZZ-PRICING',
  p_receiver_name: null, p_receiver_phone: null, p_receiver_dest: null, p_parcel_notes: null,
  p_building: 'Test', p_unit: '1', p_gate: null, p_instructions: null,
});

let riderId, original;
try {
  const before = await api('/rest/v1/delivery_pricing?id=eq.1&select=rate_per_km,minimum_fee,bulky_surcharge');
  original = before.json?.[0];
  check('the rules row exists', !!original, before.text);
  console.log('   live rules:', JSON.stringify(original));

  const anonRead = await api('/rest/v1/delivery_pricing?id=eq.1&select=rate_per_km', { key: ANON });
  check('a customer can read the rules (the quote needs them)', anonRead.json?.[0]?.rate_per_km === original.rate_per_km, anonRead.text);

  const anonWrite = await api('/rest/v1/delivery_pricing?id=eq.1', { key: ANON, method: 'PATCH', prefer: 'return=representation', body: { rate_per_km: 5 } });
  const stillSame = await api('/rest/v1/delivery_pricing?id=eq.1&select=rate_per_km');
  check('a stranger CANNOT change your prices', (anonWrite.json || []).length === 0 && stillSame.json?.[0]?.rate_per_km === original.rate_per_km, { anonWrite: anonWrite.text, now: stillSame.json });

  const bad = await setRules({ rate_per_km: 99999 });
  check('a nonsense rate is refused by the database', bad.status >= 400, bad.text);

  const r = await api('/rest/v1/riders', {
    method: 'POST', prefer: 'return=representation',
    body: { name: 'Zz Test Pricing Rider', phone: '0700 000 000', active: true, is_default: false, access_token: 'test' + hex(12) },
  });
  riderId = r.json?.[0]?.id;
  check('temp rider created', !!riderId, r.text);
  await api('/rest/v1/riders?is_default=eq.true', { method: 'PATCH', body: { is_default: false } });
  await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'PATCH', body: { is_default: true } });

  // At the live rate a Karen drop is expensive…
  const atLive = await book();
  check(`priced at the live rate (${original.rate_per_km}/km → over 1,000)`, (atLive.json?.deliveryFeeKES || 0) > 1000, atLive.json);

  // …and at 1/km the same trip must collapse to the minimum. Only a function
  // reading the table can do that.
  await setRules({ rate_per_km: 1 });
  const atOne = await book();
  check('the fee follows the table, not a number in the function', atOne.json?.deliveryFeeKES === original.minimum_fee, { fee: atOne.json?.deliveryFeeKES, expected: original.minimum_fee });

  // The minimum is read from the table too.
  await setRules({ rate_per_km: 1, minimum_fee: 450 });
  const atMin = await book();
  check('the minimum is read from the table as well', atMin.json?.deliveryFeeKES === 450, atMin.json);
} finally {
  if (original) {
    await setRules(original);
    const after = await api('/rest/v1/delivery_pricing?id=eq.1&select=rate_per_km,minimum_fee,bulky_surcharge');
    check('the rules are back exactly as they were', JSON.stringify(after.json?.[0]) === JSON.stringify(original), after.json);
    const restored = await book().catch(() => null);
    if (restored?.json?.ok) {
      check('and the live rate prices again as before', (restored.json.deliveryFeeKES || 0) > 1000, restored.json);
    }
  }
  await api('/rest/v1/deliveries?customer_name=eq.ZZ%20PRICING%20TEST', { method: 'DELETE' });
  if (riderId) {
    await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'PATCH', body: { is_default: false } });
    await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'DELETE' });
  }
  const kibe = await api('/rest/v1/riders?name=eq.Kibe&select=id');
  if (kibe.json?.[0]?.id) await api(`/rest/v1/riders?id=eq.${kibe.json[0].id}`, { method: 'PATCH', body: { is_default: true } });
  const leftD = await api('/rest/v1/deliveries?customer_name=eq.ZZ%20PRICING%20TEST&select=id');
  const ridersNow = await api('/rest/v1/riders?select=name,is_default');
  check('test rows gone', (leftD.json || []).length === 0, leftD.json);
  check('Kibe is the default rider again, alone', (ridersNow.json || []).length === 1
    && ridersNow.json[0].name === 'Kibe' && ridersNow.json[0].is_default === true, ridersNow.json);
}

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
