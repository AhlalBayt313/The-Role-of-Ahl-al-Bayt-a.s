// ============================================================================
// BLOG FEATURE — SEPARATE MODULE
// ============================================================================

// Blog posts data — moved to /data/blog-posts.json on 2026-07-23.
//
// 2026-08-11 update (Phase 1 of the sync-XHR migration): this now loads via
// loadJSONAsync() instead of loadJSONSync(), so the 512KB blog-posts.json
// request no longer blocks the rest of the app's boot. `blogPosts` keeps the
// SAME array reference for the lifetime of the page — it starts empty and is
// filled in place via push(...) once the fetch resolves, so every existing
// consumer that already holds a reference to `blogPosts` (renderBlogPage(),
// search, sharePost, readPost, ...) keeps working unchanged; they just see
// it go from empty to populated, the same way the Dua Library/Knowledge
// Center arrays already do for their lazy-loaded fields.
//
// blogPostsLoadState tracks 'loading' | 'loaded' | 'error' purely so
// renderBlogPage() can show an accurate lightweight message instead of a
// blank list while data is in flight (see the emptyHtml block below).
const blogPosts = [];
let blogPostsLoadState = 'loading';

(function loadBlogPostsAsync() {
    if (typeof loadJSONAsync !== 'function') {
        // Extremely defensive fallback — should never happen since
        // data-loader.js always loads before blog.js (see index.html).
        blogPostsLoadState = 'error';
        return;
    }
    loadJSONAsync('data/blog-posts.json').then((list) => {
        if (Array.isArray(list)) {
            blogPosts.push(...list);
            blogPostsLoadState = 'loaded';
        } else {
            blogPostsLoadState = 'error';
        }
        // Only re-render if the user is currently looking at the Blog page —
        // never trigger a global re-render while they're elsewhere. Guarded
        // with typeof checks because this callback can in principle fire
        // before every other <script> has finished executing.
        if (typeof state !== 'undefined' && state.currentPage === 'blog' && typeof render === 'function') {
            render();
        }
    });
})();
// ============================================================================
// BLOG EDITOR FUNCTIONS
// ============================================================================

/**
 * Open blog editor for creating or editing a post
 * @param {Object|null} post - Post to edit or null for new post
 */
function openBlogEditor(post=null) {
    if (!state.isAdmin) return;
    state.editingPost = post ? {...post} : {
        id:'custom_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
        date:localDate(),
        titleBn:'',
        titleEn:'',
        category:'',
        readTime:'5 min',
        excerpt:'',
        contentBn:'',
        contentEn:''
    };
    state.showBlogEditor = true;
    render();
}

/**
 * Close blog editor modal
 */
function closeBlogEditor() {
    state.showBlogEditor = false;
    state.editingPost = null;
    render();
}

// ============================================================================
// BLOG GITHUB SYNC
// ============================================================================

/**
 * 2026-07-19: live cloud sync removed (see the "Live Upload Feature —
 * DISABLED" note at the top of script-1-core.js — same underlying reason:
 * GitHub auto-revokes any of its own tokens found in a public repo). The
 * "New Post"/edit/delete buttons are hidden in the UI now
 * (UPLOAD_LIVE_FEATURE_ENABLED flag) — permanent posts are added directly
 * to the blogPosts array above and pushed via git, same as any other
 * static content on this site.
 */

// ============================================================================
// BLOG POST CRUD OPERATIONS
// ============================================================================

/**
 * Save blog post (create or update) — local only (see note above)
 */
async function saveBlogPost() {
    if (!state.editingPost) return;
    // Fix: el.value null হলে null return করো, '' নয় — যাতে empty value-ও save হয়
    const g = id => { const el=document.getElementById(id); return el ? el.value : null; };
    const titleBn = g('blog-editor-titleBn');
    const titleEn  = g('blog-editor-titleEn');
    const category = g('blog-editor-category');
    const readTime = g('blog-editor-readTime');
    const excerpt  = g('blog-editor-excerpt');
    const contentBn = g('blog-editor-contentBn');
    const contentEn = g('blog-editor-contentEn');
    if (titleBn  !== null) state.editingPost.titleBn  = titleBn;
    if (titleEn  !== null) state.editingPost.titleEn  = titleEn;
    if (category !== null) state.editingPost.category = category;
    if (readTime !== null) state.editingPost.readTime = readTime;
    if (excerpt  !== null) state.editingPost.excerpt  = excerpt;
    if (contentBn!== null) state.editingPost.contentBn= contentBn;
    if (contentEn!== null) state.editingPost.contentEn= contentEn;
    if (!state.editingPost.titleBn) {
        showToast(state.language==='bn'?'বাংলা শিরোনাম দিন':'Please enter Bengali title','warning');
        return;
    }
    // Bug #9 fix: snapshot copy — live reference রাখলে state.editingPost পরে null/mutate
    // হলে customPosts[idx]-ও silently change হয়ে যেত
    const savedPost = {...state.editingPost};
    const idx = state.customPosts.findIndex(p=>p.id===savedPost.id);
    if (idx>-1) state.customPosts[idx]=savedPost;
    else state.customPosts.unshift(savedPost);
    saveState(); closeBlogEditor(); render();
    showToast(state.language==='bn'?'পোস্ট সেভ হয়েছে (শুধু এই ব্রাউজারে)':'Post saved (this browser only)','success');
}

/**
 * Delete custom blog post — local only (see note above)
 * @param {string|number} id - Post ID to delete
 */
async function deleteCustomPost(id) {
    if (!state.isAdmin) return;
    if (!confirm(state.language==='bn'?'পোস্টটি মুছবেন?':'Delete this post?')) return;
    state.customPosts = state.customPosts.filter(p=>p.id!==id);
    saveState(); render();
    showToast(state.language==='bn'?'পোস্ট মুছে ফেলা হয়েছে ✓':'Post deleted ✓','success');
}

// ============================================================================
// BLOG PAGE RENDERER
// ============================================================================

/**
 * Render blog page — clean card design with accent strips, filter bar
 * @returns {string} HTML markup
 */
// Step 14 — Scroll Reveal: the Blog page's featured post and post-grid
// cards were the only "major card" surfaces on the site with no scroll
// entrance animation at all (every other page's cards already use the
// `.reveal` class from assets/css/style.css §12, driven by the existing
// setupScrollReveal() IntersectionObserver in script-1-core.js — called
// after every render(), see script-4-boot.js). Added `.reveal` to the
// featured `<article>` and `.reveal reveal-delay-N` (same staggering
// pattern already used for feature-card-luxury elsewhere) to the grid
// cards below. No new JS/CSS system introduced — reuses what already
// exists everywhere else, so reduced-motion handling and cleanup are
// automatically inherited.
function renderBlogPage() {
    const d=state.darkMode; const l=state.language;
    // Newest-first: sort a copy by date descending. Previously this used
    // raw array order (id 1..48), so the OLDEST post always ended up as
    // "featured" (filtered[0]) and today's newest post was buried near the
    // bottom of the list — backwards for a blog. customPosts (added via the
    // now-hidden admin editor) get sorted in too, in case any exist locally.
    const allPosts=[...state.customPosts,...blogPosts].sort((a,b)=>new Date(b.date)-new Date(a.date));

    // Category → accent color & badge style
    // Bug #6 fix: added `en` field so filter bar & badges show English names when l==='en'
    // Bug #5 fix: removed duplicate English keys (Ramadan, Ahl al-Bayt, etc.)
    // Store only Bengali keys with `en` field for translations
    const CAT = {
        'রমজান':    {color:'#1D9E75', bg:d?'rgba(29,158,117,.18)':'#E1F5EE', fg:d?'#5DCAA5':'#0F6E56', en:'Ramadan'},
        'আহলে বাইত':{color:'#7F77DD', bg:d?'rgba(127,119,221,.18)':'#EEEDFE', fg:d?'#AFA9EC':'#3C3489', en:'Ahl al-Bayt'},
        'দোয়া':     {color:'#378ADD', bg:d?'rgba(55,138,221,.18)':'#E6F1FB', fg:d?'#85B7EB':'#0C447C', en:'Duas'},
        'কুরআন':    {color:'#EF9F27', bg:d?'rgba(239,159,39,.18)':'#FAEEDA', fg:d?'#FAC775':'#854F0B', en:'Quran'},
        'ইবাদত':    {color:'#1D9E75', bg:d?'rgba(29,158,117,.18)':'#E1F5EE', fg:d?'#5DCAA5':'#0F6E56', en:'Worship'},
        'আখলাক':    {color:'#D4537E', bg:d?'rgba(212,83,126,.18)':'#FBEAF0', fg:d?'#ED93B1':'#72243E', en:'Ethics'},
        'ইতিহাস':   {color:'#B5651D', bg:d?'rgba(181,101,29,.18)':'#FBEEDD', fg:d?'#E3A96B':'#7A4212', en:'History'},
    };
    const catIcon = {'রমজান':'🌙','আহলে বাইত':'👑','দোয়া':'🤲','কুরআন':'📗','ইবাদত':'🕌','আখলাক':'⚖️','ইতিহাস':'📜'};
    const defaultCat = {color:'#888780', bg:d?'rgba(136,135,128,.18)':'#F1EFE8', fg:d?'#B4B2A9':'#5F5E5A'};

    // Bug #4 fix: custom posts (added via the admin editor's free-text category
    // field) may have category stored in English ("Ramadan") while the filter
    // bar's data-param is always the Bengali key ("রমজান"), or vice versa.
    // p.category===activeFilter then misses real matches. canonicalCat()
    // normalizes either form to the Bengali key so filtering works regardless
    // of which language a post's category was saved in.
    // Bug #12 fix: keys lowercase — "ramadan"/"Ramadan"/"RAMADAN" সব "রমজান" দেবে
    const EN_TO_BN = {'ramadan':'রমজান','ahl al-bayt':'আহলে বাইত','duas':'দোয়া','quran':'কুরআন','worship':'ইবাদত','ethics':'আখলাক','history':'ইতিহাস'};
    function canonicalCat(cat) { if (!cat) return cat; return EN_TO_BN[cat.toLowerCase()] || cat; }

    function getCat(cat) { return CAT[canonicalCat(cat)] || defaultCat; }
    function fmtDate(dateStr) {
        if (!dateStr) return '';
        try {
            // Bug #7 fix: 'YYYY-MM-DD' strings are parsed as UTC by Date(),
            // which shifts the displayed date back by 1 day in UTC+ timezones.
            // Appending T00:00:00 forces local-timezone parsing.
            const dt = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
            return l==='bn'
                ? dt.toLocaleDateString('bn-BD',{year:'numeric',month:'short',day:'numeric'})
                : dt.toLocaleDateString('en-GB',{year:'numeric',month:'short',day:'numeric'});
        } catch(e) { return dateStr; }
    }

    // Active filter
    const activeFilter = state.blogFilter || '';
    const filtered = activeFilter ? allPosts.filter(p=>canonicalCat(p.category)===canonicalCat(activeFilter)) : allPosts;
    const featured = filtered[0];
    const rest = filtered.slice(1);

    // Cards bg / border
    const cardBg = d?'#1f2937':'#ffffff';
    const cardBorder = d?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)';
    const textPrimary = d?'#f9fafb':'#111827';
    const textSecondary = d?'#9ca3af':'#6b7280';
    const dividerColor = d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';

    // Category filter bar
    // Bug #5 fix: removed English keys from CAT, so no need to filter them out anymore
    const categories = Object.keys(CAT);
    const filterBar = `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button data-action="setBlogFilter" data-param=""
            style="font-size:12px;font-weight:600;padding:5px 14px;border-radius:20px;border:1px solid ${!activeFilter?'#1D9E75':cardBorder};background:${!activeFilter?(d?'#1D9E75':'#1D9E75'):(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)')};color:${!activeFilter?'#fff':textSecondary};cursor:pointer;transition:all .15s">
            ${l==='bn'?'সব':'All'}
        </button>
        ${categories.map(cat=>{
            const isActive = activeFilter===cat;
            const c = getCat(cat);
            return `<button data-action="setBlogFilter" data-param="${cat}"
                style="font-size:12px;font-weight:600;padding:5px 14px;border-radius:20px;border:1px solid ${isActive?c.color:cardBorder};background:${isActive?c.color:(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)')};color:${isActive?'#fff':textSecondary};cursor:pointer;transition:all .15s">
                ${catIcon[cat]||''} ${l==='bn'?cat:(CAT[cat]?.en||cat)}
            </button>`;
        }).join('')}
    </div>`;

    // Featured card
    const featuredHtml = featured ? (() => {
        const c = getCat(featured.category);
        const isCustom = String(featured.id).startsWith('custom_');
        return `
        <article class="reveal" style="background:${cardBg};border:1px solid ${cardBorder};border-radius:16px;overflow:hidden">
            <div style="height:4px;background:${c.color}"></div>
            <div style="padding:1.5rem 1.75rem">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
                    <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:rgba(29,158,117,.15);color:${d?'#5DCAA5':'#0F6E56'}">⭐ ${l==='bn'?'ফিচার্ড':'Featured'}</span>
                    <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${c.bg};color:${c.fg}">${catIcon[canonicalCat(featured.category)]||''} ${sanitize(l==='en'?(CAT[canonicalCat(featured.category)]?.en||featured.category):(canonicalCat(featured.category)||''))}</span>
                    ${isCustom?`<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;background:${d?'rgba(55,138,221,.2)':'#E6F1FB'};color:${d?'#85B7EB':'#0C447C'}">${l==='bn'?'কাস্টম':'Custom'}</span>`:''}
                    <span style="margin-left:auto;font-size:12px;color:${textSecondary}">🕐 ${sanitize(featured.readTime||'')}</span>
                    <span style="font-size:12px;color:${textSecondary}">📅 ${fmtDate(featured.date)}</span>
                </div>
                <h3 style="font-size:1.4rem;font-weight:700;color:${textPrimary};line-height:1.4;margin-bottom:10px">${sanitize(l==='bn'?featured.titleBn:featured.titleEn)}</h3>
                <p style="font-size:14px;color:${textSecondary};line-height:1.7;margin-bottom:1.25rem">${sanitize(featured.excerpt||'')}</p>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:4px;border-top:1px solid ${dividerColor}">
                    <button data-action="readPost" data-param="${featured.id}"
                        style="font-size:13px;font-weight:600;padding:8px 20px;border-radius:10px;border:1px solid ${c.color};color:${c.fg};background:transparent;cursor:pointer">
                        ${t('readMore')} →
                    </button>
                    <button data-action="toggleBookmark" data-param="${featured.id}" data-param2="post"
                        style="margin-left:auto;background:none;border:none;font-size:18px;cursor:pointer;opacity:.7">
                        ${isBookmarked(featured.id,'post')?'🔖':'🤍'}
                    </button>
                    ${state.isAdmin&&isCustom&&UPLOAD_LIVE_FEATURE_ENABLED?`
                        <button data-action="openBlogEditorEdit" data-param="${featured.id}" style="background:none;border:none;font-size:15px;cursor:pointer;opacity:.65">✏️</button>
                        <button data-action="deleteCustomPost" data-param="${featured.id}" style="background:none;border:none;font-size:15px;cursor:pointer;opacity:.65">🗑</button>
                    `:''}
                </div>
            </div>
        </article>`;
    })() : '';

    // Post grid cards
    const gridHtml = rest.length ? `
    <div>
        <p style="font-size:13px;font-weight:600;color:${textSecondary};margin-bottom:12px">${l==='bn'?'সকল লেখা':'All Posts'}</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
            ${rest.map((post,pi)=>{
                const c = getCat(post.category);
                const isCustom = String(post.id).startsWith('custom_');
                return `
                <article class="reveal reveal-delay-${pi%4+1}" style="background:${cardBg};border:1px solid ${cardBorder};border-radius:14px;overflow:hidden;display:flex;flex-direction:column">
                    <div style="height:3px;background:${c.color};flex-shrink:0"></div>
                    <div style="padding:1rem 1.1rem;display:flex;flex-direction:column;gap:8px;flex:1">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                            <span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:${c.bg};color:${c.fg}">${catIcon[canonicalCat(post.category)]||''} ${sanitize(l==='en'?(CAT[canonicalCat(post.category)]?.en||post.category):(canonicalCat(post.category)||''))}</span>
                            ${isCustom?`<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;background:${d?'rgba(55,138,221,.2)':'#E6F1FB'};color:${d?'#85B7EB':'#0C447C'}">${l==='bn'?'কাস্টম':'Custom'}</span>`:''}
                            <span style="margin-left:auto;font-size:11px;color:${textSecondary}">🕐 ${sanitize(post.readTime||'')}</span>
                        </div>
                        <h3 style="font-size:14px;font-weight:700;color:${textPrimary};line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${sanitize(l==='bn'?post.titleBn:post.titleEn)}</h3>
                        <p style="font-size:12px;color:${textSecondary};line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${sanitize(post.excerpt||'')}</p>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:8px;border-top:1px solid ${dividerColor}">
                            <button data-action="readPost" data-param="${post.id}"
                                style="font-size:11px;font-weight:600;padding:5px 13px;border-radius:8px;border:1px solid ${c.color};color:${c.fg};background:transparent;cursor:pointer">
                                ${t('readMore')} →
                            </button>
                            <button data-action="toggleBookmark" data-param="${post.id}" data-param2="post"
                                style="margin-left:auto;background:none;border:none;font-size:16px;cursor:pointer;opacity:.7">
                                ${isBookmarked(post.id,'post')?'🔖':'🤍'}
                            </button>
                            ${state.isAdmin&&isCustom&&UPLOAD_LIVE_FEATURE_ENABLED?`
                                <button data-action="openBlogEditorEdit" data-param="${post.id}" style="background:none;border:none;font-size:14px;cursor:pointer;opacity:.6">✏️</button>
                                <button data-action="deleteCustomPost" data-param="${post.id}" style="background:none;border:none;font-size:14px;cursor:pointer;opacity:.6">🗑</button>
                            `:''}
                        </div>
                    </div>
                </article>`;
            }).join('')}
        </div>
    </div>` : '';

    // 2026-08-11: blogPosts now loads asynchronously (see top of this file),
    // so an empty `filtered` list can mean three different things — actually
    // loading, a failed fetch, or a genuinely empty category. Only the first
    // two get a distinct message when no category filter is active; a
    // filtered-empty category keeps the exact original message/markup.
    const emptyHtml = filtered.length===0 ? (
        !activeFilter && blogPostsLoadState==='loading' ? `
        <p style="text-align:center;padding:3rem 0;color:${textSecondary};font-size:14px">
            ${l==='bn'?'পোস্ট লোড হচ্ছে…':'Loading posts…'}
        </p>`
        : !activeFilter && blogPostsLoadState==='error' ? `
        <p style="text-align:center;padding:3rem 0;color:${textSecondary};font-size:14px">
            ${l==='bn'?'পোস্ট লোড করা যায়নি। দয়া করে আবার চেষ্টা করুন।':'Could not load posts. Please try again.'}
        </p>`
        : `
        <p style="text-align:center;padding:3rem 0;color:${textSecondary};font-size:14px">
            ${l==='bn'?'এই ক্যাটাগরিতে কোনো পোস্ট নেই':'No posts in this category'}
        </p>`
    ) : '';

    return `
    <div class="space-y-6 page-enter">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px">
            <div>
                <h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">📝 ${t('blog')}</h2>
                <p style="font-size:13px;color:${textSecondary};margin-top:4px">${l==='bn'?'ইসলামিক জ্ঞান ও অন্তর্দৃষ্টি':'Islamic knowledge & insights'}</p>
            </div>
            ${state.isAdmin&&UPLOAD_LIVE_FEATURE_ENABLED?`
            <button data-action="openBlogEditor"
                style="font-size:13px;font-weight:600;padding:8px 18px;border-radius:10px;border:1px solid #1D9E75;color:${d?'#5DCAA5':'#0F6E56'};background:transparent;cursor:pointer;display:flex;align-items:center;gap:6px">
                + ${t('newPost')}
            </button>`:''}
        </div>

        ${filterBar}
        ${emptyHtml}
        ${featuredHtml}
        ${gridHtml}
    </div>`;
}

// ============================================================================
// BLOG EDITOR MODAL RENDERER
// ============================================================================

/**
 * Render blog editor modal for creating/editing posts
 * @returns {string} HTML markup
 */
function renderBlogEditorModal() {
    if (!state.showBlogEditor || !state.editingPost) return '';
    const d=state.darkMode; const l=state.language;
    const p=state.editingPost;
    const isNew=String(p.id).startsWith('custom_')&&!state.customPosts.find(cp=>cp.id===p.id);
    // Bug #1 fix: sanitize() (via escapeHtml/innerHTML round-trip) does not
    // escape double quotes. That's fine for text *content*, but these values
    // are placed inside value="..." attributes — a literal " in the title
    // closes the attribute early and corrupts the rest of the modal's HTML.
    // attrSafe() escapes & and " (and < > for good measure) so the attribute
    // always stays intact, regardless of what the admin typed.
    const attrSafe = v => sanitize(v).replace(/"/g,'&quot;');

    return `
    <div class="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="${d?'bg-gray-800':'bg-white'} rounded-2xl p-8 w-full max-w-2xl shadow-2xl fade-in my-4">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">${isNew?t('newPost'):t('editPost')}</h3>
                <button data-action="closeBlogEditor" class="p-1 rounded hover:opacity-70">✕</button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'শিরোনাম (বাংলা)':'Title (Bengali)'}</label>
                    <input id="blog-editor-titleBn" type="text" value="${attrSafe(p.titleBn)}"
                        class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                    <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'শিরোনাম (ইংরেজি)':'Title (English)'}</label>
                    <input id="blog-editor-titleEn" type="text" value="${attrSafe(p.titleEn)}"
                        class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'ক্যাটাগরি':'Category'}</label>
                        <input id="blog-editor-category" type="text" value="${attrSafe(p.category)}"
                            class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                        <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'পড়ার সময়':'Read Time'}</label>
                        <input id="blog-editor-readTime" type="text" value="${attrSafe(p.readTime)}"
                            class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                </div>
                <div>
                    <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'সারসংক্ষেপ':'Excerpt'}</label>
                    <input id="blog-editor-excerpt" type="text" value="${attrSafe(p.excerpt)}"
                        class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                    <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'বিষয়বস্তু (বাংলা)':'Content (Bengali)'}</label>
                    <textarea id="blog-editor-contentBn"
                        class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-32 focus:outline-none focus:ring-2 focus:ring-green-500">${p.contentBn?p.contentBn.replace(/</g,'&lt;').replace(/>/g,'&gt;'):''}</textarea>
                </div>
                <div>
                    <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'বিষয়বস্তু (ইংরেজি)':'Content (English)'}</label>
                    <textarea id="blog-editor-contentEn"
                        class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-32 focus:outline-none focus:ring-2 focus:ring-green-500">${p.contentEn?p.contentEn.replace(/</g,'&lt;').replace(/>/g,'&gt;'):''}</textarea>
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button data-action="saveBlogPost" class="${d?'bg-green-700 hover:bg-green-600':'bg-green-600 hover:bg-green-700'} text-white flex-1 py-3 rounded-xl font-semibold">💾 ${t('savePost')}</button>
                <button data-action="closeBlogEditor" class="${d?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'} px-6 py-3 rounded-xl font-semibold">${t('cancel')}</button>
            </div>
        </div>
    </div>`;
}

