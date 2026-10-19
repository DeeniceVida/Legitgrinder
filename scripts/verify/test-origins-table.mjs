// Verify add_delivery_origins_table.sql against the LIVE database.
//
// The point of the migration is that a pickup point added from the dashboard
// works end to end with no deploy, so the test adds one, books from it, checks
// the fee came from ITS pin, retires it and checks the booking is then refused.
// The temporary point and rider are deleted in the finally block.
import fs from 'node:fs';

const ROOT = 'C:/Users/ADMIN/Downloads/copy-of-legitgrinder (2)';
const env = fs.readFileSync(`${ROOT}/.env.local`, 'utf8');
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

const straightKm = (a, b) => 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(
  Math.sin(((b.lat - a.lat) * Math.PI / 180) / 2) ** 2
  + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
  * Math.sin(((b.lng - a.lng) * Math.PI / 180) / 2) ** 2)));

// A pin out at Ruiru, nowhere near the real points, so a fee computed from any
// other point's coordinates would be obviously wrong.
const TEST_POINT = { id: 'zztestpoint', lat: -1.148611, lng: 36.961111 };
const DROP = { lat: -1.3733, lng: 36.7073 };

const book = (originId) => rpc('request_delivery', {
  p_customer_name: 'ZZ ORIGINS TABLE TEST', p_customer_phone: '0700000000', p_customer_email: null,
  p_item: 'Origins table test', p_origin_id: originId, p_delivery_type: 'doorstep', p_courier_name: null,
  p_lat: DROP.lat, p_lng: DROP.lng, p_label: 'Karen', p_km: 0, p_bulky: false, p_reference: 'ZZ-ORIGINS',
  p_receiver_name: null, p_receiver_phone: null, p_receiver_dest: null, p_parcel_notes: null,
  p_building: 'Test', p_unit: '1', p_gate: null, p_instructions: null,
});

let riderId;
try {
  const rules = await api('/rest/v1/delivery_pricing?id=eq.1&select=rate_per_km,minimum_fee');
  const { rate_per_km: rate, minimum_fee: min } = rules.json?.[0] || {};
  check('read the live fee rules', !!rate && !!min, rules.text);

  const live = await api('/rest/v1/delivery_origins?select=id,name,lat,lng&active=is.true&order=sort_order');
  check('the five live points are in the table', (live.json || []).length === 5, live.json?.map?.(o => o.id));

  const anonWrite = await api('/rest/v1/delivery_origins', {
    key: ANON, method: 'POST', prefer: 'return=representation',
    body: { id: 'zzhacker', name: 'Hacker', lat: -1.3, lng: 36.8 },
  });
  const hackerGone = await api('/rest/v1/delivery_origins?id=eq.zzhacker&select=id');
  check('a stranger cannot add a pickup point', (hackerGone.json || []).length === 0, { status: anonWrite.status, body: anonWrite.text.slice(0, 120) });

  const r = await api('/rest/v1/riders', {
    method: 'POST', prefer: 'return=representation',
    body: { name: 'Zz Test Origins Rider', phone: '0700 000 000', active: true, is_default: false, access_token: 'test' + hex(12) },
  });
  riderId = r.json?.[0]?.id;
  check('temp rider created', !!riderId, r.text);
  await api('/rest/v1/riders?is_default=eq.true', { method: 'PATCH', body: { is_default: false } });
  await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'PATCH', body: { is_default: true } });

  // 1. A point added the way the dashboard adds one.
  const added = await api('/rest/v1/delivery_origins', {
    method: 'POST', prefer: 'return=representation',
    body: { id: TEST_POINT.id, name: 'Zz Test Area', detail: 'Test', admin_detail: 'Zz Test Depot', lat: TEST_POINT.lat, lng: TEST_POINT.lng, sort_order: 999 },
  });
  check('a new pickup point can be added', added.status < 300, added.text);

  // 2. It must work for a booking immediately — no deploy, no migration.
  const res = await book(TEST_POINT.id);
  const expected = Math.max(Math.ceil((straightKm(TEST_POINT, DROP) * rate) / 10) * 10, min);
  check(`a booking from it works at once and prices from ITS pin (KES ${expected})`,
    res.json?.ok === true && res.json?.deliveryFeeKES === expected,
    { fee: res.json?.deliveryFeeKES, expected, error: res.json?.error });

  // 3. Retiring it stops it being accepted, without touching old deliveries.
  await api(`/rest/v1/delivery_origins?id=eq.${TEST_POINT.id}`, { method: 'PATCH', body: { active: false } });
  const afterRetire = await book(TEST_POINT.id);
  check('once retired, a booking from it is refused', afterRetire.json?.ok === false, afterRetire.json);

  const oldJob = await api(`/rest/v1/deliveries?reference=eq.ZZ-ORIGINS&select=origin_id&limit=1`);
  const stillThere = await api('/rest/v1/deliveries?customer_name=eq.ZZ%20ORIGINS%20TABLE%20TEST&select=origin_id');
  check('the delivery booked from it still names where it came from',
    (stillThere.json || []).some(d => d.origin_id === TEST_POINT.id), { stillThere: stillThere.json, oldJob: oldJob.status });

  // 4. And the real points still price from their own pins.
  for (const o of (live.json || [])) {
    const b = await book(o.id);
    const want = Math.max(Math.ceil((straightKm({ lat: Number(o.lat), lng: Number(o.lng) }, DROP) * rate) / 10) * 10, min);
    check(`${o.id}: still prices from its own pin (KES ${want})`, b.json?.deliveryFeeKES === want, { fee: b.json?.deliveryFeeKES, want });
  }
} finally {
  await api('/rest/v1/deliveries?customer_name=eq.ZZ%20ORIGINS%20TABLE%20TEST', { method: 'DELETE' });
  await api(`/rest/v1/delivery_origins?id=eq.${TEST_POINT.id}`, { method: 'DELETE' });
  await api('/rest/v1/delivery_origins?id=eq.zzhacker', { method: 'DELETE' });
  if (riderId) {
    await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'PATCH', body: { is_default: false } });
    await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'DELETE' });
  }
  const kibe = await api('/rest/v1/riders?name=eq.Kibe&select=id');
  if (kibe.json?.[0]?.id) await api(`/rest/v1/riders?id=eq.${kibe.json[0].id}`, { method: 'PATCH', body: { is_default: true } });

  const pointsNow = await api('/rest/v1/delivery_origins?select=id,active&order=sort_order');
  const leftD = await api('/rest/v1/deliveries?customer_name=eq.ZZ%20ORIGINS%20TABLE%20TEST&select=id');
  const ridersNow = await api('/rest/v1/riders?select=name,is_default');
  check('test rows gone', (leftD.json || []).length === 0, leftD.json);
  check('the five real points are back exactly as they were, all active',
    (pointsNow.json || []).length === 5 && (pointsNow.json || []).every(o => o.active), pointsNow.json);
  check('Kibe is the default rider again, alone', (ridersNow.json || []).length === 1
    && ridersNow.json[0].name === 'Kibe' && ridersNow.json[0].is_default === true, ridersNow.json);
}

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
