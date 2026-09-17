// The payment gate. fetch is stubbed throughout: nothing reaches Paystack,
// Supabase or Resend, and no email is sent.
const mod = await import('./confirm-consultation.built.mjs');
const { onRequestPost, ownerEmail, clientEmail } = mod;

const results = [];
const check = (l, c, got) => { results.push([l, c]); if (!c) console.log('      got:', JSON.stringify(got)); };

const REF = 'LGC-ABCDEF123456';
let calls;

const setFetch = ({ paystack, rpc }) => {
  calls = { paystack: 0, rpc: 0, resend: [], rpcBody: null, paystackAuth: null };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.paystack.co')) {
      calls.paystack++; calls.paystackAuth = opts.headers?.Authorization;
      return { ok: true, status: 200, json: async () => paystack };
    }
    if (u.includes('/rpc/confirm_consultation_booking')) {
      calls.rpc++; calls.rpcBody = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => rpc };
    }
    if (u.includes('api.resend.com')) {
      calls.resend.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({ id: 'stub' }) };
    }
    throw new Error('unexpected fetch ' + u);
  };
};

const call = async (body, env = { PAYSTACK_SECRET_KEY: 'sk_test_x', BOOKING_SERVER_TOKEN: 'tok', RESEND_API_KEY: 're_x' }) => {
  const res = await onRequestPost({
    request: new Request('https://legitgrinder.com/api/confirm-consultation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    env,
  });
  return { status: res.status, json: await res.json() };
};

const goodTx = { status: true, data: { status: 'success', currency: 'KES', reference: REF, amount: 400000, id: 987 } };
const goodBooking = {
  ok: true, status: 'confirmed', alreadyDone: false, reference: REF,
  clientName: 'Jane Wanjiru', clientPhone: '0712345678', clientEmail: 'jane@example.com',
  products: 'Office chairs', quantity: '50', budget: 'KES 500,000',
  slotDate: '2026-12-10', slotLabel: '10:00-11:30',
  amountKes: 4000, paidKes: 4000, creditExpires: '2026-12-17', creditDays: 7,
  hubName: 'LegitGrinder Hub', hubAddress: 'Ngara Road', hubMapUrl: 'https://maps.app.goo.gl/x',
};

// ---- Keys not set yet: the state it ships in ----------------------------
setFetch({ paystack: goodTx, rpc: goodBooking });
let r = await call({ reference: REF }, { RESEND_API_KEY: 're_x' });
check('no keys → 503 not configured', r.status === 503 && r.json.notConfigured === true, r);
check('no keys → Paystack never called', calls.paystack === 0);
check('no keys → database never touched', calls.rpc === 0);
check('no keys → message tells a payer their money is safe', /payment is safe/i.test(r.json.error));

// ---- Bad reference -------------------------------------------------------
setFetch({ paystack: goodTx, rpc: goodBooking });
r = await call({ reference: '../../etc' });
check('malformed reference refused before any network call', r.status === 400 && calls.paystack === 0, r);

// ---- Paystack says it failed --------------------------------------------
setFetch({ paystack: { status: true, data: { ...goodTx.data, status: 'failed' } }, rpc: goodBooking });
r = await call({ reference: REF });
check('failed payment → not booked', r.status === 402 && r.json.ok === false, r);
check('failed payment → slot NOT locked', calls.rpc === 0);
check('Paystack asked with the secret key', calls.paystackAuth === 'Bearer sk_test_x', calls.paystackAuth);

// ---- Wrong currency ------------------------------------------------------
setFetch({ paystack: { status: true, data: { ...goodTx.data, currency: 'USD' } }, rpc: goodBooking });
r = await call({ reference: REF });
check('USD payment refused', r.status === 402 && calls.rpc === 0, r);

// ---- A payment for a different booking -----------------------------------
setFetch({ paystack: { status: true, data: { ...goodTx.data, reference: 'LGC-ZZZZZZZZZZZZ' } }, rpc: goodBooking });
r = await call({ reference: REF });
check('someone else\'s payment cannot confirm this booking', r.status === 402 && calls.rpc === 0, r);

// ---- Paystack has no record ---------------------------------------------
setFetch({ paystack: { status: false, message: 'Transaction reference not found' }, rpc: goodBooking });
r = await call({ reference: REF });
check('unknown transaction → not booked', r.status === 402 && calls.rpc === 0, r);

// ---- Success -------------------------------------------------------------
setFetch({ paystack: goodTx, rpc: goodBooking });
r = await call({ reference: 'lgc-abcdef123456' });
check('success → ok', r.status === 200 && r.json.ok === true, r);
check('reference is normalised to upper case', calls.rpcBody?.p_reference === REF, calls.rpcBody);
check('amount converted from kobo: 400000 → 4000', calls.rpcBody?.p_paid_kes === 4000, calls.rpcBody);
check('server token passed to the database', calls.rpcBody?.p_token === 'tok');
check('owner is emailed', calls.resend.some(e => e.to[0] === 'orders@legitgrinder.com'));
check('client is emailed their pass', calls.resend.some(e => e.to[0] === 'jane@example.com'));
check('exactly two emails', calls.resend.length === 2, calls.resend.length);
check('response carries no phone or email back to the browser',
  !('clientPhone' in r.json.booking) && !('clientEmail' in r.json.booking), Object.keys(r.json.booking));

// ---- Paystack retries: already confirmed ---------------------------------
setFetch({ paystack: goodTx, rpc: { ...goodBooking, alreadyDone: true } });
r = await call({ reference: REF });
check('repeat confirmation still ok', r.json.ok === true);
check('repeat confirmation sends NO emails', calls.resend.length === 0, calls.resend.length);

// ---- Two people paid for one slot ---------------------------------------
setFetch({ paystack: goodTx, rpc: { ...goodBooking, status: 'paid_conflict' } });
r = await call({ reference: REF });
check('clash → still ok (they did pay)', r.json.ok === true && r.json.booking.status === 'paid_conflict');
check('clash → owner alerted with SLOT CLASH', calls.resend.some(e => e.to[0] === 'orders@legitgrinder.com' && /SLOT CLASH/.test(e.subject)));
check('clash → client NOT sent a pass for a slot they did not get', !calls.resend.some(e => e.to[0] === 'jane@example.com'));

// ---- Underpaid: database refuses ----------------------------------------
setFetch({ paystack: { status: true, data: { ...goodTx.data, amount: 100000 } }, rpc: { ok: false, underpaid: true, error: 'The amount paid is less than the consultation fee.' } });
r = await call({ reference: REF });
check('underpaid → not ok', r.json.ok === false && /less than/.test(r.json.error), r);
check('underpaid → no emails', calls.resend.length === 0);

// ---- Email content -------------------------------------------------------
const nasty = { ...goodBooking, products: '<script>alert(1)</script>', clientName: '<img src=x onerror=1>' };
const oh = ownerEmail(nasty);
check('owner email escapes injected HTML', !oh.includes('<script>alert') && !oh.includes('<img src=x'));
check('owner email has their answers', ownerEmail(goodBooking).includes('Office chairs') && ownerEmail(goodBooking).includes('KES 500,000'));
check('owner email has a WhatsApp link in 254 form', ownerEmail(goodBooking).includes('wa.me/254712345678'));
const ce = clientEmail(goodBooking);
check('client pass has the date in words', ce.includes('Thursday 10 December'), ce.match(/See you [^<]+/)?.[0]);
check('client pass has the map button', ce.includes('https://maps.app.goo.gl/x'));
check('client pass states the credit and that it is not cash-refundable', /comes off your order/.test(ce) && /not refundable in cash/.test(ce));
check('client pass with no address yet says so honestly', clientEmail({ ...goodBooking, hubAddress: '', hubName: '' }).includes('We will send the exact location'));
check('client pass with no map link has no dead button', !clientEmail({ ...goodBooking, hubMapUrl: '' }).includes('Open the location'));

check('owner email shows the time in words, not the raw key', ownerEmail(goodBooking).includes('10:00 AM - 11:30 AM') && !ownerEmail(goodBooking).includes('10:00-11:30'));
check('client pass shows the time in words', clientEmail(goodBooking).includes('10:00 AM - 11:30 AM'));
check('fmtSlot afternoon', mod.fmtSlot('13:30-15:00') === '1:30 PM - 3:00 PM', mod.fmtSlot('13:30-15:00'));
check('fmtSlot passes non-keys through', mod.fmtSlot('whenever') === 'whenever');

let pass = 0;
console.log('');
for (const [l, ok] of results) { console.log((ok ? 'PASS  ' : 'FAIL  ') + l); if (ok) pass++; }
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
