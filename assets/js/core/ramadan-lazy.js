// ============================================================================
// RAMADAN CLUSTER — LOADING GATE  (v232)
// ----------------------------------------------------------------------------
// WHAT CHANGED
//   Seven files used to be listed in index.html and downloaded, parsed and run
//   on every first visit, all year round:
//       ramadan-plus.js, ramadan-cardart.js, iftar-invite.js, qadr-walk.js,
//       ramadan-journal.js, ramadan-home.js, ramadan-layout.js     (~48 KB gzip)
//   They are now the lazy group "ramadan" in lazy-loader.js (same order as before;
//   every one wraps renderRamadanPage, ramadan-layout.js must stay LAST).
//   daily-amal.js (base Ramadan page + the home "Today's Amal" card), qaza-fidya.js
//   and the prayer-* files stay eager.
//
// WHY A GATE IS NEEDED (and not only "load when the Ramadan page opens")
//   Two of those files do things outside the Ramadan page:
//     ramadan-plus.js   applies the 21-Ramadan muted theme to the whole app
//                       (applyMourn at boot + every minute).
//     ramadan-home.js   archives the finished year's fasting history at boot and
//                       before every tick, and puts the iftar/sehri countdown on
//                       the home page.
//   Both only matter in Ramadan, so the gate decides by the Hijri date.
//
// HOW IT WORKS
//   1. Hijri month 9, or the last days of Sha'ban (day >= 27) or the first days
//      of Shawwal (day <= 2)  -> "Ramadan window" (the +-2 days cover moon-sighting
//      differences and the user's own date adjustment):
//        while the page is still being parsed (this file sits right before
//        script-4-boot.js, which calls init()), the seven files are written into
//        the page with document.write, so they run in order BEFORE init() —
//        exactly as when they were listed in index.html. Nothing is re-rendered,
//        nothing flashes. abLazy.markLoaded('ramadan') records it.
//   2. Any other time: nothing is loaded. The Ramadan page (page map: _lz) loads
//      the group on the first visit and shows a small "loading" card meanwhile.
//   3. An app left open across the start of the window (or reopened from the
//      background) is caught by a check on visibilitychange and every 30 minutes:
//      the group is loaded then and the current page re-rendered once.
//   Offline still works: the files stay in the service worker's precache.
//
// LOAD ORDER   after lazy-loader.js, before script-4-boot.js (and so before init()).
// ============================================================================
(function () {
    'use strict';
    if (window.__ramadanLazy) return;
    window.__ramadanLazy = true;

    var GROUP = 'ramadan';
    var BASE = 'assets/js/core/';

    function inWindow() {
        try {
            var h = typeof approxHijriNow === 'function' ? approxHijriNow() : null;
            if (!h) return false;
            return h.month === 9 || (h.month === 8 && h.day >= 27) || (h.month === 10 && h.day <= 2);
        } catch (e) { return false; }
    }
    function lz() { return window.abLazy && window.abLazy.groups && window.abLazy.groups[GROUP] ? window.abLazy : null; }

    // 1) during Ramadan: write the files in before init() runs
    var wrote = false;
    try {
        var a = lz();
        if (a && document.readyState === 'loading' && inWindow()) {
            a.groups[GROUP].files.forEach(function (f) {
                document.write('<script src="' + BASE + f + '"><\/script>');
            });
            a.markLoaded(GROUP);
            wrote = true;
        }
    } catch (e) { wrote = false; }

    // 3) later: the window may start while the app is already open
    function check() {
        try {
            var b = lz();
            if (!b || wrote || b.isLoaded(GROUP) || !inWindow()) return;
            b.load(GROUP).then(function () {
                wrote = true;
                try {
                    var p = typeof state !== 'undefined' ? state.currentPage : '';
                    if ((p === 'home' || p === 'ramadan') && typeof render === 'function') render();
                } catch (e) { /* ignore */ }
            }, function () { /* error-log.js reports it; the next check retries */ });
        } catch (e) { /* a gate must never break the app */ }
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
    setInterval(check, 30 * 60 * 1000);
    if (!wrote) setTimeout(check, 1500);   // e.g. the file was loaded after parsing finished
})();
