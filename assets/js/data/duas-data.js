// ============================================================================
// duas-data.js — Dua Library data loader (Phase 3 migration)
// ----------------------------------------------------------------------------
// Migrated from a single 2.3MB data/duas.json into per-category JSON files
// under data/duas/ so pages only download the category they actually open.
// See data/duas/metadata.json for the full file map.
//
// PUBLIC API (unchanged names, so nothing elsewhere has to change):
//   duas        -> array, same object as before, SAME reference for the
//                  lifetime of the page — see the 2026-08-11 update note
//                  below for how/when it gets filled
//   ziyarats    -> array, same object as before, SAME reference
//   amals       -> array, same object as before, SAME reference
//
// NEW public helpers (additive — nothing existing is renamed or removed):
//   loadDuaCategory(category)   -> Promise<Array> full duas for a category
//   loadZiyarats()               -> Promise<Array> full ziyarat list
//   loadAmals()                  -> Promise<Array> full amal list
//   ensureDuaContent(idOrDua)   -> Promise<Object> the SAME object, mutated
//                                  in place once its `verses`/full text land
//   ensureZiyaratContent(idOrZ) -> Promise<Object> same idea, for ziyarats
//   ensureAmalContent(idOrA)    -> Promise<Object> same idea, for amals
//
// NEW public state:
//   duasIndexLoadState -> 'loading' | 'loaded' | 'error', so
//                        renderDuaPage() can show an accurate lightweight
//                        loading/error state instead of a blank or broken
//                        page while metadata.json is in flight. Mirrors
//                        blogPostsLoadState (Phase 1) / quizDataLoadState
//                        (Phase 2) / kcIndexLoadState (Phase 3).
//
// HYDRATION MODEL (why this keeps the site working without touching script.js)
// ----------------------------------------------------------------------------
// `duas`/`ziyarats`/`amals` are populated from data/duas/metadata.json,
// which has every field EXCEPT the heavy `verses` array (that's what made
// the old file 2.3MB). This means:
//   - listing pages, category filters, search, bookmarks, reading history
//     all work as soon as metadata.json resolves, with zero behavior
//     change, because every field they rely on (id, slug, titleBn/En/Ar,
//     category, tags, searchKeywords, source, reference, arabic,
//     meaningBn/En, ...) is present.
//   - only `verses` (the full multi-line Arabic/Bangla/transliteration body)
//     is missing until a dua/ziyarat/amal is actually opened.
//
// Because `duas`/`ziyarats`/`amals` keep the exact same array reference and
// the exact same object references for each entry, any code elsewhere that
// already holds a reference to `duas` or to one of its items keeps working —
// once ensureDuaContent()/ensureZiyaratContent()/ensureAmalContent() fills
// in `verses` on that same object, the change is visible everywhere without
// re-fetching or reassigning.
//
// 2026-08-11 update (Phase 4 of the sync-XHR migration): metadata.json
// (~168KB, the largest lite-index file migrated so far) now loads via
// loadJSONAsync() (introduced in Phase 1 for the Blog migration) instead of
// loadJSONSync(), so it no longer blocks app boot. `duas`/`ziyarats`/`amals`
// now start as EMPTY arrays and are filled in place via push(...) once
// metadata.json resolves — same reference for the lifetime of the page,
// exactly like blogPosts (Phase 1), quizQuestions/quizCategories (Phase 2),
// and the Knowledge Center's kc* arrays (Phase 3). Nothing elsewhere that
// already reads these arrays by reference needs to change; see
// duasIndexLoadState above and renderDuaPage() (in script-3-pages.js) for
// how the loading window itself is handled. The three arrays are still
// sorted by `originalIndex` exactly as before, just once the data arrives
// instead of synchronously at boot.
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
  let __amalPromise = null; // Amal — mirrors __ziyaratPromise

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Fetch + parse JSON with up to RETRY_ATTEMPTS tries and a short backoff.
  // Never throws to the caller in a way that blanks the page — callers get
  // an empty array on total failure, and a console warning for diagnostics.
  // Used for loadDuaCategory()/loadZiyarats()/loadAmals()'s per-category/
  // per-file fetches — this existing retry/caching machinery is untouched
  // by this phase, which only changes how metadata.json is loaded (see
  // loadDuaIndexAsync() below, which uses loadJSONAsync() instead).
  async function fetchJSONWithRetry(url, attempts = RETRY_ATTEMPTS) {
    let lastErr = null;
    for (let i = 1; i <= attempts; i++) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
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

  function byOriginalIndex(a, b) {
    return (a.originalIndex || 0) - (b.originalIndex || 0);
  }

  // Public arrays — SAME reference for the lifetime of the page, and the
  // SAME variable names (`duas`, `ziyarats`, `amals`) every existing render/
  // search/bookmark function already uses. All start EMPTY;
  // loadDuaIndexAsync() below fills them in place (sorted by
  // originalIndex, exactly as before) once metadata.json resolves.
  const duas = [];
  const ziyarats = [];
  const amals = [];

  // 'loading' | 'loaded' | 'error' — see PUBLIC API note above.
  let duasIndexLoadState = 'loading';

  // Populated once metadata.json resolves; loadDuaCategory()/loadZiyarats()/
  // loadAmals() fall back to a sensible default path regardless, so calling
  // them before that happens is still safe (they await __indexReady first).
  const __categoryFiles = {};
  let __ziyaratFile = DUAS_DIR + 'ziyarat.json';
  let __amalFile = DUAS_DIR + 'amal.json';

  // ---- Phase 4: async boot load of the lightweight index ------------------
  // Loads metadata.json via loadJSONAsync(), fills the public duas/ziyarats/
  // amals arrays in place (still sorted by originalIndex), and resolves
  // duasIndexLoadState. __indexReady is what loadDuaCategory()/
  // loadZiyarats()/loadAmals()/ensureDuaContent()/ensureZiyaratContent()/
  // ensureAmalContent() await before doing any work.
  const __indexReady = (function loadDuaIndexAsync() {
    if (typeof loadJSONAsync !== 'function') {
      // Extremely defensive fallback — should never happen since
      // data-loader.js always loads before duas-data.js (see index.html).
      duasIndexLoadState = 'error';
      window.duasIndexLoadState = duasIndexLoadState;
      return Promise.resolve();
    }

    return loadJSONAsync(METADATA_URL).then((metadata) => {
      const ok = !!metadata;

      if (ok) {
        const liteDuas = (metadata.duas || []).slice().sort(byOriginalIndex);
        const liteZiyarats = (metadata.ziyarats || []).slice().sort(byOriginalIndex);
        const liteAmals = (metadata.amals || []).slice().sort(byOriginalIndex);
        duas.push(...liteDuas);
        ziyarats.push(...liteZiyarats);
        amals.push(...liteAmals);

        Object.assign(__categoryFiles, metadata.categoryFiles || {});
        if (metadata.ziyaratFile) __ziyaratFile = metadata.ziyaratFile;
        if (metadata.amalFile) __amalFile = metadata.amalFile;
      }

      duasIndexLoadState = ok ? 'loaded' : 'error';
      window.duasIndexLoadState = duasIndexLoadState;

      // Only re-render if the user is currently on the Dua Library page —
      // never trigger a global re-render while they're elsewhere. Guarded
      // with typeof checks because this callback can in principle fire
      // before every other <script> has finished executing. Mirrors the
      // exact guard used by the Blog (Phase 1), Quiz (Phase 2), and
      // Knowledge Center (Phase 3) migrations.
      if (
        typeof state !== 'undefined' &&
        state.currentPage === 'dua' &&
        typeof render === 'function'
      ) {
        render();
      }
    });
  })();

  // ---- lazy per-category loading -----------------------------------------
  // Loads and caches one category's full dua data (with `verses`), then
  // merges each full entry into the matching object already sitting in the
  // `duas` array (mutation, same object reference — see hydration note
  // above). Awaits __indexReady first so the lightweight entries it merges
  // into actually exist by the time the full category data arrives (safe
  // even if a category is opened, and this is called, before metadata.json
  // has resolved).
  function loadDuaCategory(category) {
    if (__categoryCache[category]) return __categoryCache[category];

    __categoryCache[category] = __indexReady
      .then(() => {
        const fileUrl = __categoryFiles[category] || (DUAS_DIR + category + '.json');
        return fetchJSONWithRetry(fileUrl);
      })
      .then((fullList) => {
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

    __ziyaratPromise = __indexReady
      .then(() => fetchJSONWithRetry(__ziyaratFile))
      .then((fullList) => {
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

  // Amal — same single-file lazy-load pattern as loadZiyarats() above.
  function loadAmals() {
    if (__amalPromise) return __amalPromise;

    __amalPromise = __indexReady
      .then(() => fetchJSONWithRetry(__amalFile))
      .then((fullList) => {
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
  // Awaits __indexReady first so `duas` actually has entries to search by
  // the time this runs, even if called before metadata.json has resolved.
  async function ensureDuaContent(idOrDua) {
    const id = typeof idOrDua === 'string' ? idOrDua : idOrDua.id;
    await __indexReady;
    const entry = duas.find((d) => d.id === id);
    if (!entry) return null;
    if (entry.hasFullData) return entry;
    await loadDuaCategory(entry.category);
    return entry;
  }

  async function ensureZiyaratContent(idOrZ) {
    const id = typeof idOrZ === 'string' ? idOrZ : idOrZ.id;
    await __indexReady;
    const entry = ziyarats.find((z) => z.id === id);
    if (!entry) return null;
    if (entry.hasFullData) return entry;
    await loadZiyarats();
    return entry;
  }

  // Amal — mirrors ensureZiyaratContent() above.
  async function ensureAmalContent(idOrA) {
    const id = typeof idOrA === 'string' ? idOrA : idOrA.id;
    await __indexReady;
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
  window.duasIndexLoadState = duasIndexLoadState;
  window.loadDuaCategory = loadDuaCategory;
  window.loadZiyarats = loadZiyarats;
  window.loadAmals = loadAmals;
  window.ensureDuaContent = ensureDuaContent;
  window.ensureZiyaratContent = ensureZiyaratContent;
  window.ensureAmalContent = ensureAmalContent;
})();
