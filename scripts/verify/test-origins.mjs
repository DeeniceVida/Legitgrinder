// Verify EVERY pickup point against the LIVE database.
//
// Replaces the Safariline-only test: each point in ORIGINS must be accepted by
// request_delivery and must price from its own pin, which is what catches a
// point added to the page but not to the function (the customer would fill the
// whole form in and be refused at the last step).
//
// A temporary rider takes the jobs so Kibe's dashboard stays clean; every test
// row is deleted and Kibe is restored as default in the finally block.
import fs from 'node:fs';

const ROOT = 'C:/Users/ADMIN/Downloads/copy-of-legitgrinder (2)';
const env = fs.readFileSync(`${ROOT}/.env.local`, 'utf8');
const val = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1].trim();
const URL_ = val('VITE_SUPABASE_URL');
const SERVICE = val('SUPABASE_SERVICE_ROLE_KEY');
const ANON = val('VITE_SUPABASE_ANON_KEY');

// Read the pickup points straight out of the source of truth, so a point added
// there and forgotten in SQL fails this test rather than a customer's booking.
const ts = fs.readFileSync(`${ROOT}/utils/delivery.ts`, 'utf8');
const ORIGINS = [...ts.matchAll(/id:\s*'([a-z_]+)',[\s\S]*?lat:\s*(-?[\d.]+),\s*\n\s*lng:\s*([\d.]+),/g)]
  .map(m => ({ id: m[1], lat: Number(m[2]), lng: Number(m[3]) }));

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

const straightKm = (a, b) => 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(
  Math.sin(((b.lat - a.lat) * Math.PI / 180) / 2) ** 2
  + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
  * Math.sin(((b.lng - a.lng) * Math.PI / 180) / 2) ** 2)));

// Karen: far from every pickup point, and far enough apart from each that the
// floor differs per origin — so a point priced from the wrong pin shows up.
const DROP = { lat: -1.3733, lng: 36.7073 };

const book = (originId) => rpc('request_delivery', {
  p_customer_name: 'ZZ ORIGIN TEST', p_customer_phone: '0700000000', p_customer_email: null,
  p_item: 'Origin test', p_origin_id: originId, p_delivery_type: 'doorstep', p_courier_name: null,
  p_lat: DROP.lat, p_lng: DROP.lng, p_label: 'Karen', p_km: 0, p_bulky: false, p_reference: 'ZZ-ORIGIN',
  p_receiver_name: null, p_receiver_phone: null, p_receiver_dest: null, p_parcel_notes: null,
  p_building: 'Test Court', p_unit: '2B', p_gate: null, p_instructions: null,
});

let riderId;
try {
  console.log(`pickup points in utils/delivery.ts: ${ORIGINS.map(o => o.id).join(', ')}`);
  check('found the pickup points in the source', ORIGINS.length >= 3, ORIGINS);

  const rules = await api('/rest/v1/delivery_pricing?id=eq.1&select=rate_per_km,minimum_fee');
  const { rate_per_km: rate, minimum_fee: min } = rules.json?.[0] || {};
  check('read the live fee rules', !!rate && !!min, rules.text);

  const r = await api('/rest/v1/riders', {
    method: 'POST', prefer: 'return=representation',
    body: { name: 'Zz Test Origin Rider', phone: '0700 000 000', active: true, is_default: false, access_token: 'test' + hex(12) },
  });
  riderId = r.json?.[0]?.id;
  check('temp rider created', !!riderId, r.text);
  await api('/rest/v1/riders?is_default=eq.true', { method: 'PATCH', body: { is_default: false } });
  await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'PATCH', body: { is_default: true } });

  for (const o of ORIGINS) {
    const res = await book(o.id);
    // p_km is 0, so whatever comes back is the server's own floor: it can only
    // be right if the function holds this point's real coordinates.
    const expected = Math.max(Math.ceil((straightKm(o, DROP) * rate) / 10) * 10, min);
    check(`${o.id}: accepted and priced from its own pin (KES ${expected})`,
      res.json?.ok === true && res.json?.deliveryFeeKES === expected,
      { fee: res.json?.deliveryFeeKES, expected, error: res.json?.error });
  }

  const bogus = await book('nowhere');
  check('an unknown pickup point is still refused', bogus.json?.ok === false, bogus.json);
} finally {
  await api('/rest/v1/deliveries?customer_name=eq.ZZ%20ORIGIN%20TEST', { method: 'DELETE' });
  if (riderId) {
    await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'PATCH', body: { is_default: false } });
    await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'DELETE' });
  }
  const kibe = await api('/rest/v1/riders?name=eq.Kibe&select=id');
  if (kibe.json?.[0]?.id) await api(`/rest/v1/riders?id=eq.${kibe.json[0].id}`, { method: 'PATCH', body: { is_default: true } });
  const leftD = await api('/rest/v1/deliveries?customer_name=eq.ZZ%20ORIGIN%20TEST&select=id');
  const ridersNow = await api('/rest/v1/riders?select=name,is_default');
  check('test rows gone', (leftD.json || []).length === 0, leftD.json);
  check('Kibe is the default rider again, alone', (ridersNow.json || []).length === 1
    && ridersNow.json[0].name === 'Kibe' && ridersNow.json[0].is_default === true, ridersNow.json);
}

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
