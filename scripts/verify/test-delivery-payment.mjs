// Verify add_delivery_payment.sql against the LIVE database.
//
// Uses a temporary rider with no PIN and one test delivery, both inserted with
// the service role and deleted at the end. Kibe is only ever touched through
// refusal paths: his PIN gate must refuse a payment confirmation with no PIN.
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
const RIDER_TOKEN = 'test' + hex(12);
const MSG = 'TESTABC123 Confirmed. Ksh300.00 sent to TEST RIDER 0700000000 on 17/9/26.';

let riderId, deliveryId, customerToken;
try {
  const r = await api('/rest/v1/riders', {
    method: 'POST', prefer: 'return=representation',
    body: { name: 'Zz Test Payment Rider', phone: '0700 000 000', active: true, is_default: false, access_token: RIDER_TOKEN },
  });
  riderId = r.json?.[0]?.id;
  check('temp rider created', !!riderId, r.text);

  const d = await api('/rest/v1/deliveries', {
    method: 'POST', prefer: 'return=representation',
    body: { rider_id: riderId, customer_name: 'ZZ PAYMENT TEST', origin_id: 'cbd', delivery_type: 'parcel',
            courier_name: 'Test Courier', delivery_fee_kes: 300, source: 'admin', notes: 'automated payment test' },
  });
  deliveryId = d.json?.[0]?.id; customerToken = d.json?.[0]?.customer_token;
  check('test delivery created, starts unpaid', !!deliveryId && d.json?.[0]?.payment_status === 'unpaid', d.text);

  let s = await rpc('delivery_status', { p_token: customerToken });
  check('customer sees unpaid + rider number', s.json?.paymentStatus === 'unpaid' && s.json?.riderPayPhone === '0700 000 000', s.json);

  let x = await rpc('customer_report_payment', { p_token: customerToken, p_message: 'paid' });
  check('too-short message refused', x.json?.ok === false, x.json);
  x = await rpc('customer_report_payment', { p_token: 'bogus-token-123456', p_message: MSG });
  check('bogus customer link refused', x.json?.ok === false, x.json);
  x = await rpc('customer_report_payment', { p_token: customerToken, p_message: MSG });
  check('customer pastes M-Pesa message', x.json?.ok === true, x.json);

  s = await rpc('delivery_status', { p_token: customerToken });
  check('customer sees "reported" + their message, still has number', s.json?.paymentStatus === 'reported' && s.json?.paymentMessage === MSG && !!s.json?.riderPayPhone, s.json);

  const j = await rpc('rider_jobs', { p_token: RIDER_TOKEN, p_pin: null });
  const job = j.json?.jobs?.find(q => q.id === deliveryId);
  check('rider sees the pasted message', job?.payment_status === 'reported' && job?.payment_message === MSG, j.json);

  x = await rpc('rider_confirm_payment', { p_token: RIDER_TOKEN, p_pin: null, p_delivery_id: deliveryId, p_method: 'bitcoin' });
  check('unknown method refused', x.json?.ok === false, x.json);
  x = await rpc('rider_confirm_payment', { p_token: 'bogus-rider-123456', p_pin: null, p_delivery_id: deliveryId, p_method: 'mpesa' });
  check('bogus rider link refused', x.json?.ok === false, x.json);

  // Kibe (the default rider) has a PIN: no PIN must be refused before anything else.
  const kibe = await api('/rest/v1/riders?is_default=eq.true&select=access_token,pin_hash,phone,name');
  const k = kibe.json?.[0];
  if (k?.pin_hash) {
    x = await rpc('rider_confirm_payment', { p_token: k.access_token, p_pin: null, p_delivery_id: deliveryId, p_method: 'mpesa' });
    check("default rider's PIN gate refuses no PIN", x.json?.ok === false && x.json?.needsPin === true, x.json);
    x = await rpc('rider_confirm_payment', { p_token: k.access_token, p_pin: '00000000', p_delivery_id: deliveryId, p_method: 'mpesa' });
    check("default rider's PIN gate refuses a wrong PIN", x.json?.ok === false && x.json?.needsPin === true, x.json);
  }
  console.log(`   default rider: ${k?.name} · phone on file: "${k?.phone}" · PIN set: ${!!k?.pin_hash}`);

  x = await rpc('rider_confirm_payment', { p_token: RIDER_TOKEN, p_pin: null, p_delivery_id: deliveryId, p_method: 'mpesa' });
  check('rider confirms M-Pesa', x.json?.ok === true, x.json);
  s = await rpc('delivery_status', { p_token: customerToken });
  check('customer sees paid, number gone', s.json?.paymentStatus === 'paid' && s.json?.paymentMethod === 'mpesa' && s.json?.riderPayPhone == null, s.json);

  x = await rpc('customer_report_payment', { p_token: customerToken, p_message: 'overwrite attempt after paid' });
  check('customer cannot overwrite once paid', x.json?.ok === false, x.json);

  x = await rpc('rider_confirm_payment', { p_token: RIDER_TOKEN, p_pin: null, p_delivery_id: deliveryId, p_method: 'undo' });
  s = await rpc('delivery_status', { p_token: customerToken });
  check('undo goes back to "reported", message kept', x.json?.ok === true && s.json?.paymentStatus === 'reported' && s.json?.paymentMessage === MSG, s.json);

  x = await rpc('rider_confirm_payment', { p_token: RIDER_TOKEN, p_pin: null, p_delivery_id: deliveryId, p_method: 'cash' });
  const row = await api(`/rest/v1/deliveries?id=eq.${deliveryId}&select=payment_status,payment_method,payment_confirmed_at`);
  check('cash marks paid with a timestamp', x.json?.ok === true && row.json?.[0]?.payment_status === 'paid' && row.json?.[0]?.payment_method === 'cash' && !!row.json?.[0]?.payment_confirmed_at, row.json);
} finally {
  if (deliveryId) await api(`/rest/v1/deliveries?id=eq.${deliveryId}`, { method: 'DELETE' });
  if (riderId) await api(`/rest/v1/riders?id=eq.${riderId}`, { method: 'DELETE' });
  const left = await api(`/rest/v1/riders?name=eq.Zz%20Test%20Payment%20Rider&select=id`);
  const leftD = await api(`/rest/v1/deliveries?customer_name=eq.ZZ%20PAYMENT%20TEST&select=id`);
  check('test rows cleaned up', (left.json || []).length === 0 && (leftD.json || []).length === 0, [left.json, leftD.json]);
}

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
