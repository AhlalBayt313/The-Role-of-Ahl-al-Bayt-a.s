// ============================================================================
// RAMADAN MODE PLUS  — v188
// ----------------------------------------------------------------------------
// Three additions to the existing Ramadan page (daily-amal.js is untouched
// apart from two tiny read-only hooks):
//   1. Roza checker      — searches the app's OWN Knowledge Center sawm
//                          masail/fatwa (questions only) and links to them.
//   2. Hilal ring        — sun/moon arc from Fajr to Maghrib (and Maghrib to
//                          Fajr at night) + time-of-day theme (night / day /
//                          last-10-minutes-before-iftar glow with iftar dua link).
//   3. 30-night journey  — one card per day: that day's dua, that day's
//                          calendar event, a hadith and a fasting question.
// NOTHING here writes religious text. Every dua, event, hadith and
// masala is read from existing app data (data/duas/metadata.json,
// hijriEvents, data/knowledge/metadata.json). The only text added is UI
// wording and the disclaimers. The hadith list below is a list of ids.
//   4. 21 Ramadan mourning mode (v189) — muted colours + Imam Ali (a.s.) items first.
// Needs (all typeof-guarded): state, render, changePage, kcMasail, kcFatwa,
//   kcHadiths, kcMaraji, duas, amals, ziyarats, hijriEvents, approxHijriNow,
//   toBengaliDigits, escapeHtml, window._amTimes (daily-amal.js).
// ============================================================================
(function () {
'use strict';

const T = (b, e) => (typeof state !== 'undefined' && state.language === 'en') ? e : b;
const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const N = n => EN() ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = n => String(n).padStart(2, '0');

// ---------------------------------------------------------------------------
// Journey: which existing entries appear on which day (ids only).
// Hadith ids all exist in data/knowledge/metadata.json (kcHadiths): fasting
// (h668–h671), supplication (h537–h541), Qur'an recitation (h672–h674),
// silence (h571–h574), backbiting (h564–h566), self-accounting (h587–h592),
// remembering death (h530, h534), charity (h546–h551), gratitude (h568–h607),
// good opinion (h586). One per day, day 1 → day 30.
// ---------------------------------------------------------------------------
const HADITH_BY_DAY = [
    'h669', 'h670', 'h668', 'h671', 'h537', 'h538', 'h540', 'h541', 'h672', 'h673',
    'h674', 'h571', 'h572', 'h573', 'h574', 'h564', 'h565', 'h566', 'h587', 'h588',
    'h592', 'h530', 'h534', 'h546', 'h550', 'h551', 'h568', 'h569', 'h607', 'h586'
];
// Mirrors the calendar's own links for these days (CAL_EVENT_LINKS) — existing amal/ziyarat ids.
const LINKS_BY_DAY = {
    1: [['a', 'amal-ramadan-daily']],
    15: [['z', 'ziyarat-imam-hasan']],
    19: [['a', 'amal-laylatul-qadr']],
    21: [['a', 'amal-laylatul-qadr'], ['z', 'ziyarat-imam-ali']],
    23: [['a', 'amal-laylatul-qadr']]
};
// Sawm entries kept out of the DAILY rotation (private matters); they remain searchable in the checker.
const NOT_DAILY = { m391: 1, m392: 1, m393: 1, f170: 1, f171: 1 };

// Roza checker quick topics: [label bn, label en, match bn (| = or), match en]
const CHIPS = [
    ['ইনজেকশন', 'Injection', 'ইনজেকশন', 'injection'],
    ['ওষুধ', 'Medicine', 'ওষুধ', 'medic'],
    ['রক্ত', 'Blood', 'রক্ত', 'blood'],
    ['ধূমপান/ধোঁয়া', 'Smoking', 'ধূমপান|সিগারেট|ধোঁয়া', 'smok|cigarette'],
    ['ভুলে খাওয়া', 'Forgetfully eating', 'ভুলবশত|ভুলে|অজান্তে', 'forget|mistake|unaware'],
    ['সফর', 'Travel', 'সফর', 'travel'],
    ['গর্ভবতী/দুধ খাওয়ানো', 'Pregnancy / nursing', 'গর্ভবতী|দুধ খাওয়ানো', 'pregnan|nurs|breastfe'],
    ['গোসল/জুনুব', 'Ghusl / janabat', 'জুনুব|গোসল', 'janabat|junub|ghusl'],
    ['ডুব দেওয়া', 'Diving / submerging', 'ডুব', 'dive|diving|submerg|immers'],
    ['কাযা/কাফফারা', 'Qada / kaffara', 'কাযা|কাফফারা|ফিদইয়া', 'qada|kaffara|fidya|fidyah']
];

let _rpDay = null, _rpTimer = null, _rpQuery = null, _rpOverride = null;

// ---------------------------------------------------------------------------
// Small data helpers (read-only)
// ---------------------------------------------------------------------------
function todayH() {
    try { const h = (typeof approxHijriNow === 'function') ? approxHijriNow() : null; return h ? { d: h.day, m: h.month, y: h.year } : null; } catch (e) { return null; }
}
function arr(name) {
    try { const a = window[name]; return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function marjaInfo(key) {
    if (!key || key === 'general') return null;
    const m = arr('kcMaraji').find(x => x && x.key === key);
    if (!m) return null;
    return { name: EN() ? (m.en || m.bn || key) : (m.bn || m.en || key), deceased: !!m.deceased };
}
function qText(it) { return (EN() ? (it.questionEn || it.questionBn) : (it.questionBn || it.questionEn)) || ''; }
function numOf(id) { return String(id).replace(/^\D+/, '').replace(/^0+/, '') || '0'; }
function isSawm(it) {
    if (!it) return false;
    if (it.category === 'sawm') return true;
    return /রোজা|রমজান|সেহরি|ইফতার|\bfast|sawm|ramadan/i.test((it.questionBn || '') + ' ' + (it.questionEn || ''));
}
function sawmPool() {
    const out = [];
    arr('kcMasail').forEach(it => { if (isSawm(it)) out.push({ tab: 'masail', it }); });
    arr('kcFatwa').forEach(it => { if (isSawm(it)) out.push({ tab: 'fatwa', it }); });
    return out;
}
// Existing dua/amal/ziyarat resolver (same method as daily-amal.js).
function resolve(type, id) {
    try {
        if (type === 'd') {
            const l = arr('duas'); const i = l.findIndex(x => x && x.id === id);
            return i < 0 ? null : { t: l[i].titleBn, te: l[i].titleEn, action: 'readDua', param: String(i) };
        }
        if (type === 'a') { const a = arr('amals').find(x => x && x.id === id); return a ? { t: a.titleBn, te: a.titleEn, action: 'readAmal', param: a.id } : null; }
        if (type === 'z') { const z = arr('ziyarats').find(x => x && x.id === id); return z ? { t: z.titleBn, te: z.titleEn, action: 'readZiyarat', param: z.id } : null; }
    } catch (e) { /* data not ready */ }
    return null;
}
function itemBtn(r, why) {
    const ti = (EN() ? (r.te || r.t) : (r.t || r.te)) || '';
    return `<li><button type="button" class="am-item" data-action="${r.action}" data-param="${E(r.param)}"><span class="am-item-t">${E(ti)}</span>${why ? `<small>${E(why)}</small>` : ''}</button></li>`;
}

// Open a Knowledge Center detail page from the Ramadan page.
function openKc(tab, id) {
    if (typeof changePage !== 'function' || typeof state === 'undefined') return;
    const apply = () => { state.kcTab = tab; state.kcCategory = ''; state.kcSearch = ''; state.kcPage = 1; state.kcSourceFilter = ''; state.kcDetail = { type: tab, id: id }; };
    changePage('knowledgeCenter'); apply();
    const fin = () => {
        if (state.currentPage !== 'knowledgeCenter') return;
        if (!state.kcDetail) apply();
        window._kcJustOpenedDetail = true;
        if (typeof render === 'function') render();
    };
    if (typeof ensureKcItemContent === 'function') ensureKcItemContent(id, tab).then(fin, fin); else setTimeout(fin, 300);
}

// ---------------------------------------------------------------------------
// 1. ROZA CHECKER
// ---------------------------------------------------------------------------
function checkerSection(d) {
    const chips = CHIPS.map((c, i) => `<button type="button" class="rp-chip" data-rp-act="chip" data-rp-i="${i}">${E(T(c[0], c[1]))}</button>`).join('');
    return `
    <section class="am-card${d ? ' am-d' : ''}" id="rp-chk">
        <h3>${T('রোজা চেকার', 'Roza checker')}</h3>
        <p class="am-note">${T('কোনো কাজে রোজার হুকুম কী — লিখে খুঁজুন, অথবা নিচের বিষয় বেছে নিন।', 'Look up what ruling applies to something while fasting — type it, or pick a topic below.')}</p>
        <input type="search" id="rp-chk-q" class="rp-input" autocomplete="off" inputmode="search" placeholder="${E(T('যেমন: ইনজেকশন, আই ড্রপ, রক্ত পরীক্ষা…', 'e.g. injection, eye drops, blood test…'))}" aria-label="${E(T('রোজার মাসআলা খুঁজুন', 'Search fasting rulings'))}">
        <div class="rp-chips">${chips}</div>
        <div id="rp-chk-res" aria-live="polite"></div>
        <p class="am-note">${T('এটি শুধু অ্যাপের জ্ঞান কেন্দ্রের রোজা-সংক্রান্ত প্রশ্নোত্তর খুঁজে দেয়; নিজে কোনো হুকুম দেয় না। মারজাভেদে মত ভিন্ন হতে পারে — আপনার মারজার মত দেখুন। ⚖️', 'This only finds fasting questions already in the app’s Knowledge Center; it gives no ruling of its own. Opinions differ between maraji — check your own marja. ⚖️')}</p>
    </section>`;
}
function termsMatch(hay, terms) {
    // terms: array of "a|b" alternatives; returns how many terms matched
    let n = 0;
    terms.forEach(t => { if (t.split('|').some(a => a && hay.indexOf(a) >= 0)) n++; });
    return n;
}
function runChecker(qRaw, override) {
    const box = document.getElementById('rp-chk-res'); if (!box) return;
    const q = (qRaw || '').trim().toLowerCase();
    if (!q && !override) { box.innerHTML = ''; return; }
    const terms = override ? [override.toLowerCase()] : q.split(/\s+/).filter(Boolean);
    const pool = sawmPool();
    if (!pool.length) {
        box.innerHTML = `<p class="am-note">${T('জ্ঞান কেন্দ্রের ডেটা লোড হচ্ছে… একটু পরে আবার চেষ্টা করুন।', 'Knowledge Center data is still loading… try again in a moment.')}</p>`;
        return;
    }
    const scored = pool.map(p => ({ p, s: termsMatch(((p.it.questionBn || '') + ' ' + (p.it.questionEn || '')).toLowerCase(), terms) })).filter(x => x.s > 0);
    const full = scored.filter(x => x.s === terms.length);
    const list = (full.length ? full : scored).sort((a, b) => b.s - a.s).slice(0, 8);
    if (!list.length) {
        box.innerHTML = `<p class="am-note">${T('অ্যাপে এই বিষয়ে সরাসরি কোনো রোজার প্রশ্ন পাওয়া যায়নি। জ্ঞান কেন্দ্রে খুঁজে দেখতে পারেন, অথবা আপনার মারজার দপ্তরে জিজ্ঞেস করুন।', 'No fasting question on this was found in the app. You can search the Knowledge Center or ask your marja’s office.')}</p>
            <div class="am-actions"><button type="button" class="am-btn" data-action="changePage" data-param="knowledgeCenter">${T('জ্ঞান কেন্দ্র খুলুন', 'Open Knowledge Center')}</button></div>`;
        return;
    }
    let anyDeceased = false;
    const rows = list.map(x => {
        const it = x.p.it, mj = marjaInfo(it.marja);
        if (mj && mj.deceased) anyDeceased = true;
        const kind = x.p.tab === 'fatwa' ? T('ফতোয়া', 'Fatwa') : T('মাসআলা', 'Masala');
        const sub = `${kind} #${N(numOf(it.id))}${mj ? ' · ' + mj.name : ''}${mj && mj.deceased ? ' · ' + T('প্রয়াত মারজা', 'late marja') : ''}`;
        return `<li><button type="button" class="am-item" data-rp-act="open" data-rp-tab="${x.p.tab}" data-rp-id="${E(it.id)}"><span class="am-item-t">${E(qText(it))}</span><small>${E(sub)}</small></button></li>`;
    }).join('');
    box.innerHTML = `${full.length ? '' : `<p class="am-note">${T('হুবহু মিল পাওয়া যায়নি — কাছাকাছি ফল দেখানো হচ্ছে।', 'No exact match — showing close results.')}</p>`}
        <ul class="am-list">${rows}</ul>
        ${anyDeceased ? `<p class="am-note rp-warn">${T('⚠️ কিছু ফল প্রয়াত মারজার মত। আপনি বর্তমান মারজার অনুসারী হলে তাঁর মত যাচাই করে নিন।', '⚠️ Some results are the view of a late marja. If you follow a living marja, check his view.')}</p>` : ''}`;
}

// ---------------------------------------------------------------------------
// 2. HILAL RING + TIME THEME
// ---------------------------------------------------------------------------
const CX = 110, CY = 112, RX = 90;
function ringSection() {
    return `
    <section class="rp-ring-card rp-night" id="rp-ring" aria-label="${E(T('রোজার অগ্রগতি', 'Fasting progress'))}">
        <svg viewBox="0 0 220 140" role="img" aria-label="${E(T('সেহরি থেকে ইফতার পর্যন্ত রোজার অগ্রগতি', 'Fasting progress from sehri to iftar'))}">
            <path class="rp-track" d="M 20 112 A 90 90 0 0 1 200 112" pathLength="100" fill="none"/>
            <path class="rp-prog" id="rp-prog" d="M 20 112 A 90 90 0 0 1 200 112" pathLength="100" fill="none" stroke-dasharray="0 100"/>
            <text class="rp-orb" id="rp-orb" x="20" y="112" text-anchor="middle" dominant-baseline="central">🌙</text>
            <text class="rp-big" id="rp-big" x="110" y="92" text-anchor="middle">--</text>
            <text class="rp-sub" id="rp-sub" x="110" y="112" text-anchor="middle"></text>
            <text class="rp-end" id="rp-l" x="20" y="132" text-anchor="middle"></text>
            <text class="rp-end" id="rp-r" x="200" y="132" text-anchor="middle"></text>
        </svg>
        <p class="rp-cap" id="rp-cap">${T('সময় লোড হলে রিং চলতে শুরু করবে।', 'The ring starts once the times load.')}</p>
        <div id="rp-iftar"></div>
    </section>`;
}
function atTime(dt, hm) { const x = new Date(dt); x.setHours(hm[0], hm[1], 0, 0); return x; }
function fmtHM(hm) { let h = hm[0]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return N(h) + ':' + N(pad2(hm[1])) + ' ' + ap; }
function durHM(ms) { const m = Math.max(0, Math.floor(ms / 60000)); return N(Math.floor(m / 60)) + T(' ঘণ্টা ', 'h ') + N(m % 60) + T(' মিনিট', 'm'); }
function ringPhase(t) {
    const now = new Date(), tom = new Date(now); tom.setDate(tom.getDate() + 1);
    const f = atTime(now, t.today.fajr), mg = atTime(now, t.today.maghrib);
    if (now >= f && now < mg) {
        const left = mg - now;
        return { mode: left <= 600000 ? 'iftar' : 'day', p: (now - f) / (mg - f), left };
    }
    const prevMg = now < f ? new Date(mg.getFullYear(), mg.getMonth(), mg.getDate() - 1, mg.getHours(), mg.getMinutes()) : mg; // v210: same clock time yesterday (was −24 h, 1 h off across a DST change)
    const nextF = now < f ? f : atTime(tom, t.tomorrow.fajr);
    return { mode: 'night', p: (now - prevMg) / (nextF - prevMg), left: nextF - now };
}
function iftarDuaBtn() {
    const r = resolve('d', 'dua-at-iftar-shia-narration') || resolve('d', 'dua-iftar');
    return r ? `<button type="button" class="am-btn" data-action="${r.action}" data-param="${E(r.param)}">🤲 ${E(T('ইফতারের দোয়া', 'Iftar dua'))}</button>` : '';
}
let _lastMode = '';
function ringTick() {
    const card = document.getElementById('rp-ring');
    if (!card) { clearInterval(_rpTimer); _rpTimer = null; _lastMode = ''; return; }
    const t = (typeof window._amTimes === 'function') ? window._amTimes() : null;
    if (!t || !t.today || !t.tomorrow) return;
    const ph = ringPhase(t), p = Math.max(0, Math.min(1, ph.p));
    const a = Math.PI * p, x = CX - RX * Math.cos(a), y = CY - RX * Math.sin(a);
    const $ = id => document.getElementById(id);
    $('rp-prog').setAttribute('stroke-dasharray', (p * 100).toFixed(2) + ' 100');
    const orb = $('rp-orb'); orb.setAttribute('x', x.toFixed(1)); orb.setAttribute('y', y.toFixed(1));
    orb.textContent = ph.mode === 'night' ? '🌙' : '☀️';
    $('rp-big').textContent = ph.mode === 'night' ? durHM(ph.left) : N(Math.floor(p * 100)) + '%';
    $('rp-sub').textContent = ph.mode === 'night' ? T('ফজর পর্যন্ত বাকি', 'until Fajr') : T('রোজা সম্পন্ন', 'of the fast done');
    $('rp-l').textContent = T('ফজর ', 'Fajr ') + fmtHM(t.today.fajr);
    $('rp-r').textContent = T('মাগরিব ', 'Maghrib ') + fmtHM(t.today.maghrib);
    $('rp-cap').textContent = ph.mode === 'night'
        ? T('রাত — সেহরি ও ইবাদতের সময়', 'Night — time for sehri and worship')
        : T('ইফতারে বাকি ' + durHM(ph.left), 'Iftar in ' + durHM(ph.left));
    if (ph.mode !== _lastMode) {
        _lastMode = ph.mode;
        card.classList.remove('rp-night', 'rp-day', 'rp-iftar'); card.classList.add('rp-' + ph.mode);
        const box = $('rp-iftar');
        if (box) box.innerHTML = ph.mode === 'iftar'
            ? `<div class="rp-iftar-note"><b>${T('ইফতারের সময় প্রায় হয়ে এল', 'Iftar is almost here')}</b>${iftarDuaBtn()}</div>` : '';
    }
}
function startRing() {
    _lastMode = '';
    ringTick();
    clearInterval(_rpTimer); _rpTimer = setInterval(ringTick, 1000);
}
document.addEventListener('am:times', () => { if (document.getElementById('rp-ring')) startRing(); });

// ---------------------------------------------------------------------------
// 3. 30-NIGHT JOURNEY
// ---------------------------------------------------------------------------
function journeySection(d, h) {
    if (_rpDay == null) _rpDay = (h && h.m === 9) ? Math.min(30, Math.max(1, h.d)) : 1;
    let chips = '';
    for (let i = 1; i <= 30; i++) chips += `<button type="button" class="rp-dchip${i === _rpDay ? ' on' : ''}${h && h.m === 9 && i === h.d ? ' today' : ''}" data-rp-act="day" data-rp-n="${i}" aria-label="${E(T('রমজানের ' + N(i) + ' তম দিন', 'Ramadan day ' + i))}" aria-pressed="${i === _rpDay}">${N(i)}</button>`;
    return `
    <section class="am-card${d ? ' am-d' : ''}" id="rp-jr">
        <h3>${T('৩০ রাতের সফর', 'The 30-night journey')}</h3>
        <p class="am-note">${T('প্রতিদিনের জন্য একটি করে কার্ড — দিনের দোয়া, সেই দিনের ঘটনা, একটি হাদিস ও রোজার একটি মাসআলা। সবই অ্যাপের নিজস্ব ডেটা থেকে।', 'One card a day — the day’s dua, that day’s event, a hadith and a fasting question. All from the app’s own data.')}</p>
        <div class="rp-dchips" id="rp-dchips">${chips}</div>
        <div id="rp-jr-card"></div>
        <div class="am-actions rp-jr-nav">
            <button type="button" class="am-btn" data-rp-act="prev">‹ ${T('আগের দিন', 'Previous')}</button>
            <button type="button" class="am-btn" data-rp-act="next">${T('পরের দিন', 'Next')} ›</button>
        </div>
    </section>`;
}
function eventForDay(n) {
    try { if (typeof hijriEvents !== 'undefined' && hijriEvents && hijriEvents['9-' + n]) return hijriEvents['9-' + n]; } catch (e) { /* none */ }
    return null;
}
function paintJourney() {
    const box = document.getElementById('rp-jr-card'); if (!box) return;
    const n = _rpDay, d = !!(typeof state !== 'undefined' && state.darkMode);
    const blocks = [];

    // dua of the day
    const dua = resolve('d', 'day-' + n + '-dua-of-ramadan');
    if (dua) blocks.push(`<div class="rp-blk"><h4>🤲 ${T('দিনের দোয়া', 'Dua of the day')}</h4><ul class="am-list">${itemBtn(dua, '')}</ul></div>`);

    // the day's event + related existing links
    const ev = eventForDay(n);
    const links = (LINKS_BY_DAY[n] || []).map(l => { const r = resolve(l[0], l[1]); return r ? itemBtn(r, '') : ''; }).join('');
    if (ev || links) {
        blocks.push(`<div class="rp-blk"><h4>📅 ${T('এই দিনে', 'On this day')}</h4>${ev ? `<p class="rp-ev">${E(EN() ? (ev.en || ev.bn) : (ev.bn || ev.en))}</p>` : ''}${links ? `<ul class="am-list">${links}</ul>` : ''}</div>`);
    }

    // hadith
    const hid = HADITH_BY_DAY[n - 1], hd = arr('kcHadiths').find(x => x && x.id === hid);
    if (hd) {
        const txt = (EN() ? (hd.textEn || hd.textBn) : (hd.textBn || hd.textEn)) || '';
        blocks.push(`<div class="rp-blk"><h4>📖 ${T('আজকের হাদিস', 'Hadith of the day')}</h4><blockquote class="rp-quote">${E(txt)}</blockquote>
            <div class="am-actions"><button type="button" class="am-btn" data-rp-act="open" data-rp-tab="hadith" data-rp-id="${E(hd.id)}">${T('সূত্রসহ দেখুন', 'View with source')}</button></div></div>`);
    }

    // fasting question of the day
    const pool = sawmPool().filter(p => !NOT_DAILY[p.it.id]);
    if (pool.length) {
        const p = pool[(n - 1) % pool.length], mj = marjaInfo(p.it.marja);
        const kind = p.tab === 'fatwa' ? T('ফতোয়া', 'Fatwa') : T('মাসআলা', 'Masala');
        blocks.push(`<div class="rp-blk"><h4>🌙 ${T('রোজার মাসআলা', 'Fasting question')}</h4><ul class="am-list"><li><button type="button" class="am-item" data-rp-act="open" data-rp-tab="${p.tab}" data-rp-id="${E(p.it.id)}"><span class="am-item-t">${E(qText(p.it))}</span><small>${E(kind + ' #' + N(numOf(p.it.id)) + (mj ? ' · ' + mj.name : '') + (mj && mj.deceased ? ' · ' + T('প্রয়াত মারজা', 'late marja') : ''))}</small></button></li></ul></div>`);
    }

    const h = todayH(), isToday = !!(h && h.m === 9 && h.d === n);
    box.innerHTML = `<article class="rp-day${d ? ' am-d' : ''}">
        <header class="rp-day-h"><b>${T('রমজানের ' + N(n) + ' তম দিন', 'Ramadan day ' + n)}</b>${isToday ? `<span class="rp-today">${T('আজ', 'Today')}</span>` : ''}</header>
        ${blocks.join('') || `<p class="am-note">${T('ডেটা লোড হচ্ছে…', 'Loading data…')}</p>`}
    </article>`;
    document.querySelectorAll('#rp-dchips .rp-dchip').forEach(b => {
        const on = parseInt(b.getAttribute('data-rp-n'), 10) === n;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const cur = document.querySelector('#rp-dchips .rp-dchip.on');
    if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* older browsers */ } }
}
function setDay(n) { _rpDay = Math.max(1, Math.min(30, n)); paintJourney(); }

// ---------------------------------------------------------------------------
// 4. 21 RAMADAN MOURNING MODE (v189)
// Active on 21 Ramadan (the day, i.e. from the Maghrib that ends the 20th until
// the Maghrib that ends the 21st when today's times are known; otherwise the
// whole Hijri date 21). The app's colours are muted (a grey "saturation" veil,
// no content hidden) and a card puts the existing Imam Ali (a.s.) items first.
// Everything shown is existing data; the user can turn the muted look off for the day.
// ---------------------------------------------------------------------------
const MOURN_OFF_KEY = 'ahlbayt_mourn_off';
const MOURN_ITEMS = [['d', 'dua-of-laylatul-qadr-21st-night'], ['a', 'amal-laylatul-qadr'], ['z', 'ziyarat-imam-ali'], ['z', 'ziyarat-amin-allah']];
function amTimesNow() {
    try { if (typeof window._amTimes === 'function' && window._amTimes()) return window._amTimes(); } catch (e) { /* none */ }
    try { const c = lsGet('ahlbayt_am_times', null); if (c && c.today && c.dk) return c; } catch (e) { /* none */ }
    return null;
}
function mournActive() {
    const h = todayH(); if (!h || h.m !== 9) return false;
    const t = amTimesNow(), now = new Date();
    const afterMg = t && t.today && t.today.maghrib ? now >= atTime(now, t.today.maghrib) : null;
    if (h.d === 21) return afterMg === true ? false : true;
    if (h.d === 20) return afterMg === true;
    return false;
}
function mournDayKey() { const h = todayH(); return h ? h.y + '-' + h.m + '-' + h.d : ''; }
function mournOff() { try { return lsGet(MOURN_OFF_KEY, null) === mournDayKey(); } catch (e) { return false; } }
function applyMourn() {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle('rp-mourn', mournActive() && !mournOff());
}
function mournCard(d) {
    if (!mournActive()) return '';
    const ev = eventForDay(21);
    const items = MOURN_ITEMS.map(x => { const r = resolve(x[0], x[1]); return r ? itemBtn(r, '') : ''; }).join('');
    const ali = arr('kcHadiths').filter(x => x && x.category === 'ali');
    const h = todayH(), hd = ali.length ? ali[(h ? h.y : 0) % ali.length] : null;
    const off = mournOff();
    return `
    <section class="am-card rp-mourn-card${d ? ' am-d' : ''}" id="rp-mourn">
        <h3>🕊️ ${T('২১ রমজান', '21 Ramadan')}</h3>
        ${ev ? `<p class="rp-ev">${E(EN() ? (ev.en || ev.bn) : (ev.bn || ev.en))}</p>` : ''}
        ${items ? `<ul class="am-list">${items}</ul>` : ''}
        ${hd ? `<blockquote class="rp-quote">${E(EN() ? (hd.textEn || hd.textBn) : (hd.textBn || hd.textEn))}</blockquote>
            <div class="am-actions"><button type="button" class="am-btn" data-rp-act="open" data-rp-tab="hadith" data-rp-id="${E(hd.id)}">${T('সূত্রসহ দেখুন', 'View with source')}</button></div>` : ''}
        <div class="am-actions"><button type="button" class="am-btn" data-rp-act="mourn">${off ? T('ম্লান থিম চালু করুন', 'Turn muted look on') : T('ম্লান থিম বন্ধ করুন', 'Turn muted look off')}</button></div>
    </section>`;
}
if (typeof window.todayAmalCard === 'function') {
    const _origCard = window.todayAmalCard;
    window.todayAmalCard = function () {
        let html = _origCard.apply(this, arguments);
        try { const c = mournCard(!!state.darkMode); if (c) html = c + (html || ''); } catch (e) { /* keep original */ }
        return html;
    };
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyMourn); else setTimeout(applyMourn, 0);
    document.addEventListener('am:times', applyMourn);
    setInterval(applyMourn, 60000);
}
window._rpMournActive = mournActive;

// ---------------------------------------------------------------------------
// Hook into the existing Ramadan page (additive wrapper)
// ---------------------------------------------------------------------------
const _origRender = window.renderRamadanPage;
if (typeof _origRender === 'function') {
    window.renderRamadanPage = function () {
        let html = _origRender.apply(this, arguments);
        if (typeof html !== 'string' || html.indexOf('id="am-root"') < 0) return html;
        try {
            const d = !!state.darkMode, h = todayH();
            // 1) hilal ring right under the page title
            const i = html.indexOf('</h2>');
            if (i >= 0) html = html.slice(0, i + 5) + mournCard(d) + ringSection() + html.slice(i + 5);
            // 2) checker + journey just before the fasting tracker card
            const g = html.indexOf('class="am-grid"');
            let at = g >= 0 ? html.lastIndexOf('<section', g) : -1;
            if (at < 0) at = html.lastIndexOf('</div>');
            html = html.slice(0, at) + checkerSection(d) + journeySection(d, h) + html.slice(at);
            setTimeout(() => {
                if (!document.getElementById('rp-ring')) return;
                startRing(); paintJourney();
                const q = document.getElementById('rp-chk-q'); if (q && _rpQuery) { q.value = _rpQuery; runChecker(_rpQuery, _rpOverride); }
            }, 0);
        } catch (e) { /* never break the original page */ }
        return html;
    };
}

document.addEventListener('input', e => {
    const t = e.target;
    if (!t || t.id !== 'rp-chk-q') return;
    _rpQuery = t.value; _rpOverride = null; runChecker(t.value);
});
document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-rp-act]');
    if (!el || !document.getElementById('am-root')) return;
    const a = el.getAttribute('data-rp-act');
    if (a === 'chip') {
        const c = CHIPS[parseInt(el.getAttribute('data-rp-i'), 10)]; if (!c) return;
        const q = document.getElementById('rp-chk-q'); if (q) q.value = T(c[0], c[1]);
        _rpQuery = T(c[0], c[1]); _rpOverride = T(c[2], c[3]);
        runChecker(_rpQuery, _rpOverride);
    } else if (a === 'open') {
        openKc(el.getAttribute('data-rp-tab'), el.getAttribute('data-rp-id'));
    } else if (a === 'day') setDay(parseInt(el.getAttribute('data-rp-n'), 10));
    else if (a === 'mourn') {
        try { lsSet(MOURN_OFF_KEY, mournOff() ? '' : mournDayKey()); } catch (e) { /* best effort */ }
        applyMourn(); if (typeof render === 'function') render();
    }
    else if (a === 'prev') setDay(_rpDay - 1);
    else if (a === 'next') setDay(_rpDay + 1);
});

// test hooks (pure)
window._rpPhase = ringPhase; window._rpSawmPool = sawmPool;
})();
