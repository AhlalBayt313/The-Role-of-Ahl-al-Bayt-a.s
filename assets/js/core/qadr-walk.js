// ============================================================================
// LAYLATUL QADR — NIGHT WALK  (v191)
// ----------------------------------------------------------------------------
// A card on the Ramadan page for the nights of 19, 21 and 23 Ramadan:
//   * the 10 ordered steps of "Maghrib to Fajr" — taken from section 12 of the
//     existing amal item `amal-laylatul-qadr` (that text is the ONLY source of
//     the step order and wording); tap a step to tick it;
//   * an "Open" button on a step only when an item for it already exists in the app;
//   * the night-specific extra amal from section 11 of the same item;
//   * Dua Jawshan al-Kabir progress inside step 6: 100 cells, one per natural
//     part (a part = the lines up to and including each "Subhanaka ..." refrain);
//     "next part" shows the lines of the first part not yet ticked.
// NOTHING here writes religious text. Step / extra / caveat wording is read from the
// amal item at run time (copies below are only an offline fallback, identical to the
// data). Items that do not exist in the app (Imam Husayn's Qadr ziyarat, Munajat
// of Imam Ali) are shown as plain steps with no link — nothing is invented.
// Saved on the device only: localStorage key `ahlbayt_qadr_walk`
//   { "<hijriYear>-9-<night>": { steps: [0..9], jawshan: [0..99] } }
// (one record per night and per year; included in the existing "ramadan" backup group).
// Wraps renderRamadanPage (already wrapped by ramadan-plus.js and iftar-invite.js);
// typeof-guarded, so a failure here can never break the page.
// Needs (all guarded): state, render, approxHijriNow, lsGet/lsSet, duas, amals,
//   ziyarats, ensureAmalContent, ensureDuaContent, window._amTimes.
// ============================================================================
(function () {
'use strict';

const KEY = 'ahlbayt_qadr_walk';
const NIGHTS = [19, 21, 23];
const AMAL_ID = 'amal-laylatul-qadr';
const JAW_ID = 'dua-jawshan-al-kabir';

const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;
const N = n => EN() ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ORD = { 19: '19th', 21: '21st', 23: '23rd' };
const nightLabel = n => EN() ? ORD[n] + ' night' : N(n) + 'তম রাত';

// Offline fallback = verbatim copy of amal-laylatul-qadr (section 12 steps, section 11 lines, the qada caveat).
const FB_STEPS = [
    'মাগরিব ও এশার নামাজ (একত্রে বা পৃথকভাবে) আদায় করুন — গোসল আগেই সেরে নিন।',
    'দুই রাকাত নামাজ (ইখলাস ৭ বার) + ৭০ বার ইস্তিগফার।',
    'কুরআন খুলে ও মাথায় রাখার আমল + ১০ বার ওসিলার দোয়া।',
    'প্রাসঙ্গিক রাতের নির্দিষ্ট দোয়া (১৯/২১/২৩) পাঠ।',
    'ইমাম হুসাইন (আ.)-এর যিয়ারত, এবং ২১তম রাতে অতিরিক্ত যিয়ারতে আমিনুল্লাহ।',
    'মুনাজাতে ইমাম আলী (আ.) ও দোয়ায়ে জওশনে কবীর।',
    'রাতের মধ্যভাগে সাধ্যমতো ১০০ রাকাত নামাজ (বিরতি দিয়ে হলেও)।',
    'রাতের শেষভাগে (সাহরির পূর্বে) দোয়ায়ে ইফতিতাহ, তাহাজ্জুদ ও দীর্ঘ সিজদা।',
    'ফজরের পূর্বে ইমাম মাহদি (আ.জ.)-এর জন্য দোয়া ও ফারাজের দোয়া।',
    'ফজরের নামাজ আদায় করে রোজা অব্যাহত রাখুন এবং দিনের বেলাতেও কুরআন তিলাওয়াত ও দান-সদকা চালিয়ে যান।'
];
const FB_EXTRA = {
    19: '১৯তম রাত বিশেষ: ১০০ বার ইস্তিগফার (আসতাগফিরুল্লাহা রব্বি ওয়া আতুবু ইলাইহ), এবং ১০০ বার আমিরুল মু\'মিনিন (আ.)-এর হত্যাকারীদের প্রতি লা\'নত — \'আল্লাহুম্মাল আন কাতালাতা আমিরিল মু\'মিনিন\'।',
    21: '২১তম রাত বিশেষ: শেষ দশ রাতের সাধারণ দোয়া এই রাত থেকে শুরু করে প্রতি রাতে পাঠ করা হয়; যিয়ারতে আমিনুল্লাহ যুক্ত করুন।',
    23: '২৩তম রাত বিশেষ: সবচেয়ে বেশি গুরুত্বপূর্ণ বিবেচিত — সূরা আনকাবুত, রূম, দুখান তিলাওয়াত, সূরা আল-কদর বারবার তিলাওয়াত, দোয়া আত-তাওবা ও দোয়া মাকারিমুল আখলাক পাঠ করুন। সাধ্যমতো সম্পূর্ণ রাত জাগ্রত থেকে ইবাদতে অতিবাহিত করার সর্বোচ্চ গুরুত্ব দেওয়া হয়েছে।'
};
const FB_QADA = 'যাদের কাযা নামাজ আছে, অনেকে এই সুযোগে ছয় দিনের কাযা নামাজ (৬ x ১৭ = ১০২ রাকাত) আদায় করে থাকেন — এটি হাদিসে সরাসরি বর্ণিত আমল নয়, তবে আলেমগণ কাযা দ্রুত আদায় করাকে উৎসাহিত করেন এবং এই রাতের ফজিলত থেকে উপকৃত হওয়ার পরামর্শ দেন।';

// Existing items an step may open (ids only; resolved against the app's own index, silently skipped if absent).
function stepLinks(i, n) {
    switch (i) {
        case 2: return [['d', 'dua-rafa-al-mushaf']];
        case 3: return [['d', 'dua-of-laylatul-qadr-' + ORD[n] + '-night']];
        case 4: return n === 21 ? [['z', 'ziyarat-amin-allah']] : [];
        case 5: return [['d', JAW_ID]];
        case 7: return [['d', 'dua-al-iftitah']];
        case 8: return [['d', 'dua-al-ahd'], ['d', 'dua-al-faraj']];
        default: return [];
    }
}
const EXTRA_LINKS = { 19: [], 21: [['z', 'ziyarat-amin-allah']], 23: [['d', 'sahifa-dua-20-makarim']] };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function arr(name) { try { const a = window[name]; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function todayH() {
    try { const h = (typeof approxHijriNow === 'function') ? approxHijriNow() : null; return h ? { d: h.day, m: h.month, y: h.year } : null; } catch (e) { return null; }
}
function atTime(dt, hm) { const x = new Date(dt); x.setHours(hm[0], hm[1], 0, 0); return x; }
function amTimesNow() {
    try { if (typeof window._amTimes === 'function' && window._amTimes()) return window._amTimes(); } catch (e) { /* none */ }
    try { const c = lsGet('ahlbayt_am_times', null); if (c && c.today && c.dk) return c; } catch (e) { /* none */ }
    return null;
}
// Same resolver idea as ramadan-plus.js: only items that already exist in the app.
function resolve(type, id) {
    try {
        if (type === 'd') { const l = arr('duas'); const i = l.findIndex(x => x && x.id === id); return i < 0 ? null : { t: l[i].titleBn, te: l[i].titleEn, action: 'readDua', param: String(i) }; }
        if (type === 'a') { const a = arr('amals').find(x => x && x.id === id); return a ? { t: a.titleBn, te: a.titleEn, action: 'readAmal', param: a.id } : null; }
        if (type === 'z') { const z = arr('ziyarats').find(x => x && x.id === id); return z ? { t: z.titleBn, te: z.titleEn, action: 'readZiyarat', param: z.id } : null; }
    } catch (e) { /* data not ready */ }
    return null;
}

// ---------------------------------------------------------------------------
// Which night is it?  Night N starts at the Maghrib that ends Hijri day N-1 and
// runs to Fajr of day N (same Maghrib rule as the 21-Ramadan mourning mode).
// The Hijri date can be off by one (moon sighting), so the card has a manual night picker.
// ---------------------------------------------------------------------------
let _manual = 0;
function nightNow() {
    const h = todayH(); if (!h || h.m !== 9) return 0;
    const t = amTimesNow(), now = new Date();
    const mg = atTime(now, (t && t.today && t.today.maghrib) ? t.today.maghrib : [18, 0]);
    const fj = atTime(now, (t && t.today && t.today.fajr) ? t.today.fajr : [5, 0]);
    for (const n of NIGHTS) {
        if (h.d === n - 1 && now >= mg) return n;
        if (h.d === n && now < fj) return n;
    }
    return 0;
}
function nextNight() {
    const h = todayH();
    if (!h) return NIGHTS[0];
    if (h.m < 9 || h.m > 9) return NIGHTS[0];
    const cur = nightNow();
    for (const n of NIGHTS) { if (cur && n <= cur) continue; if (h.d < n) return n; if (h.d === n && !cur) continue; }
    return 0;   // the three nights of this year are over
}
function activeNight() { return _manual || nightNow(); }
function nightKey(n) {
    const h = todayH(); const y = h ? (h.m > 9 ? h.y + 1 : h.y) : 0;
    return y + '-9-' + n;
}

// ---------------------------------------------------------------------------
// Saved progress (device only)
// ---------------------------------------------------------------------------
function loadAll() { try { const o = lsGet(KEY, null); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch (e) { return {}; } }
function ints(a, max) { return Array.isArray(a) ? a.filter(x => Number.isInteger(x) && x >= 0 && x < max) : []; }
function rec(n) {
    const o = loadAll()[nightKey(n)];
    return { steps: ints(o && o.steps, 10), jawshan: ints(o && o.jawshan, 100) };
}
function saveRec(n, r) {
    try {
        const all = loadAll();
        all[nightKey(n)] = { steps: Array.from(new Set(r.steps)).sort((a, b) => a - b), jawshan: Array.from(new Set(r.jawshan)).sort((a, b) => a - b) };
        lsSet(KEY, all);
    } catch (e) { /* best effort */ }
}
function toggle(list, i) { const k = list.indexOf(i); if (k >= 0) list.splice(k, 1); else list.push(i); }

// ---------------------------------------------------------------------------
// Data read from the amal item and the Jawshan dua (lazy-loaded by the app's own loaders)
// ---------------------------------------------------------------------------
let _steps = FB_STEPS.slice(), _extra = Object.assign({}, FB_EXTRA), _qada = FB_QADA, _amalAsked = false;
let _parts = null, _jawAsked = false, _jawFail = false, _jRead = null, _open6 = false;

function parseAmal(it) {
    if (!it || !Array.isArray(it.verses)) return;
    const bn = it.verses.map(v => (v && typeof v.bn === 'string') ? v.bn : '');
    const h12 = bn.findIndex(s => s.indexOf('◆ ১২.') === 0);
    if (h12 >= 0 && bn[h12 + 1]) {
        const lines = bn[h12 + 1].split('\n').map(s => s.replace(/^[১২৩৪৫৬৭৮৯০0-9]+\.\s*/, '').trim()).filter(Boolean);
        if (lines.length === 10) _steps = lines;
    }
    NIGHTS.forEach(n => {
        const p = N(n) + 'তম রাত বিশেষ';
        const s = bn.find(x => x.indexOf(p) === 0);
        if (s) _extra[n] = s;
    });
    const q = bn.find(s => s.indexOf('যাদের কাযা নামাজ আছে') === 0);
    if (q) _qada = q;
}
function ensureAmal() {
    if (_amalAsked || typeof ensureAmalContent !== 'function') return;
    _amalAsked = true;
    try { Promise.resolve(ensureAmalContent(AMAL_ID)).then(it => { parseAmal(it); repaint(); }, () => { _amalAsked = false; }); } catch (e) { _amalAsked = false; }
}
const norm = s => String(s || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[إأآٱ]/g, 'ا');
const REFRAIN = 'سبحانك يا لا اله الا انت';
function buildParts(verses) {
    const idx = [];
    verses.forEach((v, i) => { if (v && norm(v.ar).indexOf(REFRAIN) === 0) idx.push(i); });
    if (!idx.length) return null;
    const parts = []; let from = 0;
    idx.forEach((c, k) => { const to = (k === idx.length - 1) ? verses.length - 1 : c; parts.push({ from: from, to: to }); from = c + 1; });
    return parts;
}
function jawVerses() {
    const d = arr('duas').find(x => x && x.id === JAW_ID);
    return d && d.hasFullData && Array.isArray(d.verses) ? d.verses : null;
}
function ensureJaw() {
    const v = jawVerses();
    if (v) { if (!_parts) _parts = buildParts(v); return; }
    if (_jawAsked || typeof ensureDuaContent !== 'function') return;
    _jawAsked = true; _jawFail = false;
    try {
        Promise.resolve(ensureDuaContent(JAW_ID)).then(() => { const vv = jawVerses(); if (vv) _parts = buildParts(vv); else _jawFail = true; repaint(); },
            () => { _jawFail = true; _jawAsked = false; repaint(); });
    } catch (e) { _jawFail = true; _jawAsked = false; }
}
const jawCount = () => (_parts && _parts.length) || 100;

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function openBtn(r) {
    const ti = (EN() ? (r.te || r.t) : (r.t || r.te)) || '';
    return `<button type="button" class="am-btn qw-open" data-action="${r.action}" data-param="${E(r.param)}">${T('খুলুন', 'Open')}: ${E(ti)}</button>`;
}
function linksHtml(list) {
    const b = list.map(x => resolve(x[0], x[1])).filter(Boolean).map(openBtn).join('');
    return b ? `<div class="qw-links">${b}</div>` : '';
}
function nightChips(sel) {
    return NIGHTS.map(n => `<button type="button" class="am-btn qw-chip${sel === n ? ' qw-on' : ''}" data-qw-act="night" data-qw-n="${n}" aria-pressed="${sel === n}">${nightLabel(n)}</button>`).join('');
}
function jawPanel(r) {
    const total = jawCount(), done = r.jawshan.length;
    let h = `<div class="qw-jaw"><button type="button" class="am-btn qw-jtoggle" data-qw-act="jtoggle" aria-expanded="${_open6}">${T('জওশন কবীরের অগ্রগতি', 'Jawshan al-Kabir progress')}: ${N(done)}/${N(total)}</button>`;
    if (_open6) {
        h += `<p class="am-note">${T('প্রতিটি ঘর একটি ভাগ (প্রতিবার “সুবহানাকা…” ধুয়া পর্যন্ত)। ঘরে চাপলে ভাগটি চিহ্নিত/খালি হয়।', 'Each cell is one part (up to each “Subhanaka…” refrain). Tap a cell to mark / unmark it.')}</p>`;
        h += `<div class="qw-grid" role="group" aria-label="${E(T('জওশন কবীরের ভাগ', 'Jawshan al-Kabir parts'))}">`;
        for (let i = 0; i < total; i++) {
            const on = r.jawshan.indexOf(i) >= 0;
            h += `<button type="button" class="qw-cell${on ? ' qw-done' : ''}${_jRead === i ? ' qw-cur' : ''}" data-qw-act="jcell" data-qw-i="${i}" aria-pressed="${on}" aria-label="${E(T('ভাগ ', 'Part ') + N(i + 1))}">${N(i + 1)}</button>`;
        }
        h += `</div><div class="am-actions"><button type="button" class="am-btn" data-qw-act="jnext">${T('পরবর্তী ভাগ দেখুন', 'Show next part')}</button></div>`;
        if (_jRead !== null) {
            const v = jawVerses();
            if (v && _parts && _parts[_jRead]) {
                const p = _parts[_jRead];
                h += `<div class="qw-read" id="qw-read"><h4>${T('ভাগ', 'Part')} ${N(_jRead + 1)}/${N(total)}</h4>`;
                for (let k = p.from; k <= p.to; k++) {
                    const ln = v[k]; if (!ln) continue;
                    if (ln.ar) h += `<p class="arabic-text qw-ar" dir="rtl" lang="ar">${E(ln.ar)}</p>`;
                    const m = EN() ? (ln.en || ln.bn) : (ln.bn || ln.en);
                    if (m) h += `<p class="qw-bn">${E(m)}</p>`;
                }
                h += `<div class="am-actions"><button type="button" class="am-btn" data-qw-act="jdone">${T('এই ভাগ পড়া হলো ✓', 'Mark this part read ✓')}</button><button type="button" class="am-btn" data-qw-act="jclose">${T('বন্ধ করুন', 'Close')}</button></div></div>`;
            } else if (_jawFail) {
                h += `<p class="am-note">${T('দোয়ার লাইন লোড করা যায়নি। দোয়াটি খুলে পড়ুন — ঘর চিহ্নিত করা তবুও চলবে।', 'Could not load the lines. Open the dua to read — you can still mark cells.')}</p>`;
            } else {
                h += `<p class="am-note" aria-live="polite">${T('লাইনগুলো লোড হচ্ছে…', 'Loading the lines…')}</p>`;
            }
        }
    }
    return h + '</div>';
}
function fullHtml(n) {
    const r = rec(n), done = r.steps.length;
    let h = `<h3>🌙 ${T('শবে কদরের ধাপ', 'Qadr night steps')} — ${nightLabel(n)}</h3>
        <p class="am-sub qw-sub">${T('মাগরিব থেকে ফজর', 'Maghrib to Fajr')} · ${N(done)}/${N(10)} ${T('ধাপ', 'steps')}</p>
        <div class="qw-bar" role="progressbar" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${done}"><i style="width:${done * 10}%"></i></div>`;
    if (EN()) h += `<p class="am-note">${E('The step wording is shown in Bengali, exactly as in the “Laylatul Qadr amal” item.')}</p>`;
    h += '<ol class="qw-steps">';
    _steps.forEach((txt, i) => {
        const on = r.steps.indexOf(i) >= 0;
        h += `<li class="qw-li"><button type="button" class="qw-step${on ? ' qw-done' : ''}" role="checkbox" aria-checked="${on}" data-qw-act="step" data-qw-i="${i}"><span class="qw-box" aria-hidden="true">${on ? '✓' : ''}</span><span class="qw-tx"><b>${T('ধাপ', 'Step')} ${N(i + 1)}</b> ${E(txt)}</span></button>${linksHtml(stepLinks(i, n))}`;
        if (i === 5) h += jawPanel(r);
        if (i === 6) h += `<p class="am-note qw-caveat">${E(_qada)}</p>`;
        h += '</li>';
    });
    h += '</ol>';
    h += `<div class="qw-extra"><h4>${T('এই রাতের বিশেষ আমল', 'Extra for this night')}</h4><p>${E(_extra[n] || '')}</p>${linksHtml(EXTRA_LINKS[n] || [])}</div>`;
    h += `<div class="qw-switch"><span class="am-note">${T('ভুল রাত? বদলান:', 'Wrong night? Switch:')}</span><div class="am-actions">${nightChips(n)}${_manual ? `<button type="button" class="am-btn" data-qw-act="auto">${T('সময় অনুযায়ী', 'By time')}</button>` : ''}</div></div>`;
    h += `<p class="am-note">${T('রাতের হিসাব হিজরি তারিখ ও আজকের মাগরিবের সময় থেকে নেওয়া — চাঁদ দেখার সমন্বয়ে একদিন এদিক-ওদিক হতে পারে। অগ্রগতি শুধু এই ডিভাইসে থাকে।', 'The night is worked out from the Hijri date and today’s Maghrib — it can be a day off with moon-sighting adjustments. Progress stays on this device only.')}</p>`;
    return h;
}
function previewHtml() {
    const nx = nextNight();
    const line = nx ? T('পরবর্তী শবে কদর: ', 'Next Qadr night: ') + nightLabel(nx) : T('এ বছরের ১৯/২১/২৩ রাত শেষ।', 'This year’s 19/21/23 nights have passed.');
    return `<h3>🌙 ${T('শবে কদরের ধাপ', 'Qadr night steps')}</h3>
        <p class="qw-next">${line}</p>
        <p class="am-note">${T('১৯, ২১ ও ২৩ রমজানের রাতে মাগরিব থেকে ফজর পর্যন্ত ধাপগুলো এখানে আসবে। চাইলে এখনই কোনো রাত বেছে দেখুন:', 'On the nights of 19, 21 and 23 Ramadan the Maghrib-to-Fajr steps appear here. You can also pick a night now:')}</p>
        <div class="am-actions">${nightChips(0)}</div>`;
}
function inner() { const n = activeNight(); return n ? fullHtml(n) : previewHtml(); }
function section(d) { return `<section class="am-card qw-card${d ? ' am-d' : ''}" id="qw-sec" aria-label="${E(T('শবে কদরের রাতের ধাপ', 'Laylatul Qadr night steps'))}">${inner()}</section>`; }

let _lastN = null;
function repaint() {
    const el = document.getElementById('qw-sec'); if (!el) return;
    try { el.innerHTML = inner(); } catch (e) { /* keep the old content */ }
}
function repaintKeepFocus(sel) {
    repaint();
    if (sel) { const f = document.querySelector('#qw-sec ' + sel); if (f && f.focus) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
}

// ---------------------------------------------------------------------------
// Hook into the Ramadan page (additive wrapper)
// ---------------------------------------------------------------------------
const _prev = window.renderRamadanPage;
if (typeof _prev === 'function') {
    window.renderRamadanPage = function () {
        let html = _prev.apply(this, arguments);
        if (typeof html !== 'string' || html.indexOf('id="am-root"') < 0) return html;
        try {
            const d = !!state.darkMode;
            let at = -1;
            const r = html.indexOf('id="rp-ring"');
            if (r >= 0) { const e = html.indexOf('</section>', r); if (e >= 0) at = e + 10; }
            if (at < 0) { const g = html.indexOf('class="am-grid"'); at = g >= 0 ? html.lastIndexOf('<section', g) : html.lastIndexOf('</div>'); }
            html = html.slice(0, at) + section(d) + html.slice(at);
            _lastN = activeNight();
            setTimeout(() => { if (document.getElementById('qw-sec')) { if (activeNight()) ensureAmal(); if (_open6 && activeNight()) ensureJaw(); } }, 0);
        } catch (e) { /* never break the page */ }
        return html;
    };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function nextUndone(list, total, from) {
    for (let k = 0; k < total; k++) { const i = (from + k) % total; if (list.indexOf(i) < 0) return i; }
    return null;
}
document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-qw-act]');
    if (!el || !document.getElementById('qw-sec') || !document.getElementById('qw-sec').contains(el)) return;
    const a = el.getAttribute('data-qw-act'), i = parseInt(el.getAttribute('data-qw-i'), 10);
    const n = activeNight();
    let focus = '';
    if (a === 'night') {
        const v = parseInt(el.getAttribute('data-qw-n'), 10);
        if (NIGHTS.indexOf(v) < 0) return;
        _manual = v; _jRead = null; ensureAmal();
        focus = '.qw-chip[data-qw-n="' + v + '"]';
    } else if (a === 'auto') { _manual = 0; _jRead = null; }
    else if (!n) return;
    else if (a === 'step' && i >= 0 && i < 10) { const r = rec(n); toggle(r.steps, i); saveRec(n, r); focus = '[data-qw-act="step"][data-qw-i="' + i + '"]'; }
    else if (a === 'jtoggle') { _open6 = !_open6; if (_open6) ensureJaw(); focus = '[data-qw-act="jtoggle"]'; }
    else if (a === 'jcell' && i >= 0 && i < jawCount()) { const r = rec(n); toggle(r.jawshan, i); saveRec(n, r); focus = '[data-qw-act="jcell"][data-qw-i="' + i + '"]'; }
    else if (a === 'jnext') {
        const r = rec(n); _jRead = nextUndone(r.jawshan, jawCount(), _jRead === null ? 0 : _jRead);
        ensureJaw(); focus = '[data-qw-act="jnext"]';
    } else if (a === 'jdone') {
        if (_jRead === null) return;
        const r = rec(n); if (r.jawshan.indexOf(_jRead) < 0) r.jawshan.push(_jRead); saveRec(n, r);
        _jRead = nextUndone(r.jawshan, jawCount(), _jRead + 1); focus = '[data-qw-act="jnext"]';
    } else if (a === 'jclose') { _jRead = null; focus = '[data-qw-act="jnext"]'; }
    else return;
    repaintKeepFocus(focus);
});
// The night can flip while the page is open (Maghrib / Fajr) — repaint when it does.
function tick() {
    if (_manual || !document.getElementById('qw-sec')) return;
    const n = nightNow();
    if (n !== _lastN) { _lastN = n; repaint(); if (n) ensureAmal(); }
}
document.addEventListener('am:times', tick);
setInterval(tick, 60000);

// test hooks (pure)
window._qwNightNow = nightNow; window._qwBuildParts = buildParts; window._qwParseAmal = parseAmal;
window._qwSteps = () => _steps.slice(); window._qwExtra = () => Object.assign({}, _extra);
})();
