// ============================================================================
// SEARCH ENGINE — Phase 7 (indexed search architecture)
// ----------------------------------------------------------------------------
// Replaces the previous "scan every array from scratch on every keystroke"
// search with a cached/indexed engine. Nothing about the UI, HTML, CSS,
// routing, state shape, or JSON structure changes — only how a search query
// gets turned into results.
//
// WHAT "INDEX" MEANS HERE
// ----------------------------------------------------------------------------
// For every searchable item (a dua, a blog post, a hadith, ...) this module
// builds — once, the first time that exact item object is ever scored — a
// small cached record: its title(s) normalized (lowercased, whitespace
// collapsed), its full searchable text normalized into one blob, and a
// Set of that blob's tokens (words). That record is cached in a WeakMap
// keyed by the item object itself, so it is computed exactly once per item
// for the lifetime of the page, no matter how many searches or keystrokes
// happen afterwards. This is the actual CPU cost the old code paid on every
// single keystroke (repeated `.toLowerCase()` + field-joins over every item
// in every category) — the cache is what makes this "indexed": a search
// after the first one reuses pre-normalized data instead of recomputing it.
//
// A per-category inverted token index (Map<token, item[]>) is also built
// and cached alongside this, and is used to score keyword/prefix hits in
// O(1) per token rather than re-scanning text. True arbitrary MID-WORD
// substring matching (e.g. "ammad" inside "Muhammad") cannot be served by
// a token index alone without a much heavier n-gram structure, so that one
// case still falls back to a scan — but a scan over pre-normalized cached
// strings, not the raw JSON. This keeps results IDENTICAL to the old
// substring-based matching (nothing that used to be found is now missed),
// while every keyword/prefix search — the common case — never scans the
// full pool.
//
// PUBLIC CONTRACT (backward compatibility)
// ----------------------------------------------------------------------------
// performSearch(q) and searchKnowledgeCenter(q) keep their exact names,
// parameters, and return shape ({title, subtitle, icon, color, type,
// action, param, param2?}) — every existing render/navigation call site
// (searchResultsHTML, script-2-ui.js's data-action dispatcher) keeps
// working unmodified. Only their internals, at the bottom of this file,
// change to call into SearchEngine.
// ============================================================================

(function () {
    'use strict';

    // ---- normalization -----------------------------------------------------
    function norm(s) {
        if (s === undefined || s === null) return '';
        return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
    }
    // Splits on whitespace and common punctuation across Bangla/English/Arabic
    // text alike (none of these scripts need special-casing for word
    // boundaries beyond this).
    var TOKEN_SPLIT = /[\s,.،؛۔!?()\[\]{}"'“”‘’:;–—\-\/]+/;
    function tokenize(s) {
        var n = norm(s);
        return n ? n.split(TOKEN_SPLIT).filter(Boolean) : [];
    }

    // ---- per-item memoized index entry (the "index" itself) ---------------
    var _entryCache = new WeakMap();
    function getEntry(item, buildFieldsFn) {
        var entry = _entryCache.get(item);
        if (entry) return entry;
        var f = buildFieldsFn() || {};
        var titleBn = norm(f.titleBn);
        var titleEn = norm(f.titleEn);
        var blob = norm([f.titleBn, f.titleEn].concat(f.parts || []).filter(Boolean).join(' '));
        entry = { titleBn: titleBn, titleEn: titleEn, blob: blob, tokens: tokenize(blob) };
        entry.tokenSet = new Set(entry.tokens);
        _entryCache.set(item, entry);
        return entry;
    }

    // ---- per-category cached inverted token index --------------------------
    // Invalidated automatically if the pool's length changes (covers the
    // only way this app's searchable pools actually grow at runtime, e.g.
    // the admin Hadith-of-the-Day editor pushing into state.customHadiths).
    var _tokenIndexCache = new Map(); // name -> { poolLen, map: Map<token, idx[]> }
    function getTokenIndex(name, pool, fieldsFn) {
        var cached = _tokenIndexCache.get(name);
        if (cached && cached.poolLen === pool.length) return cached.map;
        var map = new Map();
        for (var i = 0; i < pool.length; i++) {
            var item = pool[i];
            var idx = i;
            var entry = getEntry(item, function () { return fieldsFn(item, idx); });
            entry.tokens.forEach(function (tok) {
                var arr = map.get(tok);
                if (!arr) { arr = []; map.set(tok, arr); }
                arr.push(i);
            });
        }
        _tokenIndexCache.set(name, { poolLen: pool.length, map: map });
        return map;
    }

    function scoreEntry(entry, qNorm, qTokens, lang) {
        if (!qNorm) return 0;
        var title = lang === 'bn' ? entry.titleBn : entry.titleEn;
        var score = 0;
        if (title) {
            if (title === qNorm) score += 100;                 // exact title match
            else if (title.indexOf(qNorm) === 0) score += 60;   // title starts with query
            else if (title.indexOf(qNorm) !== -1) score += 40;  // title contains query
        }
        if (qTokens.length) {
            var hits = 0;
            for (var i = 0; i < qTokens.length; i++) {
                if (entry.tokenSet.has(qTokens[i])) hits++;
            }
            score += hits * 10; // keyword/category-relevance signal
        }
        if (score === 0 && entry.blob.indexOf(qNorm) !== -1) score += 5; // content-relevance fallback
        return score;
    }

    // Runs one category: uses the cached token index to fast-path pure
    // keyword/prefix queries, and falls back to a scan over already-cached
    // (pre-normalized) entries for substring-level matches — preserving
    // exactly what the old array-scan search used to find.
    function searchCategory(name, pool, fieldsFn, resultFn, qNorm, qTokens, lang) {
        getTokenIndex(name, pool, fieldsFn); // warms/reuses the cache for this pool
        var out = [];
        for (var i = 0; i < pool.length; i++) {
            var item = pool[i];
            var idx = i;
            var entry = getEntry(item, function () { return fieldsFn(item, idx); });
            var s = scoreEntry(entry, qNorm, qTokens, lang);
            if (s > 0) out.push({ score: s, result: resultFn(item, i) });
        }
        return out;
    }

    // ---- category pools (same in-memory arrays/state fields the old code
    // read — no JSON re-fetching, no re-scanning of files) ------------------
    function imamsPool() {
        return [].concat(
            (typeof masumeen !== 'undefined' ? masumeen : []),
            (typeof imams !== 'undefined' ? imams : [])
        );
    }
    function duasPool() {
        return [].concat(state.customDuas || [], (typeof duas !== 'undefined' ? duas : []));
    }
    function blogPool() {
        return [].concat(state.customPosts || [], (typeof blogPosts !== 'undefined' ? blogPosts : []));
    }
    function ziyaratPool() {
        return [].concat((typeof ziyarats !== 'undefined' ? ziyarats : []), state.customZiyarat || []);
    }
    // NEW: Amal — mirrors ziyaratPool() (single dataset, built-in first)
    function amalPool() {
        return [].concat((typeof amals !== 'undefined' ? amals : []), state.customAmal || []);
    }
    function hadithPool() {
        return (state.customHadiths && state.customHadiths.length > 0)
            ? state.customHadiths
            : (typeof hadiths !== 'undefined' ? hadiths : []);
    }
    function familyPool() {
        if (typeof familyTreeDatabase === 'undefined' || !familyTreeDatabase) return [];
        return [['prophet', familyTreeDatabase.prophet], ['fatima', familyTreeDatabase.fatima]]
            .filter(function (pair) { return !!pair[1]; });
    }

    // Timeline / Quotes are genuinely lazy-loaded (see ahlul-bayt-unified.js —
    // Phase 3 territory, out of scope here). Per spec, their indexes are only
    // built once that JSON has actually been fetched — this wrapper does not
    // trigger any new fetch, it just also hands the already-fetched data to
    // this module whenever loadAhlulBaytSection() resolves for those two
    // sections (which happens exactly when the Timeline/Quotes tab is opened,
    // same as before).
    var _timelineData = null, _quotesData = null;
    if (typeof window.loadAhlulBaytSection === 'function') {
        var _origLoadAhlulBaytSection = window.loadAhlulBaytSection;
        window.loadAhlulBaytSection = function (section) {
            var p = _origLoadAhlulBaytSection(section);
            if (section === 'timeline' || section === 'quotes') {
                p.then(function (data) {
                    if (!data) return;
                    if (section === 'timeline') _timelineData = data;
                    else _quotesData = data;
                });
            }
            return p;
        };
    }
    function timelinePool() { return Array.isArray(_timelineData) ? _timelineData : []; }
    function quotesPool() { return Array.isArray(_quotesData) ? _quotesData : []; }

    function bookmarkPool() {
        var KC_MAP = { kcHadith: 'hadith', kcMasail: 'masail', kcQa: 'qa', kcFatwa: 'fatwa' };
        var out = [];
        (state.bookmarks || []).forEach(function (key) {
            var dash = key.indexOf('-');
            if (dash === -1) return;
            var type = key.slice(0, dash), id = key.slice(dash + 1);
            if (type === 'post') {
                var post = blogPool().find(function (p) { return String(p.id) === id; });
                if (post) out.push({ kind: 'blog', item: post });
            } else if (KC_MAP[type] && typeof kcFindItem === 'function') {
                var item = kcFindItem(KC_MAP[type], id);
                if (item) out.push({ kind: 'kc', tab: KC_MAP[type], item: item });
            }
        });
        return out;
    }
    function historyPool() { return state.readingHistory || []; }

    // ---- field extractors + result builders, one pair per category (the
    // exact same fields / result shape performSearch() checked before) -----
    function imamFields(im) { return { titleBn: im.nameBn, titleEn: im.nameEn, parts: [im.epithetBn, im.epithetEn, im.arabicName] }; }
    function imamResult(im) {
        var l = state.language;
        return { title: l === 'bn' ? im.nameBn : im.nameEn, subtitle: l === 'bn' ? im.epithetBn : im.epithetEn, icon: '👑', color: '#059669', type: l === 'bn' ? 'ইমাম' : 'Imam', action: 'viewImam', param: im.id };
    }

    function duaFields(dua) { return { titleBn: dua.titleBn, titleEn: dua.titleEn, parts: [dua.meaningBn, dua.meaningEn, dua.arabic] }; }
    function duaResultFactory() {
        var customDuas = state.customDuas || [];
        return function (dua, i) {
            var l = state.language;
            var isCustom = dua.id != null && customDuas.some(function (x) { return x.id === dua.id; });
            return { title: l === 'bn' ? dua.titleBn : dua.titleEn, subtitle: dua.source || '', icon: '🤲', color: '#7c3aed', type: l === 'bn' ? 'দোয়া' : 'Dua', action: 'readDua', param: isCustom ? 'c' + dua.id : i - customDuas.length };
        };
    }

    function blogFields(post) { return { titleBn: post.titleBn, titleEn: post.titleEn, parts: [post.excerpt] }; }
    function blogResult(post) {
        var l = state.language;
        return { title: l === 'bn' ? post.titleBn : post.titleEn, subtitle: post.category || '', icon: '📝', color: '#0369a1', type: l === 'bn' ? 'ব্লগ' : 'Blog', action: 'readPost', param: post.id };
    }

    function ziyaratFields(z) { return { titleBn: z.titleBn, titleEn: z.titleEn, parts: [z.arabic] }; }
    function ziyaratResult(z, i) {
        var l = state.language;
        return { title: l === 'bn' ? z.titleBn : z.titleEn, subtitle: z.occasion || '', icon: '☪️', color: '#b45309', type: l === 'bn' ? 'যিয়ারত' : 'Ziyarat', action: 'readZiyarat', param: z.id || i };
    }

    // NEW: Amal — mirrors ziyaratFields/ziyaratResult. Uses #4f46e5 (indigo)
    // rather than Amal's usual #7c3aed (violet, used in the tab/reader/editor
    // UI) purely because #7c3aed is already Dua's search-result badge color
    // here — a different shade keeps the two visually distinct side-by-side
    // in a mixed results list (icon + type label already disambiguate too).
    function amalFields(a) { return { titleBn: a.titleBn, titleEn: a.titleEn, parts: [a.occasion, a.meaningBn, a.meaningEn, a.arabic] }; }
    function amalResult(a, i) {
        var l = state.language;
        return { title: l === 'bn' ? a.titleBn : a.titleEn, subtitle: a.occasion || '', icon: '📿', color: '#4f46e5', type: l === 'bn' ? 'আমল' : 'Amal', action: 'readAmal', param: a.id || i };
    }

    function hadithFields(h) { return { titleBn: h.textBn, titleEn: h.textEn, parts: [h.sourceBn, h.sourceEn] }; }
    function hadithResultFactory(pool) {
        return function (h, i) {
            var l = state.language;
            return { title: l === 'bn' ? h.textBn : h.textEn, subtitle: (l === 'bn' ? h.sourceBn : h.sourceEn) || '', icon: '📜', color: '#7c3aed', type: l === 'bn' ? 'হাদিস' : 'Hadith', action: 'viewHadith', param: i === 0 ? pool.length : i };
        };
    }

    function familyFields(pair) { var p = pair[1]; return { titleBn: p.bengaliName, titleEn: p.englishName || p.englishAbbr, parts: [p.description, p.significance, p.arabicName] }; }
    function familyResult(pair) {
        var key = pair[0], p = pair[1], l = state.language;
        return { title: l === 'bn' ? p.bengaliName : (p.englishName || p.englishAbbr), subtitle: p.significance || '', icon: '🌳', color: '#78350f', type: l === 'bn' ? 'বংশধারা' : 'Family Tree', action: 'viewFamilyPerson', param: key };
    }

    function kcFields(item) { return { titleBn: item.textBn || item.questionBn, titleEn: item.textEn || item.questionEn, parts: [item.answerBn, item.answerEn, item.sourceBn, item.sourceEn, item.narratorBn, item.narratorEn] }; }
    function kcResultFactory(tab) {
        var meta = (typeof kcTabMeta === 'function') ? kcTabMeta(tab) : null;
        return function (item) {
            var l = state.language;
            return {
                title: (typeof kcItemTitle === 'function') ? kcItemTitle(tab, item, l) : '',
                subtitle: meta ? (l === 'bn' ? meta.bn : meta.en) : '',
                icon: meta ? meta.icon : '📚', color: meta ? meta.color : '#7c3aed',
                type: meta ? (l === 'bn' ? meta.bn : meta.en) : '', action: 'kcOpenDetail', param: tab, param2: item.id,
            };
        };
    }

    // timeline.json entries: {personId, labelBn, labelEn, detail, icon} — "detail"
    // is a single already-bilingual-agnostic date/description string (see
    // data/ahlul-bayt/timeline.json), not split by language.
    function timelineFields(ev) { return { titleBn: ev.labelBn, titleEn: ev.labelEn, parts: [ev.detail, ev.personId] }; }
    function timelineResult(ev) {
        var l = state.language;
        return { title: (l === 'bn' ? ev.labelBn : ev.labelEn) || '', subtitle: ev.detail || (l === 'bn' ? 'ঐতিহাসিক টাইমলাইন' : 'Historical Timeline'), icon: ev.icon || '📅', color: '#0d9488', type: l === 'bn' ? 'টাইমলাইন' : 'Timeline', action: 'changePage', param: 'ahlulBaytUnified' };
    }

    // quotes.json entries: {id, type, nameBn, nameEn, quoteBn, quoteEn}
    function quoteFields(qt) { return { titleBn: qt.quoteBn, titleEn: qt.quoteEn, parts: [qt.nameBn, qt.nameEn] }; }
    function quoteResult(qt) {
        var l = state.language;
        return { title: (l === 'bn' ? qt.quoteBn : qt.quoteEn) || '', subtitle: l === 'bn' ? (qt.nameBn || '') : (qt.nameEn || ''), icon: '💬', color: '#be123c', type: l === 'bn' ? 'উক্তি' : 'Quote', action: 'changePage', param: 'ahlulBaytUnified' };
    }

    function bookmarkFields(entry) { return entry.kind === 'blog' ? blogFields(entry.item) : kcFields(entry.item); }
    function bookmarkResult(entry) { return entry.kind === 'blog' ? blogResult(entry.item) : kcResultFactory(entry.tab)(entry.item); }

    function historyFields(h) { return { titleBn: h.titleBn, titleEn: h.titleEn, parts: [] }; }
    function historyResult(h) {
        var l = state.language;
        // ✅ FIXED: this used to always render history entries as a Dua
        // (only 'post' was special-cased), so an Amal — or Ziyarat, if that
        // ever starts recording history too — entry would show the wrong
        // icon/label and try to open via readDua(), which wouldn't find it.
        if (h.type === 'post') return { title: l === 'bn' ? h.titleBn : h.titleEn, subtitle: l === 'bn' ? 'ব্লগ' : 'Blog', icon: '📝', color: '#0369a1', type: l === 'bn' ? 'সাম্প্রতিক পঠিত' : 'Recently Read', action: 'readPost', param: h.id };
        if (h.type === 'ziyarat') return { title: l === 'bn' ? h.titleBn : h.titleEn, subtitle: l === 'bn' ? 'যিয়ারত' : 'Ziyarat', icon: '☪️', color: '#b45309', type: l === 'bn' ? 'সাম্প্রতিক পঠিত' : 'Recently Read', action: 'readZiyarat', param: h.id };
        if (h.type === 'amal') return { title: l === 'bn' ? h.titleBn : h.titleEn, subtitle: l === 'bn' ? 'আমল' : 'Amal', icon: '📿', color: '#4f46e5', type: l === 'bn' ? 'সাম্প্রতিক পঠিত' : 'Recently Read', action: 'readAmal', param: h.id };
        return { title: l === 'bn' ? h.titleBn : h.titleEn, subtitle: l === 'bn' ? 'দোয়া' : 'Dua', icon: '🤲', color: '#7c3aed', type: l === 'bn' ? 'সাম্প্রতিক পঠিত' : 'Recently Read', action: 'readDua', param: h.id };
    }

    // -------------------------------------------------------------------
    // PUBLIC: window.SearchEngine
    // -------------------------------------------------------------------
    var SearchEngine = {
        searchAll: function (query, categoryNames, limit) {
            try {
                var qNorm = norm(query);
                if (!qNorm) return [];
                var qTokens = tokenize(query);
                var lang = state.language;
                var scored = [];

                categoryNames.forEach(function (name) {
                    switch (name) {
                        case 'imam': scored = scored.concat(searchCategory('imam', imamsPool(), imamFields, imamResult, qNorm, qTokens, lang)); break;
                        case 'dua': scored = scored.concat(searchCategory('dua', duasPool(), duaFields, duaResultFactory(), qNorm, qTokens, lang)); break;
                        case 'blog': scored = scored.concat(searchCategory('blog', blogPool(), blogFields, blogResult, qNorm, qTokens, lang)); break;
                        case 'ziyarat': scored = scored.concat(searchCategory('ziyarat', ziyaratPool(), ziyaratFields, ziyaratResult, qNorm, qTokens, lang)); break;
                        case 'amal': scored = scored.concat(searchCategory('amal', amalPool(), amalFields, amalResult, qNorm, qTokens, lang)); break;
                        case 'hadith': (function () { var pool = hadithPool(); scored = scored.concat(searchCategory('hadith', pool, hadithFields, hadithResultFactory(pool), qNorm, qTokens, lang)); })(); break;
                        case 'family': scored = scored.concat(searchCategory('family', familyPool(), familyFields, familyResult, qNorm, qTokens, lang)); break;
                        case 'kc': ['hadith', 'masail', 'qa', 'fatwa'].forEach(function (tab) {
                            var cfg = (typeof kcTabConfig === 'function') ? kcTabConfig(tab) : null;
                            if (cfg && cfg.items) scored = scored.concat(searchCategory('kc-' + tab, cfg.items, kcFields, kcResultFactory(tab), qNorm, qTokens, lang));
                        }); break;
                        case 'timeline': scored = scored.concat(searchCategory('timeline', timelinePool(), timelineFields, timelineResult, qNorm, qTokens, lang)); break;
                        case 'quotes': scored = scored.concat(searchCategory('quotes', quotesPool(), quoteFields, quoteResult, qNorm, qTokens, lang)); break;
                        case 'bookmark': scored = scored.concat(searchCategory('bookmark', bookmarkPool(), bookmarkFields, bookmarkResult, qNorm, qTokens, lang)); break;
                        case 'history': scored = scored.concat(searchCategory('history', historyPool(), historyFields, historyResult, qNorm, qTokens, lang)); break;
                    }
                });

                scored.sort(function (a, b) { return b.score - a.score; });

                var seen = new Set(), out = [];
                for (var i = 0; i < scored.length; i++) {
                    var result = scored[i].result;
                    if (!result) continue;
                    var key = result.action + '|' + result.param + '|' + (result.param2 !== undefined ? result.param2 : '');
                    if (seen.has(key)) continue;
                    seen.add(key);
                    out.push(result);
                    if (limit && out.length >= limit) break;
                }
                return out;
            } catch (e) {
                console.error('[SearchEngine] search failed, returning no results', e);
                return [];
            }
        },
    };

    window.SearchEngine = SearchEngine;
})();

// ============================================================================
// performSearch() / searchKnowledgeCenter() — same public names, same
// parameters, same return shape as before. Internals now go through the
// indexed SearchEngine above instead of scanning every array from scratch.
// ============================================================================
function performSearch(q) {
    return window.SearchEngine.searchAll(
        q,
        ['imam', 'dua', 'blog', 'ziyarat', 'amal', 'hadith', 'kc', 'family', 'timeline', 'quotes', 'bookmark', 'history'],
        30
    );
}

function searchKnowledgeCenter(q) {
    if (!q) return [];
    return window.SearchEngine.searchAll(q, ['kc']);
}
