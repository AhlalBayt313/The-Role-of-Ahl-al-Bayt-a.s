// ============================================================================
// RAMADAN JOURNAL + "MY RAMADAN" CARD — v192
// ----------------------------------------------------------------------------
// Two sections at the end of the Ramadan page:
//   1. Journal — one short line per night (a niyyah / intention or a gratitude), written
//      by the user, kept on the device only (localStorage `ahlbayt_ramadan_journal`,
//      { "<hijriYear>": { "<night 1-30>": { t: "text", k: "n"|"g" } } }).
//   2. "My Ramadan <year>" card — a picture (canvas PNG) with the numbers from what the
//      user already marked: fasts kept (fasting tracker), journal lines written,
//      Qadr nights with ticked steps (qadr-walk.js). Sharing is optional (Web Share /
//      download); the card carries the app's title + address. The journal text is NOT on
//      the card unless the user ticks "add one journal line" and picks which one.
// No religious text is written here — only UI wording; every line in the journal is the
// user's own. Nothing is sent anywhere.
// Wraps renderRamadanPage (already wrapped by ramadan-plus / iftar-invite / qadr-walk);
// typeof-guarded, so a failure here can never break the page.
// Reads (guarded): lsGet/lsSet, approxHijriNow, getHijriMonthDays, window._amTimes,
//   keys ahlbayt_ramadan (daily-amal.js) and ahlbayt_qadr_walk (qadr-walk.js).
// ============================================================================
(function () {
'use strict';

const JKEY = 'ahlbayt_ramadan_journal';
const FASTS_KEY = 'ahlbayt_ramadan';
const QADR_KEY = 'ahlbayt_qadr_walk';
const MAX_LEN = 160;
const APP_TITLE = 'The Role of Ahl al-Bayt (a.s)';   // same title as the splash screen
const APP_HOST = 'ahlalbayt313.github.io';
const FONT = (window._rcArt && window._rcArt.FONT) || '"Noto Serif Bengali","Hind Siliguri","Noto Sans Bengali",Georgia,serif';   // v200: bundled font from ramadan-cardart.js

const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;
const N = n => EN() ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kindName = k => k === 'g' ? T('কৃতজ্ঞতা', 'Gratitude') : T('নিয়ত', 'Intention');

let _sel = 0, _kind = 'n', _all = false, _raf = 0, _msg = '';

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------
function todayH() {
    try { const h = (typeof approxHijriNow === 'function') ? approxHijriNow() : null; return h ? { d: h.day, m: h.month, y: h.year } : null; } catch (e) { return null; }
}
function atTime(dt, hm) { const x = new Date(dt); x.setHours(hm[0], hm[1], 0, 0); return x; }
function maghribToday() {
    try {
        const t = (typeof window._amTimes === 'function') ? window._amTimes() : null;
        if (t && t.today && t.today.maghrib) return t.today.maghrib;
    } catch (e) { /* none */ }
    try { const c = lsGet('ahlbayt_am_times', null); if (c && c.today && c.today.maghrib) return c.today.maghrib; } catch (e) { /* none */ }
    return [18, 0];
}
// The Ramadan being looked at: the current one, and the same year after it ends (same rule as the fasting tracker).
function trackYear(h) { return h.m >= 9 ? h.y : h.y - 1; }
// Night number: a Ramadan night begins at the Maghrib that ends the previous day.
function currentNight(h) {
    if (!h || h.m !== 9) return 0;
    const now = new Date();
    const n = now >= atTime(now, maghribToday()) ? h.d + 1 : h.d;
    return Math.max(1, Math.min(30, n));
}

// ---------------------------------------------------------------------------
// Storage (device only)
// ---------------------------------------------------------------------------
function loadAll() { try { const o = lsGet(JKEY, null); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch (e) { return {}; } }
function yearEntries(y) {
    const raw = loadAll()[String(y)], out = {};
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (let i = 1; i <= 30; i++) {
            const e = raw[String(i)];
            if (e && typeof e.t === 'string' && e.t.trim()) out[i] = { t: e.t.slice(0, MAX_LEN), k: e.k === 'g' ? 'g' : 'n' };
        }
    }
    return out;
}
function saveEntry(y, n, text, kind) {
    try {
        const all = loadAll(), ys = String(y);
        const cur = (all[ys] && typeof all[ys] === 'object' && !Array.isArray(all[ys])) ? all[ys] : {};
        if (text) cur[String(n)] = { t: text.slice(0, MAX_LEN), k: kind === 'g' ? 'g' : 'n' }; else delete cur[String(n)];
        all[ys] = cur;
        Object.keys(all).sort().slice(0, Math.max(0, Object.keys(all).length - 5)).forEach(k => { delete all[k]; });   // keep the last 5 years
        lsSet(JKEY, all);
        return true;
    } catch (e) { return false; }
}
function fastsInfo(h) {
    const y = trackYear(h); let kept = 0;
    try {
        const raw = lsGet(FASTS_KEY, null);
        if (raw && Number(raw.y) === y && raw.d && typeof raw.d === 'object') for (let i = 1; i <= 30; i++) if (raw.d[String(i)] === true) kept++;
    } catch (e) { /* none */ }
    const passed = h.m === 9 ? h.d : (h.m > 9 ? 30 : 0);
    return { kept: kept, of: Math.min(30, passed) };
}
function qadrNights(h) {
    const y = trackYear(h); let c = 0;
    try {
        const all = lsGet(QADR_KEY, null);
        if (all && typeof all === 'object') [19, 21, 23].forEach(n => { const r = all[y + '-9-' + n]; if (r && Array.isArray(r.steps) && r.steps.length) c++; });
    } catch (e) { /* none */ }
    return c;
}
function stats() {
    const h = todayH(); if (!h) return null;
    const y = trackYear(h), f = fastsInfo(h), ent = yearEntries(y);
    return { year: y, fasts: f.kept, fastsOf: f.of, lines: Object.keys(ent).length, qadr: qadrNights(h), entries: ent };
}

// ---------------------------------------------------------------------------
// Journal section
// ---------------------------------------------------------------------------
function journalInner() {
    const h = todayH(); if (!h) return '';
    const y = trackYear(h), ent = yearEntries(y), cur = currentNight(h), inRam = h.m === 9;
    const keys = Object.keys(ent).map(Number).sort((a, b) => b - a);
    let s = `<h3>📓 ${T('রমজানের জার্নাল', 'Ramadan journal')}</h3>
        <p class="am-note">${T('প্রতি রাতে এক লাইন — নিয়ত বা কৃতজ্ঞতা। লেখা শুধু আপনার ডিভাইসে থাকে, কোথাও যায় না।', 'One line a night — an intention or something you are grateful for. It stays on your device only.')}</p>`;
    if (inRam) {
        if (!_sel || _sel > cur) { _sel = cur; if (ent[_sel]) _kind = ent[_sel].k; }
        let opts = '';
        for (let i = cur; i >= 1; i--) opts += `<option value="${i}"${i === _sel ? ' selected' : ''}>${T('রাত', 'Night')} ${N(i)}${ent[i] ? ' ✓' : ''}</option>`;
        s += `<div class="rj-row">
            <label class="rj-f"><span>${T('কোন রাত', 'Which night')}</span><select id="rj-night" class="rp-input">${opts}</select></label>
            <div class="rj-kinds" role="group" aria-label="${E(T('ধরন', 'Type'))}">
                <button type="button" class="am-btn rj-k${_kind === 'n' ? ' rj-on' : ''}" data-rj-act="kind" data-rj-k="n" aria-pressed="${_kind === 'n'}">${T('নিয়ত', 'Intention')}</button>
                <button type="button" class="am-btn rj-k${_kind === 'g' ? ' rj-on' : ''}" data-rj-act="kind" data-rj-k="g" aria-pressed="${_kind === 'g'}">${T('কৃতজ্ঞতা', 'Gratitude')}</button>
            </div></div>
            <label class="rj-f"><span>${T('এক লাইন', 'One line')} (${N(MAX_LEN)} ${T('অক্ষর পর্যন্ত', 'characters max')})</span><input id="rj-text" class="rp-input" type="text" maxlength="${MAX_LEN}" autocomplete="off"></label>
            <div class="am-actions"><button type="button" class="am-btn" data-rj-act="save">${T('সংরক্ষণ', 'Save')}</button><button type="button" class="am-btn" data-rj-act="clear">${T('এই রাতের লাইন মুছুন', 'Delete this night’s line')}</button></div>`;
    } else {
        s += `<p class="am-note">${T('রমজান শুরু হলে এখানে লিখতে পারবেন।', 'You can write here once Ramadan begins.')}</p>`;
    }
    s += `<p class="am-note" id="rj-msg" aria-live="polite">${E(_msg)}</p>`;
    if (keys.length) {
        const shown = _all ? keys : keys.slice(0, 3);
        s += `<ul class="rj-list">${shown.map(n => `<li><b>${T('রাত', 'Night')} ${N(n)} · ${kindName(ent[n].k)}</b><span>${E(ent[n].t)}</span></li>`).join('')}</ul>`;
        if (keys.length > 3) s += `<div class="am-actions"><button type="button" class="am-btn" data-rj-act="all" aria-expanded="${_all}">${_all ? T('কম দেখান', 'Show fewer') : T('সব দেখুন', 'Show all')} (${N(keys.length)})</button></div>`;
    }
    return s;
}
function fillInput() {
    const t = document.getElementById('rj-text'); if (!t) return;
    const h = todayH(); if (!h) return;
    const ent = yearEntries(trackYear(h))[_sel];
    t.value = ent ? ent.t : '';
}
function journalSection(d) { return `<section class="am-card rj-card${d ? ' am-d' : ''}" id="rj-sec">${journalInner()}</section>`; }

// ---------------------------------------------------------------------------
// "My Ramadan" card
// ---------------------------------------------------------------------------
function cardVals() {
    const g = id => { const el = document.getElementById(id); return el ? el : null; };
    const nm = g('rj-name'), on = g('rj-qon'), sel = g('rj-qsel');
    const th = g('rj-theme');
    return { theme: th ? th.value : 'cream', name: nm ? String(nm.value || '').trim().slice(0, 40) : '', quote: !!(on && on.checked), qn: sel ? parseInt(sel.value, 10) : 0 };
}
function wrapLines(ctx, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    words.forEach(w => {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
}
// v202: 'Cream lantern' theme (cream paper, hanging crescents and lanterns, green mosque corners, gold fan).
function drawCream(ctx, A, st, v, hasQuote) {
    const W = A.W, H = A.H, C = A.CR;
    A.creamBase(ctx); A.creamBottom(ctx); A.creamTop(ctx);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    let y = 398;
    ctx.fillStyle = C.green; ctx.font = '600 32px ' + A.DISPLAY; A.spaced(ctx, APP_TITLE, W / 2, y, 3); y += 88;
    ctx.save(); ctx.shadowColor = 'rgba(56,114,63,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = C.green; ctx.font = '700 84px ' + FONT; ctx.fillText(T('আমার রমজান ' + N(st.year), 'My Ramadan ' + st.year), W / 2, y, 900); ctx.restore();
    y += 36; A.diamonds(ctx, W / 2, y, 5, 38, 8); y += 62;
    if (v.name) { ctx.fillStyle = '#b07a12'; ctx.font = '700 44px ' + FONT; ctx.fillText(v.name, W / 2, y); y += 30; }
    const off = hasQuote ? 0 : 50, rcy = y + 104 + off, rr = 84, of = st.fastsOf || 30;
    A.creamRing(ctx, W / 2, rcy, rr, st.fasts / of);
    ctx.fillStyle = C.green; ctx.font = '700 70px ' + FONT; ctx.fillText(N(st.fasts), W / 2, rcy + 14);
    ctx.fillStyle = '#b07a12'; ctx.font = '500 30px ' + FONT; ctx.fillText(st.fastsOf ? T('/ ' + N(st.fastsOf), 'of ' + st.fastsOf) : '', W / 2, rcy + 52);
    ctx.fillStyle = C.green; ctx.font = '700 40px ' + FONT; ctx.fillText(T('রোজা রেখেছি', 'Fasts kept'), W / 2, rcy + rr + 72);
    const py = rcy + rr + 100, pw = 400, ph = 132, gap = 40, px1 = (W - pw * 2 - gap) / 2, px2 = px1 + pw + gap;
    [[px1, T('জার্নালের লাইন', 'Journal lines'), N(st.lines)], [px2, T('শবে কদরের রাতে ধাপ চিহ্নিত', 'Qadr nights with steps ticked'), N(st.qadr) + ' / ' + N(3)]].forEach(p => {
        A.creamPanel(ctx, p[0], py, pw, ph, 26);
        ctx.fillStyle = C.green; ctx.font = '700 58px ' + FONT; ctx.fillText(p[2], p[0] + pw / 2, py + 62);
        ctx.fillStyle = '#5a7a4e'; ctx.font = '500 27px ' + FONT;
        wrapLines(ctx, p[1], pw - 40).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, p[0] + pw / 2, py + 98 + i * 30));
    });
    y = py + ph + 50;
    if (hasQuote) {
        ctx.fillStyle = C.green; ctx.font = 'italic 500 36px ' + FONT;
        wrapLines(ctx, '“' + st.entries[v.qn].t + '”', 780).slice(0, 2).forEach(ln => { ctx.fillText(ln, W / 2, y); y += 50; });
        ctx.fillStyle = '#5a7a4e'; ctx.font = '500 30px ' + FONT; ctx.fillText('— ' + T('রাত ', 'Night ') + N(v.qn), W / 2, y); y += 40;
    }
    ctx.fillStyle = '#b07a12'; ctx.font = '500 28px ' + FONT; ctx.fillText(APP_HOST, W / 2, Math.min(y + 4, 1214));
}
function drawCard(canvas) {
    const ctx = canvas.getContext && canvas.getContext('2d'); if (!ctx) return;
    const A = window._rcArt; if (!A) return;
    const st = stats(); if (!st) return;
    const v = cardVals();
    const W = A.W, H = A.H; canvas.width = W; canvas.height = H;
    const goldSoft = A.GOLD_SOFT, hasQuote = !!(v.quote && v.qn && st.entries[v.qn]);
    if (v.theme !== 'emerald') { drawCream(ctx, A, st, v, hasQuote); return; }
    A.base(ctx); A.scene(ctx, 100, 398, 430);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    let y = 450;
    ctx.fillStyle = goldSoft; ctx.font = '600 34px ' + A.DISPLAY; A.spaced(ctx, APP_TITLE, W / 2, y, 2); y += 82;   // v200: display serif, letter-spaced
    A.title(ctx, T('আমার রমজান ' + N(st.year), 'My Ramadan ' + st.year), W / 2, y, 78, FONT);
    y += 40; A.divider(ctx, W / 2, y, 210); y += 62;
    if (v.name) { ctx.fillStyle = goldSoft; ctx.font = '700 44px ' + FONT; ctx.fillText(v.name, W / 2, y); y += 30; }

    // hero stat: fasts kept inside a progress ring
    const off = hasQuote ? 0 : 50, rcy = y + 104 + off, rr = 84;
    const of = st.fastsOf || 30;
    A.ring(ctx, W / 2, rcy, rr, st.fasts / of);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 70px ' + FONT; ctx.fillText(N(st.fasts), W / 2, rcy + 14);
    ctx.fillStyle = goldSoft; ctx.font = '500 30px ' + FONT; ctx.fillText(st.fastsOf ? T('/ ' + N(st.fastsOf), 'of ' + st.fastsOf) : '', W / 2, rcy + 52);
    ctx.fillStyle = goldSoft; ctx.font = '700 40px ' + FONT; ctx.fillText(T('রোজা রেখেছি', 'Fasts kept'), W / 2, rcy + rr + 72);

    // two small stat panels
    const py = rcy + rr + 100, pw = 400, ph = 132, gap = 40, px1 = (W - pw * 2 - gap) / 2, px2 = px1 + pw + gap;
    [[px1, T('জার্নালের লাইন', 'Journal lines'), N(st.lines)], [px2, T('শবে কদরের রাতে ধাপ চিহ্নিত', 'Qadr nights with steps ticked'), N(st.qadr) + ' / ' + N(3)]].forEach(p => {
        A.panel(ctx, p[0], py, pw, ph, 26);
        ctx.fillStyle = '#ffffff'; ctx.font = '700 58px ' + FONT; ctx.fillText(p[2], p[0] + pw / 2, py + 62);
        ctx.fillStyle = goldSoft; ctx.font = '500 27px ' + FONT;
        wrapLines(ctx, p[1], pw - 40).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, p[0] + pw / 2, py + 98 + i * 30));
    });
    y = py + ph + 50;
    if (hasQuote) {
        ctx.fillStyle = goldSoft; ctx.font = 'italic 500 38px ' + FONT;
        wrapLines(ctx, '“' + st.entries[v.qn].t + '”', 800).slice(0, 2).forEach(ln => { ctx.fillText(ln, W / 2, y); y += 52; });
        ctx.fillStyle = '#e8f5ee'; ctx.font = '500 30px ' + FONT; ctx.fillText('— ' + T('রাত ', 'Night ') + N(v.qn), W / 2, y);
    }
    ctx.fillStyle = 'rgba(241,215,122,.9)'; ctx.font = '500 28px ' + FONT; ctx.fillText(APP_HOST, W / 2, H - 88);
    if (!hasQuote) A.divider(ctx, W / 2, H - 146, 120);
}
function schedule() {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => { _raf = 0; const c = document.getElementById('rj-canvas'); if (c) drawCard(c); });
}
function ensureFontThenDraw() {
    schedule();
    try { if (window._rcArt && window._rcArt.ready) window._rcArt.ready().then(schedule, () => {}); } catch (e) { /* ignore */ }   // v200: bundled fonts
}
function shareText() {
    const st = stats(); if (!st) return '';
    const L = [T('আমার রমজান ' + N(st.year), 'My Ramadan ' + st.year)];
    L.push(T('রোজা রেখেছি: ', 'Fasts kept: ') + N(st.fasts) + (st.fastsOf ? ' / ' + N(st.fastsOf) : ''));
    L.push(T('জার্নালের লাইন: ', 'Journal lines: ') + N(st.lines));
    L.push(T('শবে কদরের রাতে ধাপ চিহ্নিত: ', 'Qadr nights with steps ticked: ') + N(st.qadr) + ' / ' + N(3));
    return L.join('\n');
}
function cardInner() {
    const st = stats(); if (!st) return '';
    const keys = Object.keys(st.entries).map(Number).sort((a, b) => a - b);
    return `<h3>🌙 ${T('আমার রমজান ' + N(st.year), 'My Ramadan ' + st.year)}</h3>
        <p class="am-note">${T('আপনার চিহ্নিত রোজা, জার্নালের লাইনের সংখ্যা ও শবে কদরের রাতের ধাপ থেকে একটি কার্ড — ছবি হিসেবে শেয়ার বা সংরক্ষণ করা যায়, শেয়ার ঐচ্ছিক। জার্নালের লেখা কার্ডে যায় না, যদি না নিচে নিজে বেছে দেন।', 'A card made from your marked fasts, the number of journal lines and the Qadr-night steps — share or save it as an image, sharing is optional. Journal text is not on the card unless you choose a line below.')}</p>
        <label class="rj-f"><span>${T('কার্ডের থিম', 'Card theme')}</span><select id="rj-theme" class="rp-input"><option value="cream">${T('ক্রিম ও ফানুস', 'Cream and lanterns')}</option><option value="emerald">${T('পান্না ও সোনালি', 'Emerald and gold')}</option></select></label>
        <label class="rj-f"><span>${T('আপনার নাম (ঐচ্ছিক)', 'Your name (optional)')}</span><input id="rj-name" class="rp-input" type="text" maxlength="40" autocomplete="off"></label>
        ${keys.length ? `<label class="rj-chk"><input id="rj-qon" type="checkbox"> <span>${T('কার্ডে জার্নালের একটি লাইন দিন', 'Add one journal line to the card')}</span></label>
        <select id="rj-qsel" class="rp-input" aria-label="${E(T('কোন রাতের লাইন', 'Which night’s line'))}">${keys.map(n => `<option value="${n}">${T('রাত', 'Night')} ${N(n)} · ${E(st.entries[n].t.slice(0, 40))}</option>`).join('')}</select>` : ''}
        <canvas id="rj-canvas" class="ii-canvas" width="1080" height="1350" role="img" aria-label="${E(T('আমার রমজান কার্ডের প্রিভিউ', 'My Ramadan card preview'))}"></canvas>
        <div class="am-actions"><button type="button" class="am-btn" data-rj-act="share">${T('কার্ড শেয়ার/সংরক্ষণ', 'Share / save card')}</button><button type="button" class="am-btn" data-rj-act="copy">${T('লেখা কপি', 'Copy text')}</button></div>
        <p class="am-note" id="rj-cmsg" aria-live="polite"></p>`;
}
function cardSection(d) { return `<section class="am-card rj-card${d ? ' am-d' : ''}" id="rj-card">${cardInner()}</section>`; }

// ---------------------------------------------------------------------------
// Page hook
// ---------------------------------------------------------------------------
const _prev = window.renderRamadanPage;
if (typeof _prev === 'function') {
    window.renderRamadanPage = function () {
        let html = _prev.apply(this, arguments);
        if (typeof html !== 'string' || html.indexOf('id="am-root"') < 0) return html;
        try {
            const d = !!state.darkMode, at = html.lastIndexOf('</div>');
            if (at < 0) return html;
            html = html.slice(0, at) + journalSection(d) + cardSection(d) + html.slice(at);
            setTimeout(() => { if (document.getElementById('rj-sec')) { fillInput(); } if (document.getElementById('rj-canvas')) ensureFontThenDraw(); }, 0);
        } catch (e) { /* never break the page */ }
        return html;
    };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function repaintJournal(keepText) {
    const el = document.getElementById('rj-sec'); if (!el) return;
    const t = document.getElementById('rj-text'), typed = t ? t.value : '';
    el.innerHTML = journalInner();
    fillInput();
    if (keepText) { const t2 = document.getElementById('rj-text'); if (t2) t2.value = typed; }
}
function repaintCard() {
    const el = document.getElementById('rj-card'); if (!el) return;
    const name = (document.getElementById('rj-name') || {}).value || '';
    el.innerHTML = cardInner();
    const n2 = document.getElementById('rj-name'); if (n2) n2.value = name;
    ensureFontThenDraw();
}
function say(id, t) { const m = document.getElementById(id); if (m) m.textContent = t; }
function download(blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-ramadan.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function doShare() {
    const c = document.getElementById('rj-canvas'); if (!c) return;
    drawCard(c);
    c.toBlob(blob => {
        if (!blob) { say('rj-cmsg', T('কার্ড তৈরি করা যায়নি।', 'Could not create the card.')); return; }
        let file = null; try { file = new File([blob], 'my-ramadan.png', { type: 'image/png' }); } catch (e) { file = null; }
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            navigator.share({ files: [file], text: shareText() }).catch(() => { /* cancelled */ });
        } else { download(blob); say('rj-cmsg', T('ছবিটি সংরক্ষণ করা হয়েছে।', 'The image was saved.')); }
    }, 'image/png');
}
function doCopy() {
    const t = shareText();
    const ok = () => say('rj-cmsg', T('লেখা কপি হয়েছে।', 'Text copied.'));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => say('rj-cmsg', T('কপি করা যায়নি।', 'Could not copy.')));
    else say('rj-cmsg', T('কপি করা যায়নি।', 'Could not copy.'));
}

document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-rj-act]');
    if (!el || !document.getElementById('am-root')) return;
    const a = el.getAttribute('data-rj-act'), h = todayH();
    if (!h) return;
    const y = trackYear(h);
    if (a === 'kind') { const k = el.getAttribute('data-rj-k'); _kind = k === 'g' ? 'g' : 'n'; repaintJournal(true); const f = document.querySelector('#rj-sec [data-rj-k="' + _kind + '"]'); if (f) f.focus({ preventScroll: true }); }
    else if (a === 'save') {
        const t = document.getElementById('rj-text'), txt = t ? t.value.replace(/\s+/g, ' ').trim() : '';
        if (!_sel || h.m !== 9) return;
        if (!txt) { _msg = T('আগে এক লাইন লিখুন।', 'Write a line first.'); repaintJournal(true); return; }
        _msg = saveEntry(y, _sel, txt, _kind) ? T('সংরক্ষণ হয়েছে।', 'Saved.') : T('সংরক্ষণ করা যায়নি।', 'Could not save.');
        repaintJournal(); repaintCard();
    } else if (a === 'clear') {
        if (!_sel || h.m !== 9) return;
        saveEntry(y, _sel, '', _kind); _msg = T('এই রাতের লাইন মুছে ফেলা হয়েছে।', 'This night’s line was deleted.');
        repaintJournal(); repaintCard();
    } else if (a === 'all') { _all = !_all; repaintJournal(true); }
    else if (a === 'share') doShare();
    else if (a === 'copy') doCopy();
});
document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.id) return;
    if (t.id === 'rj-night') {
        _sel = parseInt(t.value, 10) || 0; _msg = '';
        const h = todayH(), en = h ? yearEntries(trackYear(h))[_sel] : null; if (en) _kind = en.k;
        repaintJournal();
    }
    else if (t.id === 'rj-qon' || t.id === 'rj-qsel' || t.id === 'rj-theme') schedule();
});
document.addEventListener('input', e => { if (e.target && e.target.id === 'rj-name') schedule(); });

// test hooks (pure)
window._rjDraw = drawCard; window._rjStats = stats; window._rjCurrentNight = () => currentNight(todayH());
})();
