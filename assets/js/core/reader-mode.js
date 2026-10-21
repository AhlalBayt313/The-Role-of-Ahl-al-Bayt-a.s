// ============================================================================
// READER MODE  (v206)
// ----------------------------------------------------------------------------
// A distraction-free reading mode for blog posts (page `readPost`):
//   * a small "রিডার মোড" bar above the article; turning it on hides the header,
//     footer and bottom navigation and shows a settings strip:
//     colour (site / paper / sepia / night), text size (5 steps),
//     line spacing (3 steps), text width (3 steps), exit.
//   * Esc leaves reader mode. Every control is a real <button> with an aria label.
//   * Settings are saved on the device only: localStorage `ahlbayt_reader_mode`
//     { on, theme, size, lh, w }  (in the "personal" backup group).
// NOTHING here writes or changes any post text — it only restyles the page.
// Hooks: wraps the global render() (typeof-guarded) to attach the bar after every
// render; a failure here can never break the page. No dependency on other modules
// except `state` (and, optionally, window.render).
// ============================================================================
(function () {
'use strict';

const KEY = 'ahlbayt_reader_mode';
const THEMES = ['auto', 'paper', 'sepia', 'night'];
const SIZES = [15, 16.5, 18, 20, 22.5];     // px
const LHS = [1.7, 1.95, 2.2];                // line-height
const WIDTHS = [36, 44, 54];                 // rem
const S = { on: false, theme: 'auto', size: 2, lh: 1, w: 1 };

const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;

(function load() {
    try {
        const r = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!r || typeof r !== 'object') return;
        if (typeof r.on === 'boolean') S.on = r.on;
        if (THEMES.indexOf(r.theme) > -1) S.theme = r.theme;
        if (Number.isInteger(r.size) && r.size >= 0 && r.size < SIZES.length) S.size = r.size;
        if (Number.isInteger(r.lh) && r.lh >= 0 && r.lh < LHS.length) S.lh = r.lh;
        if (Number.isInteger(r.w) && r.w >= 0 && r.w < WIDTHS.length) S.w = r.w;
    } catch (e) { /* storage blocked/corrupt — defaults */ }
})();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

function barHtml() {
    const sw = (v, bn, en) => `<button type="button" class="rm-sw rm-sw-${v}" data-rm="theme" data-v="${v}" aria-pressed="${S.theme === v}" aria-label="${T(bn, en)}" title="${T(bn, en)}">${v === 'auto' ? T('অটো', 'Auto') : ''}</button>`;
    return `
    <div class="rm-bar" role="region" aria-label="${T('রিডার মোড', 'Reader mode')}">
        <button type="button" class="rm-toggle" data-rm="toggle" aria-pressed="${S.on}">
            <span aria-hidden="true">📖</span> <span>${T('রিডার মোড', 'Reader mode')}</span>
        </button>
        <div class="rm-panel">
            <div class="rm-group" role="group" aria-label="${T('রং', 'Colour')}">
                ${sw('auto', 'সাইটের থিম', 'Site theme')}${sw('paper', 'সাদা কাগজ', 'Paper')}${sw('sepia', 'সেপিয়া', 'Sepia')}${sw('night', 'রাত', 'Night')}
            </div>
            <div class="rm-group" role="group" aria-label="${T('লেখার আকার', 'Text size')}">
                <button type="button" class="rm-btn" data-rm="size-" aria-label="${T('লেখা ছোট করুন', 'Smaller text')}">A−</button>
                <span class="rm-lvl" aria-live="polite"></span>
                <button type="button" class="rm-btn" data-rm="size+" aria-label="${T('লেখা বড় করুন', 'Larger text')}">A+</button>
            </div>
            <button type="button" class="rm-btn" data-rm="lh" aria-label="${T('লাইনের ফাঁক বদলান', 'Change line spacing')}" title="${T('লাইনের ফাঁক', 'Line spacing')}">↕</button>
            <button type="button" class="rm-btn" data-rm="w" aria-label="${T('লেখার প্রস্থ বদলান', 'Change text width')}" title="${T('লেখার প্রস্থ', 'Text width')}">↔</button>
            <button type="button" class="rm-btn rm-exit" data-rm="exit">✕ ${T('বের হোন', 'Exit')}</button>
        </div>
    </div>`;
}

function clearBody() {
    const b = document.body;
    if (!b) return;
    b.classList.remove('rm-on', 'rm-t-auto', 'rm-t-paper', 'rm-t-sepia', 'rm-t-night');
}

// Apply the current settings to <body>, CSS variables and the bar. No render().
function apply() {
    const b = document.body, root = document.documentElement;
    if (!b) return;
    const onPage = typeof state !== 'undefined' && state.currentPage === 'readPost' && state.currentPost;
    if (!onPage) { clearBody(); return; }
    b.classList.toggle('rm-on', !!S.on);
    THEMES.forEach(t => b.classList.toggle('rm-t-' + t, !!S.on && S.theme === t));
    root.style.setProperty('--rm-fs', SIZES[S.size] + 'px');
    root.style.setProperty('--rm-lh', String(LHS[S.lh]));
    root.style.setProperty('--rm-w', WIDTHS[S.w] + 'rem');
    const tg = document.querySelector('.rm-toggle');
    if (tg) tg.setAttribute('aria-pressed', String(!!S.on));
    document.querySelectorAll('.rm-sw').forEach(el => el.setAttribute('aria-pressed', String(el.getAttribute('data-v') === S.theme)));
    const lv = document.querySelector('.rm-lvl');
    if (lv) lv.textContent = (typeof toBengaliDigits === 'function' && !EN() ? toBengaliDigits(SIZES[S.size]) : String(SIZES[S.size]));
}

function after() {
    const onPage = typeof state !== 'undefined' && state.currentPage === 'readPost' && state.currentPost;
    if (!onPage) { clearBody(); return; }
    const main = document.getElementById('main-content');
    const art = main && main.querySelector('article');
    if (!art) return;
    art.classList.add('rm-article');
    if (art.parentElement) art.parentElement.classList.add('rm-wrap');
    const h1 = art.querySelector('h1'); if (h1) h1.classList.add('rm-title');
    const bodyEl = art.querySelector('[style*="white-space:pre-line"]'); if (bodyEl) bodyEl.classList.add('rm-body');
    if (!main.querySelector('.rm-bar')) art.insertAdjacentHTML('beforebegin', barHtml());
    apply();
}

function act(a, v) {
    if (a === 'toggle') S.on = !S.on;
    else if (a === 'exit') S.on = false;
    else if (a === 'theme' && THEMES.indexOf(v) > -1) S.theme = v;
    else if (a === 'size+') S.size = Math.min(SIZES.length - 1, S.size + 1);
    else if (a === 'size-') S.size = Math.max(0, S.size - 1);
    else if (a === 'lh') S.lh = (S.lh + 1) % LHS.length;
    else if (a === 'w') S.w = (S.w + 1) % WIDTHS.length;
    else return;
    save();
    apply();
    if (a === 'exit') { const tg = document.querySelector('.rm-toggle'); if (tg) tg.focus(); }
}

document.addEventListener('click', e => {
    const el = e.target && e.target.closest && e.target.closest('[data-rm]');
    if (!el) return;
    try { act(el.getAttribute('data-rm'), el.getAttribute('data-v')); } catch (err) { /* never break the page */ }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body && document.body.classList.contains('rm-on')) {
        try { act('exit'); } catch (err) { /* ignore */ }
    }
});

// attach after every render()
if (typeof window.render === 'function' && !window.render.__rm) {
    const _render = window.render;
    const wrapped = function () {
        const r = _render.apply(this, arguments);
        try { after(); } catch (e) { /* a failure here must never break rendering */ }
        return r;
    };
    wrapped.__rm = true;
    window.render = wrapped;
    try { after(); } catch (e) { /* first paint already happened */ }
}

})();
