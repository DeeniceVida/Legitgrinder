// Cloudflare Pages Function — send a Web Push notification to a rider's phone.
//
// This is what makes the installed app worth installing. Without it the rider
// has to remember to open a link; with it their phone buzzes when a package is
// assigned to them, app closed or not.
//
// Everything here is hand-rolled because the web-push npm package assumes Node
// crypto and does not run on Workers. Two specs are implemented:
//
//   RFC 8291 — Message Encryption for Web Push (the aes128gcm payload)
//   RFC 8292 — VAPID (the signed JWT that proves the sender is us)
//
// The encryption is verified against the published RFC 8291 §5 test vector, so
// this is not "looks right" code. See scratchpad/webpush-vector.mjs.
//
// POST /api/notify-rider
//   Authorization: Bearer <supabase access token of an admin>
//   { subscriptions: [{endpoint, p256dh, auth}], title, body, url?, tag? }
// -> { success, sent, failed, expired: string[] }
//
// `expired` lists endpoints the push service has retired (404/410). The caller
// deletes those rows; otherwise the table fills with phones that reinstalled.

interface Env {
    VAPID_PRIVATE_KEY: string;
}

// Both of these are public by design — the anon key is a *publishable* key and
// already ships inside the client bundle. Hardcoding them here keeps the number
// of Cloudflare env vars the owner has to set correctly down to one.
const SUPABASE_URL = 'https://okfrcfgcnjkindwbquic.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_g_SRjmEZGw7RHs4Kz24eZQ_qXebmnZ0';

const VAPID_PUBLIC_KEY = 'BEp4EM-2WbhM0vhjic3giif6dvuoIAfjvEumd9OBBV4zIeM_5NB_vEoodUCrlWyaKPJO_uwDx3NE9mgYM9HFd4s';
const VAPID_SUBJECT = 'mailto:orders@legitgrinder.com';

/* ------------------------------------------------------------------ *
 * byte helpers
 * ------------------------------------------------------------------ */

export const b64uDecode = (s: string): Uint8Array => {
    const pad = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(pad + '==='.slice((pad.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
};

export const b64uEncode = (b: Uint8Array): string => {
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const concat = (...parts: Uint8Array[]): Uint8Array => {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
};

const utf8 = (s: string) => new TextEncoder().encode(s);

/* ------------------------------------------------------------------ *
 * HKDF (RFC 5869), done by hand so each step matches the spec text
 * ------------------------------------------------------------------ */

const hmac = async (key: Uint8Array, data: Uint8Array): Promise<Uint8Array> => {
    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
};

/** Extract-then-expand. `length` is always <= 32 here, so one round suffices. */
const hkdf = async (salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) => {
    const prk = await hmac(salt, ikm);
    const okm = await hmac(prk, concat(info, new Uint8Array([1])));
    return okm.slice(0, length);
};

/* ------------------------------------------------------------------ *
 * RFC 8291 — encrypt a payload for one subscription
 * ------------------------------------------------------------------ */

export interface EncryptOverrides {
    /** Fixed salt + server keypair, for asserting against the RFC test vector. */
    salt?: Uint8Array;
    serverPublic?: Uint8Array;
    serverPrivateD?: Uint8Array;
}

export const encryptPayload = async (
    payload: string,
    uaPublicRaw: Uint8Array,   // the subscription's p256dh, 65 raw bytes
    authSecret: Uint8Array,    // the subscription's auth, 16 bytes
    over: EncryptOverrides = {},
): Promise<Uint8Array> => {
    // 1. An ephemeral server keypair, fresh per message (unless pinned by a test).
    let serverPublic: Uint8Array;
    let ecdhSecret: Uint8Array;

    const uaKey = await crypto.subtle.importKey(
        'raw', uaPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
    );

    if (over.serverPublic && over.serverPrivateD) {
        serverPublic = over.serverPublic;
        const priv = await crypto.subtle.importKey(
            'jwk',
            {
                kty: 'EC', crv: 'P-256', ext: true,
                d: b64uEncode(over.serverPrivateD),
                x: b64uEncode(over.serverPublic.slice(1, 33)),
                y: b64uEncode(over.serverPublic.slice(33, 65)),
            },
            { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'],
        );
        ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, priv, 256));
    } else {
        const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        serverPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
        ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, pair.privateKey, 256));
    }

    // 2. Mix the shared secret with the subscription's auth secret. The info
    //    string binds the result to *this* pair of keys, so a captured message
    //    cannot be replayed at a different subscription.
    const ikm = await hkdf(
        authSecret,
        ecdhSecret,
        concat(utf8('WebPush: info\0'), uaPublicRaw, serverPublic),
        32,
    );

    // 3. RFC 8188 content encoding: derive the content key and nonce.
    const salt = over.salt || crypto.getRandomValues(new Uint8Array(16));
    const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

    // 4. A single record, so the padding delimiter is 0x02 ("last record").
    const plaintext = concat(utf8(payload), new Uint8Array([2]));
    const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext),
    );

    // 5. Header: salt(16) | record size(4, BE) | key id length(1) | key id(65)
    const rs = new Uint8Array(4);
    new DataView(rs.buffer).setUint32(0, 4096, false);
    return concat(salt, rs, new Uint8Array([serverPublic.length]), serverPublic, ciphertext);
};

/* ------------------------------------------------------------------ *
 * RFC 8292 — the VAPID Authorization header
 * ------------------------------------------------------------------ */

export const vapidHeader = async (audience: string, privateD: string): Promise<string> => {
    const header = b64uEncode(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const claims = b64uEncode(utf8(JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: VAPID_SUBJECT,
    })));
    const signingInput = utf8(`${header}.${claims}`);

    const pub = b64uDecode(VAPID_PUBLIC_KEY);
    const key = await crypto.subtle.importKey(
        'jwk',
        {
            kty: 'EC', crv: 'P-256', ext: true, d: privateD,
            x: b64uEncode(pub.slice(1, 33)),
            y: b64uEncode(pub.slice(33, 65)),
        },
        { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
    );
    // Web Crypto already returns the raw r||s form JOSE wants — no DER unwrap.
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signingInput));
    return `vapid t=${header}.${claims}.${b64uEncode(sig)}, k=${VAPID_PUBLIC_KEY}`;
};

/* ------------------------------------------------------------------ *
 * send
 * ------------------------------------------------------------------ */

export interface PushSub { endpoint: string; p256dh: string; auth: string; }

export const sendOne = async (
    sub: PushSub,
    payload: string,
    privateD: string,
): Promise<{ ok: boolean; status: number; expired: boolean }> => {
    const audience = new URL(sub.endpoint).origin;
    const body = await encryptPayload(payload, b64uDecode(sub.p256dh), b64uDecode(sub.auth));
    const auth = await vapidHeader(audience, privateD);

    const res = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
            Authorization: auth,
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
            TTL: '86400',          // hold it for a day if the phone is off
            Urgency: 'high',       // a job going out is not a digest item
        },
        body,
    });
    // 404/410 mean the browser threw the subscription away — uninstalled the
    // app, cleared data, or reinstalled. The row is dead; say so.
    return { ok: res.ok, status: res.status, expired: res.status === 404 || res.status === 410 };
};

/* ------------------------------------------------------------------ *
 * handler
 * ------------------------------------------------------------------ */

/** Only a signed-in admin may push. Otherwise this is an open relay. */
const isAdmin = async (jwt: string): Promise<boolean> => {
    try {
        const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` },
        });
        if (!me.ok) return false;
        const user = await me.json() as { id?: string };
        if (!user?.id) return false;

        const prof = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` } },
        );
        if (!prof.ok) return false;
        const rows = await prof.json() as Array<{ role?: string }>;
        return rows?.[0]?.role === 'admin';
    } catch {
        return false;
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const headers = { 'Content-Type': 'application/json' };
    try {
        const privateD = context.env.VAPID_PRIVATE_KEY;
        if (!privateD) {
            return new Response(
                JSON.stringify({ success: false, error: 'Push is not configured: VAPID_PRIVATE_KEY is not set on this deployment.' }),
                { status: 500, headers },
            );
        }

        const jwt = (context.request.headers.get('Authorization') || '').replace(/^Bearer /i, '').trim();
        if (!jwt || !(await isAdmin(jwt))) {
            return new Response(JSON.stringify({ success: false, error: 'Not authorised.' }), { status: 401, headers });
        }

        const b = await context.request.json() as {
            subscriptions?: PushSub[]; title?: string; body?: string; url?: string; tag?: string;
        };
        const subs = (b.subscriptions || []).filter(s => s?.endpoint && s?.p256dh && s?.auth);
        if (!subs.length) {
            return new Response(
                JSON.stringify({ success: false, error: 'That rider has not turned on alerts on any phone yet.' }),
                { status: 200, headers },
            );
        }

        const payload = JSON.stringify({
            title: b.title || 'New delivery',
            body: b.body || 'A package has been assigned to you.',
            url: b.url || '/',
            tag: b.tag || 'delivery',
        });

        const results = await Promise.all(subs.map(async s => {
            try { return { endpoint: s.endpoint, ...(await sendOne(s, payload, privateD)) }; }
            catch { return { endpoint: s.endpoint, ok: false, status: 0, expired: false }; }
        }));

        return new Response(JSON.stringify({
            success: results.some(r => r.ok),
            sent: results.filter(r => r.ok).length,
            failed: results.filter(r => !r.ok).length,
            expired: results.filter(r => r.expired).map(r => r.endpoint),
        }), { status: 200, headers });
    } catch (e: any) {
        return new Response(
            JSON.stringify({ success: false, error: e?.message || 'Could not send the alert.' }),
            { status: 500, headers },
        );
    }
};
