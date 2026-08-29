// Cloudflare Pages Function — turn a shortened Google Maps link into coordinates.
//
// A customer sharing their location on WhatsApp sends a maps.app.goo.gl link.
// The browser can't follow it (CORS), so pasting one into the delivery form
// would fail on the single most common input. This follows the redirect
// server-side and reads the coordinates out of the real URL.
//
// POST /api/resolve-pin  { url }  ->  { success, lat, lng, placeName? }

interface Env { }

const ALLOWED = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i;

/** Same order as the client parser: place pin first, viewport centre last. */
const extract = (url: string): { lat: number; lng: number } | null => {
    const patterns = [
        /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
        /[?&]q=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
        /@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) {
            const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        }
    }
    return null;
};

const placeNameOf = (url: string): string | undefined => {
    const m = url.match(/\/maps\/place\/([^/@]+)/);
    if (!m) return undefined;
    try { return decodeURIComponent(m[1]).replace(/\+/g, ' '); } catch { return undefined; }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    try {
        const { url } = await context.request.json() as { url?: string };
        const raw = (url || '').trim();

        // Only ever follow Google Maps links. Without this the endpoint would
        // fetch any URL on request — an open proxy pointed at our own network.
        if (!ALLOWED.test(raw)) {
            return new Response(
                JSON.stringify({ success: false, error: 'That is not a Google Maps link.' }),
                { status: 400, headers: cors },
            );
        }

        const res = await fetch(raw, {
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegitGrinder/1.0)' },
        });

        // The resolved address usually carries the coordinates; if it doesn't,
        // the page body normally does.
        let found = extract(res.url);
        let name = placeNameOf(res.url);
        if (!found) {
            const body = (await res.text()).slice(0, 200_000);
            found = extract(body);
        }

        if (!found) {
            return new Response(
                JSON.stringify({ success: false, error: 'Could not read a location from that link.' }),
                { status: 200, headers: cors },
            );
        }

        return new Response(
            JSON.stringify({ success: true, lat: found.lat, lng: found.lng, placeName: name }),
            { status: 200, headers: cors },
        );
    } catch (e: any) {
        return new Response(
            JSON.stringify({ success: false, error: e?.message || 'Could not resolve that link.' }),
            { status: 500, headers: cors },
        );
    }
};
