// ============================================================================
// DATA BACKUP & RESTORE  (v123)
// ----------------------------------------------------------------------------
// Page key : 'backup'  (?page=backup)
// Purpose  : everything personal (bookmarks, reading history, quiz XP/streak/
//            mistake bank, tasbeeh, preferences, …) lives only in this
//            browser's localStorage — a new phone or a cleared browser loses
//            it. This module exports it to a JSON file and restores it.
//
// What is NEVER exported or imported (hard-coded by omission from AB_SPEC):
//   ahlbayt_admin (admin flag), ahlbayt_blog_worker_url/_secret (server
//   credentials), ahlbayt_loc (GPS position), caches (prayer times / date /
//   last_day / page views / hadith index).
//   v228: the OPTIONAL 'diag' group (error log + usage counters, off by default) is the
//   only diagnostics data that can travel; its values are re-normalised on import.
//
// Import safety — a backup file is untrusted input (someone could hand you a
// crafted one):
//   * whole-file checks (size, JSON, app/format marker), whitelist of keys,
//     per-key type validation, then a recursive cleaner that drops
//     __proto__/constructor/prototype keys, caps depth/array/object/string
//     sizes and strips "<" ">" from every string of non-admin data.
//   * admin-authored content (custom posts/duas/… which may contain HTML) is
//     only importable while logged in as admin.
//   * prayer reminders are always imported switched OFF (notification
//     permission is per device).
//   * writes are all-or-nothing: previous raw values are snapshotted and
//     restored if any write fails (e.g. storage quota).
//   * after a successful restore the page reloads so every module re-reads
//     (and re-validates) storage; saveState/lsSet are disabled meanwhile so
//     the old in-memory state cannot overwrite what was just restored.
//
// Needs: state, lsGet, saveState, showToast, sanitize, toBengaliDigits, render,
// fontSizes (script-1-core.js); qpNormalizeProfile/qpNormalizeMistakes
// (quiz-plus.js — optional).
// ============================================================================

const AB_FORMAT = 1;
const AB_VERSION = 'v123';
const AB_MAX_FILE = 6 * 1024 * 1024;

// ---- what can be backed up --------------------------------------------------
const AB_GROUPS = [
    { id: 'prefs', ic: '⚙️', def: true,
      bn: 'পছন্দ ও সেটিংস', en: 'Preferences & settings',
      dbn: 'ভাষা, ডার্ক মোড, ফন্ট, চাঁদ-সমন্বয়, নামাজের হিসাব-পদ্ধতি, রিমাইন্ডার সেটিং', den: 'Language, dark mode, font, moon-sighting, prayer method, reminder settings' },
    { id: 'saved', ic: '🔖', def: true,
      bn: 'বুকমার্ক ও পড়ার ইতিহাস', en: 'Bookmarks & reading history',
      dbn: 'বুকমার্ক, জ্ঞানকেন্দ্রের প্রিয় তালিকা, "পড়া চালিয়ে যান"', den: 'Bookmarks, Knowledge Center favourites, "continue reading"' },
    { id: 'quiz', ic: '🧠', def: true,
      bn: 'কুইজের অগ্রগতি', en: 'Quiz progress',
      dbn: 'XP, লেভেল, ব্যাজ, দৈনিক ধারা, ভুলের ব্যাংক, ইতিহাস, সেরা স্কোর', den: 'XP, level, badges, daily streak, mistake bank, history, best score' },
    { id: 'tasbeeh', ic: '📿', def: true,
      bn: 'তাসবিহ', en: 'Tasbeeh',
      dbn: 'বর্তমান গণনা, লক্ষ্য ও ইতিহাস', den: 'Current count, target and history' },
    { id: 'ramadan', ic: '\U0001f319', def: true,
      bn: 'রমজান ট্র্যাকার', en: 'Ramadan tracker',
      dbn: 'রোজার হিসাব (কোন দিন রোজা রাখা হয়েছে) শবে কদরের রাতের ধাপের অগ্রগতি ও রমজানের জার্নাল (ব্যক্তিগত লেখা)', den: 'Fasting days kept this Ramadan, Qadr-night step progress and the Ramadan journal (personal text)' },
    { id: 'personal', ic: '🗂️', def: true,
      bn: 'আমার দোয়া-তালিকা, আরবি শেখা ও রিডার সেটিং', en: 'My dua lists, Arabic practice & reader settings',
      dbn: 'নিজের বানানো তালিকা, আরবি শেখার অগ্রগতি, রিডার মোডের পছন্দ', den: 'Your own lists, Arabic-corner progress and reader-mode choices' },
    { id: 'prayer', ic: '🕌', def: true,
      bn: 'নামাজ ট্র্যাকার ও কাযা', en: 'Prayer tracker & qaza',
      dbn: 'দৈনিক নামাজের হিসাব (গত ৪০০ দিন) ও কাযার সংখ্যা — ব্যক্তিগত', den: 'Daily prayer log (last 400 days) and qaza counts — personal' },
    { id: 'finance', ic: '🧮', def: false, sensitive: true,
      bn: 'খুমুস-যাকাতের ইনপুট', en: 'Khums & Zakat inputs',
      dbn: 'আয়, ব্যয়, সম্পদের সংখ্যা — ব্যক্তিগত আর্থিক তথ্য, তাই ডিফল্টে বন্ধ', den: 'Income, expense and wealth figures — personal financial data, so off by default' },
    { id: 'diag', ic: '🩺', def: false,
      bn: 'ডায়াগনস্টিক (এরর লগ ও ব্যবহার-পরিসংখ্যান)', en: 'Diagnostics (error log & usage stats)',
      dbn: 'এই ডিভাইসের এরর লগ ও ব্যবহারের গণনা — ব্যক্তিগত লেখা বা পরিচয় নেই; সমস্যা জানাতে বা ডিভাইস বদলাতে কাজে লাগে, তাই ডিফল্টে বন্ধ', den: 'This device\'s error log and usage counters — no personal text or identity; handy for reporting a problem or moving device, so off by default' },
    { id: 'admin', ic: '🛠️', def: true, admin: true,
      bn: 'কাস্টম কনটেন্ট (অ্যাডমিন)', en: 'Custom content (admin)',
      dbn: 'আপনার যোগ করা পোস্ট, দোয়া, জিয়ারত, আমল, হাদিস, আয়াত, কুইজ প্রশ্ন, বিশেষ দিন', den: 'Posts, duas, ziyarat, amal, hadith, ayahs, quiz questions and special days you added' }
];

// key -> { g: group, t: type [, re: regex] [, merge: rule] }
const AB_SPEC = {
    'ahlbayt_dark':               { g: 'prefs', t: 'bool' },
    'ahlbayt_lang':               { g: 'prefs', t: 'lang' },
    'ahlbayt_fontsize':           { g: 'prefs', t: 'font' },
    'ahlbayt_hijri_offset':       { g: 'prefs', t: 'raw', re: /^-?[01]$/ },
    'ahlbayt_cal_secondary':      { g: 'prefs', t: 'raw', re: /^(g|b|gb|n)$/ },
    'ahlbayt_prayer_remind':      { g: 'prefs', t: 'obj' },
    'ahlbayt_prayer_method':      { g: 'prefs', t: 'method' },
    'ahlbayt_quiz_timer_enabled': { g: 'prefs', t: 'bool' },

    'ahlbayt_bookmarks':          { g: 'saved', t: 'arr', merge: 'union' },
    'ahlbayt_kc_favorites':       { g: 'saved', t: 'arr', merge: 'union' },
    'ahlbayt_reading_history':    { g: 'saved', t: 'arr', merge: 'reading' },

    'ahlbayt_quiz_history':       { g: 'quiz', t: 'arr', merge: 'union' },
    'ahlbayt_quiz_best':          { g: 'quiz', t: 'pct', merge: 'max' },
    'ahlbayt_quiz_profile':       { g: 'quiz', t: 'obj', merge: 'profile' },
    'ahlbayt_quiz_mistakes':      { g: 'quiz', t: 'obj', merge: 'mistakes' },

    'ahlbayt_tasbeeh_hist':       { g: 'tasbeeh', t: 'arr', merge: 'union' },
    'ahlbayt_tasbeeh_count':      { g: 'tasbeeh', t: 'count' },
    'ahlbayt_tasbeeh_label':      { g: 'tasbeeh', t: 'str' },
    'ahlbayt_tasbeeh_target':     { g: 'tasbeeh', t: 'count' },
    'ahlbayt_tasbeeh_selected':   { g: 'tasbeeh', t: 'count' },

    'ahlbayt_ramadan':            { g: 'ramadan', t: 'obj' },
    'ahlbayt_qadr_walk':          { g: 'ramadan', t: 'obj' },
    'ahlbayt_ramadan_journal':    { g: 'ramadan', t: 'obj' },
    'ahlbayt_qaza_fidya':         { g: 'ramadan', t: 'obj' },
    'ahlbayt_ramadan_hist':       { g: 'ramadan', t: 'obj' },
    'ahlbayt_khums_zakat':        { g: 'finance', t: 'obj' },

    'ahlbayt_dua_playlists':      { g: 'personal', t: 'obj', merge: 'playlists' },
    'ahlbayt_arabic_corner':      { g: 'personal', t: 'obj' },
    'ahlbayt_reader_mode':        { g: 'personal', t: 'obj' },

    'ahlbayt_prayer_tracker':     { g: 'prayer', t: 'obj', merge: 'prayerTracker' },

    'ahlbayt_errlog':             { g: 'diag', t: 'arr', merge: 'errlog' },      // v228 (error-log.js)
    'ahlbayt_usage':              { g: 'diag', t: 'obj', merge: 'usage' }        // v228 (diagnostics.js)
};
['custom_posts', 'custom_duas', 'custom_ziyarat', 'custom_amal', 'custom_hadiths', 'custom_ayahs', 'nahjul_balagha',
 'sahifa_sajjadiya', 'imam_hadiths', 'special_days', 'muharram_events', 'shia_special_days', 'custom_quiz'
].forEach(k => { AB_SPEC['ahlbayt_' + k] = { g: 'admin', t: 'arr' }; });

let _ab = { sel: null, impSel: {}, mode: 'merge', preview: null, error: '', busy: false };

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function abT(b, e) { return state.language === 'bn' ? b : e; }
function abN(n) { return state.language === 'bn' ? toBengaliDigits(n) : String(n); }
function abGroup(id) { return AB_GROUPS.find(g => g.id === id); }
function abVisibleGroups() { return AB_GROUPS.filter(g => !g.admin || state.isAdmin); }
function abKeysOf(gid) { return Object.keys(AB_SPEC).filter(k => AB_SPEC[k].g === gid); }
function abDateStamp() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function abBadKey(k) { return k === '__proto__' || k === 'constructor' || k === 'prototype'; }
function abSel() {
    if (!_ab.sel) { _ab.sel = {}; AB_GROUPS.forEach(g => { _ab.sel[g.id] = g.def; }); }
    return _ab.sel;
}

// Local read: JSON keys via lsGet, "raw" keys (not JSON) straight from storage. Returns undefined when absent.
function abReadLocal(key) {
    const sp = AB_SPEC[key];
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return undefined;
        if (sp.t === 'raw') return raw;
        return JSON.parse(raw);
    } catch (e) { return undefined; }
}
function abCount(v) {
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === 'object') return Object.keys(v).length;
    return 1;
}
function abGroupCount(gid) {
    let n = 0;
    abKeysOf(gid).forEach(k => { const v = abReadLocal(k); if (v !== undefined && v !== null && !(Array.isArray(v) && !v.length)) n += (AB_SPEC[k].t === 'arr') ? abCount(v) : 1; });
    return n;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
function abBuildBackup(groupIds) {
    try { saveState(); } catch (e) { /* flush in-memory state first */ }
    try { if (typeof dgFlush === 'function') dgFlush(); } catch (e) { /* v228: pending usage counts */ }
    const data = {};
    groupIds.forEach(gid => {
        const g = abGroup(gid);
        if (!g || (g.admin && !state.isAdmin)) return;
        abKeysOf(gid).forEach(k => {
            const v = abReadLocal(k);
            if (v === undefined || v === null) return;
            if (Array.isArray(v) && !v.length) return;
            data[k] = v;
        });
    });
    return { app: 'ahlbayt', format: AB_FORMAT, version: AB_VERSION, exportedAt: new Date().toISOString(), groups: groupIds.slice(), data: data };
}
async function abExport() {
    const sel = abSel();
    const ids = abVisibleGroups().filter(g => sel[g.id]).map(g => g.id);
    if (!ids.length) { showToast(abT('অন্তত একটি বিষয় বেছে নিন', 'Select at least one item'), 'warning'); return; }
    const bk = abBuildBackup(ids);
    if (!Object.keys(bk.data).length) { showToast(abT('বেছে নেওয়া বিষয়ে এখনো কোনো ডেটা নেই', 'Nothing saved yet for the selected items'), 'info'); return; }
    const text = JSON.stringify(bk);
    const name = 'ahlbayt-backup-' + abDateStamp() + '.json';
    const blob = new Blob([text], { type: 'application/json' });
    try {
        const file = new File([blob], name, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: abT('আহলে বাইত অ্যাপ ব্যাকআপ', 'Ahl al-Bayt app backup') });
            showToast(abT('✅ ব্যাকআপ প্রস্তুত', '✅ Backup ready'), 'success'); return;
        }
    } catch (e) { if (e && e.name === 'AbortError') return; /* otherwise fall back to download */ }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast(abT('✅ ব্যাকআপ ফাইল ডাউনলোড হয়েছে', '✅ Backup file downloaded'), 'success');
}

// ---------------------------------------------------------------------------
// Import — validation
// ---------------------------------------------------------------------------
function abClean(v, o, depth) {
    if (depth > 6) return undefined;
    if (v === null) return null;
    const t = typeof v;
    if (t === 'boolean') return v;
    if (t === 'number') return isFinite(v) ? v : undefined;
    if (t === 'string') { let s = v.slice(0, o.maxStr); if (!o.html) s = s.replace(/[<>]/g, ''); return s; }
    if (Array.isArray(v)) {
        const out = [], n = Math.min(v.length, o.maxArr);
        for (let i = 0; i < n; i++) { const c = abClean(v[i], o, depth + 1); if (c !== undefined) out.push(c); }
        return out;
    }
    if (t === 'object') {
        const out = {}; let n = 0;
        for (const k of Object.keys(v)) {
            if (abBadKey(k) || k.length > 100) continue;
            if (++n > o.maxKeys) break;
            const c = abClean(v[k], o, depth + 1);
            if (c !== undefined) out[k] = c;
        }
        return out;
    }
    return undefined;
}
// Returns { ok:true, value } | { ok:false }.  `value` is what will be stored (JSON value, or string for raw keys).
function abValidateKey(key, v, allowHtml) {
    const sp = AB_SPEC[key];
    if (!sp) return { ok: false };
    const lim = allowHtml ? { html: true, maxStr: 200000, maxArr: 5000, maxKeys: 500 } : { html: false, maxStr: 2000, maxArr: 5000, maxKeys: 500 };
    switch (sp.t) {
        case 'bool': return typeof v === 'boolean' ? { ok: true, value: v } : { ok: false };
        case 'lang': return (v === 'bn' || v === 'en') ? { ok: true, value: v } : { ok: false };
        case 'font': return (typeof fontSizes !== 'undefined' && fontSizes.indexOf(v) > -1) ? { ok: true, value: v } : { ok: false };
        case 'method': return [0, 1, 3, 7].indexOf(v) > -1 ? { ok: true, value: v } : { ok: false };
        case 'pct': return (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100) ? { ok: true, value: Math.round(v) } : { ok: false };
        case 'count': return (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1e9) ? { ok: true, value: Math.floor(v) } : { ok: false };
        case 'str': return typeof v === 'string' ? { ok: true, value: v.slice(0, 80).replace(/[<>]/g, '') } : { ok: false };
        case 'raw': return (typeof v === 'string' && sp.re.test(v)) ? { ok: true, value: v } : { ok: false };
        case 'arr': {
            if (!Array.isArray(v)) return { ok: false };
            let c = abClean(v, lim, 0);
            if (key === 'ahlbayt_errlog' && typeof dgNormalizeLog === 'function') c = dgNormalizeLog(c);   // v228
            return { ok: true, value: c };
        }
        case 'obj': {
            if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false };
            let c = abClean(v, lim, 0);
            if (key === 'ahlbayt_prayer_remind') c.on = false;                       // permission is per device
            if (key === 'ahlbayt_quiz_profile' && typeof qpNormalizeProfile === 'function') c = qpNormalizeProfile(c);
            if (key === 'ahlbayt_quiz_mistakes' && typeof qpNormalizeMistakes === 'function') c = qpNormalizeMistakes(c);
            if (key === 'ahlbayt_prayer_tracker' && typeof ptNormalize === 'function') c = ptNormalize(c);   // v207
            if (key === 'ahlbayt_usage' && typeof dgNormalizeUsage === 'function') c = dgNormalizeUsage(c);   // v228
            return { ok: true, value: c };
        }
    }
    return { ok: false };
}

function abParseBackup(text) {
    let j;
    try { j = JSON.parse(text); } catch (e) { return { error: abT('ফাইলটি পড়া যায়নি — এটি বৈধ ব্যাকআপ ফাইল নয়।', 'Could not read the file — it is not a valid backup.') }; }
    if (!j || typeof j !== 'object' || Array.isArray(j) || j.app !== 'ahlbayt' || j.format !== AB_FORMAT || !j.data || typeof j.data !== 'object' || Array.isArray(j.data)) {
        return { error: abT('এটি এই অ্যাপের ব্যাকআপ ফাইল নয় (বা ভার্সন মেলে না)।', 'This is not a backup file from this app (or the version does not match).') };
    }
    const clean = {}, found = {}, skipped = { admin: 0, invalid: 0, unknown: 0 };
    Object.keys(j.data).forEach(k => {
        if (abBadKey(k)) return;
        const sp = Object.prototype.hasOwnProperty.call(AB_SPEC, k) ? AB_SPEC[k] : null;
        if (!sp) { skipped.unknown++; return; }
        const grp = abGroup(sp.g);
        if (grp.admin && !state.isAdmin) { skipped.admin++; return; }
        const r = abValidateKey(k, j.data[k], !!grp.admin);
        if (!r.ok) { skipped.invalid++; return; }
        clean[k] = r.value;
        if (!found[sp.g]) found[sp.g] = { keys: 0, items: 0 };
        found[sp.g].keys++;
        found[sp.g].items += sp.t === 'arr' ? r.value.length : 1;
    });
    if (!Object.keys(clean).length) {
        return { error: abT('ফাইলে রিস্টোর করার মতো বৈধ ডেটা পাওয়া যায়নি।', 'The file contains no valid data to restore.') };
    }
    const when = (typeof j.exportedAt === 'string' && !isNaN(Date.parse(j.exportedAt))) ? new Date(j.exportedAt) : null;
    return { clean: clean, found: found, skipped: skipped, when: when, version: typeof j.version === 'string' ? j.version.slice(0, 12).replace(/[<>]/g, '') : '' };
}

async function abOnFile(input) {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    _ab.error = ''; _ab.preview = null;
    if (f.size > AB_MAX_FILE) { _ab.error = abT('ফাইলটি অনেক বড় (সর্বোচ্চ ৬ MB)।', 'The file is too large (max 6 MB).'); render(); return; }
    let text = '';
    try { text = await f.text(); } catch (e) { _ab.error = abT('ফাইলটি পড়া যায়নি।', 'Could not read the file.'); render(); return; }
    // v229: quiz-plus.js (lazy) owns the quiz-progress normalisers used while parsing — make sure it is there
    try { if (typeof abLazy !== 'undefined') await abLazy.load('quiz'); } catch (e) { /* parse falls back to the generic clean-up, as before */ }
    const r = abParseBackup(text);
    if (r.error) { _ab.error = r.error; render(); return; }
    _ab.preview = r;
    _ab.impSel = {};
    Object.keys(r.found).forEach(g => { _ab.impSel[g] = true; });
    render();
}

// ---------------------------------------------------------------------------
// Import — apply
// ---------------------------------------------------------------------------
function abUnion(local, incoming) {
    const out = [], seen = {};
    (Array.isArray(local) ? local : []).concat(Array.isArray(incoming) ? incoming : []).forEach(x => {
        let k; try { k = typeof x + ':' + JSON.stringify(x); } catch (e) { return; }
        if (seen[k]) return; seen[k] = 1; out.push(x);
    });
    return out;
}
function abMergeReading(local, incoming) {
    const map = {};
    (Array.isArray(local) ? local : []).concat(Array.isArray(incoming) ? incoming : []).forEach(x => {
        if (!x || typeof x !== 'object') return;
        const k = String(x.type) + '|' + String(x.id);
        if (!map[k] || (Number(x.ts) || 0) > (Number(map[k].ts) || 0)) map[k] = x;
    });
    return Object.keys(map).map(k => map[k]).sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0)).slice(0, 30);
}

// Decide final value for one key. Returns { write:boolean, value }.
function abResolve(key, incoming, mode) {
    const sp = AB_SPEC[key];
    const local = abReadLocal(key);
    if (mode === 'replace' || !sp.merge) return { write: true, value: incoming };
    switch (sp.merge) {
        case 'union': {
            const u = abUnion(local, incoming);
            return { write: true, value: key === 'ahlbayt_quiz_history' ? u.slice(0, 20) : u.slice(0, 500) };
        }
        case 'reading': return { write: true, value: abMergeReading(local, incoming) };
        case 'playlists': {
            // union by list id (this device's copy wins on a clash); capped like the app itself
            const out = (local && Array.isArray(local.lists)) ? local.lists.slice() : [];
            const ids = {}; out.forEach(l => { if (l && l.id) ids[l.id] = 1; });
            ((incoming && Array.isArray(incoming.lists)) ? incoming.lists : []).forEach(l => { if (l && l.id && !ids[l.id] && out.length < 30) { ids[l.id] = 1; out.push(l); } });
            return { write: true, value: { v: 1, lists: out } };
        }
        case 'prayerTracker': return { write: true, value: (typeof ptMergeBackup === 'function') ? ptMergeBackup(local, incoming) : incoming };   // v207
        case 'errlog': return { write: true, value: (typeof dgMergeLog === 'function') ? dgMergeLog(local, incoming) : incoming };           // v228
        case 'usage': return { write: true, value: (typeof dgMergeUsage === 'function') ? dgMergeUsage(local, incoming) : incoming };       // v228
        case 'max': return { write: true, value: Math.max(Number(local) || 0, Number(incoming) || 0) };
        case 'profile': case 'mistakes': {
            // profile + mistake bank travel together: the side with more XP wins both
            const lp = (typeof qpNormalizeProfile === 'function') ? qpNormalizeProfile(abReadLocal('ahlbayt_quiz_profile')) : { xp: 0 };
            const ip = (typeof qpNormalizeProfile === 'function' && _ab.preview && _ab.preview.clean['ahlbayt_quiz_profile']) ? _ab.preview.clean['ahlbayt_quiz_profile'] : { xp: Infinity };
            return ip.xp >= lp.xp ? { write: true, value: incoming } : { write: false };
        }
    }
    return { write: true, value: incoming };
}

function abApply() {
    const pv = _ab.preview;
    if (!pv || _ab.busy) return;
    const chosen = Object.keys(pv.found).filter(g => _ab.impSel[g]);
    if (!chosen.length) { showToast(abT('অন্তত একটি বিষয় বেছে নিন', 'Select at least one item'), 'warning'); return; }
    const msg = _ab.mode === 'replace'
        ? abT('বেছে নেওয়া বিষয়ে এই ডিভাইসের বর্তমান ডেটা ব্যাকআপ দিয়ে প্রতিস্থাপিত হবে। এগিয়ে যাবেন?', 'The current data on this device for the selected items will be replaced by the backup. Continue?')
        : abT('ব্যাকআপের ডেটা এই ডিভাইসের ডেটার সাথে মার্জ হবে। এগিয়ে যাবেন?', 'The backup will be merged with the data on this device. Continue?');
    if (!confirm(msg)) return;
    _ab.busy = true;
    try { saveState(); } catch (e) { /* flush first so merges see the latest */ }

    const plan = [];
    Object.keys(pv.clean).forEach(k => {
        if (chosen.indexOf(AB_SPEC[k].g) < 0) return;
        const r = abResolve(k, pv.clean[k], _ab.mode);
        if (r.write) plan.push({ key: k, value: r.value });
    });
    const snapshot = {};
    plan.forEach(p => { snapshot[p.key] = localStorage.getItem(p.key); });
    try {
        plan.forEach(p => {
            if (AB_SPEC[p.key].t === 'raw') {
                if (p.key === 'ahlbayt_hijri_offset' && p.value === '0') localStorage.removeItem(p.key);
                else localStorage.setItem(p.key, p.value);
            } else localStorage.setItem(p.key, JSON.stringify(p.value));
        });
    } catch (e) {
        Object.keys(snapshot).forEach(k => { try { if (snapshot[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, snapshot[k]); } catch (e2) { /* nothing more to do */ } });
        _ab.busy = false;
        _ab.error = abT('রিস্টোর ব্যর্থ — ডিভাইসের স্টোরেজ ভরে গেছে। আপনার আগের ডেটা অক্ষত আছে।', 'Restore failed — device storage is full. Your previous data is untouched.');
        render(); return;
    }
    // v228: the diagnostics counters / error log must not flush over the restored values either.
    try { if (typeof dgFreeze === 'function') dgFreeze(); } catch (e) { /* ignore */ }
    // Stop the old in-memory state from overwriting the restored values before the reload.
    try { window.saveState = function () {}; saveState = function () {}; } catch (e) { /* ignore */ }
    try { window.lsSet = function () {}; lsSet = function () {}; } catch (e) { /* ignore */ }
    showToast(abT('✅ রিস্টোর সম্পন্ন — অ্যাপ নতুন করে লোড হচ্ছে…', '✅ Restore complete — reloading the app…'), 'success', 3000);
    setTimeout(() => location.reload(), 900);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function abToggleExport(id) { const s = abSel(); if (abGroup(id)) { s[id] = !s[id]; render(); } }
function abToggleImport(id) { if (_ab.preview && _ab.preview.found[id]) { _ab.impSel[id] = !_ab.impSel[id]; render(); } }
function abSetMode(m) { if (m === 'merge' || m === 'replace') { _ab.mode = m; render(); } }
function abCancel() { _ab.preview = null; _ab.error = ''; render(); }
function abPickFile() { const el = document.getElementById('ab-file'); if (el) el.click(); }
document.addEventListener('change', e => { if (e.target && e.target.id === 'ab-file') abOnFile(e.target); });

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function abFmtDate(d) {
    try { return d.toLocaleString(state.language === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
}
function abCheck(on, id, action, ic, title, desc, count) {
    return `<button type="button" role="checkbox" aria-checked="${on}" data-action="${action}" data-param="${id}" class="ab-item${on ? ' on' : ''}">
        <span class="ab-box" aria-hidden="true">${on ? '✓' : ''}</span>
        <span class="ab-body"><b>${ic} ${title}</b><small>${desc}</small></span>
        ${count != null ? `<span class="ab-cnt">${count}</span>` : ''}
    </button>`;
}

function renderBackupPage() {
    const d = state.darkMode, l = state.language;
    const sel = abSel(), pv = _ab.preview;
    const vis = abVisibleGroups();
    const hasAny = vis.some(g => sel[g.id] && abGroupCount(g.id) > 0);
    return `
    <div class="ab space-y-6 page-enter ${d ? 'ab-dark' : ''}">
        <div>
            <h1 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">💾 ${abT('ডেটা ব্যাকআপ ও রিস্টোর', 'Backup & Restore')}</h1>
            <p class="text-sm ${d ? 'text-gray-400' : 'text-gray-500'} mt-1">${abT('আপনার বুকমার্ক, কুইজের অগ্রগতি, তাসবিহ ও সেটিংস শুধু এই ডিভাইসে থাকে। ফোন বদলালে বা ব্রাউজার ডেটা মুছলে হারিয়ে যায় — তাই ফাইলে সেভ করে রাখুন।', 'Your bookmarks, quiz progress, tasbeeh and settings live only on this device. A new phone or cleared browser data loses them — keep a copy in a file.')}</p>
        </div>

        <section class="ab-card" aria-labelledby="ab-h1">
            <h2 id="ab-h1" class="ab-h">📤 ${abT('ব্যাকআপ নিন', 'Create a backup')}</h2>
            <div class="ab-list">
                ${vis.map(g => abCheck(!!sel[g.id], g.id, 'abToggleExport', g.ic, abT(g.bn, g.en), abT(g.dbn, g.den), abN(abGroupCount(g.id)))).join('')}
            </div>
            ${vis.some(g => g.sensitive && sel[g.id]) ? `<p class="ab-warn">⚠️ ${abT('খুমুস-যাকাতের তথ্য ব্যক্তিগত আর্থিক তথ্য — ফাইলটি অন্যকে দেবেন না।', 'Khums & Zakat figures are personal financial data — do not share this file.')}</p>` : ''}
            <button type="button" data-action="abExport" class="ab-btn"${hasAny ? '' : ' disabled="disabled"'}>📤 ${abT('ব্যাকআপ ফাইল তৈরি করুন', 'Create backup file')}</button>
        </section>

        <section class="ab-card" aria-labelledby="ab-h2">
            <h2 id="ab-h2" class="ab-h">📥 ${abT('রিস্টোর করুন', 'Restore from a backup')}</h2>
            <input type="file" id="ab-file" accept="application/json,.json" hidden>
            ${_ab.error ? `<p class="ab-err" role="alert">❌ ${sanitize(_ab.error)}</p>` : ''}
            ${pv ? abPreviewHtml(pv, d, l) : `
            <p class="ab-p">${abT('আগে তৈরি করা ব্যাকআপ ফাইল (.json) বেছে নিন। রিস্টোরের আগে ভেতরে কী আছে দেখানো হবে — কিছু বদলানোর আগে আপনার নিশ্চিতকরণ চাওয়া হবে।', 'Choose a backup file (.json) you made earlier. You will see what is inside and confirm before anything changes.')}</p>
            <button type="button" data-action="abPickFile" class="ab-btn ab-btn-ghost">📂 ${abT('ব্যাকআপ ফাইল বেছে নিন', 'Choose backup file')}</button>`}
        </section>

        <section class="ab-note">
            <b>🔒 ${abT('গোপনীয়তা ও নিরাপত্তা', 'Privacy & safety')}</b>
            <ul>
                <li>${abT('ফাইল তৈরি হয় আপনার ডিভাইসেই; কোনো সার্ভারে পাঠানো হয় না।', 'The file is created on your device; nothing is sent to a server.')}</li>
                <li>${abT('অ্যাডমিন অ্যাক্সেস, সার্ভারের গোপন টোকেন, GPS লোকেশন ও সাময়িক ক্যাশ কখনো ব্যাকআপে যায় না।', 'Admin access, server tokens, GPS location and temporary caches are never included.')}</li>
                <li>${abT('রিস্টোরের সময় প্রতিটি তথ্য যাচাই ও পরিষ্কার করা হয়; নামাজের রিমাইন্ডার সবসময় বন্ধ অবস্থায় আসে (নোটিফিকেশন অনুমতি ডিভাইসভিত্তিক)।', 'Every value is validated and cleaned on restore; prayer reminders always come back switched off (notification permission is per device).')}</li>
                <li>${abT('শুধু নিজের তৈরি ব্যাকআপ রিস্টোর করুন।', 'Only restore backups you made yourself.')}</li>
            </ul>
        </section>
        ${typeof dgBackupLinkHtml === 'function' ? dgBackupLinkHtml() : ''}
    </div>`;
}

function abPreviewHtml(pv, d, l) {
    const groups = AB_GROUPS.filter(g => pv.found[g.id]);
    const sk = pv.skipped;
    const skipNotes = [];
    if (sk.admin) skipNotes.push(abT(`${abN(sk.admin)} টি অ্যাডমিন-কনটেন্ট বাদ — শুধু অ্যাডমিন লগইনে রিস্টোর হয়`, `${sk.admin} admin-content item(s) skipped — only restorable while logged in as admin`));
    if (sk.invalid) skipNotes.push(abT(`${abN(sk.invalid)} টি অবৈধ মান বাদ`, `${sk.invalid} invalid value(s) skipped`));
    if (sk.unknown) skipNotes.push(abT(`${abN(sk.unknown)} টি অচেনা তথ্য বাদ`, `${sk.unknown} unknown item(s) skipped`));
    return `
    <div class="ab-prev">
        <p class="ab-p"><b>${abT('ব্যাকআপ পাওয়া গেছে', 'Backup found')}</b>${pv.when ? ' · ' + sanitize(abFmtDate(pv.when)) : ''}${pv.version ? ' · ' + sanitize(pv.version) : ''}</p>
        <div class="ab-list">
            ${groups.map(g => abCheck(!!_ab.impSel[g.id], g.id, 'abToggleImport', g.ic, abT(g.bn, g.en), abT(g.dbn, g.den), abN(pv.found[g.id].items))).join('')}
        </div>
        ${skipNotes.length ? `<p class="ab-warn">ℹ️ ${skipNotes.map(sanitize).join(' · ')}</p>` : ''}
        <p class="ab-lbl">${abT('কীভাবে রিস্টোর হবে', 'How to restore')}</p>
        <div class="ab-modes">
            <button type="button" data-action="abSetMode" data-param="merge" aria-pressed="${_ab.mode === 'merge'}" class="ab-mode${_ab.mode === 'merge' ? ' on' : ''}"><b>🔀 ${abT('মার্জ (প্রস্তাবিত)', 'Merge (recommended)')}</b><small>${abT('বুকমার্ক/ইতিহাস যোগ হবে, সেরা স্কোর ও বেশি-XP-এর কুইজ প্রোফাইল থাকবে; বাকি বিষয় ব্যাকআপের মান নেবে', 'Bookmarks/history are combined, best score and the higher-XP quiz profile are kept; other items take the backup values')}</small></button>
            <button type="button" data-action="abSetMode" data-param="replace" aria-pressed="${_ab.mode === 'replace'}" class="ab-mode${_ab.mode === 'replace' ? ' on' : ''}"><b>♻️ ${abT('প্রতিস্থাপন', 'Replace')}</b><small>${abT('বেছে নেওয়া বিষয়ে এই ডিভাইসের ডেটা সম্পূর্ণ ব্যাকআপ দিয়ে বদলে যাবে', 'Selected items on this device are fully overwritten by the backup')}</small></button>
        </div>
        <div class="ab-row">
            <button type="button" data-action="abApply" class="ab-btn">✅ ${abT('রিস্টোর করুন', 'Restore')}</button>
            <button type="button" data-action="abCancel" class="ab-btn ab-btn-ghost">${abT('বাতিল', 'Cancel')}</button>
        </div>
    </div>`;
}
