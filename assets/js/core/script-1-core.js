// ── Live Upload Feature — DISABLED ──────────────────────────────────
// 2026-07-18/19: Cloudinary → GitHub Contents API migration was attempted
// and reverted the same day. GitHub automatically revokes any GitHub PAT
// it detects committed to a public repo (confirmed via GitHub's own docs)
// — the token died with "Bad credentials" immediately after the first
// push, regardless of push-protection's "I'll fix it later" option. A
// working version would need a server-side proxy (e.g. Cloudflare Worker)
// to keep the token out of client-side code entirely.
//
// Decision: no live upload feature for now. This flag hides admin
// upload/edit/delete UI that would otherwise need it (currently: the
// blog's New/Edit/Delete Post buttons in blog.js — the Media Library and
// PDF Library that used to also depend on this flag have both been
// removed entirely, along with their upload UI). Content is instead added
// by editing the relevant data file directly (e.g. blogPosts in blog.js)
// and pushing via git.
const UPLOAD_LIVE_FEATURE_ENABLED = window.UPLOAD_LIVE_FEATURE_ENABLED || false;
window.UPLOAD_LIVE_FEATURE_ENABLED = UPLOAD_LIVE_FEATURE_ENABLED;

// ============================================================================
// HELPER FUNCTIONS — Vibration & Colors
// ============================================================================

/**
 * Trigger vibration feedback for tasbeeh counter
 */
function vibrateTaskeeh(type = 'tap') {
    if (!navigator.vibrate && !navigator.webkitVibrate && 
        !navigator.mozVibrate && !navigator.msVibrate) {
        return;
    }
    const vibrate = navigator.vibrate || navigator.webkitVibrate || 
                    navigator.mozVibrate || navigator.msVibrate;
    const patterns = {
        'tap': 15,
        'reach': [10, 20, 15],
        'reset': 25,
        'error': [5, 15, 5]
    };
    vibrate.call(navigator, patterns[type] || 15);
}

// ============================================================================
// FALLBACK FUNCTIONS — যদি blog.js লোড না হয়
// ============================================================================
if (typeof renderBlogEditorModal !== 'function') {
    window.renderBlogEditorModal = () => '';
}
if (typeof renderBlogPage !== 'function') {
    window.renderBlogPage = () => '<div class="text-center py-8">Blog module is loading...</div>';
}
if (typeof openBlogEditor !== 'function') {
    window.openBlogEditor = () => console.warn('Blog module not loaded yet');
}
if (typeof saveBlogPost !== 'function') {
    window.saveBlogPost = () => console.warn('Blog module not loaded yet');
}

// ============================================================================
// ADMIN CONFIG — SHA-256 hash of your password (never store plaintext)
// To change password: run  crypto.subtle.digest('SHA-256', new TextEncoder().encode('newpass'))
//   then convert to hex and update ADMIN_PASS_HASH below.
// ============================================================================
const ADMIN_PASS_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

async function hashPassword(pass) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// STATE
// ============================================================================
// ============================================================================
// STATE — split into modular, concern-based sub-objects (2026-07-25 internal
// architecture upgrade, Phase 1). Each sub-object below groups fields that
// already lived together under the same section comment in the original
// single `state` literal. They are merged into one `state` object at the
// bottom via Object.assign(), in the exact same field order as before, so
// EVERY existing `state.xxx` read/write anywhere else in the app (event
// dispatcher, inline onclick handlers, render functions, loadState/saveState)
// keeps working completely unchanged — this is a pure internal
// reorganization, not a change to how state is accessed.
// ============================================================================

// Display / language preferences
const uiPrefsState = {
    darkMode: false,
    language: 'bn',
    fontSize: 'medium', // small | medium | large | xlarge
};

// Navigation
const navState = {
    currentPage: 'home',
    previousPage: 'home',
    menuOpen: false,
};

// Bookmarks, reading history, and the item currently open (post/dua/ziyarat/imam)
const contentState = {
    bookmarks: [],
    readingHistory: [],
    currentPost: null,
    currentDua: null,
    currentZiyarat: null,
    currentAmal: null,  // NEW: Amal — mirrors currentZiyarat
    // imam detail
    currentImam: null,
    // search
    searchQuery: '',
    searchResults: [],
    // stats (analytics)
    pageViews: {},
};

// Dua / Ziyarat tab, filters, and custom-entry editor
const duaState = {
    duaCategory: 'all',  // NEW: Category filter for duas
    ziyaratCategory: 'all',  // NEW: Category filter for ziyarat (12 Imams / Masumeen / Comprehensive)
    amalCategory: 'all',  // NEW: Category filter for amal (daily / weekly / ramadan / special)
    duaTab: 'dua',  // NEW: Track dua/ziyarat/amal tab
    bookmarksTab: 'bookmarks',  // NEW: Track bookmarks/history tab
    // custom dua / ziyarat / amal editor
    showDuaEditor: false,
    editingDua: null,
    duaEditorType: 'dua', // 'dua' | 'ziyarat' | 'amal'
    customDuas: [],
    customZiyarat: [],
    customAmal: [],  // NEW: Amal — mirrors customZiyarat
};

// Imam timeline / Muharram event expand-in-place UI
const timelineState = {
    showTimeline: false,
    timelineEra: 'all', // all | umayyad | abbasid — Imam timeline era filter
    expandedMuharramEvents: [], // ids of manually-expanded Karbala timeline events
};

// Prayer times widget
const prayerState = {
    prayerTimes: { fajr:'04:15 AM', dhuhr:'12:05 PM', asr:'03:30 PM', maghrib:'06:20 PM', isha:'07:35 PM' },
    prayerTimesLoading: false,
    prayerTimesError: null,
    userLocation: null,
};

// admin
const adminState = {
    isAdmin: false,
    showAdminLogin: false,
    adminLoginError: '',
};

// tasbeeh
const tasbeehState = {
    tasbeehCount: 0,
    tasbeehTarget: 33,
    tasbeehLabel: 'সুবহানআল্লাহ',
    tasbeehHistory: [],
    tasbeehSelected: 0,
};

// quiz
const quizState = {
    quizIndex: 0,
    quizScore: 0,
    quizAnswered: null,
    quizFinished: false,
    homeQuizPick: null, // NEW: selected option index for the home-page "quiz of the day" mini widget (separate from the full quiz page's progress)
};

// admin blog editor
const blogEditorState = {
    showBlogEditor: false,
    editingPost: null,
    customPosts: [],
    blogFilter: '',            // '' = সব; category bn name = filter
};

// knowledge center (Hadith / Masail / Q&A / Fatwa)
const knowledgeCenterState = {
    kcTab: 'hadith',
    kcCategory: '',
    kcSearch: '',
    kcPage: 1,
    kcFatwaMarja: '',
    kcSourceFilter: '',
    kcDetail: null,
    kcFavorites: [],
    kcFilter: 'all', // 'all' | 'bookmarked' | 'favorite'
    kcLoading: false,
};

// hadith / ayah index (for next/prev browsing)
const hadithAyahState = {
    hadithIndex: 0,
    ayahIndex: -1, // -1 = date-based auto; 0+ = manual browse
    customHadiths: [],
    customAyahs: [],
    nahjulBalagha: [],
    sahifaSajjadiya: [],
    imamHadiths: [],
    specialDays: [],
    showHadithEditor: false,
    showAyahEditor: false,
    editingHadith: null,
    editingAyah: null,
};

// মুহাররম ইভেন্ট CRUD
const muharramState = {
    muharramEvents: [],
    showMuharramEditor: false,
    editingMuharramEvent: null,
};

// শিয়া বিশেষ দিন CRUD
const shiaDaysState = {
    shiaSpecialDays: [],
    showShiaDayEditor: false,
    editingShiaDay: null,
};

// Composed global state — same single object every existing file reads/writes
// via `state.xxx`, in the exact same key order the original literal had.
const state = Object.assign(
    {},
    uiPrefsState,
    navState,
    contentState,
    duaState,
    timelineState,
    prayerState,
    adminState,
    tasbeehState,
    quizState,
    blogEditorState,
    knowledgeCenterState,
    hadithAyahState,
    muharramState,
    shiaDaysState
);

// ============================================================================
// MODULAR STATE ACCESSORS (Phase 6 — 2026-07-26)
// ============================================================================
// The sub-objects above (uiPrefsState, navState, contentState, ...) only
// seed the initial values of `state` via Object.assign() — after startup
// they are NOT kept in sync with `state`, so writing to e.g.
// `uiPrefsState.language` would silently do nothing to the live UI.
//
// The named modules below (ThemeState, NavigationState, BlogState, ...) are
// the real per-feature state API this phase introduces. Each is a live
// Proxy view over the SAME `state` object — there is no copy and no second
// source of truth, so the two can never drift out of sync. Reading or
// writing e.g. `ThemeState.darkMode` reads/writes `state.darkMode` directly.
// Every existing `state.xxx` reference anywhere else in the app (event
// dispatcher, inline onclick handlers, render functions, loadState/
// saveState) keeps working completely unchanged, because `state` itself —
// its identity, its shape, its keys — is untouched by this phase.
//
// Each module only exposes the keys it owns: reading/writing a key outside
// a module's own list is a silent no-op (returns undefined / is ignored)
// rather than reaching into another module's data.
function createStateSlice(target, keys) {
    const keySet = new Set(keys);
    return new Proxy({}, {
        get(_, prop) {
            if (typeof prop === 'symbol' || !keySet.has(prop)) return undefined;
            return target[prop];
        },
        set(_, prop, value) {
            if (typeof prop === 'symbol' || !keySet.has(prop)) return true; // ignore, don't throw
            target[prop] = value;
            return true;
        },
        has(_, prop) { return keySet.has(prop); },
        ownKeys() { return [...keySet]; },
        getOwnPropertyDescriptor(_, prop) {
            if (!keySet.has(prop)) return undefined;
            return { enumerable: true, configurable: true, value: target[prop] };
        }
    });
}

const ThemeState      = createStateSlice(state, ['darkMode', 'fontSize', 'language']);
const NavigationState = createStateSlice(state, ['currentPage', 'previousPage', 'menuOpen']);
const BlogState       = createStateSlice(state, ['showBlogEditor', 'editingPost', 'customPosts', 'blogFilter', 'currentPost']);
const DuaState        = createStateSlice(state, ['duaCategory', 'duaTab', 'showDuaEditor', 'editingDua', 'duaEditorType', 'customDuas', 'currentDua']);
const ZiyaratState    = createStateSlice(state, ['ziyaratCategory', 'customZiyarat', 'currentZiyarat']);
const AmalState       = createStateSlice(state, ['amalCategory', 'customAmal', 'currentAmal']);  // NEW: Amal — mirrors ZiyaratState
const KnowledgeState  = createStateSlice(state, [
    'kcTab', 'kcCategory', 'kcSearch', 'kcPage', 'kcFatwaMarja', 'kcSourceFilter',
    'kcDetail', 'kcFavorites', 'kcFilter', 'kcLoading',
    'hadithIndex', 'ayahIndex', 'customHadiths', 'customAyahs', 'nahjulBalagha',
    'sahifaSajjadiya', 'imamHadiths', 'specialDays', 'showHadithEditor',
    'showAyahEditor', 'editingHadith', 'editingAyah'
]);
const SearchState     = createStateSlice(state, ['searchQuery', 'searchResults']);
const BookmarkState   = createStateSlice(state, ['bookmarks', 'bookmarksTab']);
const HistoryState    = createStateSlice(state, ['readingHistory']);
const PrayerState     = createStateSlice(state, ['prayerTimes', 'prayerTimesLoading', 'prayerTimesError']);
const QiblaState      = createStateSlice(state, ['userLocation']);
const QuizState       = createStateSlice(state, ['quizIndex', 'quizScore', 'quizAnswered', 'quizFinished']);
const TasbeehState    = createStateSlice(state, ['tasbeehCount', 'tasbeehTarget', 'tasbeehLabel', 'tasbeehHistory', 'tasbeehSelected']);
const TimelineState   = createStateSlice(state, [
    'showTimeline', 'timelineEra', 'expandedMuharramEvents',
    'muharramEvents', 'showMuharramEditor', 'editingMuharramEvent',
    'shiaSpecialDays', 'showShiaDayEditor', 'editingShiaDay'
]);
const AdminState      = createStateSlice(state, ['isAdmin', 'showAdminLogin', 'adminLoginError']);
const AnalyticsState  = createStateSlice(state, ['pageViews']);
// AppState: cross-cutting fields not owned by a single feature module.
const AppState         = createStateSlice(state, ['currentImam']);

// Also expose on window (belt-and-suspenders — classic <script> tags already
// share one global lexical scope, same as `state` itself, but other modules
// such as blog.js / knowledge-center.js / ahlul-bayt-unified.js read window.*
// in a few places, so this keeps the modular API reachable the same way).
Object.assign(window, {
    ThemeState, NavigationState, BlogState, DuaState, ZiyaratState, AmalState,
    KnowledgeState, SearchState, BookmarkState, HistoryState, PrayerState,
    QiblaState, QuizState, TasbeehState, TimelineState, AdminState,
    AnalyticsState, AppState
});

// ============================================================================
// CALENDAR STATE — initialize to approximate current Hijri date
// ============================================================================
function approxHijriNow() {
    // Accurate Gregorian→Hijri using reference: 1 Muharram 1447 = June 27, 2025
    const REF_GREG = new Date(2025, 5, 27);
    const REF_HY = 1447, REF_HM = 1, REF_HD = 1;
    const today = new Date();
    today.setHours(0,0,0,0);
    let diff = Math.round((today - REF_GREG) / 86400000);
    let y = REF_HY, m = REF_HM, d = REF_HD;
    function _hmd(mo,yr){if(mo%2===1)return 30;if(mo===12)return([2,5,7,10,13,15,18,21,24,26,29].includes(yr%30))?30:29;return 29;}
    if (diff >= 0) {
        d += diff;
        while (d > _hmd(m, y)) { d -= _hmd(m, y); m++; if (m > 12) { m = 1; y++; } }
    } else {
        diff = -diff;
        while (diff > 0) { if (diff < d) { d -= diff; diff = 0; } else { diff -= d; m--; if (m < 1) { m = 12; y--; } d = _hmd(m, y); } }
    }
    return { day: d, month: m, year: y };
}
const _hijriNow = approxHijriNow();
const calState = { hijriMonth: _hijriNow.month, hijriYear: _hijriNow.year };

// ============================================================================
// STATIC DATA — IMAMS
// ============================================================================
// ⚠️ MOVED 2026-07-17: `masumeen` ও `imams` ডেটা এখন ahlul-bayt-unified.js
// ফাইলে আছে (👑 ইমাম ও মাসুমিন মার্জ)। ahlul-bayt-unified.js এই ফাইলের
// আগে load হয় (index.html দেখুন), তাই এই দুটো global variable এখানে
// আগের মতোই ব্যবহারযোগ্য।

const hadiths = [
    // ── ইমাম আলী (আ.) — নাহজুল বালাগা ──
    {textBn:'মানুষ যা জানে না তার শত্রু।',textEn:'Man is the enemy of what he does not know.',sourceBn:'ইমাম আলী (আ.) — নাহজুল বালাগা',sourceEn:'Imam Ali (AS) — Nahjul Balagha'},
    {textBn:'জ্ঞান হলো সর্বোত্তম উত্তরাধিকার।',textEn:'Knowledge is the best inheritance.',sourceBn:'ইমাম আলী (আ.) — নাহজুল বালাগা',sourceEn:'Imam Ali (AS) — Nahjul Balagha'},
    {textBn:'নীরবতা জ্ঞানীদের অলংকার এবং মূর্খদের আবরণ।',textEn:'Silence is the ornament of the wise and the covering of the fool.',sourceBn:'ইমাম আলী (আ.) — নাহজুল বালাগা',sourceEn:'Imam Ali (AS) — Nahjul Balagha'},
    {textBn:'যে নিজেকে চেনে সে তার রবকে চেনে।',textEn:'Whoever knows himself knows his Lord.',sourceBn:'ইমাম আলী (আ.) — গুরারুল হিকাম',sourceEn:'Imam Ali (AS) — Ghurar al-Hikam'},
    {textBn:'ধৈর্য দুই প্রকার: বিপদে ধৈর্য এবং যা তুমি অপছন্দ করো তা থেকে বিরত থাকার ধৈর্য।',textEn:'Patience is of two types: patience in what you dislike, and patience against what you desire.',sourceBn:'ইমাম আলী (আ.) — নাহজুল বালাগা',sourceEn:'Imam Ali (AS) — Nahjul Balagha'},
    {textBn:'মানুষের মূল্য তার গুণ দিয়ে, তার সম্পদ দিয়ে নয়।',textEn:'The value of a person is in his virtue, not his wealth.',sourceBn:'ইমাম আলী (আ.) — গুরারুল হিকাম',sourceEn:'Imam Ali (AS) — Ghurar al-Hikam'},
    {textBn:'অহংকার হলো বোকামির প্রথম চিহ্ন।',textEn:'Arrogance is the first sign of foolishness.',sourceBn:'ইমাম আলী (আ.) — নাহজুল বালাগা',sourceEn:'Imam Ali (AS) — Nahjul Balagha'},
    {textBn:'তোমার ভাইয়ের সাথে যখন দেখা হয় তখন তার কল্যাণ কামনা করো।',textEn:'When you meet your brother, wish him well.',sourceBn:'ইমাম আলী (আ.) — গুরারুল হিকাম',sourceEn:'Imam Ali (AS) — Ghurar al-Hikam'},
    {textBn:'দুনিয়া একটি মৃত সত্তা; যে এটাকে ভালোবাসে সে মৃত।',textEn:'The world is a carcass; whoever loves it is with the dead.',sourceBn:'ইমাম আলী (আ.) — নাহজুল বালাগা',sourceEn:'Imam Ali (AS) — Nahjul Balagha'},
    {textBn:'বিনম্রতা হলো জ্ঞানের ফল।',textEn:'Humility is the fruit of knowledge.',sourceBn:'ইমাম আলী (আ.) — গুরারুল হিকাম',sourceEn:'Imam Ali (AS) — Ghurar al-Hikam'},

    // ── রাসূলুল্লাহ (সা.) — শিয়া সূত্র ──
    {textBn:'আমি জ্ঞানের শহর এবং আলী তার দরজা।',textEn:'I am the city of knowledge and Ali is its gate.',sourceBn:'রাসূলুল্লাহ (সা.) — আল-হাকিম, মুস্তাদরাক',sourceEn:'Prophet (PBUH) — al-Hakim, Mustadrak'},
    {textBn:'হোসাইন আমার থেকে এবং আমি হোসাইন থেকে।',textEn:'Husayn is from me and I am from Husayn.',sourceBn:'রাসূলুল্লাহ (সা.) — বিহারুল আনোয়ার',sourceEn:'Prophet (PBUH) — Bihar al-Anwar'},
    {textBn:'আমি তোমাদের মাঝে দুটি ভারী বস্তু রেখে যাচ্ছি: আল্লাহর কিতাব এবং আমার আহলে বাইত।',textEn:'I am leaving among you two weighty things: the Book of Allah and my Ahlul Bayt.',sourceBn:'রাসূলুল্লাহ (সা.) — হাদিসে সাকালাইন',sourceEn:'Prophet (PBUH) — Hadith al-Thaqalayn'},
    {textBn:'ফাতেমা আমার হৃদয়ের একটুকরো। যা তাকে কষ্ট দেয় তা আমাকে কষ্ট দেয়।',textEn:'Fatima is a piece of my heart. Whatever grieves her grieves me.',sourceBn:'রাসূলুল্লাহ (সা.) — বিহারুল আনোয়ার',sourceEn:'Prophet (PBUH) — Bihar al-Anwar'},
    {textBn:'আলী সত্যের সাথে এবং সত্য আলীর সাথে।',textEn:'Ali is with the truth and the truth is with Ali.',sourceBn:'রাসূলুল্লাহ (সা.) — আল-মুস্তাদরাক',sourceEn:'Prophet (PBUH) — al-Mustadrak'},

    // ── ইমাম হোসাইন (আ.) ──
    {textBn:'মৃত্যু শাহাদাত ছাড়া কিছুই নয়, আর ইয়াজিদের সাথে বাঁচা লজ্জাছাড়া কিছুই নয়।',textEn:'Death is nothing but martyrdom, and life with Yazid is nothing but disgrace.',sourceBn:'ইমাম হোসাইন (আ.) — কারবালার খুতবা',sourceEn:'Imam Husayn (AS) — Sermon at Karbala'},
    {textBn:'যদি তোমার দ্বীন না থাকে তাহলে অন্তত স্বাধীন মানুষ হও।',textEn:'If you have no religion, at least be free.',sourceBn:'ইমাম হোসাইন (আ.) — বিহারুল আনোয়ার',sourceEn:'Imam Husayn (AS) — Bihar al-Anwar'},

    // ── ইমাম সাজ্জাদ (আ.) — সাহিফায়ে সাজ্জাদিয়্যা ──
    {textBn:'হে আল্লাহ! আমাকে সেই জিনিস দাও যা তুমি জানো আমার জন্য সর্বোত্তম।',textEn:'O Allah, grant me what You know to be best for me.',sourceBn:'ইমাম সাজ্জাদ (আ.) — সাহিফায়ে সাজ্জাদিয়্যা',sourceEn:'Imam Sajjad (AS) — Sahifa al-Sajjadiyya'},
    {textBn:'আল্লাহ তাঁর বান্দার কাছ থেকে কোনো আমল কবুল করেন না যতক্ষণ না সে তাঁর ওলিদের ওলি এবং তাঁর শত্রুদের শত্রু হয়।',textEn:'Allah accepts no deed from a servant unless he befriends His friends and is an enemy of His enemies.',sourceBn:'ইমাম সাজ্জাদ (আ.) — বিহারুল আনোয়ার',sourceEn:'Imam Sajjad (AS) — Bihar al-Anwar'},

    // ── ইমাম বাকির (আ.) ──
    {textBn:'আমাদের শিয়ারা হলো তারা যারা তাকওয়ার পোশাক পরে, আল্লাহকে ভয় করে এবং তাঁর ইবাদত করে।',textEn:'Our Shia are those who wear the garment of piety, fear Allah, and worship Him.',sourceBn:'ইমাম বাকির (আ.) — উসুলে কাফি',sourceEn:'Imam Baqir (AS) — Usul al-Kafi'},
    {textBn:'জ্ঞানীদের সাথে বসা — যদিও তারা কথা না বলে — উপকারী।',textEn:'Sitting with the learned — even if they speak not — is beneficial.',sourceBn:'ইমাম বাকির (আ.) — উসুলে কাফি',sourceEn:'Imam Baqir (AS) — Usul al-Kafi'},

    // ── ইমাম সাদিক (আ.) ──
    {textBn:'যে ব্যক্তি তার ভাইয়ের সমস্যা সমাধান করে, আল্লাহ তার দুনিয়া ও আখিরাতের সমস্যা সমাধান করেন।',textEn:'Whoever resolves a difficulty for his brother, Allah resolves his difficulties in this world and the next.',sourceBn:'ইমাম সাদিক (আ.) — উসুলে কাফি',sourceEn:'Imam Sadiq (AS) — Usul al-Kafi'},
    {textBn:'আমাদের ভালোবাসা কথায় নয়, হৃদয়ে এবং কাজে।',textEn:'Love for us is not in words, but in the heart and in deeds.',sourceBn:'ইমাম সাদিক (আ.) — বিহারুল আনোয়ার',sourceEn:'Imam Sadiq (AS) — Bihar al-Anwar'},
    {textBn:'নামাজের মধ্যে আল্লাহর সাথে কথা বলো যেন তুমি তাঁকে দেখতে পাচ্ছো।',textEn:'In prayer, speak to Allah as though you can see Him.',sourceBn:'ইমাম সাদিক (আ.) — উসুলে কাফি',sourceEn:'Imam Sadiq (AS) — Usul al-Kafi'},
    {textBn:'প্রতিবেশীর সাথে ভালো ব্যবহার করা ঈমানের অংশ।',textEn:'Good treatment of neighbors is part of faith.',sourceBn:'ইমাম সাদিক (আ.) — উসুলে কাফি',sourceEn:'Imam Sadiq (AS) — Usul al-Kafi'},

    // ── ইমাম মুসা কাযিম (আ.) ──
    {textBn:'আল্লাহর কাছে কৃতজ্ঞতা প্রকাশ করো যা তিনি দিয়েছেন তার জন্য, এবং তাঁর কাছে ক্ষমা চাও যা তুমি ভুলে গেছো তার জন্য।',textEn:'Give thanks to Allah for what He has given you, and seek forgiveness for what you have neglected.',sourceBn:'ইমাম কাযিম (আ.) — তুহাফুল উকুল',sourceEn:'Imam Kadhim (AS) — Tuhaf al-Uqul'},
    {textBn:'বুদ্ধিমান ব্যক্তি সেই যে নিজের ইচ্ছাকে আল্লাহর ইচ্ছার অধীনে রাখে।',textEn:'The wise man is he who submits his desires to the will of Allah.',sourceBn:'ইমাম কাযিম (আ.) — তুহাফুল উকুল',sourceEn:'Imam Kadhim (AS) — Tuhaf al-Uqul'},

    // ── ইমাম রেযা (আ.) ──
    {textBn:'ঈমান হলো হৃদয়ের স্বীকৃতি, মুখের ঘোষণা এবং অঙ্গ-প্রত্যঙ্গের আমল।',textEn:'Faith is acknowledgment of the heart, declaration of the tongue, and action of the limbs.',sourceBn:'ইমাম রেযা (আ.) — উয়ুনে আখবারির রেযা',sourceEn:'Imam Ridha (AS) — Uyun Akhbar al-Ridha'},
    {textBn:'যে ব্যক্তি সালাওয়াত পাঠ করে তার গুনাহ মাফ হয় যদিও তা পাহাড়ের মতো বড় হয়।',textEn:'Whoever sends Salawat, his sins are forgiven even if they are as great as mountains.',sourceBn:'ইমাম রেযা (আ.) — বিহারুল আনোয়ার',sourceEn:'Imam Ridha (AS) — Bihar al-Anwar'},
];

const quizQuestions = [
    {qBn:'ইমাম হোসাইন (আ.) কোথায় শহীদ হন?',qEn:'Where was Imam Hussain (AS) martyred?',options:[{bn:'মদিনা',en:'Medina'},{bn:'কারবালা',en:'Karbala'},{bn:'মক্কা',en:'Mecca'},{bn:'কুফা',en:'Kufa'}],correct:1},
    {qBn:'কুরআনে মোট কয়টি সূরা আছে?',qEn:'How many Surahs are in the Quran?',options:[{bn:'১১৪',en:'114'},{bn:'১২০',en:'120'},{bn:'১১০',en:'110'},{bn:'১০০',en:'100'}],correct:0},
    {qBn:'আহলে বাইতের ইমামের সংখ্যা কত?',qEn:'How many Imams are there in Ahl al-Bayt?',options:[{bn:'১০',en:'10'},{bn:'১১',en:'11'},{bn:'১২',en:'12'},{bn:'১৩',en:'13'}],correct:2},
    {qBn:'দোয়ায়ে কুমাইল কে শিক্ষা দেন?',qEn:'Who taught Dua Kumayl?',options:[{bn:'ইমাম হোসাইন (আ.)',en:'Imam Hussain (AS)'},{bn:'ইমাম আলী (আ.)',en:'Imam Ali (AS)'},{bn:'ইমাম সাজ্জাদ (আ.)',en:'Imam Sajjad (AS)'},{bn:'ইমাম সাদিক (আ.)',en:'Imam Sadiq (AS)'}],correct:1},
    {qBn:'আশুরা কোন তারিখে পালিত হয়?',qEn:'On what date is Ashura observed?',options:[{bn:'১ মুহাররম',en:'1 Muharram'},{bn:'৫ মুহাররম',en:'5 Muharram'},{bn:'১০ মুহাররম',en:'10 Muharram'},{bn:'১৫ মুহাররম',en:'15 Muharram'}],correct:2},
    {qBn:'কোন ইমাম সবচেয়ে কম বয়সে ইমামত লাভ করেন?',qEn:'Which Imam became Imam at the youngest age?',options:[{bn:'ইমাম হাদি (আ.)',en:'Imam Hadi (AS)'},{bn:'ইমাম জওয়াদ (আ.)',en:'Imam Jawad (AS)'},{bn:'ইমাম আসকারি (আ.)',en:'Imam Askari (AS)'},{bn:'ইমাম মাহদি (আ.)',en:'Imam Mahdi (AS)'}],correct:1},
    {qBn:'ইসলামের পাঁচটি স্তম্ভের একটি হলো?',qEn:'One of the five pillars of Islam is?',options:[{bn:'তাফসীর',en:'Tafsir'},{bn:'রোজা',en:'Fasting'},{bn:'জিহাদ',en:'Jihad'},{bn:'তাওয়াফ',en:'Tawaf'}],correct:1},
    {qBn:'সাহিফায়ে সাজ্জাদিয়্যা কে রচনা করেন?',qEn:'Who authored Sahifa al-Sajjadiyya?',options:[{bn:'ইমাম বাকির (আ.)',en:'Imam Baqir (AS)'},{bn:'ইমাম সাজ্জাদ (আ.)',en:'Imam Sajjad (AS)'},{bn:'ইমাম আলী (আ.)',en:'Imam Ali (AS)'},{bn:'ইমাম সাদিক (আ.)',en:'Imam Sadiq (AS)'}],correct:1},
    {qBn:'কারবালার যুদ্ধ কোন হিজরিতে হয়?',qEn:'In which Hijri year did Battle of Karbala take place?',options:[{bn:'৪১ হিজরি',en:'41 AH'},{bn:'৫০ হিজরি',en:'50 AH'},{bn:'৬১ হিজরি',en:'61 AH'},{bn:'৭০ হিজরি',en:'70 AH'}],correct:2},
    {qBn:'নাহজুল বালাগা কার বক্তৃতার সংকলন?',qEn:'Nahjul Balagha is a collection of speeches of whom?',options:[{bn:'ইমাম হাসান (আ.)',en:'Imam Hasan (AS)'},{bn:'ইমাম আলী (আ.)',en:'Imam Ali (AS)'},{bn:'রাসূলুল্লাহ (সা.)',en:'Prophet Muhammad (SAW)'},{bn:'ইমাম সাদিক (আ.)',en:'Imam Sadiq (AS)'}],correct:1},
];

const tasbeehLabels = [
    {bn:'সুবহানআল্লাহ',en:'SubhanAllah',arabic:'سُبْحَانَ اللّهِ',target:33},
    {bn:'আলহামদুলিল্লাহ',en:'Alhamdulillah',arabic:'الحَمْدُ لِلَّهِ',target:33},
    {bn:'আল্লাহু আকবার',en:'Allahu Akbar',arabic:'اللَّهُ أَكْبَرُ',target:34},
    {bn:'লা ইলাহা ইল্লাল্লাহ',en:'La ilaha illAllah',arabic:'لَا إِلٰهَ إِلَّا اللّهُ',target:100},
    {bn:'আস্তাগফিরুল্লাহ',en:'Astaghfirullah',arabic:'أَسْتَغْفِرُ اللّهَ',target:100},
    {bn:'সালাওয়াত',en:'Salawat',arabic:'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ',target:100},
];


// ============================================================================
// DAILY AYAH DATA
// ============================================================================
const dailyAyahs = [
    // ── সূরা ফাতিহা (১) ──
    {arabic:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',ref:'সূরা ফাতিহা: ১',refEn:'Surah Al-Fatihah: 1',meaningBn:'পরম করুণাময় অতি দয়ালু আল্লাহর নামে।',meaningEn:'In the name of Allah, the Most Gracious, the Most Merciful.'},
    {arabic:'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',ref:'সূরা ফাতিহা: ২',refEn:'Surah Al-Fatihah: 2',meaningBn:'সকল প্রশংসা আল্লাহর জন্য, যিনি সমস্ত জগতের রব।',meaningEn:'All praise is due to Allah, Lord of all the worlds.'},
    {arabic:'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',ref:'সূরা ফাতিহা: ৫',refEn:'Surah Al-Fatihah: 5',meaningBn:'আমরা শুধু তোমারই ইবাদত করি এবং শুধু তোমার কাছেই সাহায্য চাই।',meaningEn:'You alone we worship, and You alone we ask for help.'},
    // ── সূরা বাকারা (২) ──
    {arabic:'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ',ref:'সূরা বাকারা: ২',refEn:'Surah Al-Baqarah: 2',meaningBn:'এই কিতাব — এতে কোনো সন্দেহ নেই; মুত্তাকিদের জন্য পথনির্দেশ।',meaningEn:'This is the Book about which there is no doubt, a guidance for those conscious of Allah.'},
    {arabic:'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',ref:'সূরা বাকারা: ৪৫',refEn:'Surah Al-Baqarah: 45',meaningBn:'ধৈর্য ও নামাজের মাধ্যমে সাহায্য প্রার্থনা করো।',meaningEn:'Seek help through patience and prayer.'},
    {arabic:'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',ref:'সূরা বাকারা: ১৫২',refEn:'Surah Al-Baqarah: 152',meaningBn:'সুতরাং আমাকে স্মরণ করো, আমি তোমাদের স্মরণ করব; এবং আমার কৃতজ্ঞতা আদায় করো, অকৃতজ্ঞ হয়ো না।',meaningEn:'So remember Me; I will remember you. And be grateful to Me and do not deny Me.'},
    {arabic:'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',ref:'সূরা বাকারা: ১৫৩',refEn:'Surah Al-Baqarah: 153',meaningBn:'নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সাথে আছেন।',meaningEn:'Indeed, Allah is with the patient.'},
    {arabic:'وَلَنَبْلُوَنَّكُم بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ',ref:'সূরা বাকারা: ১৫৫',refEn:'Surah Al-Baqarah: 155',meaningBn:'আমি অবশ্যই তোমাদের পরীক্ষা করব ভয়, ক্ষুধা এবং সম্পদ, জীবন ও ফল-ফসলের ক্ষতির মাধ্যমে।',meaningEn:'And We will surely test you with something of fear and hunger and a loss of wealth, lives, and fruits.'},
    {arabic:'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',ref:'সূরা বাকারা: ২৫৫ (আয়াতুল কুরসি)',refEn:'Surah Al-Baqarah: 255 (Ayatul Kursi)',meaningBn:'আল্লাহ — তিনি ছাড়া কোনো উপাস্য নেই, তিনি চিরজীবন্ত, সর্বসত্তার ধারক।',meaningEn:'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence.'},
    {arabic:'لَا إِكْرَاهَ فِي الدِّينِ',ref:'সূরা বাকারা: ২৫৬',refEn:'Surah Al-Baqarah: 256',meaningBn:'দ্বীনের ব্যাপারে কোনো জবরদস্তি নেই।',meaningEn:'There is no compulsion in religion.'},
    // ── সূরা আলে ইমরান (৩) ──
    {arabic:'إِنَّ الدِّينَ عِندَ اللَّهِ الْإِسْلَامُ',ref:'সূরা আলে ইমরান: ১৯',refEn:'Surah Aal-e-Imran: 19',meaningBn:'নিশ্চয়ই আল্লাহর কাছে গ্রহণযোগ্য দ্বীন হলো ইসলাম।',meaningEn:'Indeed, the religion in the sight of Allah is Islam.'},
    {arabic:'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا',ref:'সূরা আলে ইমরান: ১০৩',refEn:'Surah Aal-e-Imran: 103',meaningBn:'এবং তোমরা সবাই মিলে আল্লাহর রশি শক্তভাবে ধরো এবং বিভক্ত হয়ো না।',meaningEn:'And hold firmly to the rope of Allah all together and do not become divided.'},
    {arabic:'إِنَّمَا وَلِيُّكُمُ اللَّهُ وَرَسُولُهُ وَالَّذِينَ آمَنُوا',ref:'সূরা মায়িদা: ৫৫',refEn:'Surah Al-Maidah: 55',meaningBn:'তোমাদের অভিভাবক কেবল আল্লাহ, তাঁর রাসূল এবং মুমিনগণ।',meaningEn:'Your ally is none but Allah and His Messenger and those who have believed.'},
    // ── সূরা নিসা (৪) ──
    {arabic:'يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُم مِّن نَّفْسٍ وَاحِدَةٍ',ref:'সূরা নিসা: ১',refEn:'Surah An-Nisa: 1',meaningBn:'হে মানবজাতি! তোমাদের রবকে ভয় করো যিনি তোমাদের এক সত্তা থেকে সৃষ্টি করেছেন।',meaningEn:'O mankind, fear your Lord, who created you from one soul.'},
    {arabic:'إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا',ref:'সূরা নিসা: ১',refEn:'Surah An-Nisa: 1',meaningBn:'নিশ্চয়ই আল্লাহ তোমাদের উপর সতর্ক পর্যবেক্ষক।',meaningEn:'Indeed, Allah is ever watching over you.'},
    // ── সূরা মায়িদা (৫) ──
    {arabic:'الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِي',ref:'সূরা মায়িদা: ৩',refEn:'Surah Al-Maidah: 3',meaningBn:'আজ আমি তোমাদের জন্য তোমাদের দ্বীন পরিপূর্ণ করলাম এবং তোমাদের উপর আমার নিয়ামত সম্পূর্ণ করলাম।',meaningEn:'Today I have perfected for you your religion and completed My favor upon you.'},
    {arabic:'وَمَن يَتَوَلَّ اللَّهَ وَرَسُولَهُ وَالَّذِينَ آمَنُوا فَإِنَّ حِزْبَ اللَّهِ هُمُ الْغَالِبُونَ',ref:'সূরা মায়িদা: ৫৬',refEn:'Surah Al-Maidah: 56',meaningBn:'যে আল্লাহ, তাঁর রাসূল এবং মুমিনদের বন্ধু হিসেবে গ্রহণ করবে — তাহলে নিশ্চয়ই আল্লাহর দল বিজয়ী।',meaningEn:'Whoever takes Allah, His Messenger, and the believers as allies — indeed, the party of Allah will be victorious.'},
    // ── সূরা আনআম (৬) ──
    {arabic:'قُلْ إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ الْعَالَمِينَ',ref:'সূরা আনআম: ১৬২',refEn:'Surah Al-Anam: 162',meaningBn:'বলুন, নিশ্চয়ই আমার নামাজ, আমার কুরবানি, আমার জীবন এবং আমার মৃত্যু — সবই আল্লাহর জন্য, যিনি সমস্ত জগতের রব।',meaningEn:'Say: My prayer, my rites, my living and my dying are for Allah, Lord of all the worlds.'},
    // ── সূরা আরাফ (৭) ──
    {arabic:'إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ',ref:'সূরা আরাফ: ৫৬',refEn:'Surah Al-Araf: 56',meaningBn:'নিশ্চয়ই আল্লাহর রহমত সৎকর্মশীলদের নিকটে।',meaningEn:'Indeed, the mercy of Allah is near to the doers of good.'},
    {arabic:'وَادْعُوهُ خَوْفًا وَطَمَعًا',ref:'সূরা আরাফ: ৫৬',refEn:'Surah Al-Araf: 56',meaningBn:'এবং ভয় ও আশা নিয়ে তাঁকে ডাকো।',meaningEn:'And call upon Him in fear and aspiration.'},
    // ── সূরা তওবা (৯) ──
    {arabic:'إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوا وَّالَّذِينَ هُم مُّحْسِنُونَ',ref:'সূরা তওবা: ১২৩',refEn:'Surah At-Tawbah: 123',meaningBn:'নিশ্চয়ই আল্লাহ তাদের সাথে আছেন যারা তাকওয়াবান এবং যারা সৎকর্মশীল।',meaningEn:'Indeed, Allah is with those who are righteous and those who do good.'},
    // ── সূরা ইউনুস (১০) ──
    {arabic:'أَلَا إِنَّ أَوْلِيَاءَ اللَّهِ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ',ref:'সূরা ইউনুস: ৬২',refEn:'Surah Yunus: 62',meaningBn:'জেনে রাখো, আল্লাহর বন্ধুদের কোনো ভয় নেই এবং তারা দুঃখিত হবে না।',meaningEn:'Unquestionably, [for] the allies of Allah there will be no fear concerning them, nor will they grieve.'},
    // ── সূরা হুদ (১১) ──
    {arabic:'وَإِلَى اللَّهِ تُرْجَعُ الْأُمُورُ',ref:'সূরা হুদ: ১২৩',refEn:'Surah Hud: 123',meaningBn:'এবং সকল বিষয় আল্লাহর দিকেই ফিরে যায়।',meaningEn:'And to Allah all matters are returned.'},
    // ── সূরা ইউসুফ (১২) ──
    {arabic:'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ ۖ إِنَّهُ لَا يَيْأَسُ مِن رَّوْحِ اللَّهِ إِلَّا الْقَوْمُ الْكَافِرُونَ',ref:'সূরা ইউসুফ: ৮৭',refEn:'Surah Yusuf: 87',meaningBn:'এবং আল্লাহর রহমত থেকে নিরাশ হয়ো না। নিশ্চয়ই কাফির ছাড়া কেউ আল্লাহর রহমত থেকে নিরাশ হয় না।',meaningEn:'Do not despair of the mercy of Allah. Indeed, no one despairs of the mercy of Allah except the disbelieving people.'},
    {arabic:'إِنَّهُ مَن يَتَّقِ وَيَصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ',ref:'সূরা ইউসুফ: ৯০',refEn:'Surah Yusuf: 90',meaningBn:'যে তাকওয়া অবলম্বন করে এবং ধৈর্য ধারণ করে — নিশ্চয়ই আল্লাহ সৎকর্মশীলদের প্রতিদান নষ্ট করেন না।',meaningEn:'Indeed, whoever fears Allah and is patient — then indeed, Allah does not allow to be lost the reward of those who do good.'},
    // ── সূরা রাদ (১৩) ──
    {arabic:'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ',ref:'সূরা রাদ: ১১',refEn:'Surah Ar-Rad: 11',meaningBn:'নিশ্চয়ই আল্লাহ কোনো জাতির অবস্থা পরিবর্তন করেন না যতক্ষণ না তারা নিজেদের পরিবর্তন করে।',meaningEn:'Indeed, Allah will not change the condition of a people until they change what is in themselves.'},
    {arabic:'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',ref:'সূরা রাদ: ২৮',refEn:'Surah Ar-Rad: 28',meaningBn:'জেনে রাখো, আল্লাহর স্মরণেই হৃদয় প্রশান্ত হয়।',meaningEn:'Verily, in the remembrance of Allah do hearts find rest.'},
    // ── সূরা ইবরাহিম (১৪) ──
    {arabic:'وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ',ref:'সূরা ইবরাহিম: ৭',refEn:'Surah Ibrahim: 7',meaningBn:'এবং স্মরণ করো যখন তোমাদের রব ঘোষণা করলেন: তোমরা কৃতজ্ঞ হলে আমি অবশ্যই তোমাদের আরো বাড়িয়ে দেব।',meaningEn:'If you are grateful, I will surely increase you in favor.'},
    // ── সূরা হিজর (১৫) ──
    {arabic:'نَبِّئْ عِبَادِي أَنِّي أَنَا الْغَفُورُ الرَّحِيمُ',ref:'সূরা হিজর: ৪৯',refEn:'Surah Al-Hijr: 49',meaningBn:'আমার বান্দাদের জানিয়ে দাও যে আমি অবশ্যই ক্ষমাশীল, পরম দয়ালু।',meaningEn:'Inform My servants that it is I who am the Forgiving, the Merciful.'},
    // ── সূরা নাহল (১৬) ──
    {arabic:'إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ',ref:'সূরা নাহল: ৯০',refEn:'Surah An-Nahl: 90',meaningBn:'নিশ্চয়ই আল্লাহ ন্যায়বিচার ও সৎকর্মের আদেশ দেন।',meaningEn:'Indeed, Allah orders justice and good conduct.'},
    // ── সূরা বনি ইসরাইল (১৭) ──
    {arabic:'وَقُل رَّبِّ زِدْنِي عِلْمًا',ref:'সূরা বনি ইসরাইল: ৮৫',refEn:'Surah Al-Isra: 85',meaningBn:'এবং বলো: হে আমার রব! আমার জ্ঞান বাড়িয়ে দাও।',meaningEn:'And say: My Lord, increase me in knowledge.'},
    // ── সূরা কাহফ (১৮) ──
    {arabic:'وَلَا تَقُولَنَّ لِشَيْءٍ إِنِّي فَاعِلٌ ذَٰلِكَ غَدًا إِلَّا أَن يَشَاءَ اللَّهُ',ref:'সূরা কাহফ: ২৩-২৪',refEn:'Surah Al-Kahf: 23-24',meaningBn:'কোনো বিষয়ে কখনো বলো না যে আমি আগামীকাল এটা করব, তবে আল্লাহ যদি চান।',meaningEn:'And never say of anything, "Indeed, I will do that tomorrow," except when adding, "If Allah wills."'},
    {arabic:'إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ كَانَتْ لَهُمْ جَنَّاتُ الْفِرْدَوْسِ نُزُلًا',ref:'সূরা কাহফ: ১০৭',refEn:'Surah Al-Kahf: 107',meaningBn:'যারা ঈমান আনে ও সৎকর্ম করে, তাদের জন্য আতিথেয়তাস্বরূপ থাকবে ফিরদাউসের জান্নাত।',meaningEn:'Indeed, those who believe and do righteous deeds — they will have the Gardens of Paradise as a lodging.'},
    // ── সূরা মারিয়াম (১৯) ──
    {arabic:'وَاذْكُر رَّبَّكَ كَثِيرًا وَسَبِّحْ بِالْعَشِيِّ وَالْإِبْكَارِ',ref:'সূরা আলে ইমরান: ৪১',refEn:'Surah Aal-e-Imran: 41',meaningBn:'এবং তোমার রবকে অধিক স্মরণ করো এবং সন্ধ্যায় ও ভোরে তাঁর পবিত্রতা বর্ণনা করো।',meaningEn:'And remember your Lord much and exalt Him morning and afternoon.'},
    // ── সূরা তোয়াহা (২০) ──
    {arabic:'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',ref:'সূরা তোয়াহা: ২৫-২৬',refEn:'Surah Ta-Ha: 25-26',meaningBn:'হে আমার রব! আমার বুক প্রশস্ত করো এবং আমার কাজ সহজ করো।',meaningEn:'My Lord, expand for me my breast and ease for me my task.'},
    // ── সূরা আম্বিয়া (২১) ──
    {arabic:'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ',ref:'সূরা আম্বিয়া: ১০৭',refEn:'Surah Al-Anbiya: 107',meaningBn:'এবং আমি তোমাকে বিশ্বজগতের জন্য রহমতস্বরূপ পাঠিয়েছি।',meaningEn:'And We have not sent you except as a mercy to the worlds.'},
    {arabic:'لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',ref:'সূরা আম্বিয়া: ৮৭',refEn:'Surah Al-Anbiya: 87',meaningBn:'তুমি ছাড়া কোনো উপাস্য নেই; তুমি পবিত্র। নিশ্চয়ই আমি সীমালঙ্ঘনকারীদের অন্তর্ভুক্ত।',meaningEn:'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.'},
    // ── সূরা হজ্ব (২২) ──
    {arabic:'وَبَشِّرِ الصَّابِرِينَ',ref:'সূরা বাকারা: ১৫৫',refEn:'Surah Al-Baqarah: 155',meaningBn:'এবং ধৈর্যশীলদের সুসংবাদ দাও।',meaningEn:'And give good tidings to the patient.'},
    // ── সূরা নুর (২৪) ──
    {arabic:'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ',ref:'সূরা নুর: ৩৫',refEn:'Surah An-Nur: 35',meaningBn:'আল্লাহ আকাশ ও পৃথিবীর আলো।',meaningEn:'Allah is the Light of the heavens and the earth.'},
    // ── সূরা ফুরকান (২৫) ──
    {arabic:'وَعِبَادُ الرَّحْمَٰنِ الَّذِينَ يَمْشُونَ عَلَى الْأَرْضِ هَوْنًا',ref:'সূরা ফুরকান: ৬৩',refEn:'Surah Al-Furqan: 63',meaningBn:'রহমানের বান্দারা হলো তারা যারা পৃথিবীতে বিনম্রভাবে চলে।',meaningEn:'The servants of the Most Merciful are those who walk upon the earth humbly.'},
    // ── সূরা শুআরা (২৬) ──
    {arabic:'وَلَا تُخْزِنِي يَوْمَ يُبْعَثُونَ',ref:'সূরা শুআরা: ৮৭',refEn:'Surah Ash-Shuara: 87',meaningBn:'এবং যেদিন পুনরুত্থান হবে সেদিন আমাকে লজ্জিত করো না।',meaningEn:'And do not disgrace me on the Day they are resurrected.'},
    // ── সূরা নামল (২৭) ──
    {arabic:'أَمَّن يُجِيبُ الْمُضْطَرَّ إِذَا دَعَاهُ وَيَكْشِفُ السُّوءَ',ref:'সূরা নামল: ৬২',refEn:'Surah An-Naml: 62',meaningBn:'কে বিপদগ্রস্তের ডাকে সাড়া দেন যখন সে ডাকে এবং বিপদ দূর করেন?',meaningEn:'Is He not who responds to the desperate one when he calls upon Him and removes evil?'},
    // ── সূরা কাসাস (২৮) ──
    {arabic:'وَابْتَغِ فِيمَا آتَاكَ اللَّهُ الدَّارَ الْآخِرَةَ',ref:'সূরা কাসাস: ৭৭',refEn:'Surah Al-Qasas: 77',meaningBn:'আল্লাহ তোমাকে যা দিয়েছেন তা দিয়ে আখিরাতের গৃহ অনুসন্ধান করো।',meaningEn:'Seek, through that which Allah has given you, the home of the Hereafter.'},
    // ── সূরা আনকাবুত (২৯) ──
    {arabic:'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا',ref:'সূরা আনকাবুত: ৬৯',refEn:'Surah Al-Ankabut: 69',meaningBn:'যারা আমার পথে সংগ্রাম করে, আমি অবশ্যই তাদের আমার পথ দেখাব।',meaningEn:'Those who strive for Us — We will surely guide them to Our ways.'},
    // ── সূরা রুম (৩০) ──
    {arabic:'فَسُبْحَانَ اللَّهِ حِينَ تُمْسُونَ وَحِينَ تُصْبِحُونَ',ref:'সূরা রুম: ১৭',refEn:'Surah Ar-Rum: 17',meaningBn:'সুতরাং তোমরা আল্লাহর পবিত্রতা বর্ণনা করো সন্ধ্যায় এবং সকালে।',meaningEn:'So exalt Allah when you reach the evening and when you reach the morning.'},
    // ── সূরা লুকমান (৩১) ──
    {arabic:'وَمَن يُسْلِمْ وَجْهَهُ إِلَى اللَّهِ وَهُوَ مُحْسِنٌ فَقَدِ اسْتَمْسَكَ بِالْعُرْوَةِ الْوُثْقَىٰ',ref:'সূরা লুকমান: ২২',refEn:'Surah Luqman: 22',meaningBn:'যে সৎকর্মশীল হয়ে আল্লাহর কাছে নিজেকে সমর্পণ করে, সে মজবুত রশি আঁকড়ে ধরে।',meaningEn:'Whoever submits his face to Allah while being a doer of good has grasped the most trustworthy handhold.'},
    // ── সূরা সাজদা (৩২) ──
    {arabic:'إِنَّمَا يُؤْمِنُ بِآيَاتِنَا الَّذِينَ إِذَا ذُكِّرُوا بِهَا خَرُّوا سُجَّدًا',ref:'সূরা সাজদা: ১৫',refEn:'Surah As-Sajdah: 15',meaningBn:'আমাদের আয়াতে কেবল তারাই ঈমান আনে, যখন এগুলো দিয়ে স্মরণ করানো হয় তারা সিজদায় লুটিয়ে পড়ে।',meaningEn:'Only those believe in Our verses who, when they are reminded by them, fall down in prostration.'},
    // ── সূরা আহযাব (৩৩) ──
    {arabic:'إِنَّمَا يُرِيدُ اللَّهُ لِيُذْهِبَ عَنكُمُ الرِّجْسَ أَهْلَ الْبَيْتِ وَيُطَهِّرَكُمْ تَطْهِيرًا',ref:'সূরা আহযাব: ৩৩ (আয়াতে তাতহির)',refEn:'Surah Al-Ahzab: 33 (Ayah of Purification)',meaningBn:'হে আহলে বাইত! আল্লাহ শুধু চান তোমাদের থেকে অপবিত্রতা দূর করতে এবং তোমাদের সম্পূর্ণরূপে পবিত্র করতে।',meaningEn:'Allah intends only to remove from you the impurity, O people of the household, and to purify you with extensive purification.'},
    {arabic:'يَا أَيُّهَا النَّبِيُّ قُل لِّأَزْوَاجِكَ وَبَنَاتِكَ وَنِسَاءِ الْمُؤْمِنِينَ',ref:'সূরা আহযাব: ৫৯',refEn:'Surah Al-Ahzab: 59',meaningBn:'হে নবী! তোমার স্ত্রীদের, কন্যাদের এবং মুমিন নারীদের বলো।',meaningEn:'O Prophet, tell your wives and your daughters and the women of the believers to draw their cloaks close.'},
    // ── সূরা সাবা (৩৪) ──
    {arabic:'قُلْ إِنَّ رَبِّي يَبْسُطُ الرِّزْقَ لِمَن يَشَاءُ وَيَقْدِرُ',ref:'সূরা সাবা: ৩৬',refEn:'Surah Saba: 36',meaningBn:'বলুন, নিশ্চয়ই আমার রব যার জন্য চান রিজিক প্রশস্ত করেন এবং সংকুচিত করেন।',meaningEn:'Say: Indeed, my Lord extends provision for whom He wills and restricts it.'},
    // ── সূরা ফাতির (৩৫) ──
    {arabic:'يَا أَيُّهَا النَّاسُ أَنتُمُ الْفُقَرَاءُ إِلَى اللَّهِ ۖ وَاللَّهُ هُوَ الْغَنِيُّ الْحَمِيدُ',ref:'সূরা ফাতির: ১৫',refEn:'Surah Fatir: 15',meaningBn:'হে মানুষ! তোমরাই আল্লাহর মুখাপেক্ষী; আর আল্লাহ — তিনিই অভাবমুক্ত, প্রশংসিত।',meaningEn:'O mankind, you are those in need of Allah, while Allah is the Free of need, the Praiseworthy.'},
    // ── সূরা ইয়াসিন (৩৬) ──
    {arabic:'إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا أَن يَقُولَ لَهُ كُن فَيَكُونُ',ref:'সূরা ইয়াসিন: ৮২',refEn:'Surah Ya-Sin: 82',meaningBn:'তাঁর বিষয় তো এই যে, তিনি যখন কোনো কিছু করতে চান তখন বলেন "হও" — আর তা হয়ে যায়।',meaningEn:'His command is only when He intends a thing that He says to it, "Be," and it is.'},
    {arabic:'سُبْحَانَ الَّذِي بِيَدِهِ مَلَكُوتُ كُلِّ شَيْءٍ وَإِلَيْهِ تُرْجَعُونَ',ref:'সূরা ইয়াসিন: ৮৩',refEn:'Surah Ya-Sin: 83',meaningBn:'পবিত্র তিনি যাঁর হাতে সবকিছুর রাজত্ব এবং তাঁর দিকেই তোমরা ফিরে যাবে।',meaningEn:'Exalted is He in whose hand is the realm of all things, and to Him you will be returned.'},
    // ── সূরা সাফফাত (৩৭) ──
    {arabic:'وَإِنَّ جُندَنَا لَهُمُ الْغَالِبُونَ',ref:'সূরা সাফফাত: ১৭৩',refEn:'Surah As-Saffat: 173',meaningBn:'এবং নিশ্চয়ই আমার বাহিনীই বিজয়ী হবে।',meaningEn:'And indeed, Our soldiers will be those who overcome.'},
    // ── সূরা যুমার (৩৯) ──
    {arabic:'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ',ref:'সূরা যুমার: ৫৩',refEn:'Surah Az-Zumar: 53',meaningBn:'বলুন: হে আমার বান্দারা যারা নিজেদের উপর সীমালঙ্ঘন করেছো, আল্লাহর রহমত থেকে নিরাশ হয়ো না।',meaningEn:'Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah.'},
    // ── সূরা মুমিন/গাফির (৪০) ──
    {arabic:'ادْعُونِي أَسْتَجِبْ لَكُمْ',ref:'সূরা গাফির: ৬০',refEn:'Surah Ghafir: 60',meaningBn:'আমাকে ডাকো, আমি তোমাদের সাড়া দেব।',meaningEn:'Call upon Me; I will respond to you.'},
    // ── সূরা ফুসিলাত (৪১) ──
    {arabic:'إِنَّ الَّذِينَ قَالُوا رَبُّنَا اللَّهُ ثُمَّ اسْتَقَامُوا تَتَنَزَّلُ عَلَيْهِمُ الْمَلَائِكَةُ',ref:'সূরা ফুসিলাত: ৩০',refEn:'Surah Fussilat: 30',meaningBn:'যারা বলে আমাদের রব আল্লাহ, তারপর অটল থাকে — তাদের কাছে ফেরেশতা নাযিল হয়।',meaningEn:'Indeed, those who say "Our Lord is Allah" and then remain on the right course, the angels will descend upon them.'},
    // ── সূরা শুরা (৪২) ──
    {arabic:'قُل لَّا أَسْأَلُكُمْ عَلَيْهِ أَجْرًا إِلَّا الْمَوَدَّةَ فِي الْقُرْبَىٰ',ref:'সূরা শুরা: ২৩ (আয়াতে মাওয়াদ্দাত)',refEn:'Surah Ash-Shura: 23 (Ayah of Mawaddah)',meaningBn:'বলুন: আমি এর জন্য তোমাদের কাছে কোনো পারিশ্রমিক চাই না, শুধু নিকটাত্মীয়দের প্রতি ভালোবাসা ছাড়া।',meaningEn:'Say: I ask of you no payment for this message except affection for my nearest kin.'},
    // ── সূরা যুখরুফ (৪৩) ──
    {arabic:'وَإِنَّهُ لَذِكْرٌ لَّكَ وَلِقَوْمِكَ ۖ وَسَوْفَ تُسْأَلُونَ',ref:'সূরা যুখরুফ: ৪৪',refEn:'Surah Az-Zukhruf: 44',meaningBn:'এবং নিশ্চয়ই এটি তোমার ও তোমার সম্প্রদায়ের জন্য উপদেশ; এবং তোমরা অবশ্যই জিজ্ঞাসিত হবে।',meaningEn:'And indeed, it is a reminder for you and your people, and you will be questioned.'},
    // ── সূরা দুখান (৪৪) ──
    {arabic:'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةٍ مُّبَارَكَةٍ',ref:'সূরা দুখান: ৩',refEn:'Surah Ad-Dukhan: 3',meaningBn:'নিশ্চয়ই আমি এটি এক বরকতময় রাতে নাযিল করেছি।',meaningEn:'Indeed, We sent it down during a blessed night.'},
    // ── সূরা জাসিয়া (৪৫) ──
    {arabic:'مَن عَمِلَ صَالِحًا فَلِنَفْسِهِ ۖ وَمَنْ أَسَاءَ فَعَلَيْهَا',ref:'সূরা জাসিয়া: ১৫',refEn:'Surah Al-Jathiyah: 15',meaningBn:'যে সৎকর্ম করে সে তার নিজের জন্যই করে; এবং যে মন্দ করে তার ক্ষতি তার নিজেরই।',meaningEn:'Whoever does good, it is for himself; and whoever does evil, it is against himself.'},
    // ── সূরা ফাতহ (৪৮) ──
    {arabic:'هُوَ الَّذِي أَنزَلَ السَّكِينَةَ فِي قُلُوبِ الْمُؤْمِنِينَ',ref:'সূরা ফাতহ: ৪',refEn:'Surah Al-Fath: 4',meaningBn:'তিনিই মুমিনদের হৃদয়ে প্রশান্তি নাযিল করেন।',meaningEn:'It is He who sent down tranquillity into the hearts of the believers.'},
    // ── সূরা হুজুরাত (৪৯) ──
    {arabic:'يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا',ref:'সূরা হুজুরাত: ১৩',refEn:'Surah Al-Hujurat: 13',meaningBn:'হে মানুষ! আমি তোমাদের পুরুষ ও নারী থেকে সৃষ্টি করেছি এবং তোমাদের বিভিন্ন জাতি ও গোত্রে বিভক্ত করেছি যাতে তোমরা একে অপরকে চিনতে পারো।',meaningEn:'O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another.'},
    {arabic:'إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ',ref:'সূরা হুজুরাত: ১৩',refEn:'Surah Al-Hujurat: 13',meaningBn:'নিশ্চয়ই আল্লাহর কাছে তোমাদের মধ্যে সবচেয়ে মর্যাদাবান সেই যে সবচেয়ে বেশি মুত্তাকি।',meaningEn:'Indeed, the most noble of you in the sight of Allah is the most righteous of you.'},
    // ── সূরা কাফ (৫০) ──
    {arabic:'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ',ref:'সূরা কাফ: ১৬',refEn:'Surah Qaf: 16',meaningBn:'এবং আমরা তার ঘাড়ের শিরার চেয়েও তার নিকটে।',meaningEn:'And We are closer to him than his jugular vein.'},
    // ── সূরা যারিয়াত (৫১) ──
    {arabic:'وَمَا خَلَقْتُ الْجِنَّ وَالْإِنسَ إِلَّا لِيَعْبُدُونِ',ref:'সূরা যারিয়াত: ৫৬',refEn:'Surah Adh-Dhariyat: 56',meaningBn:'আমি জিন ও মানুষকে কেবল আমার ইবাদতের জন্যই সৃষ্টি করেছি।',meaningEn:'I did not create the jinn and mankind except to worship Me.'},
    // ── সূরা রহমান (৫৫) ──
    {arabic:'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',ref:'সূরা রহমান: ১৩',refEn:'Surah Ar-Rahman: 13',meaningBn:'সুতরাং তোমরা উভয়ে তোমাদের রবের কোন কোন নিয়ামতকে অস্বীকার করবে?',meaningEn:'So which of the favors of your Lord would you deny?'},
    // ── সূরা হাদিদ (৫৭) ──
    {arabic:'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ بَصِيرٌ',ref:'সূরা হাদিদ: ৪',refEn:'Surah Al-Hadid: 4',meaningBn:'এবং তোমরা যেখানেই থাকো, তিনি তোমাদের সাথে আছেন; এবং তোমরা যা করো আল্লাহ তা দেখেন।',meaningEn:'And He is with you wherever you are, and Allah sees what you do.'},
    // ── সূরা মুজাদালা (৫৮) ──
    {arabic:'إِنَّ الَّذِينَ يُحَادُّونَ اللَّهَ وَرَسُولَهُ أُولَٰئِكَ فِي الْأَذَلِّينَ',ref:'সূরা মুজাদালা: ২০',refEn:'Surah Al-Mujadilah: 20',meaningBn:'যারা আল্লাহ ও তাঁর রাসূলের বিরুদ্ধে যায় তারা সবচেয়ে লাঞ্ছিতদের মধ্যে থাকবে।',meaningEn:'Those who oppose Allah and His Messenger — those are among the most humbled.'},
    // ── সূরা হাশর (৫৯) ──
    {arabic:'هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ ۖ عَالِمُ الْغَيْبِ وَالشَّهَادَةِ',ref:'সূরা হাশর: ২২',refEn:'Surah Al-Hashr: 22',meaningBn:'তিনি আল্লাহ যিনি ছাড়া কোনো উপাস্য নেই; দৃশ্য ও অদৃশ্যের জ্ঞানী।',meaningEn:'He is Allah, other than whom there is no deity, Knower of the unseen and the witnessed.'},
    {arabic:'هُوَ اللَّهُ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ ۖ لَهُ الْأَسْمَاءُ الْحُسْنَىٰ',ref:'সূরা হাশর: ২৪',refEn:'Surah Al-Hashr: 24',meaningBn:'তিনি আল্লাহ, স্রষ্টা, উদ্ভাবক, রূপদাতা। তাঁর রয়েছে সুন্দরতম নামসমূহ।',meaningEn:'He is Allah, the Creator, the Inventor, the Fashioner. To Him belong the best names.'},
    // ── সূরা জুমুআ (৬২) ──
    {arabic:'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا نُودِيَ لِلصَّلَاةِ مِن يَوْمِ الْجُمُعَةِ فَاسْعَوْا إِلَىٰ ذِكْرِ اللَّهِ',ref:'সূরা জুমুআ: ৯',refEn:'Surah Al-Jumuah: 9',meaningBn:'হে মুমিনগণ! জুমুআর দিনে যখন নামাজের জন্য আহ্বান করা হয় তখন আল্লাহর স্মরণের দিকে দ্রুত চলো।',meaningEn:'O you who believe! When the call to prayer is made on Friday, hasten to the remembrance of Allah.'},
    // ── সূরা তাগাবুন (৬৪) ──
    {arabic:'وَمَن يُؤْمِن بِاللَّهِ يَهْدِ قَلْبَهُ',ref:'সূরা তাগাবুন: ১১',refEn:'Surah At-Taghabun: 11',meaningBn:'এবং যে আল্লাহর প্রতি ঈমান আনে, তিনি তার হৃদয় সঠিক পথে পরিচালিত করেন।',meaningEn:'Whoever believes in Allah, He will guide his heart.'},
    // ── সূরা তালাক (৬৫) ──
    {arabic:'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',ref:'সূরা তালাক: ২',refEn:'Surah At-Talaq: 2',meaningBn:'যে আল্লাহকে ভয় করে, তিনি তার জন্য পথ বের করে দেন।',meaningEn:'Whoever fears Allah, He will make for him a way out.'},
    {arabic:'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',ref:'সূরা তালাক: ৩',refEn:'Surah At-Talaq: 3',meaningBn:'যে আল্লাহর উপর ভরসা করে, তার জন্য আল্লাহই যথেষ্ট।',meaningEn:'And whoever relies upon Allah — then He is sufficient for him.'},
    // ── সূরা তাহরিম (৬৬) ──
    {arabic:'يَا أَيُّهَا الَّذِينَ آمَنُوا تُوبُوا إِلَى اللَّهِ تَوْبَةً نَّصُوحًا',ref:'সূরা তাহরিম: ৮',refEn:'Surah At-Tahrim: 8',meaningBn:'হে মুমিনগণ! তোমরা আল্লাহর কাছে খালেস তওবা করো।',meaningEn:'O you who believe, repent to Allah with sincere repentance.'},
    // ── সূরা মুলক (৬৭) ──
    {arabic:'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',ref:'সূরা মুলক: ১',refEn:'Surah Al-Mulk: 1',meaningBn:'বরকতময় তিনি যাঁর হাতে রাজত্ব এবং তিনি সবকিছুর উপর শক্তিমান।',meaningEn:'Blessed is He in whose hand is dominion, and He is over all things competent.'},
    {arabic:'أَلَا يَعْلَمُ مَنْ خَلَقَ وَهُوَ اللَّطِيفُ الْخَبِيرُ',ref:'সূরা মুলক: ১৪',refEn:'Surah Al-Mulk: 14',meaningBn:'যিনি সৃষ্টি করেছেন, তিনি কি জানেন না? তিনি সূক্ষ্মদর্শী, সর্বজ্ঞ।',meaningEn:'Does He who created not know, while He is the Subtle, the Acquainted?'},
    // ── সূরা কলম (৬৮) ──
    {arabic:'وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ',ref:'সূরা কলম: ৪',refEn:'Surah Al-Qalam: 4',meaningBn:'এবং নিশ্চয়ই তুমি মহান চরিত্রের অধিকারী।',meaningEn:'And indeed, you are of a great moral character.'},
    // ── সূরা হাক্কা (৬৯) ──
    {arabic:'فَسَبِّحْ بِاسْمِ رَبِّكَ الْعَظِيمِ',ref:'সূরা ওয়াকিআ: ৯৬',refEn:'Surah Al-Waqiah: 96',meaningBn:'সুতরাং তোমার মহান রবের নামে পবিত্রতা বর্ণনা করো।',meaningEn:'So exalt the name of your Lord, the Most Great.'},
    // ── সূরা মাআরিজ (৭০) ──
    {arabic:'إِنَّ الْإِنسَانَ خُلِقَ هَلُوعًا',ref:'সূরা মাআরিজ: ১৯',refEn:'Surah Al-Maarij: 19',meaningBn:'নিশ্চয়ই মানুষকে অস্থিরমনা করে সৃষ্টি করা হয়েছে।',meaningEn:'Indeed, mankind was created anxious.'},
    // ── সূরা নুহ (৭১) ──
    {arabic:'مِّمَّا خَطِيئَاتِهِمْ أُغْرِقُوا فَأُدْخِلُوا نَارًا',ref:'সূরা নুহ: ২৫',refEn:'Surah Nuh: 25',meaningBn:'তাদের পাপের কারণে তাদের ডুবানো হয়েছিল, অতঃপর আগুনে প্রবেশ করানো হয়।',meaningEn:'Because of their sins they were drowned and put into the Fire.'},
    // ── সূরা জিন (৭২) ──
    {arabic:'وَأَنَّ الْمَسَاجِدَ لِلَّهِ فَلَا تَدْعُوا مَعَ اللَّهِ أَحَدًا',ref:'সূরা জিন: ১৮',refEn:'Surah Al-Jinn: 18',meaningBn:'এবং মসজিদগুলো আল্লাহর জন্য; সুতরাং আল্লাহর সাথে অন্য কাউকে ডেকো না।',meaningEn:'And the masjids are for Allah, so do not invoke anyone along with Allah.'},
    // ── সূরা মুযযাম্মিল (৭৩) ──
    {arabic:'وَاذْكُرِ اسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًا',ref:'সূরা মুযযাম্মিল: ৮',refEn:'Surah Al-Muzzammil: 8',meaningBn:'এবং তোমার রবের নাম স্মরণ করো এবং সম্পূর্ণভাবে তাঁর প্রতি নিবেদিত হও।',meaningEn:'And remember the name of your Lord and devote yourself to Him with complete devotion.'},
    // ── সূরা ইনসান (৭৬) ──
    {arabic:'إِنَّ هَٰذِهِ تَذْكِرَةٌ ۖ فَمَن شَاءَ اتَّخَذَ إِلَىٰ رَبِّهِ سَبِيلًا',ref:'সূরা ইনসান: ২৯',refEn:'Surah Al-Insan: 29',meaningBn:'নিশ্চয়ই এটি একটি উপদেশ; সুতরাং যে চায় সে তার রবের পথ অবলম্বন করুক।',meaningEn:'Indeed, this is a reminder, so whoever wills may take to his Lord a way.'},
    // ── সূরা নাযিয়াত (৭৯) ──
    {arabic:'فَأَمَّا مَن طَغَىٰ وَآثَرَ الْحَيَاةَ الدُّنْيَا فَإِنَّ الْجَحِيمَ هِيَ الْمَأْوَىٰ',ref:'সূরা নাযিয়াত: ৩৭-৩৯',refEn:'Surah An-Naziat: 37-39',meaningBn:'যে সীমালঙ্ঘন করেছে এবং দুনিয়ার জীবনকে প্রাধান্য দিয়েছে — জাহান্নামই তার আবাস।',meaningEn:'As for he who transgressed and preferred the life of the world — then indeed, Hellfire will be the refuge.'},
    // ── সূরা ইনফিতার (৮২) ──
    {arabic:'يَا أَيُّهَا الْإِنسَانُ مَا غَرَّكَ بِرَبِّكَ الْكَرِيمِ',ref:'সূরা ইনফিতার: ৬',refEn:'Surah Al-Infitar: 6',meaningBn:'হে মানুষ! কোন জিনিস তোমাকে তোমার মহান রব সম্পর্কে প্রতারিত করেছে?',meaningEn:'O mankind, what has deceived you concerning your Lord, the Generous?'},
    // ── সূরা মুতাফফিফিন (৮৩) ──
    {arabic:'كَلَّا إِنَّ كِتَابَ الْأَبْرَارِ لَفِي عِلِّيِّينَ',ref:'সূরা মুতাফফিফিন: ১৮',refEn:'Surah Al-Mutaffifin: 18',meaningBn:'কখনো না! নিশ্চয়ই সৎকর্মশীলদের আমলনামা ইল্লিয়্যিনে আছে।',meaningEn:'No! Indeed, the record of the righteous is in Illiyyun.'},
    // ── সূরা ইনশিকাক (৮৪) ──
    {arabic:'يَا أَيُّهَا الْإِنسَانُ إِنَّكَ كَادِحٌ إِلَىٰ رَبِّكَ كَدْحًا فَمُلَاقِيهِ',ref:'সূরা ইনশিকাক: ৬',refEn:'Surah Al-Inshiqaq: 6',meaningBn:'হে মানুষ! তুমি তোমার রবের দিকে কঠোর পরিশ্রম করে চলেছো এবং তুমি তাঁর সাথে মিলিত হবে।',meaningEn:'O mankind, indeed you are laboring toward your Lord with exertion and will meet Him.'},
    // ── সূরা গাশিয়া (৮৮) ──
    {arabic:'إِنَّ إِلَيْنَا إِيَابَهُمْ ثُمَّ إِنَّ عَلَيْنَا حِسَابَهُمْ',ref:'সূরা গাশিয়া: ২৫-২৬',refEn:'Surah Al-Ghashiyah: 25-26',meaningBn:'নিশ্চয়ই তাদের প্রত্যাবর্তন আমার কাছে, তারপর অবশ্যই তাদের হিসাব আমারই দায়িত্ব।',meaningEn:'Indeed, to Us is their return. Then indeed, upon Us is their account.'},
    // ── সূরা ফজর (৮৯) ──
    {arabic:'يَا أَيَّتُهَا النَّفْسُ الْمُطْمَئِنَّةُ ارْجِعِي إِلَىٰ رَبِّكِ رَاضِيَةً مَّرْضِيَّةً',ref:'সূরা ফজর: ২৭-২৮',refEn:'Surah Al-Fajr: 27-28',meaningBn:'হে প্রশান্ত আত্মা! ফিরে যাও তোমার রবের কাছে সন্তুষ্ট হয়ে, সন্তুষ্টি লাভ করে।',meaningEn:'O reassured soul, return to your Lord, well-pleased and pleasing to Him.'},
    // ── সূরা শামস (৯১) ──
    {arabic:'قَدْ أَفْلَحَ مَن زَكَّاهَا وَقَدْ خَابَ مَن دَسَّاهَا',ref:'সূরা শামস: ৯-১০',refEn:'Surah Ash-Shams: 9-10',meaningBn:'সফল হয়েছে সে যে নিজেকে পরিশুদ্ধ করেছে এবং ব্যর্থ হয়েছে সে যে নিজেকে কলুষিত করেছে।',meaningEn:'Successful is the one who purifies it, and failed is the one who corrupts it.'},
    // ── সূরা লাইল (৯২) ──
    {arabic:'وَمَا يُغْنِي عَنْهُ مَالُهُ إِذَا تَرَدَّىٰ',ref:'সূরা লাইল: ১১',refEn:'Surah Al-Layl: 11',meaningBn:'যখন সে ধ্বংস হবে তখন তার সম্পদ কোনো কাজে আসবে না।',meaningEn:'And what will his wealth avail him when he falls?'},
    // ── সূরা দুহা (৯৩) ──
    {arabic:'وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ',ref:'সূরা দুহা: ১১',refEn:'Surah Ad-Duha: 11',meaningBn:'এবং তোমার রবের নিয়ামতের কথা বর্ণনা করো।',meaningEn:'And proclaim the blessing of your Lord.'},
    // ── সূরা ইনশিরাহ (৯৪) ──
    {arabic:'إِنَّ مَعَ الْعُسْرِ يُسْرًا',ref:'সূরা ইনশিরাহ: ৬',refEn:'Surah Al-Inshirah: 6',meaningBn:'নিশ্চয়ই কষ্টের সাথে রয়েছে সহজ।',meaningEn:'Indeed, with hardship will be ease.'},
    // ── সূরা আলাক (৯৬) ──
    {arabic:'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',ref:'সূরা আলাক: ১',refEn:'Surah Al-Alaq: 1',meaningBn:'পড়ো তোমার রবের নামে যিনি সৃষ্টি করেছেন।',meaningEn:'Read in the name of your Lord who created.'},
    // ── সূরা কাদর (৯৭) ──
    {arabic:'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ',ref:'সূরা কাদর: ১',refEn:'Surah Al-Qadr: 1',meaningBn:'নিশ্চয়ই আমি এটি লাইলাতুল কাদরে নাযিল করেছি।',meaningEn:'Indeed, We sent it down during the Night of Decree.'},
    {arabic:'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ',ref:'সূরা কাদর: ৩',refEn:'Surah Al-Qadr: 3',meaningBn:'কদরের রাত হাজার মাসের চেয়ে উত্তম।',meaningEn:'The Night of Decree is better than a thousand months.'},
    // ── সূরা যিলযাল (৯৯) ──
    {arabic:'فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ',ref:'সূরা যিলযাল: ৭',refEn:'Surah Az-Zalzalah: 7',meaningBn:'সুতরাং যে অণু পরিমাণ ভালো কাজ করবে সে তা দেখবে।',meaningEn:'So whoever does an atom\'s weight of good will see it.'},
    {arabic:'وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ شَرًّا يَرَهُ',ref:'সূরা যিলযাল: ৮',refEn:'Surah Az-Zalzalah: 8',meaningBn:'এবং যে অণু পরিমাণ মন্দ কাজ করবে সে তাও দেখবে।',meaningEn:'And whoever does an atom\'s weight of evil will see it.'},
    // ── সূরা আদিয়াত (১০০) ──
    {arabic:'إِنَّ الْإِنسَانَ لِرَبِّهِ لَكَنُودٌ',ref:'সূরা আদিয়াত: ৬',refEn:'Surah Al-Adiyat: 6',meaningBn:'নিশ্চয়ই মানুষ তার রবের প্রতি অকৃতজ্ঞ।',meaningEn:'Indeed mankind, to his Lord, is ungrateful.'},
    // ── সূরা আসর (১০৩) ──
    {arabic:'وَالْعَصْرِ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ',ref:'সূরা আসর: ১-২',refEn:'Surah Al-Asr: 1-2',meaningBn:'সময়ের শপথ! নিশ্চয়ই মানুষ ক্ষতিগ্রস্ত।',meaningEn:'By time, indeed, mankind is in loss.'},
    // ── সূরা হুমাযা (১০৪) ──
    {arabic:'وَيْلٌ لِّكُلِّ هُمَزَةٍ لُّمَزَةٍ',ref:'সূরা হুমাযা: ১',refEn:'Surah Al-Humazah: 1',meaningBn:'প্রত্যেক পরনিন্দাকারী ও দোষান্বেষীর জন্য দুর্ভোগ।',meaningEn:'Woe to every scorner and mocker.'},
    // ── সূরা কাওসার (১০৮) ──
    {arabic:'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',ref:'সূরা কাওসার: ১',refEn:'Surah Al-Kawthar: 1',meaningBn:'নিশ্চয়ই আমি তোমাকে কাওসার দিয়েছি।',meaningEn:'Indeed, We have granted you the Kawthar.'},
    // ── সূরা কাফিরুন (১০৯) ──
    {arabic:'لَكُمْ دِينُكُمْ وَلِيَ دِينِ',ref:'সূরা কাফিরুন: ৬',refEn:'Surah Al-Kafirun: 6',meaningBn:'তোমাদের দ্বীন তোমাদের জন্য এবং আমার দ্বীন আমার জন্য।',meaningEn:'For you is your religion, and for me is my religion.'},
    // ── সূরা নাসর (১১০) ──
    {arabic:'إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ',ref:'সূরা নাসর: ১',refEn:'Surah An-Nasr: 1',meaningBn:'যখন আল্লাহর সাহায্য ও বিজয় আসবে।',meaningEn:'When the victory of Allah has come and the conquest.'},
    // ── সূরা ইখলাস (১১২) ──
    {arabic:'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ',ref:'সূরা ইখলাস: ১-২',refEn:'Surah Al-Ikhlas: 1-2',meaningBn:'বলুন: তিনি আল্লাহ, এক। আল্লাহ অমুখাপেক্ষী।',meaningEn:'Say: He is Allah, One. Allah, the Eternal Refuge.'},
    {arabic:'لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',ref:'সূরা ইখলাস: ৩-৪',refEn:'Surah Al-Ikhlas: 3-4',meaningBn:'তিনি জন্ম দেননি এবং জন্মগ্রহণ করেননি এবং তাঁর সমতুল্য কেউ নেই।',meaningEn:'He neither begets nor is born, nor is there to Him any equivalent.'},
    // ── সূরা ফালাক (১১৩) ──
    {arabic:'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',ref:'সূরা ফালাক: ১',refEn:'Surah Al-Falaq: 1',meaningBn:'বলুন: আমি আশ্রয় নিচ্ছি প্রভাতের রবের।',meaningEn:'Say: I seek refuge in the Lord of daybreak.'},
    // ── সূরা নাস (১১৪) ──
    {arabic:'قُلْ أَعُوذُ بِرَبِّ النَّاسِ مَلِكِ النَّاسِ إِلَٰهِ النَّاسِ',ref:'সূরা নাস: ১-৩',refEn:'Surah An-Nas: 1-3',meaningBn:'বলুন: আমি আশ্রয় নিচ্ছি মানুষের রব, মানুষের মালিক, মানুষের উপাস্যের।',meaningEn:'Say: I seek refuge in the Lord of mankind, the King of mankind, the God of mankind.'},
];
function getDailyAyah() {
    const pool = (state.customAyahs && state.customAyahs.length > 0) ? state.customAyahs : dailyAyahs;
    // Manual browse mode (Next/Prev বোতামে ক্লিক করলে)
    if (state.ayahIndex >= 0) return pool[state.ayahIndex % pool.length];
    // Date-based daily rotation: প্রতিদিন স্বয়ংক্রিয়ভাবে নতুন আয়াত
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    return pool[dayOfYear % pool.length];
}
function getAyahPoolSize() {
    return ((state.customAyahs && state.customAyahs.length > 0) ? state.customAyahs : dailyAyahs).length;
}
function getHadithPoolSize() {
    return ((state.customHadiths && state.customHadiths.length > 0) ? state.customHadiths : hadiths).length;
}
function getDailyHadith() {
    const pool = (state.customHadiths && state.customHadiths.length > 0) ? state.customHadiths : hadiths;
    // Manual browse mode (Next/Prev বোতামে ক্লিক করলে)
    if (state.hadithIndex > 0) return pool[state.hadithIndex % pool.length];
    // Date-based daily rotation: প্রতিদিন স্বয়ংক্রিয়ভাবে নতুন হাদিস
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    return pool[dayOfYear % pool.length];
}

// ============================================================================
// ASMAUL HUSNA DATA (99 Names)
// ============================================================================
const asmaulHusna = [
    {num:1,arabic:'الرَّحْمَنُ',name:'Ar-Rahman',meaning:'পরম দয়ালু',meaningEn:'The Most Gracious'},
    {num:2,arabic:'الرَّحِيمُ',name:'Ar-Rahim',meaning:'অতি মেহেরবান',meaningEn:'The Most Merciful'},
    {num:3,arabic:'الْمَلِكُ',name:'Al-Malik',meaning:'সার্বভৌম মালিক',meaningEn:'The King'},
    {num:4,arabic:'الْقُدُّوسُ',name:'Al-Quddus',meaning:'পূত-পবিত্র',meaningEn:'The Most Holy'},
    {num:5,arabic:'السَّلَامُ',name:'As-Salam',meaning:'শান্তিদাতা',meaningEn:'The Source of Peace'},
    {num:6,arabic:'الْمُؤْمِنُ',name:'Al-Mu\'min',meaning:'নিরাপত্তাদাতা',meaningEn:'The Inspirer of Faith'},
    {num:7,arabic:'الْمُهَيْمِنُ',name:'Al-Muhaymin',meaning:'রক্ষণাবেক্ষণকারী',meaningEn:'The Guardian'},
    {num:8,arabic:'الْعَزِيزُ',name:'Al-Aziz',meaning:'পরাক্রমশালী',meaningEn:'The Mighty'},
    {num:9,arabic:'الْجَبَّارُ',name:'Al-Jabbar',meaning:'মহাপরাক্রান্ত',meaningEn:'The Compeller'},
    {num:10,arabic:'الْمُتَكَبِّرُ',name:'Al-Mutakabbir',meaning:'মহৎ',meaningEn:'The Greatest'},
    {num:11,arabic:'الْخَالِقُ',name:'Al-Khaliq',meaning:'স্রষ্টা',meaningEn:'The Creator'},
    {num:12,arabic:'الْبَارِئُ',name:'Al-Bari\'',meaning:'উদ্ভাবনকারী',meaningEn:'The Originator'},
    {num:13,arabic:'الْمُصَوِّرُ',name:'Al-Musawwir',meaning:'রূপদাতা',meaningEn:'The Fashioner'},
    {num:14,arabic:'الْغَفَّارُ',name:'Al-Ghaffar',meaning:'ক্ষমাশীল',meaningEn:'The Forgiving'},
    {num:15,arabic:'الْقَهَّارُ',name:'Al-Qahhar',meaning:'পরম প্রভাবশালী',meaningEn:'The Subduer'},
    {num:16,arabic:'الْوَهَّابُ',name:'Al-Wahhab',meaning:'মহাদাতা',meaningEn:'The Bestower'},
    {num:17,arabic:'الرَّزَّاقُ',name:'Ar-Razzaq',meaning:'জীবিকাদাতা',meaningEn:'The Provider'},
    {num:18,arabic:'الْفَتَّاحُ',name:'Al-Fattah',meaning:'মহাবিজয়ী',meaningEn:'The Opener'},
    {num:19,arabic:'الْعَلِيمُ',name:'Al-Alim',meaning:'সর্বজ্ঞ',meaningEn:'The All-Knowing'},
    {num:20,arabic:'الْقَابِضُ',name:'Al-Qabid',meaning:'সংকোচকারী',meaningEn:'The Restrainer'},
    {num:21,arabic:'الْبَاسِطُ',name:'Al-Basit',meaning:'প্রশস্তকারী',meaningEn:'The Extender'},
    {num:22,arabic:'الْخَافِضُ',name:'Al-Khafid',meaning:'অবনমনকারী',meaningEn:'The Abaser'},
    {num:23,arabic:'الرَّافِعُ',name:'Al-Rafi\'',meaning:'উন্নয়নকারী',meaningEn:'The Exalter'},
    {num:24,arabic:'الْمُعِزُّ',name:'Al-Mu\'izz',meaning:'সম্মানদাতা',meaningEn:'The Honorer'},
    {num:25,arabic:'المُذِلُّ',name:'Al-Mudhill',meaning:'লাঞ্ছনাদাতা',meaningEn:'The Humiliator'},
    {num:26,arabic:'السَّمِيعُ',name:'As-Sami\'',meaning:'সর্বশ্রোতা',meaningEn:'The All-Hearing'},
    {num:27,arabic:'الْبَصِيرُ',name:'Al-Basir',meaning:'সর্বদ্রষ্টা',meaningEn:'The All-Seeing'},
    {num:28,arabic:'الْحَكَمُ',name:'Al-Hakam',meaning:'বিচারক',meaningEn:'The Judge'},
    {num:29,arabic:'الْعَدْلُ',name:'Al-Adl',meaning:'ন্যায়পরায়ণ',meaningEn:'The Just'},
    {num:30,arabic:'اللَّطِيفُ',name:'Al-Latif',meaning:'সূক্ষ্মদর্শী',meaningEn:'The Subtle One'},
    {num:31,arabic:'الْخَبِيرُ',name:'Al-Khabir',meaning:'সম্যকজ্ঞ',meaningEn:'The All-Aware'},
    {num:32,arabic:'الْحَلِيمُ',name:'Al-Halim',meaning:'সহনশীল',meaningEn:'The Forbearing'},
    {num:33,arabic:'الْعَظِيمُ',name:'Al-Azim',meaning:'সুমহান',meaningEn:'The Magnificent'},
    {num:34,arabic:'الْغَفُورُ',name:'Al-Ghafur',meaning:'বড় ক্ষমাকারী',meaningEn:'The Forgiving'},
    {num:35,arabic:'الشَّكُورُ',name:'Ash-Shakur',meaning:'গুণগ্রাহী',meaningEn:'The Appreciative'},
    {num:36,arabic:'الْعَلِيُّ',name:'Al-Ali',meaning:'সর্বোচ্চ',meaningEn:'The Most High'},
    {num:37,arabic:'الْكَبِيرُ',name:'Al-Kabir',meaning:'সুবৃহৎ',meaningEn:'The Greatest'},
    {num:38,arabic:'الْحَفِيظُ',name:'Al-Hafiz',meaning:'রক্ষণকারী',meaningEn:'The Preserver'},
    {num:39,arabic:'المُقيِت',name:'Al-Muqit',meaning:'পরিপোষক',meaningEn:'The Nourisher'},
    {num:40,arabic:'الْحسِيبُ',name:'Al-Hasib',meaning:'হিসাব গ্রহণকারী',meaningEn:'The Reckoner'},
    {num:41,arabic:'الْجَلِيلُ',name:'Al-Jalil',meaning:'মহামহিম',meaningEn:'The Majestic'},
    {num:42,arabic:'الْكَرِيمُ',name:'Al-Karim',meaning:'মহামান্য',meaningEn:'The Generous'},
    {num:43,arabic:'الرَّقِيبُ',name:'Al-Raqib',meaning:'পর্যবেক্ষক',meaningEn:'The Watchful'},
    {num:44,arabic:'الْمُجِيبُ',name:'Al-Mujib',meaning:'সাড়াদাতা',meaningEn:'The Responsive'},
    {num:45,arabic:'الْوَاسِعُ',name:'Al-Wasi\'',meaning:'প্রশস্ত',meaningEn:'The Vast'},
    {num:46,arabic:'الْحَكِيمُ',name:'Al-Hakim',meaning:'প্রজ্ঞাময়',meaningEn:'The Wise'},
    {num:47,arabic:'الْوَدُودُ',name:'Al-Wadud',meaning:'প্রেমময়',meaningEn:'The Loving'},
    {num:48,arabic:'الْمَجِيدُ',name:'Al-Majid',meaning:'গৌরবান্বিত',meaningEn:'The Glorious'},
    {num:49,arabic:'الْبَاعِثُ',name:'Al-Ba\'ith',meaning:'পুনরুত্থানকারী',meaningEn:'The Resurrector'},
    {num:50,arabic:'الشَّهِيدُ',name:'Ash-Shahid',meaning:'সর্বদ্রষ্টা সাক্ষী',meaningEn:'The Witness'},
    {num:51,arabic:'الْحَقُّ',name:'Al-Haqq',meaning:'পরম সত্য',meaningEn:'The Truth'},
    {num:52,arabic:'الْوَكِيلُ',name:'Al-Wakil',meaning:'উকিল',meaningEn:'The Trustee'},
    {num:53,arabic:'الْقَوِيُّ',name:'Al-Qawiyy',meaning:'মহাশক্তিমান',meaningEn:'The Powerful'},
    {num:54,arabic:'الْمَتِينُ',name:'Al-Matin',meaning:'অটল-দৃঢ়',meaningEn:'The Firm'},
    {num:55,arabic:'الْوَلِيُّ',name:'Al-Waliyy',meaning:'অভিভাবক',meaningEn:'The Friend'},
    {num:56,arabic:'الْحَمِيدُ',name:'Al-Hamid',meaning:'প্রশংসিত',meaningEn:'The Praiseworthy'},
    {num:57,arabic:'الْمُحْصِي',name:'Al-Muhsi',meaning:'হিসাবকারী',meaningEn:'The Accounter'},
    {num:58,arabic:'الْمُبْدِئُ',name:'Al-Mubdi\'',meaning:'সূচনাকারী',meaningEn:'The Originator'},
    {num:59,arabic:'الْمُعِيدُ',name:'Al-Mu\'id',meaning:'পুনরাবর্তনকারী',meaningEn:'The Restorer'},
    {num:60,arabic:'الْمُحْيِي',name:'Al-Muhyi',meaning:'জীবনদাতা',meaningEn:'The Life-Giver'},
    {num:61,arabic:'اَلْمُمِيتُ',name:'Al-Mumit',meaning:'মৃত্যুদাতা',meaningEn:'The Death-Giver'},
    {num:62,arabic:'الْحَيُّ',name:'Al-Hayy',meaning:'চিরঞ্জীব',meaningEn:'The Ever-Living'},
    {num:63,arabic:'الْقَيُّومُ',name:'Al-Qayyum',meaning:'স্বনির্ভর',meaningEn:'The Self-Subsisting'},
    {num:64,arabic:'الْوَاجِدُ',name:'Al-Wajid',meaning:'সন্ধানকারী',meaningEn:'The Finder'},
    {num:65,arabic:'الْمَاجِدُ',name:'Al-Majid',meaning:'মহিমান্বিত',meaningEn:'The Noble'},
    {num:66,arabic:'الْواحِدُ',name:'Al-Wahid',meaning:'একক',meaningEn:'The Unique'},
    {num:67,arabic:'اَلاَحَدُ',name:'Al-Ahad',meaning:'একমাত্র',meaningEn:'The One'},
    {num:68,arabic:'الصَّمَدُ',name:'As-Samad',meaning:'অমুখাপেক্ষী',meaningEn:'The Eternal'},
    {num:69,arabic:'الْقَادِرُ',name:'Al-Qadir',meaning:'সর্বশক্তিমান',meaningEn:'The Capable'},
    {num:70,arabic:'الْمُقْتَدِرُ',name:'Al-Muqtadir',meaning:'পরম ক্ষমতাবান',meaningEn:'The Powerful'},
    {num:71,arabic:'الْمُقَدِّمُ',name:'Al-Muqaddim',meaning:'অগ্রগামীকারী',meaningEn:'The Expediter'},
    {num:72,arabic:'الْمُؤَخِّرُ',name:'Al-Mu\'akhkhir',meaning:'বিলম্বকারী',meaningEn:'The Delayer'},
    {num:73,arabic:'الأوَّلُ',name:'Al-Awwal',meaning:'প্রথম',meaningEn:'The First'},
    {num:74,arabic:'الآخِرُ',name:'Al-Akhir',meaning:'শেষ',meaningEn:'The Last'},
    {num:75,arabic:'الظَّاهِرُ',name:'Az-Zahir',meaning:'প্রকাশ্য',meaningEn:'The Manifest'},
    {num:76,arabic:'الْبَاطِنُ',name:'Al-Batin',meaning:'অপ্রকাশ্য',meaningEn:'The Hidden'},
    {num:77,arabic:'الْوَالِي',name:'Al-Wali',meaning:'শাসক',meaningEn:'The Governor'},
    {num:78,arabic:'الْمُتَعَالِي',name:'Al-Muta\'ali',meaning:'পরম উচ্চ',meaningEn:'The Exalted'},
    {num:79,arabic:'الْبَرُّ',name:'Al-Barr',meaning:'সদাচারী',meaningEn:'The Source of Goodness'},
    {num:80,arabic:'التَّوَّابُ',name:'At-Tawwab',meaning:'তওবা গ্রহণকারী',meaningEn:'The Acceptor of Repentance'},
    {num:81,arabic:'الْمُنْتَقِمُ',name:'Al-Muntaqim',meaning:'প্রতিশোধকারী',meaningEn:'The Avenger'},
    {num:82,arabic:'العَفُوُّ',name:'Al-Afuww',meaning:'ক্ষমাকারী',meaningEn:'The Pardoner'},
    {num:83,arabic:'الرَّؤُوفُ',name:'Ar-Ra\'uf',meaning:'অত্যন্ত দয়ালু',meaningEn:'The Compassionate'},
    {num:84,arabic:'مَالِكُ الْمُلْكِ',name:'Malik Al-Mulk',meaning:'সার্বভৌম রাজ্যের মালিক',meaningEn:'Owner of Sovereignty'},
    {num:85,arabic:'ذُوالْجَلاَلِ وَالإكْرَامِ',name:'Dhul-Jalal wal-Ikram',meaning:'মহিমা ও সম্মানের অধিকারী',meaningEn:'Lord of Majesty and Bounty'},
    {num:86,arabic:'الْمُقْسِطُ',name:'Al-Muqsit',meaning:'ন্যায়বিচারক',meaningEn:'The Equitable'},
    {num:87,arabic:'الْجَامِعُ',name:'Al-Jami\'',meaning:'একত্রকারী',meaningEn:'The Gatherer'},
    {num:88,arabic:'الْغَنِيُّ',name:'Al-Ghani',meaning:'অমুখাপেক্ষী',meaningEn:'The Self-Sufficient'},
    {num:89,arabic:'الْمُغْنِي',name:'Al-Mughni',meaning:'সম্পদশালীকারী',meaningEn:'The Enricher'},
    {num:90,arabic:'اَلْمَانِعُ',name:'Al-Mani\'',meaning:'বাধাদানকারী',meaningEn:'The Preventer'},
    {num:91,arabic:'الضَّارَّ',name:'Ad-Darr',meaning:'ক্ষতিদানকারী',meaningEn:'The Distresser'},
    {num:92,arabic:'النَّافِعُ',name:'An-Nafi\'',meaning:'উপকারকারী',meaningEn:'The Benefiter'},
    {num:93,arabic:'النُّورُ',name:'An-Nur',meaning:'জ্যোতি',meaningEn:'The Light'},
    {num:94,arabic:'الْهَادِي',name:'Al-Hadi',meaning:'পথপ্রদর্শক',meaningEn:'The Guide'},
    {num:95,arabic:'الْبَدِيعُ',name:'Al-Badi\'',meaning:'অনুপম সৃষ্টিকর্তা',meaningEn:'The Incomparable'},
    {num:96,arabic:'اَلْبَاقِي',name:'Al-Baqi',meaning:'চিরস্থায়ী',meaningEn:'The Ever-Enduring'},
    {num:97,arabic:'الْوَارِثُ',name:'Al-Warith',meaning:'উত্তরাধিকারী',meaningEn:'The Inheritor'},
    {num:98,arabic:'الرَّشِيدُ',name:'Ar-Rashid',meaning:'সৎপথে পরিচালনাকারী',meaningEn:'The Guide to Right Path'},
    {num:99,arabic:'الصَّبُورُ',name:'As-Sabur',meaning:'ধৈর্যশীল',meaningEn:'The Patient'},
];
// ============================================================================
// STATIC DATA
// ============================================================================
// ✓ blogPosts moved to blog.js




const hijriMonthsBn = ['মুহাররম','সফর','রবিউল আউয়াল','রবিউস সানি','জামাদিউল আউয়াল','জামাদিউস সানি','রজব','শাবান','রমজান','শাওয়াল','জিলক্বদ','জিলহজ'];
const hijriMonthsEn = ['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Awwal','Jumada al-Thani','Rajab','Shaban','Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah'];
const hijriEvents = {
    // ── মুহাররম (মাস ১) ──
    '1-1' :{bn:'হিজরি নববর্ষ 🌙',en:'Islamic New Year 🌙',type:'special'},
    '1-7' :{bn:'🔴 মুহাররম — ইমাম হোসাইন (আ.) শিবিরে পানি বন্ধ',en:'🔴 Muharram — Water blocked to Imam Hussain (AS) camp',type:'ashura'},
    '1-10':{bn:'🔴 আশুরা — ইমাম হোসাইন (আ.)-এর শাহাদাত দিবস',en:'🔴 Ashura — Imam Hussain (AS) Martyrdom Day',type:'ashura'},
    '1-25':{bn:'🕊️ ইমাম সাজ্জাদ (আ.) শাহাদাত দিবস — ২৫ মুহাররম ৯৫ হি.',en:'🕊️ Imam Sajjad (AS) Martyrdom Day — 25 Muharram 95 AH',type:'martyrdom'},

    // ── সফর (মাস ২) ──
    '2-1' :{bn:'ইমাম সাজ্জাদ (আ.) ও বন্দিরা কারবালা ছাড়েন',en:'Imam Sajjad (AS) & captives leave Karbala',type:'martyrdom'},
    '2-17':{bn:'🕊️ ইমাম রেজা (আ.) শাহাদাত দিবস — ১৭ সফর ২০৩ হি.',en:'🕊️ Imam Ridha (AS) Martyrdom Day — 17 Safar 203 AH',type:'martyrdom'},
    '2-20':{bn:'🌹 চেহলুম — আরবাঈন — ইমাম হোসাইন (আ.) চল্লিশতম দিন',en:'🌹 Chehlum — Arbaeen — 40th day of Imam Hussain (AS)',type:'martyrdom'},
    // ✅ FIX: '2-7' (ভুল — বর্ণনায় ছিল "২৮ সফর") মুছে '2-28' এ দুটো ঘটনা একত্রে
    '2-28':{bn:'🕊️ রাসূলুল্লাহ (সা.) ও ইমাম হাসান (আ.) শাহাদাত দিবস — ২৮ সফর',en:'🕊️ Prophet Muhammad (SAW) & Imam Hasan (AS) Martyrdom — 28 Safar',type:'martyrdom'},

    // ── রবিউল আউয়াল (মাস ৩) ──
    '3-8' :{bn:'🕊️ ইমাম হাসান আসকারি (আ.) শাহাদাত দিবস — ৮ রবিউল আউয়াল ২৬০ হি.',en:'🕊️ Imam Hasan al-Askari (AS) Martyrdom Day — 8 Rabi al-Awwal 260 AH',type:'martyrdom'},
    '3-12':{bn:'ঈদে মিলাদুন্নবী (সা.) — রাসূলের জন্মদিন 🌸',en:'Mawlid al-Nabi — Prophet\'s Birthday 🌸',type:'eid'},
    '3-17':{bn:'ইমাম সাদিক (আ.) জন্মদিন 🌟 — ১৭ রবিউল আউয়াল ৮৩ হি.',en:'Imam Sadiq (AS) Birthday 🌟 — 17 Rabi al-Awwal 83 AH',type:'birth'},

    // ── রবিউস সানি (মাস ৪) ──
    '4-3' :{bn:'🕊️ ইমাম হাদি (আ.) শাহাদাত দিবস — ৩ রজব ২৫৪ হি.',en:'🕊️ Imam Hadi (AS) Martyrdom Day — 3 Rajab 254 AH',type:'martyrdom'},

    // ── জমাদিউল আউয়াল (মাস ৫) ──
    '5-25':{bn:'🕊️ ইমাম কাযিম (আ.) শাহাদাত দিবস — ২৫ রজব ১৮৩ হি.',en:'🕊️ Imam Kazim (AS) Martyrdom Day — 25 Rajab 183 AH',type:'martyrdom'},

    // ── জমাদিউল আখিরা (মাস ৬) ──
    '6-3' :{bn:'🌹 ফাতেমা যাহরা (আ.) শাহাদাত দিবস — ৩ জমাদিউল আখিরা ১১ হি.',en:'🌹 Fatima al-Zahra (AS) Martyrdom Day — 3 Jumada al-Thani 11 AH',type:'martyrdom'},
    '6-20':{bn:'ফাতেমা যাহরা (আ.) জন্মদিন 🌷 — ২০ জমাদিউল আখিরা ৫ বি.হি.',en:'Fatima al-Zahra (AS) Birthday 🌷 — 20 Jumada al-Thani 5 BH',type:'birth'},

    // ── রজব (মাস ৭) ──
    // ✅ FIX: '7-3' (ভুল মাস — ইমাম সাজ্জাদ শাহাদাত মুহাররমে, '1-25' এ আছে) বাদ দেওয়া হয়েছে
    // ✅ FIX: '7-7' ডুপ্লিকেট — একটাই রাখা হয়েছে (mixed: কাযিম জন্ম + বাকির শাহাদাত)
    '7-7' :{bn:'ইমাম কাযিম (আ.) জন্মদিন 🌸 / ইমাম বাকির (আ.) শাহাদাত দিবস 🕊️ — ৭ রজব',en:'Imam Kazim (AS) Birthday 🌸 / Imam Baqir (AS) Martyrdom 🕊️ — 7 Rajab',type:'mixed'},
    '7-13':{bn:'ইমাম আলী (আ.) জন্মদিন 🦁 — ১৩ রজব ৩০ বি.হি.',en:'Imam Ali (AS) Birthday 🦁 — 13 Rajab 30 BH',type:'birth'},
    '7-27':{bn:'শবে মেরাজ ✨',en:'Laylat al-Miraj ✨',type:'special'},
    // ✅ FIX: '7-28' (ভুল — ইমাম হাসান শাহাদাত সফরে, '2-28' এ সংযুক্ত) বাদ দেওয়া হয়েছে

    // ── শাবান (মাস ৮) ──
    '8-3' :{bn:'ইমাম হোসাইন (আ.) জন্মদিন 🌸 — ৩ শাবান ৪ হি.',en:'Imam Hussain (AS) Birthday 🌸 — 3 Shaban 4 AH',type:'birth'},
    '8-10':{bn:'ইমাম হাসান আসকারি (আ.) জন্মদিন 🌟 — ১০ রবিউল আউয়াল ২৩২ হি.',en:'Imam Askari (AS) Birthday 🌟 — 10 Rabi al-Awwal 232 AH',type:'birth'},
    '8-15':{bn:'নিমে শাবান — ইমাম মাহদি (আ.) জন্মদিন 🌙 — ১৫ শাবান ২৫৫ হি.',en:'Mid-Shaban — Imam Mahdi (AS) Birthday 🌙 — 15 Shaban 255 AH',type:'birth'},

    // ── রমজান (মাস ৯) ──
    '9-1' :{bn:'রমজান শুরু 🌙',en:'Ramadan begins 🌙',type:'special'},
    // ✅ FIX: '3-15' (ভুল মাস — বর্ণনায় "১৫ রমাযান") → সঠিক key '9-15'
    '9-15':{bn:'ইমাম হাসান (আ.) জন্মদিন 🌸 — ১৫ রমাযান ৩ হি.',en:'Imam Hasan (AS) Birthday 🌸 — 15 Ramadan 3 AH',type:'birth'},
    '9-19':{bn:'শবে ক্বদর (১৯) — ইমাম আলী (আ.) আঘাতপ্রাপ্ত ⚔️',en:'Laylat al-Qadr (19) — Imam Ali (AS) struck ⚔️',type:'martyrdom'},
    '9-21':{bn:'🕊️ ইমাম আলী (আ.) শাহাদাত দিবস — ২১ রমজান ৪০ হি. / শবে ক্বদর',en:'🕊️ Imam Ali (AS) Martyrdom Day — 21 Ramadan 40 AH / Laylat al-Qadr',type:'martyrdom'},
    '9-23':{bn:'শবে ক্বদর (২৩ রমজান) ⭐',en:'Laylat al-Qadr (23 Ramadan) ⭐',type:'special'},
    '9-27':{bn:'শবে কদর (২৭ রমজান) ⭐',en:'Laylat al-Qadr (27 Ramadan) ⭐',type:'special'},

    // ── শাওয়াল (মাস ১০) ──
    '10-1' :{bn:'ঈদুল ফিতর 🎉',en:'Eid al-Fitr 🎉',type:'eid'},
    '10-25':{bn:'🕊️ ইমাম সাদিক (আ.) শাহাদাত দিবস — ২৫ শাওয়াল ১৪৮ হি.',en:'🕊️ Imam Sadiq (AS) Martyrdom Day — 25 Shawwal 148 AH',type:'martyrdom'},

    // ── জিলকদ (মাস ১১) ──
    '11-11':{bn:'ইমাম রেজা (আ.) জন্মদিন 🌹 — ১১ যিলকদ ১৪৮ হি.',en:'Imam Ridha (AS) Birthday 🌹 — 11 Dhu al-Qadah 148 AH',type:'birth'},
    '11-23':{bn:'🕊️ ইমাম জওয়াদ (আ.) শাহাদাত দিবস — ২৩ জিলকদ ২২০ হি.',en:'🕊️ Imam Jawad (AS) Martyrdom Day — 23 Dhu al-Qadah 220 AH',type:'martyrdom'},

    // ── জিলহজ্ব (মাস ১২) ──
    '12-5' :{bn:'ইমাম জওয়াদ (আ.) জন্মদিন ✨ — ১০ রজব ১৯৫ হি.',en:'Imam Jawad (AS) Birthday ✨ — 10 Rajab 195 AH',type:'birth'},
    '12-10':{bn:'ঈদুল আযহা 🎉',en:'Eid al-Adha 🎉',type:'eid'},
    '12-15':{bn:'ইমাম হাদি (আ.) জন্মদিন 💎 — ১৫ যিলহজ্ব ২১২ হি.',en:'Imam Hadi (AS) Birthday 💎 — 15 Dhu al-Hijjah 212 AH',type:'birth'},
    '12-18':{bn:'🎊 ঈদে গাদির খুম — ইমাম আলী (আ.) মনোনয়ন দিবস',en:'🎊 Eid al-Ghadeer — Imam Ali (AS) Designation Day',type:'eid'},
    '12-24':{bn:'ঈদে মুবাহিলা ✨',en:'Eid al-Mubahila ✨',type:'eid'},
};

// ============================================================================
// LOCALSTORAGE
// ============================================================================
const KEYS = {
    DARK:'ahlbayt_dark', LANG:'ahlbayt_lang', BOOKMARKS:'ahlbayt_bookmarks',
    KC_FAVORITES:'ahlbayt_kc_favorites',
    READING_HISTORY:'ahlbayt_reading_history',
    LOC:'ahlbayt_loc', ADMIN:'ahlbayt_admin',
    TASBEEH_HIST:'ahlbayt_tasbeeh_hist', CUSTOM_POSTS:'ahlbayt_custom_posts',
    PAGE_VIEWS:'ahlbayt_pageviews', HADITH_IDX:'ahlbayt_hadith_idx',
    FONT_SIZE:'ahlbayt_fontsize',
    CUSTOM_DUAS:'ahlbayt_custom_duas',
    CUSTOM_ZIYARAT:'ahlbayt_custom_ziyarat',
    CUSTOM_AMAL:'ahlbayt_custom_amal',
    TASBEEH_COUNT:'ahlbayt_tasbeeh_count',
    TASBEEH_LABEL:'ahlbayt_tasbeeh_label',
    TASBEEH_TARGET:'ahlbayt_tasbeeh_target',
    TASBEEH_SELECTED:'ahlbayt_tasbeeh_selected',
    PRAYER_TIMES:'ahlbayt_prayer_times',
    CUSTOM_HADITHS:'ahlbayt_custom_hadiths',
    CUSTOM_AYAHS:'ahlbayt_custom_ayahs',
    NAHJUL_BALAGHA:'ahlbayt_nahjul_balagha',
    SAHIFA_SAJJADIYA:'ahlbayt_sahifa_sajjadiya',
    IMAM_HADITHS:'ahlbayt_imam_hadiths',
    SPECIAL_DAYS:'ahlbayt_special_days',
    MUHARRAM_EVENTS:'ahlbayt_muharram_events',
    SHIA_SPECIAL_DAYS:'ahlbayt_shia_special_days',
};

function lsGet(key, fallback=null) {
    try { const v=localStorage.getItem(key); return v!==null?JSON.parse(v):fallback; }
    catch(e){ return fallback; }
}
// Cache of the last string actually written per key, so repeated saveState()
// calls (which re-serialize every field every time) skip the localStorage
// write + JSON.stringify entirely when nothing about that key changed.
// Purely an internal write-count optimization — same key, same format, same
// final stored value; nothing reading via lsGet/localStorage directly can
// tell the difference.
var _lsWriteCache = Object.create(null);
function lsSet(key, val) {
    try {
        const serialized = JSON.stringify(val);
        if (_lsWriteCache[key] === serialized) return; // unchanged — skip write
        localStorage.setItem(key, serialized);
        _lsWriteCache[key] = serialized;
    } catch(e){ console.warn('ls set failed',e); }
}
// Expose to window so other scripts can access
window.lsGet = lsGet;
window.lsSet = lsSet;

// Reads a localStorage value the same way lsGet does, but also runs it
// through a shape validator (e.g. "must be an array") — corrupted or
// unexpectedly-shaped saved data falls back to the caller-supplied default
// instead of being loaded as-is. Never touches the localStorage key/format.
function lsGetValidated(key, fallback, validator) {
    const v = lsGet(key, fallback);
    try {
        if (typeof validator === 'function' && !validator(v)) return fallback;
    } catch (e) { return fallback; }
    return v;
}
const isArr = v => Array.isArray(v);
const isPlainObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function loadState() {
    try {
        state.darkMode = lsGetValidated(KEYS.DARK, false, v => typeof v === 'boolean');
        state.language = lsGetValidated(KEYS.LANG, 'bn', v => v === 'bn' || v === 'en');
        state.bookmarks = lsGetValidated(KEYS.BOOKMARKS, [], isArr);
        state.kcFavorites = lsGetValidated(KEYS.KC_FAVORITES, [], isArr);
        state.readingHistory = lsGetValidated(KEYS.READING_HISTORY, [], isArr);
        state.userLocation = lsGetValidated(KEYS.LOC, null, v => v === null || isPlainObj(v));
        state.isAdmin = lsGetValidated(KEYS.ADMIN, false, v => typeof v === 'boolean');
        state.tasbeehHistory = lsGetValidated(KEYS.TASBEEH_HIST, [], isArr);
        state.customPosts = lsGetValidated(KEYS.CUSTOM_POSTS, [], isArr);
        state.pageViews = lsGetValidated(KEYS.PAGE_VIEWS, {}, isPlainObj);
        state.hadithIndex = lsGetValidated(KEYS.HADITH_IDX, Math.floor(Math.random()*hadiths.length), v => typeof v === 'number' && Number.isFinite(v));
        state.fontSize = lsGetValidated(KEYS.FONT_SIZE, 'medium', v => fontSizes.includes(v));
        state.customDuas = lsGetValidated(KEYS.CUSTOM_DUAS, [], isArr);
        state.customZiyarat = lsGetValidated(KEYS.CUSTOM_ZIYARAT, [], isArr);
        state.customAmal = lsGetValidated(KEYS.CUSTOM_AMAL, [], isArr);
        state.customHadiths = lsGetValidated(KEYS.CUSTOM_HADITHS, [], isArr);
        state.customAyahs = lsGetValidated(KEYS.CUSTOM_AYAHS, [], isArr);
        state.nahjulBalagha = lsGetValidated(KEYS.NAHJUL_BALAGHA, [], isArr);
        state.sahifaSajjadiya = lsGetValidated(KEYS.SAHIFA_SAJJADIYA, [], isArr);
        state.imamHadiths = lsGetValidated(KEYS.IMAM_HADITHS, [], isArr);
        state.specialDays = lsGetValidated(KEYS.SPECIAL_DAYS, [], isArr);
        state.muharramEvents = lsGetValidated(KEYS.MUHARRAM_EVENTS, [], isArr);
        state.shiaSpecialDays = lsGetValidated(KEYS.SHIA_SPECIAL_DAYS, [], isArr);
        state.tasbeehCount  = lsGetValidated(KEYS.TASBEEH_COUNT, 0, v => typeof v === 'number' && Number.isFinite(v));
        state.tasbeehLabel  = lsGetValidated(KEYS.TASBEEH_LABEL, 'সুবহানআল্লাহ', v => typeof v === 'string');
        state.tasbeehTarget = lsGetValidated(KEYS.TASBEEH_TARGET, 33, v => typeof v === 'number' && Number.isFinite(v));
        state.tasbeehSelected = lsGetValidated(KEYS.TASBEEH_SELECTED, 0, v => typeof v === 'number' && Number.isFinite(v));
        const cachedPrayer = lsGetValidated(KEYS.PRAYER_TIMES, null, v => v === null || isPlainObj(v));
        if (cachedPrayer) state.prayerTimes = cachedPrayer;
        // clear cached prayer if it's from a different day so fresh fetch happens
        const prayerDate = lsGet('ahlbayt_prayer_date', '');
        if (prayerDate !== new Date().toDateString()) {
            lsSet(KEYS.PRAYER_TIMES, null);
            state.prayerTimes = { fajr:'04:15 AM', dhuhr:'12:05 PM', asr:'03:30 PM', maghrib:'06:20 PM', isha:'07:35 PM' };
        }
    } catch(e){ console.warn('Could not load state'); }
}

// Fresh default values for every state key — used only by resetState().
// Deliberately NOT the same objects used to seed `state` at module load
// (uiPrefsState, contentState, ...): those already got their array/object
// fields (bookmarks, customDuas, prayerTimes, ...) aliased into `state` by
// reference at startup, so reusing them here would not actually clear
// anything the user had already added. This returns brand-new literals
// every call.
function getStateDefaults() {
    return {
        darkMode: false, language: 'bn', fontSize: 'medium',
        currentPage: 'home', previousPage: 'home', menuOpen: false,
        bookmarks: [], readingHistory: [], currentPost: null, currentDua: null,
        currentZiyarat: null, currentAmal: null, currentImam: null, searchQuery: '', searchResults: [],
        pageViews: {},
        duaCategory: 'all', ziyaratCategory: 'all', amalCategory: 'all', duaTab: 'dua', bookmarksTab: 'bookmarks',
        showDuaEditor: false, editingDua: null, duaEditorType: 'dua', customDuas: [], customZiyarat: [], customAmal: [],
        showTimeline: false, timelineEra: 'all', expandedMuharramEvents: [],
        prayerTimes: { fajr:'04:15 AM', dhuhr:'12:05 PM', asr:'03:30 PM', maghrib:'06:20 PM', isha:'07:35 PM' },
        prayerTimesLoading: false, prayerTimesError: null, userLocation: null,
        isAdmin: false, showAdminLogin: false, adminLoginError: '',
        tasbeehCount: 0, tasbeehTarget: 33, tasbeehLabel: 'সুবহানআল্লাহ', tasbeehHistory: [], tasbeehSelected: 0,
        quizIndex: 0, quizScore: 0, quizAnswered: null, quizFinished: false, homeQuizPick: null,
        showBlogEditor: false, editingPost: null, customPosts: [], blogFilter: '',
        kcTab: 'hadith', kcCategory: '', kcSearch: '', kcPage: 1, kcFatwaMarja: '', kcSourceFilter: '',
        kcDetail: null, kcFavorites: [], kcFilter: 'all', kcLoading: false,
        hadithIndex: 0, ayahIndex: -1, customHadiths: [], customAyahs: [], nahjulBalagha: [],
        sahifaSajjadiya: [], imamHadiths: [], specialDays: [], showHadithEditor: false,
        showAyahEditor: false, editingHadith: null, editingAyah: null,
        muharramEvents: [], showMuharramEditor: false, editingMuharramEvent: null,
        shiaSpecialDays: [], showShiaDayEditor: false, editingShiaDay: null,
    };
}

// Resets every field `state` owns back to its startup default (in place —
// `state` keeps the same object identity, so ThemeState/NavigationState/...
// and every existing `state` reference elsewhere keep pointing at the same,
// now-reset object), then persists the reset to localStorage under the
// existing keys. Does not change routing/UI — callers are responsible for
// re-rendering afterwards, same as any other state-mutating function.
function resetState() {
    Object.assign(state, getStateDefaults());
    saveState();
}
window.resetState = resetState;

function saveState() {
    lsSet(KEYS.DARK, state.darkMode);
    lsSet(KEYS.LANG, state.language);
    lsSet(KEYS.BOOKMARKS, state.bookmarks);
    lsSet(KEYS.KC_FAVORITES, state.kcFavorites);
    lsSet(KEYS.READING_HISTORY, state.readingHistory);
    if (state.userLocation) lsSet(KEYS.LOC, state.userLocation);
    lsSet(KEYS.ADMIN, state.isAdmin);
    lsSet(KEYS.TASBEEH_HIST, state.tasbeehHistory);
    lsSet(KEYS.CUSTOM_POSTS, state.customPosts);
    lsSet(KEYS.PAGE_VIEWS, state.pageViews);
    lsSet(KEYS.HADITH_IDX, state.hadithIndex);
    lsSet(KEYS.FONT_SIZE, state.fontSize);
    lsSet(KEYS.CUSTOM_DUAS, state.customDuas);
    lsSet(KEYS.CUSTOM_ZIYARAT, state.customZiyarat);
    lsSet(KEYS.CUSTOM_AMAL, state.customAmal);
    lsSet(KEYS.CUSTOM_HADITHS, state.customHadiths);
    lsSet(KEYS.CUSTOM_AYAHS, state.customAyahs);
    lsSet(KEYS.NAHJUL_BALAGHA, state.nahjulBalagha);
    lsSet(KEYS.SAHIFA_SAJJADIYA, state.sahifaSajjadiya);
    lsSet(KEYS.IMAM_HADITHS, state.imamHadiths);
    lsSet(KEYS.SPECIAL_DAYS, state.specialDays);
    lsSet(KEYS.MUHARRAM_EVENTS, state.muharramEvents);
    lsSet(KEYS.SHIA_SPECIAL_DAYS, state.shiaSpecialDays);
    lsSet(KEYS.TASBEEH_COUNT, state.tasbeehCount);
    lsSet(KEYS.TASBEEH_LABEL, state.tasbeehLabel);
    lsSet(KEYS.TASBEEH_TARGET, state.tasbeehTarget);
    lsSet(KEYS.TASBEEH_SELECTED, state.tasbeehSelected);
    if (state.prayerTimes) lsSet(KEYS.PRAYER_TIMES, state.prayerTimes);
}


// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================
function showToast(msg, type='success', duration=2800) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    // Screen readers announce toasts as they're added (role="status" is
    // announced without stealing focus; "assertive" for errors so they
    // aren't missed).
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    // ✅ FIXED: 'error' icon was missing, so error toasts wrongly showed ✅
    const icons = {success:'✅', info:'ℹ️', warning:'⚠️', error:'❌'};
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span aria-hidden="true">${icons[type]||'✅'}</span><span>${escapeHtml(msg)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
        el.classList.add('hide');
        setTimeout(() => el.remove(), 350);
    }, duration);
}

// ============================================================================
// SCROLL TO TOP
// ============================================================================
function setupScrollTop() {
    if (window._scrollTopSetup) return; // ✅ FIXED: prevent duplicate listeners (Production Audit #3)
    window._scrollTopSetup = true;
    const btn = document.getElementById('scroll-top-btn');
    if (!btn) return;
    let _stTicking = false;
    window.addEventListener('scroll', () => {
        if (!_stTicking) {
            requestAnimationFrame(() => {
                btn.classList.toggle('visible', window.scrollY > 300);
                _stTicking = false;
            });
            _stTicking = true;
        }
    }, {passive:true});
}

// ── Header scroll shadow ──────────────────────────────────────────────────
function setupHeaderScroll() {
    if (window._headerScrollSetup) return; // ✅ FIXED: prevent duplicate listeners (Bug #17)
    window._headerScrollSetup = true;
    
    const hdr = document.getElementById('main-header');
    if (!hdr) return;
    let _hsTicking = false;
    const onScroll = () => {
        if (!_hsTicking) {
            requestAnimationFrame(() => {
                hdr.classList.toggle('scrolled', window.scrollY > 10);
                _hsTicking = false;
            });
            _hsTicking = true;
        }
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
}

// ── Reading progress bar ──────────────────────────────────────────────────
// setupReadingProgress মুছে দেওয়া হয়েছে — initReadingProgress ব্যবহার করুন
// (initReadingProgress-এ removeEventListener guard আছে, একাধিক listener leak হয় না)

// ── Scroll Reveal (IntersectionObserver) ────────────────────────────────
function setupScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (window._scrollRevealObs) window._scrollRevealObs.disconnect(); // ✅ FIXED: cleanup old observer (Bug #18)
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
    els.forEach(el => obs.observe(el));
    window._scrollRevealObs = obs;
}

// ── Home Hero Stats Count-Up (IntersectionObserver) ─────────────────────
// Animates the hero stat numbers (১৪ মাসুমিন, ৯৯ নাম, etc.) counting up
// from 0 once they scroll into view. No-op if the home page isn't showing.
function setupHomeStatsCounter() {
    const els = document.querySelectorAll('.hero-stat-num[data-count-target]');
    if (!els.length) return;
    if (window._homeStatsObs) window._homeStatsObs.disconnect();
    const l = state.language;
    const fmt = n => {
        const s = n.toLocaleString('en-US');
        return l === 'bn' ? toBengaliDigits(s) : s;
    };
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            obs.unobserve(entry.target);
            const target = parseInt(entry.target.getAttribute('data-count-target'), 10);
            if (!Number.isFinite(target)) return;
            const dur = 1100;
            const start = performance.now();
            const el = entry.target;
            function step(now) {
                const p = Math.min(1, (now - start) / dur);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = fmt(Math.round(target * eased));
                if (p < 1) requestAnimationFrame(step);
                else el.textContent = fmt(target);
            }
            requestAnimationFrame(step);
        });
    }, { threshold: .4 });
    els.forEach(el => obs.observe(el));
    window._homeStatsObs = obs;
}

// ============================================================================
// SECURITY HELPERS
// ============================================================================
// Regex-based instead of the previous document.createElement('div') +
// textContent/innerHTML round-trip. Same output (that DOM round-trip only
// ever escapes &, <, > for text-node content — no attribute-context
// quote-escaping was happening), but avoids allocating and discarding a
// DOM element on every single call. Called ~40 times per render across
// list-heavy pages (hadiths, imam cards, family tree, blog), so this adds
// up across a render pass.
const _escapeHtmlMap = { '&':'&amp;', '<':'&lt;', '>':'&gt;' };
function escapeHtml(text) {
    return String(text).replace(/[&<>]/g, ch => _escapeHtmlMap[ch]);
}
function sanitize(text) { return typeof text==='string'?escapeHtml(text):''; }

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
    bn:{
        calendar:'ইসলামিক ক্যালেন্ডার', knowledgeCenter:'জ্ঞান কেন্দ্র',
        dua:'দোয়া ও যিয়ারত', contact:'যোগাযোগ', blog:'ইসলামিক ব্লগ', home:'প্রধান পাতা',
        latestPosts:'সর্বশেষ পোস্ট', featuredBooks:'বৈশিষ্ট্যযুক্ত বই',
        readMore:'আরও পড়ুন', download:'ডাউনলোড', read:'পড়ুন',
        search:'অনুসন্ধান', pages:'পৃষ্ঠা', viewAll:'সব দেখুন',
        prayerTimes:'নামাজের সময়', fajr:'ফজর', dhuhr:'যোহর',
        asr:'আসর', maghrib:'মাগরিব', isha:'ইশা', share:'শেয়ার',
        todayVerse:'আজকের আয়াত', menu:'মেনু', darkMode:'ডার্ক মোড',
        lightMode:'লাইট মোড', loading:'লোড হচ্ছে...', error:'ত্রুটি',
        bookmarks:'বুকমার্ক', admin:'অ্যাডমিন',
        imams:'ইমাম ও মাসুমিন (আ.)', tasbeeh:'তাসবিহ কাউন্টার', quiz:'ইসলামিক কুইজ', asmaul:'আসমাউল হুসনা', qibla:'কিবলা নির্দেশক', familyTree:'বংশধারা',
        worldMap:'বিশ্ব মানচিত্র',
        searchPage:'সার্চ', analytics:'পরিসংখ্যান', hadithOfDay:'আজকের হাদিস',
        newPost:'নতুন পোস্ট', editPost:'পোস্ট সম্পাদনা', deletePost:'মুছুন',
        savePost:'সংরক্ষণ করুন', cancel:'বাতিল', title:'শিরোনাম', content:'বিষয়বস্তু',
        notifyPrayer:'নামাজের রিমাইন্ডার', enableNotify:'নোটিফিকেশন চালু করুন',
        ahlulBaytUnified:'আহলুল বাইত (আ)'
    },
    en:{
        knowledgeCenter:'Knowledge Center', dua:'Dua', contact:'Contact', blog:'Islamic Blog', home:'Home',
        latestPosts:'Latest Posts', featuredBooks:'Featured Books',
        readMore:'Read More', download:'Download', read:'Read',
        search:'Search', pages:'pages', viewAll:'View All',
        prayerTimes:'Prayer Times', fajr:'Fajr', dhuhr:'Dhuhr',
        asr:'Asr', maghrib:'Maghrib', isha:'Isha', share:'Share',
        todayVerse:"Today's Verse", menu:'Menu', darkMode:'Dark Mode',
        lightMode:'Light Mode', loading:'Loading...', error:'Error',
        bookmarks:'Bookmarks', admin:'Admin',
        imams:'Imams & Masumeen (AS)', tasbeeh:'Tasbeeh Counter', quiz:'Islamic Quiz', asmaul:'Asmaul Husna', qibla:'Qibla Finder', familyTree:'Family Tree',
        worldMap:'World Map',
        searchPage:'Search', analytics:'Analytics', hadithOfDay:"Today's Hadith",
        newPost:'New Post', editPost:'Edit Post', deletePost:'Delete',
        savePost:'Save Post', cancel:'Cancel', title:'Title', content:'Content',
        notifyPrayer:'Prayer Reminder', enableNotify:'Enable Notifications',
        ahlulBaytUnified:'Ahlul Bayt (AS)'
    }
};
function t(key){ return translations[state.language][key]||key; }

// ============================================================================
// PRAYER TIMES
// ============================================================================
async function fetchPrayerTimes(lat, lon, city=null) {
    state.prayerTimesLoading=true; state.prayerTimesError=null;
    try {
        // method=1: University of Islamic Sciences, Karachi — suitable for Bangladesh
        let url = lat!=null && lon!=null
            ? `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=1`
            : city ? `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Bangladesh&method=1`
            : (() => { throw new Error('No location'); })();
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (data.code===200 && data.data?.timings) {
            const T = data.data.timings;
            state.prayerTimes = {
                fajr:fmt12(T.Fajr), dhuhr:fmt12(T.Dhuhr),
                asr:fmt12(T.Asr), maghrib:fmt12(T.Maghrib), isha:fmt12(T.Isha)
            };
            lsSet(KEYS.PRAYER_TIMES, state.prayerTimes);
            // also store fetch date so we refresh daily
            lsSet('ahlbayt_prayer_date', new Date().toDateString());
        } else throw new Error('Bad response');
    } catch(e) {
        state.prayerTimesError = state.language==='bn'?'নামাজের সময় লোড করতে ব্যর্থ':'Failed to load prayer times';
    } finally {
        state.prayerTimesLoading = false;
        // শুধু prayer widget আপডেট করো — পুরো পেজ রি-রেন্ডার এড়াও
        const widget = document.getElementById('prayer-widget-root');
        if (widget) {
            widget.innerHTML = renderPrayerWidget();
        } else {
            render(); // widget DOM-এ না থাকলে fallback
        }
    }
}

function localDate() {
    try { return new Date().toLocaleDateString('bn-BD'); }
    catch(e) { return new Date().toLocaleDateString(); }
}
function fmt12(time24) {
    const clean = time24.split(' ')[0];
    const parts = clean.split(':');
    const h = parseInt(parts[0],10);
    const m = (parts[1]||'00').padStart(2,'0');
    return `${h%12||12}:${m} ${h>=12?'PM':'AM'}`;
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                state.userLocation={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
                saveState();
                fetchPrayerTimes(state.userLocation.latitude, state.userLocation.longitude);
            },
            () => fetchPrayerTimes(null, null, 'Dhaka'),
            {timeout:10000}
        );
    } else fetchPrayerTimes(null, null, 'Dhaka');
}

// ── Manual GPS request from the prayer widget button ──
function requestGPSPrayerTimes() {
    const l = state.language;
    if (!navigator.geolocation) {
        showToast(l==='bn'?'❌ আপনার ডিভাইসে GPS সাপোর্ট নেই':'❌ GPS not supported on this device', 'error');
        return;
    }
    state.prayerTimesLoading = true;
    // loading indicator সরাসরি update — full render() এড়ানো
    const gpsBtn = document.getElementById('gps-prayer-btn');
    if (gpsBtn) { gpsBtn.disabled = true; gpsBtn.style.opacity = '0.6'; }
    navigator.geolocation.getCurrentPosition(
        pos => {
            state.userLocation = {latitude:pos.coords.latitude, longitude:pos.coords.longitude};
            saveState();
            fetchPrayerTimes(state.userLocation.latitude, state.userLocation.longitude);
            showToast(l==='bn'?'✅ সঠিক GPS অবস্থান পাওয়া গেছে':'✅ Precise GPS location found', 'success');
        },
        err => {
            state.prayerTimesLoading = false;
            const gpsBtn = document.getElementById('gps-prayer-btn');
            if (gpsBtn) { gpsBtn.disabled = false; gpsBtn.style.opacity = ''; }
            const msg = err.code === 1
                ? (l==='bn'?'⚠️ লোকেশন পারমিশন দরকার — ব্রাউজার সেটিংস চেক করুন':'⚠️ Location permission needed — check browser settings')
                : (l==='bn'?'❌ লোকেশন পাওয়া যায়নি':'❌ Could not get location');
            showToast(msg, 'error');
        },
        {timeout:10000, enableHighAccuracy:true}
    );
}

// ============================================================================
// ADMIN
// ============================================================================
async function tryAdminLogin(pass) {
    if (!pass) return;
    const hash = await hashPassword(pass);
    if (hash === ADMIN_PASS_HASH) {
        state.isAdmin = true;
        state.showAdminLogin = false;
        state.adminLoginError = '';
        saveState();
        render();
    } else {
        state.adminLoginError = state.language==='bn'?'পাসওয়ার্ড ভুল!':'Wrong password!';
        render();
    }
}
function adminLogout() {
    state.isAdmin = false;
    saveState();
    render();
}

// ============================================================================
// STATE ACTIONS
// ============================================================================
function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    saveState();
    // ✅ FIX: আগে এখানে শুধু renderDarkMode() (body-level class/attribute) কল হতো এবং
    // document.getElementById('dark-mode-icon') দিয়ে icon বদলানোর চেষ্টা হতো — কিন্তু
    // HTML-এ 'dark-mode-icon' নামের কোনো id-ই নেই, তাই ওই লাইন কখনো কাজ করত না (dead code)।
    // এদিকে renderHeader()/renderMobileMenu()/renderMainContent() ইত্যাদি সব কম্পোনেন্ট
    // state.darkMode থেকে d=true/false ধরে রং render-time-এ হার্ডকোড করে বসায়, body-এর
    // class বদলালে সেগুলো নিজে থেকে আপডেট হয় না। ফলে toggle করলে শুধু body-র ব্যাকগ্রাউন্ড
    // বদলাত, কিন্তু header/nav/card/এমনকি toggle বাটনের নিজের আইকনও পুরনো থিমেই আটকে থাকত—
    // যতক্ষণ না অন্য কোনো action (পেজ পরিবর্তন, মেনু খোলা...) পুরো UI নতুন করে render করত।
    // এই "আটকে থাকা"/অসামঞ্জস্যপূর্ণ অবস্থাই ল্যাগ হিসেবে অনুভূত হচ্ছিল।
    // সমাধান: render() কল করা, যা toggleLanguage()/changePage()-এর মতোই পুরো UI-কে এক
    // ধাপে নতুন থিমে সিঙ্ক করে rebuild করে (render() নিজেই ভেতরে renderDarkMode() কল করে)।
    render();
}
function toggleLanguage() {
    state.language=state.language==='bn'?'en':'bn';
    // Update tasbeeh label to match new language
    const matchedLbl = tasbeehLabels.find(lb => lb.bn===state.tasbeehLabel || lb.en===state.tasbeehLabel);
    if (matchedLbl) state.tasbeehLabel = state.language==='bn' ? matchedLbl.bn : matchedLbl.en;
    saveState(); render();
}
function toggleMenu() { state.menuOpen=!state.menuOpen; render(); }

// Font size
const fontSizes = ['small','medium','large','xlarge'];
const fontSizeLabels = {
    bn: {small:'ক্ষুদ্র', medium:'স্বাভাবিক', large:'বড়', xlarge:'অতিবড়'},
    en: {small:'Small', medium:'Normal', large:'Large', xlarge:'X-Large'}
};
function cycleFontSize() {
    const idx = fontSizes.indexOf(state.fontSize);
    state.fontSize = fontSizes[(idx+1)%fontSizes.length];
    applyFontSize();
    saveState();
    // পুরো পেজ রি-রেন্ডার এড়াও — শুধু font label টা আপডেট করো
    const lblEl = document.getElementById('font-size-label');
    if (lblEl) lblEl.textContent = fontSizeLabels[state.language][state.fontSize];
}
function setFontSize(size) {
    state.fontSize = size;
    applyFontSize();
    saveState();
    // পুরো পেজ রি-রেন্ডার এড়াও — শুধু font label টা আপডেট করো
    const lblEl = document.getElementById('font-size-label');
    if (lblEl) lblEl.textContent = fontSizeLabels[state.language][state.fontSize];
}
function applyFontSize() {
    document.body.classList.remove('fs-small','fs-medium','fs-large','fs-xlarge');
    document.body.classList.add('fs-'+state.fontSize);
}

// Share
function shareContent(title, text, url) {
    const shareUrl = url || window.location.href;
    const shareText = title + '\n' + text + '\n\n' + shareUrl;

    // ── clipboard fallback (textarea trick — HTTP/Android সহ সব জায়গায় কাজ করে) ──
    function copyViaTextarea() {
        try {
            const ta = document.createElement('textarea');
            ta.value = shareText;
            ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) {
                showToast(state.language==='bn'?'✅ কপি হয়েছে! পেস্ট করুন':'✅ Copied! Paste to share', 'success');
                return true;
            }
        } catch(_) {}
        return false;
    }

    // ── WhatsApp fallback (last resort) ──
    function openWhatsApp() {
        window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank');
    }

    if (navigator.share) {
        // navigator.share — AbortError (user cancel) ও NotAllowedError আলাদা handle করো
        navigator.share({ title, text: shareText, url: shareUrl })
            .catch(err => {
                if (err && err.name === 'AbortError') return; // user নিজে বাতিল করেছে — কিছু করার নেই
                // অন্য error (NotAllowedError, DataError) → clipboard-এ fallback
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(shareText)
                        .then(() => showToast(state.language==='bn'?'✅ কপি হয়েছে! পেস্ট করুন':'✅ Copied! Paste to share', 'success'))
                        .catch(() => { if (!copyViaTextarea()) openWhatsApp(); });
                } else {
                    if (!copyViaTextarea()) openWhatsApp();
                }
            });
    } else if (navigator.clipboard && window.isSecureContext) {
        // HTTPS + modern clipboard API
        navigator.clipboard.writeText(shareText)
            .then(() => showToast(state.language==='bn'?'✅ কপি হয়েছে! পেস্ট করুন':'✅ Copied! Paste to share', 'success'))
            .catch(() => { if (!copyViaTextarea()) openWhatsApp(); });
    } else {
        // HTTP বা পুরনো Android ব্রাউজার → textarea trick
        if (!copyViaTextarea()) openWhatsApp();
    }
}
function sharePost(post, l) {
    const title = l==='bn'?post.titleBn:post.titleEn;
    const text = post.excerpt || ((l==='bn'?post.contentBn:post.contentEn) || '').substring(0,100)+'...';
    shareContent('📖 '+title, text, '');
}
function shareHadith(hadith, l) {
    const text = (l==='bn'?hadith.textBn:hadith.textEn) + '\n— '+(l==='bn'?hadith.sourceBn:hadith.sourceEn);
    shareContent('📜 '+(l==='bn'?'হাদিস':'Hadith'), text, '');
}
function shareDua(dua, l) {
    const title = l==='bn'?dua.titleBn:dua.titleEn;
    const text = (dua.arabic||'') + '\n' + (l==='bn'?dua.meaningBn||'':dua.meaningEn||'');
    shareContent('🤲 '+title, text, '');
}
// ⚠️ MOVED 2026-07-17: shareImamQuote() ও scrollToImamEl() এখন
// ahlul-bayt-unified.js ফাইলে আছে (👑 ইমাম ও মাসুমিন মার্জ)।

function changePage(page) {
    // ✅ FIXED: Cleanup listeners when leaving certain pages (Bug #25)
    if (state.currentPage === 'qibla') cleanupQiblaCompass();
    if (state.currentPage === 'worldMap') cleanupWorldMap();
    
    state.previousPage=state.currentPage; state.currentPage=page;
    state.menuOpen=false; state.currentPost=null; state.currentDua=null;
    state.currentZiyarat=null; state.currentAmal=null;
    if (page==='knowledgeCenter') { state.kcDetail=null; window._kcJustEnteredPage=true; if (typeof kcLoadTab==='function') kcLoadTab(state.kcTab||'hadith'); else if (typeof kcSimulateLoad==='function') kcSimulateLoad(); }
    else if (typeof kcUpdateSeoSchema==='function') { kcUpdateSeoSchema(null); }
    state.pageViews[page] = (state.pageViews[page]||0) + 1;
    saveState();
    // ── Smooth fade page transition ──
    const main = document.querySelector('main');
    if (main) {
        main.style.transition = 'opacity .16s ease, transform .16s ease';
        main.style.opacity = '0';
        main.style.transform = 'translateY(8px)';
        setTimeout(() => {
            render();
            window.scrollTo({top:0, behavior:'instant'});
            const newMain = document.querySelector('main');
            if (newMain) {
                newMain.style.transition = 'none';
                newMain.style.opacity = '0';
                newMain.style.transform = 'translateY(12px)';
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    newMain.style.transition = 'opacity .28s ease, transform .28s ease';
                    newMain.style.opacity = '1';
                    newMain.style.transform = 'translateY(0)';
                }));
            }
        }, 160);
    } else {
        render();
        window.scrollTo(0,0);
    }
}

// ============================================================================
// TASBEEH ACTIONS
// ============================================================================
function tasbeehTap() {
    state.tasbeehCount++;
    vibrateTaskeeh('tap');
    // Ripple effect + in-place counter update
    const btn=document.getElementById('tasbeeh-tap-btn');
    if(btn){
        const ripple=document.createElement('span');
        ripple.className='tasbeeh-ripple';
        ripple.style.cssText='position:absolute;left:50%;top:50%;width:60px;height:60px;margin-left:-30px;margin-top:-30px;border-radius:50%;background:rgba(255,255,255,.25);pointer-events:none;animation:ripple .7s ease-out forwards';
        btn.appendChild(ripple);
        setTimeout(()=>ripple.remove(),700);
        // Update the count span inside the button (second span)
        const spans = btn.querySelectorAll('span');
        const numEl = spans[1]; // "ট্যাপ করুন" is spans[0], count is spans[1]
        if(numEl){
            numEl.style.transform='scale(1.25)';
            numEl.style.transition='transform .1s';
            numEl.textContent = state.language==='bn' ? toBengaliDigits(state.tasbeehCount) : state.tasbeehCount;
            setTimeout(()=>{numEl.style.transform='scale(1)';},120);
        }
    }
    if (state.tasbeehCount >= state.tasbeehTarget) {
        vibrateTaskeeh('reach');
        state.tasbeehHistory.unshift({
            dhikrIdx: state.tasbeehSelected||0,
            label: state.tasbeehLabel, count: state.tasbeehCount,
            date: localDate(), target: state.tasbeehTarget
        });
        if (state.tasbeehHistory.length > 20) state.tasbeehHistory.pop();
        state.tasbeehCount = 0;
        saveState();
        render();
        showToast(state.language==='bn'?'মাশাআল্লাহ! তাসবিহ সম্পন্ন হয়েছে ✨':'MashaAllah! Tasbeeh complete ✨','success');
        return;
    }
    // Update SVG ring progress without full re-render
    const pct = Math.min(1, state.tasbeehCount / state.tasbeehTarget);
    const circumference = 2*Math.PI*54;
    const OFF = circumference*(1-pct);
    // Bug #11 fix: document.querySelectorAll('svg circle') grabs every circle on the
    // page (navigation icons, other SVGs), so rings[rings.length-1] is unpredictable.
    // Target the specific progress circle by ID instead.
    const progressCircle = document.getElementById('tasbeeh-ring');
    if(progressCircle) progressCircle.setAttribute('stroke-dashoffset', OFF.toFixed(1));
    // Update rem counter in the SVG center
    const rem = state.tasbeehCount % state.tasbeehTarget;
    const centerSpan = document.querySelector('.tasbeeh-center-count');
    if(centerSpan) centerSpan.textContent = state.language==='bn' ? toBengaliDigits(rem) : rem;
    saveState();
}
function tasbeehReset() { state.tasbeehCount=0; vibrateTaskeeh('reset'); saveState(); render(); }
function tasbeehSetLabel(idx) {
    const DHIKR=[
        {bn:'সুবহানআল্লাহ',   en:'Subhanallah',    target:33},
        {bn:'আলহামদুলিল্লাহ', en:'Alhamdulillah',  target:33},
        {bn:'আল্লাহু আকবার',  en:'Allahu Akbar',   target:34},
        {bn:'লা ইলাহা ইল্লাল্লাহ',en:'La ilaha illallah',target:100},
        {bn:'দরুদে মুহম্মাদ ও আলে মুহম্মাদ', en:'Durud on Muhammad & Aal-e-Muhammad',  target:100},
        {bn:'আস্তাগফিরুল্লাহ',en:'Astaghfirullah', target:70},
    ];
    const dk = DHIKR[idx];
    if (!dk) return;
    state.tasbeehSelected = idx;
    state.tasbeehLabel = state.language==='bn' ? dk.bn : dk.en;
    state.tasbeehTarget = dk.target;
    state.tasbeehCount = 0;
    saveState();
    render();
}

// ============================================================================
// QUIZ ACTIONS
// ============================================================================
function quizAnswer(optIdx) {
    if (state.quizAnswered !== null) return;
    state.quizAnswered = optIdx;
    if (optIdx === quizQuestions[state.quizIndex].correct) state.quizScore++;
    render();
    setTimeout(()=>{
        state.quizAnswered = null;
        if (state.quizIndex < quizQuestions.length-1) {
            state.quizIndex++;
        } else {
            state.quizFinished = true;
        }
        render();
    }, 1200);
}
function quizRestart() {
    state.quizIndex=0; state.quizScore=0;
    state.quizAnswered=null; state.quizFinished=false;
    render();
}

// ── Home page "quiz of the day" mini widget — separate from the full quiz
// page's state (quizIndex/quizAnswered/quizFinished) so browsing one never
// disturbs progress in the other. Question picked deterministically by
// day-of-year so everyone sees the same question on a given day.
function getHomeQuizIndex() {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    return dayOfYear % quizQuestions.length;
}
function homeQuizAnswer(optIdx) {
    if (state.homeQuizPick !== null) return;
    state.homeQuizPick = parseInt(optIdx, 10);
    render();
}

// ============================================================================
// SEARCH ACTIONS
// ============================================================================
// ── Search debounce timer ──────────────────────────────────────────────────
let _searchDebounceTimer = null;

function doSearch(query) {
    state.searchQuery = query;
    // খালি হলে সরাসরি clear — debounce দরকার নেই
    if (!query.trim()) {
        if (_searchDebounceTimer) { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = null; }
        state.searchResults = [];
        render();
        return;
    }
    // 300ms debounce — প্রতি কী-স্ট্রোকে render() এড়াও
    if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(() => {
        _searchDebounceTimer = null;
        _performSearch(query);
    }, 300);
}

function _performSearch(query) {
    const q = query.toLowerCase();
    const results = [];
    // search blog posts
    const allPosts = [...(typeof blogPosts!=='undefined'?blogPosts:[]), ...state.customPosts];
    allPosts.forEach(p=>{
        const hit = p.titleBn?.toLowerCase().includes(q) || p.titleEn?.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q);
        if(hit) results.push({type:'post',item:p});
    });
    // search duas (builtin + custom)
    duas.forEach((d,i)=>{
        const hit = d.titleBn?.toLowerCase().includes(q) || d.titleEn?.toLowerCase().includes(q) || d.meaningBn?.toLowerCase().includes(q);
        if(hit) results.push({type:'dua',item:d,index:String(i)});
    });
    state.customDuas.forEach(d=>{
        const hit = d.titleBn?.toLowerCase().includes(q) || d.titleEn?.toLowerCase().includes(q) || d.meaningBn?.toLowerCase().includes(q);
        if(hit) results.push({type:'dua',item:d,index:'c'+d.id});
    });
    // search hadiths
    hadiths.forEach((h,i)=>{
        const hit = h.textBn?.toLowerCase().includes(q) || h.textEn?.toLowerCase().includes(q) || h.sourceBn?.toLowerCase().includes(q) || h.sourceEn?.toLowerCase().includes(q);
        if(hit) results.push({type:'hadith',item:h,index:i});
    });
    // search custom ziyarat
    state.customZiyarat.forEach(z=>{
        const hit = z.titleBn?.toLowerCase().includes(q) || z.titleEn?.toLowerCase().includes(q) || z.meaningBn?.toLowerCase().includes(q);
        if(hit) results.push({type:'ziyarat',item:z});
    });
    // search custom amal — NEW
    state.customAmal.forEach(a=>{
        const hit = a.titleBn?.toLowerCase().includes(q) || a.titleEn?.toLowerCase().includes(q) || a.meaningBn?.toLowerCase().includes(q);
        if(hit) results.push({type:'amal',item:a});
    });
    // search masumeen
    masumeen.forEach(im=>{
        const hit = im.nameBn?.toLowerCase().includes(q) || im.nameEn?.toLowerCase().includes(q) || im.descBn?.toLowerCase().includes(q);
        if(hit) results.push({type:'imam',item:im});
    });
    // search imams
    imams.forEach(im=>{
        const hit = im.nameBn?.toLowerCase().includes(q) || im.nameEn?.toLowerCase().includes(q) || im.descBn?.toLowerCase().includes(q);
        if(hit) results.push({type:'imam',item:im});
    });
    // search Knowledge Center (Hadith / Masail / Q&A / Fatwa) — see knowledge-center.js
    if (typeof searchKnowledgeCenter === 'function') {
        results.push(...searchKnowledgeCenter(q));
    }
    state.searchResults = results;
    render();
}

// ============================================================================
// NOTIFICATION ACTIONS
// ============================================================================
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast(state.language==='bn'?'এই ব্রাউজার নোটিফিকেশন সাপোর্ট করে না':'Your browser does not support notifications','warning');
        return;
    }
    // ✅ FIXED: Check if permission already granted (Bug #23)
    if (Notification.permission === 'granted') {
        showToast(state.language==='bn'?'✅ নোটিফিকেশন ইতিমধ্যে চালু আছে':'✅ Notifications already enabled','info');
        schedulePrayerNotifications();
        return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
        showToast(state.language==='bn'?'✅ নোটিফিকেশন চালু হয়েছে!':'✅ Notifications enabled!','success');
        schedulePrayerNotifications();
    } else {
        showToast(state.language==='bn'?'নোটিফিকেশন অনুমতি দেওয়া হয়নি':'Notification permission denied','warning');
    }
}
let _notifTimers = [];
function schedulePrayerNotifications() {
    if (!state.prayerTimes || Notification.permission!=='granted') return;
    _notifTimers.forEach(id => clearTimeout(id));
    _notifTimers = [];
    const prayerNamesBn2={fajr:'ফজর',dhuhr:'যোহর',asr:'আসর',maghrib:'মাগরিব',isha:'ইশা'};
    const prayerNamesEn2={fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'};
    Object.entries(state.prayerTimes).forEach(([key, time])=>{
        const displayName=state.language==='bn'?(prayerNamesBn2[key]||key):(prayerNamesEn2[key]||key);
        const [timePart, ampm] = time.split(' ');
        let [h,m] = timePart.split(':').map(Number);
        if (ampm==='PM' && h!==12) h+=12;
        if (ampm==='AM' && h===12) h=0;
        const now = new Date();
        const target = new Date();
        target.setHours(h,m,0,0);
        if (target > now) {
            const delay = target - now;
            if (delay < 86400000) {
                const tid = setTimeout(()=>{
                    try {
                        new Notification(state.language==='bn'?`🕌 ${displayName} নামাজের সময়`:`🕌 ${displayName} Prayer Time`, {
                            body: state.language==='bn'?`${displayName} নামাজের সময় হয়েছে`:`It's time for ${displayName} prayer`,
                            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="%23059669"/><text x="20" y="27" text-anchor="middle" font-size="18" fill="white">☽</text></svg>'
                        });
                    } catch(e) {}
                }, delay);
                _notifTimers.push(tid);
            }
        }
    });
}

// ============================================================================
// ✓ Blog editor functions moved to blog.js

// ── DUA / ZIYARAT / AMAL EDITOR ───────────────────────────────────────────
// Shared 3-way lookup so saveDuaItem()/deleteCustomDua()/editCustomDua() (the
// last one in script-2-ui.js) never have to repeat the dua/ziyarat/amal
// ternary — one place to extend if a 4th custom-content type is ever added.
function customArrayForType(type) {
    if (type==='ziyarat') return state.customZiyarat;
    if (type==='amal') return state.customAmal;
    return state.customDuas;
}
window.customArrayForType = customArrayForType;

function openDuaEditor(item=null, type='dua') {
    if (!state.isAdmin) return;
    state.duaEditorType = type;
    state.editingDua = item ? {...item} : {
        id: 'cd_'+Date.now(),
        titleBn:'', titleEn:'',
        arabic:'', transliteration:'',
        meaningBn:'', meaningEn:'',
        fullTextBn:'', source:'',
        ...((type==='ziyarat'||type==='amal') ? {occasion:''} : {}),
        createdAt: localDate(),
    };
    state.showDuaEditor = true;
    render();
}

function closeDuaEditor() {
    state.showDuaEditor = false;
    state.editingDua = null;
    render();
}

function saveDuaItem() {
    if (!state.editingDua) return;
    const l = state.language;
    // Read all form fields
    const get = id => { const el=document.getElementById(id); return el?el.value.trim():''; };
    state.editingDua.titleBn      = get('dua-ed-titleBn');
    state.editingDua.titleEn      = get('dua-ed-titleEn');
    state.editingDua.arabic       = get('dua-ed-arabic');
    state.editingDua.transliteration = get('dua-ed-translit');
    state.editingDua.meaningBn    = get('dua-ed-meaningBn');
    state.editingDua.meaningEn    = get('dua-ed-meaningEn');
    state.editingDua.fullTextBn   = get('dua-ed-fullBn');
    state.editingDua.source       = get('dua-ed-source');
    if (state.duaEditorType==='ziyarat' || state.duaEditorType==='amal') {
        state.editingDua.occasion = get('dua-ed-occasion');
    }
    // Parse verses JSON (আয়াত বাই আয়াত)
    const versesRaw = get('dua-ed-verses');
    if (versesRaw) {
        try {
            const parsed = JSON.parse(versesRaw);
            // NEW: Amal steps are often instruction-only (e.g. {"bn":"গোসল
            // করুন"}, no "ar") — renderReadAmalPage() already renders those
            // as a single-column instruction row, so only "bn" is required
            // for amal. Dua/Ziyarat keep the original, stricter ar+bn
            // requirement unchanged (every verse there is a recitation).
            const versesValid = state.duaEditorType==='amal'
                ? parsed.every(v => v.bn)
                : parsed.every(v => v.ar && v.bn);
            if (Array.isArray(parsed) && versesValid) {
                state.editingDua.verses = parsed;
                const errEl = document.getElementById('dua-ed-verses-error');
                if (errEl) errEl.classList.add('hidden');
            } else {
                const errEl = document.getElementById('dua-ed-verses-error');
                if (errEl) errEl.classList.remove('hidden');
                showToast(
                    state.duaEditorType==='amal'
                        ? (l==='bn'?'Verses JSON-এ প্রতিটিতে অন্তত "bn" থাকতে হবে':'Each step needs at least a "bn" key')
                        : (l==='bn'?'Verses JSON-এ প্রতিটিতে "ar" ও "bn" থাকতে হবে':'Each verse needs "ar" and "bn" keys'),
                    'warning'
                );
                return;
            }
        } catch(e) {
            const errEl = document.getElementById('dua-ed-verses-error');
            if (errEl) errEl.classList.remove('hidden');
            showToast(l==='bn'?'Verses JSON ফরম্যাট ভুল!':'Invalid verses JSON format!','warning');
            return;
        }
    } else {
        state.editingDua.verses = undefined;
    }
    // Validate required fields
    if (!state.editingDua.titleBn) {
        showToast(l==='bn'?'শিরোনাম (বাংলা) আবশ্যক':'Bengali title is required','warning');
        return;
    }
    if (!state.editingDua.arabic) {
        showToast(l==='bn'?'আরবি পাঠ আবশ্যক':'Arabic text is required','warning');
        return;
    }
    if (!state.editingDua.meaningBn) {
        showToast(l==='bn'?'বাংলা অর্থ আবশ্যক':'Bengali meaning is required','warning');
        return;
    }
    const arr = customArrayForType(state.duaEditorType);
    const idx = arr.findIndex(x=>x.id===state.editingDua.id);
    if (idx>-1) arr[idx] = state.editingDua;
    else arr.unshift(state.editingDua);
    state.duaTab = state.duaEditorType;
    saveState();
    closeDuaEditor();
    showToast(
        state.duaEditorType==='ziyarat'
            ? (l==='bn'?'যিয়ারত সংরক্ষিত হয়েছে ✨':'Ziyarat saved successfully ✨')
            : state.duaEditorType==='amal'
            ? (l==='bn'?'আমল সংরক্ষিত হয়েছে ✨':'Amal saved successfully ✨')
            : (l==='bn'?'দোয়া সংরক্ষিত হয়েছে ✨':'Dua saved successfully ✨'),
        'success'
    );
}

function deleteCustomDua(id, type='dua') {
    if (!state.isAdmin) return;
    const l = state.language;
    const msg = type==='ziyarat'
        ? (l==='bn'?'যিয়ারতটি মুছবেন?':'Delete this ziyarat?')
        : type==='amal'
        ? (l==='bn'?'আমলটি মুছবেন?':'Delete this amal?')
        : (l==='bn'?'দোয়াটি মুছবেন?':'Delete this dua?');
    if (!confirm(msg)) return;
    if (type==='ziyarat') state.customZiyarat = state.customZiyarat.filter(x=>x.id!==id);
    else if (type==='amal') state.customAmal = state.customAmal.filter(x=>x.id!==id);
    else state.customDuas = state.customDuas.filter(x=>x.id!==id);
    saveState(); render();
    showToast(type==='ziyarat'
        ? (l==='bn'?'যিয়ারত মুছে ফেলা হয়েছে':'Ziyarat deleted')
        : type==='amal'
        ? (l==='bn'?'আমল মুছে ফেলা হয়েছে':'Amal deleted')
        : (l==='bn'?'দোয়া মুছে ফেলা হয়েছে':'Dua deleted'),
        'warning');
}
function toggleBookmark(id, type) {
    const key=`${type}-${String(id)}`;
    const i=state.bookmarks.indexOf(key);
    const adding = i===-1;
    if(i>-1) state.bookmarks.splice(i,1); else state.bookmarks.push(key);
    saveState(); render();
    const l=state.language;
    showToast(adding
        ? (l==='bn'?'বুকমার্ক যোগ হয়েছে ✨':'Bookmark added ✨')
        : (l==='bn'?'বুকমার্ক সরানো হয়েছে':'Bookmark removed'), adding?'success':'warning');
}
function isBookmarked(id,type){ return state.bookmarks.includes(`${type}-${String(id)}`); }

// রিডিং হিস্টোরি — সাম্প্রতিক পঠিত পোস্ট/দোয়া ট্র্যাক করে (dedup, সর্বশেষটা উপরে, ক্যাপ ৩০)
function recordReadingHistory(type, id, titleBn, titleEn) {
    const key = `${type}-${String(id)}`;
    state.readingHistory = state.readingHistory.filter(h => `${h.type}-${String(h.id)}` !== key);
    state.readingHistory.unshift({ type, id, titleBn, titleEn, ts: Date.now() });
    if (state.readingHistory.length > 30) state.readingHistory.pop();
    saveState();
}

function readPost(id) {
    state.previousPage=state.currentPage;
    const allPosts = [...(typeof blogPosts!=='undefined'?blogPosts:[]), ...state.customPosts];
    state.currentPost=allPosts.find(p=>String(p.id)===String(id));
    if(!state.currentPost) return;
    recordReadingHistory('post', state.currentPost.id, state.currentPost.titleBn, state.currentPost.titleEn);
    state.currentPage='readPost'; render(); window.scrollTo(0,0);
}
function readDua(index) {
    state.previousPage=state.currentPage;
    // custom dua id starts with 'c'
    if (typeof index==='string' && index.startsWith('c')) {
        const id = index.slice(1);
        state.currentDua = state.customDuas.find(x=>x.id===id);
    } else {
        state.currentDua = duas && duas[parseInt(index)];
    }
    if (!state.currentDua) return; // ✅ FIXED: Early return if not found
    recordReadingHistory('dua', index, state.currentDua.titleBn, state.currentDua.titleEn);
    state.currentPage='readDua';
    window._duaJustOpened = true;
    if (typeof ensureDuaContent==='function' && !state.currentDua.hasFullData) {
        const openedDua = state.currentDua;
        render(); window.scrollTo(0,0);
        ensureDuaContent(openedDua).then(()=>{ if (state.currentDua===openedDua) render(); });
        return;
    }
    render(); window.scrollTo(0,0);
}

// NEW: Amal — id-based lookup (matches how Amal cards render data-param, same
// as Ziyarat). Checks custom entries AND the built-in `amals` array by id
// (unlike the older readZiyarat handler in script-2-ui.js, which only
// resolves custom-by-id and falls back to title-matching for built-ins —
// this checks built-in-by-id directly so every Amal card always opens).
function readAmal(param) {
    state.previousPage=state.currentPage;
    const aitem = state.customAmal.find(x=>x.id===param)
        || (typeof amals!=='undefined' && amals.find(x=>x.id===param))
        || (typeof amals!=='undefined' && amals[parseInt(param)]);
    if (!aitem) return;
    state.currentAmal = aitem;
    recordReadingHistory('amal', aitem.id, aitem.titleBn, aitem.titleEn);
    state.currentPage='readAmal';
    window._amalJustOpened = true;
    if (typeof ensureAmalContent==='function' && !aitem.hasFullData) {
        render(); window.scrollTo(0,0);
        ensureAmalContent(aitem).then(()=>{ if (state.currentAmal===aitem) render(); });
        return;
    }
    render(); window.scrollTo(0,0);
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================
function getHijriMonthDays(month,year) {
    if(month%2===1) return 30;
    // Bug #29 fix: standard 30-year tabular cycle leap years are
    // 2,5,7,10,13,16,18,21,24,26,29 (Type IIa / "Kuwaiti algorithm").
    // This had 15 instead of 16, misclassifying leap/common status for
    // two years in every 30-year cycle (e.g. AH 1425 and 1426).
    if(month===12) return ([2,5,7,10,13,16,18,21,24,26,29].includes(year%30))?30:29;
    return 29;
}
function getHijriStartDay(month, year) {
    // Reference: 1 Muharram 1447 AH = 27 June 2025 = Friday (day index 5)
    const REF_YEAR = 1447, REF_MONTH = 1, REF_DOW = 5;
    let days = 0;
    if (year > REF_YEAR || (year === REF_YEAR && month > REF_MONTH)) {
        let y = REF_YEAR, m = REF_MONTH;
        while (!(y === year && m === month)) {
            days += getHijriMonthDays(m, y);
            m++; if (m > 12) { m = 1; y++; }
        }
        return (REF_DOW + days) % 7;
    } else {
        let y = year, m = month;
        while (!(y === REF_YEAR && m === REF_MONTH)) {
            days += getHijriMonthDays(m, y);
            m++; if (m > 12) { m = 1; y++; }
        }
        return ((REF_DOW - days) % 7 + 7) % 7;
    }
}

// Convert a Hijri day in the current calState month to a Gregorian Date
// Reference: 1 Muharram 1447 AH = 27 June 2025
function hijriToGregorian(hDay, hMonth, hYear) {
    const REF_HIJRI_YEAR = 1447, REF_HIJRI_MONTH = 1, REF_HIJRI_DAY = 1;
    const REF_GREG = new Date(2025, 5, 27); // 27 June 2025
    // Count total days from reference to target
    let totalDays = 0;
    let y = REF_HIJRI_YEAR, m = REF_HIJRI_MONTH;
    if (hYear > REF_HIJRI_YEAR || (hYear === REF_HIJRI_YEAR && hMonth > REF_HIJRI_MONTH) ||
        (hYear === REF_HIJRI_YEAR && hMonth === REF_HIJRI_MONTH && hDay >= REF_HIJRI_DAY)) {
        // Forward from reference
        while (!(y === hYear && m === hMonth)) {
            totalDays += getHijriMonthDays(m, y);
            m++; if (m > 12) { m = 1; y++; }
        }
        totalDays += (hDay - REF_HIJRI_DAY);
    } else {
        // Backward from reference
        while (!(y === hYear && m === hMonth)) {
            m--; if (m < 1) { m = 12; y--; }
            totalDays -= getHijriMonthDays(m, y);
        }
        totalDays += (hDay - REF_HIJRI_DAY);
    }
    const result = new Date(REF_GREG);
    result.setDate(result.getDate() + totalDays);
    return result;
}

// Bengali digit conversion
function toBengaliDigits(n) {
    return String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
}

const banglaMonthNames = ['বৈশাখ','জ্যৈষ্ঠ','আষাঢ়','শ্রাবণ','ভাদ্র','আশ্বিন','কার্তিক','অগ্রহায়ণ','পৌষ','মাঘ','ফাল্গুন','চৈত্র'];
const _BN_START = [{m:3,d:14},{m:4,d:15},{m:5,d:15},{m:6,d:16},{m:7,d:17},{m:8,d:17},{m:9,d:18},{m:10,d:17},{m:11,d:16},{m:0,d:14},{m:1,d:13},{m:2,d:14}];
function getBanglaDateFull(date) {
    const gY=date.getFullYear(),gM=date.getMonth(),gD=date.getDate();
    const bnYear=(gM<3||(gM===3&&gD<14))?gY-594:gY-593;
    let candidates=[];
    for(let i=0;i<12;i++){const{m,d}=_BN_START[i];candidates.push({idx:i,start:new Date(gY,m,d)});candidates.push({idx:i,start:new Date(gY-1,m,d)});}
    candidates=candidates.filter(c=>c.start<=date);
    candidates.sort((a,b)=>b.start-a.start);
    const best=candidates[0];
    const dayOfMonth=Math.floor((date-best.start)/86400000)+1;
    return{day:dayOfMonth,month:best.idx,year:bnYear,
        str:toBengaliDigits(dayOfMonth)+' '+banglaMonthNames[best.idx],
        strFull:toBengaliDigits(dayOfMonth)+' '+banglaMonthNames[best.idx]+' '+toBengaliDigits(bnYear)};
}

// ============================================================================
// CONTACT FORM
// ============================================================================
function submitContactForm(event) {
    event.preventDefault();
    const form = document.getElementById('contact-form') || event.target;
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const subject = state.language==='bn'?'যোগাযোগ: '+name:'Contact from: '+name;
    const body = state.language==='bn'
        ? 'নাম: '+name+'\nইমেইল: '+email+'\n\nবার্তা:\n'+message
        : 'Name: '+name+'\nEmail: '+email+'\n\nMessage:\n'+message;
    window.location.href = 'mailto:theroleofahlalbaytas@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    // ✅ FIXED: Call render() after form reset to update UI (Bug #26)
    setTimeout(()=>{ 
        showToast(state.language==='bn'?'আপনার ইমেইল অ্যাপ খুলছে।':'Your email app is opening.','info'); 
        form.reset(); 
        render(); // Update UI after form submission
    }, 500);
}
