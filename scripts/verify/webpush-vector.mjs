// Assert our Web Push encryption against the published RFC 8291 section 5
// test vector. If this passes, the payload encryption is correct — not
// "probably correct". The whole notification feature rests on it.
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;

const mod = await import('./notify-rider.built.mjs');
const { encryptPayload, b64uDecode, b64uEncode, vapidHeader } = mod;

// ---- RFC 8291 §5 ----------------------------------------------------
const plaintext = 'When I grow up, I want to be a watermelon';
const uaPublic = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
const authSecret = 'BTBZMqHH6r4Tts7J_aSIgg';
const asPublic = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const asPrivate = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
const salt = 'DGv6ra1nlYgDCS1FRnbzlw';

const expected =
  'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml' +
  'mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT' +
  'pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';

const out = await encryptPayload(
  plaintext,
  b64uDecode(uaPublic),
  b64uDecode(authSecret),
  { salt: b64uDecode(salt), serverPublic: b64uDecode(asPublic), serverPrivateD: b64uDecode(asPrivate) },
);
const got = b64uEncode(out);

const results = [];
const check = (l, c) => results.push([l, c]);

check('RFC 8291 §5 vector reproduced byte for byte', got === expected);
if (got !== expected) {
  console.log('  expected:', expected);
  console.log('  got     :', got);
}

// ---- structural checks on a real random-salt message ----------------
const live = await encryptPayload('hello', b64uDecode(uaPublic), b64uDecode(authSecret));
check('header carries a 65-byte key id', live[20] === 65);
check('record size field is 4096', new DataView(live.buffer, live.byteOffset).getUint32(16, false) === 4096);
check('body = 16 salt + 4 rs + 1 idlen + 65 key + ct(6+16 tag)', live.length === 16 + 4 + 1 + 65 + 5 + 1 + 16);
const a = b64uEncode(await encryptPayload('hello', b64uDecode(uaPublic), b64uDecode(authSecret)));
const b = b64uEncode(await encryptPayload('hello', b64uDecode(uaPublic), b64uDecode(authSecret)));
check('salt is fresh per message (same text encrypts differently)', a !== b);

// ---- VAPID JWT ------------------------------------------------------
// Must be OUR key: vapidHeader pairs the given d with VAPID_PUBLIC_KEY's x/y,
// so a mismatched private key is rejected as invalid keyData — which is the
// behaviour we want, and is what caught this test's first draft.
const priv = (await import('node:fs')).readFileSync('C:/Users/ADMIN/Downloads/copy-of-legitgrinder (2)/.env.local', 'utf8')
  .match(/VAPID_PRIVATE_KEY=(.+)/)[1].trim();
let hdr = null;
try {
  hdr = await vapidHeader('https://fcm.googleapis.com', priv);
} catch (e) {
  check('vapidHeader threw: ' + e.message, false);
}
if (hdr) {
  check('header is a vapid t=..., k=... pair', /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]{87}$/.test(hdr));
  const jwt = hdr.slice(8).split(', ')[0];
  const [h, c, s] = jwt.split('.');
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  check('alg is ES256', JSON.parse(Buffer.from(h, 'base64url').toString()).alg === 'ES256');
  check('aud is the push service origin', claims.aud === 'https://fcm.googleapis.com');
  check('sub is a mailto', /^mailto:/.test(claims.sub));
  const hours = (claims.exp - Math.floor(Date.now() / 1000)) / 3600;
  check('exp within the 24h VAPID limit', hours > 0 && hours <= 24);
  check('signature is raw r||s, 64 bytes (not DER)', Buffer.from(s, 'base64url').length === 64);
}

let pass = 0;
for (const [l, ok] of results) { console.log((ok ? 'PASS  ' : 'FAIL  ') + l); if (ok) pass++; }
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
