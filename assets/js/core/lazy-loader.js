// ============================================================================
// LAZY LOADER  (v229)
// ----------------------------------------------------------------------------
// WHY
//   index.html loaded ~38 scripts (1.8 MB, ~500 KB gzip) up front, although a
//   first visit only needs the Home page. The audit (docs/v229-CHANGES-bn.md)
//   found whole modules that nothing touches until a particular page is opened.
//
// WHAT THIS DOES
//   Loads those modules ON DEMAND, the first time they are needed:
//
//     group     file                 needed by
//     --------  -------------------  -----------------------------------------
//     quiz      quiz-plus.js         the Quiz page (streaks / XP / flashcards)
//     map       world-map.js         the World Map page + "Important Places"
//     khums     khums-zakat.js       the Khums & Zakat page
//     arabic    arabic-corner.js     the Arabic reading-corner page
//     editors   editor-modal.js      the 7 admin editor modals (admin only)
//
//   The files stay in the service worker's precache, so everything still works
//   offline; this only changes WHEN a file is downloaded, parsed and run.
//
// API (window.abLazy)
//   load(name)            -> Promise; loads the group's files IN ORDER, once.
//   isLoaded(name)        -> boolean
//   page(name, fnName)    -> HTML string for a page-map entry: the real page if
//                            the group is loaded, otherwise a small "loading"
//                            card (and the group starts loading; when it
//                            arrives the app re-renders if the user is still on
//                            that page). If loading fails it shows a retry card.
//   markLoaded(name)      -> v232: mark a group as already loaded (never loaded twice)
//   editors()             -> call at the start of render(): loads the editor
//                            modals for an admin (cheap no-op for everyone else)
//
// Failures are logged by error-log.js (failed <script> load) and never break
// the rest of the app. Files are plain classic scripts, injected with
// async=false so a group's files run in the listed order.
// ============================================================================
(function () {
'use strict';

if (typeof window === 'undefined' || window.abLazy) return;

var BASE = 'assets/js/core/';
var GROUPS = {
    quiz:    { files: ['quiz-plus.js'] },
    map:     { files: ['world-map.js'] },
    khums:   { files: ['khums-zakat.js'], after: function () {
        // qaza-fidya.js (eager) adds its ledger card to the Khums page by wrapping
        // renderKhumsZakatPage; that page now arrives later, so wrap it now.
        if (typeof window._qfWrapKhums === 'function') window._qfWrapKhums();
    } },
    arabic:  { files: ['arabic-corner.js'] },
    // v232: the Ramadan cluster. Order = the order these files had in index.html: each one wraps
    // renderRamadanPage (and some todayAmalCard), ramadan-layout LAST. daily-amal.js (base page +
    // home card), qaza-fidya.js and prayer-*.js stay eager. ramadan-lazy.js loads this group at boot
    // during Ramadan (+- 2 days), because ramadan-plus (mourning theme) and ramadan-home (history
    // archive, home countdown) have effects outside the Ramadan page.
    ramadan: { files: ['ramadan-plus.js', 'ramadan-cardart.js', 'iftar-invite.js', 'qadr-walk.js', 'ramadan-journal.js', 'ramadan-home.js', 'ramadan-layout.js'] },
    editors: { files: ['editor-modal.js'] }
};

var S = {};          // name -> { s: 'loading' | 'loaded' | 'error', p: Promise }
var waiting = {};    // name -> page key that is showing the loading card

function lang() { try { return state.language === 'en' ? 'en' : 'bn'; } catch (e) { return 'bn'; } }
function T(b, e) { return lang() === 'en' ? e : b; }
function curPage() { try { return state.currentPage; } catch (e) { return ''; } }
function rerender() { try { if (typeof render === 'function') render(); } catch (e) { /* ignore */ } }

function inject(src) {
    return new Promise(function (resolve, reject) {
        var el = document.createElement('script');
        el.src = src;
        el.async = false;                        // keep execution order inside a group
        el.onload = function () { resolve(); };
        el.onerror = function () { try { el.parentNode && el.parentNode.removeChild(el); } catch (e) { /* ignore */ } reject(new Error('could not load ' + src)); };
        (document.head || document.documentElement).appendChild(el);
    });
}

function load(name) {
    var g = GROUPS[name];
    if (!g) return Promise.reject(new Error('unknown lazy group: ' + name));
    var cur = S[name];
    if (cur && cur.s !== 'error') return cur.p;
    var rec = { s: 'loading' };
    var chain = Promise.resolve();
    g.files.forEach(function (f) { chain = chain.then(function () { return inject(BASE + f); }); });
    rec.p = chain.then(function () {
        if (typeof g.after === 'function') { try { g.after(); } catch (e) { try { window.__dgLog && window.__dgLog.report(e, 'lazy:' + name); } catch (e2) { /* ignore */ } } }
        rec.s = 'loaded';
    }, function (err) {
        rec.s = 'error';
        throw err;
    });
    S[name] = rec;
    return rec.p;
}

function isLoaded(name) { return !!(S[name] && S[name].s === 'loaded'); }

function loadingCard() {
    return '<div class="ab-lazy page-enter" role="status" aria-live="polite">' +
        '<span class="ab-lazy-spin" aria-hidden="true"></span>' +
        '<p>' + T('লোড হচ্ছে…', 'Loading…') + '</p></div>';
}
function errorCard(name) {
    return '<div class="ab-lazy page-enter" role="alert">' +
        '<p>' + T('এই অংশটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।', 'This section could not be loaded. Check your connection and try again.') + '</p>' +
        '<button type="button" class="ab-lazy-btn" data-lazy-retry="' + name + '">' + T('আবার চেষ্টা করুন', 'Try again') + '</button></div>';
}

function page(name, fnName) {
    if (isLoaded(name)) {
        var f = window[fnName];
        return typeof f === 'function' ? f() : loadingCard();
    }
    var rec = S[name];
    if (rec && rec.s === 'error') return errorCard(name);
    waiting[name] = curPage();
    if (!rec) {
        load(name).then(function () {
            if (curPage() === waiting[name]) rerender();
        }, function () {
            if (curPage() === waiting[name]) rerender();      // shows the retry card
        });
    }
    return loadingCard();
}

var editorsAsked = false;
function editors() {
    if (editorsAsked || isLoaded('editors')) return;
    try { if (!state.isAdmin) return; } catch (e) { return; }
    editorsAsked = true;
    load('editors').then(rerender, function () { editorsAsked = false; });
}

document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-lazy-retry]') : null;
    if (!b) return;
    var name = b.getAttribute('data-lazy-retry');
    if (!GROUPS[name]) return;
    delete S[name];                                          // forget the failed attempt
    rerender();                                              // page() starts a fresh load and shows the loading card
});

// v232: markLoaded(name) tells the loader a group was already loaded some other way (ramadan-lazy.js
// writes the Ramadan files into the page before script-4-boot.js during Ramadan), so it never loads it twice.
function markLoaded(name) { if (GROUPS[name]) S[name] = { s: 'loaded', p: Promise.resolve() }; }

window.abLazy = { load: load, isLoaded: isLoaded, page: page, editors: editors, groups: GROUPS, markLoaded: markLoaded };

})();
