// ============================================================================
// PHASE 4 — LAZY-IMAGE FADE-IN  +  LEGACY `.reveal` DYNAMIC-CONTENT SYNC
// (assets/js/core/phase4-animations.js)
//
// Two independent, class-toggle-only systems (no inline style writes, no
// JS-driven animation — every actual animation is CSS transform/opacity,
// defined in assets/css/style.css):
//
//   1) Lazy-image fade-in — pairs with `.lazy-fade` in style.css. Adds
//      `.loaded` to any <img class="lazy-fade"> once it has actually
//      finished loading, so it fades in instead of popping in abruptly.
//
//   2) Legacy `.reveal` dynamic-content sync (Step 13) — the project's
//      ORIGINAL scroll-reveal system lives in script-1-core.js
//      (setupScrollReveal(), driving `.reveal`/`.reveal-fade`/
//      `.reveal-slide` + `.visible`, styled in style.css) and is what
//      every card in the project actually uses. That function only
//      (re)observes elements when it's called — which happens at boot
//      and inside the main render() pipeline (script-4-boot.js). Content
//      swapped into a sub-container via direct innerHTML OUTSIDE that
//      pipeline — the live search-results list, Knowledge Center's
//      filter-driven results, and the Ahl al-Bayt unified search panel —
//      never triggers it, so any `.reveal` element born inside those
//      swaps was stuck unobserved. This file's MutationObserver below
//      closes that gap by calling the project's own setupScrollReveal()
//      (no second reveal engine) whenever such a swap is detected.
//
// Both systems watch for late-arriving elements via a single shared
// MutationObserver, since this is a single-page app where render()
// replaces innerHTML on navigation — new `.lazy-fade` elements or
// sub-container swaps can appear at any time, long after this file
// first runs.
//
// Accessibility: image lazy-fade is a one-time opacity fade tied to real
// network load time (not a decorative/looping motion effect), so it's
// unaffected by prefers-reduced-motion. The legacy `.reveal` sync defers
// entirely to setupScrollReveal()'s own reduced-motion handling in
// script-1-core.js/style.css; this file's sync layer additionally skips
// scheduling itself when the visitor prefers reduced motion, since
// there's nothing to defer in that case.
//
// Performance / mobile-friendliness:
//   - one shared MutationObserver for both systems, not two
//   - each lazy-image listener is `{once:true}` (self-cleaning, no leak)
//   - no scroll/resize listeners anywhere in this file
//   - no setInterval/setTimeout anywhere in this file
//
// ── STEP 11 (Final Animation Polish) ──
// Audited the scroll-reveal system against IO correctness/timing/
// stagger/dynamic-content/mobile/reduced-motion. Two bugs found and
// fixed in the (now-removed, see Step 15 below) `.anim-onscroll`/
// `.anim-reveal-*` engine this file used to also drive.
//
// ── STEP 12 (JS Animations) ──
// Added the `.anim-onscroll`/`.anim-reveal-image/-section/-card`
// IntersectionObserver reveal engine (paired CSS in animations.css),
// separate from the legacy `.reveal` system above. Removed in Step 15
// below — see that note for why.
//
// ── STEP 13 (Dynamic Content ⇄ Scroll Reveal Integration Audit) ──
// Tested whether dynamic content (Dua/Ziyarat/Amal/Hadith/Masail/
// Fatawa/Knowledge Center/Search/Blog cards) actually reveals once
// rendered. Finding: every one of those templates uses the project's
// ORIGINAL `.reveal` system, not the Step 12 `.anim-reveal-*` classes —
// those remained available but unused by any template. The real gap was
// the legacy-sync closed above: `setupScrollReveal()` only (re)runs at
// boot and inside the main render() pipeline, so `.reveal` content
// swapped into a sub-container outside that pipeline (live search
// results, Knowledge Center filters, Ahl al-Bayt unified search panel)
// was never (re)observed.
//
// ── STEP 14 (Final Performance Audit) ──
// Checked IntersectionObserver/MutationObserver overhead, duplicate
// observers/animations, unnecessary DOM scanning, memory leaks, layout
// shift, mobile performance, prefers-reduced-motion coverage, console
// errors on the (then still present) `.anim-onscroll`/`.anim-reveal-*`
// engine. Confirmed clean apart from one small inefficiency
// (`applyCardStagger()` re-querying a selector already matched by the
// caller), which was fixed at the time.
//
// ── STEP 15 — CLEANUP: removed the unused `.anim-onscroll`/
// `.anim-reveal-image/-section/-card` reveal engine ──
// `assets/css/animations.css` was separately emptied after a usage scan
// found no `.anim-*` class referenced anywhere in the project's
// templates — the Step 12 engine was completely inert from the moment
// it shipped (see Step 13's finding above) and had no CSS left backing
// it, so it could no longer do anything even if a template did apply
// its classes. Removed that entire IntersectionObserver engine
// (`SELECTOR`, `STAGGER_CLASSES`, `reveal()`, `applyCardStagger()`,
// `scanReveal()`, `unwatchRemovedReveal()`, the `reduceMotion`/
// `ioSupported` branch that built them, and their hooks in the shared
// MutationObserver's added/removed-node handling) since it had no
// effect on the app and nothing else in the project depends on it.
// Left untouched: lazy-image fade-in (section 1) and the legacy
// `.reveal` dynamic-content sync (section 2, Step 13) — both are real,
// in-use systems. `reduceMotion` is still computed, now only to gate
// the legacy-sync scheduler below. No class/function/id belonging to
// either surviving system was renamed or altered.
// ============================================================================
(function () {
    // ------------------------------------------------------------------
    // 1) Lazy-image fade-in
    // ------------------------------------------------------------------
    function markLoaded(img) {
        img.classList.add('loaded');
    }

    function watchImage(img) {
        if (img.classList.contains('loaded')) return;
        // Already-cached images can fire `load` before a listener is
        // attached — .complete catches that case immediately.
        if (img.complete && img.naturalWidth > 0) { markLoaded(img); return; }
        img.addEventListener('load', () => markLoaded(img), { once: true });
        // If the image fails to load, reveal it anyway rather than leaving
        // a permanently invisible broken-image icon.
        img.addEventListener('error', () => markLoaded(img), { once: true });
    }

    function scanImages(root) {
        root.querySelectorAll && root.querySelectorAll('img.lazy-fade').forEach(watchImage);
        if (root.matches && root.matches('img.lazy-fade')) watchImage(root);
    }

    // ------------------------------------------------------------------
    // 2) STEP 13 — dynamic-content sync for the EXISTING legacy `.reveal`
    // scroll-reveal system (script-1-core.js's setupScrollReveal(), which
    // this file has always left untouched — see file header). That system
    // is what almost every card in the project actually uses
    // (card-luxury/kc-card/feature-card-luxury/etc. all carry `.reveal`),
    // and it only (re)observes `.reveal` elements when setupScrollReveal()
    // itself is called — which today only happens at boot and inside the
    // main render() pipeline (script-4-boot.js). Content that gets
    // swapped into a sub-container via direct innerHTML OUTSIDE that
    // pipeline — the live search-results list (search-results/oninput in
    // script-3-pages.js), Knowledge Center's filtered results
    // (kc-results/oninput+onchange), and the Ahl al-Bayt unified search
    // panel (ahlul-bayt-unified.js) — never triggers it, so any `.reveal`
    // element born inside those swaps is stuck unobserved.
    //
    // Fix: reuse the existing function/observer (no second reveal engine
    // is created) — when the shared MutationObserver below sees added
    // nodes containing an unrevealed `.reveal`/`.reveal-fade`/
    // `.reveal-slide` element, it calls the project's own
    // setupScrollReveal(), the same call render() already makes. That
    // function already disconnects its previous observer before
    // re-querying (script-1-core.js, "Bug #18" fix), so calling it again
    // is safe/idempotent — no duplicate observers, no re-animating
    // already-`.visible` elements (they're excluded by the selector
    // below, and the function itself only ever adds `.visible`, never
    // removes it).
    //
    // Renders that go through #app itself already schedule
    // setupScrollReveal() via render()'s own requestAnimationFrame call,
    // so those mutations are skipped here to avoid a redundant second
    // call for the exact same DOM swap — this only fires for the
    // sub-container swaps described above.
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const LEGACY_REVEAL_SELECTOR = '.reveal:not(.visible), .reveal-fade:not(.visible), .reveal-slide:not(.visible)';
    function hasUnrevealedLegacy(root) {
        if (root.matches && root.matches(LEGACY_REVEAL_SELECTOR)) return true;
        return !!(root.querySelector && root.querySelector(LEGACY_REVEAL_SELECTOR));
    }

    let legacySyncScheduled = false;
    function scheduleLegacyRevealSync() {
        if (legacySyncScheduled || reduceMotion) return; // reduced-motion: CSS already forces these visible, nothing to sync
        legacySyncScheduled = true;
        requestAnimationFrame(() => {
            legacySyncScheduled = false;
            if (typeof window.setupScrollReveal === 'function') window.setupScrollReveal();
        });
    }

    // ------------------------------------------------------------------
    // Shared scan + single MutationObserver for both systems
    // ------------------------------------------------------------------
    function scanAll(root) {
        scanImages(root);
    }

    scanAll(document);

    const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
            // Full-page renders replace #app's innerHTML and already queue
            // their own setupScrollReveal() call (script-4-boot.js render());
            // skip re-triggering the legacy sync for that specific swap.
            const isAppRender = m.target && m.target.id === 'app';
            m.addedNodes && m.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                scanAll(node);
                if (!isAppRender && hasUnrevealedLegacy(node)) scheduleLegacyRevealSync();
            });
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });
})();
