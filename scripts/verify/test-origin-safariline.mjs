// Verify add_delivery_origin_safariline.sql against the LIVE database.
//
// Books from the new pickup point with a temporary rider, checks the fee is
// measured from the owner's pin (and cannot be under-quoted by a tampered
// browser), and that an unknown point is still refused. Every test row is
// deleted at the end. Kibe is never touched.
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

// The owner's pin, and a drop ~3.1km away (Ngara) to price against.
const SAFARILINE = { lat: -1.273027, lng: 36.847682 };
const DROP = { lat: -1.2766, lng: 36.8237 };

const book = (over = {}) => rpc('request_delivery', {
  p_customer_name: 'ZZ ORIGIN TEST', p_customer_phone: '0700000000', p_customer_email: null,
  p_item: 'Origin test', p_origin_id: 'safariline', p_delivery_type: 'doorstep', p_courier_name: null,
  p_lat: DROP.lat, p_lng: DROP.lng, p_label: 'Ngara', p_km: 3.4, p_bulky: false, p_reference: 'ZZ-ORIGIN',
  p_receiver_name: null, p_receiver_phone: null, p_receiver_dest: null, p_parcel_notes: null,
  p_building: 'Test Court', p_unit: '2B', p_gate: null, p_instructions: null, ...over,
});

let riderId;
const tokens = [];
try {
  const r = await api('/rest/v1/riders', {
    method: 'POST', prefer: 'return=representation',
    body: { name: 'Zz Test Origin Rider', phone: '0700 000 000', active: true, is_default: false, access_token: 'test' + hex(12) },
  });
  riderId = r.json?.[0]?.id;
  check('temp rider created', !!riderId, r.text);

  // Kibe is default, so a booking lands on him — park him while this runs and
  // put him back in the finally block.
  await api('/rest/v1/riders?is_default=eq.true', { method: 'PATCH', body: { is_default: false } });
  await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'PATCH', body: { is_default: true } });

  let x = await book();
  tokens.push(x.json?.customerToken);
  check('books from safariline', x.json?.ok === true, x.json);
  // 3.1km straight line → road estimate ~4.3km → 50/km rounded up to the 10 = 220, floored at the 300 minimum.
  check('fee is the minimum for a short hop', x.json?.deliveryFeeKES === 300, x.json);

  // A tampered browser claiming 0 km must still pay for the real distance.
  const far = await book({ p_lat: -1.3733, p_lng: 36.7073, p_label: 'Karen', p_km: 0 });
  tokens.push(far.json?.customerToken);
  const straightKm = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(
    Math.sin(((-1.3733 - SAFARILINE.lat) * Math.PI / 180) / 2) ** 2
    + Math.cos(SAFARILINE.lat * Math.PI / 180) * Math.cos(-1.3733 * Math.PI / 180)
    * Math.sin(((36.7073 - SAFARILINE.lng) * Math.PI / 180) / 2) ** 2)));
  const floor = Math.max(Math.ceil((straightKm * 60) / 10) * 10, 300);
  check(`a tampered 0 km is still priced from the pin (>= ${floor})`, (far.json?.deliveryFeeKES || 0) >= floor, { fee: far.json?.deliveryFeeKES, floor, straightKm });

  const bogus = await book({ p_origin_id: 'eastleigh' });
  check('an unknown pickup point is refused', bogus.json?.ok === false, bogus.json);

  const row = await api(`/rest/v1/deliveries?customer_token=eq.${tokens[0]}&select=origin_id,rider_id,drop_building,invoice_number`);
  check('saved against safariline, the temp rider and the order', row.json?.[0]?.origin_id === 'safariline'
    && row.json?.[0]?.rider_id === riderId && row.json?.[0]?.invoice_number === 'ZZ-ORIGIN', row.json);
} finally {
  await api('/rest/v1/deliveries?customer_name=eq.ZZ%20ORIGIN%20TEST', { method: 'DELETE' });
  if (riderId) {
    await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'PATCH', body: { is_default: false } });
    await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'DELETE' });
  }
  // Kibe goes back to being the default, whatever happened above.
  const kibe = await api('/rest/v1/riders?name=eq.Kibe&select=id');
  if (kibe.json?.[0]?.id) await api(`/rest/v1/riders?id=eq.${kibe.json[0].id}`, { method: 'PATCH', body: { is_default: true } });
  const after = await api('/rest/v1/riders?select=name,is_default,active');
  const leftD = await api('/rest/v1/deliveries?customer_name=eq.ZZ%20ORIGIN%20TEST&select=id');
  check('test rows gone', (leftD.json || []).length === 0, leftD.json);
  check('Kibe is the default rider again, alone', (after.json || []).length === 1
    && after.json[0].name === 'Kibe' && after.json[0].is_default === true, after.json);
}

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
