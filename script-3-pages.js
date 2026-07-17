
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
            box-shadow:var(--shadow-sm);overflow:hidden">
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
            box-shadow:var(--shadow-sm);overflow:hidden;cursor:pointer"
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
function renderDuaPage() {
    const d=state.darkMode; const l=state.language;
    const tab = state.duaTab || 'dua';
    const selectedCategory = state.duaCategory || 'all';
    const allDuas    = [...state.customDuas,...duas];
    const allZiyarat = [...ziyarats,...state.customZiyarat];
    const filteredDuas = selectedCategory==='all' ? allDuas : allDuas.filter(dua=>dua.category===selectedCategory);

    const catFilters=[
        {key:'all',     icon:'✦', label:l==='bn'?'সকল দোয়া':'All Duas',   color:'#059669', bg:'rgba(5,150,105,.15)'},
        {key:'morning', icon:'🌅', label:l==='bn'?'সকাল':'Morning',         color:'#0ea5e9', bg:'rgba(14,165,233,.15)'},
        {key:'night',   icon:'🌙', label:l==='bn'?'রাত':'Night',             color:'#8b5cf6', bg:'rgba(139,92,246,.15)'},
        {key:'hardship',icon:'⚠️', label:l==='bn'?'বিপদে':'Hardship',       color:'#ef4444', bg:'rgba(239,68,68,.15)'},
        {key:'gratitude',icon:'🙏',label:l==='bn'?'কৃতজ্ঞতা':'Gratitude',  color:'#10b981', bg:'rgba(16,185,129,.15)'},
        {key:'ramadan', icon:'🌙', label:l==='bn'?'রমজান':'Ramadan',         color:'#f97316', bg:'rgba(249,115,22,.15)'},
    ];

    return `
    <div class="space-y-6 page-enter">

        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center gap-3 reveal">
            <div>
                <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    🤲 ${t('dua')}
                </h1>
                <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">
                    ${l==='bn'?`${allDuas.length} দোয়া · ${allZiyarat.length} যিয়ারত`:`${allDuas.length} Duas · ${allZiyarat.length} Ziyarat`}
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
        </div>

        <!-- Category filter (dua tab only) -->
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

        <!-- DUA TAB content -->
        ${tab==='dua'?`
        <div class="space-y-4">
            ${filteredDuas.length===0?`
            <div class="text-center py-16" style="color:${d?'#6b7280':'#9ca3af'}">
                <div style="font-size:3rem;margin-bottom:.75rem">🤲</div>
                <p class="font-semibold">${l==='bn'?'কোনো দোয়া নেই':'No duas yet'}</p>
            </div>`:
            selectedCategory==='ramadan'
            ? renderRamadanLayout(allDuas, d, l)
            :
            filteredDuas.map((dua,i)=>{
                const isCustom=!!dua.id;
                // Bug #8 fix: `i` is the position in filteredDuas (which may be a
                // category-filtered subset). When a non-custom dua is opened via
                // readDua, the param must be its index in the global `duas[]` array,
                // not its position in the filtered list. Using `duas.indexOf(dua)`
                // gives the correct stable index regardless of any active filter.
                const idx=isCustom?('c'+dua.id):duas.indexOf(dua);
                return `
                <article class="card-luxury border reveal"
                    style="background:${d?'#1e2a22':'#ffffff'};
                    border-color:${d?'rgba(5,150,105,.15)':'rgba(5,150,105,.1)'};
                    box-shadow:var(--shadow-sm)">
                    <div style="height:3px;background:linear-gradient(90deg,#059669,#c9a227,#059669);background-size:200% 100%;animation:goldShimmer 3s linear infinite;border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
                    <div class="p-5">
                        <!-- Title row -->
                        <div class="flex items-start justify-between gap-3 mb-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1 flex-wrap">
                                    ${isCustom?`<span class="${d?'gold-badge-dark':'gold-badge'}">${l==='bn'?'কাস্টম':'Custom'}</span>`:''}
                                    <h2 class="font-bold text-base" style="color:${d?'#f9fafb':'#111827'}">${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}</h2>
                                </div>
                                ${dua.source?`<p class="text-xs" style="color:${d?'#6b7280':'#9ca3af'}">${sanitize(dua.source)}</p>`:''}
                            </div>
                            ${state.isAdmin&&isCustom?`
                            <div class="flex gap-1 flex-shrink-0">
                                <button data-action="editCustomDua" data-param="${dua.id}" data-dtype="dua"
                                    aria-label="${l==='bn'?'সম্পাদনা করুন':'Edit'} ${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}"
                                    style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;background:${d?'rgba(59,130,246,.15)':'rgba(59,130,246,.1)'};border:1px solid rgba(59,130,246,.25);color:${d?'#93c5fd':'#1d4ed8'}">✏️</button>
                                <button data-action="deleteCustomDua" data-param="${dua.id}" data-dtype="dua"
                                    aria-label="${l==='bn'?'মুছুন':'Delete'} ${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}"
                                    style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);color:#ef4444">🗑</button>
                            </div>`:''}
                        </div>
                        <!-- Arabic block -->
                        <div class="rounded-2xl p-5 mb-4"
                            style="background:${d?'rgba(180,83,9,.08)':'rgba(254,243,199,.6)'};border:1px solid ${d?'rgba(180,83,9,.18)':'rgba(180,83,9,.14)'}">
                            <p class="arabic-text arabic-reveal text-center mb-3" dir="rtl" lang="ar"
                                style="font-size:1.6rem;line-height:2.2;color:${d?'#fbbf24':'#78350f'}">
                                ${sanitize(dua.arabic)}
                            </p>
                            ${dua.transliteration?`<p class="text-center text-xs italic mb-2" style="color:${d?'#9ca3af':'#6b7280'}">${sanitize(dua.transliteration)}</p>`:''}
                            <p class="text-center text-sm leading-relaxed" style="color:${d?'#d1d5db':'#374151'}">${sanitize(l==='bn'?dua.meaningBn:dua.meaningEn)}</p>
                        </div>
                        <!-- Read more -->
                        <button data-action="readDua" data-param="${idx}"
                            style="font-size:12.5px;font-weight:700;padding:8px 20px;border-radius:50px;
                            background:rgba(5,150,105,.12);color:${d?'#34d399':'#059669'};
                            border:1.5px solid rgba(5,150,105,.25);cursor:pointer;
                            display:inline-flex;align-items:center;gap:6px;transition:all .2s">
                            ${t('readMore')}
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                        </button>
                    </div>
                </article>`;
            }).join('')}
        </div>`:''}

        <!-- ZIYARAT TAB content -->
        ${tab==='ziyarat'?`
        <div class="space-y-4">
            ${allZiyarat.length===0?`
            <div class="text-center py-16" style="color:${d?'#6b7280':'#9ca3af'}">
                <div style="font-size:3rem;margin-bottom:.75rem">☪️</div>
                <p class="font-semibold text-lg mb-1">${l==='bn'?'কোনো যিয়ারত নেই':'No Ziyarat yet'}</p>
                ${state.isAdmin?`<p class="text-sm">${l==='bn'?'উপরের বাটন থেকে যিয়ারত যোগ করুন':'Use the button above to add Ziyarat'}</p>`:''}
            </div>`:
            allZiyarat.map((z,i)=>`
            <article class="card-luxury border reveal"
                style="background:${d?'#1e1a14':'#fffbf0'};
                border-color:${d?'rgba(180,83,9,.2)':'rgba(180,83,9,.15)'};
                box-shadow:var(--shadow-sm)">
                <div style="height:3px;background:linear-gradient(90deg,#b45309,#c9a227,#b45309);background-size:200% 100%;animation:goldShimmer 3s linear infinite;border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
                <div class="p-5">
                    <div class="flex items-start justify-between gap-3 mb-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <span class="${d?'gold-badge-dark':'gold-badge'}">☪️ ${l==='bn'?'যিয়ারত':'Ziyarat'}</span>
                                <h2 class="font-bold text-base" style="color:${d?'#f9fafb':'#111827'}">${sanitize(l==='bn'?z.titleBn:z.titleEn)}</h2>
                            </div>
                            ${z.occasion?`<p class="text-xs font-semibold mt-1" style="color:${d?'#fbbf24':'#92400e'}">📅 ${sanitize(z.occasion)}</p>`:''}
                            ${z.source?`<p class="text-xs mt-0.5" style="color:${d?'#6b7280':'#9ca3af'}">${sanitize(z.source)}</p>`:''}
                        </div>
                        ${state.isAdmin?`
                        <div class="flex gap-1 flex-shrink-0">
                            <button data-action="editCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                                aria-label="${l==='bn'?'সম্পাদনা করুন':'Edit'} ${sanitize(l==='bn'?z.titleBn:z.titleEn)}"
                                style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;background:${d?'rgba(59,130,246,.15)':'rgba(59,130,246,.1)'};border:1px solid rgba(59,130,246,.25)">✏️</button>
                            <button data-action="deleteCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                                aria-label="${l==='bn'?'মুছুন':'Delete'} ${sanitize(l==='bn'?z.titleBn:z.titleEn)}"
                                style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2)">🗑</button>
                        </div>`:''}
                    </div>
                    <div class="rounded-2xl p-5 mb-4"
                        style="background:${d?'rgba(180,83,9,.08)':'rgba(254,243,199,.6)'};border:1px solid ${d?'rgba(180,83,9,.18)':'rgba(180,83,9,.14)'}">
                        <p class="arabic-text text-center mb-3" dir="rtl" lang="ar"
                            style="font-size:1.6rem;line-height:2.3;color:${d?'#fbbf24':'#78350f'}">
                            ${sanitize(z.arabic)}
                        </p>
                        ${z.transliteration?`<p class="text-center text-xs italic mb-2" style="color:${d?'#9ca3af':'#6b7280'}">${sanitize(z.transliteration)}</p>`:''}
                        <p class="text-center text-sm leading-relaxed" style="color:${d?'#d1d5db':'#374151'}">${sanitize(l==='bn'?z.meaningBn:z.meaningEn)}</p>
                    </div>
                    <button data-action="readZiyarat" data-param="${z.id||i}"
                        style="font-size:12.5px;font-weight:700;padding:8px 20px;border-radius:50px;
                        background:rgba(180,83,9,.12);color:${d?'#fbbf24':'#92400e'};
                        border:1.5px solid rgba(180,83,9,.25);cursor:pointer;
                        display:inline-flex;align-items:center;gap:6px;transition:all .2s">
                        ${t('readMore')}
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                    </button>
                </div>
            </article>`).join('')}
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

    return `
    <div class="max-w-4xl mx-auto page-enter">

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
// ⚠️ MOVED 2026-07-17: renderImamsPage(), renderImamTimeline(), ও
// renderImamDetailPage() এখন ahlul-bayt-unified.js ফাইলে আছে
// (👑 ইমাম ও মাসুমিন মার্জ)। ahlul-bayt-unified.js এই ফাইলের আগে load হয়
// (index.html দেখুন), তাই এই ফাংশনগুলো এখানে আগের মতোই কল করা যাবে।

// ============================================================================
// PAGE: TASBEEH COUNTER
// ============================================================================
// ============================================================================
// PAGE: QUIZ
// ============================================================================
function renderQuizPage() {
    const d=state.darkMode; const l=state.language;
    if (state.quizFinished) {
        const score=state.quizScore; const total=quizQuestions.length;
        const pct=Math.round(score/total*100);
        return `
        <div class="space-y-8">
            <h1 class="text-3xl font-bold">🧠 ${t('quiz')}</h1>
            <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-10 text-center max-w-lg mx-auto">
                <div class="text-7xl mb-6" aria-hidden="true">${pct>=80?'🏆':pct>=50?'👍':'📖'}</div>
                <h2 class="text-2xl font-bold mb-2">${l==='bn'?'কুইজ সম্পন্ন!':'Quiz Complete!'}</h2>
                <p class="text-5xl font-bold ${d?'text-green-400':'text-green-600'} my-6">${score}/${total}</p>
                <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-xl p-4 mb-8">
                    <div class="h-4 ${d?'bg-gray-700':'bg-gray-200'} rounded-full overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${l==='bn'?'সঠিক উত্তরের শতাংশ':'Percent correct'}">
                        <div class="${pct>=80?'bg-green-500':pct>=50?'bg-yellow-500':'bg-red-400'} h-4 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <p class="text-sm mt-2 font-medium">${pct}% ${l==='bn'?'সঠিক':'correct'}</p>
                </div>
                <p class="mb-8 ${d?'text-gray-300':'text-gray-700'}">${pct>=80?(l==='bn'?'অসাধারণ! আপনার জ্ঞান চমৎকার।':'Excellent! Your knowledge is great.')
                    :pct>=50?(l==='bn'?'ভালো! আরেকটু পড়াশোনা করুন।':'Good! Study a bit more.')
                    :(l==='bn'?'আরও পড়াশোনা করুন এবং আবার চেষ্টা করুন।':'Study more and try again.')}</p>
                <button data-action="quizRestart" class="${d?'bg-green-700 hover:bg-green-600':'bg-green-600 hover:bg-green-700'} text-white px-8 py-3 rounded-xl font-semibold">🔄 ${l==='bn'?'আবার খেলুন':'Play Again'}</button>
            </div>
        </div>`;
    }
    const q=quizQuestions[state.quizIndex];
    if (!q) { state.quizFinished=true; render(); return ''; }
    const pct=Math.round((state.quizIndex/quizQuestions.length)*100);
    return `
    <div class="space-y-8">
        <div class="flex flex-wrap justify-between items-center gap-4">
            <h1 class="text-3xl font-bold">🧠 ${t('quiz')}</h1>
            <span class="${d?'text-gray-400':'text-gray-500'} text-sm">${state.quizIndex+1} / ${quizQuestions.length}</span>
        </div>
        <div class="${d?'bg-gray-900':'bg-gray-100'} rounded-full h-2 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${l==='bn'?'কুইজ অগ্রগতি':'Quiz progress'}">
            <div class="bg-green-500 h-2 rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-8 max-w-2xl mx-auto">
            <p class="text-sm font-medium ${d?'text-green-400':'text-green-600'} mb-4">${l==='bn'?'প্রশ্ন':'Question'} ${state.quizIndex+1}</p>
            <h2 class="text-xl font-bold mb-8">${sanitize(l==='bn'?q.qBn:q.qEn)}</h2>
            <div class="space-y-3">
                ${q.options.map((opt,i)=>{
                    let cls = `quiz-option border-2 ${d?'bg-gray-900 border-gray-700':'bg-gray-50 border-gray-200'} rounded-xl px-5 py-4 w-full text-left font-medium`;
                    let stateLabel = '';
                    if (state.quizAnswered!==null) {
                        if (i===q.correct) { cls+=' correct'; stateLabel = ` — ${l==='bn'?'সঠিক উত্তর':'Correct answer'}`; }
                        else if (i===state.quizAnswered) { cls+=' wrong'; stateLabel = ` — ${l==='bn'?'আপনার উত্তর, ভুল':'Your answer, incorrect'}`; }
                    }
                    const optText = sanitize(l==='bn'?opt.bn:opt.en);
                    return `<button data-action="quizAnswer" data-param="${i}" class="${cls}" ${state.quizAnswered!==null?'disabled="disabled"':''}
                        ${stateLabel?`aria-label="${['A','B','C','D'][i]}. ${optText}${stateLabel}"`:''}>
                        <span class="${d?'text-gray-400':'text-gray-400'} mr-3" aria-hidden="true">${['A','B','C','D'][i]}.</span>
                        ${optText}
                    </button>`;
                }).join('')}
            </div>
        </div>
        <div class="text-center">
            <p class="${d?'text-gray-400':'text-gray-500'} text-sm" aria-live="polite">${l==='bn'?'স্কোর':'Score'}: ${state.quizScore}/${state.quizIndex+(state.quizAnswered!==null?1:0)}</p>
        </div>
    </div>`;
}

// ============================================================================
// PAGE: SEARCH
// ============================================================================
function performSearch(q) {
    const d=state.darkMode; const l=state.language;
    const lower=q.toLowerCase();
    const results=[];
    // Search imams
    const allImams=[...masumeen,...imams];
    allImams.forEach(im=>{
        const name=l==='bn'?im.nameBn:im.nameEn;
        const epithet=l==='bn'?im.epithetBn:im.epithetEn;
        if((name||'').toLowerCase().includes(lower)||(epithet||'').toLowerCase().includes(lower)||(im.arabicName||'').includes(q)){
            results.push({title:name,subtitle:epithet,icon:'👑',color:'#059669',type:l==='bn'?'ইমাম':'Imam',action:'viewImam',param:im.id});
        }
    });
    // Search duas
    const allDuas=[...state.customDuas,...duas];
    allDuas.forEach((dua,i)=>{
        const title=l==='bn'?dua.titleBn:dua.titleEn;
        const meaning=l==='bn'?dua.meaningBn:dua.meaningEn;
        if((title||'').toLowerCase().includes(lower)||(meaning||'').toLowerCase().includes(lower)||(dua.arabic||'').includes(q)){
            const isCustom=!!dua.id;
            results.push({title,subtitle:dua.source||'',icon:'🤲',color:'#7c3aed',type:l==='bn'?'দোয়া':'Dua',action:'readDua',param:isCustom?'c'+dua.id:i-state.customDuas.length});
        }
    });
    // Search blog
    const allPosts=[...state.customPosts,...blogPosts];
    allPosts.forEach(post=>{
        const title=l==='bn'?post.titleBn:post.titleEn;
        if((title||'').toLowerCase().includes(lower)||(post.excerpt||'').toLowerCase().includes(lower)){
            results.push({title,subtitle:post.category||'',icon:'📝',color:'#0369a1',type:l==='bn'?'ব্লগ':'Blog',action:'readPost',param:post.id});
        }
    });
    // Search ziyarat
    const allZ=[...ziyarats,...state.customZiyarat];
    allZ.forEach((z,i)=>{
        const title=l==='bn'?z.titleBn:z.titleEn;
        if((title||'').toLowerCase().includes(lower)||(z.arabic||'').includes(q)){
            results.push({title,subtitle:z.occasion||'',icon:'☪️',color:'#b45309',type:l==='bn'?'যিয়ারত':'Ziyarat',action:'readZiyarat',param:z.id||i});
        }
    });
    // Search hadiths (pool: custom if any, else built-in)
    const hadithPool=(state.customHadiths&&state.customHadiths.length>0)?state.customHadiths:hadiths;
    hadithPool.forEach((h,i)=>{
        const text=l==='bn'?h.textBn:h.textEn;
        const src=l==='bn'?h.sourceBn:h.sourceEn;
        if((text||'').toLowerCase().includes(lower)||(src||'').toLowerCase().includes(lower)){
            // hadithIndex uses 1-based "manual mode" (0 means "auto rotate by date"),
            // so an i===0 match is requested via pool.length (pool.length % pool.length === 0).
            results.push({title:text,subtitle:src||'',icon:'📜',color:'#7c3aed',type:l==='bn'?'হাদিস':'Hadith',action:'viewHadith',param:i===0?hadithPool.length:i});
        }
    });
    // Search PDF library (all folders, not just the default one)
    const pdfFolders=[
        {key:'pdf',        list:state.pdfList||[],          label:l==='bn'?'দোয়া ও যিয়ারত':'Dua & Ziyarat'},
        {key:'nahjul',     list:state.nahjulPdfs||[],        label:l==='bn'?'নাহজুল বালাগা':'Nahjul Balagha'},
        {key:'sahifa',     list:state.sahifaPdfs||[],        label:l==='bn'?'সাহিফা সাজ্জাদিয়্যা':'Sahifa Sajjadiya'},
        {key:'imamhadiths',list:state.imamHadithPdfs||[],    label:l==='bn'?'ইমামদের হাদিস':'Imam Hadiths'},
        {key:'specialdays',list:state.specialDayPdfs||[],    label:l==='bn'?'বিশেষ দিন':'Special Days'},
    ];
    pdfFolders.forEach(folder=>{
        folder.list.forEach(pdf=>{
            if((pdf.name||'').toLowerCase().includes(lower)){
                results.push({title:pdf.name,subtitle:folder.label,icon:'📕',color:'#059669',type:l==='bn'?'পিডিএফ':'PDF',action:'setLibraryTab',param:folder.key});
            }
        });
    });
    // Search family tree — Prophet & Fatima Zahra only (the 12 Imams are already
    // covered above via masumeen/imams, so re-adding them here would duplicate results)
    if(typeof familyTreeDatabase!=='undefined'&&familyTreeDatabase){
        [['prophet',familyTreeDatabase.prophet],['fatima',familyTreeDatabase.fatima]].forEach(([key,person])=>{
            if(!person) return;
            const name=l==='bn'?person.bengaliName:(person.englishName||person.englishAbbr);
            if((name||'').toLowerCase().includes(lower)||(person.description||'').toLowerCase().includes(lower)||(person.arabicName||'').includes(q)){
                results.push({title:name,subtitle:person.significance||'',icon:'🌳',color:'#78350f',type:l==='bn'?'বংশধারা':'Family Tree',action:'viewFamilyPerson',param:key});
            }
        });
    }
    return results.slice(0,30);
}

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
        {ar:'اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ',bn:'দরুদে ইব্রাহিম',en:'Durood Ibrahim',target:10,color:'#be123c'},
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
            <button data-action="${r.action}" data-param="${r.param}"
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
        <div class="flex gap-2">
            ${tabBtn('bookmarks','🔖',l==='bn'?'বুকমার্ক':'Bookmarks')}
            ${tabBtn('history','🕓',l==='bn'?'সাম্প্রতিক পঠিত':'Recently Read')}
        </div>
        ${tab==='history'?historySection:bookmarksSection}
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


