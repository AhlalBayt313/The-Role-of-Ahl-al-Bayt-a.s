
const CACHE = 'ahlbayt-v8'; // v8: added Amal category (data/duas/amal.json + updated JS)
// NOTE (2026-07-23): paths updated to match the reorganized assets/ + data/
// folder structure. Old entries (./script.js, ./family-tree-data.js) removed
// since those files no longer exist — script.js was split into 4 files under
// assets/js/core/, family-tree-data.js was merged into ahlul-bayt-unified.js.
// './manifest.json' removed — the manifest is generated at runtime as a Blob
// URL (see script-4-boot.js), there is no static manifest.json file to fetch.
// NOTE (2026-07-26): data/*.json single-file blobs (ahlul-bayt.json, duas.json,
// knowledge-center.json, posts.json) removed — each was split into the
// per-category files under data/ahlul-bayt/, data/duas/, and data/knowledge/
// listed below (folders were also renamed from the mistaken "data ahlul-bayt"/
// "data duas"/"data knowledge" to match the paths duas-data.js,
// knowledge-center-data.js, and ahlul-bayt-unified.js actually request). Also
// added the missing ./assets/js/core/search-engine.js, which index.html loads
// but this list never included. CACHE bumped to v5 so old clients drop the
// stale files.
const STATIC = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/utils/data-loader.js',
    './assets/js/data/duas-data.js',
    './assets/js/data/knowledge-center-data.js',
    './assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js',
    './assets/js/modules/blog/blog.js',
    './assets/js/modules/knowledge/knowledge-center.js',
    './assets/js/core/script-1-core.js',
    './assets/js/core/script-2-ui.js',
    './assets/js/core/script-3-pages.js',
    './assets/js/core/script-4-boot.js',
    './assets/js/core/search-engine.js',
    './data/blog-posts.json',
    './data/ahlul-bayt/biographies.json',
    './data/ahlul-bayt/companions.json',
    './data/ahlul-bayt/events.json',
    './data/ahlul-bayt/family-tree.json',
    './data/ahlul-bayt/masumeen.json',
    './data/ahlul-bayt/metadata.json',
    './data/ahlul-bayt/quotes.json',
    './data/ahlul-bayt/timeline.json',
    './data/duas/ahlul-bayt.json',
  './data/duas/amal.json',
    './data/duas/daily.json',
    './data/duas/family.json',
    './data/duas/forgiveness.json',
    './data/duas/hajj-umrah.json',
    './data/duas/hardship.json',
    './data/duas/healing.json',
    './data/duas/knowledge.json',
    './data/duas/metadata.json',
    './data/duas/morning.json',
    './data/duas/night.json',
    './data/duas/patience.json',
    './data/duas/protection.json',
    './data/duas/quranic.json',
    './data/duas/ramadan.json',
    './data/duas/rizq.json',
    './data/duas/sahifa-sajjadiya.json',
    './data/duas/special-days.json',
    './data/duas/tasbih.json',
    './data/duas/zikr.json',
    './data/duas/ziyarat.json',
    './data/knowledge/categories.json',
    './data/knowledge/fatwa.json',
    './data/knowledge/hadith.json',
    './data/knowledge/masail.json',
    './data/knowledge/metadata.json',
    './data/knowledge/qa.json',
    './offline.html',
    './favicon.ico',
    './apple-touch-icon.png',
    './icon-192.png',
    './icon-512.png',
    './icon-512-maskable.png'
];
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
                // Clone MUST happen synchronously, in this same tick, before
                // the original `res` is returned and its body potentially
                // starts being read by the page. caches.open() is async, so
                // calling res.clone() only after it resolves risks the body
                // already being "used" — throwing "Failed to execute
                // 'clone' on 'Response': Response body is already used".
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return res;
            }).catch(() => caches.match(e.request))
        );
        return;
    }

    // data/*.json → never intercept. These are loaded via SYNCHRONOUS XHR at
    // boot (see assets/js/utils/data-loader.js: knowledge-center-data.js,
    // duas-data.js, ahlul-bayt-unified.js all block the main thread waiting
    // on these requests). A synchronous XHR made by a page whose fetch is
    // being handled by this SW's async respondWith()/Promise chain can hang
    // indefinitely in several browsers — the tab's JS thread is frozen
    // waiting for the XHR to finish, but delivering the SW's response back
    // to that frozen thread also needs the event loop, so it can deadlock.
    // knowledge/metadata.json is the largest of these files (~165KB), so it
    // is the one most likely to actually hit this window — matching the
    // "spinner stuck forever on Knowledge Center" symptom. Skipping
    // respondWith() here means the browser handles these requests natively
    // (straight to network / its own HTTP cache), completely side-stepping
    // the SW for this route. They're still precached in STATIC above for
    // install-time warmup; they just aren't served *from* that cache at
    // fetch time anymore.
    if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
        return;
    }

    // Everything else → stale-while-revalidate (+ offline fallback for page navigations)
    e.respondWith(
        caches.match(e.request).then(cached => {
            const net = fetch(e.request).then(res => {
                if (res && res.status === 200 && res.type !== 'opaque') {
                    // Same fix as the AlAdhan branch above: clone
                    // synchronously, before `return res` hands the original
                    // off for consumption, so caches.open()'s async delay
                    // can never race against the body being read/locked.
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, copy));
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
