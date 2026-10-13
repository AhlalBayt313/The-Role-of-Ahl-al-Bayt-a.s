// ============================================================================
// DAILY AMAL (home card) + RAMADAN MODE (page "ramadan")  — v127
// ----------------------------------------------------------------------------
// • Today's Amal: picks items by weekday and Hijri date, ONLY from entries that
//   already exist in the app's own data (data/duas/*.json via the metadata
//   index: duas / amals / ziyarats). Nothing here writes religious text; it
//   links to the existing dua/amal/ziyarat pages.
// • Hijri date comes from approxHijriNow() (calendar-based, with the user's
//   ±1 day moon-sighting setting from the Calendar page).
// • Ramadan mode: Fajr (end of sehri) and Maghrib (iftar) from aladhan using the
//   method the user chose on the Prayer page (prMethod(): Jafari options), live
//   countdown, and a 30-day fasting tracker stored on the device.
// Needs: state, approxHijriNow, getHijriMonthDays, hijriToGregorian,
//        toBengaliDigits, escapeHtml, lsGet/lsSet, prFetchMonth/prMethod/prHM
//        (prayer-reminders.js). Everything is guarded with typeof checks.
// ============================================================================
(function () {
'use strict';

const AM_KEY = 'ahlbayt_ramadan';
const AM_TIMES_KEY = 'ahlbayt_am_times';
const T = (b, e) => (typeof state !== 'undefined' && state.language === 'en') ? e : b;
const N = n => (typeof state !== 'undefined' && state.language === 'en') ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DAYS = [
    ['রবিবার', 'Sunday', 'sunday'], ['সোমবার', 'Monday', 'monday'], ['মঙ্গলবার', 'Tuesday', 'tuesday'],
    ['বুধবার', 'Wednesday', 'wednesday'], ['বৃহস্পতিবার', 'Thursday', 'thursday'], ['শুক্রবার', 'Friday', 'friday'], ['শনিবার', 'Saturday', 'saturday']
];
const HMONTHS = [
    ['মহররম', 'Muharram'], ['সফর', 'Safar'], ['রবিউল আউয়াল', 'Rabi al-Awwal'], ['রবিউস সানি', 'Rabi al-Thani'],
    ['জমাদিউল আউয়াল', 'Jumada al-Ula'], ['জমাদিউস সানি', 'Jumada al-Thaniya'], ['রজব', 'Rajab'], ['শাবান', 'Sha\u2019ban'],
    ['রমজান', 'Ramadan'], ['শাওয়াল', 'Shawwal'], ['জিলকদ', 'Dhu al-Qa\u2019da'], ['জিলহজ', 'Dhu al-Hijja']
];
const dayName = i => DAYS[i][state.language === 'en' ? 1 : 0];
const monthName = m => HMONTHS[m - 1][state.language === 'en' ? 1 : 0];

// ---------------------------------------------------------------------------
// Hijri helpers
// ---------------------------------------------------------------------------
function amToday() {
    const h = (typeof approxHijriNow === 'function') ? approxHijriNow() : null;
    return h ? { d: h.day, m: h.month, y: h.year } : null;
}
function amMonthLen(m, y) { return (typeof getHijriMonthDays === 'function') ? getHijriMonthDays(m, y) : (m % 2 === 1 ? 30 : 29); }
function amNext(h) {
    let d = h.d + 1, m = h.m, y = h.y;
    if (d > amMonthLen(m, y)) { d = 1; m++; if (m > 12) { m = 1; y++; } }
    return { d, m, y };
}

// ---------------------------------------------------------------------------
// Which existing dua/amal/ziyarat entries belong to which day.
// Every id below exists in data/duas/metadata.json. "why" is shown as a small label.
// The Islamic day begins at sunset, so "night" items are tied to the evening
// that starts after today's Maghrib (the next Hijri day).
// ---------------------------------------------------------------------------
function amRules() {
    const now = new Date(), dow = now.getDay(), h = amToday();
    if (!h) return null;
    const nxt = amNext(h), ndow = (dow + 1) % 7;
    const day = [], night = [];
    const add = (arr, type, id, bn, en) => arr.push({ type, id, why: [bn, en] });

    add(day, 'dua', 'dua-day-' + DAYS[dow][2], DAYS[dow][0] + 'র দোয়া', 'Dua of ' + DAYS[dow][1]);
    if (dow === 5) {
        add(day, 'amal', 'amal-jumma-day', 'জুমার দিনের আমল', 'Friday amal');
        add(day, 'dua', 'dua-quran-yawmul-jumuah', 'জুমার দিন', 'Friday');
        add(day, 'ziyarat', 'ziyarat-friday-mahdi', 'জুমার যিয়ারত', 'Friday ziyarat');
    }
    if (h.m === 1 && h.d === 10) {
        add(day, 'amal', 'amal-ashura-day', 'আশুরার দিন', 'Day of Ashura');
        add(day, 'ziyarat', 'ziyarat-ashura', 'আশুরার দিন', 'Day of Ashura');
        add(day, 'ziyarat', 'ziyarat-ashura-ghayr-marufa', 'আশুরার দিন', 'Day of Ashura');
    }
    if (h.m === 7 && h.d === 15) add(day, 'amal', 'amal-umm-dawud', '১৫ রজব', '15 Rajab');
    if (h.m === 12 && h.d === 18) add(day, 'dua', 'dua-e-ghadir', 'গাদীরের দিন', 'Day of Ghadir');
    if ((h.m === 10 && h.d === 1) || (h.m === 12 && h.d === 10)) add(day, 'dua', 'dua-eid-takbir', 'ঈদের দিন', 'Day of Eid');
    if (h.m === 9) {
        add(day, 'dua', 'day-' + h.d + '-dua-of-ramadan', 'রমজানের ' + toBn(h.d) + ' তম দিন', 'Ramadan day ' + h.d);
        add(day, 'amal', 'amal-ramadan-daily', 'রমজানের প্রতিদিন', 'Every day of Ramadan');
    }

    if (ndow === 5) add(night, 'amal', 'amal-shab-e-juma', 'বৃহস্পতিবার দিবাগত রাত', 'Thursday night');
    if (nxt.m === 8 && nxt.d === 15) {
        add(night, 'amal', 'amal-nisf-shaban', '১৫ শাবানের রাত', 'Night of 15 Sha\u2019ban');
        add(night, 'amal', 'amal-salat-jafar-tayyar', '১৫ শাবানের রাত', 'Night of 15 Sha\u2019ban');
        add(night, 'amal', 'amal-istegatha-imam-zaman', '১৫ শাবানের রাত', 'Night of 15 Sha\u2019ban');
    }
    if (nxt.m === 9 && (nxt.d === 19 || nxt.d === 21 || nxt.d === 23)) {
        add(night, 'amal', 'amal-laylatul-qadr', 'রমজানের ' + toBn(nxt.d) + ' তম রাত', 'Ramadan night ' + nxt.d);
        add(night, 'dua', 'dua-quran-laylatul-qadr-verse', 'লাইলাতুল কদর', 'Laylatul Qadr');
    }
    return { h, nxt, dow, ndow, day, night };
}
function toBn(n) { return (typeof toBengaliDigits === 'function') ? toBengaliDigits(n) : String(n); }

// Resolve an item against the already-loaded metadata arrays. Returns null while data is still loading.
function amResolve(it) {
    try {
        if (it.type === 'dua' && typeof duas !== 'undefined' && Array.isArray(duas)) {
            const i = duas.findIndex(x => x && x.id === it.id);
            if (i < 0) return null;
            return { title: [duas[i].titleBn, duas[i].titleEn], action: 'readDua', param: String(i) };
        }
        if (it.type === 'amal' && typeof amals !== 'undefined' && Array.isArray(amals)) {
            const a = amals.find(x => x && x.id === it.id);
            return a ? { title: [a.titleBn, a.titleEn], action: 'readAmal', param: a.id } : null;
        }
        if (it.type === 'ziyarat' && typeof ziyarats !== 'undefined' && Array.isArray(ziyarats)) {
            const z = ziyarats.find(x => x && x.id === it.id);
            return z ? { title: [z.titleBn, z.titleEn], action: 'readZiyarat', param: z.id } : null;
        }
    } catch (e) { /* data not ready */ }
    return null;
}
function amList(items) {
    const rows = items.map(it => {
        const r = amResolve(it);
        if (!r) return '';
        const ti = (state.language === 'en' ? r.title[1] : r.title[0]) || r.title[0] || r.title[1] || '';
        return `<li><button type="button" class="am-item" data-action="${r.action}" data-param="${E(r.param)}"><span class="am-item-t">${E(ti)}</span><small>${E(T(it.why[0], it.why[1]))}</small></button></li>`;
    }).join('');
    return rows ? `<ul class="am-list">${rows}</ul>` : '';
}

// ---------------------------------------------------------------------------
// HOME CARD
// ---------------------------------------------------------------------------
window.todayAmalCard = function (d, l) {
    const R = amRules();
    if (!R) return '';
    const dayHtml = amList(R.day), nightHtml = amList(R.night);
    if (!dayHtml && !nightHtml) return '';
    const date = `${dayName(R.dow)} · ${N(R.h.d)} ${monthName(R.h.m)} ${N(R.h.y)}`;
    const ramadanBtn = (R.h.m === 9 || R.h.m === 8)
        ? `<button type="button" class="am-btn" data-action="changePage" data-param="ramadan">\uD83C\uDF19 ${T('রমজান মোড', 'Ramadan mode')}</button>` : '';
    return `
    <section class="am-card${d ? ' am-d' : ''}" aria-labelledby="am-h">
        <div class="am-head">
            <h3 id="am-h">\uD83C\uDF19 ${T('আজকের আমল', 'Today\u2019s Amal')}</h3>
            <span class="am-date">${E(date)}</span>
        </div>
        ${dayHtml ? `<h4 class="am-sub">${T('আজ দিনে', 'During the day')}</h4>${dayHtml}` : ''}
        ${nightHtml ? `<h4 class="am-sub am-night">${T('আজ রাতে (মাগরিবের পর শুরু)', 'Tonight (starts after Maghrib)')}</h4>${nightHtml}` : ''}
        <p class="am-note">${T('এই তালিকা অ্যাপের নিজস্ব দোয়া-আমলের ডেটা থেকে। তারিখ চাঁদ দেখার ওপর নির্ভর করে — প্রয়োজনে ক্যালকুলেটর পেজের ±১ দিন সমন্বয় ব্যবহার করুন।', 'Taken from the app’s own dua and amal data. The date depends on moon sighting — use the ±1 day adjustment on the Calendar page if needed.')}</p>
        ${ramadanBtn ? `<div class="am-actions">${ramadanBtn}</div>` : ''}
    </section>`;
};

// ---------------------------------------------------------------------------
// RAMADAN MODE — times
// ---------------------------------------------------------------------------
const _monthCache = {};
function amLocKey() {
    const loc = state.userLocation;
    const ll = (loc && isFinite(loc.latitude) && isFinite(loc.longitude)) ? (Math.round(loc.latitude * 100) / 100) + ',' + (Math.round(loc.longitude * 100) / 100) : 'dhaka';
    return ll + '|' + (typeof prMethod === 'function' ? prMethod() : 1);
}
function amDateKey(dt) { return dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate(); }
async function amMonthData(y, m) {
    const k = amLocKey() + '|' + y + '-' + m;
    if (_monthCache[k]) return _monthCache[k];
    if (typeof prFetchMonth !== 'function') throw new Error('no-times');
    const arr = await prFetchMonth(y, m);
    const map = {};
    arr.forEach(it => {
        const g = it && it.date && it.date.gregorian && it.date.gregorian.date; // DD-MM-YYYY
        if (!g || !it.timings) return;
        const p = g.split('-');
        map[(+p[2]) + '-' + (+p[1]) + '-' + (+p[0])] = it.timings;
    });
    _monthCache[k] = map;
    return map;
}
async function amTimesFor(dt) {
    const map = await amMonthData(dt.getFullYear(), dt.getMonth() + 1);
    const tm = map[amDateKey(dt)];
    if (!tm) throw new Error('no-day');
    const f = prHM(tm.Fajr), mg = prHM(tm.Maghrib);
    if (!f || !mg) throw new Error('bad-times');
    return { fajr: f, maghrib: mg };
}
function amAt(dt, hm) { const x = new Date(dt); x.setHours(hm[0], hm[1], 0, 0); return x; }
async function amLoadTimes() {
    const now = new Date(), tom = new Date(now); tom.setDate(tom.getDate() + 1);
    try {
        const [a, b] = await Promise.all([amTimesFor(now), amTimesFor(tom)]);
        const out = { today: { fajr: a.fajr, maghrib: a.maghrib }, tomorrow: { fajr: b.fajr, maghrib: b.maghrib }, k: amLocKey(), dk: amDateKey(now), live: true };
        try { lsSet(AM_TIMES_KEY, out); } catch (e) { /* best effort */ }
        return out;
    } catch (e) {
        let c = null;
        try { c = lsGet(AM_TIMES_KEY, null); } catch (e2) { c = null; }
        if (c && c.dk === amDateKey(now) && c.k === amLocKey() && c.today && c.tomorrow) { c.live = false; return c; }
        throw e;
    }
}
function amFmt(hm) {
    let h = hm[0], m = hm[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return N(h) + ':' + N(String(m).padStart(2, '0')) + ' ' + ap;
}
function amDur(ms) {
    let s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    return N(String(h).padStart(2, '0')) + ':' + N(String(m).padStart(2, '0')) + ':' + N(String(s).padStart(2, '0'));
}
let _amT = null, _amTimer = null;
function amNextTarget() {
    if (!_amT) return null;
    const now = new Date();
    const f = amAt(now, _amT.today.fajr), mg = amAt(now, _amT.today.maghrib);
    if (now < f) return { at: f, label: T('সেহরির শেষ সময় (ফজর) পর্যন্ত বাকি', 'Until the end of sehri (Fajr)') };
    if (now < mg) return { at: mg, label: T('ইফতার (মাগরিব) পর্যন্ত বাকি', 'Until iftar (Maghrib)') };
    const t = new Date(now); t.setDate(t.getDate() + 1);
    return { at: amAt(t, _amT.tomorrow.fajr), label: T('আগামীকাল সেহরির শেষ সময় (ফজর) পর্যন্ত বাকি', 'Until tomorrow’s end of sehri (Fajr)') };
}
function amTick() {
    const el = document.getElementById('am-cd'), lb = document.getElementById('am-cd-l');
    if (!el) { clearInterval(_amTimer); _amTimer = null; return; }
    const t = amNextTarget(); if (!t) return;
    el.textContent = amDur(t.at - new Date()); if (lb) lb.textContent = t.label;
}
function amPaintTimes() {
    const box = document.getElementById('am-times'); if (!box) return;
    const t = _amT;
    box.innerHTML = `
        <div class="am-times">
            <div><small>${T('সেহরির শেষ (ফজর)', 'End of sehri (Fajr)')}</small><b>${amFmt(t.today.fajr)}</b></div>
            <div><small>${T('ইফতার (মাগরিব)', 'Iftar (Maghrib)')}</small><b>${amFmt(t.today.maghrib)}</b></div>
        </div>
        <div class="am-cd"><span id="am-cd-l"></span><b id="am-cd">--:--:--</b></div>
        ${t.live ? '' : `<p class="am-note">${T('অফলাইন — সর্বশেষ সংরক্ষিত সময় দেখানো হচ্ছে।', 'Offline — showing the last saved times.')}</p>`}`;
    amTick();
    clearInterval(_amTimer); _amTimer = setInterval(amTick, 1000);
}
function amPaintTimesError() {
    const box = document.getElementById('am-times'); if (!box) return;
    box.innerHTML = `<p class="am-note">${T('সময় আনা যায়নি (ইন্টারনেট বা অবস্থান সমস্যা)। আবার চেষ্টা করুন।', 'Could not load times (network or location issue). Please retry.')}</p>
        <div class="am-actions"><button type="button" class="am-btn" data-am-act="retry">${T('আবার চেষ্টা করুন', 'Retry')}</button></div>`;
}
function amStartTimes() {
    setTimeout(() => {
        if (!document.getElementById('am-times')) return;
        amLoadTimes().then(t => { _amT = t; amPaintTimes(); }).catch(() => amPaintTimesError());
    }, 0);
}

// ---------------------------------------------------------------------------
// RAMADAN MODE — fasting tracker (device only)
// ---------------------------------------------------------------------------
function amTrackLoad() {
    const d = { y: 0, d: {} };
    let raw = null;
    try { raw = lsGet(AM_KEY, null); } catch (e) { raw = null; }
    if (raw && typeof raw === 'object') {
        const y = Number(raw.y);
        if (Number.isInteger(y) && y >= 1400 && y <= 1600) d.y = y;
        if (raw.d && typeof raw.d === 'object') for (let i = 1; i <= 30; i++) if (raw.d[String(i)] === true) d.d[String(i)] = true;
    }
    return d;
}
function amTrackSave(s) { try { lsSet(AM_KEY, s); } catch (e) { /* best effort */ } }
// The Ramadan being tracked: the current one during Ramadan (and after it, same year); before Ramadan, none yet.
function amTrackYear(h) { return h.m >= 9 ? h.y : h.y - 1; }

function amToggleDay(n) {
    const h = amToday(); if (!h || h.m !== 9 || n < 1 || n > 30 || n > h.d) return;
    let s = amTrackLoad();
    if (s.y !== h.y) s = { y: h.y, d: {} };
    if (s.d[String(n)]) delete s.d[String(n)]; else s.d[String(n)] = true;
    amTrackSave(s); if (typeof render === 'function') render();
}

// ---------------------------------------------------------------------------
// RAMADAN MODE — page
// ---------------------------------------------------------------------------
window.renderRamadanPage = function () {
    const d = !!state.darkMode, h = amToday();
    if (!h) return `<div class="am-card${d ? ' am-d' : ''}"><p>${T('তারিখ লোড করা যায়নি।', 'Could not load the date.')}</p></div>`;
    const inRam = h.m === 9;
    let status = '';
    if (inRam) {
        const left = amMonthLen(9, h.y) - h.d;
        status = `<p class="am-big">${T('আজ রমজানের', 'Today is Ramadan day')} <b>${N(h.d)}</b>${T(' তম দিন', '')}</p>
            <div class="am-bar" role="progressbar" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${h.d}"><i style="width:${Math.min(100, Math.round(h.d / 30 * 100))}%"></i></div>
            <p class="am-note">${T('বাকি প্রায় ' + toBn(left) + ' দিন (চাঁদ দেখার ওপর নির্ভরশীল)', 'About ' + left + ' days left (depends on moon sighting)')}</p>`;
    } else if (typeof hijriToGregorian === 'function') {
        const yr = h.m < 9 ? h.y : h.y + 1;
        const start = hijriToGregorian(1, 9, yr), now = new Date(); now.setHours(0, 0, 0, 0);
        const days = Math.round((start - now) / 86400000);
        status = `<p class="am-big">${T('রমজান শুরু হতে প্রায়', 'Ramadan begins in about')} <b>${N(days)}</b> ${T('দিন', 'days')}</p>
            <p class="am-note">${T('আনুমানিক — চাঁদ দেখার ওপর ১-২ দিন এদিক-ওদিক হতে পারে।', 'Approximate — it may shift by 1–2 days with moon sighting.')}</p>`;
    }

    const R = amRules();
    const amalHtml = R ? (amList(R.day) + amList(R.night)) : '';

    // tracker
    const tyear = amTrackYear(h), s = amTrackLoad();
    const mine = (s.y === tyear) ? s.d : {};
    const fasted = Object.keys(mine).length;
    const passed = inRam ? h.d : (h.m > 9 ? 30 : 0);
    let grid = '';
    for (let i = 1; i <= 30; i++) {
        const on = !!mine[String(i)], can = inRam && i <= h.d;
        grid += `<button type="button" class="am-day${on ? ' on' : ''}${i === h.d && inRam ? ' today' : ''}" ${can ? `data-am-act="day" data-am-n="${i}"` : 'disabled'} aria-pressed="${on}" aria-label="${T('রমজানের ' + toBn(i) + ' তম দিন', 'Ramadan day ' + i)}">${N(i)}</button>`;
    }
    const missed = Math.max(0, Math.min(30, passed) - fasted);
    const trackerNote = inRam
        ? T('রোজা রাখা দিনে চাপ দিন। শুধু আজ ও আগের দিনগুলো চিহ্নিত করা যায়।', 'Tap a day you fasted. Only today and earlier days can be marked.')
        : (fasted ? T('গত রমজানের হিসাব (শুধু দেখা যাবে)।', 'Last Ramadan’s record (read only).') : T('রমজান শুরু হলে এখানে রোজা চিহ্নিত করতে পারবেন।', 'You can mark your fasts here once Ramadan begins.'));
    const methodName = (typeof PR_METHODS !== 'undefined' && typeof prMethod === 'function') ? ((PR_METHODS.find(x => x.id === prMethod()) || {})[state.language === 'en' ? 'en' : 'bn'] || '') : '';

    amStartTimes();
    return `
    <div class="am-wrap${d ? ' am-d' : ''} page-enter" id="am-root">
        <h2 class="am-title">\uD83C\uDF19 ${T('রমজান মোড', 'Ramadan mode')}</h2>
        <section class="am-card${d ? ' am-d' : ''}">${status}</section>
        <section class="am-card${d ? ' am-d' : ''}">
            <h3>${T('সেহরি ও ইফতার', 'Sehri and iftar')}</h3>
            <div id="am-times"><p class="am-note">${T('সময় লোড হচ্ছে…', 'Loading times…')}</p></div>
            <p class="am-note">${T('সময় আপনার অবস্থান ও নামাজ পেজে বাছা পদ্ধতি অনুযায়ী' + (methodName ? ' (' + methodName + ')' : '') + ' আনুমানিক। সেহরির শেষ সময় ফজর এবং ইফতার মাগরিব ধরা হয়েছে। সতর্কতার জন্য স্থানীয় ঘোষণা বা আপনার মারজার দপ্তরের সময়সূচি দেখুন। ⚖️', 'Times are approximate for your location and the method chosen on the Prayer page' + (methodName ? ' (' + methodName + ')' : '') + '. End of sehri is taken as Fajr and iftar as Maghrib. For caution, check local announcements or your marja’s office. ⚖️')}</p>
            <div class="am-actions"><button type="button" class="am-btn" data-action="changePage" data-param="prayer">${T('পদ্ধতি/অবস্থান বদলান', 'Change method / location')}</button></div>
        </section>
        ${amalHtml ? `<section class="am-card${d ? ' am-d' : ''}"><h3>${T('আজকের আমল', 'Today’s amal')}</h3>${amalHtml}</section>` : ''}
        <section class="am-card${d ? ' am-d' : ''}">
            <h3>${T('রোজার হিসাব', 'Fasting tracker')}</h3>
            <div class="am-grid">${grid}</div>
            <p class="am-big">${T('রোজা রেখেছেন', 'Fasts kept')}: <b>${N(fasted)}</b>${inRam || passed ? ' / ' + N(Math.min(30, passed)) : ''}${(inRam || h.m > 9) && missed ? ` · ${T('বাদ পড়া', 'Missed')}: <b>${N(missed)}</b>` : ''}</p>
            <p class="am-note">${E(trackerNote)} ${T('ডেটা শুধু আপনার ডিভাইসে থাকে; ব্যাকআপে নিতে “রমজান ট্র্যাকার” অংশটি চালু রাখুন।', 'Data stays on your device; keep “Ramadan tracker” on in Backup to include it.')}</p>
        </section>
    </div>`;
};

document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-am-act]');
    if (!el || !document.getElementById('am-root')) return;
    const a = el.getAttribute('data-am-act');
    if (a === 'day') amToggleDay(parseInt(el.getAttribute('data-am-n'), 10));
    else if (a === 'retry') { const b = document.getElementById('am-times'); if (b) b.innerHTML = '<p class="am-note">' + T('সময় লোড হচ্ছে…', 'Loading times…') + '</p>'; amStartTimes(); }
});

// test hooks (pure, no DOM)
window._amRules = amRules; window._amTrackLoad = amTrackLoad;
window._amResetCache = function () { Object.keys(_monthCache).forEach(k => delete _monthCache[k]); };
})();
