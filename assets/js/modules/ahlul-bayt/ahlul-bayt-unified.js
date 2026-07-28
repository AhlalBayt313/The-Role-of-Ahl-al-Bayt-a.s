// ============================================================================
// AHLUL BAYT — UNIFIED PAGE (Masumeen + Family Tree merge)
// ============================================================================

// ----------------------------------------------------------------------------
// Phase 5 (2026-07-26): the datasets below (ADDITIONAL_PERSONALITIES,
// familyTreeDatabase, familyTreeLineage, masumeen, imams) were split out of
// the single data/ahlul-bayt.json into smaller, purpose-named files under
// data/ahlul-bayt/ (masumeen.json, family-tree.json, biographies.json,
// companions.json). They are still loaded synchronously here, once, at the
// very top of the file, via the same loadJSONSync used before — so every
// const further down (whether at top level or inside the
// installAhlulBaytFallback() IIFE below) keeps reading __ahlulBaytData via
// closure exactly as before. No change to scope, load order, shape, or the
// fallback/global-install logic in that IIFE.
//
// WHY THESE STAY SYNCHRONOUS/EAGER (not lazy-hydrated like the Dua Library
// and Knowledge Center migrations): showPersonDetail(), resolvePersonById(),
// isFamilyTreeDataValid(), getGeneration(), and the flip-card/quote/timeline
// rendering all read these objects synchronously with no async/await in the
// call chain — none of them can be made to wait on a fetch without editing
// that rendering logic, which this phase is scoped to leave untouched. Each
// file is small (under 50KB) so this costs nothing in practice; it's the
// same total data, just organized into cleaner, purpose-named files.
//
// Two NEW datasets are genuinely lazy (see loadAhlulBaytSection below):
// quotes.json and timeline.json are precomputed convenience caches that no
// existing function reads yet, so they only fetch on explicit request.
//
// events.json is intentionally left empty — the real historical/Muharram
// events dataset (getAllHistoryDays(), the "ইতিহাসে আজ" widget) lives in
// script-4-boot.js, which is out of scope for this phase.
const __ahlulBaytFiles = {
  masumeen: 'data/ahlul-bayt/masumeen.json',
  familyTree: 'data/ahlul-bayt/family-tree.json',
  biographies: 'data/ahlul-bayt/biographies.json',
  companions: 'data/ahlul-bayt/companions.json',
  quotes: 'data/ahlul-bayt/quotes.json',
  timeline: 'data/ahlul-bayt/timeline.json',
  events: 'data/ahlul-bayt/events.json',
};

const __masumeenFile = loadJSONSync(__ahlulBaytFiles.masumeen) || {};
const __ahlulBaytData = {
  masumeen: __masumeenFile.masumeen || [],
  imams: __masumeenFile.imams || [],
  familyTreeLineage: loadJSONSync(__ahlulBaytFiles.familyTree) || {},
  familyTreeDatabase: loadJSONSync(__ahlulBaytFiles.biographies) || {},
  additionalPersonalities: loadJSONSync(__ahlulBaytFiles.companions) || [],
};

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
      const res = await fetch(url, { cache: 'force-cache' });
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

function renderPersonalityCard(p) {
    const d = state.darkMode, l = state.language;
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
function renderAhlulBaytTimelineEventCard(item, d, l) {
    const typeLabel = {
        eid: l==='bn'?'আনন্দময় দিন':'Joyous Day',
        special: l==='bn'?'বিশেষ রাত':'Special Night',
        martyrdom: l==='bn'?'শাহাদাত দিবস':'Day of Martyrdom'
    };
    return `
    <div style="display:flex;gap:.75rem;padding:1rem;border-radius:var(--r-lg);
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
                ? `<div style="display:flex;flex-direction:column;gap:.75rem">${events.map(ev => renderAhlulBaytTimelineEventCard(ev, d, l)).join('')}</div>`
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
function renderAhlulBaytPlaceCard(site, d, l) {
    const name = l === 'bn' ? site.nameBn : site.nameEn;
    const desc = l === 'bn' ? site.descBn : site.descEn;
    return `
    <div style="border-radius:var(--r-lg);padding:1.25rem;text-align:left;
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
                ${sites.map(site => renderAhlulBaytPlaceCard(site, d, l)).join('')}
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
// SECTION 2b — SELF-CONTAINED FALLBACK (embedded copies)
// ============================================================================
// WHY THIS EXISTS: the person asked what happens to this file's Masumeen/
// Family-Tree tabs if family-tree-data.js and the Imams & Masumeen code
// (script-1-core.js's `masumeen`/`imams` data, script-3-pages.js's
// renderImamsPage(), script-4-boot.js's family-tree render/modal functions)
// are ever deleted. Answer: nothing here would work anymore, because Section
// 2 only *calls* those functions — it doesn't carry the data or logic itself.
//
// ⚠️ UPDATE 2026-07-17: family-tree-data.js has now been DELETED, and the
// Imam/Masumeen code has been REMOVED from script-1-core.js/script-3-pages.js/
// script-4-boot.js (developer request: fully merge both into this file).
// The self-installing block below is therefore no longer a hypothetical
// "in case it's deleted later" fallback — it IS now the live, primary,
// only source for familyTreeDatabase/masumeen/imams and every render
// function listed here. It was already verbatim-complete except for one
// gap fixed during this merge: renderImamDetailPage() was missing and has
// been added (with its g.renderImamDetailPage install line) below.
// The guard pattern (`if (typeof g.X === 'undefined') g.X = X;`) is kept
// as-is — harmless now, and keeps this block safe to reuse verbatim if the
// app is ever re-split again.
//
// This block fixes that by embedding verbatim copies of that same data and
// those same functions, wrapped in a self-installing block below. It only
// activates the pieces that are actually missing — if the originals are
// still present and working, this block changes nothing and does nothing.
// That means:
//   - Right now (originals intact): zero behavior change, zero risk.
//   - If family-tree-data.js is deleted later: the "বংশবৃক্ষ" tab keeps
//     working off this embedded copy of familyTreeDatabase.
//   - If the Imams & Masumeen code is deleted later: the "চৌদ্দ মাসুম (আ)"
//     tab keeps working off this embedded copy of masumeen/imams and
//     renderImamsPage().
//
// Every function/data name below is installed onto the SAME bare global
// name the rest of the app already calls (familyTreeDatabase, masumeen,
// imams, renderImamsPage, renderFamilyTreePage, showPersonDetail,
// closePersonDetail, imamFlip, imamCardParticles, scrollToImamEl,
// shareImamQuote, etc.) — but ONLY when that name doesn't already exist.
// This is intentional: it lets renderAhlulBaytTabPanel() (Section 2, above)
// keep calling plain renderImamsPage()/renderFamilyTreePage() with no
// special-casing, and it means the standalone /imams and /familyTree pages
// would *also* keep working from this fallback if their own source files
// disappeared — this file effectively becomes a backup of both features.
//
// One dependency is intentionally NOT duplicated here: shareContent() (the
// Android-compatible share/clipboard fallback chain used by shareImamQuote,
// copyPersonCitation, etc.) and the app's generic action dispatcher
// (data-action="viewImam"/"toggleTimeline" in script-2-ui.js) are core app
// infrastructure, not part of "family-tree-data.js" or the Imams & Masumeen
// feature — they're assumed to still exist. If they too were removed, the
// "বিস্তারিত" cross-link and share buttons would silently no-op instead of
// crashing (they're already written defensively), but the flip-card quote
// view, the full detail modal, both grids, and the lineage tree itself all
// keep working either way.
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
function renderImamsPage()
{
    const d=state.darkMode; const l=state.language;

    // ── Per-imam accent colors ────────────────────────────────────────
    const ACS =['#059669','#0d9488','#be123c','#7c3aed','#0369a1','#d97706','#166534','#be123c','#0e7490','#4f46e5','#0f766e','#c9a227'];
    const ACS2=['#022c22','#134e4a','#500724','#3b0764','#0c2a4a','#78350f','#052e16','#500724','#083344','#1e1b4b','#042f2e','#065f46'];
    const CONIC=[
        'conic-gradient(from 0deg,#059669,#6ee7b7,#065f46,#34d399,#059669)',
        'conic-gradient(from 0deg,#0d9488,#5eead4,#0f766e,#99f6e4,#0d9488)',
        'conic-gradient(from 0deg,#be123c,#fda4af,#9f1239,#fb7185,#be123c)',
        'conic-gradient(from 0deg,#7c3aed,#c4b5fd,#5b21b6,#a78bfa,#7c3aed)',
        'conic-gradient(from 0deg,#0369a1,#7dd3fc,#075985,#38bdf8,#0369a1)',
        'conic-gradient(from 0deg,#d97706,#fcd34d,#b45309,#fbbf24,#d97706)',
        'conic-gradient(from 0deg,#166534,#86efac,#14532d,#4ade80,#166534)',
        'conic-gradient(from 0deg,#be123c,#fda4af,#9f1239,#fb7185,#be123c)',
        'conic-gradient(from 0deg,#0e7490,#67e8f9,#155e75,#22d3ee,#0e7490)',
        'conic-gradient(from 0deg,#4f46e5,#a5b4fc,#4338ca,#818cf8,#4f46e5)',
        'conic-gradient(from 0deg,#0f766e,#5eead4,#115e59,#2dd4bf,#0f766e)',
        'conic-gradient(from 0deg,#c9a227,#fde68a,#059669,#6ee7b7,#c9a227)',
    ];
    const MACS =['#c9a227','#be185d'];
    const MACS2=['#78350f','#881337'];
    const MCONIC=[
        'conic-gradient(from 0deg,#c9a227,#fde68a,#b45309,#fbbf24,#c9a227)',
        'conic-gradient(from 0deg,#be185d,#fda4af,#9f1239,#fb7185,#be185d)',
    ];

    // ── Distinct entrance animation per card (cycled by index, defined in style.css) ─────
    // ── Jump nav chips ────────────────────────────────────────────────
    const CHIP_BN=['আলী','হাসান','হোসাইন','সাজ্জাদ','বাকির','সাদিক','কাযিম','রেজা','জওয়াদ','হাদি','আসকারি','মাহদি'];
    const CHIP_EN=['Ali','Hasan','Husayn','Sajjad','Baqir','Sadiq','Kazim','Ridha','Jawad','Hadi','Askari','Mahdi'];
    const chips=(l==='bn'?CHIP_BN:CHIP_EN).map((name,i)=>`
        <button
            onclick="(function(){const el=document.getElementById('imam-anchor-${i+1}');scrollToImamEl(el)})()"
            style="flex-shrink:0;padding:5px 14px;border-radius:50px;font-size:.72rem;font-weight:700;
                border:1.5px solid ${ACS[i]}50;color:${ACS[i]};background:${ACS[i]}12;
                cursor:pointer;white-space:nowrap;transition:all .18s"
            onmouseover="this.style.background='${ACS[i]}28';this.style.transform='translateY(-2px)'"
            onmouseout="this.style.background='${ACS[i]}12';this.style.transform=''">
            ${i+1}. ${name}
        </button>`).join('');

    // ── Shared card renderer ──────────────────────────────────────────
    const renderCard = (im, idx, acList, ac2List, conicList, animIdx) => {
        const ac    = acList[idx % acList.length];
        const ac2   = ac2List[idx % ac2List.length];
        const conic = conicList[idx % conicList.length];
        const flipId= `imam-flip-${im.id}`;
        const quoteText   = sanitize(l==='bn'?im.quoteBn:im.quoteEn);
        const avatarArabic= im.arabicName ? im.arabicName.split(' ')[0] : (im.icon||'✦');
        const animVariant = (typeof animIdx==='number'?animIdx:idx) % 10;
        const animDelay   = ((idx % 6) * 0.08).toFixed(2);

        // Special rings
        const isHussain = im.id===3;
        const isMahdi   = im.id===12;
        let outerRing = '';
        if (isHussain) {
            outerRing = `
            <div style="position:absolute;inset:-7px;border-radius:50%;border:2px solid #b91c1c;z-index:0;opacity:.78"></div>
            <div style="position:absolute;inset:-12px;border-radius:50%;border:1.5px solid #dc2626;z-index:0;opacity:.42"></div>`;
        } else if (isMahdi) {
            outerRing = `<div style="position:absolute;inset:-9px;border-radius:50%;border:2.5px dashed #6366f1;z-index:0;opacity:.68;animation:avatarRotate 18s linear infinite reverse"></div>`;
        }

        return `
        <div class="imam-flip-wrapper" style="height:100%;position:relative">

            <!-- ── FRONT ── -->
            <div class="imam-card-luxury imam-card-front imam-anim-${animVariant} border text-center p-5"
                id="${flipId}-front"
                style="display:flex;flex-direction:column;
                    background:${d?'#1e2d26':'#ffffff'};
                    border-color:${d?'rgba(52,211,153,.15)':'rgba(5,150,105,.1)'};
                    box-shadow:var(--shadow-sm);height:100%;border-radius:var(--r-lg);
                    animation-delay:${animDelay}s"
                onmouseenter="imamCardParticles(this,'${ac}')">

                <!-- Animated top gradient bar -->
                <div class="imam-top-bar"
                    style="background:linear-gradient(90deg,${ac},${ac}cc,#c9a227,${ac2},${ac});background-size:300% 100%">
                </div>

                <!-- Imam number badge -->
                ${typeof im.id==='number'
                    ? `<div class="imam-num" style="background:linear-gradient(135deg,#c9a227,#92400e)">${im.id}</div>`
                    : ''}

                <!-- Avatar -->
                <div style="position:relative;display:flex;justify-content:center;margin:1rem 0 1rem">
                    <div class="imam-avatar-inner-wrap" style="width:86px;height:86px;border-radius:50%;position:relative">
                        ${outerRing}
                        <div class="imam-avatar-rotate"
                            style="position:absolute;inset:-3px;border-radius:50%;background:${conic};animation:avatarRotate 8s linear infinite;z-index:1">
                        </div>
                        <div style="position:absolute;inset:0;border-radius:50%;
                            background:${d?'#1e2d26':'#ffffff'};z-index:2;
                            display:flex;align-items:center;justify-content:center;
                            font-family:'Amiri',serif;font-size:1.5rem;font-weight:700;
                            color:${ac};border:2.5px solid ${d?'rgba(52,211,153,.18)':'rgba(5,150,105,.12)'};
                            text-align:center;padding:4px;line-height:1.1">
                            ${avatarArabic}
                        </div>
                    </div>
                </div>

                <!-- Name -->
                <h3 class="font-black text-base leading-snug mb-0.5" style="color:${d?'#f9fafb':'#111827'}">
                    ${sanitize(l==='bn'?im.nameBn:im.nameEn)}
                </h3>

                <!-- Arabic name shimmer -->
                <p class="mb-3" style="font-family:'Amiri',serif;font-size:.9rem;opacity:.85">
                    <span class="imam-arabic-shimmer">${sanitize(im.arabicName)}</span>
                </p>

                <!-- Epithet badge -->
                <div style="display:flex;justify-content:center;margin-bottom:1.1rem">
                    <span class="imam-epithet-badge text-xs font-bold px-3 py-1.5 rounded-full"
                        style="background:${ac}20;color:${ac};border:1.5px solid ${ac}38">
                        ${sanitize(l==='bn'?im.epithetBn:im.epithetEn)}
                    </span>
                </div>

                <!-- Quote preview -->
                <div class="imam-quote-wrap rounded-xl p-3 mb-4 text-left"
                    style="border-left:3px solid ${ac};background:${ac}09;flex:1;display:flex;align-items:flex-start">
                    <p class="text-xs italic leading-relaxed" style="color:${d?'#9ca3af':'#6b7280'};margin:0;
                        overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">
                        "${quoteText}"
                    </p>
                </div>

                <!-- Action buttons -->
                <div class="flex gap-2">
                    <button data-action="viewImam" data-param="${im.id}"
                        class="imam-detail-btn flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style="background:linear-gradient(135deg,${ac},${ac2});color:white;
                            box-shadow:0 3px 12px ${ac}42;letter-spacing:.2px">
                        ${l==='bn'?'বিস্তারিত':'Details'}
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" style="display:inline;margin-left:4px" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                    </button>
                    <button data-action="shareImamQuote" data-param="${im.id}"
                        class="px-3 py-2.5 rounded-xl text-xs font-bold hover:scale-110 transition-all flex items-center justify-center"
                        style="background:${ac}15;color:${ac};border:1.5px solid ${ac}30"
                        title="${l==='bn'?'শেয়ার করুন':'Share'}" aria-label="${l==='bn'?'শেয়ার করুন':'Share'} ${sanitize(l==='bn'?im.nameBn:im.nameEn)}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                    </button>
                </div>
            </div><!-- /front -->

            <!-- ── BACK (quote card) ── -->
            <div class="imam-card-back" id="${flipId}-back"
                style="display:none;position:absolute;inset:0;
                    background:linear-gradient(145deg,${ac2},${d?'#0a1a0e':'#022c22'});
                    color:white;border:1px solid ${ac}40;
                    box-shadow:var(--shadow-lg);border-radius:var(--r-lg)">
                <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,${ac}28 0%,transparent 70%);pointer-events:none;border-radius:var(--r-lg)"></div>
                <div style="position:relative;z-index:2;width:100%;text-align:center">
                    <div style="font-family:'Amiri',serif;font-size:2.5rem;color:${ac};margin-bottom:.4rem;line-height:1">❝</div>
                    <p style="font-family:'Amiri',serif;font-size:1.05rem;line-height:1.75;
                        color:rgba(255,255,255,.92);margin-bottom:1.1rem;padding:0 .5rem">
                        ${sanitize(l==='bn'?im.quoteBn:im.quoteEn)}
                    </p>
                    <div style="width:44px;height:2px;background:${ac};margin:0 auto .8rem;border-radius:2px"></div>
                    <p style="font-size:.75rem;font-weight:700;color:${ac};letter-spacing:.5px">
                        ${sanitize(l==='bn'?im.nameBn:im.nameEn)}
                    </p>
                    <button onclick="imamFlip('${flipId}')"
                        style="margin-top:1.2rem;padding:7px 20px;border-radius:50px;
                            background:${ac}30;border:1px solid ${ac}60;
                            color:white;font-size:.75rem;cursor:pointer;transition:background .2s"
                        onmouseover="this.style.background='${ac}55'"
                        onmouseout="this.style.background='${ac}30'">
                        ← ${l==='bn'?'ফিরে যান':'Back'}
                    </button>
                </div>
            </div><!-- /back -->

        </div>`;
    };

    return `
    <div class="space-y-8 page-enter">

        <!-- ── Page header ── -->
        <div class="flex flex-wrap justify-between items-start gap-3 reveal">
            <div>
                <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    👑 ${l==='bn'?'ইমাম ও মাসুমিন (আ.)':'Imams & Masumeen (AS)'}
                </h1>
                <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">
                    ${l==='bn'?'পবিত্র নবী, মাসুমিন ও ১২ ইমামের জীবনী':'Lives of the Holy Prophet, Masumeen & 12 Imams'}
                </p>
            </div>
            <button data-action="toggleTimeline" aria-pressed="${state.showTimeline?'true':'false'}"
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style="${state.showTimeline
                    ? 'background:rgba(5,150,105,.14);color:#059669;border:1.5px solid rgba(5,150,105,.38)'
                    : 'border:1.5px solid '+(d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)')+';color:'+(d?'#6b7280':'#9ca3af')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                ${l==='bn'?'টাইমলাইন':'Timeline'}${state.showTimeline?' ✓':''}
            </button>
        </div>

        <!-- ── Timeline (optional) ── -->
        ${state.showTimeline ? renderImamTimeline(d,l) : ''}

        <!-- ── Jump nav chips ── -->
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 1px 6px">
            <div style="display:flex;gap:7px;width:max-content">${chips}</div>
        </div>

        <!-- ── মাসুমিন section ── -->
        <div class="reveal">
            <div class="section-heading">
                <span style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#c9a227,#78350f);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;box-shadow:0 4px 14px rgba(201,162,39,.38)" aria-hidden="true">✨</span>
                <h2 class="font-black text-lg" style="color:${d?'#f9fafb':'#111827'}">
                    ${l==='bn'?'নবী ও মাসুমিন (আ.)':'Prophet & Masumeen (AS)'}
                </h2>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                    style="background:rgba(201,162,39,.15);color:#c9a227;border:1px solid rgba(201,162,39,.3)">
                    ${l==='bn'?'২ জন':'2'}
                </span>
            </div>
            <div class="grid sm:grid-cols-2 gap-5 items-stretch">
                ${masumeen.map((im,idx)=>`
                <div style="min-height:320px">${renderCard(im,idx,MACS,MACS2,MCONIC,idx)}</div>`).join('')}
            </div>
        </div>

        <!-- ── ১২ ইমাম section ── -->
        <div class="reveal">
            <div class="section-heading">
                <span style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;box-shadow:0 4px 14px rgba(5,150,105,.4)" aria-hidden="true">👑</span>
                <h2 class="font-black text-lg" style="color:${d?'#f9fafb':'#111827'}">
                    ${l==='bn'?'বারো ইমাম (আ.)':'The Twelve Imams (AS)'}
                </h2>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                    style="background:rgba(5,150,105,.12);color:#059669;border:1px solid rgba(5,150,105,.25)">
                    ${l==='bn'?'১২ জন':'12'}
                </span>
            </div>
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                ${imams.map((im,idx)=>`
                <div id="imam-anchor-${im.id}">${renderCard(im,idx,ACS,ACS2,CONIC,idx+masumeen.length)}</div>`).join('')}
            </div>
        </div>

    </div>`;
}
function renderImamTimeline(d, l) {
    const timelineImams = imams.map(im => ({
        ...im,
        birthYear: parseInt((im.birthEn||'').match(/\d+/)?.[0]||0),
        deathYear: (im.martyrdomEn||'').includes('Occultation')
            ? 'Present'
            : parseInt((im.martyrdomEn||'').match(/\d+/)?.[0]||0),
    }));
    const minYear=600, maxYear=880, range=maxYear-minYear;
    const barColors=['#059669','#0d9488','#be123c','#7c3aed','#0369a1','#d97706','#166534','#be123c','#0e7490','#4f46e5','#0f766e','#c9a227'];

    // ── Era filter chips (interactive timeline) ──
    const eraFilters=[
        {key:'all',     label:l==='bn'?'সবাই':'All',           range:[minYear,maxYear]},
        {key:'umayyad', label:l==='bn'?'উমাইয়া যুগ':'Umayyad',  range:[661,750]},
        {key:'abbasid', label:l==='bn'?'আব্বাসীয় যুগ':'Abbasid', range:[750,maxYear]},
    ];
    const activeEra = eraFilters.find(f=>f.key===(state.timelineEra||'all')) || eraFilters[0];

    return `
    <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl p-6 fade-in" style="box-shadow:var(--shadow-md)">
        <div class="gold-top-bar" style="border-radius:12px 12px 0 0;margin:-24px -24px 20px"></div>
        <h2 class="text-base font-bold mb-1 text-center">${l==='bn'?'ইমামদের জীবনকাল টাইমলাইন':'Imams Lifetime Timeline'}</h2>
        <p class="text-center text-xs mb-4" style="color:${d?'#6b7280':'#9ca3af'}">${l==='bn'?'খ্রিস্টাব্দ ৬০০–৮৮০ · একটি বার ক্লিক করে বিস্তারিত দেখুন':'600 CE – 880 CE · Click a bar to view details'}</p>

        <!-- Era filter chips -->
        <div style="display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin-bottom:18px" role="group" aria-label="${l==='bn'?'যুগ ফিল্টার':'Era filter'}">
            ${eraFilters.map(f=>{
                const isActive=f.key===activeEra.key;
                return `<button data-action="setTimelineEra" data-param="${f.key}" aria-pressed="${isActive?'true':'false'}"
                    style="font-size:11.5px;font-weight:700;padding:6px 15px;border-radius:50px;cursor:pointer;
                    transition:all .18s;
                    background:${isActive?'#059669':(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)')};
                    color:${isActive?'#fff':(d?'#9ca3af':'#6b7280')};
                    border:1.5px solid ${isActive?'#059669':(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')}">
                    ${f.label}
                </button>`;
            }).join('')}
        </div>

        <div class="space-y-2.5">
            ${timelineImams.map((im,idx)=>{
                const startPct=Math.max(0,((im.birthYear-minYear)/range)*100);
                const endYear=typeof im.deathYear==='number'?im.deathYear:maxYear;
                const widthPct=Math.max(2,((endYear-im.birthYear)/range)*100);
                const c=barColors[idx%barColors.length];
                const inEra = activeEra.key==='all' || (im.birthYear<=activeEra.range[1] && endYear>=activeEra.range[0]);
                const deathLabel = typeof im.deathYear==='string'
                    ? (l==='bn'?'বর্তমান (গায়েবত)':'Present (Occultation)')
                    : `${im.deathYear}`;
                const nameForTip = l==='bn'?(im.nameBn||''):(im.nameEn||'');
                const tooltip = `${nameForTip} — ${im.birthYear} ${l==='bn'?'থেকে':'to'} ${deathLabel}`;
                return `
                <div class="imam-timeline-row reveal reveal-delay-${(idx%4)+1}" data-action="viewImam" data-param="${im.id}"
                    role="button" tabindex="0" title="${sanitize(tooltip)}" aria-label="${sanitize(tooltip)}"
                    style="display:flex;align-items:center;gap:.75rem;cursor:pointer;opacity:${inEra?1:.3};transition:opacity .25s">
                    <div class="text-right flex-shrink-0" style="width:130px">
                        <span class="text-xs font-semibold" style="color:${d?'#d1d5db':'#374151'}">${im.icon} ${sanitize(l==='bn'?im.nameBn.replace('ইমাম ',''):im.nameEn.replace('Imam ',''))}</span>
                    </div>
                    <div class="flex-1 relative" style="height:26px">
                        <div class="w-full h-full absolute rounded-full" style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}"></div>
                        <div class="imam-timeline-bar h-full absolute rounded-full flex items-center px-2 overflow-hidden"
                            style="left:${startPct.toFixed(1)}%;width:${Math.min(widthPct,100-startPct).toFixed(1)}%;min-width:28px;background:${c}">
                            <span class="text-white text-xs font-bold truncate">${im.birthYear}</span>
                        </div>
                    </div>
                    <div class="flex-shrink-0 text-xs" style="width:46px;color:${d?'#6b7280':'#9ca3af'}">${typeof im.deathYear==='string'?'—':im.deathYear}</div>
                </div>`;
            }).join('')}
        </div>
        <div class="flex justify-between mt-4 px-0" style="margin-left:142px;margin-right:58px">
            ${[600,650,700,750,800,850].map(yr=>`<span class="text-xs" style="color:${d?'#4b5563':'#9ca3af'}">${yr}</span>`).join('')}
        </div>
    </div>`;
}
function renderImamDetailPage()
{
    const d=state.darkMode; const l=state.language;
    const im=state.currentImam;
    if(!im) return renderImamsPage();
    const allList=[...masumeen,...imams];
    const idx=allList.findIndex(x=>x.id===im.id);
    const prev=idx>0?allList[idx-1]:null;
    const next=idx<allList.length-1?allList[idx+1]:null;
    const isMasumeen=masumeen.some(m=>m.id===im.id);
    const colorIdx=isMasumeen?masumeen.findIndex(m=>m.id===im.id):imams.indexOf(im);
    const ACS=['#059669','#0d9488','#c9a227','#7c3aed','#0369a1','#d97706','#166534','#be123c','#0e7490','#4f46e5','#0f766e','#c9a227'];
    const ACS2=['#022c22','#134e4a','#7a5c0a','#3b0764','#0c2a4a','#78350f','#052e16','#500724','#083344','#1e1b4b','#042f2e','#065f46'];
    const CONIC2=['conic-gradient(from 0deg,#059669,#6ee7b7,#065f46,#34d399,#059669)','conic-gradient(from 0deg,#0d9488,#5eead4,#0f766e,#99f6e4,#0d9488)','conic-gradient(from 0deg,#c9a227,#fde68a,#b45309,#fbbf24,#c9a227)','conic-gradient(from 0deg,#7c3aed,#c4b5fd,#5b21b6,#a78bfa,#7c3aed)','conic-gradient(from 0deg,#0369a1,#7dd3fc,#075985,#38bdf8,#0369a1)','conic-gradient(from 0deg,#d97706,#fcd34d,#b45309,#fbbf24,#d97706)','conic-gradient(from 0deg,#166534,#86efac,#14532d,#4ade80,#166534)','conic-gradient(from 0deg,#be123c,#fda4af,#9f1239,#fb7185,#be123c)','conic-gradient(from 0deg,#0e7490,#67e8f9,#155e75,#22d3ee,#0e7490)','conic-gradient(from 0deg,#4f46e5,#a5b4fc,#4338ca,#818cf8,#4f46e5)','conic-gradient(from 0deg,#0f766e,#5eead4,#115e59,#2dd4bf,#0f766e)','conic-gradient(from 0deg,#c9a227,#fde68a,#059669,#6ee7b7,#c9a227)'];
    const MACS=['#c9a227','#be185d'];const MACS2=['#78350f','#881337'];const MCONIC2=['conic-gradient(from 0deg,#c9a227,#fde68a,#b45309,#fbbf24,#c9a227)','conic-gradient(from 0deg,#be185d,#fda4af,#9f1239,#fb7185,#be185d)'];
    const ac=isMasumeen?MACS[colorIdx%2]:ACS[colorIdx%12];
    const ac2=isMasumeen?MACS2[colorIdx%2]:ACS2[colorIdx%12];
    const conic2=isMasumeen?MCONIC2[colorIdx%2]:CONIC2[colorIdx%12];
    return `
    <div class="max-w-2xl mx-auto page-enter">
        <button data-action="changePage" data-param="imams"
            class="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all"
            style="background:${ac}12;color:${ac}">
            ← ${l==='bn'?'সকল ইমাম':'All Imams'}
        </button>
        <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border mb-6"
            style="box-shadow:var(--shadow-lg);position:relative">
            <div style="height:4px;background:linear-gradient(90deg,${ac},${ac2},${ac});border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
            <div style="background:linear-gradient(135deg,${ac}10,transparent,${ac2}07);padding:2.5rem 2rem 1.5rem;text-align:center;position:relative">
                <div style="position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${ac},${ac2});display:flex;align-items:center;justify-content:center;color:white;font-size:${typeof im.id==='number'?'.75rem':'1rem'};font-weight:800;box-shadow:0 3px 10px ${ac}50">
                    ${typeof im.id==='number'?im.id:im.icon}
                </div>
                <div style="position:relative;display:flex;justify-content:center;margin-bottom:1.2rem">
                    <div style="width:96px;height:96px;border-radius:50%;position:relative">
                        ${im.id===3?`<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid #b91c1c;z-index:0;opacity:.75"></div><div style="position:absolute;inset:-13px;border-radius:50%;border:1.5px solid #dc2626;z-index:0;opacity:.4"></div>`:''}
                        ${im.id===12?`<div style="position:absolute;inset:-9px;border-radius:50%;border:2.5px dashed #6366f1;z-index:0;opacity:.65;animation:avatarRotate 18s linear infinite reverse"></div>`:''}
                        <div style="position:absolute;inset:-4px;border-radius:50%;background:${conic2};animation:avatarRotate 7s linear infinite;z-index:1"></div>
                        <div style="position:absolute;inset:0;border-radius:50%;background:${d?'#1f2937':'white'};z-index:2;display:flex;align-items:center;justify-content:center;font-family:'Amiri',serif;font-size:2rem;font-weight:700;color:${ac2}">
                            ${im.arabicName.split(' ')[0]||im.icon}
                        </div>
                    </div>
                </div>
                <h1 class="text-2xl md:text-3xl font-black mb-2">${sanitize(l==='bn'?im.nameBn:im.nameEn)}</h1>
                <p class="arabic-text mb-3" style="font-size:1.5rem;color:${ac}">${sanitize(im.arabicName)}</p>
                <span class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold"
                    style="background:${ac}18;color:${ac};border:1px solid ${ac}28">
                    ✨ ${sanitize(l==='bn'?im.epithetBn:im.epithetEn)}
                </span>
            </div>
            <div class="p-6 pt-2">
                <div class="grid grid-cols-2 gap-3 mb-5">
                    <div class="rounded-2xl p-4" style="background:${d?'rgba(255,255,255,.05)':'rgba(0,0,0,.03)'};border:1px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'}">
                        <p class="font-bold text-xs mb-1.5" style="color:${ac}">🌙 ${l==='bn'?'জন্ম':'Birth'}</p>
                        <p class="font-semibold text-sm">${sanitize(l==='bn'?im.birthBn:im.birthEn)}</p>
                    </div>
                    <div class="rounded-2xl p-4" style="background:${d?'rgba(255,255,255,.05)':'rgba(0,0,0,.03)'};border:1px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'}">
                        <p class="font-bold text-xs mb-1.5" style="color:${ac}">⚔️ ${l==='bn'?'শাহাদাত':'Martyrdom'}</p>
                        <p class="font-semibold text-sm">${sanitize(l==='bn'?im.martyrdomBn:im.martyrdomEn)}</p>
                    </div>
                </div>
                <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-2xl p-5 mb-5">
                    <h3 class="font-bold mb-3 text-sm">📝 ${l==='bn'?'পরিচিতি':'About'}</h3>
                    <p class="${d?'text-gray-300':'text-gray-700'} leading-relaxed text-sm">${sanitize(l==='bn'?im.descBn:im.descEn)}</p>
                </div>
                <div class="rounded-2xl p-5" style="background:linear-gradient(135deg,${ac}0d,${ac2}07);border-left:4px solid ${ac}">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-bold text-sm flex items-center gap-2">
                            <span style="color:${ac}">💬</span>${l==='bn'?'বিখ্যাত উক্তি':'Famous Quote'}
                        </h3>
                        <button data-action="shareImamQuote" data-param="${im.id}"
                            class="text-xs px-3 py-1.5 rounded-xl font-bold hover:scale-105 transition-all"
                            style="background:${ac}18;color:${ac}">
                            🔗 ${l==='bn'?'শেয়ার':'Share'}
                        </button>
                    </div>
                    <p class="text-base italic leading-relaxed">"${sanitize(l==='bn'?im.quoteBn:im.quoteEn)}"</p>
                </div>
            </div>
        </div>
        <div class="flex justify-between gap-4">
            ${prev?`<button data-action="viewImam" data-param="${prev.id}"
                class="${d?'bg-gray-800 hover:bg-gray-700 border-gray-700':'bg-white hover:bg-gray-50 border-gray-200'} border rounded-2xl px-5 py-3 font-semibold text-sm flex items-center gap-2 hover:scale-[1.02] transition-all"
                style="flex:1">← ${sanitize(l==='bn'?prev.nameBn:prev.nameEn)}</button>`:'<div style="flex:1"></div>'}
            ${next?`<button data-action="viewImam" data-param="${next.id}"
                class="${d?'bg-gray-800 hover:bg-gray-700 border-gray-700':'bg-white hover:bg-gray-50 border-gray-200'} border rounded-2xl px-5 py-3 font-semibold text-sm flex items-center gap-2 justify-end hover:scale-[1.02] transition-all"
                style="flex:1">${sanitize(l==='bn'?next.nameBn:next.nameEn)} →</button>`:'<div style="flex:1"></div>'}
        </div>
    </div>`;
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
function renderFamilyTreePage() {
  const d = state.darkMode; const l = state.language;

  // Bug #12 fix: familyTreeDatabase lives in family-tree-data.js which may not
  // have loaded yet (slow network, load-order issue). Crashing here with
  // "Cannot read property 'prophet' of undefined" takes down the whole page.
  if (typeof familyTreeDatabase === 'undefined' || !familyTreeDatabase) {
    return `<div class="space-y-6 page-enter">
      <h2 class="text-3xl font-black" style="color:${d?'#f9fafb':'#111827'}">🌳 ${l==='bn'?'বংশধারা':'Family Tree'}</h2>
      <p style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'ডেটা লোড হচ্ছে... একটু অপেক্ষা করুন।':'Loading data… please wait.'}</p>
    </div>`;
  }

  const p = familyTreeDatabase.prophet;

  // Populate the imams grid + wire up modal after the markup is inserted into the DOM
  setTimeout(() => {
    if (typeof initFamilyTree === 'function') {
      initFamilyTree();
    }
  }, 0);

  return `
  <div class="space-y-6 page-enter">
    <div>
        <h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🌳 ${l==='bn'?'বংশধারা':'Family Tree'}</h2>
        <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'নবী মুহাম্মদ (সা) থেকে ১২ ইমাম পর্যন্ত':'From Prophet Muhammad (PBUH) to the 12 Imams'}</p>
    </div>

    <div class="family-tree-container">
      <!-- Prophet Card -->
      <div class="prophet-card" onclick="showPersonDetail('prophet')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showPersonDetail('prophet');}" role="button" tabindex="0" aria-label="${escapeHtml(l==='bn'?p.bengaliName:(p.englishAbbr||p.englishName))}">
        <div class="card-badge">${l==='bn'?'প্রথম জ্যোতি':'First Generation'}</div>
        <div class="card-name">${p.arabicName}</div>
        <div class="card-bengali">${l==='bn'?p.bengaliName:(p.englishAbbr||p.englishName)}</div>
      </div>

      <div class="hierarchy-divider"><div class="tree-stem"></div><div class="tree-node"></div><div class="tree-stem"></div></div>

      <!-- Fatima Zahra: genealogical bridge -->
      <div class="fatima-card" onclick="showPersonDetail('fatima')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showPersonDetail('fatima');}" role="button" tabindex="0" aria-label="${escapeHtml(l==='bn'?familyTreeDatabase.fatima.bengaliName:(familyTreeDatabase.fatima.englishAbbr||familyTreeDatabase.fatima.englishName))}">
        <div class="fatima-role">${l==='bn'?'সংযোগসূত্র · নবীর কন্যা':'The Bridge · Daughter of the Prophet'}</div>
        <div class="fatima-arabic">${familyTreeDatabase.fatima.arabicName}</div>
        <div class="fatima-bengali">${l==='bn'?familyTreeDatabase.fatima.bengaliName:(familyTreeDatabase.fatima.englishAbbr||familyTreeDatabase.fatima.englishName)}</div>
      </div>

      <div class="hierarchy-divider"><div class="tree-stem"></div><div class="tree-node"></div><div class="tree-stem"></div></div>

      <!-- Founding generation: Ali, Hasan, Husain -->
      <div class="tree-section-label">${l==='bn'?'প্রতিষ্ঠাতা প্রজন্ম':'Founding generation'}</div>
      <div class="imams-grid founding-grid" id="founding-imams-container"></div>

      <div class="tree-section-label">${l==='bn'?'ইমামতের ধারা — ৪র্থ থেকে ১১তম':'The lineage — 4th to 11th'}</div>
      <div class="imams-grid lineage-grid" id="lineage-imams-container"></div>

      <!-- 12th Imam: awaited -->
      <div class="mahdi-wrap" id="mahdi-imam-container"></div>
    </div>

    <!-- Detail Modal -->
    <div id="person-detail-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-body">
      <div class="modal-backdrop" onclick="closePersonDetail()"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="closePersonDetail()" aria-label="${l==='bn'?'বন্ধ করুন':'Close'}">✕</button>
        <div id="modal-body"></div>
      </div>
    </div>
  </div>`;
}
// ============ FAMILY TREE FUNCTIONS ============

// English ordinal helper (1 -> 1st, 2 -> 2nd, 3 -> 3rd, 4 -> 4th, ...)
function ordinalEn(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function renderFamilyTree() {
  const foundingContainer = document.getElementById('founding-imams-container');
  const lineageContainer = document.getElementById('lineage-imams-container');
  const mahdiContainer = document.getElementById('mahdi-imam-container');
  if (!foundingContainer || !lineageContainer || !mahdiContainer || !familyTreeDatabase) return;
  const l = state.language;

  const cardMarkup = (imam, tierClass) => {
    const orderLabel = l === 'bn' ? `${imam.order} ইমাম` : `${ordinalEn(imam.id)} Imam`;
    const nameLabel = l === 'bn' ? imam.bengaliName : `Imam ${imam.englishAbbr || imam.englishName}`;
    return `
    <button class="imam-card ${tierClass}" onclick="showPersonDetail('${imam.id}')">
      <div class="imam-order">${orderLabel}</div>
      <div class="imam-bengali">${nameLabel}</div>
      <div class="imam-arabic">${imam.arabicName}</div>
      ${tierClass === 'tier-mahdi' ? `<div class="mahdi-tag">${l==='bn'?'অপেক্ষিত · গায়বাতে কুবরা':'Awaited · in occultation'}</div>` : ''}
    </button>
  `;
  };

  const founding = familyTreeDatabase.imams.filter(i => i.id >= 1 && i.id <= 3);
  const lineage = familyTreeDatabase.imams.filter(i => i.id >= 4 && i.id <= 11);
  const mahdi = familyTreeDatabase.imams.find(i => i.id === 12);

  foundingContainer.innerHTML = founding.map(imam => cardMarkup(imam, 'tier-founding')).join('');
  lineageContainer.innerHTML = lineage.map(imam => cardMarkup(imam, 'tier-lineage')).join('');
  mahdiContainer.innerHTML = mahdi ? cardMarkup(mahdi, 'tier-mahdi') : '';
}
function showPersonDetail(personId) {
  const modal = document.getElementById('person-detail-modal');
  const modalBody = document.getElementById('modal-body');
  const l = state.language;
  
  let person = _resolveFamilyTreePerson(personId);
  
  if (!person) return;
  
  const L = l === 'bn' ? {
    birth:'জন্ম', death:'মৃত্যু', reign:'মেয়াদ', place:'স্থান',
    parents:'পিতামাতা', spouse:'পত্নী', children:'সন্তান',
    significance:'গুরুত্ব', causeOfDeath:'মৃত্যু কারণ', shrine:'মাজার',
    knowledgeFields:'জ্ঞান ক্ষেত্র', students:'শিক্ষার্থী',
    kunyah:'কুনিয়াত', laqab:'লকব/উপাধি', sources:'সূত্র', fullProfile:'সম্পূর্ণ প্রোফাইল ও উক্তি দেখুন'
  } : {
    birth:'Birth', death:'Death', reign:'Imamate Period', place:'Place',
    parents:'Parents', spouse:'Spouse', children:'Children',
    significance:'Significance', causeOfDeath:'Cause of Death', shrine:'Shrine',
    knowledgeFields:'Fields of Knowledge', students:'Students',
    kunyah:'Kunyah', laqab:'Laqab / Title', sources:'Sources', fullProfile:'View Full Profile & Quote'
  };
  
  // Relationships (linked, within this dataset) + Timeline + Opponents —
  // all derived via family-tree-data.js helpers from data that already
  // exists; nothing new is fabricated here.
  const familyLinks = (typeof getFamilyLinks === 'function') ? getFamilyLinks(personId) : { parents: [], children: [], spouse: [], siblings: [] };
  const timeline = (typeof getPersonTimeline === 'function') ? getPersonTimeline(person) : [];
  const opponentsList = (typeof getPersonOpponents === 'function') ? getPersonOpponents(person) : [];

  const L2 = l === 'bn' ? {
    relationships:'সম্পর্ক (বংশধারায়)', siblings:'ভাই-বোন', timeline:'জীবনরেখা', opponents:'প্রতিপক্ষ'
  } : {
    relationships:'Relationships (in this lineage)', siblings:'Siblings', timeline:'Timeline', opponents:'Opponents'
  };

  // একটি family-link ব্যক্তির জন্য ক্লিকযোগ্য pill বানায়
  const linkPill = (p) => {
    const name = l === 'bn' ? p.bengaliName : (p.englishName || p.englishAbbr || p.bengaliName);
    return `<button class="family-link-pill" onclick="showPersonDetail('${p.refId}')"
      style="background:${p.color || '#3B82F6'}15;color:${p.color || '#3B82F6'};border:1px solid ${p.color || '#3B82F6'}30;
      padding:5px 12px;border-radius:50px;font-size:.78rem;font-weight:600;cursor:pointer;margin:2px">
      ${escapeHtml(name)}
    </button>`;
  };
  const linkGroup = (label, list) => list.length ? `
    <div style="margin-bottom:8px">
      <span style="font-size:.75rem;font-weight:700;opacity:.7">${label}:</span>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px">${list.map(linkPill).join('')}</div>
    </div>` : '';

  // Stats, completion %, badges, citation — reuses family-tree-data.js
  // helpers, no new facts introduced here.
  const stats = (typeof getProfileStats === 'function') ? getProfileStats(personId, person) : null;
  const completion = (typeof getProfileCompletion === 'function') ? getProfileCompletion(person) : null;
  const badges = (typeof getProfileBadges === 'function') ? getProfileBadges(personId, person) : [];

  const L3 = l === 'bn' ? {
    generation:'প্রজন্ম', age:'মৃত্যুকালীন বয়স', childrenCount:'সন্তান সংখ্যা',
    knownRelatives:'পরিচিত আত্মীয় (বংশধারায়)', period:'ঐতিহাসিক পর্যায়',
    completion:'প্রোফাইল সম্পূর্ণতা', missing:'বাকি আছে', copyCitation:'সাইটেশন কপি করুন', print:'প্রিন্ট করুন'
  } : {
    generation:'Generation', age:'Age at Death', childrenCount:'Children Count',
    knownRelatives:'Known Relatives (in lineage)', period:'Historical Period',
    completion:'Profile Completion', missing:'Missing', copyCitation:'Copy Citation', print:'Print'
  };

  const statRow = (label, val) => val ? `<div style="text-align:center;padding:6px 4px">
    <div style="font-size:.68rem;opacity:.65">${label}</div>
    <div style="font-size:.9rem;font-weight:700">${escapeHtml(String(val))}</div>
  </div>` : '';

  const displayName = l === 'bn' ? person.bengaliName : (person.englishName || person.englishAbbr || person.bengaliName);

  const avatarLabel = l === 'bn' ? (person.order || '✧') : (person.id ? person.id : '✧');

  // Cross-link to the richer quote/epithet profile on the Imams & Masumeen
  // page. That page keys the Prophet/Fatima as masumeen ids 'p'/'f', and the
  // 12 Imams as numeric ids 1-12 — same numbering as familyTreeDatabase.imams,
  // so no separate mapping table is needed.
  const crossLinkParam = personId === 'prophet' ? 'p' : (personId === 'fatima' ? 'f' : person.id);
  
  const html = `
    <div class="modal-header">
      <div class="modal-avatar" style="background-color: ${person.color || '#3B82F6'}; color: ${person.textColor || '#FFFFFF'};">
        ${avatarLabel}
      </div>
      <div class="modal-titles">
        <h2>${displayName}</h2>
        <p>${person.arabicName}</p>
        ${(person.kunyah || person.laqab) ? `
        <p class="kunyah-laqab-line" style="font-size:.8rem;opacity:.85;margin-top:2px">
          ${person.kunyah ? `<span>${L.kunyah}: ${escapeHtml(person.kunyah)}</span>` : ''}
          ${(person.kunyah && person.laqab) ? ' · ' : ''}
          ${person.laqab ? `<span>${L.laqab}: ${escapeHtml(person.laqab)}</span>` : ''}
        </p>` : ''}
        ${badges.length ? `
        <div class="badges-row" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
          ${badges.map(b => `<span style="font-size:.7rem;font-weight:700;background:rgba(120,120,120,.12);padding:3px 9px;border-radius:50px">${b.icon} ${escapeHtml(b.label)}</span>`).join('')}
        </div>` : ''}
      </div>
    </div>
    
    ${person.description ? `<p class="description-text">${person.description}</p>` : ''}
    
    <div class="info-grid">
      ${person.birth ? `
        <div class="info-box">
          <div class="info-label">${L.birth}</div>
          <div class="info-value">${person.birth}</div>
        </div>
      ` : ''}
      ${person.death ? `
        <div class="info-box">
          <div class="info-label">${L.death}</div>
          <div class="info-value">${person.death}</div>
        </div>
      ` : ''}
      ${person.reignYears ? `
        <div class="info-box">
          <div class="info-label">${L.reign}</div>
          <div class="info-value">${person.reignYears}</div>
        </div>
      ` : ''}
      ${person.deathPlace ? `
        <div class="info-box">
          <div class="info-label">${L.place}</div>
          <div class="info-value">${person.deathPlace}</div>
        </div>
      ` : ''}
    </div>
    
    ${person.features ? `
      <div class="features-list">
        ${person.features.map(f => `<span class="feature-badge">${f}</span>`).join('')}
      </div>
    ` : ''}
    
    ${person.parents ? `<p class="description-text"><strong>${L.parents}:</strong> ${person.parents}</p>` : ''}
    ${person.spouse ? `<p class="description-text"><strong>${L.spouse}:</strong> ${Array.isArray(person.spouse) ? person.spouse.join(', ') : person.spouse}</p>` : ''}
    ${person.children ? `<p class="description-text"><strong>${L.children}:</strong> ${Array.isArray(person.children) ? person.children.join(', ') : person.children}</p>` : ''}
    ${person.significance ? `<p class="description-text"><strong>${L.significance}:</strong> ${person.significance}</p>` : ''}
    ${person.causeOfDeath ? `<p class="description-text"><strong>${L.causeOfDeath}:</strong> ${person.causeOfDeath}</p>` : ''}
    ${person.shrine ? `<p class="description-text"><strong>${L.shrine}:</strong> ${person.shrine}</p>` : ''}
    ${person.knowledgeFields ? `<p class="description-text"><strong>${L.knowledgeFields}:</strong> ${person.knowledgeFields}</p>` : ''}
    ${person.students ? `<p class="description-text"><strong>${L.students}:</strong> ${person.students}</p>` : ''}

    ${(familyLinks.parents.length || familyLinks.spouse.length || familyLinks.children.length || familyLinks.siblings.length) ? `
    <div class="relationships-block" style="margin-top:14px;padding:12px;border-radius:12px;background:rgba(120,120,120,.06)">
      <p class="description-text" style="margin-bottom:6px"><strong>🔗 ${L2.relationships}</strong></p>
      ${linkGroup(L.parents, familyLinks.parents)}
      ${linkGroup(L2.siblings, familyLinks.siblings)}
      ${linkGroup(L.spouse, familyLinks.spouse)}
      ${linkGroup(L.children, familyLinks.children)}
    </div>` : ''}

    ${opponentsList.length ? `
    <p class="description-text" style="margin-top:10px"><strong>⚔️ ${L2.opponents}:</strong> ${escapeHtml(opponentsList.join(' · '))}</p>` : ''}

    ${timeline.length ? `
    <div class="timeline-block" style="margin-top:14px">
      <p class="description-text" style="margin-bottom:6px"><strong>🕰️ ${L2.timeline}</strong></p>
      <div style="border-inline-start:2px solid ${person.color || '#3B82F6'}40;padding-inline-start:14px">
        ${timeline.map(ev => `
        <div style="margin-bottom:10px;position:relative">
          <p style="font-size:.8rem;font-weight:700;margin:0">${ev.icon} ${escapeHtml(ev.label)}</p>
          <p style="font-size:.78rem;opacity:.8;margin:1px 0 0">${escapeHtml(ev.detail || '')}</p>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${stats ? `
    <div class="stats-block" style="margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border-radius:12px;background:rgba(120,120,120,.06);padding:4px">
      ${statRow(L3.generation, stats.generation ? `#${stats.generation}` : null)}
      ${statRow(L3.age, stats.ageAtDeath)}
      ${statRow(L3.childrenCount, stats.childrenCount || null)}
      ${statRow(L3.knownRelatives, stats.knownRelatives || null)}
      ${statRow(L3.period, stats.historicalPeriod)}
    </div>` : ''}

    ${completion ? `
    <div class="completion-block" style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;font-size:.75rem;opacity:.75">
        <span>${L3.completion}</span><span>${completion.percent}%</span>
      </div>
      <div style="height:6px;border-radius:4px;background:rgba(120,120,120,.15);margin-top:3px;overflow:hidden">
        <div style="height:100%;width:${completion.percent}%;background:${person.color || '#3B82F6'};border-radius:4px"></div>
      </div>
      ${completion.missing.length ? `<p style="font-size:.7rem;opacity:.6;margin-top:3px">${L3.missing}: ${escapeHtml(completion.missing.join(', '))}</p>` : ''}
    </div>` : ''}

    ${(Array.isArray(person.sources) && person.sources.length > 0) ? `
    <div class="sources-list" style="margin-top:12px">
      <p class="description-text" style="margin-bottom:4px"><strong>${L.sources}:</strong></p>
      <ul style="padding-inline-start:1.2em;margin:0">
        ${person.sources.map(s => `<li style="font-size:.85rem;margin-bottom:2px">${escapeHtml([s.book, s.volumeOrPage, s.author].filter(Boolean).join(' · '))}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div style="margin-top:16px;text-align:center;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button class="modal-crosslink-btn" onclick="closePersonDetail()" data-action="viewImam" data-param="${crossLinkParam}"
        style="background:${person.color || '#3B82F6'}18;color:${person.color || '#3B82F6'};border:1px solid ${person.color || '#3B82F6'}30;
        padding:8px 18px;border-radius:50px;font-size:.8rem;font-weight:700;cursor:pointer">
        ${L.fullProfile} →
      </button>
      <button onclick="copyPersonCitation('${personId}')"
        style="background:rgba(120,120,120,.1);color:inherit;border:1px solid rgba(120,120,120,.25);
        padding:8px 18px;border-radius:50px;font-size:.8rem;font-weight:700;cursor:pointer">
        📋 ${L3.copyCitation}
      </button>
      <button onclick="printPersonProfile('${personId}')"
        style="background:rgba(120,120,120,.1);color:inherit;border:1px solid rgba(120,120,120,.25);
        padding:8px 18px;border-radius:50px;font-size:.8rem;font-weight:700;cursor:pointer">
        🖨️ ${L3.print}
      </button>
    </div>
  `;
  
  modalBody.innerHTML = html;
  modal.classList.remove('hidden');

  // ✅ Focus management: remember what had focus, move focus into the
  // modal, and let Escape close it — same behavior the backdrop click
  // and close button already provide, just reachable from the keyboard.
  window._personDetailReturnFocus = document.activeElement;
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.focus();
  if (window._personDetailEscHandler) document.removeEventListener('keydown', window._personDetailEscHandler);
  window._personDetailEscHandler = (e) => { if (e.key === 'Escape') closePersonDetail(); };
  document.addEventListener('keydown', window._personDetailEscHandler);
}

function closePersonDetail() {
  const modal = document.getElementById('person-detail-modal');
  // Defensive: if the page already changed (e.g. via the cross-link button's
  // own navigation, or any future caller), the modal may no longer be in the
  // DOM — guard instead of throwing on `.classList` of null.
  if (modal) modal.classList.add('hidden');
  if (window._personDetailEscHandler) {
    document.removeEventListener('keydown', window._personDetailEscHandler);
    window._personDetailEscHandler = null;
  }
  if (window._personDetailReturnFocus && typeof window._personDetailReturnFocus.focus === 'function') {
    window._personDetailReturnFocus.focus();
  }
  window._personDetailReturnFocus = null;
}

function _resolveFamilyTreePerson(personId) {
  if (personId === 'prophet') return familyTreeDatabase.prophet;
  if (personId === 'fatima') return familyTreeDatabase.fatima;
  return familyTreeDatabase.imams.find(i => i.id === parseInt(personId));
}
// Copy Citation — reuses the existing shareContent() share/clipboard fallback
// chain (navigator.share → clipboard API → textarea trick → WhatsApp) rather
// than re-implementing clipboard handling.
function copyPersonCitation(personId) {
  const person = _resolveFamilyTreePerson(personId);
  if (!person || typeof getCitationText !== 'function') return;
  const l = state.language;
  const citation = getCitationText(personId, person, l);
  const name = l === 'bn' ? person.bengaliName : (person.englishName || person.englishAbbr || person.bengaliName);
  shareContent('📋 ' + (l === 'bn' ? 'সাইটেশন' : 'Citation') + ' — ' + name, citation, '');
}

// Print Profile — builds a small self-contained printable document in a new
// tab (doesn't depend on style.css print rules, which aren't touched here).
function printPersonProfile(personId) {
  const person = _resolveFamilyTreePerson(personId);
  if (!person) return;
  const l = state.language;
  const name = l === 'bn' ? person.bengaliName : (person.englishName || person.englishAbbr || person.bengaliName);
  const win = window.open('', '_blank');
  if (!win) return; // popup blocked — silent no-op, same as elsewhere in the app

  const rows = [
    [l === 'bn' ? 'আরবি নাম' : 'Arabic Name', person.arabicName],
    [l === 'bn' ? 'কুনিয়াত' : 'Kunyah', person.kunyah],
    [l === 'bn' ? 'লকব' : 'Laqab', person.laqab],
    [l === 'bn' ? 'জন্ম' : 'Birth', person.birth],
    [l === 'bn' ? 'জন্মস্থান' : 'Birth Place', person.birthPlace],
    [l === 'bn' ? 'মৃত্যু/ওফাত' : 'Death', person.death],
    [l === 'bn' ? 'মৃত্যুস্থান' : 'Death Place', person.deathPlace],
    [l === 'bn' ? 'পিতামাতা' : 'Parents', person.parents],
    [l === 'bn' ? 'পত্নী' : 'Spouse', person.spouse],
    [l === 'bn' ? 'সন্তান' : 'Children', person.children],
    [l === 'bn' ? 'গুরুত্ব' : 'Significance', person.significance]
  ].filter(([, v]) => !!v);

  const rowsHtml = rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`).join('');
  const descHtml = person.description ? `<p>${escapeHtml(person.description)}</p>` : '';

  win.document.write(`<!DOCTYPE html><html lang="${l === 'bn' ? 'bn' : 'en'}"><head><meta charset="UTF-8">
    <title>${escapeHtml(name)}</title>
    <style>
      body{font-family:'Noto Sans Bengali',Arial,sans-serif;max-width:680px;margin:32px auto;padding:0 16px;color:#1a1a1a}
      h1{margin-bottom:2px} .arabic{font-size:1.1rem;color:#555;margin-top:0}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #ddd;vertical-align:top}
      th{width:150px;color:#555;font-weight:600}
      p{line-height:1.6}
      footer{margin-top:24px;font-size:.75rem;color:#888;border-top:1px solid #eee;padding-top:8px}
    </style></head><body>
    <h1>${escapeHtml(name)}</h1>
    <p class="arabic">${escapeHtml(person.arabicName || '')}</p>
    ${descHtml}
    <table>${rowsHtml}</table>
    <footer>${escapeHtml(typeof getCitationText === 'function' ? getCitationText(personId, person, l) : '')}</footer>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
function initFamilyTree() {
  renderFamilyTree();
}

    // Populate familyTreeValidationErrors once, same as family-tree-data.js
    // does on its own load — but only inside this closure's copy.
    try { validateFamilyTreeData(); } catch (e) { /* non-fatal */ }

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

    if (typeof g.renderImamsPage !== 'function') g.renderImamsPage = renderImamsPage;
    if (typeof g.renderImamTimeline !== 'function') g.renderImamTimeline = renderImamTimeline;
    if (typeof g.renderImamDetailPage !== 'function') g.renderImamDetailPage = renderImamDetailPage;

    if (typeof g.imamFlip !== 'function') g.imamFlip = imamFlip;
    if (typeof g.imamCardParticles !== 'function') g.imamCardParticles = imamCardParticles;

    if (typeof g.renderFamilyTreePage !== 'function') g.renderFamilyTreePage = renderFamilyTreePage;
    if (typeof g.ordinalEn !== 'function') g.ordinalEn = ordinalEn;
    if (typeof g.renderFamilyTree !== 'function') g.renderFamilyTree = renderFamilyTree;
    if (typeof g.showPersonDetail !== 'function') g.showPersonDetail = showPersonDetail;
    if (typeof g.closePersonDetail !== 'function') g.closePersonDetail = closePersonDetail;
    if (typeof g._resolveFamilyTreePerson !== 'function') g._resolveFamilyTreePerson = _resolveFamilyTreePerson;
    if (typeof g.copyPersonCitation !== 'function') g.copyPersonCitation = copyPersonCitation;
    if (typeof g.printPersonProfile !== 'function') g.printPersonProfile = printPersonProfile;
    if (typeof g.initFamilyTree !== 'function') g.initFamilyTree = initFamilyTree;

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
    return `
    <div class="space-y-2 page-enter">
        ${renderAhlulBaytHero()}
        ${renderAhlulBaytCategoryChips()}
        ${renderAhlulBaytSearchBox()}
        ${renderAhlulBaytStats()}

        <div class="ab-main-grid" style="display:grid;grid-template-columns:1fr;gap:1.25rem;margin-top:1.25rem">
            <div id="ab-tab-panel-anchor" class="ab-tab-panel" style="scroll-margin-top:80px">
                ${renderAhlulBaytTabPanel()}
            </div>
            <div class="ab-side-panel-wrap">
                ${renderAhlulBaytSidePanel()}
            </div>
        </div>
        <style>
            @media (min-width:1024px){
                .ab-main-grid{ grid-template-columns:minmax(0,2fr) minmax(260px,1fr) !important; align-items:start; }
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
