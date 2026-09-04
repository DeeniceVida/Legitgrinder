// Cloudflare Pages Function — a per-rider web app manifest.
//
// A rider's page is /rider/<token>. A single static manifest can only carry one
// start_url, so installing from that page would give them an app that opens the
// SHOP — and a rider who has to navigate back to their own link every time will
// stop using it inside a week.
//
// This returns a manifest whose start_url is that rider's own page, with a
// distinct `id` so the phone treats "LegitGrinder Rider" as its own installed
// app rather than a second copy of the shop.
//
// GET /api/rider-manifest?token=<rider access token>
//
// No authentication: a manifest is fetched by the browser before any app code
// runs, and it discloses nothing the holder of the link does not already have.
// The token is not validated here either — an invalid one yields an app that
// opens to the rider page's own "this link is no longer active" screen, which
// is the correct outcome and avoids a DB round trip on every install.

interface Env { }

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const token = (url.searchParams.get('token') || '').trim();

    // Only ever build a path out of characters that can appear in a token.
    // Without this, a crafted "token" could point start_url anywhere on the
    // site — a phishing surface handed out under our own app name.
    const safe = /^[A-Za-z0-9_-]{8,128}$/.test(token) ? token : '';
    const start = safe ? `/rider/${safe}` : '/';

    const manifest = {
        // Distinct per rider: two riders sharing a phone get two apps, and
        // neither collides with the shop app installed from the storefront.
        id: safe ? `/rider/${safe}` : '/rider',
        name: 'LegitGrinder Rider',
        short_name: 'LG Rider',
        description: 'Your deliveries, pickups and receipts.',
        start_url: start,
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0f1a1c',
        theme_color: '#0f1a1c',
        icons: [
            { src: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
        ],
    };

    return new Response(JSON.stringify(manifest, null, 2), {
        status: 200,
        headers: {
            'Content-Type': 'application/manifest+json',
            // Short cache: the token is in the URL, so a cached copy is only
            // ever reused by the same rider on the same device.
            'Cache-Control': 'public, max-age=300',
        },
    });
};
