// ============================================================================
// EDITOR MODAL RENDER FUNCTIONS
// Extracted from script-4-boot.js (Phase C2) — pure relocation, no logic
// changes. Depends on globals defined in script-1-core.js: state, sanitize,
// saveQuizQuestion(), closeDuaEditor(), saveDuaItem(), customArrayForType().
// Must load AFTER script-1-core.js and BEFORE script-4-boot.js, whose
// render() calls these functions by name.
// ============================================================================

function renderHadithEditorModal() {
    if (!state.showHadithEditor) return '';
    const d = state.darkMode; const l = state.language;
    const h = state.editingHadith || {};
    return `
    <div class="modal-overlay fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style="background:rgba(0,0,0,0.7)">
        <div class="${d?'bg-gray-900':'bg-white'} rounded-3xl p-6 w-full max-w-lg shadow-2xl my-auto">
            <div class="flex justify-between items-center mb-5">
                <h3 class="font-bold text-lg">📜 ${l==='bn'?(h._idx!=null?'হাদিস সম্পাদনা':'নতুন হাদিস'):(h._idx!=null?'Edit Hadith':'New Hadith')}</h3>
                <button onclick="event.stopPropagation();state.showHadithEditor=false;state.editingHadith=null;render();" class="text-2xl leading-none opacity-60 hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200">×</button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'হাদিস (বাংলা)':'Hadith (Bengali)'}</label>
                    <textarea id="he-textBn" rows="3" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="${l==='bn'?'বাংলায় হাদিস লিখুন...':'Write hadith in Bengali...'}">${sanitize(h.textBn||'')}</textarea>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'হাদিস (ইংরেজি)':'Hadith (English)'} <span class="opacity-50">(${l==='bn'?'ঐচ্ছিক':'optional'})</span></label>
                    <textarea id="he-textEn" rows="2" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Write hadith in English...">${sanitize(h.textEn||'')}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'সূত্র (বাংলা)':'Source (Bengali)'}</label>
                        <input id="he-sourceBn" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="${l==='bn'?'যেমন: সহিহ বুখারি':'e.g. Sahih Bukhari'}" value="${sanitize(h.sourceBn||'')}">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'সূত্র (ইংরেজি)':'Source (English)'}</label>
                        <input id="he-sourceEn" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Sahih Bukhari" value="${sanitize(h.sourceEn||'')}">
                    </div>
                </div>
            </div>
            <div class="flex gap-3 mt-6" style="position:relative;z-index:10">
                <button onclick="event.stopPropagation();state.showHadithEditor=false;state.editingHadith=null;render();" style="flex:1;padding:12px;border-radius:16px;font-weight:600;font-size:.875rem;background:${d?'#374151':'#f3f4f6'};color:${d?'#d1d5db':'#374151'};border:none;cursor:pointer">${l==='bn'?'বাতিল':'Cancel'}</button>
                <button onclick="event.stopPropagation();(function(){const textBn=(document.getElementById('he-textBn')?.value||'').trim();const textEn=(document.getElementById('he-textEn')?.value||'').trim();const sourceBn=(document.getElementById('he-sourceBn')?.value||'').trim();const sourceEn=(document.getElementById('he-sourceEn')?.value||'').trim();if(!textBn&&!textEn){alert(state.language==='bn'?'হাদিস লিখুন':'Please enter hadith text');return;}const item={textBn,textEn,sourceBn,sourceEn};const idx=${h._idx!=null?h._idx:'null'};if(idx!==null)state.customHadiths[idx]=item;else state.customHadiths.push(item);state.hadithIndex=0;state.showHadithEditor=false;state.editingHadith=null;saveState();render();})()" style="flex:1;padding:12px;border-radius:16px;font-weight:600;font-size:.875rem;background:#059669;color:white;border:none;cursor:pointer">${l==='bn'?'সংরক্ষণ':'Save'}</button>
            </div>
        </div>
    </div>`;
}

function renderQuizEditorModal() {
    if (!state.showQuizEditor) return '';
    const d = state.darkMode; const l = state.language;
    const q = state.editingQuizQuestion || {};
    const opts = q.options || [{}, {}, {}, {}];
    const correct = q.correct != null ? q.correct : 0;
    return `
    <div class="modal-overlay fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style="background:rgba(0,0,0,0.7)">
        <div class="${d?'bg-gray-900':'bg-white'} rounded-3xl p-6 w-full max-w-2xl shadow-2xl my-auto">
            <div class="flex justify-between items-center mb-5">
                <h3 class="font-bold text-lg">🧠 ${l==='bn'?(q._idx!=null?'প্রশ্ন সম্পাদনা':'নতুন প্রশ্ন'):(q._idx!=null?'Edit Question':'New Question')}</h3>
                <button data-action="closeQuizEditor" class="text-2xl leading-none opacity-60 hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200">×</button>
            </div>
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'ক্যাটাগরি':'Category'}</label>
                        <select id="qz-category" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                            ${quizCategories.map(c=>`<option value="${c.key}" ${q.category===c.key?'selected':''}>${c.icon} ${l==='bn'?c.bn:c.en}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'কঠিনতা':'Difficulty'}</label>
                        <select id="qz-difficulty" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                            <option value="easy" ${q.difficulty==='easy'?'selected':''}>${l==='bn'?'সহজ':'Easy'}</option>
                            <option value="medium" ${(!q.difficulty||q.difficulty==='medium')?'selected':''}>${l==='bn'?'মাধ্যম':'Medium'}</option>
                            <option value="hard" ${q.difficulty==='hard'?'selected':''}>${l==='bn'?'কঠিন':'Hard'}</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'প্রশ্ন (বাংলা)':'Question (Bengali)'}</label>
                    <textarea id="qz-qBn" rows="2" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="${l==='bn'?'বাংলায় প্রশ্ন লিখুন...':'Write the question in Bengali...'}">${sanitize(q.qBn||'')}</textarea>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'প্রশ্ন (ইংরেজি)':'Question (English)'} <span class="opacity-50">(${l==='bn'?'ঐচ্ছিক':'optional'})</span></label>
                    <textarea id="qz-qEn" rows="2" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Write the question in English...">${sanitize(q.qEn||'')}</textarea>
                </div>
                <div>
                    <label class="text-xs font-bold mb-2 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'অপশনসমূহ (সঠিক উত্তরে ● বাছাই করুন)':'Options (mark ● next to the correct one)'}</label>
                    <div class="space-y-2">
                        ${[0,1,2,3].map(i=>`
                        <div class="flex items-center gap-2">
                            <input type="radio" name="qz-correct" value="${i}" ${correct===i?'checked':''} class="h-4 flex-shrink-0" style="accent-color:#dc2626;width:1rem">
                            <span class="text-xs font-bold ${d?'text-gray-500':'text-gray-400'} flex-shrink-0" style="width:1rem;display:inline-block">${['A','B','C','D'][i]}</span>
                            <input id="qz-opt${i}-bn" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-lg flex-1 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="${l==='bn'?'বাংলা':'Bengali'}" value="${sanitize((opts[i]&&opts[i].bn)||'')}">
                            <input id="qz-opt${i}-en" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-lg flex-1 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="${l==='bn'?'ইংরেজি':'English'}" value="${sanitize((opts[i]&&opts[i].en)||'')}">
                        </div>`).join('')}
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'ব্যাখ্যা (বাংলা)':'Explanation (Bengali)'}</label>
                    <textarea id="qz-exBn" rows="2" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="${l==='bn'?'কেন এটি সঠিক তা ব্যাখ্যা করুন...':'Explain why this is correct...'}">${sanitize(q.explanationBn||'')}</textarea>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'ব্যাখ্যা (ইংরেজি)':'Explanation (English)'} <span class="opacity-50">(${l==='bn'?'ঐচ্ছিক':'optional'})</span></label>
                    <textarea id="qz-exEn" rows="2" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Explain why this is correct...">${sanitize(q.explanationEn||'')}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'সূত্র (বাংলা)':'Source (Bengali)'} <span class="opacity-50">(${l==='bn'?'ঐচ্ছিক':'optional'})</span></label>
                        <input id="qz-srcBn" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="${l==='bn'?'যেমন: বিহারুল আনোয়ার':'e.g. Bihar al-Anwar'}" value="${sanitize(q.sourceBn||'')}">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'সূত্র (ইংরেজি)':'Source (English)'} <span class="opacity-50">(${l==='bn'?'ঐচ্ছিক':'optional'})</span></label>
                        <input id="qz-srcEn" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Bihar al-Anwar" value="${sanitize(q.sourceEn||'')}">
                    </div>
                </div>
            </div>
            <div class="flex gap-3 mt-6" style="position:relative;z-index:10">
                <button data-action="closeQuizEditor" style="flex:1;padding:12px;border-radius:16px;font-weight:600;font-size:.875rem;background:${d?'#374151':'#f3f4f6'};color:${d?'#d1d5db':'#374151'};border:none;cursor:pointer">${l==='bn'?'বাতিল':'Cancel'}</button>
                <button data-action="saveQuizQuestion" style="flex:1;padding:12px;border-radius:16px;font-weight:600;font-size:.875rem;background:#dc2626;color:white;border:none;cursor:pointer">${l==='bn'?'সংরক্ষণ':'Save'}</button>
            </div>
        </div>
    </div>`;
}

function renderAyahEditorModal() {
    if (!state.showAyahEditor) return '';
    const d = state.darkMode; const l = state.language;
    const a = state.editingAyah || {};
    return `
    <div class="modal-overlay fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style="background:rgba(0,0,0,0.7)">
        <div class="${d?'bg-gray-900':'bg-white'} rounded-3xl p-6 w-full max-w-lg shadow-2xl my-auto">
            <div class="flex justify-between items-center mb-5">
                <h3 class="font-bold text-lg">🌙 ${l==='bn'?(a._idx!=null?'আয়াত সম্পাদনা':'নতুন আয়াত'):(a._idx!=null?'Edit Ayah':'New Ayah')}</h3>
                <button onclick="event.stopPropagation();state.showAyahEditor=false;state.editingAyah=null;render();" class="text-2xl leading-none opacity-60 hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200">×</button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'আরবি আয়াত':'Arabic Ayah'}</label>
                    <textarea id="ae-arabic" rows="2" dir="rtl" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 text-right" style="font-family:serif" placeholder="اكتب الآية هنا...">${sanitize(a.arabic||'')}</textarea>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'অর্থ (বাংলা)':'Meaning (Bengali)'}</label>
                    <textarea id="ae-meaningBn" rows="2" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="${l==='bn'?'বাংলায় অর্থ লিখুন...':'Write meaning in Bengali...'}">${sanitize(a.meaningBn||'')}</textarea>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'অর্থ (ইংরেজি)':'Meaning (English)'} <span class="opacity-50">(${l==='bn'?'ঐচ্ছিক':'optional'})</span></label>
                    <input id="ae-meaningEn" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Write meaning in English..." value="${sanitize(a.meaningEn||'')}">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'রেফারেন্স (বাংলা)':'Reference (Bengali)'}</label>
                        <input id="ae-ref" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="${l==='bn'?'যেমন: সূরা বাকারা: ১৫২':'e.g. Surah Baqarah: 152'}" value="${sanitize(a.ref||'')}">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'রেফারেন্স (ইংরেজি)':'Reference (English)'}</label>
                        <input id="ae-refEn" type="text" class="${d?'bg-gray-800 text-white border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="e.g. Surah Baqarah: 152" value="${sanitize(a.refEn||'')}">
                    </div>
                </div>
            </div>
            <div class="flex gap-3 mt-6" style="position:relative;z-index:10">
                <button onclick="event.stopPropagation();state.showAyahEditor=false;state.editingAyah=null;render();" style="flex:1;padding:12px;border-radius:16px;font-weight:600;font-size:.875rem;background:${d?'#374151':'#f3f4f6'};color:${d?'#d1d5db':'#374151'};border:none;cursor:pointer">${l==='bn'?'বাতিল':'Cancel'}</button>
                <button onclick="event.stopPropagation();(function(){const arabic=(document.getElementById('ae-arabic')?.value||'').trim();const meaningBn=(document.getElementById('ae-meaningBn')?.value||'').trim();const meaningEn=(document.getElementById('ae-meaningEn')?.value||'').trim();const ref=(document.getElementById('ae-ref')?.value||'').trim();const refEn=(document.getElementById('ae-refEn')?.value||'').trim();if(!arabic){alert(state.language==='bn'?'আরবি আয়াত লিখুন':'Please enter Arabic ayah');return;}const item={arabic,meaningBn,meaningEn,ref,refEn};const idx=${a._idx!=null?a._idx:'null'};if(idx!==null)state.customAyahs[idx]=item;else state.customAyahs.push(item);state.showAyahEditor=false;state.editingAyah=null;saveState();render();})()" style="flex:1;padding:12px;border-radius:16px;font-weight:600;font-size:.875rem;background:#d97706;color:white;border:none;cursor:pointer">${l==='bn'?'সংরক্ষণ':'Save'}</button>
            </div>
        </div>
    </div>`;
}

function renderKnowledgeEditorModal() {
    if (!state.showKnowledgeEditor || !state.editingKnowledgeItem) return '';
    const d=state.darkMode; const l=state.language;
    const type=state.knowledgeEditorType; // 'nahjul'|'sahifa'|'imamhadiths'|'specialdays'
    const item=state.editingKnowledgeItem;
    const isNew=state.editingKnowledgeIdx===-1;
    const colors={nahjul:'blue',sahifa:'purple',imamhadiths:'teal',specialdays:'rose'};
    const titles={
        nahjul:{bn:'নাহজুল বালাগা',en:'Nahjul Balagha'},
        sahifa:{bn:'সাহিফা সাজ্জাদিয়্যা',en:'Sahifa Sajjadiya'},
        imamhadiths:{bn:'ইমামদের হাদিস',en:'Imam Hadiths'},
        specialdays:{bn:'বিশেষ দিন',en:'Special Day'}
    };
    const c=colors[type]||'green';
    const titleLabel=titles[type]||{bn:'',en:''};
    return `
    <div class="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto" id="knowledge-editor-overlay">
        <div class="${d?'bg-gray-900 border-gray-700':'bg-white border-gray-200'} border rounded-2xl w-full max-w-2xl shadow-2xl fade-in my-4">
            <div class="flex justify-between items-center p-6 border-b ${d?'border-gray-700':'border-gray-100'}">
                <h3 class="font-bold text-lg">${isNew?(l==='bn'?'নতুন যোগ করুন':'Add New'):(l==='bn'?'সম্পাদনা':'Edit')} — ${l==='bn'?titleLabel.bn:titleLabel.en}</h3>
                <button data-action="closeKnowledgeEditor" class="${d?'text-gray-400 hover:text-white':'text-gray-400 hover:text-gray-700'} text-2xl p-1">&times;</button>
            </div>
            <div class="p-6 space-y-4 overflow-y-auto max-h-[70vh]">

                ${type==='nahjul'?`
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'ধরন':'Type'}</label>
                <select id="ke-type" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full">
                    <option value="sermon" ${item.type==='sermon'?'selected':''}>${l==='bn'?'খুতবা':'Sermon'}</option>
                    <option value="letter" ${item.type==='letter'?'selected':''}>${l==='bn'?'চিঠি':'Letter'}</option>
                    <option value="saying" ${item.type==='saying'?'selected':''}>${l==='bn'?'বাণী':'Saying'}</option>
                </select></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'নম্বর (ঐচ্ছিক)':'Number (optional)'}</label>
                <input id="ke-number" type="text" value="${sanitize(item.number||'')}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'বিষয়/টপিক':'Topic/Category'}</label>
                <input id="ke-topic" type="text" value="${sanitize(item.topic||'')}" placeholder="${l==='bn'?'যেমন: ন্যায়বিচার, জ্ঞান':'e.g. Justice, Knowledge'}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                ` : ''}

                ${type==='sahifa'?`
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'দুআ নম্বর':'Dua Number'}</label>
                <input id="ke-number" type="text" value="${sanitize(item.number||'')}" placeholder="১, ২, ৩..." class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'অনুষ্ঠান/সময়':'Occasion/Time'}</label>
                <input id="ke-occasion" type="text" value="${sanitize(item.occasion||'')}" placeholder="${l==='bn'?'যেমন: শুক্রবার রাতের দুআ':'e.g. Prayer for Friday Night'}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'উচ্চারণ (ঐচ্ছিক)':'Transliteration (optional)'}</label>
                <input id="ke-translit" type="text" value="${sanitize(item.transliteration||'')}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'বাংলা অর্থ':'Bengali Meaning'}</label>
                <textarea id="ke-meaningBn" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-20">${sanitize(item.meaningBn||'')}</textarea></div>
                ` : ''}

                ${type==='imamhadiths'?`
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'ইমামের নাম (বাংলা)':'Imam Name (Bengali)'} <span class="text-red-500">*</span></label>
                <input id="ke-imamBn" type="text" value="${sanitize(item.imamBn||'')}" placeholder="${l==='bn'?'যেমন: ইমাম আলী (আ.)':'e.g. ইমাম আলী (আ.)'}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'ইমামের নাম (ইংরেজি)':'Imam Name (English)'}</label>
                <input id="ke-imamEn" type="text" value="${sanitize(item.imamEn||'')}" placeholder="e.g. Imam Ali (AS)" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'বিষয়':'Topic'}</label>
                <input id="ke-topic" type="text" value="${sanitize(item.topic||'')}" placeholder="${l==='bn'?'যেমন: আখলাক, ইবাদত, পরিবার':'e.g. Akhlaq, Ibadah, Family'}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                ` : ''}

                ${type==='specialdays'?`
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'ধরন':'Type'}</label>
                <select id="ke-type" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full">
                    <option value="eid" ${item.type==='eid'?'selected':''}>${l==='bn'?'ঈদ/উৎসব':'Eid/Festival'}</option>
                    <option value="martyrdom" ${item.type==='martyrdom'?'selected':''}>${l==='bn'?'শাহাদাত দিবস':'Martyrdom Day'}</option>
                    <option value="occasion" ${item.type==='occasion'?'selected':''}>${l==='bn'?'স্মরণীয় দিন':'Occasion'}</option>
                </select></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'হিজরি তারিখ':'Hijri Date'}</label>
                <input id="ke-hijriDate" type="text" value="${sanitize(item.hijriDate||'')}" placeholder="${l==='bn'?'যেমন: ১৮ জিলহজ':'e.g. 18 Dhul Hijjah'}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'সম্পর্কিত ইমাম (ঐচ্ছিক)':'Related Imam (optional)'}</label>
                <input id="ke-imam" type="text" value="${sanitize(item.imam||'')}" placeholder="${l==='bn'?'যেমন: ইমাম আলী (আ.)':'e.g. Imam Ali (AS)'}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'বিশেষ দোয়া/আমল (ঐচ্ছিক)':'Special Dua/Amal (optional)'}</label>
                <textarea id="ke-dua" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-20">${sanitize(item.dua||'')}</textarea></div>
                ` : ''}

                <!-- Common Fields -->
                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'শিরোনাম (বাংলা)':'Title (Bengali)'} <span class="text-red-500">*</span></label>
                <input id="ke-titleBn" type="text" value="${sanitize(item.titleBn||'')}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>

                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'শিরোনাম (ইংরেজি)':'Title (English)'}</label>
                <input id="ke-titleEn" type="text" value="${sanitize(item.titleEn||'')}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>

                ${type!=='specialdays'?`
                <div><label class="block mb-1.5 text-sm font-semibold">عربي — ${l==='bn'?'আরবি পাঠ':'Arabic Text'} ${type==='sahifa'?'<span class="text-red-500">*</span>':''}</label>
                <textarea id="ke-arabic" dir="rtl" lang="ar" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-24" style="font-family:'Amiri',serif;font-size:1.2rem;line-height:2">${sanitize(item.arabic||'')}</textarea></div>
                `:''}

                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'বাংলা পাঠ/বিবরণ':'Bengali Text/Description'} <span class="text-red-500">*</span></label>
                <textarea id="ke-textBn" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-28">${sanitize(item.textBn||item.descBn||item.meaningBn||'')}</textarea></div>

                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'ইংরেজি পাঠ/বিবরণ':'English Text/Description'}</label>
                <textarea id="ke-textEn" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-20">${sanitize(item.textEn||item.descEn||item.meaningEn||'')}</textarea></div>

                <div><label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'উৎস / সূত্র':'Source / Reference'}</label>
                <input id="ke-source" type="text" value="${sanitize(item.source||'')}" placeholder="${l==='bn'?'যেমন: নাহজুল বালাগা, খুতবা ১':'e.g. Nahjul Balagha, Sermon 1'}" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full"/></div>
            </div>

            <div class="flex gap-3 p-6 border-t ${d?'border-gray-700':'border-gray-100'}">
                <button data-action="closeKnowledgeEditor" class="${d?'bg-gray-700 hover:bg-gray-600 text-white':'bg-gray-100 hover:bg-gray-200 text-gray-700'} flex-1 py-3 rounded-xl font-semibold text-sm">${l==='bn'?'বাতিল':'Cancel'}</button>
                <button onclick="event.stopPropagation();(function(){
                    const type='${type}';
                    const titleBn=(document.getElementById('ke-titleBn')?.value||'').trim();
                    const titleEn=(document.getElementById('ke-titleEn')?.value||'').trim();
                    const textBn=(document.getElementById('ke-textBn')?.value||'').trim();
                    const textEn=(document.getElementById('ke-textEn')?.value||'').trim();
                    const arabic=(document.getElementById('ke-arabic')?.value||'').trim();
                    const source=(document.getElementById('ke-source')?.value||'').trim();
                    if(!titleBn){alert('শিরোনাম (বাংলা) দিন');return;}
                    if(!textBn&&type!=='sahifa'){alert('বাংলা পাঠ/বিবরণ দিন');return;}
                    const extra={};
                    const keType=document.getElementById('ke-type'); if(keType) extra.type=keType.value;
                    const keNumber=document.getElementById('ke-number'); if(keNumber) extra.number=keNumber.value;
                    const keTopic=document.getElementById('ke-topic'); if(keTopic) extra.topic=keTopic.value;
                    const keOccasion=document.getElementById('ke-occasion'); if(keOccasion) extra.occasion=keOccasion.value;
                    const keTranslit=document.getElementById('ke-translit'); if(keTranslit) extra.transliteration=keTranslit.value;
                    const keMeaningBn=document.getElementById('ke-meaningBn'); if(keMeaningBn) extra.meaningBn=keMeaningBn.value;
                    const keImamBn=document.getElementById('ke-imamBn'); if(keImamBn) extra.imamBn=keImamBn.value;
                    const keImamEn=document.getElementById('ke-imamEn'); if(keImamEn) extra.imamEn=keImamEn.value;
                    const keHijriDate=document.getElementById('ke-hijriDate'); if(keHijriDate) extra.hijriDate=keHijriDate.value;
                    const keImam=document.getElementById('ke-imam'); if(keImam) extra.imam=keImam.value;
                    const keDua=document.getElementById('ke-dua'); if(keDua) extra.dua=keDua.value;
                    const dataMap={nahjul:'nahjulBalagha',sahifa:'sahifaSajjadiya',imamhadiths:'imamHadiths',specialdays:'specialDays'};
                    const key=dataMap[type];
                    if(!key || !state[key]) { alert(l==='bn'?'অপরিচিত ধরন':'Unknown type'); return; }
                    const newItem={titleBn,titleEn,arabic,source,textBn:type==='specialdays'?undefined:textBn,textEn:type==='specialdays'?undefined:textEn,descBn:type==='specialdays'?textBn:undefined,descEn:type==='specialdays'?textEn:undefined,...extra};
                    const idx=state.editingKnowledgeIdx;
                    if(idx===-1) state[key].push(newItem);
                    else state[key][idx]=newItem;
                    state.showKnowledgeEditor=false;
                    state.editingKnowledgeItem=null;
                    saveState();render();
                })()" class="flex-1 py-3 rounded-xl font-semibold text-sm text-white" style="background:linear-gradient(135deg,#059669,#065f46)">${l==='bn'?'✅ সংরক্ষণ করুন':'✅ Save'}</button>
            </div>
        </div>
    </div>`;
}

function renderDuaEditorModal() {
    if (!state.showDuaEditor || !state.editingDua) return '';
    const d=state.darkMode; const l=state.language;
    const item=state.editingDua;
    const type=state.duaEditorType; // 'dua' | 'ziyarat' | 'amal'
    const isNew=!item.id || !(customArrayForType(type).find(x=>x.id===item.id));
    const isZiyarat=type==='ziyarat';
    const isAmal=type==='amal'; // NEW: Amal
    // NEW: Amal uses a violet accent. Tailwind's compiled CSS only ships the
    // exact classes literally used in the JS source at build time, and this
    // codebase never used violet with hover/focus-ring variants before, so
    // `bg-violet-600`/`focus:ring-violet-500` etc. would silently render
    // unstyled. `.amal-btn-violet` / `.amal-focus-ring` (added to style.css)
    // cover that gap; dua/ziyarat keep their original, already-working
    // Tailwind-class-based styling untouched below.
    const accentColor=isZiyarat?'amber':'green';
    const typeLabel = isAmal ? {bn:'আমল',en:'Amal'} : isZiyarat ? {bn:'যিয়ারত',en:'Ziyarat'} : {bn:'দোয়া',en:'Dua'};
    const typeIcon = isAmal ? '📿' : isZiyarat ? '☪️' : '🤲';
    const badgeBg = isAmal ? '#7c3aed22' : isZiyarat ? '#92400e22' : '#05966922';
    const ringClass = isAmal ? 'amal-focus-ring' : `focus:ring-${accentColor}-500`;
    const saveBtnClass = isAmal ? 'amal-btn-violet' : (isZiyarat?'bg-amber-600 hover:bg-amber-700':'bg-green-600 hover:bg-green-700');
    return `
    <div class="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto" id="dua-editor-overlay">
        <div class="${d?'bg-gray-900 border-gray-700':'bg-white border-gray-200'} border rounded-2xl w-full max-w-2xl shadow-2xl fade-in my-4">
            <!-- Header -->
            <div class="flex justify-between items-center p-6 border-b ${d?'border-gray-700':'border-gray-100'}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style="background:${badgeBg}">${typeIcon}</div>
                    <div>
                        <h3 class="font-bold text-lg">${isNew?(l==='bn'?`নতুন ${typeLabel.bn} যোগ`:`Add New ${typeLabel.en}`):(l==='bn'?`${typeLabel.bn} সম্পাদনা`:`Edit ${typeLabel.en}`)}</h3>
                        <p class="text-xs ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?`${typeLabel.bn} ট্যাবে দেখাবে`:`Will appear in ${typeLabel.en} tab`}</p>
                    </div>
                </div>
                <button data-action="closeDuaEditor" class="${d?'text-gray-400 hover:text-white':'text-gray-400 hover:text-gray-700'} text-2xl leading-none p-1 rounded-lg hover:bg-gray-100/10 transition-colors">&times;</button>
            </div>

            <!-- Form body -->
            <div class="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <!-- Title Bengali -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'শিরোনাম (বাংলা)':'Title (Bengali)'} <span class="text-red-500">*</span></label>
                    <input id="dua-ed-titleBn" type="text" value="${sanitize(item.titleBn||'')}"
                        placeholder="${isAmal?'যেমন: আমলে উম্মে দাউদ':isZiyarat?'যেমন: যিয়ারত আশুরা':'যেমন: দোয়ায়ে কুমাইল'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 ${ringClass}" />
                </div>
                <!-- Title English -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'শিরোনাম (ইংরেজি)':'Title (English)'}</label>
                    <input id="dua-ed-titleEn" type="text" value="${sanitize(item.titleEn||'')}"
                        placeholder="${isAmal?'e.g. Amal of Umm Dawud':isZiyarat?'e.g. Ziyarat Ashura':'e.g. Dua Kumayl'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 ${ringClass}" />
                </div>
                <!-- Arabic Text -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">عربي — ${l==='bn'?'আরবি পাঠ':'Arabic Text'} <span class="text-red-500">*</span></label>
                    <textarea id="dua-ed-arabic" dir="rtl" lang="ar"
                        placeholder="${l==='bn'?'এখানে আরবি পাঠ লিখুন...':'Enter Arabic text here...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-28 focus:outline-none focus:ring-2 ${ringClass}"
                        style="font-family:'Amiri',serif;font-size:1.2rem;line-height:2">${sanitize(item.arabic||'')}</textarea>
                </div>
                <!-- Transliteration -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'উচ্চারণ (ঐচ্ছিক)':'Transliteration (optional)'}</label>
                    <input id="dua-ed-translit" type="text" value="${sanitize(item.transliteration||'')}"
                        placeholder="${l==='bn'?'যেমন: Allahumma inni as\'aluka...':'e.g. Allahumma inni as\'aluka...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 ${ringClass}" />
                </div>
                <!-- Meaning Bengali -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'বাংলা অর্থ':'Bengali Meaning'} <span class="text-red-500">*</span></label>
                    <textarea id="dua-ed-meaningBn"
                        placeholder="${l==='bn'?'বাংলা অনুবাদ লিখুন...':'Enter Bengali translation...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-24 focus:outline-none focus:ring-2 ${ringClass}">${sanitize(item.meaningBn||'')}</textarea>
                </div>
                <!-- Meaning English -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'ইংরেজি অর্থ':'English Meaning'}</label>
                    <textarea id="dua-ed-meaningEn"
                        placeholder="${l==='bn'?'ইংরেজি অনুবাদ লিখুন...':'Enter English translation...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-20 focus:outline-none focus:ring-2 ${ringClass}">${sanitize(item.meaningEn||'')}</textarea>
                </div>
                <!-- Full Text Bengali -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'পূর্ণ পাঠ (বাংলা, ঐচ্ছিক)':'Full Text (Bengali, optional)'}</label>
                    <textarea id="dua-ed-fullBn"
                        placeholder="${l==='bn'?`সম্পূর্ণ ${typeLabel.bn}র পাঠ ও ব্যাখ্যা...`:'Full text and explanation...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-28 focus:outline-none focus:ring-2 ${ringClass}">${sanitize(item.fullTextBn||'')}</textarea>
                </div>
                <!-- Source -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'উৎস / সূত্র':'Source / Reference'}</label>
                    <input id="dua-ed-source" type="text" value="${sanitize(item.source||'')}"
                        placeholder="${l==='bn'?'যেমন: সাহিফায়ে সাজ্জাদিয়্যা, বিহারুল আনওয়ার...':'e.g. Sahifa al-Sajjadiyya, Bihar al-Anwar...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 ${ringClass}" />
                </div>
                ${(isZiyarat||isAmal) ? `
                <!-- Occasion (Ziyarat & Amal only) -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?`উপলক্ষ (${typeLabel.bn}র জন্য)`:`Occasion (for ${typeLabel.en})`}</label>
                    <input id="dua-ed-occasion" type="text" value="${sanitize(item.occasion||'')}"
                        placeholder="${isAmal?(l==='bn'?'যেমন: প্রতি শুক্রবার, ১৫ রজব...':'e.g. Every Friday, 15th Rajab...'):(l==='bn'?'যেমন: আশুরা, প্রতি জুমা...':'e.g. Ashura, Every Friday...')}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 ${ringClass}" />
                </div>` : ''}

                <!-- Verses (আয়াত বাই আয়াত) -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">
                        📖 ${isAmal?(l==='bn'?'ধাপে ধাপে আমল (JSON, ঐচ্ছিক)':'Step-by-Step (JSON, optional)'):(l==='bn'?'আয়াত বাই আয়াত (JSON, ঐচ্ছিক)':'Verse-by-Verse (JSON, optional)')}
                    </label>
                    <p class="text-xs mb-2 ${d?'text-gray-400':'text-gray-500'}">
                        ${isAmal
                            ? (l==='bn'?'প্রতিটি ধাপ। আরবি ঐচ্ছিক — শুধু নির্দেশনা হলে শুধু bn দিন। ফরম্যাট: [{"bn":"নির্দেশনা"},{"ar":"আরবি","tr":"উচ্চারণ","bn":"অনুবাদ"},{"ar":"...","bn":"...","repeat100":true,"repeatLabel":"৩৪ বার"}]':'Each step. Arabic is optional — for instruction-only steps just give "bn". Format: [{"bn":"Instruction"},{"ar":"Arabic","tr":"Transliteration","bn":"Meaning"},{"ar":"...","bn":"...","repeat100":true,"repeatLabel":"34 times"}]')
                            : (l==='bn'?'প্রতিটি পঙক্তির আরবি + বাংলা অনুবাদ। ফরম্যাট: [{"ar":"আরবি","bn":"বাংলা অর্থ"},...]':'Each line Arabic + Bengali. Format: [{"ar":"Arabic","bn":"Bengali meaning"},...]')}
                    </p>
                    <textarea id="dua-ed-verses"
                        placeholder='${isAmal?'[{"bn":"গোসল করুন"},{"ar":"اللَّهُ أَكْبَرُ","bn":"আল্লাহ মহান","repeat100":true,"repeatLabel":"৩৪ বার"}]':'[{"ar":"اللَّهُمَّ","bn":"হে আল্লাহ!"},{"ar":"إِنِّي","bn":"নিশ্চয়ই আমি"}]'}'
                        spellcheck="false"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-32 focus:outline-none focus:ring-2 ${ringClass} font-mono text-xs">${item.verses ? sanitize(JSON.stringify(item.verses, null, 2)) : ''}</textarea>
                    <div id="dua-ed-verses-error" class="text-xs text-red-500 mt-1 hidden">${l==='bn'?'JSON ফরম্যাট ঠিক নেই! উদাহরণ: [{"ar":"...","bn":"..."}]':'Invalid JSON! Example: [{"ar":"...","bn":"..."}]'}</div>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex gap-3 p-6 border-t ${d?'border-gray-700':'border-gray-100'}">
                <button data-action="saveDuaItem" class="${saveBtnClass} text-white flex-1 py-3 rounded-xl font-bold text-base transition-colors">
                    💾 ${isNew?(l==='bn'?`${typeLabel.bn} সেভ করুন`:`Save ${typeLabel.en}`):(l==='bn'?'আপডেট করুন':'Update')}
                </button>
                <button data-action="closeDuaEditor" class="${d?'bg-gray-700 hover:bg-gray-600':'bg-gray-100 hover:bg-gray-200'} px-6 py-3 rounded-xl font-semibold transition-colors">${l==='bn'?'বাতিল':'Cancel'}</button>
            </div>
        </div>
    </div>`;
}

function renderMuharramEditorModal() {
    if (!state.showMuharramEditor || !state.editingMuharramEvent) return '';
    const d = state.darkMode, ev = state.editingMuharramEvent;
    const isNew = !state.muharramEvents.find(x=>x.id===ev.id);
    return `
    <div class="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="${d?'bg-gray-900 border-gray-700':'bg-white border-gray-200'} border rounded-2xl w-full max-w-lg shadow-2xl fade-in my-4">
            <div class="flex items-center justify-between p-5 border-b ${d?'border-gray-700':'border-gray-100'}">
                <h3 class="font-bold text-lg flex items-center gap-2">⚔️ ${isNew?'নতুন কারবালা ঘটনা যোগ':'ঘটনা সম্পাদনা'}</h3>
                <button data-action="closeMuharramEditor" class="text-2xl leading-none ${d?'text-gray-400 hover:text-white':'text-gray-400 hover:text-gray-700'}">&times;</button>
            </div>
            <div class="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-semibold mb-1.5">আইকন (ইমোজি)</label>
                        <input id="mev-icon" type="text" value="${sanitize(ev.icon||'🕌')}" maxlength="4"
                            class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-3 py-2.5 w-full text-2xl focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-1.5">রঙ</label>
                        <input id="mev-color" type="color" value="${ev.color||'#dc2626'}"
                            class="border rounded-xl w-full h-11 cursor-pointer focus:outline-none" style="padding:2px 4px" />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">তারিখ (হিজরি) <span class="text-red-500">*</span></label>
                    <input id="mev-date" type="text" value="${sanitize(ev.date||'')}" placeholder="যেমন: ১০ মুহাররম"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">শিরোনাম (বাংলা) <span class="text-red-500">*</span></label>
                    <input id="mev-title" type="text" value="${sanitize(ev.titleBn||'')}" placeholder="যেমন: আশুরার শাহাদাত"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">বিস্তারিত বিবরণ</label>
                    <textarea id="mev-desc" placeholder="ঘটনার বিস্তারিত লিখুন..."
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full h-28 focus:outline-none focus:ring-2 focus:ring-red-500">${sanitize(ev.descBn||'')}</textarea>
                </div>
            </div>
            <div class="flex gap-3 p-5 border-t ${d?'border-gray-700':'border-gray-100'}">
                <button data-action="saveMuharramEvent" class="bg-red-600 hover:bg-red-700 text-white flex-1 py-3 rounded-xl font-bold transition-colors">💾 ${isNew?'যোগ করুন':'আপডেট করুন'}</button>
                <button data-action="closeMuharramEditor" class="${d?'bg-gray-700 hover:bg-gray-600':'bg-gray-100 hover:bg-gray-200'} px-6 py-3 rounded-xl font-semibold transition-colors">বাতিল</button>
            </div>
        </div>
    </div>`;
}

function renderShiaDayEditorModal() {
    if (!state.showShiaDayEditor || !state.editingShiaDay) return '';
    const d = state.darkMode, sd = state.editingShiaDay;
    const isNew = !state.shiaSpecialDays.find(x=>x.id===sd.id);
    const types = [['eid','🎉 ঈদ/উৎসব'],['martyrdom','🕊️ শাহাদাত'],['special','⭐ বিশেষ রাত/দিন']];
    return `
    <div class="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="${d?'bg-gray-900 border-gray-700':'bg-white border-gray-200'} border rounded-2xl w-full max-w-lg shadow-2xl fade-in my-4">
            <div class="flex items-center justify-between p-5 border-b ${d?'border-gray-700':'border-gray-100'}">
                <h3 class="font-bold text-lg flex items-center gap-2">✨ ${isNew?'নতুন বিশেষ দিন যোগ':'বিশেষ দিন সম্পাদনা'}</h3>
                <button data-action="closeShiaDayEditor" class="text-2xl leading-none ${d?'text-gray-400 hover:text-white':'text-gray-400 hover:text-gray-700'}">&times;</button>
            </div>
            <div class="p-5 space-y-4 overflow-y-auto max-h-[72vh]">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-semibold mb-1.5">আইকন (ইমোজি)</label>
                        <input id="sd-icon" type="text" value="${sanitize(sd.icon||'✨')}" maxlength="4"
                            class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-3 py-2.5 w-full text-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-1.5">ধরন <span class="text-red-500">*</span></label>
                        <select id="sd-type" class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            ${types.map(([v,l2])=>`<option value="${v}" ${sd.type===v?'selected':''}>${l2}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">হিজরি তারিখ</label>
                    <input id="sd-hijridate" type="text" value="${sanitize(sd.hijriDate||'')}" placeholder="যেমন: ১৮ জিলহজ"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">শিরোনাম (বাংলা) <span class="text-red-500">*</span></label>
                    <input id="sd-title" type="text" value="${sanitize(sd.titleBn||'')}" placeholder="যেমন: ঈদে গাদির"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">আরবি শিরোনাম</label>
                    <input id="sd-arabic" type="text" dir="rtl" value="${sanitize(sd.arabicTitle||'')}" placeholder="عيد الغدير"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full arabic-text focus:outline-none focus:ring-2 focus:ring-emerald-500" style="font-family:'Amiri',serif;font-size:1.1rem" />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">বিস্তারিত বিবরণ</label>
                    <textarea id="sd-desc" placeholder="ঐতিহাসিক ঘটনা বিস্তারিত লিখুন..."
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full h-24 focus:outline-none focus:ring-2 focus:ring-emerald-500">${sanitize(sd.descBn||'')}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">📿 বিশেষ আমল</label>
                    <textarea id="sd-amaal" placeholder="রোজা, নামাজ, দোয়া ইত্যাদি..."
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500">${sanitize(sd.amaal||'')}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1.5">✨ গুরুত্ব</label>
                    <input id="sd-importance" type="text" value="${sanitize(sd.importance||'')}" placeholder="এই দিনের বিশেষ তাৎপর্য..."
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
            </div>
            <div class="flex gap-3 p-5 border-t ${d?'border-gray-700':'border-gray-100'}">
                <button data-action="saveShiaDay" class="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 py-3 rounded-xl font-bold transition-colors">💾 ${isNew?'যোগ করুন':'আপডেট করুন'}</button>
                <button data-action="closeShiaDayEditor" class="${d?'bg-gray-700 hover:bg-gray-600':'bg-gray-100 hover:bg-gray-200'} px-6 py-3 rounded-xl font-semibold transition-colors">বাতিল</button>
            </div>
        </div>
    </div>`;
}
