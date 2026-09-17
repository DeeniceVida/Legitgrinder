// Create (node payment-fixture.mjs up) or remove (… down) a temporary rider +
// doorstep delivery for looking at the payment UI. Nothing touches real riders.
import fs from 'node:fs';
const env = fs.readFileSync('C:/Users/ADMIN/Downloads/copy-of-legitgrinder (2)/.env.local', 'utf8');
const val = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1].trim();
const URL_ = val('VITE_SUPABASE_URL'), SERVICE = val('SUPABASE_SERVICE_ROLE_KEY');
const api = async (path, method = 'GET', body) => {
  const r = await fetch(URL_ + path, { method, headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json', Prefer: 'return=representation' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return r.json().catch(() => null);
};
if (process.argv[2] === 'down') {
  await api('/rest/v1/deliveries?customer_name=eq.ZZ%20PAYMENT%20TEST', 'DELETE');
  await api('/rest/v1/riders?name=eq.Zz%20Test%20Payment%20Rider', 'DELETE');
  const a = await api('/rest/v1/riders?name=eq.Zz%20Test%20Payment%20Rider&select=id');
  const b = await api('/rest/v1/deliveries?customer_name=eq.ZZ%20PAYMENT%20TEST&select=id');
  console.log('left behind:', a.length, b.length);
} else {
  const token = 'test' + [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join('');
  const [r] = await api('/rest/v1/riders', 'POST', { name: 'Zz Test Payment Rider', phone: '0700 000 000', active: true, is_default: false, access_token: token });
  const [d] = await api('/rest/v1/deliveries', 'POST', { rider_id: r.id, customer_name: 'ZZ PAYMENT TEST', item_description: 'Test monitor', origin_id: 'cbd', delivery_type: 'doorstep', drop_label: 'Kilimani', distance_km: 6.2, delivery_fee_kes: 310, source: 'admin' });
  console.log(JSON.stringify({ rider: token, customer: d.customer_token }));
}
