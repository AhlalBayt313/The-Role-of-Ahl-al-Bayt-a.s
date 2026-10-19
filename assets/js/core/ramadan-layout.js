// ============================================================================
// RAMADAN LAYOUT — v197
// ----------------------------------------------------------------------------
// Re-arranges the (already complete) Ramadan page into clear, titled groups:
//   hero (today's status) → hilal ring → ① Today: times & amal
//   ② Fasting: tracker, history, qaza/fidya, roza checker
//   ③ Nights & worship: 30 days' duas (v198), 30-night journey, Laylatul Qadr walk
//   ④ Personal & sharing: journal, share card, iftar invitation
// plus a quick-jump chip bar and collapsible group headers.
// It is the LAST wrapper around renderRamadanPage: it only moves existing
// <section> nodes (ids, classes, data-attributes untouched), so every module's
// own click / repaint code keeps working. Nothing is removed — unknown sections
// are appended at the end. Any error → the original page is returned as is.
// Collapse state lives in memory only. No religious text is added.
// ============================================================================
(function () {
'use strict';

const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;

const GROUPS = [
    { key: 'today',   icon: '\uD83D\uDD70\uFE0F', bn: 'আজকের সময় ও আমল',    en: 'Today: times & amal',
      sbn: 'সেহরি, ইফতার ও আজকের করণীয়',            sen: 'Sehri, iftar and today’s amal',
      chipBn: 'আজ', chipEn: 'Today',     ids: ['times', 'amal'] },
    { key: 'fast',    icon: '\uD83D\uDCC5',       bn: 'রোজা ও হিসাব',          en: 'Fasting & records',
      sbn: 'রোজার ট্র্যাকার, কাজা-ফিদইয়া ও রোজার মাসআলা', sen: 'Tracker, qaza & fidya, and fasting rulings',
      chipBn: 'রোজা', chipEn: 'Fasting',  ids: ['tracker', 'rh-hist', 'qf-root', 'rp-chk'] },
    { key: 'worship', icon: '\uD83E\uDD32',       bn: 'রাত ও ইবাদত',            en: 'Nights & worship',
      sbn: '৩০ দিনের দোয়া, ৩০ রাতের সফর ও শবে কদর',  sen: '30 days’ duas, 30-night journey and Laylatul Qadr',
      chipBn: 'ইবাদত', chipEn: 'Worship', ids: ['rl-d30', 'rp-jr', 'qw-sec'] },
    { key: 'me',      icon: '\uD83D\uDCDD',       bn: 'ব্যক্তিগত ও শেয়ার',      en: 'Personal & sharing',
      sbn: 'রমজানের ডায়েরি, শেয়ার কার্ড ও ইফতারের দাওয়াত', sen: 'Journal, share card and iftar invitation',
      chipBn: 'ব্যক্তিগত', chipEn: 'Personal', ids: ['rj-sec', 'rj-card', 'ii-sec'] }
];


// ---------------------------------------------------------------------------
// 30 DAYS' DUAS (v198) — a quick list of the app's EXISTING day-1 … day-30 duas
// (data/duas/ramadan.json, ids day-N-dua-of-ramadan). Only buttons; no dua text
// is added or copied here. Each button opens the dua in the normal dua reader.
// ---------------------------------------------------------------------------
const NUM = n => (typeof toBengaliDigits === 'function' && !EN()) ? toBengaliDigits(n) : String(n);
function ramadanDay() {
    try { const h = (typeof approxHijriNow === 'function') ? approxHijriNow() : null; return h && h.month === 9 ? Math.min(30, Math.max(1, h.day)) : 0; } catch (e) { return 0; }
}
function duaIndex(n) {
    try { const l = window.duas; if (!Array.isArray(l)) return -1; return l.findIndex(x => x && x.id === 'day-' + n + '-dua-of-ramadan'); } catch (e) { return -1; }
}
function d30Card(d) {
    const today = ramadanDay();
    let grid = '';
    for (let i = 1; i <= 30; i++) {
        grid += '<button type="button" class="am-day rl-dd' + (i === today ? ' today' : '') + '" data-rl-dua="' + i + '" aria-label="' +
            T('রমজানের ' + NUM(i) + ' তম দিনের দোয়া', 'Dua of Ramadan day ' + i) + '">' + NUM(i) + '</button>';
    }
    const sec = document.createElement('section');
    sec.className = 'am-card rl-d30' + (d ? ' am-d' : '');
    sec.id = 'rl-d30';
    sec.innerHTML =
        '<h3>' + T('রমজানের ৩০ দিনের দোয়া', 'Duas for the 30 days of Ramadan') + '</h3>' +
        '<p class="am-note">' + T('দিন বেছে নিন — সেই দিনের দোয়া সরাসরি খুলবে। (অ্যাপের নিজস্ব দোয়া সংকলন থেকে)', 'Pick a day — that day’s dua opens directly (from the app’s own dua collection).') + '</p>' +
        (today ? '<div class="am-actions"><button type="button" class="am-btn rl-today" data-rl-dua="' + today + '">' + T('আজকের দোয়া — ' + NUM(today) + ' তম দিন', 'Today’s dua — day ' + today) + '</button></div>' : '') +
        '<div class="am-grid rl-d30-grid">' + grid + '</div>';
    return sec;
}

const _closed = {};   // group key → true when collapsed (memory only)

const CHEV = '<svg class="rl-chev" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';

function classify(root) {
    const map = {}, other = [], unknown = [];
    let title = null;
    Array.prototype.forEach.call(root.children, el => {
        if (el.tagName === 'H2' && !title) { title = el; return; }
        const id = el.id || '';
        if (id === 'rp-mourn') { map.mourn = el; return; }
        if (id === 'rp-ring')  { map.ring = el; return; }
        if (id && GROUPS.some(g => g.ids.indexOf(id) >= 0)) { map[id] = el; return; }
        if (!id && el.querySelector) {
            if (el.querySelector('#am-times')) { map.times = el; return; }
            if (el.querySelector('.am-grid'))  { map.tracker = el; return; }
        }
        unknown.push(el);
    });
    // what is left of the original page: first = today's status, second = today's amal
    if (unknown.length) map.status = unknown.shift();
    if (unknown.length) map.amal = unknown.shift();
    unknown.forEach(u => other.push(u));
    return { title: title, map: map, other: other };
}

function rebuild(html) {
    const box = document.createElement('div');
    box.innerHTML = html;
    const root = box.querySelector('#am-root');
    if (!root) return html;
    if (root.querySelector('.rl-group')) return html;          // already arranged
    const c = classify(root), m = c.map;
    if (!c.title) return html;
    try { m['rl-d30'] = d30Card(!!state.darkMode); } catch (e) { /* card is optional */ }

    const frag = document.createDocumentFragment();
    frag.appendChild(c.title);

    const tag = document.createElement('p');
    tag.className = 'rl-tag';
    tag.textContent = T('সেহরি, ইফতার, রোজা ও আমল — এক জায়গায়', 'Sehri, iftar, fasts and amal — in one place');
    frag.appendChild(tag);

    // groups that actually have content
    const live = GROUPS.map(g => ({ g: g, nodes: g.ids.map(i => m[i]).filter(Boolean) })).filter(x => x.nodes.length);

    // quick-jump chips
    if (live.length > 1) {
        const nav = document.createElement('nav');
        nav.className = 'rl-nav';
        nav.setAttribute('aria-label', T('এই পেজের অংশ', 'Sections on this page'));
        nav.innerHTML = live.map(x =>
            '<button type="button" class="rl-chip rl-c-' + x.g.key + '" data-rl-go="' + x.g.key + '"><span aria-hidden="true">' + x.g.icon + '</span>' +
            (EN() ? x.g.chipEn : x.g.chipBn) + '</button>').join('');
        frag.appendChild(nav);
    }

    if (m.mourn) frag.appendChild(m.mourn);
    if (m.status) { m.status.classList.add('rl-hero'); frag.appendChild(m.status); }
    if (m.ring) frag.appendChild(m.ring);

    live.forEach((x, gi) => {
        const g = x.g, closed = !!_closed[g.key];
        const sec = document.createElement('section');
        sec.className = 'rl-group rl-g-' + g.key;
        sec.id = 'rl-g-' + g.key;
        sec.style.setProperty('--rl-i', gi);
        sec.innerHTML =
            '<button type="button" class="rl-gh" id="rl-h-' + g.key + '" data-rl-toggle="' + g.key + '" aria-expanded="' + (!closed) + '" aria-controls="rl-b-' + g.key + '">' +
                '<span class="rl-gi" aria-hidden="true">' + g.icon + '</span>' +
                '<span class="rl-gt"><b>' + (EN() ? g.en : g.bn) + '</b><small>' + (EN() ? g.sen : g.sbn) + '</small></span>' + CHEV +
            '</button><div class="rl-gbar" aria-hidden="true"></div>' +
            '<div class="rl-gb" id="rl-b-' + g.key + '" role="group" aria-labelledby="rl-h-' + g.key + '"' + (closed ? ' hidden' : '') + '></div>';
        const body = sec.querySelector('.rl-gb');
        x.nodes.forEach(n => body.appendChild(n));
        frag.appendChild(sec);
    });

    c.other.forEach(o => frag.appendChild(o));                 // never lose anything

    root.innerHTML = '';
    root.appendChild(frag);
    return box.innerHTML;
}

const _prev = window.renderRamadanPage;
if (typeof _prev === 'function') {
    window.renderRamadanPage = function () {
        const html = _prev.apply(this, arguments);
        if (typeof html !== 'string' || html.indexOf('id="am-root"') < 0) return html;
        try { return rebuild(html); } catch (e) { return html; }   // never break the page
    };
}

function setOpen(key, open) {
    const b = document.getElementById('rl-b-' + key), h = document.getElementById('rl-h-' + key);
    if (!b || !h) return;
    _closed[key] = !open;
    if (open) b.removeAttribute('hidden'); else b.setAttribute('hidden', '');
    h.setAttribute('aria-expanded', open ? 'true' : 'false');
}

document.addEventListener('click', e => {
    if (!document.getElementById('am-root')) return;
    const t = e.target.closest && e.target.closest('[data-rl-toggle],[data-rl-go],[data-rl-dua]');
    if (!t) return;
    if (t.hasAttribute('data-rl-dua')) {
        const n = parseInt(t.getAttribute('data-rl-dua'), 10), i = duaIndex(n);
        if (i >= 0 && typeof readDua === 'function') readDua(String(i));
        else if (typeof changePage === 'function') changePage('dua');   // list not loaded yet → open the dua page
        return;
    }
    if (t.hasAttribute('data-rl-toggle')) {
        const k = t.getAttribute('data-rl-toggle');
        setOpen(k, !!_closed[k]);
    } else {
        const k = t.getAttribute('data-rl-go'), el = document.getElementById('rl-g-' + k);
        if (!el) return;
        setOpen(k, true);
        const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        try { el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); } catch (err) { el.scrollIntoView(); }
        const h = document.getElementById('rl-h-' + k); if (h && h.focus) try { h.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
    }
});

// test hook (pure)
window._rlGroups = GROUPS; window._rlDuaIndex = duaIndex;
})();
