// ============================================================================
// FOOTER INDEX LINKS  (v231)
// ----------------------------------------------------------------------------
// THE PROBLEM
//   v230 turned p/ (blog) and d/ (dua / ziyarat / amal) into real, indexable
//   pages with their own index pages (p/index.html, d/index.html). But nothing
//   in the app linked to them: every in-app control is a <button data-action>,
//   which search engines do not follow. The pages were reachable only through
//   sitemap.xml.
//
// THE FIX (purely additive — renderFooter() and every id / class / state key
//   are untouched)
//   render() is wrapped (same pattern as page-titles.js / reader-mode.js).
//   After each render two real <a href> links are appended to the footer's
//   "Quick Links" grid:
//       p/   all articles      d/   dua, ziyarat and amal index
//   They look like the other quick links and are plain navigation (no
//   data-action), so the app's click handler leaves them alone. If the footer
//   or its grid is not found, nothing happens.
//
// LOAD ORDER   Before browser-history.js (which must wrap the final render()).
// ============================================================================
(function () {
    'use strict';
    if (window.__footerSeoLinks) return;
    window.__footerSeoLinks = true;

    var LINKS = [
        { href: 'p/', bn: 'সব লেখার সূচি', en: 'All Articles' },
        { href: 'd/', bn: 'দোয়া ও যিয়ারতের সূচি', en: 'Dua & Ziyarat Index' }
    ];
    var ARROW = '<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>';

    function lang() {
        try { return (typeof state !== 'undefined' && state.language === 'en') ? 'en' : 'bn'; } catch (e) { return 'bn'; }
    }

    function add() {
        try {
            var footer = document.querySelector('footer.footer-luxury');
            if (!footer || footer.querySelector('a[data-seo-index]')) return;
            // the quick-links grid is the one holding the changePage buttons
            var btn = footer.querySelector('button[data-action="changePage"]');
            var grid = btn && btn.parentElement;
            if (!grid) return;
            var l = lang();
            LINKS.forEach(function (k) {
                var a = document.createElement('a');
                a.href = k.href;
                a.setAttribute('data-seo-index', k.href);
                a.className = 'text-left text-sm transition-all hover:translate-x-1';
                a.style.cssText = 'color:rgba(255,255,255,.5);display:flex;align-items:center;gap:5px;text-decoration:none';
                a.onmouseover = function () { this.style.color = '#34d399'; };
                a.onmouseout = function () { this.style.color = 'rgba(255,255,255,.5)'; };
                a.innerHTML = ARROW + ' ' + (l === 'en' ? k.en : k.bn);
                grid.appendChild(a);
            });
        } catch (e) { /* a footer link must never break the app */ }
    }

    if (typeof window.render === 'function' && !window.render.__fsl) {
        var _render = window.render;
        var wrapped = function () {
            var r = _render.apply(this, arguments);
            add();
            return r;
        };
        Object.keys(_render).forEach(function (k) { wrapped[k] = _render[k]; });   // keep other wrappers' markers
        wrapped.__fsl = true;
        window.render = wrapped;
    }
    add();
})();
