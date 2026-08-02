// ============================================================================
// duas-data.js — Dua Library data loader (Phase 3 migration)
// ----------------------------------------------------------------------------
// Migrated from a single 2.3MB data/duas.json into per-category JSON files
// under data/duas/ so pages only download the category they actually open.
// See data/duas/metadata.json for the full file map.
//
// PUBLIC API (unchanged names, so nothing elsewhere has to change):
//   duas        -> array, same object as before, ready synchronously at boot
//                  (lightweight entries at first — see "Hydration" below)
//   ziyarats    -> array, same object as before, ready synchronously at boot
//
// NEW public helpers (additive — nothing existing is renamed or removed):
//   loadDuaCategory(category)   -> Promise<Array> full duas for a category
//   loadZiyarats()               -> Promise<Array> full ziyarat list
//   ensureDuaContent(idOrDua)   -> Promise<Object> the SAME object, mutated
//                                  in place once its `verses`/full text land
//   ensureZiyaratContent(idOrZ) -> Promise<Object> same idea, for ziyarats
//
// HYDRATION MODEL (why this keeps the site working without touching script.js)
// ----------------------------------------------------------------------------
// `duas` and `ziyarats` are populated synchronously at boot from
// data/duas/metadata.json, which has every field EXCEPT the heavy `verses`
// array (that's what made the old file 2.3MB). This means:
//   - listing pages, category filters, search, bookmarks, reading history
//     all keep working immediately, with zero behavior change, because every
//     field they rely on (id, slug, titleBn/En/Ar, category, tags,
//     searchKeywords, source, reference, arabic, meaningBn/En, ...) is present.
//   - only `verses` (the full multi-line Arabic/Bangla/transliteration body)
//     is missing until a dua is actually opened.
//
// Because `duas`/`ziyarats` keep the exact same array reference and the exact
// same object references for each entry, any code elsewhere that already
// holds a reference to `duas` or to one of its items keeps working — once
// ensureDuaContent()/ensureZiyaratContent() fills in `verses` on that same
// object, the change is visible everywhere without re-fetching or reassigning.
//
// INTEGRATION NOTE for whoever wires up the detail/reader view:
// Call `await ensureDuaContent(dua)` (or `ensureZiyaratContent(z)`) before
// rendering `dua.verses`. Until that one call is added at the render site,
// the detail page will only have the lightweight fields (title, source,
// short "arabic"/"meaningBn"/"meaningEn" summary) and not the full verse list.
// This file could not add that call itself without touching the page-render
// functions, which this phase is scoped to leave untouched.
// ============================================================================

(function () {
  'use strict';

  const DUAS_DIR = 'data/duas/';
  const METADATA_URL = DUAS_DIR + 'metadata.json';
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 600;

  // ---- cache -----------------------------------------------------------
  // categoryName -> Promise<Array>  (in-flight or resolved; prevents
  // duplicate fetches for the same file, even if called from multiple spots)
  const __categoryCache = Object.create(null);
  let __ziyaratPromise = null;
  let __amalPromise = null; // NEW: Amal — mirrors __ziyaratPromise

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Fetch + parse JSON with up to RETRY_ATTEMPTS tries and a short backoff.
  // Never throws to the caller in a way that blanks the page — callers get
  // an empty array on total failure, and a console warning for diagnostics.
  async function fetchJSONWithRetry(url, attempts = RETRY_ATTEMPTS) {
    let lastErr = null;
    for (let i = 1; i <= attempts; i++) {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
        return await res.json();
      } catch (err) {
        lastErr = err;
        if (i < attempts) await sleep(RETRY_DELAY_MS * i);
      }
    }
    console.warn(
      '[duas-data] Failed to load "' + url + '" after ' + attempts +
      ' attempts. Falling back to empty data for this section.',
      lastErr
    );
    return null;
  }

  // ---- synchronous boot load of the lightweight index -------------------
  // Uses the same loadJSONSync helper the old file used, so boot behavior
  // (duas/ziyarats ready immediately, no flash of empty content on list
  // pages) is unchanged. metadata.json is small (~90KB) by design.
  const __metadata = (typeof loadJSONSync === 'function'
    ? loadJSONSync(METADATA_URL)
    : null) || { duas: [], ziyarats: [], amals: [], categoryFiles: {}, ziyaratFile: DUAS_DIR + 'ziyarat.json', amalFile: DUAS_DIR + 'amal.json' };

  function byOriginalIndex(a, b) {
    return (a.originalIndex || 0) - (b.originalIndex || 0);
  }

  const __liteDuas = (__metadata.duas || []).slice().sort(byOriginalIndex);
  const __liteZiyarats = (__metadata.ziyarats || []).slice().sort(byOriginalIndex);
  // NEW: Amal — third content type alongside Dua/Ziyarat (single-file
  // dataset, same lite/full hydration split as ziyarats — see loadAmals()).
  const __liteAmals = (__metadata.amals || []).slice().sort(byOriginalIndex);

  // Public arrays — SAME reference for the lifetime of the page, and the
  // SAME variable names (`duas`, `ziyarats`, `amals`) every existing render/
  // search/bookmark function already uses.
  const duas = __liteDuas;
  const ziyarats = __liteZiyarats;
  const amals = __liteAmals;

  const __categoryFiles = __metadata.categoryFiles || {};
  const __ziyaratFile = __metadata.ziyaratFile || DUAS_DIR + 'ziyarat.json';
  const __amalFile = __metadata.amalFile || DUAS_DIR + 'amal.json';

  // ---- lazy per-category loading -----------------------------------------
  // Loads and caches one category's full dua data (with `verses`), then
  // merges each full entry into the matching object already sitting in the
  // `duas` array (mutation, same object reference — see hydration note above).
  function loadDuaCategory(category) {
    if (__categoryCache[category]) return __categoryCache[category];

    const fileUrl = __categoryFiles[category] || (DUAS_DIR + category + '.json');

    __categoryCache[category] = fetchJSONWithRetry(fileUrl).then((fullList) => {
      const list = fullList || [];
      const byId = Object.create(null);
      for (const full of list) byId[full.id] = full;

      for (const entry of duas) {
        if (entry.category !== category) continue;
        const full = byId[entry.id];
        if (full && !entry.hasFullData) {
          Object.assign(entry, full);
          entry.hasFullData = true;
        }
      }
      return list;
    });

    return __categoryCache[category];
  }

  function loadZiyarats() {
    if (__ziyaratPromise) return __ziyaratPromise;

    __ziyaratPromise = fetchJSONWithRetry(__ziyaratFile).then((fullList) => {
      const list = fullList || [];
      const byId = Object.create(null);
      for (const full of list) byId[full.id] = full;

      for (const entry of ziyarats) {
        const full = byId[entry.id];
        if (full && !entry.hasFullData) {
          Object.assign(entry, full);
          entry.hasFullData = true;
        }
      }
      return list;
    });

    return __ziyaratPromise;
  }

  // NEW: Amal — same single-file lazy-load pattern as loadZiyarats() above.
  function loadAmals() {
    if (__amalPromise) return __amalPromise;

    __amalPromise = fetchJSONWithRetry(__amalFile).then((fullList) => {
      const list = fullList || [];
      const byId = Object.create(null);
      for (const full of list) byId[full.id] = full;

      for (const entry of amals) {
        const full = byId[entry.id];
        if (full && !entry.hasFullData) {
          Object.assign(entry, full);
          entry.hasFullData = true;
        }
      }
      return list;
    });

    return __amalPromise;
  }

  // Ensure one specific dua (by id or by object reference) has its full
  // content (verses, etc.) loaded. Resolves with the SAME object, now
  // hydrated — safe to call repeatedly, only fetches once per category.
  async function ensureDuaContent(idOrDua) {
    const id = typeof idOrDua === 'string' ? idOrDua : idOrDua.id;
    const entry = duas.find((d) => d.id === id);
    if (!entry) return null;
    if (entry.hasFullData) return entry;
    await loadDuaCategory(entry.category);
    return entry;
  }

  async function ensureZiyaratContent(idOrZ) {
    const id = typeof idOrZ === 'string' ? idOrZ : idOrZ.id;
    const entry = ziyarats.find((z) => z.id === id);
    if (!entry) return null;
    if (entry.hasFullData) return entry;
    await loadZiyarats();
    return entry;
  }

  // NEW: Amal — mirrors ensureZiyaratContent() above.
  async function ensureAmalContent(idOrA) {
    const id = typeof idOrA === 'string' ? idOrA : idOrA.id;
    const entry = amals.find((a) => a.id === id);
    if (!entry) return null;
    if (entry.hasFullData) return entry;
    await loadAmals();
    return entry;
  }

  // ---- expose on window / global scope, same as the old top-level consts ---
  window.duas = duas;
  window.ziyarats = ziyarats;
  window.amals = amals;
  window.loadDuaCategory = loadDuaCategory;
  window.loadZiyarats = loadZiyarats;
  window.loadAmals = loadAmals;
  window.ensureDuaContent = ensureDuaContent;
  window.ensureZiyaratContent = ensureZiyaratContent;
  window.ensureAmalContent = ensureAmalContent;
})();
