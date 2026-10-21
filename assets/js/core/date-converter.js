// ============================================================================
// DATE CONVERTER  (v207)
// ----------------------------------------------------------------------------
// A card at the bottom of the Calendar page that converts ANY date between the
// three calendars the app already shows: Gregorian ↔ Hijri ↔ Bangla.
//
// ARCHITECTURE (additive — nothing existing is renamed or rewritten)
//   * Gregorian → Hijri is a NEW function (dcGregToHijri) that is the exact
//     inverse of the existing hijriToGregorian(): same anchor (1 Muharram 1447
//     = 27 Jun 2025) and same month lengths (getHijriMonthDays()). So a date
//     converted here always matches the cell the Calendar grid shows for it.
//   * Hijri → Gregorian simply calls the existing hijriToGregorian().
//   * Bangla → Gregorian is the inverse of the existing getBanglaDateFull():
//     it reuses _BN_START (Bangladesh national calendar, 2019 revision) and
//     verifies every result by converting back, so an impossible date (e.g.
//     31 Choitro) is rejected instead of silently rolling over.
//   * The Gregorian date (dcState.cur) is the single source of truth; the
//     other two are derived from it. Switching the input tab re-expresses the
//     same date in the new system.
//   * Typing never calls render(): inputs call dcOnInput(), which rewrites
//     only #dc-result (same pattern as the dzx search boxes), so the inputs
//     are never re-created and keep focus / cursor.
//   * Nothing is written to storage. No religious text is added — the only
//     text shown from existing data is the Calendar's own hijriEvents entry.
//
// Loads after script-3-pages.js (renderCalendarPage() calls dcCalendarCard()
// behind a typeof guard). Needs: state, hijriToGregorian, getHijriMonthDays,
// getBanglaDateFull, _BN_START, banglaMonthNames, hijriMonthsBn/En,
// hijriEvents, approxHijriNow, toBengaliDigits, sanitize, showToast,
// shareContent, calOpenEvent (all optional-guarded where practical).
// ============================================================================

const DC_REF_UTC = Date.UTC(2025, 5, 27);          // 1 Muharram 1447 AH
const DC_G_MIN = 1900, DC_G_MAX = 2100;            // Gregorian range
const DC_H_MIN = 1318, DC_H_MAX = 1520;            // ≈ same span in Hijri years
const DC_B_MIN = 1307, DC_B_MAX = 1507;            // ≈ same span in Bangla years
const DC_GREG_BN = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const DC_GREG_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DC_BN_EN = ['Boishakh','Joishtho','Asharh','Shrabon','Bhadro','Ashwin','Kartik','Ogrohayon','Poush','Magh','Falgun','Choitro'];
const DC_DOW_BN = ['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
const DC_DOW_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const dcState = { mode: 'g', cur: null, ui: { gStr: '', hd: 1, hm: 1, hy: 1447, bd: 1, bm: 0, by: 1433 } };

function dcT(b, e) { return state.language === 'bn' ? b : e; }
function dcN(n) { return state.language === 'bn' ? toBengaliDigits(n) : String(n); }
function dcPad(n, w) { return String(n).padStart(w || 2, '0'); }

// ---------------------------------------------------------------------------
// Conversion core
// ---------------------------------------------------------------------------
// Gregorian (y, m0 = 0-based month, d) → { year, month, day } Hijri.
// UTC day arithmetic, so a DST change in the user's time zone can never shift the result.
function dcGregToHijri(y, m0, d) {
    let diff = Math.round((Date.UTC(y, m0, d) - DC_REF_UTC) / 86400000);
    let hy = 1447, hm = 1, hd = 1;
    if (diff >= 0) {
        hd += diff;
        while (hd > getHijriMonthDays(hm, hy)) { hd -= getHijriMonthDays(hm, hy); hm++; if (hm > 12) { hm = 1; hy++; } }
    } else {
        diff = -diff;
        while (diff > 0) {
            if (diff < hd) { hd -= diff; diff = 0; }
            else { diff -= hd; hm--; if (hm < 1) { hm = 12; hy--; } hd = getHijriMonthDays(hm, hy); }
        }
    }
    return { year: hy, month: hm, day: hd };
}

// Bangla (day, monthIdx 0–11, year) → Date, or null when that date does not exist.
function dcBnToGreg(day, mi, by) {
    if (!(mi >= 0 && mi <= 11) || !(day >= 1 && day <= 31)) return null;
    const st = _BN_START[mi];
    const gY = mi <= 8 ? by + 593 : by + 594;       // Boishakh–Poush start in gY; Magh–Choitro in gY+1
    const dt = new Date(gY, st.m, st.d + day - 1);
    const back = dcBanglaOf(dt);
    return (back.day === day && back.month === mi && back.year === by) ? dt : null;
}

// getBanglaDateFull() divides a millisecond difference by 86400000 and floors it. For a local-midnight date,
// a DST change (or an old time-zone change) between the month start and the date makes that difference 1 h
// short, so the day comes out one too small. Asking about 12:00 of the same day leaves a 12 h margin,
// which makes the result independent of the device's time zone. (The existing function is left untouched.)
function dcBanglaOf(dt) { return getBanglaDateFull(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12)); }

// Gregorian Date → everything we display
function dcDescribe(dt) {
    const y = dt.getFullYear(), m0 = dt.getMonth(), d = dt.getDate();
    return { g: { y: y, m0: m0, d: d, dow: dt.getDay() }, h: dcGregToHijri(y, m0, d), b: dcBanglaOf(dt), date: dt };
}
function dcToday() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function dcInRange(dt) { const y = dt.getFullYear(); return y >= DC_G_MIN && y <= DC_G_MAX; }

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
function dcFmtG(g) { return dcN(g.d) + ' ' + (state.language === 'bn' ? DC_GREG_BN : DC_GREG_EN)[g.m0] + ' ' + dcN(g.y); }
function dcFmtH(h) { return dcN(h.day) + ' ' + (state.language === 'bn' ? hijriMonthsBn : hijriMonthsEn)[h.month - 1] + ' ' + dcN(h.year) + ' ' + dcT('হিজরি', 'AH'); }
function dcFmtB(b) { return dcN(b.day) + ' ' + (state.language === 'bn' ? banglaMonthNames : DC_BN_EN)[b.month] + ' ' + dcN(b.year) + ' ' + dcT('বঙ্গাব্দ', 'BS'); }
function dcRelative(dt) {
    const n = Math.round((Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) - (function () { const t = dcToday(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()); })()) / 86400000);
    if (n === 0) return dcT('আজ', 'Today');
    if (n === 1) return dcT('আগামীকাল', 'Tomorrow');
    if (n === -1) return dcT('গতকাল', 'Yesterday');
    return n > 0 ? dcT(dcN(n) + ' দিন পরে', 'In ' + n + ' days') : dcT(dcN(-n) + ' দিন আগে', (-n) + ' days ago');
}

// ---------------------------------------------------------------------------
// Reading the inputs
// ---------------------------------------------------------------------------
function dcVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }

// Returns { dt } or { err }
function dcReadInputs() {
    if (dcState.mode === 'g') {
        const s = dcVal('dc-g');
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (!m) return { err: dcT('একটি তারিখ বেছে নিন', 'Pick a date') };
        const y = +m[1], mo = +m[2] - 1, d = +m[3];
        const dt = new Date(y, mo, d);
        if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return { err: dcT('এই তারিখটি বৈধ নয়', 'That date is not valid') };
        if (!dcInRange(dt)) return { err: dcT('সীমা: ' + dcN(DC_G_MIN) + '–' + dcN(DC_G_MAX) + ' সাল', 'Range: ' + DC_G_MIN + '–' + DC_G_MAX) };
        return { dt: dt };
    }
    if (dcState.mode === 'h') {
        const d = parseInt(dcVal('dc-hd'), 10), m = parseInt(dcVal('dc-hm'), 10), y = parseInt(dcVal('dc-hy'), 10);
        if (!isFinite(y) || y < DC_H_MIN || y > DC_H_MAX) return { err: dcT('হিজরি সাল ' + dcN(DC_H_MIN) + '–' + dcN(DC_H_MAX) + ' এর মধ্যে দিন', 'Hijri year must be ' + DC_H_MIN + '–' + DC_H_MAX) };
        if (!(m >= 1 && m <= 12) || !(d >= 1)) return { err: dcT('একটি তারিখ বেছে নিন', 'Pick a date') };
        const len = getHijriMonthDays(m, y);
        if (d > len) return { err: dcT('এই মাসে ' + dcN(len) + ' দিন — ' + dcN(len) + ' বা তার কম দিন বেছে নিন', 'This month has ' + len + ' days') };
        return { dt: hijriToGregorian(d, m, y) };
    }
    const d = parseInt(dcVal('dc-bd'), 10), m = parseInt(dcVal('dc-bm'), 10), y = parseInt(dcVal('dc-by'), 10);
    if (!isFinite(y) || y < DC_B_MIN || y > DC_B_MAX) return { err: dcT('বাংলা সাল ' + dcN(DC_B_MIN) + '–' + dcN(DC_B_MAX) + ' এর মধ্যে দিন', 'Bangla year must be ' + DC_B_MIN + '–' + DC_B_MAX) };
    const dt = dcBnToGreg(d, m, y);
    if (!dt) return { err: dcT('এই বাংলা তারিখটি বৈধ নয় (মাসের দিন-সংখ্যা দেখুন)', 'That Bangla date does not exist') };
    return { dt: dt };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function dcOptions(list, sel, from) {
    return list.map((n, i) => { const v = i + (from || 0); return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + sanitize(n) + '</option>'; }).join('');
}
function dcDayOptions(max, sel) {
    let h = '';
    for (let i = 1; i <= max; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + dcN(i) + '</option>';
    return h;
}

function dcInputsHtml() {
    const u = dcState.ui, bn = state.language === 'bn';
    if (dcState.mode === 'g') {
        return '<div class="dc-fields"><label class="dc-field dc-field-wide"><span>' + dcT('গ্রেগরিয়ান (ইংরেজি) তারিখ', 'Gregorian date') + '</span>'
            + '<input type="date" id="dc-g" value="' + u.gStr + '" min="' + DC_G_MIN + '-01-01" max="' + DC_G_MAX + '-12-31" onchange="dcOnInput()" oninput="dcOnInput()"></label></div>';
    }
    if (dcState.mode === 'h') {
        return '<div class="dc-fields">'
            + '<label class="dc-field"><span>' + dcT('দিন', 'Day') + '</span><select id="dc-hd" onchange="dcOnInput()">' + dcDayOptions(30, u.hd) + '</select></label>'
            + '<label class="dc-field dc-field-grow"><span>' + dcT('হিজরি মাস', 'Hijri month') + '</span><select id="dc-hm" onchange="dcOnInput()">' + dcOptions(bn ? hijriMonthsBn : hijriMonthsEn, u.hm, 1) + '</select></label>'
            + '<label class="dc-field"><span>' + dcT('সাল', 'Year') + '</span><input type="number" id="dc-hy" inputmode="numeric" min="' + DC_H_MIN + '" max="' + DC_H_MAX + '" value="' + u.hy + '" oninput="dcOnInput()" onchange="dcOnInput()"></label></div>';
    }
    return '<div class="dc-fields">'
        + '<label class="dc-field"><span>' + dcT('দিন', 'Day') + '</span><select id="dc-bd" onchange="dcOnInput()">' + dcDayOptions(31, u.bd) + '</select></label>'
        + '<label class="dc-field dc-field-grow"><span>' + dcT('বাংলা মাস', 'Bangla month') + '</span><select id="dc-bm" onchange="dcOnInput()">' + dcOptions(bn ? banglaMonthNames : DC_BN_EN, u.bm, 0) + '</select></label>'
        + '<label class="dc-field"><span>' + dcT('সাল', 'Year') + '</span><input type="number" id="dc-by" inputmode="numeric" min="' + DC_B_MIN + '" max="' + DC_B_MAX + '" value="' + u.by + '" oninput="dcOnInput()" onchange="dcOnInput()"></label></div>';
}

function dcResultHtml(errMsg) {
    if (errMsg) return '<p class="dc-err" role="alert">⚠️ ' + sanitize(errMsg) + '</p>';
    const r = dcDescribe(dcState.cur);
    const ev = (typeof hijriEvents !== 'undefined') ? hijriEvents[r.h.month + '-' + r.h.day] : null;
    const evTxt = ev ? sanitize(state.language === 'bn' ? ev.bn : ev.en) : '';
    const dow = (state.language === 'bn' ? DC_DOW_BN : DC_DOW_EN)[r.g.dow];
    const canOpen = typeof calOpenEvent === 'function';
    return '<div class="dc-res">'
        + '<div class="dc-row dc-row-g"><span class="dc-k">' + dcT('গ্রেগরিয়ান', 'Gregorian') + '</span><b>' + sanitize(dcFmtG(r.g)) + '</b></div>'
        + '<div class="dc-row dc-row-h"><span class="dc-k">' + dcT('হিজরি', 'Hijri') + '</span><b>' + sanitize(dcFmtH(r.h)) + '</b></div>'
        + '<div class="dc-row dc-row-b"><span class="dc-k">' + dcT('বাংলা', 'Bangla') + '</span><b>' + sanitize(dcFmtB(r.b)) + '</b></div>'
        + '<p class="dc-meta">' + sanitize(dow) + ' · ' + sanitize(dcRelative(r.date)) + '</p>'
        + (evTxt ? '<p class="dc-ev">📌 ' + evTxt + '</p>' : '')
        + '<div class="dc-actions">'
        + '<button type="button" class="pr-btn pr-btn-ghost" onclick="dcShare()">📤 ' + dcT('শেয়ার / কপি', 'Share / copy') + '</button>'
        + (canOpen ? '<button type="button" class="pr-btn pr-btn-ghost" onclick="dcOpenInCalendar()">📅 ' + dcT('ক্যালেন্ডারে দেখুন', 'Show in calendar') + '</button>' : '')
        + '</div></div>';
}

function dcInnerHtml() {
    const modes = [['g', dcT('গ্রেগরিয়ান', 'Gregorian')], ['h', dcT('হিজরি', 'Hijri')], ['b', dcT('বাংলা', 'Bangla')]];
    return '<div class="dc-head"><h2 class="pr-title" id="dc-title">📆 ' + dcT('তারিখ রূপান্তর', 'Date converter') + '</h2>'
        + '<p class="pr-sub">' + dcT('যেকোনো তারিখ বসান — হিজরি, গ্রেগরিয়ান ও বাংলা তিনটিতেই দেখুন', 'Enter any date — see it in Hijri, Gregorian and Bangla') + '</p></div>'
        + '<div class="dc-tabs" role="tablist" aria-label="' + dcT('কোন ক্যালেন্ডার থেকে', 'Convert from') + '">'
        + modes.map(m => '<button type="button" role="tab" id="dc-tab-' + m[0] + '" aria-selected="' + (dcState.mode === m[0]) + '" class="pr-pill' + (dcState.mode === m[0] ? ' on' : '') + '" onclick="dcSetMode(\'' + m[0] + '\')">' + m[1] + '</button>').join('')
        + '<button type="button" class="pr-pill dc-today" onclick="dcGoToday()">📍 ' + dcT('আজ', 'Today') + '</button></div>'
        + '<div id="dc-inputs">' + dcInputsHtml() + '</div>'
        + '<div id="dc-result" aria-live="polite">' + dcResultHtml() + '</div>'
        + '<p class="dc-note">' + dcT(
            'ক্যালেন্ডার-ভিত্তিক হিসাব — চাঁদ দেখার ওপর নির্ভর করে স্থানীয়ভাবে হিজরি তারিখ ±১ দিন হতে পারে। বাংলা তারিখ বাংলাদেশের জাতীয় পঞ্জিকা (২০১৯ সংশোধিত) অনুযায়ী।',
            'Calendar-based calculation — the local Hijri date can differ by ±1 day depending on moon sighting. Bangla dates follow the Bangladesh national calendar (2019 revision).') + '</p>';
}

// Called by renderCalendarPage()
function dcCalendarCard(d, l) {
    if (!dcState.cur) dcSyncFrom(dcToday());
    return '<section class="pr-card dc-card' + (d ? ' pr-dark' : '') + '" id="dc-card" aria-labelledby="dc-title">' + dcInnerHtml() + '</section>';
}

// ---------------------------------------------------------------------------
// State sync + actions
// ---------------------------------------------------------------------------
// Make `dt` the current date and refresh every input's remembered value from it.
function dcSyncFrom(dt) {
    dcState.cur = dt;
    const r = dcDescribe(dt), u = dcState.ui;
    u.gStr = r.g.y + '-' + dcPad(r.g.m0 + 1) + '-' + dcPad(r.g.d);
    u.hd = r.h.day; u.hm = r.h.month; u.hy = r.h.year;
    u.bd = r.b.day; u.bm = r.b.month; u.by = r.b.year;
}
function dcRefreshCard(focusId) {
    const card = document.getElementById('dc-card');
    if (!card) return;
    card.innerHTML = dcInnerHtml();
    const f = focusId && document.getElementById(focusId);
    if (f) { try { f.focus(); } catch (e) { /* ignore */ } }
}
function dcSetMode(m) {
    if (m !== 'g' && m !== 'h' && m !== 'b') return;
    dcState.mode = m;
    dcRefreshCard('dc-tab-' + m);
}
function dcGoToday() {
    dcSyncFrom(dcToday());
    dcRefreshCard('dc-tab-' + dcState.mode);
}
// Fired by every input change. Only #dc-result is rewritten — the inputs stay put.
function dcOnInput() {
    const res = document.getElementById('dc-result');
    if (!res) return;
    const r = dcReadInputs();
    if (r.err) { res.innerHTML = dcResultHtml(r.err); return; }
    // Remember the new date for every system (used when the tab is switched or the page re-renders).
    // The input fields themselves are NOT rewritten, so typing / focus / cursor are undisturbed.
    dcSyncFrom(r.dt);
    res.innerHTML = dcResultHtml();
}
function dcSummaryText() {
    const r = dcDescribe(dcState.cur);
    const dow = (state.language === 'bn' ? DC_DOW_BN : DC_DOW_EN)[r.g.dow];
    return dow + ', ' + dcFmtG(r.g) + ' = ' + dcFmtH(r.h) + ' = ' + dcFmtB(r.b);
}
function dcShare() {
    if (!dcState.cur) return;
    const text = dcSummaryText();
    if (typeof shareContent === 'function') shareContent('📆 ' + dcT('তারিখ রূপান্তর', 'Date converter'), text, '');
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast(dcT('✅ কপি হয়েছে!', '✅ Copied!'), 'success')).catch(() => { });
}
function dcOpenInCalendar() {
    if (!dcState.cur || typeof calOpenEvent !== 'function') return;
    const h = dcGregToHijri(dcState.cur.getFullYear(), dcState.cur.getMonth(), dcState.cur.getDate());
    calOpenEvent(h.month + '-' + h.year + '-' + h.day);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
}
