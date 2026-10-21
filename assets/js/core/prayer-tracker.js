// ============================================================================
// PRAYER TRACKER & QAZA COUNTER  (v207)
// ----------------------------------------------------------------------------
// A card on the Prayer page (`prayer`), under today's times:
//
//   1. Daily tracker — a 7-day strip (today + previous 6 days) and five prayer
//      buttons. Each tap cycles:  ○ not marked → ✓ prayed → ✗ missed → ○.
//      Marking ✗ adds one to that prayer's qaza balance; moving off ✗ takes
//      it back (never below 0).
//   2. Qaza counter — one balance per prayer with − ("I prayed one qaza") and
//      + buttons, a total, and an optional "starting balance" helper that
//      turns "N years M months missed" into a per-prayer number (plain
//      arithmetic: years × 365 + months × 30 days).
//   3. Small stats — current all-five streak, last-7-days total, qaza total.
//
// ARCHITECTURE (additive)
//   * Own storage key `ahlbayt_prayer_tracker` (device only), shape
//       { v:1, updated:<ms>, days:{ 'YYYY-MM-DD': { fajr:1|2, … } }, qaza:{ fajr:n, … } }
//     Only 1 (prayed) and 2 (missed) are stored; "not marked" is absence.
//     Days older than 400 are pruned on save, which also keeps the object well
//     inside the backup importer's 500-keys-per-object limit.
//   * Every tap rewrites only #pt-card (ptRefresh) — no global render(), so the
//     page does not jump or re-fetch anything. Handlers are inline onclick,
//     so setupEventListeners() is not touched.
//   * ptNormalize()/ptMergeBackup() are used by data-backup.js to validate and
//     merge an imported backup (a backup file is untrusted input).
//   * No religious rulings are written here. The card says the counts are only
//     a helper and links to the Knowledge Center for rulings.
//
// Loads after prayer-reminders.js (renderPrayerPage() calls prayerTrackerCard()
// behind a typeof guard). Needs: state, lsGet, lsSet, toBengaliDigits,
// showToast; optional: changePage.
// ============================================================================

const PT_KEY = 'ahlbayt_prayer_tracker';
const PT_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PT_NAMES = {
    fajr:    { bn: 'ফজর',    en: 'Fajr' },
    dhuhr:   { bn: 'যোহর',   en: 'Dhuhr' },
    asr:     { bn: 'আসর',    en: 'Asr' },
    maghrib: { bn: 'মাগরিব', en: 'Maghrib' },
    isha:    { bn: 'ইশা',    en: 'Isha' }
};
const PT_ICONS = { fajr: '🌅', dhuhr: '☀️', asr: '🌤', maghrib: '🌇', isha: '🌙' };
const PT_KEEP_DAYS = 400;
const PT_QAZA_MAX = 999999;
const PT_MON_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const PT_MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PT_DOW_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const PT_DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let _pt = null;                                   // loaded data
const _ptUi = { sel: null, calcOpen: false, cy: 0, cm: 0 };   // view-only state

function ptT(b, e) { return state.language === 'bn' ? b : e; }
function ptN(n) { return state.language === 'bn' ? toBengaliDigits(n) : String(n); }
function ptName(k) { return PT_NAMES[k][state.language === 'bn' ? 'bn' : 'en']; }

// ---------------------------------------------------------------------------
// Dates (device-local calendar days)
// ---------------------------------------------------------------------------
function ptPad(n) { return String(n).padStart(2, '0'); }
function ptKey(dt) { return dt.getFullYear() + '-' + ptPad(dt.getMonth() + 1) + '-' + ptPad(dt.getDate()); }
function ptToday() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function ptAddDays(dt, n) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n); }
function ptLastDays(n) { const t = ptToday(), out = []; for (let i = n - 1; i >= 0; i--) out.push(ptAddDays(t, -i)); return out; }

// ---------------------------------------------------------------------------
// Data: normalise / load / save / merge
// ---------------------------------------------------------------------------
// Accepts anything (stored value or an imported backup) and returns a clean object.
function ptNormalize(raw) {
    const out = { v: 1, updated: 0, days: {}, qaza: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    if (typeof raw.updated === 'number' && isFinite(raw.updated) && raw.updated > 0) out.updated = Math.floor(raw.updated);
    if (raw.qaza && typeof raw.qaza === 'object') {
        PT_ORDER.forEach(k => {
            const n = raw.qaza[k];
            if (typeof n === 'number' && isFinite(n) && n > 0) out.qaza[k] = Math.min(PT_QAZA_MAX, Math.floor(n));
        });
    }
    if (raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days)) {
        Object.keys(raw.days).sort().slice(-450).forEach(dk => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) return;
            const src = raw.days[dk];
            if (!src || typeof src !== 'object') return;
            const day = {};
            PT_ORDER.forEach(k => { if (src[k] === 1 || src[k] === 2) day[k] = src[k]; });
            if (Object.keys(day).length) out.days[dk] = day;
        });
    }
    return out;
}
function ptLoad() {
    if (_pt) return _pt;
    let raw = null;
    try { raw = lsGet(PT_KEY, null); } catch (e) { raw = null; }
    _pt = ptNormalize(raw);
    return _pt;
}
function ptSave() {
    const P = ptLoad();
    // prune old days
    const cutoff = ptKey(ptAddDays(ptToday(), -PT_KEEP_DAYS));
    Object.keys(P.days).forEach(k => { if (k < cutoff) delete P.days[k]; });
    P.updated = Date.now();
    try { lsSet(PT_KEY, P); } catch (e) { /* best effort */ }
}
// Used by data-backup.js (merge mode). Days: union, this device wins on a clash.
// Qaza balances can't be merged meaningfully, so the side saved more recently wins.
function ptMergeBackup(local, incoming) {
    const L = ptNormalize(local), I = ptNormalize(incoming);
    const out = ptNormalize(null);
    const keys = {}; Object.keys(L.days).concat(Object.keys(I.days)).forEach(k => { keys[k] = 1; });
    Object.keys(keys).forEach(k => { out.days[k] = Object.assign({}, I.days[k] || {}, L.days[k] || {}); });
    const newer = I.updated > L.updated ? I : L;
    PT_ORDER.forEach(k => { out.qaza[k] = newer.qaza[k]; });
    out.updated = Math.max(L.updated, I.updated);
    return ptNormalize(out);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
function ptDayStat(dk) {
    const o = ptLoad().days[dk] || {};
    let ok = 0, miss = 0;
    PT_ORDER.forEach(k => { if (o[k] === 1) ok++; else if (o[k] === 2) miss++; });
    return { ok: ok, miss: miss };
}
function ptStreak() {
    let dt = ptToday();
    const full = d => ptDayStat(ptKey(d)).ok === 5;
    if (!full(dt)) dt = ptAddDays(dt, -1);          // today still in progress → don't break the streak
    let n = 0;
    while (n < PT_KEEP_DAYS && full(dt)) { n++; dt = ptAddDays(dt, -1); }
    return n;
}
function ptWeekOk() { let n = 0; ptLastDays(7).forEach(d => { n += ptDayStat(ptKey(d)).ok; }); return n; }
function ptQazaTotal() { const q = ptLoad().qaza; return PT_ORDER.reduce((s, k) => s + q[k], 0); }
function ptSelKey() {
    const keys = ptLastDays(7).map(ptKey);
    if (!_ptUi.sel || keys.indexOf(_ptUi.sel) < 0) _ptUi.sel = keys[keys.length - 1];
    return _ptUi.sel;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function ptTimeFor(k, isToday) {
    if (!isToday || typeof state === 'undefined' || !state.prayerTimes || state.prayerTimesSource === 'default') return '';
    const t = state.prayerTimes[k];
    return t ? (state.language === 'bn' ? toBengaliDigits(t) : String(t)) : '';
}
function ptDayChips() {
    const sel = ptSelKey(), bn = state.language === 'bn', today = ptKey(ptToday());
    return ptLastDays(7).map(dt => {
        const dk = ptKey(dt), st = ptDayStat(dk), on = dk === sel;
        const dow = (bn ? PT_DOW_BN : PT_DOW_EN)[dt.getDay()];
        const label = ptN(dt.getDate()) + ' ' + (bn ? PT_MON_BN : PT_MON_EN)[dt.getMonth()] + ' — ' + ptN(st.ok) + '/' + ptN(5) + ' ' + ptT('পড়া হয়েছে', 'prayed');
        return '<button type="button" class="pt-day' + (on ? ' on' : '') + (dk === today ? ' pt-today' : '') + '" aria-pressed="' + on + '" aria-label="' + label + '" data-pt-f="d-' + dk + '" onclick="ptPickDay(\'' + dk + '\')">'
            + '<span class="pt-dw">' + dow + '</span><b class="pt-dn">' + ptN(dt.getDate()) + '</b>'
            + '<span class="pt-ds' + (st.ok === 5 ? ' pt-full' : '') + '">' + ptN(st.ok) + '/' + ptN(5) + '</span>'
            + (st.miss ? '<i class="pt-dot" aria-hidden="true"></i>' : '') + '</button>';
    }).join('');
}
function ptCells() {
    const dk = ptSelKey(), isToday = dk === ptKey(ptToday()), o = ptLoad().days[dk] || {};
    const glyph = ['○', '✓', '✗'];
    const word = [ptT('চিহ্ন নেই', 'not marked'), ptT('পড়েছি', 'prayed'), ptT('ছুটে গেছে', 'missed')];
    return PT_ORDER.map(k => {
        const s = o[k] || 0, tm = ptTimeFor(k, isToday);
        return '<button type="button" class="pt-cell pt-s' + s + '" data-pt-f="c-' + k + '" onclick="ptCycle(\'' + k + '\')" aria-label="' + ptName(k) + ' — ' + word[s] + '. ' + ptT('বদলাতে ট্যাপ করুন', 'Tap to change') + '">'
            + '<span class="pt-ic" aria-hidden="true">' + PT_ICONS[k] + '</span><span class="pt-nm">' + ptName(k) + '</span>'
            + '<span class="pt-tm">' + (tm || '&nbsp;') + '</span><span class="pt-st" aria-hidden="true">' + glyph[s] + '</span></button>';
    }).join('');
}
function ptSelLabel() {
    const dk = ptSelKey(), bn = state.language === 'bn', p = dk.split('-').map(Number);
    const dt = new Date(p[0], p[1] - 1, p[2]);
    const base = (bn ? PT_DOW_BN : PT_DOW_EN)[dt.getDay()] + ', ' + ptN(dt.getDate()) + ' ' + (bn ? PT_MON_BN : PT_MON_EN)[dt.getMonth()];
    return dk === ptKey(ptToday()) ? ptT('আজ', 'Today') + ' — ' + base : base;
}
function ptQazaGrid() {
    const q = ptLoad().qaza;
    return PT_ORDER.map(k => {
        return '<div class="pt-q"><span class="pt-qn">' + ptName(k) + '</span><b class="pt-qv">' + ptN(q[k]) + '</b>'
            + '<div class="pt-qb"><button type="button" data-pt-f="qm-' + k + '" onclick="ptQaza(\'' + k + '\',-1)"' + (q[k] <= 0 ? ' disabled' : '') + ' aria-label="' + ptName(k) + ' — ' + ptT('একটি কাযা পড়লাম (১ কমান)', 'I prayed one qaza (−1)') + '">−</button>'
            + '<button type="button" data-pt-f="qp-' + k + '" onclick="ptQaza(\'' + k + '\',1)" aria-label="' + ptName(k) + ' — ' + ptT('১ বাড়ান', 'Add one') + '">+</button></div></div>';
    }).join('');
}
function ptCalcDays() { return Math.max(0, _ptUi.cy | 0) * 365 + Math.max(0, _ptUi.cm | 0) * 30; }
function ptCalcPreview() {
    const n = ptCalcDays();
    if (!n) return ptT('বছর/মাস দিলে প্রতি ওয়াক্তের আনুমানিক সংখ্যা এখানে দেখাবে।', 'Enter years/months to see the approximate number per prayer.');
    return ptT('প্রতি ওয়াক্তে ' + ptN(n) + 'টি — মোট ' + ptN(n * 5) + 'টি নামাজ (আনুমানিক)', ptN(n) + ' per prayer — ' + ptN(n * 5) + ' prayers in total (approx.)');
}
function ptInner() {
    return '<div class="pt-head"><h3 class="pr-title">✅ ' + ptT('নামাজ ট্র্যাকার ও কাযা', 'Prayer tracker & qaza') + '</h3>'
        + '<p class="pr-sub">' + ptT('আপনার হিসাব শুধু এই ডিভাইসে থাকে। ব্যাকআপ পেজ থেকে সংরক্ষণ করা যায়।', 'Your log stays on this device only. You can save it from the Backup page.') + '</p></div>'
        + '<div class="pt-stats">'
        + '<div class="pt-stat"><b>🔥 ' + ptN(ptStreak()) + '</b><span>' + ptT('দিন ধারাবাহিক', 'day streak') + '</span></div>'
        + '<div class="pt-stat"><b>📅 ' + ptN(ptWeekOk()) + '/' + ptN(35) + '</b><span>' + ptT('গত ৭ দিনে', 'last 7 days') + '</span></div>'
        + '<div class="pt-stat"><b>🕋 ' + ptN(ptQazaTotal()) + '</b><span>' + ptT('কাযা বাকি', 'qaza left') + '</span></div></div>'
        + '<div class="pt-strip" role="group" aria-label="' + ptT('গত ৭ দিন', 'Last 7 days') + '">' + ptDayChips() + '</div>'
        + '<p class="pt-sel">' + ptSelLabel() + '</p>'
        + '<div class="pt-cells" role="group" aria-label="' + ptT('নামাজ', 'Prayers') + '">' + ptCells() + '</div>'
        + '<p class="pt-legend">' + ptT('ট্যাপ করুন: ○ বাকি → ✓ পড়েছি → ✗ ছুটে গেছে (কাযা জমবে) → ○', 'Tap: ○ not marked → ✓ prayed → ✗ missed (adds to qaza) → ○') + '</p>'
        + '<h4 class="pr-lbl">🕋 ' + ptT('কাযা নামাজের হিসাব', 'Qaza balance') + '</h4>'
        + '<div class="pt-qgrid">' + ptQazaGrid() + '</div>'
        + '<p class="pt-total">' + ptT('মোট কাযা বাকি: ', 'Total qaza left: ') + '<b>' + ptN(ptQazaTotal()) + '</b></p>'
        + '<details class="pt-calc"' + (_ptUi.calcOpen ? ' open' : '') + ' ontoggle="ptCalcToggle(this.open)"><summary>🧮 ' + ptT('শুরুর হিসাব — বাদ পড়া সময় থেকে', 'Starting balance — from a missed period') + '</summary>'
        + '<div class="dc-fields"><label class="dc-field"><span>' + ptT('বছর', 'Years') + '</span><input type="number" id="pt-cy" inputmode="numeric" min="0" max="80" value="' + (_ptUi.cy || '') + '" placeholder="0" oninput="ptCalcInput()"></label>'
        + '<label class="dc-field"><span>' + ptT('মাস', 'Months') + '</span><input type="number" id="pt-cm" inputmode="numeric" min="0" max="11" value="' + (_ptUi.cm || '') + '" placeholder="0" oninput="ptCalcInput()"></label></div>'
        + '<p class="pr-sub" id="pt-calc-prev" aria-live="polite">' + ptCalcPreview() + '</p>'
        + '<button type="button" class="pr-btn" onclick="ptCalcAdd()">➕ ' + ptT('প্রতি ওয়াক্তে যোগ করুন', 'Add to every prayer') + '</button></details>'
        + '<div class="pr-note"><b>ℹ️ ' + ptT('জেনে রাখুন', 'Please note') + '</b>'
        + '<p>' + ptT('এটি শুধু গণনার সহায়ক। কাযার বিধান, নিয়ত, সফরের নামাজ ইত্যাদি আপনার মারজার ফতোয়া অনুযায়ী — মাসআলার জন্য জ্ঞান কেন্দ্র বা নিজ মারজার দপ্তর দেখুন।', 'This is only a counting aid. Rulings on qaza, intention, travel prayers etc. follow your marja’s fatwa — see the Knowledge Center or your marja’s office.') + '</p>'
        + '<div class="pr-pills" style="margin-top:10px">'
        + (typeof changePage === 'function' ? '<button type="button" class="pr-btn pr-btn-ghost" onclick="changePage(\'knowledgeCenter\')">📚 ' + ptT('জ্ঞান কেন্দ্র', 'Knowledge Center') + '</button>' : '')
        + '<button type="button" class="pr-btn pr-btn-ghost" onclick="ptReset()">🗑️ ' + ptT('ট্র্যাকার মুছুন', 'Clear tracker') + '</button></div></div>';
}

// Called by renderPrayerPage()
function prayerTrackerCard(d, l) {
    return '<div class="pr-card pt-card' + (d ? ' pr-dark' : '') + '" id="pt-card">' + ptInner() + '</div>';
}
// Rewrite only the card; put keyboard focus back on the control that was used.
function ptRefresh(focusKey) {
    const card = document.getElementById('pt-card');
    if (!card) return;
    card.innerHTML = ptInner();
    if (focusKey) {
        const el = card.querySelector('[data-pt-f="' + focusKey + '"]');
        if (el && !el.disabled) { try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function ptPickDay(dk) {
    if (ptLastDays(7).map(ptKey).indexOf(dk) < 0) return;
    _ptUi.sel = dk;
    ptRefresh('d-' + dk);
}
// ○ → ✓ → ✗ → ○. Entering ✗ adds one qaza; leaving ✗ removes one (floor 0).
function ptCycle(k) {
    if (PT_ORDER.indexOf(k) < 0) return;
    const P = ptLoad(), dk = ptSelKey();
    const day = P.days[dk] || (P.days[dk] = {});
    const cur = day[k] || 0, next = (cur + 1) % 3;
    if (next === 2) P.qaza[k] = Math.min(PT_QAZA_MAX, P.qaza[k] + 1);
    if (cur === 2) P.qaza[k] = Math.max(0, P.qaza[k] - 1);
    if (next === 0) delete day[k]; else day[k] = next;
    if (!Object.keys(day).length) delete P.days[dk];
    ptSave();
    ptRefresh('c-' + k);
}
function ptQaza(k, delta) {
    if (PT_ORDER.indexOf(k) < 0 || (delta !== 1 && delta !== -1)) return;
    const P = ptLoad();
    P.qaza[k] = Math.max(0, Math.min(PT_QAZA_MAX, P.qaza[k] + delta));
    ptSave();
    // the − button becomes disabled at 0, so hand focus to + in that case
    ptRefresh(((delta < 0 && P.qaza[k] > 0) ? 'qm-' : 'qp-') + k);
}
function ptCalcToggle(open) { _ptUi.calcOpen = !!open; }
function ptCalcInput() {
    const y = parseInt(document.getElementById('pt-cy') && document.getElementById('pt-cy').value, 10);
    const m = parseInt(document.getElementById('pt-cm') && document.getElementById('pt-cm').value, 10);
    _ptUi.cy = isFinite(y) ? Math.max(0, Math.min(80, y)) : 0;
    _ptUi.cm = isFinite(m) ? Math.max(0, Math.min(11, m)) : 0;
    const el = document.getElementById('pt-calc-prev');
    if (el) el.textContent = ptCalcPreview();
}
function ptCalcAdd() {
    ptCalcInput();
    const n = ptCalcDays();
    if (!n) { showToast(ptT('আগে বছর বা মাস লিখুন', 'Enter years or months first'), 'warning'); return; }
    const P = ptLoad();
    PT_ORDER.forEach(k => { P.qaza[k] = Math.min(PT_QAZA_MAX, P.qaza[k] + n); });
    _ptUi.cy = 0; _ptUi.cm = 0; _ptUi.calcOpen = false;
    ptSave();
    showToast(ptT('✅ প্রতি ওয়াক্তে ' + ptN(n) + 'টি যোগ হয়েছে', '✅ Added ' + n + ' to every prayer'), 'success');
    ptRefresh();
}
function ptReset() {
    if (!confirm(ptT('নামাজের দৈনিক হিসাব ও কাযার সংখ্যা — সব মুছে যাবে। এগিয়ে যাবেন?', 'The daily log and all qaza counts will be erased. Continue?'))) return;
    _pt = ptNormalize(null);
    ptSave();
    _ptUi.sel = null; _ptUi.cy = 0; _ptUi.cm = 0; _ptUi.calcOpen = false;
    ptRefresh();
    showToast(ptT('মুছে ফেলা হয়েছে', 'Cleared'), 'info');
}
