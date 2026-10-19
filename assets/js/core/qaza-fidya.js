// ============================================================================
// QAZA & FIDYA COMPANION — v193
// ----------------------------------------------------------------------------
// A year-round ledger for missed Ramadan fasts: how many days were missed, why,
// how many qada days are still owed, and how much fidya is outstanding.
//   • Placed on the Ramadan page (below the fasting tracker, above the journal)
//     and at the bottom of the Khums & Zakat page, so it is reachable all year.
//   • The rules are ONLY those stated in the app's source text — Ayatollah
//     Khamenei's "Practical Laws of Islam" (Ajwibat al-Istifta'at, English ed.),
//     quoted by question number on the card:
//       travel ............................ qada only                (Q732, 734, 804)
//       harm / reasonable fear of harm .... qada only                (Q731, 735, 747)
//       illness lasting to next Ramadan ... fidya, 1 mudd (750 g)/day (Q748, 800)
//       pregnant, fear for fetus/baby ..... qada + fidya             (Q802)
//       nursing, fear for the baby ........ qada + fidya             (Q743)
//       no excuse, intentional ............ qada + kaffarah          (Q746, 766)
//       qada delayed past next Ramadan, negligently, no excuse
//                                       ... one fidya per day, once  (Q799, 802, 806)
//     Rules for other causes (e.g. menses) are NOT in the text this app uses, so
//     no rule is invented: the card says to ask one's own marja.
//   • Fidya = 750 g of food per day, as in Q743/Q799. An optional price per kg
//     (typed by the user, kept on the device) gives a money figure; Q797 says
//     money is acceptable only if the recipient will buy food on your behalf.
// NOTHING religious is written here beyond those rule lines and the question
// numbers; links open the existing Knowledge Center items.
// Everything is stored ONLY on this device (localStorage 'ahlbayt_qaza_fidya',
// part of the Ramadan backup group). Wraps renderRamadanPage and
// renderKhumsZakatPage; typeof-guarded; never breaks either page.
// ============================================================================
(function () {
'use strict';

const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;
const N = n => EN() ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const KEY = 'ahlbayt_qaza_fidya';
const MUDD_G = 750;
const MAX_ENTRIES = 80;

// reason → how fidya/qada work. fidya: 'none' | 'all' (every missed day) | 'cont' (only if illness continued to next Ramadan)
const REASONS = {
    travel:      { bn: 'সফর', en: 'Travel', fidya: 'none', qada: true, q: '৭৩২, ৭৩৪, ৮০৪', qe: '732, 734, 804',
                   rb: 'শুধু কাযা; কাফফারা নেই।', re: 'Qada only; no kaffarah.', kc: [] },
    harm:        { bn: 'অসুস্থতা বা ক্ষতির যুক্তিসঙ্গত আশঙ্কা', en: 'Illness / reasonable fear of harm', fidya: 'cont', qada: true, q: '৭৩১, ৭৩৫, ৭৪৭, ৭৪৮, ৮০০', qe: '731, 735, 747, 748, 800',
                   rb: 'শুধু কাযা। অসুস্থতা পরের রমজান পর্যন্ত চললে প্রতিদিন ১ মুদ (৭৫০ গ্রাম) খাদ্য।', re: 'Qada only. If the illness lasted until the next Ramadan: 1 mudd (750 g) of food per day.', kc: [] },
    preg:        { bn: 'গর্ভবতী — নিজের শরয়ি ওজর', en: 'Pregnant — her own shar‘i excuse', fidya: 'none', qada: true, q: '৮০২', qe: '802',
                   rb: 'শুধু কাযা।', re: 'Qada only.', kc: [['fatwa', 'f150'], ['qa', 'q144']] },
    preg_baby:   { bn: 'গর্ভবতী — গর্ভস্থ সন্তানের ক্ষতির আশঙ্কা', en: 'Pregnant — fear of harm to the fetus', fidya: 'all', qada: true, q: '৮০২', qe: '802',
                   rb: 'কাযা এবং প্রতিদিন ১ মুদ (৭৫০ গ্রাম) ফিদইয়া।', re: 'Qada and 1 mudd (750 g) fidya per day.', kc: [['fatwa', 'f150'], ['qa', 'q144']] },
    nurse_baby:  { bn: 'দুধদানকারী — সন্তানের ক্ষতির আশঙ্কা', en: 'Nursing — fear of harm to the baby', fidya: 'all', qada: true, q: '৭৪৩', qe: '743',
                   rb: 'কাযা এবং প্রতিদিন ১ মুদ (৭৫০ গ্রাম) ফিদইয়া।', re: 'Qada and 1 mudd (750 g) fidya per day.', kc: [['masail', 'm372']] },
    deliberate:  { bn: 'ওজর ছাড়া ইচ্ছাকৃত', en: 'Intentional, without a shar‘i excuse', fidya: 'none', qada: true, q: '৭৪৬, ৭৬৬, ৭৮০', qe: '746, 766, 780',
                   rb: 'কাযা এবং কাফফারা (৭৬৬)। কাফফারার পরিমাণ (৭৮০-র উত্তরে): ষাট দিন রোজা বা ষাটজন গরিবকে খাওয়ানো।', re: 'Qada and kaffarah (q.766). The kaffarah amount, as stated in q.780: fasting sixty days or feeding sixty poor persons.', kc: [['fatwa', 'f170']] },
    other:       { bn: 'অন্য কারণ (যেমন হায়েজ, নিফাস)', en: 'Other cause (e.g. menses, postnatal bleeding)', fidya: 'none', qada: true, q: '', qe: '',
                   rb: 'এই অ্যাপের সূত্রগ্রন্থে এই কারণের নিয়ম পাইনি — আপনার মারজার কাছে জেনে নিন। কাযার দিন গোনা চলবে।', re: 'The source text used by this app has no rule for this cause — ask your own marja. You can still count qada days.', kc: [] }
};
const R_ORDER = ['travel', 'harm', 'preg', 'preg_baby', 'nurse_baby', 'deliberate', 'other'];
const DELAY_KC = [['qa', 'q145']];
const MONEY_KC = [['masail', 'm373']];

let _draft = null;   // {y, n} prefill from the Ramadan tracker

function arr(name) { try { const a = window[name]; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function todayH() {
    try { const h = (typeof approxHijriNow === 'function') ? approxHijriNow() : null; return h ? { d: h.day, m: h.month, y: h.year } : null; } catch (e) { return null; }
}
const clampInt = (v, lo, hi) => { v = parseInt(v, 10); if (!Number.isFinite(v)) return lo; return Math.max(lo, Math.min(hi, v)); };

// ---------------------------------------------------------------------------
// Rules → numbers (pure)
// ---------------------------------------------------------------------------
function qadaDue(e) { const R = REASONS[e.r] || REASONS.other; return (R.fidya === 'cont' && e.x) ? 0 : e.n; }
function fidyaDue(e) {
    const R = REASONS[e.r] || REASONS.other;
    let base = 0;
    if (R.fidya === 'all') base = e.n;
    else if (R.fidya === 'cont' && e.x) base = e.n;
    const extra = (e.l && !(R.fidya === 'cont' && e.x)) ? e.n : 0;   // delay fidya: once per day (Q799); not twice for the same illness
    return base + extra;
}
function totals(list, price) {
    let qLeft = 0, fLeft = 0;
    list.forEach(e => { qLeft += Math.max(0, qadaDue(e) - e.q); fLeft += Math.max(0, fidyaDue(e) - e.f); });
    const grams = fLeft * MUDD_G, kg = grams / 1000;
    return { qLeft: qLeft, fLeft: fLeft, grams: grams, kg: kg, money: price > 0 ? kg * price : 0 };
}

// ---------------------------------------------------------------------------
// Storage (device only, sanitised on every read)
// ---------------------------------------------------------------------------
function clean(raw) {
    const out = { v: 1, p: '', e: [] };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    const p = parseFloat(raw.p); if (Number.isFinite(p) && p > 0 && p < 1e6) out.p = String(p);
    if (Array.isArray(raw.e)) raw.e.slice(0, MAX_ENTRIES).forEach(x => {
        if (!x || typeof x !== 'object') return;
        const y = parseInt(x.y, 10), n = parseInt(x.n, 10);
        if (!Number.isInteger(y) || y < 1400 || y > 1600 || !Number.isInteger(n) || n < 1 || n > 30) return;
        const r = REASONS[x.r] ? x.r : 'other';
        const e = { id: String(x.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || ('q' + out.e.length + n), y: y, r: r, n: n, q: 0, f: 0, l: x.l ? 1 : 0, x: x.x ? 1 : 0 };
        e.q = clampInt(x.q, 0, qadaDue(e));
        e.f = clampInt(x.f, 0, fidyaDue(e));
        out.e.push(e);
    });
    return out;
}
function load() { try { return clean(typeof lsGet === 'function' ? lsGet(KEY, null) : null); } catch (e) { return clean(null); } }
function save(s) { try { if (typeof lsSet === 'function') lsSet(KEY, s); } catch (e) { /* best effort */ } }
function newId() { return 'q' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }

// ---------------------------------------------------------------------------
// Suggestion from the existing Ramadan fasting tracker (read-only)
// ---------------------------------------------------------------------------
function trackerSuggest() {
    try {
        const h = todayH(); if (!h || typeof window._amTrackLoad !== 'function') return null;
        const s = window._amTrackLoad(); if (!s || !s.y) return null;
        const fasted = Object.keys(s.d || {}).length;
        let passed = 0;
        if (s.y === h.y && h.m === 9) passed = h.d;
        else if (s.y < h.y || (s.y === h.y && h.m > 9)) passed = 30;
        const missed = Math.max(0, Math.min(30, passed) - fasted);
        return missed > 0 ? { y: s.y, n: missed } : null;
    } catch (e) { return null; }
}

// ---------------------------------------------------------------------------
// Knowledge Center links (existing items only)
// ---------------------------------------------------------------------------
function kcItem(tab, id) {
    const name = tab === 'fatwa' ? 'kcFatwa' : (tab === 'masail' ? 'kcMasail' : 'kcQa');
    return arr(name).find(x => x && x.id === id) || null;
}
function kcBtns(list) {
    return list.map(p => {
        const it = kcItem(p[0], p[1]); if (!it) return '';
        const q = EN() ? (it.questionEn || it.questionBn) : (it.questionBn || it.questionEn);
        return `<button type="button" class="am-btn qf-mini" data-qf-act="open" data-qf-tab="${E(p[0])}" data-qf-id="${E(p[1])}" title="${E(q || '')}">${T('জ্ঞান কেন্দ্রে মূল প্রশ্ন', 'Source in Knowledge Center')}: ${E(p[1])}</button>`;
    }).join('');
}
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
// Rendering
// ---------------------------------------------------------------------------
const fmtKg = kg => { const r = Math.round(kg * 100) / 100; return N(String(r).replace(/\.0+$/, '')); };
function entryHtml(e) {
    const R = REASONS[e.r] || REASONS.other;
    const qd = qadaDue(e), fd = fidyaDue(e);
    const qaLine = qd > 0
        ? `<div class="qf-ctl"><span>${T('কাযা সম্পন্ন', 'Qada done')}</span><button type="button" class="qf-pm" data-qf-act="qm" data-qf-id="${E(e.id)}" aria-label="${E(T('কমান', 'Decrease'))}"${e.q <= 0 ? ' disabled' : ''}>−</button><b>${N(e.q)} / ${N(qd)}</b><button type="button" class="qf-pm" data-qf-act="qp" data-qf-id="${E(e.id)}" aria-label="${E(T('বাড়ান', 'Increase'))}"${e.q >= qd ? ' disabled' : ''}>+</button></div>`
        : `<div class="qf-ctl"><span>${T('কাযা', 'Qada')}</span><b>${T('এই ক্ষেত্রে গোনা হয়নি — প্রশ্ন ৭৪৫ ও ৭৪৮ দেখুন', 'Not counted here — see q.745 and q.748')}</b></div>`;
    const fiLine = fd > 0
        ? `<div class="qf-ctl"><span>${T('ফিদইয়া দেওয়া (দিন)', 'Fidya given (days)')}</span><button type="button" class="qf-pm" data-qf-act="fm" data-qf-id="${E(e.id)}" aria-label="${E(T('কমান', 'Decrease'))}"${e.f <= 0 ? ' disabled' : ''}>−</button><b>${N(e.f)} / ${N(fd)}</b><button type="button" class="qf-pm" data-qf-act="fp" data-qf-id="${E(e.id)}" aria-label="${E(T('বাড়ান', 'Increase'))}"${e.f >= fd ? ' disabled' : ''}>+</button></div>`
        : '';
    const flagX = R.fidya === 'cont'
        ? `<label class="qf-flag"><input type="checkbox" data-qf-act="tx" data-qf-id="${E(e.id)}"${e.x ? ' checked' : ''}> ${T('অসুস্থতা পরের রমজান পর্যন্ত চলেছে (ফিদইয়া — প্রশ্ন ৭৪৮, ৮০০)', 'The illness lasted until the next Ramadan (fidya — q.748, 800)')}</label>` : '';
    const flagL = `<label class="qf-flag"><input type="checkbox" data-qf-act="tl" data-qf-id="${E(e.id)}"${e.l ? ' checked' : ''}> ${T('কাযা পরের রমজান পেরিয়ে গেছে — ওজর ছাড়া, গাফলতিতে (দিনপ্রতি একবার ফিদইয়া — প্রশ্ন ৭৯৯, ৮০২)', 'Qada went past the next Ramadan through negligence, without an excuse (one fidya per day — q.799, 802)')}</label>`;
    return `<li class="qf-entry">
        <div class="qf-eh"><b>${N(e.y)} ${T('হিজরি', 'AH')}</b> · ${E(EN() ? R.en : R.bn)} · ${N(e.n)} ${T('দিন', e.n === 1 ? 'day' : 'days')}</div>
        <p class="qf-rule">${E(EN() ? R.re : R.rb)}${R.q ? ` <span class="qf-qn">(${T('প্রশ্ন ', 'q. ')}${E(EN() ? R.qe : R.q)})</span>` : ''}</p>
        ${qaLine}${fiLine}${flagX}${flagL}
        <p class="am-note">${T('ওজরবশত কাযা পিছালে ফিদইয়া নেই (প্রশ্ন ৮০৬); সতর্কতায় দেওয়া ভালো।', 'If the delay had a valid excuse, no fidya is due (q.806), though giving it is the caution.')}</p>
        <div class="qf-links">${kcBtns(R.kc)}${kcBtns(DELAY_KC)}</div>
        <div class="am-actions"><button type="button" class="am-btn" data-qf-act="del" data-qf-id="${E(e.id)}">${T('এন্ট্রি মুছুন', 'Delete entry')}</button></div>
    </li>`;
}
function inner() {
    const s = load(), price = parseFloat(s.p) || 0, tt = totals(s.e, price);
    const h = todayH(), sug = trackerSuggest();
    const defY = _draft ? _draft.y : (h ? (h.m >= 9 ? h.y : h.y - 1) : 1447);
    const defN = _draft ? _draft.n : 1;
    const reasons = R_ORDER.map(k => `<option value="${k}">${E(EN() ? REASONS[k].en : REASONS[k].bn)}</option>`).join('');
    const imp = (sug && !s.e.some(e => e.y === sug.y && e.src === 'tr'))
        ? `<div class="am-actions"><button type="button" class="am-btn" data-qf-act="import">${T('রমজানের হিসাব থেকে আনুন', 'Fill from the Ramadan tracker')} (${N(sug.y)}: ${N(sug.n)} ${T('দিন বাদ', 'missed')})</button></div><p class="am-note">${T('৩০ দিন ধরে হিসাব; মাস ২৯ দিনের হলে সংখ্যা কমিয়ে নিন। কারণ বেছে "যোগ করুন" চাপুন।', 'Counted on a 30-day month; lower the number if the month had 29 days. Choose the reason and press Add.')}</p>` : '';
    const money = tt.money > 0 ? ` · ${T('আনুমানিক', 'about')} <b>${N(Math.round(tt.money))}</b> ${T('টাকা', 'currency units')}` : '';
    const sum = `<div class="qf-sum">
        <div><small>${T('কাযা বাকি', 'Qada left')}</small><b>${N(tt.qLeft)}</b> ${T('দিন', 'days')}</div>
        <div><small>${T('ফিদইয়া বাকি', 'Fidya left')}</small><b>${N(tt.fLeft)}</b> ${T('দিন', 'days')}${tt.fLeft ? `<br><span class="qf-kg">${N(tt.grams)} ${T('গ্রাম', 'g')} (${fmtKg(tt.kg)} ${T('কেজি', 'kg')})${money}</span>` : ''}</div>
    </div>`;
    const list = s.e.length ? `<ul class="qf-list">${s.e.map(entryHtml).join('')}</ul>` : `<p class="am-note">${T('এখনো কোনো এন্ট্রি নেই। নিচের ফর্মে বাদ পড়া রোজার হিসাব যোগ করুন।', 'No entries yet. Add missed fasts with the form below.')}</p>`;
    return `<h3>🧾 ${T('কাযা ও ফিদইয়া সঙ্গী', 'Qaza & Fidya companion')}</h3>
        <p class="am-note">${T('বাদ পড়া রোজার কারণ, কাযা বাকি ও ফিদইয়ার হিসাব — সারা বছরের জন্য। শুধু আপনার ডিভাইসে থাকে।', 'Missed fasts, qada still owed and fidya outstanding — for the whole year. Kept on this device only.')}</p>
        ${sum}${list}
        <div class="qf-add">
            <h4>${T('বাদ পড়া রোজা যোগ করুন', 'Add missed fasts')}</h4>
            <div class="qf-grid">
                <label class="qf-f">${T('হিজরি বছর', 'Hijri year')}<input id="qf-y" class="rp-input" type="number" inputmode="numeric" min="1400" max="1600" value="${E(defY)}"></label>
                <label class="qf-f">${T('বাদ পড়া দিন', 'Missed days')}<input id="qf-n" class="rp-input" type="number" inputmode="numeric" min="1" max="30" value="${E(defN)}"></label>
                <label class="qf-f qf-wide">${T('কারণ', 'Reason')}<select id="qf-r" class="rp-input">${reasons}</select></label>
            </div>
            <div class="am-actions"><button type="button" class="am-btn" data-qf-act="add">${T('যোগ করুন', 'Add')}</button></div>
            ${imp}
        </div>
        <div class="qf-price">
            <label class="qf-f">${T('ফিদইয়ার খাদ্যের দাম (প্রতি কেজি, ঐচ্ছিক)', 'Price of the food per kg (optional)')}<input id="qf-price" class="rp-input" type="number" inputmode="decimal" min="0" step="0.01" value="${E(s.p)}"></label>
            <p class="am-note">${T('প্রতিদিন ১ মুদ = ৭৫০ গ্রাম (প্রশ্ন ৭৪৩, ৭৯৯)। খাদ্যের বদলে টাকা দেওয়া যায় — যদি নিশ্চিত থাকেন গ্রহীতা আপনার পক্ষ থেকে সেই টাকায় খাদ্য কিনে ফিদইয়া হিসেবে নেবেন (প্রশ্ন ৭৯৭)।', '1 mudd = 750 g per day (q.743, 799). Money may be given instead of food if you are sure the recipient will buy the food on your behalf and take it as fidya (q.797).')} ${kcBtns(MONEY_KC)}</p>
        </div>
        <p class="am-note">${T('এই নিয়মগুলো প্রয়াত আয়াতুল্লাহ খামেনেইর "Practical Laws of Islam" থেকে (প্রশ্ন নম্বরসহ); আপনার বর্তমান মারজার মতে ভিন্ন হতে পারে — তাঁর কাছে জেনে নিন।', 'These rules are from the late Ayatollah Khamenei’s "Practical Laws of Islam" (with question numbers); your current marja may differ — ask him.')}</p>`;
}
function section(d) { return `<section class="am-card qf-card${d ? ' am-d' : ''}" id="qf-root">${inner()}</section>`; }
function paint() { const r = (typeof document !== 'undefined') ? document.getElementById('qf-root') : null; if (r) r.innerHTML = inner(); }

// ---------------------------------------------------------------------------
// Hooks (additive wrappers)
// ---------------------------------------------------------------------------
const _prevR = window.renderRamadanPage;
if (typeof _prevR === 'function') {
    window.renderRamadanPage = function () {
        let html = _prevR.apply(this, arguments);
        if (typeof html !== 'string' || html.indexOf('id="am-root"') < 0) return html;
        try {
            const d = !!state.darkMode;
            const k = html.indexOf('id="rj-sec"');
            let at = k >= 0 ? html.lastIndexOf('<section', k) : -1;
            if (at < 0) at = html.lastIndexOf('</div>');
            if (at < 0) return html;
            html = html.slice(0, at) + section(d) + html.slice(at);
        } catch (e) { /* never break the page */ }
        return html;
    };
}
const _prevK = window.renderKhumsZakatPage;
if (typeof _prevK === 'function') {
    window.renderKhumsZakatPage = function () {
        let html = _prevK.apply(this, arguments);
        if (typeof html !== 'string' || html.indexOf('id="kz-root"') < 0) return html;
        try { html = html + `<div class="qf-wrap">${section(!!state.darkMode)}</div>`; } catch (e) { /* never break the page */ }
        return html;
    };
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', ev => {
        const el = ev.target && ev.target.closest ? ev.target.closest('[data-qf-act]') : null;
        if (!el || !document.getElementById('qf-root')) return;
        const a = el.getAttribute('data-qf-act'), id = el.getAttribute('data-qf-id');
        if (a === 'open') { openKc(el.getAttribute('data-qf-tab'), id); return; }
        if (a === 'tx' || a === 'tl') return;   // handled on 'change'
        const s = load(), e = s.e.find(x => x.id === id);
        if (a === 'add') {
            const yEl = document.getElementById('qf-y'), nEl = document.getElementById('qf-n'), rEl = document.getElementById('qf-r');
            const y = parseInt(yEl && yEl.value, 10), n = parseInt(nEl && nEl.value, 10), r = rEl && REASONS[rEl.value] ? rEl.value : 'other';
            if (!Number.isInteger(y) || y < 1400 || y > 1600 || !Number.isInteger(n) || n < 1 || n > 30) { _draft = { y: Number.isInteger(y) ? y : 1447, n: 1 }; return; }
            if (s.e.length >= MAX_ENTRIES) return;
            const ent = { id: newId(), y: y, r: r, n: n, q: 0, f: 0, l: 0, x: 0 };
            if (_draft && _draft.src === 'tr' && _draft.y === y) ent.src = 'tr';
            s.e.push(ent); _draft = null; save(s); paint(); return;
        }
        if (a === 'import') { const sug = trackerSuggest(); if (sug) { _draft = { y: sug.y, n: sug.n, src: 'tr' }; paint(); } return; }
        if (!e) return;
        if (a === 'qp') e.q = clampInt(e.q + 1, 0, qadaDue(e));
        else if (a === 'qm') e.q = clampInt(e.q - 1, 0, qadaDue(e));
        else if (a === 'fp') e.f = clampInt(e.f + 1, 0, fidyaDue(e));
        else if (a === 'fm') e.f = clampInt(e.f - 1, 0, fidyaDue(e));
        else if (a === 'del') {
            if (typeof confirm === 'function' && !confirm(T('এই এন্ট্রি মুছে ফেলবেন?', 'Delete this entry?'))) return;
            s.e = s.e.filter(x => x.id !== id);
        } else return;
        save(s); paint();
    });
    document.addEventListener('change', ev => {
        const t = ev.target; if (!t || !t.getAttribute || !document.getElementById('qf-root')) return;
        if (t.id === 'qf-price') {
            const s = load(), p = parseFloat(t.value); s.p = (Number.isFinite(p) && p > 0 && p < 1e6) ? String(p) : ''; save(s); paint(); return;
        }
        const a = t.getAttribute('data-qf-act'); if (a !== 'tx' && a !== 'tl') return;
        const s = load(), e = s.e.find(x => x.id === t.getAttribute('data-qf-id')); if (!e) return;
        if (a === 'tx') e.x = t.checked ? 1 : 0; else e.l = t.checked ? 1 : 0;
        e.q = clampInt(e.q, 0, qadaDue(e)); e.f = clampInt(e.f, 0, fidyaDue(e));
        save(s); paint();
    });
}

// test hooks (pure / read-only)
window._qf = { qadaDue: qadaDue, fidyaDue: fidyaDue, totals: totals, clean: clean, load: load, trackerSuggest: trackerSuggest, inner: inner, REASONS: REASONS, MUDD_G: MUDD_G };
})();
