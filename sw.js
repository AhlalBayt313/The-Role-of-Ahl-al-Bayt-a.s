
const CACHE = 'ahlbayt-v227'; // v227: BROWSER BACK/FORWARD — new browser-history.js (history.pushState/popstate wrapper around render(): every page, detail page, menu and person modal gets a history entry, the address follows ?page= / ?open= / ?id=, scroll position restored); one script tag added to index.html, nothing else in the app changed; new file precached. v226: DATA INTEGRITY — data/duas/metadata.json: the 3 Sayyida Ruqayya variants (-2, -3, -short) that existed only in ziyarat.json are now in the index (they never showed in the list before), the Ruqayya main entry gets its group/variant fields + the title text of the full file, ziyarat-aal-yasin titleBn synced; tools/validate-duas.js allowlists the by-design no-Arabic ziyarat-sayyida-ruqayya-short; new tools/check-all.js runs every check in one go; d/ share pages (+3) and the sitemap block rebuilt. No app code changed; metadata.json is precached, so CACHE bumped. v225: LONG-LIST PERFORMANCE — content-visibility:auto on Dua/Ziyarat/Amal cards (CSS block at end of style.css). v224: SHARE LINKS + DEEP LINKS for every Dua/Ziyarat/Amal — new content-links.js (clShareUrl + ?open=type:id opener), new tools/validate-duas.js (index vs full-file consistency + share pages check), new tools/build-dua-share-pages.js writing d/<id>.html (418 pages with link-preview tags + sitemap block), one argument changed in ucShareItem() (script-1-core.js). v223: SMARTER SEARCH — dzxNorm()/dzxMatchesSearch() in script-3-pages.js: Bengali/Arabic/Latin spelling-variant folding, any-order multi-word match, 1-2 typo tolerance on title words, title matches ranked first; no data or markup change. v222: FIND-IT-FAST — Dua/Amal 'all' view grouped into category sections with counts, A-Z toggle (letter sections; Ziyarat sorted A-Z inside groups), flat numbered list for search/category (script-3-pages.js dzxSeq + CSS). v221: SERIAL NUMBERS on Dua/Ziyarat/Amal cards (badge top-left in grid, bottom-right in list; dzxNo() in script-3-pages.js + CSS) and Ziyarat Imams/Masumeen ordered by the sequence of the Imams (sortOrder added to metadata.json ziyarats). v220: ARABIC LINE HIDDEN on Dua/Ziyarat/Amal cards — CSS only (block at end of style.css). v219: PREMIUM ZIYARAT + AMAL CARDS — CSS block at the end of style.css (grid view only, #dzx-ziyarat-results / #dzx-amal-results: v217 recipe + gold-ring medallion on Ziyarat, occasion pill on Amal) + one added source line in renderZiyaratResultsInner() (script-3-pages.js, Bengali UI only). v218: SOURCE LINE on dua grid cards — one added line in renderDuaResultsInner() (script-3-pages.js: <p class="dzx-src">, Bengali UI only, only when the dua has a source) + CSS block at the end of style.css (hidden except in the Dua tab grid view; one line with ellipsis, full text in title). v217: PREMIUM DUA CARDS — CSS only (block at end of style.css, scoped to the grid view of the Dua tab, #dzx-dua-results): inner highlight + category-tinted glow, double-ring gloss icon medallion, higher-contrast Arabic line + fine divider, hairline + ghost action buttons with tinted pressed state; no markup/JS change. v216: TUNING of my own v211 block, CSS only — removed the Bengali line-height rule (its html[lang] specificity overrode Tailwind leading-*/text-* and component line-heights) and limited the gold hairline to .card-luxury/.feature-card-luxury/.kc-card (it had painted over the themed borders of .kcx-card and .quiz-cat-card). v215: MOBILE FINISH — CSS only (block at end of style.css): touch-only tap-highlight/callout off + clickable-card press scale, larger sheet radius + overscroll containment, dvh for sheet heights and splash; no markup/JS change. v214: 25 inline `transition:all` in JS templates (script-2-ui.js, script-3-pages.js, ahlul-bayt-unified.js, blog.js) narrowed to color/background/border-color/box-shadow/transform/opacity with the same durations; nothing else in JS touched. v213: 9 `transition: all` rules narrowed to explicit property lists (CSS block at the end of style.css, no markup/JS change). v212: LOCAL FONTS — Poppins/Amiri/Noto Serif Bengali self-hosted (assets/fonts/ff-*.woff2, @font-face at the end of style.css), Google Fonts <link>/preconnect removed from index.html, fonts precached below. v211: PREMIUM FINISH LAYER — CSS only (style.css, one block appended at the end): layered emerald-tinted --shadow-* tokens (dark mode: layered black), shared --ease-premium for --t-fast/base/slow, gold hairline outline on card-luxury/feature-card-luxury/kc-card/kcx-card/dc-card/quiz-cat-card, text-wrap balance/pretty, Bengali body line-height 1.75 (via :where), ::selection, accent/caret colour, scroll-padding-top; no markup/JS/text changed. v210: FIX remaining DST/UTC date slips — Ashura countdown (home + Muharram page), citation date, Ramadan ring previous-Maghrib (calDaysBetween()/localISODate() in script-1-core.js). v209: FIX daily ayah/hadith/quiz day-of-year off-by-one after DST change (dayOfYearLocal(), script-1-core.js; 8 call sites). v208: FIX getBanglaDateFull() off-by-one day in DST time zones (script-1-core.js, one line). v207: NEW date-converter.js (calendar), prayer-tracker.js (prayer page), share-links.js (post share links + deep links); 'prayer' backup group. v206: NEW reader mode for blog posts (reader-mode.js), 'My Dua Lists' page + reading bar (dua-playlist.js), 'Learn Arabic' page (arabic-corner.js); 'personal' backup group; home cards + menus. v205: Tasbeeh — 'দরুদে মুহম্মাদ ও আলে মুহম্মাদ' target 10 → 100 in the tasbeeh page (script-3-pages.js; the label/reset list in script-1-core.js already said 100). v204: FIX home 'Sections' — the odd last card (World Map, 7th in Worship & Tools) was stretched across the whole row on desktop; the full-row layout is now phone-only (max-width 767px, 2 columns), on md+ it is a normal grid card; CSS only. v203: home hero (light mode) background = the user's Eid illustration (crescent, mihrab arch, lanterns; assets/images/hero-bg-eid.webp, 31 KB) with a soft cream veil behind the text; Allah watermark + corner diamonds/dots hidden in light mode only; dark mode unchanged; CSS + one image only. v202: 'আমার রমজান' share card — new default theme 'ক্রিম ও ফানুস' after the user's reference image (cream paper, hanging crescents/flowers/lanterns, big copper lantern with green glass, green mosque corners with stepped gold outlines, gold fan, deep-green lettering), drawn as vector (no image file); emerald-gold card stays selectable via a 'কার্ডের থিম' dropdown; drawing + one UI label only, no card wording changed (the reference's sample text was not used). v201: iftar invitation card — new default theme 'রাতের কাফেলা' (night-caravan: deep-blue starry sky, white crescent + star, camel caravan and palms in silhouette, tan-gold title, glass details panel, white pill for the host name) after the user's reference image, drawn as vector (no image file); the emerald-gold card stays selectable via a 'কার্ডের থিম' dropdown; drawing + one UI label only, no invitation wording changed. v200: Ramadan share cards made more premium (ramadan-cardart.js redrawn: glow + lattice + gold dust background, triple gold frame with corner medallions, layered arch with rays, halo crescent, refined lanterns, glass panels, tick-marked ring, champagne-gold title) and FIX for empty boxes in the cards — the fonts are now bundled (assets/fonts/rc-*.woff2, SIL OFL) and loaded before drawing; drawing/fonts only, no text or content changed. v199: redesigned the two Ramadan share cards (My Ramadan + iftar invitation): geometric lattice background, double gold frame with corner stars, pointed arch with a proper crescent and star (fixes the old white hole caused by destination-out), hanging lanterns, glass panels, vector icons, progress ring — new shared ramadan-cardart.js; drawing only, no text/content added. v198: Ramadan page — '৩০ দিনের দোয়া' quick card (30 day buttons + today's dua) in the Nights & worship group; buttons open the EXISTING day-N-dua-of-ramadan duas via readDua, no dua text added (ramadan-layout.js + style.css). v197: Ramadan page re-arranged into titled, collapsible groups (Today / Fasting / Nights & worship / Personal & sharing) with a quick-jump chip bar and a hero status card — new ramadan-layout.js (moves existing sections only, last wrapper of renderRamadanPage) + style.css block; no content changed. v196: home page 'বিভাগসমূহ' (Worship & Tools) — added a 'রমজান / Ramadan' card (page key 'ramadan'); one array entry in script-2-ui.js. v195: renamed the visible label 'রমজান মোড / Ramadan Mode' to 'রমজান / Ramadan' (menu label, home button, page title, two messages) — strings only; page key 'ramadan', functions, files, classes and storage keys unchanged. v194: Ramadan home — iftar/sehri countdown on the home page and multi-year fasting history (ramadan-home.js); daily-amal.js exposes _amLoadTimes (one line); backup key ahlbayt_ramadan_hist. v193: Qaza & Fidya companion (qaza-fidya.js) on the Ramadan page and the Khums & Zakat page — missed-fast ledger, qada/fidya counters, fidya amount (750 g/day per Q743/799); backup key ahlbayt_qaza_fidya. v192: Ramadan page — personal journal (one line per night, intention or gratitude, device only) + 'My Ramadan <year>' share card (canvas PNG: fasts kept, journal lines, Qadr nights with ticked steps; journal text only if the user adds a line; optional share) in new ramadan-journal.js; key ahlbayt_ramadan_journal in the ramadan backup group. No religious text added. v191: Ramadan page — Laylatul Qadr night walk (new qadr-walk.js): on the nights of 19/21/23 Ramadan the 10 ordered steps of 'Maghrib to Fajr' taken from section 12 of amal-laylatul-qadr (tick each; 'Open' buttons only for items that already exist), night-specific extra amal from section 11, Jawshan al-Kabir progress (100 parts, next-part reader), manual night picker, other days a small preview; saved on device (ahlbayt_qadr_walk, in the ramadan backup group). No religious text added. v190: Ramadan page — iftar invitation card (iftar-invite.js: date/time/place form, canvas PNG card to share/save, WhatsApp/copy text; all on-device, nothing stored). v189: 21 Ramadan mourning mode in ramadan-plus.js — muted colours (grey saturation veil, nothing hidden) + a card with the existing Imam Ali items (21st-night dua, Laylat al-Qadr amal, ziyarat), one Imam Ali hadith, event text from hijriEvents; shown on the Ramadan page and above Today's Amal; can be switched off for the day. v188: Ramadan mode plus — new ramadan-plus.js: Roza checker (searches the Knowledge Center's own sawm masail/fatwa, late-marja warning), hilal ring (sun/moon arc Fajr→Maghrib) with night/day/iftar-glow theme + iftar dua link, 30-night journey (day's dua, calendar event, one hadith, one fasting question — all from existing data; no content changed); daily-amal.js gets two read-only hooks. v187: Knowledge Center — masail detail modal now shows the marja's display name (e.g. 'আয়াতুল্লাহ খামেনেই') instead of the raw key; new helper kcMarjaLabel() in knowledge-center.js (additive, one call-site edit). v186: Knowledge Center — Khamenei: remaining primary-text questions (traveller/work rules, masjid water, haram-food workplaces, leadership obedience, media): +3 fatwa (f175–f177), +5 masail (m407–m411); metadata.json index synced. v185: Knowledge Center — 12 old unverified Khamenei fatwas marked (⚠️ in ref line); previously skipped sensitive/leadership/masjid/travel rulings added from primary text: +12 fatwa (f163–f174), +16 masail (m391–m406), +3 Q&A (q149–q151); metadata.json index synced. v184: Knowledge Center — Khamenei primary-source batch 8 (fatwa terminology, masjid, night prayer): +5 fatwa (f158–f162), +6 masail (m385–m390), +2 Q&A (q147–q148); metadata.json index synced. v183: Knowledge Center — Khamenei primary-source batch 7 (prayer details/greetings): +6 fatwa (f152–f157), +9 masail (m376–m384), +1 Q&A (q146); metadata.json index synced. v182: Knowledge Center — Khamenei primary-source batch 6 (purity/alcohol/fasting): +7 fatwa (f145–f151), +14 masail (m362–m375), +2 Q&A (q144–q145); metadata.json index synced. v181: Knowledge Center — Khamenei primary-source batch 5 (prayer): +6 fatwa (f139–f144), +10 masail (m352–m361), +2 Q&A (q142–q143); metadata.json index synced. v180: Knowledge Center — Khamenei primary-source batch 4: +7 fatwa (f132–f138, ghina'/music), +8 masail (m344–m351, music/dance/clothing/West), +3 Q&A (q139–q141); metadata.json index synced. v179: Knowledge Center — Khamenei primary-source batch 3: +6 fatwa (f126–f131), +9 masail (m335–m343), +1 Q&A (q138); metadata.json index synced. v178: Knowledge Center — Khamenei primary-source batch 2: +8 fatwa (f118–f125), +13 masail (m322–m334, khums/Muharram/medical), +2 Q&A (q136–q137); metadata.json index synced. v177: Knowledge Center — Khamenei content re-based on his own 'Practical Laws of Islam' (primary text): 5 v176 entries corrected, 2 unverified removed (m298, m299), +14 fatwa (f104–f117), +18 masail (m304–m321), +10 Q&A (q126–q135); metadata.json index synced. v176: Knowledge Center — more Ayatollah Khamenei content from 'A Guide To Religious Laws' (explicitly attributed verdicts only): 7 fatwa (f097–f103), 7 masail (m297–m303), 7 Q&A (q119–q125); metadata.json index synced. v175: Knowledge Center — Ayatollah Khamenei content: 5 fatwa (f092–f096), 3 masail (m294–m296, marja khamenei), 2 Q&A (q117–q118); metadata.json kcFatwa/kcMasail/kcQa index synced. v174: splash screen longer (first visit of the day 8 s, lite 7 s, repeat visits 4 s) + progress bar stretched to match (index.html). v173: data/*.json served network-first with offline cache fallback (duas/ziyarat/blog load offline). v172: dua/ziyarat/amal reader header no longer squeezed into a narrow column on mobile (.dzx-head-main). v171: verse counter counts only Arabic verses (dua + ziyarat), Dua Kumayl source line restored. v170: dua reader renders note-only (bn) lines as full-width notes, verse numbers skip notes. v169: Dua Kumayl replaced with the new reference text (214 verses + history intro). v168: hadith h674 attribution corrected (Prophet→Imam Ali via Bihar 92/215), h681–h683 Mizan item numbers added. v167: gratitude hadith +3 (h681–h683, Shia sources via Mizan al-Hikmah; 606→609). v166: Khums & Zakat — crop nisab 847 → 847.207 kg (Khamenei risala ruling 1864). v165: fix — approxHijriNow() leap-year list 15→16 (now identical to getHijriMonthDays()). v164: hadith — removed h608–h610 (three Sunni-source gratitude hadith) from hadith.json and metadata.json kcHadiths (609→606). v163: calendar compact toolbar (Today + cell-date toggles), legend 'ইংরেজি তারিখ'→'গ্রেগরিয়ান তারিখ', more Reza/Jawad/Mahdi ziyarat links on their calendar days. v162: calendar day-detail shows related Ziyarat/Amal links (CAL_EVENT_LINKS, 28 events). v161: 4 new Seerah blog posts (ids 163–166: Ta'if, al-Aqaba pledges, Farewell Hajj, Banu Qaynuqa) + KC Seerah topic list. v160: splash min time 3.0→5.5s (quick 1.5→2.8s) so text is readable; progress bar stretched to match. v159: getCitationText site link fixed (repo path + ?page=familyTree). v158: hadith — 5 new topical hadith (h676–h680): husband's duties toward wife & forgiveness in marital friction (Man La Yahduruhu al-Faqih, wife's-rights chapter). v157: hadith — 16 new topical hadith (h660–h675): husband's rights & marital harmony, fasting & Qur'an recitation (Shia sources: Mizan al-Hikmah, al-Kafi, Bihar al-Anwar, Makarim al-Akhlaq). v156: hadith — 24 new topical hadith (h636–h659): diligence & sincerity in work, visiting the sick & fulfilling a believer's needs, miserliness & generosity (Mizan al-Hikmah; al-Kafi/Makarim al-Akhlaq via al-shia.org). v155: hadith — 25 new topical hadith (h611–h635): salam & hospitality, good character & cheerfulness, honouring elders. v154: hadith — 6 new (h605–h610): backbiting +1, gratitude +5; sources of h561/h563/h564 completed. v153: hadith — 18 new topical hadith (h587–h604): self-accounting, lawful earning, contentment. v152: hadith — 16 new topical hadith (h571–h586): excessive speech & silence, good opinion vs suspicion. v151: hadith — 18 new topical hadith (h553–h570): truthfulness/avoiding lies, backbiting, gratitude. v150: hadith — 56 new topical hadith (h497–h552) on work & life: trust/honesty/promises, debt & financial planning, fraud & fair trade, consultation & decisions, remembering death, supplication & prayer, charity & service — from Mizan al-Hikmah. v149: fix — metadata.json kcHadiths index now lists all hadith (h247–h496) so the Knowledge Center shows them (was 175). v148: hadith — 40 new topical hadith on relationships (marriage, raising children, parents, neighbours, pardon & mending ties) from Mizan al-Hikmah and Nahjul Balagha. v147: hadith — 32 new topical hadith on health & daily life (illness & treatment, sleep, dress/adornment/modesty, the world & detachment) from Mizan al-Hikmah and Nahjul Balagha. v146: hadith — 49 new topical hadith on mind & conduct (arrogance/riya, envy, trust & hope, repentance, patience, laziness/procrastination) from Mizan al-Hikmah and Nahjul Balagha. v145: hadith — 30 new topical hadith on environment & living (trees, water, waste, cleanliness, eating), youth (learning, chastity, friends, ambition) and social justice (the oppressed, not aiding the wrongdoer, the poor) from Mizan al-Hikmah and Nahjul Balagha. v144: hadith — 10 new topical hadith on knowledge, learning and its sources (Nahjul Balagha; Bundle of Flowers / Mizan al-Hikmah tradition). v143: hadith — 10 new topical hadith on work, earning and economy (Mizan al-Hikmah; Nahjul Balagha Letter 53). v142: hadith — 9 new topical hadith on family and society (Risalat al-Huquq, Nahjul Balagha). v141: hadith — 10 new topical hadith on stress/anxiety and loneliness (Nahjul Balagha, Imam al-Sadiq, Prophet via Mizan al-Hikmah). v140: hadith — 10 new topical hadith on social-media-age themes (rumours, backbiting, praise, anger/tongue, time) from Nahjul Balagha and Tuhaf al-Uqul. v139: hadith — 9 new Imam al-Mahdi hadith/tawqi' (Bihar al-Anwar vol. 53, from Ikmal al-Din, Ghaybat al-Tusi, al-Ihtijaj). v138: hadith — 19 new hadith from Tuhaf al-Uqul for Imam al-Ridha (11) and Imam al-Hadi (8); Imam al-Mahdi has no chapter in Tuhaf al-Uqul so none added. v137: hadith — 'others' category split into 6 Imam categories (kazim, ridha, jawad, hadi, askari, mahdi) + 22 new hadith from Tuhaf al-Uqul. v136: 9 new blog posts (154-162) for the Knowledge Center topics Seerah (154-156), Karbala (157-159), Comparative Studies (160-162). v135: Knowledge Center - Seerah, Karbala and Comparative Studies topics now populated from existing posts/Q&A/hadith (no more Coming Soon). v134: blog posts 147-153 (Ebrahim Hadi, Qasem Soleimani, Mohammad Ebrahim Hemmat, Mahdi Bakeri, Mostafa Chamran, Hossein Hamadani, Mohsen Hojaji) — personalities: martyrs and commanders. v133: blog posts 137-146 (Allama Hilli, Shahid Awwal, Shahid Thani, Majlisi; Ansari, Tabataba'i, Imam Khomeini, Khoei, Baqir al-Sadr, Mutahhari) — personalities batches 4 & 5. v132: blog posts 132-136 (Kulayni, Saduq, Sharif Radi, Sharif Murtada, Tusi) — personalities batch 3. v131: blog posts 129-131 (Ayatollah Ali Khamenei, Mujtaba Khamenei, Hassan Nasrallah) — personalities contemporary batch. v130: blog posts 126-128 (Hujr b. Adi, Kumayl b. Ziyad, Maytham al-Tammar) — personalities batch 2. v129: blog category 'ব্যক্তিত্ব' (Personalities) + posts 121-125 (Salman, Abu Dharr, Miqdad, Ammar, Malik al-Ashtar); Mufid (120) moved to it. v128: blog post 120 (Shaykh al-Mufid) — first of the Shia personalities series. v127: Today's Amal home card + Ramadan mode (daily-amal.js). v126: Khums & Zakat — Zakat al-Fitra calculator. v125: Khums & Zakat khums-year tracker, payment log, Knowledge Center links. v124: Khums & Zakat calculator updated for Bangladesh (bhori/mon units, rice note, BD khums guide, lakh/crore words). v123: Backup & Restore page (data-backup.js) + selectable prayer-time calculation method (prayer-reminders.js)
// v84: Phase 3B corrections (KC search now also finds Blog posts a KC topic actually surfaces — History/Akhlaq/etc. — via the same SearchEngine, no new index; static <html lang> no longer briefly contradicts a saved English preference) — JS/HTML changed, bumped so installed PWAs refresh.
// v83: Knowledge Center Phase 3B (Hadith title/attribution hierarchy, scope-labelled searches incl. Global Search page text, English-mode Blog excerpts + lang attributes + <html lang>, Blog terminology) — JS/CSS changed, bumped so installed PWAs refresh.
// v82: Knowledge Center Phase 3A (Related→Back stack extended to cover the new Saved view, topic/search breadcrumb, cross-tab Bookmarked/Favorites entry point, "All Topics" no longer clears an active search) — JS/CSS changed, bumped so installed PWAs refresh.
// v80: Knowledge Center premium redesign (kcx) — knowledge-center.js (landing/explore/reading views
// layered over the original renderer) + style.css (new kcx-* block). Bumped so returning/installed-PWA clients pick up the JS/CSS change.
// v79: Content fix — metadata.json's "ziyarats"
// lite-index was missing 5 entries that already existed in the full
// ziyarat.json (ziyarat-imam-kazim-1/2, ziyarat-imam-jawad-3/4/5), so they
// never appeared in the Ziyarat tab or its count at all — the UI list is
// built from this metadata index, not from ziyarat.json directly. Added
// the 5 missing lite entries (originalIndex 31,32,33,34,38 — the exact
// gap left in the existing sequence). No JS changed; this is a data-only
// fix, still needs a CACHE bump since metadata.json is itself precached.
// v78: FIX — install-time STATIC precaching used
// c.add()/c.addAll(), which honors the browser's own HTTP cache for its
// internal fetch. A stale HTTP-cached copy of style.css/script-3-pages.js
// etc. could therefore get written into a brand-new CACHE bucket, meaning
// bumping this version string alone didn't guarantee fresh *content* —
// this is why the imam/masumeen coverflow, family-tree, and calendar
// animations weren't showing up on mobile even after several version
// bumps. Now uses fetch(url,{cache:'reload'}) to force a real network
// round-trip. Paired with a new controllerchange auto-reload in
// script-4-boot.js so an already-open tab picks up a future update
// without the user needing to manually clear cache.
// v77: Content — added the standalone/main
// Ziyarat of Imam Hasan al-Askari (a.s.) (data/duas/ziyarat.json id
// ziyarat-hasan-askari-standalone, 50 verses, Arabic + Bengali meaning;
// source: Mafatih al-Jinan, Ch.10 "Ziyarah of the Imams of Samarra", via
// Sayyid Ibn Tawus). Tagged group:"hasan-askari" together with the
// pre-existing Thursday-specific ziyarat-hasan-askari entry, so the two
// now collapse into one expandable card via the v72 grouping mechanism
// (metadata.json's lite index updated to match, originalIndex:35). No
// JS touched — clusterZiyaratItems() (script-3-pages.js) is data-driven
// and already handles any `.group` key generically.
// v76: Hijri calendar month-switch slide
// animation (calPrev/calNext, direction-aware) — style.css,
// script-1-core.js (calState.lastNavDir), script-2-ui.js, script-3-pages.js.
// v75: Prophet & Masumeen grid replaced with the
// same 3D coverflow carousel design as the Twelve Imams (script-3-pages.js,
// ahlul-bayt-unified.js) — separate index/DOM-query set (data-masumeen-*)
// so the two carousels coexist without colliding; no new CSS (reuses the
// existing .imam-coverflow-* rules as-is).
// v74: Family Tree page (style.css only) —
// generation-by-generation entrance (founder → connector → bridge →
// connector → founding generation → lineage generation → the awaited
// 12th), connector-line "growing" effect, slow respectful pulse on the
// "in occultation" badge. CSS-only, reduced-motion respected, no JS/HTML
// touched. Bumped so returning/installed-PWA clients pick up the CSS change.
// v73: The Twelve Imams (AS) grid replaced with a
// true CSS 3D coverflow carousel (style.css, ahlul-bayt-unified.js,
// script-3-pages.js) — renderCard() output reused unchanged; outer
// position/scale/rotation layer only. Bumped so returning/installed-PWA
// clients pick up the CSS/JS change.
// v72: Content/UI — the 8 separate Ziyarat
// texts of Imam Ali ibn Musa al-Rida (a.s.) in the "12 Imams" Ziyarat list
// (data/duas/ziyarat.json) now collapse into ONE expandable group card
// instead of 8 flat rows. data/duas/ziyarat.json and metadata.json's
// `ziyarats` lite index: those 8 entries tagged with a shared `group:
// "imam-reza"` key plus groupTitleBn/En (shown on the collapsed card) and a
// short variantLabelBn/En each (shown on its row once expanded) — no
// existing field changed, all 8 ids/titles/content untouched.
// script-3-pages.js: new clusterZiyaratItems() groups same-`.group` items
// (2+ members) into one card, leaving every other Ziyarat entry — including
// Imam Jawad's own 2 — rendered exactly as before (byte-for-byte identical
// output, regression-tested). script-2-ui.js: new `toggleZiyaratGroup`
// action (mirrors the existing toggleMuharramEvent expand/collapse idiom).
// script-1-core.js: new `state.expandedZiyaratGroups` (mirrors
// expandedMuharramEvents; ephemeral, not persisted to localStorage, same as
// duaCatExpanded). Detail page, search results, bookmarks/favorites/copy/
// share, and admin edit/delete are all unchanged and still operate
// per-variant. v71: setupScrollReveal() and
// setupHomeStatsCounter() (script-1-core.js) now guard on
// 'IntersectionObserver' in window before constructing one, falling back
// to instantly-visible/final-value instead of throwing on unsupported
// browsers — mirrors the same fallback already used in
// phase4-animations.js. Previously, throwing here (inside the render()
// rAF callback) silently aborted initReadingProgress()+
// setupHomeStatsCounter() every render on any browser without IO support.
// v70: closeOverlayAnimated() and
// closePersonDetail() no longer each hardcode their own copy of the
// reduceMotion/.closing/setTimeout timing logic — factored into a shared
// _animatedClose() helper (script-2-ui.js). No behavior change.
// v69: manifest.json is a real static file again
// (see comment further down) — precached here, linked directly in
// index.html, no more runtime Blob generation in script-4-boot.js.
// v68: removed dead .dua-card-accent CSS rule
// (style.css) — 0 usages in any JS/HTML; the dua reading page's <article>
// already has its own working animated gradient top-bar for the same
// visual purpose, so this rule was fully superseded, not just unused.
// v67 was already live in CACHE before this edit but its changelog
// comment still said "v66" — that comment/version mismatch is now fixed.
// v66: Modal/overlay exit animation — the
// editor/login overlay family (Admin Login, Quiz, Knowledge, Dua, Hadith,
// Ayah, Muharram, Shia Day, Blog editors — 9 close cases total) now plays
// a reverse fade+scale before unmounting, mirroring the Person Detail
// modal's existing .closing pattern (style.css). New shared helper
// closeOverlayAnimated() (script-2-ui.js) adds .closing, then delays the
// existing state-flip + render() by 180ms (0 under prefers-reduced-motion)
// instead of instantly removing the overlay. Each close case's own state
// mutation is unchanged — only the timing of render() after it moved.
// v65: Accessibility fix — uc-card-row (Dua/Ziyarat/Amal
// list rows, script-3-pages.js) now has role="button" tabindex="0" so keyboard
// users can reach them; a new delegated keydown listener (script-2-ui.js,
// [data-action][role="button"] → Enter/Space triggers .click(), existing
// click listener untouched) also incidentally fixes the same gap on the
// pre-existing imam-timeline-row, which already had data-action+role="button"
// but no keyboard handler. No visual/behavioral change for mouse users.
// v67: Removed the legacy assets/css/master-theme.css stylesheet and its
// service-worker precache entry. index.html now relies on the remaining CSS files. v63: Correction Step — fixed blurry/washed-out
// hero background pattern: regenerated hero-pattern-tile-dark/light.png at
// their actual display resolution with a steeper alpha curve (root cause
// was the browser upscaling a soft, low-alpha 201px source ~2.1x), raised
// pattern opacity slightly, steepened the center-fade transition band, and
// trimmed the glow overlay that was compounding the wash-out (style.css +
// both tile PNGs). v62: Step 5 Hero Final Polish — light-mode gold/
// tagline contrast fix, desktop prefers-reduced-motion coverage for hero
// orbs/particles/dots/star-twinkle/crescent-pulse, minor .hero-orb-3 CSS
// cleanup (style.css, script-2-ui.js). v61: Content update — added standalone Ziyarat of
// Imam Muhammad al-Jawad (a.s.) to data/duas/ziyarat.json and the matching
// lite-index entry in data/duas/metadata.json's `ziyarats` array (now 23
// total). Sourced from Duas.org / Sayyid Ibn Tawus's al-Mazar. Bengali
// translation is original. (A standalone Ziyarat for Ali Akbar was searched
// for but not added — no verified independent text exists in the classical
// collections; he is addressed within Ziyarat Ashura/al-Nahiya/al-Shuhada,
// already present on the site.) No JS/CSS/HTML logic changed in this pass.
// v60: Content update — added 2 more verified Ziyarat
// entries: Sayyida Ruqayya (s.a., Damascus) and a standalone Ziyarat of Imam
// Ali al-Rida (a.s.), to data/duas/ziyarat.json and the matching lite-index
// entries in data/duas/metadata.json's `ziyarats` array (now 22 total).
// Sourced from Mafatih al-Jinan (Sheikh Abbas Qummi) and Duas.org. Bengali
// translations are original. No JS/CSS/HTML logic changed in this pass.
// v59: Content update — added 3 new verified Ziyarat entries
// (Sayyida Zainab s.a., Sayyida Fatima al-Ma'suma s.a. of Qum, and Ziyarat
// al-Shuhada for the martyrs of Karbala) to data/duas/ziyarat.json and the
// matching lite-index entries in data/duas/metadata.json's `ziyarats` array,
// now with the COMPLETE verified text for all three (38 / 46 / 56 verses
// respectively) rather than the earlier excerpted selections.
// Arabic text and sourcing verified against Al-Islam.org (The Victory of
// Truth: The Life of Zaynab bint Ali by Muna Haeri Bilgrami; Lady Fatima
// Masuma (a) of Qum by Masuma Jaffer) and Duas.org (Ziyarat Nahiya page,
// "Ziyarat of Martyrs" section, traced to Ibn Tawus's Iqbal al-A'mal,
// al-Shaykh al-Mufid's al-Mazar, and Ibn al-Mashhadi's al-Mazar al-Kabir).
// Bengali translations are original, not copied from any single translator's
// copyrighted English rendering. No JS/CSS/HTML logic changed in this pass.
// v58: Step 9 — Page/route transition polish. Discovered changePage() (script-1-core.js) already implements a full vanilla-JS fade+translateY page transition (exit: opacity/translateY over a timed delay → render() swaps <main> → enter: fade+translateY back in via double-rAF) — the single dispatcher every nav path (desktop header, mobile bottom nav, feature cards, footer, sidebar links) already funnels through via the one `case 'changePage'` handler, so no new integration points were needed. Three small, scoped fixes to that existing function only: (1) tightened 160ms exit + 280ms enter (440ms total) → 130ms + 230ms (360ms total) to land inside the requested ~200–400ms window, same easing/approach; (2) added an explicit prefers-reduced-motion check (same matchMedia idiom already used in toggleMenu()) that skips the fade entirely — instant render, no transition — for reduced-motion users, on top of the pre-existing global `*{transition-duration:.01ms!important}` reduced-motion rule already in style.css; (3) added a pending-timer guard (window._pageTransitionTimer, cleared/reset at the top of changePage()) so rapid repeat navigation cancels the previous in-flight transition instead of stacking two render() calls and restarting the enter-fade mid-flight. Detail-view navigations that set state.currentPage directly (readPost/readDua/readAmal/readZiyarat, imamDetail, familyTree) were left untouched — they already get a smooth CSS `page-enter`/`fade-in` entrance (fadeInUp keyframe) from their own render template, and wrapping them in the same JS exit/enter cycle risked double-firing against their existing async content-loading flows (ensureDuaContent/ensureAmalContent). No routing rewrite, no framework, no build step — everything above is the site's existing vanilla-JS `changePage()`/`render()` pipeline, minimally adjusted.
// (Dua 15 When Sick, Dua 25 For his Children) sourced from Al-Islam.org/Duas.org —
// sahifa-sajjadiya.json 13 -> 15 entries.
// v35: Added 3 verified Sahifa al-Sajjadiyya duas
// (Dua 6 Morning/Evening, Dua 44 Coming of Ramadan, Dua 31 Repentance) sourced
// from Al-Islam.org — sahifa-sajjadiya.json 10 -> 13 entries.
// v34: Fixed PWA install icon — removed old placeholder
// SVG (green box + crescent) from manifest icons list so browsers use the real
// AHLULBAYT MARKAZ logo (icon-192.png / icon-512.png) on the install prompt.
// v33: Added 40 more duas (round 3, light top-up,
// ~2 per category) across all 20 dua category files — mostly Quran-sourced
// (Ayat al-Tathir for ahlul-bayt, Tahajjud verse for night, etc.), a couple
// of well-known prophetic duas (graveyard visit, istiftah tasbih). Only
// data/duas/*.json (all 20 category files) + data/duas/metadata.json
// touched, no JS logic changed. Bumped so returning/installed-PWA clients
// see the new duas.
// v32: Added 48 more duas (round 2, medium top-up)
// across all 20 dua category files this time — including ramadan/daily/
// hardship/special-days which round-1 skipped — mostly Quran-sourced, plus
// one verified Sahifa Sajjadiya dua 13 excerpt and a few well-known
// prophetic duas (iftar, entering home, new clothes, Eid takbir). Only
// data/duas/*.json (all 20 category files) + data/duas/metadata.json
// touched, no JS logic changed. Bumped so returning/installed-PWA clients
// see the new duas.
// v31: Added 42 new duas (Quran-sourced + Sahifa
// Sajjadiya 24 + two well-known prophetic dhikr) as a light top-up across
// the 16 thinnest dua categories (~2-3 each): ahlul-bayt, family,
// forgiveness, gratitude, hajj-umrah, healing, knowledge, morning, night,
// patience, protection, quranic, rizq, sahifa-sajjadiya, tasbih, zikr.
// Only data/duas/*.json (16 category files) + data/duas/metadata.json
// touched — no JS logic changed. Bumped so returning/installed-PWA clients
// see the new duas.
// v30: Dua tab's 21 category chips changed from
// 3 fixed rows of 7 (v29) to 7 default chips in a flex-wrap row (auto-fits
// per screen width on desktop/mobile) plus the other 14 behind a new
// "আরও দেখুন" (Show more) toggle button. New state field
// duaCatExpanded + new data-action toggleDuaCatExpanded (script-1-core.js,
// script-2-ui.js, script-3-pages.js). CSS/markup + one small state field
// only, no data files touched. Bumped so returning/installed-PWA clients
// pick up the JS change.
// v29: Dua tab's category-chip row (21
// categories) split into 3 fixed rows of 7 chips each
// (assets/js/core/script-3-pages.js, renderDuaPage) instead of one long
// horizontally-scrolling `.hscroll-fade` line from v28 — all 21 categories
// are now visible at a glance without scrolling to find them; each row
// still scrolls horizontally as a fallback on very narrow screens.
// CSS/markup only, no data files touched. Bumped so returning/installed-PWA
// clients pick up the JS change.
// v28: Fixed the dua/ziyarat/amal category chip rows (and the
// Ahlul Bayt jump-nav + tasbeeh dhikr selector, same pattern) — they scroll horizontally with
// the scrollbar hidden, so an overflowing row (e.g. all 21 dua categories) just looked cut
// off/broken with no hint more chips existed. Added a `.hscroll-fade` CSS class (mask-image
// fade on the right edge) to assets/css/style.css and applied it to all 5 occurrences in
// script-3-pages.js. Bumped so returning/installed-PWA clients pick up the CSS/JS change.
// v27: Removed the cream circular/pill background wrapper around
// the logo (splash screen in index.html; navbar dark-mode and footer in script-2-ui.js) since
// the new "Ahlulbayt Markaz" badge is already a self-framed circle — the old wrapper produced
// a double-circle/halo look. Logo now renders directly with border-radius:50%. Bumped so
// returning/installed-PWA clients pick up the updated HTML/JS.
// v26: Site logo replaced with new "Ahlulbayt Markaz" circular badge across
// assets/images/logo-mark.png, logo-full.png, logo-icon-512.png, favicon.ico,
// apple-touch-icon.png, icon-192.png, icon-512.png, icon-512-maskable.png (2026-08-15). Same
// filenames, new image bytes — bumped so returning/installed-PWA clients actually fetch the
// new logo instead of serving the old cached one indefinitely under the cache-first strategy
// below, per this project's existing convention.
// v25: Dua Library content completion, round 3 (2026-08-15) —
// added further verified, distinctly-sourced entries to 11 still-thin categories via
// data/duas/metadata.json + the respective data/duas/{category}.json: zikr (+2, Quranic
// dhikr: Dua Yunus 21:87, Hasbunallah 3:173 — previously left at 2 pending a verifiable
// addition), tasbih (+1, Tasbih al-Zahra per Al-Kafi), patience (+2, Quran 12:18 & 94:5-6),
// protection (+1, Ayat al-Kursi 2:255), healing (+1, Quran 26:80), knowledge (+1, Quran
// 20:114 "Rabbi zidni ilma"), rizq (+1, Quran 5:114), forgiveness (+1, Munajat al-Ta'ibin
// from the Fifteen Whispered Prayers appended to Sahifa Sajjadiya, incl. `verses`),
// family (+1, Quran 25:74), quranic (+2, Quran 20:25-28 & 43:13-14), sahifa-sajjadiya
// (+1, Dua 20 Makarim al-Akhlaq excerpt, incl. `verses`). All Arabic text verified against
// Al-Islam.org/Duas.org before inclusion; hajj-umrah and ahlul-bayt intentionally left
// untouched this round (no additional entry could be verified with confidence yet). No
// existing entries changed. Same file URLs precached below — bumped only so returning
// clients pick up the new content.
// v24: Dua Library content completion, round 2 (2026-08-15) —
// added a 3rd verified entry each to healing (Sahifa Dua 23), knowledge (Munajat al-'Arifin),
// and protection (Sahifa Dua 41), all via data/duas/metadata.json + the respective
// data/duas/{category}.json; zikr intentionally kept at 2 (no additional distinctly
// Shia-sourced short dhikr phrase could be verified). No existing entries changed. Same
// file URLs precached below — bumped only so returning clients pick up the new content.
// v23: Dua Library content completion (2026-08-15) — filled every
// previously empty/under-filled Dua category (ahlul-bayt, forgiveness, family, hajj-umrah,
// healing, knowledge, patience, protection, quranic, rizq, sahifa-sajjadiya, tasbih, zikr)
// with verified Shia-sourced entries; data/duas/metadata.json and the 13 affected
// data/duas/{category}.json files gained new dua entries only (no existing entries changed
// or removed). assets/js/core/script-3-pages.js's `catFilters` array (renderDuaPage) also
// gained buttons for those 13 categories, which previously had dedicated data files but no
// way to be selected in the UI. Same file URLs are precached below, no entries added/removed
// — bumped only so returning clients pick up the new dua content and filter buttons promptly,
// per this project's existing convention.
// v22: Phase D2.9 — added an `align-items: safe center`
// override (assets/css/style.css) for the 6 shared editor/login modal overlays
// (Admin Login, Blog Editor, Knowledge Editor, Dua/Ziyarat/Amal Editor, Muharram
// Editor, Shia Day Editor) so their header/footer/controls stay reachable on
// short viewports instead of being clipped by the flex-center+overflow-auto
// interaction. CSS-only, no markup/JS change, no data files touched.
// v21: Ahlul Bayt core data (masumeen/family-tree/biographies/companions) migrated from sync XHR to async fetch (2026-08-12, Phase 5 of the sync-XHR migration, per the 2026-08-11 audit) — assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js now loads data/ahlul-bayt/{family-tree,companions,masumeen,biographies}.json (~73KB total) concurrently via loadJSONAsync() (non-blocking) instead of loadJSONSync(); masumeen/imams/familyTreeLineage/familyTreeDatabase/ADDITIONAL_PERSONALITIES keep the same references and start empty, filled in place once all four resolve; new ahlulBaytDataLoadState ('loading'|'loaded'|'error') lets renderImamsPage() (script-3-pages.js) and renderFamilyTreePage() (script-4-boot.js) show a lightweight loading message instead of a blank/broken page during that window; validateFamilyTreeData() — previously called eagerly against the empty {} placeholder — now only runs once biographies.json has actually resolved; renderFamilyTree()/_resolveFamilyTreePerson() (script-4-boot.js) hardened to recognize an empty-but-truthy familyTreeDatabase as not-yet-ready. quotes.json/timeline.json/events.json/metadata.json unchanged (already lazy or out of scope). Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v20: Dua Library lite-index loading migrated from sync XHR to async fetch (2026-08-11, Phase 4 of the sync-XHR migration) — assets/js/data/duas-data.js now loads data/duas/metadata.json (~168KB) via loadJSONAsync() (non-blocking) instead of loadJSONSync(); duas/ziyarats/amals keep the same array references and start empty, filled in place (still sorted by originalIndex) once metadata.json resolves; new duasIndexLoadState ('loading'|'loaded'|'error') lets assets/js/core/script-3-pages.js's renderDuaPage() show a lightweight skeleton or error state instead of a blank/broken page during that window; the existing lazy loadDuaCategory()/loadZiyarats()/loadAmals()/ensureDuaContent()/ensureZiyaratContent()/ensureAmalContent() loading is unchanged apart from now awaiting the index first. Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v19: Knowledge Center lite-index loading migrated from sync XHR to async fetch (2026-08-11, Phase 3 of the sync-XHR migration) — assets/js/data/knowledge-center-data.js now loads data/knowledge/{categories,metadata}.json via loadJSONAsync() (non-blocking) instead of loadJSONSync(); kcHadithCategories/kcMasailCategories/kcQaCategories/kcMaraji/kcHadiths/kcMasail/kcQa/kcFatwa keep the same array references and start empty, filled in place once both files resolve; new kcIndexLoadState ('loading'|'loaded'|'error') lets assets/js/modules/knowledge/knowledge-center.js's renderKnowledgeCenterPage() show a lightweight skeleton or error state instead of a blank/broken page during that window; the existing per-section loadKcSection()/ensureKcItemContent() lazy loading is unchanged apart from now awaiting the index first. Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v18: Quiz data-loading migrated from sync XHR to async fetch (2026-08-11, Phase 2 of the sync-XHR migration) — assets/js/data/quiz-data.js now loads data/quiz/{categories,questions}.json via loadJSONAsync() (non-blocking) instead of loadJSONSync(); script-1-core.js's getHomeQuizIndex() guarded against dividing by a not-yet-loaded empty quizQuestions array; script-3-pages.js's quiz setup screen now distinguishes loading/error/empty states. Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v17: Blog data-loading migrated from sync XHR to async fetch (2026-08-11, Phase 1 of the sync-XHR migration) — assets/js/utils/data-loader.js gained loadJSONAsync() (additive, loadJSONSync() untouched), assets/js/modules/blog/blog.js now loads data/blog-posts.json non-blocking. Same file URLs are precached below, no entries added/removed — bumped only so returning clients pick up the new JS promptly, per this project's existing convention.
// v16: duplicate JS cleanup (2026-08-11) — removed dead Imams/Family-Tree/search duplicates from ahlul-bayt-unified.js, script-3-pages.js, knowledge-center.js
// v15: quiz feature rewrite (2026-08-09) added
// assets/js/data/quiz-data.js + data/quiz/{categories,questions}.json —
// added below to STATIC so the quiz still works on a first-ever OFFLINE
// visit, matching the same reasoning already documented for duas/knowledge
// center's data files. Bumped so returning clients pick up the new quiz
// code+content promptly instead of waiting on stale-while-revalidate's
// one-visit lag.
// NOTE (2026-07-23): paths updated to match the reorganized assets/ + data/
// folder structure. Old entries (./script.js, ./family-tree-data.js) removed
// since those files no longer exist — script.js was split into 4 files under
// assets/js/core/, family-tree-data.js was merged into ahlul-bayt-unified.js.
// './manifest.json' removed (2026-07-23) — the manifest was generated at
// runtime as a Blob URL. RE-ADDED (v68) as a real static file — the Blob
// approach meant no manifest existed until JS ran (or at all, if the
// try/catch silently failed), which hurt installability and couldn't be
// precached for offline. See STATIC list below.
// NOTE (2026-07-26): data/*.json single-file blobs (ahlul-bayt.json, duas.json,
// knowledge-center.json, posts.json) removed — each was split into the
// per-category files under data/ahlul-bayt/, data/duas/, and data/knowledge/
// listed below (folders were also renamed from the mistaken "data ahlul-bayt"/
// "data duas"/"data knowledge" to match the paths duas-data.js,
// knowledge-center-data.js, and ahlul-bayt-unified.js actually request). Also
// added the missing ./assets/js/core/search-engine.js, which index.html loads
// but this list never included. CACHE bumped to v5 so old clients drop the
// stale files.
const STATIC = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/css/animations.css',
    './assets/js/utils/data-loader.js',
    './assets/js/data/duas-data.js',
    './assets/js/data/knowledge-center-data.js',
    './assets/js/data/quiz-data.js',
    './assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js',
    './assets/js/modules/blog/blog.js',
    './assets/js/modules/knowledge/knowledge-center.js',
    './assets/js/core/script-1-core.js',
    './assets/js/core/script-2-ui.js',
    './assets/js/core/script-3-pages.js',
    './assets/js/core/quiz-plus.js',
    './assets/js/core/prayer-reminders.js',
    './assets/js/core/daily-amal.js',
    './assets/js/core/ramadan-plus.js',
    './assets/js/core/ramadan-cardart.js',
    './assets/fonts/rc-bn-bengali-500.woff2',
    './assets/fonts/rc-bn-bengali-700.woff2',
    './assets/fonts/rc-bn-latin-500.woff2',
    './assets/fonts/rc-bn-latin-700.woff2',
    './assets/fonts/rc-display-600.woff2',
    './assets/fonts/rc-display-500i.woff2',
    './assets/js/core/iftar-invite.js',
    './assets/js/core/qadr-walk.js',
    './assets/js/core/ramadan-journal.js',
    './assets/js/core/qaza-fidya.js',
    './assets/js/core/ramadan-home.js',
    './assets/js/core/ramadan-layout.js',
    './assets/js/core/data-backup.js',
    './assets/js/core/script-4-boot.js',
    './assets/js/core/reader-mode.js',
    './assets/js/core/dua-playlist.js',
    './assets/js/core/arabic-corner.js',
    './assets/js/core/date-converter.js',
    './assets/js/core/prayer-tracker.js',
    './assets/js/core/share-links.js',
    './assets/js/core/content-links.js',
    './assets/js/core/browser-history.js',
    './assets/js/core/search-engine.js',
    './assets/js/core/world-map.js',
    './assets/js/core/khums-zakat.js',
    './assets/js/core/editor-modal.js',
    './assets/js/core/phase4-animations.js',
    './data/blog-posts.json',
    './data/ahlul-bayt/biographies.json',
    './data/ahlul-bayt/companions.json',
    './data/ahlul-bayt/events.json',
    './data/ahlul-bayt/family-tree.json',
    './data/ahlul-bayt/masumeen.json',
    './data/ahlul-bayt/metadata.json',
    './data/ahlul-bayt/quotes.json',
    './data/ahlul-bayt/timeline.json',
    './data/duas/ahlul-bayt.json',
    './data/duas/amal.json',
    './data/duas/daily.json',
    './data/duas/family.json',
    './data/duas/forgiveness.json',
    './data/duas/hajj-umrah.json',
    './data/duas/hardship.json',
    './data/duas/healing.json',
    './data/duas/knowledge.json',
    './data/duas/metadata.json',
    './data/duas/morning.json',
    './data/duas/night.json',
    './data/duas/patience.json',
    './data/duas/protection.json',
    './data/duas/quranic.json',
    './data/duas/ramadan.json',
    './data/duas/rizq.json',
    './data/duas/sahifa-sajjadiya.json',
    './data/duas/special-days.json',
    './data/duas/tasbih.json',
    './data/duas/zikr.json',
    './data/duas/ziyarat.json',
    './data/knowledge/categories.json',
    './data/knowledge/fatwa.json',
    './data/knowledge/hadith.json',
    './data/knowledge/masail.json',
    './data/knowledge/metadata.json',
    './data/knowledge/qa.json',
    './data/quiz/categories.json',
    './data/quiz/questions.json',
    './offline.html',
    './manifest.json',
    './assets/images/logo-mark-light.png',
    './assets/images/logo-mark-dark.png',
    './assets/images/logo-mark.png',
    './assets/images/logo-splash.png',
    './assets/images/hero-bg-eid.webp',
    './assets/images/splash-frame.svg',
    './assets/images/splash-allah.svg',
    './assets/fonts/splash-serif.woff2',
    './assets/fonts/splash-bn.woff2',
    './assets/fonts/splash-ar.woff2',
    './assets/fonts/ff-poppins-latin-400.woff2',
    './assets/fonts/ff-poppins-latin-500.woff2',
    './assets/fonts/ff-poppins-latin-600.woff2',
    './assets/fonts/ff-poppins-latin-700.woff2',
    './assets/fonts/ff-poppins-latin-800.woff2',
    './assets/fonts/ff-poppins-latin-900.woff2',
    './assets/fonts/ff-amiri-arabic-400.woff2',
    './assets/fonts/ff-amiri-latin-400.woff2',
    './assets/fonts/ff-amiri-arabic-700.woff2',
    './assets/fonts/ff-amiri-latin-700.woff2',
    './assets/fonts/ff-noto-serif-bengali-bengali-400.woff2',
    './assets/fonts/ff-noto-serif-bengali-latin-400.woff2',
    './assets/fonts/ff-noto-serif-bengali-bengali-600.woff2',
    './assets/fonts/ff-noto-serif-bengali-latin-600.woff2',
    './assets/fonts/ff-noto-serif-bengali-bengali-700.woff2',
    './assets/fonts/ff-noto-serif-bengali-latin-700.woff2',
    './assets/images/splash-field.svg',
    './assets/images/splash-geo.svg',
    './assets/images/splash-side.svg',
    './assets/images/splash-skyline.svg',
    './favicon.ico',
    './apple-touch-icon.png',
    './icon-192.png',
    './icon-512.png',
    './icon-512-maskable.png'
];
const FONT_CACHE = 'ahlbayt-fonts-v1';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => {
            // {cache:'reload'} forces a real network round-trip, bypassing
            // the browser's own HTTP cache (separate from this Cache
            // Storage API bucket) — c.add()/c.addAll() would otherwise
            // honor normal HTTP caching for their internal fetch, so a
            // fresh CACHE *name* alone doesn't guarantee fresh *content*.
            // This is why bumping CACHE wasn't enough on mobile: the new
            // bucket could still get populated with a stale HTTP-cached
            // copy of style.css/script-3-pages.js/etc.
            return Promise.allSettled(STATIC.map(url =>
                fetch(url, { cache: 'reload' })
                    .then(res => { if (res && res.ok) return c.put(url, res); })
                    .catch(() => {})
            ));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);

    // Google Fonts → cache-first
    if (url.hostname.includes('fonts.g')) {
        e.respondWith(caches.open(FONT_CACHE).then(c =>
            c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
                c.put(e.request, res.clone()); return res;
            }))
        ));
        return;
    }

    // AlAdhan prayer API → network-first, fallback to cache
    if (url.hostname.includes('aladhan')) {
        e.respondWith(
            fetch(e.request).then(res => {
                // Clone MUST happen synchronously, in this same tick, before
                // the original `res` is returned and its body potentially
                // starts being read by the page. caches.open() is async, so
                // calling res.clone() only after it resolves risks the body
                // already being "used" — throwing "Failed to execute
                // 'clone' on 'Response': Response body is already used".
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return res;
            }).catch(() => caches.match(e.request))
        );
        return;
    }

    // data/*.json → (HISTORICAL NOTE, pre-v173: was "never intercept"; see the v173 note below.)
    // UPDATED (per the 2026-08-12 Final Performance & Regression Audit):
    // the original reasoning here — that knowledge-center-data.js,
    // duas-data.js, and ahlul-bayt-unified.js load these files via
    // SYNCHRONOUS XHR at boot, risking a deadlock between that sync XHR and
    // this SW's async respondWith()/Promise chain — is no longer accurate.
    // All five data-loading modules (Blog, Quiz, Knowledge Center, Dua,
    // Ahlul Bayt) have since been migrated to loadJSONAsync()/fetch(), so
    // the sync-XHR deadlock scenario that originally motivated this bypass
    // no longer applies to any of them.
    // This bypass is intentionally being left in place for now regardless:
    // migrated data currently loads straight from network / the browser's
    // own HTTP cache rather than being served from this SW's cache, and
    // re-enabling cache-first handling here would be a caching-behavior
    // change that needs its own dedicated testing phase, not a documentation
    // update. Do not remove or modify this bypass as part of a comment-only
    // change — treat this note as a pointer to a future phase, not an
    // instruction to act now. They're still precached in STATIC above for
    // install-time warmup; they just aren't served *from* that cache at
    // fetch time.
    // v173: data/*.json is now served NETWORK-FIRST with a cache fallback, so
    // duas / ziyarat / blog / hadith / quiz data still load offline (previously
    // the bypass above meant an offline reload got empty data). Online behaviour
    // is unchanged: the network response always wins, so content is never stale;
    // each successful response is also stored for offline use. The clone is made
    // synchronously (same rule as the branches above). Data fetched before the
    // first online visit of a new CACHE version is simply unavailable offline.
    if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
        e.respondWith(
            fetch(e.request).then(res => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, copy));
                    return res;
                }
                return caches.match(e.request, { ignoreSearch: true }).then(hit => hit || res);
            }).catch(() =>
                caches.match(e.request, { ignoreSearch: true }).then(hit => hit || Response.error())
            )
        );
        return;
    }

    // Everything else → stale-while-revalidate (+ offline fallback for page navigations)
    e.respondWith(
        caches.match(e.request).then(cached => {
            const net = fetch(e.request).then(res => {
                if (res && res.status === 200 && res.type !== 'opaque') {
                    // Same fix as the AlAdhan branch above: clone
                    // synchronously, before `return res` hands the original
                    // off for consumption, so caches.open()'s async delay
                    // can never race against the body being read/locked.
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, copy));
                }
                return res;
            }).catch(() => {
                if (cached) return cached;
                if (e.request.mode === 'navigate') return caches.match('./offline.html');
                return undefined;
            });
            return cached || net;
        })
    );
});

// Background sync for offline actions
self.addEventListener('message', e => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// v122: tapping a prayer/event notification focuses the open app tab, or opens the app.
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) { if ('focus' in c) return c.focus(); }
        return self.clients.openWindow('./');
    }));
});
