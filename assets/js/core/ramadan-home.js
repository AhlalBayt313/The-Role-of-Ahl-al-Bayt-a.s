// ============================================================================
// RAMADAN HOME — v194
// ----------------------------------------------------------------------------
// 1. IFTAR / SEHRI COUNTDOWN ON THE HOME PAGE (during Ramadan only)
//    A small card on top of "Today's Amal": today's end-of-sehri (Fajr) and
//    iftar (Maghrib) times and a live countdown to the next one. Times come
//    from the SAME source as Ramadan mode (daily-amal.js → amLoadTimes, which
//    uses the user's saved location + calculation method and falls back to
//    today's saved times when offline). It never shows yesterday's or invented
//    times: if today's times are unavailable the card says so and offers a
//    button to open Ramadan mode.
// 2. MULTI-YEAR FASTING HISTORY
//    The fasting tracker (daily-amal.js, key 'ahlbayt_ramadan') holds ONE year
//    and starts afresh when a new Ramadan's first day is ticked. This module
//    archives every year to 'ahlbayt_ramadan_hist' ({year: {d: [days]}}) — at
//    boot, on each home/Ramadan render, and in a capture-phase click listener
//    that runs BEFORE the tracker's own handler, so the previous year is saved
//    before it can be replaced. A card on the Ramadan page lists the years
//    (fasted X of 30, a 30-dot strip). The tracker itself is never written.
// Everything stays on this device (included in the Ramadan backup group).
// Wraps todayAmalCard and renderRamadanPage; typeof-guarded; never breaks a page.
// ============================================================================
(function () {
'use strict';

const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;
const N = n => EN() ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const HIST_KEY = 'ahlbayt_ramadan_hist';
const RETRY_MS = 5 * 60 * 1000;

function todayH() {
    try { const h = (typeof approxHijriNow === 'function') ? approxHijriNow() : null; return h ? { d: h.day, m: h.month, y: h.year } : null; } catch (e) { return null; }
}
const inRamadan = () => { const h = todayH(); return !!h && h.m === 9; };
const dateKey = dt => dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();   // same format as daily-amal.js
function atTime(dt, hm) { const x = new Date(dt); x.setHours(hm[0], hm[1], 0, 0); return x; }

// ---------------------------------------------------------------------------
// 1. Times and countdown
// ---------------------------------------------------------------------------
let _t = null, _tState = 'idle', _lastTry = 0, _timer = null;

function validTimes(t) {
    return !!(t && t.today && t.today.fajr && t.today.maghrib && t.tomorrow && t.tomorrow.fajr && t.dk === dateKey(new Date()));
}
function curTimes() {
    try { if (typeof window._amTimes === 'function') { const a = window._amTimes(); if (validTimes(a)) return a; } } catch (e) { /* fall through */ }
    return (_tState === 'ok' && validTimes(_t)) ? _t : null;
}
function loadTimes() {
    if (_tState === 'loading') return;
    if (typeof window._amLoadTimes !== 'function') { _tState = 'fail'; return; }
    _tState = 'loading'; _lastTry = Date.now();
    let p; try { p = window._amLoadTimes(); } catch (e) { _tState = 'fail'; return; }
    Promise.resolve(p).then(t => { _t = t; _tState = validTimes(t) ? 'ok' : 'fail'; repaintBox(); })
        .catch(() => { _tState = 'fail'; repaintBox(); });
}
function ensureLoaded() { if (!curTimes() && _tState !== 'loading' && Date.now() - _lastTry > 1000) loadTimes(); }

function nextTarget(t, now) {
    const f = atTime(now, t.today.fajr), mg = atTime(now, t.today.maghrib);
    if (now < f) return { at: f, label: T('সেহরির শেষ সময় (ফজর) পর্যন্ত বাকি', 'Until the end of sehri (Fajr)') };
    if (now < mg) return { at: mg, label: T('ইফতার (মাগরিব) পর্যন্ত বাকি', 'Until iftar (Maghrib)') };
    const tm = new Date(now); tm.setDate(tm.getDate() + 1);
    return { at: atTime(tm, t.tomorrow.fajr), label: T('আগামীকাল সেহরির শেষ সময় (ফজর) পর্যন্ত বাকি', 'Until tomorrow’s end of sehri (Fajr)') };
}
function fmt(hm) { let h = hm[0]; const m = hm[1], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return N(h) + ':' + N(String(m).padStart(2, '0')) + ' ' + ap; }
function dur(ms) {
    let s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    return N(String(h).padStart(2, '0')) + ':' + N(String(m).padStart(2, '0')) + ':' + N(String(s).padStart(2, '0'));
}
function boxInner() {
    const t = curTimes();
    if (!t) {
        const msg = _tState === 'loading' || _tState === 'idle'
            ? T('আজকের সেহরি-ইফতারের সময় আনা হচ্ছে…', 'Loading today’s sehri and iftar times…')
            : T('আজকের সময় আনা যায়নি (ইন্টারনেট বা অবস্থান)। রমজান পেজ খুলে সময় আনুন।', 'Today’s times could not be loaded (network or location). Open the Ramadan page to load them.');
        return `<h3>🌙 ${T('ইফতার ও সেহরির সময়', 'Iftar and sehri times')}</h3><p class="am-note">${msg}</p>
            <div class="am-actions"><button type="button" class="am-btn" data-action="changePage" data-param="ramadan">🌙 ${T('রমজান খুলুন', 'Open Ramadan')}</button></div>`;
    }
    const nt = nextTarget(t, new Date());
    return `<h3>🌙 ${T('ইফতার ও সেহরির সময়', 'Iftar and sehri times')}</h3>
        <div class="am-times"><div><small>${T('সেহরির শেষ (ফজর)', 'End of sehri (Fajr)')}</small><b>${fmt(t.today.fajr)}</b></div><div><small>${T('ইফতার (মাগরিব)', 'Iftar (Maghrib)')}</small><b>${fmt(t.today.maghrib)}</b></div></div>
        <div class="am-cd"><span id="rh-cd-l">${E(nt.label)}</span><b id="rh-cd">${dur(nt.at - new Date())}</b></div>
        ${t.live ? '' : `<p class="am-note">${T('অফলাইন — আজকের সংরক্ষিত সময় দেখানো হচ্ছে।', 'Offline — showing today’s saved times.')}</p>`}`;
}
function boxHtml(d) { return `<section class="am-card rh-card${d ? ' am-d' : ''}" id="rh-box" aria-live="off">${boxInner()}</section>`; }
function repaintBox() { const b = (typeof document !== 'undefined') ? document.getElementById('rh-box') : null; if (b) b.innerHTML = boxInner(); }
function tick() {
    const box = document.getElementById('rh-box');
    if (!box) { clearInterval(_timer); _timer = null; return; }
    const t = curTimes();
    if (!t) { if (_tState !== 'loading' && Date.now() - _lastTry > RETRY_MS) loadTimes(); return; }
    const cd = document.getElementById('rh-cd');
    if (!cd) { repaintBox(); return; }                       // times arrived while the "no times" text was showing
    const nt = nextTarget(t, new Date()), lb = document.getElementById('rh-cd-l');
    cd.textContent = dur(nt.at - new Date()); if (lb) lb.textContent = nt.label;
}
function startTick() { if (_timer) return; _timer = setInterval(tick, 1000); }

// ---------------------------------------------------------------------------
// 2. Multi-year history
// ---------------------------------------------------------------------------
function cleanDays(a) { return Array.isArray(a) ? Array.from(new Set(a.filter(n => Number.isInteger(n) && n >= 1 && n <= 30))).sort((x, y) => x - y) : []; }
function hLoad() {
    let raw = null; try { raw = (typeof lsGet === 'function') ? lsGet(HIST_KEY, null) : null; } catch (e) { raw = null; }
    const out = {};
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) Object.keys(raw).forEach(k => {
        const y = parseInt(k, 10); if (!Number.isInteger(y) || y < 1400 || y > 1600 || String(y) !== k) return;
        const d = cleanDays(raw[k] && raw[k].d); if (d.length) out[k] = { d: d };
    });
    return out;
}
function hSave(h) { try { if (typeof lsSet === 'function') lsSet(HIST_KEY, h); } catch (e) { /* best effort */ } }
function snapshot() {
    try {
        const s = (typeof window._amTrackLoad === 'function') ? window._amTrackLoad() : null;
        if (!s || !s.y) return;
        const days = cleanDays(Object.keys(s.d || {}).map(Number));
        const h = hLoad(), k = String(s.y), prev = h[k] ? JSON.stringify(h[k].d) : null;
        if (!days.length) { if (prev) { delete h[k]; hSave(h); } return; }      // every tick removed → nothing to archive
        if (prev === JSON.stringify(days)) return;
        h[k] = { d: days }; hSave(h);
    } catch (e) { /* never break the page */ }
}
function trackerYear() { try { const s = window._amTrackLoad(); return s && s.y ? s.y : 0; } catch (e) { return 0; } }
function histInner() {
    const h = hLoad(), years = Object.keys(h).map(Number).sort((a, b) => b - a), cur = todayH(), ty = trackerYear();
    const rows = years.map(y => {
        const d = h[String(y)].d, on = new Set(d);
        const finished = !!cur && (y < cur.y || (y === cur.y && cur.m > 9)), ongoing = !!cur && y === cur.y && cur.m === 9;
        const dots = Array.from({ length: 30 }, (_, i) => `<i class="${on.has(i + 1) ? 'on' : ''}" aria-hidden="true"></i>`).join('');
        const status = ongoing ? T('চলমান', 'ongoing') : (finished ? `${T('বাদ', 'missed')} ${N(30 - d.length)}` : '');
        const del = y === ty ? '' : `<button type="button" class="am-btn rh-mini" data-rh-act="del" data-rh-y="${y}" aria-label="${E(T('এই বছরের রেকর্ড মুছুন', 'Delete this year'))}">${T('মুছুন', 'Delete')}</button>`;
        return `<li class="rh-year"><div class="rh-yh"><b>${N(y)} ${T('হিজরি', 'AH')}</b><span>${T('রোজা রাখা', 'Fasted')} <b>${N(d.length)}</b> / ${N(30)}${status ? ' · ' + E(status) : ''}</span>${del}</div><div class="rh-dots" role="img" aria-label="${E(T('রোজা রাখা ' + d.length + ' দিন', d.length + ' days fasted'))}">${dots}</div></li>`;
    }).join('');
    return `<h3>📅 ${T('পূর্বের বছরগুলোর রোজা', 'Fasting history by year')}</h3>
        <ul class="rh-list">${rows}</ul>
        <p class="am-note">${T('ট্র্যাকারের হিসাব বছর-ভিত্তিক জমা হয়; মাস ৩০ দিন ধরা — ২৯ দিনের মাসে "বাদ" এক বেশি দেখাতে পারে। শুধু আপনার ডিভাইসে থাকে।', 'Tracker results are archived per year; the month is counted as 30 days, so "missed" may show one extra for a 29-day month. Kept on this device only.')}</p>`;
}
function histHtml(d) { return `<section class="am-card rh-card${d ? ' am-d' : ''}" id="rh-hist">${histInner()}</section>`; }
function repaintHist() { const r = (typeof document !== 'undefined') ? document.getElementById('rh-hist') : null; if (r) r.innerHTML = histInner(); }

// ---------------------------------------------------------------------------
// Hooks (additive wrappers)
// ---------------------------------------------------------------------------
if (typeof window.todayAmalCard === 'function') {
    const _origCard = window.todayAmalCard;
    window.todayAmalCard = function () {
        let html = _origCard.apply(this, arguments);
        try {
            snapshot();
            if (inRamadan()) { html = boxHtml(!!state.darkMode) + (html || ''); setTimeout(() => { ensureLoaded(); startTick(); }, 0); }
        } catch (e) { /* keep original */ }
        return html;
    };
}
if (typeof window.renderRamadanPage === 'function') {
    const _origPage = window.renderRamadanPage;
    window.renderRamadanPage = function () {
        let html = _origPage.apply(this, arguments);
        if (typeof html !== 'string' || html.indexOf('id="am-root"') < 0) return html;
        try {
            snapshot();
            if (!Object.keys(hLoad()).length) return html;
            let at = -1;
            const q = html.indexOf('id="qf-root"'), j = html.indexOf('id="rj-sec"');
            if (q >= 0) at = html.lastIndexOf('<section', q);
            else if (j >= 0) at = html.lastIndexOf('<section', j);
            else at = html.lastIndexOf('</div>');
            if (at < 0) return html;
            html = html.slice(0, at) + histHtml(!!state.darkMode) + html.slice(at);
        } catch (e) { /* never break the page */ }
        return html;
    };
}
if (typeof document !== 'undefined') {
    // runs BEFORE the tracker's own handler (capture phase): archive the year about to be replaced
    document.addEventListener('click', ev => {
        const el = ev.target && ev.target.closest ? ev.target.closest('[data-am-act="day"]') : null;
        if (el) snapshot();
    }, true);
    document.addEventListener('click', ev => {
        const el = ev.target && ev.target.closest ? ev.target.closest('[data-rh-act]') : null;
        if (!el || !document.getElementById('rh-hist')) return;
        if (el.getAttribute('data-rh-act') !== 'del') return;
        const y = parseInt(el.getAttribute('data-rh-y'), 10), h = hLoad();
        if (!h[String(y)] || y === trackerYear()) return;
        if (typeof confirm === 'function' && !confirm(T('এই বছরের রোজার রেকর্ড মুছে ফেলবেন?', 'Delete this year’s fasting record?'))) return;
        delete h[String(y)]; hSave(h); repaintHist();
    });
    const boot = () => { snapshot(); if (inRamadan()) ensureLoaded(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
}

// test hooks (pure / read-only)
window._rh = { nextTarget: nextTarget, validTimes: validTimes, snapshot: snapshot, hLoad: hLoad, boxInner: boxInner, histInner: histInner, curTimes: curTimes, dur: dur, reset: function () { _t = null; _tState = 'idle'; _lastTry = 0; } };
})();
