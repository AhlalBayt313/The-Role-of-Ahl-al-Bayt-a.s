// ============================================================================
// SHARE LINKS & POST DEEP-LINKS  (v207)
// ----------------------------------------------------------------------------
// THE PROBLEM
//   sharePost() used to call shareContent(title, text, '') — an empty URL falls
//   back to window.location.href, and opening a blog post never changes the
//   address bar, so every shared post pointed at the bare site address. Also,
//   this single-page app cannot give Facebook / WhatsApp a per-post preview
//   (title, description, image): a static host serves the same index.html,
//   with the same <meta> tags, for every address.
//
// THE FIX (no server needed)
//   1. tools/build-share-pages.js writes one tiny static page per blog post to
//      /p/<id>.html. Each carries that post's own Open Graph tags (so link
//      previews show the right title and excerpt) and immediately redirects a
//      person to  ./?page=readPost&id=<id>.
//   2. slPostUrl(post) returns that /p/<id>.html address (built relative to the
//      current address, so it works on any host that has the /p folder).
//      sharePost() passes it to shareContent().
//   3. On load, ?page=readPost&id=<id> is turned into a real "open this post"
//      once the blog data has arrived (the blog JSON loads asynchronously).
//      The back button then goes to the Blog list, as for any opened post.
//
// ADDITIVE: the only edit elsewhere is one argument in sharePost()
// (script-1-core.js) — shareContent() and everything else are unchanged. If
// this file or the /p folder is missing, sharing behaves exactly as before.
//
// Loads after script-4-boot.js (init() has already run and rendered once).
// Needs: state, blogPosts, blogPostsLoadState, readPost, render, showToast.
// ============================================================================

// A static blog post (numeric id that exists in blog-posts.json) → its share page URL; otherwise ''.
// Admin-made posts (custom_… ids) live only in the author's browser, so they get no share page.
function slPostUrl(post) {
    try {
        if (!post || !/^\d{1,6}$/.test(String(post.id))) return '';
        if (typeof blogPosts === 'undefined' || !blogPosts.some(function (p) { return String(p.id) === String(post.id); })) return '';
        return new URL('p/' + post.id + '.html', document.baseURI).href;
    } catch (e) { return ''; }
}

(function slOpenDeepLinkedPost() {
    var id = null;
    try {
        var q = new URLSearchParams(window.location.search);
        if (q.get('page') === 'readPost') id = q.get('id');
    } catch (e) { return; }
    if (!id || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) return;
    if (typeof state === 'undefined') return;

    // init() set currentPage='readPost' straight from the URL; make it 'blog' so that
    // readPost() records the Blog list as the previous page (the back button target).
    state.currentPage = 'blog';

    var tries = 0;
    var timer = setInterval(function () {
        tries++;
        var ls = (typeof blogPostsLoadState !== 'undefined') ? blogPostsLoadState : 'error';
        if (ls === 'loading' && tries < 100) return;          // wait up to ~15 s for blog-posts.json
        clearInterval(timer);
        if (state.currentPage !== 'blog') return;             // the person already went elsewhere
        var all = (typeof blogPosts !== 'undefined' ? blogPosts : []).concat(state.customPosts || []);
        var found = all.some(function (p) { return String(p.id) === String(id); });
        if (found && typeof readPost === 'function') { readPost(id); return; }
        if (typeof showToast === 'function') {
            showToast(state.language === 'bn' ? 'পোস্টটি খুঁজে পাওয়া যায়নি' : 'That post could not be found', 'warning');
        }
        if (typeof render === 'function') render();
    }, 150);
})();
