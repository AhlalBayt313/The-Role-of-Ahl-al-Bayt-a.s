// ============================================================================
// DATA LOADER — synchronous JSON fetch utility
// ============================================================================
// Content datasets (duas, ziyarats, blog posts, knowledge-center entries,
// masumeen/imam/family-tree data) were moved out of the JS files and into
// /data/*.json on 2026-07-23. Since the app has no build step / bundler and
// loads plain <script> tags in a fixed order, this loader fetches each JSON
// file SYNCHRONOUSLY (blocking) so that script execution order and timing
// stay exactly as before — every data file still has its data available
// the instant it finishes loading, with no async/await changes needed
// anywhere else in the app.
//
// Note: synchronous XHR only works when the app is served over http(s)
// (e.g. GitHub Pages) — same as the rest of this app's behavior, it will
// not work when opening index.html directly via file://.
function loadJSONSync(path) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', path, false); // false = synchronous
        xhr.send(null);
        if (xhr.status !== 200 && xhr.status !== 0) {
            console.error('[data-loader] Failed to load ' + path + ' (HTTP ' + xhr.status + ')');
            return null;
        }
        return JSON.parse(xhr.responseText);
    } catch (e) {
        console.error('[data-loader] Failed to load/parse ' + path, e);
        return null;
    }
}

// ============================================================================
// ASYNC JSON LOADER — non-blocking fetch(), added for the sync-XHR migration
// (Phase 1: Blog, 2026-08-11). Purely ADDITIVE: loadJSONSync() above is left
// completely untouched, and every existing synchronous caller keeps working
// exactly as before. Use loadJSONAsync() only at newly-migrated call sites.
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
            const res = await fetch(path, { cache: 'force-cache' });
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
