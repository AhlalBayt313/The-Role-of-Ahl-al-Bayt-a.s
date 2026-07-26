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
