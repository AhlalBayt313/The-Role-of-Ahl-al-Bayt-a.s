
const CACHE = 'ahlbayt-v3';
const STATIC = ['./', './index.html', './style.css', './script.js', './blog.js', './duas-data.js', './family-tree-data.js', './offline.html', './manifest.json', './favicon.ico', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];
const FONT_CACHE = 'ahlbayt-fonts-v1';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => {
            return Promise.allSettled(STATIC.map(url => c.add(url).catch(()=>{})));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);

    // Google Fonts → cache-first
    if (url.hostname.includes('fonts.g')) {
        e.respondWith(caches.open(FONT_CACHE).then(c =>
            c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
                c.put(e.request, res.clone()); return res;
            }))
        ));
        return;
    }

    // AlAdhan prayer API → network-first, fallback to cache
    if (url.hostname.includes('aladhan')) {
        e.respondWith(
            fetch(e.request).then(res => {
                caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                return res;
            }).catch(() => caches.match(e.request))
        );
        return;
    }

    // Everything else → stale-while-revalidate (+ offline fallback for page navigations)
    e.respondWith(
        caches.match(e.request).then(cached => {
            const net = fetch(e.request).then(res => {
                if (res && res.status === 200 && res.type !== 'opaque') {
                    caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                }
                return res;
            }).catch(() => {
                if (cached) return cached;
                if (e.request.mode === 'navigate') return caches.match('./offline.html');
                return undefined;
            });
            return cached || net;
        })
    );
});

// Background sync for offline actions
self.addEventListener('message', e => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});