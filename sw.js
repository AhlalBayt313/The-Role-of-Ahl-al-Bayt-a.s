
const CACHE = 'ahlbayt-v78'; // v78: FIX — install-time STATIC precaching used
// c.add()/c.addAll(), which honors the browser's own HTTP cache for its
// internal fetch. A stale HTTP-cached copy of style.css/script-3-pages.js
// etc. could therefore get written into a brand-new CACHE bucket, meaning
// bumping this version string alone didn't guarantee fresh *content* —
// this is why the imam/masumeen coverflow, family-tree, and calendar
// animations weren't showing up on mobile even after several version
// bumps. Now uses fetch(url,{cache:'reload'}) to force a real network
// round-trip. Paired with a new controllerchange auto-reload in
// script-4-boot.js so an already-open tab picks up a future update
// without the user needing to manually clear cache.
// v77: Content — added the standalone/main
// Ziyarat of Imam Hasan al-Askari (a.s.) (data/duas/ziyarat.json id
// ziyarat-hasan-askari-standalone, 50 verses, Arabic + Bengali meaning;
// source: Mafatih al-Jinan, Ch.10 "Ziyarah of the Imams of Samarra", via
// Sayyid Ibn Tawus). Tagged group:"hasan-askari" together with the
// pre-existing Thursday-specific ziyarat-hasan-askari entry, so the two
// now collapse into one expandable card via the v72 grouping mechanism
// (metadata.json's lite index updated to match, originalIndex:35). No
// JS touched — clusterZiyaratItems() (script-3-pages.js) is data-driven
// and already handles any `.group` key generically.
// v76: Hijri calendar month-switch slide
// animation (calPrev/calNext, direction-aware) — style.css,
// script-1-core.js (calState.lastNavDir), script-2-ui.js, script-3-pages.js.
// v75: Prophet & Masumeen grid replaced with the
// same 3D coverflow carousel design as the Twelve Imams (script-3-pages.js,
// ahlul-bayt-unified.js) — separate index/DOM-query set (data-masumeen-*)
// so the two carousels coexist without colliding; no new CSS (reuses the
// existing .imam-coverflow-* rules as-is).
// v74: Family Tree page (style.css only) —
// generation-by-generation entrance (founder → connector → bridge →
// connector → founding generation → lineage generation → the awaited
// 12th), connector-line "growing" effect, slow respectful pulse on the
// "in occultation" badge. CSS-only, reduced-motion respected, no JS/HTML
// touched. Bumped so returning/installed-PWA clients pick up the CSS change.
// v73: The Twelve Imams (AS) grid replaced with a
// true CSS 3D coverflow carousel (style.css, ahlul-bayt-unified.js,
// script-3-pages.js) — renderCard() output reused unchanged; outer
// position/scale/rotation layer only. Bumped so returning/installed-PWA
// clients pick up the CSS/JS change.
// v72: Content/UI — the 8 separate Ziyarat
// texts of Imam Ali ibn Musa al-Rida (a.s.) in the "12 Imams" Ziyarat list
// (data/duas/ziyarat.json) now collapse into ONE expandable group card
// instead of 8 flat rows. data/duas/ziyarat.json and metadata.json's
// `ziyarats` lite index: those 8 entries tagged with a shared `group:
// "imam-reza"` key plus groupTitleBn/En (shown on the collapsed card) and a
// short variantLabelBn/En each (shown on its row once expanded) — no
// existing field changed, all 8 ids/titles/content untouched.
// script-3-pages.js: new clusterZiyaratItems() groups same-`.group` items
// (2+ members) into one card, leaving every other Ziyarat entry — including
// Imam Jawad's own 2 — rendered exactly as before (byte-for-byte identical
// output, regression-tested). script-2-ui.js: new `toggleZiyaratGroup`
// action (mirrors the existing toggleMuharramEvent expand/collapse idiom).
// script-1-core.js: new `state.expandedZiyaratGroups` (mirrors
// expandedMuharramEvents; ephemeral, not persisted to localStorage, same as
// duaCatExpanded). Detail page, search results, bookmarks/favorites/copy/
// share, and admin edit/delete are all unchanged and still operate
// per-variant. v71: setupScrollReveal() and
// setupHomeStatsCounter() (script-1-core.js) now guard on
// 'IntersectionObserver' in window before constructing one, falling back
// to instantly-visible/final-value instead of throwing on unsupported
// browsers — mirrors the same fallback already used in
// phase4-animations.js. Previously, throwing here (inside the render()
// rAF callback) silently aborted initReadingProgress()+
// setupHomeStatsCounter() every render on any browser without IO support.
// v70: closeOverlayAnimated() and
// closePersonDetail() no longer each hardcode their own copy of the
// reduceMotion/.closing/setTimeout timing logic — factored into a shared
// _animatedClose() helper (script-2-ui.js). No behavior change.
// v69: manifest.json is a real static file again
// (see comment further down) — precached here, linked directly in
// index.html, no more runtime Blob generation in script-4-boot.js.
// v68: removed dead .dua-card-accent CSS rule
// (style.css) — 0 usages in any JS/HTML; the dua reading page's <article>
// already has its own working animated gradient top-bar for the same
// visual purpose, so this rule was fully superseded, not just unused.
// v67 was already live in CACHE before this edit but its changelog
// comment still said "v66" — that comment/version mismatch is now fixed.
// v66: Modal/overlay exit animation — the
// editor/login overlay family (Admin Login, Quiz, Knowledge, Dua, Hadith,
// Ayah, Muharram, Shia Day, Blog editors — 9 close cases total) now plays
// a reverse fade+scale before unmounting, mirroring the Person Detail
// modal's existing .closing pattern (style.css). New shared helper
// closeOverlayAnimated() (script-2-ui.js) adds .closing, then delays the
// existing state-flip + render() by 180ms (0 under prefers-reduced-motion)
// instead of instantly removing the overlay. Each close case's own state
// mutation is unchanged — only the timing of render() after it moved.
// v65: Accessibility fix — uc-card-row (Dua/Ziyarat/Amal
// list rows, script-3-pages.js) now has role="button" tabindex="0" so keyboard
// users can reach them; a new delegated keydown listener (script-2-ui.js,
// [data-action][role="button"] → Enter/Space triggers .click(), existing
// click listener untouched) also incidentally fixes the same gap on the
// pre-existing imam-timeline-row, which already had data-action+role="button"
// but no keyboard handler. No visual/behavioral change for mouse users.
// v67: Removed the legacy assets/css/master-theme.css stylesheet and its
// service-worker precache entry. index.html now relies on the remaining CSS files. v63: Correction Step — fixed blurry/washed-out
// hero background pattern: regenerated hero-pattern-tile-dark/light.png at
// their actual display resolution with a steeper alpha curve (root cause
// was the browser upscaling a soft, low-alpha 201px source ~2.1x), raised
// pattern opacity slightly, steepened the center-fade transition band, and
// trimmed the glow overlay that was compounding the wash-out (style.css +
// both tile PNGs). v62: Step 5 Hero Final Polish — light-mode gold/
// tagline contrast fix, desktop prefers-reduced-motion coverage for hero
// orbs/particles/dots/star-twinkle/crescent-pulse, minor .hero-orb-3 CSS
// cleanup (style.css, script-2-ui.js). v61: Content update — added standalone Ziyarat of
// Imam Muhammad al-Jawad (a.s.) to data/duas/ziyarat.json and the matching
// lite-index entry in data/duas/metadata.json's `ziyarats` array (now 23
// total). Sourced from Duas.org / Sayyid Ibn Tawus's al-Mazar. Bengali
// translation is original. (A standalone Ziyarat for Ali Akbar was searched
// for but not added — no verified independent text exists in the classical
// collections; he is addressed within Ziyarat Ashura/al-Nahiya/al-Shuhada,
// already present on the site.) No JS/CSS/HTML logic changed in this pass.
// v60: Content update — added 2 more verified Ziyarat
// entries: Sayyida Ruqayya (s.a., Damascus) and a standalone Ziyarat of Imam
// Ali al-Rida (a.s.), to data/duas/ziyarat.json and the matching lite-index
// entries in data/duas/metadata.json's `ziyarats` array (now 22 total).
// Sourced from Mafatih al-Jinan (Sheikh Abbas Qummi) and Duas.org. Bengali
// translations are original. No JS/CSS/HTML logic changed in this pass.
// v59: Content update — added 3 new verified Ziyarat entries
// (Sayyida Zainab s.a., Sayyida Fatima al-Ma'suma s.a. of Qum, and Ziyarat
// al-Shuhada for the martyrs of Karbala) to data/duas/ziyarat.json and the
// matching lite-index entries in data/duas/metadata.json's `ziyarats` array,
// now with the COMPLETE verified text for all three (38 / 46 / 56 verses
// respectively) rather than the earlier excerpted selections.
// Arabic text and sourcing verified against Al-Islam.org (The Victory of
// Truth: The Life of Zaynab bint Ali by Muna Haeri Bilgrami; Lady Fatima
// Masuma (a) of Qum by Masuma Jaffer) and Duas.org (Ziyarat Nahiya page,
// "Ziyarat of Martyrs" section, traced to Ibn Tawus's Iqbal al-A'mal,
// al-Shaykh al-Mufid's al-Mazar, and Ibn al-Mashhadi's al-Mazar al-Kabir).
// Bengali translations are original, not copied from any single translator's
// copyrighted English rendering. No JS/CSS/HTML logic changed in this pass.
// v58: Step 9 — Page/route transition polish. Discovered changePage() (script-1-core.js) already implements a full vanilla-JS fade+translateY page transition (exit: opacity/translateY over a timed delay → render() swaps <main> → enter: fade+translateY back in via double-rAF) — the single dispatcher every nav path (desktop header, mobile bottom nav, feature cards, footer, sidebar links) already funnels through via the one `case 'changePage'` handler, so no new integration points were needed. Three small, scoped fixes to that existing function only: (1) tightened 160ms exit + 280ms enter (440ms total) → 130ms + 230ms (360ms total) to land inside the requested ~200–400ms window, same easing/approach; (2) added an explicit prefers-reduced-motion check (same matchMedia idiom already used in toggleMenu()) that skips the fade entirely — instant render, no transition — for reduced-motion users, on top of the pre-existing global `*{transition-duration:.01ms!important}` reduced-motion rule already in style.css; (3) added a pending-timer guard (window._pageTransitionTimer, cleared/reset at the top of changePage()) so rapid repeat navigation cancels the previous in-flight transition instead of stacking two render() calls and restarting the enter-fade mid-flight. Detail-view navigations that set state.currentPage directly (readPost/readDua/readAmal/readZiyarat, imamDetail, familyTree) were left untouched — they already get a smooth CSS `page-enter`/`fade-in` entrance (fadeInUp keyframe) from their own render template, and wrapping them in the same JS exit/enter cycle risked double-firing against their existing async content-loading flows (ensureDuaContent/ensureAmalContent). No routing rewrite, no framework, no build step — everything above is the site's existing vanilla-JS `changePage()`/`render()` pipeline, minimally adjusted.
// (Dua 15 When Sick, Dua 25 For his Children) sourced from Al-Islam.org/Duas.org —
// sahifa-sajjadiya.json 13 -> 15 entries.
// v35: Added 3 verified Sahifa al-Sajjadiyya duas
// (Dua 6 Morning/Evening, Dua 44 Coming of Ramadan, Dua 31 Repentance) sourced
// from Al-Islam.org — sahifa-sajjadiya.json 10 -> 13 entries.
// v34: Fixed PWA install icon — removed old placeholder
// SVG (green box + crescent) from manifest icons list so browsers use the real
// AHLULBAYT MARKAZ logo (icon-192.png / icon-512.png) on the install prompt.
// v33: Added 40 more duas (round 3, light top-up,
// ~2 per category) across all 20 dua category files — mostly Quran-sourced
// (Ayat al-Tathir for ahlul-bayt, Tahajjud verse for night, etc.), a couple
// of well-known prophetic duas (graveyard visit, istiftah tasbih). Only
// data/duas/*.json (all 20 category files) + data/duas/metadata.json
// touched, no JS logic changed. Bumped so returning/installed-PWA clients
// see the new duas.
// v32: Added 48 more duas (round 2, medium top-up)
// across all 20 dua category files this time — including ramadan/daily/
// hardship/special-days which round-1 skipped — mostly Quran-sourced, plus
// one verified Sahifa Sajjadiya dua 13 excerpt and a few well-known
// prophetic duas (iftar, entering home, new clothes, Eid takbir). Only
// data/duas/*.json (all 20 category files) + data/duas/metadata.json
// touched, no JS logic changed. Bumped so returning/installed-PWA clients
// see the new duas.
// v31: Added 42 new duas (Quran-sourced + Sahifa
// Sajjadiya 24 + two well-known prophetic dhikr) as a light top-up across
// the 16 thinnest dua categories (~2-3 each): ahlul-bayt, family,
// forgiveness, gratitude, hajj-umrah, healing, knowledge, morning, night,
// patience, protection, quranic, rizq, sahifa-sajjadiya, tasbih, zikr.
// Only data/duas/*.json (16 category files) + data/duas/metadata.json
// touched — no JS logic changed. Bumped so returning/installed-PWA clients
// see the new duas.
// v30: Dua tab's 21 category chips changed from
// 3 fixed rows of 7 (v29) to 7 default chips in a flex-wrap row (auto-fits
// per screen width on desktop/mobile) plus the other 14 behind a new
// "আরও দেখুন" (Show more) toggle button. New state field
// duaCatExpanded + new data-action toggleDuaCatExpanded (script-1-core.js,
// script-2-ui.js, script-3-pages.js). CSS/markup + one small state field
// only, no data files touched. Bumped so returning/installed-PWA clients
// pick up the JS change.
// v29: Dua tab's category-chip row (21
// categories) split into 3 fixed rows of 7 chips each
// (assets/js/core/script-3-pages.js, renderDuaPage) instead of one long
// horizontally-scrolling `.hscroll-fade` line from v28 — all 21 categories
// are now visible at a glance without scrolling to find them; each row
// still scrolls horizontally as a fallback on very narrow screens.
// CSS/markup only, no data files touched. Bumped so returning/installed-PWA
// clients pick up the JS change.
// v28: Fixed the dua/ziyarat/amal category chip rows (and the
// Ahlul Bayt jump-nav + tasbeeh dhikr selector, same pattern) — they scroll horizontally with
// the scrollbar hidden, so an overflowing row (e.g. all 21 dua categories) just looked cut
// off/broken with no hint more chips existed. Added a `.hscroll-fade` CSS class (mask-image
// fade on the right edge) to assets/css/style.css and applied it to all 5 occurrences in
// script-3-pages.js. Bumped so returning/installed-PWA clients pick up the CSS/JS change.
// v27: Removed the cream circular/pill background wrapper around
// the logo (splash screen in index.html; navbar dark-mode and footer in script-2-ui.js) since
// the new "Ahlulbayt Markaz" badge is already a self-framed circle — the old wrapper produced
// a double-circle/halo look. Logo now renders directly with border-radius:50%. Bumped so
// returning/installed-PWA clients pick up the updated HTML/JS.
// v26: Site logo replaced with new "Ahlulbayt Markaz" circular badge across
// assets/images/logo-mark.png, logo-full.png, logo-icon-512.png, favicon.ico,
// apple-touch-icon.png, icon-192.png, icon-512.png, icon-512-maskable.png (2026-08-15). Same
// filenames, new image bytes — bumped so returning/installed-PWA clients actually fetch the
// new logo instead of serving the old cached one indefinitely under the cache-first strategy
// below, per this project's existing convention.
// v25: Dua Library content completion, round 3 (2026-08-15) —
// added further verified, distinctly-sourced entries to 11 still-thin categories via
// data/duas/metadata.json + the respective data/duas/{category}.json: zikr (+2, Quranic
// dhikr: Dua Yunus 21:87, Hasbunallah 3:173 — previously left at 2 pending a verifiable
// addition), tasbih (+1, Tasbih al-Zahra per Al-Kafi), patience (+2, Quran 12:18 & 94:5-6),
// protection (+1, Ayat al-Kursi 2:255), healing (+1, Quran 26:80), knowledge (+1, Quran
// 20:114 "Rabbi zidni ilma"), rizq (+1, Quran 5:114), forgiveness (+1, Munajat al-Ta'ibin
// from the Fifteen Whispered Prayers appended to Sahifa Sajjadiya, incl. `verses`),
// family (+1, Quran 25:74), quranic (+2, Quran 20:25-28 & 43:13-14), sahifa-sajjadiya
// (+1, Dua 20 Makarim al-Akhlaq excerpt, incl. `verses`). All Arabic text verified against
// Al-Islam.org/Duas.org before inclusion; hajj-umrah and ahlul-bayt intentionally left
// untouched this round (no additional entry could be verified with confidence yet). No
// existing entries changed. Same file URLs precached below — bumped only so returning
// clients pick up the new content.
// v24: Dua Library content completion, round 2 (2026-08-15) —
// added a 3rd verified entry each to healing (Sahifa Dua 23), knowledge (Munajat al-'Arifin),
// and protection (Sahifa Dua 41), all via data/duas/metadata.json + the respective
// data/duas/{category}.json; zikr intentionally kept at 2 (no additional distinctly
// Shia-sourced short dhikr phrase could be verified). No existing entries changed. Same
// file URLs precached below — bumped only so returning clients pick up the new content.
// v23: Dua Library content completion (2026-08-15) — filled every
// previously empty/under-filled Dua category (ahlul-bayt, forgiveness, family, hajj-umrah,
// healing, knowledge, patience, protection, quranic, rizq, sahifa-sajjadiya, tasbih, zikr)
// with verified Shia-sourced entries; data/duas/metadata.json and the 13 affected
// data/duas/{category}.json files gained new dua entries only (no existing entries changed
// or removed). assets/js/core/script-3-pages.js's `catFilters` array (renderDuaPage) also
// gained buttons for those 13 categories, which previously had dedicated data files but no
// way to be selected in the UI. Same file URLs are precached below, no entries added/removed
// — bumped only so returning clients pick up the new dua content and filter buttons promptly,
// per this project's existing convention.
// v22: Phase D2.9 — added an `align-items: safe center`
// override (assets/css/style.css) for the 6 shared editor/login modal overlays
// (Admin Login, Blog Editor, Knowledge Editor, Dua/Ziyarat/Amal Editor, Muharram
// Editor, Shia Day Editor) so their header/footer/controls stay reachable on
// short viewports instead of being clipped by the flex-center+overflow-auto
// interaction. CSS-only, no markup/JS change, no data files touched.
// v21: Ahlul Bayt core data (masumeen/family-tree/biographies/companions) migrated from sync XHR to async fetch (2026-08-12, Phase 5 of the sync-XHR migration, per the 2026-08-11 audit) — assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js now loads data/ahlul-bayt/{family-tree,companions,masumeen,biographies}.json (~73KB total) concurrently via loadJSONAsync() (non-blocking) instead of loadJSONSync(); masumeen/imams/familyTreeLineage/familyTreeDatabase/ADDITIONAL_PERSONALITIES keep the same references and start empty, filled in place once all four resolve; new ahlulBaytDataLoadState ('loading'|'loaded'|'error') lets renderImamsPage() (script-3-pages.js) and renderFamilyTreePage() (script-4-boot.js) show a lightweight loading message instead of a blank/broken page during that window; validateFamilyTreeData() — previously called eagerly against the empty {} placeholder — now only runs once biographies.json has actually resolved; renderFamilyTree()/_resolveFamilyTreePerson() (script-4-boot.js) hardened to recognize an empty-but-truthy familyTreeDatabase as not-yet-ready. quotes.json/timeline.json/events.json/metadata.json unchanged (already lazy or out of scope). Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v20: Dua Library lite-index loading migrated from sync XHR to async fetch (2026-08-11, Phase 4 of the sync-XHR migration) — assets/js/data/duas-data.js now loads data/duas/metadata.json (~168KB) via loadJSONAsync() (non-blocking) instead of loadJSONSync(); duas/ziyarats/amals keep the same array references and start empty, filled in place (still sorted by originalIndex) once metadata.json resolves; new duasIndexLoadState ('loading'|'loaded'|'error') lets assets/js/core/script-3-pages.js's renderDuaPage() show a lightweight skeleton or error state instead of a blank/broken page during that window; the existing lazy loadDuaCategory()/loadZiyarats()/loadAmals()/ensureDuaContent()/ensureZiyaratContent()/ensureAmalContent() loading is unchanged apart from now awaiting the index first. Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v19: Knowledge Center lite-index loading migrated from sync XHR to async fetch (2026-08-11, Phase 3 of the sync-XHR migration) — assets/js/data/knowledge-center-data.js now loads data/knowledge/{categories,metadata}.json via loadJSONAsync() (non-blocking) instead of loadJSONSync(); kcHadithCategories/kcMasailCategories/kcQaCategories/kcMaraji/kcHadiths/kcMasail/kcQa/kcFatwa keep the same array references and start empty, filled in place once both files resolve; new kcIndexLoadState ('loading'|'loaded'|'error') lets assets/js/modules/knowledge/knowledge-center.js's renderKnowledgeCenterPage() show a lightweight skeleton or error state instead of a blank/broken page during that window; the existing per-section loadKcSection()/ensureKcItemContent() lazy loading is unchanged apart from now awaiting the index first. Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v18: Quiz data-loading migrated from sync XHR to async fetch (2026-08-11, Phase 2 of the sync-XHR migration) — assets/js/data/quiz-data.js now loads data/quiz/{categories,questions}.json via loadJSONAsync() (non-blocking) instead of loadJSONSync(); script-1-core.js's getHomeQuizIndex() guarded against dividing by a not-yet-loaded empty quizQuestions array; script-3-pages.js's quiz setup screen now distinguishes loading/error/empty states. Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v17: Blog data-loading migrated from sync XHR to async fetch (2026-08-11, Phase 1 of the sync-XHR migration) — assets/js/utils/data-loader.js gained loadJSONAsync() (additive, loadJSONSync() untouched), assets/js/modules/blog/blog.js now loads data/blog-posts.json non-blocking. Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v16: duplicate JS cleanup (2026-08-11) — removed dead Imams/Family-Tree/search duplicates from ahlul-bayt-unified.js, script-3-pages.js, knowledge-center.js
// v15: quiz feature rewrite (2026-08-09) added
// assets/js/data/quiz-data.js + data/quiz/{categories,questions}.json —
// added below to STATIC so the quiz still works on a first-ever OFFLINE
// visit, matching the same reasoning already documented for duas/knowledge
// center's data files. Bumped so returning clients pick up the new quiz
// code+content promptly instead of waiting on stale-while-revalidate's
// one-visit lag.
// NOTE (2026-07-23): paths updated to match the reorganized assets/ + data/
// folder structure. Old entries (./script.js, ./family-tree-data.js) removed
// since those files no longer exist — script.js was split into 4 files under
// assets/js/core/, family-tree-data.js was merged into ahlul-bayt-unified.js.
// './manifest.json' removed (2026-07-23) — the manifest was generated at
// runtime as a Blob URL. RE-ADDED (v68) as a real static file — the Blob
// approach meant no manifest existed until JS ran (or at all, if the
// try/catch silently failed), which hurt installability and couldn't be
// precached for offline. See STATIC list below.
// NOTE (2026-07-26): data/*.json single-file blobs (ahlul-bayt.json, duas.json,
// knowledge-center.json, posts.json) removed — each was split into the
// per-category files under data/ahlul-bayt/, data/duas/, and data/knowledge/
// listed below (folders were also renamed from the mistaken "data ahlul-bayt"/
// "data duas"/"data knowledge" to match the paths duas-data.js,
// knowledge-center-data.js, and ahlul-bayt-unified.js actually request). Also
// added the missing ./assets/js/core/search-engine.js, which index.html loads
// but this list never included. CACHE bumped to v5 so old clients drop the
// stale files.
const STATIC = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/css/animations.css',
    './assets/js/utils/data-loader.js',
    './assets/js/data/duas-data.js',
    './assets/js/data/knowledge-center-data.js',
    './assets/js/data/quiz-data.js',
    './assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js',
    './assets/js/modules/blog/blog.js',
    './assets/js/modules/knowledge/knowledge-center.js',
    './assets/js/core/script-1-core.js',
    './assets/js/core/script-2-ui.js',
    './assets/js/core/script-3-pages.js',
    './assets/js/core/script-4-boot.js',
    './assets/js/core/search-engine.js',
    './assets/js/core/world-map.js',
    './assets/js/core/editor-modal.js',
    './assets/js/core/phase4-animations.js',
    './data/blog-posts.json',
    './data/ahlul-bayt/biographies.json',
    './data/ahlul-bayt/companions.json',
    './data/ahlul-bayt/events.json',
    './data/ahlul-bayt/family-tree.json',
    './data/ahlul-bayt/masumeen.json',
    './data/ahlul-bayt/metadata.json',
    './data/ahlul-bayt/quotes.json',
    './data/ahlul-bayt/timeline.json',
    './data/duas/ahlul-bayt.json',
    './data/duas/amal.json',
    './data/duas/daily.json',
    './data/duas/family.json',
    './data/duas/forgiveness.json',
    './data/duas/hajj-umrah.json',
    './data/duas/hardship.json',
    './data/duas/healing.json',
    './data/duas/knowledge.json',
    './data/duas/metadata.json',
    './data/duas/morning.json',
    './data/duas/night.json',
    './data/duas/patience.json',
    './data/duas/protection.json',
    './data/duas/quranic.json',
    './data/duas/ramadan.json',
    './data/duas/rizq.json',
    './data/duas/sahifa-sajjadiya.json',
    './data/duas/special-days.json',
    './data/duas/tasbih.json',
    './data/duas/zikr.json',
    './data/duas/ziyarat.json',
    './data/knowledge/categories.json',
    './data/knowledge/fatwa.json',
    './data/knowledge/hadith.json',
    './data/knowledge/masail.json',
    './data/knowledge/metadata.json',
    './data/knowledge/qa.json',
    './data/quiz/categories.json',
    './data/quiz/questions.json',
    './offline.html',
    './manifest.json',
    './favicon.ico',
    './apple-touch-icon.png',
    './icon-192.png',
    './icon-512.png',
    './icon-512-maskable.png'
];
const FONT_CACHE = 'ahlbayt-fonts-v1';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => {
            // {cache:'reload'} forces a real network round-trip, bypassing
            // the browser's own HTTP cache (separate from this Cache
            // Storage API bucket) — c.add()/c.addAll() would otherwise
            // honor normal HTTP caching for their internal fetch, so a
            // fresh CACHE *name* alone doesn't guarantee fresh *content*.
            // This is why bumping CACHE wasn't enough on mobile: the new
            // bucket could still get populated with a stale HTTP-cached
            // copy of style.css/script-3-pages.js/etc.
            return Promise.allSettled(STATIC.map(url =>
                fetch(url, { cache: 'reload' })
                    .then(res => { if (res && res.ok) return c.put(url, res); })
                    .catch(() => {})
            ));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);

    // Google Fonts → cache-first
    if (url.hostname.includes('fonts.g')) {
        e.respondWith(caches.open(FONT_CACHE).then(c =>
            c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
                c.put(e.request, res.clone()); return res;
            }))
        ));
        return;
    }

    // AlAdhan prayer API → network-first, fallback to cache
    if (url.hostname.includes('aladhan')) {
        e.respondWith(
            fetch(e.request).then(res => {
                // Clone MUST happen synchronously, in this same tick, before
                // the original `res` is returned and its body potentially
                // starts being read by the page. caches.open() is async, so
                // calling res.clone() only after it resolves risks the body
                // already being "used" — throwing "Failed to execute
                // 'clone' on 'Response': Response body is already used".
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return res;
            }).catch(() => caches.match(e.request))
        );
        return;
    }

    // data/*.json → never intercept.
    // UPDATED (per the 2026-08-12 Final Performance & Regression Audit):
    // the original reasoning here — that knowledge-center-data.js,
    // duas-data.js, and ahlul-bayt-unified.js load these files via
    // SYNCHRONOUS XHR at boot, risking a deadlock between that sync XHR and
    // this SW's async respondWith()/Promise chain — is no longer accurate.
    // All five data-loading modules (Blog, Quiz, Knowledge Center, Dua,
    // Ahlul Bayt) have since been migrated to loadJSONAsync()/fetch(), so
    // the sync-XHR deadlock scenario that originally motivated this bypass
    // no longer applies to any of them.
    // This bypass is intentionally being left in place for now regardless:
    // migrated data currently loads straight from network / the browser's
    // own HTTP cache rather than being served from this SW's cache, and
    // re-enabling cache-first handling here would be a caching-behavior
    // change that needs its own dedicated testing phase, not a documentation
    // update. Do not remove or modify this bypass as part of a comment-only
    // change — treat this note as a pointer to a future phase, not an
    // instruction to act now. They're still precached in STATIC above for
    // install-time warmup; they just aren't served *from* that cache at
    // fetch time.
    if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
        return;
    }

    // Everything else → stale-while-revalidate (+ offline fallback for page navigations)
    e.respondWith(
        caches.match(e.request).then(cached => {
            const net = fetch(e.request).then(res => {
                if (res && res.status === 200 && res.type !== 'opaque') {
                    // Same fix as the AlAdhan branch above: clone
                    // synchronously, before `return res` hands the original
                    // off for consumption, so caches.open()'s async delay
                    // can never race against the body being read/locked.
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, copy));
                }
                return res;
            }).catch(() => {
                if (cached) return cached;
                if (e.request.mode === 'navigate') return caches.match('./offline.html');
                return undefined;
            });
            return cached || net;
        })
    );
});

// Background sync for offline actions
self.addEventListener('message', e => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
