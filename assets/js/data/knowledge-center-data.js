// ============================================================================
// knowledge-center-data.js — Knowledge Center data loader (Phase 4 migration)
// ----------------------------------------------------------------------------
// Migrated from one data/knowledge-center.json (all four sections + all
// categories in one file, loaded up front) into per-section JSON files under
// data/knowledge/, so each tab only downloads its own data on open.
//
// PUBLIC API (unchanged names — nothing elsewhere has to change):
//   kcHadithCategories, kcMasailCategories, kcQaCategories, kcMaraji
//       -> arrays, ready synchronously at boot (unchanged behavior)
//   kcHadiths, kcMasail, kcQa, kcFatwa
//       -> SAME array objects as before, ready synchronously at boot with
//          lightweight entries first (see "Hydration" below), then filled
//          in-place once a tab is opened
//
// NEW public helpers (additive — nothing existing is renamed or removed):
//   loadKcSection(section)      -> Promise<Array> full dataset for
//                                  'hadith' | 'masail' | 'qa' | 'fatwa'
//   ensureKcItemContent(id, section) -> Promise<Object> same object,
//                                  mutated in place once full fields land
//
// HYDRATION MODEL (mirrors the Phase 3 Dua Library migration)
// ----------------------------------------------------------------------------
// kcHadiths/kcMasail/kcQa/kcFatwa are populated synchronously at boot from
// data/knowledge/metadata.json, which carries every item's id, category,
// and primary bilingual question/text field (everything global search
// matches against) but NOT the secondary detail fields (answerBn/En,
// detailBn/En, refBn/En, sourceBn/En, date) — those load with the full
// per-section file. This means:
//   - tab navigation, category filters, bookmarks, reading history, and
//     global search over questions/hadith text all work immediately with
//     zero behavior change.
//   - only the fuller answer/reference/detail text is missing until that
//     tab is actually opened.
//
// Because the four arrays keep the exact same reference, and each item
// keeps the exact same object identity, any code elsewhere already holding
// a reference to e.g. kcHadiths or one of its items keeps working — once
// loadKcSection('hadith') merges the full fields into that same object,
// the change is visible everywhere without re-fetching or reassigning.
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

  // section name -> { array: the public kc* array, key: metadata key, file: url }
  let __sectionConfig = null;

  // section name -> Promise<Array> (in-flight or resolved; prevents
  // duplicate fetches for the same section, even if called from multiple spots)
  const __sectionCache = Object.create(null);

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Fetch + parse JSON with up to RETRY_ATTEMPTS tries and a short backoff.
  // Never throws in a way that blanks the page — callers get null on total
  // failure (and a friendly console warning), and calling code falls back
  // to the lightweight metadata already on screen.
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

  // ---- synchronous boot load of categories + lightweight index -----------
  // Uses the same loadJSONSync helper the old file used, so boot behavior
  // (all four kc* arrays + all category lists ready immediately, no flash
  // of empty tabs) is unchanged. Both files are small by design (~5KB and
  // ~75KB), unlike the four full per-section files which are lazy-loaded.
  const __categories = (typeof loadJSONSync === 'function'
    ? loadJSONSync(CATEGORIES_URL)
    : null) || { kcHadithCategories: [], kcMasailCategories: [], kcQaCategories: [], kcMaraji: [] };

  const __metadata = (typeof loadJSONSync === 'function'
    ? loadJSONSync(METADATA_URL)
    : null) || { kcHadiths: [], kcMasail: [], kcQa: [], kcFatwa: [], sectionFiles: {} };

  const kcHadithCategories = __categories.kcHadithCategories || [];
  const kcMasailCategories = __categories.kcMasailCategories || [];
  const kcQaCategories = __categories.kcQaCategories || [];
  const kcMaraji = __categories.kcMaraji || [];

  // Public arrays — SAME reference for the lifetime of the page, and the
  // SAME variable names every existing render/search/bookmark function uses.
  const kcHadiths = (__metadata.kcHadiths || []).slice();
  const kcMasail = (__metadata.kcMasail || []).slice();
  const kcQa = (__metadata.kcQa || []).slice();
  const kcFatwa = (__metadata.kcFatwa || []).slice();

  const __sectionFiles = __metadata.sectionFiles || {
    hadith: KC_DIR + 'hadith.json',
    masail: KC_DIR + 'masail.json',
    qa: KC_DIR + 'qa.json',
    fatwa: KC_DIR + 'fatwa.json',
  };

  __sectionConfig = {
    hadith: { array: kcHadiths, file: __sectionFiles.hadith },
    masail: { array: kcMasail, file: __sectionFiles.masail },
    qa: { array: kcQa, file: __sectionFiles.qa },
    fatwa: { array: kcFatwa, file: __sectionFiles.fatwa },
  };

  // ---- lazy per-section loading -------------------------------------------
  // Loads and caches one section's full data, then merges each full entry
  // into the matching object already sitting in the kc* array (mutation,
  // same object reference — see hydration note above).
  function loadKcSection(section) {
    const cfg = __sectionConfig[section];
    if (!cfg) return Promise.resolve([]);
    if (__sectionCache[section]) return __sectionCache[section];

    __sectionCache[section] = fetchJSONWithRetry(cfg.file).then((fullList) => {
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
  window.loadKcSection = loadKcSection;
  window.ensureKcItemContent = ensureKcItemContent;
})();
