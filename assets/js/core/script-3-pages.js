
// ============================================================================
// RAMADAN DUA — Special Sectioned Layout
// ============================================================================
function renderRamadanLayout(allDuas, d, l) {
    const ramadanDuas = allDuas.filter(dua => dua.category === 'ramadan');

    // Group definitions — titleBn keyword matching
    const groups = [
        {
            key: 'hilal',
            icon: '🌙',
            labelBn: 'রমজান শুরুর দোয়া',
            labelEn: 'Opening Duas of Ramadan',
            color: '#f97316',
            gradient: 'linear-gradient(135deg,#f97316,#ea580c)',
            keywords: ["চাঁদ দেখার", "ইফতারের", "সেহরির", "প্রতিদিনের সাধারণ"]
        },
        {
            key: 'daily30',
            icon: '📅',
            labelBn: '৩০ দিনের দৈনিক দোয়া',
            labelEn: '30 Daily Duas of Ramadan',
            color: '#059669',
            gradient: 'linear-gradient(135deg,#059669,#047857)',
            keywords: ["দিনের দোয়া"]
        },
        {
            key: 'special',
            icon: '⭐',
            labelBn: 'বিশেষ আমল ও দোয়া',
            labelEn: 'Special Duas & Practices',
            color: '#8b5cf6',
            gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
            keywords: ["কবরবাসীদের", "ইয়া আলিয়্যু", "আবু হামজা", "ইফতিতাহ", "কুরআন মাথায়", "জাওশান আল-কাবির", "জাওশান আল-সাগির", "মুজির", "বিদায়"]
        },
        {
            key: 'qadr',
            icon: '💫',
            labelBn: 'লায়লাতুল কদরের দোয়া',
            labelEn: 'Duas of Laylatul Qadr',
            color: '#c9a227',
            gradient: 'linear-gradient(135deg,#c9a227,#b45309)',
            keywords: ["লায়লাতুল কদর", "কদরের"]
        }
    ];

    // Assign each dua to a group
    function getGroup(dua) {
        const title = dua.titleBn || '';
        // Check special first (Jawshan Kabir has "কদরের" in title but belongs to special)
        if (groups.find(g=>g.key==='special').keywords.some(kw => title.includes(kw))) return 'special';
        for (const g of groups) {
            if (g.key === 'special') continue; // already checked
            if (g.keywords.some(kw => title.includes(kw))) return g.key;
        }
        return 'special';
    }

    const grouped = {};
    groups.forEach(g => grouped[g.key] = []);
    ramadanDuas.forEach(dua => {
        const gk = getGroup(dua);
        grouped[gk].push(dua);
    });

    // Sort daily duas by day number
    grouped['daily30'].sort((a, b) => {
        const numA = parseInt((a.titleBn || '').replace(/[^০-৯0-9]/g, '')) || 0;
        const numB = parseInt((b.titleBn || '').replace(/[^০-৯0-9]/g, '')) || 0;
        return numA - numB;
    });

    function duaCard(dua) {
        const idx = duas.indexOf(dua);
        const gk = getGroup(dua);
        const grp = groups.find(g => g.key === gk);
        const accentColor = grp ? grp.color : '#f97316';
        return `
        <article class="card-luxury border reveal"
            style="background:${d?'#1e2a22':'#ffffff'};
            border-color:${d?'rgba(249,115,22,.18)':'rgba(249,115,22,.12)'};
            box-shadow:var(--app-shadow-sm);overflow:hidden">
            <div style="height:3px;background:${grp?grp.gradient:'linear-gradient(90deg,#f97316,#c9a227)'};border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
            <div class="p-5">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="flex-1">
                        <h3 class="font-bold text-base" style="color:${d?'#f9fafb':'#111827'}">${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}</h3>
                        ${dua.source?`<p class="text-xs mt-0.5" style="color:${d?'#6b7280':'#9ca3af'}">${sanitize(dua.source)}</p>`:''}
                    </div>
                </div>
                <div class="rounded-2xl p-4 mb-4"
                    style="background:${d?'rgba(249,115,22,.07)':'rgba(255,237,213,.6)'};border:1px solid ${d?'rgba(249,115,22,.18)':'rgba(249,115,22,.18)'}">
                    <p class="arabic-text arabic-reveal text-center mb-3" dir="rtl" lang="ar"
                        style="font-size:1.5rem;line-height:2.1;color:${d?'#fb923c':'#9a3412'}">
                        ${sanitize(dua.arabic)}
                    </p>
                    <p class="text-center text-sm leading-relaxed" style="color:${d?'#d1d5db':'#374151'}">${sanitize(l==='bn'?dua.meaningBn:dua.meaningEn)}</p>
                </div>
                <button data-action="readDua" data-param="${idx}"
                    style="font-size:12.5px;font-weight:700;padding:7px 18px;border-radius:50px;
                    background:rgba(249,115,22,.12);color:${d?'#fb923c':'#ea580c'};
                    border:1.5px solid rgba(249,115,22,.28);cursor:pointer;
                    display:inline-flex;align-items:center;gap:6px;transition:all .2s">
                    ${l==='bn'?'আরও পড়ুন':'Read More'}
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                </button>
            </div>
        </article>`;
    }

    // Daily 30 — compact numbered grid cards
    function dailyCard(dua, i) {
        const idx = duas.indexOf(dua);
        const dayNum = i + 1;
        const bn_nums = ['১','২','৩','৪','৫','৬','৭','৮','৯','১০','১১','১২','১৩','১৪','১৫','১৬','১৭','১৮','১৯','২০','২১','২২','২৩','২৪','২৫','২৬','২৭','২৮','২৯','৩০'];
        const displayNum = l==='bn' ? (bn_nums[i]||dayNum) : dayNum;
        return `
        <article class="card-luxury border reveal"
            style="background:${d?'#1a2520':'#f0fdf4'};
            border-color:${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.15)'};
            box-shadow:var(--app-shadow-sm);overflow:hidden;cursor:pointer"
            data-action="readDua" data-param="${idx}">
            <div style="height:2.5px;background:linear-gradient(90deg,#059669,#c9a227);border-radius:4px 4px 0 0"></div>
            <div class="p-4" style="display:flex;align-items:center;gap:14px">
                <div style="flex-shrink:0;width:44px;height:44px;border-radius:50%;
                    background:linear-gradient(135deg,#059669,#047857);
                    display:flex;align-items:center;justify-content:center;
                    box-shadow:0 3px 10px rgba(5,150,105,.3)">
                    <span style="font-size:.95rem;font-weight:800;color:white">${displayNum}</span>
                </div>
                <div style="flex:1;min-width:0">
                    <p class="font-bold text-sm" style="color:${d?'#f9fafb':'#111827'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        ${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}
                    </p>
                    <p class="text-xs mt-0.5 arabic-text" dir="rtl" lang="ar"
                        style="color:${d?'#fb923c':'#9a3412'};font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        ${sanitize(dua.arabic)}
                    </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="${d?'#34d399':'#059669'}" stroke-width="2.5" stroke-linecap="round" style="flex-shrink:0"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
            </div>
        </article>`;
    }

    // Section header
    function sectionHeader(grp, count) {
        return `
        <div class="reveal" style="display:flex;align-items:center;gap:12px;margin:8px 0 4px">
            <div style="width:40px;height:40px;border-radius:14px;
                background:${grp.gradient};
                display:flex;align-items:center;justify-content:center;
                font-size:1.2rem;box-shadow:0 4px 12px rgba(0,0,0,.15);flex-shrink:0">
                ${grp.icon}
            </div>
            <div style="flex:1">
                <h3 style="font-size:1.05rem;font-weight:800;color:${d?'#f9fafb':'#1f2937'};margin:0">
                    ${l==='bn'?grp.labelBn:grp.labelEn}
                </h3>
                <p style="font-size:.75rem;color:${d?'#6b7280':'#9ca3af'};margin:2px 0 0">
                    ${count} ${l==='bn'?'টি দোয়া':'duas'}
                </p>
            </div>
            <div style="flex:1;height:1.5px;background:linear-gradient(90deg,${grp.color},transparent);max-width:120px;border-radius:2px"></div>
        </div>`;
    }

    let html = `<div class="space-y-6">`;

    // 1. রমজান শুরুর দোয়া
    if (grouped['hilal'].length) {
        html += sectionHeader(groups[0], grouped['hilal'].length);
        html += `<div class="space-y-4">` + grouped['hilal'].map(dua => duaCard(dua)).join('') + `</div>`;
    }

    // 2. ৩০ দিনের দৈনিক দোয়া
    if (grouped['daily30'].length) {
        html += sectionHeader(groups[1], grouped['daily30'].length);
        html += `<div class="space-y-2">` + grouped['daily30'].map((dua,i) => dailyCard(dua,i)).join('') + `</div>`;
    }

    // 3. লায়লাতুল কদর
    if (grouped['qadr'].length) {
        html += sectionHeader(groups[3], grouped['qadr'].length);
        html += `<div class="space-y-4">` + grouped['qadr'].map(dua => duaCard(dua)).join('') + `</div>`;
    }

    // 4. বিশেষ দোয়া
    if (grouped['special'].length) {
        html += sectionHeader(groups[2], grouped['special'].length);
        html += `<div class="space-y-4">` + grouped['special'].map(dua => duaCard(dua)).join('') + `</div>`;
    }

    html += `</div>`;
    return html;
}

// ============================================================================
// PAGE: DUA
// ============================================================================
// ============================================================================
// DUA COLLECTION (taxonomy layer #2 — additive, does not touch `category`)
// ============================================================================
// Returns a collection key for a dua. Prefers an explicit `dua.collection`
// field (for newly-tagged entries); otherwise infers from titleEn/titleBn so
// this works immediately for all existing duas without editing 4500+ lines
// of data by hand. Safe to call on any dua object.
const DUA_COLLECTIONS = [
    {key:'all',        icon:'✦', labelBn:'সব',              labelEn:'All'},
    {key:'ahlulbayt',  icon:'👑', labelBn:'আহলে বাইত (আ.)', labelEn:'Ahl al-Bayt'},
    {key:'sahifa',     icon:'📖', labelBn:'সহিফায়ে সাজ্জাদিয়া', labelEn:'Sahifa Sajjadiya'},
    {key:'ramadan',    icon:'🌙', labelBn:'রমজান',           labelEn:'Ramadan'},
    {key:'dailylife',  icon:'🕐', labelBn:'দৈনন্দিন',        labelEn:'Daily Life'},
    {key:'quranic',    icon:'📗', labelBn:'কুরআনিক',        labelEn:'Quranic'},
];

function getDuaCollection(dua) {
    if (dua.collection) return dua.collection;
    const en = (dua.titleEn || '').toLowerCase();
    const bn = dua.titleBn || '';
    if (en.includes('sahifa') || bn.includes('সহিফা')) return 'sahifa';
    if (en.includes('ramadan') || en.includes('laylatul qadr') || bn.includes('রমজান')) return 'ramadan';
    if (en.includes('quran') || bn.includes('কুরআন')) return 'quranic';
    if (dua.category === 'daily' || dua.category === 'morning') return 'dailylife';
    const ahlulBaytKeywords = ['kumayl','tawassul','nudb','mashlool','sabah','arafah','abu hamza',
        'iftitah','jawshan','noor','al-ahd','al-faraj','mujeer'];
    if (ahlulBaytKeywords.some(k => en.includes(k))) return 'ahlulbayt';
    return 'ahlulbayt'; // conservative default — most non-Ramadan/daily duas here are Ahl al-Bayt narrations
}

function renderDuaPage() {
    const d=state.darkMode; const l=state.language;
    const tab = state.duaTab || 'dua';

    // 2026-08-11 (Phase 4): metadata.json now loads async (see
    // duas-data.js), so `duas`/`ziyarats`/`amals` start empty and fill in
    // place once it resolves. duasIndexLoadState distinguishes "still
    // loading" from a genuine load failure, mirroring kcIndexLoadState
    // (Phase 3) / blogPostsLoadState (Phase 1) / quizDataLoadState (Phase 2).
    // Falls back to 'loaded' defensively if duas-data.js somehow didn't run.
    const duasIdxState = (typeof duasIndexLoadState !== 'undefined') ? duasIndexLoadState : 'loaded';

    if (duasIdxState === 'loading' || duasIdxState === 'error') {
        const isError = duasIdxState === 'error';
        const skeletonRow = () => `
        <div class="reveal" style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:14px;
            background:${d?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)'};border:1px solid ${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}">
            <div class="${d?'skeleton-dark':'skeleton'}" style="width:32px;height:32px;border-radius:10px;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
                <div class="${d?'skeleton-dark':'skeleton'}" style="width:55%;height:13px;border-radius:6px;margin-bottom:6px"></div>
                <div class="${d?'skeleton-dark':'skeleton'}" style="width:35%;height:11px;border-radius:6px"></div>
            </div>
        </div>`;
        const tabBtn2 = (key, icon, label, grad) => `
            <button data-action="setDuaTab" data-param="${key}" aria-pressed="${tab===key?'true':'false'}"
                style="padding:9px 22px;border-radius:14px;font-size:.85rem;font-weight:700;cursor:pointer;border:none;transition:all .22s;
                background:${tab===key?grad:'transparent'};color:${tab===key?'white':(d?'#9ca3af':'#6b7280')}">${icon} ${label}</button>`;
        return `
        <div class="space-y-6 page-enter">
            <div class="reveal">
                <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    🤲 ${t('dua')}
                </h1>
                <p class="text-sm mt-1" style="color:${isError?(d?'#f87171':'#dc2626'):(d?'#9ca3af':'#6b7280')}">
                    ${isError
                        ? (l==='bn'?'তথ্য লোড করা যায়নি — পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন':'Could not load content — please refresh and try again')
                        : (l==='bn'?'লোড হচ্ছে...':'Loading...')}
                </p>
            </div>
            <div class="flex gap-2 p-1 rounded-2xl w-fit reveal" style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}">
                ${tabBtn2('dua','🤲', l==='bn'?'দোয়া':'Duas', 'linear-gradient(135deg,#059669,#047857)')}
                ${tabBtn2('ziyarat','☪️', l==='bn'?'যিয়ারত':'Ziyarat', 'linear-gradient(135deg,#b45309,#92400e)')}
                ${tabBtn2('amal','📿', l==='bn'?'আমল':'Amal', 'linear-gradient(135deg,#7c3aed,#5b21b6)')}
            </div>
            ${isError ? `
            <div class="text-center py-16 reveal" style="color:${d?'#f87171':'#dc2626'}">
                <div style="font-size:3.5rem;margin-bottom:1rem;opacity:.7">⚠️</div>
                <p class="font-semibold text-base">${l==='bn'?'তথ্য লোড করা যায়নি — পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন':'Could not load content — please refresh and try again'}</p>
            </div>` : `
            <div class="space-y-2" aria-hidden="true" aria-busy="true">
                ${Array.from({length:6}).map(()=>skeletonRow()).join('')}
            </div>`}
        </div>`;
    }

    const selectedCategory = state.duaCategory || 'all';
    const selectedCollection = state.duaCollection || 'all';
    const allDuas    = [...state.customDuas,...duas];
    const allZiyarat = [...ziyarats,...state.customZiyarat];
    const filteredDuas = allDuas
        .filter(dua => selectedCategory==='all'   || dua.category===selectedCategory)
        .filter(dua => selectedCollection==='all' || getDuaCollection(dua)===selectedCollection);

    const catFilters=[
        {key:'all',     icon:'✦', label:l==='bn'?'সকল দোয়া':'All Duas',   color:'#059669', bg:'rgba(5,150,105,.15)'},
        {key:'morning', icon:'🌅', label:l==='bn'?'সকাল':'Morning',         color:'#0ea5e9', bg:'rgba(14,165,233,.15)'},
        {key:'night',   icon:'🌙', label:l==='bn'?'রাত':'Night',             color:'#8b5cf6', bg:'rgba(139,92,246,.15)'},
        {key:'hardship',icon:'⚠️', label:l==='bn'?'বিপদে':'Hardship',       color:'#ef4444', bg:'rgba(239,68,68,.15)'},
        {key:'gratitude',icon:'🙏',label:l==='bn'?'কৃতজ্ঞতা':'Gratitude',  color:'#10b981', bg:'rgba(16,185,129,.15)'},
        {key:'daily',    icon:'🕐', label:l==='bn'?'দৈনন্দিন':'Daily Life',   color:'#6366f1', bg:'rgba(99,102,241,.15)'},
        {key:'special-days',icon:'📅',label:l==='bn'?'সাপ্তাহিক':'Weekly', color:'#0891b2', bg:'rgba(8,145,178,.15)'},
        {key:'ramadan', icon:'🌙', label:l==='bn'?'রমজান':'Ramadan',         color:'#f97316', bg:'rgba(249,115,22,.15)'},
    ];

    // NEW: Ziyarat category filter — person-based (12 Imams / Masumeen) plus
    // occasion-based (comprehensive/Jami'a-type) buckets, per user's request
    // to add ziyarat categories and organize the tab by them.
    const selectedZiyaratCategory = state.ziyaratCategory || 'all';
    const ziyaratCatFilters=[
        {key:'all',          icon:'✦', label:l==='bn'?'সকল যিয়ারত':'All Ziyarat',        color:'#b45309'},
        {key:'imams',        icon:'👑', label:l==='bn'?'১২ ইমাম':'The 12 Imams',           color:'#7c3aed'},
        {key:'masumeen',     icon:'🌹', label:l==='bn'?'মাসুম (আ.)':'Masumeen (a.s)',      color:'#db2777'},
        {key:'comprehensive',icon:'📜', label:l==='bn'?'জামে/সার্বজনীন':'Comprehensive',   color:'#0ea5e9'},
    ];
    const ziyaratCatOrder=['imams','masumeen','comprehensive'];
    const ziyaratCatGroupLabel={
        imams:        {bn:'👑 ১২ ইমাম এর যিয়ারত', en:'👑 Ziyarat of the 12 Imams'},
        masumeen:     {bn:'🌹 মাসুম (আ.)',          en:'🌹 Masumeen (a.s)'},
        comprehensive:{bn:'📜 জামে/সার্বজনীন',      en:'📜 Comprehensive'},
    };

    // FIX: Amal tab — the backend (state, data loader, editor, reader page,
    // search) was fully wired up for Amal as a third content type, but the
    // tab switcher itself was never given an Amal button/panel, so the tab
    // was effectively invisible. This restores it, mirroring the dua tab's
    // flat-list + category-filter layout.
    const allAmals = [...(typeof amals!=='undefined'?amals:[]), ...state.customAmal];
    const selectedAmalCategory = state.amalCategory || 'all';
    const amalCatFilters=[
        {key:'all',    icon:'✦', label:l==='bn'?'সকল আমল':'All Amal',     color:'#7c3aed', bg:'rgba(124,58,237,.15)'},
        {key:'daily',  icon:'🕐', label:l==='bn'?'দৈনন্দিন':'Daily',       color:'#6366f1', bg:'rgba(99,102,241,.15)'},
        {key:'weekly', icon:'📅', label:l==='bn'?'সাপ্তাহিক':'Weekly',    color:'#0891b2', bg:'rgba(8,145,178,.15)'},
        {key:'ramadan',icon:'🌙', label:l==='bn'?'রমজান':'Ramadan',       color:'#f97316', bg:'rgba(249,115,22,.15)'},
        {key:'special',icon:'⭐', label:l==='bn'?'বিশেষ':'Special',       color:'#db2777', bg:'rgba(219,39,119,.15)'},
    ];
    const filteredAmals = allAmals
        .filter(a => selectedAmalCategory==='all' || a.category===selectedAmalCategory);
    // Bug-safety: readZiyarat falls back to ziyarats[parseInt(param)] for
    // built-in entries (which carry no `id`), relying on the item's ORIGINAL
    // position in allZiyarat/ziyarats. Filtering/grouping must not lose that
    // original index, so every item is tagged with its true `idx` up front.
    const indexedZiyarat = allZiyarat.map((z,idx)=>({z,idx}));
    const filteredZiyarat = indexedZiyarat
        .filter(({z}) => selectedZiyaratCategory==='all' || z.category===selectedZiyaratCategory);
    // When showing "all", group entries by category (12 Imams → Masumeen →
    // Comprehensive) instead of raw array order.
    const groupedZiyarat = selectedZiyaratCategory==='all'
        ? ziyaratCatOrder
            .map(cat => ({cat, items:filteredZiyarat.filter(({z})=>z.category===cat)}))
            .filter(g => g.items.length>0)
        : [{cat:selectedZiyaratCategory, items:filteredZiyarat}];

    return `
    <div class="space-y-6 page-enter">

        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center gap-3 reveal">
            <div>
                <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    🤲 ${t('dua')}
                </h1>
                <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">
                    ${l==='bn'?`${allDuas.length} দোয়া · ${allZiyarat.length} যিয়ারত · ${allAmals.length} আমল`:`${allDuas.length} Duas · ${allZiyarat.length} Ziyarat · ${allAmals.length} Amal`}
                </p>
            </div>
            ${state.isAdmin?`
            <div class="flex gap-2 flex-wrap">
                ${tab==='dua'?`
                <button data-action="openDuaEditor" data-param="dua"
                    style="font-size:12.5px;font-weight:700;padding:9px 18px;border-radius:50px;
                    background:linear-gradient(135deg,#059669,#047857);color:white;border:none;
                    cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(5,150,105,.38)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    ${l==='bn'?'নতুন দোয়া':'Add Dua'}
                </button>`:''}
                ${tab==='ziyarat'?`
                <button data-action="openDuaEditor" data-param="ziyarat"
                    style="font-size:12.5px;font-weight:700;padding:9px 18px;border-radius:50px;
                    background:linear-gradient(135deg,#b45309,#92400e);color:white;border:none;
                    cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(180,83,9,.38)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    ${l==='bn'?'নতুন যিয়ারত':'Add Ziyarat'}
                </button>`:''}
                ${tab==='amal'?`
                <button data-action="openDuaEditor" data-param="amal"
                    style="font-size:12.5px;font-weight:700;padding:9px 18px;border-radius:50px;
                    background:linear-gradient(135deg,#7c3aed,#5b21b6);color:white;border:none;
                    cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(124,58,237,.38)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    ${l==='bn'?'নতুন আমল':'Add Amal'}
                </button>`:''}
            </div>`:''
        }
        </div>

        <!-- Tab switcher -->
        <div class="flex gap-2 p-1 rounded-2xl w-fit reveal"
            style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}">
            <button data-action="setDuaTab" data-param="dua" aria-pressed="${tab==='dua'?'true':'false'}"
                style="padding:9px 22px;border-radius:14px;font-size:.85rem;font-weight:700;
                cursor:pointer;transition:all .22s;border:none;
                background:${tab==='dua'?'linear-gradient(135deg,#059669,#047857)':'transparent'};
                color:${tab==='dua'?'white':(d?'#9ca3af':'#6b7280')};
                box-shadow:${tab==='dua'?'0 4px 14px rgba(5,150,105,.38)':'none'}">
                🤲 ${l==='bn'?'দোয়া':'Duas'}
                <span style="font-size:.7rem;opacity:.75;margin-left:4px">${allDuas.length}</span>
            </button>
            <button data-action="setDuaTab" data-param="ziyarat" aria-pressed="${tab==='ziyarat'?'true':'false'}"
                style="padding:9px 22px;border-radius:14px;font-size:.85rem;font-weight:700;
                cursor:pointer;transition:all .22s;border:none;
                background:${tab==='ziyarat'?'linear-gradient(135deg,#b45309,#92400e)':'transparent'};
                color:${tab==='ziyarat'?'white':(d?'#9ca3af':'#6b7280')};
                box-shadow:${tab==='ziyarat'?'0 4px 14px rgba(180,83,9,.35)':'none'}">
                ☪️ ${l==='bn'?'যিয়ারত':'Ziyarat'}
                <span style="font-size:.7rem;opacity:.75;margin-left:4px">${allZiyarat.length}</span>
            </button>
            <button data-action="setDuaTab" data-param="amal" aria-pressed="${tab==='amal'?'true':'false'}"
                style="padding:9px 22px;border-radius:14px;font-size:.85rem;font-weight:700;
                cursor:pointer;transition:all .22s;border:none;
                background:${tab==='amal'?'linear-gradient(135deg,#7c3aed,#5b21b6)':'transparent'};
                color:${tab==='amal'?'white':(d?'#9ca3af':'#6b7280')};
                box-shadow:${tab==='amal'?'0 4px 14px rgba(124,58,237,.38)':'none'}">
                📿 ${l==='bn'?'আমল':'Amal'}
                <span style="font-size:.7rem;opacity:.75;margin-left:4px">${allAmals.length}</span>
            </button>
        </div>

        <!-- Category filter (dua tab only) — collapsed to a single row on
             2026-07-19; the second "collection" row (আহলে বাইত/সহিফা/কুরআনিক
             etc.) was removed from the UI per request. selectedCollection
             stays at its default 'all' now, so filteredDuas' collection
             filter is a no-op — harmless, and easy to re-enable later if a
             single merged row is wanted instead of a full removal. -->
        ${tab==='dua'?`
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 1px 6px">
            <div style="display:flex;gap:7px;width:max-content">
                ${catFilters.map(f=>{
                    const isActive=selectedCategory===f.key;
                    return `<button data-action="setDuaCategory" data-param="${f.key}" aria-pressed="${isActive?'true':'false'}"
                        style="flex-shrink:0;font-size:11.5px;font-weight:700;padding:6px 16px;border-radius:50px;
                        cursor:pointer;white-space:nowrap;transition:all .18s;
                        background:${isActive?f.color:(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)')};
                        color:${isActive?'#fff':(d?'#9ca3af':'#6b7280')};
                        border:1.5px solid ${isActive?f.color:(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')}">
                        ${f.icon} ${f.label}
                    </button>`;
                }).join('')}
            </div>
        </div>`:''}

        <!-- Category filter (ziyarat tab only) -->
        ${tab==='ziyarat'?`
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 1px 6px">
            <div style="display:flex;gap:7px;width:max-content">
                ${ziyaratCatFilters.map(f=>{
                    const isActive=selectedZiyaratCategory===f.key;
                    return `<button data-action="setZiyaratCategory" data-param="${f.key}" aria-pressed="${isActive?'true':'false'}"
                        style="flex-shrink:0;font-size:11.5px;font-weight:700;padding:6px 16px;border-radius:50px;
                        cursor:pointer;white-space:nowrap;transition:all .18s;
                        background:${isActive?f.color:(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)')};
                        color:${isActive?'#fff':(d?'#9ca3af':'#6b7280')};
                        border:1.5px solid ${isActive?f.color:(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')}">
                        ${f.icon} ${f.label}
                    </button>`;
                }).join('')}
            </div>
        </div>`:''}

        <!-- Category filter (amal tab only) -->
        ${tab==='amal'?`
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 1px 6px">
            <div style="display:flex;gap:7px;width:max-content">
                ${amalCatFilters.map(f=>{
                    const isActive=selectedAmalCategory===f.key;
                    return `<button data-action="setAmalCategory" data-param="${f.key}" aria-pressed="${isActive?'true':'false'}"
                        style="flex-shrink:0;font-size:11.5px;font-weight:700;padding:6px 16px;border-radius:50px;
                        cursor:pointer;white-space:nowrap;transition:all .18s;
                        background:${isActive?f.color:(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)')};
                        color:${isActive?'#fff':(d?'#9ca3af':'#6b7280')};
                        border:1.5px solid ${isActive?f.color:(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')}">
                        ${f.icon} ${f.label}
                    </button>`;
                }).join('')}
            </div>
        </div>`:''}

        <!-- DUA TAB content -->
        ${tab==='dua'?`
        <div class="space-y-2">
            ${filteredDuas.length===0?`
            <div class="text-center py-16" style="color:${d?'#6b7280':'#9ca3af'}">
                <div style="font-size:3rem;margin-bottom:.75rem">🤲</div>
                <p class="font-semibold">${l==='bn'?'কোনো দোয়া নেই':'No duas yet'}</p>
            </div>`:
            selectedCategory==='ramadan'
            ? renderRamadanLayout(allDuas, d, l)
            :
            filteredDuas.map((dua,i)=>{
                // Bug fix: presence of dua.id does NOT mean user-created —
                // built-in duas in duas-data.js also carry an id for
                // identification. "Custom" must mean it actually lives in
                // state.customDuas (the user-added collection).
                const isCustom = dua.id!=null && state.customDuas.some(x=>x.id===dua.id);
                // Bug #8 fix: `i` is the position in filteredDuas (which may be a
                // category-filtered subset). When a non-custom dua is opened via
                // readDua, the param must be its index in the global `duas[]` array,
                // not its position in the filtered list. Using `duas.indexOf(dua)`
                // gives the correct stable index regardless of any active filter.
                const idx=isCustom?('c'+dua.id):duas.indexOf(dua);
                // Compact row style ("ক"): background/border tinted per the dua's own
                // category color, reusing the existing catFilters color/bg values
                // (same palette as the category filter chips above) so no new color
                // system is introduced. Falls back to the "all" entry's colors.
                const catInfo = catFilters.find(f=>f.key===dua.category) || catFilters[0];
                return `
                <div class="reveal" data-action="readDua" data-param="${idx}"
                    style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:14px;cursor:pointer;
                    background:${d?catInfo.color+'22':catInfo.bg};border:1px solid ${catInfo.color}${d?'55':'40'};transition:all .18s">
                    <div style="flex-shrink:0;width:32px;height:32px;border-radius:10px;
                        background:${catInfo.color};display:flex;align-items:center;justify-content:center;font-size:14px">
                        ${catInfo.icon}
                    </div>
                    <div style="flex:1;min-width:0">
                        <div class="flex items-center gap-1.5 flex-wrap" style="margin-bottom:1px">
                            ${isCustom?`<span class="${d?'gold-badge-dark':'gold-badge'}" style="font-size:9px;padding:1px 6px">${l==='bn'?'কাস্টম':'Custom'}</span>`:''}
                            <p class="font-bold" style="font-size:13.5px;color:${d?'#f9fafb':'#111827'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}</p>
                        </div>
                        <p class="arabic-text" dir="rtl" lang="ar" style="font-size:12px;color:${d?'#9ca3af':'#6b7280'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(dua.arabic)}</p>
                    </div>
                    ${state.isAdmin&&isCustom?`
                    <div class="flex gap-1 flex-shrink-0" onclick="event.stopPropagation()">
                        <button data-action="editCustomDua" data-param="${dua.id}" data-dtype="dua"
                            aria-label="${l==='bn'?'সম্পাদনা করুন':'Edit'} ${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}"
                            style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;background:${d?'rgba(59,130,246,.15)':'rgba(59,130,246,.1)'};border:1px solid rgba(59,130,246,.25);color:${d?'#93c5fd':'#1d4ed8'}">✏️</button>
                        <button data-action="deleteCustomDua" data-param="${dua.id}" data-dtype="dua"
                            aria-label="${l==='bn'?'মুছুন':'Delete'} ${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}"
                            style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);color:#ef4444">🗑</button>
                    </div>`:''}
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="${catInfo.color}" stroke-width="2.3" stroke-linecap="round" style="flex-shrink:0" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                </div>`;
            }).join('')}
        </div>`:''}

        <!-- ZIYARAT TAB content — grouped by category (12 Imams → Masumeen →
             Comprehensive) per user's request to organize ziyarat by category -->
        ${tab==='ziyarat'?`
        <div class="space-y-6">
            ${filteredZiyarat.length===0?`
            <div class="text-center py-16" style="color:${d?'#6b7280':'#9ca3af'}">
                <div style="font-size:3rem;margin-bottom:.75rem">☪️</div>
                <p class="font-semibold text-lg mb-1">${l==='bn'?'কোনো যিয়ারত নেই':'No Ziyarat yet'}</p>
                ${state.isAdmin?`<p class="text-sm">${l==='bn'?'উপরের বাটন থেকে যিয়ারত যোগ করুন':'Use the button above to add Ziyarat'}</p>`:''}
            </div>`:
            groupedZiyarat.map(group=>`
            <div class="space-y-2">
                ${selectedZiyaratCategory==='all'?`
                <h3 class="font-bold text-sm" style="color:${d?'#fbbf24':'#92400e'}">
                    ${l==='bn'?ziyaratCatGroupLabel[group.cat].bn:ziyaratCatGroupLabel[group.cat].en}
                    <span style="font-size:.7rem;font-weight:600;opacity:.7;margin-left:4px">${group.items.length}</span>
                </h3>`:''}
                ${group.items.map(({z,idx})=>{
                    // Compact row style ("ক"): background/border tinted per the
                    // ziyarat's own category color, reusing ziyaratCatFilters'
                    // existing color values (same palette as the ziyarat category
                    // chips above). ziyaratCatFilters has no separate `bg` field
                    // (unlike catFilters), so the tint is derived here by appending
                    // a hex alpha suffix to the same color — no new palette added.
                    const zCatInfo = ziyaratCatFilters.find(f=>f.key===z.category) || ziyaratCatFilters[0];
                    return `
                <div class="reveal" data-action="readZiyarat" data-param="${z.id||idx}"
                    style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:14px;cursor:pointer;
                    background:${zCatInfo.color}${d?'22':'1a'};border:1px solid ${zCatInfo.color}${d?'55':'40'};transition:all .18s">
                    <div style="flex-shrink:0;width:32px;height:32px;border-radius:10px;
                        background:${zCatInfo.color};display:flex;align-items:center;justify-content:center;font-size:14px">
                        ${zCatInfo.icon}
                    </div>
                    <div style="flex:1;min-width:0">
                        <p class="font-bold" style="font-size:13.5px;color:${d?'#f9fafb':'#111827'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(l==='bn'?z.titleBn:z.titleEn)}</p>
                        <p class="arabic-text" dir="rtl" lang="ar" style="font-size:12px;color:${d?'#9ca3af':'#6b7280'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(z.arabic)}</p>
                    </div>
                    ${state.isAdmin?`
                    <div class="flex gap-1 flex-shrink-0" onclick="event.stopPropagation()">
                        <button data-action="editCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                            aria-label="${l==='bn'?'সম্পাদনা করুন':'Edit'} ${sanitize(l==='bn'?z.titleBn:z.titleEn)}"
                            style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;background:${d?'rgba(59,130,246,.15)':'rgba(59,130,246,.1)'};border:1px solid rgba(59,130,246,.25)">✏️</button>
                        <button data-action="deleteCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                            aria-label="${l==='bn'?'মুছুন':'Delete'} ${sanitize(l==='bn'?z.titleBn:z.titleEn)}"
                            style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2)">🗑</button>
                    </div>`:''}
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="${zCatInfo.color}" stroke-width="2.3" stroke-linecap="round" style="flex-shrink:0" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                </div>`;}).join('')}
            </div>`).join('')}
        </div>`:''}

        <!-- AMAL TAB content -->
        ${tab==='amal'?`
        <div class="space-y-2">
            ${filteredAmals.length===0?`
            <div class="text-center py-16" style="color:${d?'#6b7280':'#9ca3af'}">
                <div style="font-size:3rem;margin-bottom:.75rem">📿</div>
                <p class="font-semibold">${l==='bn'?'কোনো আমল নেই':'No Amal yet'}</p>
            </div>`:
            filteredAmals.map((a,i)=>{
                const isCustom = a.id!=null && state.customAmal.some(x=>x.id===a.id);
                const catInfo = amalCatFilters.find(f=>f.key===a.category) || amalCatFilters[0];
                return `
                <div class="reveal" data-action="readAmal" data-param="${a.id!=null?a.id:i}"
                    style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:14px;cursor:pointer;
                    background:${d?catInfo.color+'22':catInfo.bg};border:1px solid ${catInfo.color}${d?'55':'40'};transition:all .18s">
                    <div style="flex-shrink:0;width:32px;height:32px;border-radius:10px;
                        background:${catInfo.color};display:flex;align-items:center;justify-content:center;font-size:14px">
                        ${catInfo.icon}
                    </div>
                    <div style="flex:1;min-width:0">
                        <div class="flex items-center gap-1.5 flex-wrap" style="margin-bottom:1px">
                            ${isCustom?`<span class="${d?'gold-badge-dark':'gold-badge'}" style="font-size:9px;padding:1px 6px">${l==='bn'?'কাস্টম':'Custom'}</span>`:''}
                            <p class="font-bold" style="font-size:13.5px;color:${d?'#f9fafb':'#111827'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(l==='bn'?a.titleBn:a.titleEn)}</p>
                        </div>
                        <p style="font-size:12px;color:${d?'#9ca3af':'#6b7280'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(a.occasion||'')}</p>
                    </div>
                    ${state.isAdmin&&isCustom?`
                    <div class="flex gap-1 flex-shrink-0" onclick="event.stopPropagation()">
                        <button data-action="editCustomDua" data-param="${a.id}" data-dtype="amal"
                            aria-label="${l==='bn'?'সম্পাদনা করুন':'Edit'} ${sanitize(l==='bn'?a.titleBn:a.titleEn)}"
                            style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;background:${d?'rgba(124,58,237,.15)':'rgba(124,58,237,.1)'};border:1px solid rgba(124,58,237,.25);color:${d?'#c4b5fd':'#5b21b6'}">✏️</button>
                        <button data-action="deleteCustomDua" data-param="${a.id}" data-dtype="amal"
                            aria-label="${l==='bn'?'মুছুন':'Delete'} ${sanitize(l==='bn'?a.titleBn:a.titleEn)}"
                            style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);color:#ef4444">🗑</button>
                    </div>`:''}
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="${catInfo.color}" stroke-width="2.3" stroke-linecap="round" style="flex-shrink:0" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                </div>`;
            }).join('')}
        </div>`:''}

    </div>`;
}
// ============================================================================
// PAGE: CALENDAR
// ============================================================================
function renderCalendarPage() {
    const d=state.darkMode; const l=state.language;
    const {hijriMonth:month,hijriYear:year}=calState;
    const totalDays=getHijriMonthDays(month,year);
    const startDay=getHijriStartDay(month,year);
    const monthNameHijri=l==='bn'?hijriMonthsBn[month-1]:hijriMonthsEn[month-1];
    const dayHdrsEn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayHdrsBn=['রবি','সোম','মঙ্গল','বুধ','বৃহ','শুক্র','শনি'];

    const gregMonthsEn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const gregMonthsEnFull=['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Header subtitle: Gregorian range
    const gregFirst=hijriToGregorian(1,month,year);
    const gregLast=hijriToGregorian(totalDays,month,year);
    const gf=gregFirst, gl=gregLast;
    const gregRange = gf.getMonth()===gl.getMonth()
        ? `${gf.getDate()}–${gl.getDate()} ${gregMonthsEnFull[gf.getMonth()]} ${gl.getFullYear()}`
        : `${gf.getDate()} ${gregMonthsEn[gf.getMonth()]} – ${gl.getDate()} ${gregMonthsEn[gl.getMonth()]} ${gl.getFullYear()}`;
    const gregRangeBn = (()=>{
        const bf=getBanglaDateFull(gf), bl=getBanglaDateFull(gl);
        if(bf.month===bl.month)
            return toBengaliDigits(bf.day)+'–'+toBengaliDigits(bl.day)+' '+banglaMonthNames[bf.month]+' '+toBengaliDigits(bl.year);
        return toBengaliDigits(bf.day)+' '+banglaMonthNames[bf.month]+' – '+toBengaliDigits(bl.day)+' '+banglaMonthNames[bl.month]+' '+toBengaliDigits(bl.year);
    })();

    const todayGreg=new Date();
    const todayH=approxHijriNow();

    let cells=[];
    for(let i=0;i<startDay;i++) cells.push(null);
    for(let i=1;i<=totalDays;i++) cells.push(i);

    // Color scheme (like the photo):
    // Hijri (top-right small)  → RED   (#dc2626)
    // Gregorian (center big)   → BLACK/WHITE (main)
    // Bangla (bottom-right sm) → BLUE  (#1d4ed8) / PURPLE for Sat
    // Friday → Red column
    // Saturday → Blue column
    // Today → orange badge (like the "05" tag in photo)

    return `
    <div class="space-y-6">
        <h1 class="text-3xl font-bold">📅 ${t('calendar')}</h1>
        <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-200'} border rounded-2xl overflow-hidden" style="box-shadow:0 4px 24px rgba(0,0,0,.10)" role="group" aria-label="${monthNameHijri} ${l==='bn'?toBengaliDigits(year):year} ${l==='bn'?'হিজরি ক্যালেন্ডার':'Hijri calendar'}">

            <!-- ── HEADER ── -->
            <div style="background:${d?'#1e3a2f':'#166534'}" class="px-5 py-4 flex items-center justify-between">
                <button data-action="calPrev" aria-label="${l==='bn'?'পূর্ববর্তী মাস':'Previous month'}"
                    class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xl text-white hover:bg-white/20 transition-all focus:outline-none"
                    style="background:rgba(255,255,255,.15)">‹</button>
                <div class="text-center text-white">
                    <h2 class="text-xl font-black tracking-wide">${monthNameHijri} ${l==='bn'?toBengaliDigits(year):year} ${l==='bn'?'হিজরি':'AH'}</h2>
                    <p style="font-size:.75rem;opacity:.8;margin-top:2px">${l==='bn'?gregRangeBn:gregRange}</p>
                    ${l==='bn'?`<p style="font-size:.68rem;opacity:.65;margin-top:1px">${gregRange}</p>`:""}
                </div>
                <button data-action="calNext" aria-label="${l==='bn'?'পরবর্তী মাস':'Next month'}"
                    class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xl text-white hover:bg-white/20 transition-all focus:outline-none"
                    style="background:rgba(255,255,255,.15)">›</button>
            </div>

            <!-- ── DAY HEADERS ── -->
            <div class="grid grid-cols-7" role="row" style="background:${d?'#111827':'#f1f5f9'}">
                ${[0,1,2,3,4,5,6].map(i=>{
                    const isFri=i===5, isSat=i===6;
                    const bg = isFri ? '#dc2626' : isSat ? '#1d4ed8' : (d?'#374151':'#475569');
                    return `<div role="columnheader" style="background:${bg};color:white;text-align:center;padding:7px 2px;font-size:.72rem;font-weight:700;letter-spacing:.03em">
                        ${dayHdrsEn[i]}<br><span style="font-size:.65rem;opacity:.85">${dayHdrsBn[i]}</span>
                    </div>`;
                }).join('')}
            </div>

            <!-- ── CELL GRID ── -->
            <div class="grid grid-cols-7" style="gap:1px;background:${d?'#374151':'#e2e8f0'}">
                ${cells.map((day,ci)=>{
                    if(day===null) return `<div style="background:${d?'#1f2937':'#f8fafc'};min-height:72px"></div>`;

                    const greg=hijriToGregorian(day,month,year);
                    const isTodayGreg=greg.toDateString()===todayGreg.toDateString();
                    const ev=hijriEvents[month+'-'+day];
                    const colIdx=(startDay+day-1)%7;
                    const isFri=colIdx===5, isSat=colIdx===6;

                    // English Gregorian (big, top)
                    const gDay=greg.getDate();
                    const gMon=greg.getMonth();
                    const gYear=greg.getFullYear();

                    // Bangla Gregorian (middle small)
                    const bnGregDay=toBengaliDigits(gDay);
                    const _bd=getBanglaDateFull(greg);
                    const bnGregMon=_bd.str;

                    // Hijri in Bangla (bottom small)
                    const bnHijriDay=toBengaliDigits(day);
                    const bnHijriMon=hijriMonthsBn[month-1];

                    // Colors — dark mode contrast উন্নত করা হয়েছে
                    const enBigColor = isTodayGreg ? 'white'
                        : isFri ? '#fca5a5'   // dark: হালকা লাল (was #dc2626 — কম কনট্রাস্ট)
                        : isSat ? '#93c5fd'   // dark: হালকা নীল (was #1d4ed8 — কম কনট্রাস্ট)
                        : (d?'#f9fafb':'#111827');
                    const bnGregColor = isTodayGreg ? 'rgba(255,255,255,.9)'
                        : isFri ? (d?'#fca5a5':'#b91c1c')
                        : isSat ? (d?'#93c5fd':'#1e40af')
                        : (d?'#bfdbfe':'#1d4ed8');  // dark: আরো উজ্জ্বল নীল
                    const bnHijriColor = isTodayGreg ? 'rgba(255,255,255,.85)'
                        : (d?'#6ee7b7':'#15803d');  // dark: আরো উজ্জ্বল সবুজ

                    // ইমাম তারিখ হাইলাইট
                    const evType = ev ? ev.type : null;
                    const isBirth    = evType === 'birth';
                    const isMartyr   = evType === 'martyrdom';
                    const isAshura   = evType === 'ashura';
                    const isEid      = evType === 'eid';

                    const cellBg = isTodayGreg
                        ? '#059669'
                        : isAshura ? (d?'#4c0519':'#fff0f0')   // dark: আরো গাঢ় লাল
                        : isMartyr ? (d?'#3b0f0f':'#fff5f5')   // dark: আরো গাঢ় মেরুন
                        : isBirth  ? (d?'#052e16':'#f0fdf4')
                        : isEid    ? (d?'#1a2e1a':'#f0fff4')
                        : ev       ? (d?'#2d2006':'#fef3c7')   // dark: আরো গাঢ় অ্যাম্বার
                        : (d?'#111827':'#ffffff');

                    const dotColor = isAshura ? '#dc2626' : isMartyr ? '#f87171' : isBirth ? '#059669' : isEid ? '#059669' : '#f59e0b';

                    return `<div class="${isTodayGreg?'calendar-today-cell':''}" style="background:${cellBg};min-height:72px;padding:3px 4px;position:relative;display:flex;flex-direction:column;justify-content:space-between;align-items:stretch;cursor:${ev?'pointer':'default'};transition:all .2s ease" role="${ev?'button':'gridcell'}" ${ev?'tabindex="0"':''}
                        ${ev?`onclick="showCalendarEventPopover({month:${month},day:${day},year:${year},event:${JSON.stringify(ev).replace(/"/g,'&quot;')},language:'${l}'});event.stopPropagation()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showCalendarEventPopover({month:${month},day:${day},year:${year},event:${JSON.stringify(ev).replace(/"/g,'&quot;')},language:'${l}'});event.stopPropagation();}" onmouseover="this.style.boxShadow='inset 0 0 8px rgba(5,150,105,.2)'" onmouseout="this.style.boxShadow=''"`:''}
                        ${ev?`aria-label="${sanitize(gDay+' '+gregMonthsEnFull[gMon]+' — '+(l==='bn'?ev.bn:ev.en))}"`:''}
                        title="${gDay} ${gregMonthsEnFull[gMon]} ${gYear} | ${bnGregDay} ${bnGregMon} | ${bnHijriDay} ${bnHijriMon} ${toBengaliDigits(year)} হিজরি${ev?' | '+(l==='bn'?ev.bn:ev.en):''}">
                        <!-- TOP: English Gregorian (big) — 1st -->
                        <div style="text-align:center">
                            <span style="color:${enBigColor};font-size:1.6rem;font-weight:900;line-height:1">${gDay}</span>
                            <span style="color:${enBigColor};font-size:.52rem;font-weight:600;line-height:1;display:block;opacity:.85">${gregMonthsEn[gMon]}</span>
                        </div>

                        <!-- MIDDLE: Bengali (বঙ্গাব্দ) date (small) — 2nd -->
                        <div style="text-align:center">
                            <span style="color:${bnGregColor};font-size:.63rem;font-weight:700;line-height:1">${bnGregMon}</span>
                        </div>

                        <!-- BOTTOM: Hijri in Bengali language (small) — 3rd -->
                        <div style="text-align:center">
                            <span style="color:${bnHijriColor};font-size:.63rem;font-weight:700;line-height:1">${bnHijriDay} ${bnHijriMon}</span>
                        </div>

                        ${ev?`<div style="position:absolute;top:2px;right:3px;width:5px;height:5px;border-radius:50%;background:${dotColor}"></div>`:''}
                        ${isTodayGreg?`<div style="position:absolute;top:0;left:0;background:#f59e0b;color:white;font-size:.48rem;font-weight:900;padding:1px 3px;border-radius:0 0 5px 0;line-height:1.4">${l==='bn'?'আজ':'TODAY'}</div>`:''}
                    </div>`;
                }).join('')}
            </div>

            <!-- ── LEGEND ── -->
            <div class="px-4 py-3 border-t ${d?'border-gray-700':'border-gray-200'} flex flex-wrap gap-x-5 gap-y-1.5 text-xs ${d?'text-gray-300':'text-gray-600'}">
                <span aria-hidden="true" style="color:${d?'#f3f4f6':'#111827'};font-weight:700">■</span> ${l==='bn'?'ইংরেজি তারিখ':'Gregorian date'} &nbsp;
                <span aria-hidden="true" style="color:#1d4ed8;font-weight:700">■</span> ${l==='bn'?'বাংলা তারিখ':'Bangla date'} &nbsp;
                <span aria-hidden="true" style="color:#dc2626;font-weight:700">■</span> ${l==='bn'?'হিজরি তারিখ':'Hijri date'} &nbsp;
                <span aria-hidden="true" style="color:#f59e0b;font-weight:700">●</span> ${l==='bn'?'ইসলামিক ঘটনা':'Islamic event'} &nbsp;
                <span aria-hidden="true" style="color:#059669;font-weight:700">●</span> ${l==='bn'?'ইমামের জন্মদিন':'Imam Birthday'} &nbsp;
                <span aria-hidden="true" style="color:#dc2626;font-weight:700">●</span> ${l==='bn'?'ইমামের শাহাদাত':'Imam Martyrdom'}
            </div>

            <!-- ── EVENTS LIST ── -->
            ${(()=>{
                const evs=Object.entries(hijriEvents)
                    .filter(([k])=>parseInt(k.split('-')[0])===month)
                    .sort((a,b)=>parseInt(a[0].split('-')[1])-parseInt(b[0].split('-')[1]));
                if(!evs.length) return '';
                return `<div class="px-5 py-4 border-t ${d?'border-gray-700':'border-gray-200'}">
                    <h2 class="font-bold text-sm mb-3">${l==='bn'?'📌 এই মাসের ইসলামিক দিবস':'📌 Islamic Events This Month'}</h2>
                    <div class="space-y-2">
                        ${evs.map(([k,v])=>{
                            const evDay=parseInt(k.split('-')[1]);
                            const evGreg=hijriToGregorian(evDay,month,year);
                            const gregStr=evGreg.getDate()+' '+gregMonthsEnFull[evGreg.getMonth()]+' '+evGreg.getFullYear();
                            const _evBd=getBanglaDateFull(evGreg);
                            const bnStr=_evBd.strFull;
                            return `<div class="flex items-center gap-3 ${d?'bg-gray-900':'bg-amber-50'} rounded-xl px-4 py-2.5">
                                <div class="flex-shrink-0 text-center" style="min-width:42px;border-right:2px solid ${d?'#374151':'#fde68a'};padding-right:10px">
                                    <!-- 1st: English Gregorian -->
                                    <p style="color:${d?'#f3f4f6':'#111827'};font-size:1.2rem;font-weight:900;line-height:1">${evGreg.getDate()}</p>
                                    <p style="color:${d?'#9ca3af':'#6b7280'};font-size:.52rem;font-weight:600;line-height:1.2">${gregMonthsEnFull[evGreg.getMonth()]}</p>
                                    <!-- 2nd: Bengali (বঙ্গাব্দ) date -->
                                    <p style="color:${d?'#bfdbfe':'#1d4ed8'};font-size:.62rem;font-weight:700;line-height:1.3">${_evBd.str}</p>


                                    <!-- 3rd: Hijri in Bengali language -->
                                    <p style="color:${d?'#6ee7b7':'#15803d'};font-size:.62rem;font-weight:700;line-height:1.3">${toBengaliDigits(evDay)} ${hijriMonthsBn[month-1]}</p>
                                </div>
                                <div>
                                    <p class="font-bold text-sm">${l==='bn'?v.bn:v.en}</p>
                                    <p class="text-xs ${d?'text-gray-400':'text-gray-500'} mt-0.5">${evGreg.getDate()} ${gregMonthsEnFull[evGreg.getMonth()]} ${evGreg.getFullYear()}</p>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            })()}
        </div>
    </div>`;
}

// ============================================================================
// CALENDAR EVENT POPOVER
// ============================================================================
function showCalendarEventPopover(opts) {
    const {month,day,year,event,language} = opts;
    const l = language || state.language;
    const d = state.darkMode;
    
    // Event details mapping
    const getEventDetails = (ev) => {
        const titles = {bn:{birth:'🌸 জন্মদিন',martyrdom:'⚔️ শাহাদাত দিবস',ashura:'🔴 আশুরা',eid:'🎊 ঈদ',special:'✨ বিশেষ দিন',mixed:'📅 মিশ্র দিবস'},en:{birth:'🌸 Birthday',martyrdom:'⚔️ Martyrdom',ashura:'🔴 Ashura',eid:'🎊 Eid',special:'✨ Special',mixed:'📅 Mixed'}};
        return {title:titles[l]?.[ev.type]||'📅 Event',desc:l==='bn'?ev.bn:ev.en};
    };
    
    const {title,desc} = getEventDetails(event);
    const greg = hijriToGregorian(day,month,year);
    const gregStr = `${greg.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][greg.getMonth()]} ${greg.getFullYear()}`;
    const hijriStr = `${day} ${(l==='bn'?hijriMonthsBn:hijriMonthsEn)[month-1]} ${year} AH`;
    
    // Create popover
    const popover = document.createElement('div');
    popover.id = 'calendar-event-popover';
    popover.style.cssText = `position:fixed;z-index:9999;top:50%;left:50%;transform:translate(-50%,-50%);background:${d?'#1f2937':'#ffffff'};border:1px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.1)'};border-radius:16px;padding:24px;max-width:360px;box-shadow:${d?'0 20px 60px rgba(0,0,0,.4)':'0 20px 60px rgba(0,0,0,.15)'};backdrop-filter:blur(12px);`;
    
    popover.innerHTML = `
        <div style="text-align:center;margin-bottom:16px">
            <h3 style="margin:0 0 8px 0;font-size:1.25rem;font-weight:700;color:${d?'#f3f4f6':'#111827'}">${title}</h3>
            <p style="margin:0;font-size:.85rem;color:${d?'#d1d5db':'#6b7280'}">${desc}</p>
        </div>
        
        <div style="background:${d?'rgba(255,255,255,.05)':'rgba(0,0,0,.02)'};border-radius:12px;padding:12px;margin:12px 0;font-size:.85rem;color:${d?'#e5e7eb':'#374151'}">
            <div style="margin-bottom:6px"><strong>📅 Gregorian:</strong> ${gregStr}</div>
            <div><strong>☪️ Hijri:</strong> ${hijriStr}</div>
        </div>
        
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.1)'};text-align:center">
            <button onclick="document.getElementById('calendar-event-popover').remove()" style="padding:8px 16px;border-radius:8px;border:none;background:${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.1)'};color:#059669;font-weight:600;cursor:pointer;transition:all .2s" onmouseover="this.style.background='${d?'rgba(5,150,105,.3)':'rgba(5,150,105,.15)'}'" onmouseout="this.style.background='${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.1)'}'">${l==='bn'?'বন্ধ করুন':'Close'}</button>
        </div>
    `;
    
    // Remove existing popover
    const existing = document.getElementById('calendar-event-popover');
    if(existing) existing.remove();
    
    // Add popover and close on backdrop click
    document.body.appendChild(popover);
    setTimeout(() => {
        document.addEventListener('click', function closePopover(e) {
            if(e.target === popover || !popover.contains(e.target)) {
                popover.remove();
                document.removeEventListener('click', closePopover);
            }
        });
    }, 100);
}

// ============================================================================
// PAGE: CONTACT
// ============================================================================
function renderContactPage() {
    const d=state.darkMode; const l=state.language;
    return `
    <div class="space-y-8">
        <h1 class="text-3xl font-bold">✉️ ${t('contact')}</h1>
        <div class="grid md:grid-cols-2 gap-8">
            <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-8">
                <h2 class="text-xl font-bold mb-6">${l==='bn'?'বার্তা পাঠান':'Send a Message'}</h2>
                <form id="contact-form" class="space-y-5">
                    <div>
                        <label for="contact-name" class="block mb-1.5 font-medium text-sm">${l==='bn'?'নাম':'Name'}</label>
                        <input type="text" id="contact-name" required class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="${l==='bn'?'আপনার নাম':'Your name'}" />
                    </div>
                    <div>
                        <label for="contact-email" class="block mb-1.5 font-medium text-sm">${l==='bn'?'ইমেইল':'Email'}</label>
                        <input type="email" id="contact-email" required class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="${l==='bn'?'আপনার ইমেইল':'Your email'}" />
                    </div>
                    <div>
                        <label for="contact-message" class="block mb-1.5 font-medium text-sm">${l==='bn'?'বার্তা':'Message'}</label>
                        <textarea id="contact-message" required class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-32 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="${l==='bn'?'আপনার বার্তা':'Your message'}"></textarea>
                    </div>
                    <button type="submit" class="${d?'bg-green-700 hover:bg-green-600':'bg-green-600 hover:bg-green-700'} text-white w-full py-3 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-green-500">${l==='bn'?'পাঠান':'Send'}</button>
                </form>
            </div>
            <div class="space-y-6">
                <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-6">
                    <h2 class="font-bold mb-4">${l==='bn'?'সরাসরি যোগাযোগ':'Direct Contact'}</h2>
                    <p class="${d?'text-gray-300':'text-gray-700'} mb-2"><a href="mailto:theroleofahlalbaytas@gmail.com" class="hover:underline focus:outline-none focus:ring-2 focus:ring-green-500 rounded">📧 theroleofahlalbaytas@gmail.com</a></p>
                    <p class="${d?'text-gray-300':'text-gray-700'}"><a href="tel:+8801636428274" class="hover:underline focus:outline-none focus:ring-2 focus:ring-green-500 rounded">📞 +880 1636428274</a></p>
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// PAGE: ABOUT
// ============================================================================
function renderReadDuaPage()
{
    const dua=state.currentDua; const d=state.darkMode; const l=state.language;
    if(!dua) return renderDuaPage();
    // Bug fix: use object identity / id prefix to determine if dua is custom
    // (avoids false positives if a built-in dua happens to have an id-like property)
    const isCustom = state.customDuas.some(x => x === dua) || (typeof dua.id === 'string' && dua.id.startsWith('cd_'));
    const hasVerses = Array.isArray(dua.verses) && dua.verses.length > 0;
    // Prefix custom dua id with "c" so shareDua handler finds it correctly
    const duaIndex = isCustom ? ("c" + dua.id) : duas.indexOf(dua);

    // ── verse-by-verse reader (আয়াত বাই আয়াত) ──
    const versesHtml = hasVerses ? dua.verses.map((v, i) => `
        <div class="dua-verse-row fade-in" style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:0;
            border-bottom:1px solid ${d?'rgba(255,255,255,.06)':'rgba(180,83,9,.08)'};
            transition:background .2s;
        "
        onmouseenter="this.style.background='${d?'rgba(5,150,105,.07)':'rgba(5,150,105,.04)'}'"
        onmouseleave="this.style.background='transparent'"
        >
            <!-- Arabic side (RTL) -->
            <div style="
                padding:1.4rem 1.6rem;
                border-right:2px solid ${d?'rgba(180,83,9,.25)':'rgba(180,83,9,.15)'};
                text-align:right;
                direction:rtl;
                position:relative;
            ">
                <span class="dua-verse-num" style="
                    position:absolute;top:.7rem;left:.7rem;
                    width:22px;height:22px;border-radius:50%;
                    background:linear-gradient(135deg,#059669,#065f46);
                    color:#fff;font-size:.6rem;font-weight:700;
                    display:flex;align-items:center;justify-content:center;
                    font-family:sans-serif;direction:ltr;
                ">${i+1}</span>
                <button class="tts-play-btn" onclick="event.stopPropagation();tts.toggle('${(v.ar||'').replace(/'/g,"\\'").replace(/"/g,'&quot;')}')"
                    title="${l==='bn'?'শুনুন':'Listen'}"
                    style="position:absolute;top:.6rem;right:.6rem;width:22px;height:22px;border-radius:50%;
                           display:flex;align-items:center;justify-content:center;font-size:.65rem;
                           background:${d?'rgba(201,162,39,.15)':'rgba(180,83,9,.1)'};
                           color:${d?'#fcd34d':'#92400e'};border:1px solid ${d?'rgba(201,162,39,.3)':'rgba(180,83,9,.2)'};
                           cursor:pointer;direction:ltr">
                    <span class="tts-icon">▶</span>
                </button>
                <p class="arabic-text" lang="ar" style="
                    font-size:1.45rem;
                    line-height:2.2;
                    color:${d?'#fde68a':'#92400e'};
                    text-shadow:0 0 18px ${d?'rgba(253,230,138,.12)':'rgba(180,83,9,.08)'};
                    margin:0;
                ">${sanitize(v.ar)}</p>
            </div>
            <!-- Bengali side (LTR) -->
            <div style="
                padding:1.4rem 1.6rem;
                display:flex;align-items:center;
            ">
                <p style="
                    font-size:.95rem;
                    line-height:1.85;
                    color:${d?'#d1fae5':'#065f46'};
                    margin:0;
                    font-weight:500;
                ">${sanitize(v.bn)}</p>
            </div>
        </div>`).join('') : '';

    // ── single-block fallback (no verses, just arabic + meaning) ──
    const fallbackHtml = `
        <div class="rounded-2xl p-6 mb-4" style="background:${d?'linear-gradient(135deg,rgba(5,150,105,.1),rgba(180,83,9,.06))':'linear-gradient(135deg,#fef9e7,#ecfdf5)'};border:1px solid ${d?'rgba(180,83,9,.18)':'rgba(180,83,9,.12)'}">
            <p class="arabic-text text-center" dir="rtl" lang="ar" style="font-size:1.9rem;line-height:2.5;color:${d?'#fde68a':'#92400e'}">${sanitize(dua.arabic)}</p>
        </div>
        ${dua.transliteration?`<div class="${d?'bg-gray-900/60':'bg-gray-50'} rounded-2xl p-5 mb-4" style="border-left:3px solid #7c3aed"><p class="italic text-sm leading-relaxed ${d?'text-gray-300':'text-gray-600'}">${sanitize(dua.transliteration)}</p></div>`:''}
        <div class="${d?'bg-gray-900/60':'bg-emerald-50/60'} rounded-2xl p-5 mb-4" style="border-left:3px solid #059669">
            <p class="text-base leading-relaxed ${d?'text-gray-200':'text-gray-700'}">${sanitize(dua.meaningBn)}</p>
        </div>
        ${dua.meaningEn?`<div class="${d?'bg-gray-900/60':'bg-blue-50/60'} rounded-2xl p-5 mb-4" style="border-left:3px solid #0369a1"><p class="text-base leading-relaxed ${d?'text-gray-300':'text-gray-700'}">${sanitize(dua.meaningEn)}</p></div>`:''}
        ${dua.fullTextBn?`<div class="${d?'bg-gray-900/60':'bg-amber-50/60'} rounded-2xl p-5" style="border-left:3px solid #b45309"><p class="text-base leading-relaxed whitespace-pre-line ${d?'text-gray-300':'text-gray-700'}">${sanitize(dua.fullTextBn)}</p></div>`:''}
    `;

    const duaPageEnterClass = window._duaJustOpened ? ' page-enter' : '';
    window._duaJustOpened = false;

    return `
    <div class="max-w-4xl mx-auto${duaPageEnterClass}">

        <!-- Back button -->
        <button data-action="changePage" data-param="${state.previousPage||'dua'}"
            class="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all"
            style="background:rgba(180,83,9,.1);color:#b45309">
            ← ${l==='bn'?'দোয়ায় ফিরুন':'Back to Duas'}
        </button>

        <article style="border-radius:var(--r-xl,1rem);overflow:hidden;box-shadow:var(--shadow-lg);border:1px solid ${d?'rgba(255,255,255,.07)':'rgba(180,83,9,.12)'}">

            <!-- Gradient top bar -->
            <div style="height:5px;background:linear-gradient(90deg,#059669,#fbbf24,#b45309,#fbbf24,#059669);background-size:300%;animation:gradMove 4s linear infinite"></div>

            <!-- Header card -->
            <div style="background:${d?'linear-gradient(135deg,#1a2e24,#1c2a1c)':'linear-gradient(135deg,#fef9f0,#f0fdf4)'};padding:2rem 2rem 1.5rem">
                <div class="flex justify-between items-start gap-4 flex-wrap">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-3 flex-wrap">
                            <span class="text-xs px-3 py-1.5 rounded-full font-bold" style="background:rgba(5,150,105,.15);color:#059669;border:1px solid rgba(5,150,105,.3)">🤲 ${l==='bn'?'দোয়া':'Dua'}</span>
                            ${isCustom?`<span class="${d?'gold-badge-dark':'gold-badge'}">${l==='bn'?'কাস্টম':'Custom'}</span>`:''}
                            ${hasVerses?`<span class="text-xs px-2 py-1 rounded-full font-semibold" style="background:rgba(251,191,36,.15);color:#b45309;border:1px solid rgba(251,191,36,.3)">${dua.verses.length} ${l==='bn'?'পঙক্তি':'verses'}</span>`:''}
                        </div>
                        <h1 class="text-2xl md:text-3xl font-black leading-tight mb-1">${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}</h1>
                        ${dua.source?`<p class="text-sm mt-2" style="color:${d?'#6ee7b7':'#047857'}">📚 ${sanitize(dua.source)}</p>`:''}
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${(() => {
                            const fullArabic = hasVerses
                                ? dua.verses.map(v=>v.ar).join(' ۝ ')
                                : (dua.arabic || '');
                            if (!fullArabic) return '';
                            const escaped = fullArabic.replace(/'/g,"\\'").replace(/"/g,'&quot;');
                            return `<button class="tts-play-btn" onclick="tts.toggle('${escaped}')"
                                title="${l==='bn'?'পুরো দোয়া শুনুন':'Listen to full dua'}"
                                style="display:flex;align-items:center;gap:6px;padding:.6rem 1rem;border-radius:.75rem;
                                       font-size:.85rem;font-weight:700;cursor:pointer;transition:all .2s;
                                       background:rgba(180,83,9,.1);color:#b45309;border:1px solid rgba(180,83,9,.2)">
                                <span class="tts-icon">▶</span> ${l==='bn'?'শুনুন':'Listen'}
                            </button>`;
                        })()}
                        <button data-action="shareDua" data-param="${duaIndex}"
                            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all"
                            style="background:rgba(5,150,105,.1);color:#059669;border:1px solid rgba(5,150,105,.2)">
                            🔗 ${l==='bn'?'শেয়ার':'Share'}
                        </button>
                    </div>
                </div>
            </div>

            ${hasVerses ? `
            <!-- Column headers -->
            <div style="
                display:grid;grid-template-columns:1fr 1fr;
                background:${d?'rgba(5,150,105,.12)':'rgba(5,150,105,.07)'};
                border-bottom:2px solid ${d?'rgba(5,150,105,.25)':'rgba(5,150,105,.15)'};
                padding:.6rem 1.6rem;gap:0;
            ">
                <div style="text-align:right;direction:rtl">
                    <span class="text-xs font-black tracking-widest uppercase" style="color:${d?'#34d399':'#059669'}">العربية • আরবি পাঠ</span>
                </div>
                <div>
                    <span class="text-xs font-black tracking-widest uppercase" style="color:${d?'#34d399':'#059669'}">বাংলা অনুবাদ</span>
                </div>
            </div>

            <!-- Verses -->
            <div style="background:${d?'#111a14':'#fffbf5'}">
                ${versesHtml}
            </div>

            <!-- Footer note -->
            <div style="padding:1.2rem 1.6rem;background:${d?'rgba(5,150,105,.06)':'rgba(5,150,105,.04)'};border-top:1px solid ${d?'rgba(255,255,255,.05)':'rgba(180,83,9,.08)'}">
                <p class="text-xs text-center" style="color:${d?'#6b7280':'#9ca3af'}">
                    ${l==='bn'?'মোট '+dua.verses.length+' পঙক্তি — আরবি ও বাংলা অনুবাদ সহ':'Total '+dua.verses.length+' verses with Arabic & Bengali translation'}
                    ${dua.source?' • '+sanitize(dua.source):''}
                </p>
            </div>

            ` : `
            <!-- Fallback: no verses -->
            <div style="padding:2rem;background:${d?'#111a14':'#fffbf5'}">
                ${fallbackHtml}
            </div>
            `}

        </article>

        <!-- Extra fields if exists (fullTextBn) for verse-mode too -->
        ${hasVerses && dua.fullTextBn ? `
        <div class="mt-5 rounded-2xl p-5" style="background:${d?'rgba(180,83,9,.08)':'rgba(254,243,199,.6)'};border:1px solid ${d?'rgba(180,83,9,.18)':'rgba(180,83,9,.12)'}">
            <h2 class="text-xs font-black mb-3 tracking-widest uppercase" style="color:#b45309">${l==='bn'?'বিস্তারিত পাঠ':'Full Text'}</h2>
            <p class="text-base leading-relaxed whitespace-pre-line ${d?'text-gray-300':'text-gray-700'}">${sanitize(dua.fullTextBn)}</p>
        </div>` : ''}

        ${hasVerses && dua.meaningEn ? `
        <div class="mt-4 rounded-2xl p-5" style="background:${d?'rgba(3,105,161,.08)':'rgba(239,246,255,.6)'};border:1px solid ${d?'rgba(56,189,248,.15)':'rgba(186,230,253,.5)'}">
            <h2 class="text-xs font-black mb-3 tracking-widest uppercase" style="color:#0369a1">${l==='bn'?'ইংরেজি সারসংক্ষেপ':'English Summary'}</h2>
            <p class="text-base leading-relaxed ${d?'text-gray-300':'text-gray-700'}">${sanitize(dua.meaningEn)}</p>
        </div>` : ''}

    </div>

    <style>
    @keyframes gradMove{0%{background-position:0% 50%}100%{background-position:300% 50%}}
    @media(max-width:640px){
        .dua-verse-row{grid-template-columns:1fr!important}
        .dua-verse-row>div:first-child{border-right:none!important;border-bottom:1px solid rgba(180,83,9,.12)}
    }
    </style>`;
}

// ============================================================================
// PAGE: IMAMS (12 Imams List)
// ============================================================================
function renderImamsPage()
{
    const d=state.darkMode; const l=state.language;

    // Phase 5 (2026-08-12): masumeen/imams now load async (see
    // ahlul-bayt-unified.js) — show a lightweight loading message instead
    // of a blank/incomplete grid while the fetch is in flight, mirroring
    // renderFamilyTreePage()'s existing guard (script-4-boot.js) and the
    // duasIndexLoadState/kcIndexLoadState/quizDataLoadState pattern.
    const ahlulBaytState = (typeof ahlulBaytDataLoadState !== 'undefined') ? ahlulBaytDataLoadState : 'loaded';
    if (ahlulBaytState === 'loading' || ahlulBaytState === 'error') {
        return `<div class="space-y-6 page-enter">
          <h2 class="text-3xl font-black" style="color:${d?'#f9fafb':'#111827'}">👑 ${t('imams')}</h2>
          <p style="color:${d?'#9ca3af':'#6b7280'}">${ahlulBaytState==='error'
            ? (l==='bn'?'তথ্য লোড করা যায়নি — পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।':'Could not load content — please refresh and try again.')
            : (l==='bn'?'ডেটা লোড হচ্ছে... একটু অপেক্ষা করুন।':'Loading data… please wait.')}</p>
        </div>`;
    }

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
                    box-shadow:var(--app-shadow-sm);height:100%;border-radius:var(--r-lg);
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
                    👑 ${t('imams')}
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
// ============================================================================
// IMAM DETAIL PAGE
// ============================================================================
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

// ============================================================================
// PAGE: TASBEEH COUNTER
// ============================================================================
// ============================================================================
// PAGE: QUIZ
// ============================================================================
// ============================================================================
// PAGE: QUIZ  (setup → playing → finished)
// ----------------------------------------------------------------------------
// 2026-08-09 rewrite. Three screens driven by state.quizStage, replacing the
// old single fixed-order 10-question run. See script-1-core.js's "QUIZ
// ACTIONS" section for the logic (startQuiz/quizAnswer/quizNext/...) this
// UI calls into.
// ============================================================================
const QUIZ_CAT_COLORS = {
    ahlulbayt: { c: '#7c3aed', bg: 'rgba(124,58,237,.1)', bgD: 'rgba(124,58,237,.2)' },
    quran:     { c: '#2563eb', bg: 'rgba(37,99,235,.1)',  bgD: 'rgba(37,99,235,.2)' },
    karbala:   { c: '#dc2626', bg: 'rgba(220,38,38,.1)',  bgD: 'rgba(220,38,38,.2)' },
    fiqh:      { c: '#0d9488', bg: 'rgba(13,148,136,.1)', bgD: 'rgba(13,148,136,.2)' },
    dua:       { c: '#b45309', bg: 'rgba(180,83,9,.1)',   bgD: 'rgba(180,83,9,.2)' },
    general:   { c: '#059669', bg: 'rgba(5,150,105,.1)',  bgD: 'rgba(5,150,105,.2)' },
};
function quizCatColor(key) {
    return QUIZ_CAT_COLORS[key] || { c: '#6b7280', bg: 'rgba(107,114,128,.1)', bgD: 'rgba(107,114,128,.2)' };
}
function quizCatLabel(key, l) {
    if (!key || key === 'all') return l === 'bn' ? 'সব' : 'All';
    const c = quizCategories.find(x => x.key === key);
    return c ? (l === 'bn' ? c.bn : c.en) : key;
}
function quizDiffLabel(key, l) {
    const map = { easy: { bn: 'সহজ', en: 'Easy' }, medium: { bn: 'মাধ্যম', en: 'Medium' }, hard: { bn: 'কঠিন', en: 'Hard' } };
    const m = map[key];
    return m ? (l === 'bn' ? m.bn : m.en) : (l === 'bn' ? 'সব' : 'All');
}

function renderQuizPage() {
    if (state.quizStage === 'playing' && state.quizPool.length) return renderQuizPlayingPage();
    if (state.quizStage === 'finished' && state.quizPool.length) return renderQuizResultPage();
    return renderQuizSetupPage();
}

// 2026-08-11: quizQuestions now loads asynchronously (see quiz-data.js), so
// totalAvail===0 on the setup screen can mean "still loading" as well as
// "genuinely no questions match this filter" or "failed to load". This
// picks the right label for the disabled Start button's existing three
// states without changing its markup/styling — same button, same disabled
// treatment, just an accurate message. Mirrors the loading/error/empty
// distinction added to renderBlogPage() in the Blog migration.
function quizStartButtonEmptyLabel(l) {
    if (typeof quizDataLoadState !== 'undefined' && quizDataLoadState === 'loading') {
        return l === 'bn' ? 'প্রশ্ন লোড হচ্ছে…' : 'Loading questions…';
    }
    if (typeof quizDataLoadState !== 'undefined' && quizDataLoadState === 'error') {
        return l === 'bn' ? 'প্রশ্ন লোড করা যায়নি' : 'Could not load questions';
    }
    return l === 'bn' ? 'কোনো প্রশ্ন নেই' : 'No questions available';
}

function renderQuizSetupPage() {
    const d = state.darkMode, l = state.language;
    const diffs = [
        { key: 'all', bn: 'সব', en: 'All' },
        { key: 'easy', bn: 'সহজ', en: 'Easy' },
        { key: 'medium', bn: 'মাধ্যম', en: 'Medium' },
        { key: 'hard', bn: 'কঠিন', en: 'Hard' },
    ];
    const lengths = [5, 10, 15, 20];
    const totalAvail = countQuizQuestions(state.quizCategory, state.quizDifficulty);
    const playCount = Math.min(state.quizLength, totalAvail);
    const recent = state.quizHistory.slice(0, 3);
    const allCats = [{ key: 'all', icon: '🗂️', bn: 'সব ক্যাটাগরি', en: 'All Categories' }].concat(quizCategories);

    return `
    <div class="space-y-8">
        <div class="flex flex-wrap justify-between items-center gap-4">
            <h1 class="text-3xl font-bold">🧠 ${t('quiz')}</h1>
            ${state.quizBest > 0 ? `<span class="${d ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-700'} text-xs font-bold px-3 py-1.5 rounded-full">🏆 ${l === 'bn' ? 'সেরা স্কোর' : 'Best'}: ${l === 'bn' ? toBengaliDigits(state.quizBest) : state.quizBest}%</span>` : ''}
        </div>

        <button data-action="quizStartDaily" class="w-full text-left rounded-2xl transition-all hover:scale-[1.01]" style="background:linear-gradient(135deg,#7f1d1d,#dc2626);padding:1.4rem 1.6rem;box-shadow:0 8px 28px rgba(220,38,38,.3)">
            <div class="flex items-center gap-4">
                <div style="font-size:2.2rem" aria-hidden="true">🔥</div>
                <div class="flex-1">
                    <h3 style="font-weight:800;font-size:1.05rem;color:white;margin-bottom:.2rem">${l === 'bn' ? 'আজকের কুইজ' : 'Quiz of the Day'}</h3>
                    <p style="font-size:.8rem;color:rgba(255,255,255,.82)">${l === 'bn' ? '৫টি প্রশ্ন — প্রতিদিন নতুন' : '5 questions — new every day'}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
            </div>
        </button>

        <div>
            <p class="text-sm font-bold mb-3 ${d ? 'text-gray-300' : 'text-gray-600'}">${l === 'bn' ? 'ক্যাটাগরি বাছাই করুন' : 'Choose a Category'}</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${allCats.map(cat => {
                    const active = state.quizCategory === cat.key;
                    const cc = quizCatColor(cat.key);
                    const cnt = countQuizQuestions(cat.key, state.quizDifficulty);
                    return `<button data-action="quizSetCategory" data-param="${cat.key}"
                        class="quiz-cat-card"
                        style="background:${active ? (d ? cc.bgD : cc.bg) : (d ? '#1f2937' : '#ffffff')};border-color:${active ? cc.c : (d ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)')}">
                        <span style="font-size:1.4rem" aria-hidden="true">${cat.icon}</span>
                        <span class="quiz-cat-card-label" style="color:${active ? cc.c : (d ? '#e5e7eb' : '#111827')}">${l === 'bn' ? cat.bn : cat.en}</span>
                        <span class="quiz-cat-card-count" style="color:${d ? '#9ca3af' : '#6b7280'}">${l === 'bn' ? toBengaliDigits(cnt) : cnt}</span>
                    </button>`;
                }).join('')}
            </div>
        </div>

        <div>
            <p class="text-sm font-bold mb-3 ${d ? 'text-gray-300' : 'text-gray-600'}">${l === 'bn' ? 'কঠিনতা' : 'Difficulty'}</p>
            <div class="flex flex-wrap gap-2">
                ${diffs.map(df => {
                    const active = state.quizDifficulty === df.key;
                    return `<button data-action="quizSetDifficulty" data-param="${df.key}" class="quiz-pill" style="background:${active ? '#059669' : (d ? '#1f2937' : '#f3f4f6')};color:${active ? '#fff' : (d ? '#d1d5db' : '#374151')}">${l === 'bn' ? df.bn : df.en}</button>`;
                }).join('')}
            </div>
        </div>

        <div>
            <p class="text-sm font-bold mb-3 ${d ? 'text-gray-300' : 'text-gray-600'}">${l === 'bn' ? 'প্রশ্ন সংখ্যা' : 'Number of Questions'}</p>
            <div class="flex flex-wrap gap-2">
                ${lengths.map(n => {
                    const active = state.quizLength === n;
                    return `<button data-action="quizSetLength" data-param="${n}" class="quiz-pill" style="background:${active ? '#059669' : (d ? '#1f2937' : '#f3f4f6')};color:${active ? '#fff' : (d ? '#d1d5db' : '#374151')}">${l === 'bn' ? toBengaliDigits(n) : n}</button>`;
                }).join('')}
            </div>
        </div>

        <button data-action="quizToggleTimer" class="flex items-center justify-between w-full ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border rounded-2xl p-4">
            <span class="flex items-center gap-3">
                <span style="font-size:1.3rem" aria-hidden="true">⏱️</span>
                <span class="text-left">
                    <span class="block text-sm font-bold ${d ? 'text-gray-300' : 'text-gray-900'}">${l === 'bn' ? 'টাইমার' : 'Timer'}</span>
                    <span class="block text-xs ${d ? 'text-gray-400' : 'text-gray-500'}">${l === 'bn' ? ('প্রতি প্রশ্নে ' + toBengaliDigits(state.quizSecondsPerQ) + ' সেকেন্ড') : (state.quizSecondsPerQ + 's per question')}</span>
                </span>
            </span>
            <span class="quiz-switch ${state.quizTimerEnabled ? 'quiz-switch-on' : ''}" aria-hidden="true"><span class="quiz-switch-knob"></span></span>
        </button>

        <button data-action="quizStart" ${totalAvail === 0 ? 'disabled="disabled"' : ''}
            class="w-full text-white font-bold py-4 rounded-2xl text-lg transition-all ${totalAvail === 0 ? 'opacity-50' : 'hover:scale-[1.01]'}"
            style="background:${totalAvail === 0 ? '#9ca3af' : 'linear-gradient(135deg,#059669,#047857)'};box-shadow:${totalAvail === 0 ? 'none' : '0 8px 24px rgba(5,150,105,.35)'}">
            ${totalAvail === 0 ? quizStartButtonEmptyLabel(l) : ('▶ ' + (l === 'bn' ? 'কুইজ শুরু করুন' : 'Start Quiz') + ' (' + (l === 'bn' ? toBengaliDigits(playCount) : playCount) + ')')}
        </button>

        ${recent.length ? `
        <div>
            <p class="text-sm font-bold mb-3 ${d ? 'text-gray-300' : 'text-gray-600'}">${l === 'bn' ? 'সাম্প্রতিক ফলাফল' : 'Recent Attempts'}</p>
            <div class="space-y-2">
                ${recent.map(h => `
                <div class="flex items-center justify-between ${d ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl px-4 py-3 text-sm">
                    <span class="${d ? 'text-gray-300' : 'text-gray-600'}">${h.daily ? ('🔥 ' + (l === 'bn' ? 'আজকের কুইজ' : 'Daily')) : quizCatLabel(h.category, l)} · ${h.date}</span>
                    <span class="font-bold" style="color:${h.pct >= 80 ? '#059669' : h.pct >= 50 ? '#d97706' : '#dc2626'}">${l === 'bn' ? toBengaliDigits(h.score) : h.score}/${l === 'bn' ? toBengaliDigits(h.total) : h.total} (${l === 'bn' ? toBengaliDigits(h.pct) : h.pct}%)</span>
                </div>`).join('')}
            </div>
        </div>` : ''}
    </div>`;
}

function renderQuizPlayingPage() {
    const d = state.darkMode, l = state.language;
    const q = state.quizPool[state.quizIndex];
    if (!q) { state.quizStage = 'setup'; render(); return ''; }
    const total = state.quizPool.length;
    const pct = Math.round((state.quizIndex / total) * 100);
    const answered = state.quizAnswered !== null;

    let resultLabel;
    if (!answered) resultLabel = '';
    else if (state.quizAnswered === q.correct) resultLabel = (l === 'bn' ? '✅ সঠিক!' : '✅ Correct!');
    else if (state.quizAnswered === -1) resultLabel = (l === 'bn' ? '⏱️ সময় শেষ হয়ে গেছে' : '⏱️ Out of time');
    else resultLabel = (l === 'bn' ? '❌ ভুল উত্তর' : '❌ Incorrect');

    const cc = quizCatColor(q.category);

    return `
    <div class="space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4">
            <h1 class="text-3xl font-bold">🧠 ${t('quiz')}</h1>
            <div class="flex items-center gap-3">
                ${state.quizIsDaily ? `<span class="text-xs font-bold px-3 py-1 rounded-full" style="background:rgba(220,38,38,.12);color:#dc2626">🔥 ${l === 'bn' ? 'আজকের কুইজ' : 'Daily'}</span>` : ''}
                <span class="${d ? 'text-gray-400' : 'text-gray-500'} text-sm">${l === 'bn' ? toBengaliDigits(state.quizIndex + 1) : state.quizIndex + 1} / ${l === 'bn' ? toBengaliDigits(total) : total}</span>
            </div>
        </div>

        <div class="${d ? 'bg-gray-900' : 'bg-gray-100'} rounded-full h-2 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${l === 'bn' ? 'কুইজ অগ্রগতি' : 'Quiz progress'}">
            <div class="bg-green-500 h-2 rounded-full transition-all" style="width:${pct}%"></div>
        </div>

        ${state.quizTimerEnabled ? `
        <div class="flex items-center gap-3">
            <div class="flex-1 h-2 rounded-full overflow-hidden ${d ? 'bg-gray-800' : 'bg-gray-200'}">
                <div id="quiz-timer-bar" style="height:100%;border-radius:9999px;width:${Math.max(0, (state.quizTimeLeft / state.quizSecondsPerQ) * 100)}%;background:${state.quizTimeLeft <= 5 ? '#dc2626' : '#f59e0b'};transition:width 1s linear"></div>
            </div>
            <span id="quiz-timer-num" class="text-sm font-bold ${d ? 'text-gray-300' : 'text-gray-600'}" style="min-width:1.6em;text-align:right">${l === 'bn' ? toBengaliDigits(Math.max(0, state.quizTimeLeft)) : Math.max(0, state.quizTimeLeft)}</span>
        </div>` : ''}

        <div class="${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border rounded-2xl p-8 max-w-2xl mx-auto">
            <div class="flex items-center gap-2 mb-4">
                <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${d ? cc.bgD : cc.bg};color:${cc.c}">${quizCatLabel(q.category, l)}</span>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${d ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}">${quizDiffLabel(q.difficulty, l)}</span>
            </div>
            <h2 class="text-xl font-bold mb-8">${sanitize(l === 'bn' ? q.qBn : q.qEn)}</h2>
            <div class="space-y-3">
                ${q.options.map((opt, i) => {
                    let cls = `quiz-option border-2 ${d ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl px-5 py-4 w-full text-left font-medium`;
                    let stateLabel = '';
                    if (answered) {
                        if (i === q.correct) { cls += ' correct'; stateLabel = ` — ${l === 'bn' ? 'সঠিক উত্তর' : 'Correct answer'}`; }
                        else if (i === state.quizAnswered) { cls += ' wrong'; stateLabel = ` — ${l === 'bn' ? 'আপনার উত্তর, ভুল' : 'Your answer, incorrect'}`; }
                    }
                    const optText = sanitize(l === 'bn' ? opt.bn : opt.en);
                    return `<button data-action="quizAnswer" data-param="${i}" class="${cls}" ${answered ? 'disabled="disabled"' : ''}
                        ${stateLabel ? `aria-label="${['A', 'B', 'C', 'D'][i]}. ${optText}${stateLabel}"` : ''}>
                        <span class="${d ? 'text-gray-400' : 'text-gray-400'} mr-3" aria-hidden="true">${['A', 'B', 'C', 'D'][i]}.</span>
                        ${optText}
                    </button>`;
                }).join('')}
            </div>

            ${answered ? `
            <div class="quiz-explain-box ${state.quizAnswered === q.correct ? 'quiz-explain-correct' : 'quiz-explain-wrong'}">
                <p class="text-sm font-bold mb-1">${resultLabel}</p>
                <p class="text-sm leading-relaxed">${sanitize(l === 'bn' ? q.explanationBn : q.explanationEn)}</p>
                ${(q.sourceBn || q.sourceEn) ? `<p class="text-xs mt-2" style="opacity:.75">— ${sanitize(l === 'bn' ? q.sourceBn : q.sourceEn)}</p>` : ''}
            </div>
            <button data-action="quizNext" class="w-full mt-4 text-white font-bold py-3.5 rounded-xl" style="background:linear-gradient(135deg,#059669,#047857)">
                ${state.quizIndex < total - 1 ? (l === 'bn' ? 'পরবর্তী প্রশ্ন →' : 'Next Question →') : (l === 'bn' ? 'ফলাফল দেখুন →' : 'See Results →')}
            </button>` : ''}
        </div>

        <div class="text-center">
            <p class="${d ? 'text-gray-400' : 'text-gray-500'} text-sm" aria-live="polite">${l === 'bn' ? 'স্কোর' : 'Score'}: ${l === 'bn' ? toBengaliDigits(state.quizScore) : state.quizScore}/${l === 'bn' ? toBengaliDigits(state.quizIndex + (answered ? 1 : 0)) : state.quizIndex + (answered ? 1 : 0)}</p>
        </div>
    </div>`;
}

function renderQuizResultPage() {
    const d = state.darkMode, l = state.language;
    const total = state.quizPool.length;
    const score = state.quizScore;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const isBest = pct > 0 && pct === state.quizBest;

    return `
    <div class="space-y-8">
        <h1 class="text-3xl font-bold">🧠 ${t('quiz')}</h1>
        <div class="${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border rounded-2xl p-10 text-center max-w-lg mx-auto">
            <div class="text-7xl mb-6" aria-hidden="true">${pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📖'}</div>
            <h2 class="text-2xl font-bold mb-2">${l === 'bn' ? 'কুইজ সম্পন্ন!' : 'Quiz Complete!'}</h2>
            ${isBest ? `<p class="text-sm font-bold mb-1" style="color:#d97706">🎉 ${l === 'bn' ? 'নতুন সেরা স্কোর!' : 'New personal best!'}</p>` : ''}
            <p class="text-5xl font-bold ${d ? 'text-green-400' : 'text-green-600'} my-6">${l === 'bn' ? toBengaliDigits(score) : score}/${l === 'bn' ? toBengaliDigits(total) : total}</p>
            <div class="${d ? 'bg-gray-900' : 'bg-gray-50'} rounded-xl p-4 mb-6">
                <div class="h-4 ${d ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${l === 'bn' ? 'সঠিক উত্তরের শতাংশ' : 'Percent correct'}">
                    <div class="${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400'} h-4 rounded-full" style="width:${pct}%"></div>
                </div>
                <p class="text-sm mt-2 font-medium">${l === 'bn' ? toBengaliDigits(pct) : pct}% ${l === 'bn' ? 'সঠিক' : 'correct'}</p>
            </div>
            <p class="mb-6 ${d ? 'text-gray-300' : 'text-gray-700'}">${pct >= 80 ? (l === 'bn' ? 'অসাধারণ! আপনার জ্ঞান চমৎকার।' : 'Excellent! Your knowledge is great.')
                : pct >= 50 ? (l === 'bn' ? 'ভালো! আরেকটু পড়াশোনা করুন।' : 'Good! Study a bit more.')
                : (l === 'bn' ? 'আরও পড়াশোনা করুন এবং আবার চেষ্টা করুন।' : 'Study more and try again.')}</p>
            <div class="flex flex-col gap-3">
                <button data-action="quizPlayAgain" class="flex-1 ${d ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-3 rounded-xl font-semibold">🔄 ${l === 'bn' ? 'আবার খেলুন' : 'Play Again'}</button>
                <button data-action="quizBackToSetup" class="flex-1 ${d ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-6 py-3 rounded-xl font-semibold">⚙️ ${l === 'bn' ? 'নতুন কুইজ' : 'New Quiz'}</button>
                <button data-action="quizShare" class="flex-1 ${d ? 'bg-blue-900 hover:bg-blue-800 text-blue-300' : 'bg-blue-50 hover:bg-blue-200 text-blue-700'} px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    ${l === 'bn' ? 'শেয়ার' : 'Share'}
                </button>
            </div>
        </div>

        ${state.quizWrong.length ? `
        <div class="max-w-2xl mx-auto">
            <h3 class="text-lg font-bold mb-4">${l === 'bn' ? 'যে প্রশ্নগুলো ভুল হয়েছে' : 'Questions You Missed'}</h3>
            <div class="space-y-3">
                ${state.quizWrong.map(w => {
                    const q = w.q;
                    const userText = w.userIdx >= 0 ? sanitize(l === 'bn' ? q.options[w.userIdx].bn : q.options[w.userIdx].en) : (l === 'bn' ? '(উত্তর দেওয়া হয়নি)' : '(no answer given)');
                    const correctText = sanitize(l === 'bn' ? q.options[q.correct].bn : q.options[q.correct].en);
                    return `
                    <div class="quiz-review-item ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}">
                        <p class="font-semibold text-sm mb-2">${sanitize(l === 'bn' ? q.qBn : q.qEn)}</p>
                        <p class="text-xs mb-1" style="color:#dc2626">✗ ${l === 'bn' ? 'আপনার উত্তর' : 'Your answer'}: ${userText}</p>
                        <p class="text-xs mb-2" style="color:#059669">✓ ${l === 'bn' ? 'সঠিক উত্তর' : 'Correct answer'}: ${correctText}</p>
                        <p class="text-xs ${d ? 'text-gray-400' : 'text-gray-600'}" style="line-height:1.6">${sanitize(l === 'bn' ? q.explanationBn : q.explanationEn)}</p>
                    </div>`;
                }).join('')}
            </div>
        </div>` : `
        <p class="text-center max-w-lg mx-auto ${d ? 'text-gray-400' : 'text-gray-500'} text-sm">🎉 ${l === 'bn' ? 'সবগুলো প্রশ্নের সঠিক উত্তর দিয়েছেন!' : 'You answered every question correctly!'}</p>`}
    </div>`;
}

// ============================================================================
// PAGE: SEARCH
// ============================================================================
// [Cleanup, this session] performSearch(q) used to be fully implemented
// here (linear scan over every searchable array). It has been superseded
// by assets/js/core/search-engine.js's indexed implementation, which loads
// after this file and redefines performSearch(q) globally with the exact
// same name/parameters/return shape — see search-engine.js's file-header
// comment for the backward-compatibility contract. That old body here was
// dead code (permanently shadowed) and has been removed; every call site
// (searchResultsHTML below, script-2-ui.js's dispatcher) already calls the
// plain global performSearch(q), which now resolves straight to
// search-engine.js's version with no behavior change.

function renderTasbeehPage()
{
    const d=state.darkMode; const l=state.language;
    const count   = state.tasbeehCount||0;
    const target  = state.tasbeehTarget||33;
    const selected= state.tasbeehSelected||0;
    const history = state.tasbeehHistory||[];
    const progress= Math.min(count/target,1);
    const sets    = Math.floor(count/target);
    const rem     = count%target;
    const circumference = 2*Math.PI*54;
    const dashOff = circumference*(1-progress);

    const DHIKR=[
        {ar:'سُبْحَانَ اللَّهِ',      bn:'সুবহানআল্লাহ',   en:'Subhanallah',    target:33, color:'#059669'},
        {ar:'اَلْحَمْدُ لِلَّهِ',    bn:'আলহামদুলিল্লাহ', en:'Alhamdulillah',  target:33, color:'#0369a1'},
        {ar:'اللَّهُ أَكْبَرُ',      bn:'আল্লাহু আকবার',  en:'Allahu Akbar',   target:34, color:'#7c3aed'},
        {ar:'لَا إِلَٰهَ إِلَّا اللَّهُ',bn:'লা ইলাহা ইল্লাল্লাহ',en:'La ilaha illallah',target:100,color:'#b45309'},
        {ar:'اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ',bn:'দরুদে মুহম্মাদ ও আলে মুহম্মাদ',en:'Durud on Muhammad & Aal-e-Muhammad',target:10,color:'#be123c'},
        {ar:'أَسْتَغْفِرُ اللَّهَ',   bn:'আস্তাগফিরুল্লাহ',en:'Astaghfirullah', target:70, color:'#0d9488'},
    ];
    const dhikr = DHIKR[selected];
    const ac = dhikr.color;

    return `
    <div class="space-y-6 page-enter">

        <!-- Header -->
        <div class="reveal">
            <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                📿 ${t('tasbeeh')}
            </h1>
            <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'ডিজিটাল তাসবিহ কাউন্টার':'Digital Tasbeeh Counter'}</p>
        </div>

        <!-- Dhikr selector -->
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 1px 6px" class="reveal">
            <div style="display:flex;gap:8px;width:max-content">
                ${DHIKR.map((dk,i)=>`
                <button data-action="selectTasbeeh" data-param="${i}" aria-pressed="${selected===i?'true':'false'}"
                    style="flex-shrink:0;padding:7px 16px;border-radius:50px;cursor:pointer;
                    font-size:11.5px;font-weight:700;white-space:nowrap;transition:all .2s;
                    background:${selected===i?dk.color:(d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)')};
                    color:${selected===i?'#fff':(d?'#9ca3af':'#6b7280')};
                    border:1.5px solid ${selected===i?dk.color:(d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)')}">
                    ${l==='bn'?dk.bn:dk.en}
                </button>`).join('')}
            </div>
        </div>

        <!-- Main counter card -->
        <div class="card-luxury border reveal"
            style="background:${d?'linear-gradient(135deg,#1a2520,#0f1a14)':'linear-gradient(135deg,#f0fdf4,#ecfdf5)'};
            border-color:${ac}25;box-shadow:0 12px 40px ${ac}18">
            <div style="height:4px;background:linear-gradient(90deg,${ac},#c9a227,${ac});background-size:200% 100%;animation:goldShimmer 3s linear infinite;border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
            <div class="p-6 text-center">

                <!-- Arabic dhikr -->
                <p class="arabic-text mb-1" dir="rtl" lang="ar" style="font-size:1.7rem;line-height:1.9;color:${ac}">${dhikr.ar}</p>
                <p class="font-bold text-sm mb-5" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?dhikr.bn:dhikr.en} · ${l==='bn'?'লক্ষ্য':'Target'}: ${dhikr.target}</p>

                <!-- SVG ring progress -->
                <div style="position:relative;width:154px;height:154px;margin:0 auto 1.5rem">
                    <svg width="154" height="154" style="transform:rotate(-90deg)" aria-hidden="true">
                        <circle cx="77" cy="77" r="54" fill="none" stroke="${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.07)'}" stroke-width="10"/>
                        <circle cx="77" cy="77" r="54" fill="none" stroke="${ac}" stroke-width="10"
                            id="tasbeeh-ring"
                            stroke-linecap="round"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${dashOff}"
                            style="transition:stroke-dashoffset .35s cubic-bezier(.34,1.56,.64,1);filter:drop-shadow(0 0 8px ${ac}88)"/>
                    </svg>
                    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                        <span class="tasbeeh-center-count" style="font-size:2.8rem;font-weight:900;line-height:1;color:${ac};font-variant-numeric:tabular-nums">
                            ${l==='bn'?toBengaliDigits(rem):rem}
                        </span>
                        <span class="text-xs font-semibold mt-1" style="color:${d?'#6b7280':'#9ca3af'}">/ ${l==='bn'?toBengaliDigits(dhikr.target):dhikr.target}</span>
                    </div>
                </div>

                <!-- Tap button -->
                <button id="tasbeeh-tap-btn"
                    onclick="tasbeehTap(this)"
                    style="width:200px;height:200px;border-radius:50%;border:none;cursor:pointer;
                    background:linear-gradient(145deg,${ac},${ac}cc);
                    box-shadow:0 8px 0 ${ac}80,0 14px 28px ${ac}50,inset 0 3px 8px rgba(255,255,255,.25);
                    display:flex;flex-direction:column;align-items:center;justify-content:center;
                    gap:4px;position:relative;overflow:hidden;transition:transform .1s,box-shadow .1s;
                    margin:0 auto">
                    <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.28),transparent 56%);pointer-events:none"></div>
                    <span style="font-size:.72rem;font-weight:700;color:rgba(255,255,255,.8);letter-spacing:1px;text-transform:uppercase">${l==='bn'?'ট্যাপ করুন':'Tap'}</span>
                    <span style="font-size:3rem;font-weight:900;color:white;line-height:1;font-variant-numeric:tabular-nums">${l==='bn'?toBengaliDigits(count):count}</span>
                    <span style="font-size:.7rem;color:rgba(255,255,255,.7)">${sets>0?(l==='bn'?`${toBengaliDigits(sets)} সেট`:`${sets} sets`):''}</span>
                </button>

                <!-- Controls -->
                <div class="flex justify-center gap-3 mt-6">
                    <button data-action="resetTasbeeh"
                        style="padding:10px 24px;border-radius:50px;font-size:12.5px;font-weight:700;
                        background:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};
                        color:${d?'#d1d5db':'#374151'};border:1.5px solid ${d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'};cursor:pointer;
                        display:flex;align-items:center;gap:6px;transition:all .2s">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                        ${l==='bn'?'রিসেট':'Reset'}
                    </button>
                    <button data-action="saveTasbeehHistory"
                        style="padding:10px 24px;border-radius:50px;font-size:12.5px;font-weight:700;
                        background:${ac}18;color:${ac};border:1.5px solid ${ac}30;cursor:pointer;
                        display:flex;align-items:center;gap:6px;transition:all .2s">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        ${l==='bn'?'সেভ করুন':'Save'}
                    </button>
                </div>
            </div>
        </div>

        <!-- History -->
        ${history.length>0?`
        <div class="reveal">
            <div class="section-heading">
                <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6b7280,#374151);display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0" aria-hidden="true">📊</span>
                <h2 class="font-bold text-sm" style="color:${d?'#f9fafb':'#111827'}">${l==='bn'?'ইতিহাস':'History'}</h2>
            </div>
            <div class="space-y-2">
                ${history.slice(-5).reverse().map((h,hi)=>`
                <div class="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style="background:${d?'rgba(255,255,255,.05)':'rgba(0,0,0,.03)'};border:1px solid ${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.06)'}">
                    <span style="width:32px;height:32px;border-radius:10px;background:${DHIKR[h.dhikrIdx]?.color||'#059669'}18;
                        display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;
                        color:${DHIKR[h.dhikrIdx]?.color||'#059669'}">${l==='bn'?toBengaliDigits(hi+1):hi+1}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm truncate" style="color:${d?'#f9fafb':'#111827'}">${l==='bn'?DHIKR[h.dhikrIdx]?.bn:DHIKR[h.dhikrIdx]?.en}</p>
                        <p class="text-xs" style="color:${d?'#6b7280':'#9ca3af'}">${sanitize(h.date||'')}</p>
                    </div>
                    <span class="font-bold text-sm tabular-nums" style="color:${DHIKR[h.dhikrIdx]?.color||'#059669'}">${l==='bn'?toBengaliDigits(h.count):h.count}</span>
                </div>`).join('')}
            </div>
        </div>`:''}
    </div>`;
}
// ============================================================================
// PAGE: SEARCH
// ============================================================================
// Search result markup, factored out so it can be regenerated on every keystroke
// (via the search-input's oninput handler below) without a full page re-render,
// and reused for the initial render in renderSearchPage().
function searchResultsHTML(query) {
    const d=state.darkMode; const l=state.language;
    const q=(query||'').trim();
    const results=q?performSearch(q):[];
    function hl(text) {
        if(!q||!text) return sanitize(text||'');
        const safe = sanitize(text);
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        if(!escaped) return safe;
        return safe.replace(new RegExp(escaped,'gi'), m=>`<mark style="background:rgba(5,150,105,.25);color:inherit;border-radius:2px;padding:0 1px">${m}</mark>`);
    }
    if(!q) return `
        <div class="text-center py-16 reveal" style="color:${d?'#6b7280':'#9ca3af'}">
            <div style="font-size:3.5rem;margin-bottom:1rem;opacity:.4" aria-hidden="true">🔍</div>
            <p class="font-bold text-lg mb-2" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'কী খুঁজছেন?':'What are you looking for?'}</p>
            <p class="text-sm">${l==='bn'?'দোয়া, ইমাম, ব্লগ পোস্ট — সব কিছু খুঁজুন':'Search for duas, imams, blog posts & more'}</p>
            <div class="flex flex-wrap justify-center gap-2 mt-5">
                ${['দুআ কুমাইল','ইমাম আলী','কারবালা','তাওয়াক্কুল'].map(hint=>`
                <button onclick="state.searchQuery='${hint}';render()"
                    style="padding:7px 16px;border-radius:50px;font-size:12px;font-weight:600;cursor:pointer;
                    background:rgba(5,150,105,.1);color:${d?'#34d399':'#059669'};
                    border:1.5px solid rgba(5,150,105,.22)">
                    ${hint}
                </button>`).join('')}
            </div>
        </div>`;
    if(results.length===0) return `
        <div class="text-center py-16 reveal" style="color:${d?'#6b7280':'#9ca3af'}">
            <div style="font-size:3rem;margin-bottom:.75rem;opacity:.45" aria-hidden="true">📭</div>
            <p class="font-bold text-base">"${sanitize(q)}" ${l==='bn'?'এর জন্য কোনো ফলাফল নেই':'returned no results'}</p>
            <p class="text-sm mt-1">${l==='bn'?'ভিন্ন শব্দ দিয়ে চেষ্টা করুন':'Try different keywords'}</p>
        </div>`;
    return `
        <div class="space-y-3">
            <p class="text-xs font-semibold reveal" style="color:${d?'#6b7280':'#9ca3af'};text-transform:uppercase;letter-spacing:.8px">
                ${l==='bn'?`"${sanitize(q)}" — ${results.length}টি ফলাফল`:`${results.length} results for "${sanitize(q)}"`}
            </p>
            ${results.map((r,ri)=>`
            <button data-action="${r.action}" data-param="${r.param}" ${r.param2!==undefined?`data-param2="${r.param2}"`:''}
                class="w-full text-left card-luxury border reveal"
                style="background:${d?'#1e2a22':'#ffffff'};border-color:${d?'rgba(5,150,105,.12)':'rgba(5,150,105,.1)'};
                box-shadow:var(--shadow-xs);padding:14px 16px;
                animation:fadeInUp .3s ease-out ${ri*.03}s both;display:flex;align-items:center;gap:12px">
                <span style="width:40px;height:40px;border-radius:12px;flex-shrink:0;
                    background:${r.color||'#059669'}15;
                    display:flex;align-items:center;justify-content:center;font-size:1.2rem;
                    border:1px solid ${r.color||'#059669'}22" aria-hidden="true">
                    ${r.icon||'📄'}
                </span>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm truncate" style="color:${d?'#f9fafb':'#111827'}">${hl(r.title)}</p>
                    ${r.subtitle?`<p class="text-xs mt-0.5 truncate" style="color:${d?'#6b7280':'#9ca3af'}">${hl(r.subtitle)}</p>`:''}
                </div>
                <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:50px;flex-shrink:0;
                    background:${r.color||'#059669'}12;color:${r.color||'#059669'};
                    border:1px solid ${r.color||'#059669'}25">
                    ${sanitize(r.type||'')}
                </span>
            </button>`).join('')}
        </div>`;
}

function renderSearchPage() {
    const d=state.darkMode; const l=state.language;
    const q=(state.searchQuery||'').trim();

    return `
    <div class="space-y-6 page-enter">

        <!-- Header -->
        <div class="reveal">
            <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#0369a1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                🔍 ${l==='bn'?'সার্চ':'Search'}
            </h1>
        </div>

        <!-- Search box -->
        <div class="reveal" role="search" style="position:relative">
            <div style="position:absolute;left:16px;top:50%;transform:translateY(-50%);pointer-events:none;color:${d?'#6b7280':'#9ca3af'}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            <input
                id="search-input"
                type="search"
                value="${sanitize(q)}"
                aria-label="${l==='bn'?'সার্চ':'Search'}"
                placeholder="${l==='bn'?'দোয়া, ইমাম, ব্লগ পোস্ট খুঁজুন...':'Search duas, imams, blog posts...'}"
                oninput="state.searchQuery=this.value;const sr=document.getElementById('search-results');if(sr)sr.innerHTML=searchResultsHTML(this.value)"
                onkeydown="if(event.key==='Enter'){state.searchQuery=this.value;render()}"
                style="width:100%;padding:14px 16px 14px 48px;border-radius:18px;font-size:.95rem;
                background:${d?'#1e2a22':'#ffffff'};
                border:2px solid ${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.18)'};
                color:${d?'#f9fafb':'#111827'};outline:none;
                box-shadow:0 4px 20px rgba(5,150,105,.1);
                transition:border-color .2s,box-shadow .2s"
                onfocus="this.style.borderColor='#059669';this.style.boxShadow='0 4px 24px rgba(5,150,105,.22)'"
                onblur="this.style.borderColor='${d?'rgba(5,150,105,.2)':'rgba(5,150,105,.18)'}';this.style.boxShadow='0 4px 20px rgba(5,150,105,.1)'"
            />
            ${q?`<button onclick="state.searchQuery='';render()" aria-label="${l==='bn'?'সার্চ মুছুন':'Clear search'}" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.06)'};border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${d?'#9ca3af':'#6b7280'}">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg>
            </button>`:''}
        </div>

        <!-- Results -->
        <div id="search-results" aria-live="polite" aria-atomic="true">
            ${searchResultsHTML(q)}
        </div>
    </div>`;
}
// ============================================================================
// PAGE: ABOUT
// ============================================================================
function renderAboutPage() {
    const d=state.darkMode; const l=state.language;
    return `
    <div class="space-y-8">
        <h1 class="text-3xl font-bold">ℹ️ ${t('about')}</h1>
        <article class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-8">
            <p class="text-lg mb-6">${l==='bn'?'আহলে বাইত (আ.) ওয়েবসাইটে আপনাকে স্বাগতম। আমরা ইসলামিক জ্ঞান ছড়িয়ে দিতে প্রতিশ্রুতিবদ্ধ।':'Welcome to the Ahl al-Bayt (a.s) website. We are committed to spreading authentic Islamic knowledge.'}</p>
            <div class="space-y-4">
                <h2 class="text-xl font-bold">${l==='bn'?'আমাদের লক্ষ্য':'Our Mission'}</h2>
                <p>${l==='bn'?'কুরআন, হাদিস এবং আহলে বাইতের শিক্ষা প্রচার করা।':'To promote the teachings of Quran, Hadith, and Ahl al-Bayt.'}</p>
            </div>
        </article>
    </div>`;
}

// ============================================================================
// PAGE: BOOKMARKS
// ============================================================================
function renderBookmarksPage() {
    const d=state.darkMode; const l=state.language;
    const allPosts=[...(typeof blogPosts!=='undefined'?blogPosts:[]),...state.customPosts];
    const bkPosts=allPosts.filter(p=>state.bookmarks.includes('post-'+p.id));
    const tab = state.bookmarksTab || 'bookmarks';
    const history = state.readingHistory || [];

    // Knowledge Center bookmarks (Hadith / Masail / Q&A / Fatwa) — kcType-id keys
    const KC_BOOKMARK_TYPES = {kcHadith:'hadith', kcMasail:'masail', kcQa:'qa', kcFatwa:'fatwa'};
    const kcBookmarkItems = (typeof kcFindItem==='function') ? (state.bookmarks||[])
        .map(key=>{
            const dashIdx = key.indexOf('-');
            if (dashIdx===-1) return null;
            const bmType = key.slice(0,dashIdx);
            const id = key.slice(dashIdx+1);
            const tabKey = KC_BOOKMARK_TYPES[bmType];
            if (!tabKey) return null;
            const item = kcFindItem(tabKey, id);
            return item ? {tabKey, item} : null;
        })
        .filter(Boolean) : [];

    const tabBtn = (key, icon, label) => `
        <button data-action="setBookmarksTab" data-param="${key}"
            class="px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab===key
                ? 'text-white' : (d?'bg-gray-800 text-gray-400':'bg-gray-100 text-gray-500')}"
            style="${tab===key?'background:linear-gradient(135deg,#059669,#065f46)':''}">${icon} ${label}</button>`;

    const bookmarksSection = bkPosts.length===0?`
        <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
            <div class="text-6xl mb-4">🔖</div>
            <p class="text-lg">${l==='bn'?'কোনো বুকমার্ক নেই':'No bookmarks yet'}</p>
            <p class="text-sm mt-2">${l==='bn'?'ব্লগ পোস্টে 🤍 চাপলে বুকমার্ক হবে':'Press 🤍 on any blog post to bookmark it'}</p>
        </div>`:`
        <div class="grid md:grid-cols-2 gap-6">
            ${bkPosts.map(post=>`
                <article class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-6 fade-in">
                    <span class="text-xs px-3 py-1 rounded-full ${d?'bg-green-900 text-green-300':'bg-green-100 text-green-700'} mb-3 inline-block">${sanitize(post.category)}</span>
                    <h3 class="text-xl font-bold mb-2">${sanitize(l==='bn'?post.titleBn:post.titleEn)}</h3>
                    <p class="text-sm ${d?'text-gray-400':'text-gray-600'} mb-4">${sanitize(post.excerpt)}</p>
                    <div class="flex gap-3">
                        <button data-action="readPost" data-param="${post.id}" class="${d?'text-green-400':'text-green-600'} font-medium hover:underline">${t('readMore')} →</button>
                        <button data-action="toggleBookmark" data-param="${post.id}" data-param2="post" class="ml-auto" aria-pressed="${isBookmarked(post.id,'post')?'true':'false'}">🔖</button>
                    </div>
                </article>`).join('')}
        </div>`;

    const knowledgeSection = kcBookmarkItems.length===0?`
        <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
            <div class="text-6xl mb-4">📚</div>
            <p class="text-lg">${l==='bn'?'জ্ঞান কেন্দ্রে কোনো বুকমার্ক নেই':'No Knowledge Center bookmarks yet'}</p>
            <p class="text-sm mt-2">${l==='bn'?'হাদিস, মাসাইল, প্রশ্নোত্তর বা ফতোয়ায় ⭐ চাপলে এখানে দেখা যাবে':'Press ⭐ on any Hadith, Masail, Q&A or Fatwa to see it here'}</p>
        </div>`:`
        <div class="grid md:grid-cols-2 gap-6">
            ${kcBookmarkItems.map(({tabKey,item})=>{
                const meta = kcTabMeta(tabKey);
                const title = kcItemTitle(tabKey, item, l);
                const body = kcItemBody(tabKey, item, l);
                return `
                <article class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-6 fade-in">
                    <span class="text-xs px-3 py-1 rounded-full mb-3 inline-block" style="background:${meta.color}18;color:${meta.color}">${meta.icon} ${l==='bn'?meta.bn:meta.en}</span>
                    <h3 class="text-lg font-bold mb-2 line-clamp-3">${sanitize(title)}</h3>
                    ${body?`<p class="text-sm ${d?'text-gray-400':'text-gray-600'} mb-4 line-clamp-2">${sanitize(body)}</p>`:''}
                    <div class="flex gap-3">
                        <button data-action="kcOpenDetail" data-param="${tabKey}" data-param2="${item.id}" class="${d?'text-green-400':'text-green-600'} font-medium hover:underline">${l==='bn'?'বিস্তারিত':'View'} →</button>
                        <button data-action="toggleBookmark" data-param="${item.id}" data-param2="kc${tabKey.charAt(0).toUpperCase()+tabKey.slice(1)}" class="ml-auto">🔖</button>
                    </div>
                </article>`;
            }).join('')}
        </div>`;

    const historySection = history.length===0?`
        <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
            <div class="text-6xl mb-4">🕓</div>
            <p class="text-lg">${l==='bn'?'কোনো পঠিত ইতিহাস নেই':'No reading history yet'}</p>
            <p class="text-sm mt-2">${l==='bn'?'কোনো পোস্ট বা দোয়া পড়লে এখানে দেখা যাবে':'Posts and duas you read will show up here'}</p>
        </div>`:`
        <div class="flex justify-end mb-2">
            <button data-action="clearReadingHistory" class="text-xs font-bold ${d?'text-gray-400':'text-gray-500'} hover:underline">${l==='bn'?'🗑️ সব মুছুন':'🗑️ Clear all'}</button>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
            ${history.map(h=>`
                <article class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-6 fade-in">
                    <span class="text-xs px-3 py-1 rounded-full ${d?'bg-blue-900 text-blue-300':'bg-blue-100 text-blue-700'} mb-3 inline-block">${h.type==='post'?(l==='bn'?'ব্লগ':'Blog'):(l==='bn'?'দোয়া':'Dua')}</span>
                    <h3 class="text-lg font-bold mb-3">${sanitize(l==='bn'?h.titleBn:h.titleEn)}</h3>
                    <button data-action="${h.type==='post'?'readPost':'readDua'}" data-param="${h.id}" class="${d?'text-green-400':'text-green-600'} font-medium hover:underline">${t('readMore')} →</button>
                </article>`).join('')}
        </div>`;

    return `
    <div class="space-y-6">
        <h2 class="text-3xl font-bold">🔖 ${t('bookmarks')}</h2>
        <div class="flex gap-2 flex-wrap">
            ${tabBtn('bookmarks','🔖',l==='bn'?'ব্লগ বুকমার্ক':'Blog Bookmarks')}
            ${tabBtn('knowledge','📚',l==='bn'?'জ্ঞান কেন্দ্র':'Knowledge Center')}
            ${tabBtn('history','🕓',l==='bn'?'সাম্প্রতিক পঠিত':'Recently Read')}
        </div>
        ${tab==='history'?historySection:tab==='knowledge'?knowledgeSection:bookmarksSection}
    </div>`;
}


// ============================================================================
// PAGE: READ POST
// ============================================================================
function renderReadPostPage()
{
    const post=state.currentPost; const d=state.darkMode; const l=state.language;
    if(!post) return renderBlogPage();
    const ac=['#059669','#7c3aed','#b45309','#0369a1','#be185d','#dc2626'];
    const idx2=(typeof blogPosts!=='undefined'?blogPosts:[]).indexOf(post); const a=ac[idx2>=0?idx2%ac.length:0];
    return `
    <div class="max-w-3xl mx-auto page-enter">
        <button data-action="changePage" data-param="${state.previousPage||'blog'}" class="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all" style="background:${a}12;color:${a}">← ${l==='bn'?`${t('blog')}-এ ফিরুন`:`Back to ${t('blog')}`}</button>
        <article class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border" style="box-shadow:var(--shadow-lg)">
            <div style="height:4px;background:linear-gradient(90deg,${a},#7c3aed,${a});border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
            <div class="p-7 md:p-10">
                <div class="flex items-center gap-3 mb-5 flex-wrap">
                    <span class="text-xs px-3 py-1.5 rounded-full font-bold" style="background:${a}14;color:${a};border:1px solid ${a}22">${sanitize(post.category)}</span>
                    <span class="text-xs ${d?'text-gray-400':'text-gray-500'}">⏱ ${sanitize(post.readTime)}</span>
                    ${post.date?`<span class="text-xs ${d?'text-gray-500':'text-gray-400'}">📅 ${sanitize(post.date)}</span>`:''}
                </div>
                <h1 class="text-2xl md:text-4xl font-black mb-6 leading-tight">${sanitize(l==='bn'?post.titleBn:post.titleEn)}</h1>
                <div style="height:2px;width:56px;background:linear-gradient(90deg,${a},transparent);margin-bottom:1.75rem;border-radius:2px"></div>
                <div class="${d?'text-gray-300':'text-gray-700'} leading-relaxed text-base" style="white-space:pre-line">${sanitize(l==='bn'?post.contentBn:post.contentEn)}</div>
                <div class="flex items-center gap-3 mt-8 pt-6 flex-wrap" style="border-top:1px solid ${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}">
                    <button data-action="sharePost" data-param="${post.id}" class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all" style="background:${a}12;color:${a};border:1px solid ${a}20">🔗 ${l==='bn'?'শেয়ার':'Share'}</button>
                    <button data-action="toggleBookmark" data-param="${post.id}" data-param2="post" class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all ${d?'bg-gray-700 text-gray-300':'bg-gray-100 text-gray-600'}">${isBookmarked(post.id,'post')?'🔖 '+(l==='bn'?'বুকমার্কড':'Bookmarked'):'🤍 '+(l==='bn'?'বুকমার্ক':'Bookmark')}</button>
                </div>
            </div>
        </article>
    </div>`;
}

// ============================================================================
// PAGE: READ DUA
// ============================================================================
function renderAnalyticsPage() {
    const d=state.darkMode; const l=state.language;
    if (!state.isAdmin) return `<div class="text-center py-16">
        <div class="text-6xl mb-4">🔒</div>
        <p>${l==='bn'?'শুধুমাত্র অ্যাডমিনের জন্য':'Admin only'}</p>
    </div>`;
    const views = state.pageViews;
    const sorted = Object.entries(views).sort((a,b)=>b[1]-a[1]);
    const total = Object.values(views).reduce((s,v)=>s+v,0);
    const maxV = sorted[0]?.[1]||1;
    return `
    <div class="space-y-8">
        <h2 class="text-3xl font-bold">📊 ${t('analytics')}</h2>
        <div class="grid sm:grid-cols-3 gap-6">
            <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-6 text-center">
                <p class="text-4xl font-bold ${d?'text-green-400':'text-green-600'} stat-badge">${total}</p>
                <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-2">${l==='bn'?'মোট পেজ ভিউ':'Total Page Views'}</p>
            </div>
            <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-6 text-center">
                <p class="text-4xl font-bold ${d?'text-blue-400':'text-blue-600'} stat-badge">${sorted.length}</p>
                <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-2">${l==='bn'?'ভিজিট করা পেজ':'Pages Visited'}</p>
            </div>
            <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-6 text-center">
                <p class="text-4xl font-bold ${d?'text-purple-400':'text-purple-600'} stat-badge">${state.customPosts.length}</p>
                <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-2">${l==='bn'?'কাস্টম পোস্ট':'Custom Posts'}</p>
            </div>
        </div>
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6">
            <h3 class="font-bold text-lg mb-6">${l==='bn'?'পেজ ভিউ রিপোর্ট':'Page View Report'}</h3>
            ${sorted.length===0?`<p class="${d?'text-gray-500':'text-gray-400'}">${l==='bn'?'এখনো কোনো তথ্য নেই':'No data yet'}</p>`:`
            <div class="space-y-4">
                ${sorted.map(([page,count])=>{
                    const pct=Math.round(count/maxV*100);
                    return `<div>
                        <div class="flex justify-between text-sm mb-1">
                            <span class="font-medium">${t(page)||page}</span>
                            <span class="${d?'text-green-400':'text-green-600'} font-bold stat-badge">${count}</span>
                        </div>
                        <div class="${d?'bg-gray-900':'bg-gray-100'} rounded-full h-2 overflow-hidden">
                            <div class="bg-green-500 h-2 rounded-full transition-all" style="width:${pct}%"></div>
                        </div>
                    </div>`;}).join('')}
            </div>`}
        </div>

        <!-- DUA / ZIYARAT MANAGEMENT -->
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6">
            <div class="flex justify-between items-center mb-5">
                <div>
                    <h3 class="font-bold text-lg">🤲 ${l==='bn'?'দোয়া ও যিয়ারত ব্যবস্থাপনা':'Dua & Ziyarat Management'}</h3>
                    <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-0.5">${l==='bn'?'কাস্টম দোয়া ও যিয়ারত যোগ, সম্পাদনা বা মুছুন':'Add, edit or delete custom duas and ziyarats'}</p>
                </div>
                <button data-action="changePage" data-param="dua" class="${d?'text-green-400':'text-green-600'} text-sm font-semibold hover:underline">${l==='bn'?'পেজে যান →':'Go to page →'}</button>
            </div>
            <div class="grid sm:grid-cols-2 gap-4 mb-5">
                <!-- Duas count card -->
                <div class="${d?'bg-gray-900':'bg-green-50'} rounded-xl p-4 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center text-2xl flex-shrink-0">🤲</div>
                    <div>
                        <p class="text-2xl font-bold">${state.customDuas.length}</p>
                        <p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'কাস্টম দোয়া':'Custom Duas'}</p>
                    </div>
                    <button data-action="openDuaEditor" data-param="dua"
                        class="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        + ${l==='bn'?'যোগ':'Add'}
                    </button>
                </div>
                <!-- Ziyarat count card -->
                <div class="${d?'bg-gray-900':'bg-amber-50'} rounded-xl p-4 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-2xl flex-shrink-0">☪️</div>
                    <div>
                        <p class="text-2xl font-bold">${state.customZiyarat.length}</p>
                        <p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'কাস্টম যিয়ারত':'Custom Ziyarat'}</p>
                    </div>
                    <button data-action="openDuaEditor" data-param="ziyarat"
                        class="ml-auto bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        + ${l==='bn'?'যোগ':'Add'}
                    </button>
                </div>
            </div>
            <!-- Recent custom duas list -->
            ${state.customDuas.length>0?`
            <div class="mb-4">
                <h4 class="text-sm font-bold mb-3 ${d?'text-green-400':'text-green-700'}">${l==='bn'?'সাম্প্রতিক দোয়া':'Recent Duas'}</h4>
                <div class="space-y-2">
                    ${state.customDuas.slice(0,3).map(dua=>`
                    <div class="flex items-center gap-3 ${d?'bg-gray-900':'bg-gray-50'} rounded-xl px-4 py-3">
                        <span class="flex-1 font-medium text-sm truncate">${sanitize(dua.titleBn||dua.titleEn||'-')}</span>
                        <button data-action="editCustomDua" data-param="${dua.id}" data-dtype="dua"
                            class="${d?'text-blue-400 hover:text-blue-300':'text-blue-600 hover:text-blue-800'} text-sm p-1 rounded transition-colors">✏️</button>
                        <button data-action="deleteCustomDua" data-param="${dua.id}" data-dtype="dua"
                            class="${d?'text-red-400 hover:text-red-300':'text-red-500 hover:text-red-700'} text-sm p-1 rounded transition-colors">🗑</button>
                    </div>`).join('')}
                </div>
            </div>`:''}
            <!-- Recent custom ziyarat list -->
            ${state.customZiyarat.length>0?`
            <div>
                <h4 class="text-sm font-bold mb-3 ${d?'text-amber-400':'text-amber-700'}">${l==='bn'?'সাম্প্রতিক যিয়ারত':'Recent Ziyarat'}</h4>
                <div class="space-y-2">
                    ${state.customZiyarat.slice(0,3).map(z=>`
                    <div class="flex items-center gap-3 ${d?'bg-gray-900':'bg-gray-50'} rounded-xl px-4 py-3">
                        <span class="flex-1 font-medium text-sm truncate">${sanitize(z.titleBn||z.titleEn||'-')}</span>
                        ${z.occasion?`<span class="text-xs ${d?'text-amber-400':'text-amber-600'} px-2 py-0.5 rounded-full ${d?'bg-amber-900/40':'bg-amber-100'}">${sanitize(z.occasion)}</span>`:''}
                        <button data-action="editCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                            class="${d?'text-blue-400 hover:text-blue-300':'text-blue-600 hover:text-blue-800'} text-sm p-1 rounded transition-colors">✏️</button>
                        <button data-action="deleteCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                            class="${d?'text-red-400 hover:text-red-300':'text-red-500 hover:text-red-700'} text-sm p-1 rounded transition-colors">🗑</button>
                    </div>`).join('')}
                </div>
            </div>`:''}
        </div>
        <!-- HADITH & AYAH MANAGEMENT -->
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6">
            <div class="flex justify-between items-center mb-5">
                <div>
                    <h3 class="font-bold text-lg">📜 ${l==='bn'?'হাদিস ও আয়াত ব্যবস্থাপনা':'Hadith & Ayah Management'}</h3>
                    <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-0.5">${l==='bn'?'প্রতিদিন নতুন হাদিস ও আয়াত যোগ করুন':'Add new hadiths and ayahs shown daily'}</p>
                </div>
            </div>
            <div class="grid sm:grid-cols-2 gap-4 mb-5">
                <div class="${d?'bg-gray-900':'bg-emerald-50'} rounded-xl p-4 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-2xl flex-shrink-0">📜</div>
                    <div>
                        <p class="text-2xl font-bold">${state.customHadiths.length}</p>
                        <p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'কাস্টম হাদিস':'Custom Hadiths'}</p>
                    </div>
                    <button data-action="openHadithEditor"
                        class="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        + ${l==='bn'?'যোগ':'Add'}
                    </button>
                </div>
                <div class="${d?'bg-gray-900':'bg-amber-50'} rounded-xl p-4 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-2xl flex-shrink-0">🌙</div>
                    <div>
                        <p class="text-2xl font-bold">${state.customAyahs.length}</p>
                        <p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'কাস্টম আয়াত':'Custom Ayahs'}</p>
                    </div>
                    <button data-action="openAyahEditor"
                        class="ml-auto bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        + ${l==='bn'?'যোগ':'Add'}
                    </button>
                </div>
            </div>
            ${state.customHadiths.length>0?`
            <div class="mb-4">
                <h4 class="text-sm font-bold mb-3 ${d?'text-emerald-400':'text-emerald-700'}">${l==='bn'?'হাদিস তালিকা':'Hadith List'}</h4>
                <div class="space-y-2">
                    ${state.customHadiths.map((h,i)=>`
                    <div class="flex items-center gap-3 ${d?'bg-gray-900':'bg-gray-50'} rounded-xl px-4 py-3">
                        <span class="flex-1 text-sm truncate italic">"${sanitize(h.textBn||h.textEn||'-')}"</span>
                        <span class="text-xs ${d?'text-gray-400':'text-gray-500'} shrink-0">${sanitize(h.sourceBn||h.sourceEn||'')}</span>
                        <button data-action="editHadith" data-param="${i}"
                            class="${d?'text-blue-400':'text-blue-600'} text-sm p-1 rounded transition-colors">✏️</button>
                        <button data-action="deleteHadith" data-param="${i}"
                            class="${d?'text-red-400':'text-red-500'} text-sm p-1 rounded transition-colors">🗑</button>
                    </div>`).join('')}
                </div>
            </div>`:''}
            ${state.customAyahs.length>0?`
            <div>
                <h4 class="text-sm font-bold mb-3 ${d?'text-amber-400':'text-amber-700'}">${l==='bn'?'আয়াত তালিকা':'Ayah List'}</h4>
                <div class="space-y-2">
                    ${state.customAyahs.map((a,i)=>`
                    <div class="flex items-center gap-3 ${d?'bg-gray-900':'bg-gray-50'} rounded-xl px-4 py-3">
                        <span class="flex-1 text-sm truncate font-arabic" dir="rtl">${sanitize(a.arabic||'-')}</span>
                        <span class="text-xs ${d?'text-gray-400':'text-gray-500'} shrink-0">${sanitize(a.ref||a.refEn||'')}</span>
                        <button data-action="editAyah" data-param="${i}"
                            class="${d?'text-blue-400':'text-blue-600'} text-sm p-1 rounded transition-colors">✏️</button>
                        <button data-action="deleteAyah" data-param="${i}"
                            class="${d?'text-red-400':'text-red-500'} text-sm p-1 rounded transition-colors">🗑</button>
                    </div>`).join('')}
                </div>
            </div>`:''}
        </div>
        <!-- QUIZ QUESTION MANAGEMENT -->
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6">
            <div class="flex justify-between items-center mb-5">
                <div>
                    <h3 class="font-bold text-lg">🧠 ${l==='bn'?'কুইজ প্রশ্ন ব্যবস্থাপনা':'Quiz Question Management'}</h3>
                    <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-0.5">${l==='bn'?'কুইজ প্রশ্ন ব্যাংকে নতুন প্রশ্ন যোগ করুন':'Add new questions to the quiz question bank'}</p>
                </div>
            </div>
            <div class="${d?'bg-gray-900':'bg-red-50'} rounded-xl p-4 flex items-center gap-4 mb-5">
                <div class="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-2xl flex-shrink-0">🧠</div>
                <div>
                    <p class="text-2xl font-bold">${quizQuestions.length}<span class="text-sm ${d?'text-gray-400':'text-gray-500'}"> + ${state.customQuizQuestions.length} ${l==='bn'?'কাস্টম':'custom'}</span></p>
                    <p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'মোট প্রশ্ন':'Total Questions'}</p>
                </div>
                <button data-action="openQuizEditor"
                    class="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                    + ${l==='bn'?'যোগ':'Add'}
                </button>
            </div>
            ${state.customQuizQuestions.length>0?`
            <div>
                <h4 class="text-sm font-bold mb-3 ${d?'text-red-400':'text-red-700'}">${l==='bn'?'কাস্টম প্রশ্ন তালিকা':'Custom Question List'}</h4>
                <div class="space-y-2">
                    ${state.customQuizQuestions.map((q,i)=>`
                    <div class="flex items-center gap-3 ${d?'bg-gray-900':'bg-gray-50'} rounded-xl px-4 py-3">
                        <span class="text-xs font-bold px-2 py-1 rounded-full shrink-0" style="background:${d?quizCatColor(q.category).bgD:quizCatColor(q.category).bg};color:${quizCatColor(q.category).c}">${quizCatLabel(q.category,l)}</span>
                        <span class="flex-1 text-sm truncate">${sanitize(l==='bn'?(q.qBn||q.qEn):(q.qEn||q.qBn)||'-')}</span>
                        <span class="text-xs ${d?'text-gray-400':'text-gray-500'} shrink-0">${quizDiffLabel(q.difficulty,l)}</span>
                        <button data-action="editQuizQuestion" data-param="${i}"
                            class="${d?'text-blue-400':'text-blue-600'} text-sm p-1 rounded transition-colors">✏️</button>
                        <button data-action="deleteQuizQuestion" data-param="${i}"
                            class="${d?'text-red-400':'text-red-500'} text-sm p-1 rounded transition-colors">🗑</button>
                    </div>`).join('')}
                </div>
            </div>`:''}
        </div>
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6">
            <h3 class="font-bold text-lg mb-4">${l==='bn'?'ফন্ট সাইজ সেটিং':'Font Size Settings'}</h3>
            <p class="${d?'text-gray-400':'text-gray-600'} text-sm mb-4">${l==='bn'?'বয়স্ক ও দৃষ্টি প্রতিবন্ধীদের জন্য ফন্ট বড় করুন:':'Increase font size for elderly or visually impaired users:'}</p>
            <div class="flex flex-wrap gap-3">
                ${[['small',l==='bn'?'ছোট':'Small'],['medium',l==='bn'?'স্বাভাবিক':'Normal'],['large',l==='bn'?'বড়':'Large'],['xlarge',l==='bn'?'অতিবড়':'X-Large']].map(([sz,lbl])=>`
                    <button data-action="setFontSize" data-param="${sz}"
                        class="${state.fontSize===sz?(d?'bg-green-700 text-white border-green-500':'bg-green-600 text-white border-green-600'):(d?'bg-gray-700 text-gray-300 border-gray-600':'bg-gray-100 text-gray-700 border-gray-300')} border-2 px-5 py-2.5 rounded-xl font-semibold transition-colors">
                        ${lbl}
                    </button>`).join('')}
            </div>
            <p class="text-sm mt-4 ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'বর্তমান সাইজ:':'Current size:'} <span class="font-bold ${d?'text-green-400':'text-green-600'}">${l==='bn'?fontSizeLabels.bn[state.fontSize]:fontSizeLabels.en[state.fontSize]}</span></p>
        </div>
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6">
            <h3 class="font-bold text-lg mb-4">${l==='bn'?'নামাজের রিমাইন্ডার':'Prayer Reminder'}</h3>
            <p class="${d?'text-gray-400':'text-gray-600'} text-sm mb-4">${l==='bn'?'নামাজের সময় ব্রাউজার নোটিফিকেশন পেতে নিচের বোতামে চাপুন।':'Press the button below to receive browser notifications at prayer times.'}</p>
            <button data-action="requestNotify" class="${d?'bg-green-900 text-green-300':'bg-green-600 text-white'} px-6 py-2.5 rounded-xl font-semibold hover:opacity-90">🔔 ${t('enableNotify')}</button>
        </div>
    </div>`;
}


