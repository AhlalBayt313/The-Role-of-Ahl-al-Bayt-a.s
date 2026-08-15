// ============================================================================
// knowledge-center-data.js — Knowledge Center data loader (Phase 4 migration)
// ----------------------------------------------------------------------------
// Migrated from one data/knowledge-center.json (all four sections + all
// categories in one file, loaded up front) into per-section JSON files under
// data/knowledge/, so each tab only downloads its own data on open.
//
// PUBLIC API (unchanged names — nothing elsewhere has to change):
//   kcHadithCategories, kcMasailCategories, kcQaCategories, kcMaraji
//       -> arrays, SAME reference for the lifetime of the page — see the
//          2026-08-11 update note below for how/when they get filled
//   kcHadiths, kcMasail, kcQa, kcFatwa
//       -> SAME array objects as before, filled with lightweight entries
//          first (see "Hydration" below), then filled in-place once a tab
//          is opened
//
// NEW public helpers (additive — nothing existing is renamed or removed):
//   loadKcSection(section)      -> Promise<Array> full dataset for
//                                  'hadith' | 'masail' | 'qa' | 'fatwa'
//   ensureKcItemContent(id, section) -> Promise<Object> same object,
//                                  mutated in place once full fields land
//
// NEW public state:
//   kcIndexLoadState -> 'loading' | 'loaded' | 'error', so
//                        renderKnowledgeCenterPage() can show an accurate
//                        lightweight loading/error state instead of a
//                        blank or broken page while categories.json /
//                        metadata.json are in flight. Mirrors
//                        blogPostsLoadState (Phase 1) / quizDataLoadState
//                        (Phase 2).
//
// HYDRATION MODEL (mirrors the Phase 3 Dua Library migration)
// ----------------------------------------------------------------------------
// kcHadiths/kcMasail/kcQa/kcFatwa are populated from data/knowledge/
// metadata.json, which carries every item's id, category, and primary
// bilingual question/text field (everything global search matches
// against) but NOT the secondary detail fields (answerBn/En, detailBn/En,
// refBn/En, sourceBn/En, date) — those load with the full per-section
// file. This means:
//   - tab navigation, category filters, bookmarks, reading history, and
//     global search over questions/hadith text all work as soon as
//     metadata.json resolves, with zero behavior change from before.
//   - only the fuller answer/reference/detail text is missing until that
//     tab is actually opened.
//
// Because the four arrays keep the exact same reference, and each item
// keeps the exact same object identity, any code elsewhere already holding
// a reference to e.g. kcHadiths or one of its items keeps working — once
// loadKcSection('hadith') merges the full fields into that same object,
// the change is visible everywhere without re-fetching or reassigning.
//
// 2026-08-11 update (Phase 3 of the sync-XHR migration): categories.json
// (~5KB) and metadata.json (~165KB — the larger of the two, per the audit)
// now load via loadJSONAsync() (introduced in Phase 1 for the Blog
// migration) instead of loadJSONSync(), so this ~140KB+ combined payload
// no longer blocks app boot. kcHadithCategories/kcMasailCategories/
// kcQaCategories/kcMaraji/kcHadiths/kcMasail/kcQa/kcFatwa now start as
// EMPTY arrays and are filled in place via push(...) once both files
// resolve — same reference for the lifetime of the page, exactly like
// blogPosts (Phase 1) and quizQuestions/quizCategories (Phase 2). Nothing
// elsewhere that already reads these arrays by reference needs to change;
// see kcIndexLoadState above and renderKnowledgeCenterPage() (in
// knowledge-center.js) for how the loading window itself is handled.
//
// INTEGRATION NOTE for whoever wires up each tab's render call:
// Call `await loadKcSection('hadith')` (or 'masail' / 'qa' / 'fatwa') when
// that tab is opened, before rendering full items. Until that one call is
// added at the tab-open site, items will show category/question/text but
// not the full answer/reference/detail fields. This file cannot add that
// call itself without touching the page-render functions, which this phase
// is scoped to leave untouched.
// ============================================================================

(function () {
  'use strict';

  const KC_DIR = 'data/knowledge/';
  const CATEGORIES_URL = KC_DIR + 'categories.json';
  const METADATA_URL = KC_DIR + 'metadata.json';
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 600;

  // Public arrays — SAME reference for the lifetime of the page, and the
  // SAME variable names every existing render/search/bookmark function
  // uses. All start EMPTY; loadKcIndexAsync() below fills them in place
  // once categories.json / metadata.json resolve.
  const kcHadithCategories = [];
  const kcMasailCategories = [];
  const kcQaCategories = [];
  const kcMaraji = [];
  const kcHadiths = [];
  const kcMasail = [];
  const kcQa = [];
  const kcFatwa = [];

  // 'loading' | 'loaded' | 'error' — see PUBLIC API note above.
  let kcIndexLoadState = 'loading';

  const __defaultSectionFiles = {
    hadith: KC_DIR + 'hadith.json',
    masail: KC_DIR + 'masail.json',
    qa: KC_DIR + 'qa.json',
    fatwa: KC_DIR + 'fatwa.json',
  };

  // section name -> { array: the public kc* array, file: url }. Wired up
  // immediately (with default file paths) so loadKcSection() /
  // ensureKcItemContent() are safe to call at any time — even before
  // metadata.json resolves. They internally await __indexReady (below)
  // before merging anything into these arrays, so a section fetch kicked
  // off early (e.g. by kcLoadTab() right after boot) still waits for the
  // lightweight entries to exist before merging into them.
  const __sectionConfig = {
    hadith: { array: kcHadiths, file: __defaultSectionFiles.hadith },
    masail: { array: kcMasail, file: __defaultSectionFiles.masail },
    qa: { array: kcQa, file: __defaultSectionFiles.qa },
    fatwa: { array: kcFatwa, file: __defaultSectionFiles.fatwa },
  };

  // section name -> Promise<Array> (in-flight or resolved; prevents
  // duplicate fetches for the same section, even if called from multiple spots)
  const __sectionCache = Object.create(null);

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Fetch + parse JSON with up to RETRY_ATTEMPTS tries and a short backoff.
  // Used for loadKcSection()'s per-section fetches (hadith.json/masail.json/
  // qa.json/fatwa.json) — this existing retry/caching machinery is
  // untouched by this phase, which only changes how categories.json /
  // metadata.json are loaded (see loadKcIndexAsync() below, which uses
  // loadJSONAsync() from data-loader.js instead).
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
      '[knowledge-center-data] Failed to load "' + url + '" after ' + attempts +
      ' attempts. Keeping lightweight data for this section — এই বিভাগের পূর্ণ তথ্য লোড করা যায়নি, সংক্ষিপ্ত তথ্য দেখানো হচ্ছে।',
      lastErr
    );
    return null;
  }

  // ---- Phase 3: async boot load of categories + lightweight index --------
  // Loads categories.json and metadata.json together via loadJSONAsync()
  // (Promise.all, same pairing pattern as quiz-data.js's Phase 2 migration
  // so the category lists and the item lists they describe never appear
  // half-populated relative to each other), fills the public kc* arrays in
  // place, and resolves kcIndexLoadState. __indexReady is what
  // loadKcSection()/ensureKcItemContent() await before doing any work.
  const __indexReady = (function loadKcIndexAsync() {
    if (typeof loadJSONAsync !== 'function') {
      // Extremely defensive fallback — should never happen since
      // data-loader.js always loads before knowledge-center-data.js
      // (see index.html).
      kcIndexLoadState = 'error';
      window.kcIndexLoadState = kcIndexLoadState;
      return Promise.resolve();
    }

    return Promise.all([
      loadJSONAsync(CATEGORIES_URL),
      loadJSONAsync(METADATA_URL),
    ]).then(([categories, metadata]) => {
      const categoriesOk = !!categories;
      const metadataOk = !!metadata;

      if (categoriesOk) {
        kcHadithCategories.push(...(categories.kcHadithCategories || []));
        kcMasailCategories.push(...(categories.kcMasailCategories || []));
        kcQaCategories.push(...(categories.kcQaCategories || []));
        kcMaraji.push(...(categories.kcMaraji || []));
      }

      if (metadataOk) {
        kcHadiths.push(...(metadata.kcHadiths || []));
        kcMasail.push(...(metadata.kcMasail || []));
        kcQa.push(...(metadata.kcQa || []));
        kcFatwa.push(...(metadata.kcFatwa || []));

        const sectionFiles = metadata.sectionFiles || {};
        if (sectionFiles.hadith) __sectionConfig.hadith.file = sectionFiles.hadith;
        if (sectionFiles.masail) __sectionConfig.masail.file = sectionFiles.masail;
        if (sectionFiles.qa) __sectionConfig.qa.file = sectionFiles.qa;
        if (sectionFiles.fatwa) __sectionConfig.fatwa.file = sectionFiles.fatwa;
      }

      // Both files load together (Promise.all) so a genuine failure of
      // either one is reported as 'error' — callers (renderKnowledgeCenterPage)
      // fall back to a clear error/empty state rather than silently
      // pretending a half-loaded index is complete.
      kcIndexLoadState = (categoriesOk && metadataOk) ? 'loaded' : 'error';
      window.kcIndexLoadState = kcIndexLoadState;

      // Only re-render if the user is currently on the Knowledge Center
      // page — never trigger a global re-render while they're elsewhere.
      // Guarded with typeof checks because this callback can in principle
      // fire before every other <script> has finished executing. Mirrors
      // the exact guard used by the Blog (Phase 1) and Quiz (Phase 2)
      // migrations.
      if (
        typeof state !== 'undefined' &&
        state.currentPage === 'knowledgeCenter' &&
        typeof render === 'function'
      ) {
        render();
      }
    });
  })();

  // ---- lazy per-section loading -------------------------------------------
  // Loads and caches one section's full data, then merges each full entry
  // into the matching object already sitting in the kc* array (mutation,
  // same object reference — see hydration note above). Awaits __indexReady
  // first so the lightweight entries it merges into actually exist by the
  // time the full section data arrives (safe even if a tab is opened, and
  // this is called, before categories.json/metadata.json have resolved).
  function loadKcSection(section) {
    const cfg = __sectionConfig[section];
    if (!cfg) return Promise.resolve([]);
    if (__sectionCache[section]) return __sectionCache[section];

    __sectionCache[section] = __indexReady
      .then(() => fetchJSONWithRetry(cfg.file))
      .then((fullList) => {
        const list = fullList || [];
        const byId = Object.create(null);
        for (const full of list) byId[full.id] = full;

        for (const entry of cfg.array) {
          const full = byId[entry.id];
          if (full && !entry.hasFullData) {
            Object.assign(entry, full);
            entry.hasFullData = true;
          }
        }
        return list;
      });

    return __sectionCache[section];
  }

  // Ensure one specific item (by id, within a given section) has its full
  // content (answer/detail/reference fields) loaded. Resolves with the SAME
  // object, now hydrated — safe to call repeatedly, fetches once per section.
  async function ensureKcItemContent(id, section) {
    const cfg = __sectionConfig[section];
    if (!cfg) return null;
    await __indexReady;
    const entry = cfg.array.find((it) => it.id === id);
    if (!entry) return null;
    if (entry.hasFullData) return entry;
    await loadKcSection(section);
    return entry;
  }

  // ---- expose on window / global scope, same as the old top-level consts ---
  window.kcHadithCategories = kcHadithCategories;
  window.kcHadiths = kcHadiths;
  window.kcMasailCategories = kcMasailCategories;
  window.kcMasail = kcMasail;
  window.kcQaCategories = kcQaCategories;
  window.kcQa = kcQa;
  window.kcMaraji = kcMaraji;
  window.kcFatwa = kcFatwa;
  window.kcIndexLoadState = kcIndexLoadState;
  window.loadKcSection = loadKcSection;
  window.ensureKcItemContent = ensureKcItemContent;
})();
