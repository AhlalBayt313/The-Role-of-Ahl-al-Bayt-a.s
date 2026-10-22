// ============================================================================
// BROWSER BACK / FORWARD  (v227)
// ----------------------------------------------------------------------------
// THE PROBLEM
//   The app never touched the browser history: every page change only flipped
//   state.currentPage and re-rendered. So the Android Back button / browser
//   Back / iOS swipe-back left the app, and a refresh lost the page.
//
// THE FIX (purely additive — no function, id, state key or storage key changes)
//   • render() is wrapped (same pattern as reader-mode.js / dua-playlist.js).
//     After every render the current "view" is read from state:
//         page            state.currentPage
//         detail item     id of currentPost / currentDua / currentZiyarat /
//                         currentAmal / currentImam (only on the read* /
//                         imamDetail pages)
//         overlay         mobile menu open, or the person-detail modal open
//     When the view changed → history.pushState (new entry, address updated).
//   • popstate (Back / Forward) → the stored view is put back into state and
//     rendered, using the app's own openers (changePage / readPost / readDua /
//     readAmal / the readZiyarat + viewImam steps).
//   • Overlays: opening the menu / person modal adds an entry, so Back CLOSES
//     it instead of leaving the page. Closing it any other way removes the
//     entry again (no dead Back presses).
//   • In-app "← Back" buttons that go to the page you came from pop the entry
//     instead of stacking a new one, so Back/Forward stay in step with them.
//   • Knowledge Center keeps its own internal Back stack; Back first uses that
//     (its own button is clicked), then leaves the page.
//   • Scroll position of the page you leave is remembered and restored on Back.
//   • Addresses: ?page=<page> (plus the existing ?open=type:id for Dua /
//     Ziyarat / Amal and ?page=readPost&id= for posts). Both already have
//     openers (content-links.js / share-links.js), so a refresh or a copied
//     address lands on the same page. The first entry keeps the address the
//     visit started with (the ?open= link needs it until the item has opened).
//
// SAFE BY DESIGN: every entry point is try/catch-guarded; if anything here
// fails or history.pushState is unavailable the app behaves exactly as before.
// Loads LAST (after content-links.js) so it wraps the final render().
// Needs: state, render, changePage (+ readPost/readDua/readAmal, imams,
//        masumeen, ziyarats when restoring a detail page).
// ============================================================================
(function () {
'use strict';

if (typeof window === 'undefined' || typeof state === 'undefined') return;
if (!window.history || typeof history.pushState !== 'function') return;
if (window.__bhInstalled) return;
window.__bhInstalled = true;

var cur = null;          // the entry that is showing now: {i, p, k, ov, pk}
var ready = false;       // install() finished
var broken = false;      // pushState threw once → stay out of the way for good
var busy = false;        // a Back/Forward restore is running → sync() is muted
var ignore = 0;          // history.back() calls WE made whose popstate must be swallowed
var ignoreAt = 0;
var retryTimer = null;

function str(v) { return v == null ? '' : String(v); }
function warn(e) { try { if (window.console) console.warn('[BH]', e); } catch (x) {} }

// ---------------------------------------------------------------- view model
// p = page, k = detail id ('' on list pages), ov = '' | 'menu' | 'person'
function detailKey() {
    var o = null, p = state.currentPage;
    try {
        if (p === 'readPost') o = state.currentPost;
        else if (p === 'readDua') o = state.currentDua;
        else if (p === 'readZiyarat') o = state.currentZiyarat;
        else if (p === 'readAmal') o = state.currentAmal;
        else if (p === 'imamDetail') o = state.currentImam;
    } catch (e) {}
    return (o && o.id != null) ? str(o.id) : '';
}
function personOpen() {
    var m = document.getElementById('person-detail-modal');
    return !!(m && !m.classList.contains('hidden') && !m.classList.contains('closing'));
}
function compute() {
    return {
        p: str(state.currentPage) || 'home',
        k: detailKey(),
        ov: state.menuOpen ? 'menu' : (personOpen() ? 'person' : '')
    };
}
function viewKey(e) { return e.p + '|' + e.k; }
function fullKey(e) { return e.p + '|' + e.k + '|' + (e.ov || ''); }
function parentPage(p) {
    return p === 'readPost' ? 'blog'
         : (p === 'readDua' || p === 'readZiyarat' || p === 'readAmal') ? 'dua'
         : p === 'imamDetail' ? 'imams' : p;
}

// ------------------------------------------------------------------- address
var SAFE = /^[A-Za-z0-9_-]{1,80}$/;
function urlFor(e) {
    var path = location.pathname, q = '', p = e.p;
    try {
        if (p === 'home') return path;
        if (p === 'readPost') {
            var post = state.currentPost;
            if (post && /^\d{1,6}$/.test(str(post.id)) && typeof slPostUrl === 'function' && slPostUrl(post)) q = '?page=readPost&id=' + post.id;
            else q = '?page=blog';
        } else if (p === 'readDua' || p === 'readZiyarat' || p === 'readAmal') {
            var type = p === 'readDua' ? 'dua' : p === 'readZiyarat' ? 'ziyarat' : 'amal';
            var item = p === 'readDua' ? state.currentDua : p === 'readZiyarat' ? state.currentZiyarat : state.currentAmal;
            if (item && SAFE.test(str(item.id)) && typeof clShareUrl === 'function' && clShareUrl(type, item)) q = '?page=dua&open=' + type + ':' + item.id;
            else q = '?page=dua';
        } else if (p === 'imamDetail') {
            q = '?page=imams';
        } else if (SAFE.test(p)) {
            q = '?page=' + p;
        }
    } catch (err) { q = ''; }
    return path + q;
}

// ------------------------------------------------------------- history calls
function entryOf(e, i, pk, y) {
    var b = { i: i, p: e.p, k: e.k, ov: e.ov || '', pk: pk || '' };
    if (typeof y === 'number') b.y = y;
    return { bh: b };
}
function remember(e, i, pk, y) { cur = { i: i, p: e.p, k: e.k, ov: e.ov || '', pk: pk || '' }; if (typeof y === 'number') cur.y = y; }

function saveScroll() {      // remember how far the page we are about to leave was scrolled
    try {
        var hs = history.state;
        if (!hs || !hs.bh) return;
        var b = {}, k;
        for (k in hs.bh) b[k] = hs.bh[k];
        b.y = Math.round(window.pageYOffset || 0);
        history.replaceState({ bh: b }, '');
    } catch (e) {}
}
function push(now) {
    try {
        saveScroll();
        var i = cur.i + 1, pk = viewKey(cur);
        history.pushState(entryOf(now, i, pk), '', urlFor(now));
        remember(now, i, pk);
    } catch (e) { broken = true; warn(e); }
}
function replace(now, i, pk) {
    try {
        history.replaceState(entryOf(now, i, pk), '', urlFor(now));
        remember(now, i, pk);
    } catch (e) { broken = true; warn(e); }
}
function goBackSilently(nowView) {   // drop the entry on top: history.back(), and swallow its popstate
    ignore++; ignoreAt = Date.now();
    remember({ p: nowView.p, k: nowView.k, ov: '' }, Math.max(0, cur.i - 1), '');   // corrected from the popstate event
    // one tick later, so the render that triggered this has fully finished first
    setTimeout(function () {
        try { history.back(); } catch (e) { ignore = 0; broken = true; warn(e); }
    }, 0);
}

// --------------------------------------------------- follow the app's views
function sync() {
    if (!ready || busy || broken) return;
    // a history.back() of ours is still on its way → look again in a moment
    if (ignore > 0) {
        if (Date.now() - ignoreAt > 800) ignore = 0;           // its popstate never came
        else { clearTimeout(retryTimer); retryTimer = setTimeout(sync, 40); return; }
    }
    var now;
    try { now = compute(); } catch (e) { return; }
    if (fullKey(now) === fullKey(cur)) return;

    if (cur.ov && !now.ov) {                                   // an overlay was closed by the app
        if (viewKey(now) === viewKey(cur)) { goBackSilently(now); return; }   // just closed → drop its entry
        replace(now, cur.i, cur.pk);                           // closed because a page opened → entry becomes that page
        return;
    }
    if (!cur.ov && !now.ov && cur.pk && viewKey(now) === cur.pk) {  // an in-app "← Back" to where we came from
        goBackSilently(now);
        return;
    }
    push(now);
}

// ------------------------------------------------- restoring a view (Back)
function cleanupLeaving() {      // same housekeeping changePage() does when leaving these pages
    try {
        if (state.currentPage === 'qibla' && typeof cleanupQiblaCompass === 'function') cleanupQiblaCompass();
        if (state.currentPage === 'worldMap' && typeof cleanupWorldMap === 'function') cleanupWorldMap();
        if (state.currentPage === 'quiz' && typeof quizTimerClear === 'function') quizTimerClear();
    } catch (e) {}
}
function openPost(id) {
    if (typeof readPost !== 'function') return false;
    var all = (typeof blogPosts !== 'undefined' ? blogPosts : []).concat(state.customPosts || []);
    if (!all.some(function (p) { return str(p.id) === id; })) return false;
    cleanupLeaving(); readPost(id); return true;
}
function openDua(id) {
    if (typeof readDua !== 'function') return false;
    var i = (typeof duas !== 'undefined' && duas) ? duas.findIndex(function (x) { return str(x.id) === id; }) : -1;
    if (i > -1) { cleanupLeaving(); readDua(i); return true; }
    if ((state.customDuas || []).some(function (x) { return str(x.id) === id; })) { cleanupLeaving(); readDua('c' + id); return true; }
    return false;
}
function openAmal(id) {
    if (typeof readAmal !== 'function') return false;
    var has = (state.customAmal || []).some(function (x) { return str(x.id) === id; })
           || (typeof amals !== 'undefined' && amals.some(function (x) { return str(x.id) === id; }));
    if (!has) return false;
    cleanupLeaving(); readAmal(id); return true;
}
function openZiyarat(id) {       // same steps as the 'readZiyarat' click handler (script-2-ui.js)
    var z = (state.customZiyarat || []).find(function (x) { return str(x.id) === id; })
         || (typeof ziyarats !== 'undefined' && ziyarats ? ziyarats.find(function (x) { return str(x.id) === id; }) : null);
    if (!z) return false;
    cleanupLeaving();
    state.currentZiyarat = z; state.previousPage = state.currentPage; state.currentPage = 'readZiyarat';
    window._ziyaratJustOpened = true;
    window.scrollTo(0, 0);
    render();
    if (typeof ensureZiyaratContent === 'function' && !z.hasFullData) {
        ensureZiyaratContent(z).then(function () { if (state.currentZiyarat === z) render(); });
    }
    return true;
}
function openImam(id) {          // same lookup chain as the 'viewImam' click handler (script-2-ui.js)
    var im = null;
    try {
        im = (typeof imams !== 'undefined' ? imams.find(function (x) { return str(x.id) === id; }) : null)
          || (typeof masumeen !== 'undefined' ? masumeen.find(function (x) { return str(x.id) === id; }) : null)
          || (window.__nabiMasumeenExtraCards || []).find(function (x) { return str(x.id) === id; })
          || (typeof ADDITIONAL_PERSONALITIES !== 'undefined' ? ADDITIONAL_PERSONALITIES.find(function (x) { return str(x.id) === id; }) : null);
    } catch (e) { im = null; }
    if (!im) return false;
    cleanupLeaving();
    state.currentImam = im; state.previousPage = state.currentPage; state.currentPage = 'imamDetail';
    render(); window.scrollTo(0, 0);
    return true;
}
function restoreView(t) {
    state.menuOpen = false;
    var ok = false;
    try {
        if (t.k) {
            if (t.p === 'readPost') ok = openPost(t.k);
            else if (t.p === 'readDua') ok = openDua(t.k);
            else if (t.p === 'readZiyarat') ok = openZiyarat(t.k);
            else if (t.p === 'readAmal') ok = openAmal(t.k);
            else if (t.p === 'imamDetail') ok = openImam(t.k);
        }
    } catch (e) { warn(e); ok = false; }
    if (ok) return;
    // plain page — or a detail page whose item can't be found any more → its list page
    var page = parentPage(t.p);
    if (typeof changePage === 'function') changePage(page);
    else { state.currentPage = page; render(); }
}
function closeOverlay(ov) {
    try {
        if (ov === 'menu') { if (state.menuOpen) { state.menuOpen = false; render(); } }
        else if (ov === 'person') { if (typeof closePersonDetail === 'function') closePersonDetail(); }
    } catch (e) { warn(e); }
}
function internalBack() {        // pages that run their own Back stack (Knowledge Center)
    try {
        if (state.currentPage === 'knowledgeCenter') {
            var b = document.querySelector('[data-kcx-act="back"]');
            if (b) { b.click(); return true; }
        }
    } catch (e) { warn(e); }
    return false;
}
function restoreScroll(y, key) {
    if (!(y > 0) || key.indexOf('knowledgeCenter|') === 0) return;   // the Knowledge Center restores its own scroll
    [0, 170, 450, 900].forEach(function (ms) {   // changePage() renders ~130 ms late and scrolls to top
        setTimeout(function () {
            try { if (viewKey(compute()) === key) window.scrollTo({ top: y, behavior: 'instant' }); } catch (e) {}
        }, ms);
    });
}

function onPop(ev) {
    if (broken) return;
    var t = ev.state && ev.state.bh;
    if (ignore > 0) {                                   // the echo of a history.back() we issued
        ignore--;
        if (t) {
            cur = { i: t.i, p: t.p, k: t.k || '', ov: '', pk: t.pk || '' };
            if (typeof t.y === 'number') { cur.y = t.y; restoreScroll(t.y, viewKey(cur)); }
        }
        return;
    }
    if (!t || !cur) return;                             // not one of our entries
    var tgt = { i: t.i, p: t.p, k: t.k || '', ov: '', pk: t.pk || '', y: t.y };   // never re-open an overlay on Forward
    var wasBack = tgt.i < cur.i;
    busy = true;
    try {
        if (cur.ov) {
            closeOverlay(cur.ov);                       // Back from an overlay entry = close the overlay
            if (viewKey(tgt) === viewKey(cur)) {        // normal case: the entry below is the same page
                if (t.ov) { replace(tgt, tgt.i, tgt.pk); } else { remember(tgt, tgt.i, tgt.pk, tgt.y); }
                return;
            }
        } else if (wasBack && internalBack()) {         // let the page use its own Back first, then stay on this entry
            try { history.pushState(entryOf(cur, cur.i, cur.pk, cur.y), '', urlFor(cur)); } catch (e) { broken = true; warn(e); }
            return;
        }
        if (state.menuOpen) state.menuOpen = false;
        if (viewKey(compute()) !== viewKey(tgt)) { restoreView(tgt); restoreScroll(tgt.y, viewKey(tgt)); }
        var now = compute(); now.ov = '';
        if (viewKey(now) === viewKey(tgt)) { remember(tgt, tgt.i, tgt.pk, tgt.y); if (t.ov) replace(tgt, tgt.i, tgt.pk); }
        else replace(now, tgt.i, tgt.pk);               // the item could not be restored → show the real view
    } catch (e) {
        warn(e);
    } finally {
        busy = false;
    }
}

// ------------------------------------------------------------------- install
function install() {
    var hs = null;
    try { hs = history.state; } catch (e) {}
    var b = hs && hs.bh ? hs.bh : null;               // survives a reload / the service-worker reload
    var e0 = compute(); e0.ov = '';
    var i = b && typeof b.i === 'number' ? b.i : 0;
    try {
        history.replaceState(entryOf(e0, i, b && b.pk), '');       // no URL argument: the address stays as it is
    } catch (err) { broken = true; return; }
    remember(e0, i, b && b.pk);
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (err) {}

    window.addEventListener('popstate', onPop);

    if (typeof window.render === 'function' && !window.render.__bh) {
        var _render = window.render;
        var wrapped = function () {
            var r = _render.apply(this, arguments);
            try { sync(); } catch (err) { warn(err); }
            return r;
        };
        wrapped.__bh = true;
        window.render = wrapped;
    }
    // the person-detail modal is opened/closed without a render()
    ['showPersonDetail', 'closePersonDetail'].forEach(function (n) {
        var f = window[n];
        if (typeof f !== 'function' || f.__bh) return;
        var w = function () {
            var r = f.apply(this, arguments);
            try { sync(); } catch (err) { warn(err); }
            return r;
        };
        w.__bh = true;
        window[n] = w;
    });
    ready = true;
    try { sync(); } catch (err) { warn(err); }
}

try { install(); } catch (e) { warn(e); }

})();
