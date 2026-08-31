// ============================================================================
// PHASE 4 — LAZY-IMAGE FADE-IN  +  STEP 12 — SCROLL/SECTION/CARD/IMAGE REVEAL
// (assets/js/core/phase4-animations.js)
//
// Two independent animation systems, both class-toggle-only (no inline
// style writes, no JS-driven animation — every actual animation is CSS
// transform/opacity, defined in assets/css/style.css + animations.css):
//
//   1) Lazy-image fade-in — pairs with `.lazy-fade` in style.css. Adds
//      `.loaded` to any <img class="lazy-fade"> once it has actually
//      finished loading, so it fades in instead of popping in abruptly.
//
//   2) Scroll reveal — pairs with `.anim-onscroll` / `.anim-reveal-image` /
//      `.anim-reveal-section` / `.anim-reveal-card` in animations.css.
//      Those classes hold an entrance animation paused at its hidden 0%
//      frame; this adds `.in-view` once the element scrolls into the
//      viewport, letting that paused CSS animation run.
//
// Purely additive: touches no existing element, state, function, class
// name, or render path elsewhere in the project (script-1-core.js's own
// `.reveal` scroll system is left completely untouched).
//
// Both systems watch for late-arriving elements via a SINGLE shared
// MutationObserver (rather than one per system) because this is a
// single-page app — render() replaces innerHTML on navigation, so new
// `.lazy-fade` / `.anim-reveal-*` elements can appear at any time, long
// after this file first runs. A full-page render() swaps a large subtree
// at once, so sharing one observer instead of running two independently
// halves the per-navigation MutationObserver dispatch/traversal overhead
// (each still does its own querySelectorAll, but only one callback, one
// mutation-list walk, and one added-node-type check).
//
// Accessibility:
//   - if the visitor has prefers-reduced-motion enabled, the reveal system
//     creates no IntersectionObserver at all — every matching element is
//     revealed immediately. (animations.css already forces opacity:1/no-
//     transform for these classes under reduced motion regardless, so
//     this is a performance optimization on top of that guarantee, not a
//     replacement for it.) Image lazy-fade is unaffected either way since
//     it's a one-time opacity fade tied to real network load time, not a
//     decorative/looping motion effect.
//   - if the browser has no IntersectionObserver support at all, every
//     matching element is revealed immediately rather than staying stuck
//     invisible at its 0% frame.
//
// Performance / mobile-friendliness:
//   - one shared MutationObserver (see above) instead of two
//   - one shared IntersectionObserver for all reveal elements, not one
//     per element
//   - each reveal element is unobserved the instant it reveals (one-time
//     effect, not a re-triggering watcher — cheapest possible steady-
//     state cost)
//   - no scroll/resize listeners anywhere in this file
//   - no setInterval/setTimeout anywhere in this file
//   - rootMargin bottom-loads the reveal slightly before the element is
//     fully on-screen, so it never feels like it's waiting on slow mobile
//     scrolling
//
// ── FINAL ANIMATION POLISH PASS ──
// Audited against: IntersectionObserver correctness, initial/visible
// state, timing, multiple elements, stagger, already-revealed elements,
// dynamic content, mobile performance, prefers-reduced-motion. Two real
// issues found and fixed, both scoped to this file only (search "✅ FIX"
// below for the full explanation at each site):
//   1. Card stagger index reset to 0 on every scan instead of persisting
//      per grid, so cards appended to an existing grid in a later batch
//      (pagination/"load more") could lose their stagger.
//   2. Elements that left the DOM (SPA navigation) before ever scrolling
//      into view stayed registered with the shared IntersectionObserver
//      indefinitely — now unobserved via the same MutationObserver that
//      already watches for added nodes.
// Everything else (single shared observer, unobserve-on-reveal, reduced-
// motion short-circuit, no scroll/resize listeners) was already correct
// and is unchanged. No class/function/id was renamed or removed.
//
// ── STEP 13 — DYNAMIC CONTENT ⇄ SCROLL REVEAL INTEGRATION AUDIT ──
// Tested whether Dua/Ziyarat/Amal/Hadith/Masail/Fatawa/Knowledge Center/
// Search/Blog/dynamic-card content actually reveals once rendered.
// Finding: every one of those templates uses the project's ORIGINAL
// `.reveal` scroll-reveal system (script-1-core.js's setupScrollReveal()),
// not the newer `.anim-onscroll`/`.anim-reveal-*` classes this file
// introduced in Step 12 — those remain available but unused by any
// current template, so section 2 above was not the integration gap.
// The real gap: setupScrollReveal() only (re)runs at boot and inside the
// main render() pipeline, so `.reveal` content swapped into a
// sub-container by direct innerHTML OUTSIDE that pipeline — the live
// search-results list, Knowledge Center's filter-driven results, and the
// Ahl al-Bayt unified search panel — never got (re)observed. Section 3
// below closes that gap by reusing the existing setupScrollReveal()
// function/observer itself (no new reveal engine) whenever the shared
// MutationObserver sees such a swap. No duplicate observers result:
// setupScrollReveal() already disconnects its previous observer before
// re-querying.
//
// ── STEP 14 — FINAL PERFORMANCE AUDIT ──
// Checked: IntersectionObserver/MutationObserver overhead, duplicate
// observers, duplicate animations, unnecessary DOM scanning/manipulation,
// memory leaks, layout shift, heavy animation, mobile performance,
// prefers-reduced-motion coverage, console errors. Confirmed clean:
// single shared MutationObserver + single shared IntersectionObserver
// (no duplicates anywhere in the project), all `.lazy-fade`/image
// listeners are `{once:true}` (self-cleaning, no leak), reveal elements
// are unobserved on both reveal and DOM removal (no leak), every
// animation this file drives is transform/opacity only (no layout
// shift, no repaint-heavy properties), and reduced-motion is honored at
// both the IntersectionObserver-skip level here and the CSS level in
// animations.css/style.css (style.css also has a global
// `*, *::before, *::after` reduced-motion catch-all, independently
// verified during this pass). One real (small) inefficiency found and
// fixed, scoped to this file only: applyCardStagger() ran its own
// `querySelectorAll('.anim-reveal-card')` on top of the identical
// element set already produced by scanReveal()'s SELECTOR query below
// — i.e. every scan (every MutationObserver batch, site-wide) walked
// the same subtree twice for overlapping results. It now takes one
// already-matched element at a time instead of re-querying, so each
// scan does exactly one querySelectorAll. Behavior is byte-for-byte
// identical (same guard, same WeakMap counter, same classes assigned) —
// only the redundant second DOM walk is gone. Everything else audited
// this pass was already correct from prior steps and is unchanged.
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
    // 2) Scroll / section / card / image reveal
    // ------------------------------------------------------------------
    const SELECTOR = '.anim-onscroll, .anim-reveal-image, .anim-reveal-section, .anim-reveal-card';
    const STAGGER_CLASSES = ['anim-delay-1', 'anim-delay-2', 'anim-delay-3', 'anim-delay-4', 'anim-delay-5', 'anim-delay-6'];

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ioSupported = 'IntersectionObserver' in window;

    function reveal(el) {
        el.classList.add('in-view');
    }

    // Cards rendered in a loop (e.g. a grid of .anim-reveal-card items)
    // get a small automatic stagger based on their position among their
    // reveal-card siblings, reusing the existing .anim-delay-1..6 helpers
    // from Step 11 instead of introducing new timing values. Capped at 6
    // steps so a long grid never ends up with a long tail of waiting.
    //
    // ✅ FIX: the running per-parent index used to live in a Map created
    // fresh inside applyCardStagger() on every call, so it reset to 0 each
    // time scanReveal() ran again (e.g. a MutationObserver batch firing
    // because more cards were appended to an *existing* grid — "load
    // more", pagination, filtered results). New cards in that later batch
    // would restart the stagger count from 0 instead of continuing after
    // the cards already in that grid, so the second/third/etc. batch could
    // end up with no stagger at all. Moved to a module-level WeakMap keyed
    // by parentElement so the count persists for as long as that grid
    // exists; a WeakMap still lets detached parents be garbage collected.
    //
    // ✅ STEP 14 PERFORMANCE FIX: this used to run its own
    // `root.querySelectorAll('.anim-reveal-card')` on top of the main
    // `SELECTOR` query in scanReveal() below — since `.anim-reveal-card`
    // is already part of SELECTOR, every scan (i.e. every single
    // MutationObserver batch, on every DOM change site-wide) walked the
    // same subtree twice for overlapping results. Changed to operate on
    // one already-matched element at a time instead of re-querying, so
    // scanReveal() below now does exactly one querySelectorAll per scan.
    // Behavior is identical (same per-card dataset guard, same WeakMap
    // stagger counter, same classes assigned) — this only removes the
    // redundant second DOM walk.
    const cardStaggerGroups = new WeakMap(); // parentElement -> running index
    function applyCardStagger(card) {
        if (card.dataset.revealStaggered) return;
        card.dataset.revealStaggered = '1';
        const parent = card.parentElement;
        const idx = cardStaggerGroups.get(parent) || 0;
        cardStaggerGroups.set(parent, idx + 1);
        if (idx > 0 && !STAGGER_CLASSES.some(c => card.classList.contains(c))) {
            card.classList.add(STAGGER_CLASSES[Math.min(idx - 1, STAGGER_CLASSES.length - 1)]);
        }
    }

    let scanReveal;
    // No-op unless the IntersectionObserver branch below is active — kept
    // as a real function reference either way so the MutationObserver
    // callback further down never has to branch on which mode is live.
    let unwatchRemovedReveal = () => {};

    if (reduceMotion || !ioSupported) {
        // No motion to defer — just mark everything visible up front,
        // now and for anything added later.
        scanReveal = (root) => {
            (root.querySelectorAll ? root.querySelectorAll(SELECTOR) : []).forEach(reveal);
            if (root.matches && root.matches(SELECTOR)) reveal(root);
        };
    } else {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                reveal(entry.target);
                io.unobserve(entry.target);
            });
        }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });

        const watchReveal = (el) => {
            if (el.classList.contains('in-view') || el.dataset.revealObserved) return;
            el.dataset.revealObserved = '1';
            io.observe(el);
        };

        scanReveal = (root) => {
            // ✅ STEP 14: single querySelectorAll pass — see applyCardStagger's
            // note above for why this replaced two overlapping scans.
            const els = root.querySelectorAll ? Array.from(root.querySelectorAll(SELECTOR)) : [];
            if (root.matches && root.matches(SELECTOR)) els.push(root);
            els.forEach((el) => {
                if (el.classList.contains('anim-reveal-card')) applyCardStagger(el);
                watchReveal(el);
            });
        };

        // ✅ FIX: this is a single-page app — render() swaps out whole
        // subtrees via innerHTML on navigation. Any element that was
        // being observed but scrolled away from / navigated away from
        // before ever intersecting was previously left registered with
        // `io` forever, since only reveal() ever called unobserve(). That
        // pins otherwise-detached DOM nodes in memory and leaves the
        // observer doing useless work on nodes that can never come back.
        // Now the shared MutationObserver below also reports removals, so
        // any not-yet-revealed element leaving the DOM gets unobserved.
        unwatchRemovedReveal = (root) => {
            const unwatch = (el) => {
                if (el.dataset && el.dataset.revealObserved && !el.classList.contains('in-view')) {
                    io.unobserve(el);
                }
            };
            if (root.querySelectorAll) root.querySelectorAll(SELECTOR).forEach(unwatch);
            if (root.matches && root.matches(SELECTOR)) unwatch(root);
        };
    }

    // ------------------------------------------------------------------
    // 3) STEP 13 — dynamic-content sync for the EXISTING legacy `.reveal`
    // scroll-reveal system (script-1-core.js's setupScrollReveal(), which
    // this file has always left untouched — see file header). That system
    // is what almost every card in the project actually uses
    // (card-luxury/kc-card/feature-card-luxury/etc. all carry `.reveal`,
    // not the `.anim-reveal-*` classes above), and it only (re)observes
    // `.reveal` elements when setupScrollReveal() itself is called —
    // which today only happens at boot and inside the main render()
    // pipeline (script-4-boot.js). Content that gets swapped into a
    // sub-container via direct innerHTML OUTSIDE that pipeline — the
    // live search-results list (search-results/oninput in
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
        scanReveal(root);
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
            m.removedNodes && m.removedNodes.forEach((node) => {
                if (node.nodeType === 1) unwatchRemovedReveal(node);
            });
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });
})();
