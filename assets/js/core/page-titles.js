// ============================================================================
// PAGE TITLES  (v230)
// ----------------------------------------------------------------------------
// THE PROBLEM
//   document.title was never changed after load, so every view of the app —
//   the Dua list, a single Dua, a blog post, the Imams page … — had the same
//   tab / history / task-switcher title.
//
// THE FIX (purely additive — no function, id, state key or storage key changes)
//   render() is wrapped (same pattern as reader-mode.js / dua-playlist.js).
//   After each render the title is set from state:
//     home                      the original <title> of index.html (kept as is)
//     a list / tool page        its menu name (t(page)) | app name
//     read* / imamDetail pages  the item's own title | app name
//   Language follows state.language. Pages without a translation key
//   (about, muharram, shia-days, calendar in English) use the small table below.
//
// LOAD ORDER   index.html loads this BEFORE browser-history.js (which must wrap
//              the final render()), so the title is already right when that file
//              records a history entry.
// ============================================================================
(function () {
    'use strict';
    if (window.__pageTitles) return;
    window.__pageTitles = true;

    var HOME = document.title;   // the static title from index.html
    var BRAND = { bn: 'আহলে বাইত (আ.)', en: 'Ahl al-Bayt (a.s)' };
    // pages that have no entry in the translations table: [bn, en]
    var EXTRA = {
        about: ['আমাদের সম্পর্কে', 'About'],
        calendar: ['ইসলামিক ক্যালেন্ডার', 'Islamic Calendar'],
        muharram: ['মুহাররম', 'Muharram'],
        'shia-days': ['শিয়া দিবস', 'Shia Days']
    };

    // `state` is a top-level const/let of script-1-core.js (not a property of window): use the bare name
    function S() { return typeof state !== 'undefined' ? state : null; }
    function lang() { var st = S(); return (st && st.language === 'en') ? 'en' : 'bn'; }
    function pick(o, bn, en) {
        if (!o) return '';
        var v = lang() === 'en' ? (o[en] || o[bn]) : (o[bn] || o[en]);
        return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
    }

    function titleFor() {
        var state = S();
        if (!state) return '';
        var p = state.currentPage, l = lang(), s = '';
        if (p === 'home' || !p) return HOME;
        if (p === 'readPost') s = pick(state.currentPost, 'titleBn', 'titleEn');
        else if (p === 'readDua') s = pick(state.currentDua, 'titleBn', 'titleEn');
        else if (p === 'readZiyarat') s = pick(state.currentZiyarat, 'titleBn', 'titleEn');
        else if (p === 'readAmal') s = pick(state.currentAmal, 'titleBn', 'titleEn');
        else if (p === 'imamDetail') s = pick(state.currentImam, 'nameBn', 'nameEn');
        else {
            try { s = typeof t === 'function' ? t(p) : ''; } catch (e) { s = ''; }
            if (!s || s === p) s = EXTRA[p] ? EXTRA[p][l === 'en' ? 1 : 0] : '';
        }
        return s ? s + ' | ' + BRAND[l] : HOME;
    }

    function apply() {
        try {
            var tt = titleFor();
            if (tt && document.title !== tt) document.title = tt;
        } catch (e) { /* a title must never break the app */ }
    }

    if (typeof window.render === 'function' && !window.render.__pt) {
        var _render = window.render;
        var wrapped = function () {
            var r = _render.apply(this, arguments);
            apply();
            return r;
        };
        Object.keys(_render).forEach(function (k) { wrapped[k] = _render[k]; });   // keep other wrappers' markers
        wrapped.__pt = true;
        window.render = wrapped;
    }
    apply();
})();
