// Service worker (PWA): network-first untuk file statis supaya update langsung terlihat,
// cache hanya dipakai saat offline. API (api/*.php) tidak pernah di-cache di sini.
const CACHE = 'top-sales-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
    event.respondWith((async () => {
        try {
            const res = await fetch(req);
            if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
            return res;
        } catch (err) {
            const cached = await caches.match(req);
            if (cached) return cached;
            throw err;
        }
    })());
});
