// ============================================================================
// DIAGNOSTICS: USAGE STATS + ERROR-LOG PAGE  (v228)
// ----------------------------------------------------------------------------
// Page key : 'diagnostics'  (?page=diagnostics) — linked from Backup & Restore
//
// WHY
//   There was no way to learn which features are used, where people stop, or
//   what breaks on a phone. This adds both — WITHOUT any server, account,
//   cookie or third-party script: everything is counted and kept on the
//   device itself (localStorage), nothing is ever sent anywhere.
//
// WHAT IS COUNTED (key 'ahlbayt_usage', last 90 days, per day)
//   s  sessions (one per page load, or after 30+ minutes away)
//   v  page views per page key ('home', 'dua', 'readDua' …)
//   x  "left from" — the page that was showing when the app went to the
//      background / the tab was closed (a tap-out or exit signal)
//   w  seconds spent per page (visible time only, each stay capped at 30 min)
//   e  button/feature uses — the NAME of the data-action ('toggleDarkMode' …)
//   c  (top level) how often a Dua / Ziyarat / Amal / blog post was opened,
//      by its id ('dua:dua-kumayl'), top 200
//   NEVER counted: anything typed (search words, notes, journal), GPS, names,
//   any identifier, IP, user-agent. The only button PARAMETER recorded is the
//   content id of the four "open" actions above.
//   Counting can be switched off on the page (key 'ahlbayt_usage_off' = '1').
//
// HOW IT HOOKS IN (purely additive)
//   • render() is wrapped (same pattern as reader-mode.js) to see page changes.
//   • one capture-phase click listener on [data-action] — it never stops or
//     alters the event.
//   • visibilitychange / pagehide to close the dwell timer and flush.
//   Counts are kept as small DELTAS in memory and merged into the stored object
//   at flush time (every ~15 s, on background, on pagehide) — so two open tabs
//   cannot overwrite each other and a restore cannot be clobbered.
//
// ERROR LOG: the data comes from error-log.js (window.__dgLog); this file only
// shows it (view / copy report / download / clear).
//
// Backup & Restore ('diag' group, off by default) uses dgNormalizeLog,
// dgMergeLog, dgNormalizeUsage, dgMergeUsage and dgFreeze defined here.
// Loads before browser-history.js (which must wrap the final render()).
// Needs: state, render, showToast, t, toBengaliDigits (script-1-core.js).
// ============================================================================
(function () {
'use strict';

if (typeof window === 'undefined') return;

var USAGE_KEY = 'ahlbayt_usage', OFF_KEY = 'ahlbayt_usage_off';
var MAX_DAYS = 90, MAX_KEYS = 80, MAX_CONTENT = 200, MAX_BYTES = 250000;
var SESSION_GAP = 30 * 60 * 1000, MAX_STAY = 1800, FLUSH_MS = 15000;
var CONTENT_ACTIONS = { readDua: 'dua', readPost: 'post', readZiyarat: 'ziyarat', readAmal: 'amal' };
var SKIP_ACTIONS = { changePage: 1 };            // already covered by page views
var KEY_RE = /^[A-Za-z0-9_.:-]{1,60}$/;
var ID_RE = /^[A-Za-z0-9_.-]{1,80}$/;
var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

var frozen = false;
var pend = { d: {}, c: {} }, dirty = false, flushTimer = null;
var lastPage = '', segStart = 0, hiddenAt = 0, leftCounted = false;
var ui = { days: 30, open: {} };

// ---- tiny helpers ----------------------------------------------------------
function T(b, e) { return (typeof state !== 'undefined' && state.language === 'en') ? e : b; }
function N(n) { return (typeof state !== 'undefined' && state.language !== 'en' && typeof toBengaliDigits === 'function') ? toBengaliDigits(n) : String(n); }
function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function badKey(k) { return k === '__proto__' || k === 'constructor' || k === 'prototype'; }
function okKey(k) { return KEY_RE.test(k) && !badKey(k); }
function intIn(v, lo, hi) { v = Number(v); return (isFinite(v) && v >= lo) ? Math.min(Math.floor(v), hi) : 0; }
function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function isOff() { try { return localStorage.getItem(OFF_KEY) === '1'; } catch (e) { return false; } }
function fmtTime(ms) {
    try { return new Date(ms).toLocaleString(T('bn', 'en') === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return new Date(ms).toISOString().slice(0, 16).replace('T', ' '); }
}
function fmtDur(sec) {
    sec = Math.round(sec);
    if (sec < 60) return N(sec) + T(' সেকেন্ড', ' s');
    var m = Math.floor(sec / 60), s = sec % 60;
    return N(m) + T(' মি ', ' m ') + (s ? N(s) + T(' সে', ' s') : '');
}
function pageLabel(p) {
    try { if (typeof t === 'function') { var x = t(p); if (x && x !== p) return x; } } catch (e) { /* ignore */ }
    return p;
}
function pretty(a) { return String(a).replace(/([a-z0-9])([A-Z])/g, '$1 $2'); }

// ---- usage storage ---------------------------------------------------------
function emptyUsage() { return { v: 1, since: '', d: {}, c: {} }; }
function normalizeUsage(u) {
    var out = emptyUsage();
    if (!u || typeof u !== 'object' || Array.isArray(u)) return out;
    if (typeof u.since === 'string' && DAY_RE.test(u.since)) out.since = u.since;
    var days = (u.d && typeof u.d === 'object' && !Array.isArray(u.d)) ? Object.keys(u.d) : [];
    days.filter(function (k) { return DAY_RE.test(k); }).sort().slice(-MAX_DAYS).forEach(function (k) {
        var s = u.d[k];
        if (!s || typeof s !== 'object') return;
        var o = { s: intIn(s.s, 0, 1e5), v: {}, x: {}, w: {}, e: {} };
        ['v', 'x', 'w', 'e'].forEach(function (b) {
            var src = s[b];
            if (!src || typeof src !== 'object' || Array.isArray(src)) return;
            Object.keys(src).slice(0, MAX_KEYS).forEach(function (kk) {
                if (!okKey(kk)) return;
                var n = intIn(src[kk], 0, b === 'w' ? 864000 : 1e6);
                if (n > 0) o[b][kk] = n;
            });
        });
        out.d[k] = o;
    });
    if (u.c && typeof u.c === 'object' && !Array.isArray(u.c)) {
        Object.keys(u.c).forEach(function (k) {
            var m = /^(dua|post|ziyarat|amal):(.+)$/.exec(k);
            if (!m || !ID_RE.test(m[2]) || badKey(m[2])) return;
            var n = intIn(u.c[k], 0, 1e6);
            if (n > 0) out.c[k] = n;
        });
        out.c = topN(out.c, MAX_CONTENT);
    }
    return out;
}
function topN(map, n) {
    var keys = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; }).slice(0, n), out = {};
    keys.forEach(function (k) { out[k] = map[k]; });
    return out;
}
function loadUsage() {
    try { return normalizeUsage(JSON.parse(localStorage.getItem(USAGE_KEY))); } catch (e) { return emptyUsage(); }
}
function saveUsage(u) {
    var days = Object.keys(u.d).sort();
    while (days.length > MAX_DAYS) delete u.d[days.shift()];
    for (var i = 0; i < 40; i++) {
        var text = JSON.stringify(u);
        if (text.length <= MAX_BYTES || !days.length) {
            try { localStorage.setItem(USAGE_KEY, text); return true; } catch (e) { /* quota: drop the oldest day and retry */ }
        }
        if (!days.length) return false;
        delete u.d[days.shift()];
    }
    return false;
}
// backup restore: max() per counter, so restoring the same file twice changes nothing
function mergeUsage(local, incoming) {
    var a = normalizeUsage(local), b = normalizeUsage(incoming), out = emptyUsage();
    out.since = (a.since && b.since) ? (a.since < b.since ? a.since : b.since) : (a.since || b.since);
    var days = {};
    Object.keys(a.d).concat(Object.keys(b.d)).forEach(function (k) { days[k] = 1; });
    Object.keys(days).forEach(function (k) {
        var x = a.d[k] || { s: 0, v: {}, x: {}, w: {}, e: {} }, y = b.d[k] || { s: 0, v: {}, x: {}, w: {}, e: {} };
        var o = { s: Math.max(x.s, y.s), v: {}, x: {}, w: {}, e: {} };
        ['v', 'x', 'w', 'e'].forEach(function (bk) {
            Object.keys(x[bk]).concat(Object.keys(y[bk])).forEach(function (kk) { o[bk][kk] = Math.max(x[bk][kk] || 0, y[bk][kk] || 0); });
        });
        out.d[k] = o;
    });
    Object.keys(a.c).concat(Object.keys(b.c)).forEach(function (k) { out.c[k] = Math.max(a.c[k] || 0, b.c[k] || 0); });
    out.c = topN(out.c, MAX_CONTENT);
    var ks = Object.keys(out.d).sort();
    while (ks.length > MAX_DAYS) delete out.d[ks.shift()];
    return out;
}

// ---- counting (in-memory deltas) -------------------------------------------
function pDay(day) { return pend.d[day] || (pend.d[day] = { s: 0, v: {}, x: {}, w: {}, e: {} }); }
function bump(bucket, key, n) {
    if (frozen || isOff() || !okKey(key)) return;
    var b = pDay(dayKey())[bucket];
    if (!Object.prototype.hasOwnProperty.call(b, key) && Object.keys(b).length >= MAX_KEYS) return;
    b[key] = (b[key] || 0) + n;
    touch();
}
function bumpContent(id) {
    if (frozen || isOff()) return;
    pend.c[id] = (pend.c[id] || 0) + 1;
    touch();
}
function touch() {
    dirty = true;
    if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS);
}
function flush() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!dirty || frozen) return;
    dirty = false;
    try {
        var u = loadUsage();
        if (!u.since) u.since = dayKey();
        Object.keys(pend.d).forEach(function (day) {
            var p = pend.d[day], o = u.d[day] || (u.d[day] = { s: 0, v: {}, x: {}, w: {}, e: {} });
            o.s += p.s;
            ['v', 'x', 'w', 'e'].forEach(function (b) {
                Object.keys(p[b]).forEach(function (k) {
                    if (!Object.prototype.hasOwnProperty.call(o[b], k) && Object.keys(o[b]).length >= MAX_KEYS) return;
                    o[b][k] = (o[b][k] || 0) + p[b][k];
                });
            });
        });
        Object.keys(pend.c).forEach(function (k) { u.c[k] = (u.c[k] || 0) + pend.c[k]; });
        u.c = topN(u.c, MAX_CONTENT);
        pend = { d: {}, c: {} };
        saveUsage(u);
    } catch (e) { /* counting must never break the app */ }
}

// ---- page tracking (render wrapper) ----------------------------------------
function curPage() {
    try { var p = state.currentPage; return (typeof p === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(p)) ? p : ''; } catch (e) { return ''; }
}
function closeSegment() {
    if (lastPage && segStart) {
        var sec = Math.round((Date.now() - segStart) / 1000);
        if (sec >= 1) bump('w', lastPage, Math.min(sec, MAX_STAY));
    }
    segStart = 0;
}
function onRender() {
    if (frozen || isOff()) return;
    var p = curPage();
    if (!p || p === lastPage) return;
    closeSegment();
    lastPage = p;
    segStart = (document.visibilityState === 'hidden') ? 0 : Date.now();
    bump('v', p, 1);
}
function onHidden() {
    if (leftCounted) return;
    leftCounted = true;
    hiddenAt = Date.now();
    closeSegment();
    if (lastPage) bump('x', lastPage, 1);
    flush();
}
function onVisible() {
    var wasLeft = leftCounted;
    leftCounted = false;
    if (!wasLeft) return;
    if (hiddenAt && Date.now() - hiddenAt > SESSION_GAP && !frozen && !isOff()) pDay(dayKey()).s++, touch();
    hiddenAt = 0;
    if (lastPage) segStart = Date.now();
}

// ---- freeze (called by Backup & Restore right before its reload) ------------
function freeze() {
    frozen = true;
    try { if (window.__dgLog) window.__dgLog.freeze(); } catch (e) { /* ignore */ }
}

// ---- error log helpers ------------------------------------------------------
function errList() { try { return window.__dgLog ? window.__dgLog.list() : []; } catch (e) { return []; } }
function errReport() {
    var list = errList(), L = window.__dgLog;
    var lines = ['Ahl al-Bayt app — error report',
        'Generated: ' + new Date().toISOString(),
        'App: ' + ((L && L.version()) || 'unknown') + ' · ' + (L ? L.env() : ''),
        'Problems: ' + list.length, ''];
    list.forEach(function (x, i) {
        lines.push('[' + (i + 1) + '] x' + (x.n || 1) + ' ' + x.t + ' | ' + new Date(x.a).toISOString() + ' -> ' + new Date(x.b).toISOString() +
            (x.p ? ' | page: ' + x.p : '') + (x.v ? ' | ' + x.v : '') + (x.e ? ' | ' + x.e : ''));
        lines.push('    ' + x.m);
        if (x.f) lines.push('    at ' + x.f);
        if (x.s) lines.push('    ' + String(x.s).split('\n').slice(0, 6).join('\n    '));
    });
    if (!list.length) lines.push('(no errors recorded)');
    return lines.join('\n');
}
function copyText(text) {
    function fallback() {
        try {
            var ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
            document.body.appendChild(ta); ta.select();
            var ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch (e) { return false; }
    }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
}
function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}
function toast(msg, type) { try { if (typeof showToast === 'function') showToast(msg, type || 'success'); } catch (e) { /* ignore */ } }
function rerender() { try { if (typeof render === 'function') render(); } catch (e) { /* ignore */ } }

// ---- actions ------------------------------------------------------------------
function act(a, p) {
    switch (a) {
        case 'days':
            if (p === '7' || p === '30' || p === '90') { ui.days = Number(p); rerender(); }
            break;
        case 'usageToggle':
            if (isOff()) { try { localStorage.removeItem(OFF_KEY); } catch (e) { /* ignore */ } toast(T('✅ ব্যবহার গণনা চালু', '✅ Usage counting is on')); }
            else {
                flush();
                try { localStorage.setItem(OFF_KEY, '1'); } catch (e) { /* ignore */ }
                toast(T('ব্যবহার গণনা বন্ধ করা হয়েছে', 'Usage counting switched off'), 'info');
            }
            rerender();
            break;
        case 'usageClear':
            if (!confirm(T('এই ডিভাইসের সব ব্যবহার-পরিসংখ্যান মুছে যাবে। এগিয়ে যাবেন?', 'All usage statistics on this device will be deleted. Continue?'))) return;
            pend = { d: {}, c: {} }; dirty = false;
            try { localStorage.removeItem(USAGE_KEY); } catch (e) { /* ignore */ }
            toast(T('ব্যবহার-পরিসংখ্যান মুছে ফেলা হয়েছে', 'Usage statistics deleted'), 'info');
            rerender();
            break;
        case 'errToggle':
            if (p && /^[A-Za-z0-9]{1,12}$/.test(p)) { ui.open[p] = !ui.open[p]; rerender(); }
            break;
        case 'errCopy':
            copyText(errReport()).then(function (ok) {
                toast(ok ? T('✅ রিপোর্ট কপি হয়েছে', '✅ Report copied') : T('কপি করা যায়নি', 'Could not copy'), ok ? 'success' : 'warning');
            });
            break;
        case 'errDownload': {
            var L = window.__dgLog, list = errList();
            if (!list.length) { toast(T('ডাউনলোড করার মতো কোনো এরর নেই', 'No errors to download'), 'info'); return; }
            var doc = { app: 'ahlbayt', kind: 'errorlog', exportedAt: new Date().toISOString(), version: (L && L.version()) || '', env: L ? L.env() : '', errors: list };
            download('ahlbayt-errorlog-' + dayKey() + '.json', JSON.stringify(doc, null, 1), 'application/json');
            toast(T('✅ ফাইল ডাউনলোড হয়েছে', '✅ File downloaded'));
            break;
        }
        case 'errClear':
            if (!confirm(T('এরর লগ মুছে ফেলবেন?', 'Clear the error log?'))) return;
            if (window.__dgLog) window.__dgLog.clear();
            ui.open = {};
            toast(T('এরর লগ মুছে ফেলা হয়েছে', 'Error log cleared'), 'info');
            rerender();
            break;
    }
}

// ---- page -------------------------------------------------------------------
function sumBucket(days, bucket) {
    var tot = {};
    days.forEach(function (d) { var b = d[bucket]; Object.keys(b).forEach(function (k) { tot[k] = (tot[k] || 0) + b[k]; }); });
    return tot;
}
function barRows(map, limit, labelFn, extraFn) {
    var keys = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; }).slice(0, limit);
    if (!keys.length) return '<p class="ab-p">' + T('এখনো কোনো তথ্য নেই', 'No data yet') + '</p>';
    var max = map[keys[0]] || 1;
    return keys.map(function (k) {
        var pct = Math.max(3, Math.round(map[k] / max * 100));
        return '<div class="dg-row"><div class="dg-row-h"><span>' + labelFn(k) + (extraFn ? ' <small>' + extraFn(k) + '</small>' : '') + '</span><b>' + N(map[k]) + '</b></div>' +
            '<div class="dg-bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
}
function contentLabel(k) {
    var m = /^(dua|post|ziyarat|amal):(.+)$/.exec(k), ic = { dua: '🤲', post: '📝', ziyarat: '☪️', amal: '🌙' };
    if (!m) return esc(k);
    return ic[m[1]] + ' ' + esc(m[1] === 'post' ? T('পোস্ট #', 'Post #') + m[2] : m[2]);
}
function usageSection() {
    var off = isOff();
    flush();                                                    // show the very latest numbers
    var u = loadUsage();
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (ui.days - 1));
    var ck = dayKey(cutoff);
    var days = Object.keys(u.d).filter(function (k) { return k >= ck; }).sort().map(function (k) { return u.d[k]; });
    var sessions = days.reduce(function (s, d) { return s + d.s; }, 0);
    var views = sumBucket(days, 'v'), leaves = sumBucket(days, 'x'), dwell = sumBucket(days, 'w'), ev = sumBucket(days, 'e');
    var totalViews = Object.keys(views).reduce(function (s, k) { return s + views[k]; }, 0);
    var totalLeaves = Object.keys(leaves).reduce(function (s, k) { return s + leaves[k]; }, 0);
    var totalDwell = Object.keys(dwell).reduce(function (s, k) { return s + dwell[k]; }, 0);
    var active = days.filter(function (d) { return d.s > 0 || Object.keys(d.v).length; }).length;
    var contentKeys = Object.keys(u.c);

    var chips = [7, 30, 90].map(function (n) {
        return '<button type="button" data-dg-act="days" data-dg-param="' + n + '" aria-pressed="' + (ui.days === n) + '" class="dg-chip' + (ui.days === n ? ' on' : '') + '">' + N(n) + T(' দিন', ' days') + '</button>';
    }).join('');

    var body = (!days.length)
        ? '<p class="ab-p">' + T('এই সময়ে এখনো কোনো ব্যবহার গণনা হয়নি। অ্যাপ ব্যবহার করলে এখানে হিসাব জমতে থাকবে।', 'Nothing has been counted for this period yet. Numbers build up as the app is used.') + '</p>'
        : '<div class="dg-stats">' +
            '<div class="dg-stat"><b>' + N(sessions) + '</b><small>' + T('সেশন', 'Sessions') + '</small></div>' +
            '<div class="dg-stat"><b>' + N(totalViews) + '</b><small>' + T('পেজ ভিউ', 'Page views') + '</small></div>' +
            '<div class="dg-stat"><b>' + N(active) + '</b><small>' + T('সক্রিয় দিন', 'Active days') + '</small></div>' +
          '</div>' +
          (sessions ? '<p class="ab-p">' + T('গড়ে প্রতি সেশনে ', 'Average per session: ') + '<b>' + fmtDur(totalDwell / sessions) + '</b> · ' + N(Math.round(totalViews / sessions * 10) / 10) + T(' পেজ', ' pages') + '</p>' : '') +
          '<h3 class="dg-sub">📄 ' + T('সবচেয়ে বেশি দেখা পেজ', 'Most viewed pages') + '</h3>' +
          barRows(views, 10, function (k) { return esc(pageLabel(k)); }, function (k) { return views[k] && dwell[k] ? '· ' + T('গড়ে ', 'avg ') + fmtDur(dwell[k] / views[k]) : ''; }) +
          '<h3 class="dg-sub">🚪 ' + T('যে পেজ থেকে অ্যাপ ছাড়া হয়েছে', 'Where the app was left from') + '</h3>' +
          '<p class="ab-p" style="margin-bottom:8px;font-size:.74rem;opacity:.75">' + T('অ্যাপ ব্যাকগ্রাউন্ডে গেলে বা ট্যাব বন্ধ হলে যে পেজ খোলা ছিল। ', 'The page that was open when the app went to the background or the tab closed. ') + (totalLeaves ? N(totalLeaves) + T(' বার', ' times') : '') + '</p>' +
          barRows(leaves, 8, function (k) { return esc(pageLabel(k)); }, function (k) { return totalLeaves ? '· ' + N(Math.round(leaves[k] / totalLeaves * 100)) + '%' : ''; }) +
          '<h3 class="dg-sub">🧩 ' + T('বেশি ব্যবহৃত বাটন/ফিচার', 'Most used buttons / features') + '</h3>' +
          barRows(ev, 12, function (k) { return esc(pretty(k)); });
    var content = contentKeys.length
        ? '<h3 class="dg-sub">📚 ' + T('সবচেয়ে বেশি খোলা কনটেন্ট (সব সময়)', 'Most opened content (all time)') + '</h3>' + barRows(u.c, 10, contentLabel)
        : '';

    return '<section class="ab-card" aria-labelledby="dg-h1">' +
        '<h2 id="dg-h1" class="ab-h">📊 ' + T('ব্যবহার-পরিসংখ্যান (শুধু এই ডিভাইসের)', 'Usage statistics (this device only)') + '</h2>' +
        '<p class="ab-p">' + T('কোন পেজ ও ফিচার কতটা ব্যবহার হয়, কোন পেজে অ্যাপ ছাড়া হয় — এই ডিভাইসের হিসাব। কোনো সার্ভারে পাঠানো হয় না। অন্য দর্শকদের তথ্য এখানে আসে না।', 'Which pages and features get used and where the app is left — counted on this device only, never sent to a server. Other visitors’ data does not appear here.') + '</p>' +
        '<div class="dg-chips" role="group" aria-label="' + T('সময়কাল', 'Period') + '">' + chips + '</div>' +
        body + content +
        '<div class="ab-row">' +
        '<button type="button" data-dg-act="usageToggle" class="ab-btn ab-btn-ghost">' + (off ? '▶️ ' + T('গণনা চালু করুন', 'Turn counting on') : '⏸️ ' + T('গণনা বন্ধ করুন', 'Turn counting off')) + '</button>' +
        '<button type="button" data-dg-act="usageClear" class="ab-btn ab-btn-ghost">🗑️ ' + T('পরিসংখ্যান মুছুন', 'Delete statistics') + '</button>' +
        '</div>' +
        (off ? '<p class="ab-warn">⏸️ ' + T('গণনা এখন বন্ধ — নতুন কিছু জমছে না।', 'Counting is off — nothing new is being recorded.') + '</p>' : '') +
        '</section>';
}
function errIcon(t) { return t === 'promise' ? '⚠️' : t === 'resource' ? '📦' : t === 'manual' ? '📝' : '🐞'; }
function errorSection() {
    var list = errList();
    var total = list.reduce(function (s, x) { return s + (Number(x.n) || 1); }, 0);
    var head = list.length
        ? '<p class="ab-p">' + N(list.length) + T(' টি আলাদা সমস্যা · মোট ', ' distinct problems · ') + N(total) + T(' বার ঘটেছে', ' occurrences in total') + '</p>'
        : '<p class="ab-p">✅ ' + T('কোনো সমস্যা রেকর্ড হয়নি।', 'No problems have been recorded.') + '</p>';
    var rows = list.map(function (x) {
        var open = !!ui.open[x.g];
        var meta = [x.f, x.p ? T('পেজ: ', 'page: ') + x.p : '', x.v, x.e].filter(Boolean).map(esc).join(' · ');
        return '<div class="dg-err">' +
            '<div class="dg-err-h"><span aria-hidden="true">' + errIcon(x.t) + '</span><b>' + esc(x.m) + '</b>' + (x.n > 1 ? '<span class="ab-cnt">×' + N(x.n) + '</span>' : '') + '</div>' +
            '<small class="dg-meta">' + meta + '</small>' +
            '<small class="dg-meta">' + T('প্রথম: ', 'first: ') + esc(fmtTime(x.a)) + (x.b !== x.a ? ' · ' + T('শেষ: ', 'last: ') + esc(fmtTime(x.b)) : '') + '</small>' +
            (x.s ? '<button type="button" data-dg-act="errToggle" data-dg-param="' + esc(x.g) + '" aria-expanded="' + open + '" class="dg-link">' + (open ? T('▲ বিস্তারিত লুকান', '▲ Hide details') : T('▼ বিস্তারিত', '▼ Details')) + '</button>' + (open ? '<pre class="dg-pre">' + esc(x.s) + '</pre>' : '') : '') +
            '</div>';
    }).join('');
    return '<section class="ab-card" aria-labelledby="dg-h2">' +
        '<h2 id="dg-h2" class="ab-h">🐞 ' + T('এরর লগ (শুধু এই ডিভাইসে)', 'Error log (this device only)') + '</h2>' +
        '<p class="ab-p">' + T('অ্যাপে কিছু ভাঙলে এখানে জমা থাকে — বার্তা, ফাইল-লাইন, পেজ, অ্যাপ ভার্সন ও ডিভাইসের ধরন। আপনার লেখা বা ব্যক্তিগত তথ্য থাকে না। সমস্যা জানাতে "রিপোর্ট কপি" করে পাঠান।', 'When something breaks it is kept here — message, file and line, page, app version and device type. None of your own text or personal data. To report a problem, copy the report and send it.') + '</p>' +
        head + rows +
        '<div class="ab-row">' +
        '<button type="button" data-dg-act="errCopy" class="ab-btn"' + (list.length ? '' : ' disabled="disabled"') + '>📋 ' + T('রিপোর্ট কপি', 'Copy report') + '</button>' +
        '<button type="button" data-dg-act="errDownload" class="ab-btn ab-btn-ghost"' + (list.length ? '' : ' disabled="disabled"') + '>📥 ' + T('ফাইল ডাউনলোড', 'Download file') + '</button>' +
        '<button type="button" data-dg-act="errClear" class="ab-btn ab-btn-ghost"' + (list.length ? '' : ' disabled="disabled"') + '>🗑️ ' + T('লগ মুছুন', 'Clear log') + '</button>' +
        '</div></section>';
}
function renderDiagnosticsPage() {
    var d = state.darkMode;
    return '<div class="ab dg space-y-6 page-enter ' + (d ? 'ab-dark' : '') + '">' +
        '<div><h1 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🩺 ' + T('ডায়াগনস্টিক ও ব্যবহার-পরিসংখ্যান', 'Diagnostics & usage statistics') + '</h1>' +
        '<p class="text-sm ' + (d ? 'text-gray-400' : 'text-gray-500') + ' mt-1">' + T('এই পেজের সবকিছু শুধু আপনার ডিভাইসে থাকে — কোনো অ্যাকাউন্ট, কুকি বা বাইরের সার্ভিস নেই।', 'Everything on this page stays on your device — no account, cookie or outside service.') + '</p></div>' +
        errorSection() + usageSection() +
        '<section class="ab-note"><b>🔒 ' + T('কী গোনা হয়, কী হয় না', 'What is and is not recorded') + '</b><ul>' +
        '<li>' + T('গোনা হয়: পেজের নাম, বাটনের নাম, খোলা দোয়া/যিয়ারত/আমল/পোস্টের আইডি, পেজে কাটানো সময়, এরর বার্তা।', 'Recorded: page names, button names, ids of opened duas/ziyarat/amal/posts, time spent per page, error messages.') + '</li>' +
        '<li>' + T('গোনা হয় না: আপনার লেখা কিছু (সার্চের শব্দ, নোট, জার্নাল), লোকেশন, নাম, আইডি বা IP।', 'Not recorded: anything you type (search words, notes, journal), location, name, identifiers or IP.') + '</li>' +
        '<li>' + T('পরিসংখ্যান ৯০ দিন, এরর লগ ৫০টি সমস্যা পর্যন্ত রাখে। "ডেটা ব্যাকআপ"-এর "ডায়াগনস্টিক" অংশ দিয়ে ফাইলে নেওয়া যায় (ডিফল্টে বন্ধ)।', 'Statistics keep 90 days, the error log up to 50 problems. They can be saved to a file from Backup & Restore (“Diagnostics”, off by default).') + '</li>' +
        '</ul></section>' +
        '<button type="button" data-action="changePage" data-param="backup" class="ab-btn ab-btn-ghost">💾 ' + T('ডেটা ব্যাকআপ পেজে যান', 'Go to Backup & Restore') + '</button>' +
        '</div>';
}
// small block for the Backup page (link only)
function backupLinkHtml() {
    var n = errList().length;
    return '<section class="ab-note"><b>🩺 ' + T('ডায়াগনস্টিক', 'Diagnostics') + '</b>' +
        '<p style="margin-top:6px">' + T('অ্যাপে কোনো সমস্যা হলে তার লগ ও এই ডিভাইসের ব্যবহার-পরিসংখ্যান দেখুন বা ফাইলে নিন।', 'See the error log and this device’s usage statistics, or save them to a file.') + (n ? ' <b>' + N(n) + T(' টি সমস্যা রেকর্ড আছে।', ' problem(s) on record.') + '</b>' : '') + '</p>' +
        '<button type="button" data-action="changePage" data-param="diagnostics" class="ab-btn ab-btn-ghost" style="margin-top:10px">🩺 ' + T('ডায়াগনস্টিক খুলুন', 'Open diagnostics') + '</button></section>';
}

// ---- install ----------------------------------------------------------------
document.addEventListener('click', function (e) {                // diagnostics page buttons
    var el = e.target && e.target.closest ? e.target.closest('[data-dg-act]') : null;
    if (!el || el.disabled) return;
    try { act(el.getAttribute('data-dg-act'), el.getAttribute('data-dg-param')); } catch (err) { try { if (window.__dgLog) window.__dgLog.report(err, 'diagnostics'); } catch (e2) { /* ignore */ } }
});
document.addEventListener('click', function (e) {                // feature usage (capture phase; never alters the event)
    try {
        if (frozen || isOff()) return;
        var el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
        if (!el) return;
        var a = el.getAttribute('data-action');
        if (!a || !/^[A-Za-z0-9_]{1,40}$/.test(a) || badKey(a) || SKIP_ACTIONS[a]) return;
        bump('e', a, 1);
        var type = CONTENT_ACTIONS[a];
        if (type) {
            var id = el.getAttribute('data-param');
            if (id && ID_RE.test(id) && !badKey(id)) bumpContent(type + ':' + id);
        }
    } catch (err) { /* ignore */ }
}, true);
document.addEventListener('visibilitychange', function () {
    try { if (document.visibilityState === 'hidden') onHidden(); else onVisible(); } catch (e) { /* ignore */ }
});
window.addEventListener('pagehide', function () { try { onHidden(); } catch (e) { /* ignore */ } });

if (typeof window.render === 'function' && !window.render.__dg) {
    var _render = window.render;
    var wrapped = function () {
        var r = _render.apply(this, arguments);
        try { onRender(); } catch (e) { /* a failure here must never break rendering */ }
        return r;
    };
    wrapped.__dg = true;
    window.render = wrapped;
}
try {
    if (!isOff() && document.visibilityState !== 'hidden') { pDay(dayKey()).s++; touch(); }     // this page load = one session
    var app = document.getElementById('app');
    if (app && app.firstElementChild) onRender();                  // the app already painted before this file loaded
} catch (e) { /* ignore */ }

// ---- exports (page + Backup & Restore) --------------------------------------
window.renderDiagnosticsPage = renderDiagnosticsPage;
window.dgBackupLinkHtml = backupLinkHtml;
window.dgNormalizeUsage = normalizeUsage;
window.dgMergeUsage = mergeUsage;
window.dgNormalizeLog = function (a) { return window.__dgLog ? window.__dgLog.normalize(a) : a; };
window.dgMergeLog = function (l, i) { return window.__dgLog ? window.__dgLog.merge(l, i) : i; };
window.dgFreeze = freeze;
window.dgFlush = flush;

})();
