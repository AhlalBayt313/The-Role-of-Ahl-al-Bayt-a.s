
// ============================================================================
// EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
    const app = document.getElementById('app'); // kept for reference
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (btn) {
            const action=btn.getAttribute('data-action');
            const param=btn.getAttribute('data-param');
            const param2=btn.getAttribute('data-param2');
            switch(action){
                case 'toggleDarkMode': toggleDarkMode(); break;
                case 'toggleLanguage': toggleLanguage(); break;
                case 'toggleMenu': toggleMenu(); break;
                case 'changePage': changePage(param); break;
                case 'cycleFontSize': cycleFontSize(); break;
                case 'setFontSize': setFontSize(param); break;
                case 'toggleTimeline': state.showTimeline=!state.showTimeline; render(); break;
                case 'setTimelineEra': state.timelineEra=param; render(); break;
                case 'toggleMuharramEvent': {
                    const arr = state.expandedMuharramEvents || (state.expandedMuharramEvents=[]);
                    const idx = arr.indexOf(param);
                    if (idx > -1) arr.splice(idx,1); else arr.push(param);
                    render(); break;
                }
                case 'setDuaTab': state.duaTab=param; render(); break;  // NEW: Set dua/ziyarat/amal tab
                case 'setDuaCategory': state.duaCategory=param; render(); break;  // NEW: Set dua category filter
                case 'setZiyaratCategory': state.ziyaratCategory=param; render(); break;  // NEW: Set ziyarat category filter (12 Imams / Masumeen / Comprehensive)
                case 'setAmalCategory': state.amalCategory=param; render(); break;  // NEW: Set amal category filter (daily / weekly / ramadan / special)
                case 'setDuaCollection': state.duaCollection=param; render(); break;  // NEW: Set dua collection filter (Ahl al-Bayt / Sahifa / Ramadan etc.)
                case 'sharePost': { const allP=[...(typeof blogPosts!=='undefined'?blogPosts:[]),...state.customPosts]; const p=allP.find(x=>String(x.id)===String(param)); if(p) sharePost(p,state.language); break; }
                case 'shareHadith': shareHadith(getDailyHadith(),state.language); break;
                case 'shareDua': {
                    let duaItem;
                    if (typeof param === 'string' && param.startsWith('c')) {
                        const cid = param.slice(1);
                        duaItem = state.customDuas.find(x => x.id === cid);
                    } else {
                        duaItem = isNaN(param) ? duas.find(x => x.id === param) : duas[parseInt(param)];
                    }
                    if(duaItem) shareDua(duaItem,state.language); break;
                }
                case 'shareImamQuote': { const im2=imams.find(x=>x.id===parseInt(param))||masumeen.find(x=>x.id===param); if(im2) shareImamQuote(im2,state.language); break; }
                case 'toggleBookmark': toggleBookmark(param,param2); break;
                case 'setBookmarksTab': state.bookmarksTab=param; render(); break;
                case 'clearReadingHistory': state.readingHistory=[]; saveState(); render(); break;
                case 'readPost': readPost(param); break;
                case 'readDua': readDua(param); break;
                case 'calPrev': calState.hijriMonth--; if(calState.hijriMonth<1){calState.hijriMonth=12;calState.hijriYear--;} render(); break;
                case 'calNext': calState.hijriMonth++; if(calState.hijriMonth>12){calState.hijriMonth=1;calState.hijriYear++;} render(); break;
                case 'showAdminLogin': state.showAdminLogin=true; render(); break;
                case 'closeAdminLogin': state.showAdminLogin=false; state.adminLoginError=''; render(); break;
                case 'adminLogout': adminLogout(); break;
                case 'adminLogin': {
                    const pw=document.getElementById('admin-pw-input');
                    if(pw) tryAdminLogin(pw.value); break;
                }
                // AYAH NAVIGATION & SHARE
                case 'ayahNext': {
                    const pool = getAyahPoolSize();
                    const now = new Date();
                    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
                    const current = state.ayahIndex >= 0 ? state.ayahIndex : dayOfYear % pool;
                    state.ayahIndex = (current + 1) % pool;
                    render(); break;
                }
                case 'ayahPrev': {
                    const pool = getAyahPoolSize();
                    const now = new Date();
                    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
                    const current = state.ayahIndex >= 0 ? state.ayahIndex : dayOfYear % pool;
                    state.ayahIndex = (current - 1 + pool) % pool;
                    render(); break;
                }
                case 'shareAyah': {
                    const ay = getDailyAyah();
                    const l = state.language;
                    const text = (ay.arabic || '') + '\n\n' + (l==='bn' ? (ay.meaningBn||ay.meaningEn||'') : (ay.meaningEn||ay.meaningBn||'')) + '\n— ' + (l==='bn' ? (ay.ref||ay.refEn||'') : (ay.refEn||ay.ref||''));
                    if (navigator.share) { navigator.share({ title: l==='bn'?'আজকের আয়াত':'Today\'s Verse', text }).catch(()=>{}); }
                    else { navigator.clipboard && navigator.clipboard.writeText(text).then(()=>showToast(l==='bn'?'✅ কপি হয়েছে!':'✅ Copied!','success')).catch(()=>{}); }
                    break;
                }
                // HADITH NAVIGATION & SHARE
                case 'hadithNext': {
                    const pool = getHadithPoolSize();
                    const now = new Date();
                    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
                    const current = state.hadithIndex > 0 ? state.hadithIndex : dayOfYear % pool;
                    state.hadithIndex = (current + 1) % pool;
                    render(); break;
                }
                case 'hadithPrev': {
                    const pool = getHadithPoolSize();
                    const now = new Date();
                    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
                    const current = state.hadithIndex > 0 ? state.hadithIndex : dayOfYear % pool;
                    state.hadithIndex = (current - 1 + pool) % pool;
                    render(); break;
                }
                // ✅ REMOVED: duplicate 'shareHadith' case (dead code — the
                // earlier case above always matched first in the switch, so
                // this block never ran; it also duplicated logic already in
                // shareHadith()/shareContent()).
                // TASBEEH
                // HOME PAGE — quiz-of-the-day mini widget
                case 'homeQuizAnswer': homeQuizAnswer(param); break;
                case 'tasbeehTap': tasbeehTap(); break;
                case 'tasbeehReset': tasbeehReset(); break;
                case 'tasbeehSetLabel': tasbeehSetLabel(parseInt(param)); break;
                case 'selectTasbeeh': tasbeehSetLabel(parseInt(param)); break;
                case 'resetTasbeeh': tasbeehReset(); break;
                case 'saveTasbeehHistory': {
                    if (state.tasbeehCount > 0) {
                        state.tasbeehHistory.unshift({
                            dhikrIdx: state.tasbeehSelected||0,
                            label: state.tasbeehLabel,
                            count: state.tasbeehCount,
                            date: localDate(),
                            target: state.tasbeehTarget
                        });
                        if (state.tasbeehHistory.length > 20) state.tasbeehHistory.pop();
                        state.tasbeehCount = 0;
                        saveState();
                        render();
                        showToast(state.language==='bn'?'সেভ হয়েছে ✅':'Saved ✅','success');
                    } else {
                        showToast(state.language==='bn'?'কাউন্ট শূন্য, কিছু নেই সেভ করার':'Count is zero, nothing to save','error');
                    }
                    break;
                }
                // QUIZ
                case 'quizAnswer': quizAnswer(parseInt(param)); break;
                case 'quizSetCategory': state.quizCategory = param; render(); break;
                case 'quizSetDifficulty': state.quizDifficulty = param; render(); break;
                case 'quizSetLength': state.quizLength = parseInt(param); render(); break;
                case 'quizToggleTimer': state.quizTimerEnabled = !state.quizTimerEnabled; saveState(); render(); break;
                case 'quizStart': startQuiz(state.quizCategory, state.quizDifficulty, state.quizLength); break;
                case 'quizStartDaily': startDailyQuiz(); break;
                case 'quizNext': quizNext(); break;
                case 'quizPlayAgain': quizPlayAgain(); break;
                case 'quizBackToSetup': quizBackToSetup(); break;
                case 'quizShare': shareQuizResult(); break;
                case 'openQuizEditor': state.showQuizEditor=true; state.editingQuizQuestion={}; render(); break;
                case 'closeQuizEditor': state.showQuizEditor=false; state.editingQuizQuestion=null; render(); break;
                case 'editQuizQuestion': {
                    const idx=parseInt(param);
                    state.editingQuizQuestion={...state.customQuizQuestions[idx], _idx:idx};
                    state.showQuizEditor=true; render(); break;
                }
                case 'saveQuizQuestion': saveQuizQuestion(state.editingQuizQuestion && state.editingQuizQuestion._idx!=null ? state.editingQuizQuestion._idx : ''); break;
                case 'deleteQuizQuestion': deleteQuizQuestion(param); break;
                // NOTIFICATIONS
                case 'requestNotify': requestNotificationPermission(); break;
                // BLOG EDITOR
                case 'openBlogEditor': openBlogEditor(); break;
                case 'openBlogEditorEdit': {
                    let post=state.customPosts.find(p=>p.id===param);
                    if(!post && typeof blogPosts !== 'undefined') {
                        post = blogPosts.find(p=>p.id===param);
                    }
                    if(post) openBlogEditor(post); break;
                }
                case 'closeBlogEditor': closeBlogEditor(); break;
                case 'saveBlogPost': saveBlogPost(); break;
                case 'deleteCustomPost': deleteCustomPost(param); break;
                case 'setBlogFilter': state.blogFilter=param; render(); break;
                // DUA / ZIYARAT
                // ✅ REMOVED: duplicate 'setDuaTab' case (identical to the
                // one defined earlier in this switch; unreachable dead code).
                case 'setKcTab':
                    state.kcTab=param; state.kcCategory=''; state.kcSearch=''; state.kcPage=1; state.kcDetail=null; state.kcSourceFilter='';
                    if (typeof kcLoadTab==='function') kcLoadTab(param); else { kcSimulateLoad(); render(); }
                    break;
                case 'setKcCategory': state.kcCategory=param; state.kcPage=1; state.kcDetail=null; state.kcSourceFilter=''; render(); break;
                case 'kcSetPage': state.kcPage=parseInt(param)||1; window.scrollTo({top:0,behavior:'smooth'}); render(); break;
                case 'kcOpenDetail': {
                    state.kcDetail={type:param,id:param2}; window.scrollTo({top:0,behavior:'instant'});
                    window._kcJustOpenedDetail = true;
                    const kcItem = typeof kcFindItem==='function' ? kcFindItem(param,param2) : null;
                    if (kcItem && kcItem.hasFullData) {
                        render(); // already fully loaded — a single render is enough
                    } else {
                        render(); // immediate render with whatever's available (e.g. question only)
                        if (typeof ensureKcItemContent==='function') {
                            ensureKcItemContent(param2,param).then(()=>{
                                if (state.kcDetail && state.kcDetail.type===param && state.kcDetail.id===param2) render();
                            });
                        }
                    }
                    break;
                }
                case 'kcCloseDetail': state.kcDetail=null; render(); break;
                case 'kcCopy': if(typeof kcCopyItem==='function') kcCopyItem(param,param2); break;
                case 'kcShare': if(typeof kcShareItem==='function') kcShareItem(param,param2); break;
                case 'kcToggleFavorite': if(typeof toggleKcFavorite==='function') toggleKcFavorite(param,param2); break;
                case 'setKcFilter': state.kcFilter=param; state.kcPage=1; render(); break;
                case 'openKnowledgeEditor':
                    if(!state.isAdmin) { state.showAdminLogin=true; render(); break; }
                    state.knowledgeEditorType = param;
                    state.editingKnowledgeItem = {};
                    state.editingKnowledgeIdx = -1;
                    state.showKnowledgeEditor = true;
                    render(); break;
                case 'editKnowledgeItem':
                    if(!state.isAdmin) return;
                    {const dtype=btn.getAttribute('data-dtype'); const idx=parseInt(param);
                    const dataMap2={nahjul:'nahjulBalagha',sahifa:'sahifaSajjadiya',imamhadiths:'imamHadiths',specialdays:'specialDays'};
                    const arr=state[dataMap2[dtype]];
                    if(arr&&arr[idx]){state.knowledgeEditorType=dtype;state.editingKnowledgeItem={...arr[idx]};state.editingKnowledgeIdx=idx;state.showKnowledgeEditor=true;render();}}
                    break;
                case 'deleteKnowledgeItem':
                    if(!state.isAdmin) return;
                    {const dtype=btn.getAttribute('data-dtype'); const idx=parseInt(param);
                    const dataMap3={nahjul:'nahjulBalagha',sahifa:'sahifaSajjadiya',imamhadiths:'imamHadiths',specialdays:'specialDays'};
                    const arrKey=dataMap3[dtype];
                    if(arrKey&&state[arrKey]){
                        if(confirm(state.language==='bn'?'মুছে ফেলবেন?':'Delete this item?')){
                            state[arrKey].splice(idx,1);saveState();render();}}}
                    break;
                case 'closeKnowledgeEditor':
            state.showKnowledgeEditor=false;state.editingKnowledgeItem=null;render(); break;
        case 'openDuaEditor': openDuaEditor(null, param); break;
                case 'editCustomDua': {
                    const dtype=btn.getAttribute('data-dtype')||'dua';
                    const arr=customArrayForType(dtype);
                    const item=arr.find(x=>x.id===param);
                    if(item) openDuaEditor(item, dtype);
                    break;
                }
                case 'closeDuaEditor': closeDuaEditor(); break;
                case 'saveDuaItem': saveDuaItem(); break;
                case 'deleteCustomDua': {
                    const dtype=btn.getAttribute('data-dtype')||'dua';
                    deleteCustomDua(param, dtype); break;
                }
                // HADITH / AYAH MANAGEMENT
                case 'openHadithEditor': state.showHadithEditor=true; state.editingHadith={}; render(); break;
                case 'closeHadithEditor': state.showHadithEditor=false; state.editingHadith=null; render(); break;
                case 'editHadith': {
                    const idx=parseInt(param);
                    state.editingHadith={...state.customHadiths[idx], _idx:idx};
                    state.showHadithEditor=true; render(); break;
                }
                case 'saveHadith': {
                    const textBn=(document.getElementById('he-textBn')?.value||'').trim();
                    const textEn=(document.getElementById('he-textEn')?.value||'').trim();
                    const sourceBn=(document.getElementById('he-sourceBn')?.value||'').trim();
                    const sourceEn=(document.getElementById('he-sourceEn')?.value||'').trim();
                    if(!textBn&&!textEn){showToast(state.language==='bn'?'হাদিস লিখুন':'Please enter hadith text','warning');break;}
                    const item={textBn,textEn,sourceBn,sourceEn};
                    const idx=param!==''&&param!=null?parseInt(param):null;
                    if(idx!=null && !isNaN(idx)) state.customHadiths[idx]=item;
                    else state.customHadiths.push(item);
                    if(state.customHadiths.length>0) state.hadithIndex = state.hadithIndex % state.customHadiths.length;
                    state.showHadithEditor=false; state.editingHadith=null;
                    saveState(); render(); break;
                }
                case 'deleteHadith': {
                    if(!confirm(state.language==='bn'?'এই হাদিস মুছবেন?':'Delete this hadith?')) break;
                    state.customHadiths.splice(parseInt(param),1);
                    saveState(); render(); break;
                }
                case 'openAyahEditor': state.showAyahEditor=true; state.editingAyah={}; render(); break;
                case 'closeAyahEditor': state.showAyahEditor=false; state.editingAyah=null; render(); break;
                case 'editAyah': {
                    const idx=parseInt(param);
                    state.editingAyah={...state.customAyahs[idx], _idx:idx};
                    state.showAyahEditor=true; render(); break;
                }
                case 'saveAyah': {
                    const arabic=(document.getElementById('ae-arabic')?.value||'').trim();
                    const meaningBn=(document.getElementById('ae-meaningBn')?.value||'').trim();
                    const meaningEn=(document.getElementById('ae-meaningEn')?.value||'').trim();
                    const ref=(document.getElementById('ae-ref')?.value||'').trim();
                    const refEn=(document.getElementById('ae-refEn')?.value||'').trim();
                    if(!arabic){showToast(state.language==='bn'?'আরবি আয়াত লিখুন':'Please enter Arabic ayah','warning');break;}
                    const item={arabic,meaningBn,meaningEn,ref,refEn};
                    const idx=param!==''&&param!=null?parseInt(param):null;
                    if(idx!=null && !isNaN(idx)) state.customAyahs[idx]=item;
                    else state.customAyahs.push(item);
                    state.showAyahEditor=false; state.editingAyah=null;
                    saveState(); render(); break;
                }
                case 'deleteAyah': {
                    if(!confirm(state.language==='bn'?'এই আয়াত মুছবেন?':'Delete this ayah?')) break;
                    state.customAyahs.splice(parseInt(param),1);
                    saveState(); render(); break;
                }
                case 'readZiyarat': {
                    // ✅ FIXED: built-in ziyarat entries (which carry the same
                    // kind of string `id` as custom ones, e.g. "ziyarat-ashura")
                    // were never matched by id here — only customZiyarat-by-id,
                    // a title-string match that can't match an id, and a
                    // parseInt() fallback that's always NaN for a non-numeric
                    // id — so clicking any built-in Ziyarat card silently did
                    // nothing. Checking `ziyarats` by id (like customZiyarat)
                    // fixes this without touching either existing fallback.
                    const zitem=state.customZiyarat.find(x=>x.id===param) || ziyarats.find(x=>x.id===param) || ziyarats.find(x=>x.titleEn===param||x.titleBn===param) || ziyarats[parseInt(param)];
                    if(zitem){
                        state.currentZiyarat=zitem;state.previousPage=state.currentPage;state.currentPage='readZiyarat';
                        window._ziyaratJustOpened = true;
                        window.scrollTo(0,0);
                        if (typeof ensureZiyaratContent==='function' && !zitem.hasFullData) {
                            render();
                            ensureZiyaratContent(zitem).then(()=>{ if (state.currentZiyarat===zitem) render(); });
                        } else {
                            render();
                        }
                    }
                    break;
                }
                case 'readAmal': readAmal(param); break;  // NEW: Amal — logic lives in readAmal() (script-1-core.js)
                // IMAM PAGE
                case 'viewImam': {
                    state.currentImam=imams.find(im=>im.id===parseInt(param)) || masumeen.find(m=>m.id===param);
                    state.previousPage=state.currentPage; state.currentPage='imamDetail';
                    render(); window.scrollTo(0,0); break;
                }
                // Search result → Hadith of the Day widget (home page). Sets the
                // widget to show this specific hadith (see getDailyHadith()'s
                // "hadithIndex > 0 = manual mode" logic).
                case 'viewHadith': {
                    state.hadithIndex = parseInt(param) || 0;
                    state.previousPage = state.currentPage; state.currentPage = 'home';
                    saveState(); render();
                    setTimeout(()=>document.getElementById('hadith-of-day-widget')?.scrollIntoView({behavior:'smooth',block:'center'}), 60);
                    break;
                }
                // Search result → Family Tree page, opens the person's detail modal
                // (prophet / fatima). The 12 Imams already route via viewImam above.
                case 'viewFamilyPerson': {
                    state.previousPage = state.currentPage; state.currentPage = 'familyTree';
                    render(); window.scrollTo(0,0);
                    setTimeout(()=>{ if(typeof showPersonDetail==='function') showPersonDetail(param); }, 60);
                    break;
                }
                // ── মুহাররম ইভেন্ট CRUD ──
                case 'openMuharramEditor': {
                    if(!state.isAdmin){state.showAdminLogin=true;render();break;}
                    state.editingMuharramEvent = param ? {...state.muharramEvents.find(x=>x.id===param)} : {id:'mev_'+Date.now(), icon:'🕌', date:'', titleBn:'', descBn:'', color:'#dc2626'};
                    state.showMuharramEditor = true; render(); break;
                }
                case 'closeMuharramEditor': { state.showMuharramEditor=false; state.editingMuharramEvent=null; render(); break; }
                case 'saveMuharramEvent': {
                    if(!state.editingMuharramEvent) break;
                    const me = state.editingMuharramEvent;
                    me.icon    = document.getElementById('mev-icon')?.value?.trim() || '🕌';
                    me.date    = document.getElementById('mev-date')?.value?.trim() || '';
                    me.titleBn = document.getElementById('mev-title')?.value?.trim() || '';
                    me.descBn  = document.getElementById('mev-desc')?.value?.trim() || '';
                    me.color   = document.getElementById('mev-color')?.value || '#dc2626';
                    // ✅ FIX: দুটো required field ভ্যালিডেট করো, alert() → showToast()
                    if (!me.date) {
                        showToast(state.language==='bn'?'⚠️ তারিখ (হিজরি) লিখুন':'⚠️ Please enter the Hijri date', 'error');
                        document.getElementById('mev-date')?.focus();
                        break;
                    }
                    if (!me.titleBn) {
                        showToast(state.language==='bn'?'⚠️ বাংলা শিরোনাম লিখুন':'⚠️ Please enter a title', 'error');
                        document.getElementById('mev-title')?.focus();
                        break;
                    }
                    const idx=state.muharramEvents.findIndex(x=>x.id===me.id);
                    if(idx>-1) state.muharramEvents[idx]=me; else state.muharramEvents.push(me);
                    state.showMuharramEditor=false; state.editingMuharramEvent=null;
                    saveState(); render(); showToast(state.language==='bn'?'সংরক্ষিত হয়েছে ✓':'Saved ✓','success'); break;
                }
                case 'deleteMuharramEvent': {
                    if(!confirm(state.language==='bn'?'এই ঘটনা মুছবেন?':'Delete this event?')) break;
                    state.muharramEvents = state.muharramEvents.filter(x=>x.id!==param);
                    saveState(); render(); showToast(state.language==='bn'?'মুছে ফেলা হয়েছে':'Deleted','warning'); break;
                }
                // ── শিয়া বিশেষ দিন CRUD ──
                case 'openShiaDayEditor': {
                    if(!state.isAdmin){state.showAdminLogin=true;render();break;}
                    state.editingShiaDay = param ? {...state.shiaSpecialDays.find(x=>x.id===param)} : {id:'sd_'+Date.now(), icon:'✨', type:'eid', hijriDate:'', titleBn:'', arabicTitle:'', descBn:'', amaal:'', importance:'', color:'#059669'};
                    state.showShiaDayEditor = true; render(); break;
                }
                case 'closeShiaDayEditor': { state.showShiaDayEditor=false; state.editingShiaDay=null; render(); break; }
                case 'saveShiaDay': {
                    if(!state.editingShiaDay) break;
                    const sd = state.editingShiaDay;
                    sd.icon        = document.getElementById('sd-icon')?.value?.trim() || '✨';
                    sd.type        = document.getElementById('sd-type')?.value || 'eid';
                    sd.hijriDate   = document.getElementById('sd-hijridate')?.value?.trim() || '';
                    sd.titleBn     = document.getElementById('sd-title')?.value?.trim() || '';
                    sd.arabicTitle = document.getElementById('sd-arabic')?.value?.trim() || '';
                    sd.descBn      = document.getElementById('sd-desc')?.value?.trim() || '';
                    sd.amaal       = document.getElementById('sd-amaal')?.value?.trim() || '';
                    sd.importance  = document.getElementById('sd-importance')?.value?.trim() || '';
                    sd.color = sd.type==='eid'?'#059669':sd.type==='martyrdom'?'#dc2626':'#b45309';
                    // ✅ FIX: title + hijriDate ভ্যালিডেট করো, alert() → showToast()
                    if (!sd.titleBn) {
                        showToast(state.language==='bn'?'⚠️ বাংলা শিরোনাম লিখুন':'⚠️ Please enter a title', 'error');
                        document.getElementById('sd-title')?.focus();
                        break;
                    }
                    if (!sd.hijriDate) {
                        showToast(state.language==='bn'?'⚠️ হিজরি তারিখ লিখুন':'⚠️ Please enter the Hijri date', 'error');
                        document.getElementById('sd-hijridate')?.focus();
                        break;
                    }
                    const idx=state.shiaSpecialDays.findIndex(x=>x.id===sd.id);
                    if(idx>-1) state.shiaSpecialDays[idx]=sd; else state.shiaSpecialDays.push(sd);
                    state.showShiaDayEditor=false; state.editingShiaDay=null;
                    saveState(); render(); showToast(state.language==='bn'?'সংরক্ষিত হয়েছে ✓':'Saved ✓','success'); break;
                }
                case 'deleteShiaDay': {
                    if(!confirm(state.language==='bn'?'এই বিশেষ দিন মুছবেন?':'Delete this special day?')) break;
                    state.shiaSpecialDays = state.shiaSpecialDays.filter(x=>x.id!==param);
                    saveState(); render(); showToast(state.language==='bn'?'মুছে ফেলা হয়েছে':'Deleted','warning'); break;
                }
            }
        }
        if(e.target.classList.contains('overlay-close')&&state.menuOpen){state.menuOpen=false;render();}
    });
    document.addEventListener('input', e => {
        // NOTE: search-input is only ever rendered by renderSearchPage(), which
        // handles its own live update via searchResultsHTML() (see that function).
        // [Phase A cleanup] The old doSearch()/_performSearch() dispatch path
        // (a redundant full-page re-render 300ms after every keystroke, which
        // was defocusing the search field) has been removed entirely — it had
        // no live callers. search-engine.js's performSearch() is the only
        // search implementation now, same as it already was in practice.
        // Dua editor live sync
        if(state.editingDua) {
            if(e.target.id==='dua-ed-titleBn') state.editingDua.titleBn=e.target.value;
            if(e.target.id==='dua-ed-titleEn') state.editingDua.titleEn=e.target.value;
            if(e.target.id==='dua-ed-arabic') state.editingDua.arabic=e.target.value;
            if(e.target.id==='dua-ed-translit') state.editingDua.transliteration=e.target.value;
            if(e.target.id==='dua-ed-meaningBn') state.editingDua.meaningBn=e.target.value;
            if(e.target.id==='dua-ed-meaningEn') state.editingDua.meaningEn=e.target.value;
            if(e.target.id==='dua-ed-fullBn') state.editingDua.fullTextBn=e.target.value;
            if(e.target.id==='dua-ed-source') state.editingDua.source=e.target.value;
            if(e.target.id==='dua-ed-occasion') state.editingDua.occasion=e.target.value;
        }
        if(!state.editingPost) return;
        if(e.target.id==='blog-editor-titleBn') state.editingPost.titleBn=e.target.value;
        if(e.target.id==='blog-editor-titleEn') state.editingPost.titleEn=e.target.value;
        if(e.target.id==='blog-editor-category') state.editingPost.category=e.target.value;
        if(e.target.id==='blog-editor-readTime') state.editingPost.readTime=e.target.value;
        if(e.target.id==='blog-editor-excerpt') state.editingPost.excerpt=e.target.value;
        if(e.target.id==='blog-editor-contentBn') state.editingPost.contentBn=e.target.value;
        if(e.target.id==='blog-editor-contentEn') state.editingPost.contentEn=e.target.value;
    });
    document.addEventListener('submit', e => {
        if(e.target.id==='contact-form') submitContactForm(e);
        if(e.target.id==='admin-login-form'){
            e.preventDefault();
            const pw=document.getElementById('admin-pw-input');
            if(pw) tryAdminLogin(pw.value);
        }
    });
    document.addEventListener('keydown', e => {
        if(e.target.id==='admin-pw-input'&&e.key==='Enter'){
            e.preventDefault(); tryAdminLogin(e.target.value);
        }
        if(e.key==='Escape'){
            if(state.menuOpen) toggleMenu();
            else if(state.showAdminLogin){state.showAdminLogin=false;state.adminLoginError='';render();}
        }
        // Quiz keyboard shortcuts — only while actually playing, and only when
        // focus isn't in a text field (so this never interferes with typing,
        // e.g. in the admin quiz editor's inputs).
        if (state.currentPage === 'quiz' && state.quizStage === 'playing') {
            const tag = e.target && e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const optMap = {'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3,'A':0,'B':1,'C':2,'D':3};
            if (state.quizAnswered === null && optMap.hasOwnProperty(e.key)) {
                e.preventDefault(); quizAnswer(optMap[e.key]);
            } else if (state.quizAnswered !== null && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault(); quizNext();
            }
        }
    });
}


// ============================================================================
// RENDER HELPERS — Hijri Banner & Daily Ayah (avoid nested backticks)
// ============================================================================
function renderHijriBanner(d, l) {
    const h = approxHijriNow();
    const todayGreg = new Date();
    const todayDay = todayGreg.getDate();
    const eventKey = h.month + '-' + h.day;
    const ev = hijriEvents[eventKey];

    // ── 1st: English date ──
    const engMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const engStr = todayDay + ' ' + engMonths[todayGreg.getMonth()] + ' ' + todayGreg.getFullYear();

    // ── 2nd: Bengali date (বঙ্গাব্দ) ──
    const bd = getBanglaDateFull(todayGreg);
    const bnStr = bd.strFull;

    // ── 3rd: Arabic/Hijri in Bengali language ──
    const hijriStr = toBengaliDigits(h.day) + ' ' + hijriMonthsBn[h.month-1] + ' ' + toBengaliDigits(h.year) + ' হিজরি';

    const textColor = d ? '#6ee7b7' : '#065f46';
    const sepColor  = d ? 'rgba(110,231,183,.35)' : 'rgba(5,150,105,.25)';

    const badgeHtml = '<span class="hijri-badge ' + (d?'text-emerald-300':'text-emerald-800') + '" style="gap:0;padding:5px 14px;flex-wrap:wrap;row-gap:2px">'
        + '<span style="display:inline-flex;align-items:center;gap:5px">'
        + '<span style="font-size:.75rem;font-weight:700;color:' + (d?'#93c5fd':'#1d4ed8') + '">📅 ' + engStr + '</span>'
        + '<span style="color:' + sepColor + ';margin:0 3px">|</span>'
        + '<span style="font-size:.75rem;font-weight:700;color:' + (d?'#6ee7b7':'#065f46') + '">🗓️ ' + bnStr + '</span>'
        + '<span style="color:' + sepColor + ';margin:0 3px">|</span>'
        + '<span style="font-size:.75rem;font-weight:700;color:' + (d?'#fcd34d':'#92400e') + '">🌙 ' + hijriStr + '</span>'
        + '</span></span>';

    const evHtml = ev
        ? '<div class="event-banner flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold" style="background:linear-gradient(135deg,rgba(180,83,9,.15),rgba(5,150,105,.1));border:1px solid rgba(180,83,9,.3);color:' + (d?'#fcd34d':'#92400e') + '">✨ ' + (l==='bn'?ev.bn:ev.en) + ' <span style="opacity:.7">' + (l==='bn'?'আজকে':'today') + '</span></div>'
        : '';
    return '<div class="flex flex-wrap items-center justify-between gap-3 mb-6 px-1">'
        + badgeHtml
        + evHtml
        + '</div>';
}

// ============================================================================
// ARABIC TEXT-TO-SPEECH ENGINE
// ============================================================================
const tts = {
    _speaking: false,
    _utterance: null,

    speak(text, lang='ar-SA', onEnd=null) {
        if (!('speechSynthesis' in window)) {
            showToast(state.language==='bn'?'❌ আপনার ব্রাউজারে TTS সাপোর্ট নেই':'❌ TTS not supported', 'error');
            return;
        }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = lang;
        utt.rate = 0.82;
        utt.pitch = 1;
        utt.volume = 1;
        // Try to pick an Arabic voice
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
        if (arabicVoice) utt.voice = arabicVoice;
        utt.onstart = () => { tts._speaking = true; tts._updateBtn(true); };
        utt.onend = () => { tts._speaking = false; tts._updateBtn(false); if (onEnd) onEnd(); };
        utt.onerror = () => { tts._speaking = false; tts._updateBtn(false); };
        this._utterance = utt;
        window.speechSynthesis.speak(utt);
    },

    stop() {
        window.speechSynthesis.cancel();
        tts._speaking = false;
        tts._updateBtn(false);
    },

    toggle(text, lang='ar-SA') {
        if (tts._speaking) { tts.stop(); }
        else { tts.speak(text, lang); }
    },

    _updateBtn(playing) {
        document.querySelectorAll('.tts-play-btn').forEach(btn => {
            const icon = btn.querySelector('.tts-icon');
            if (icon) icon.textContent = playing ? '⏹' : '▶';
            btn.title = playing
                ? (state.language==='bn'?'থামান':'Stop')
                : (state.language==='bn'?'আরবি শুনুন':'Play Arabic');
        });
    }
};

// Voices load asynchronously in some browsers
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

function renderTTSBtn(arabicText, d) {
    if (!arabicText) return '';
    const escaped = arabicText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `<button class="tts-play-btn" onclick="tts.toggle('${escaped}')"
        title="${state.language==='bn'?'আরবি শুনুন':'Play Arabic'}"
        style="display:inline-flex;align-items:center;gap:5px;font-size:.7rem;font-weight:600;
               padding:4px 10px;border-radius:20px;border:1px solid ${d?'rgba(201,162,39,.3)':'rgba(180,83,9,.25)'};
               background:${d?'rgba(201,162,39,.08)':'rgba(180,83,9,.06)'};
               color:${d?'#fcd34d':'#92400e'};cursor:pointer;transition:all .2s">
        <span class="tts-icon">▶</span>
        <span>${state.language==='bn'?'শুনুন':'Listen'}</span>
    </button>`;
}

function renderDailyAyahInner(d, l) {
    const ay = getDailyAyah();
    if (!ay) return '';
    const arabic = ay.arabic || '';
    const meaning = l==='bn' ? (ay.meaningBn||ay.meaningEn||'') : (ay.meaningEn||ay.meaningBn||'');
    const ref = l==='bn' ? (ay.ref||ay.refEn||'') : (ay.refEn||ay.ref||'');
    return '<div class="' + (d?'bg-black/20':'bg-white/70') + ' rounded-2xl p-4 mb-3">'
        + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">'
        + '<p class="arabic-text arabic-reveal text-center flex-1 mb-0" dir="rtl" style="font-size:1.4rem;line-height:2;color:' + (d?'#c9a227':'#92400e') + '">' + arabic + '</p>'
        + (arabic ? renderTTSBtn(arabic, d) : '')
        + '</div>'
        + '<p class="text-xs text-center ' + (d?'text-gray-300':'text-gray-700') + ' leading-relaxed italic">' + meaning + '</p>'
        + '</div>'
        + (ref ? '<p class="text-xs font-bold text-center" style="color:' + (d?'#6ee7b7':'#059669') + '">' + ref + '</p>' : '');
}

// ============================================================================
// READING PROGRESS BAR
// ============================================================================
function initReadingProgress() {
    const bar = document.getElementById('reading-progress');
    if (!bar) return;
    let _irtTicking = false;
    let _irtDocH = document.documentElement.scrollHeight - window.innerHeight;
    const updateDocH = () => {
        _irtDocH = document.documentElement.scrollHeight - window.innerHeight;
    };
    // Same guard pattern as the scroll listener below (store the handler on
    // window, remove the previous one before adding a new one) — without
    // this, every render() -> initReadingProgress() call (i.e. every
    // navigation) added another anonymous resize listener that was never
    // removed, accumulating for the life of the session.
    window.removeEventListener('resize', window._readingProgressResizeFn);
    window._readingProgressResizeFn = updateDocH;
    window.addEventListener('resize', updateDocH, {passive:true});
    const updateProgress = () => {
        if (!_irtTicking) {
            requestAnimationFrame(() => {
                const pct = _irtDocH > 0 ? Math.min(100, (window.scrollY / _irtDocH) * 100) : 0;
                bar.style.width = pct + '%';
                _irtTicking = false;
            });
            _irtTicking = true;
        }
    };
    window.removeEventListener('scroll', window._readingProgressFn);
    window._readingProgressFn = updateProgress;
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
}

// ============================================================================
// CURRENT HIJRI DATE DISPLAY
// ============================================================================
// ============================================================================
// NEXT PRAYER COUNTDOWN (home page banner)
// ============================================================================
function getNextPrayerInfo() {
    const keys = ['fajr','dhuhr','asr','maghrib','isha'];
    const prayerNamesBn = {fajr:'ফজর',dhuhr:'যোহর',asr:'আসর',maghrib:'মাগরিব',isha:'ইশা'};
    const prayerNamesEn = {fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'};
    const now = new Date();

    // Parse prayer time to today's Date object
    function parsePrayer(k, addDay) {
        try {
            const [t, ap] = state.prayerTimes[k].split(' ');
            let [h, m] = t.split(':').map(Number);
            if (ap === 'PM' && h !== 12) h += 12;
            if (ap === 'AM' && h === 12) h = 0;
            const tgt = new Date(now);
            tgt.setHours(h, m, 0, 0);
            if (addDay) tgt.setDate(tgt.getDate() + 1);
            return tgt;
        } catch(e) { return null; }
    }

    // Find next upcoming prayer today
    let nextKey = null, minDiff = Infinity;
    for (const k of keys) {
        const tgt = parsePrayer(k, false);
        if (!tgt) continue;
        const diff = tgt - now;
        if (diff > 0 && diff < minDiff) { minDiff = diff; nextKey = k; }
    }

    // If all prayers passed today, use tomorrow's Fajr
    if (!nextKey) {
        const tgt = parsePrayer('fajr', true);
        if (tgt) { nextKey = 'fajr'; minDiff = tgt - now; }
    }

    if (!nextKey) return null;
    const hh = Math.floor(minDiff / 3600000);
    const mm = String(Math.floor((minDiff % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((minDiff % 60000) / 1000)).padStart(2, '0');
    return {
        key: nextKey,
        nameBn: prayerNamesBn[nextKey],
        nameEn: prayerNamesEn[nextKey],
        timeStr: `${hh}:${mm}:${ss}`,
        diff: minDiff
    };
}

// ============================================================================
// QIBLA DIRECTION FINDER
// ============================================================================
function findQibla(lat, lon) {
    // Kaaba coordinates
    const kaabaLat = 21.4225;
    const kaabaLon = 39.8262;
    const lat1 = lat * Math.PI / 180;
    const lat2 = kaabaLat * Math.PI / 180;
    const deltaLon = (kaabaLon - lon) * Math.PI / 180;
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return Math.round(bearing);
}

// ============================================================================
// RENDER HELPERS
// ============================================================================
function adminBtn() {
    const d=state.darkMode;
    if(state.isAdmin) return `
        <span class="admin-badge">ADMIN</span>
        <button data-action="changePage" data-param="analytics"
            class="${d?'bg-purple-900 text-purple-300':'bg-purple-100 text-purple-700'} px-3 py-1 rounded-lg text-xs font-semibold focus:outline-none"
        >📊</button>
        <button data-action="adminLogout"
            class="${d?'bg-red-900 text-red-300':'bg-red-100 text-red-700'} px-3 py-1 rounded-lg text-xs font-semibold focus:outline-none"
        >${state.language==='bn'?'লগআউট':'Logout'}</button>`;
    return `<button data-action="showAdminLogin"
        class="${d?'bg-gray-700 text-gray-300':'bg-gray-200 text-gray-600'} px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
        title="Admin Login"
    >🔐</button>`;
}

function renderAdminLoginModal() {
    if(!state.showAdminLogin) return '';
    const d=state.darkMode;
    const l=state.language;
    return `
    <div class="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
        <div class="${d?'bg-gray-800':'bg-white'} rounded-2xl p-8 max-w-sm w-full shadow-2xl fade-in">
            <div class="flex justify-between items-center mb-6">
                <h3 id="admin-login-title" class="text-xl font-bold">🔐 ${l==='bn'?'অ্যাডমিন লগইন':'Admin Login'}</h3>
                <button data-action="closeAdminLogin" aria-label="${l==='bn'?'বন্ধ করুন':'Close'}" class="p-1 rounded hover:bg-gray-200">✕</button>
            </div>
            <form id="admin-login-form">
                <label for="admin-pw-input" class="block mb-2 text-sm font-medium">${l==='bn'?'পাসওয়ার্ড':'Password'}</label>
                <input id="admin-pw-input" type="password" autocomplete="current-password"
                    class="${d?'bg-gray-900 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="${l==='bn'?'পাসওয়ার্ড দিন':'Enter password'}" autofocus />
                ${state.adminLoginError?`<p class="text-red-500 text-sm mb-3" role="alert">${sanitize(state.adminLoginError)}</p>`:''}
                <button type="submit" data-action="adminLogin"
                    class="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >${l==='bn'?'প্রবেশ করুন':'Login'}</button>
            </form>
            <p class="text-xs text-center mt-4 ${d?'text-gray-500':'text-gray-400'}">${l==='bn'?'শুধু সাইট পরিচালকের জন্য':'For site admin only'}</p>
        </div>
    </div>`;
}

// ============================================================================
// HEADER
// ============================================================================
function renderHeader()
{
    const d=state.darkMode; const l=state.language;
    const mainPages=['home','blog','knowledgeCenter','dua','ahlulBaytUnified'];
    const morePages=['tasbeeh','quiz','qibla','worldMap','calendar','bookmarks','about','contact'];
    const bg   = d ? 'rgba(6,20,16,.95)'      : 'rgba(255,255,255,.90)';
    const border = d ? 'rgba(52,211,153,.08)' : 'rgba(5,150,105,.10)';
    const pageIcons={home:'🏠',imams:'👑',dua:'🤲',knowledgeCenter:'📚',blog:'📝',tasbeeh:'📿',
        calendar:'📅',quiz:'🧠',qibla:'🧭',worldMap:'🗺️',familyTree:'🌳',ahlulBaytUnified:'👑',bookmarks:'🔖',about:'ℹ️',contact:'📞'};
    return `
    <header style="background:${bg};border-bottom:1.5px solid ${border};" class="sticky top-0 z-30" id="main-header">
        <div class="max-w-7xl mx-auto px-4" style="padding-top:10px;padding-bottom:10px">
            <div class="flex items-center justify-between gap-2">

                <!-- LEFT: Hamburger + Logo -->
                <div class="flex items-center gap-3">
                    <!-- Hamburger (mobile) -->
                    <button data-action="toggleMenu" aria-label="${t('menu')}"
                        aria-haspopup="true" aria-expanded="${state.menuOpen?'true':'false'}" aria-controls="mobile-menu-drawer"
                        class="md:hidden focus:outline-none transition-all hover:scale-110"
                        style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'}">
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                            <line x1="0" y1="1" x2="18" y2="1"/>
                            <line x1="3" y1="7" x2="18" y2="7"/>
                            <line x1="6" y1="13" x2="18" y2="13"/>
                        </svg>
                    </button>

                    <!-- Logo -->
                    <button data-action="changePage" data-param="home"
                        class="flex items-center gap-2.5 focus:outline-none group" aria-label="${t('home')}">
                        <div style="display:flex;align-items:center;flex-shrink:0;transition:transform var(--t-spring)" class="group-hover:scale-105">
                            <img src="assets/images/logo-mark.png" alt="${l==='bn'?'আহলে বাইত':'Ahl al-Bayt'}" style="height:38px;width:38px;border-radius:50%;display:block" />
                        </div>
                        <div class="hidden sm:block">
                            <div class="font-bold text-sm leading-tight" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${l==='bn'?'আহলে বাইত':'Ahl al-Bayt'}</div>
                            <div class="text-xs leading-tight" style="color:${d?'#34d399':'#059669'};opacity:.85">${l==='bn'?'ইসলামিক জ্ঞান':'Islamic Knowledge'}</div>
                        </div>
                    </button>
                </div>

                <!-- CENTER: Desktop nav -->
                <nav class="hidden md:flex items-center gap-0.5" aria-label="${l==='bn'?'প্রধান মেনু':'Main navigation'}">
                    ${mainPages.map(page=>`
                    <button data-action="changePage" data-param="${page}"
                        ${state.currentPage===page?'aria-current="page"':''}
                        class="nav-pill px-3.5 py-2 rounded-xl text-sm focus:outline-none transition-all
                        ${state.currentPage===page
                            ?(d?'bg-emerald-900/60 text-emerald-300 font-bold':'bg-emerald-50 text-emerald-700 font-bold')
                            :(d?'text-gray-400 hover:text-white hover:bg-white/5 font-medium':'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium')}
                        ${state.currentPage===page?'active':''}"
                        style="${state.currentPage===page?'font-weight:700':''}"
                    >${pageIcons[page]??''} ${t(page)}</button>`).join('')}

                    <!-- More dropdown -->
                    <div class="relative" id="more-menu-wrap">
                        <button onclick="const dd=document.getElementById('more-dropdown');const willOpen=dd.classList.contains('hidden');dd.classList.toggle('hidden');this.setAttribute('aria-expanded',String(willOpen))"
                            class="px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1 focus:outline-none transition-all"
                            aria-haspopup="true" aria-expanded="false" aria-controls="more-dropdown"
                            style="color:${d?'#9ca3af':'#6b7280'}">
                            ${l==='bn'?'আরো':'More'}
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5l3 3 3-3"/></svg>
                        </button>
                        <div id="more-dropdown" class="hidden absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden"
                            style="background:${d?'rgba(6,20,16,.97)':'rgba(255,255,255,.97)'};backdrop-filter:blur(24px);border:1px solid ${border}">
                            ${morePages.map(page=>`
                            <button data-action="changePage" data-param="${page}"
                                ${state.currentPage===page?'aria-current="page"':''}
                                class="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-all
                                ${state.currentPage===page?(d?'bg-emerald-900/50 text-emerald-300 font-semibold':'bg-emerald-50 text-emerald-700 font-semibold'):(d?'text-gray-300 hover:bg-white/5':'text-gray-700 hover:bg-gray-50')}"
                            ><span style="font-size:.95rem" aria-hidden="true">${pageIcons[page]??'📄'}</span>${t(page)}</button>`).join('')}
                        </div>
                    </div>
                </nav>

                <!-- RIGHT: Utility buttons -->
                <div class="flex items-center gap-1">
                    <!-- Search -->
                    <button data-action="changePage" data-param="searchPage" aria-label="${t('search')}"
                        class="focus:outline-none transition-all hover:scale-110"
                        style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'};color:${d?'#9ca3af':'#6b7280'}">
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5L18 18"/></svg>
                    </button>

                    <!-- Font size +/- -->
                    <div class="flex items-center gap-0.5 rounded-xl px-1 py-1" style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'}">
                        <button data-action="setFontSize" data-param="${fontSizes[Math.max(0,fontSizes.indexOf(state.fontSize)-1)]}"
                            aria-label="${l==='bn'?'হরফের আকার কমান':'Decrease font size'}"
                            class="w-6 h-6 rounded-lg flex items-center justify-center font-bold focus:outline-none hover:scale-110 transition-all"
                            style="color:${d?'#9ca3af':'#6b7280'}">−</button>
                        <span class="text-xs font-bold px-0.5 select-none" style="color:${d?'#6b7280':'#9ca3af'}" aria-hidden="true">A</span>
                        <button data-action="setFontSize" data-param="${fontSizes[Math.min(fontSizes.length-1,fontSizes.indexOf(state.fontSize)+1)]}"
                            aria-label="${l==='bn'?'হরফের আকার বাড়ান':'Increase font size'}"
                            class="w-6 h-6 rounded-lg flex items-center justify-center font-bold focus:outline-none hover:scale-110 transition-all"
                            style="color:${d?'#9ca3af':'#6b7280'}">+</button>
                    </div>

                    <!-- Admin -->
                    ${adminBtn()}

                    <!-- Language -->
                    <button data-action="toggleLanguage"
                        class="px-2.5 py-1.5 rounded-xl text-xs font-bold focus:outline-none hover:scale-105 transition-all"
                        style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'};color:${d?'#d1d5db':'#374151'}">
                        ${l==='bn'?'EN':'বাং'}
                    </button>

                    <!-- Dark mode -->
                    <button data-action="toggleDarkMode" aria-label="${l==='bn'?'থিম পরিবর্তন':'Toggle theme'}" aria-pressed="${d?'true':'false'}"
                        class="focus:outline-none hover:scale-110 transition-all"
                        style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${d?'rgba(251,191,36,.12)':'rgba(0,0,0,.05)'}">
                        ${d
                            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
                            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
                        }
                    </button>
                </div>

            </div>
        </div>
    </header>`;
}
// ============================================================================
// MOBILE MENU
// ============================================================================
function renderMobileMenu()
{
    const d=state.darkMode; const l=state.language;
    const allPages=['home','blog','dua','ahlulBaytUnified','worldMap','knowledgeCenter','calendar','tasbeeh','quiz','bookmarks','about','contact','searchPage','analytics'];
    const icons={home:'🏠',blog:'📝',imams:'👑',familyTree:'🌳',ahlulBaytUnified:'👑',worldMap:'🗺️',dua:'🤲',knowledgeCenter:'📚',
        calendar:'📅',tasbeeh:'📿',quiz:'🧠',bookmarks:'🔖',
        about:'ℹ️',contact:'📞',searchPage:'🔍',analytics:'📊'};
    const border = d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';
    return `
    <!-- Backdrop -->
    <div id="mobile-menu-backdrop"
        class="fixed inset-0 z-40 ${state.menuOpen?'show':'hidden'}"
        style="background:rgba(0,0,0,.6);backdrop-filter:blur(6px)"
        data-action="toggleMenu" aria-hidden="true"></div>

    <!-- Drawer -->
    <div id="mobile-menu-drawer" class="mobile-menu ${state.menuOpen?'open':''} fixed top-0 left-0 bottom-0 z-50 w-72 overflow-y-auto flex flex-col"
        style="background:${d?'rgba(6,18,14,.98)':'rgba(255,255,255,.98)'};backdrop-filter:blur(24px);box-shadow:12px 0 48px rgba(0,0,0,.25);border-right:1px solid ${border}">

        <!-- Header -->
        <div class="flex items-center justify-between p-5" style="border-bottom:1px solid ${border};flex-shrink:0">
            <div class="flex items-center gap-3">
                <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(5,150,105,.4)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 3C8 3 4.5 6.5 4.5 11C4.5 15.5 8 19 12 19C10 16.5 9 14 9 11C9 7.5 10.5 4.5 14 3.5C13.4 3.2 12.7 3 12 3Z" fill="#fbbf24"/>
                        <circle cx="16" cy="6" r="1.8" fill="white" opacity=".9"/>
                    </svg>
                </div>
                <div>
                    <div class="font-bold text-sm" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${l==='bn'?'আহলে বাইত':'Ahl al-Bayt'}</div>
                    <div class="text-xs" style="color:${d?'#34d399':'#059669'};opacity:.8">${l==='bn'?'ইসলামিক জ্ঞান':'Islamic Knowledge'}</div>
                </div>
            </div>
            <button data-action="toggleMenu" aria-label="${l==='bn'?'বন্ধ করুন':'Close menu'}"
                style="width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};color:${d?'#9ca3af':'#6b7280'}"
                class="hover:scale-110 transition-all focus:outline-none">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                    <path d="M1 1l12 12M13 1L1 13"/>
                </svg>
            </button>
        </div>

        <!-- Nav items -->
        <nav class="p-3 flex-1 space-y-1" style="overflow-y:auto" aria-label="${l==='bn'?'মেনু নেভিগেশন':'Menu navigation'}">
            ${allPages.map(page=>{
                const active = state.currentPage===page;
                return `
                <button data-action="changePage" data-param="${page}" ${active?'aria-current="page"':''}
                    class="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-sm transition-all focus:outline-none text-left"
                    style="${active
                        ? 'background:linear-gradient(135deg,rgba(5,150,105,.18),rgba(5,150,105,.08));color:#059669;border:1.5px solid rgba(5,150,105,.22);font-weight:700'
                        : 'border:1.5px solid transparent;color:'+(d?'#d1d5db':'#374151')+';font-weight:500'}">
                    <span style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;${active?'background:rgba(5,150,105,.16)':'background:'+(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)')}" aria-hidden="true">
                        ${icons[page]||'📄'}
                    </span>
                    <span class="flex-1">${t(page)}</span>
                    ${active?'<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>':''}
                </button>`;
            }).join('')}
        </nav>

        <!-- Footer controls -->
        <div class="p-4" style="border-top:1px solid ${border};flex-shrink:0">
            <div class="grid grid-cols-2 gap-2">
                <button data-action="toggleDarkMode"
                    class="py-3 rounded-2xl text-sm font-bold hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    style="background:${d?'rgba(251,191,36,.12)':'rgba(0,0,0,.05)'};color:${d?'#fbbf24':'#6b7280'}">
                    ${d
                        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2"/></svg> Light'
                        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> Dark'
                    }
                </button>
                <button data-action="toggleLanguage"
                    class="py-3 rounded-2xl text-sm font-bold hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    style="background:${d?'rgba(5,150,105,.12)':'rgba(5,150,105,.08)'};color:${d?'#34d399':'#059669'}">
                    🌐 ${l==='bn'?'English':'বাংলা'}
                </button>
            </div>
        </div>
    </div>`;
}
// ============================================================================
// FOOTER
// ============================================================================
function renderFooter()
{
    const l=state.language;
    const socialLinks=[
        ['https://www.facebook.com/profile.php?id=100090495041094','#1877f2',l==='bn'?'ফেসবুক':'Facebook','<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'],
        ['https://www.instagram.com/ahl.al.bayt.a.s/','#e1306c',l==='bn'?'ইনস্টাগ্রাম':'Instagram','<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>'],
        ['https://www.youtube.com/@Ahl_al-Bayt_a.s','#ff0000',l==='bn'?'ইউটিউব':'YouTube','<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>'],
        ['https://x.com/Ahl_al_Bayt_a_s','#e7e9ea','X / Twitter','<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'],
    ];
    const quickLinks=['home','blog','imams','dua','knowledgeCenter','tasbeeh','quiz','asmaul','qibla','contact'];
    return `
    <footer class="footer-luxury mt-16" style="position:relative;overflow:hidden">

        <!-- Geo pattern overlay -->
        <div style="position:absolute;inset:0;pointer-events:none;opacity:.06;background-image:repeating-linear-gradient(60deg,transparent,transparent 38px,rgba(5,150,105,1) 38px,rgba(5,150,105,1) 39px),repeating-linear-gradient(-60deg,transparent,transparent 38px,rgba(180,83,9,.8) 38px,rgba(180,83,9,.8) 39px)"></div>

        <!-- Gold shimmer top border -->
        <div style="height:2px;background:linear-gradient(90deg,transparent,#059669,#c9a227,#059669,transparent);background-size:200% 100%;animation:goldShimmer 3s linear infinite"></div>

        <!-- Mosque silhouette -->
        <div style="width:100%;overflow:hidden;line-height:0;opacity:.22;margin-bottom:-2px" aria-hidden="true">
            <svg viewBox="0 0 1200 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:110px">
                <rect x="150" y="118" width="900" height="12" rx="2" fill="#065f46" opacity=".8"/>
                <rect x="430" y="110" width="340" height="8" rx="2" fill="#059669" opacity=".6"/>
                <rect x="460" y="104" width="280" height="6" rx="2" fill="#059669" opacity=".5"/>
                <rect x="320" y="60" width="560" height="58" fill="#047857" opacity=".7"/>
                <path d="M380 118 L380 80 Q395 65 410 80 L410 118Z" fill="#022c22" opacity=".6"/>
                <path d="M450 118 L450 80 Q465 65 480 80 L480 118Z" fill="#022c22" opacity=".6"/>
                <path d="M720 118 L720 80 Q735 65 750 80 L750 118Z" fill="#022c22" opacity=".6"/>
                <path d="M790 118 L790 80 Q805 65 820 80 L820 118Z" fill="#022c22" opacity=".6"/>
                <path d="M540 118 L540 70 Q600 42 660 70 L660 118Z" fill="#022c22" opacity=".7"/>
                <path d="M510 60 Q600 5 690 60Z" fill="#059669" opacity=".95"/>
                <rect x="594" y="5" width="12" height="18" rx="3" fill="#c9a227" opacity=".95"/>
                <circle cx="600" cy="4" r="5.5" fill="#c9a227"/>
                <path d="M350 60 Q410 28 470 60Z" fill="#047857" opacity=".8"/>
                <rect x="407" y="28" width="7" height="12" rx="2" fill="#b45309" opacity=".9"/>
                <path d="M730 60 Q790 28 850 60Z" fill="#047857" opacity=".8"/>
                <rect x="787" y="28" width="7" height="12" rx="2" fill="#b45309" opacity=".9"/>
                <rect x="218" y="20" width="24" height="98" rx="3" fill="#065f46" opacity=".9"/>
                <rect x="215" y="52" width="30" height="5" rx="2" fill="#34d399" opacity=".5"/>
                <rect x="215" y="72" width="30" height="5" rx="2" fill="#34d399" opacity=".5"/>
                <path d="M218 20 Q230 2 242 20Z" fill="#c9a227"/>
                <circle cx="230" cy="1" r="4.5" fill="#c9a227"/>
                <rect x="300" y="38" width="18" height="80" rx="2" fill="#059669" opacity=".75"/>
                <path d="M300 38 Q309 20 318 38Z" fill="#b45309" opacity=".9"/>
                <rect x="882" y="38" width="18" height="80" rx="2" fill="#059669" opacity=".75"/>
                <path d="M882 38 Q891 20 900 38Z" fill="#b45309" opacity=".9"/>
                <rect x="958" y="20" width="24" height="98" rx="3" fill="#065f46" opacity=".9"/>
                <rect x="955" y="52" width="30" height="5" rx="2" fill="#34d399" opacity=".5"/>
                <rect x="955" y="72" width="30" height="5" rx="2" fill="#34d399" opacity=".5"/>
                <path d="M958 20 Q970 2 982 20Z" fill="#c9a227"/>
                <circle cx="970" cy="1" r="4.5" fill="#c9a227"/>
                <circle cx="120" cy="38" r="2.5" fill="#fcd34d" opacity=".8"/>
                <circle cx="1080" cy="30" r="2" fill="#fcd34d" opacity=".8"/>
                <circle cx="600" cy="48" r="1.5" fill="#fef3c7" opacity=".7"/>
                <circle cx="300" cy="20" r="1.5" fill="#fcd34d" opacity=".6"/>
                <circle cx="900" cy="15" r="2" fill="#fcd34d" opacity=".6"/>
            </svg>
        </div>

        <!-- Islamic geometric divider -->
        <div style="width:100%;height:24px;overflow:hidden;opacity:.18" aria-hidden="true">
            <svg width="100%" height="24" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                <defs><pattern id="fp2" x="0" y="0" width="48" height="24" patternUnits="userSpaceOnUse">
                    <path d="M0 12 L12 0 L24 12 L36 0 L48 12 L36 24 L24 12 L12 24Z" fill="none" stroke="#B45309" stroke-width="1"/>
                    <circle cx="24" cy="12" r="2.5" fill="#059669" opacity=".9"/>
                </pattern></defs>
                <rect width="100%" height="24" fill="url(#fp2)"/>
            </svg>
        </div>

        <!-- Main content -->
        <div class="max-w-7xl mx-auto px-4 pt-10 pb-8" style="position:relative;z-index:10">
            <div class="grid md:grid-cols-3 gap-10">

                <!-- Brand column -->
                <div>
                    <div class="flex items-center gap-3 mb-5">
                        <div style="display:flex;align-items:center;flex-shrink:0">
                            <img src="assets/images/logo-mark.png" alt="${l==='bn'?'আহলে বাইত (আ.)':'Ahl al-Bayt (a.s)'}" style="height:46px;width:46px;border-radius:50%;display:block;box-shadow:0 4px 18px rgba(0,0,0,.25)" />
                        </div>
                        <div>
                            <h2 class="font-bold text-lg text-white leading-tight">${l==='bn'?'আহলে বাইত (আ.)':'Ahl al-Bayt (a.s)'}</h2>
                            <p class="text-xs" style="color:rgba(52,211,153,.7)">${l==='bn'?'ইসলামিক জ্ঞান কেন্দ্র':'Islamic Knowledge Center'}</p>
                        </div>
                    </div>
                    <p class="text-sm leading-relaxed mb-5" style="color:rgba(255,255,255,.52)">
                        ${l==='bn'
                            ?'কুরআন, হাদিস ও আহলে বাইত (আ.)-এর শিক্ষায় আলোকিত হওয়ার জন্য আপনার বিশ্বস্ত উৎস।'
                            :"Your trusted source for enlightenment through Quran, Hadith & Ahl al-Bayt's (AS) teachings."}
                    </p>
                    <!-- Social links -->
                    <div class="flex gap-2 flex-wrap">
                        ${socialLinks.map(([href,color,label,svg])=>`
                        <a href="${href}" target="_blank" rel="noopener noreferrer" title="${label}" aria-label="${label}"
                            style="width:40px;height:40px;border-radius:12px;background:${color}20;border:1px solid ${color}35;
                            display:flex;align-items:center;justify-content:center;color:${color};
                            transition:transform var(--t-spring),box-shadow var(--t-base)"
                            onmouseover="this.style.transform='scale(1.18) translateY(-3px)';this.style.boxShadow='0 8px 20px ${color}45'"
                            onmouseout="this.style.transform='';this.style.boxShadow=''">
                            <span aria-hidden="true">${svg}</span>
                        </a>`).join('')}
                    </div>
                </div>

                <!-- Quick links -->
                <div>
                    <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                        <span style="width:20px;height:2px;background:linear-gradient(90deg,#059669,#c9a227);border-radius:2px" aria-hidden="true"></span>
                        ${l==='bn'?'দ্রুত লিংক':'Quick Links'}
                    </h3>
                    <div class="grid grid-cols-2 gap-y-2 gap-x-3">
                        ${quickLinks.map(p=>`
                        <button data-action="changePage" data-param="${p}"
                            class="text-left text-sm transition-all hover:translate-x-1"
                            style="color:rgba(255,255,255,.5);display:flex;align-items:center;gap:5px"
                            onmouseover="this.style.color='#34d399'"
                            onmouseout="this.style.color='rgba(255,255,255,.5)'">
                            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                            ${t(p)}
                        </button>`).join('')}
                    </div>
                </div>

                <!-- Contact -->
                <div>
                    <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                        <span style="width:20px;height:2px;background:linear-gradient(90deg,#059669,#c9a227);border-radius:2px" aria-hidden="true"></span>
                        ${l==='bn'?'যোগাযোগ':'Contact'}
                    </h3>
                    <div class="space-y-3">
                        <a href="mailto:theroleofahlalbaytas@gmail.com"
                            class="flex items-center gap-3 text-sm transition-all"
                            style="color:rgba(255,255,255,.5)"
                            onmouseover="this.style.color='#34d399'"
                            onmouseout="this.style.color='rgba(255,255,255,.5)'">
                            <span style="width:32px;height:32px;border-radius:10px;background:rgba(5,150,105,.15);border:1px solid rgba(5,150,105,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0" aria-hidden="true">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            </span>
                            theroleofahlalbaytas@gmail.com
                        </a>
                        <a href="tel:+8801636428274"
                            class="flex items-center gap-3 text-sm transition-all"
                            style="color:rgba(255,255,255,.5)"
                            onmouseover="this.style.color='#34d399'"
                            onmouseout="this.style.color='rgba(255,255,255,.5)'">
                            <span style="width:32px;height:32px;border-radius:10px;background:rgba(5,150,105,.15);border:1px solid rgba(5,150,105,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0" aria-hidden="true">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                            </span>
                            +880 1636428274
                        </a>
                    </div>
                </div>
            </div>

            <!-- Bottom bar -->
            <div style="border-top:1px solid rgba(255,255,255,.06);margin-top:2.5rem;padding-top:1.75rem;text-align:center">
                <p class="arabic-text mb-2" dir="rtl"
                    style="font-size:1.55rem;background:linear-gradient(135deg,#34d399,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ
                </p>
                <p class="text-xs" style="color:rgba(255,255,255,.28)">
                    © ${new Date().getFullYear()} ${l==='bn'?'আহলে বাইত (আ.)':'Ahl al-Bayt (a.s)'}
                    · ${l==='bn'?'সর্বস্বত্ব সংরক্ষিত':'All rights reserved'}
                </p>
            </div>
        </div>
    </footer>`;
}
// ============================================================================
// PRAYER TIMES WIDGET
// ============================================================================
function renderPrayerWidget()
{
    const d=state.darkMode; const l=state.language;
    const prayerIcons={fajr:'🌅',dhuhr:'☀️',asr:'🌤',maghrib:'🌇',isha:'🌙'};
    const prayerBg={
        fajr:   'linear-gradient(135deg,#1e3a5f,#1e40af)',
        dhuhr:  'linear-gradient(135deg,#78350f,#b45309)',
        asr:    'linear-gradient(135deg,#065f46,#059669)',
        maghrib:'linear-gradient(135deg,#7f1d1d,#dc2626)',
        isha:   'linear-gradient(135deg,#1e1b4b,#4c1d95)',
    };
    function getActive(){
        const keys=['fajr','dhuhr','asr','maghrib','isha'];
        const now=new Date();
        let nextIdx=-1;
        for(let i=0;i<keys.length;i++){
            try{
                const[tm,ap]=state.prayerTimes[keys[i]].split(' ');
                let[h,m]=tm.split(':').map(Number);
                if(ap==='PM'&&h!==12)h+=12;
                if(ap==='AM'&&h===12)h=0;
                const tgt=new Date(now); tgt.setHours(h,m,0,0);
                if(tgt>now){nextIdx=i;break;}
            }catch(e){}
        }
        if(nextIdx===-1) return 'isha';
        if(nextIdx===0)  return null;
        return keys[nextIdx-1];
    }
    const activePrayer  = getActive();
    const nextPrayerInfo= getNextPrayerInfo();
    const nextPrayer    = nextPrayerInfo?nextPrayerInfo.key:null;
    const hasGPS        = !!state.userLocation;

    return `
    <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border reveal" style="box-shadow:var(--shadow-md)">
        <div class="gold-top-bar" style="border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
        <div class="p-5">

            <!-- Header row -->
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 class="font-bold text-base flex items-center gap-2">
                    <span style="width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;font-size:.85rem;box-shadow:0 3px 10px rgba(5,150,105,.4)">🕌</span>
                    ${t('prayerTimes')}
                </h3>
                <div class="flex items-center gap-2">
                    <button onclick="requestGPSPrayerTimes()"
                        style="display:flex;align-items:center;gap:5px;font-size:.68rem;font-weight:700;
                        padding:5px 11px;border-radius:50px;cursor:pointer;transition:all .2s;
                        background:${hasGPS?(d?'rgba(5,150,105,.2)':'rgba(5,150,105,.1)'):(d?'rgba(255,255,255,.07)':'rgba(0,0,0,.04)')};
                        color:${hasGPS?'#059669':(d?'#9ca3af':'#6b7280')};
                        border:1.5px solid ${hasGPS?'rgba(5,150,105,.35)':(d?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)')}">
                        <span style="width:7px;height:7px;border-radius:50%;background:${hasGPS?'#10b981':'#9ca3af'};${hasGPS?'animation:gpsPulseDot 2s ease-in-out infinite':''}"></span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        ${hasGPS?(l==='bn'?'GPS সক্রিয়':'GPS Live'):(l==='bn'?'আমার লোকেশন':'My Location')}
                    </button>
                    <button data-action="changePage" data-param="prayer"
                        style="font-size:.68rem;font-weight:700;padding:5px 11px;border-radius:50px;cursor:pointer;
                        background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.04)'};
                        color:${d?'#9ca3af':'#6b7280'};
                        border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'}">
                        ${l==='bn'?'বিস্তারিত':'Details'}
                    </button>
                </div>
            </div>

            <!-- Prayer rows -->
            ${state.prayerTimesLoading
                ? `<div class="space-y-2">${[1,2,3,4,5].map(()=>`
                    <div class="flex justify-between items-center px-3 py-2.5 rounded-xl ${d?'bg-gray-900':'bg-gray-50'}">
                        <div class="${d?'skeleton-dark':'skeleton'}" style="width:80px;height:13px;border-radius:6px"></div>
                        <div class="${d?'skeleton-dark':'skeleton'}" style="width:60px;height:13px;border-radius:6px"></div>
                    </div>`).join('')}</div>`
                : state.prayerTimesError
                ? `<p class="text-center text-red-500 py-4 text-sm">${sanitize(state.prayerTimesError)}</p>`
                : `<div class="space-y-1.5">
                    ${Object.entries(state.prayerTimes).map(([k,v])=>{
                        const isActive = k===activePrayer;
                        const isNext   = k===nextPrayer;
                        return `
                        <div class="prayer-row flex justify-between items-center px-3 py-2.5 rounded-xl
                            ${d?'bg-gray-900/60':'bg-gray-50'}
                            ${isActive?'prayer-row-active':''}"
                            style="${isActive?'background:linear-gradient(135deg,rgba(5,150,105,.14),rgba(5,150,105,.06)) !important':''}">
                            <div class="flex items-center gap-3">
                                <span style="width:32px;height:32px;border-radius:10px;
                                    background:${isActive?prayerBg[k]:(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)')};
                                    display:flex;align-items:center;justify-content:center;
                                    font-size:.9rem;flex-shrink:0;
                                    transition:all var(--t-base)">
                                    ${prayerIcons[k]||'🕌'}
                                </span>
                                <div>
                                    <p class="font-semibold text-sm leading-tight
                                        ${isActive?(d?'text-emerald-300':'text-emerald-700'):''}">
                                        ${t(k)}
                                    </p>
                                    ${isNext?`<p class="prayer-countdown text-xs" id="pclock-${k}" style="color:#c9a227;font-weight:700">…</p>`:''}
                                </div>
                                ${isActive?`<span class="prayer-pulse" style="width:7px;height:7px;border-radius:50%;background:#10b981;margin-left:2px"></span>`:''}
                            </div>
                            <span class="font-bold text-sm tabular-nums
                                ${isActive?(d?'text-emerald-300':'text-emerald-600'):(d?'text-gray-300':'text-gray-700')}">
                                ${sanitize(v)}
                            </span>
                        </div>`;
                    }).join('')}
                </div>
                <p class="text-center text-xs mt-3" style="color:${d?'rgba(255,255,255,.28)':'rgba(0,0,0,.35)'}">
                    ${hasGPS
                        ? `📍 ${state.userLocation.latitude.toFixed(2)}°, ${state.userLocation.longitude.toFixed(2)}° ${l==='bn'?'থেকে সঠিক সময়':'precise'}`
                        : (l==='bn'?'ঢাকার আনুমানিক সময় — সঠিক সময়ের জন্য GPS চালু করুন':'Approximate Dhaka time — enable GPS for precision')}
                </p>

                <!-- ── সেহরি ও ইফতারের সময় ── -->
                <div style="margin-top:12px;border-top:1px solid ${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)'};padding-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px">

                    <!-- সেহরি -->
                    <div style="border-radius:14px;padding:11px 13px;text-align:center;
                        background:${d?'linear-gradient(135deg,rgba(15,23,42,.8),rgba(30,64,175,.25))':'linear-gradient(135deg,rgba(239,246,255,.9),rgba(219,234,254,.7))'};
                        border:1px solid ${d?'rgba(96,165,250,.2)':'rgba(147,197,253,.5)'}">
                        <div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-bottom:5px">
                            <span style="font-size:.9rem" aria-hidden="true">🌙</span>
                            <span style="font-size:10.5px;font-weight:700;color:${d?'#93c5fd':'#1d4ed8'}">
                                ${l==='bn'?'সেহরির শেষ সময়':'Sehri Ends'}
                            </span>
                        </div>
                        <p style="font-size:1.05rem;font-weight:800;letter-spacing:.3px;
                            color:${d?'#bfdbfe':'#1e3a8a'};margin:0;line-height:1.2">
                            ${sanitize(state.prayerTimes.fajr||'--:--')}
                        </p>
                        <p style="font-size:9.5px;margin-top:3px;color:${d?'rgba(147,197,253,.55)':'rgba(30,58,138,.5)'}">
                            ${l==='bn'?'ফজরের আজানের আগে':'Before Fajr Adhan'}
                        </p>
                    </div>

                    <!-- ইফতার -->
                    <div style="border-radius:14px;padding:11px 13px;text-align:center;
                        background:${d?'linear-gradient(135deg,rgba(69,10,10,.7),rgba(180,83,9,.25))':'linear-gradient(135deg,rgba(255,247,237,.9),rgba(254,215,170,.6))'};
                        border:1px solid ${d?'rgba(252,165,165,.2)':'rgba(249,115,22,.35)'}">
                        <div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-bottom:5px">
                            <span style="font-size:.9rem" aria-hidden="true">🌇</span>
                            <span style="font-size:10.5px;font-weight:700;color:${d?'#fca5a5':'#c2410c'}">
                                ${l==='bn'?'ইফতারের সময়':'Iftar Time'}
                            </span>
                        </div>
                        <p style="font-size:1.05rem;font-weight:800;letter-spacing:.3px;
                            color:${d?'#fed7aa':'#9a3412'};margin:0;line-height:1.2">
                            ${sanitize(state.prayerTimes.maghrib||'--:--')}
                        </p>
                        <p style="font-size:9.5px;margin-top:3px;color:${d?'rgba(252,165,165,.55)':'rgba(154,52,18,.5)'}">
                            ${l==='bn'?'মাগরিবের আজানে':'At Maghrib Adhan'}
                        </p>
                    </div>

                </div>`}
        </div>
    </div>`;
}
// ============================================================================
// HOME PAGE — LATEST BLOG PREVIEW WIDGET
// ============================================================================
function renderLatestBlogWidget(d, l) {
    const allPosts = [...(state.customPosts||[]), ...(typeof blogPosts!=='undefined'?blogPosts:[])]
        .sort((a,b)=>new Date(b.date)-new Date(a.date));
    if (!allPosts.length) return '';
    const latest = allPosts.slice(0,3);

    const CAT_HOME = {
        'রমজান':    {color:'#1D9E75', bg:d?'rgba(29,158,117,.18)':'#E1F5EE', fg:d?'#5DCAA5':'#0F6E56'},
        'আহলে বাইত':{color:'#7F77DD', bg:d?'rgba(127,119,221,.18)':'#EEEDFE', fg:d?'#AFA9EC':'#3C3489'},
        'দোয়া':     {color:'#378ADD', bg:d?'rgba(55,138,221,.18)':'#E6F1FB', fg:d?'#85B7EB':'#0C447C'},
        'কুরআন':    {color:'#EF9F27', bg:d?'rgba(239,159,39,.18)':'#FAEEDA', fg:d?'#FAC775':'#854F0B'},
        'ইবাদত':    {color:'#1D9E75', bg:d?'rgba(29,158,117,.18)':'#E1F5EE', fg:d?'#5DCAA5':'#0F6E56'},
        'আখলাক':    {color:'#D4537E', bg:d?'rgba(212,83,126,.18)':'#FBEAF0', fg:d?'#ED93B1':'#72243E'},
        'ইতিহাস':   {color:'#B5651D', bg:d?'rgba(181,101,29,.18)':'#FBEEDD', fg:d?'#E3A96B':'#7A4212'},
    };
    const catIconHome = {'রমজান':'🌙','আহলে বাইত':'👑','দোয়া':'🤲','কুরআন':'📗','ইবাদত':'🕌','আখলাক':'⚖️','ইতিহাস':'📜'};
    const defaultCatHome = {color:'#888780', bg:d?'rgba(136,135,128,.18)':'#F1EFE8', fg:d?'#B4B2A9':'#5F5E5A'};
    const getCatHome = c => CAT_HOME[c] || defaultCatHome;
    const fmtDateHome = (dateStr) => {
        if (!dateStr) return '';
        try {
            const dt = new Date(dateStr.length===10 ? dateStr+'T00:00:00' : dateStr);
            return l==='bn' ? dt.toLocaleDateString('bn-BD',{month:'short',day:'numeric'}) : dt.toLocaleDateString('en-GB',{month:'short',day:'numeric'});
        } catch(e) { return dateStr; }
    };

    return `
    <section aria-labelledby="home-blog-heading" style="margin-bottom:3rem">
        <div class="section-heading reveal">
            <span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0369a1,#075985);display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;box-shadow:0 4px 12px rgba(3,105,161,.35)" aria-hidden="true">📝</span>
            <h2 id="home-blog-heading" class="section-title">${l==='bn'?'সাম্প্রতিক লেখা':'Latest Writings'}</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 reveal">
            ${latest.map((post,pi)=>{
                const c = getCatHome(post.category);
                return `
                <button data-action="readPost" data-param="${post.id}"
                    class="text-left w-full reveal-delay-${pi%4+1}" style="cursor:pointer;background:${d?'#1f2937':'#ffffff'};border:1px solid ${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)'};border-radius:16px;overflow:hidden;display:flex;flex-direction:column">
                    <div style="height:3px;background:${c.color};flex-shrink:0"></div>
                    <div style="padding:1rem 1.15rem;display:flex;flex-direction:column;gap:8px;flex:1">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                            <span style="font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;background:${c.bg};color:${c.fg}">${catIconHome[post.category]||'📝'} ${sanitize(post.category||'')}</span>
                            <span style="margin-left:auto;font-size:11px;color:${d?'#9ca3af':'#6b7280'}">${fmtDateHome(post.date)}</span>
                        </div>
                        <h3 class="line-clamp-2" style="font-size:13.5px;font-weight:700;color:${d?'#f9fafb':'#111827'};line-height:1.45;margin:0">${sanitize(l==='bn'?post.titleBn:post.titleEn)}</h3>
                        <p class="line-clamp-2" style="font-size:12px;color:${d?'#9ca3af':'#6b7280'};line-height:1.6;margin:0">${sanitize(post.excerpt||'')}</p>
                        <span style="margin-top:auto;padding-top:6px;font-size:11.5px;font-weight:700;color:${c.fg}">${l==='bn'?'পড়ুন':'Read'} →</span>
                    </div>
                </button>`;
            }).join('')}
        </div>
    </section>`;
}

// ============================================================================
// HOME PAGE — "CONTINUE WHERE YOU LEFT OFF" STRIP (reading history)
// ============================================================================
function renderContinueReadingWidget(d, l) {
    const items = (state.readingHistory||[]).slice(0,3);
    if (!items.length) return '';
    const typeMeta = {
        post: {icon:'📝', action:'readPost'},
        dua:  {icon:'🤲', action:'readDua'},
        amal: {icon:'🌙', action:'readAmal'},
    };
    return `
    <section aria-labelledby="home-continue-heading" style="margin-bottom:3rem">
        <div class="section-heading reveal">
            <span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;box-shadow:0 4px 12px rgba(124,58,237,.35)" aria-hidden="true">🔖</span>
            <h2 id="home-continue-heading" class="section-title">${l==='bn'?'আপনি যা পড়ছিলেন':'Continue Where You Left Off'}</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 reveal">
            ${items.map(h=>{
                const meta = typeMeta[h.type] || {icon:'📖', action:'readPost'};
                return `
                <button data-action="${meta.action}" data-param="${h.id}"
                    class="text-left w-full" style="display:flex;align-items:center;gap:10px;padding:.85rem 1rem;border-radius:14px;cursor:pointer;
                    background:${d?'rgba(124,58,237,.1)':'rgba(124,58,237,.06)'};border:1px solid ${d?'rgba(124,58,237,.25)':'rgba(124,58,237,.18)'}">
                    <span style="font-size:1.15rem;flex-shrink:0" aria-hidden="true">${meta.icon}</span>
                    <span class="line-clamp-2" style="font-size:12.5px;font-weight:600;color:${d?'#e9d5ff':'#4c1d95'};line-height:1.4">${sanitize(l==='bn'?h.titleBn:h.titleEn)}</span>
                </button>`;
            }).join('')}
        </div>
    </section>`;
}

// ============================================================================
// HOME PAGE — "QUIZ OF THE DAY" SIDEBAR WIDGET
// ============================================================================
function renderHomeQuizWidget(d, l) {
    const qi = getHomeQuizIndex();
    const q = quizQuestions[qi];
    if (!q) return '';
    const picked = state.homeQuizPick;
    return `
    <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-5 reveal" style="box-shadow:var(--app-shadow-sm)">
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold flex items-center gap-2">
                <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#dc2626,#7f1d1d);display:flex;align-items:center;justify-content:center;font-size:.8rem" aria-hidden="true">🧠</span>
                ${l==='bn'?'আজকের প্রশ্ন':'Question of the Day'}
            </h3>
        </div>
        <p class="text-sm font-semibold mb-3" style="${d?'color:#f3f4f6':'color:#111827'}">${sanitize(l==='bn'?q.qBn:q.qEn)}</p>
        <div class="space-y-2">
            ${q.options.map((opt,i)=>{
                let cls = `quiz-option border ${d?'bg-gray-900 border-gray-700':'bg-gray-50 border-gray-200'} rounded-xl px-3.5 py-2.5 w-full text-left text-xs font-medium`;
                if (picked!==null) {
                    if (i===q.correct) cls += ' correct';
                    else if (i===picked) cls += ' wrong';
                }
                return `<button data-action="homeQuizAnswer" data-param="${i}" class="${cls}" ${picked!==null?'disabled="disabled"':''}>
                    <span style="${d?'color:#9ca3af':'color:#9ca3af'};margin-right:8px" aria-hidden="true">${['A','B','C','D'][i]}.</span>
                    ${sanitize(l==='bn'?opt.bn:opt.en)}
                </button>`;
            }).join('')}
        </div>
        ${picked!==null ? `
        <button data-action="changePage" data-param="quiz" class="w-full mt-3" style="font-size:.75rem;font-weight:700;padding:8px;border-radius:10px;cursor:pointer;background:${d?'rgba(220,38,38,.15)':'rgba(220,38,38,.08)'};color:${d?'#fca5a5':'#b91c1c'};border:1px solid ${d?'rgba(220,38,38,.3)':'rgba(220,38,38,.2)'}">
            ${l==='bn'?'পুরো কুইজ খেলুন →':'Play Full Quiz →'}
        </button>` : ''}
    </div>`;
}

// ============================================================================
// PAGE: HOME
// ============================================================================
function renderHomePage()
{
    const d=state.darkMode; const l=state.language;

    /* ── Feature cards data — grouped into two subsections ── */
    const featuresLearn=[
        {icon:'👑',title:l==='bn'?'ইমামগণ':'The Imams',       desc:l==='bn'?'১৪ মাসুমিনের জীবনী':'Lives of 14 Masumeen',    page:'imams',   color:'#059669',bg:'rgba(5,150,105,.1)', faint:'rgba(5,150,105,.25)'},
        {icon:'📝',title:t('blog'),                              desc:l==='bn'?'ইসলামিক প্রবন্ধ':'Islamic writings',            page:'blog',    color:'#0369a1',bg:'rgba(3,105,161,.1)',  faint:'rgba(3,105,161,.25)'},
        {icon:'📚',title:l==='bn'?'জ্ঞান কেন্দ্র':'Knowledge Center', desc:l==='bn'?'হাদিস, মাসাইল, প্রশ্নোত্তর ও ফতোয়া':'Hadith, Masail, Q&A & Fatwa', page:'knowledgeCenter', color:'#047857',bg:'rgba(4,120,87,.1)',  faint:'rgba(4,120,87,.25)'},
        {icon:'🧠',title:l==='bn'?'কুইজ':'Quiz',               desc:l==='bn'?'জ্ঞান পরীক্ষা':'Test your knowledge',           page:'quiz',    color:'#dc2626',bg:'rgba(220,38,38,.1)',faint:'rgba(220,38,38,.25)'},
    ];
    const featuresWorship=[
        {icon:'🤲',title:l==='bn'?'দোয়া ও যিয়ারত':'Dua & Ziyarat',desc:l==='bn'?'দোয়া সংকলন':'Supplications',              page:'dua',     color:'#7c3aed',bg:'rgba(124,58,237,.1)',faint:'rgba(124,58,237,.25)'},
        {icon:'📿',title:l==='bn'?'তাসবিহ':'Tasbeeh',          desc:l==='bn'?'ডিজিটাল তাসবিহ':'Digital counter',             page:'tasbeeh', color:'#059669',bg:'rgba(5,150,105,.1)', faint:'rgba(5,150,105,.25)'},
        {icon:'☀️',title:l==='bn'?'৯৯ নাম':'99 Names',         desc:l==='bn'?'আসমাউল হুসনা':'Names of Allah',               page:'asmaul',  color:'#b45309',bg:'rgba(180,83,9,.1)', faint:'rgba(180,83,9,.25)'},
        {icon:'🧭',title:l==='bn'?'কিবলা':'Qibla',             desc:l==='bn'?'কিবলার দিক':'Qibla direction',                 page:'qibla',   color:'#0d9488',bg:'rgba(13,148,136,.1)',faint:'rgba(13,148,136,.25)'},
        {icon:'🗺️',title:l==='bn'?'বিশ্ব মানচিত্র':'World Map', desc:l==='bn'?'পবিত্র স্থানসমূহ':'Holy sites',              page:'worldMap',color:'#b45309',bg:'rgba(180,83,9,.1)', faint:'rgba(180,83,9,.25)'},
    ];
    const renderFeatureCard=(f,fi)=>`
        <button data-action="changePage" data-param="${f.page}"
            class="feature-card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border text-left w-full p-5 reveal reveal-delay-${fi%4+1}"
            style="box-shadow:var(--app-shadow-sm);--fc-accent:${f.color};--fc-accent-bg:${f.bg};--fc-accent-faint:${f.faint}">
            <span class="feature-card-badge">${f.title}</span>
            <div class="feature-card-content">
                <div class="feature-icon-wrap" style="background:${f.bg};border-color:${f.faint}" aria-hidden="true">${f.icon}</div>
                <h3 class="font-bold text-sm mb-1" style="color:${d?'#f9fafb':'#111827'}">${f.title}</h3>
                <p class="text-xs leading-relaxed" style="color:${d?'#9ca3af':'#6b7280'}">${f.desc}</p>
                <div class="feature-card-link">
                    ${l==='bn'?'দেখুন':'Explore'}
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                </div>
            </div>
        </button>`;

    /* ── Ashura countdown ── */
    const h=approxHijriNow();
    const ashuraYear=(h.month>1||(h.month===1&&h.day>10))?h.year+1:h.year;
    const ashuraGreg=hijriToGregorian(10,1,ashuraYear);
    const todayD=new Date(); todayD.setHours(0,0,0,0); ashuraGreg.setHours(0,0,0,0);
    const daysLeft=Math.ceil((ashuraGreg-todayD)/86400000);
    const cdLabel=daysLeft===0
        ?(l==='bn'?'🔴 আজ আশুরা':'🔴 Ashura is today')
        :daysLeft<0
            ?(l==='bn'?'কারবালার ঘটনা জানুন':'Learn about Karbala')
            :(l==='bn'?`আশুরা ${toBengaliDigits(daysLeft)} দিন বাকি`:`${daysLeft} day${daysLeft===1?'':'s'} until Ashura`);

    return `
    <!-- ① Hijri banner -->
    ${renderHijriBanner(d,l)}

    <!-- ② Next prayer countdown -->
    <div class="next-prayer-banner p-5 mb-8 reveal" id="next-prayer-home">
        <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
                <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(5,150,105,.45)">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v3"/>
                        <circle cx="12" cy="6.2" r="1.1" fill="white" stroke="none"/>
                        <path d="M9 11c0-2.2 1.3-4 3-4s3 1.8 3 4"/>
                        <path d="M5 21v-7c0-1.8 1.2-3.3 2.8-3.8L9 9.7V21"/>
                        <path d="M19 21v-7c0-1.8-1.2-3.3-2.8-3.8L15 9.7V21"/>
                        <path d="M9 17h6"/>
                        <path d="M3 21h18"/>
                    </svg>
                </div>
                <div>
                    <p class="text-xs font-semibold" style="color:rgba(52,211,153,.75)">${l==='bn'?'পরবর্তী নামাজ':'Next Prayer'}</p>
                    <p id="next-prayer-name-home" class="text-white font-bold text-base">${l==='bn'?'লোড হচ্ছে...':'Loading...'}</p>
                </div>
            </div>
            <div style="text-align:right">
                <div id="next-prayer-countdown-home" class="next-prayer-time">--:--:--</div>
                <p class="text-xs" style="color:rgba(52,211,153,.6);margin-top:2px">${l==='bn'?'বাকি সময়':'remaining'}</p>
            </div>
        </div>
    </div>

    <!-- ③ HERO SECTION -->
    <div class="${d?'hero-luxury':'hero-luxury-light'} rounded-3xl mb-12 relative page-enter overflow-hidden"
        style="min-height:440px;display:flex;align-items:center;justify-content:center;padding:56px 24px;color:${d?'white':'inherit'}">

        <!-- Geo grid -->
        <div class="hero-geo-bg"></div>
        <div class="islamic-geo-overlay"></div>

        <!-- Dark mode: orbs + particles -->
        ${d?`
        <div class="hero-orb hero-orb-1"></div>
        <div class="hero-orb hero-orb-2"></div>
        <div class="hero-orb hero-orb-3"></div>
        ${Array.from({length:16},(_,i)=>`
        <div class="hero-particle" style="
            width:${3+i%4*2}px;height:${3+i%4*2}px;
            left:${4+i*6}%;bottom:-8px;
            background:${['rgba(180,83,9,.9)','rgba(5,150,105,.7)','rgba(255,255,255,.5)','rgba(201,162,39,.6)'][i%4]};
            animation-duration:${7+i*1.1}s;animation-delay:${i*.55}s;
            --drift:${(i%2===0?1:-1)*38}px">
        </div>`).join('')}
        `:''}

        <!-- Light mode: ornament diamonds + float dots -->
        ${!d?`
        <div class="hero-ornament hero-ornament-tl"></div>
        <div class="hero-ornament hero-ornament-tl2"></div>
        <div class="hero-ornament hero-ornament-br"></div>
        <div class="hero-ornament hero-ornament-br2"></div>
        <div class="hero-float-dot" style="width:7px;height:7px;background:rgba(180,83,9,.42);top:16%;left:10%;animation-duration:4s"></div>
        <div class="hero-float-dot" style="width:5px;height:5px;background:rgba(5,150,105,.42);top:66%;left:7%;animation-duration:5.5s;animation-delay:.8s"></div>
        <div class="hero-float-dot" style="width:6px;height:6px;background:rgba(180,83,9,.32);top:20%;right:9%;animation-duration:6s;animation-delay:.3s"></div>
        <div class="hero-float-dot" style="width:4px;height:4px;background:rgba(5,150,105,.52);top:70%;right:12%;animation-duration:4.5s;animation-delay:1.2s"></div>
        <div class="hero-float-dot" style="width:9px;height:9px;background:rgba(201,162,39,.28);top:42%;left:4%;animation-duration:7s;animation-delay:.5s"></div>
        `:''}

        <!-- Hero content -->
        <div style="position:relative;z-index:2;text-align:center;max-width:700px;margin:0 auto">

            <!-- Bismillah pill -->
            <div class="hero-bismillah-pill">
                <div class="hero-bismillah-line"></div>
                <p class="arabic-text" dir="rtl" style="font-size:1.35rem;margin:0;color:${d?'#f59e0b':'#78350f'}">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                <div class="hero-bismillah-line hero-bismillah-line-r"></div>
            </div>

            <!-- Crescent badge -->
            <div class="hero-crescent-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3C8 3 4.5 6.5 4.5 11C4.5 15.5 8 19 12 19C10 16.5 9 14 9 11C9 7.5 10.5 4.5 14 3.5C13.4 3.2 12.7 3 12 3Z" fill="white" opacity=".95"/>
                    <circle cx="16" cy="6" r="2.5" fill="white" opacity=".85"/>
                </svg>
            </div>

            <!-- Arabic subtitle -->
            <p class="hero-arabic-sub">آلُ بَيْتِ النَّبِيِّ ﷺ</p>

            <!-- Main heading -->
            <h1 style="font-size:clamp(2rem,6vw,3.4rem);font-weight:900;line-height:1.1;margin-bottom:.5rem;
                color:${d?'#fff':'#022c22'};font-family:'Amiri',serif;
                ${d?'text-shadow:0 4px 24px rgba(0,0,0,.3)':''}">
                ${l==='bn'?'আহলে বাইত (আ.)':'Ahl al-Bayt (a.s)'}
            </h1>

            <!-- Gold divider dots -->
            <div class="hero-divider-dots">
                <span class="hero-divider-dot"></span>
                <span class="hero-divider-dot hero-divider-dot-mid"></span>
                <span class="hero-divider-dot"></span>
            </div>

            <!-- Tagline -->
            <p style="font-size:clamp(.88rem,2.5vw,1.05rem);line-height:1.75;margin-bottom:2rem;
                color:${d?'rgba(255,255,255,.78)':'rgba(2,44,34,.58)'};
                max-width:480px;margin-left:auto;margin-right:auto">
                ${l==='bn'
                    ?'কুরআন, হাদিস ও পবিত্র ইমামদের শিক্ষায় আলোকিত হোন'
                    :"Enlighten yourself with Quran, Hadith & the Holy Imams' teachings"}
            </p>

            <!-- CTA buttons -->
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:8px">
                <button data-action="changePage" data-param="imams" class="btn-primary"
                    style="background:${d?'linear-gradient(135deg,rgba(5,150,105,.35),rgba(5,150,105,.2))':'linear-gradient(135deg,rgba(255,255,255,.85),rgba(255,255,255,.7))'};
                    color:${d?'white':'#022c22'};padding:13px 30px;border-radius:50px;font-weight:700;
                    border:1.5px solid ${d?'rgba(52,211,153,.35)':'rgba(5,150,105,.28)'};cursor:pointer;
                    backdrop-filter:blur(10px);display:flex;align-items:center;gap:8px;font-size:.92rem;
                    box-shadow:${d?'0 4px 20px rgba(5,150,105,.3)':'0 4px 20px rgba(5,150,105,.12)'}">
                    👑 ${l==='bn'?'ইমামগণ':'The Imams'}
                </button>
                <button data-action="changePage" data-param="dua" class="btn-primary"
                    style="background:${d?'rgba(124,58,237,.2)':'rgba(124,58,237,.1)'};
                    color:${d?'#c4b5fd':'#5b21b6'};padding:13px 30px;border-radius:50px;font-weight:700;
                    border:1.5px solid ${d?'rgba(124,58,237,.35)':'rgba(124,58,237,.25)'};cursor:pointer;
                    backdrop-filter:blur(10px);display:flex;align-items:center;gap:8px;font-size:.92rem">
                    🤲 ${l==='bn'?'দোয়া':'Duas'}
                </button>
                <button data-action="changePage" data-param="blog" class="btn-primary"
                    style="background:${d?'rgba(3,105,161,.22)':'rgba(3,105,161,.1)'};
                    color:${d?'#7dd3fc':'#075985'};padding:13px 30px;border-radius:50px;font-weight:700;
                    border:1.5px solid ${d?'rgba(3,105,161,.35)':'rgba(3,105,161,.25)'};cursor:pointer;
                    backdrop-filter:blur(10px);display:flex;align-items:center;gap:8px;font-size:.92rem">
                    📝 ${t('blog')}
                </button>
            </div>

            <!-- Stats row (count-up on scroll into view) -->
            <div class="hero-stats-row">
                ${[
                    [1,       l==='bn'?'আল্লাহ':'Allah'],
                    [124313,  l==='bn'?'নবী-রাসূল':'Prophets'],
                    [14,      l==='bn'?'মাসুমিন':'Masumeen'],
                    [72,      l==='bn'?'কারবালার শহীদ':'Karbala Martyrs'],
                    [99,      l==='bn'?'আসমাউল হুসনা':'Names of Allah'],
                ].map(([num,label])=>`
                <div class="hero-stat-item">
                    <span class="hero-stat-num" data-count-target="${num}">${l==='bn'?toBengaliDigits(num.toLocaleString('en-US')):num.toLocaleString('en-US')}</span>
                    <div class="hero-stat-label">${label}</div>
                </div>`).join('')}
            </div>
        </div>
    </div>

    <!-- ④ MAIN CONTENT + SIDEBAR LAYOUT -->
    <div class="home-layout-grid">
        <div class="home-main-col">

            <!-- Today in Islamic History -->
            <div style="margin-bottom:3rem">${renderTodayInHistoryWidget(l,d)}</div>

            <!-- FEATURE CARDS — grouped -->
            <section aria-labelledby="home-features-heading" style="margin-bottom:3.5rem">
                <div class="section-heading reveal">
                    <span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#059669,#047857);display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;box-shadow:0 4px 12px rgba(5,150,105,.4)" aria-hidden="true">✨</span>
                    <h2 id="home-features-heading" class="section-title">${l==='bn'?'বিভাগসমূহ':'Sections'}</h2>
                </div>

                <div class="home-subgroup">
                    <p class="home-subgroup-label" style="color:${d?'#9ca3af':'#6b7280'}">📖 ${l==='bn'?'শিক্ষা ও ইতিহাস':'Learning & History'}</p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        ${featuresLearn.map(renderFeatureCard).join('')}
                    </div>
                </div>

                <div class="home-subgroup">
                    <p class="home-subgroup-label" style="color:${d?'#9ca3af':'#6b7280'}">🕌 ${l==='bn'?'ইবাদত ও টুলস':'Worship & Tools'}</p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        ${featuresWorship.map(renderFeatureCard).join('')}
                    </div>
                </div>
            </section>

            <!-- LATEST BLOG PREVIEW -->
            ${renderLatestBlogWidget(d,l)}

            <!-- CONTINUE WHERE YOU LEFT OFF (only if history exists) -->
            ${renderContinueReadingWidget(d,l)}

            <!-- ISLAMIC CALENDAR & SPECIAL DAYS -->
            <section aria-labelledby="home-calendar-heading">
                <div class="section-heading reveal">
                    <span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#dc2626,#7f1d1d);display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;box-shadow:0 4px 12px rgba(220,38,38,.35)" aria-hidden="true">🌙</span>
                    <h2 id="home-calendar-heading" class="section-title">${l==='bn'?'ইসলামিক ক্যালেন্ডার':'Islamic Calendar'}</h2>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 reveal">
                    ${[
                        {page:'muharram', icon:'⚔️', grad:'linear-gradient(135deg,#7f1d1d,#dc2626)', title:l==='bn'?'মুহাররম ও আশুরা':'Muharram & Ashura', desc:cdLabel},
                        {page:'shia-days',icon:'✨', grad:'linear-gradient(135deg,#1e3a8a,#7c3aed)',  title:l==='bn'?'বিশেষ দিনসমূহ':'Special Days',      desc:l==='bn'?'ঈদে গাদির · মুবাহিলা · নিমে শাবান':'Ghadeer · Mubahila · Mid-Shaban'},
                        {page:'calendar', icon:'📅', grad:'linear-gradient(135deg,#065f46,#059669)',  title:l==='bn'?'হিজরি ক্যালেন্ডার':'Hijri Calendar',  desc:l==='bn'?'ইমামদের তারিখ হাইলাইট সহ':'With Imam dates highlighted'},
                    ].map(c=>`
                    <button data-action="changePage" data-param="${c.page}"
                        class="text-left rounded-2xl transition-all focus:outline-none hover:scale-[1.02] hover:brightness-110"
                        style="background:${c.grad};padding:1.3rem 1.3rem 1.6rem;box-shadow:0 6px 24px rgba(0,0,0,.22)">
                        <div style="font-size:2rem;margin-bottom:.55rem" aria-hidden="true">${c.icon}</div>
                        <h3 style="font-weight:800;font-size:.95rem;color:white;margin-bottom:.3rem">${c.title}</h3>
                        <p style="font-size:.75rem;color:rgba(255,255,255,.78);line-height:1.5">${c.desc}</p>
                    </button>`).join('')}
                </div>
            </section>
        </div>

        <!-- ⑤ SIDEBAR (sticky on desktop) -->
        <div class="home-sidebar-col">

            <!-- Prayer times -->
            ${renderPrayerWidget()}

            <!-- Quiz of the day -->
            ${renderHomeQuizWidget(d,l)}

            <!-- Hadith of the Day -->
            <div id="hadith-of-day-widget" class="card-luxury ${d?'bg-gradient-to-br from-purple-950 to-blue-950 border-purple-900':'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border p-5 reveal" style="box-shadow:var(--shadow-md)">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-bold flex items-center gap-2">
                        <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:.8rem" aria-hidden="true">📜</span>
                        ${t('hadithOfDay')}
                    </h3>
                    ${state.isAdmin?`<button data-action="openHadithEditor" class="${d?'bg-purple-800 text-purple-200':'bg-purple-100 text-purple-700'} text-xs px-3 py-1 rounded-lg font-semibold hover:opacity-80">✏️ ${l==='bn'?'এডিট':'Edit'}</button>`:''}
                </div>
                <div class="${d?'bg-black/20':'bg-white/60'} rounded-2xl p-4 text-center">
                    <p class="text-sm leading-relaxed mb-3 italic">"${sanitize(l==='bn'?getDailyHadith().textBn:getDailyHadith().textEn)}"</p>
                    <p class="text-xs font-bold" style="${d?'color:#fbbf24':'color:#7c3aed'}">— ${sanitize(l==='bn'?getDailyHadith().sourceBn:getDailyHadith().sourceEn)}</p>
                </div>
                <div class="flex items-center justify-between mt-3 gap-2">
                    <div class="flex gap-1">
                        <button data-action="hadithPrev" class="${d?'bg-purple-900 text-purple-200 hover:bg-purple-800':'bg-purple-100 text-purple-700 hover:bg-purple-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">‹ ${l==='bn'?'আগে':'Prev'}</button>
                        <button data-action="hadithNext" class="${d?'bg-purple-900 text-purple-200 hover:bg-purple-800':'bg-purple-100 text-purple-700 hover:bg-purple-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">${l==='bn'?'পরে':'Next'} ›</button>
                    </div>
                    <button data-action="shareHadith" class="${d?'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800':'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        ${l==='bn'?'শেয়ার':'Share'}
                    </button>
                </div>
            </div>

            <!-- Daily Ayah -->
            <div class="ayah-widget p-5 reveal" style="box-shadow:var(--shadow-md)">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-bold flex items-center gap-2">
                        <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#c9a227,#b45309);display:flex;align-items:center;justify-content:center;font-size:.8rem" aria-hidden="true">📖</span>
                        ${l==='bn'?'আজকের আয়াত':"Today's Verse"}
                    </h3>
                    ${state.isAdmin?`<button data-action="openAyahEditor" class="${d?'bg-amber-900 text-amber-200':'bg-amber-100 text-amber-700'} text-xs px-3 py-1 rounded-lg font-semibold hover:opacity-80">✏️ ${l==='bn'?'এডিট':'Edit'}</button>`:''}
                </div>
                ${renderDailyAyahInner(d,l)}
                <div class="flex items-center justify-between mt-3 gap-2">
                    <div class="flex gap-1">
                        <button data-action="ayahPrev" class="${d?'bg-amber-900 text-amber-200 hover:bg-amber-800':'bg-amber-100 text-amber-700 hover:bg-amber-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">‹ ${l==='bn'?'আগে':'Prev'}</button>
                        <button data-action="ayahNext" class="${d?'bg-amber-900 text-amber-200 hover:bg-amber-800':'bg-amber-100 text-amber-700 hover:bg-amber-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">${l==='bn'?'পরে':'Next'} ›</button>
                    </div>
                    <button data-action="shareAyah" class="${d?'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800':'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        ${l==='bn'?'শেয়ার':'Share'}
                    </button>
                </div>
            </div>

            <!-- Follow Us -->
            <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-5 reveal" style="box-shadow:var(--app-shadow-sm)">
                <h3 class="text-sm font-bold mb-4 flex items-center gap-2">
                    <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#1d4ed8,#1e40af);display:flex;align-items:center;justify-content:center;font-size:.8rem" aria-hidden="true">🌐</span>
                    ${l==='bn'?'আমাদের অনুসরণ করুন':'Follow Us'}
                </h3>
                <div class="space-y-2">
                    ${[
                        ['https://www.facebook.com/profile.php?id=100090495041094', l==='bn'?'ফেসবুক পেজ':'Facebook Page', '#1877f2','rgba(24,119,242,.12)',
                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'],
                        ['https://www.instagram.com/ahl.al.bayt.a.s/', l==='bn'?'ইনস্টাগ্রাম':'Instagram', '#e1306c','rgba(225,48,108,.12)',
                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>'],
                        ['https://www.youtube.com/@Ahl_al-Bayt_a.s', l==='bn'?'ইউটিউব':'YouTube', '#ff0000','rgba(255,0,0,.12)',
                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>'],
                        ['https://x.com/Ahl_al_Bayt_a_s', l==='bn'?'টুইটার (X)':'Twitter (X)', d?'#e7e9ea':'#0f172a','rgba(15,23,42,.08)',
                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'],
                    ].map(([href,label,color,bg,icon])=>`
                    <a href="${href}" target="_blank" rel="noopener noreferrer"
                        aria-label="${label} (${l==='bn'?'নতুন ট্যাবে খুলবে':'opens in a new tab'})"
                        class="flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:translate-x-1 hover:scale-[1.01]"
                        style="background:${bg};color:${color};border:1px solid ${color}28">
                        ${icon}
                        <span class="flex-1">${label}</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
                    </a>`).join('')}
                </div>
            </div>

        </div>
    </div>`;
}
// ============================================================================
// PAGE: BLOG
// ============================================================================
// ✓ renderBlogPage moved to blog.js
