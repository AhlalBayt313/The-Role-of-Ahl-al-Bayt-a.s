// ============================================================================
// DATA LOADER — JSON fetch utility
// ============================================================================
// Content datasets (duas, ziyarats, blog posts, knowledge-center entries,
// masumeen/imam/family-tree data) live in /data/*.json. The old blocking
// loadJSONSync() was removed in v119 (no callers left); loadJSONAsync() below
// is the only loader. Needs http(s) — it will not work from file://.
// ============================================================================
// ASYNC JSON LOADER — non-blocking fetch(), added for the sync-XHR migration
// (Phase 1: Blog, 2026-08-11). Every caller has since been migrated, so the old
// loadJSONSync() was removed in v119 — loadJSONAsync() is the only loader.
//
// Mirrors the exact retry/backoff/never-throw contract already used by
// duas-data.js's and knowledge-center-data.js's internal fetchJSONWithRetry()
// helpers (3 attempts, 600ms*attempt backoff, resolves to null on total
// failure instead of rejecting) so every JSON loader in this app behaves the
// same way from a caller's point of view.
//
// Migrated call sites so far: blog.js's blogPosts (Phase 1), quiz-data.js's
// quizQuestions/quizCategories (Phase 2), knowledge-center-data.js's
// categories.json/metadata.json lite-index (Phase 3), and duas-data.js's
// metadata.json lite-index (Phase 4). This function itself is unchanged by
// every phase — only additional callers are added.
// ============================================================================
async function loadJSONAsync(path, attempts) {
    const maxAttempts = attempts || 3;
    let lastErr = null;
    for (let i = 1; i <= maxAttempts; i++) {
        try {
            const res = await fetch(path, { cache: 'no-cache' });
            if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + path);
            return await res.json();
        } catch (e) {
            lastErr = e;
            if (i < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 600 * i));
        }
    }
    console.error('[data-loader] Failed to load ' + path + ' after ' + maxAttempts + ' attempts', lastErr);
    return null;
}
