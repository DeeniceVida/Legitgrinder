/*
 * LegitGrinder service worker.
 *
 * Two jobs, in order of importance:
 *   1. Receive push notifications so a rider's phone buzzes when a package is
 *      assigned — this is the whole reason the app is installable.
 *   2. Keep the app opening when the signal drops, which on a boda in Nairobi
 *      traffic is often.
 *
 * Deliberately conservative about caching. A service worker that caches HTML
 * aggressively will happily serve a build from three deploys ago and there is
 * no way for the user to tell. So:
 *   - navigations are NETWORK FIRST, cache only as an offline fallback
 *   - /assets/* is cache-first, but only because Vite content-hashes those
 *     filenames, so a changed file is a different URL and can never go stale
 *   - anything under /api/ is never touched
 *
 * Bump CACHE when changing this file; activate deletes every other cache.
 */

const CACHE = 'lg-v1';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
  // Take over straight away rather than waiting for every tab to close.
  // Without this a rider who leaves the app open never gets the new worker.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/favicon-192.png', '/favicon-512.png']))
      .catch(() => { /* first load offline — nothing to precache, carry on */ }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // Supabase, tiles, Paystack
  if (url.pathname.startsWith('/api/')) return;         // never cache live data

  // Content-hashed build output: safe to serve from cache forever.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  // Page loads: always try the network, so a deploy lands immediately.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(OFFLINE_URL, copy));
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL).then((hit) => hit || Response.error())),
    );
  }
});

/* ------------------------------------------------------------------ *
 * Push
 * ------------------------------------------------------------------ */

self.addEventListener('push', (event) => {
  // The payload is encrypted end-to-end (RFC 8291) and decrypted for us here.
  // If it is missing or malformed we must STILL show something: the browser
  // granted permission on the promise that every push is user-visible, and
  // silently swallowing one costs us the permission on some platforms.
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }

  const title = data.title || 'New delivery';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'A package has been assigned to you. Open the app for details.',
      icon: '/favicon-192.png',
      badge: '/favicon-96.png',
      tag: data.tag || 'delivery',
      renotify: true,
      // A rider is usually moving and not looking at the screen. The alert
      // should wait for them rather than disappear after a few seconds.
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Reuse an open window if the rider already has the app running,
      // otherwise the tap stacks up duplicate tabs over a shift.
      for (const client of list) {
        const path = new URL(client.url).pathname;
        if (path === target.split('?')[0] && 'focus' in client) return client.focus();
      }
      for (const client of list) {
        if ('navigate' in client && 'focus' in client) {
          return client.navigate(target).then((c) => (c || client).focus());
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

// Chrome rotates a subscription occasionally. When that happens the old
// endpoint stops working, so tell any open tab to re-register itself.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      list.forEach((c) => c.postMessage({ type: 'push-subscription-changed' }));
    }),
  );
});
