// ============================================================================
// ERROR LOG  (v228)
// ----------------------------------------------------------------------------
// THE PROBLEM
//   The app had no window.onerror / unhandledrejection handler. When something
//   broke on a visitor's phone nobody found out, and a blank page left no trace.
//
// WHAT THIS DOES (device only — nothing is ever sent anywhere)
//   • Catches uncaught JS errors, unhandled promise rejections and failed
//     <script>/<link>/<img> loads, and keeps them in localStorage key
//     'ahlbayt_errlog' (a ring buffer: max 50 distinct problems).
//   • The same problem twice is ONE entry with a counter + first/last time.
//   • Each entry: type, message, file:line, short stack, page key, app version
//     (read from the service-worker cache name), coarse environment
//     ("android · chrome 129 · PWA"), count, first/last time.
//   • Privacy: URLs lose their query/hash and own origin, long token-like
//     strings are redacted, "<" ">" are removed, text is length-capped.
//     No user input, no storage content, no IP, no identifiers are collected.
//   • Browser-extension errors and the harmless "ResizeObserver loop" notice
//     are ignored. At most 40 events are processed per page load (a loop that
//     throws 10 000 times cannot fill the storage or slow the app).
//   • Third-party resource failures (e.g. map tiles while offline) collapse
//     into ONE entry per host; only 15 distinct resource entries are kept, so
//     they can never push real errors out of the log.
//
// WHERE IT SHOWS
//   Page '?page=diagnostics' (diagnostics.js) — view, copy a report, download,
//   clear. The log is also a Backup & Restore group ('diag', off by default).
//
// LOADS FIRST (in <head>) so errors thrown while the other scripts are still
// loading are caught too. Self-contained: no dependency on `state` or any other
// file; everything is try/catch-guarded, so a failure here can never break the
// app. Public API: window.__dgLog.
// ============================================================================
(function () {
'use strict';

if (typeof window === 'undefined' || window.__dgLog) return;

var KEY = 'ahlbayt_errlog';
var MAX_ENTRIES = 50, MAX_RESOURCE = 15, MAX_MSG = 200, MAX_STACK = 600, MAX_LOC = 120, SESSION_CAP = 40;
var TYPES = { error: 1, promise: 1, resource: 1, manual: 1 };

var seen = 0, busy = false, frozen = false, ver = '', envCache = null;

// ---- text hygiene ----------------------------------------------------------
function scrub(s, n) {
    if (s === null || s === undefined) return '';
    s = String(s);
    try {
        var o = location.origin;
        if (o && o !== 'null') s = s.split(o).join('');
    } catch (e) { /* ignore */ }
    s = s.replace(/(https?:\/\/[^\s)'"<>]+?)[?#][^\s)'"<>]*/g, '$1');                       // absolute URLs: drop ?query / #hash
    s = s.replace(/(\.(?:js|css|json|html|png|jpe?g|webp|svg|woff2?|ico))[?#][^\s)'"<>:]*/g, '$1');   // relative ones
    s = s.replace(/[A-Za-z0-9_]{32,}/g, '…');                                                // token-like strings
    s = s.replace(/[<>]/g, '');
    return s.length > n ? s.slice(0, n) + '…' : s;
}
function fileName(u) {
    try { return scrub(String(u).split('?')[0].split('#')[0].split('/').pop(), 60); } catch (e) { return ''; }
}
function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}
function firstFrame(stack) {
    if (!stack) return '';
    var m = String(stack).match(/([^\s()@\/\\]+\.js):(\d+):(\d+)/);
    return m ? m[1] + ':' + m[2] + ':' + m[3] : '';
}
function env() {
    if (envCache) return envCache;
    try {
        var ua = navigator.userAgent || '', os = 'other', br = 'other', m;
        if (/Android/i.test(ua)) os = 'android';
        else if (/iPhone|iPad|iPod/i.test(ua)) os = 'ios';
        else if (/Windows/.test(ua)) os = 'windows';
        else if (/Mac OS X/.test(ua)) os = 'mac';
        else if (/Linux/.test(ua)) os = 'linux';
        if ((m = ua.match(/EdgA?\/(\d+)/))) br = 'edge ' + m[1];
        else if ((m = ua.match(/(?:Chrome|CriOS)\/(\d+)/))) br = 'chrome ' + m[1];
        else if ((m = ua.match(/(?:Firefox|FxiOS)\/(\d+)/))) br = 'firefox ' + m[1];
        else if ((m = ua.match(/Version\/(\d+)[^]*Safari/))) br = 'safari ' + m[1];
        var pwa = false;
        try { pwa = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (e) { /* ignore */ }
        envCache = os + ' · ' + br + (pwa ? ' · PWA' : '');
    } catch (e) { envCache = 'unknown'; }
    return envCache;
}

// ---- storage ---------------------------------------------------------------
function read() {
    try {
        var v = JSON.parse(localStorage.getItem(KEY));
        return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
}
function write(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; }
    catch (e) {
        try { localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 20))); return true; } catch (e2) { return false; }
    }
}
function currentPage() {
    try {
        var p = (typeof state !== 'undefined') ? state.currentPage : '';     // `state` is a global lexical binding, not a window property
        return (typeof p === 'string' && /^[A-Za-z0-9_-]{1,30}$/.test(p)) ? p : '';
    } catch (e) { return ''; }
}

// ---- record ----------------------------------------------------------------
function record(o) {
    if (frozen || busy) return;
    busy = true;                       // guards against an error raised while recording
    try {
        if (++seen > SESSION_CAP) return;
        var type = TYPES[o.t] ? o.t : 'error';
        var msg = scrub(o.m, MAX_MSG) || 'error';
        var loc = scrub(o.f || firstFrame(o.s), MAX_LOC);
        var stack = scrub(o.s, MAX_STACK);
        var sig = hash(type + '|' + msg + '|' + loc);
        var now = Date.now(), page = currentPage();
        var arr = read(), hit = null, i;
        for (i = 0; i < arr.length; i++) { if (arr[i] && arr[i].g === sig) { hit = arr[i]; break; } }
        if (hit) {
            hit.n = (Number(hit.n) || 1) + 1;
            hit.b = now;
            if (page) hit.p = page;
            if (!hit.s && stack) hit.s = stack;
        } else {
            arr.push({ g: sig, t: type, m: msg, f: loc, s: stack, p: page, n: 1, a: now, b: now, e: env(), v: ver });
            if (type === 'resource') {                       // resource noise may never crowd out real errors
                var res = arr.filter(function (x) { return x && x.t === 'resource'; });
                if (res.length > MAX_RESOURCE) {
                    res.sort(function (x, y) { return (x.b || 0) - (y.b || 0); });
                    var drop = res[0];
                    arr = arr.filter(function (x) { return x !== drop; });
                }
            }
        }
        if (arr.length > MAX_ENTRIES) {
            arr.sort(function (x, y) { return (y.b || 0) - (x.b || 0); });
            arr.length = MAX_ENTRIES;
        }
        write(arr);
    } catch (e) { /* the logger must never throw */ }
    finally { busy = false; }
}

// ---- listeners (capture phase, so failed resource loads are seen too) -------
window.addEventListener('error', function (ev) {
    try {
        var tg = ev && ev.target;
        if (tg && tg !== window && tg.tagName) {                    // a resource failed to load
            var tag = String(tg.tagName).toLowerCase();
            if (tag !== 'script' && tag !== 'link' && tag !== 'img' && tag !== 'audio' && tag !== 'video' && tag !== 'source') return;
            var u;
            try { u = new URL(tg.src || tg.href || tg.currentSrc || '', location.href); } catch (e) { return; }
            if (u.origin !== location.origin) record({ t: 'resource', m: 'external ' + tag + ' failed to load: ' + u.host });
            else record({ t: 'resource', m: tag + ' failed to load: ' + u.pathname });
            return;
        }
        var msg = (ev && ev.message) || '', file = (ev && ev.filename) || '';
        if (/^(chrome|moz|safari|safari-web|ms-browser)-extension:/.test(file)) return;
        if (/ResizeObserver loop/i.test(msg)) return;
        var err = ev && ev.error;
        var stack = err && err.stack ? err.stack : '';
        if (!msg && err && err.message) msg = (err.name ? err.name + ': ' : '') + err.message;
        var f = file ? fileName(file) + ':' + (ev.lineno || 0) + ':' + (ev.colno || 0) : '';
        record({ t: 'error', m: msg || 'error', s: stack, f: f });
    } catch (e) { /* ignore */ }
}, true);

window.addEventListener('unhandledrejection', function (ev) {
    try {
        var r = ev && ev.reason, m = '', st = '';
        if (r && typeof r === 'object') {
            m = (r.name ? r.name + ': ' : '') + (r.message || '');
            st = r.stack || '';
            if (!r.message) { try { m = JSON.stringify(r); } catch (e) { m = String(r); } }
        } else m = String(r);
        record({ t: 'promise', m: m || 'unhandled promise rejection', s: st });
    } catch (e) { /* ignore */ }
});

// app version = the service worker's cache name ('ahlbayt-v228' -> 'v228')
try {
    if (window.caches && typeof caches.keys === 'function') {
        caches.keys().then(function (ks) {
            var best = 0;
            ks.forEach(function (k) { var m = /^ahlbayt-v(\d+)$/.exec(k); if (m && Number(m[1]) > best) best = Number(m[1]); });
            if (best) ver = 'v' + best;
        }).catch(function () { /* ignore */ });
    }
} catch (e) { /* ignore */ }

// ---- import helpers (used by Backup & Restore) ------------------------------
function num(v, lo, hi, dflt) { v = Number(v); return (isFinite(v) && v >= lo && v <= hi) ? Math.floor(v) : dflt; }
function normalize(list) {
    var out = [];
    (Array.isArray(list) ? list : []).slice(0, 200).forEach(function (x) {
        if (!x || typeof x !== 'object' || Array.isArray(x)) return;
        var type = TYPES[x.t] ? x.t : 'error';
        var msg = scrub(x.m, MAX_MSG), loc = scrub(x.f, MAX_LOC);
        if (!msg) return;
        var now = Date.now();
        var a = num(x.a, 1e12, now + 864e5, now), b = num(x.b, 1e12, now + 864e5, a);
        if (b < a) b = a;
        var p = (typeof x.p === 'string' && /^[A-Za-z0-9_-]{1,30}$/.test(x.p)) ? x.p : '';
        out.push({
            g: hash(type + '|' + msg + '|' + loc), t: type, m: msg, f: loc, s: scrub(x.s, MAX_STACK), p: p,
            n: num(x.n, 1, 1e6, 1), a: a, b: b, e: scrub(x.e, 40), v: /^v\d{1,5}$/.test(x.v || '') ? x.v : ''
        });
    });
    return cap(out);
}
function cap(arr) {
    arr.sort(function (x, y) { return (y.b || 0) - (x.b || 0); });
    return arr.slice(0, MAX_ENTRIES);
}
// merge two logs; max() of the counters, so restoring the same file twice changes nothing
function merge(local, incoming) {
    var map = {};
    (Array.isArray(local) ? local : []).forEach(function (x) { if (x && x.g) map[x.g] = x; });
    (Array.isArray(incoming) ? incoming : []).forEach(function (x) {
        if (!x || !x.g) return;
        var y = map[x.g];
        if (!y) { map[x.g] = x; return; }
        y.n = Math.max(Number(y.n) || 1, Number(x.n) || 1);
        y.a = Math.min(Number(y.a) || Infinity, Number(x.a) || Infinity);
        y.b = Math.max(Number(y.b) || 0, Number(x.b) || 0);
        if (!y.s && x.s) y.s = x.s;
    });
    return cap(Object.keys(map).map(function (k) { return map[k]; }));
}

window.__dgLog = {
    KEY: KEY,
    MAX_ENTRIES: MAX_ENTRIES,
    list: function () { var a = read().slice(); a.sort(function (x, y) { return (y.b || 0) - (x.b || 0); }); return a; },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
    // manual hook for code that catches an error but still wants it on record:
    //   try { … } catch (e) { __dgLog.report(e, 'dua-load'); }
    report: function (err, ctx) {
        try {
            var m = err && err.message ? (err.name ? err.name + ': ' : '') + err.message : String(err);
            record({ t: 'manual', m: (ctx ? '[' + String(ctx).slice(0, 30) + '] ' : '') + m, s: err && err.stack ? err.stack : '' });
        } catch (e) { /* ignore */ }
    },
    env: env,
    version: function () { return ver; },
    // called by Backup & Restore right before it reloads the page, so this
    // page's in-memory state can never overwrite restored values
    freeze: function () { frozen = true; },
    normalize: normalize,
    merge: merge
};

})();
