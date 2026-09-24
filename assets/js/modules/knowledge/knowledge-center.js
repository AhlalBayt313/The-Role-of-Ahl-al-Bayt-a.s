// ============================================================================
// KNOWLEDGE CENTER — LOGIC + RENDERING
// Replaces the old PDF Library. Sections: Hadith, Masail, Q&A, Fatwa.
// Data comes from knowledge-center-data.js (loaded before this file).
// Reuses existing app primitives: state, sanitize(), t(), shareContent(),
// toggleBookmark()/isBookmarked(), showToast(), render().
// ============================================================================

const KC_PER_PAGE = 9;

// ---------------------------------------------------------------------------
// FAVORITES (separate from the site-wide Bookmark system — a lighter-weight
// "I like this" marker, purely within the Knowledge Center)
// ---------------------------------------------------------------------------
function kcFavKey(type, id) { return `${type}-${String(id)}`; }
function isKcFavorite(id, type) {
    return Array.isArray(state.kcFavorites) && state.kcFavorites.includes(kcFavKey(type, id));
}
function toggleKcFavorite(id, type) {
    if (!Array.isArray(state.kcFavorites)) state.kcFavorites = [];
    const key = kcFavKey(type, id);
    const i = state.kcFavorites.indexOf(key);
    const adding = i === -1;
    if (i > -1) state.kcFavorites.splice(i, 1); else state.kcFavorites.push(key);
    saveState(); render();
    const l = state.language;
    showToast(adding ? (l==='bn'?'❤️ পছন্দের তালিকায় যোগ হলো':'❤️ Added to favorites')
                      : (l==='bn'?'পছন্দ থেকে সরানো হলো':'Removed from favorites'), 'success');
}


const KC_TABS = [
    {key:'hadith', icon:'📜', color:'#7c3aed', bn:'হাদিস',    en:'Hadith'},
    {key:'masail', icon:'⚖️', color:'#0d9488', bn:'মাসাইল',   en:'Masail'},
    {key:'qa',     icon:'❓', color:'#2563eb', bn:'প্রশ্নোত্তর', en:'Q&A'},
    {key:'fatwa',  icon:'📃', color:'#b45309', bn:'ফতোয়া',    en:'Fatwa'},
];

function kcTabMeta(tab) { return KC_TABS.find(t=>t.key===tab) || KC_TABS[0]; }

// tab → {items, categories, bookmarkType}
function kcTabConfig(tab) {
    switch(tab) {
        case 'hadith': return {
            items: (typeof kcHadiths!=='undefined') ? kcHadiths : null,
            categories: (typeof kcHadithCategories!=='undefined') ? kcHadithCategories : [],
            bookmarkType: 'kcHadith',
        };
        case 'masail': return {
            items: (typeof kcMasail!=='undefined') ? kcMasail : null,
            categories: (typeof kcMasailCategories!=='undefined') ? kcMasailCategories : [],
            bookmarkType: 'kcMasail',
        };
        case 'qa': return {
            items: (typeof kcQa!=='undefined') ? kcQa : null,
            categories: (typeof kcQaCategories!=='undefined') ? kcQaCategories : [],
            bookmarkType: 'kcQa',
        };
        case 'fatwa': return {
            items: (typeof kcFatwa!=='undefined') ? kcFatwa : null,
            categories: (typeof kcMaraji!=='undefined') ? kcMaraji : [],
            bookmarkType: 'kcFatwa',
        };
        default: return {items:[], categories:[], bookmarkType:'kc'};
    }
}

function kcItemTitle(tab, item, l) {
    if (tab==='hadith') return l==='bn' ? item.textBn : (item.textEn||item.textBn);
    if (tab==='masail' || tab==='qa' || tab==='fatwa') return l==='bn' ? item.questionBn : (item.questionEn||item.questionBn);
    return '';
}
function kcItemBody(tab, item, l) {
    if (tab==='hadith') return l==='bn' ? (item.sourceBn||'') : (item.sourceEn||item.sourceBn||'');
    return l==='bn' ? (item.answerBn||'') : (item.answerEn||item.answerBn||'');
}
function kcFindItem(tab, id) {
    const cfg = kcTabConfig(tab);
    if (!cfg.items) return null;
    return cfg.items.find(x=>String(x.id)===String(id)) || null;
}

// ---------------------------------------------------------------------------
// FILTERING / PAGINATION
// ---------------------------------------------------------------------------
function kcFilteredItems(tab) {
    const cfg = kcTabConfig(tab);
    if (!cfg.items) return [];
    const l = state.language;
    const q = (state.kcSearch||'').trim().toLowerCase();
    let items = cfg.items;

    if (state.kcCategory) {
        const catField = tab==='fatwa' ? 'marja' : 'category';
        items = items.filter(x => x[catField] === state.kcCategory);
    }
    if (tab==='hadith' && state.kcSourceFilter) {
        items = items.filter(x => (x.sourceBn||'') === state.kcSourceFilter || (x.sourceEn||'') === state.kcSourceFilter);
    }
    if (q) {
        items = items.filter(x => {
            const hay = [
                x.textBn,x.textEn,x.questionBn,x.questionEn,x.answerBn,x.answerEn,
                x.sourceBn,x.sourceEn,x.narratorBn,x.narratorEn,x.refBn,x.refEn
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        });
    }
    if (state.kcFilter === 'bookmarked') {
        items = items.filter(x => typeof isBookmarked==='function' && isBookmarked(x.id, cfg.bookmarkType));
    } else if (state.kcFilter === 'favorite') {
        items = items.filter(x => isKcFavorite(x.id, cfg.bookmarkType));
    }
    return items;
}

function kcPaginate(items, page) {
    const totalPages = Math.max(1, Math.ceil(items.length / KC_PER_PAGE));
    const safePage = Math.min(Math.max(1, page||1), totalPages);
    const start = (safePage-1) * KC_PER_PAGE;
    return { pageItems: items.slice(start, start+KC_PER_PAGE), totalPages, safePage };
}

// ---------------------------------------------------------------------------
// SEARCH (used by global site search + Knowledge Center's own search bar)
// ---------------------------------------------------------------------------
// [Cleanup, this session] searchKnowledgeCenter(q) used to be fully
// implemented here (linear scan over hadith/masail/qa/fatwa). It has been
// superseded by assets/js/core/search-engine.js's indexed implementation,
// which loads after this file and redefines searchKnowledgeCenter(q)
// globally with the exact same name/parameter/return shape — see
// search-engine.js's file-header comment for the backward-compatibility
// contract. The old body here was dead code (permanently shadowed) and has
// been removed; every call site (script-3-pages.js's performSearch,
// script-1-core.js's legacy _performSearch) already calls the plain global
// searchKnowledgeCenter(q), which now resolves straight to
// search-engine.js's version with no behavior change.

// ---------------------------------------------------------------------------
// COPY / SHARE
// ---------------------------------------------------------------------------
function kcCopyText(tab, item, l) {
    const title = kcItemTitle(tab, item, l);
    const body = kcItemBody(tab, item, l);
    return body ? `${title}\n— ${body}` : title;
}
function kcCopyItem(tab, id) {
    const item = kcFindItem(tab, id);
    if (!item) return;
    const l = state.language;
    const text = kcCopyText(tab, item, l);
    const done = () => showToast(l==='bn'?'✅ কপি হয়েছে':'✅ Copied','success');
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(()=>{
            const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); done(); } catch(e){}
            document.body.removeChild(ta);
        });
    } else {
        const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch(e){}
        document.body.removeChild(ta);
    }
}
function kcShareItem(tab, id) {
    const item = kcFindItem(tab, id);
    if (!item) return;
    const l = state.language;
    const meta = kcTabMeta(tab);
    const title = kcItemTitle(tab, item, l);
    const body = kcItemBody(tab, item, l);
    shareContent(`${meta.icon} ${l==='bn'?meta.bn:meta.en}`, body ? `${title}\n${body}` : title, '');
}

// ---------------------------------------------------------------------------
// SMALL UI HELPERS
// ---------------------------------------------------------------------------
function kcBreadcrumb(d, l, parts) {
    // parts: [{label, action, param}]  — last part is current (non-clickable)
    return `
    <nav aria-label="${l==='bn'?'ব্রেডক্রাম্ব':'Breadcrumb'}" class="text-xs sm:text-sm flex flex-wrap items-center gap-1.5 reveal" style="color:${d?'#9ca3af':'#6b7280'}">
        ${parts.map((p,i)=>{
            const isLast = i===parts.length-1;
            if (isLast) return `<span class="font-semibold" style="color:${d?'#e5e7eb':'#111827'}" aria-current="page">${sanitize(p.label)}</span>`;
            return `<button data-action="${p.action}" data-param="${p.param??''}" class="hover:underline focus:outline-none kc-crumb-btn" style="color:#059669">${sanitize(p.label)}</button><span aria-hidden="true">/</span>`;
        }).join('')}
    </nav>`;
}

function kcSimulateLoad() {
    state.kcLoading = true;
    clearTimeout(window._kcLoadTimer);
    window._kcLoadTimer = setTimeout(() => { state.kcLoading = false; render(); }, 260);
}

// Loads a tab's full data, then renders exactly once — no artificial
// skeleton-then-content two-step, which was playing the card entrance
// animation twice per tab click. A skeleton only appears as a fallback
// if the data genuinely takes a moment (slow device/connection); for the
// normal case (local JSON, near-instant) it never shows, so the tab
// switch produces a single clean render/animation.
function kcLoadTab(tab) {
    clearTimeout(window._kcSkeletonTimer);
    const requestId = (window._kcLoadRequestId = (window._kcLoadRequestId || 0) + 1);
    let settled = false;

    window._kcSkeletonTimer = setTimeout(() => {
        if (settled || window._kcLoadRequestId !== requestId) return;
        state.kcLoading = true;
        render();
    }, 150);

    const dataReady = (typeof loadKcSection === 'function') ? loadKcSection(tab) : Promise.resolve();
    dataReady.then(() => {
        settled = true;
        if (window._kcLoadRequestId !== requestId) return;
        clearTimeout(window._kcSkeletonTimer);
        state.kcLoading = false;
        render();
    });
}

function kcUpdateSeoSchema(tab) {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('kc-faq-schema');
    if (tab !== 'qa' && tab !== 'masail' && tab !== 'fatwa') {
        if (existing) existing.remove();
        return;
    }
    const l = state.language;
    const items = kcFilteredItems(tab).filter(item => !item.sample).slice(0, 12);
    if (items.length === 0) {
        if (existing) existing.remove();
        return;
    }
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map(item => ({
            '@type': 'Question',
            name: kcItemTitle(tab, item, l),
            acceptedAnswer: {
                '@type': 'Answer',
                text: kcItemBody(tab, item, l),
            },
        })),
    };
    let tag = existing;
    if (!tag) {
        tag = document.createElement('script');
        tag.type = 'application/ld+json';
        tag.id = 'kc-faq-schema';
        document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(schema);
}

function kcSkeletonGrid(d, n) {
    n = n || 6;
    const shimmer = d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
    const shimmer2 = d ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.09)';
    return `
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true" aria-busy="true">
        ${Array.from({length:n}).map((_,i)=>`
        <div class="rounded-2xl p-4 border" style="background:${d?'#1e2a22':'#ffffff'};border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};animation:fadeInUp .3s ease-out ${i*.04}s both">
            <div style="height:14px;width:40%;border-radius:8px;background:${shimmer2};margin-bottom:14px;animation:kcPulse 1.3s ease-in-out infinite"></div>
            <div style="height:12px;width:95%;border-radius:6px;background:${shimmer};margin-bottom:8px;animation:kcPulse 1.3s ease-in-out infinite .1s"></div>
            <div style="height:12px;width:80%;border-radius:6px;background:${shimmer};margin-bottom:8px;animation:kcPulse 1.3s ease-in-out infinite .2s"></div>
            <div style="height:12px;width:60%;border-radius:6px;background:${shimmer};margin-bottom:16px;animation:kcPulse 1.3s ease-in-out infinite .3s"></div>
            <div style="height:32px;border-radius:12px;background:${shimmer};animation:kcPulse 1.3s ease-in-out infinite .4s"></div>
        </div>`).join('')}
    </div>
    <style>@keyframes kcPulse{0%,100%{opacity:1}50%{opacity:.45}}</style>`;
}

function kcSkeletonCategoryGrid(d, n) {
    n = n || 9;
    const shimmer = d ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)';
    return `
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3.5" aria-hidden="true" aria-busy="true">
        ${Array.from({length:n}).map((_,i)=>`
        <div class="rounded-2xl p-4 border" style="background:${d?'#1e2a22':'#ffffff'};border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};animation:fadeInUp .3s ease-out ${i*.03}s both">
            <div style="width:28px;height:28px;border-radius:8px;background:${shimmer};margin-bottom:10px;animation:kcPulse 1.3s ease-in-out infinite"></div>
            <div style="height:11px;width:85%;border-radius:6px;background:${shimmer};margin-bottom:6px;animation:kcPulse 1.3s ease-in-out infinite .15s"></div>
            <div style="height:9px;width:40%;border-radius:6px;background:${shimmer};animation:kcPulse 1.3s ease-in-out infinite .3s"></div>
        </div>`).join('')}
    </div>
    <style>@keyframes kcPulse{0%,100%{opacity:1}50%{opacity:.45}}</style>`;
}

function kcEmptyState(d, l, icon, msg) {
    return `
    <div class="text-center py-16 reveal" style="color:${d?'#6b7280':'#9ca3af'}">
        <div style="font-size:3.5rem;margin-bottom:1rem;opacity:.5">${icon}</div>
        <p class="font-semibold text-base">${sanitize(msg)}</p>
    </div>`;
}

function kcErrorState(d, l) {
    return `
    <div class="text-center py-16 reveal" style="color:${d?'#f87171':'#dc2626'}">
        <div style="font-size:3.5rem;margin-bottom:1rem;opacity:.7">⚠️</div>
        <p class="font-semibold text-base">${l==='bn'?'তথ্য লোড করা যায়নি — পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন':'Could not load content — please refresh and try again'}</p>
    </div>`;
}

function kcPagination(d, l, totalPages, currentPage) {
    if (totalPages<=1) return '';
    const pages = [];
    for (let i=1;i<=totalPages;i++) pages.push(i);
    // Phase 3C #18: every control is a 40x40 touch target (the transparent <button>) around the SAME 34px visible
    // pill as before (now an inner <span> carrying the original size/radius/border/colours/font). The flex gap
    // shrinks 8px -> 2px so the VISIBLE gap stays 3+2+3 = 8px, and a -3px block margin on the <nav> keeps the
    // vertical rhythm: identical pixels and wrapping, a 40px hit area. pointer-events:none keeps every click
    // targeted at the <button> itself (as before), so a disabled prev/next still swallows its clicks.
    const hit = 'display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:40px;padding:3px;border:0;border-radius:13px;background:none';
    const pill = 'display:flex;align-items:center;justify-content:center;pointer-events:none';
    return `
    <nav aria-label="${l==='bn'?'পেজিনেশন':'Pagination'}" class="flex flex-wrap items-center justify-center gap-0.5 pt-4 reveal" style="margin-block:-3px">
        <button data-action="kcSetPage" data-param="${Math.max(1,currentPage-1)}" ${currentPage===1?'disabled':''}
            aria-label="${l==='bn'?'পূর্ববর্তী পৃষ্ঠা':'Previous page'}"
            style="${hit};cursor:${currentPage===1?'default':'pointer'}"><span style="${pill};width:34px;height:34px;border-radius:10px;font-weight:700;font-size:12px;
            background:${d?'#1e2a22':'#ffffff'};border:1.5px solid ${d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'};
            color:${currentPage===1?(d?'#4b5563':'#d1d5db'):(d?'#e5e7eb':'#111827')}">‹</span></button>
        ${pages.map(p=>`
        <button data-action="kcSetPage" data-param="${p}"
            aria-label="${l==='bn'?`পৃষ্ঠা ${p}`:`Page ${p}`}" aria-current="${p===currentPage?'page':'false'}"
            style="${hit};cursor:pointer"><span style="${pill};min-width:34px;height:34px;padding:0 10px;border-radius:10px;font-weight:700;font-size:12.5px;
            background:${p===currentPage?'linear-gradient(135deg,#059669,#065f46)':(d?'#1e2a22':'#ffffff')};
            color:${p===currentPage?'#fff':(d?'#e5e7eb':'#111827')};
            border:1.5px solid ${p===currentPage?'transparent':(d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)')}">${p}</span></button>`).join('')}
        <button data-action="kcSetPage" data-param="${Math.min(totalPages,currentPage+1)}" ${currentPage===totalPages?'disabled':''}
            aria-label="${l==='bn'?'পরবর্তী পৃষ্ঠা':'Next page'}"
            style="${hit};cursor:${currentPage===totalPages?'default':'pointer'}"><span style="${pill};width:34px;height:34px;border-radius:10px;font-weight:700;font-size:12px;
            background:${d?'#1e2a22':'#ffffff'};border:1.5px solid ${d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'};
            color:${currentPage===totalPages?(d?'#4b5563':'#d1d5db'):(d?'#e5e7eb':'#111827')}">›</span></button>
    </nav>`;
}

function kcFilterBar(d, l) {
    const opts = [
        {key:'all', icon:'📋', bn:'সব', en:'All'},
        {key:'bookmarked', icon:'⭐', bn:'বুকমার্কড', en:'Bookmarked'},
        {key:'favorite', icon:'❤️', bn:'পছন্দের', en:'Favorites'},
    ];
    return `
    <div class="flex flex-wrap gap-2 reveal" role="group" aria-label="${l==='bn'?'ফিল্টার':'Filter'}">
        ${opts.map(o=>`
        <button data-action="setKcFilter" data-param="${o.key}"
            aria-pressed="${state.kcFilter===o.key}"
            style="display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:7px 14px;border-radius:50px;cursor:pointer;
            background:${state.kcFilter===o.key?'linear-gradient(135deg,#059669,#065f46)':(d?'#1e2a22':'#ffffff')};
            color:${state.kcFilter===o.key?'#fff':(d?'#9ca3af':'#6b7280')};
            border:1.5px solid ${state.kcFilter===o.key?'transparent':(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')}">
            ${o.icon} ${l==='bn'?o.bn:o.en}
        </button>`).join('')}
    </div>`;
}

function kcSearchBar(d, l, placeholder) {
    return `
    <div class="reveal" style="position:relative">
        <div style="position:absolute;left:16px;top:50%;transform:translateY(-50%);pointer-events:none;color:${d?'#6b7280':'#9ca3af'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </div>
        <input type="search" value="${sanitize(state.kcSearch||'')}" aria-label="${sanitize(placeholder)}" placeholder="${sanitize(placeholder)}"
            oninput="state.kcSearch=this.value;state.kcPage=1;const r=document.getElementById('kc-results');if(r)r.innerHTML=renderKcResultsInner();"
            style="width:100%;padding:12px 16px 12px 44px;border-radius:16px;font-size:.9rem;
            background:${d?'#1e2a22':'#ffffff'};border:2px solid ${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.18)'};
            color:${d?'#f9fafb':'#111827'};outline:none" />
    </div>`;
}

// ---------------------------------------------------------------------------
// CARD — 4 visually distinct designs (one per tab)
// Hadith    → manuscript / quotation card
// Masail    → verdict / index-card
// Q&A       → conversational chat bubbles
// Fatwa     → certificate / letterhead
// ---------------------------------------------------------------------------
function kcSampleBadge(l, item) {
    return item.sample ? `<span class="kc-sample-badge">${l==='bn'?'নমুনা':'Sample'}</span>` : '';
}

function kcCardActions(tab, item, cfg, d, l, bookmarked, favorited, accentColor) {
    return `
    <div class="kc-card-actions">
        <button data-action="kcOpenDetail" data-param="${tab}" data-param2="${item.id}" class="kc-act-main"
            style="background:linear-gradient(135deg,${accentColor},${accentColor}bb)">
            ${l==='bn'?'বিস্তারিত':'View'}
        </button>
        <button data-action="toggleBookmark" data-param="${item.id}" data-param2="${cfg.bookmarkType}" class="kc-act-icon"
            aria-label="${l==='bn'?'বুকমার্ক':'Bookmark'}" aria-pressed="${bookmarked}"
            style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)'};border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'}">
            ${bookmarked?'⭐':'☆'}
        </button>
        <button data-action="kcToggleFavorite" data-param="${item.id}" data-param2="${cfg.bookmarkType}" class="kc-act-icon"
            aria-label="${l==='bn'?'পছন্দ':'Favorite'}" aria-pressed="${favorited}"
            style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)'};border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'}">
            ${favorited?'❤️':'🤍'}
        </button>
        <button data-action="kcCopy" data-param="${tab}" data-param2="${item.id}" class="kc-act-icon"
            aria-label="${l==='bn'?'কপি':'Copy'}"
            style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)'};border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'};font-size:12px">📋</button>
        <button data-action="kcShare" data-param="${tab}" data-param2="${item.id}" class="kc-act-icon"
            aria-label="${l==='bn'?'শেয়ার':'Share'}"
            style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)'};border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'};font-size:12px">📤</button>
    </div>`;
}

// 1. HADITH — manuscript / quotation card: gold shimmer bar, giant quote mark,
// serif Bengali hero text, narrator attribution, source as a footnote.
function kcCardHadith(item, cfg, d, l, pi) {
    const meta = kcTabMeta('hadith');
    const bookmarked = typeof isBookmarked==='function' && isBookmarked(item.id, cfg.bookmarkType);
    const favorited = isKcFavorite(item.id, cfg.bookmarkType);
    const text = l==='bn' ? item.textBn : (item.textEn||item.textBn);
    const narrator = l==='bn' ? (item.narratorBn||'') : (item.narratorEn||item.narratorBn||'');
    const source = l==='bn' ? (item.sourceBn||'') : (item.sourceEn||item.sourceBn||'');
    const ref = l==='bn' ? (item.refBn||'') : (item.refEn||item.refBn||'');
    return `
    <article class="kc-card kc-card-hadith border flex flex-col" style="background:${d?'#1e2a22':'#ffffff'};
        border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--app-shadow-sm);
        animation:fadeInUp .35s ease-out ${(pi%9)*.04}s both">
        <div class="kc-gold-bar"></div>
        <div class="kc-hadith-body flex flex-col flex-1">
            <div class="flex items-center justify-between gap-2 mb-2">
                <span class="kc-badge" style="background:${meta.color}18;color:${meta.color}">${meta.icon} ${l==='bn'?meta.bn:meta.en}</span>
                ${kcSampleBadge(l, item)}
            </div>
            <span class="kc-hadith-quote-mark" aria-hidden="true">❝</span>
            <blockquote class="kc-hadith-text line-clamp-4" style="color:${d?'#f3f4f6':'#1c1917'}">${sanitize(text)}</blockquote>
            ${narrator?`<div class="kc-hadith-narrator" style="color:${d?'#d1d5db':'#374151'}">${sanitize(narrator)}</div>`:''}
            ${(source||ref)?`<div class="kc-hadith-footnote" style="color:${d?'#9ca3af':'#6b7280'}">📖 ${sanitize([ref,source].filter(Boolean).join(' · '))}</div>`:''}
            ${kcCardActions('hadith', item, cfg, d, l, bookmarked, favorited, meta.color)}
        </div>
    </article>`;
}

// 2. MASAIL — verdict / index-card: colored left tab, "প্রশ্ন" label,
// highlighted "সংক্ষিপ্ত জবাব" box, small marja-variance note.
function kcCardMasail(item, cfg, d, l, pi) {
    const meta = kcTabMeta('masail');
    const bookmarked = typeof isBookmarked==='function' && isBookmarked(item.id, cfg.bookmarkType);
    const favorited = isKcFavorite(item.id, cfg.bookmarkType);
    const question = l==='bn' ? item.questionBn : (item.questionEn||item.questionBn);
    const answer = l==='bn' ? (item.answerBn||'') : (item.answerEn||item.answerBn||'');
    const detail = l==='bn' ? (item.detailBn||'') : (item.detailEn||item.detailBn||'');
    return `
    <article class="kc-card kc-card-masail border" style="background:${d?'#1e2a22':'#ffffff'};
        border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--app-shadow-sm);
        animation:fadeInUp .35s ease-out ${(pi%9)*.04}s both">
        <div class="kc-masail-tab" style="background:${meta.color}"></div>
        <div class="kc-masail-body">
            <div class="flex items-center justify-between gap-2">
                <span class="kc-badge" style="background:${meta.color}18;color:${meta.color}">${meta.icon} ${l==='bn'?meta.bn:meta.en}</span>
                ${kcSampleBadge(l, item)}
            </div>
            <div class="kc-masail-q-label" style="color:${meta.color}">❔ ${l==='bn'?'প্রশ্ন':'Question'}</div>
            <h3 class="kc-masail-question line-clamp-2" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(question)}</h3>
            ${answer?`
            <div class="kc-masail-answer-box" style="background:${meta.color}14;border-color:${meta.color}">
                <div class="kc-masail-answer-label" style="color:${meta.color}">✓ ${l==='bn'?'সংক্ষিপ্ত জবাব':'Quick Answer'}</div>
                <div class="kc-masail-answer-text line-clamp-2" style="color:${d?'#e5e7eb':'#1f2937'}">${sanitize(answer)}</div>
            </div>`:''}
            ${detail?`<div class="kc-masail-variance-note" style="color:${d?'#9ca3af':'#6b7280'}"><span>ℹ️</span><span class="line-clamp-1">${sanitize(detail)}</span></div>`:''}
            ${kcAccordionToggleBtn('masail', item, d, l, meta.color, kcIsExpanded('masail', item.id))}
            ${kcAccordionBody('masail', item, cfg, d, l, meta, kcIsExpanded('masail', item.id))}
            ${kcCardActions('masail', item, cfg, d, l, bookmarked, favorited, meta.color)}
        </div>
    </article>`;
}

// 3. Q&A — conversational card: question + answer as two light chat bubbles.
function kcCardQa(item, cfg, d, l, pi) {
    const meta = kcTabMeta('qa');
    const bookmarked = typeof isBookmarked==='function' && isBookmarked(item.id, cfg.bookmarkType);
    const favorited = isKcFavorite(item.id, cfg.bookmarkType);
    const question = l==='bn' ? item.questionBn : (item.questionEn||item.questionBn);
    const answer = l==='bn' ? (item.answerBn||'') : (item.answerEn||item.answerBn||'');
    return `
    <article class="kc-card kc-card-qa border flex flex-col" style="background:${d?'#1e2a22':'#ffffff'};
        border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--app-shadow-sm);
        animation:fadeInUp .35s ease-out ${(pi%9)*.04}s both">
        <div class="kc-qa-body flex flex-col flex-1">
            <div class="flex items-center justify-between gap-2">
                <span class="kc-badge" style="background:${meta.color}18;color:${meta.color}">${meta.icon} ${l==='bn'?meta.bn:meta.en}</span>
                ${kcSampleBadge(l, item)}
            </div>
            <div class="kc-chat-row kc-chat-q">
                <span class="kc-chat-icon">🙋</span>
                <div class="kc-chat-bubble line-clamp-2" style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.045)'};color:${d?'#f3f4f6':'#111827'}">${sanitize(question)}</div>
            </div>
            ${answer?`
            <div class="kc-chat-row kc-chat-a">
                <span class="kc-chat-icon">💬</span>
                <div class="kc-chat-bubble line-clamp-2" style="background:${meta.color}16;color:${d?'#e5e7eb':'#1f2937'}">${sanitize(answer)}</div>
            </div>`:''}
            ${kcAccordionToggleBtn('qa', item, d, l, meta.color, kcIsExpanded('qa', item.id))}
            ${kcAccordionBody('qa', item, cfg, d, l, meta, kcIsExpanded('qa', item.id))}
            ${kcCardActions('qa', item, cfg, d, l, bookmarked, favorited, meta.color)}
        </div>
    </article>`;
}

// 4. FATWA — certificate / letterhead card: marja avatar + name as a letterhead,
// gold ribbon-seal corner, dashed-border ruling box, reference number footer.
function kcCardFatwa(item, cfg, d, l, pi) {
    const meta = kcTabMeta('fatwa');
    const bookmarked = typeof isBookmarked==='function' && isBookmarked(item.id, cfg.bookmarkType);
    const favorited = isKcFavorite(item.id, cfg.bookmarkType);
    const question = l==='bn' ? item.questionBn : (item.questionEn||item.questionBn);
    const answer = l==='bn' ? (item.answerBn||'') : (item.answerEn||item.answerBn||'');
    const ref = l==='bn' ? (item.refBn||'') : (item.refEn||item.refBn||'');
    const marjaEntry = (cfg.categories||[]).find(m=>m.key===item.marja);
    const marjaLabel = marjaEntry ? (l==='bn'?marjaEntry.bn:marjaEntry.en) : (item.marja||'');
    const initial = (marjaEntry ? marjaEntry.en : item.marja || '?').trim().charAt(0).toUpperCase();
    return `
    <article class="kc-card kc-card-fatwa border flex flex-col" style="background:${d?'#1e2a22':'#ffffff'};
        border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--app-shadow-sm);
        animation:fadeInUp .35s ease-out ${(pi%9)*.04}s both">
        ${item.sample?`<div class="kc-fatwa-ribbon">${l==='bn'?'নমুনা':'SAMPLE'}</div>`:''}
        <div class="kc-fatwa-body flex flex-col flex-1">
            <div class="kc-fatwa-letterhead" style="border-color:${meta.color}30">
                <div class="kc-fatwa-avatar" style="background:linear-gradient(135deg,${meta.color},${meta.color}bb)">${sanitize(initial)}</div>
                <div class="min-w-0">
                    <div class="kc-fatwa-marja-name truncate" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(marjaLabel)}</div>
                    <div class="kc-fatwa-badge-sm" style="color:${meta.color}">${meta.icon} ${l==='bn'?meta.bn:meta.en}</div>
                </div>
            </div>
            <h3 class="kc-fatwa-question line-clamp-2" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(question)}</h3>
            ${answer?`<div class="kc-fatwa-answer-box line-clamp-3" style="border-color:${meta.color}55;color:${d?'#e5e7eb':'#1f2937'}">${sanitize(answer)}</div>`:''}
            ${ref?`<div class="kc-fatwa-ref" style="color:${d?'#9ca3af':'#6b7280'}">№ ${sanitize(ref)}</div>`:''}
            ${kcAccordionToggleBtn('fatwa', item, d, l, meta.color, kcIsExpanded('fatwa', item.id))}
            ${kcAccordionBody('fatwa', item, cfg, d, l, meta, kcIsExpanded('fatwa', item.id))}
            ${kcCardActions('fatwa', item, cfg, d, l, bookmarked, favorited, meta.color)}
        </div>
    </article>`;
}

function kcCard(tab, item, d, l, pi) {
    const cfg = kcTabConfig(tab);
    if (tab === 'hadith') return kcCardHadith(item, cfg, d, l, pi);
    if (tab === 'masail') return kcCardMasail(item, cfg, d, l, pi);
    if (tab === 'qa') return kcCardQa(item, cfg, d, l, pi);
    if (tab === 'fatwa') return kcCardFatwa(item, cfg, d, l, pi);
    return '';
}

// ---------------------------------------------------------------------------
// PHASE 3 sub-phase B (2026-08-22) — INLINE ACCORDION for Masail / Fatwa / Q&A
// Adds an optional in-card expand/collapse preview of the full answer,
// entirely additive: the existing "বিস্তারিত/View" button + kcOpenDetail
// full-page route (renderKcDetailView, above) are untouched. Field names
// mirror the ones already read there, so the expanded content matches the
// full detail page exactly.
// ---------------------------------------------------------------------------
function kcIsExpanded(tab, id) {
    return Array.isArray(state.kcExpanded) && state.kcExpanded.includes(`${tab}-${String(id)}`);
}
function kcAccordionToggleBtn(tab, item, d, l, color, expanded) {
    return `
    <button data-action="toggleKcAccordion" data-param="${tab}" data-param2="${item.id}"
        aria-expanded="${expanded}"
        style="display:flex;align-items:center;justify-content:center;gap:5px;width:100%;
        font-size:11.5px;font-weight:700;padding:6px 0;margin-top:2px;border-radius:10px;cursor:pointer;
        background:transparent;border:1px dashed ${color}40;color:${color}">
        <span class="uc-chevron${expanded?' uc-open':''}">▾</span>
        ${expanded?(l==='bn'?'সংক্ষিপ্ত করুন':'Show less'):(l==='bn'?'সম্পূর্ণ উত্তর দেখুন':'Show full answer')}
    </button>`;
}
function kcAccordionBody(tab, item, cfg, d, l, meta, expanded) {
    const textColor = d?'#d1d5db':'#374151';
    const mutedColor = d?'#9ca3af':'#6b7280';
    const borderColor = d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)';
    let inner = '';
    if (tab==='masail') {
        const detail = l==='bn'?(item.detailBn||''):(item.detailEn||item.detailBn||'');
        const source = l==='bn'?(item.sourceBn||''):(item.sourceEn||item.sourceBn||'');
        inner = `
        <p class="leading-relaxed text-sm" style="color:${textColor}">${sanitize(l==='bn'?item.answerBn:(item.answerEn||item.answerBn))}</p>
        ${detail?`<p class="text-xs leading-relaxed p-2.5 rounded-lg mt-2" style="background:${d?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)'};color:${mutedColor}">${sanitize(detail)}</p>`:''}
        ${source?`<p class="text-xs mt-2" style="color:${mutedColor}">📚 ${sanitize(source)}</p>`:''}`;
    } else if (tab==='qa') {
        inner = `<p class="leading-relaxed text-sm" style="color:${textColor}">${sanitize(l==='bn'?item.answerBn:(item.answerEn||item.answerBn))}</p>`;
    } else if (tab==='fatwa') {
        const ref = l==='bn'?(item.refBn||''):(item.refEn||item.refBn||'');
        inner = `
        <p class="leading-relaxed text-sm" style="color:${textColor}">${sanitize(l==='bn'?item.answerBn:(item.answerEn||item.answerBn))}</p>
        ${ref?`<p class="text-xs mt-2" style="color:${mutedColor}">№ ${sanitize(ref)}</p>`:''}`;
    }
    return `<div class="uc-accordion-body${expanded?' uc-open':''}" style="border-top:${expanded?`1px solid ${borderColor}`:'none'};margin-top:${expanded?'8px':'0'};padding-top:${expanded?'8px':'0'}">${inner}</div>`;
}

// ---------------------------------------------------------------------------
// RESULTS (list + pagination), refreshed in-place on search input
// ---------------------------------------------------------------------------
function renderKcResultsInner() {
    const d=state.darkMode, l=state.language, tab=state.kcTab;
    const cfg = kcTabConfig(tab);
    if (!cfg.items) return kcErrorState(d,l);

    const filtered = kcFilteredItems(tab);
    if (filtered.length===0) {
        return kcEmptyState(d,l,'🔎', state.kcSearch
            ? (l==='bn'?'কোনো ফলাফল পাওয়া যায়নি':'No results found')
            : (l==='bn'?'এই বিভাগে এখনো কোনো তথ্য যোগ করা হয়নি':'No entries yet in this category'));
    }
    const {pageItems, totalPages, safePage} = kcPaginate(filtered, state.kcPage);
    if (state.kcPage !== safePage) state.kcPage = safePage;
    return `
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${pageItems.map((item,pi)=>kcCard(tab,item,d,l,pi)).join('')}
    </div>
    ${kcPagination(d,l,totalPages,safePage)}`;
}

// ---------------------------------------------------------------------------
// CATEGORY GRID
// ---------------------------------------------------------------------------
function kcCategoryGrid(tab, d, l) {
    const cfg = kcTabConfig(tab);
    const catField = tab==='fatwa' ? 'marja' : 'category';
    return `
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3.5 reveal">
        ${cfg.categories.map(c=>{
            const count = cfg.items ? cfg.items.filter(x=>x[catField]===c.key).length : 0;
            return `
            <button data-action="setKcCategory" data-param="${c.key}"
                class="text-left w-full focus:outline-none rounded-2xl p-4 border transition-all hover:-translate-y-0.5"
                style="background:${d?'#1e2a22':'#ffffff'};border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--app-shadow-sm)">
                <div style="font-size:1.7rem;margin-bottom:.4rem">${c.icon}</div>
                <p class="font-bold text-sm leading-snug mb-1" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(l==='bn'?c.bn:c.en)}${c.deceased?` <span style="font-size:.65rem;font-weight:700;color:${d?'#9ca3af':'#6b7280'}">(${l==='bn'?'প্রয়াত':'deceased'})</span>`:''}</p>
                <span class="text-xs" style="color:${d?'#6b7280':'#9ca3af'}">${count} ${l==='bn'?'টি':'items'}</span>
            </button>`;
        }).join('')}
    </div>`;
}

// ---------------------------------------------------------------------------
// DETAIL VIEW
// ---------------------------------------------------------------------------
function renderKcDetailView() {
    const d=state.darkMode, l=state.language;
    const {type:tab, id} = state.kcDetail || {};
    const item = kcFindItem(tab, id);
    if (!item) return kcEmptyState(d,l,'❓', l==='bn'?'আইটেমটি পাওয়া যায়নি':'Item not found');

    const meta = kcTabMeta(tab);
    const cfg = kcTabConfig(tab);
    const bookmarked = typeof isBookmarked==='function' && isBookmarked(item.id, cfg.bookmarkType);
    const favorited = isKcFavorite(item.id, cfg.bookmarkType);
    const catLabel = (() => {
        const catField = tab==='fatwa' ? 'marja' : 'category';
        const c = cfg.categories.find(x=>x.key===item[catField]);
        return c ? (l==='bn'?c.bn:c.en) : '';
    })();

    const breadcrumbParts = [
        {label:l==='bn'?'হোম':'Home', action:'changePage', param:'home'},
        {label:l==='bn'?'জ্ঞান কেন্দ্র':'Knowledge Center', action:'setKcTab', param:tab},
        {label:catLabel||(l==='bn'?meta.bn:meta.en), action:'kcCloseDetail', param:''},
        {label:l==='bn'?'বিস্তারিত':'Details'},
    ];

    const actionBtn = (icon,label,action,param2) => `
        <button data-action="${action}" data-param="${tab}" ${param2?`data-param2="${param2}"`:''}
            style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:9px 16px;border-radius:50px;
            background:${meta.color}14;color:${meta.color};border:1.5px solid ${meta.color}30;cursor:pointer">
            ${icon} ${label}
        </button>`;

    let fields = '';
    if (tab==='hadith') {
        fields = `
        <div class="space-y-4">
            <p class="text-lg leading-relaxed font-medium" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(l==='bn'?item.textBn:(item.textEn||item.textBn))}</p>
            ${item.textEn && l==='bn' ? `<p class="text-sm leading-relaxed" style="color:${d?'#9ca3af':'#6b7280'}">${sanitize(item.textEn)}</p>` : ''}
            <dl class="grid sm:grid-cols-2 gap-3 text-sm pt-2 border-t" style="border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}">
                ${(item.narratorBn||item.narratorEn)?`<div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'বর্ণনাকারী':'Narrator'}</dt><dd>${sanitize(l==='bn'?item.narratorBn:(item.narratorEn||item.narratorBn))}</dd></div>`:''}
                ${(item.sourceBn||item.sourceEn)?`<div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'উৎস গ্রন্থ':'Source Book'}</dt><dd>${sanitize(l==='bn'?item.sourceBn:(item.sourceEn||item.sourceBn))}</dd></div>`:''}
                ${(item.refBn||item.refEn)?`<div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'রেফারেন্স':'Reference'}</dt><dd>${sanitize(l==='bn'?item.refBn:(item.refEn||item.refBn))}</dd></div>`:''}
            </dl>
        </div>`;
    } else if (tab==='masail') {
        fields = `
        <div class="space-y-4">
            <p class="text-lg font-bold" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(l==='bn'?item.questionBn:(item.questionEn||item.questionBn))}</p>
            <p class="leading-relaxed" style="color:${d?'#d1d5db':'#374151'}">${sanitize(l==='bn'?item.answerBn:(item.answerEn||item.answerBn))}</p>
            ${(item.detailBn||item.detailEn)?`<p class="text-sm leading-relaxed p-3 rounded-xl" style="background:${d?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)'};color:${d?'#9ca3af':'#6b7280'}">${sanitize(l==='bn'?item.detailBn:(item.detailEn||item.detailBn))}</p>`:''}
            <dl class="grid sm:grid-cols-2 gap-3 text-sm pt-2 border-t" style="border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}">
                ${(item.sourceBn||item.sourceEn)?`<div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'উৎস':'Source'}</dt><dd>${sanitize(l==='bn'?item.sourceBn:(item.sourceEn||item.sourceBn))}</dd></div>`:''}
                <div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'মারজা':'Marja'}</dt><dd>${item.marja==='general'?(l==='bn'?'সাধারণ নির্দেশনা':'General guidance'):sanitize(item.marja||'')}</dd></div>
            </dl>
        </div>`;
    } else if (tab==='qa') {
        fields = `
        <div class="space-y-4">
            <p class="text-lg font-bold" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(l==='bn'?item.questionBn:(item.questionEn||item.questionBn))}</p>
            <p class="leading-relaxed" style="color:${d?'#d1d5db':'#374151'}">${sanitize(l==='bn'?item.answerBn:(item.answerEn||item.answerBn))}</p>
        </div>`;
    } else if (tab==='fatwa') {
        const marjaObj = cfg.categories.find(x=>x.key===item.marja);
        fields = `
        <div class="space-y-4">
            ${item.sample?`
            <div class="text-xs font-bold p-3 rounded-xl" style="background:rgba(220,38,38,.08);color:#dc2626;border:1px solid rgba(220,38,38,.2)">
                ${l==='bn'?'⚠️ এটি একটি নমুনা এন্ট্রি। প্রকৃত প্রকাশনার আগে অনুগ্রহ করে সংশ্লিষ্ট মারজার অফিসিয়াল ও যাচাইকৃত সূত্র থেকে প্রকৃত ফতোয়া দিয়ে প্রতিস্থাপন করুন।':'⚠️ This is a sample entry. Please replace it with the actual verified ruling from the Marja\u2019s official source before publishing.'}
            </div>`:''}
            ${marjaObj && marjaObj.deceased?`
            <div class="text-xs font-bold p-3 rounded-xl" style="background:rgba(107,114,128,.1);color:${d?'#d1d5db':'#4b5563'};border:1px solid rgba(107,114,128,.25)">
                ${l==='bn'?`⚠️ ${sanitize(marjaObj.bn)} ${marjaObj.deathDateBn||''} তারিখে ইন্তেকাল করেছেন। এটি তাঁর জীবদ্দশায় প্রদত্ত একটি ঐতিহাসিক ফতোয়া — নতুন কোনো বিষয়ে রায়ের জন্য আপনার বর্তমান অনুসরণীয় (জীবিত) মারজার সাথে যোগাযোগ করুন।`:`⚠️ ${sanitize(marjaObj.en)} passed away on ${marjaObj.deathDateEn||'an unspecified date'}. This is a historical ruling given during his lifetime — for new matters, consult your current (living) Marja.`}
            </div>`:''}
            <p class="text-lg font-bold" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(l==='bn'?item.questionBn:(item.questionEn||item.questionBn))}</p>
            <p class="leading-relaxed" style="color:${d?'#d1d5db':'#374151'}">${sanitize(l==='bn'?item.answerBn:(item.answerEn||item.answerBn))}</p>
            <dl class="grid sm:grid-cols-2 gap-3 text-sm pt-2 border-t" style="border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}">
                <div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'মারজা':'Marja'}</dt><dd>${sanitize(catLabel)}${marjaObj&&marjaObj.deceased?` (${l==='bn'?'প্রয়াত':'deceased'})`:''}</dd></div>
                ${(item.refBn||item.refEn)?`<div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'রেফারেন্স':'Reference'}</dt><dd>${sanitize(l==='bn'?item.refBn:(item.refEn||item.refBn))}</dd></div>`:''}
                ${item.date?`<div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'তারিখ':'Date'}</dt><dd>${sanitize(item.date)}</dd></div>`:''}
            </dl>
        </div>`;
    }

    const pageEnterClass = window._kcJustOpenedDetail ? ' page-enter' : '';
    window._kcJustOpenedDetail = false;

    return `
    <div class="space-y-5${pageEnterClass}">
        ${kcBreadcrumb(d,l,breadcrumbParts)}
        <div class="flex items-center justify-between flex-wrap gap-3">
            <button data-action="kcCloseDetail" data-param=""
                style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:8px 16px;
                border-radius:50px;background:${meta.color}12;color:${meta.color};border:1.5px solid ${meta.color}30;cursor:pointer">
                ← ${l==='bn'?'তালিকায় ফিরুন':'Back to list'}
            </button>
            <span style="font-size:.7rem;font-weight:800;padding:4px 12px;border-radius:50px;background:${meta.color}18;color:${meta.color}">
                ${meta.icon} ${catLabel||(l==='bn'?meta.bn:meta.en)}
            </span>
        </div>
        <article class="card-luxury border p-6" style="background:${d?'#1e2a22':'#ffffff'};border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--shadow-md)">
            ${fields}
        </article>
        <div class="flex flex-wrap gap-2.5">
            ${actionBtn('📋', l==='bn'?'কপি':'Copy', 'kcCopy', item.id)}
            ${actionBtn('📤', l==='bn'?'শেয়ার':'Share', 'kcShare', item.id)}
            <button data-action="toggleBookmark" data-param="${item.id}" data-param2="${cfg.bookmarkType}"
                aria-pressed="${bookmarked}"
                style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:9px 16px;border-radius:50px;
                background:${bookmarked?'rgba(217,119,6,.14)':(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)')};
                color:${bookmarked?'#d97706':(d?'#e5e7eb':'#374151')};border:1.5px solid ${bookmarked?'rgba(217,119,6,.3)':(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')};cursor:pointer">
                ${bookmarked?'⭐':'☆'} ${l==='bn'?'বুকমার্ক':'Bookmark'}
            </button>
            <button data-action="kcToggleFavorite" data-param="${item.id}" data-param2="${cfg.bookmarkType}"
                aria-pressed="${favorited}"
                style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:9px 16px;border-radius:50px;
                background:${favorited?'rgba(220,38,38,.1)':(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)')};
                color:${favorited?'#dc2626':(d?'#e5e7eb':'#374151')};border:1.5px solid ${favorited?'rgba(220,38,38,.25)':(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')};cursor:pointer">
                ${favorited?'❤️':'🤍'} ${l==='bn'?'পছন্দ':'Favorite'}
            </button>
        </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------
function renderKnowledgeCenterPage() {
    const d=state.darkMode, l=state.language;

    // 2026-08-11 (Phase 3): categories.json/metadata.json now load async
    // (see knowledge-center-data.js), so kcHadiths etc. are never actually
    // `undefined` anymore — they start as empty arrays and fill in place.
    // kcIndexLoadState is what distinguishes "still loading" from a genuine
    // load failure now. Falls back to the old undefined-check as a defensive
    // measure in case knowledge-center-data.js failed to load/execute at all.
    const kcIdxState = (typeof kcIndexLoadState !== 'undefined')
        ? kcIndexLoadState
        : (typeof kcHadiths==='undefined' ? 'error' : 'loaded');

    // Guard: categories.json / metadata.json failed to load (after retries)
    if (kcIdxState === 'error') return `
    <div class="space-y-6 page-enter">
        <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem)">📚 ${t('knowledgeCenter')}</h1>
        ${kcErrorState(d,l)}
    </div>`;

    // Guard: categories.json / metadata.json still in flight — show the
    // same lightweight skeleton kcLoading already uses elsewhere instead of
    // a flash of "no categories"/empty tabs while the arrays are still
    // empty. Tabs themselves (KC_TABS is a static list, not data-dependent)
    // stay clickable and harmless — clicking one just re-renders this same
    // skeleton until the index arrives.
    if (kcIdxState === 'loading') {
        const tab = state.kcTab || 'hadith';
        return `
        <div class="space-y-6 page-enter">
            <div class="reveal">
                <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#0369a1);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    📚 ${t('knowledgeCenter')}
                </h1>
                <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">
                    ${l==='bn'?'হাদিস, মাসাইল, প্রশ্নোত্তর ও ফতোয়া — এক জায়গায়':'Hadith, Masail, Q&A and Fatwa — all in one place'}
                </p>
            </div>
            <div class="flex flex-wrap gap-2 reveal" role="tablist" aria-label="${l==='bn'?'জ্ঞান কেন্দ্র বিভাগ':'Knowledge Center sections'}">
                ${KC_TABS.map(tb=>`
                <button data-action="setKcTab" data-param="${tb.key}" role="tab" aria-selected="${tab===tb.key}"
                    style="display:flex;align-items:center;gap:6px;padding:10px 18px;border-radius:50px;font-size:13px;font-weight:700;cursor:pointer;
                    background:${tab===tb.key?`linear-gradient(135deg,${tb.color},${tb.color}bb)`:(d?'#1e2a22':'#ffffff')};
                    color:${tab===tb.key?'#fff':(d?'#d1d5db':'#374151')};
                    border:1.5px solid ${tab===tb.key?'transparent':(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')}">
                    ${tb.icon} ${l==='bn'?tb.bn:tb.en}
                </button>`).join('')}
            </div>
            <div class="reveal">${kcSkeletonCategoryGrid(d,6)}</div>
            <div class="pt-2 reveal">${kcSkeletonGrid(d,6)}</div>
        </div>`;
    }

    if (state.kcDetail) { if (typeof kcUpdateSeoSchema==='function') kcUpdateSeoSchema(null); return renderKcDetailView(); }

    const tab = state.kcTab || 'hadith';
    const meta = kcTabMeta(tab);
    const cfg = kcTabConfig(tab);
    if (typeof kcUpdateSeoSchema==='function') kcUpdateSeoSchema(tab);

    // Safety net: hydrate this tab's full answer/detail/reference fields if not
    // loaded yet (covers deep-links that bypass changePage/setKcTab). Guarded by
    // hasFullData so it fires at most once per section — no re-render loop.
    if (!state.kcLoading && typeof loadKcSection==='function' && cfg.items && cfg.items.length && !cfg.items.every(it=>it.hasFullData)) {
        loadKcSection(tab).then(()=>{ if (state.currentPage==='knowledgeCenter' && (state.kcTab||'hadith')===tab) render(); });
    }

    const tabBar = `
    <div class="flex flex-wrap gap-2 reveal" role="tablist" aria-label="${l==='bn'?'জ্ঞান কেন্দ্র বিভাগ':'Knowledge Center sections'}">
        ${KC_TABS.map(tb=>`
        <button data-action="setKcTab" data-param="${tb.key}" role="tab" aria-selected="${tab===tb.key}"
            style="display:flex;align-items:center;gap:6px;padding:10px 18px;border-radius:50px;font-size:13px;font-weight:700;cursor:pointer;
            background:${tab===tb.key?`linear-gradient(135deg,${tb.color},${tb.color}bb)`:(d?'#1e2a22':'#ffffff')};
            color:${tab===tb.key?'#fff':(d?'#d1d5db':'#374151')};
            border:1.5px solid ${tab===tb.key?'transparent':(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')}">
            ${tb.icon} ${l==='bn'?tb.bn:tb.en}
        </button>`).join('')}
    </div>`;

    const breadcrumbParts = [
        {label:l==='bn'?'হোম':'Home', action:'changePage', param:'home'},
        {label:l==='bn'?'জ্ঞান কেন্দ্র':'Knowledge Center', action:'setKcTab', param:tab},
    ];
    if (state.kcCategory) {
        const catField = tab==='fatwa' ? 'marja' : 'category';
        const c = cfg.categories.find(x=>x.key===state.kcCategory);
        breadcrumbParts.push({label: l==='bn'?tb_bn(tab):tb_en(tab), action:'setKcCategory', param:''});
        breadcrumbParts.push({label: c ? (l==='bn'?c.bn:c.en) : state.kcCategory});
    } else {
        breadcrumbParts.push({label: l==='bn'?tb_bn(tab):tb_en(tab)});
    }
    function tb_bn(t){return kcTabMeta(t).bn;} function tb_en(t){return kcTabMeta(t).en;}

    const placeholder = l==='bn'
        ? `${l==='bn'?meta.bn:meta.en} খুঁজুন...`
        : `Search ${meta.en}...`;

    // Extra filter row for Fatwa (Marja) / Q&A (category) when browsing without a category chosen from the grid
    const extraFilter = (() => {
        if (tab==='fatwa') return `
        <select aria-label="${l==='bn'?'মারজা ফিল্টার':'Filter by Marja'}"
            onchange="state.kcCategory=this.value;state.kcPage=1;const r=document.getElementById('kc-results');if(r)r.innerHTML=renderKcResultsInner();"
            style="padding:12px 16px;border-radius:16px;font-size:.85rem;background:${d?'#1e2a22':'#ffffff'};
            border:2px solid ${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.18)'};color:${d?'#f9fafb':'#111827'};outline:none">
            <option value="">${l==='bn'?'সব মারজা':'All Maraji'}</option>
            ${cfg.categories.map(c=>`<option value="${c.key}" ${state.kcCategory===c.key?'selected':''}>${sanitize((l==='bn'?c.bn:c.en) + (c.deceased?(l==='bn'?' (প্রয়াত)':' (deceased)'):''))}</option>`).join('')}
        </select>`;
        if (tab==='hadith' && state.kcCategory && cfg.items) {
            const inCat = cfg.items.filter(x => x.category === state.kcCategory);
            const sources = [...new Set(inCat.map(x => l==='bn' ? (x.sourceBn||'') : (x.sourceEn||x.sourceBn||'')).filter(Boolean))];
            if (sources.length < 2) return '';
            return `
            <select aria-label="${l==='bn'?'উৎস গ্রন্থ ফিল্টার':'Filter by Source Book'}"
                onchange="state.kcSourceFilter=this.value;state.kcPage=1;const r=document.getElementById('kc-results');if(r)r.innerHTML=renderKcResultsInner();"
                style="padding:12px 16px;border-radius:16px;font-size:.85rem;background:${d?'#1e2a22':'#ffffff'};
                border:2px solid ${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.18)'};color:${d?'#f9fafb':'#111827'};outline:none">
                <option value="">${l==='bn'?'সব উৎস গ্রন্থ':'All Source Books'}</option>
                ${sources.map(s=>`<option value="${sanitize(s)}" ${state.kcSourceFilter===s?'selected':''}>${sanitize(s)}</option>`).join('')}
            </select>`;
        }
        return '';
    })();

    const pageEnterClass = window._kcJustEnteredPage ? ' page-enter' : '';
    window._kcJustEnteredPage = false;

    return `
    <div class="space-y-6${pageEnterClass}">
        <div class="reveal">
            <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#0369a1);
                -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                📚 ${t('knowledgeCenter')}
            </h1>
            <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">
                ${l==='bn'?'হাদিস, মাসাইল, প্রশ্নোত্তর ও ফতোয়া — এক জায়গায়':'Hadith, Masail, Q&A and Fatwa — all in one place'}
            </p>
        </div>

        ${kcBreadcrumb(d,l,breadcrumbParts)}
        ${tabBar}

        ${state.kcLoading ? `
            <div class="reveal">${kcSkeletonCategoryGrid(d,6)}</div>
            <div class="pt-2 reveal">${kcSkeletonGrid(d,6)}</div>
        ` : !state.kcCategory && tab!=='fatwa' ? `
            <div class="reveal">
                <h2 class="font-bold text-base mb-3" style="color:${d?'#e5e7eb':'#111827'}">${l==='bn'?'বিভাগ বেছে নিন':'Choose a category'}</h2>
                ${kcCategoryGrid(tab,d,l)}
            </div>
            <div class="pt-2 reveal">
                <h2 class="font-bold text-base mb-3" style="color:${d?'#e5e7eb':'#111827'}">${l==='bn'?'অথবা সরাসরি খুঁজুন':'Or search directly'}</h2>
                <div class="space-y-3">
                    ${kcSearchBar(d,l,placeholder)}
                    ${kcFilterBar(d,l)}
                </div>
                <div id="kc-results" class="pt-4">${renderKcResultsInner()}</div>
            </div>
        ` : `
            <div class="flex items-center justify-between flex-wrap gap-3 reveal">
                <button data-action="setKcCategory" data-param=""
                    style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:8px 16px;border-radius:50px;
                    background:${meta.color}12;color:${meta.color};border:1.5px solid ${meta.color}30;cursor:pointer">
                    ← ${l==='bn'?'বিভাগে ফিরুন':'Back to categories'}
                </button>
                ${kcFilterBar(d,l)}
            </div>
            <div class="flex flex-col sm:flex-row gap-3 reveal">
                <div class="flex-1">${kcSearchBar(d,l,placeholder)}</div>
                ${extraFilter}
            </div>
            <div id="kc-results">${renderKcResultsInner()}</div>
        `}
    </div>`;
}


// ============================================================================
// KNOWLEDGE CENTER — PREMIUM REDESIGN LAYER ("kcx")     (2026-09-19, Phase 2)
// ----------------------------------------------------------------------------
// Everything above this line is UNCHANGED. This block only ADDS:
//   • a landing view (hero + search, topic cards, Featured, Latest, sections)
//   • a topic / search "explore" view (topic chips, result cards)
//   • a redesigned article/detail reading page (+ reading mode, related items)
//   • a thin wrapper around renderKnowledgeCenterPage() that routes between
//     the new views and the ORIGINAL renderer, which is kept byte-for-byte and
//     still powers the four existing tabs (Hadith / Masail / Q&A / Fatwa),
//     their category grids, pagination, filters, bookmarks, favorites, and
//     accordions. If anything in this layer throws, the wrapper falls back to
//     the original renderer, so the page can never end up blank.
//
// It reuses: state, t(), sanitize(), kcTabConfig/kcTabMeta/kcFindItem,
// kcItemTitle/kcItemBody, kcPaginate + kcPagination, kcSkeleton*,
// SearchEngine (global search index), the shared Blog category map in
// blog.js (blogCanonicalCategory / blogCategoryLabel), and the existing
// data-action handlers (kcOpenDetail, kcCopy, kcShare, toggleBookmark,
// kcToggleFavorite, readPost, changePage).
// New interactions use data-kcx-act attributes handled by delegated listeners
// below — script-2-ui.js's dispatcher is not touched.
// No new data is created: every title/excerpt/date/reading-time/source shown
// comes from the existing JSON. Fields that don't exist are simply not shown.
//
// NAVIGATION (Phase 2): all Knowledge Center navigation state lives in ONE
// object, `kcxNav` (see "KCX NAVIGATION CONTEXT" below): the current list
// context (view/topic/kind/query/page), a small history stack that "Back"
// pops (list frames AND detail frames, each with its scroll position), and a
// one-shot "ticket" for returning from a Blog post opened here. It no longer
// depends on window._kcJustEnteredPage, on previousPage==='readPost', or on
// the shared state.kcPage (the legacy 4-tab UI still uses those, untouched).
//
// PHASE 3B (on top of the frozen Phase 3A baseline): Hadith title/attribution hierarchy (#8),
// scope-labelled searches (#9), English-mode Blog excerpts + lang attributes + <html lang> (#11),
// and "Blog" terminology for Blog-derived content (#12). Navigation/search-hydration code
// (kcxNav, pushFrame/back/landing, runPost, route, loadAllKcSections) is untouched.
// ============================================================================

// ---------------------------------------------------------------------------
// CENTRAL CONFIG — edit here to change what the redesigned page shows.
// ---------------------------------------------------------------------------

// Existing hadith categories (data/knowledge/categories.json → kcHadithCategories)
// that are attributed to the Ahl al-Bayt figures. 'prophet' and 'topical' are
// deliberately NOT listed: the dataset files those elsewhere and this redesign
// does not reclassify anything. Add 'prophet' to this list if you ever want
// those hadith to also appear under the Ahl al-Bayt topic.
const KCX_AHLULBAYT_HADITH_CATEGORIES = ['fatima', 'ali', 'hasan', 'husayn', 'sajjad', 'baqir', 'sadiq', 'others'];

// Topics shown as category cards + filter chips (order = display order).
// `sources` says which EXISTING data feeds each topic:
//   {kind:'kc',   tab, match?(item)}  → items of a Knowledge Center tab
//   {kind:'blog', match?(post)}       → existing Blog posts (opened via readPost)
// Blog categories are matched through the shared map in blog.js
// (blogCanonicalCategory), so Bengali or English category values both work.
// A topic with `comingSoon:true` (or no sources) has no data yet: it renders as
// a non-interactive "Coming Soon" card and is left out of the filter chips.
const KCX_TOPICS = [
    { key: 'quran', icon: '📖', bn: 'কুরআন', en: "Qur'an",
      descBn: 'কুরআন-সংক্রান্ত প্রশ্নোত্তর ও ব্লগ পোস্ট', descEn: "Questions and Blog posts on the Qur'an",
      sources: [ { kind: 'kc', tab: 'qa', match: i => i.category === 'quran' }, { kind: 'blog', match: p => blogCanonicalCategory(p.category) === 'কুরআন' } ] },
    { key: 'hadith', icon: '📜', bn: 'হাদিস', en: 'Hadith',
      descBn: 'বর্ণনাকারী ও সূত্রসহ হাদিস সংকলন', descEn: 'Traditions with narrator and source',
      sources: [ { kind: 'kc', tab: 'hadith' } ] },
    { key: 'ahlulbayt', icon: '🌟', bn: 'আহলে বাইত', en: 'Ahl al-Bayt',
      descBn: 'আহলে বাইত (আ.) থেকে বর্ণিত বাণী ও তাঁদের নিয়ে ব্লগ পোস্ট', descEn: 'Sayings of the Ahl al-Bayt (a.s.) and Blog posts about them',
      sources: [ { kind: 'kc', tab: 'hadith', match: i => KCX_AHLULBAYT_HADITH_CATEGORIES.indexOf(i.category) > -1 }, { kind: 'blog', match: p => blogCanonicalCategory(p.category) === 'আহলে বাইত' } ] },
    { key: 'aqidah', icon: '☝️', bn: 'আকিদা', en: 'Aqidah',
      descBn: 'বিশ্বাস ও আকিদা বিষয়ক প্রশ্নোত্তর', descEn: 'Questions and answers on core beliefs',
      sources: [ { kind: 'kc', tab: 'qa', match: i => i.category === 'aqidah' } ] },
    { key: 'ahkam', icon: '⚖️', bn: 'আহকাম', en: 'Ahkam',
      descBn: 'মাসাইল, ফতোয়া ও ফিকহি প্রশ্নোত্তর', descEn: 'Masail, fatwa and fiqh questions',
      sources: [ { kind: 'kc', tab: 'masail' }, { kind: 'kc', tab: 'fatwa' }, { kind: 'kc', tab: 'qa', match: i => i.category === 'fiqh' } ] },
    { key: 'akhlaq', icon: '🌿', bn: 'আখলাক', en: 'Akhlaq',
      descBn: 'নৈতিকতা ও চরিত্র গঠন বিষয়ক ব্লগ পোস্ট', descEn: 'Blog posts on ethics and character',
      sources: [ { kind: 'blog', match: p => blogCanonicalCategory(p.category) === 'আখলাক' } ] },
    { key: 'seerah', icon: '🧭', bn: 'সীরাত', en: 'Seerah', comingSoon: true,
      descBn: 'রাসূলুল্লাহ (সা.)-এর জীবনী', descEn: 'The life of the Prophet (s.a.w.)', sources: [] },
    { key: 'history', icon: '🏛️', bn: 'ইসলামী ইতিহাস', en: 'Islamic History', chipBn: 'ইতিহাস', chipEn: 'History',
      descBn: 'ইসলামের ইতিহাস বিষয়ক ব্লগ পোস্ট', descEn: 'Blog posts on Islamic history',
      sources: [ { kind: 'blog', match: p => blogCanonicalCategory(p.category) === 'ইতিহাস' } ] },
    { key: 'karbala', icon: '🌹', bn: 'কারবালা', en: 'Karbala', comingSoon: true,
      descBn: 'কারবালার ঘটনা ও শিক্ষা', descEn: 'The events and lessons of Karbala', sources: [] },
    { key: 'comparative', icon: '🔎', bn: 'তুলনামূলক অধ্যয়ন', en: 'Comparative Studies', comingSoon: true,
      descBn: 'মতাদর্শ ও চিন্তাধারার তুলনামূলক পাঠ', descEn: 'Comparative study of schools of thought', sources: [] },
];

// "Featured Knowledge" — a small hand-picked list of EXISTING items, in display
// order. Nothing in the data files is flagged or modified. To change the
// selection, edit this list:
//   {kind:'kc',   tab:'hadith'|'masail'|'qa'|'fatwa', id:'<item id>', hint:'<English title text>'}
//   {kind:'blog', id:<blog post id>,                                   hint:'<English title text>'}
// `hint` is a distinctive fragment of the item's ENGLISH title / hadith text /
// question. It makes the list self-checking and resilient:
//   • id found and hint matches      → used as-is.
//   • id missing, or id now points at different content, and the hint matches
//     exactly ONE item             → that item is used (the data's ids moved).
//   • nothing matches                → the entry is omitted (visitors see no error).
// In development/debug mode (see kcxDebug()) every deviation is logged once
// with a clear warning; call kcxValidateFeatured() in the console for a report.
const KCX_FEATURED = [
    { kind: 'blog', id: 63,           hint: 'Fatima al-Zahra' },                        // Ahl al-Bayt article
    { kind: 'blog', id: 48,           hint: 'Ayat al-Wilayah & Ayat al-Tabligh' },      // Qur'an article
    { kind: 'kc', tab: 'hadith', id: 'h002', hint: 'Book of Allah and my Ahlul Bayt' },  // Hadith al-Thaqalayn
    { kind: 'kc', tab: 'hadith', id: 'h001', hint: 'city of knowledge' },               // Hadith Madinat al-Ilm
    { kind: 'kc', tab: 'qa',     id: 'q073', hint: 'purity of the Ahl al-Bayt' },       // Q&A: verse on the Ahl al-Bayt's purity
    { kind: 'kc', tab: 'qa',     id: 'q045', hint: 'Why is Adl (Divine Justice) important' }, // Q&A: Divine Justice in aqidah
];

// How many entries the "Latest Knowledge" section shows (newest Blog posts).
const KCX_LATEST_COUNT = 6;

(function () {
    'use strict';

    // -----------------------------------------------------------------------
    // tiny helpers
    // -----------------------------------------------------------------------
    const S = (v) => sanitize(v == null ? '' : String(v));
    const TX = (bn, en) => (state.language === 'bn' ? bn : en);
    const KCX_STAR = 'M48.0 18.0 L53.9 33.7 L69.2 26.8 L62.3 42.1 L78.0 48.0 L62.3 53.9 L69.2 69.2 L53.9 62.3 L48.0 78.0 L42.1 62.3 L26.8 69.2 L33.7 53.9 L18.0 48.0 L33.7 42.1 L26.8 26.8 L42.1 33.7Z';
    const attrEsc = (v) => String(v).replace(/["\\]/g, '\\$&');

    // Development/debug switch (there was no existing debug mechanism to reuse).
    // ON for: localhost/127.0.0.1, ?kcxdebug=1, localStorage kcx_debug=1, or
    // window.KCX_DEBUG=true. localStorage kcx_debug=0 forces it OFF (used to
    // check the quiet production behaviour). Only ever gates console output.
    function kcxDebug() {
        try {
            const ls = localStorage.getItem('kcx_debug');
            if (ls === '1') return true;
            if (ls === '0') return false;
            if (window.KCX_DEBUG === true) return true;
            if (/[?&]kcxdebug=1\b/.test(location.search)) return true;
            return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
        } catch (e) { return false; }
    }
    window.kcxDebug = kcxDebug;
    const warned = new Set();
    function warnOnce(key, msg) { if (!kcxDebug() || warned.has(key)) return; warned.add(key); console.warn('[KCX] ' + msg); }

    // Reading-mode preferences (not navigation state).
    const prefs = { reading: false, size: 1 };
    const clampSize = (n) => Math.min(1.5, Math.max(0.9, Math.round(n * 10) / 10));
    try {
        const saved = JSON.parse(localStorage.getItem('kcx_reading') || 'null');
        if (saved) { prefs.reading = !!saved.reading; prefs.size = clampSize(+saved.size || 1); }
    } catch (e) { /* storage unavailable — defaults are fine */ }
    function persistReading() { try { localStorage.setItem('kcx_reading', JSON.stringify({ reading: prefs.reading, size: prefs.size })); } catch (e) { /* ignore */ } }

    // ---- Phase 3C #16: persistent search-status live region ------------------------------
    // The visible count line / empty state live INSIDE #kcx-body, which refreshBody() REPLACES on
    // every refresh; a live region that is re-created each time is announced unreliably (often
    // not at all). Announcements therefore go through ONE visually-hidden status node in the hero
    // (#kcx-status, outside #kcx-body) that an in-place refresh never replaces, and it is written
    // to only once the user PAUSES, so typing is not narrated keystroke by keystroke. The visible
    // count line / empty state are plain text (no role, no aria-live), so nothing is said twice.
    // statusMsg is just the wording bodyHTML() rendered last (output, not search state).
    const STATUS_DELAY = 500;
    let statusMsg = '';    // status wording of the view bodyHTML() last built ('' = nothing to report)
    let statusNote = '';   // one-shot lead-in for the next announcement (e.g. "Search cleared")
    let statusTimer = null;
    function flushStatus() {
        const node = document.getElementById('kcx-status');
        const msg = statusNote ? (statusMsg ? statusNote + TX('। ', '. ') + statusMsg : statusNote) : statusMsg;
        statusNote = '';
        if (node && node.textContent !== msg) node.textContent = msg; // unchanged text is not re-announced
    }
    function scheduleStatus() { clearTimeout(statusTimer); statusTimer = setTimeout(flushStatus, STATUS_DELAY); }
    function noteCleared() { statusNote = TX('সার্চ মুছে ফেলা হয়েছে', 'Search cleared'); }

    // =======================================================================
    // KCX NAVIGATION CONTEXT — the single source of truth for KC navigation
    // =======================================================================
    //   view  : 'home' (landing / topic / search results) | 'browse' (legacy 4-tab UI)
    //   topic / kind / q / page : the explore context (page is OURS — the legacy
    //           UI keeps using state.kcPage for its own pagination)
    //   saved : '' | 'bookmarked' | 'favorite' — set when the explore view is showing
    //           the cross-tab Saved list opened from the KC landing (Phase 3A #6).
    //           Mutually exclusive with topic/q — entering it clears both, and
    //           picking a topic or typing a search clears it back to ''.
    //   stack : "Back" history. A frame is recorded when a detail page is opened:
    //           {t:'list',   view,topic,kind,q,page,saved,legacy, y, opener}   ← opened from a list/landing
    //           {t:'detail', detail:{type,id}, y, opener}                ← opened from Related
    //           `y` = scroll position, `opener` = the button that was clicked
    //           (so focus can be returned to it).
    //   ticket: set when a Blog post is opened from here; lets the reader's own
    //           Back button return to exactly this context.
    //   post  : one-shot work to do after the next render (restore scroll, move focus).
    const nav = window.kcxNav = {
        view: 'home', topic: '', kind: '', q: '', page: 1, saved: '',
        stack: [], ticket: null,
        pendingReset: false, pendingRestore: null, justEntered: false,
        post: null, focusTitle: false, lastClick: { inMain: false, at: 0 },
    };
    function resetCtx() { nav.view = 'home'; nav.topic = ''; nav.kind = ''; nav.q = ''; nav.saved = ''; nav.page = 1; }
    function snapshot() {
        const s = { view: nav.view, topic: nav.topic, kind: nav.kind, q: nav.q, page: nav.page, saved: nav.saved, legacy: null };
        if (nav.view === 'browse') {
            s.legacy = { kcTab: state.kcTab, kcCategory: state.kcCategory, kcSearch: state.kcSearch, kcPage: state.kcPage, kcFilter: state.kcFilter, kcSourceFilter: state.kcSourceFilter };
        }
        return s;
    }
    function applySnapshot(s) {
        nav.view = s.view; nav.topic = s.topic; nav.kind = s.kind; nav.q = s.q; nav.page = s.page; nav.saved = s.saved || '';
        if (s.legacy) Object.assign(state, s.legacy);
    }
    const openerOf = (el) => el ? { action: el.getAttribute('data-action'), param: el.getAttribute('data-param'), param2: el.getAttribute('data-param2') } : null;
    function openerSelector(o) {
        if (!o || !o.action) return '';
        let sel = '[data-action="' + attrEsc(o.action) + '"]';
        if (o.param != null) sel += '[data-param="' + attrEsc(o.param) + '"]';
        if (o.param2 != null) sel += '[data-param2="' + attrEsc(o.param2) + '"]';
        return sel;
    }

    // Record where a detail page is being opened FROM, so Back can return there.
    function pushFrame(openerEl) {
        const y = window.scrollY || 0, op = openerOf(openerEl);
        if (state.kcDetail) nav.stack.push({ t: 'detail', detail: { type: state.kcDetail.type, id: state.kcDetail.id }, y: y, opener: op });
        else nav.stack.push(Object.assign({ t: 'list', y: y, opener: op }, snapshot()));
        if (nav.stack.length > 40) nav.stack.shift();
    }
    // "Back": pop one frame and restore it exactly (context, page, scroll, focus).
    function back() {
        const f = nav.stack.pop();
        if (!f) { state.kcDetail = null; nav.post = { focus: 'heading' }; render(); return; }
        if (f.t === 'detail') state.kcDetail = { type: f.detail.type, id: f.detail.id };
        else { applySnapshot(f); state.kcDetail = null; }
        nav.post = { scrollY: f.y, focusSel: openerSelector(f.opener), focus: 'heading' };
        render();
    }
    // Breadcrumb "Knowledge Center" / legacy "Back to Knowledge Center": always the landing page.
    function landing() {
        resetCtx(); nav.stack = []; nav.ticket = null; state.kcDetail = null;
        nav.post = { scrollY: 0, focus: 'h1' };
        render();
    }
    function goBrowse(tab) {
        nav.view = 'browse'; nav.stack = [];
        // same resets the existing 'setKcTab' action performs
        state.kcTab = tab; state.kcCategory = ''; state.kcSearch = ''; state.kcPage = 1; state.kcDetail = null; state.kcSourceFilter = '';
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (typeof kcLoadTab === 'function') kcLoadTab(tab); else render();
    }
    // Human label for the Back button: says WHERE it goes.
    function backLabel() {
        const f = nav.stack[nav.stack.length - 1];
        const dflt = TX('জ্ঞান কেন্দ্রে ফিরুন', 'Back to Knowledge Center');
        if (!f) return dflt;
        if (f.t === 'detail') return TX('আগের আইটেমে ফিরুন', 'Back to previous item');
        if (f.view === 'browse') { const m = kcTabMeta(f.legacy && f.legacy.kcTab); return TX(m.bn + ' তালিকায় ফিরুন', 'Back to ' + m.en + ' list'); }
        if (f.saved === 'bookmarked') return TX('বুকমার্কড তালিকায় ফিরুন', 'Back to Bookmarked');
        if (f.saved === 'favorite') return TX('পছন্দের তালিকায় ফিরুন', 'Back to Favorites');
        if ((f.q || '').trim()) return TX('সার্চ ফলাফলে ফিরুন', 'Back to search results');
        const tp = topicByKey(f.topic);
        if (tp) return TX((tp.chipBn || tp.bn) + '-এ ফিরুন', 'Back to ' + (tp.chipEn || tp.en));
        return dflt;
    }

    // ---- entering / leaving the Knowledge Center page ---------------------
    // A thin observer around the app's changePage() (installed once, calls the
    // original untouched). It tells us "the Knowledge Center page is being
    // entered from X", which nothing else exposes cleanly:
    //   • from the Blog reader, via the reader's own in-page Back button, after
    //     a post opened from here (ticket)  → restore that exact context
    //   • from anywhere else (menu, bottom nav, Blog, home, …)  → fresh landing
    function onPageChange(from, to) {
        if (to === 'knowledgeCenter') {
            const backFromPost = from === 'readPost' && !!nav.ticket && nav.lastClick.inMain && (Date.now() - nav.lastClick.at) < 1500;
            nav.pendingRestore = backFromPost ? nav.ticket : null;
            nav.pendingReset = !backFromPost;
            nav.justEntered = true;
        }
        nav.ticket = null; // any navigation consumes the "opened a post from here" ticket
    }
    function installNavHook() {
        if (window.__kcxNavHook || typeof window.changePage !== 'function') return;
        window.__kcxNavHook = true;
        const orig = window.changePage;
        window.changePage = function (page) {
            try { onPageChange(state.currentPage, page); } catch (e) { console.error('[KCX] navigation hook failed', e); }
            return orig.apply(this, arguments);
        };
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installNavHook); else installNavHook();

    function applyPendingEntry() {
        if (nav.pendingRestore) {
            const t = nav.pendingRestore; nav.pendingRestore = null; nav.pendingReset = false;
            applySnapshot(t); nav.stack = [];
            // keepUntil: changePage() renders this page more than once (kcLoadTab's own render,
            // then its 130ms transition render followed by scrollTo(0,0)), so the restore is
            // re-applied after each of those renders for a short window instead of once.
            nav.post = { scrollY: t.y, focusSel: openerSelector(t.opener), focus: 'heading', keepUntil: Date.now() + 700 };
        } else if (nav.pendingReset) {
            nav.pendingReset = false; resetCtx(); nav.stack = [];
        }
    }

    // ---- one-shot post-render work: scroll + focus ------------------------
    function focusEl(el) { if (!el) return false; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } return document.activeElement === el; }
    function headingEl() {
        return document.querySelector('.kcx-article-title') || document.getElementById('kcx-h-explore') || document.getElementById('kcx-h-topics') || document.getElementById('kcx-h1');
    }
    function runPost() {
        const p = nav.post;
        nav.post = (p && p.keepUntil && Date.now() < p.keepUntil) ? p : null;
        if (p) {
            if (typeof p.scrollY === 'number') window.scrollTo({ top: p.scrollY, behavior: 'instant' });
            let target = null;
            if (p.focusSel) target = document.querySelector('#main-content ' + p.focusSel) || document.querySelector(p.focusSel);
            if (!target && p.focus === 'h1') target = document.getElementById('kcx-h1');
            if (!target && p.focus === 'heading') target = headingEl();
            focusEl(target);
        }
        // A detail page was just opened: put focus on its title once. (Survives the
        // second, hydrated render that follows; cleared by any unrelated click.)
        if (nav.focusTitle && state.kcDetail && (!document.activeElement || document.activeElement === document.body)) focusEl(document.querySelector('.kcx-article-title'));
    }

    // -----------------------------------------------------------------------
    // data access (existing arrays only)
    // -----------------------------------------------------------------------
    function allBlog() { return [].concat(state.customPosts || [], (typeof blogPosts !== 'undefined' ? blogPosts : [])); }
    function blogState() { return (typeof blogPostsLoadState !== 'undefined') ? blogPostsLoadState : 'loaded'; }
    function indexState() { return (typeof kcIndexLoadState !== 'undefined') ? kcIndexLoadState : 'loaded'; }
    function newestBlog() { return allBlog().slice().sort((a, b) => new Date(b.date) - new Date(a.date)); }
    // Full KC data (answers etc.) is what search must run against. See
    // loadAllKcSections() in knowledge-center-data.js.
    const fullDataReady = () => typeof window.loadAllKcSections !== 'function' || window.kcFullDataReady === true;

    function topicByKey(key) { return KCX_TOPICS.find(x => x.key === key) || null; }
    function topicEntries(topic) {
        const out = [];
        (topic.sources || []).forEach(src => {
            if (src.kind === 'kc') {
                const cfg = kcTabConfig(src.tab);
                (cfg.items || []).forEach(it => { if (!src.match || src.match(it)) out.push({ kind: 'kc', tab: src.tab, item: it }); });
            } else if (src.kind === 'blog') {
                newestBlog().forEach(p => { if (!src.match || src.match(p)) out.push({ kind: 'blog', post: p }); });
            }
        });
        return out;
    }
    const entryKey = (e) => e.kind === 'blog' ? 'blog|' + e.post.id : 'kc|' + e.tab + '|' + e.item.id;

    // Search: reuses the site's indexed SearchEngine (same one global search uses).
    // Knowledge Center search = Knowledge Center content only (Phase 3B #9): the SAME SearchEngine
    // and index as Global Search, asked for its 'kc' pool alone. Blog posts, duas, imams … are
    // covered by Global Search, which the UI points to (scope notes below). No second index.
    //
    // Correction 1 (Phase 3B, post-freeze): some KC topics — History, Akhlaq, and any topic
    // whose `sources` include a `kind:'blog'` matcher (Qur'an, Ahl al-Bayt) — are entirely or
    // partly BLOG-fed (topicEntries() already reads their posts straight from Blog data). Before
    // this fix, KC search never returned those posts (scope was 'kc' only), so searching inside
    // e.g. the History topic always came back empty. This does NOT turn KC search into a
    // whole-site search: it only asks the SAME SearchEngine for its already-existing 'blog' pool
    // (no new index, nothing duplicated) and then keeps a blog hit ONLY if it is a post some KC
    // topic actually surfaces — the exact same `sources` matchers topicEntries() uses. A Blog
    // post that no KC topic surfaces is filtered back out and still won't appear in KC search.
    function isKcSurfacedBlogPost(post) {
        return KCX_TOPICS.some(tp => (tp.sources || []).some(src => src.kind === 'blog' && (!src.match || src.match(post))));
    }
    function searchEntries(q) {
        let res = [];
        try { res = (window.SearchEngine ? window.SearchEngine.searchAll(q, ['kc', 'blog']) : []); } catch (e) { res = []; }
        const blog = allBlog();
        const out = [];
        res.forEach(r => {
            if (r.action === 'kcOpenDetail') { const it = kcFindItem(r.param, r.param2); if (it) out.push({ kind: 'kc', tab: r.param, item: it }); }
            else if (r.action === 'readPost') {
                const p = blog.find(x => String(x.id) === String(r.param));
                if (p && isKcSurfacedBlogPost(p)) out.push({ kind: 'blog', post: p });
            }
        });
        return out;
    }

    // Cross-tab Saved list (Phase 3A #6) — reuses the EXISTING save systems as-is:
    // toggleBookmark()/isBookmarked() (site-wide) and toggleKcFavorite()/isKcFavorite()
    // (KC-only). No new storage model; this only reads across all 4 KC tabs at once,
    // which neither existing system's own UI (legacy per-tab filter chip, global
    // Bookmarks page) currently offers from the KC landing.
    const KC_SAVED_TABS = ['hadith', 'masail', 'qa', 'fatwa'];
    function savedEntries(kind) {
        const out = [];
        KC_SAVED_TABS.forEach(tab => {
            const cfg = kcTabConfig(tab);
            (cfg.items || []).forEach(it => {
                const isSaved = kind === 'bookmarked'
                    ? (typeof isBookmarked === 'function' && isBookmarked(it.id, cfg.bookmarkType))
                    : isKcFavorite(it.id, cfg.bookmarkType);
                if (isSaved) out.push({ kind: 'kc', tab: tab, item: it });
            });
        });
        return out;
    }
    function savedCounts() {
        let bookmarked = 0, favorite = 0;
        KC_SAVED_TABS.forEach(tab => {
            const cfg = kcTabConfig(tab);
            (cfg.items || []).forEach(it => {
                if (typeof isBookmarked === 'function' && isBookmarked(it.id, cfg.bookmarkType)) bookmarked++;
                if (isKcFavorite(it.id, cfg.bookmarkType)) favorite++;
            });
        });
        return { bookmarked: bookmarked, favorite: favorite };
    }

    function exploreEntries() {
        if (nav.saved) return savedEntries(nav.saved);
        const q = nav.q.trim();
        const topic = topicByKey(nav.topic);
        if (q) {
            let list = searchEntries(q);
            if (topic) { const allowed = new Set(topicEntries(topic).map(entryKey)); list = list.filter(e => allowed.has(entryKey(e))); }
            return list;
        }
        return topic ? topicEntries(topic) : [];
    }
    const exploring = () => !!(nav.q.trim() || nav.topic || nav.saved);

    // Lazy per-tab hydration (Featured cards need their answer excerpts; the
    // detail page needs its tab's full fields). `tried` guarantees each tab is
    // requested at most once from here. (loadKcSection also re-syncs the search
    // index for the tab — see knowledge-center-data.js.)
    const tried = {};
    function hydrate(tabs) {
        (tabs || ['hadith', 'masail', 'qa', 'fatwa']).forEach(tab => {
            if (tried[tab] || typeof loadKcSection !== 'function') return;
            const cfg = kcTabConfig(tab);
            if (!cfg.items || !cfg.items.length || cfg.items.every(i => i.hasFullData)) return;
            tried[tab] = true;
            loadKcSection(tab).then(() => { if (state.currentPage === 'knowledgeCenter') refreshBody(); });
        });
    }
    // When ALL full data lands and a hero search is waiting, run it now.
    window.addEventListener('kc:full-data-ready', () => {
        if (state.currentPage === 'knowledgeCenter' && nav.view === 'home' && !state.kcDetail && nav.q.trim()) refreshBody();
    });

    // Blog data loads async and blog.js only re-renders while on the Blog page,
    // so watch for it and refresh counts/Latest in place once it arrives.
    let blogTimer = null;
    function watchBlog() {
        if (blogTimer || blogState() !== 'loading') return;
        let n = 0;
        blogTimer = setInterval(() => {
            n++;
            if (blogState() !== 'loading' || n > 80) {
                clearInterval(blogTimer); blogTimer = null;
                if (state.currentPage === 'knowledgeCenter') { refreshBody(); refreshStats(); }
            }
        }, 250);
    }

    // -----------------------------------------------------------------------
    // formatting / highlight helpers
    // -----------------------------------------------------------------------
    const toBnDigits = (s) => String(s).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
    function fmtDate(str) {
        if (!str) return '';
        try {
            const dt = new Date(String(str).length === 10 ? str + 'T00:00:00' : str);
            if (isNaN(dt)) return String(str);
            return dt.toLocaleDateString(state.language === 'bn' ? 'bn-BD' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return String(str); }
    }
    function fmtReadTime(rt) {
        if (!rt) return '';
        const m = /^(\d+)\s*min/i.exec(String(rt).trim());
        if (!m) return String(rt);
        return state.language === 'bn' ? toBnDigits(m[1]) + ' মিনিট' : m[1] + ' min read';
    }
    const AR = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
    const AR_RUN = new RegExp('[' + AR + ']+(?:[ \\u200c\\u200d]+[' + AR + ']+)*', 'g');
    // Wrap Arabic-script runs (if any exist in the data) so the Naskh font & RTL apply.
    function rich(escaped) { return escaped.replace(AR_RUN, m => '<span class="kcx-ar" lang="ar" dir="rtl">' + m + '</span>'); }
    function findMatch(text, q) {
        if (!q || !text) return null;
        const lower = text.toLowerCase();
        if (lower.length !== text.length) return null;
        const ql = q.toLowerCase();
        const needles = [ql].concat(ql.split(/\s+/).filter(w => w.length >= 2));
        for (let k = 0; k < needles.length; k++) { const i = lower.indexOf(needles[k]); if (i > -1) return { i: i, len: needles[k].length }; }
        return null;
    }
    function hl(text, q) {
        text = text == null ? '' : String(text);
        const m = findMatch(text, q);
        if (!m) return rich(S(text));
        return rich(S(text.slice(0, m.i)) + '<mark class="kcx-mark">' + S(text.slice(m.i, m.i + m.len)) + '</mark>' + S(text.slice(m.i + m.len)));
    }
    function snippet(text, q) {
        text = String(text || '');
        const m = findMatch(text, q);
        if (!m || m.i < 120) return text;
        const start = Math.max(0, m.i - 50);
        return '…' + text.slice(start, start + 220) + (start + 220 < text.length ? '…' : '');
    }

    // -----------------------------------------------------------------------
    // FEATURED — resolution + validation (see KCX_FEATURED above)
    // -----------------------------------------------------------------------
    const normTxt = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    function resolveFeatured() {
        const report = { entries: [], missing: [], recovered: [], hintMismatch: [], skipped: [] };
        const idxOk = indexState() === 'loaded', blogOk = blogState() === 'loaded';
        KCX_FEATURED.forEach((f, n) => {
            const isBlog = f.kind === 'blog';
            if (isBlog ? !blogOk : !idxOk) { report.skipped.push(f); return; } // data not (yet) available — not a config error
            const pool = isBlog ? allBlog() : (kcTabConfig(f.tab).items || []);
            const textOf = (it) => isBlog ? (it.titleEn || '') : kcItemTitle(f.tab, it, 'en');
            const hintOk = (it) => !f.hint || normTxt(textOf(it)).indexOf(normTxt(f.hint)) > -1;
            const label = '#' + (n + 1) + ' ' + JSON.stringify({ kind: f.kind, tab: f.tab, id: f.id });
            const byId = pool.find(x => String(x.id) === String(f.id));
            let chosen = null;
            if (byId && hintOk(byId)) chosen = byId;
            else {
                const byHint = f.hint ? pool.filter(hintOk) : [];
                if (byHint.length === 1) {
                    chosen = byHint[0];
                    report.recovered.push({ config: f, foundId: chosen.id });
                    warnOnce('rec' + label, 'Featured entry ' + label + (byId ? ' now points at different content' : ' was not found') + '; the hint "' + f.hint + '" matched exactly one item (id ' + JSON.stringify(chosen.id) + '), which is being shown instead. Update the id in KCX_FEATURED (knowledge-center.js).');
                } else if (byId) {
                    chosen = byId; // keep a valid id even if its hint drifted — never drop a working selection
                    report.hintMismatch.push(f);
                    warnOnce('hint' + label, 'Featured entry ' + label + ' exists, but its hint "' + f.hint + '" no longer matches the item\'s English text' + (byHint.length > 1 ? ' (and the hint is ambiguous)' : '') + '. Still shown; please review KCX_FEATURED.');
                }
            }
            if (chosen) report.entries.push(isBlog ? { kind: 'blog', post: chosen } : { kind: 'kc', tab: f.tab, item: chosen });
            else {
                report.missing.push(f);
                warnOnce('miss' + label, 'Featured entry ' + label + ' was not found' + (f.hint ? ' and its hint "' + f.hint + '" matched no item' : '') + '. It is omitted from the page. Remove or fix it in KCX_FEATURED (knowledge-center.js).');
            }
        });
        return report;
    }
    window.kcxValidateFeatured = resolveFeatured;

    // -----------------------------------------------------------------------
    // CARD (one consistent card for Featured / Latest / results / related)
    // -----------------------------------------------------------------------
    // ---- Phase 3B helpers -------------------------------------------------
    // #11: text shown in a language other than the UI's (a fallback when the requested
    // language has no value) is marked with lang="…" so screen readers use the right voice.
    const BN_RE = /[\u0980-\u09FF]/;
    function shownLang(l, bnVal, enVal, shown) {
        if (!shown) return '';
        if (l === 'en' && !enVal && bnVal) return 'bn';
        if (l === 'bn' && !bnVal && enVal) return 'en';
        return '';
    }
    const lgAttr = (lg) => lg ? ` lang="${lg}"` : '';
    // #11: Blog excerpts exist in ONE language only (Bengali). English mode must not present
    // them as English: use an English excerpt if the post has one (excerptEn / descriptionEn,
    // or an excerpt that is itself English text), otherwise show none. Nothing is translated.
    function blogExcerpt(p, l) {
        const ex = p.excerpt || '';
        if (l === 'en') {
            if (p.excerptEn || p.descriptionEn) return { text: p.excerptEn || p.descriptionEn, lg: '' };
            return { text: (ex && !BN_RE.test(ex)) ? ex : '', lg: '' };
        }
        return { text: ex, lg: (ex && !BN_RE.test(ex)) ? 'en' : '' };
    }
    // #8: is this the same person written twice (category badge "Imam Muhammad al-Baqir (AS)"
    // vs narrator "Imam al-Baqir (AS)")? Compare the significant name words only — bracketed
    // honorifics, titles (Imam/Lady), particles and punctuation are ignored. Overlap in ONE
    // direction only counts as "same" when every word of the shorter name is in the longer one;
    // a different person/extra context ("Prophet Muhammad — about Fatimah") stays different.
    const NAME_STOP = new Set(['imam', 'lady', 'al', 'ash', 'as', 'an', 'ar', 'at', 'ad', 'ibn', 'bin', 'abu', 'of', 'the', 'and', 'about', 'ইমাম', 'আল', 'আস', 'ও']);
    function nameTokens(x) { return new Set(String(x || '').replace(/\([^)]*\)/g, ' ').toLowerCase().split(/[^\p{L}\p{M}]+/u).filter(w => w && !NAME_STOP.has(w))); }
    function sameName(a, b) {
        const A = nameTokens(a), B = nameTokens(b);
        if (!A.size || !B.size) return false;
        const within = (x, y) => Array.from(x).every(w => y.has(w));
        return within(A, B) || within(B, A);
    }
    // #11: <html lang> follows state.language (which render() already applies on every full
    // render); this idempotent call keeps it right for everything the Knowledge Center renders.
    function syncDocLang() { const want = state.language === 'bn' ? 'bn' : 'en'; if (document.documentElement.lang !== want) document.documentElement.lang = want; }

    function entryInfo(e) {
        const l = state.language;
        if (e.kind === 'blog') {
            const p = e.post;
            const bTitle = l === 'bn' ? (p.titleBn || p.titleEn) : (p.titleEn || p.titleBn);
            const ex = blogExcerpt(p, l);
            return {
                title: bTitle, titleLg: shownLang(l, p.titleBn, p.titleEn, bTitle), bodyLg: ex.lg, attrLg: '',
                body: ex.text, attribution: '', source: '',
                catLabel: blogCategoryLabel(p.category, l), typeLabel: TX('ব্লগ', 'Blog'), tagKind: 'blog',
                icon: '📝', color: '#0369a1', date: p.date || '', readTime: p.readTime || '', sample: false,
                action: 'readPost', param: p.id, param2: null,
            };
        }
        const tab = e.tab, it = e.item, meta = kcTabMeta(tab), cfg = kcTabConfig(tab);
        const c = (cfg.categories || []).find(x => x.key === it[tab === 'fatwa' ? 'marja' : 'category']);
        let body = '', attribution = '', source = '';
        const pick = (bn, en) => l === 'bn' ? (bn || '') : (en || bn || '');
        if (tab === 'hadith') {
            attribution = pick(it.narratorBn, it.narratorEn);
            source = [pick(it.refBn, it.refEn), pick(it.sourceBn, it.sourceEn)].filter(Boolean).join(' · ');
        } else {
            body = kcItemBody(tab, it, l);
            source = tab === 'fatwa' ? pick(it.refBn, it.refEn) : (tab === 'masail' ? pick(it.sourceBn, it.sourceEn) : '');
        }
        const kTitle = kcItemTitle(tab, it, l);
        let kcCat = c ? (l === 'bn' ? c.bn : c.en) : '';
        // #8: the category badge repeats the narrator when both name the same person → drop the badge.
        if (tab === 'hadith' && kcCat && sameName(kcCat, attribution)) kcCat = '';
        return {
            title: kTitle, titleLg: shownLang(l, it.textBn || it.questionBn, it.textEn || it.questionEn, kTitle),
            bodyLg: tab === 'hadith' ? '' : shownLang(l, it.answerBn, it.answerEn, body), attrLg: shownLang(l, it.narratorBn, it.narratorEn, attribution),
            body: body, attribution: attribution, source: source,
            catLabel: kcCat, typeLabel: l === 'bn' ? meta.bn : meta.en, tagKind: tab,
            icon: meta.icon, color: meta.color, date: it.date || '', readTime: '', sample: !!it.sample,
            action: 'kcOpenDetail', param: tab, param2: it.id,
        };
    }

    function cardHTML(e, q, idx, extraClass) {
        const info = entryInfo(e);
        const kindClass = e.kind === 'blog' ? 'kcx-card--blog' : 'kcx-card--kc';
        const meta = [];
        if (info.date) meta.push('<li><span aria-hidden="true">🗓</span> ' + S(fmtDate(info.date)) + '</li>');
        if (info.readTime) meta.push('<li><span aria-hidden="true">⏱</span> ' + S(fmtReadTime(info.readTime)) + '</li>');
        if (info.source) meta.push('<li class="kcx-meta-src"><span aria-hidden="true">📖</span> ' + hl(info.source, q) + '</li>');
        const label = TX('আরও পড়ুন', 'Read More');
        return `
        <article class="kcx-card ${kindClass}${extraClass ? ' ' + extraClass : ''}" style="--kcx-accent:${info.color};animation-delay:${((idx || 0) % 9) * 0.035}s">
            <div class="kcx-card-top">
                ${info.catLabel ? `<span class="kcx-badge"><span aria-hidden="true">${info.icon}</span> ${S(info.catLabel)}</span>` : ''}
                <span class="kcx-tag" data-kind="${info.tagKind}">${S(info.typeLabel)}</span>
                ${info.sample ? `<span class="kc-sample-badge">${TX('নমুনা', 'Sample')}</span>` : ''}
            </div>
            <h3 class="kcx-card-title"${lgAttr(info.titleLg)}>${hl(info.title, q)}</h3>
            ${info.attribution ? `<p class="kcx-card-attr"${lgAttr(info.attrLg)}>${hl(info.attribution, q)}</p>` : ''}
            ${info.body ? `<p class="kcx-card-excerpt"${lgAttr(info.bodyLg)}>${hl(snippet(info.body, q), q)}</p>` : ''}
            ${meta.length ? `<ul class="kcx-meta">${meta.join('')}</ul>` : ''}
            <button type="button" class="kcx-more" data-action="${info.action}" data-param="${S(info.param)}" ${info.param2 != null ? `data-param2="${S(info.param2)}"` : ''}
                aria-label="${S(label + ': ' + info.title)}">${label} <span aria-hidden="true">→</span></button>
        </article>`;
    }

    // -----------------------------------------------------------------------
    // LANDING SECTIONS
    // -----------------------------------------------------------------------
    function secHead(id, title, sub, right) {
        return `<div class="kcx-sec-head"><div><h2 id="${id}" tabindex="-1">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${right || ''}</div>`;
    }

    function heroHTML() {
        return `
        <header class="kcx-hero" aria-labelledby="kcx-h1">
            <svg class="kcx-hero-pattern" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="kcx-pat" width="96" height="96" patternUnits="userSpaceOnUse">
                    <path d="${KCX_STAR}" fill="none" stroke="currentColor" stroke-width="1"/>
                    <path d="M0 0 L14 14 M96 0 L82 14 M0 96 L14 82 M96 96 L82 82" fill="none" stroke="currentColor" stroke-width=".8"/>
                    <path d="M48 0 L48 18 M48 96 L48 78 M0 48 L18 48 M96 48 L78 48" fill="none" stroke="currentColor" stroke-width=".8"/>
                </pattern></defs>
                <rect width="100%" height="100%" fill="url(#kcx-pat)"/>
            </svg>
            <div class="kcx-hero-inner">
                <h1 id="kcx-h1" class="kcx-h1" tabindex="-1">${S(t('knowledgeCenter'))}</h1>
                <p class="kcx-sub">${TX("কুরআন, হাদিস ও আহলে বাইত (আ.)-এর জ্ঞান, প্রজ্ঞা ও শিক্ষা অন্বেষণ করুন", "Explore knowledge, wisdom and teachings from the Qur'an, Hadith and the Ahl al-Bayt (a.s.)")}</p>
                <p class="kcx-desc">${TX('হাদিস, মাসাইল, প্রশ্নোত্তর ও ফতোয়া খুঁজুন ও বিষয় অনুযায়ী দেখুন — সঙ্গে পড়ার জন্য ব্লগ পোস্ট।', 'Search and browse Hadith, rulings, questions & answers and fatwas by topic — plus Blog posts to read.')}</p>
                <div class="kcx-search" role="search">
                    <svg class="kcx-search-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input id="kcx-search" type="search" value="${S(nav.q)}" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-describedby="kcx-scope-note"
                        placeholder="${TX('জ্ঞান কেন্দ্রে খুঁজুন...', 'Search the Knowledge Center...')}" aria-label="${TX('জ্ঞান কেন্দ্রে খুঁজুন', 'Search the Knowledge Center')}" />
                    <button type="button" class="kcx-clear" data-kcx-act="clear" aria-label="${TX('সার্চ মুছুন', 'Clear search')}" ${nav.q ? '' : 'hidden'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>
                    </button>
                </div>
                <div id="kcx-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
                <p id="kcx-scope-note" class="kcx-scope-note">${TX('শুধু জ্ঞান কেন্দ্রের কনটেন্টে খোঁজে — হাদিস, মাসাইল, প্রশ্নোত্তর, ফতোয়া, এবং জ্ঞান কেন্দ্রে অন্তর্ভুক্ত ব্লগ পোস্ট (যেমন ইতিহাস, আখলাক)।', 'Searches Knowledge Center content only — Hadith, Masail, Q&amp;A, Fatwa, and Blog posts included in Knowledge Center (e.g. History, Akhlaq).')}
                    <button type="button" class="kcx-note-link" data-kcx-act="scope-global">${TX('পুরো সাইটে খুঁজুন (ব্লগ, দোয়া, ইমাম ও আরও) →', 'Search the whole site (Blog, Duas, Imams and more) →')}</button></p>
                <div id="kcx-stats" class="kcx-stats">${statsHTML()}</div>
            </div>
        </header>`;
    }

    function statsHTML() {
        if (indexState() !== 'loaded') return '';
        const parts = [
            ['📜', TX('হাদিস', 'Hadith'), kcTabConfig('hadith').items.length],
            ['⚖️', TX('মাসাইল', 'Masail'), kcTabConfig('masail').items.length],
            ['❓', TX('প্রশ্নোত্তর', 'Q&A'), kcTabConfig('qa').items.length],
            ['📃', TX('ফতোয়া', 'Fatwa'), kcTabConfig('fatwa').items.length],
            ['📝', TX('ব্লগ পোস্ট', 'Blog posts'), allBlog().length],
        ].filter(p => p[2] > 0);
        if (!parts.length) return '';
        return `<ul class="kcx-stats-list" aria-label="${TX('সংগ্রহের পরিসংখ্যান', 'Library at a glance')}">${parts.map(p => `<li><span aria-hidden="true">${p[0]}</span> <strong>${p[2]}</strong> ${S(p[1])}</li>`).join('')}</ul>`;
    }

    // #20: these chips FILTER the content on this page (toggle buttons, aria-pressed) - they do not navigate
    // anywhere - so they are a labelled group, not a <nav> landmark.
    function chipsHTML() {
        const items = [{ key: '', label: TX('সব বিষয়', 'All Topics') }].concat(
            KCX_TOPICS.filter(x => !x.comingSoon && x.sources.length).map(x => ({ key: x.key, label: state.language === 'bn' ? (x.chipBn || x.bn) : (x.chipEn || x.en) })));
        return `
        <div class="kcx-chips-wrap" role="group" aria-label="${TX('বিষয় অনুযায়ী ফিল্টার', 'Filter by topic')}">
            <div class="kcx-chips">
                ${items.map(c => `<button type="button" class="kcx-chip" data-kcx-act="topic" data-kcx-val="${c.key}" aria-pressed="${!nav.saved && nav.topic === c.key}">${S(c.label)}</button>`).join('')}
            </div>
        </div>`;
    }

    function topicCardsHTML() {
        const l = state.language;
        return `
        <section class="kcx-section" aria-labelledby="kcx-h-topics">
            ${secHead('kcx-h-topics', TX('বিষয় অনুযায়ী ঘুরে দেখুন', 'Explore by topic'), TX('আপনার আগ্রহের বিষয় বেছে নিন', 'Choose a subject to explore'))}
            <div class="kcx-topics">
                ${KCX_TOPICS.map(tp => {
                    const soon = tp.comingSoon || !tp.sources.length;
                    const name = l === 'bn' ? tp.bn : tp.en, desc = l === 'bn' ? tp.descBn : tp.descEn;
                    const medal = `<span class="kcx-medal" aria-hidden="true"><span class="kcx-medal-ico">${tp.icon}</span></span>`;
                    // #17: a plain, genuinely non-interactive card (no role, no tabindex, no handler). It must not
                    // carry aria-disabled - that is not valid on a generic <div> and made it read as a disabled
                    // control. Its status is the visible "Coming Soon" text below.
                    if (soon) return `
                        <div class="kcx-topic kcx-soon">
                            ${medal}
                            <div class="kcx-topic-txt"><h3>${S(name)}</h3><p>${S(desc)}</p>
                                <span class="kcx-soon-pill">${TX('শীঘ্রই আসছে', 'Coming Soon')}</span></div>
                        </div>`;
                    const n = topicEntries(tp).length;
                    return `
                        <button type="button" class="kcx-topic" data-kcx-act="topic" data-kcx-val="${tp.key}">
                            ${medal}
                            <span class="kcx-topic-txt"><span class="kcx-topic-name">${S(name)}</span><span class="kcx-topic-desc">${S(desc)}</span>
                                <span class="kcx-count">${n} ${TX('টি', 'items')}</span></span>
                        </button>`;
                }).join('')}
            </div>
        </section>`;
    }

    // Compact "Saved" entry point on the KC landing (Phase 3A #6) — exposes the
    // two EXISTING save concepts (site-wide Bookmark, KC-only Favorite) with one
    // click each, aggregated across all 4 KC tabs. Reuses isBookmarked()/
    // isKcFavorite() as-is; no new storage.
    function savedHTML() {
        const c = savedCounts();
        return `
        <section class="kcx-section kcx-saved" aria-labelledby="kcx-h-saved">
            ${secHead('kcx-h-saved', TX('সংরক্ষিত', 'Saved'), TX('আপনার বুকমার্ক করা ও পছন্দের তালিকা', 'Your bookmarked and favorited items'))}
            <div class="kcx-saved-row" role="group" aria-label="${TX('সংরক্ষিত তালিকা', 'Saved lists')}">
                <button type="button" class="kcx-btn" data-kcx-act="saved" data-kcx-val="bookmarked">
                    <span aria-hidden="true">🔖</span> ${TX('বুকমার্কড', 'Bookmarked')} (${c.bookmarked})
                </button>
                <button type="button" class="kcx-btn" data-kcx-act="saved" data-kcx-val="favorite">
                    <span aria-hidden="true">❤️</span> ${TX('পছন্দের', 'Favorites')} (${c.favorite})
                </button>
            </div>
        </section>`;
    }

    function featuredHTML() {
        const list = resolveFeatured().entries;
        if (!list.length) return '';
        hydrate(list.filter(e => e.kind === 'kc').map(e => e.tab));
        return `
        <section class="kcx-section" aria-labelledby="kcx-h-feat">
            ${secHead('kcx-h-feat', TX('নির্বাচিত জ্ঞান', 'Featured Knowledge'), TX('সংগ্রহ থেকে বাছাই করা ব্লগ পোস্ট, হাদিস ও প্রশ্নোত্তর', 'Selected Blog posts, hadith and Q&A from the library'))}
            <div class="kcx-grid">${list.map((e, i) => cardHTML(e, '', i, 'kcx-card--featured')).join('')}</div>
        </section>`;
    }

    function latestHTML() {
        const bs = blogState();
        if (bs === 'loading') {
            watchBlog();
            return `<section class="kcx-section" aria-labelledby="kcx-h-latest">${secHead('kcx-h-latest', TX('সাম্প্রতিক জ্ঞান', 'Latest Knowledge'), '')}${kcSkeletonGrid(state.darkMode, 3)}</section>`;
        }
        const list = newestBlog().slice(0, KCX_LATEST_COUNT);
        if (!list.length) return '';
        const all = `<button type="button" class="kcx-link" data-action="changePage" data-param="blog">${TX('সব ব্লগ পোস্ট', 'All Blog posts')} <span aria-hidden="true">→</span></button>`;
        return `
        <section class="kcx-section" aria-labelledby="kcx-h-latest">
            ${secHead('kcx-h-latest', TX('সাম্প্রতিক জ্ঞান', 'Latest Knowledge'), TX('ব্লগের সর্বশেষ পোস্ট', 'The newest posts from the Blog'), all)}
            <div class="kcx-grid">${list.map((e, i) => cardHTML({ kind: 'blog', post: e }, '', i)).join('')}</div>
        </section>`;
    }

    function sectionsHTML() {
        return `
        <section class="kcx-section" aria-labelledby="kcx-h-sec">
            ${secHead('kcx-h-sec', TX('বিভাগ অনুযায়ী দেখুন', 'Browse by section'), TX('হাদিস, মাসাইল, প্রশ্নোত্তর ও ফতোয়া — পূর্ণ তালিকা, ক্যাটাগরি ও ফিল্টারসহ', 'Full lists with categories, filters, bookmarks and favorites'))}
            <div class="kcx-sections">
                ${KC_TABS.map(tb => {
                    const n = (kcTabConfig(tb.key).items || []).length;
                    return `<button type="button" class="kcx-secbtn" data-kcx-act="browse" data-kcx-val="${tb.key}" style="--kcx-accent:${tb.color}">
                        <span class="kcx-secbtn-ico" aria-hidden="true">${tb.icon}</span>
                        <span class="kcx-secbtn-txt"><strong>${S(state.language === 'bn' ? tb.bn : tb.en)}</strong><span>${n} ${TX('টি', 'items')}</span></span>
                        <span class="kcx-secbtn-go" aria-hidden="true">→</span></button>`;
                }).join('')}
            </div>
        </section>`;
    }

    // -----------------------------------------------------------------------
    // EXPLORE (topic filter and/or search results)
    // -----------------------------------------------------------------------
    // Breadcrumb vs. the "All topics" button below have DIFFERENT jobs (Phase 3A #4):
    // this breadcrumb's "Knowledge Center" crumb always goes to the true KC root
    // (landing() — a full reset, including the search query). The "All topics"
    // button instead clears only the topic/saved-list filter and preserves an
    // active search query (Phase 3A #7) — it is NOT a root-reset shortcut.
    function exploreCrumb(currentLabel) {
        return `<nav class="kcx-crumbs" aria-label="${TX('ব্রেডক্রাম্ব', 'Breadcrumb')}">
            <button type="button" data-action="changePage" data-param="home">${TX('হোম', 'Home')}</button><span aria-hidden="true">/</span>
            <button type="button" data-kcx-act="landing">${S(t('knowledgeCenter'))}</button><span aria-hidden="true">/</span>
            <span aria-current="page">${S(currentLabel)}</span>
        </nav>`;
    }
    function exploreHead(title, countText) {
        const backLbl = nav.saved
            ? '← ' + TX('জ্ঞান কেন্দ্রে ফিরুন', 'Back to Knowledge Center')
            : '← ' + TX('সব বিষয়', 'All topics');
        return `${exploreCrumb(title)}<div id="kcx-explore-top" class="kcx-explore-head">
                <div><h2 id="kcx-h-explore" tabindex="-1">${S(title)}</h2>
                    <p class="kcx-count-line">${S(countText)}</p>
                    ${nav.q.trim() && !nav.saved ? `<p class="kcx-scope-note kcx-scope-note--inline">${TX('শুধু জ্ঞান কেন্দ্রের ফলাফল (হাদিস, মাসাইল, প্রশ্নোত্তর, ফতোয়া ও অন্তর্ভুক্ত ব্লগ)।', 'Knowledge Center results only (Hadith, Masail, Q&amp;A, Fatwa and included Blog).')}
                        <button type="button" class="kcx-note-link" data-kcx-act="scope-global">${TX('পুরো সাইটে খুঁজুন →', 'Search the whole site →')}</button></p>` : ''}</div>
                <button type="button" class="kcx-btn" data-kcx-act="reset">${backLbl}</button>
            </div>`;
    }
    function exploreHTML() {
        const q = nav.q.trim(), topic = topicByKey(nav.topic), d = state.darkMode;
        const savedTitle = nav.saved === 'bookmarked' ? TX('বুকমার্কড', 'Bookmarked')
                          : nav.saved === 'favorite' ? TX('পছন্দের', 'Favorites') : '';
        const title = nav.saved ? savedTitle
                    : q ? TX('“' + q + '”-এর ফলাফল', 'Results for “' + q + '”')
                    : (state.language === 'bn' ? topic.bn : topic.en);
        // A search runs against the FULL Knowledge Center data (answers included).
        // If it has not finished loading yet (first search of the session), show a
        // searching state; the 'kc:full-data-ready' listener re-runs this in place.
        if (q && !nav.saved && !fullDataReady()) {
            window.loadAllKcSections();
            statusMsg = TX('খোঁজা হচ্ছে…', 'Searching…');
            return `<section class="kcx-section" aria-labelledby="kcx-h-explore">${exploreHead(title, statusMsg)}${kcSkeletonGrid(d, 3)}</section>`;
        }
        const entries = exploreEntries();
        const kcN = entries.filter(e => e.kind === 'kc').length, blogN = entries.length - kcN;
        const showKind = kcN > 0 && blogN > 0;
        if (!showKind) nav.kind = '';
        const shown = nav.kind ? entries.filter(e => e.kind === nav.kind) : entries;
        const pg = kcPaginate(shown, nav.page);
        nav.page = pg.safePage;

        const count = shown.length + ' ' + TX('টি ফলাফল', shown.length === 1 ? 'result' : 'results');
        statusMsg = count;
        const segBtn = (val, label) => `<button type="button" class="kcx-seg-btn" data-kcx-act="kind" data-kcx-val="${val}" aria-pressed="${nav.kind === val}">${label}</button>`;
        const seg = showKind ? `<div class="kcx-seg" role="group" aria-label="${TX('কনটেন্টের ধরন', 'Content type')}">
            ${segBtn('', TX('সব ধরনের', 'All Content') + ' (' + entries.length + ')')}${segBtn('kc', TX('জ্ঞান কেন্দ্র', 'Knowledge Center') + ' (' + kcN + ')')}${segBtn('blog', TX('ব্লগ', 'Blog') + ' (' + blogN + ')')}</div>` : '';

        let inner;
        if (!shown.length) {
            if (!q && !nav.saved && blogState() === 'loading') watchBlog();
            const emptyMsg = q ? TX('কোনো ফলাফল পাওয়া যায়নি', 'No results found')
                : nav.saved === 'bookmarked' ? TX('কোনো বুকমার্ক নেই', 'No bookmarks yet')
                : nav.saved === 'favorite' ? TX('কোনো পছন্দ নেই', 'No favorites yet')
                : TX('এই বিষয়ে এখনো কোনো তথ্য নেই', 'No entries in this topic yet');
            const emptySub = q ? TX('অন্য শব্দ বা অন্য বিষয় দিয়ে চেষ্টা করুন।', 'Try different keywords or another topic.')
                : nav.saved ? TX('হাদিস, মাসাইল, প্রশ্নোত্তর বা ফতোয়ায় বুকমার্ক/পছন্দ চিহ্ন দিলে এখানে দেখা যাবে।', 'Bookmark or favorite any Hadith, Masail, Q&A or Fatwa to see it here.')
                : '';
            statusMsg = emptyMsg; // announced by #kcx-status; the empty block itself is plain text
            inner = `<div class="kcx-empty">
                <div class="kcx-empty-ico" aria-hidden="true">${nav.saved ? (nav.saved === 'bookmarked' ? '🔖' : '❤️') : '🔎'}</div>
                <p class="kcx-empty-t">${emptyMsg}</p>
                <p class="kcx-empty-s">${emptySub}</p>
                ${q ? `<p class="kcx-empty-s">${TX('ব্লগ, দোয়া ও সাইটের অন্যান্য অংশ জ্ঞান কেন্দ্রের সার্চে ধরা হয় না।', 'Blog posts, Duas and other site sections are not part of Knowledge Center search.')}</p>
                <div class="kcx-empty-actions"><button type="button" class="kcx-btn" data-kcx-act="clear">${TX('সার্চ মুছুন', 'Clear search')}</button>
                <button type="button" class="kcx-btn" data-kcx-act="scope-global">${TX('পুরো সাইটে খুঁজুন', 'Search the whole site')}</button></div>` : ''}
            </div>`;
        } else {
            inner = `<div class="kcx-grid">${pg.pageItems.map((e, i) => cardHTML(e, q, i)).join('')}</div>${kcPagination(d, state.language, pg.totalPages, pg.safePage)}`;
        }
        return `<section class="kcx-section" aria-labelledby="kcx-h-explore">${exploreHead(title, count)}${seg}${inner}</section>`;
    }

    function bodyHTML() {
        statusMsg = ''; // #16: exploreHTML() sets it when there is something to report
        if (indexState() === 'loading') return `<div>${kcSkeletonCategoryGrid(state.darkMode, 6)}</div><div class="kcx-pad">${kcSkeletonGrid(state.darkMode, 3)}</div>`;
        if (exploring()) return exploreHTML();
        return topicCardsHTML() + savedHTML() + featuredHTML() + latestHTML() + sectionsHTML();
    }

    function homeHTML() {
        syncDocLang();
        const enter = nav.justEntered ? ' page-enter' : '';
        nav.justEntered = false;
        if (typeof kcUpdateSeoSchema === 'function') kcUpdateSeoSchema(null);
        return `
        <div class="kcx-scope kcx-page${enter}">
            ${heroHTML()}
            ${chipsHTML()}
            <div id="kcx-body" class="kcx-body">${bodyHTML()}</div>
        </div>`;
    }

    // In-place refreshes (keep the search input / chips focused while they work).
    function refreshBody() {
        const el = document.getElementById('kcx-body');
        if (!el || state.currentPage !== 'knowledgeCenter' || state.kcDetail || nav.view !== 'home') return;
        el.classList.add('kcx-static');
        el.innerHTML = bodyHTML();
        syncDocLang();
        scheduleStatus(); // #16
    }
    function refreshStats() { const el = document.getElementById('kcx-stats'); if (el) el.innerHTML = statsHTML(); }
    function syncChips() {
        document.querySelectorAll('.kcx-chip').forEach(b => b.setAttribute('aria-pressed', String(!nav.saved && b.getAttribute('data-kcx-val') === nav.topic)));
    }

    // -----------------------------------------------------------------------
    // BROWSE (original 4-tab UI, wrapped)
    // -----------------------------------------------------------------------
    // The legacy tab UI's search box only searches the OPEN tab. Say so, right under it, and
    // offer the two wider searches. Injected after each legacy render; the legacy markup and
    // its search logic are untouched.
    function enhanceLegacySearch() {
        if (nav.view !== 'browse' || state.kcDetail) return;
        const inp = document.querySelector('.kcx-browse input[type="search"]');
        if (!inp || document.getElementById('kcx-legacy-note')) return;
        const m = kcTabMeta(state.kcTab);
        const note = document.createElement('p');
        note.id = 'kcx-legacy-note';
        note.className = 'kcx-scope-note kcx-scope-note--page';
        note.innerHTML = '<span>' + S(TX('শুধু “' + m.bn + '”-এর মধ্যে খোঁজে।', 'Searches within “' + m.en + '” only.')) + '</span> '
            + '<button type="button" class="kcx-note-link" data-kcx-act="scope-kc">' + S(TX('পুরো জ্ঞান কেন্দ্রে খুঁজুন', 'Search all Knowledge Center')) + '</button>'
            + '<span aria-hidden="true"> · </span>'
            + '<button type="button" class="kcx-note-link" data-kcx-act="scope-global">' + S(TX('পুরো সাইটে খুঁজুন', 'Search the whole site')) + '</button>';
        inp.parentElement.insertAdjacentElement('afterend', note);
        inp.setAttribute('aria-describedby', 'kcx-legacy-note');
    }
    function browseShell(originalHtml) {
        syncDocLang();
        requestAnimationFrame(enhanceLegacySearch);
        return `
        <div class="kcx-scope kcx-browse">
            <div class="kcx-browsebar"><button type="button" class="kcx-btn" data-kcx-act="landing">← ${TX('জ্ঞান কেন্দ্রে ফিরুন', 'Back to Knowledge Center')}</button></div>
            ${originalHtml}
        </div>`;
    }

    // -----------------------------------------------------------------------
    // ARTICLE / DETAIL READING PAGE
    // -----------------------------------------------------------------------
    const STOP = new Set(['the', 'and', 'for', 'with', 'what', 'which', 'how', 'who', 'why', 'does', 'are', 'was', 'were', 'from', 'that', 'this', 'into', 'about', 'their', 'have', 'has', 'can', 'not', 'its', 'you', 'your', 'his', 'her', 'should']);
    function tokens(s) { return String(s || '').toLowerCase().split(/[\s,.،؛।!?()\[\]{}"'“”‘’:;–—\-\/]+/).filter(w => w.length >= 3 && !STOP.has(w)); }
    function titleText(tab, it) { return kcItemTitle(tab, it, 'bn') + ' ' + kcItemTitle(tab, it, 'en'); }
    // Related = same existing category (Masail ↔ Fatwa share category keys, so
    // they relate to each other), ranked by shared title keywords.
    function relatedFor(tab, item, limit) {
        const pools = { hadith: ['hadith'], qa: ['qa'], masail: ['masail', 'fatwa'], fatwa: ['fatwa', 'masail'] }[tab] || [tab];
        const base = new Set(tokens(titleText(tab, item)));
        const cands = [];
        pools.forEach((pt, pi) => {
            (kcTabConfig(pt).items || []).forEach((it, ix) => {
                if (pt === tab && String(it.id) === String(item.id)) return;
                if (it.category !== item.category) return;
                let score = 0; tokens(titleText(pt, it)).forEach(w => { if (base.has(w)) score++; });
                cands.push({ tab: pt, item: it, score: score, order: pi * 100000 + ix });
            });
        });
        cands.sort((a, b) => (b.score - a.score) || (a.order - b.order));
        return cands.slice(0, limit).map(c => ({ kind: 'kc', tab: c.tab, item: c.item }));
    }

    function detailHTML() {
        const d = state.darkMode, l = state.language;
        const { type: tab, id } = state.kcDetail || {};
        const item = kcFindItem(tab, id);
        const back = `<button type="button" class="kcx-btn" data-kcx-act="back">← ${backLabel()}</button>`;
        if (!item) return `<div class="kcx-scope kcx-page"><div class="kcx-toolbar">${back}</div><div class="kcx-empty" role="status"><div class="kcx-empty-ico" aria-hidden="true">❓</div><p class="kcx-empty-t">${TX('আইটেমটি পাওয়া যায়নি', 'Item not found')}</p></div></div>`;

        const meta = kcTabMeta(tab), cfg = kcTabConfig(tab);
        const pick = (bn, en) => l === 'bn' ? (bn || '') : (en || bn || '');
        const bookmarked = typeof isBookmarked === 'function' && isBookmarked(item.id, cfg.bookmarkType);
        const favorited = isKcFavorite(item.id, cfg.bookmarkType);
        const catObj = (cfg.categories || []).find(x => x.key === item[tab === 'fatwa' ? 'marja' : 'category']);
        const catLabel = catObj ? (l === 'bn' ? catObj.bn : catObj.en) : '';
        const sectionLabel = l === 'bn' ? meta.bn : meta.en;
        const loading = !item.hasFullData && tab !== 'hadith'
            ? `<div class="kcx-loadline" role="status" aria-live="polite">${TX('পূর্ণ তথ্য লোড হচ্ছে…', 'Loading full content…')}</div>` : '';
        const refs = []; // [label, value]
        let title = '', bodyHtml = '', extraTop = '', titleLg = '', byline = '', bylineLg = '';
        const para = (txt, lg) => `<p class="kcx-p"${lgAttr(lg)}>${rich(S(txt))}</p>`;

        if (tab === 'hadith') {
            // Hierarchy (Phase 3B #8): the hadith data has no title field — the hadith TEXT is what the
            // cards already use as the title, so it is the page's one H1 here too. The narrator is the
            // attribution (byline) under it, exactly once; source/collection/reference stay in
            // References. Nothing is invented and no field is dropped.
            const narrator = pick(item.narratorBn, item.narratorEn);
            const text = pick(item.textBn, item.textEn);
            title = text; titleLg = shownLang(l, item.textBn, item.textEn, text);
            byline = narrator; bylineLg = shownLang(l, item.narratorBn, item.narratorEn, narrator);
            bodyHtml = l === 'bn' && item.textEn ? `<p class="kcx-p kcx-p--muted" lang="en">${S(item.textEn)}</p>` : '';
            if (pick(item.sourceBn, item.sourceEn)) refs.push([TX('উৎস গ্রন্থ', 'Source book'), pick(item.sourceBn, item.sourceEn)]);
            if (pick(item.refBn, item.refEn)) refs.push([TX('রেফারেন্স', 'Reference'), pick(item.refBn, item.refEn)]);
        } else if (tab === 'masail') {
            title = pick(item.questionBn, item.questionEn); titleLg = shownLang(l, item.questionBn, item.questionEn, title);
            const ans = pick(item.answerBn, item.answerEn), det = pick(item.detailBn, item.detailEn);
            bodyHtml = (ans ? `<h2 class="kcx-h2">${TX('জবাব', 'Answer')}</h2><div class="kcx-lead">${para(ans, shownLang(l, item.answerBn, item.answerEn, ans))}</div>` : '')
                     + (det ? `<h2 class="kcx-h2">${TX('বিস্তারিত', 'Details')}</h2>${para(det, shownLang(l, item.detailBn, item.detailEn, det))}` : '');
            if (pick(item.sourceBn, item.sourceEn)) refs.push([TX('উৎস', 'Source'), pick(item.sourceBn, item.sourceEn)]);
            const mj = (typeof kcMaraji !== 'undefined' ? kcMaraji : []).find(x => x.key === item.marja);
            refs.push([TX('মারজা', 'Marja'), item.marja === 'general' ? TX('সাধারণ নির্দেশনা', 'General guidance') : (mj ? (l === 'bn' ? mj.bn : mj.en) : (item.marja || ''))]);
        } else if (tab === 'qa') {
            title = pick(item.questionBn, item.questionEn); titleLg = shownLang(l, item.questionBn, item.questionEn, title);
            const ans = pick(item.answerBn, item.answerEn);
            bodyHtml = ans ? `<h2 class="kcx-h2">${TX('জবাব', 'Answer')}</h2><div class="kcx-lead">${para(ans, shownLang(l, item.answerBn, item.answerEn, ans))}</div>` : '';
        } else if (tab === 'fatwa') {
            title = pick(item.questionBn, item.questionEn); titleLg = shownLang(l, item.questionBn, item.questionEn, title);
            const ans = pick(item.answerBn, item.answerEn);
            const mj = (cfg.categories || []).find(x => x.key === item.marja);
            if (item.sample) extraTop += `<div class="kcx-callout kcx-callout--warn" role="note">${TX('⚠️ এটি একটি নমুনা এন্ট্রি। প্রকৃত প্রকাশনার আগে অনুগ্রহ করে সংশ্লিষ্ট মারজার অফিসিয়াল ও যাচাইকৃত সূত্র থেকে প্রকৃত ফতোয়া দিয়ে প্রতিস্থাপন করুন।', '⚠️ This is a sample entry. Please replace it with the actual verified ruling from the Marja\u2019s official source before publishing.')}</div>`;
            if (mj && mj.deceased) extraTop += `<div class="kcx-callout" role="note">${l === 'bn'
                ? `⚠️ ${S(mj.bn)} ${S(mj.deathDateBn || '')} তারিখে ইন্তেকাল করেছেন। এটি তাঁর জীবদ্দশায় প্রদত্ত একটি ঐতিহাসিক ফতোয়া — নতুন কোনো বিষয়ে রায়ের জন্য আপনার বর্তমান অনুসরণীয় (জীবিত) মারজার সাথে যোগাযোগ করুন।`
                : `⚠️ ${S(mj.en)} passed away on ${S(mj.deathDateEn || 'an unspecified date')}. This is a historical ruling given during his lifetime — for new matters, consult your current (living) Marja.`}</div>`;
            bodyHtml = ans ? `<h2 class="kcx-h2">${TX('জবাব', 'Answer')}</h2><div class="kcx-lead">${para(ans, shownLang(l, item.answerBn, item.answerEn, ans))}</div>` : '';
            refs.push([TX('মারজা', 'Marja'), catLabel + (mj && mj.deceased ? ' (' + TX('প্রয়াত', 'deceased') + ')' : '')]);
            if (pick(item.refBn, item.refEn)) refs.push([TX('রেফারেন্স', 'Reference'), pick(item.refBn, item.refEn)]);
            if (item.date) refs.push([TX('তারিখ', 'Date'), item.date]);
        }

        // #8: the category badge is shown only when it adds information (e.g. "Remaining Imams (AS)"
        // over a specific Imam, "Topic-wise Hadith", or a different person than the narrator) —
        // never when it just repeats the narrator's name shown in the byline.
        const showBadge = !!catLabel && !(tab === 'hadith' && sameName(catLabel, byline));
        const refsHtml = refs.length ? `<section class="kcx-refs" aria-labelledby="kcx-h-refs"><h2 id="kcx-h-refs" class="kcx-h2">${TX('সূত্র ও রেফারেন্স', 'References')}</h2>
            <dl>${refs.map(r => `<div><dt>${S(r[0])}</dt><dd>${rich(S(r[1]))}</dd></div>`).join('')}</dl></section>` : '';

        const rel = relatedFor(tab, item, 3);
        hydrate([tab]);
        const relHtml = rel.length ? `<section class="kcx-related kcx-section" aria-labelledby="kcx-h-rel">
            ${secHead('kcx-h-rel', TX('সম্পর্কিত জ্ঞান', 'Related Knowledge'), TX('একই ক্যাটাগরির আরও কিছু', 'More from the same category'))}
            <div class="kcx-grid">${rel.map((e, i) => cardHTML(e, '', i)).join('')}</div></section>` : '';

        const act = (icon, label, action, p1, p2, pressed) => `<button type="button" class="kcx-act" data-action="${action}" data-param="${S(p1)}" data-param2="${S(p2)}" ${pressed !== undefined ? `aria-pressed="${pressed}"` : ''}><span aria-hidden="true">${icon}</span> ${label}</button>`;
        syncDocLang();
        const enter = window._kcJustOpenedDetail ? ' page-enter' : '';
        window._kcJustOpenedDetail = false;

        return `
        <div class="kcx-scope kcx-page kcx-detail${prefs.reading ? ' kcx-reading' : ''}${enter}" id="kcx-detail">
            <nav class="kcx-crumbs" aria-label="${TX('ব্রেডক্রাম্ব', 'Breadcrumb')}">
                <button type="button" data-action="changePage" data-param="home">${TX('হোম', 'Home')}</button><span aria-hidden="true">/</span>
                <button type="button" data-kcx-act="landing">${S(t('knowledgeCenter'))}</button><span aria-hidden="true">/</span>
                <button type="button" data-kcx-act="browse" data-kcx-val="${tab}">${S(sectionLabel)}</button><span aria-hidden="true">/</span>
                <span aria-current="page">${TX('বিস্তারিত', 'Details')}</span>
            </nav>
            <div class="kcx-toolbar">
                ${back}
                <div class="kcx-reader-tools" role="group" aria-label="${TX('পঠন সেটিংস', 'Reading settings')}">
                    <button type="button" class="kcx-tool" data-kcx-act="size" data-kcx-val="-1" aria-label="A−, ${TX('লেখা ছোট করুন', 'Decrease text size')}">A<small>−</small></button>
                    <button type="button" class="kcx-tool" data-kcx-act="size" data-kcx-val="1" aria-label="A+, ${TX('লেখা বড় করুন', 'Increase text size')}">A<small>+</small></button>
                    <button type="button" class="kcx-tool kcx-tool--wide" data-kcx-act="reading" aria-pressed="${prefs.reading}">📖 ${TX('পঠন মোড', 'Reading mode')}</button>
                </div>
            </div>
            <article class="kcx-article" style="--kcx-fs:${prefs.size};--kcx-accent:${meta.color}">
                <header class="kcx-article-head">
                    <div class="kcx-card-top">
                        ${showBadge ? `<span class="kcx-badge"><span aria-hidden="true">${meta.icon}</span> ${S(catLabel)}</span>` : ''}
                        <span class="kcx-tag" data-kind="${tab}">${S(sectionLabel)}</span>
                    </div>
                    ${tab === 'hadith'
                        ? `<figure class="kcx-quote"><h1 class="kcx-article-title" tabindex="-1"${lgAttr(titleLg)}>${rich(S(title))}</h1>${byline ? `<figcaption class="kcx-byline"${lgAttr(bylineLg)}>— ${S(byline)}</figcaption>` : ''}</figure>`
                        : `<h1 class="kcx-article-title" tabindex="-1"${lgAttr(titleLg)}>${rich(S(title))}</h1>`}
                </header>
                ${extraTop}${loading}
                <div class="kcx-article-body">${bodyHtml}</div>
                ${refsHtml}
                <div class="kcx-actions" role="group" aria-label="${TX('অ্যাকশন', 'Actions')}">
                    ${act('📋', TX('কপি', 'Copy'), 'kcCopy', tab, item.id)}
                    ${act('📤', TX('শেয়ার', 'Share'), 'kcShare', tab, item.id)}
                    ${act(bookmarked ? '⭐' : '☆', TX('বুকমার্ক', 'Bookmark'), 'toggleBookmark', item.id, cfg.bookmarkType, bookmarked)}
                    ${act(favorited ? '❤️' : '🤍', TX('পছন্দ', 'Favorite'), 'kcToggleFavorite', item.id, cfg.bookmarkType, favorited)}
                </div>
            </article>
            ${relHtml}
        </div>`;
    }

    // -----------------------------------------------------------------------
    // ROUTER — wraps the original renderer (kept intact) — see header comment.
    // -----------------------------------------------------------------------
    const originalRender = window.renderKnowledgeCenterPage;
    function route() {
        applyPendingEntry();
        const idx = indexState();
        if (idx === 'error') return originalRender();
        if (state.kcDetail) { if (idx === 'loading') return originalRender(); if (typeof kcUpdateSeoSchema === 'function') kcUpdateSeoSchema(null); return detailHTML(); }
        if (nav.view === 'browse') return browseShell(originalRender());
        if (blogState() === 'loading') watchBlog();
        return homeHTML();
    }
    window.renderKnowledgeCenterPage = function () {
        let html;
        try { html = route(); }
        catch (err) {
            console.error('[KCX] redesigned Knowledge Center failed — falling back to the classic view', err);
            html = originalRender();
        }
        requestAnimationFrame(runPost); // runs after the app has put this HTML in the page
        return html;
    };

    // -----------------------------------------------------------------------
    // EVENTS
    // -----------------------------------------------------------------------
    const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    function scrollToResults() {
        setTimeout(() => {
            const a = document.getElementById('kcx-explore-top') || document.getElementById('kcx-body');
            if (a) a.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        }, 60);
    }
    function setPage(n) {
        nav.page = n; refreshBody();
        focusEl(document.getElementById('kcx-h-explore'));
        scrollToResults(); // back to the start of the results, not the top of the page
    }
    function setReadingDom() {
        const root = document.getElementById('kcx-detail'); if (!root) return;
        root.classList.toggle('kcx-reading', prefs.reading);
        const btn = root.querySelector('[data-kcx-act="reading"]'); if (btn) btn.setAttribute('aria-pressed', String(prefs.reading));
        const art = root.querySelector('.kcx-article'); if (art) art.style.setProperty('--kcx-fs', prefs.size);
    }

    // Capture phase: runs before the app's own click dispatcher, so it can record
    // history (where a detail is opened FROM) and redirect the few controls whose
    // legacy behaviour would corrupt KC navigation state.
    function onClickCapture(e) {
        const tgt = e.target && e.target.closest ? e.target : null;
        if (!tgt) return;
        nav.lastClick = { inMain: !!tgt.closest('main'), at: Date.now() };
        if (state.currentPage !== 'knowledgeCenter') return;
        const opener = tgt.closest('[data-action="kcOpenDetail"]');
        if (!opener) nav.focusTitle = false;

        // Explore-view pagination: use OUR page state and land on the results, not the page top.
        const pg = tgt.closest('#kcx-body [data-action="kcSetPage"]');
        if (pg) { e.preventDefault(); e.stopImmediatePropagation(); setPage(parseInt(pg.getAttribute('data-param'), 10) || 1); return; }
        // Legacy tab UI breadcrumb: its "Knowledge Center" link used to jump to the tab's
        // root. Same label, same destination everywhere → the Knowledge Center landing.
        const crumb = tgt.closest('.kcx-browse nav[aria-label] button[data-action="setKcTab"]');
        if (crumb) { e.preventDefault(); e.stopImmediatePropagation(); landing(); return; }
        // Opening a detail page (from landing/explore, Related, or the legacy tab UI): remember where from.
        if (opener) { pushFrame(opener); nav.focusTitle = true; return; }
        // Opening a Blog post from a Knowledge Center card: remember the context for the reader's Back.
        const post = tgt.closest('.kcx-scope [data-action="readPost"]');
        if (post) nav.ticket = Object.assign({ y: window.scrollY || 0, opener: openerOf(post) }, snapshot());
    }

    function setTopic(val, fromChip, keyboard) {
        nav.topic = val; nav.kind = ''; nav.saved = ''; nav.page = 1;
        syncChips(); refreshBody();
        if (fromChip) { if (val && !keyboard) scrollToResults(); return; } // the chip itself is never replaced → focus stays on it
        focusEl(document.getElementById('kcx-h-explore')); scrollToResults(); // the card that was clicked is gone → focus the results heading
    }
    // Opens the cross-tab Saved list from the KC landing (Phase 3A #6).
    function openSaved(kind) {
        nav.topic = ''; nav.q = ''; nav.kind = ''; nav.saved = kind; nav.page = 1;
        syncChips();
        const inp = document.getElementById('kcx-search'); if (inp) inp.value = '';
        const cb = document.querySelector('.kcx-clear'); if (cb) cb.hidden = true;
        refreshBody();
        focusEl(document.getElementById('kcx-h-explore'));
        scrollToResults();
    }
    function onClick(e) {
        const el = e.target && e.target.closest ? e.target.closest('[data-kcx-act]') : null;
        if (!el) return;
        const act = el.getAttribute('data-kcx-act'), val = el.getAttribute('data-kcx-val') || '';
        const keyboard = e.detail === 0; // a click generated by Enter/Space
        switch (act) {
            case 'topic': setTopic(val, el.classList.contains('kcx-chip'), keyboard); break;
            case 'kind': nav.kind = val; nav.page = 1; refreshBody(); focusEl(document.querySelector('.kcx-seg-btn[data-kcx-val="' + attrEsc(val) + '"]')); break;
            case 'saved': openSaved(val); break;
            case 'scope-kc': { // legacy tab search → the whole Knowledge Center landing search (keeps what was typed)
                const q = (state.kcSearch || '').trim();
                resetCtx(); nav.q = q; nav.stack = []; state.kcDetail = null;
                nav.post = { scrollY: 0 };
                render();
                requestAnimationFrame(() => focusEl(document.getElementById('kcx-search')));
                break;
            }
            case 'scope-global': { // → Global Search page, pre-filled with the current text (existing state.searchQuery)
                const q = ((nav.view === 'browse' ? state.kcSearch : nav.q) || '').trim();
                state.searchQuery = q; changePage('searchPage'); break;
            }
            // "All topics" (Phase 3A #7): clears the topic/saved-list filter ONLY.
            // An active search query is deliberately preserved — this is NOT the
            // same as landing() (the breadcrumb's full root-reset, above in
            // exploreCrumb()). If a query remains, exploring() stays true and the
            // results grid re-renders unfiltered by topic; otherwise this falls
            // all the way back to the topic-cards landing body.
            case 'reset': {
                nav.topic = ''; nav.kind = ''; nav.saved = ''; nav.page = 1;
                syncChips();
                refreshBody();
                if (exploring()) {
                    focusEl(document.getElementById('kcx-h-explore'));
                    scrollToResults();
                } else {
                    focusEl(document.getElementById('kcx-h-topics'));
                    const chips = document.querySelector('.kcx-chips-wrap'); if (chips) chips.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
                }
                break;
            }
            case 'clear': {
                nav.q = ''; nav.page = 1;
                const inp = document.getElementById('kcx-search'); if (inp) { inp.value = ''; inp.focus(); }
                const cb = document.querySelector('.kcx-clear'); if (cb) cb.hidden = true;
                noteCleared(); refreshBody(); break;
            }
            case 'browse': goBrowse(val); break;
            case 'landing': landing(); break;
            case 'back': back(); break;
            case 'reading': prefs.reading = !prefs.reading; persistReading(); setReadingDom(); break;
            case 'size': prefs.size = clampSize(prefs.size + (parseInt(val, 10) || 0) * 0.1); persistReading(); setReadingDom(); break;
        }
    }
    let inputTimer = null;
    function onInput(e) {
        const el = e.target;
        if (!el || el.id !== 'kcx-search') return;
        nav.q = el.value; nav.page = 1;
        if (nav.saved) nav.saved = ''; // typing a search exits the Saved-only view
        const cb = document.querySelector('.kcx-clear'); if (cb) cb.hidden = !nav.q;
        clearTimeout(inputTimer);
        inputTimer = setTimeout(refreshBody, 110);
    }
    function onKey(e) {
        if (e.key === 'Escape' && e.target && e.target.id === 'kcx-search' && nav.q) {
            e.preventDefault();
            nav.q = ''; nav.page = 1; e.target.value = '';
            const cb = document.querySelector('.kcx-clear'); if (cb) cb.hidden = true;
            noteCleared(); refreshBody();
        }
    }
    if (!window.__kcxBound) {
        window.__kcxBound = true;
        document.addEventListener('click', onClickCapture, true);
        document.addEventListener('click', onClick);
        document.addEventListener('input', onInput);
        document.addEventListener('keydown', onKey);
    }
})();
