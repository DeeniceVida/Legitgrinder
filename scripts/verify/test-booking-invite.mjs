// Verify add_booking_invite_link.sql against the LIVE database.
//
// The whole point of the invite code is that it opens booking for ONE person
// while bookings stay shut to the public, so both halves have to be proven:
// a stranger is still refused, and the invited client gets through.
//
// Runs as the public (anon key), because that is who these rules are about.
// It opens a test day far in the future and deletes everything afterwards.
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
const check = (l, c, got) => { results.push([l, c]); if (!c && got !== undefined) console.log('      got:', JSON.stringify(got).slice(0, 220)); };

const nairobiToday = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const DAY = addDays(nairobiToday, 45);
const SLOT = '10:00-11:30';
const book = (invite, name = 'ZZ Invite Test') => rpc('create_consultation_booking', {
  p_name: name, p_phone: '0700000000', p_email: 'zz@example.com',
  p_products: 'Monitors', p_quantity: '5', p_budget: 'KES 300k',
  p_date: DAY, p_slot: SLOT, p_invite: invite,
});

try {
  const s = (await api('/rest/v1/booking_settings?id=eq.1&select=invite_code,consultations_enabled')).json?.[0];
  check('there is an invite code', (s?.invite_code || '').length >= 8, s?.invite_code?.length);
  check('bookings are still OFF to the public', s?.consultations_enabled === false, s?.consultations_enabled);
  const CODE = s.invite_code;

  // A day to book into. Service role stands in for the owner's calendar.
  await api('/rest/v1/consultation_days', {
    method: 'POST', prefer: 'return=representation',
    body: { day: DAY, slots: [SLOT, '12:00-13:30'] },
  });

  // 1. The public, with no code at all.
  const stranger = await book(null);
  check('a stranger with no code is refused', stranger.json?.ok === false
    && /not open for booking/i.test(stranger.json?.error || ''), stranger.json);

  // 2. A wrong code, and a near-miss.
  const wrong = await book('NOTTHECODE');
  check('a wrong code is refused', wrong.json?.ok === false, wrong.json);
  const nearly = await book(CODE.slice(0, -1) + (CODE.endsWith('A') ? 'B' : 'A'));
  check('one character off is refused', nearly.json?.ok === false, nearly.json);

  // 3. The empty-code trap: an empty setting must never match an empty link.
  const blank = await book('');
  check('an empty code is refused', blank.json?.ok === false, blank.json);

  // 4. The invited client.
  const invited = await book(CODE);
  check('the invited client CAN book', invited.json?.ok === true, invited.json);
  check('and is quoted the 4,050 fee', invited.json?.amountKes === 4050, invited.json?.amountKes);

  // 5. Case should not decide whether a client can meet him.
  await api(`/rest/v1/consultation_bookings?reference=eq.${invited.json.reference}`, { method: 'DELETE' });
  const lower = await book(CODE.toLowerCase());
  check('the code is not case-sensitive', lower.json?.ok === true, lower.json);

  // 6. The protections that were nearly lost when I retyped the function.
  await api('/rest/v1/consultation_bookings?client_name=eq.ZZ%20INVITE%20TEST', { method: 'DELETE' });
  await api(`/rest/v1/consultation_bookings?reference=eq.${lower.json.reference}`, { method: 'DELETE' });
  const badEmail = await rpc('create_consultation_booking', {
    p_name: 'ZZ Invite Test', p_phone: '0700000000', p_email: 'not-an-email',
    p_products: 'Monitors', p_quantity: '5', p_budget: 'KES 300k',
    p_date: DAY, p_slot: SLOT, p_invite: CODE,
  });
  check('a bad email is still refused', badEmail.json?.ok === false && /email/i.test(badEmail.json?.error || ''), badEmail.json);

  const tooFar = await rpc('create_consultation_booking', {
    p_name: 'ZZ Invite Test', p_phone: '0700000000', p_email: 'zz@example.com',
    p_products: 'Monitors', p_quantity: '5', p_budget: 'KES 300k',
    p_date: addDays(nairobiToday, 200), p_slot: SLOT, p_invite: CODE,
  });
  check('a date 200 days out is still refused', tooFar.json?.ok === false, tooFar.json);

  const noAnswers = await rpc('create_consultation_booking', {
    p_name: 'ZZ Invite Test', p_phone: '0700000000', p_email: 'zz@example.com',
    p_products: '', p_quantity: '', p_budget: '',
    p_date: DAY, p_slot: SLOT, p_invite: CODE,
  });
  check('unanswered questions are still refused', noAnswers.json?.ok === false, noAnswers.json);
} finally {
  await api('/rest/v1/consultation_bookings?client_name=eq.ZZ%20INVITE%20TEST', { method: 'DELETE' });
  await api(`/rest/v1/consultation_days?day=eq.${DAY}`, { method: 'DELETE' });
  const left = await api(`/rest/v1/consultation_bookings?client_name=eq.ZZ%20INVITE%20TEST&select=id`);
  const days = await api(`/rest/v1/consultation_days?day=eq.${DAY}&select=day`);
  const s2 = (await api('/rest/v1/booking_settings?id=eq.1&select=consultations_enabled')).json?.[0];
  check('test bookings gone', (left.json || []).length === 0, left.json);
  check('test day gone', (days.json || []).length === 0, days.json);
  check('bookings are STILL off — the test changed no switch', s2?.consultations_enabled === false, s2);
}

for (const [l, c] of results) console.log(c ? ' PASS' : ' FAIL', l);
const failed = results.filter(r => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
