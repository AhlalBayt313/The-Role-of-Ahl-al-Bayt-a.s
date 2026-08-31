// ============================================================================
// AHLUL BAYT — UNIFIED PAGE (Masumeen + Family Tree merge)
// ============================================================================

// ----------------------------------------------------------------------------
// Phase 5 (2026-07-26): the datasets below (ADDITIONAL_PERSONALITIES,
// familyTreeDatabase, familyTreeLineage, masumeen, imams) were split out of
// the single data/ahlul-bayt.json into smaller, purpose-named files under
// data/ahlul-bayt/ (masumeen.json, family-tree.json, biographies.json,
// companions.json). Originally these were all loaded synchronously via
// loadJSONSync() — see the 2026-08-12 update note directly below for the
// current (async) loading model. Every const further down (whether at top
// level or inside the installAhlulBaytFallback() IIFE below) still reads
// __ahlulBaytData via closure exactly as before — no change to scope or the
// fallback/global-install logic in that IIFE.
//
// Two datasets are genuinely lazy (see loadAhlulBaytSection below):
// quotes.json and timeline.json are precomputed convenience caches that no
// existing function reads yet, so they only fetch on explicit request.
//
// events.json is intentionally left empty — the real historical/Muharram
// events dataset (getAllHistoryDays(), the "ইতিহাসে আজ" widget) lives in
// script-4-boot.js, which is out of scope for this phase.
//
// 2026-08-12 update (Phase 5 of the sync-XHR migration, per the 2026-08-11
// audit): masumeen.json/family-tree.json/biographies.json/companions.json
// now load via loadJSONAsync() (data-loader.js, Phase 1) instead of
// loadJSONSync(), so this ~73KB no longer blocks app boot. masumeen/imams/
// familyTreeLineage/familyTreeDatabase/ADDITIONAL_PERSONALITIES keep the
// exact same references — they're `const` further down and read by closure
// from several other files (script-1-core.js, script-2-ui.js,
// script-3-pages.js, script-4-boot.js, search-engine.js) — so they start
// EMPTY ([]/{}) and are filled IN PLACE (push()/Object.assign()) once the
// four files resolve, exactly like blogPosts (Phase 1), quizQuestions/
// quizCategories (Phase 2), the Knowledge Center's kc* arrays (Phase 3), and
// duas/ziyarats/amals (Phase 4). New `ahlulBaytDataLoadState`
// ('loading'|'loaded'|'error') lets renderImamsPage() (script-3-pages.js)
// and renderFamilyTreePage() (script-4-boot.js) show a lightweight loading
// message instead of a blank/broken page during that window — mirroring
// duasIndexLoadState/kcIndexLoadState/quizDataLoadState/blogPostsLoadState.
// The critical Family Tree safeguard: validateFamilyTreeData() — previously
// called eagerly at IIFE top-level, i.e. against the empty {} placeholder —
// now only ever runs once biographies.json has actually resolved into
// familyTreeDatabase (see __ahlulBaytCoreDataReady below). Nothing about the
// four files' request order matters for correctness, so they load
// concurrently via Promise.all rather than serialized.
const __ahlulBaytFiles = {
  masumeen: 'data/ahlul-bayt/masumeen.json',
  familyTree: 'data/ahlul-bayt/family-tree.json',
  biographies: 'data/ahlul-bayt/biographies.json',
  companions: 'data/ahlul-bayt/companions.json',
  quotes: 'data/ahlul-bayt/quotes.json',
  timeline: 'data/ahlul-bayt/timeline.json',
  events: 'data/ahlul-bayt/events.json',
};

// Public arrays/objects — SAME reference for the lifetime of the page (see
// update note above). All start EMPTY; loadAhlulBaytCoreDataAsync() below
// fills them in place once each file resolves.
const __ahlulBaytData = {
  masumeen: [],
  imams: [],
  familyTreeLineage: {},
  familyTreeDatabase: {},
  additionalPersonalities: [],
};

// 'loading' | 'loaded' | 'error' — mirrors duasIndexLoadState (Phase 4) /
// kcIndexLoadState (Phase 3) / quizDataLoadState (Phase 2) / blogPostsLoadState (Phase 1).
let ahlulBaytDataLoadState = 'loading';
if (typeof window !== 'undefined') window.ahlulBaytDataLoadState = ahlulBaytDataLoadState;

// ---- Phase 5: async boot load of the four core Ahlul Bayt data files -----
// Fetches family-tree.json / companions.json / masumeen.json /
// biographies.json concurrently via loadJSONAsync(), fills the public
// masumeen/imams/familyTreeLineage/familyTreeDatabase/
// ADDITIONAL_PERSONALITIES references IN PLACE (never reassigned — they're
// declared `const` further down), and only then runs
// validateFamilyTreeData() — never against the empty {} placeholder that
// exists before this resolves. __ahlulBaytCoreDataReady is exposed so any
// future caller can await "the four core files have settled" the same way
// duas-data.js's __indexReady is awaited before per-category loads.
const __ahlulBaytCoreDataReady = (function loadAhlulBaytCoreDataAsync() {
  if (typeof loadJSONAsync !== 'function') {
    // Extremely defensive fallback — should never happen since
    // data-loader.js always loads before ahlul-bayt-unified.js (see index.html).
    ahlulBaytDataLoadState = 'error';
    if (typeof window !== 'undefined') window.ahlulBaytDataLoadState = ahlulBaytDataLoadState;
    return Promise.resolve();
  }

  return Promise.all([
    loadJSONAsync(__ahlulBaytFiles.familyTree),
    loadJSONAsync(__ahlulBaytFiles.companions),
    loadJSONAsync(__ahlulBaytFiles.masumeen),
    loadJSONAsync(__ahlulBaytFiles.biographies),
  ]).then(([familyTreeJson, companionsJson, masumeenFileJson, biographiesJson]) => {
    if (familyTreeJson) Object.assign(__ahlulBaytData.familyTreeLineage, familyTreeJson);
    if (companionsJson) __ahlulBaytData.additionalPersonalities.push(...companionsJson);
    if (masumeenFileJson) {
      if (Array.isArray(masumeenFileJson.masumeen)) __ahlulBaytData.masumeen.push(...masumeenFileJson.masumeen);
      if (Array.isArray(masumeenFileJson.imams)) __ahlulBaytData.imams.push(...masumeenFileJson.imams);
    }

    let biographiesOk = false;
    if (biographiesJson) {
      Object.assign(__ahlulBaytData.familyTreeDatabase, biographiesJson);
      biographiesOk = true;
    }

    const allOk = !!(familyTreeJson && companionsJson && masumeenFileJson && biographiesJson);
    ahlulBaytDataLoadState = allOk ? 'loaded' : 'error';
    if (typeof window !== 'undefined') window.ahlulBaytDataLoadState = ahlulBaytDataLoadState;

    // FAMILY TREE VALIDATION FIX (Phase 5): only ever validate the real,
    // populated familyTreeDatabase — never the empty {} placeholder that
    // existed before this fetch resolved. Skipped entirely if
    // biographies.json failed to load (nothing meaningful to validate).
    if (biographiesOk && typeof validateFamilyTreeData === 'function') {
      try { validateFamilyTreeData(); } catch (e) { /* non-fatal */ }
    }

    // Only re-render if the user is currently on a page/tab that reads this
    // data — never trigger a global re-render while they're elsewhere.
    // 'dua' covers the Ziyarat tab (state.duaTab==='ziyarat'), which also
    // reads masumeen/imams. Mirrors the exact guard used by Blog/Quiz/
    // Knowledge Center/Dua.
    if (
      typeof state !== 'undefined' &&
      typeof render === 'function' &&
      ['imams', 'familyTree', 'ahlulBaytUnified', 'dua', 'imamDetail'].indexOf(state.currentPage) !== -1
    ) {
      render();
    }
  });
})();

// ---- genuinely lazy loading + cache + retry for the new convenience data ---
// section name -> Promise<Array> (in-flight or resolved; prevents duplicate
// fetches even if called from multiple places).
const __ahlulBaytSectionCache = Object.create(null);

function __ahlulBaytSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch + parse JSON with up to 3 tries and a short backoff. Never throws in
// a way that blanks the page — returns null on total failure (with a
// friendly console warning) so callers can fall back gracefully.
async function __fetchAhlulBaytJSON(url, attempts = 3) {
  let lastErr = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (i < attempts) await __ahlulBaytSleep(600 * i);
    }
  }
  console.warn(
    '[ahlul-bayt-unified] Failed to load "' + url + '" after ' + attempts +
    ' attempts — এই অংশের তথ্য লোড করা যায়নি, দয়া করে আবার চেষ্টা করুন।',
    lastErr
  );
  return null;
}

// loadAhlulBaytSection('quotes' | 'timeline' | 'masumeen' | 'familyTree' |
// 'biographies' | 'companions' | 'events') -> Promise<Array|Object>.
// For 'quotes'/'timeline' (not loaded at boot) this is a true lazy fetch,
// cached after first call. For the other sections (already loaded eagerly
// above for compatibility) this simply resolves with the same in-memory
// data with no extra network request.
function loadAhlulBaytSection(section) {
  if (__ahlulBaytSectionCache[section]) return __ahlulBaytSectionCache[section];

  const alreadyLoaded = {
    masumeen: __ahlulBaytData.masumeen,
    familyTree: __ahlulBaytData.familyTreeLineage,
    biographies: __ahlulBaytData.familyTreeDatabase,
    companions: __ahlulBaytData.additionalPersonalities,
  };
  if (section in alreadyLoaded) {
    __ahlulBaytSectionCache[section] = Promise.resolve(alreadyLoaded[section]);
    return __ahlulBaytSectionCache[section];
  }

  const url = __ahlulBaytFiles[section];
  if (!url) return Promise.resolve(section === 'events' ? [] : null);

  __ahlulBaytSectionCache[section] = __fetchAhlulBaytJSON(url).then((data) => data || (section === 'events' ? [] : null));
  return __ahlulBaytSectionCache[section];
}

if (typeof window !== 'undefined') {
  window.loadAhlulBaytSection = loadAhlulBaytSection;
}
// SCOPE OF THIS FILE (Section 1 + Section 2 approved 2026-07-17, Section 3 +
// Section 4 approved 2026-07-22):
//   ✔ Premium Hero
//   ✔ Subtitle
//   ✔ Explore by Category (quick-nav chips)
//   ✔ Quick Statistics cards
//   ✔ Tabs content (personalities grid / family tree) — Section 2
//   ✔ Side profile panel — Section 3
//   ✔ Smart Search wiring — Section 3
//   ✔ Backward-compatible imams/familyTree redirects — Section 4 (see notes
//     at bottom; browser back/forward has no app-wide equivalent to hook
//     into — see that note for why)
//
// SECTION 2 APPROACH:
//   The "চৌদ্দ মাসুম (আ)" tab and the "বংশবৃক্ষ" tab do NOT reimplement any
//   card/grid/modal markup. They simply call the existing, already-shipped
//   page renderers — renderImamsPage() for the 14-Masumeen grid and
//   renderFamilyTreePage() for the lineage tree — and drop their returned
//   HTML straight into the active tab panel. Every card, click handler
//   (imamFlip, showPersonDetail, initFamilyTree, etc.) keeps working exactly
//   as it already does on the standalone /imams and /familyTree pages, with
//   zero duplicated logic and zero new data.
//
// HARD RULES FOLLOWED:
//   - Does not redefine, rename, or remove any existing function, CSS class,
//     or id (renderImamsPage, renderFamilyTreePage, showPersonDetail,
//     scrollToImamEl, changePage, initFamilyTree, family-tree-container, etc.
//     are all left completely untouched).
//   - Reads existing data (masumeen, imams, familyTreeDatabase,
//     getGeneration, getFamilyLinks, getAllHistoryDays) — introduces no new
//     data model and no new historical/genealogical claims.
//   - All new identifiers are prefixed `ahlulBayt*` / `.ab-*` to guarantee
//     zero collision with existing globals or classes.
// ============================================================================

// ── Additive state (merged onto the existing global `state`, only if absent) ──
// Not placed inside script-1-core.js's state literal on purpose: this keeps
// script-1-core.js completely untouched for Section 1. If/when this file is
// promoted into the core bundle later, these can be folded into state{} —
// that's a Section-4/router-integration decision, not this one.
if (typeof state !== 'undefined') {
    if (typeof state.ahlulBaytActiveCategory === 'undefined') state.ahlulBaytActiveCategory = null;
    if (typeof state.ahlulBaytStatsAnimated === 'undefined') state.ahlulBaytStatsAnimated = false;
    // Section 2: which tab panel is currently showing. 'masumeen' = the 14
    // Masumeen personalities grid, 'tree' = the Ahl al-Bayt lineage tree,
    // null = neither clicked yet — no panel shown below the tab bar.
    if (typeof state.ahlulBaytActiveTab === 'undefined') state.ahlulBaytActiveTab = null;
    // Section 3: current text in the Smart Search box, and the currently
    // previewed person in the side profile panel — { source, id } where
    // source is 'masumeen' | 'imam' | 'extra'. null = nothing selected yet.
    if (typeof state.ahlulBaytSearchQuery === 'undefined') state.ahlulBaytSearchQuery = '';
    if (typeof state.ahlulBaytSelectedPerson === 'undefined') state.ahlulBaytSelectedPerson = null;
}

// ============================================================================
// STATS (read-only aggregation over EXISTING data — no new business logic)
// ============================================================================
// Every number below is derived from arrays/functions that already exist
// elsewhere in the app (script-1-core.js: masumeen, imams;
// family-tree-data.js: familyTreeDatabase, getGeneration, getFamilyLinks;
// script-4-boot.js: getAllHistoryDays). Nothing here invents new content.
function getAhlulBaytQuickStats(l) {
    const safeLen = (arr) => (Array.isArray(arr) ? arr.length : 0);

    const totalPersonalities = safeLen(typeof masumeen !== 'undefined' ? masumeen : null)
        + safeLen(typeof imams !== 'undefined' ? imams : null);

    const totalMasumeen = totalPersonalities; // 14 Masumeen = Prophet + Fatima + 12 Imams

    let totalGenerations = 0;
    if (typeof getGeneration === 'function' && typeof familyTreeLineage !== 'undefined') {
        const ids = Object.keys(familyTreeLineage);
        totalGenerations = ids.reduce((max, id) => {
            const g = getGeneration(isNaN(Number(id)) ? id : Number(id));
            return typeof g === 'number' && g > max ? g : max;
        }, 0);
    }

    let historicalEvents = 0;
    if (typeof getAllHistoryDays === 'function') {
        try { historicalEvents = safeLen(getAllHistoryDays(l || 'bn')); } catch (e) { historicalEvents = 0; }
    }

    let familyRelationships = 0;
    if (typeof getFamilyLinks === 'function' && typeof familyTreeLineage !== 'undefined') {
        const ids = Object.keys(familyTreeLineage).map(id => (isNaN(Number(id)) ? id : Number(id)));
        const rawTotal = ids.reduce((sum, id) => {
            const links = getFamilyLinks(id);
            return sum + links.parents.length + links.children.length + links.spouse.length + links.siblings.length;
        }, 0);
        familyRelationships = Math.round(rawTotal / 2); // each edge counted from both sides
    }

    return {
        totalPersonalities,
        totalMasumeen,
        totalGenerations,
        historicalEvents,
        familyRelationships
    };
}

// ============================================================================
// SECTION 1a — PREMIUM HERO
// ============================================================================
function renderAhlulBaytHero() {
    const d = state.darkMode, l = state.language;

    const title = l === 'bn' ? 'আহলুল বাইত (আ)' : 'Ahlul Bayt (AS)';
    const titleSub = l === 'bn' ? 'বংশপরম্পরা ও পবিত্র ব্যক্তিত্ব' : 'Lineage & Sacred Personalities';
    const subtitle = l === 'bn'
        ? 'আহলুল বাইত (আ)-এর পবিত্র ব্যক্তিত্ব, বংশপরম্পরা, পারিবারিক সম্পর্ক এবং ঐতিহাসিক পরিচয় একত্রে অনুসন্ধান করুন।'
        : "Explore the Ahlul Bayt's (AS) sacred personalities, lineage, family relationships, and historical identity — all in one place.";

    return `
    <div class="ab-hero reveal" style="position:relative;overflow:hidden;border-radius:var(--r-xl);
        padding:clamp(2rem,6vw,3.5rem) clamp(1.25rem,5vw,3rem);
        background:${d
            ? 'linear-gradient(145deg, rgba(6,20,16,.92), rgba(10,26,14,.88))'
            : 'linear-gradient(145deg, rgba(255,255,255,.86), rgba(248,247,243,.78))'};
        border:1px solid ${d ? 'rgba(52,211,153,.14)' : 'rgba(5,150,105,.12)'};
        box-shadow:var(--shadow-xl);
        backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)">

        <!-- Islamic geometric decoration (pure CSS/SVG, decorative only) -->
        <div class="ab-hero-geo" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;opacity:${d?0.16:0.10}">
            <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <pattern id="abGeoPattern" width="80" height="80" patternUnits="userSpaceOnUse">
                        <path d="M40 4 L76 40 L40 76 L4 40 Z" fill="none" stroke="var(--gold-500)" stroke-width="1"/>
                        <circle cx="40" cy="40" r="6" fill="none" stroke="var(--emerald-500)" stroke-width="1"/>
                    </pattern>
                </defs>
                <rect width="800" height="400" fill="url(#abGeoPattern)"/>
            </svg>
        </div>

        <div style="position:relative;z-index:2;text-align:center;max-width:780px;margin:0 auto">
            <h1 class="font-black" style="font-size:clamp(1.9rem,6vw,3rem);line-height:1.15;
                background:linear-gradient(135deg,var(--gold-500),var(--emerald-600),var(--gold-600));
                -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
                margin-bottom:.4rem">
                👑 ${title}
            </h1>
            <p class="font-bold" style="font-size:clamp(1rem,2.6vw,1.35rem);color:${d?'#e5e7eb':'#1f2937'};margin-bottom:.9rem">
                ${titleSub}
            </p>
            <p style="font-size:clamp(.85rem,2vw,1rem);line-height:1.75;color:${d?'#9ca3af':'#6b7280'};margin:0 auto 1.75rem">
                ${sanitize(subtitle)}
            </p>

            <!-- Universal Person Search — UI placeholder only, not wired to
                 existing search logic yet (Smart Search integration is
                 explicitly out of scope for Section 1) -->
            <div class="ab-hero-search" style="position:relative;max-width:480px;margin:0 auto">
                <span style="position:absolute;left:16px;top:50%;transform:translateY(-50%);opacity:.55;pointer-events:none" aria-hidden="true">🔍</span>
                <input type="text" id="ab-hero-search-input" disabled
                    placeholder="${l==='bn'?'ব্যক্তিত্ব খুঁজুন (শীঘ্রই আসছে)...':'Search personalities (coming soon)...'}"
                    style="width:100%;padding:13px 16px 13px 44px;border-radius:50px;font-size:.9rem;
                        border:1.5px solid ${d?'rgba(255,255,255,.14)':'rgba(0,0,0,.08)'};
                        background:${d?'rgba(255,255,255,.05)':'rgba(255,255,255,.7)'};
                        color:${d?'#f9fafb':'#111827'};cursor:not-allowed"
                    aria-label="${l==='bn'?'ব্যক্তিত্ব খুঁজুন':'Search personalities'}">
            </div>
            <p style="font-size:.7rem;margin-top:.5rem;opacity:.55">
                ${l==='bn'?'🔧 সার্চ পরবর্তী ধাপে সক্রিয় হবে':'🔧 Search will be wired up in a later step'}
            </p>
        </div>
    </div>`;
}

// ============================================================================
// SECTION 1b — EXPLORE BY CATEGORY
// ============================================================================
// Each chip calls ahlulBaytHandleCategoryClick(key) — a safe, defensive
// dispatcher (defined below) that only acts on DOM/tabs that already exist.
// Until Section 2/3 wire up the tab content, clicking a chip is a no-op
// (never throws, never silently "does something wrong").
function renderAhlulBaytCategoryChips() {
    const d = state.darkMode, l = state.language;

    const CATEGORIES = [
        { key: 'masumeen',  icon: '👑', bn: 'চৌদ্দ মাসুম (আ)',      en: '14 Masumeen (AS)' },
        { key: 'male',      icon: '👨', bn: 'পুরুষ ব্যক্তিত্ব',      en: 'Male Personalities' },
        { key: 'female',    icon: '👩', bn: 'নারী ব্যক্তিত্ব',       en: 'Female Personalities' },
        { key: 'tree',      icon: '🌳', bn: 'বংশবৃক্ষ',             en: 'Family Tree' },
        { key: 'timeline',  icon: '📅', bn: 'ঐতিহাসিক টাইমলাইন',    en: 'Historical Timeline' },
        { key: 'places',    icon: '🕌', bn: 'গুরুত্বপূর্ণ স্থান',     en: 'Important Places' },
    ];

    const chips = CATEGORIES.map(cat => `
        <button type="button"
            class="ab-category-chip"
            data-ab-category="${cat.key}"
            onclick="ahlulBaytHandleCategoryClick('${cat.key}')"
            style="display:flex;align-items:center;gap:7px;flex-shrink:0;
                padding:10px 18px;border-radius:50px;font-size:.82rem;font-weight:700;
                white-space:nowrap;cursor:pointer;transition:all .2s;
                border:1.5px solid ${d?'rgba(201,162,39,.32)':'rgba(180,83,9,.22)'};
                background:${d?'rgba(201,162,39,.08)':'rgba(180,83,9,.05)'};
                color:${d?'#fde68a':'#92400e'}"
            onmouseover="this.style.background='${d?'rgba(201,162,39,.18)':'rgba(180,83,9,.12)'}';this.style.transform='translateY(-2px)'"
            onmouseout="this.style.background='${d?'rgba(201,162,39,.08)':'rgba(180,83,9,.05)'}';this.style.transform=''">
            <span aria-hidden="true">${cat.icon}</span>
            <span>${l==='bn'?cat.bn:cat.en}</span>
        </button>`).join('');

    return `
    <div class="ab-category-section reveal" style="margin-top:1.25rem">
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:4px 1px 8px">
            <div style="display:flex;gap:10px;width:max-content;margin:0 auto">${chips}</div>
        </div>
    </div>`;
}

// Defensive click dispatcher — intentionally minimal for Section 1.
// Design notes for later sections (kept here so Section 2/3 don't have to
// rediscover this): once tab content exists, this function is the natural
// place to (a) call the *existing* changePage/tab-switch pattern, (b) wait
// for the next paint, then (c) call the *existing* scrollToImamEl (or an
// equivalent for family-tree nodes) — satisfying the "activate tab → wait →
// scroll → highlight" requirement without duplicating that logic here.
function ahlulBaytHandleCategoryClick(categoryKey) {
    if (typeof state !== 'undefined') state.ahlulBaytActiveCategory = categoryKey;

    // Section 2: these categories now have real tab content — route
    // straight to the tab switcher instead of the generic scroll-to-anchor
    // fallback below.
    if (categoryKey === 'masumeen' || categoryKey === 'tree' || categoryKey === 'male' || categoryKey === 'female' || categoryKey === 'timeline' || categoryKey === 'places') {
        ahlulBaytSwitchTab(categoryKey);
        return;
    }

    const targetId = 'ab-target-' + categoryKey;
    const el = document.getElementById(targetId);
    if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    // no other categories remain unwired — this is now just a safety net.
}

// ============================================================================
// SECTION 2 — TABS (Personalities grid / Family tree)
// ============================================================================
// The category chips above (renderAhlulBaytCategoryChips) are the only
// switcher now — the separate 2-button tab bar that used to sit here was
// removed 2026-07-17 (redundant with the chips, confusing to have both).
// ahlulBaytSwitchTab() is still the single place that updates state and
// re-renders; renderAhlulBaytTabPanel() (below) is still the single place
// that decides which page renderer to call.

// Switches the active tab and asks the app's existing global render() to
// redraw. render() is the same function every other page on this app
// already relies on (see script-4-boot.js) — nothing new is introduced.
function ahlulBaytSwitchTab(tabKey) {
    if (typeof state === 'undefined') return;
    if (state.ahlulBaytActiveTab === tabKey) return;
    state.ahlulBaytActiveTab = tabKey;
    state.ahlulBaytActiveCategory = tabKey;
    if (typeof render === 'function') render();

    // Bring the panel into view after it has painted, so a tap on a
    // category chip further down the page doesn't leave the user looking
    // at unrelated content.
    setTimeout(() => {
        const el = document.getElementById('ab-tab-panel-anchor');
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 0);
}

// Delegates entirely to the existing, already-shipped page renderers — see
// the "SECTION 2 APPROACH" note at the top of this file for why.
function renderAhlulBaytTabPanel() {
    const d = state.darkMode, l = state.language;
    const active = state.ahlulBaytActiveTab || null;

    if (active === 'tree') {
        return typeof renderFamilyTreePage === 'function'
            ? renderFamilyTreePage()
            : `<p style="text-align:center;padding:2rem;color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'বংশবৃক্ষ লোড হচ্ছে...':'Family tree loading...'}</p>`;
    }

    if (active === 'masumeen') {
        return typeof renderImamsPage === 'function'
            ? renderImamsPage()
            : `<p style="text-align:center;padding:2rem;color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'মাসুমিনদের তথ্য লোড হচ্ছে...':'Masumeen data loading...'}</p>`;
    }

    if (active === 'male') return renderGenderedPersonalitiesPage('male');
    if (active === 'female') return renderGenderedPersonalitiesPage('female');
    if (active === 'timeline') return renderAhlulBaytTimelinePage();
    if (active === 'places') return renderAhlulBaytPlacesPage();

    // Neither tab clicked yet — show a neutral prompt, not either panel's content.
    return `
    <div style="text-align:center;padding:2.5rem 1rem;border:1.5px dashed ${d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'};border-radius:var(--r-lg);color:${d?'#9ca3af':'#6b7280'}">
        <div style="font-size:1.8rem;margin-bottom:.5rem" aria-hidden="true">👆</div>
        <p style="font-size:.9rem;font-weight:600">${l==='bn'?'উপরের ট্যাব থেকে একটি বিভাগ বেছে নিন':'Choose a section from the tabs above'}</p>
    </div>`;
}

// ============================================================================
// SECTION 2a — MALE / FEMALE PERSONALITIES (👨 পুরুষ ব্যক্তিত্ব / 👩 নারী ব্যক্তিত্ব)
// ============================================================================
// masumeen[] only has 2 records (id:'p' = Prophet, id:'f' = Fatima al-Zahra),
// and imams[] is all 12 Imams (all male) — so gender is inferred from those
// IDs, no need to edit that existing data. Beyond the 14 Masumeen, a small
// set of other well-known Ahlul Bayt personalities (added 2026-07-17) fills
// out each list: ADDITIONAL_PERSONALITIES below, tagged with gender.
const ADDITIONAL_PERSONALITIES = __ahlulBaytData.additionalPersonalities || [];

// Combines masumeen[]/imams[] (gender inferred from known IDs) with
// ADDITIONAL_PERSONALITIES, filtered by gender. Returns [] safely if the
// underlying data hasn't loaded yet, rather than throwing.
function getGenderedPersonalities(gender) {
    const m = (typeof masumeen !== 'undefined' && Array.isArray(masumeen)) ? masumeen : [];
    const im = (typeof imams !== 'undefined' && Array.isArray(imams)) ? imams : [];
    const fromMasumeen = gender === 'female' ? m.filter(p => p.id === 'f') : m.filter(p => p.id !== 'f');
    const fromImams = gender === 'male' ? im : [];
    const extra = ADDITIONAL_PERSONALITIES.filter(p => p.gender === gender);
    return [...fromMasumeen, ...fromImams, ...extra];
}

function renderPersonalityCard(p, pi) {
    const d = state.darkMode, l = state.language;
    const revealCls = typeof pi === 'number' ? ` reveal reveal-delay-${pi % 4 + 1}` : '';
    const name = l === 'bn' ? (p.nameBn || '') : (p.nameEn || p.nameBn || '');
    const epithet = l === 'bn' ? (p.epithetBn || '') : (p.epithetEn || '');
    const desc = l === 'bn' ? (p.descBn || '') : (p.descEn || '');
    // Section 3: masumeen (id 'p'/'f') and imams (numeric id) already have a
    // full detail modal via showPersonDetail() — reuse it untouched. Extras
    // (string slug ids like 'zainab') have no detail page, so they open the
    // new side profile panel instead — this is new interactivity for cards
    // that previously had none, not a change to any existing click path.
    const clickAction = p.id === 'p' ? "showPersonDetail('prophet')"
        : p.id === 'f' ? "showPersonDetail('fatima')"
        : typeof p.id === 'number' ? `showPersonDetail('${p.id}')`
        : `ahlulBaytSelectSearchResult('extra:${p.id}')`;
    return `
    <div onclick="${clickAction}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${clickAction};}"
        role="button" tabindex="0" aria-label="${escapeHtml(name)}"
        class="${revealCls.trim()}"
        style="border-radius:var(--r-lg);padding:1.25rem;text-align:left;cursor:pointer;
        background:${d?'rgba(255,255,255,.04)':'#ffffff'};
        border:1px solid ${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};
        box-shadow:var(--shadow-card);height:100%">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem">
            <span style="font-size:1.5rem" aria-hidden="true">${p.icon || '✦'}</span>
            <div>
                <div style="font-weight:800;font-size:.95rem;color:${d?'#f9fafb':'#111827'}">${sanitize(name)}</div>
                ${epithet ? `<div style="font-size:.72rem;font-weight:600;color:${d?'#fde68a':'#b45309'}">${sanitize(epithet)}</div>` : ''}
            </div>
        </div>
        ${p.arabicName ? `<div style="font-family:'Amiri',serif;font-size:1.05rem;color:${d?'#9ca3af':'#6b7280'};margin-bottom:.5rem">${sanitize(p.arabicName)}</div>` : ''}
        ${desc ? `<p style="font-size:.8rem;line-height:1.6;color:${d?'#d1d5db':'#4b5563'}">${sanitize(desc)}</p>` : ''}
    </div>`;
}

function renderGenderedPersonalitiesPage(gender) {
    const d = state.darkMode, l = state.language;
    const list = getGenderedPersonalities(gender);
    const title = gender === 'female'
        ? (l==='bn' ? '👩 নারী ব্যক্তিত্ব' : '👩 Female Personalities')
        : (l==='bn' ? '👨 পুরুষ ব্যক্তিত্ব' : '👨 Male Personalities');
    const subtitle = l==='bn'
        ? 'আহলুল বাইত (আ.)-এর সাথে সম্পর্কিত উল্লেখযোগ্য ব্যক্তিত্ব'
        : 'Notable personalities connected to the Ahlul Bayt (AS)';

    if (!list.length) {
        return `<div class="space-y-4 page-enter">
            <h2 class="text-2xl font-black" style="color:${d?'#f9fafb':'#111827'}">${title}</h2>
            <p style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'তথ্য লোড হচ্ছে...':'Loading data...'}</p>
        </div>`;
    }

    return `
    <div class="space-y-4 page-enter">
        <div>
            <h2 class="text-2xl font-black" style="color:${d?'#f9fafb':'#111827'}">${title}</h2>
            <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${subtitle}</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:1rem" class="ab-person-grid">
            ${list.map(renderPersonalityCard).join('')}
        </div>
        <style>
            @media (min-width:640px){ .ab-person-grid{ grid-template-columns:repeat(2,1fr) !important; } }
            @media (min-width:1024px){ .ab-person-grid{ grid-template-columns:repeat(3,1fr) !important; } }
        </style>
    </div>`;
}

// ============================================================================
// SECTION 2c — ঐতিহাসিক টাইমলাইন (Historical Timeline)
// ============================================================================
// Reuses two data sources that already exist elsewhere in the app rather
// than authoring new content:
//   1. renderImamTimeline(d,l) — 12 Imams' era/reign visual bar timeline
//      (already built for the মাসুম tab; same function, called directly).
//   2. getAllHistoryDays(l) — the ৫১ dated events already powering the
//      "ইতিহাসে আজ" widget and Muharram calendar, here sorted into one
//      chronological (by Hijri month/day) list.
function renderAhlulBaytTimelineEventCard(item, d, l, ei) {
    const typeLabel = {
        eid: l==='bn'?'আনন্দময় দিন':'Joyous Day',
        special: l==='bn'?'বিশেষ রাত':'Special Night',
        martyrdom: l==='bn'?'শাহাদাত দিবস':'Day of Martyrdom'
    };
    const revealCls = typeof ei === 'number' ? `reveal reveal-delay-${ei % 4 + 1}` : '';
    return `
    <div class="${revealCls}" style="display:flex;gap:.75rem;padding:1rem;border-radius:var(--r-lg);
        background:${d?'rgba(255,255,255,.04)':'#ffffff'};
        border:1px solid ${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};
        box-shadow:var(--shadow-card)">
        <span style="width:36px;height:36px;flex-shrink:0;border-radius:10px;
            background:${(item.color||'#059669')}18;display:inline-flex;
            align-items:center;justify-content:center;font-size:1.1rem" aria-hidden="true">${item.icon||'✨'}</span>
        <div style="flex:1;min-width:0">
            ${item.type && typeLabel[item.type] ? `<p style="font-size:.7rem;font-weight:700;color:${item.color||'#059669'}">${typeLabel[item.type]}</p>` : ''}
            <p style="font-weight:800;font-size:.88rem;color:${d?'#f9fafb':'#111827'}">${sanitize(item.titleBn||'')}</p>
            <p style="font-size:.75rem;color:${d?'#9ca3af':'#6b7280'};margin-top:.15rem">${sanitize(item.hijriDate||'')}</p>
            ${item.descBn ? `<p style="font-size:.78rem;line-height:1.6;color:${d?'#d1d5db':'#4b5563'};margin-top:.4rem">${sanitize(item.descBn)}</p>` : ''}
        </div>
    </div>`;
}

function renderAhlulBaytTimelinePage() {
    const d = state.darkMode, l = state.language;

    const imamTimelineHtml = (typeof renderImamTimeline === 'function')
        ? renderImamTimeline(d, l)
        : '';

    const events = (typeof getAllHistoryDays === 'function' ? getAllHistoryDays(l) : [])
        .slice()
        .sort((a, b) => {
            const am = a.historyMonth || 0, bm = b.historyMonth || 0;
            if (am !== bm) return am - bm;
            const ad = Array.isArray(a.historyDay) ? a.historyDay[0] : (a.historyDay || 0);
            const bd = Array.isArray(b.historyDay) ? b.historyDay[0] : (b.historyDay || 0);
            return ad - bd;
        });

    return `
    <div class="space-y-6 page-enter">
        <div>
            <h2 class="text-2xl font-black" style="color:${d?'#f9fafb':'#111827'}">📅 ${l==='bn'?'ঐতিহাসিক টাইমলাইন':'Historical Timeline'}</h2>
            <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'১২ ইমামের যুগ ও হিজরি বর্ষপঞ্জি অনুযায়ী গুরুত্বপূর্ণ দিনসমূহ':'The era of the 12 Imams, and key dates across the Hijri calendar'}</p>
        </div>

        ${imamTimelineHtml}

        <div>
            <h3 class="text-lg font-black" style="color:${d?'#f9fafb':'#111827'};margin-bottom:.75rem">
                🗓️ ${l==='bn'?`হিজরি বর্ষপঞ্জি অনুযায়ী ঘটনাবলী (${events.length})`:`Events by Hijri Calendar (${events.length})`}
            </h3>
            ${events.length
                ? `<div style="display:flex;flex-direction:column;gap:.75rem">${events.map((ev,ei) => renderAhlulBaytTimelineEventCard(ev, d, l, ei)).join('')}</div>`
                : `<p style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'তথ্য লোড হচ্ছে...':'Loading data...'}</p>`
            }
        </div>
    </div>`;
}

// ============================================================================
// SECTION 2d — 🕌 গুরুত্বপূর্ণ স্থান (Important Places)
// ============================================================================
// Reuses WORLD_MAP_SITES (script-4-boot.js) — the same 10 holy-site records
// that power the standalone "বিশ্ব মানচিত্র" page. Shown here as a plain
// card grid (no Leaflet map) to match this page's card-based style and
// avoid double-initializing a map widget inside a tabbed panel; each card
// links out to the full interactive map page for anyone who wants it.
function renderAhlulBaytPlaceCard(site, d, l, si) {
    const name = l === 'bn' ? site.nameBn : site.nameEn;
    const desc = l === 'bn' ? site.descBn : site.descEn;
    const revealCls = typeof si === 'number' ? `reveal reveal-delay-${si % 4 + 1}` : '';
    return `
    <div class="${revealCls}" style="border-radius:var(--r-lg);padding:1.25rem;text-align:left;
        background:${d?'rgba(255,255,255,.04)':'#ffffff'};
        border:1px solid ${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};
        box-shadow:var(--shadow-card);height:100%;display:flex;flex-direction:column;gap:.6rem">
        <div style="display:flex;align-items:center;gap:.6rem">
            <span style="font-size:1.5rem" aria-hidden="true">${site.icon || '📍'}</span>
            <div style="font-weight:800;font-size:.95rem;color:${d?'#f9fafb':'#111827'}">${sanitize(name)}</div>
        </div>
        ${desc ? `<p style="font-size:.8rem;line-height:1.6;color:${d?'#d1d5db':'#4b5563'};flex:1">${sanitize(desc)}</p>` : ''}
        <button type="button" onclick="changePage('worldMap')"
            style="align-self:flex-start;font-size:.72rem;font-weight:700;
                padding:6px 12px;border-radius:999px;cursor:pointer;
                border:1px solid ${d?'rgba(180,83,9,.4)':'rgba(180,83,9,.3)'};
                background:${d?'rgba(180,83,9,.12)':'rgba(180,83,9,.08)'};
                color:${d?'#fcd34d':'#b45309'}">
            🗺️ ${l==='bn'?'ম্যাপে দেখুন':'View on Map'}
        </button>
    </div>`;
}

function renderAhlulBaytPlacesPage() {
    const d = state.darkMode, l = state.language;
    const sites = (typeof WORLD_MAP_SITES !== 'undefined' && Array.isArray(WORLD_MAP_SITES)) ? WORLD_MAP_SITES : [];

    return `
    <div class="space-y-4 page-enter">
        <div>
            <h2 class="text-2xl font-black" style="color:${d?'#f9fafb':'#111827'}">🕌 ${l==='bn'?'গুরুত্বপূর্ণ স্থান':'Important Places'}</h2>
            <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'আহলুল বাইত (আ.)-এর সাথে সম্পর্কিত পবিত্র স্থানসমূহ':'Holy sites connected to the Ahlul Bayt (AS)'}</p>
        </div>
        ${sites.length
            ? `<div style="display:grid;grid-template-columns:1fr;gap:1rem" class="ab-person-grid">
                ${sites.map((site,si) => renderAhlulBaytPlaceCard(site, d, l, si)).join('')}
               </div>
               <style>
                    @media (min-width:640px){ .ab-person-grid{ grid-template-columns:repeat(2,1fr) !important; } }
                    @media (min-width:1024px){ .ab-person-grid{ grid-template-columns:repeat(3,1fr) !important; } }
               </style>`
            : `<p style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'তথ্য লোড হচ্ছে...':'Loading data...'}</p>`
        }
    </div>`;
}


// ============================================================================
// SECTION 3 — SMART SEARCH + SIDE PROFILE PANEL (approved 2026-07-22)
// ============================================================================
// Builds a single search index over masumeen[] + imams[] (both already have
// a full detail modal via the existing showPersonDetail()) plus
// ADDITIONAL_PERSONALITIES (no detail modal exists for these, per the
// standing decision — they get an inline preview only). Nothing here
// touches renderImamsPage/renderFamilyTreePage/showPersonDetail's own card
// markup; the standalone /imams and /familyTree pages keep behaving exactly
// as before. Selecting a search result (or an "extra" personality card,
// wired above in renderPersonalityCard) shows a quick preview in the new
// side panel; for masumeen/imam entries that panel's "View Full Profile"
// button calls the SAME existing showPersonDetail() modal used everywhere
// else in the app — no duplicate detail UI is built.
//
// NOTE ON onclick SAFETY: past bug (documented elsewhere in this app) came
// from JSON.stringify-ing Bengali/Arabic text directly into onclick
// attributes. This block avoids that entirely — onclick only ever carries a
// plain "source:id" key (ids here are always simple: 'p','f', 1-12, or a
// short English slug like 'zainab'); all display text is injected as
// element content via sanitize(), never into an attribute.

function getAhlulBaytSearchIndex() {
    const m = (typeof masumeen !== 'undefined' && Array.isArray(masumeen)) ? masumeen : [];
    const im = (typeof imams !== 'undefined' && Array.isArray(imams)) ? imams : [];
    const idx = [];
    m.forEach(p => idx.push({
        source: 'masumeen', id: p.id, detailId: p.id === 'p' ? 'prophet' : (p.id === 'f' ? 'fatima' : null),
        nameBn: p.nameBn, nameEn: p.nameEn, epithetBn: p.epithetBn, epithetEn: p.epithetEn,
        descBn: p.descBn, descEn: p.descEn, arabicName: p.arabicName, icon: p.icon
    }));
    im.forEach(p => idx.push({
        source: 'imam', id: p.id, detailId: p.id,
        nameBn: p.nameBn, nameEn: p.nameEn, epithetBn: p.epithetBn, epithetEn: p.epithetEn,
        descBn: p.descBn, descEn: p.descEn, arabicName: p.arabicName, icon: p.icon
    }));
    ADDITIONAL_PERSONALITIES.forEach(p => idx.push({
        source: 'extra', id: p.id, detailId: null,
        nameBn: p.nameBn, nameEn: p.nameEn, epithetBn: p.epithetBn, epithetEn: p.epithetEn,
        descBn: p.descBn, descEn: p.descEn, arabicName: p.arabicName, icon: p.icon
    }));
    return idx;
}

function ahlulBaytSearchPersons(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return getAhlulBaytSearchIndex().filter(p => {
        return [p.nameBn, p.nameEn, p.epithetBn, p.epithetEn].some(f => (f || '').toLowerCase().includes(q));
    }).slice(0, 8);
}

// Selection is looked up fresh from the index every time (by 'source:id'
// key) rather than storing the whole object in state — keeps state small
// and always in sync with the underlying data arrays.
function getAhlulBaytPersonBySelection(sel) {
    if (!sel) return null;
    return getAhlulBaytSearchIndex().find(p => p.source === sel.source && String(p.id) === String(sel.id)) || null;
}

// Called from search-result buttons AND from renderPersonalityCard() (for
// 'extra' personalities that have no detail modal of their own).
function ahlulBaytSelectSearchResult(key) {
    if (typeof key !== 'string') return;
    const sepIdx = key.indexOf(':');
    if (sepIdx === -1) return;
    const source = key.slice(0, sepIdx);
    const id = key.slice(sepIdx + 1);
    if (typeof state === 'undefined') return;
    state.ahlulBaytSelectedPerson = { source, id };
    state.ahlulBaytSearchQuery = '';
    // Section 4: update the side panel in place instead of calling the app's
    // full render() — a full render() would tear down and rebuild whichever
    // tab is currently open (re-running initFamilyTree() on the tree tab
    // for no reason, since nothing about the tree tab changed). Also close
    // the results dropdown and clear the input directly, same reasoning.
    const panel = document.getElementById('ab-side-panel');
    if (panel && panel.parentNode) {
        panel.parentNode.innerHTML = renderAhlulBaytSidePanel();
    } else if (typeof render === 'function') {
        render(); // fallback if the panel isn't mounted yet for some reason
    }
    const resultsBox = document.getElementById('ab-search-results');
    if (resultsBox) { resultsBox.style.display = 'none'; resultsBox.innerHTML = ''; }
    const input = document.getElementById('ab-search-input');
    if (input) input.value = '';
    setTimeout(() => {
        const el = document.getElementById('ab-side-panel');
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
}

// Updates only the results dropdown on each keystroke (not a full render())
// so the input never loses focus/cursor position while typing.
function ahlulBaytHandleSearchInput(value) {
    if (typeof state === 'undefined') return;
    state.ahlulBaytSearchQuery = value;
    const box = document.getElementById('ab-search-results');
    if (!box) return;
    box.style.display = value && value.trim() ? 'block' : 'none';
    box.innerHTML = renderAhlulBaytSearchResults();
}

function renderAhlulBaytSearchResults() {
    const d = state.darkMode, l = state.language;
    const q = state.ahlulBaytSearchQuery;
    if (!q || !q.trim()) return '';
    const results = ahlulBaytSearchPersons(q);
    if (!results.length) {
        return `<div style="padding:.75rem 1rem;font-size:.8rem;color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'কোনো ফলাফল পাওয়া যায়নি':'No results found'}</div>`;
    }
    return results.map(p => {
        const name = l === 'bn' ? p.nameBn : (p.nameEn || p.nameBn);
        const epithet = l === 'bn' ? p.epithetBn : p.epithetEn;
        return `<button type="button" onclick="ahlulBaytSelectSearchResult('${p.source}:${p.id}')"
            style="display:flex;align-items:center;gap:.6rem;width:100%;text-align:left;padding:.6rem .9rem;
                background:transparent;border:none;border-bottom:1px solid ${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)'};cursor:pointer">
            <span style="font-size:1.2rem" aria-hidden="true">${p.icon || '✦'}</span>
            <span style="flex:1;min-width:0">
                <span style="display:block;font-weight:700;font-size:.85rem;color:${d?'#f9fafb':'#111827'}">${sanitize(name)}</span>
                ${epithet ? `<span style="display:block;font-size:.7rem;color:${d?'#fde68a':'#b45309'}">${sanitize(epithet)}</span>` : ''}
            </span>
        </button>`;
    }).join('');
}

function renderAhlulBaytSearchBox() {
    const d = state.darkMode, l = state.language;
    return `
    <div style="position:relative;margin-top:1rem" class="ab-search-box">
        <input type="text" id="ab-search-input" value="${sanitize(state.ahlulBaytSearchQuery || '')}"
            oninput="ahlulBaytHandleSearchInput(this.value)" autocomplete="off"
            placeholder="${l==='bn'?'🔍 নাম বা উপাধি দিয়ে খুঁজুন...':'🔍 Search by name or title...'}"
            aria-label="${l==='bn'?'আহলুল বাইত সার্চ':'Ahlul Bayt search'}"
            style="width:100%;padding:.75rem 1rem;border-radius:999px;font-size:.85rem;box-sizing:border-box;
                border:1px solid ${d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'};
                background:${d?'rgba(255,255,255,.05)':'#ffffff'};color:${d?'#f9fafb':'#111827'};outline:none">
        <div id="ab-search-results" style="position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:20;
            border-radius:var(--r-lg);overflow:hidden;max-height:320px;overflow-y:auto;
            background:${d?'#1f2937':'#ffffff'};border:1px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'};
            box-shadow:var(--shadow-lg);display:${state.ahlulBaytSearchQuery && state.ahlulBaytSearchQuery.trim() ? 'block' : 'none'}">
            ${renderAhlulBaytSearchResults()}
        </div>
    </div>`;
}

function renderAhlulBaytSidePanel() {
    const d = state.darkMode, l = state.language;
    const person = getAhlulBaytPersonBySelection(state.ahlulBaytSelectedPerson);

    if (!person) {
        return `<div id="ab-side-panel"></div>`;
    }

    const name = l === 'bn' ? person.nameBn : (person.nameEn || person.nameBn);
    const epithet = l === 'bn' ? person.epithetBn : person.epithetEn;
    const desc = l === 'bn' ? person.descBn : person.descEn;
    const viewBtn = person.detailId != null ? `
        <button type="button" onclick="showPersonDetail('${person.detailId}')"
            style="margin-top:.9rem;font-size:.78rem;font-weight:700;padding:8px 16px;border-radius:999px;cursor:pointer;
                border:1px solid ${d?'rgba(180,83,9,.4)':'rgba(180,83,9,.3)'};
                background:${d?'rgba(180,83,9,.15)':'rgba(180,83,9,.08)'};color:${d?'#fcd34d':'#b45309'}">
            ${l==='bn'?'সম্পূর্ণ প্রোফাইল দেখুন':'View Full Profile'}
        </button>` : '';

    return `<div id="ab-side-panel" style="border-radius:var(--r-lg);padding:1.25rem;
        background:${d?'rgba(255,255,255,.04)':'#ffffff'};
        border:1px solid ${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--shadow-card)">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem">
            <span style="font-size:1.8rem" aria-hidden="true">${person.icon || '✦'}</span>
            <div>
                <div style="font-weight:800;font-size:1rem;color:${d?'#f9fafb':'#111827'}">${sanitize(name)}</div>
                ${epithet ? `<div style="font-size:.75rem;font-weight:600;color:${d?'#fde68a':'#b45309'}">${sanitize(epithet)}</div>` : ''}
            </div>
        </div>
        ${person.arabicName ? `<div style="font-family:'Amiri',serif;font-size:1.1rem;color:${d?'#9ca3af':'#6b7280'};margin-bottom:.6rem">${sanitize(person.arabicName)}</div>` : ''}
        ${desc ? `<p style="font-size:.82rem;line-height:1.65;color:${d?'#d1d5db':'#4b5563'}">${sanitize(desc)}</p>` : ''}
        ${viewBtn}
    </div>`;
}


// ============================================================================
// SECTION 2b — FAMILY-TREE DATA LAYER (sole implementation)
// ============================================================================
// This closure is the ONLY place familyTreeDatabase/familyTreeLineage and
// their helper functions (getFamilyLinks, getPersonTimeline, getGeneration,
// getProfileStats, validateFamilyTreeData, getSafeImamData, getImamById,
// etc.) are defined — script-1-core.js/script-3-pages.js/script-4-boot.js
// do not carry this data-layer logic, so there is nothing to fall back to
// and nothing here is duplicated elsewhere.
//
// masumeen/imams (the 14-Masumeen dataset) are also sole-sourced here.
//
// imamFlip()/imamCardParticles() (flip-card + particle-burst UI helpers)
// are likewise sole-sourced here — script-3-pages.js's renderImamsPage()
// calls them by plain global name from its card markup.
//
// [Cleanup, this session] This closure previously ALSO carried embedded
// copies of renderImamsPage()/renderImamTimeline()/renderImamDetailPage()/
// renderFamilyTreePage()/renderFamilyTree()/showPersonDetail()/
// closePersonDetail()/_resolveFamilyTreePerson()/copyPersonCitation()/
// printPersonProfile()/initFamilyTree()/ordinalEn() — verbatim duplicates
// of the authoritative implementations that live in script-3-pages.js
// (Imams/Masumeen page + detail) and script-4-boot.js (Family Tree page +
// modal). Those copies were installed onto `window` only when the global
// name was still missing, but since script-3-pages.js and script-4-boot.js
// both always load (and load AFTER this file), the embedded copies were
// unreachable dead code — every call site here (renderAhlulBaytTabPanel,
// below) already calls the plain global names, which resolve to the
// script-3-pages.js/script-4-boot.js versions at runtime regardless. The
// dead copies (and their now-invalid install-guard lines) were removed;
// the authoritative renderers were left completely untouched.
//
// Every function/data name below is still installed onto the SAME bare
// global name the rest of the app calls (familyTreeDatabase, masumeen,
// imams, imamFlip, imamCardParticles, scrollToImamEl, shareImamQuote,
// etc.) — but ONLY when that name doesn't already exist, since none of
// these are duplicated elsewhere and the guard is harmless either way.
(function installAhlulBaytFallback() {
    'use strict';

const familyTreeDatabase = __ahlulBaytData.familyTreeDatabase || {};

// ===============================================
// RELATIONSHIPS & TIMELINE — feature addition
// ===============================================
// Design note: rather than regex-parsing the free-text `parents`/`spouse`/
// `children` strings (fragile, could mis-link names), the direct-succession
// genealogy within this closed dataset (Prophet → Fatima → 12 Imams) is
// hand-encoded below. This is the standard, uncontested Twelver Shia lineage
// chain that the rest of this file already describes in prose — encoding it
// structurally just makes it linkable. External relatives who are NOT part
// of this 14-person dataset (Abu Talib, Khadija, etc.) intentionally stay as
// plain text in the existing `parents`/`spouse`/`children` fields — nothing
// there is touched by this addition.
const familyTreeLineage = __ahlulBaytData.familyTreeLineage || {};

// একটি id ('prophet' | 'fatima' | 1-12) থেকে পূর্ণ person object ফেরত দেয়
function resolvePersonById(refId) {
  if (refId === 'prophet') return familyTreeDatabase.prophet ? { refId, ...familyTreeDatabase.prophet } : null;
  if (refId === 'fatima') return familyTreeDatabase.fatima ? { refId, ...familyTreeDatabase.fatima } : null;
  const imam = familyTreeDatabase.imams.find(i => i && i.id === refId);
  return imam ? { refId, ...imam } : null;
}

// personId-এর parents/children/spouse/siblings — এই ডেটাসেটের মধ্যে যাদের
// প্রোফাইল আছে শুধু তাদেরই ফেরত দেয় (ক্লিকযোগ্য লিংকের জন্য)
function getFamilyLinks(personId) {
  const edges = familyTreeLineage[personId] || {};
  const resolve = (ids) => (ids || []).map(resolvePersonById).filter(Boolean);
  return {
    parents: resolve(edges.parents),
    children: resolve(edges.children),
    spouse: resolve(edges.spouse),
    siblings: resolve(edges.siblings)
  };
}

// কালানুক্রমিক টাইমলাইন — সম্পূর্ণভাবে already-existing fields থেকে derive করা
// হয়, তাই নতুন কোনো ঐতিহাসিক তথ্য/দাবি এখানে যোগ করা হচ্ছে না।
function getPersonTimeline(person) {
  if (!person) return [];
  const events = [];
  if (person.birth) events.push({ label: 'জন্ম', detail: person.birth, icon: '🌱' });
  if (person.imamate) events.push({ label: 'ইমামত শুরু', detail: person.imamate, icon: '☀️' });
  if (person.treaty) events.push({ label: 'শান্তি চুক্তি', detail: person.treaty, icon: '🤝' });
  if (person.battleOfKarbala) {
    events.push({ label: 'কারবালার যুদ্ধ', detail: `${person.battleOfKarbala.date} — ${person.battleOfKarbala.location}`, icon: '⚔️' });
  }
  if (person.sahifah) events.push({ label: person.sahifah.name, detail: person.sahifah.description, icon: '📖' });
  if (person.ghaib_status) {
    if (person.ghaib_status.ghaib_sughra) events.push({ label: 'ছোট গায়েব শুরু', detail: person.ghaib_status.ghaib_sughra, icon: '🌙' });
    if (person.ghaib_status.ghaib_kubra) events.push({ label: 'বড় গায়েব শুরু', detail: person.ghaib_status.ghaib_kubra, icon: '🌑' });
  }
  // Imam Mahdi (and only him) has a `death` field that actually describes
  // occultation, not death — he is believed by the tradition this app
  // documents to be alive. Don't mislabel that as ওফাত/শাহাদাত; the
  // ghaib_status entries above already cover his timeline correctly.
  if (person.death && !person.ghaib_status) {
    events.push({ label: person.causeOfDeath ? 'শাহাদাত' : 'ওফাত', detail: person.death, icon: person.causeOfDeath ? '🩸' : '🕊️' });
  }
  return events;
}

// পরিচিত প্রতিপক্ষ/আক্রমণকারীদের তথ্য — এখানেও নতুন কিছু গবেষণা করে যোগ করা
// হয়নি, শুধু ইতিমধ্যে ফাইলে থাকা battleOfKarbala/killers ফিল্ড থেকে একত্র
// করা হয়েছে যাতে UI-তে একটা জায়গায় দেখানো যায়।
function getPersonOpponents(person) {
  if (!person) return [];
  const list = [];
  if (person.battleOfKarbala) {
    if (person.battleOfKarbala.opponents) list.push(person.battleOfKarbala.opponents);
    if (person.battleOfKarbala.commanders) list.push(person.battleOfKarbala.commanders);
  }
  if (person.killers) list.push(person.killers);
  return list;
}

// ===============================================
// PROFILE STATISTICS, COMPLETION %, BADGES, CITATION
// ===============================================
// Everything below is computed/derived from fields that already exist in
// this file. Nothing here introduces a new historical claim.

function _bnToEnDigits(str) {
  const map = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
  return String(str).replace(/[০-৯]/g, d => map[d]);
}

// Prophet ও Ali কে root (generation 1) ধরে familyTreeLineage-এর parent
// শৃঙ্খল বেয়ে generation নম্বর গণনা করে — নতুন কোনো তথ্য নয়, শুধু আগে
// থেকে বানানো lineage graph-এর গভীরতা।
function getGeneration(personId) {
  const edges = familyTreeLineage[personId];
  if (!edges || !edges.parents || edges.parents.length === 0) return 1;
  return Math.max(...edges.parents.map(getGeneration)) + 1;
}

function getChildrenCount(person) {
  if (Array.isArray(person.children)) return person.children.length;
  if (typeof person.children === 'string') {
    const numMatch = person.children.match(/[০-৯0-9]+/);
    if (numMatch) return parseInt(_bnToEnDigits(numMatch[0]), 10) || 0;
  }
  return 0;
}

// birth ফিল্ডের টেক্সটে থাকা "... খ্রিস্টাব্দ" থেকে শতাব্দী বের করা — নতুন
// কোনো তারিখ যোগ করা হচ্ছে না, existing তারিখকেই শতাব্দীতে রূপান্তর।
const _ORDINAL_BN = ['','১ম','২য়','৩য়','৪র্থ','৫ম','৬ষ্ঠ','৭ম','৮ম','৯ম','১০ম','১১তম','১২তম','১৩তম','১৪তম','১৫তম'];
function getHistoricalPeriod(person) {
  if (!person.birth) return null;
  const match = String(person.birth).match(/([০-৯]{3,4})\s*খ্রিস্টাব্দ/);
  if (!match) return null;
  const year = parseInt(_bnToEnDigits(match[1]), 10);
  if (isNaN(year)) return null;
  const century = Math.floor((year - 1) / 100) + 1;
  const label = _ORDINAL_BN[century] || `${century}`;
  return { century, label: `${label} শতাব্দী`, year };
}

function getProfileStats(personId, person) {
  const links = getFamilyLinks(personId);
  const knownRelatives = links.parents.length + links.children.length + links.spouse.length + links.siblings.length;
  const period = getHistoricalPeriod(person);
  return {
    generation: getGeneration(personId),
    ageAtDeath: person.age_at_death || null,
    childrenCount: getChildrenCount(person),
    knownRelatives,
    historicalPeriod: period ? period.label : null
  };
}

const PROFILE_COMPLETION_CHECKLIST = [
  ['arabicName', 'আরবি নাম'], ['bengaliName', 'বাংলা নাম'], ['kunyah', 'কুনিয়াত'],
  ['laqab', 'লকব'], ['birth', 'জন্ম'], ['birthPlace', 'জন্মস্থান'],
  ['death', 'মৃত্যু/ওফাত'], ['deathPlace', 'মৃত্যুস্থান'], ['parents', 'পিতামাতা'],
  ['spouse', 'পত্নী'], ['children', 'সন্তান'], ['description', 'জীবনী'],
  ['significance', 'গুরুত্ব'], ['features', 'বৈশিষ্ট্য'], ['shrine', 'মাজার/স্মৃতিস্থান'],
  ['sources', 'তথ্যসূত্র']
];
function getProfileCompletion(person) {
  const missing = [];
  let presentCount = 0;
  PROFILE_COMPLETION_CHECKLIST.forEach(([field, label]) => {
    const val = person[field];
    const present = Array.isArray(val) ? val.length > 0 : !!val;
    if (present) presentCount++; else missing.push(label);
  });
  return { percent: Math.round((presentCount / PROFILE_COMPLETION_CHECKLIST.length) * 100), missing };
}

function getProfileBadges(personId, person) {
  const badges = [];
  if (personId === 'prophet') badges.push({ key: 'prophet', label: 'নবী (সা)', icon: '🌟' });
  else badges.push({ key: 'ahlulbayt', label: 'আহলুল বাইত', icon: '🕋' });
  if (personId === 'fatima') badges.push({ key: 'woman', label: 'নারী', icon: '🌷' });
  if (typeof personId === 'number' || (typeof personId === 'string' && /^\d+$/.test(personId))) {
    badges.push({ key: 'imam', label: 'ইমাম', icon: '☪️' });
  }
  if (person.causeOfDeath) badges.push({ key: 'martyr', label: 'শহীদ', icon: '🩸' });
  if (person.knowledgeFields) badges.push({ key: 'scholar', label: 'পণ্ডিত', icon: '📚' });
  if (person.ghaib_status) badges.push({ key: 'awaited', label: 'অপেক্ষিত ইমাম', icon: '🌙' });
  return badges;
}

// সাইট citation — শুধু ইতিমধ্যে-জানা তথ্য (নাম, তারিখ) ব্যবহার করে, নতুন
// কোনো বহিঃস্থ সূত্র বানানো হয়নি; এটা "এই পৃষ্ঠাকে সূত্র হিসেবে দেখান"।
function getCitationText(personId, person, lang) {
  const name = lang === 'bn' ? person.bengaliName : (person.englishName || person.englishAbbr || person.bengaliName);
  const dateStr = new Date().toISOString().slice(0, 10);
  const birthDeath = [person.birth, person.death].filter(Boolean).join(' – ');
  const siteUrl = 'https://ahlalbayt313.github.io/#familyTree';
  return lang === 'bn'
    ? `${name} (${person.arabicName || ''})${birthDeath ? ' — ' + birthDeath : ''}। আহলুল বাইত পরিবার বৃক্ষ। সংগৃহীত: ${dateStr}, ${siteUrl}`
    : `${name}${birthDeath ? ' — ' + birthDeath : ''}. Ahl al-Bayt Family Tree. Retrieved ${dateStr}, ${siteUrl}`;
}


// ===============================================
// Validation errors storage (accessible for UI)
// ===============================================
let familyTreeValidationErrors = [];

// ===============================================
// Function to validate data structure comprehensively
// ===============================================
function validateFamilyTreeData() {
  familyTreeValidationErrors = [];
  
  // Critical fields that must exist for safe rendering
  const CRITICAL_FIELDS = ['id', 'arabicName', 'bengaliName', 'birth', 'death', 'parents', 'spouse', 'children', 'color', 'textColor', 'description'];
  const RECOMMENDED_FIELDS = ['birthPlace', 'deathPlace', 'reignYears', 'significance', 'features', 'kunyah', 'laqab'];
  
  // Validate Prophet object
  if (!familyTreeDatabase.prophet) {
    familyTreeValidationErrors.push('Prophet object is missing entirely');
    console.error('❌ Prophet object is missing entirely');
    return false;
  }

  // Bug fix: guard the array itself (not just individual entries — see fix
  // below) in case familyTreeDatabase.imams is missing or not an array.
  if (!Array.isArray(familyTreeDatabase.imams)) {
    familyTreeValidationErrors.push('Imams array is missing or not an array');
    console.error('❌ Imams array is missing or not an array');
    return false;
  }
  
  // Validate each imam's data
  const imamErrors = [];
  familyTreeDatabase.imams.forEach((imam, index) => {
    const imamNumber = index + 1;

    // Bug fix: if the array has a hole (a missing entry — null/undefined,
    // e.g. from a bad edit or merge), `imam` itself is missing here. Every
    // check below assumes `imam` is an object and reads imam[field] /
    // imam.bengaliName directly, which throws a TypeError and aborts the
    // whole forEach (so even the OTHER, perfectly fine imams never get
    // validated or logged). Catch this case first and skip safely instead.
    if (!imam) {
      const errorMsg = `ইমাম #${imamNumber}: ইমামের ডেটা সম্পূর্ণ অনুপস্থিত (null/undefined)`;
      imamErrors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return; // skip remaining checks for this entry — nothing to read
    }

    // Check critical fields
    CRITICAL_FIELDS.forEach(field => {
      if (imam[field] === undefined || imam[field] === null || imam[field] === '') {
        const errorMsg = `ইমাম #${imamNumber} ${imam.bengaliName || '(নাম অজানা)'}: "${field}" ফিল্ড অনুপস্থিত`;
        imamErrors.push(errorMsg);
        console.warn(`⚠️  ${errorMsg}`);
      }
    });
    
    // Check if imam has any basic data
    if (!imam.id || !imam.arabicName || !imam.bengaliName) {
      const errorMsg = `ইমাম #${imamNumber}: প্রয়োজনীয় নাম/আইডি ফিল্ড অনুপস্থিত`;
      imamErrors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
    
    // Validate data types
    if (imam.id && typeof imam.id !== 'number') {
      console.warn(`⚠️  ইমাম #${imamNumber}: ID সংখ্যা নয়`);
    }
    
    if (typeof imam.children !== 'undefined' && !Array.isArray(imam.children) && typeof imam.children !== 'string') {
      imamErrors.push(`ইমাম #${imamNumber}: children ফিল্ড গঠন ভুল (array বা string হওয়া উচিত)`);
    }
    
    if (typeof imam.features !== 'undefined' && !Array.isArray(imam.features)) {
      imamErrors.push(`ইমাম #${imamNumber}: features ফিল্ড array হওয়া উচিত`);
    }
  });
  
  if (imamErrors.length > 0) {
    familyTreeValidationErrors.push(...imamErrors);
  }
  
  // Summary log
  if (familyTreeValidationErrors.length === 0) {
    return true;
  } else {
    console.error(`❌ মোট ${familyTreeValidationErrors.length}টি ডেটা ত্রুটি পাওয়া গেছে`);
    return false;
  }
}

// ===============================================
// Safe data access function with fallbacks
// ===============================================
/**
 * getSafeImamData() - একটি ইমামের ডেটা নিরাপদে এক্সেস করে
 * @param {Object} imam - ইমামের অবজেক্ট
 * @returns {Object} নিরাপদ ডেটা যেখানে সব প্রয়োজনীয় ফিল্ড আছে
 * 
 * ব্যবহার: 
 *   const safeData = getSafeImamData(imams[0]);
 *   console.log(safeData.bengaliName); // সবসময় একটি স্ট্রিং রিটার্ন করে
 * 
 * উদ্দেশ্য: UI rendering এ undefined/null এরর এড়ানো
 */
function getSafeImamData(imam) {
  if (!imam) {
    return {
      bengaliName: 'অজানা ইমাম',
      arabicName: 'Unknown',
      englishName: 'Unknown',
      birth: 'তথ্য অনুপলব্ধ',
      death: 'তথ্য অনুপলব্ধ',
      parents: 'তথ্য অনুপলব্ধ',
      spouse: 'তথ্য অনুপলব্ধ',
      children: 'তথ্য অনুপলব্ধ',
      description: 'এই ইমামের তথ্য বর্তমানে উপলব্ধ নয়',
      color: '#6B7280',
      textColor: '#FFFFFF',
      kunyah: '',
      laqab: '',
      sources: []
    };
  }
  
  // Return imam data with fallbacks for missing critical fields
  return {
    id: imam.id || 'Unknown',
    arabicName: imam.arabicName || 'غير معروف',
    bengaliName: imam.bengaliName || 'অজানা ইমাম',
    englishName: imam.englishName || 'Unknown Imam',
    birth: imam.birth || 'তথ্য অনুপলব্ধ',
    birthPlace: imam.birthPlace || 'অজানা',
    death: imam.death || 'তথ্য অনুপলব্ধ',
    deathPlace: imam.deathPlace || 'অজানা',
    parents: imam.parents || 'তথ্য অনুপলব্ধ',
    spouse: imam.spouse || 'তথ্য অনুপলব্ধ',
    children: imam.children || 'তথ্য অনুপলব্ধ',
    description: imam.description || 'এই ইমামের বিস্তারিত তথ্য বর্তমানে উপলব্ধ নয়',
    color: imam.color || '#6B7280',
    textColor: imam.textColor || '#FFFFFF',
    reignYears: imam.reignYears || 'তথ্য অনুপলব্ধ',
    significance: imam.significance || 'অনন্য গুরুত্ব',
    features: Array.isArray(imam.features) ? imam.features : (imam.features ? [imam.features] : []),
    kunyah: imam.kunyah || '',
    laqab: imam.laqab || '',
    sources: Array.isArray(imam.sources) ? imam.sources : []
  };
}

// ===============================================
// Get imam by ID using safe data access
// ===============================================
/**
 * getImamById() - ID দ্বারা ইমাম খুঁজে বের করে এবং নিরাপদ ডেটা রিটার্ন করে
 * @param {number} id - ইমামের ID (1-12)
 * @returns {Object} নিরাপদ ইমাম ডেটা
 */
function getImamById(id) {
  const imam = familyTreeDatabase.imams.find(i => i && i.id === id);
  return getSafeImamData(imam);
}

// ===============================================
// Get validation errors for UI display
// ===============================================
function getFamilyTreeValidationErrors() {
  return familyTreeValidationErrors;
}

// ===============================================
// Check if data is valid
// ===============================================
function isFamilyTreeDataValid() {
  return familyTreeValidationErrors.length === 0;
}
const masumeen = __ahlulBaytData.masumeen || [];

const imams = __ahlulBaytData.imams || [];
function shareImamQuote(im, l) {
    const name = l==='bn'?im.nameBn:im.nameEn;
    const quote = l==='bn'?im.quoteBn:im.quoteEn;
    shareContent('💬 '+name, '"'+quote+'"', '');
}
// ── Imam anchor scroll with sticky-header offset ──────────────────────────
function scrollToImamEl(el) {
    if (!el) return;
    const headerEl = document.querySelector('header');
    const headerH = headerEl ? headerEl.offsetHeight : 64;
    const rect = el.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    window.scrollTo({ top: rect.top + scrollTop - headerH - 12, behavior: 'smooth' });
}
function imamFlip(flipId) {
    const front = document.getElementById(flipId + '-front');
    const back  = document.getElementById(flipId + '-back');
    if (!front || !back) return;
    const isShowingBack = back.style.display !== 'none';
    if (isShowingBack) {
        back.style.display  = 'none';
        front.style.display = 'flex';
    } else {
        front.style.display = 'none';
        back.style.display  = 'flex';
        back.style.flexDirection = 'column';
        back.style.alignItems = 'center';
        back.style.justifyContent = 'center';
    }
}

/** Spawn particle burst on card mouseenter */
function imamCardParticles(cardEl, color) {
    if (window._imamParticleCooldown) return;
    window._imamParticleCooldown = true;
    setTimeout(() => { window._imamParticleCooldown = false; }, 900);

    const directions = [
        'translate(-28px,-32px)','translate(28px,-32px)',
        'translate(-36px,0px)', 'translate(36px,0px)',
        'translate(-22px,28px)','translate(22px,28px)',
        'translate(0px,-38px)', 'translate(12px,-26px)',
    ];
    const rect = cardEl.getBoundingClientRect();
    // anchor particles to top-center of the card (avatar area)
    const ox = rect.width / 2;
    const oy = rect.height * 0.22;

    directions.forEach((tx, i) => {
        const p = document.createElement('div');
        p.className = 'imam-particle';
        p.style.cssText = `
            background:${i % 2 === 0 ? color : '#c9a227'};
            left:${ox}px; top:${oy}px;
            --ptx:${tx};
            animation-delay:${i * 0.06}s;
            width:${4 + (i % 3) * 2}px;
            height:${4 + (i % 3) * 2}px;
        `;
        cardEl.appendChild(p);
        setTimeout(() => p.remove(), 900);
    });
}
    // Phase 5 (2026-08-12): validateFamilyTreeData() used to run here,
    // eagerly, at IIFE top-level — i.e. against familyTreeDatabase while it
    // was still the empty {} placeholder, before biographies.json had
    // loaded. It now runs inside loadAhlulBaytCoreDataAsync() above, only
    // once biographies.json has actually resolved. Not duplicated here.

    // ── Install onto the global scope, only where the real thing is missing ──
    var g = (typeof window !== 'undefined') ? window : globalThis;

    if (typeof g.familyTreeDatabase === 'undefined') g.familyTreeDatabase = familyTreeDatabase;
    if (typeof g.familyTreeLineage === 'undefined') g.familyTreeLineage = familyTreeLineage;
    if (typeof g.getFamilyLinks !== 'function') g.getFamilyLinks = getFamilyLinks;
    if (typeof g.getPersonTimeline !== 'function') g.getPersonTimeline = getPersonTimeline;
    if (typeof g.getPersonOpponents !== 'function') g.getPersonOpponents = getPersonOpponents;
    if (typeof g.getGeneration !== 'function') g.getGeneration = getGeneration;
    if (typeof g.getProfileStats !== 'function') g.getProfileStats = getProfileStats;
    if (typeof g.getProfileCompletion !== 'function') g.getProfileCompletion = getProfileCompletion;
    if (typeof g.getProfileBadges !== 'function') g.getProfileBadges = getProfileBadges;
    if (typeof g.getCitationText !== 'function') g.getCitationText = getCitationText;
    if (typeof g.getSafeImamData !== 'function') g.getSafeImamData = getSafeImamData;
    if (typeof g.getImamById !== 'function') g.getImamById = getImamById;
    if (typeof g.validateFamilyTreeData !== 'function') g.validateFamilyTreeData = validateFamilyTreeData;
    if (typeof g.getFamilyTreeValidationErrors !== 'function') g.getFamilyTreeValidationErrors = getFamilyTreeValidationErrors;
    if (typeof g.isFamilyTreeDataValid !== 'function') g.isFamilyTreeDataValid = isFamilyTreeDataValid;

    if (typeof g.masumeen === 'undefined') g.masumeen = masumeen;
    if (typeof g.imams === 'undefined') g.imams = imams;
    if (typeof g.shareImamQuote !== 'function') g.shareImamQuote = shareImamQuote;
    if (typeof g.scrollToImamEl !== 'function') g.scrollToImamEl = scrollToImamEl;

    if (typeof g.imamFlip !== 'function') g.imamFlip = imamFlip;
    if (typeof g.imamCardParticles !== 'function') g.imamCardParticles = imamCardParticles;


})();

// ============================================================================
// SECTION 1c — QUICK STATISTICS (animated counters)
// ============================================================================
function renderAhlulBaytStats() {
    const d = state.darkMode, l = state.language;
    const stats = getAhlulBaytQuickStats(l);

    const CARDS = [
        { key: 'totalPersonalities', icon: '👥', value: stats.totalPersonalities, bn: 'মোট ব্যক্তিত্ব',        en: 'Total Personalities' },
        { key: 'totalMasumeen',      icon: '👑', value: stats.totalMasumeen,      bn: 'মোট মাসুমিন',          en: 'Total Masumeen' },
        { key: 'totalGenerations',   icon: '🌳', value: stats.totalGenerations,   bn: 'মোট প্রজন্ম',           en: 'Total Generations' },
        { key: 'historicalEvents',   icon: '📅', value: stats.historicalEvents,   bn: 'ঐতিহাসিক ঘটনা',        en: 'Historical Events' },
        { key: 'familyRelationships',icon: '🔗', value: stats.familyRelationships,bn: 'পারিবারিক সম্পর্ক',      en: 'Family Relationships' },
    ];

    const cards = CARDS.map(c => `
        <div class="ab-stat-card" data-ab-stat-target="${c.value}"
            style="border-radius:var(--r-lg);padding:1.1rem 1rem;text-align:center;
                background:${d?'rgba(255,255,255,.04)':'#ffffff'};
                border:1px solid ${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};
                box-shadow:var(--shadow-card)">
            <div style="font-size:1.4rem;margin-bottom:.35rem" aria-hidden="true">${c.icon}</div>
            <div class="ab-stat-number font-black" style="font-size:clamp(1.3rem,4vw,1.9rem);
                color:${d?'#fde68a':'#b45309'};line-height:1" data-ab-count="0">0</div>
            <div style="font-size:.72rem;font-weight:600;margin-top:.3rem;color:${d?'#9ca3af':'#6b7280'}">
                ${l==='bn'?c.bn:c.en}
            </div>
        </div>`).join('');

    // Populate the counters after the markup lands in the DOM — mirrors the
    // existing setTimeout(...,0) pattern already used by renderFamilyTreePage
    // to run post-render init safely.
    setTimeout(ahlulBaytAnimateStatCounters, 0);

    return `
    <div class="ab-stats-grid reveal" style="display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem;margin-top:1.5rem">
        ${cards}
    </div>
    <style>
        @media (min-width:640px){ .ab-stats-grid{ grid-template-columns:repeat(3,1fr) !important; } }
        @media (min-width:1024px){ .ab-stats-grid{ grid-template-columns:repeat(5,1fr) !important; } }
    </style>`;
}

// Lightweight, dependency-free count-up animation. Runs once per render call;
// guarded so a rapid re-render doesn't stack intervals on top of each other.
function ahlulBaytAnimateStatCounters() {
    const cards = document.querySelectorAll('.ab-stat-card[data-ab-stat-target]');
    if (!cards.length) return;

    cards.forEach(card => {
        const target = parseInt(card.getAttribute('data-ab-stat-target'), 10) || 0;
        const numEl = card.querySelector('[data-ab-count]');
        if (!numEl) return;
        if (card._abCounting) return; // guard against duplicate intervals
        card._abCounting = true;

        const duration = 900;
        const startTime = performance.now();

        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
            numEl.textContent = Math.round(target * eased).toString();
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                numEl.textContent = target.toString();
                card._abCounting = false;
            }
        }
        requestAnimationFrame(step);
    });
}

// ============================================================================
// PERMANENT ROUTE ENTRY POINT
// ============================================================================
// Registered in script-4-boot.js's renderMainContent() pages map as
// `ahlulBaytUnified`. This name will never change across Section 2/3/4 —
// only its body grows (router/history integration lands here in Section 4).
// It now renders Hero + Category chips + Search + Stats + the two live tabs
// (Section 1 + Section 2) alongside the Section 3 side profile panel.
function renderAhlulBaytUnifiedPage() {
    return renderAhlulBaytUnifiedPageSection1Preview();
}

// ============================================================================
// SECTION 1 + 2 + 3 WRAPPER
// ============================================================================
// Hero + Explore by Category + Smart Search + Quick Stats + the two live
// tabs (14 Masumeen grid / Family tree) + the Section 3 side profile panel.
// showPersonDetail() still opens its own full modal exactly as it does on
// the standalone /familyTree and /imams pages (untouched) — the side panel
// here is a lighter-weight quick-preview reached via search or an "extra"
// personality card, with a button that calls that same existing modal for
// masumeen/imam entries.
function renderAhlulBaytUnifiedPageSection1Preview() {
    const hasSelection = !!getAhlulBaytPersonBySelection(state.ahlulBaytSelectedPerson);
    return `
    <div class="space-y-2 page-enter">
        ${renderAhlulBaytHero()}
        ${renderAhlulBaytCategoryChips()}
        ${renderAhlulBaytSearchBox()}
        ${renderAhlulBaytStats()}

        <div class="ab-main-grid${hasSelection ? ' ab-main-grid--split' : ''}" style="display:grid;grid-template-columns:1fr;gap:1.25rem;margin-top:1.25rem">
            <div id="ab-tab-panel-anchor" class="ab-tab-panel" style="scroll-margin-top:80px">
                ${renderAhlulBaytTabPanel()}
            </div>
            ${hasSelection ? `<div class="ab-side-panel-wrap">${renderAhlulBaytSidePanel()}</div>` : ''}
        </div>
        <style>
            @media (min-width:1024px){
                .ab-main-grid.ab-main-grid--split{ grid-template-columns:minmax(0,2fr) minmax(260px,1fr) !important; align-items:start; }
                .ab-side-panel-wrap{ position:sticky; top:90px; }
            }
        </style>
    </div>`;
}

// ============================================================================
// SECTION 4 — BACKWARD-COMPATIBLE ROUTE REDIRECTS (approved 2026-07-22)
// ============================================================================
// script-4-boot.js's renderMainContent() pages map now points its 'imams'
// and 'familyTree' keys at these two wrappers instead of straight at
// renderImamsPage/renderFamilyTreePage (see that file's pages map). That is
// the ONLY change made outside this file for Section 4 — neither
// renderImamsPage() nor renderFamilyTreePage() is renamed or edited; both
// are still called exactly as before, from inside renderAhlulBaytTabPanel()
// (Section 2) and now also from these two wrappers.
//
// Effect: every existing place in the app that already sets
// state.currentPage to 'imams' or 'familyTree' — the desktop/mobile menu
// entries, and script-2-ui.js's 'viewFamilyPerson' search-result case
// (state.currentPage='familyTree' then showPersonDetail(param)) — now
// transparently lands on the unified page with the matching tab
// pre-selected, with zero changes needed at those call sites. Old
// bookmarks/saved state pointing at either page key keep working.
//
// NOTE ON BROWSER BACK/FORWARD: this app has no URL/hash routing or
// popstate handling anywhere (checked across all files) — every page,
// including this one, navigates purely through state.currentPage +
// state.previousPage and explicit "← Back" buttons (see script-3-pages.js /
// script-4-boot.js's `data-action="changePage" data-param="${state.previousPage}"`
// pattern). There is no browser-native back/forward/refresh state to
// restore for THIS page that every other page in the app doesn't already
// share the same limitation on. What these two wrappers do give you for
// free is that `state.previousPage` will correctly read 'imams' or
// 'familyTree' (whichever the user actually arrived from), and clicking
// "← Back" from a detail page routes right back into this unified page's
// same tab.
function renderAhlulBaytImamsRedirect() {
    if (typeof state !== 'undefined' && state.ahlulBaytActiveTab !== 'masumeen') {
        state.ahlulBaytActiveTab = 'masumeen';
        state.ahlulBaytActiveCategory = 'masumeen';
    }
    return renderAhlulBaytUnifiedPage();
}
function renderAhlulBaytFamilyTreeRedirect() {
    if (typeof state !== 'undefined' && state.ahlulBaytActiveTab !== 'tree') {
        state.ahlulBaytActiveTab = 'tree';
        state.ahlulBaytActiveCategory = 'tree';
    }
    return renderAhlulBaytUnifiedPage();
}
