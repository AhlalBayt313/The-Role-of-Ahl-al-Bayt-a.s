// ============================================================================
// DUA / ZIYARAT / AMAL SHARE LINKS & DEEP-LINKS  (v224)
// ----------------------------------------------------------------------------
//   clShareUrl(type, item) → d/<id>.html next to the app (built by
//     tools/build-dua-share-pages.js): it has its own link-preview tags and
//     forwards to  ./?page=dua&open=<type>:<id>.  Custom (admin/device-only)
//     items have no page → '' (the old behaviour: share the plain address).
//   On load, ?open=<type>:<id> opens that item once the dua index has loaded;
//   Back then returns to the matching tab of the Dua library.
// ADDITIVE: the only edit elsewhere is one argument in ucShareItem()
// (script-1-core.js). If this file or the d/ folder is missing, sharing works
// exactly as before. Loads after share-links.js.
// Needs: state, duas, ziyarats, amals, readDua, readAmal, ensureZiyaratContent,
//        duasIndexLoadState (window), render, showToast.
// ============================================================================
function clShareUrl(type, item) {
    try {
        if (!item || item.id == null) return '';
        var id = String(item.id);
        if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return '';
        var list = type === 'dua' ? (typeof duas !== 'undefined' ? duas : [])
                 : type === 'ziyarat' ? (typeof ziyarats !== 'undefined' ? ziyarats : [])
                 : type === 'amal' ? (typeof amals !== 'undefined' ? amals : []) : [];
        if (!list.some(function (x) { return x === item || String(x.id) === id; })) return '';
        return new URL('d/' + id + '.html', document.baseURI).href;
    } catch (e) { return ''; }
}

(function clOpenDeepLinkedItem() {
    var type, id;
    try {
        var m = /^(dua|ziyarat|amal):([A-Za-z0-9_-]{1,80})$/.exec(new URLSearchParams(window.location.search).get('open') || '');
        if (!m) return;
        type = m[1]; id = m[2];
    } catch (e) { return; }
    if (typeof state === 'undefined') return;

    // Back target = the right tab of the Dua library.
    state.currentPage = 'dua';
    state.duaTab = type;

    var tries = 0;
    var timer = setInterval(function () {
        tries++;
        var ls = window.duasIndexLoadState || 'loading';
        if (ls === 'loading' && tries < 100) return;       // wait up to ~15 s for metadata.json
        clearInterval(timer);
        if (state.currentPage !== 'dua') return;            // the person already went elsewhere
        // NOTE: the ?open= part is deliberately left in the address. On a first visit the service
        // worker takes over and the app reloads itself once (script-4-boot.js 'controllerchange');
        // without ?open= that reload would drop the person on the list instead of the shared item.
        var opened = false;
        if (type === 'dua' && typeof duas !== 'undefined') {
            var i = duas.findIndex(function (x) { return x.id === id; });
            if (i > -1 && typeof readDua === 'function') { readDua(i); opened = true; }
        } else if (type === 'amal' && typeof amals !== 'undefined' && amals.some(function (x) { return x.id === id; })) {
            if (typeof readAmal === 'function') { readAmal(id); opened = true; }
        } else if (type === 'ziyarat' && typeof ziyarats !== 'undefined') {
            var z = ziyarats.find(function (x) { return x.id === id; });
            if (z) {   // same steps as the 'readZiyarat' click handler (script-2-ui.js)
                state.currentZiyarat = z; state.previousPage = 'dua'; state.currentPage = 'readZiyarat';
                window._ziyaratJustOpened = true; window.scrollTo(0, 0);
                render();
                if (typeof ensureZiyaratContent === 'function' && !z.hasFullData) {
                    ensureZiyaratContent(z).then(function () { if (state.currentZiyarat === z) render(); });
                }
                opened = true;
            }
        }
        if (opened) return;
        if (typeof showToast === 'function') {
            showToast(state.language === 'bn' ? 'আইটেমটি খুঁজে পাওয়া যায়নি' : 'That item could not be found', 'warning');
        }
        if (typeof render === 'function') render();
    }, 150);
})();
