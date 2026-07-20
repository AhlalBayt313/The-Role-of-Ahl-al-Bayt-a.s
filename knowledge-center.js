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
    if (tab==='fatwa' && state.kcFatwaMarja) {
        items = items.filter(x => x.marja === state.kcFatwaMarja);
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
function searchKnowledgeCenter(q) {
    if (!q) return [];
    const lower = q.toLowerCase();
    const l = state.language;
    const results = [];
    ['hadith','masail','qa','fatwa'].forEach(tab => {
        const cfg = kcTabConfig(tab);
        if (!cfg.items) return;
        const meta = kcTabMeta(tab);
        cfg.items.forEach(item => {
            const hay = [
                item.textBn,item.textEn,item.questionBn,item.questionEn,
                item.answerBn,item.answerEn,item.sourceBn,item.sourceEn,
                item.narratorBn,item.narratorEn
            ].filter(Boolean).join(' ').toLowerCase();
            if (hay.includes(lower)) {
                results.push({
                    title: kcItemTitle(tab, item, l),
                    subtitle: l==='bn' ? (meta.bn) : (meta.en),
                    icon: meta.icon,
                    color: meta.color,
                    type: l==='bn' ? meta.bn : meta.en,
                    action: 'kcOpenDetail',
                    param: tab,
                    param2: item.id,
                });
            }
        });
    });
    return results;
}

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
            return `<button data-action="${p.action}" data-param="${p.param??''}" class="hover:underline focus:outline-none" style="color:#059669">${sanitize(p.label)}</button><span aria-hidden="true">/</span>`;
        }).join('')}
    </nav>`;
}

function kcSimulateLoad() {
    state.kcLoading = true;
    clearTimeout(window._kcLoadTimer);
    window._kcLoadTimer = setTimeout(() => { state.kcLoading = false; render(); }, 260);
}

function kcUpdateSeoSchema(tab) {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('kc-faq-schema');
    if (tab !== 'qa' && tab !== 'masail') {
        if (existing) existing.remove();
        return;
    }
    const l = state.language;
    const items = kcFilteredItems(tab).slice(0, 12);
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
    return `
    <nav aria-label="${l==='bn'?'পেজিনেশন':'Pagination'}" class="flex flex-wrap items-center justify-center gap-2 pt-4 reveal">
        <button data-action="kcSetPage" data-param="${Math.max(1,currentPage-1)}" ${currentPage===1?'disabled':''}
            aria-label="${l==='bn'?'পূর্ববর্তী পৃষ্ঠা':'Previous page'}"
            style="width:34px;height:34px;border-radius:10px;font-weight:700;font-size:12px;
            background:${d?'#1e2a22':'#ffffff'};border:1.5px solid ${d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'};
            color:${currentPage===1?(d?'#4b5563':'#d1d5db'):(d?'#e5e7eb':'#111827')};cursor:${currentPage===1?'default':'pointer'}">‹</button>
        ${pages.map(p=>`
        <button data-action="kcSetPage" data-param="${p}"
            aria-label="${l==='bn'?`পৃষ্ঠা ${p}`:`Page ${p}`}" aria-current="${p===currentPage?'page':'false'}"
            style="min-width:34px;height:34px;padding:0 10px;border-radius:10px;font-weight:700;font-size:12.5px;
            background:${p===currentPage?'linear-gradient(135deg,#059669,#065f46)':(d?'#1e2a22':'#ffffff')};
            color:${p===currentPage?'#fff':(d?'#e5e7eb':'#111827')};
            border:1.5px solid ${p===currentPage?'transparent':(d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)')};cursor:pointer">${p}</button>`).join('')}
        <button data-action="kcSetPage" data-param="${Math.min(totalPages,currentPage+1)}" ${currentPage===totalPages?'disabled':''}
            aria-label="${l==='bn'?'পরবর্তী পৃষ্ঠা':'Next page'}"
            style="width:34px;height:34px;border-radius:10px;font-weight:700;font-size:12px;
            background:${d?'#1e2a22':'#ffffff'};border:1.5px solid ${d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'};
            color:${currentPage===totalPages?(d?'#4b5563':'#d1d5db'):(d?'#e5e7eb':'#111827')};cursor:${currentPage===totalPages?'default':'pointer'}">›</button>
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
// CARD
// ---------------------------------------------------------------------------
function kcCard(tab, item, d, l, pi) {
    const meta = kcTabMeta(tab);
    const cfg = kcTabConfig(tab);
    const title = kcItemTitle(tab, item, l);
    const body = kcItemBody(tab, item, l);
    const bookmarked = typeof isBookmarked==='function' && isBookmarked(item.id, cfg.bookmarkType);
    const favorited = isKcFavorite(item.id, cfg.bookmarkType);
    const sampleBadge = item.sample ? `
        <span style="font-size:.65rem;font-weight:800;padding:2px 9px;border-radius:50px;
            background:rgba(220,38,38,.12);color:#dc2626;border:1px solid rgba(220,38,38,.25)">
            ${l==='bn'?'নমুনা':'Sample'}
        </span>` : '';

    return `
    <article class="card-luxury border flex flex-col reveal" style="background:${d?'#1e2a22':'#ffffff'};
        border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--shadow-sm);
        animation:fadeInUp .35s ease-out ${(pi%9)*.04}s both">
        <div style="height:3px;background:${meta.color};border-radius:var(--r-lg) var(--r-lg) 0 0;flex-shrink:0"></div>
        <div class="p-4 flex flex-col flex-1 gap-2.5">
            <div class="flex items-center justify-between gap-2">
                <span style="font-size:.68rem;font-weight:800;padding:3px 10px;border-radius:50px;
                    background:${meta.color}18;color:${meta.color}">${meta.icon} ${l==='bn'?meta.bn:meta.en}</span>
                ${sampleBadge}
            </div>
            <h3 class="font-bold text-sm leading-snug line-clamp-3" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(title)}</h3>
            ${body?`<p class="text-xs leading-relaxed line-clamp-2" style="color:${d?'#9ca3af':'#6b7280'}">${sanitize(body)}</p>`:''}
            <div class="flex gap-2 mt-auto pt-1">
                <button data-action="kcOpenDetail" data-param="${tab}" data-param2="${item.id}"
                    style="flex:1;padding:8px;border-radius:12px;font-size:11.5px;font-weight:700;
                    background:linear-gradient(135deg,${meta.color},${meta.color}bb);color:white;border:none;cursor:pointer">
                    ${l==='bn'?'বিস্তারিত':'View'}
                </button>
                <button data-action="toggleBookmark" data-param="${item.id}" data-param2="${cfg.bookmarkType}"
                    aria-label="${l==='bn'?'বুকমার্ক':'Bookmark'}" aria-pressed="${bookmarked}"
                    style="width:34px;border-radius:12px;background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)'};
                    border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'};cursor:pointer;font-size:13px">
                    ${bookmarked?'⭐':'☆'}
                </button>
                <button data-action="kcToggleFavorite" data-param="${item.id}" data-param2="${cfg.bookmarkType}"
                    aria-label="${l==='bn'?'পছন্দ':'Favorite'}" aria-pressed="${favorited}"
                    style="width:34px;border-radius:12px;background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)'};
                    border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'};cursor:pointer;font-size:13px">
                    ${favorited?'❤️':'🤍'}
                </button>
                <button data-action="kcShare" data-param="${tab}" data-param2="${item.id}"
                    aria-label="${l==='bn'?'শেয়ার':'Share'}"
                    style="width:34px;border-radius:12px;background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)'};
                    border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'};cursor:pointer;font-size:12px">📤</button>
            </div>
        </div>
    </article>`;
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
                style="background:${d?'#1e2a22':'#ffffff'};border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};box-shadow:var(--shadow-sm)">
                <div style="font-size:1.7rem;margin-bottom:.4rem">${c.icon}</div>
                <p class="font-bold text-sm leading-snug mb-1" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(l==='bn'?c.bn:c.en)}</p>
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
        fields = `
        <div class="space-y-4">
            ${item.sample?`
            <div class="text-xs font-bold p-3 rounded-xl" style="background:rgba(220,38,38,.08);color:#dc2626;border:1px solid rgba(220,38,38,.2)">
                ${l==='bn'?'⚠️ এটি একটি নমুনা এন্ট্রি। প্রকৃত প্রকাশনার আগে অনুগ্রহ করে সংশ্লিষ্ট মারজার অফিসিয়াল ও যাচাইকৃত সূত্র থেকে প্রকৃত ফতোয়া দিয়ে প্রতিস্থাপন করুন।':'⚠️ This is a sample entry. Please replace it with the actual verified ruling from the Marja\u2019s official source before publishing.'}
            </div>`:''}
            <p class="text-lg font-bold" style="color:${d?'#f3f4f6':'#111827'}">${sanitize(l==='bn'?item.questionBn:(item.questionEn||item.questionBn))}</p>
            <p class="leading-relaxed" style="color:${d?'#d1d5db':'#374151'}">${sanitize(l==='bn'?item.answerBn:(item.answerEn||item.answerBn))}</p>
            <dl class="grid sm:grid-cols-2 gap-3 text-sm pt-2 border-t" style="border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}">
                <div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'মারজা':'Marja'}</dt><dd>${sanitize(catLabel)}</dd></div>
                ${(item.refBn||item.refEn)?`<div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'রেফারেন্স':'Reference'}</dt><dd>${sanitize(l==='bn'?item.refBn:(item.refEn||item.refBn))}</dd></div>`:''}
                ${item.date?`<div><dt class="font-semibold" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'তারিখ':'Date'}</dt><dd>${sanitize(item.date)}</dd></div>`:''}
            </dl>
        </div>`;
    }

    return `
    <div class="space-y-5 page-enter">
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
        <div class="flex flex-wrap gap-2.5 reveal">
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

    // Guard: data file failed to load
    if (typeof kcHadiths==='undefined') return `
    <div class="space-y-6 page-enter">
        <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem)">📚 ${t('knowledgeCenter')}</h1>
        ${kcErrorState(d,l)}
    </div>`;

    if (state.kcDetail) { if (typeof kcUpdateSeoSchema==='function') kcUpdateSeoSchema(null); return renderKcDetailView(); }

    const tab = state.kcTab || 'hadith';
    const meta = kcTabMeta(tab);
    const cfg = kcTabConfig(tab);
    if (typeof kcUpdateSeoSchema==='function') kcUpdateSeoSchema(tab);

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
            onchange="state.kcFatwaMarja=this.value;state.kcCategory=this.value;state.kcPage=1;const r=document.getElementById('kc-results');if(r)r.innerHTML=renderKcResultsInner();"
            style="padding:12px 16px;border-radius:16px;font-size:.85rem;background:${d?'#1e2a22':'#ffffff'};
            border:2px solid ${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.18)'};color:${d?'#f9fafb':'#111827'};outline:none">
            <option value="">${l==='bn'?'সব মারজা':'All Maraji'}</option>
            ${cfg.categories.map(c=>`<option value="${c.key}" ${state.kcFatwaMarja===c.key?'selected':''}>${sanitize(l==='bn'?c.bn:c.en)}</option>`).join('')}
        </select>`;
        return '';
    })();

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
