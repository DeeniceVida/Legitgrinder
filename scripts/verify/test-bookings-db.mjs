// Verify add_bookings.sql against the LIVE database — WITHOUT flipping either
// switch. Turning a switch on, even briefly, changes the live site for real
// visitors, so everything is tested through paths that work while off:
// the calendar table (service role), the public open-days feed, refusals,
// the calendar guard, and the token-gated confirmation. Every test row is
// deleted at the end.
import fs from 'node:fs';

const env = fs.readFileSync('C:/Users/ADMIN/Downloads/copy-of-legitgrinder (2)/.env.local', 'utf8');
const val = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1].trim();
const URL_ = val('VITE_SUPABASE_URL');
const SERVICE = val('SUPABASE_SERVICE_ROLE_KEY');
const ANON = val('VITE_SUPABASE_ANON_KEY');
const TOKEN = val('BOOKING_SERVER_TOKEN');

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

// Two test days comfortably past the cut-off, well in the future.
const nairobiToday = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const DAY = addDays(nairobiToday, 40);
const DAY2 = addDays(nairobiToday, 41);
const FOUR = ['10:00-11:30', '12:00-13:30', '14:00-15:30', '16:00-17:30'];
const REF_A = 'LGC-TESTAAAAAAAA', REF_B = 'LGC-TESTBBBBBBBB';

const openOn = async (day) => {
  const r = await rpc('consultation_open_days', { p_from: day, p_to: day });
  return Array.isArray(r.json) ? r.json.filter(x => x.open_day === day).map(x => x.open_slot) : r;
};

try {
  /* ---- settings ------------------------------------------------------- */
  const s = (await api('/rest/v1/booking_settings?select=*', { key: ANON })).json?.[0];
  check('settings readable by the public site', !!s, s);
  check('consultations switched OFF', s?.consultations_enabled === false, s?.consultations_enabled);
  check('pickups switched OFF', s?.pickups_enabled === false, s?.pickups_enabled);
  check('fee 4,000, credit 7 days', s?.consultation_fee_kes === 4000 && s?.consultation_credit_days === 7);
  check('default meeting pattern 10:00-18:00, 90 + 30',
    s?.day_start === '10:00' && s?.day_end === '18:00' && s?.meeting_minutes === 90 && s?.break_minutes === 30, s);

  await api('/rest/v1/booking_settings?id=eq.1', { key: ANON, method: 'PATCH', body: { consultations_enabled: true } });
  const stillOff = (await api('/rest/v1/booking_settings?select=consultations_enabled')).json?.[0]?.consultations_enabled;
  check('the public CANNOT switch consultations on', stillOff === false, stillOff);

  /* ---- private tables are private ------------------------------------- */
  for (const t of ['consultation_days', 'consultation_bookings', 'pickup_bookings', 'booking_server_secret']) {
    const r = await api(`/rest/v1/${t}?select=*`, { key: ANON });
    check(`public cannot read ${t} directly`, r.status === 401 || r.status === 403 || (Array.isArray(r.json) && r.json.length === 0), r.status);
  }
  const anonOpen = await api('/rest/v1/consultation_days', { key: ANON, method: 'POST', body: { day: DAY, slots: FOUR } });
  check('the public CANNOT open a day on the calendar', anonOpen.status >= 400, anonOpen.status);

  /* ---- the calendar: open a day ---------------------------------------- */
  const opened = await api('/rest/v1/consultation_days', { method: 'POST', prefer: 'return=representation',
    body: { day: DAY, slots: ['16:00-17:30', '10:00-11:30', '14:00-15:30', '12:00-13:30'] } });
  check('a day opens with four meetings', opened.status === 201, opened.text);
  check('meetings are stored in time order whatever order they were saved in',
    JSON.stringify(opened.json?.[0]?.slots) === JSON.stringify(FOUR), opened.json?.[0]?.slots);

  /* ---- the calendar guard ---------------------------------------------- */
  const overlap = await api('/rest/v1/consultation_days', { method: 'POST', body: { day: DAY2, slots: ['10:00-11:30', '11:00-12:00'] } });
  check('overlapping meetings are refused by the database', overlap.status >= 400 && /overlap/i.test(overlap.text), overlap.text);
  const backwards = await api('/rest/v1/consultation_days', { method: 'POST', body: { day: DAY2, slots: ['12:00-11:00'] } });
  check('a meeting ending before it starts is refused', backwards.status >= 400, backwards.text);
  const garbage = await api('/rest/v1/consultation_days', { method: 'POST', body: { day: DAY2, slots: ['lunchtime'] } });
  check('a non-time is refused', garbage.status >= 400, garbage.text);

  /* ---- synchronized: the public sees exactly what was opened ----------- */
  check('the booking page sees all four meetings on that day', JSON.stringify(await openOn(DAY)) === JSON.stringify(FOUR), await openOn(DAY));
  check('a day never opened shows nothing', (await openOn(DAY2)).length === 0);

  /* ---- switched off: the public cannot book ---------------------------- */
  const cr = await rpc('create_consultation_booking', {
    p_name: 'Test', p_phone: '0700000000', p_email: 't@example.com',
    p_products: 'x', p_quantity: '1', p_budget: '1', p_date: DAY, p_slot: FOUR[0],
  });
  check('booking refused while switched off', cr.json?.ok === false && /not open/i.test(cr.json?.error || ''), cr.json);
  const pk = await rpc('book_pickup', { p_invoice_number: 'LG100019', p_name: null, p_phone: null, p_email: null, p_item: null, p_date: DAY, p_slot: 'x' });
  check('pickup refused while switched off', pk.json?.ok === false && /not open/i.test(pk.json?.error || ''), pk.json);

  /* ---- a booking fills its slot on both calendars ---------------------- */
  await api('/rest/v1/consultation_bookings', { method: 'POST', prefer: 'return=minimal', body: [
    { reference: REF_A, client_name: 'Test A', client_phone: '0700000001', client_email: 'a@example.com',
      products: 'Chairs', quantity: '50', budget: 'KES 500k', slot_date: DAY, slot_label: FOUR[0], amount_kes: 4000 },
    { reference: REF_B, client_name: 'Test B', client_phone: '0700000002', client_email: 'b@example.com',
      products: 'Monitors', quantity: '10', budget: 'KES 300k', slot_date: DAY, slot_label: FOUR[0], amount_kes: 4000 },
  ] });
  check('a payment in progress removes that time from the booking page',
    JSON.stringify(await openOn(DAY)) === JSON.stringify(FOUR.slice(1)), await openOn(DAY));
  const feed = await rpc('consultation_open_days', { p_from: DAY, p_to: DAY });
  check('the booking-page feed carries no names, phones or emails',
    Array.isArray(feed.json) && feed.json.every(r => Object.keys(r).sort().join(',') === 'open_day,open_slot'), feed.json?.[0]);

  /* ---- the token gate -------------------------------------------------- */
  const guess = await rpc('confirm_consultation_booking', { p_reference: REF_A, p_paid_kes: 4000, p_paystack_id: 'x', p_token: 'guess' });
  check('WRONG token cannot confirm a booking', guess.json?.ok === false && /not authorised/i.test(guess.json?.error || ''), guess.json);
  const under = await rpc('confirm_consultation_booking', { p_reference: REF_A, p_paid_kes: 1000, p_paystack_id: 'x', p_token: TOKEN });
  check('underpaid is refused', under.json?.ok === false && under.json?.underpaid === true, under.json);

  const ok = await rpc('confirm_consultation_booking', { p_reference: REF_A, p_paid_kes: 4000, p_paystack_id: 'ps_1', p_token: TOKEN });
  check('real token + full fee confirms', ok.json?.ok === true && ok.json?.status === 'confirmed', ok.json);
  check('credit expires 7 days after the meeting', ok.json?.creditExpires === addDays(DAY, 7), ok.json?.creditExpires);
  const again = await rpc('confirm_consultation_booking', { p_reference: REF_A, p_paid_kes: 4000, p_paystack_id: 'ps_1', p_token: TOKEN });
  check('confirming twice is harmless (Paystack retries)', again.json?.ok === true && again.json?.status === 'confirmed', again.json);

  const clash = await rpc('confirm_consultation_booking', { p_reference: REF_B, p_paid_kes: 4000, p_paystack_id: 'ps_2', p_token: TOKEN });
  check('second payer for the same time becomes a clash, not a double booking', clash.json?.status === 'paid_conflict', clash.json);
  const confirmedCount = (await api(`/rest/v1/consultation_bookings?slot_date=eq.${DAY}&slot_label=eq.${FOUR[0]}&status=eq.confirmed&select=id`)).json?.length;
  check('exactly ONE confirmed booking holds that time', confirmedCount === 1, confirmedCount);

  /* ---- a paid meeting cannot be pulled from under the client ----------- */
  const drop = await api(`/rest/v1/consultation_days?day=eq.${DAY}`, { method: 'PATCH', body: { slots: FOUR.slice(1) } });
  check('removing a PAID meeting time is refused', drop.status >= 400 && /paid meeting/i.test(drop.text), drop.text);
  const close = await api(`/rest/v1/consultation_days?day=eq.${DAY}`, { method: 'DELETE' });
  check('closing a day with a PAID meeting is refused', close.status >= 400 && /paid meeting/i.test(close.text), close.text);
  const trimFree = await api(`/rest/v1/consultation_days?day=eq.${DAY}`, { method: 'PATCH', prefer: 'return=representation', body: { slots: FOUR.slice(0, 3) } });
  check('removing a FREE time on the same day is allowed', trimFree.status === 200 && trimFree.json?.[0]?.slots?.length === 3, trimFree.text);

  /* ---- closed while paying: they paid, so it is flagged, not lost ------ */
  const REF_C = 'LGC-TESTCCCCCCCC';
  await api('/rest/v1/consultation_bookings', { method: 'POST', prefer: 'return=minimal', body: {
    reference: REF_C, client_name: 'Test C', client_phone: '0700000003', client_email: 'c@example.com',
    products: 'x', quantity: '1', budget: '1', slot_date: DAY, slot_label: '16:00-17:30', amount_kes: 4000 } });
  const gone = await rpc('confirm_consultation_booking', { p_reference: REF_C, p_paid_kes: 4000, p_paystack_id: 'ps_3', p_token: TOKEN });
  check('a payment for a time closed mid-payment is kept and flagged as a clash', gone.json?.status === 'paid_conflict', gone.json);

} finally {
  await api(`/rest/v1/consultation_bookings?reference=like.LGC-TEST*`, { method: 'DELETE' });
  await api(`/rest/v1/consultation_days?day=in.(${DAY},${DAY2})`, { method: 'DELETE' });
  const left = (await api(`/rest/v1/consultation_bookings?reference=like.LGC-TEST*&select=id`)).json;
  const days = (await api(`/rest/v1/consultation_days?day=in.(${DAY},${DAY2})&select=day`)).json;
  const sw = (await api('/rest/v1/booking_settings?select=consultations_enabled,pickups_enabled')).json?.[0];
  console.log('\ncleanup: test bookings left =', Array.isArray(left) ? left.length : left,
    '| test days left =', Array.isArray(days) ? days.length : days, '| switches =', JSON.stringify(sw));
}

let pass = 0;
console.log('');
for (const [l, ok] of results) { console.log((ok ? 'PASS  ' : 'FAIL  ') + l); if (ok) pass++; }
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
