// ============================================================================
// PRAYER REMINDERS  (v122)
// ----------------------------------------------------------------------------
// Replaces the old one-button notification card. Provides:
//   1. Settings (persisted: ahlbayt_prayer_remind) — master switch, which of
//      the 5 prayers, lead time (at the time / 5 / 10 / 15 / 30 min before),
//      "eve of an important day" reminder.
//   2. Notifications via ServiceWorkerRegistration.showNotification() — the
//      old `new Notification()` throws "Illegal constructor" on Android
//      Chrome and so never showed anything on phones. `new Notification()`
//      stays as the fallback (desktop without a SW).
//   3. Scheduling with setTimeout for the next 24 h, re-synced when the tab
//      becomes visible, when fresh prayer times arrive, and after midnight.
//   4. "Add to calendar": a .ics file (next 7/14/30 days, VALARM per prayer)
//      built from aladhan's monthly calendar endpoint. Calendar apps fire
//      alarms even when this app is closed — the one way to get reminders
//      without a push server, which this static site does not have.
//   5. A real `prayer` page (the home widget's "Details" button pointed at a
//      page that did not exist) = today's times + this settings panel.
//
// HONEST LIMIT: timers only run while the app/tab is alive. Fully closed app
// → no in-app notification (needs a push server). The panel says so and
// points to the calendar export.
//
// Loads after script-3-pages.js. Needs: state, lsGet/lsSet, showToast,
// toBengaliDigits, sanitize, fetchPrayerTimes, fmt12, renderPrayerWidget,
// getNextHijriEvent/hijriEventShortName (optional), render().
// ============================================================================

const PR_KEY = 'ahlbayt_prayer_remind';
const PR_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PR_LEADS = [0, 5, 10, 15, 30];
const PR_DAYS = [7, 14, 30];
// Calculation method (aladhan "method" id). The user's choice is stored in ahlbayt_prayer_method;
// fetchPrayerTimes() in script-1-core.js and the .ics export below both read it through prMethod().
// Default stays 1 (Karachi) so nothing changes for anyone who never opens the selector.
const PR_METHOD_KEY = 'ahlbayt_prayer_method';
const PR_METHODS = [
    { id: 1, bn: 'করাচি (ডিফল্ট)', en: 'Karachi (default)',
      dbn: 'University of Islamic Sciences, Karachi — উপমহাদেশে প্রচলিত', den: 'University of Islamic Sciences, Karachi — common in South Asia' },
    { id: 0, bn: 'জাফরি — কোম (লেভা)', en: 'Jafari — Qum (Leva)',
      dbn: 'Shia Ithna-Ashari, Leva Research Institute, Qum', den: 'Shia Ithna-Ashari, Leva Research Institute, Qum' },
    { id: 7, bn: 'জাফরি — তেহরান', en: 'Jafari — Tehran',
      dbn: 'Institute of Geophysics, University of Tehran', den: 'Institute of Geophysics, University of Tehran' },
    { id: 3, bn: 'মুসলিম ওয়ার্ল্ড লীগ', en: 'Muslim World League',
      dbn: 'Muslim World League', den: 'Muslim World League' }
];
function prMethod() {
    let v = 1;
    try { v = lsGet(PR_METHOD_KEY, 1); } catch (e) { v = 1; }
    return PR_METHODS.some(m => m.id === v) ? v : 1;
}
const PR_NAMES = {
    fajr:    { bn: 'ফজর',    en: 'Fajr' },
    dhuhr:   { bn: 'যোহর',   en: 'Dhuhr' },
    asr:     { bn: 'আসর',    en: 'Asr' },
    maghrib: { bn: 'মাগরিব', en: 'Maghrib' },
    isha:    { bn: 'ইশা',    en: 'Isha' }
};
const PR_ICONS = { fajr: '🌅', dhuhr: '☀️', asr: '🌤', maghrib: '🌇', isha: '🌙' };

function prT(b, e) { return state.language === 'bn' ? b : e; }
function prN(n) { return state.language === 'bn' ? toBengaliDigits(n) : String(n); }
function prName(k) { return PR_NAMES[k][state.language === 'bn' ? 'bn' : 'en']; }

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
let _prS = null;
function prLoad() {
    if (_prS) return _prS;
    const d = { on: false, prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }, lead: 0, events: true, icsDays: 14 };
    let raw = null;
    try { raw = lsGet(PR_KEY, null); } catch (e) { raw = null; }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        d.on = raw.on === true;
        if (raw.prayers && typeof raw.prayers === 'object') PR_KEYS.forEach(k => { if (typeof raw.prayers[k] === 'boolean') d.prayers[k] = raw.prayers[k]; });
        if (PR_LEADS.indexOf(raw.lead) > -1) d.lead = raw.lead;
        d.events = raw.events !== false;
        if (PR_DAYS.indexOf(raw.icsDays) > -1) d.icsDays = raw.icsDays;
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // Existing user who enabled the old button: keep their reminders working (all 5, at the time).
        d.on = true; d.events = false;
    }
    _prS = d;
    return d;
}
function prSave() { try { lsSet(PR_KEY, _prS); } catch (e) { /* best effort */ } }
function prCanNotify() { return typeof Notification !== 'undefined' && Notification.permission === 'granted'; }

// ---------------------------------------------------------------------------
// Showing a notification (SW first, constructor as fallback)
// ---------------------------------------------------------------------------
async function prShow(title, opts) {
    const o = Object.assign({
        icon: './icon-192.png', badge: './icon-192.png',
        lang: state.language === 'bn' ? 'bn' : 'en', vibrate: [120, 60, 120], data: { url: './' }
    }, opts || {});
    try {
        if ('serviceWorker' in navigator) {
            const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 2500))]);
            if (reg && typeof reg.showNotification === 'function') { await reg.showNotification(title, o); return true; }
        }
    } catch (e) { /* fall through */ }
    try { new Notification(title, o); return true; } catch (e) { return false; }
}

function prFirePrayer(k, lead, timeStr) {
    const l = state.language, nm = prName(k), tm = l === 'bn' ? toBengaliDigits(timeStr) : timeStr;
    const title = lead === 0
        ? `🕌 ${nm} ${prT('নামাজের সময়', 'prayer time')}`
        : `🕌 ${nm} — ${prN(lead)} ${prT('মিনিট বাকি', 'min to go')}`;
    const body = lead === 0
        ? prT(`${nm} নামাজের সময় হয়েছে (${tm})`, `It's time for ${nm} prayer (${tm})`)
        : prT(`${nm} নামাজ ${tm}-এ`, `${nm} prayer at ${tm}`);
    prShow(title, { body: body, tag: 'ahlbayt-prayer-' + k });
}
function prFireEvent(nx) {
    const l = state.language;
    prShow(`🌙 ${prT('আগামীকাল', 'Tomorrow')}: ${hijriEventShortName(nx.ev, l)}`,
        { body: String(l === 'bn' ? nx.ev.bn : nx.ev.en), tag: 'ahlbayt-event' });
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------
let _prTimers = [];
const _prFired = {};
function prClear() { _prTimers.forEach(clearTimeout); _prTimers = []; }
function prDateKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function prParseTime(str) {      // "4:30 AM" -> [4, 30]
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(str || '').trim());
    if (!m) return null;
    let h = +m[1]; const mi = +m[2], pm = m[3].toUpperCase() === 'PM';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return (h > 23 || mi > 59) ? null : [h, mi];
}
// Reminder instants for the next 24 h: [{k, at(Date), time(str)}] sorted
function prUpcoming(S) {
    const out = [], now = new Date();
    if (!state.prayerTimes || state.prayerTimesSource === 'default') return out;
    PR_KEYS.forEach(k => {
        if (!S.prayers[k]) return;
        const hm = prParseTime(state.prayerTimes[k]);
        if (!hm) return;
        const at = new Date(now); at.setHours(hm[0], hm[1], 0, 0); at.setMinutes(at.getMinutes() - S.lead);
        const delay = at - now;
        if (delay > 0 && delay < 86400000) out.push({ k: k, at: at, time: state.prayerTimes[k] });
    });
    return out.sort((a, b) => a.at - b.at);
}
function prScheduleAll() {
    prClear();
    const S = prLoad();
    if (!S.on || !prCanNotify()) return;
    const now = new Date(), today = prDateKey(now);
    prUpcoming(S).forEach(u => {
        const fk = today + '-' + u.k + '-' + S.lead;
        if (_prFired[fk]) return;
        _prTimers.push(setTimeout(() => { _prFired[fk] = true; prFirePrayer(u.k, S.lead, u.time); }, u.at - now));
    });
    // Eve-of-event reminder at 8 PM when TOMORROW is an event day (offset-aware, same source as the home strip)
    if (S.events && typeof getNextHijriEvent === 'function' && typeof hijriEventShortName === 'function') {
        try {
            const nx = getNextHijriEvent();
            if (nx && nx.daysAway === 1) {
                const at = new Date(now); at.setHours(20, 0, 0, 0);
                const fk = today + '-ev';
                if (at - now > 0 && !_prFired[fk]) _prTimers.push(setTimeout(() => { _prFired[fk] = true; prFireEvent(nx); }, at - now));
            }
        } catch (e) { /* ignore */ }
    }
    // After midnight fetch the new day's times, then reschedule (fetchPrayerTimes also calls prScheduleAll)
    const mid = new Date(now); mid.setHours(24, 1, 0, 0);
    _prTimers.push(setTimeout(prRollover, mid - now));
}
function prRollover() {
    try {
        if (state.userLocation) fetchPrayerTimes(state.userLocation.latitude, state.userLocation.longitude);
        else fetchPrayerTimes(null, null, 'Dhaka');
    } catch (e) { /* ignore */ }
    setTimeout(prScheduleAll, 15000);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') prScheduleAll(); });

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
async function prSetMaster(on) {
    const S = prLoad();
    if (on) {
        if (typeof Notification === 'undefined') {
            showToast(prT('এই ব্রাউজারে নোটিফিকেশন উপলব্ধ নয় — নিচের নির্দেশনা দেখুন', 'Notifications are not available in this browser — see the note below'), 'warning');
            render(); return;
        }
        let perm = Notification.permission;
        if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (e) { perm = 'default'; } }
        if (perm !== 'granted') {
            showToast(perm === 'denied'
                ? prT('নোটিফিকেশন ব্লক করা আছে — সেটিংসে অনুমতি দিন', 'Notifications are blocked — allow them in settings')
                : prT('নোটিফিকেশন অনুমতি দেওয়া হয়নি', 'Notification permission was not granted'), 'warning');
            S.on = false; prSave(); render(); return;
        }
        S.on = true;
        showToast(prT('✅ রিমাইন্ডার চালু হয়েছে', '✅ Reminders turned on'), 'success');
    } else {
        S.on = false;
        showToast(prT('রিমাইন্ডার বন্ধ করা হয়েছে', 'Reminders turned off'), 'info');
    }
    prSave(); prScheduleAll(); render();
}
function prTogglePrayer(k) {
    if (PR_KEYS.indexOf(k) < 0) return;
    const S = prLoad();
    S.prayers[k] = !S.prayers[k];
    prSave(); prScheduleAll(); render();
}
function prSetLead(v) {
    const n = parseInt(v, 10);
    if (PR_LEADS.indexOf(n) < 0) return;
    prLoad().lead = n;
    prSave(); prScheduleAll(); render();
}
function prSetMethod(v) {
    const n = parseInt(v, 10);
    if (!PR_METHODS.some(m => m.id === n) || n === prMethod()) return;
    lsSet(PR_METHOD_KEY, n);
    showToast(prT('গণনা-পদ্ধতি বদলানো হয়েছে — সময় আবার আনা হচ্ছে…', 'Calculation method changed — refreshing times…'), 'info', 2500);
    try {
        if (state.userLocation) fetchPrayerTimes(state.userLocation.latitude, state.userLocation.longitude);
        else fetchPrayerTimes(null, null, 'Dhaka');
    } catch (e) { /* ignore */ }
    render();
}
function prToggleEvents() { const S = prLoad(); S.events = !S.events; prSave(); prScheduleAll(); render(); }
function prSetDays(v) {
    const n = parseInt(v, 10);
    if (PR_DAYS.indexOf(n) < 0) return;
    prLoad().icsDays = n; prSave(); render();
}
async function prTest() {
    if (typeof Notification === 'undefined') { showToast(prT('এই ব্রাউজারে নোটিফিকেশন উপলব্ধ নয়', 'Notifications are not available in this browser'), 'warning'); return; }
    let perm = Notification.permission;
    if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (e) { /* ignore */ } }
    if (perm !== 'granted') { showToast(prT('নোটিফিকেশন অনুমতি নেই — ব্রাউজার সেটিংস দেখুন', 'No notification permission — check browser settings'), 'warning'); render(); return; }
    const ok = await prShow(prT('✅ পরীক্ষামূলক নোটিফিকেশন', '✅ Test notification'),
        { body: prT('এভাবেই নামাজের রিমাইন্ডার আপনার কাছে আসবে।', 'This is how your prayer reminders will look.'), tag: 'ahlbayt-test' });
    showToast(ok ? prT('নোটিফিকেশন পাঠানো হয়েছে', 'Notification sent') : prT('নোটিফিকেশন দেখানো যায়নি', 'Could not show the notification'), ok ? 'success' : 'error');
    render();
}

// ---------------------------------------------------------------------------
// ICS export
// ---------------------------------------------------------------------------
function prPad(n, w) { return String(n).padStart(w || 2, '0'); }
function prIcsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
// RFC 5545 §3.1: physical lines ≤ 75 octets; continuation lines start with one space. Never split a UTF-8 char.
function prFold(line) {
    const enc = new TextEncoder();
    const out = []; let cur = '', bytes = 0, limit = 75;
    for (const ch of line) {
        const b = enc.encode(ch).length;
        if (bytes + b > limit) { out.push(cur); cur = ' ' + ch; bytes = 1 + b; limit = 75; }
        else { cur += ch; bytes += b; }
    }
    out.push(cur);
    return out.join('\r\n');
}
function prFloat(d) { return d.getFullYear() + prPad(d.getMonth() + 1) + prPad(d.getDate()) + 'T' + prPad(d.getHours()) + prPad(d.getMinutes()) + '00'; }
function prUtcStamp() {
    const d = new Date();
    return d.getUTCFullYear() + prPad(d.getUTCMonth() + 1) + prPad(d.getUTCDate()) + 'T' + prPad(d.getUTCHours()) + prPad(d.getUTCMinutes()) + prPad(d.getUTCSeconds()) + 'Z';
}
function prCalUrl(y, m) {
    const loc = state.userLocation;
    if (loc && isFinite(loc.latitude) && isFinite(loc.longitude)) {
        return `https://api.aladhan.com/v1/calendar?latitude=${encodeURIComponent(loc.latitude)}&longitude=${encodeURIComponent(loc.longitude)}&method=${prMethod()}&month=${m}&year=${y}`;
    }
    return `https://api.aladhan.com/v1/calendarByCity?city=Dhaka&country=Bangladesh&method=${prMethod()}&month=${m}&year=${y}`;
}
async function prFetchMonth(y, m) {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
    try {
        const res = await fetch(prCalUrl(y, m), { signal: ctl.signal });
        if (!res.ok) throw new Error('http ' + res.status);
        const j = await res.json();
        if (j.code !== 200 || !Array.isArray(j.data)) throw new Error('bad response');
        return j.data;
    } finally { clearTimeout(tm); }
}
// timings value like "04:30 (+06)" -> [4, 30]
function prHM(v) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(v || ''));
    if (!m) return null;
    const h = +m[1], mi = +m[2];
    return (h > 23 || mi > 59) ? null : [h, mi];
}
let _prBusy = false;
async function prExportIcs() {
    if (_prBusy) return;
    const S = prLoad();
    const keys = PR_KEYS.filter(k => S.prayers[k]);
    if (!keys.length) { showToast(prT('অন্তত একটি ওয়াক্ত বেছে নিন', 'Select at least one prayer'), 'warning'); return; }
    _prBusy = true;
    showToast(prT('সময় আনা হচ্ছে…', 'Fetching times…'), 'info', 2000);
    try {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const days = []; for (let i = 0; i < S.icsDays; i++) { const d = new Date(start); d.setDate(d.getDate() + i); days.push(d); }
        const months = {}; days.forEach(d => { months[d.getFullYear() + '-' + (d.getMonth() + 1)] = [d.getFullYear(), d.getMonth() + 1]; });
        const byDate = {};
        for (const key of Object.keys(months)) {
            const arr = await prFetchMonth(months[key][0], months[key][1]);
            arr.forEach(e => {
                const g = e && e.date && e.date.gregorian;
                if (!g || !e.timings) return;
                byDate[g.year + '-' + parseInt(g.month.number, 10) + '-' + parseInt(g.day, 10)] = e.timings;
            });
        }
        const API = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
        const stamp = prUtcStamp(), now = new Date(), lines = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ahl al-Bayt App//Prayer Times//BN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
            'X-WR-CALNAME:' + prIcsEscape(prT('নামাজের সময়', 'Prayer Times'))
        ];
        let count = 0;
        days.forEach(d => {
            const tm = byDate[d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()];
            if (!tm) return;
            keys.forEach(k => {
                const hm = prHM(tm[API[k]]);
                if (!hm) return;
                const st = new Date(d); st.setHours(hm[0], hm[1], 0, 0);
                if (st < now) return;
                const en = new Date(st); en.setMinutes(en.getMinutes() + 15);
                const nm = prName(k);
                lines.push('BEGIN:VEVENT',
                    'UID:prayer-' + st.getFullYear() + prPad(st.getMonth() + 1) + prPad(st.getDate()) + '-' + k + '@ahlbayt-app',
                    'DTSTAMP:' + stamp, 'DTSTART:' + prFloat(st), 'DTEND:' + prFloat(en),
                    'SUMMARY:' + prIcsEscape('🕌 ' + nm),
                    'DESCRIPTION:' + prIcsEscape(prT(nm + ' নামাজের সময়', nm + ' prayer time')),
                    'TRANSP:TRANSPARENT',
                    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + prIcsEscape('🕌 ' + nm),
                    'TRIGGER:' + (S.lead > 0 ? '-PT' + S.lead + 'M' : 'PT0S'), 'END:VALARM', 'END:VEVENT');
                count++;
            });
        });
        lines.push('END:VCALENDAR');
        if (!count) throw new Error('no events');
        const text = lines.map(prFold).join('\r\n') + '\r\n';
        await prDeliver(text);
        showToast(prT(`✅ ${toBengaliDigits(count)} টি ইভেন্ট তৈরি — ফাইল খুলে ক্যালেন্ডারে যোগ করুন`, `✅ ${count} events created — open the file to add them to your calendar`), 'success', 5000);
    } catch (e) {
        showToast(prT('❌ সময় আনা যায়নি — ইন্টারনেট চেক করে আবার চেষ্টা করুন', '❌ Could not fetch times — check your connection and retry'), 'error');
    } finally { _prBusy = false; }
}
async function prDeliver(text) {
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    try {
        const file = new File([blob], 'namaz-time.ics', { type: 'text/calendar' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: prT('নামাজের সময়', 'Prayer Times') }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; /* otherwise fall back to download */ }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'namaz-time.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
function prStatus() {
    const S = prLoad();
    if (typeof Notification === 'undefined') {
        return { kind: 'warn', text: prT('এই ব্রাউজারে নোটিফিকেশন উপলব্ধ নয়। iPhone/iPad-এ আগে Safari-তে "Share → Add to Home Screen" দিয়ে অ্যাপটি যোগ করুন, তারপর সেখান থেকে খুলুন (iOS ১৬.৪+)। নিচের ক্যালেন্ডার অপশনটি সব ডিভাইসে কাজ করে।',
            'Notifications are not available in this browser. On iPhone/iPad first use Safari "Share → Add to Home Screen" and open the app from there (iOS 16.4+). The calendar option below works on every device.') };
    }
    if (Notification.permission === 'denied') {
        return { kind: 'bad', text: prT('নোটিফিকেশন ব্লক করা আছে — ব্রাউজার বা ফোনের সেটিংসে এই সাইটের নোটিফিকেশন অনুমতি দিন।', 'Notifications are blocked — allow them for this site in your browser or phone settings.') };
    }
    if (S.on && Notification.permission === 'granted') {
        const up = prUpcoming(S)[0];
        let txt = prT('চালু আছে।', 'On.');
        if (up) txt += ' ' + prT('পরবর্তী রিমাইন্ডার: ', 'Next reminder: ') + prName(up.k) + ' · ' + (state.language === 'bn' ? toBengaliDigits(fmt12(prPad(up.at.getHours()) + ':' + prPad(up.at.getMinutes()))) : fmt12(prPad(up.at.getHours()) + ':' + prPad(up.at.getMinutes())));
        if (state.prayerTimesSource === 'default') txt += ' ⚠️ ' + prT('লাইভ সময় লোড হয়নি — GPS/ইন্টারনেট চালু করুন, নইলে রিমাইন্ডার আসবে না।', 'Live times not loaded — enable GPS/internet or reminders will not fire.');
        return { kind: 'ok', text: txt };
    }
    return { kind: 'off', text: prT('বন্ধ আছে।', 'Off.') };
}

function prayerRemindersCard(d, l) {
    const S = prLoad(), st = prStatus();
    return `
    <div class="pr-card ${d ? 'pr-dark' : ''}">
        <div class="pr-head">
            <div>
                <h3 class="pr-title">🔔 ${prT('নামাজের রিমাইন্ডার', 'Prayer Reminders')}</h3>
                <p class="pr-sub">${prT('অ্যাপ খোলা বা ব্যাকগ্রাউন্ডে থাকলে নোটিফিকেশন', 'Notifications while the app is open or in the background')}</p>
            </div>
            <button type="button" role="switch" aria-checked="${S.on}" data-action="prToggleMaster" class="quiz-switch ${S.on ? 'quiz-switch-on' : ''}" aria-label="${prT('রিমাইন্ডার চালু/বন্ধ', 'Reminders on/off')}"><span class="quiz-switch-knob"></span></button>
        </div>
        <p class="pr-status pr-${st.kind}" role="status">${sanitize(st.text)}</p>

        <p class="pr-lbl">${prT('কোন ওয়াক্তে', 'Which prayers')}</p>
        <div class="pr-pills">
            ${PR_KEYS.map(k => `<button type="button" data-action="prTogglePrayer" data-param="${k}" aria-pressed="${S.prayers[k]}" class="pr-pill${S.prayers[k] ? ' on' : ''}">${PR_ICONS[k]} ${prName(k)}</button>`).join('')}
        </div>

        <p class="pr-lbl">${prT('কখন জানাবে', 'When to notify')}</p>
        <div class="pr-pills">
            ${PR_LEADS.map(n => `<button type="button" data-action="prSetLead" data-param="${n}" aria-pressed="${S.lead === n}" class="pr-pill${S.lead === n ? ' on' : ''}">${n === 0 ? prT('ঠিক সময়ে', 'At the time') : prN(n) + ' ' + prT('মিনিট আগে', 'min before')}</button>`).join('')}
        </div>

        <button type="button" data-action="prToggleEvents" role="switch" aria-checked="${S.events}" class="pr-row">
            <span><b>🌙 ${prT('গুরুত্বপূর্ণ দিবসের আগের সন্ধ্যা', 'Eve of important days')}</b><small>${prT('আশুরা, আরবাঈন, শাহাদাত ও জন্মদিবসের আগের দিন রাত ৮টায়', 'At 8 PM the day before Ashura, Arbaeen, martyrdom days and birthdays')}</small></span>
            <span class="quiz-switch ${S.events ? 'quiz-switch-on' : ''}" aria-hidden="true"><span class="quiz-switch-knob"></span></span>
        </button>

        <div class="pr-actions">
            <button type="button" data-action="prTest" class="pr-btn pr-btn-ghost">🔔 ${prT('পরীক্ষা করুন', 'Send a test')}</button>
        </div>

        <div class="pr-note">
            <b>⚠️ ${prT('অ্যাপ সম্পূর্ণ বন্ধ থাকলে?', 'App fully closed?')}</b>
            <p>${prT('ওয়েব অ্যাপ বন্ধ থাকলে নিজে থেকে নোটিফিকেশন পাঠাতে পারে না। তখনও রিমাইন্ডার পেতে নামাজের সময়গুলো আপনার ফোনের ক্যালেন্ডারে যোগ করুন — ক্যালেন্ডার অ্যালার্ম অ্যাপ বন্ধ থাকলেও বাজে। উপরে বাছাই করা ওয়াক্ত ও "কখন জানাবে" এখানেও প্রযোজ্য।', 'A web app cannot send notifications on its own once it is closed. To be reminded anyway, add the prayer times to your phone calendar — calendar alarms ring even when this app is closed. Your prayer and lead-time choices above apply here too.')}</p>
            <div class="pr-pills" style="margin-top:10px">
                ${PR_DAYS.map(n => `<button type="button" data-action="prSetDays" data-param="${n}" aria-pressed="${S.icsDays === n}" class="pr-pill${S.icsDays === n ? ' on' : ''}">${prN(n)} ${prT('দিন', 'days')}</button>`).join('')}
            </div>
            <button type="button" data-action="prExportIcs" class="pr-btn">📅 ${prT('ক্যালেন্ডারে যোগ করুন (.ics)', 'Add to calendar (.ics)')}</button>
        </div>
    </div>`;
}

// Small link card used on the Analytics/settings page in place of the old button
function prayerRemindersLinkCard(d, l) {
    const S = prLoad();
    return `
    <div class="${d ? 'bg-gray-800' : 'bg-white'} border rounded-2xl p-6">
        <h3 class="font-bold text-lg mb-2">${prT('নামাজের রিমাইন্ডার', 'Prayer Reminder')}</h3>
        <p class="${d ? 'text-gray-400' : 'text-gray-600'} text-sm mb-4">${prT('ওয়াক্ত বাছাই, আগে-জানানো, গুরুত্বপূর্ণ দিবসের রিমাইন্ডার ও ক্যালেন্ডারে যোগ করার অপশন এখন নামাজের সময় পেজে।', 'Choose prayers, lead time, important-day reminders and calendar export — now on the Prayer Times page.')}</p>
        <button data-action="changePage" data-param="prayer" class="${d ? 'bg-green-900 text-green-300' : 'bg-green-600 text-white'} px-6 py-2.5 rounded-xl font-semibold hover:opacity-90">${S.on ? '🔔' : '🔕'} ${prT('রিমাইন্ডার সেটিংস', 'Reminder settings')}</button>
    </div>`;
}

// Small bell shown in the home prayer widget header
function prayerBellButton(d, l) {
    const on = prLoad().on && prCanNotify();
    return `<button type="button" data-action="changePage" data-param="prayer" aria-label="${prT('নামাজের রিমাইন্ডার', 'Prayer reminders')}" title="${prT('রিমাইন্ডার', 'Reminders')}"
        style="font-size:.8rem;line-height:1;padding:5px 9px;border-radius:50px;cursor:pointer;background:${on ? 'rgba(5,150,105,.14)' : (d ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.04)')};border:1.5px solid ${on ? 'rgba(5,150,105,.35)' : (d ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)')}">${on ? '🔔' : '🔕'}</button>`;
}

function prayerMethodCard(d, l) {
    const cur = prMethod();
    return `
    <div class="pr-card ${d ? 'pr-dark' : ''}">
        <h3 class="pr-title">📐 ${prT('সময় গণনার পদ্ধতি', 'Calculation method')}</h3>
        <p class="pr-sub">${prT('ফজর ও মাগরিবের সময় পদ্ধতিভেদে কয়েক মিনিট আলাদা হয়। আপনার মারজার অনুসৃত পদ্ধতি বেছে নিন।', 'Fajr and Maghrib can differ by several minutes between methods. Choose the one your marja follows.')}</p>
        <div class="pr-opts" role="radiogroup" aria-label="${prT('গণনার পদ্ধতি', 'Calculation method')}">
            ${PR_METHODS.map(m => `<button type="button" role="radio" aria-checked="${cur === m.id}" data-action="prSetMethod" data-param="${m.id}" class="pr-opt${cur === m.id ? ' on' : ''}"><b>${prT(m.bn, m.en)}</b><small>${prT(m.dbn, m.den)}</small></button>`).join('')}
        </div>
    </div>`;
}

function renderPrayerPage() {
    const d = state.darkMode, l = state.language;
    return `
    <div class="space-y-6 page-enter">
        <div>
            <h1 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🕌 ${prT('নামাজের সময় ও রিমাইন্ডার', 'Prayer Times & Reminders')}</h1>
        </div>
        <div id="prayer-widget-root">${renderPrayerWidget()}</div>
        ${typeof prayerTrackerCard === 'function' ? prayerTrackerCard(d, l) : ''}
        ${prayerMethodCard(d, l)}
        ${prayerRemindersCard(d, l)}
    </div>`;
}
