# Phase 4A — Issue #26: Test Harness / Documentation

**Status:** Documentation only. No test framework, no code changes.
**Baseline:** Phase 3C (frozen).
**Scope:** This document is a manual regression checklist for the site as it
exists today. It does not add Jest/Vitest/Playwright/Cypress, does not add
test files, and does not touch application code.

---

## 1. How the app boots (for context when testing)

Script load order, from `index.html` (order matters — do not reorder when
testing or debugging):

1. `assets/js/utils/data-loader.js` — sync + async JSON loader, must load first
2. `assets/js/data/duas-data.js`
3. `assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js`
4. `assets/js/modules/blog/blog.js`
5. `assets/js/data/knowledge-center-data.js`
6. `assets/js/modules/knowledge/knowledge-center.js`
7. `assets/js/data/quiz-data.js`
8. `assets/js/core/script-1-core.js`
9. `assets/js/core/script-2-ui.js`
10. `assets/js/core/script-3-pages.js`
11. `assets/js/core/search-engine.js` (takes over `performSearch`/`searchKnowledgeCenter`)
12. `assets/js/core/world-map.js`
13. `assets/js/core/editor-modal.js`
14. `assets/js/core/script-4-boot.js`
15. `assets/js/core/phase4-animations.js`

Important: the app has **no URL/hash routing and no `popstate` handling**
anywhere. All navigation is via `state.currentPage` / `state.previousPage`
and explicit "← Back" buttons. This affects the History checklist below —
there is no browser back/forward state to restore beyond what already exists.

Also: `loadJSONSync()` uses synchronous XHR, which only works when served
over http(s) (e.g. GitHub Pages) — it will **not** work opening `index.html`
via `file://`. Always test on a served URL.

---

## 2. Existing functions usable for manual validation (already in the app)

These are not new — they already exist in the Phase 3C codebase and can be
called from the browser console for manual smoke-testing:

| Function | File | What it checks |
|---|---|---|
| `validateFamilyTreeData()` | `ahlul-bayt-unified.js` | Validates `familyTreeDatabase` structure (Prophet object, imams array, critical/recommended fields per imam); populates `familyTreeValidationErrors` |
| `window.kcxValidateFeatured()` | `knowledge-center.js` | Re-resolves `KCX_FEATURED` entries against live data; reports missing / hint-mismatched / recovered featured items |
| `window.duasIndexLoadState`, `window.kcIndexLoadState`, `window.ahlulBaytDataLoadState` | `duas-data.js`, `knowledge-center-data.js`, `ahlul-bayt-unified.js` | Inspectable state objects showing whether each dataset's index has loaded |
| `window.kcFullDataReady` | `knowledge-center-data.js` | Boolean flag — whether the full (non-index) Knowledge Center dataset has finished loading |
| `sanitize(text)` | `script-1-core.js` | Confirms output is HTML-escaped where used; useful for spot-checking XSS-safety of user-editable fields |
| `performSearch(q)` / `searchKnowledgeCenter(q)` | `search-engine.js` | Callable directly from console to check search result shape without going through the UI |
| Browser console + `window.KCX_DEBUG = true` | `knowledge-center.js` | Enables extra debug logging for Knowledge Center navigation (`kcxDebug`) |

None of these require any new code — this table is a discovery of what's
already there.

---

## 3. Smoke-Test Checklist (whole app)

- [ ] Site loads on the production URL with no console errors
- [ ] `#app` mount point renders content (not blank)
- [ ] Service worker (`sw.js`) registers without error; `offline.html` fallback works when offline
- [ ] All 15 scripts in the load order above load with HTTP 200 (check Network tab)
- [ ] No script throws due to a missing dependency (e.g. `world-map.js` loading before `script-1-core.js`)
- [ ] Manifest (`manifest.json`) and icons load correctly for PWA install prompt

---

## 4. Navigation Test Checklist

- [ ] Desktop nav links switch `state.currentPage` and render the correct page
- [ ] Mobile bottom nav (`#mobile-bottom-nav`) switches pages correctly
- [ ] Ahlul Bayt unified page: both `imams` and `familyTree` entry points land on the unified page with the correct tab (`masumeen` / `tree`) pre-selected
- [ ] Search result navigation (`data-action` dispatch) lands on the correct page/detail
- [ ] "← Back" buttons return to the correct `state.previousPage` on every page that has one

---

## 5. History / Back-Forward Test Checklist

**Note:** the app has no hash/URL routing or `popstate` listener anywhere in
the codebase, so browser back/forward does not restore in-app state on
*any* page — this is existing, universal behavior, not a per-page bug.
Checklist here is about confirming that stays consistent, not about
introducing URL routing:

- [ ] Browser back/forward does not crash the app (page reloads to default state, as expected)
- [ ] In-app "← Back" (not browser back) correctly restores `state.previousPage` on Ahlul Bayt unified page
- [ ] In-app "← Back" works consistently on Knowledge Center detail pages
- [ ] In-app "← Back" works consistently on Blog post detail pages
- [ ] In-app "← Back" works consistently on Dua/Ziyarat detail pages

---

## 6. Search Test Checklist

- [ ] `performSearch(q)` returns results with the documented shape: `{title, subtitle, icon, color, type, action, param, param2?}`
- [ ] Keyword/prefix search returns expected results (indexed path)
- [ ] Mid-word substring search (e.g. "ammad" inside "Muhammad") still returns matches (scan fallback path)
- [ ] Search across all categories (duas, ziyarat, blog, knowledge center, ahlul bayt) returns relevant items
- [ ] Empty query / no-results state renders without error
- [ ] Search result click navigates to the correct page via the `data-action` dispatcher

---

## 7. Language / Bengali-English Test Checklist

- [ ] `toggleLanguage()` switches UI language correctly across all pages
- [ ] Bengali font fallback (`Noto Serif Bengali`) renders correctly (no tofu/missing glyphs)
- [ ] Arabic text renders RTL correctly wherever present
- [ ] Content with only one language available shows correct fallback (and per accessibility fix #11, is marked with the correct `lang=` attribute — see `shownLang()` in `knowledge-center.js`)
- [ ] Bengali translations display correctly in duas, ziyarat, Ahlul Bayt bios, blog, Knowledge Center

---

## 8. Blog Test Checklist

- [ ] Blog list page renders published posts
- [ ] Individual blog post detail page renders correctly
- [ ] "⚙️ Publish Settings" admin UI opens (`promptBlogWorkerSettings`)
- [ ] Save/delete of a custom post falls back to local-only save if the Worker is unreachable (per documented fallback behavior)
- [ ] Featured blog entries (if configured in `KCX_FEATURED`) resolve correctly — see `kcxValidateFeatured()`

---

## 9. Knowledge Center Test Checklist

- [ ] Hadith, Masail, Q&A, and Fatwa tabs all render their respective content
- [ ] Knowledge Center index loads before full data (`kcIndexLoadState` → `kcFullDataReady`)
- [ ] Detail page opens correctly from a list item
- [ ] `window.changePage(page)` navigates correctly within Knowledge Center
- [ ] No dead/orphaned "PDF Library" references remain (confirm KC fully replaced it)

---

## 10. Featured-Content Validation Test

- [ ] Run `window.kcxValidateFeatured()` in console; confirm `report.missing` and `report.hintMismatch` are empty on a clean baseline
- [ ] If a featured item's hint no longer matches its text, confirm the console warning appears (`warnOnce`) and the item is still shown (not silently dropped)
- [ ] If a featured item is entirely missing, confirm it's omitted from the page (not rendered as broken/empty)

---

## 11. Dua/Content Loading Test

- [ ] `loadDuaCategory`, `loadZiyarats`, `loadAmals` all populate their respective arrays
- [ ] Ziyarat al-Nudba (`dua-al-nudbah` in `data/duas/morning.json`) — spot-check all 222 verses present (Arabic + Bangla)
- [ ] Recently added ziyarat entries (Sajjad, Baqir, Sadiq, Kazim, joint Baqi, Zainab, Fatima al-Ma'suma, al-Shuhada, Ruqayya, Reza, Jawad) render correctly with Arabic + Bangla transliteration + Bangla meaning
- [ ] Sahifa al-Sajjadiyya content (15 Munajat, Dua 47, Risalat al-Huquq) renders correctly

---

## 12. Modal/Editor Test Checklist

- [ ] Each modal in `editor-modal.js` opens with `role="dialog"` and `aria-modal="true"` present
- [ ] Knowledge editor modal (`#knowledge-editor-overlay`) opens/closes correctly
- [ ] Dua editor modal (`#dua-editor-overlay`) opens/closes correctly
- [ ] `saveQuizQuestion()`, `closeDuaEditor()`, `saveDuaItem()`, `customArrayForType()` all callable without error from within modal flows

---

## 13. Mobile/Responsive Test Checklist

- [ ] Mobile bottom nav visible only below `md` breakpoint (`md:hidden`)
- [ ] No horizontal scroll on mobile (confirm `overflow-x: hidden` fix on both `html` and `body` still holds)
- [ ] Animation freeze fix at the 767px breakpoint still holds (no stuck/frozen animations)
- [ ] Touch targets on mobile bottom nav are usable (no overlap/mis-tap)

---

## 14. Accessibility Regression Checklist

- [ ] All modals expose `role="dialog"` + `aria-modal="true"`
- [ ] Mobile nav has `role="navigation"` and a Bengali `aria-label`
- [ ] Text shown in a fallback language carries the correct `lang=` attribute (per `shownLang()`)
- [ ] WCAG contrast fix on hero section still holds (spot-check with a contrast checker)
- [ ] Keyboard-only navigation can reach and operate primary nav, search, and modals

---

## 15. Data-Loader/Error-State Checklist

- [ ] `loadJSONSync()` returns `null` (not a throw) on a 404 or malformed JSON, and logs `[data-loader] Failed to load ...`
- [ ] `loadJSONAsync()` follows the documented retry/backoff contract (3 attempts, 600ms × attempt) and resolves to `null` on total failure, without throwing
- [ ] App does not hard-crash if a single data file fails to load (degrades gracefully — confirm which UI sections show empty vs. broken state)
- [ ] Confirm `file://` is NOT used for testing (sync XHR requires http/https)

---

## 16. What Is Currently NOT Automated

Everything in this document is currently **manual only**. Specifically not
automated:

- No unit tests for any function (`validateFamilyTreeData`, `sanitize`, `performSearch`, loaders, etc.)
- No integration/E2E tests for navigation, search, or modal flows
- No CI pipeline running any of the above on push/PR
- No automated accessibility audit (e.g. axe-core) — accessibility checklist above is manual only
- No automated visual regression testing for CSS/layout
- No automated bilingual content-completeness check (e.g. flagging duas missing a Bangla field)

---

## 17. Future Automation (not implemented now)

Ideas only — none of this exists yet, and nothing here should be built as
part of Issue #26:

- A lightweight, dependency-free smoke-test script (plain Node, no framework) that calls `validateFamilyTreeData()` and `kcxValidateFeatured()` headlessly and exits non-zero on failure
- Wrapping the existing `familyTreeValidationErrors` / featured-content report objects into a simple JSON report artifact for CI
- Once a framework is approved: Playwright smoke tests for navigation + search, keyed off the checklists in this document
- Automated bilingual completeness check: a script that walks `data/duas/*.json`, `data/knowledge/*.json`, etc. and flags entries missing a Bangla field
- Automated axe-core pass on key pages (home, Knowledge Center, Ahlul Bayt) for the accessibility checklist above

---

## 18. Files Referenced By This Document

For traceability, the checklists above reference these existing files only
(none were modified to produce this document):

- `index.html`
- `assets/js/utils/data-loader.js`
- `assets/js/core/search-engine.js`
- `assets/js/core/script-1-core.js`, `script-2-ui.js`, `script-3-pages.js`, `script-4-boot.js`
- `assets/js/core/editor-modal.js`
- `assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js`
- `assets/js/modules/blog/blog.js`
- `assets/js/modules/knowledge/knowledge-center.js`
- `assets/js/data/duas-data.js`, `knowledge-center-data.js`, `quiz-data.js`
- `server/README.md`
