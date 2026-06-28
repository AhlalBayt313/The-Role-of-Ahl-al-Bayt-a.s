// ── Cloudinary Config ─────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME    = window.CLOUDINARY_CLOUD_NAME    || "ahlalbayt";
const CLOUDINARY_UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || "ahlalbayt_upload";
window.CLOUDINARY_CLOUD_NAME    = CLOUDINARY_CLOUD_NAME;
window.CLOUDINARY_UPLOAD_PRESET = CLOUDINARY_UPLOAD_PRESET;

/**
 * Cloudinary-তে ফাইল আপলোড করো — progress সহ
 * @param {string}   folder
 * @param {File}     file
 * @param {Function} onProgress  - (percent) => {}
 * @returns {Promise<string>} secure_url
 */
window.storageUploadWithProgress = function(folder, file, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
        const mime = file.type || '';
        let resourceType = 'raw';
        if (mime.startsWith('image/')) resourceType = 'image';
        else if (mime.startsWith('video/')) resourceType = 'video';
        else if (mime.startsWith('audio/')) resourceType = 'audio'; // ✅ FIXED: was 'video', now 'audio'

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", folder);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                console.log(`[Cloudinary] Upload complete → ${data.public_id}`);
                resolve(data.secure_url);
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error("Cloudinary: " + (err.error?.message || xhr.statusText)));
                } catch (_) {
                    reject(new Error("Cloudinary upload failed: " + xhr.statusText));
                }
            }
        };

        xhr.onerror = () => reject(new Error("Network error — internet connection চেক করুন"));
        xhr.send(formData);
    });
};

console.log("✅ Cloudinary সফলভাবে যুক্ত হয়েছে — Cloud:", CLOUDINARY_CLOUD_NAME);

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

/**
 * Get color scheme for dua category
 */
function getCategoryColor(cat) {
    const colors = {
        'morning': { main: '#0ea5e9', light: 'rgba(14,165,233,.12)' },
        'night': { main: '#8b5cf6', light: 'rgba(139,92,246,.12)' },
        'hardship': { main: '#ef4444', light: 'rgba(239,68,68,.12)' },
        'gratitude': { main: '#10b981', light: 'rgba(16,185,129,.12)' },
        'ramadan': { main: '#f97316', light: 'rgba(249,115,22,.12)' },
        'general': { main: '#f59e0b', light: 'rgba(245,158,11,.12)' }
    };
    return colors[cat] || colors['general'];
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
// INDEXED DB — large file storage
// ============================================================================
const DB_NAME = 'AhlAlBaytDB';
const DB_VERSION = 1;
let idb = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (idb) { resolve(idb); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains('files')) {
                d.createObjectStore('files', { keyPath: 'id' });
            }
        };
        req.onsuccess = e => { idb = e.target.result; resolve(idb); };
        req.onerror = e => reject(e.target.error);
    });
}

async function dbSave(id, data) {
    const d = await openDB();
    return new Promise((res, rej) => {
        const tx = d.transaction('files', 'readwrite');
        tx.objectStore('files').put({ id, data });
        tx.oncomplete = () => res(true);
        tx.onerror = e => rej(e.target.error);
    });
}

async function dbGet(id) {
    const d = await openDB();
    return new Promise((res, rej) => {
        const tx = d.transaction('files', 'readonly');
        const req = tx.objectStore('files').get(id);
        req.onsuccess = () => res(req.result ? req.result.data : null);
        req.onerror = e => rej(e.target.error);
    });
}

async function dbDelete(id) {
    const d = await openDB();
    return new Promise((res, rej) => {
        const tx = d.transaction('files', 'readwrite');
        tx.objectStore('files').delete(id);
        tx.oncomplete = () => res(true);
        tx.onerror = e => rej(e.target.error);
    });
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
const state = {
    darkMode: false,
    language: 'bn',
    currentPage: 'home',
    previousPage: 'home',
    menuOpen: false,
    bookmarks: [],
    currentPost: null,
    currentDua: null,
    duaCategory: 'all',  // NEW: Category filter for duas
    duaTab: 'dua',  // NEW: Track dua/ziyarat tab
    showUploadModal: false,
    uploadType: null,
    uploadProgress: 0,
    isUploading: false,
    uploadFolderKey: null,
    fontSize: 'medium', // small | medium | large | xlarge
    showTimeline: false,
    prayerTimes: { fajr:'04:15 AM', dhuhr:'12:05 PM', asr:'03:30 PM', maghrib:'06:20 PM', isha:'07:35 PM' },
    prayerTimesLoading: false,
    prayerTimesError: null,
    userLocation: null,
    // admin
    isAdmin: false,
    showAdminLogin: false,
    adminLoginError: '',
    // content lists (metadata only, file data in IndexedDB)
    pdfList: [],
    imageList: [],
    videoList: [],
    audioList: [],
    nahjulPdfs: [],
    sahifaPdfs: [],
    imamHadithPdfs: [],
    specialDayPdfs: [],
    // imam detail
    currentImam: null,
    // viewer
    viewerItem: null,
    viewerType: null,
    viewerData: null,
    viewerLoading: false,
    // tasbeeh
    tasbeehCount: 0,
    tasbeehTarget: 33,
    tasbeehLabel: 'সুবহানআল্লাহ',
    tasbeehHistory: [],
    tasbeehSelected: 0,
    // quiz
    quizIndex: 0,
    quizScore: 0,
    quizAnswered: null,
    quizFinished: false,
    // search
    searchQuery: '',
    searchResults: [],
    // stats (analytics)
    pageViews: {},
    // admin blog editor
    showBlogEditor: false,
    editingPost: null,
    customPosts: [],
    blogFilter: '',            // '' = সব; category bn name = filter
    // custom dua / ziyarat editor
    showDuaEditor: false,
    editingDua: null,
    duaEditorType: 'dua', // 'dua' | 'ziyarat'
    customDuas: [],
    customZiyarat: [],
    // dua tab & ziyarat reader
    duaTab: 'dua',
    // library tab
    libraryTab: '',
    currentZiyarat: null,
    // hadith / ayah index (for next/prev browsing)
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
    // মুহাররম ইভেন্ট CRUD
    muharramEvents: [],
    showMuharramEditor: false,
    editingMuharramEvent: null,
    // শিয়া বিশেষ দিন CRUD
    shiaSpecialDays: [],
    showShiaDayEditor: false,
    editingShiaDay: null,
};

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
// ১৪ মাসুমিন — রাসূল (সা.) ও হযরত ফাতেমা যাহরা (আ.)
const masumeen = [
    {id:'p', nameBn:'হযরত মুহাম্মদ মুস্তাফা (সা.)', nameEn:'Prophet Muhammad Mustafa (PBUH)', arabicName:'مُحَمَّدٌ رَسُولُ اللَّه', birthBn:'৫৭০ খ্রি., মক্কা', birthEn:'570 CE, Makkah', martyrdomBn:'৬৩২ খ্রি., মদিনা', martyrdomEn:'632 CE, Madinah', epithetBn:'রাহমাতুল লিল আলামিন', epithetEn:'Mercy to All the Worlds', quoteBn:'আমি জ্ঞানের শহর এবং আলী তার দরজা।', quoteEn:'I am the city of knowledge and Ali is its gate.', descBn:'সর্বশেষ ও সর্বশ্রেষ্ঠ নবী ও রাসূল। আহলে বাইত (আ.)-এর নেতা। হাদিসে সাকালাইনে কুরআন ও আহলে বাইতকে আঁকড়ে ধরতে নির্দেশ দিয়েছেন।', descEn:'The last and greatest Prophet and Messenger. Leader of the Ahlul Bayt (AS). Commanded to hold fast to the Quran and Ahlul Bayt in the Hadith of Thaqalayn.', icon:'☀️'},
    {id:'f', nameBn:'হযরত ফাতেমা যাহরা (আ.)', nameEn:'Hazrat Fatima al-Zahra (AS)', arabicName:'فَاطِمَةُ الزَّهْرَاء', birthBn:'৬১৫ খ্রি., মক্কা', birthEn:'615 CE, Makkah', martyrdomBn:'৬৩২ খ্রি., মদিনা', martyrdomEn:'632 CE, Madinah', epithetBn:'সাইয়্যিদাতু নিসাইল আলামিন', epithetEn:'Leader of the Women of the Worlds', quoteBn:'আমাদের শিয়ারা — যারা অন্তর দিয়ে আমাদের ভালোবাসে — পৃথিবীর আলো।', quoteEn:'Our Shia — those who love us with their hearts — are the light of the earth.', descBn:'রাসূলুল্লাহ (সা.)-এর কলিজার টুকরো। ইমাম আলী (আ.)-এর সহধর্মিণী। হাসান, হোসাইন, যাইনাব ও উম্মে কুলসুমের মা। আয়াতে তাতহিরে উল্লিখিত পাঁচ পবিত্রের অন্যতম।', descEn:'Beloved daughter of the Prophet. Wife of Imam Ali (AS). Mother of Hasan, Husayn, Zaynab and Umm Kulthum. One of the Five of the Cloak mentioned in the verse of Tathir.', icon:'🌹'},
];

const imams = [
    {id:1,nameBn:'ইমাম আলী (আ.)',nameEn:'Imam Ali (AS)',arabicName:'علي بن أبي طالب',birthBn:'৬০০ খ্রি.',birthEn:'600 CE',martyrdomBn:'৬৬১ খ্রি., কুফা',martyrdomEn:'661 CE, Kufa',epithetBn:'আমিরুল মুমিনিন',epithetEn:'Commander of the Faithful',quoteBn:'মানুষ দুই ধরনের: হয় তোমার ধর্মীয় ভাই, নয়তো সৃষ্টিতে তোমার মতোই।',quoteEn:'People are either your brothers in religion or your equals in humanity.',descBn:'রাসূলুল্লাহ (সা.)-এর চাচাতো ভাই ও জামাতা। ইসলামের প্রথম ইমাম।',descEn:'Cousin and son-in-law of the Prophet. First Imam of Islam.',icon:'🦁'},
    {id:2,nameBn:'ইমাম হাসান (আ.)',nameEn:'Imam Hasan (AS)',arabicName:'الحسن بن علي',birthBn:'৬২৫ খ্রি., মদিনা',birthEn:'625 CE, Medina',martyrdomBn:'৬৭০ খ্রি., মদিনা',martyrdomEn:'670 CE, Medina',epithetBn:'সাইয়্যিদুশ শবাব',epithetEn:'Master of Youth',quoteBn:'সহনশীলতা হলো সেই গাছ যার শিকড় তিক্ত কিন্তু ফল মিষ্টি।',quoteEn:'Patience is a tree whose roots are bitter but whose fruit is sweet.',descBn:'ইমাম আলী ও ফাতেমা যাহরার পুত্র। রাসূলের প্রিয় নাতি।',descEn:'Son of Imam Ali and Fatima al-Zahra. Beloved grandson of the Prophet.',icon:'☮️'},
    {id:3,nameBn:'ইমাম হোসাইন (আ.)',nameEn:'Imam Hussain (AS)',arabicName:'الحسين بن علي',birthBn:'৬২৬ খ্রি., মদিনা',birthEn:'626 CE, Medina',martyrdomBn:'৬৮০ খ্রি., কারবালা',martyrdomEn:'680 CE, Karbala',epithetBn:'সাইয়্যিদুশ শুহাদা',epithetEn:'Master of Martyrs',quoteBn:'মৃত্যু ছাড়া আর কোনো পথ নেই। মৃত্যু যখন অনিবার্য, তখন সম্মানের সাথে মরাই শ্রেয়।',quoteEn:'Death with dignity is better than a life of humiliation.',descBn:'কারবালার মহানায়ক। ইয়াজিদের অত্যাচারের বিরুদ্ধে ৬১ হিজরিতে শহীদ হন।',descEn:'The hero of Karbala. Martyred in 61 AH standing against tyranny.',icon:'⚔️'},
    {id:4,nameBn:'ইমাম সাজ্জাদ (আ.)',nameEn:'Imam Zainul Abidin (AS)',arabicName:'علي بن الحسين',birthBn:'৬৫৮ খ্রি.',birthEn:'658 CE',martyrdomBn:'৭১৩ খ্রি., মদিনা',martyrdomEn:'713 CE, Medina',epithetBn:'যাইনুল আবেদীন',epithetEn:'Ornament of Worshippers',quoteBn:'যে নিজের ভুল স্বীকার করে, সে সত্যিকারের সাহসী।',quoteEn:'He who admits his mistakes has shown true courage.',descBn:'কারবালার একমাত্র পুরুষ বেঁচে যাওয়া ইমাম। সাহিফায়ে সাজ্জাদিয়্যার রচয়িতা।',descEn:'Only male survivor of Karbala. Author of Sahifa al-Sajjadiyya.',icon:'📿'},
    {id:5,nameBn:'ইমাম বাকির (আ.)',nameEn:'Imam Muhammad al-Baqir (AS)',arabicName:'محمد بن علي الباقر',birthBn:'৬৭৬ খ্রি.',birthEn:'676 CE',martyrdomBn:'৭৩৩ খ্রি., মদিনা',martyrdomEn:'733 CE, Medina',epithetBn:'বাকিরুল উলুম',epithetEn:'Splitter of Knowledge',quoteBn:'জ্ঞানের সন্ধান প্রতিটি মুসলমানের জন্য ফরজ।',quoteEn:'Seeking knowledge is obligatory upon every Muslim.',descBn:'ইসলামি জ্ঞান ও ফিকহ বিকাশে অসামান্য অবদান রাখেন।',descEn:'Made extraordinary contributions to Islamic knowledge and jurisprudence.',icon:'📖'},
    {id:6,nameBn:'ইমাম সাদিক (আ.)',nameEn:'Imam Jafar al-Sadiq (AS)',arabicName:'جعفر بن محمد الصادق',birthBn:'৭০২ খ্রি.',birthEn:'702 CE',martyrdomBn:'৭৬৫ খ্রি., মদিনা',martyrdomEn:'765 CE, Medina',epithetBn:'আস-সাদিক',epithetEn:'The Truthful',quoteBn:'বন্ধু সে, যে তোমার অনুপস্থিতিতেও তোমার পক্ষে থাকে।',quoteEn:'A true friend is one who stands by you even in your absence.',descBn:'জাফরি মাযহাবের প্রতিষ্ঠাতা। হাজারো ছাত্র তাঁর কাছ থেকে জ্ঞান অর্জন করেছেন।',descEn:'Founder of Jafari school. Thousands of scholars learned from him.',icon:'🌟'},
    {id:7,nameBn:'ইমাম কাযিম (আ.)',nameEn:'Imam Musa al-Kazim (AS)',arabicName:'موسى بن جعفر الكاظم',birthBn:'৭৪৫ খ্রি.',birthEn:'745 CE',martyrdomBn:'৭৯৯ খ্রি., বাগদাদ',martyrdomEn:'799 CE, Baghdad',epithetBn:'আল-কাযিম',epithetEn:'The Restrainer of Anger',quoteBn:'রাগ সংবরণ করা সর্বোচ্চ শক্তির পরিচায়ক।',quoteEn:'Restraining anger is a sign of the highest strength.',descBn:'দীর্ঘ কারাবাসেও ইবাদতে মগ্ন থাকতেন।',descEn:'Remained devoted to worship even through long imprisonment.',icon:'🕊️'},
    {id:8,nameBn:'ইমাম রেজা (আ.)',nameEn:'Imam Ali al-Ridha (AS)',arabicName:'علي بن موسى الرضا',birthBn:'৭৬৫ খ্রি.',birthEn:'765 CE',martyrdomBn:'৮১৮ খ্রি., মাশহাদ',martyrdomEn:'818 CE, Mashhad',epithetBn:'আর-রেজা',epithetEn:'The Contented',quoteBn:'বিশ্বাসী সেই যে সুখে কৃতজ্ঞ এবং বিপদে ধৈর্যশীল।',quoteEn:'A believer is grateful in happiness and patient in hardship.',descBn:'ইরানের মাশহাদে তাঁর মাযার রয়েছে।',descEn:'His shrine is in Mashhad, Iran.',icon:'🌹'},
    {id:9,nameBn:'ইমাম জওয়াদ (আ.)',nameEn:'Imam Muhammad al-Jawad (AS)',arabicName:'محمد بن علي الجواد',birthBn:'৮১১ খ্রি.',birthEn:'811 CE',martyrdomBn:'৮৩৫ খ্রি., বাগদাদ',martyrdomEn:'835 CE, Baghdad',epithetBn:'আত-তাকি',epithetEn:'The Pious',quoteBn:'দান করা বিশ্বাসকে শক্তিশালী করে।',quoteEn:'Giving charity strengthens faith.',descBn:'মাত্র ৯ বছর বয়সে ইমামতের দায়িত্ব পান।',descEn:'Assumed Imamate at just 9 years of age.',icon:'✨'},
    {id:10,nameBn:'ইমাম হাদি (আ.)',nameEn:'Imam Ali al-Hadi (AS)',arabicName:'علي بن محمد الهادي',birthBn:'৮২৭ খ্রি.',birthEn:'827 CE',martyrdomBn:'৮৬৮ খ্রি., সামারা',martyrdomEn:'868 CE, Samarra',epithetBn:'আন-নাকি',epithetEn:'The Pure',quoteBn:'সত্য পথে চলা কঠিন, কিন্তু মুক্তির পথ একটাই।',quoteEn:'Walking the path of truth is difficult, but it is the only path to salvation.',descBn:'সামারায় দীর্ঘ গৃহবন্দি থেকেও উম্মাহকে দিকনির্দেশনা দেন।',descEn:'Guided the Ummah even through long house arrest in Samarra.',icon:'💎'},
    {id:11,nameBn:'ইমাম আসকারি (আ.)',nameEn:'Imam Hasan al-Askari (AS)',arabicName:'الحسن بن علي العسكري',birthBn:'৮৪৬ খ্রি.',birthEn:'846 CE',martyrdomBn:'৮৭৪ খ্রি., সামারা',martyrdomEn:'874 CE, Samarra',epithetBn:'আল-আসকারি',epithetEn:'The Soldier',quoteBn:'সত্য কথা বলা হলো সবচেয়ে বড় সাহসিকতা।',quoteEn:'Speaking the truth is the greatest act of bravery.',descBn:'ইমাম মাহদির পিতা।',descEn:'Father of Imam Mahdi.',icon:'🛡️'},
    {id:12,nameBn:'ইমাম মাহদি (আ.)',nameEn:'Imam Muhammad al-Mahdi (AS)',arabicName:'محمد بن الحسن المهدي',birthBn:'৮৬৯ খ্রি., সামারা',birthEn:'869 CE, Samarra',martyrdomBn:'অদৃশ্য (গায়বত)',martyrdomEn:'In Occultation',epithetBn:'ইমামুল আসর',epithetEn:'Imam of the Age',quoteBn:'আমি তোমাদের দোয়া ও আমল থেকে গাফেল নই।',quoteEn:'I am not neglectful of you and your supplications.',descBn:'দ্বাদশ ইমাম। আল্লাহর নির্দেশে গায়বতে আছেন।',descEn:'The Twelfth Imam. In occultation by Allah\'s command.',icon:'🌙'}
];

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
// LOCALSTORAGE (metadata only — file blobs go to IndexedDB)
// ============================================================================
const KEYS = {
    DARK:'ahlbayt_dark', LANG:'ahlbayt_lang', BOOKMARKS:'ahlbayt_bookmarks',
    PDFS:'ahlbayt_pdfs', IMAGES:'ahlbayt_images', VIDEOS:'ahlbayt_videos',
    AUDIOS:'ahlbayt_audios', LOC:'ahlbayt_loc', ADMIN:'ahlbayt_admin',
    TASBEEH_HIST:'ahlbayt_tasbeeh_hist', CUSTOM_POSTS:'ahlbayt_custom_posts',
    PAGE_VIEWS:'ahlbayt_pageviews', HADITH_IDX:'ahlbayt_hadith_idx',
    FONT_SIZE:'ahlbayt_fontsize',
    CUSTOM_DUAS:'ahlbayt_custom_duas',
    CUSTOM_ZIYARAT:'ahlbayt_custom_ziyarat',
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
    NAHJUL_PDFS:'ahlbayt_nahjul_pdfs',
    SAHIFA_PDFS:'ahlbayt_sahifa_pdfs',
    IMAM_HADITH_PDFS:'ahlbayt_imam_hadith_pdfs',
    SPECIAL_DAY_PDFS:'ahlbayt_special_day_pdfs',
};

function lsGet(key, fallback=null) {
    try { const v=localStorage.getItem(key); return v!==null?JSON.parse(v):fallback; }
    catch(e){ return fallback; }
}
function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){ console.warn('ls set failed',e); }
}
// Expose to window so other scripts can access
window.lsGet = lsGet;
window.lsSet = lsSet;

function loadState() {
    try {
        state.darkMode = lsGet(KEYS.DARK, false);
        state.language = lsGet(KEYS.LANG, 'bn');
        state.bookmarks = lsGet(KEYS.BOOKMARKS, []);
        state.pdfList = lsGet(KEYS.PDFS, []);
        state.nahjulPdfs = lsGet(KEYS.NAHJUL_PDFS, []);
        state.sahifaPdfs = lsGet(KEYS.SAHIFA_PDFS, []);
        state.imamHadithPdfs = lsGet(KEYS.IMAM_HADITH_PDFS, []);
        state.specialDayPdfs = lsGet(KEYS.SPECIAL_DAY_PDFS, []);
        state.imageList = lsGet(KEYS.IMAGES, []);
        state.videoList = lsGet(KEYS.VIDEOS, []);
        state.audioList = lsGet(KEYS.AUDIOS, []);
        state.userLocation = lsGet(KEYS.LOC, null);
        state.isAdmin = lsGet(KEYS.ADMIN, false);
        state.tasbeehHistory = lsGet(KEYS.TASBEEH_HIST, []);
        state.customPosts = lsGet(KEYS.CUSTOM_POSTS, []);
        state.pageViews = lsGet(KEYS.PAGE_VIEWS, {});
        state.hadithIndex = lsGet(KEYS.HADITH_IDX, Math.floor(Math.random()*hadiths.length));
        state.fontSize = lsGet(KEYS.FONT_SIZE, 'medium');
        state.customDuas = lsGet(KEYS.CUSTOM_DUAS, []);
        state.customZiyarat = lsGet(KEYS.CUSTOM_ZIYARAT, []);
        state.customHadiths = lsGet(KEYS.CUSTOM_HADITHS, []);
        state.customAyahs = lsGet(KEYS.CUSTOM_AYAHS, []);
        state.nahjulBalagha = lsGet(KEYS.NAHJUL_BALAGHA, []);
        state.sahifaSajjadiya = lsGet(KEYS.SAHIFA_SAJJADIYA, []);
        state.imamHadiths = lsGet(KEYS.IMAM_HADITHS, []);
        state.specialDays = lsGet(KEYS.SPECIAL_DAYS, []);
        state.muharramEvents = lsGet(KEYS.MUHARRAM_EVENTS, []);
        state.shiaSpecialDays = lsGet(KEYS.SHIA_SPECIAL_DAYS, []);
        state.tasbeehCount  = lsGet(KEYS.TASBEEH_COUNT, 0);
        state.tasbeehLabel  = lsGet(KEYS.TASBEEH_LABEL, 'সুবহানআল্লাহ');
        state.tasbeehTarget = lsGet(KEYS.TASBEEH_TARGET, 33);
        state.tasbeehSelected = lsGet(KEYS.TASBEEH_SELECTED, 0);
        const cachedPrayer = lsGet(KEYS.PRAYER_TIMES, null);
        if (cachedPrayer) state.prayerTimes = cachedPrayer;
        // clear cached prayer if it's from a different day so fresh fetch happens
        const prayerDate = lsGet('ahlbayt_prayer_date', '');
        if (prayerDate !== new Date().toDateString()) {
            lsSet(KEYS.PRAYER_TIMES, null);
            state.prayerTimes = { fajr:'04:15 AM', dhuhr:'12:05 PM', asr:'03:30 PM', maghrib:'06:20 PM', isha:'07:35 PM' };
        }
    } catch(e){ console.warn('Could not load state'); }
}

function saveState() {
    lsSet(KEYS.DARK, state.darkMode);
    lsSet(KEYS.LANG, state.language);
    lsSet(KEYS.BOOKMARKS, state.bookmarks);
    lsSet(KEYS.PDFS, state.pdfList);
    lsSet(KEYS.NAHJUL_PDFS, state.nahjulPdfs);
    lsSet(KEYS.SAHIFA_PDFS, state.sahifaPdfs);
    lsSet(KEYS.IMAM_HADITH_PDFS, state.imamHadithPdfs);
    lsSet(KEYS.SPECIAL_DAY_PDFS, state.specialDayPdfs);
    lsSet(KEYS.IMAGES, state.imageList);
    lsSet(KEYS.VIDEOS, state.videoList);
    lsSet(KEYS.AUDIOS, state.audioList);
    if (state.userLocation) lsSet(KEYS.LOC, state.userLocation);
    lsSet(KEYS.ADMIN, state.isAdmin);
    lsSet(KEYS.TASBEEH_HIST, state.tasbeehHistory);
    lsSet(KEYS.CUSTOM_POSTS, state.customPosts);
    lsSet(KEYS.PAGE_VIEWS, state.pageViews);
    lsSet(KEYS.HADITH_IDX, state.hadithIndex);
    lsSet(KEYS.FONT_SIZE, state.fontSize);
    lsSet(KEYS.CUSTOM_DUAS, state.customDuas);
    lsSet(KEYS.CUSTOM_ZIYARAT, state.customZiyarat);
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
    const icons = {success:'✅', info:'ℹ️', warning:'⚠️'};
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type]||'✅'}</span><span>${msg}</span>`;
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

// ============================================================================
// SECURITY HELPERS
// ============================================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
function sanitize(text) { return typeof text==='string'?escapeHtml(text):''; }

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
    bn:{
        calendar:'ইসলামিক ক্যালেন্ডার', library:'পিডিএফ লাইব্রেরি',
        media:'মিডিয়া', dua:'দোয়া ও যিয়ারত', contact:'যোগাযোগ', blog:'ইসলামিক ব্লগ', home:'প্রধান পাতা',
        latestPosts:'সর্বশেষ পোস্ট', featuredBooks:'বৈশিষ্ট্যযুক্ত বই',
        readMore:'আরও পড়ুন', download:'ডাউনলোড', read:'পড়ুন',
        search:'অনুসন্ধান', pages:'পৃষ্ঠা', viewAll:'সব দেখুন',
        prayerTimes:'নামাজের সময়', fajr:'ফজর', dhuhr:'যোহর',
        asr:'আসর', maghrib:'মাগরিব', isha:'ইশা', share:'শেয়ার',
        todayVerse:'আজকের আয়াত', menu:'মেনু', darkMode:'ডার্ক মোড',
        lightMode:'লাইট মোড', loading:'লোড হচ্ছে...', error:'ত্রুটি',
        bookmarks:'বুকমার্ক', admin:'অ্যাডমিন', images:'ছবি', videos:'ভিডিও', audios:'অডিও',
        imams:'ইমাম ও মাসুমিন (আ.)', tasbeeh:'তাসবিহ কাউন্টার', quiz:'ইসলামিক কুইজ', asmaul:'আসমাউল হুসনা', qibla:'কিবলা নির্দেশক', familyTree:'বংশধারা',
        searchPage:'সার্চ', analytics:'পরিসংখ্যান', hadithOfDay:'আজকের হাদিস',
        newPost:'নতুন পোস্ট', editPost:'পোস্ট সম্পাদনা', deletePost:'মুছুন',
        savePost:'সংরক্ষণ করুন', cancel:'বাতিল', title:'শিরোনাম', content:'বিষয়বস্তু',
        notifyPrayer:'নামাজের রিমাইন্ডার', enableNotify:'নোটিফিকেশন চালু করুন'
    },
    en:{
        library:'Library', media:'Media', dua:'Dua', contact:'Contact', blog:'Islamic Blog', home:'Home',
        latestPosts:'Latest Posts', featuredBooks:'Featured Books',
        readMore:'Read More', download:'Download', read:'Read',
        search:'Search', pages:'pages', viewAll:'View All',
        prayerTimes:'Prayer Times', fajr:'Fajr', dhuhr:'Dhuhr',
        asr:'Asr', maghrib:'Maghrib', isha:'Isha', share:'Share',
        todayVerse:"Today's Verse", menu:'Menu', darkMode:'Dark Mode',
        lightMode:'Light Mode', loading:'Loading...', error:'Error',
        bookmarks:'Bookmarks', admin:'Admin', images:'Images', videos:'Videos', audios:'Audios',
        imams:'Imams & Masumeen (AS)', tasbeeh:'Tasbeeh Counter', quiz:'Islamic Quiz', asmaul:'Asmaul Husna', qibla:'Qibla Finder', familyTree:'Family Tree',
        searchPage:'Search', analytics:'Analytics', hadithOfDay:"Today's Hadith",
        newPost:'New Post', editPost:'Edit Post', deletePost:'Delete',
        savePost:'Save Post', cancel:'Cancel', title:'Title', content:'Content',
        notifyPrayer:'Prayer Reminder', enableNotify:'Enable Notifications'
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
// FILE UPLOAD (IndexedDB)
// ============================================================================
function openUploadModal(type) {
    if (!state.isAdmin) { state.showAdminLogin=true; render(); return; }
    state.showUploadModal=true; state.uploadType=type; state.uploadProgress=0; render();
}
function closeUploadModal() { state.showUploadModal=false; state.uploadType=null; state.isUploading=false; state.uploadFolderKey=null; render(); }

// folder key → state list key
const FOLDER_LIST_MAP = {
    pdf: 'pdfList',
    nahjul: 'nahjulPdfs',
    sahifa: 'sahifaPdfs',
    imamhadiths: 'imamHadithPdfs',
    specialdays: 'specialDayPdfs',
};
const FOLDER_CLOUDINARY_MAP = {
    pdf: 'library/pdfs',
    nahjul: 'library/nahjul',
    sahifa: 'library/sahifa',
    imamhadiths: 'library/imam-hadiths',
    specialdays: 'library/special-days',
};

function openFolderUpload(folderKey) {
    if (!state.isAdmin) { state.showAdminLogin=true; render(); return; }
    state.showUploadModal = true;
    state.uploadType = 'pdf';
    state.uploadFolderKey = folderKey;
    state.uploadProgress = 0;
    render();
}


async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const maxSize = state.uploadType === 'video' ? 500 : 100; // MB
    if (file.size > maxSize * 1024 * 1024) {
        showToast(state.language==='bn'
            ? `ফাইল ${maxSize}MB এর বেশি হতে পারে না`
            : `File must be under ${maxSize}MB`, 'warning');
        return;
    }
    state.isUploading = true; state.uploadProgress = 0; render();

    const id = 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const meta = {
        id, name: file.name, size: file.size, type: file.type,
        uploadDate: localDate(),
        sizeFmt: formatBytes(file.size)
    };

    // ── All types → Cloudinary ──────────────────────────────────────────────
    const folderMap = { image:'library/images', pdf:'library/pdfs', video:'library/videos', audio:'library/audios' };
    const folder = (state.uploadFolderKey && FOLDER_CLOUDINARY_MAP[state.uploadFolderKey]) || folderMap[state.uploadType] || 'library/misc';

    if (typeof window.storageUploadWithProgress === 'function') {
        try {
            const url = await window.storageUploadWithProgress(folder, file, pct => {
                state.uploadProgress = pct;
                // Update progress bar directly — avoid full render() on every tick
                const pb = document.getElementById('upload-progress-bar');
                const pt = document.getElementById('upload-progress-text');
                if (pb) pb.style.width = pct + '%';
                if (pt) pt.textContent = pct + '%';
            });
            meta.cloudUrl = url;
            if (state.uploadFolderKey && FOLDER_LIST_MAP[state.uploadFolderKey]) {
                state[FOLDER_LIST_MAP[state.uploadFolderKey]].push(meta);
                state.uploadFolderKey = null;
            } else if (state.uploadType==='image') state.imageList.push(meta);
            else if (state.uploadType==='pdf')   state.pdfList.push(meta);
            else if (state.uploadType==='video') state.videoList.push(meta);
            else if (state.uploadType==='audio') state.audioList.push(meta);
            saveState(); state.uploadProgress = 100; render();
            try { await syncMediaToCloud(); } catch(e) { console.warn('[Media] index sync failed:', e); }
            const msgs = { image:'ছবি', pdf:'PDF', video:'ভিডিও', audio:'অডিও' };
            showToast(state.language==='bn'?`${msgs[state.uploadType]||'ফাইল'} Cloudinary-তে সেভ হয়েছে ✓`:'Saved to Cloudinary ✓','success');
            setTimeout(() => closeUploadModal(), 800);
        } catch(err) {
            console.error('[Cloudinary] upload error:', err);
            showToast(state.language==='bn'?'আপলোড ব্যর্থ হয়েছে — internet connection চেক করুন':'Upload failed — check internet connection','warning');
            state.isUploading = false; render();
        }
        return;
    }

    // Fallback → IndexedDB
    const reader = new FileReader();
    reader.onprogress = ev => {
        if (ev.lengthComputable) {
            state.uploadProgress = Math.round(ev.loaded/ev.total*90);
            const pb = document.getElementById('upload-progress-bar');
            const pt = document.getElementById('upload-progress-text');
            if (pb) pb.style.width = state.uploadProgress + '%';
            if (pt) pt.textContent = state.uploadProgress + '%';
        }
    };
    reader.onload = async (ev) => {
        state.uploadProgress = 95; render();
        try {
            await dbSave(id, ev.target.result);
            if (state.uploadFolderKey && FOLDER_LIST_MAP[state.uploadFolderKey]) {
                state[FOLDER_LIST_MAP[state.uploadFolderKey]].push(meta);
                state.uploadFolderKey = null;
            } else if (state.uploadType==='pdf')   state.pdfList.push(meta);
            else if (state.uploadType==='video') state.videoList.push(meta);
            else if (state.uploadType==='audio') state.audioList.push(meta);
            else if (state.uploadType==='image') state.imageList.push(meta);
            saveState(); state.uploadProgress = 100; render();
            setTimeout(() => closeUploadModal(), 800);
        } catch(err) {
            showToast(state.language==='bn'?'ফাইল সংরক্ষণে সমস্যা হয়েছে':'Failed to save file','warning');
            state.isUploading = false; render();
        }
    };
    reader.readAsDataURL(file);
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1024/1024).toFixed(1) + ' MB';
}

async function downloadFile(id, name) {
    const allLists = [...state.pdfList, ...state.imageList, ...state.videoList, ...state.audioList];
    const item = allLists.find(f => f.id === id);
    if (item && item.cloudUrl) {
        showToast(state.language==='bn'?'ডাউনলোড প্রস্তুত হচ্ছে...':'Preparing download...','info');
        try {
            const res = await fetch(item.cloudUrl);
            if (!res.ok) throw new Error('fetch failed');
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl; a.download = name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
            showToast(state.language==='bn'?'ডাউনলোড শুরু হয়েছে ✓':'Download started ✓','success');
        } catch(e) {
            window.open(item.cloudUrl, '_blank');
            showToast(state.language==='bn'?'নতুন ট্যাবে খুলছে — সেখান থেকে সেভ করুন':'Opened in new tab — save from there','info');
        }
        return;
    }
    try {
        const data = await dbGet(id);
        if (!data) { showToast(state.language==='bn'?'ফাইল পাওয়া যায়নি':'File not found','warning'); return; }
        const a = document.createElement('a');
        a.href = data; a.download = name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        showToast(state.language==='bn'?'ডাউনলোড শুরু হয়েছে ✓':'Download started ✓','success');
    } catch(e) { showToast(state.language==='bn'?'ডাউনলোড ব্যর্থ হয়েছে':'Download failed','warning'); }
}

async function openViewer(item, type) {
    state.viewerItem = item; state.viewerType = type;
    state.viewerLoading = true; state.viewerData = null;
    // Cloudinary files: resolve data before first render (avoids double render)
    if (item.cloudUrl) {
        state.viewerData = item.cloudUrl;
        state.viewerLoading = false;
    }
    state.currentPage = 'viewer'; render();
    if (item.cloudUrl) return;
    // Local files: load from IndexedDB
    try {
        const data = await dbGet(item.id);
        state.viewerData = data; state.viewerLoading = false; render();
    } catch(e) { state.viewerLoading=false; render(); }
}

async function deleteFile(id, listKey) {
    if (!state.isAdmin) return;
    if (!listKey || !state[listKey]) return; // Guard: ensure listKey is valid
    const msg = state.language==='bn'?'ফাইলটি মুছবেন?':'Delete this file?';
    if (!confirm(msg)) return;
    await dbDelete(id);
    state[listKey] = (state[listKey] || []).filter(f => f.id!==id);
    saveState(); render();
    try { await syncMediaToCloud(); } catch(e) { console.warn('[Media] index sync on delete failed:', e); }
}

// ============================================================================
// MEDIA INDEX SYNC (Cloudinary) — keeps image/video/audio lists in sync
// across devices/browsers. Was previously called but never defined, which
// caused an uncaught ReferenceError on every page load (init() crashed at
// fetchMediaFromCloud()). Both functions below are fully self-contained and
// never throw — any failure (offline, first run with no cloud index yet,
// etc.) is caught and logged instead of crashing the app.
// ============================================================================
const MEDIA_INDEX_PUBLIC_ID = 'ahlbayt/media-index';

/** Upload the current image/video/audio lists as a JSON index to Cloudinary */
async function syncMediaToCloud() {
    try {
        const payload = JSON.stringify({
            imageList: state.imageList || [],
            videoList: state.videoList || [],
            audioList: state.audioList || [],
            updatedAt: Date.now()
        });
        const dataUri = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(payload)));

        const formData = new FormData();
        formData.append('file', dataUri);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('public_id', MEDIA_INDEX_PUBLIC_ID);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Cloudinary raw upload failed: ' + res.status);
        const data = await res.json();
        console.log('[Media] index synced to cloud ✓', data.secure_url);
        return data.secure_url;
    } catch (e) {
        console.warn('[Media] syncMediaToCloud failed (will retry on next change):', e);
    }
}

/** Load the media index from Cloudinary (cross-device) on app start */
async function fetchMediaFromCloud() {
    try {
        const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/raw/upload/${MEDIA_INDEX_PUBLIC_ID}.json?_=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.log('[Media] no cloud index yet — keeping local data');
            return;
        }
        const data = await res.json();
        let changed = false;
        if (Array.isArray(data.imageList)) { state.imageList = data.imageList; changed = true; }
        if (Array.isArray(data.videoList)) { state.videoList = data.videoList; changed = true; }
        if (Array.isArray(data.audioList)) { state.audioList = data.audioList; changed = true; }
        if (changed) {
            saveState();
            if (state.currentPage === 'media') render();
            console.log('[Media] index loaded from cloud ✓');
        }
    } catch (e) {
        console.warn('[Media] fetchMediaFromCloud failed (offline?):', e);
    }
}

// ============================================================================
// STATE ACTIONS
// ============================================================================
function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    saveState();
    renderDarkMode(); // body class, data-theme, CSS vars আপডেট করে
    // শুধু icon আপডেট — পুরো পেজ রি-রেন্ডার দরকার নেই
    const iconEl = document.getElementById('dark-mode-icon');
    if (iconEl) iconEl.textContent = state.darkMode ? '☀️' : '🌙';
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
function shareImamQuote(im, l) {
    const name = l==='bn'?im.nameBn:im.nameEn;
    const quote = l==='bn'?im.quoteBn:im.quoteEn;
    shareContent('💬 '+name, '"'+quote+'"', '');
}
// ── Imam anchor scroll with sticky-header offset ──────────────────────────
function scrollToImamEl(el) {
    if (!el) return;
    const headerEl = document.querySelector('header');
    const headerH = headerEl ? headerEl.offsetHeight : 64;
    const rect = el.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    window.scrollTo({ top: rect.top + scrollTop - headerH - 12, behavior: 'smooth' });
}

function changePage(page) {
    // ✅ FIXED: Cleanup listeners when leaving certain pages (Bug #25)
    if (state.currentPage === 'qibla') cleanupQiblaCompass();
    
    state.previousPage=state.currentPage; state.currentPage=page;
    state.menuOpen=false; state.currentPost=null; state.currentDua=null;
    state.currentZiyarat=null; state.viewerItem=null; state.viewerData=null;
    if (page==='library') state.libraryTab='';
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
        {bn:'দরুদে ইব্রাহিম', en:'Durood Ibrahim',  target:10},
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
    // search pdfs
    state.pdfList.forEach(pdf=>{
        if(pdf.name?.toLowerCase().includes(q)) results.push({type:'pdf',item:pdf});
    });
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

// ── DUA / ZIYARAT EDITOR ──────────────────────────────────────────────────
function openDuaEditor(item=null, type='dua') {
    if (!state.isAdmin) return;
    state.duaEditorType = type;
    state.editingDua = item ? {...item} : {
        id: 'cd_'+Date.now(),
        titleBn:'', titleEn:'',
        arabic:'', transliteration:'',
        meaningBn:'', meaningEn:'',
        fullTextBn:'', source:'',
        ...(type==='ziyarat' ? {occasion:''} : {}),
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
    if (state.duaEditorType==='ziyarat') {
        state.editingDua.occasion = get('dua-ed-occasion');
    }
    // Parse verses JSON (আয়াত বাই আয়াত)
    const versesRaw = get('dua-ed-verses');
    if (versesRaw) {
        try {
            const parsed = JSON.parse(versesRaw);
            if (Array.isArray(parsed) && parsed.every(v => v.ar && v.bn)) {
                state.editingDua.verses = parsed;
                const errEl = document.getElementById('dua-ed-verses-error');
                if (errEl) errEl.classList.add('hidden');
            } else {
                const errEl = document.getElementById('dua-ed-verses-error');
                if (errEl) errEl.classList.remove('hidden');
                showToast(l==='bn'?'Verses JSON-এ প্রতিটিতে "ar" ও "bn" থাকতে হবে':'Each verse needs "ar" and "bn" keys','warning');
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
    const arr = state.duaEditorType==='ziyarat' ? state.customZiyarat : state.customDuas;
    const idx = arr.findIndex(x=>x.id===state.editingDua.id);
    if (idx>-1) arr[idx] = state.editingDua;
    else arr.unshift(state.editingDua);
    state.duaTab = state.duaEditorType;
    saveState();
    closeDuaEditor();
    showToast(
        state.duaEditorType==='ziyarat'
            ? (l==='bn'?'যিয়ারত সংরক্ষিত হয়েছে ✨':'Ziyarat saved successfully ✨')
            : (l==='bn'?'দোয়া সংরক্ষিত হয়েছে ✨':'Dua saved successfully ✨'),
        'success'
    );
}

function deleteCustomDua(id, type='dua') {
    if (!state.isAdmin) return;
    const l = state.language;
    const msg = type==='ziyarat'
        ? (l==='bn'?'যিয়ারতটি মুছবেন?':'Delete this ziyarat?')
        : (l==='bn'?'দোয়াটি মুছবেন?':'Delete this dua?');
    if (!confirm(msg)) return;
    if (type==='ziyarat') state.customZiyarat = state.customZiyarat.filter(x=>x.id!==id);
    else state.customDuas = state.customDuas.filter(x=>x.id!==id);
    saveState(); render();
    showToast(type==='ziyarat'
        ? (l==='bn'?'যিয়ারত মুছে ফেলা হয়েছে':'Ziyarat deleted')
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
function readPost(id) {
    state.previousPage=state.currentPage;
    const allPosts = [...(typeof blogPosts!=='undefined'?blogPosts:[]), ...state.customPosts];
    state.currentPost=allPosts.find(p=>String(p.id)===String(id));
    if(!state.currentPost) return;
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
    state.currentPage='readDua'; render(); window.scrollTo(0,0);
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

const gregMonthsBn = ['জান','ফেব','মার','এপ্র','মে','জুন','জুল','আগ','সেপ','অক্ট','নভ','ডিস'];
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
const gregMonthsAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

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
                case 'setDuaTab': state.duaTab=param; render(); break;  // NEW: Set dua/ziyarat tab
                case 'setDuaCategory': state.duaCategory=param; render(); break;  // NEW: Set dua category filter
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
                case 'readPost': readPost(param); break;
                case 'readDua': readDua(param); break;
                case 'openUploadModal': openUploadModal(param); break;
                case 'openFolderUpload': openFolderUpload(param); break;
                case 'closeUploadModal': closeUploadModal(); break;
                case 'downloadFile': {
                    const name=btn.getAttribute('data-name')||'file';
                    downloadFile(param,name); break;
                }
                case 'openViewer': {
                    const vtype=btn.getAttribute('data-vtype');
                    const listKey=btn.getAttribute('data-listkey');
                    if (!listKey || !state[listKey]) { console.warn('[Viewer] Invalid listKey:', listKey); break; }
                    const item=state[listKey].find(f=>f.id===param);
                    if(item) openViewer(item,vtype); break;
                }
                case 'deleteFile': {
                    const listKey=btn.getAttribute('data-listkey');
                    deleteFile(param,listKey); break;
                }
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
                    if (navigator.share) { navigator.share({ title: l==='bn'?'আজকের আয়াত':'Today\'s Verse', text }); }
                    else { navigator.clipboard && navigator.clipboard.writeText(text).then(()=>alert(l==='bn'?'কপি হয়েছে!':'Copied!')); }
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
                case 'shareHadith': {
                    const h = getDailyHadith();
                    const l = state.language;
                    const text = '"' + (l==='bn' ? (h.textBn||h.textEn||'') : (h.textEn||h.textBn||'')) + '"\n— ' + (l==='bn' ? (h.sourceBn||h.sourceEn||'') : (h.sourceEn||h.sourceBn||''));
                    if (navigator.share) { navigator.share({ title: l==='bn'?'হাদিস':'Hadith', text }); }
                    else { navigator.clipboard && navigator.clipboard.writeText(text).then(()=>alert(l==='bn'?'কপি হয়েছে!':'Copied!')); }
                    break;
                }
                // TASBEEH
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
                case 'quizRestart': quizRestart(); break;
                // SEARCH
                case 'doSearch': {
                    const inp=document.getElementById('search-input');
                    if(inp) doSearch(inp.value); break;
                }
                case 'searchGo': {
                    const inp=document.getElementById('search-input');
                    if(inp) doSearch(inp.value); break;
                }
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
                case 'setDuaTab': state.duaTab=param; render(); break;
                case 'setLibraryTab': state.libraryTab=param; render(); break;
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
                    const arr=dtype==='ziyarat'?state.customZiyarat:state.customDuas;
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
                    if(!textBn&&!textEn){alert(state.language==='bn'?'হাদিস লিখুন':'Please enter hadith text');break;}
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
                    if(!arabic){alert(state.language==='bn'?'আরবি আয়াত লিখুন':'Please enter Arabic ayah');break;}
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
                    const zitem=state.customZiyarat.find(x=>x.id===param) || ziyarats.find(x=>x.titleEn===param||x.titleBn===param) || ziyarats[parseInt(param)];
                    if(zitem){state.currentZiyarat=zitem;state.previousPage=state.currentPage;state.currentPage='readZiyarat';render();window.scrollTo(0,0);}
                    break;
                }
                // IMAM PAGE
                case 'viewImam': {
                    state.currentImam=imams.find(im=>im.id===parseInt(param)) || masumeen.find(m=>m.id===param);
                    state.previousPage=state.currentPage; state.currentPage='imamDetail';
                    render(); window.scrollTo(0,0); break;
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
    document.addEventListener('change', e => {
        if(e.target.id==='fileUploadInput') handleFileUpload(e);
    });
    document.addEventListener('input', e => {
        if(e.target.id==='search-input') doSearch(e.target.value);
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
    });
    document.addEventListener('keydown', e => {
        if(e.key==='Escape'){
            if(state.menuOpen) toggleMenu();
            else if(state.showUploadModal) closeUploadModal();
            else if(state.showAdminLogin){state.showAdminLogin=false;state.adminLoginError='';render();}
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
    window.addEventListener('resize', () => {
        _irtDocH = document.documentElement.scrollHeight - window.innerHeight;
    }, {passive:true});
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
function getHijriDateString(lang) {
    const h = approxHijriNow();
    if (lang === 'bn') {
        return `${toBengaliDigits(h.day)} ${hijriMonthsBn[h.month-1]}, ${toBengaliDigits(h.year)} হিজরি`;
    }
    return `${h.day} ${hijriMonthsEn[h.month-1]}, ${h.year} AH`;
}

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
    <div class="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div class="${d?'bg-gray-800':'bg-white'} rounded-2xl p-8 max-w-sm w-full shadow-2xl fade-in">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">🔐 ${l==='bn'?'অ্যাডমিন লগইন':'Admin Login'}</h3>
                <button data-action="closeAdminLogin" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">✕</button>
            </div>
            <form id="admin-login-form">
                <label class="block mb-2 text-sm font-medium">${l==='bn'?'পাসওয়ার্ড':'Password'}</label>
                <input id="admin-pw-input" type="password" autocomplete="current-password"
                    class="${d?'bg-gray-900 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="${l==='bn'?'পাসওয়ার্ড দিন':'Enter password'}" autofocus />
                ${state.adminLoginError?`<p class="text-red-500 text-sm mb-3">${sanitize(state.adminLoginError)}</p>`:''}
                <button type="submit" data-action="adminLogin"
                    class="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >${l==='bn'?'প্রবেশ করুন':'Login'}</button>
            </form>
            <p class="text-xs text-center mt-4 ${d?'text-gray-500':'text-gray-400'}">${l==='bn'?'শুধু সাইট পরিচালকের জন্য':'For site admin only'}</p>
        </div>
    </div>`;
}

function renderUploadModal() {
    if(!state.showUploadModal) return '';
    const d=state.darkMode; const l=state.language;
    const typeLabels = {
        pdf:{bn:'পিডিএফ বই',en:'PDF Book',accept:'.pdf',icon:'📕',maxMB:100},
        image:{bn:'ছবি',en:'Image',accept:'image/*',icon:'🖼️',maxMB:100},
        video:{bn:'ভিডিও',en:'Video',accept:'video/*',icon:'🎬',maxMB:500},
        audio:{bn:'অডিও',en:'Audio',accept:'audio/*',icon:'🎵',maxMB:100}
    };
    const info = typeLabels[state.uploadType]||typeLabels.pdf;
    return `
    <div class="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div class="${d?'bg-gray-800':'bg-white'} rounded-2xl p-8 max-w-md w-full shadow-2xl fade-in">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">${info.icon} ${l==='bn'?info.bn:info.en} ${l==='bn'?'আপলোড':'Upload'}</h3>
                ${!state.isUploading?`<button data-action="closeUploadModal" class="p-1 rounded hover:bg-gray-200">✕</button>`:''}
            </div>
            ${state.isUploading ? `
                <div class="text-center py-4">
                    <div class="mb-4">
                        <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div id="upload-progress-bar" class="progress-bar rounded-full" style="width:${state.uploadProgress}%"></div>
                        </div>
                        <p class="text-sm ${d?'text-gray-300':'text-gray-600'}">
                            ${state.uploadProgress < 100
                                ? `<span id='upload-progress-text'>${l==='bn'?'আপলোড হচ্ছে':'Uploading'}... ${state.uploadProgress}%</span>`
                                : (l==='bn'?'✅ সম্পন্ন!':'✅ Done!')}
                        </p>
                    </div>
                </div>
            ` : `
                <label class="block mb-2 font-medium">${l==='bn'?'ফাইল নির্বাচন করুন':'Select file'}</label>
                <input type="file" id="fileUploadInput" accept="${info.accept}"
                    class="${d?'bg-gray-900 border-gray-700':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                <p class="mt-2 text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?`সর্বোচ্চ ${info.maxMB}MB`:`Max ${info.maxMB}MB`}</p>
            `}
        </div>
    </div>`;
}

// ============================================================================
// HEADER
// ============================================================================
function renderHeader()
{
    const d=state.darkMode; const l=state.language;
    const mainPages=['home','blog','library','dua','calendar'];
    const morePages=['imams','tasbeeh','media','quiz','qibla','familyTree','bookmarks','about','contact'];
    const bg   = d ? 'rgba(6,20,16,.95)'      : 'rgba(255,255,255,.90)';
    const border = d ? 'rgba(52,211,153,.08)' : 'rgba(5,150,105,.10)';
    const pageIcons={home:'🏠',imams:'👑',dua:'🤲',library:'📚',blog:'📝',tasbeeh:'📿',
        media:'🎬',calendar:'📅',quiz:'🧠',qibla:'🧭',familyTree:'🌳',bookmarks:'🔖',about:'ℹ️',contact:'📞'};
    return `
    <header style="background:${bg};border-bottom:1.5px solid ${border};" class="sticky top-0 z-30" id="main-header">
        <div class="max-w-7xl mx-auto px-4" style="padding-top:10px;padding-bottom:10px">
            <div class="flex items-center justify-between gap-2">

                <!-- LEFT: Hamburger + Logo -->
                <div class="flex items-center gap-3">
                    <!-- Hamburger (mobile) -->
                    <button data-action="toggleMenu" aria-label="মেনু"
                        class="md:hidden focus:outline-none transition-all hover:scale-110"
                        style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'}">
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <line x1="0" y1="1" x2="18" y2="1"/>
                            <line x1="3" y1="7" x2="18" y2="7"/>
                            <line x1="6" y1="13" x2="18" y2="13"/>
                        </svg>
                    </button>

                    <!-- Logo -->
                    <button data-action="changePage" data-param="home"
                        class="flex items-center gap-2.5 focus:outline-none group" aria-label="হোম">
                        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 16px rgba(5,150,105,.45);transition:transform var(--t-spring),box-shadow var(--t-base)" class="group-hover:scale-110">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3C8 3 4.5 6.5 4.5 11C4.5 15.5 8 19 12 19C10 16.5 9 14 9 11C9 7.5 10.5 4.5 14 3.5C13.4 3.2 12.7 3 12 3Z" fill="#fbbf24" opacity=".95"/>
                                <circle cx="16" cy="6" r="2" fill="white" opacity=".9"/>
                                <circle cx="13.5" cy="3" r="1.2" fill="#fde68a" opacity=".85"/>
                            </svg>
                        </div>
                        <div class="hidden sm:block">
                            <div class="font-bold text-sm leading-tight" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${l==='bn'?'আহলে বাইত':'Ahl al-Bayt'}</div>
                            <div class="text-xs leading-tight" style="color:${d?'#34d399':'#059669'};opacity:.85">${l==='bn'?'ইসলামিক জ্ঞান':'Islamic Knowledge'}</div>
                        </div>
                    </button>
                </div>

                <!-- CENTER: Desktop nav -->
                <nav class="hidden md:flex items-center gap-0.5">
                    ${mainPages.map(page=>`
                    <button data-action="changePage" data-param="${page}"
                        class="nav-pill px-3.5 py-2 rounded-xl text-sm focus:outline-none transition-all
                        ${state.currentPage===page
                            ?(d?'bg-emerald-900/60 text-emerald-300 font-bold':'bg-emerald-50 text-emerald-700 font-bold')
                            :(d?'text-gray-400 hover:text-white hover:bg-white/5 font-medium':'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium')}
                        ${state.currentPage===page?'active':''}"
                        style="${state.currentPage===page?'font-weight:700':''}"
                    >${pageIcons[page]??''} ${t(page)}</button>`).join('')}

                    <!-- More dropdown -->
                    <div class="relative" id="more-menu-wrap">
                        <button onclick="const dd=document.getElementById('more-dropdown');dd.classList.toggle('hidden')"
                            class="px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1 focus:outline-none transition-all"
                            style="color:${d?'#9ca3af':'#6b7280'}">
                            ${l==='bn'?'আরো':'More'}
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3.5l3 3 3-3"/></svg>
                        </button>
                        <div id="more-dropdown" class="hidden absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden"
                            style="background:${d?'rgba(6,20,16,.97)':'rgba(255,255,255,.97)'};backdrop-filter:blur(24px);border:1px solid ${border}">
                            ${morePages.map(page=>`
                            <button data-action="changePage" data-param="${page}"
                                class="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-all
                                ${state.currentPage===page?(d?'bg-emerald-900/50 text-emerald-300 font-semibold':'bg-emerald-50 text-emerald-700 font-semibold'):(d?'text-gray-300 hover:bg-white/5':'text-gray-700 hover:bg-gray-50')}"
                            ><span style="font-size:.95rem">${pageIcons[page]??'📄'}</span>${t(page)}</button>`).join('')}
                        </div>
                    </div>
                </nav>

                <!-- RIGHT: Utility buttons -->
                <div class="flex items-center gap-1">
                    <!-- Search -->
                    <button data-action="changePage" data-param="searchPage" aria-label="সার্চ"
                        class="focus:outline-none transition-all hover:scale-110"
                        style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'};color:${d?'#9ca3af':'#6b7280'}">
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5L18 18"/></svg>
                    </button>

                    <!-- Font size +/- -->
                    <div class="flex items-center gap-0.5 rounded-xl px-1 py-1" style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'}">
                        <button data-action="setFontSize" data-param="${fontSizes[Math.max(0,fontSizes.indexOf(state.fontSize)-1)]}"
                            class="w-6 h-6 rounded-lg flex items-center justify-center font-bold focus:outline-none hover:scale-110 transition-all"
                            style="color:${d?'#9ca3af':'#6b7280'}">−</button>
                        <span class="text-xs font-bold px-0.5 select-none" style="color:${d?'#6b7280':'#9ca3af'}">A</span>
                        <button data-action="setFontSize" data-param="${fontSizes[Math.min(fontSizes.length-1,fontSizes.indexOf(state.fontSize)+1)]}"
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
                    <button data-action="toggleDarkMode" aria-label="থিম পরিবর্তন"
                        class="focus:outline-none hover:scale-110 transition-all"
                        style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${d?'rgba(251,191,36,.12)':'rgba(0,0,0,.05)'}">
                        ${d
                            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
                            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
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
    const allPages=['home','blog','dua','imams','familyTree','library','media','calendar','tasbeeh','quiz','bookmarks','about','contact','searchPage','analytics'];
    const icons={home:'🏠',blog:'📝',imams:'👑',familyTree:'🌳',dua:'🤲',library:'📚',
        media:'🎬',calendar:'📅',tasbeeh:'📿',quiz:'🧠',bookmarks:'🔖',
        about:'ℹ️',contact:'📞',searchPage:'🔍',analytics:'📊'};
    const border = d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';
    return `
    <!-- Backdrop -->
    <div id="mobile-menu-backdrop"
        class="fixed inset-0 z-40 ${state.menuOpen?'show':'hidden'}"
        style="background:rgba(0,0,0,.6);backdrop-filter:blur(6px)"
        data-action="toggleMenu"></div>

    <!-- Drawer -->
    <div class="mobile-menu ${state.menuOpen?'open':''} fixed top-0 left-0 bottom-0 z-50 w-72 overflow-y-auto flex flex-col"
        style="background:${d?'rgba(6,18,14,.98)':'rgba(255,255,255,.98)'};backdrop-filter:blur(24px);box-shadow:12px 0 48px rgba(0,0,0,.25);border-right:1px solid ${border}">

        <!-- Header -->
        <div class="flex items-center justify-between p-5" style="border-bottom:1px solid ${border};flex-shrink:0">
            <div class="flex items-center gap-3">
                <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(5,150,105,.4)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3C8 3 4.5 6.5 4.5 11C4.5 15.5 8 19 12 19C10 16.5 9 14 9 11C9 7.5 10.5 4.5 14 3.5C13.4 3.2 12.7 3 12 3Z" fill="#fbbf24"/>
                        <circle cx="16" cy="6" r="1.8" fill="white" opacity=".9"/>
                    </svg>
                </div>
                <div>
                    <div class="font-bold text-sm" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${l==='bn'?'আহলে বাইত':'Ahl al-Bayt'}</div>
                    <div class="text-xs" style="color:${d?'#34d399':'#059669'};opacity:.8">${l==='bn'?'ইসলামিক জ্ঞান':'Islamic Knowledge'}</div>
                </div>
            </div>
            <button data-action="toggleMenu" aria-label="বন্ধ"
                style="width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};color:${d?'#9ca3af':'#6b7280'}"
                class="hover:scale-110 transition-all focus:outline-none">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <path d="M1 1l12 12M13 1L1 13"/>
                </svg>
            </button>
        </div>

        <!-- Nav items -->
        <nav class="p-3 flex-1 space-y-1" style="overflow-y:auto">
            ${allPages.map(page=>{
                const active = state.currentPage===page;
                return `
                <button data-action="changePage" data-param="${page}"
                    class="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-sm transition-all focus:outline-none text-left"
                    style="${active
                        ? 'background:linear-gradient(135deg,rgba(5,150,105,.18),rgba(5,150,105,.08));color:#059669;border:1.5px solid rgba(5,150,105,.22);font-weight:700'
                        : 'border:1.5px solid transparent;color:'+(d?'#d1d5db':'#374151')+';font-weight:500'}">
                    <span style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;${active?'background:rgba(5,150,105,.16)':'background:'+(d?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)')}">
                        ${icons[page]||'📄'}
                    </span>
                    <span class="flex-1">${t(page)}</span>
                    ${active?'<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg>':''}
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
                        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2"/></svg> Light'
                        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> Dark'
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
    const quickLinks=['home','blog','imams','dua','library','tasbeeh','quiz','asmaul','qibla','contact'];
    return `
    <footer class="footer-luxury mt-16" style="position:relative;overflow:hidden">

        <!-- Geo pattern overlay -->
        <div style="position:absolute;inset:0;pointer-events:none;opacity:.06;background-image:repeating-linear-gradient(60deg,transparent,transparent 38px,rgba(5,150,105,1) 38px,rgba(5,150,105,1) 39px),repeating-linear-gradient(-60deg,transparent,transparent 38px,rgba(180,83,9,.8) 38px,rgba(180,83,9,.8) 39px)"></div>

        <!-- Gold shimmer top border -->
        <div style="height:2px;background:linear-gradient(90deg,transparent,#059669,#c9a227,#059669,transparent);background-size:200% 100%;animation:goldShimmer 3s linear infinite"></div>

        <!-- Mosque silhouette -->
        <div style="width:100%;overflow:hidden;line-height:0;opacity:.22;margin-bottom:-2px">
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
        <div style="width:100%;height:24px;overflow:hidden;opacity:.18">
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
                        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(5,150,105,.45);flex-shrink:0">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3C8 3 4.5 6.5 4.5 11C4.5 15.5 8 19 12 19C10 16.5 9 14 9 11C9 7.5 10.5 4.5 14 3.5C13.4 3.2 12.7 3 12 3Z" fill="#fbbf24" opacity=".95"/>
                                <circle cx="16" cy="6" r="2" fill="white" opacity=".9"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-white leading-tight">${l==='bn'?'আহলে বাইত (আ.)':'Ahl al-Bayt (a.s)'}</h3>
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
                        <a href="${href}" target="_blank" rel="noopener noreferrer" title="${label}"
                            style="width:40px;height:40px;border-radius:12px;background:${color}20;border:1px solid ${color}35;
                            display:flex;align-items:center;justify-content:center;color:${color};
                            transition:transform var(--t-spring),box-shadow var(--t-base)"
                            onmouseover="this.style.transform='scale(1.18) translateY(-3px)';this.style.boxShadow='0 8px 20px ${color}45'"
                            onmouseout="this.style.transform='';this.style.boxShadow=''">
                            ${svg}
                        </a>`).join('')}
                    </div>
                </div>

                <!-- Quick links -->
                <div>
                    <h4 class="font-bold text-white mb-4 flex items-center gap-2">
                        <span style="width:20px;height:2px;background:linear-gradient(90deg,#059669,#c9a227);border-radius:2px"></span>
                        ${l==='bn'?'দ্রুত লিংক':'Quick Links'}
                    </h4>
                    <div class="grid grid-cols-2 gap-y-2 gap-x-3">
                        ${quickLinks.map(p=>`
                        <button data-action="changePage" data-param="${p}"
                            class="text-left text-sm transition-all hover:translate-x-1"
                            style="color:rgba(255,255,255,.5);display:flex;align-items:center;gap:5px"
                            onmouseover="this.style.color='#34d399'"
                            onmouseout="this.style.color='rgba(255,255,255,.5)'">
                            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                            ${t(p)}
                        </button>`).join('')}
                    </div>
                </div>

                <!-- Contact -->
                <div>
                    <h4 class="font-bold text-white mb-4 flex items-center gap-2">
                        <span style="width:20px;height:2px;background:linear-gradient(90deg,#059669,#c9a227);border-radius:2px"></span>
                        ${l==='bn'?'যোগাযোগ':'Contact'}
                    </h4>
                    <div class="space-y-3">
                        <a href="mailto:theroleofahlalbaytas@gmail.com"
                            class="flex items-center gap-3 text-sm transition-all"
                            style="color:rgba(255,255,255,.5)"
                            onmouseover="this.style.color='#34d399'"
                            onmouseout="this.style.color='rgba(255,255,255,.5)'">
                            <span style="width:32px;height:32px;border-radius:10px;background:rgba(5,150,105,.15);border:1px solid rgba(5,150,105,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            </span>
                            theroleofahlalbaytas@gmail.com
                        </a>
                        <a href="tel:+8801636428274"
                            class="flex items-center gap-3 text-sm transition-all"
                            style="color:rgba(255,255,255,.5)"
                            onmouseover="this.style.color='#34d399'"
                            onmouseout="this.style.color='rgba(255,255,255,.5)'">
                            <span style="width:32px;height:32px;border-radius:10px;background:rgba(5,150,105,.15);border:1px solid rgba(5,150,105,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
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
                </p>`}
        </div>
    </div>`;
}
// ============================================================================
// PAGE: HOME
// ============================================================================
function renderHomePage()
{
    const d=state.darkMode; const l=state.language;

    /* ── Feature cards data ── */
    const features=[
        {icon:'👑',title:l==='bn'?'ইমামগণ':'The Imams',       desc:l==='bn'?'১৪ মাসুমিনের জীবনী':'Lives of 14 Masumeen',    page:'imams',   color:'#059669',bg:'rgba(5,150,105,.1)', faint:'rgba(5,150,105,.25)'},
        {icon:'📝',title:t('blog'),                              desc:l==='bn'?'ইসলামিক প্রবন্ধ':'Islamic writings',            page:'blog',    color:'#0369a1',bg:'rgba(3,105,161,.1)',  faint:'rgba(3,105,161,.25)'},
        {icon:'🤲',title:l==='bn'?'দোয়া ও যিয়ারত':'Dua & Ziyarat',desc:l==='bn'?'দোয়া সংকলন':'Supplications',              page:'dua',     color:'#7c3aed',bg:'rgba(124,58,237,.1)',faint:'rgba(124,58,237,.25)'},
        {icon:'📚',title:l==='bn'?'লাইব্রেরি':'Library',       desc:l==='bn'?'ইসলামিক কিতাব':'Islamic books',                page:'library', color:'#047857',bg:'rgba(4,120,87,.1)',  faint:'rgba(4,120,87,.25)'},
        {icon:'📿',title:l==='bn'?'তাসবিহ':'Tasbeeh',          desc:l==='bn'?'ডিজিটাল তাসবিহ':'Digital counter',             page:'tasbeeh', color:'#059669',bg:'rgba(5,150,105,.1)', faint:'rgba(5,150,105,.25)'},
        {icon:'🧠',title:l==='bn'?'কুইজ':'Quiz',               desc:l==='bn'?'জ্ঞান পরীক্ষা':'Test your knowledge',           page:'quiz',    color:'#dc2626',bg:'rgba(220,38,38,.1)',faint:'rgba(220,38,38,.25)'},
        {icon:'☀️',title:l==='bn'?'৯৯ নাম':'99 Names',         desc:l==='bn'?'আসমাউল হুসনা':'Names of Allah',               page:'asmaul',  color:'#b45309',bg:'rgba(180,83,9,.1)', faint:'rgba(180,83,9,.25)'},
        {icon:'🧭',title:l==='bn'?'কিবলা':'Qibla',             desc:l==='bn'?'কিবলার দিক':'Qibla direction',                 page:'qibla',   color:'#0d9488',bg:'rgba(13,148,136,.1)',faint:'rgba(13,148,136,.25)'},
    ];

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
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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

            <!-- Stats row -->
            <div class="hero-stats-row">
                ${[
                    [l==='bn'?'১':'1',       l==='bn'?'আল্লাহ':'Allah'],
                    [l==='bn'?'১২৪,৩১৩':'124,313', l==='bn'?'নবী-রাসূল':'Prophets'],
                    [l==='bn'?'১৪':'14',     l==='bn'?'মাসুমিন':'Masumeen'],
                    [l==='bn'?'৭২':'72',     l==='bn'?'কারবালার শহীদ':'Karbala Martyrs'],
                    [l==='bn'?'৯৯':'99',     l==='bn'?'আসমাউল হুসনা':'Names of Allah'],
                ].map(([num,label])=>`
                <div class="hero-stat-item">
                    <span class="hero-stat-num">${num}</span>
                    <div class="hero-stat-label">${label}</div>
                </div>`).join('')}
            </div>
        </div>
    </div>

    <!-- ④ FEATURE CARDS GRID -->
    <div style="margin-bottom:3.5rem">
        <div class="section-heading reveal">
            <span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#059669,#047857);display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;box-shadow:0 4px 12px rgba(5,150,105,.4)">✨</span>
            <h2 class="section-title">${l==='bn'?'বিভাগসমূহ':'Sections'}</h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${features.map((f,fi)=>`
            <button data-action="changePage" data-param="${f.page}"
                class="feature-card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border text-left w-full p-5 reveal reveal-delay-${fi%4+1}"
                style="box-shadow:var(--shadow-sm);--fc-accent:${f.color};--fc-accent-bg:${f.bg};--fc-accent-faint:${f.faint}">
                <span class="feature-card-badge">${f.title}</span>
                <div class="feature-card-content">
                    <div class="feature-icon-wrap" style="background:${f.bg};border-color:${f.faint}">${f.icon}</div>
                    <h3 class="font-bold text-sm mb-1" style="color:${d?'#f9fafb':'#111827'}">${f.title}</h3>
                    <p class="text-xs leading-relaxed" style="color:${d?'#9ca3af':'#6b7280'}">${f.desc}</p>
                    <div class="feature-card-link">
                        ${l==='bn'?'দেখুন':'Explore'}
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                    </div>
                </div>
            </button>`).join('')}
        </div>
    </div>

    <!-- ⑤ ISLAMIC CALENDAR & SPECIAL DAYS -->
    <div style="margin-bottom:3rem">
        <div class="section-heading reveal">
            <span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#dc2626,#7f1d1d);display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;box-shadow:0 4px 12px rgba(220,38,38,.35)">🌙</span>
            <h2 class="section-title">${l==='bn'?'ইসলামিক ক্যালেন্ডার':'Islamic Calendar'}</h2>
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
                <div style="font-size:2rem;margin-bottom:.55rem">${c.icon}</div>
                <h4 style="font-weight:800;font-size:.95rem;color:white;margin-bottom:.3rem">${c.title}</h4>
                <p style="font-size:.75rem;color:rgba(255,255,255,.78);line-height:1.5">${c.desc}</p>
            </button>`).join('')}
        </div>
    </div>

    <!-- ⑥ WIDGETS COLUMN -->
    <div class="space-y-5">

        <!-- Prayer times -->
        ${renderPrayerWidget()}

        <!-- Hadith of the Day -->
        <div class="card-luxury ${d?'bg-gradient-to-br from-purple-950 to-blue-950 border-purple-900':'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border p-5 reveal" style="box-shadow:var(--shadow-md)">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold flex items-center gap-2">
                    <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:.8rem">📜</span>
                    ${t('hadithOfDay')}
                </h3>
                ${state.isAdmin?`<button data-action="openHadithEditor" class="${d?'bg-purple-800 text-purple-200':'bg-purple-100 text-purple-700'} text-xs px-3 py-1 rounded-lg font-semibold hover:opacity-80">✏️ ${l==='bn'?'এডিট':'Edit'}</button>`:''}
            </div>
            <div class="${d?'bg-black/20':'bg-white/60'} rounded-2xl p-4">
                <p class="text-sm leading-relaxed mb-3 italic">"${sanitize(l==='bn'?getDailyHadith().textBn:getDailyHadith().textEn)}"</p>
                <p class="text-xs font-bold" style="${d?'color:#fbbf24':'color:#7c3aed'}">— ${sanitize(l==='bn'?getDailyHadith().sourceBn:getDailyHadith().sourceEn)}</p>
            </div>
            <div class="flex items-center justify-between mt-3 gap-2">
                <div class="flex gap-1">
                    <button data-action="hadithPrev" class="${d?'bg-purple-900 text-purple-200 hover:bg-purple-800':'bg-purple-100 text-purple-700 hover:bg-purple-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">‹ ${l==='bn'?'আগে':'Prev'}</button>
                    <button data-action="hadithNext" class="${d?'bg-purple-900 text-purple-200 hover:bg-purple-800':'bg-purple-100 text-purple-700 hover:bg-purple-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">${l==='bn'?'পরে':'Next'} ›</button>
                </div>
                <button data-action="shareHadith" class="${d?'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800':'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    ${l==='bn'?'শেয়ার':'Share'}
                </button>
            </div>
        </div>

        <!-- Daily Ayah -->
        <div class="ayah-widget p-5 reveal" style="box-shadow:var(--shadow-md)">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold flex items-center gap-2">
                    <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#c9a227,#b45309);display:flex;align-items:center;justify-content:center;font-size:.8rem">📖</span>
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
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    ${l==='bn'?'শেয়ার':'Share'}
                </button>
            </div>
        </div>

        <!-- Follow Us -->
        <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-5 reveal" style="box-shadow:var(--shadow-sm)">
            <h3 class="text-sm font-bold mb-4 flex items-center gap-2">
                <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#1d4ed8,#1e40af);display:flex;align-items:center;justify-content:center;font-size:.8rem">🌐</span>
                ${l==='bn'?'আমাদের অনুসরণ করুন':'Follow Us'}
            </h3>
            <div class="space-y-2">
                ${[
                    ['https://www.facebook.com/profile.php?id=100090495041094', l==='bn'?'ফেসবুক পেজ':'Facebook Page', '#1877f2','rgba(24,119,242,.12)',
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'],
                    ['https://www.instagram.com/ahl.al.bayt.a.s/', l==='bn'?'ইনস্টাগ্রাম':'Instagram', '#e1306c','rgba(225,48,108,.12)',
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>'],
                    ['https://www.youtube.com/@Ahl_al-Bayt_a.s', l==='bn'?'ইউটিউব':'YouTube', '#ff0000','rgba(255,0,0,.12)',
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>'],
                    ['https://x.com/Ahl_al_Bayt_a_s', l==='bn'?'টুইটার (X)':'Twitter (X)', d?'#e7e9ea':'#0f172a','rgba(15,23,42,.08)',
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'],
                ].map(([href,label,color,bg,icon])=>`
                <a href="${href}" target="_blank" rel="noopener noreferrer"
                    class="flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:translate-x-1 hover:scale-[1.01]"
                    style="background:${bg};color:${color};border:1px solid ${color}28">
                    ${icon}
                    <span class="flex-1">${label}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>
                </a>`).join('')}
            </div>
        </div>

    </div>`;
}
// ============================================================================
// PAGE: LIBRARY (PDF)
// ============================================================================
function renderLibraryPage() {
    const d=state.darkMode; const l=state.language;
    const tab = state.libraryTab || '';
    const folders = [
        {key:'pdf',         icon:'📕', color:'#059669', grad:'linear-gradient(135deg,#022c22,#065f46)', label:l==='bn'?'দোয়া ও যিয়ারত':'Dua & Ziyarat',     list:state.pdfList},
        {key:'nahjul',      icon:'📖', color:'#1d4ed8', grad:'linear-gradient(135deg,#1e1b4b,#1d4ed8)', label:l==='bn'?'নাহজুল বালাগা':'Nahjul Balagha',     list:state.nahjulPdfs||[]},
        {key:'sahifa',      icon:'🌹', color:'#7c3aed', grad:'linear-gradient(135deg,#2e1065,#7c3aed)', label:l==='bn'?'সাহিফা সাজ্জাদিয়্যা':'Sahifa Sajjadiya',list:state.sahifaPdfs||[]},
        {key:'imamhadiths', icon:'⭐', color:'#0d9488', grad:'linear-gradient(135deg,#042f2e,#0d9488)', label:l==='bn'?'ইমামদের হাদিস':'Imam Hadiths',        list:state.imamHadithPdfs||[]},
        {key:'specialdays', icon:'✨', color:'#dc2626', grad:'linear-gradient(135deg,#450a0a,#dc2626)', label:l==='bn'?'বিশেষ দিন':'Special Days',             list:state.specialDayPdfs||[]},
    ];

    // Folder grid view
    if (!tab) return `
    <div class="space-y-8 page-enter">
        <div class="reveal">
            <h2 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#0369a1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                📚 ${t('library')}
            </h2>
            <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'ইসলামিক কিতাব ও পিডিএফ সংকলন':'Islamic books & PDF collection'}</p>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 reveal">
            ${folders.map(f=>`
            <button data-action="setLibraryTab" data-param="${f.key}"
                class="feature-card-luxury text-left w-full focus:outline-none"
                style="background:${f.grad};border:1px solid ${f.color}30;box-shadow:0 6px 24px ${f.color}22;
                padding:1.5rem 1.2rem 1.8rem;--fc-accent:${f.color};--fc-accent-bg:${f.color}18;--fc-accent-faint:${f.color}35">
                <div class="feature-card-content" style="text-align:center">
                    <div style="font-size:2.6rem;margin-bottom:.75rem;filter:drop-shadow(0 2px 8px ${f.color}55)">${f.icon}</div>
                    <p class="font-bold text-sm leading-snug mb-2" style="color:white">${f.label}</p>
                    <span style="font-size:.7rem;font-weight:700;padding:3px 12px;border-radius:50px;
                        background:rgba(255,255,255,.15);color:rgba(255,255,255,.9)">
                        ${f.list.length} ${l==='bn'?'টি পিডিএফ':'PDFs'}
                    </span>
                </div>
            </button>`).join('')}
        </div>
    </div>`;

    // Inside folder
    const folder = folders.find(f=>f.key===tab);
    if (!folder) { state.libraryTab=''; render(); return ''; }
    const listKeyMap={pdf:'pdfList',nahjul:'nahjulPdfs',sahifa:'sahifaPdfs',imamhadiths:'imamHadithPdfs',specialdays:'specialDayPdfs'};
    const listKey=listKeyMap[tab];

    return `
    <div class="space-y-6 page-enter">
        <!-- Back + header -->
        <div class="flex items-center justify-between flex-wrap gap-3 reveal">
            <div class="flex items-center gap-3">
                <button data-action="setLibraryTab" data-param=""
                    style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;
                    padding:8px 16px;border-radius:50px;cursor:pointer;transition:all .2s;
                    background:${folder.color}12;color:${folder.color};border:1.5px solid ${folder.color}30">
                    ← ${l==='bn'?'ফোল্ডারে ফিরুন':'Back'}
                </button>
                <h2 class="font-bold text-xl flex items-center gap-2">${folder.icon} ${folder.label}</h2>
            </div>
            ${state.isAdmin?`
            <button data-action="openFolderUpload" data-param="${tab}"
                style="font-size:12.5px;font-weight:700;padding:9px 20px;border-radius:50px;
                background:linear-gradient(135deg,${folder.color},${folder.color}bb);color:white;
                border:none;cursor:pointer;display:flex;align-items:center;gap:6px;
                box-shadow:0 4px 14px ${folder.color}40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                ${l==='bn'?'পিডিএফ আপলোড':'Upload PDF'}
            </button>`:''
        }
        </div>

        <!-- PDF grid -->
        ${folder.list.length===0?`
        <div class="text-center py-16 reveal" style="color:${d?'#6b7280':'#9ca3af'}">
            <div style="font-size:4rem;margin-bottom:1rem;opacity:.5">${folder.icon}</div>
            <p class="font-bold text-lg mb-1">${l==='bn'?'এই ফোল্ডারে কোনো পিডিএফ নেই':'This folder is empty'}</p>
            ${state.isAdmin
                ?`<p class="text-sm">${l==='bn'?'উপরের বাটন থেকে পিডিএফ আপলোড করুন':'Upload a PDF using the button above'}</p>`
                :`<p class="text-sm">${l==='bn'?'🔐 অ্যাডমিন শীঘ্রই আপলোড করবেন':'🔐 Admin will upload soon'}</p>`}
        </div>`:`
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            ${folder.list.map((pdf,pi)=>`
            <div class="card-luxury border flex flex-col reveal"
                style="background:${d?'#1e2a22':'#ffffff'};border-color:${d?'rgba(5,150,105,.15)':'rgba(5,150,105,.1)'};
                animation:fadeInUp .4s ease-out ${pi*.04}s both;box-shadow:var(--shadow-sm)">
                <div style="height:3px;background:${folder.color};border-radius:var(--r-lg) var(--r-lg) 0 0;flex-shrink:0"></div>
                <!-- Thumbnail -->
                <div class="flex items-center justify-center"
                    style="height:120px;background:${folder.grad};border-radius:0;flex-shrink:0">
                    <div style="font-size:3rem;filter:drop-shadow(0 4px 12px rgba(0,0,0,.3));opacity:.9">${folder.icon}</div>
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <h3 class="font-bold text-sm mb-1 leading-snug flex-1" style="color:${d?'#f9fafb':'#111827'}">${sanitize(pdf.name)}</h3>
                    <p class="text-xs mb-3" style="color:${d?'#6b7280':'#9ca3af'}">${sanitize(pdf.sizeFmt||'')} · ${sanitize(pdf.uploadDate||'')}</p>
                    <div class="flex gap-2">
                        <button data-action="openViewer" data-param="${pdf.id}" data-vtype="pdf" data-listkey="${listKey}"
                            style="flex:1;padding:8px;border-radius:12px;font-size:11.5px;font-weight:700;
                            background:linear-gradient(135deg,${folder.color},${folder.color}bb);
                            color:white;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            ${l==='bn'?'পড়ুন':'Read'}
                        </button>
                        <button data-action="downloadFile" data-param="${pdf.id}" data-name="${sanitize(pdf.name)}"
                            style="flex:1;padding:8px;border-radius:12px;font-size:11.5px;font-weight:700;
                            background:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.05)'};
                            color:${d?'#d1d5db':'#374151'};border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'};
                            cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            ${l==='bn'?'ডাউনলোড':'Download'}
                        </button>
                        ${state.isAdmin?`
                        <button data-action="deleteFile" data-param="${pdf.id}" data-listkey="${listKey}"
                            style="width:36px;border-radius:12px;background:rgba(220,38,38,.1);
                            border:1.5px solid rgba(220,38,38,.2);color:#ef4444;cursor:pointer;font-size:13px;
                            display:flex;align-items:center;justify-content:center">🗑</button>`:''
                        }
                    </div>
                </div>
            </div>`).join('')}
        </div>`}
    </div>`;
}
// ============================================================================
// PAGE: MEDIA (Image / Video / Audio)
// ============================================================================
function renderMediaPage() {
    const d=state.darkMode; const l=state.language;
    const tabs=[
        {key:'imageList', label:l==='bn'?'ছবি':'Images',  icon:'🖼️', type:'image', uploadKey:'image', color:'#7c3aed', grad:'linear-gradient(135deg,#3b0764,#7c3aed)'},
        {key:'videoList', label:l==='bn'?'ভিডিও':'Videos', icon:'🎬', type:'video', uploadKey:'video', color:'#dc2626', grad:'linear-gradient(135deg,#450a0a,#dc2626)'},
        {key:'audioList', label:l==='bn'?'অডিও':'Audio',   icon:'🎵', type:'audio', uploadKey:'audio', color:'#059669', grad:'linear-gradient(135deg,#022c22,#059669)'},
    ];
    return `
    <div class="space-y-10 page-enter">
        <div class="reveal">
            <h2 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#7c3aed,#dc2626);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                🎭 ${t('media')}
            </h2>
            <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'ছবি, ভিডিও ও অডিও সংকলন':'Images, videos & audio collection'}</p>
        </div>
        ${tabs.map(tab=>`
        <div class="reveal">
            <div class="section-heading">
                <span style="width:32px;height:32px;border-radius:10px;background:${tab.grad};display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;box-shadow:0 4px 12px ${tab.color}40">${tab.icon}</span>
                <h3 class="font-bold text-base" style="color:${d?'#f9fafb':'#111827'}">${tab.label}</h3>
                ${state.isAdmin?`
                <button data-action="openUploadModal" data-param="${tab.uploadKey}"
                    style="margin-left:auto;font-size:11.5px;font-weight:700;padding:6px 16px;border-radius:50px;
                    background:${tab.color}18;color:${tab.color};border:1.5px solid ${tab.color}30;cursor:pointer">
                    + ${l==='bn'?'আপলোড':'Upload'}
                </button>`:''}
            </div>
            ${(state[tab.key]||[]).length===0?`
            <div class="text-center py-10 rounded-2xl" style="border:2px dashed ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'}">
                <div style="font-size:3rem;margin-bottom:.6rem;opacity:.45">${tab.icon}</div>
                <p class="font-semibold text-sm" style="color:${d?'#6b7280':'#9ca3af'}">${l==='bn'?`কোনো ${tab.label} নেই`:`No ${tab.label} yet`}</p>
                <p class="text-xs mt-1" style="color:${d?'#4b5563':'#d1d5db'}">${l==='bn'?'অ্যাডমিন শীঘ্রই যোগ করবেন':'Admin will add content soon'}</p>
            </div>`:`
            <div class="grid sm:grid-cols-2 ${tab.type==='audio'?'md:grid-cols-2':'md:grid-cols-3'} gap-4">
                ${(state[tab.key]||[]).map((item,pi)=>renderMediaCard(item,tab.type,tab.key,d,l,tab.color,tab.grad,pi)).join('')}
            </div>`}
        </div>`).join('')}
    </div>`;
}

function renderMediaCard(item, type, listKey, d, l, color='#059669', grad='linear-gradient(135deg,#022c22,#059669)', pi=0) {
    color = color||'#059669'; grad = grad||'linear-gradient(135deg,#022c22,#059669)';
    const thumb = type==='image'
        ? `<div style="height:160px;border-radius:0;overflow:hidden;background:${d?'#111827':'#f3f4f6'};position:relative">
               ${item.cloudUrl
                   ?`<img src="${item.cloudUrl}" style="width:100%;height:100%;object-fit:cover" alt="${sanitize(item.name)}" loading="lazy"/>`
                   :`<img src="" data-src-id="${item.id}" class="lazy-img" style="width:100%;height:100%;object-fit:cover" alt="${sanitize(item.name)}" loading="lazy"/>`}
               <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.3),transparent);pointer-events:none"></div>
           </div>`
        : type==='video'
        ? `<div style="height:160px;background:${d?'#0f172a':'#1e293b'};position:relative;overflow:hidden">
               ${item.cloudUrl?`<video src="${item.cloudUrl}" style="width:100%;height:100%;object-fit:cover;opacity:.65" muted preload="metadata"></video>`:''}
               <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                   <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,${color},${color}bb);box-shadow:0 4px 20px ${color}60;display:flex;align-items:center;justify-content:center">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                   </div>
               </div>
           </div>`
        : `<div style="height:100px;background:${grad};display:flex;align-items:center;justify-content:center">
               <div style="text-align:center">
                   <div style="font-size:2.2rem;margin-bottom:.3rem">🎵</div>
                   <div style="width:44px;height:3px;background:rgba(255,255,255,.4);border-radius:2px;margin:0 auto"></div>
               </div>
           </div>`;
    return `
    <div class="card-luxury border flex flex-col"
        style="background:${d?'#1e2a22':'#ffffff'};border-color:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)'};
        box-shadow:var(--shadow-sm);animation:fadeInUp .4s ease-out ${pi*.04}s both;overflow:hidden">
        <div style="height:2.5px;background:${color};flex-shrink:0"></div>
        ${thumb}
        <div class="p-4 flex flex-col flex-1">
            <h4 class="font-semibold text-sm mb-1 truncate" style="color:${d?'#f9fafb':'#111827'}">${sanitize(item.name)}</h4>
            <p class="text-xs mb-3" style="color:${d?'#6b7280':'#9ca3af'}">${sanitize(item.sizeFmt||'')} · ${sanitize(item.uploadDate||'')}</p>
            <div class="flex gap-2 mt-auto">
                <button data-action="openViewer" data-param="${item.id}" data-vtype="${type}" data-listkey="${listKey}"
                    style="flex:1;padding:7px;border-radius:10px;font-size:11.5px;font-weight:700;
                    background:linear-gradient(135deg,${color},${color}bb);color:white;border:none;cursor:pointer;
                    display:flex;align-items:center;justify-content:center;gap:5px">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    ${l==='bn'?(type==='audio'?'শুনুন':'দেখুন'):(type==='audio'?'Play':'View')}
                </button>
                <button data-action="downloadFile" data-param="${item.id}" data-name="${sanitize(item.name)}"
                    style="flex:1;padding:7px;border-radius:10px;font-size:11.5px;font-weight:700;
                    background:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.05)'};
                    color:${d?'#d1d5db':'#374151'};border:1.5px solid ${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)'};
                    cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    ${l==='bn'?'ডাউনলোড':'Download'}
                </button>
                ${state.isAdmin?`
                <button data-action="deleteFile" data-param="${item.id}" data-listkey="${listKey}"
                    style="width:34px;border-radius:10px;background:rgba(220,38,38,.1);border:1.5px solid rgba(220,38,38,.2);
                    color:#ef4444;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">🗑</button>`:''
                }
            </div>
        </div>
    </div>`;
}
// ============================================================================
// PAGE: VIEWER (PDF / Image / Video / Audio)
// ============================================================================
function renderViewerPage() {
    const d=state.darkMode; const l=state.language;
    const item=state.viewerItem; const type=state.viewerType;
    if(!item) return renderMediaPage();
    return `
    <div class="max-w-5xl mx-auto">
        <button data-action="changePage" data-param="${state.previousPage||'media'}"
            class="${d?'text-green-400':'text-green-600'} mb-5 flex items-center gap-2 hover:underline focus:outline-none"
        >← ${l==='bn'?'ফিরে যান':'Back'}</button>
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6">
            <div class="flex justify-between items-start mb-5 flex-wrap gap-3">
                <div>
                    <h2 class="text-xl font-bold">${sanitize(item.name)}</h2>
                    <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${sanitize(item.sizeFmt)} • ${sanitize(item.uploadDate)}</p>
                </div>
                <button data-action="downloadFile" data-param="${item.id}" data-name="${sanitize(item.name)}"
                    class="${d?'bg-green-900 text-green-300':'bg-green-600 text-white'} px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 flex items-center gap-2"
                >⬇ ${l==='bn'?'ডাউনলোড':'Download'}</button>
            </div>
            ${state.viewerLoading?`
                <div class="flex flex-col items-center justify-center py-20">
                    <div class="animate-spin text-4xl mb-4">⏳</div>
                    <p class="${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'লোড হচ্ছে...':'Loading...'}</p>
                </div>`
            : state.viewerData ? renderViewerContent(type, state.viewerData, item, d, l)
            : `<div class="text-center py-20 text-red-500">${l==='bn'?'ফাইল লোড করা যায়নি':'Could not load file'}</div>`}
        </div>
    </div>`;
}

function renderViewerContent(type, data, item, d, l) {
    const dlBtn = (label) => `
        <button data-action="downloadFile" data-param="${item.id}" data-name="${sanitize(item.name)}"
            class="px-6 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 mx-auto"
            style="background:linear-gradient(135deg,#059669,#047857);box-shadow:0 4px 16px rgba(5,150,105,.4)">
            ⬇ ${label}
        </button>`;

    if (type==='pdf') {
        const isCloud = data.startsWith('http');
        // For cloud URLs, use direct iframe (works for most modern browsers)
        if (isCloud) {
            return `
            <div class="rounded-xl overflow-hidden" style="height:80vh;background:${d?'#111827':'#f9fafb'}">
                <iframe src="${data}" class="w-full h-full border-0 rounded-xl" title="${sanitize(item.name)}"></iframe>
            </div>
            <div class="flex flex-wrap justify-center items-center gap-3 mt-4">
                <p class="text-xs ${d?'text-gray-500':'text-gray-400'} w-full text-center">
                    ${l==='bn'?'লোড না হলে নিচের বাটন ব্যবহার করুন':'If it does not load, use the buttons below'}
                </p>
                ${dlBtn(l==='bn'?'PDF ডাউনলোড করুন':'Download PDF')}
            </div>`;
        }
        // Fallback for locally stored PDF
        return `
        <div class="rounded-xl overflow-hidden" style="height:80vh;background:${d?'#111827':'#f9fafb'}">
            <iframe src="${data}" class="w-full h-full border-0 rounded-xl" title="${sanitize(item.name)}"></iframe>
        </div>
        <div class="flex flex-wrap justify-center items-center gap-3 mt-4">
            <p class="text-xs ${d?'text-gray-500':'text-gray-400'} w-full text-center">
                ${l==='bn'?'লোড না হলে নিচের বাটন ব্যবহার করুন':'If it does not load, use the buttons below'}
            </p>
            ${dlBtn(l==='bn'?'PDF ডাউনলোড করুন':'Download PDF')}
        </div>`; }

    if (type==='image') return `
        <div class="flex flex-col gap-4">
            <div class="flex justify-center ${d?'bg-gray-900':'bg-gray-50'} rounded-xl p-4" style="min-height:300px">
                <img src="${data}" class="max-w-full max-h-screen rounded-xl object-contain" alt="${sanitize(item.name)}" />
            </div>
            <div class="flex justify-center">${dlBtn(l==='bn'?'ছবি ডাউনলোড করুন':'Download Image')}</div>
        </div>`;

    if (type==='video') return `
        <div class="flex flex-col gap-4">
            <video src="${data}" class="w-full rounded-xl" style="max-height:75vh" controls playsinline>
                ${l==='bn'?'আপনার ব্রাউজার ভিডিও সাপোর্ট করে না':'Your browser does not support video'}
            </video>
            <div class="flex justify-center">${dlBtn(l==='bn'?'ভিডিও ডাউনলোড করুন':'Download Video')}</div>
        </div>`;

    if (type==='audio') return `
        <div class="${d?'bg-gray-900':'bg-gradient-to-br from-green-50 to-emerald-100'} rounded-2xl p-10 text-center">
            <div class="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
                style="background:linear-gradient(135deg,#059669,#047857);box-shadow:0 8px 32px rgba(5,150,105,.4)">🎵</div>
            <h3 class="text-lg font-bold mb-2">${sanitize(item.name)}</h3>
            <p class="text-xs ${d?'text-gray-500':'text-gray-400'} mb-6">${sanitize(item.sizeFmt)} • ${sanitize(item.uploadDate)}</p>
            <audio src="${data}" class="w-full mb-6" controls>
                ${l==='bn'?'আপনার ব্রাউজার অডিও সাপোর্ট করে না':'Your browser does not support audio'}
            </audio>
            <div class="flex justify-center">${dlBtn(l==='bn'?'অডিও ডাউনলোড করুন':'Download Audio')}</div>
        </div>`;

    return '';
}

// ============================================================================
// PAGE: BLOG
// ============================================================================
// ✓ renderBlogPage moved to blog.js

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
                <h2 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    🤲 ${t('dua')}
                </h2>
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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    ${l==='bn'?'নতুন দোয়া':'Add Dua'}
                </button>`:''}
                ${tab==='ziyarat'?`
                <button data-action="openDuaEditor" data-param="ziyarat"
                    style="font-size:12.5px;font-weight:700;padding:9px 18px;border-radius:50px;
                    background:linear-gradient(135deg,#b45309,#92400e);color:white;border:none;
                    cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(180,83,9,.38)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    ${l==='bn'?'নতুন যিয়ারত':'Add Ziyarat'}
                </button>`:''}
            </div>`:''
        }
        </div>

        <!-- Tab switcher -->
        <div class="flex gap-2 p-1 rounded-2xl w-fit reveal"
            style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}">
            <button data-action="setDuaTab" data-param="dua"
                style="padding:9px 22px;border-radius:14px;font-size:.85rem;font-weight:700;
                cursor:pointer;transition:all .22s;border:none;
                background:${tab==='dua'?'linear-gradient(135deg,#059669,#047857)':'transparent'};
                color:${tab==='dua'?'white':(d?'#9ca3af':'#6b7280')};
                box-shadow:${tab==='dua'?'0 4px 14px rgba(5,150,105,.38)':'none'}">
                🤲 ${l==='bn'?'দোয়া':'Duas'}
                <span style="font-size:.7rem;opacity:.75;margin-left:4px">${allDuas.length}</span>
            </button>
            <button data-action="setDuaTab" data-param="ziyarat"
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
                    return `<button data-action="setDuaCategory" data-param="${f.key}"
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
                                    <h3 class="font-bold text-base" style="color:${d?'#f9fafb':'#111827'}">${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}</h3>
                                </div>
                                ${dua.source?`<p class="text-xs" style="color:${d?'#6b7280':'#9ca3af'}">${sanitize(dua.source)}</p>`:''}
                            </div>
                            ${state.isAdmin&&isCustom?`
                            <div class="flex gap-1 flex-shrink-0">
                                <button data-action="editCustomDua" data-param="${dua.id}" data-dtype="dua"
                                    style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;background:${d?'rgba(59,130,246,.15)':'rgba(59,130,246,.1)'};border:1px solid rgba(59,130,246,.25);color:${d?'#93c5fd':'#1d4ed8'}">✏️</button>
                                <button data-action="deleteCustomDua" data-param="${dua.id}" data-dtype="dua"
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
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
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
                                <h3 class="font-bold text-base" style="color:${d?'#f9fafb':'#111827'}">${sanitize(l==='bn'?z.titleBn:z.titleEn)}</h3>
                            </div>
                            ${z.occasion?`<p class="text-xs font-semibold mt-1" style="color:${d?'#fbbf24':'#92400e'}">📅 ${sanitize(z.occasion)}</p>`:''}
                            ${z.source?`<p class="text-xs mt-0.5" style="color:${d?'#6b7280':'#9ca3af'}">${sanitize(z.source)}</p>`:''}
                        </div>
                        ${state.isAdmin?`
                        <div class="flex gap-1 flex-shrink-0">
                            <button data-action="editCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                                style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;background:${d?'rgba(59,130,246,.15)':'rgba(59,130,246,.1)'};border:1px solid rgba(59,130,246,.25)">✏️</button>
                            <button data-action="deleteCustomDua" data-param="${z.id}" data-dtype="ziyarat"
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
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
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
        <h2 class="text-3xl font-bold">📅 ${t('calendar')}</h2>
        <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-200'} border rounded-2xl overflow-hidden" style="box-shadow:0 4px 24px rgba(0,0,0,.10)">

            <!-- ── HEADER ── -->
            <div style="background:${d?'#1e3a2f':'#166534'}" class="px-5 py-4 flex items-center justify-between">
                <button data-action="calPrev"
                    class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xl text-white hover:bg-white/20 transition-all focus:outline-none"
                    style="background:rgba(255,255,255,.15)">‹</button>
                <div class="text-center text-white">
                    <h3 class="text-xl font-black tracking-wide">${monthNameHijri} ${l==='bn'?toBengaliDigits(year):year} ${l==='bn'?'হিজরি':'AH'}</h3>
                    <p style="font-size:.75rem;opacity:.8;margin-top:2px">${l==='bn'?gregRangeBn:gregRange}</p>
                    ${l==='bn'?`<p style="font-size:.68rem;opacity:.65;margin-top:1px">${gregRange}</p>`:""}
                </div>
                <button data-action="calNext"
                    class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xl text-white hover:bg-white/20 transition-all focus:outline-none"
                    style="background:rgba(255,255,255,.15)">›</button>
            </div>

            <!-- ── DAY HEADERS ── -->
            <div class="grid grid-cols-7" style="background:${d?'#111827':'#f1f5f9'}">
                ${[0,1,2,3,4,5,6].map(i=>{
                    const isFri=i===5, isSat=i===6;
                    const bg = isFri ? '#dc2626' : isSat ? '#1d4ed8' : (d?'#374151':'#475569');
                    return `<div style="background:${bg};color:white;text-align:center;padding:7px 2px;font-size:.72rem;font-weight:700;letter-spacing:.03em">
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

                    return `<div class="${isTodayGreg?'calendar-today-cell':''}" style="background:${cellBg};min-height:72px;padding:3px 4px;position:relative;display:flex;flex-direction:column;justify-content:space-between;align-items:stretch;cursor:${ev?'pointer':'default'};transition:all .2s ease" role="gridcell" 
                        ${ev?`onclick="showCalendarEventPopover({month:${month},day:${day},year:${year},event:${JSON.stringify(ev).replace(/"/g,'&quot;')},language:'${l}'});event.stopPropagation()" onmouseover="this.style.boxShadow='inset 0 0 8px rgba(5,150,105,.2)'" onmouseout="this.style.boxShadow=''"`:''}
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
                <span style="color:${d?'#f3f4f6':'#111827'};font-weight:700">■</span> ${l==='bn'?'ইংরেজি তারিখ':'Gregorian date'} &nbsp;
                <span style="color:#1d4ed8;font-weight:700">■</span> ${l==='bn'?'বাংলা তারিখ':'Bangla date'} &nbsp;
                <span style="color:#dc2626;font-weight:700">■</span> ${l==='bn'?'হিজরি তারিখ':'Hijri date'} &nbsp;
                <span style="color:#f59e0b;font-weight:700">●</span> ${l==='bn'?'ইসলামিক ঘটনা':'Islamic event'} &nbsp;
                <span style="color:#059669;font-weight:700">●</span> ${l==='bn'?'ইমামের জন্মদিন':'Imam Birthday'} &nbsp;
                <span style="color:#dc2626;font-weight:700">●</span> ${l==='bn'?'ইমামের শাহাদাত':'Imam Martyrdom'}
            </div>

            <!-- ── EVENTS LIST ── -->
            ${(()=>{
                const evs=Object.entries(hijriEvents)
                    .filter(([k])=>parseInt(k.split('-')[0])===month)
                    .sort((a,b)=>parseInt(a[0].split('-')[1])-parseInt(b[0].split('-')[1]));
                if(!evs.length) return '';
                return `<div class="px-5 py-4 border-t ${d?'border-gray-700':'border-gray-200'}">
                    <h4 class="font-bold text-sm mb-3">${l==='bn'?'📌 এই মাসের ইসলামিক দিবস':'📌 Islamic Events This Month'}</h4>
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
        <h2 class="text-3xl font-bold">✉️ ${t('contact')}</h2>
        <div class="grid md:grid-cols-2 gap-8">
            <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-8">
                <h3 class="text-xl font-bold mb-6">${l==='bn'?'বার্তা পাঠান':'Send a Message'}</h3>
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
                    <h3 class="font-bold mb-4">${l==='bn'?'সরাসরি যোগাযোগ':'Direct Contact'}</h3>
                    <p class="${d?'text-gray-300':'text-gray-700'} mb-2">📧 theroleofahlalbaytas@gmail.com</p>
                    <p class="${d?'text-gray-300':'text-gray-700'}">📞 +880 1636428274</p>
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
function renderImamsPage()
{
    const d=state.darkMode; const l=state.language;

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
    const renderCard = (im, idx, acList, ac2List, conicList) => {
        const ac    = acList[idx % acList.length];
        const ac2   = ac2List[idx % ac2List.length];
        const conic = conicList[idx % conicList.length];
        const flipId= `imam-flip-${im.id}`;
        const quoteText   = sanitize(l==='bn'?im.quoteBn:im.quoteEn);
        const avatarArabic= im.arabicName ? im.arabicName.split(' ')[0] : (im.icon||'✦');

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
            <div class="imam-card-luxury imam-card-front border text-center p-5"
                id="${flipId}-front"
                style="display:flex;flex-direction:column;
                    background:${d?'#1e2d26':'#ffffff'};
                    border-color:${d?'rgba(52,211,153,.15)':'rgba(5,150,105,.1)'};
                    box-shadow:var(--shadow-sm);height:100%;border-radius:var(--r-lg)"
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
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" style="display:inline;margin-left:4px"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
                    </button>
                    <button data-action="shareImamQuote" data-param="${im.id}"
                        class="px-3 py-2.5 rounded-xl text-xs font-bold hover:scale-110 transition-all flex items-center justify-center"
                        style="background:${ac}15;color:${ac};border:1.5px solid ${ac}30"
                        title="${l==='bn'?'শেয়ার করুন':'Share'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
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
                <h2 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    👑 ${t('imams')}
                </h2>
                <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">
                    ${l==='bn'?'পবিত্র নবী, মাসুমিন ও ১২ ইমামের জীবনী':'Lives of the Holy Prophet, Masumeen & 12 Imams'}
                </p>
            </div>
            <button data-action="toggleTimeline"
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style="${state.showTimeline
                    ? 'background:rgba(5,150,105,.14);color:#059669;border:1.5px solid rgba(5,150,105,.38)'
                    : 'border:1.5px solid '+(d?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)')+';color:'+(d?'#6b7280':'#9ca3af')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
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
                <span style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#c9a227,#78350f);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;box-shadow:0 4px 14px rgba(201,162,39,.38)">✨</span>
                <h3 class="font-black text-lg" style="color:${d?'#f9fafb':'#111827'}">
                    ${l==='bn'?'নবী ও মাসুমিন (আ.)':'Prophet & Masumeen (AS)'}
                </h3>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                    style="background:rgba(201,162,39,.15);color:#c9a227;border:1px solid rgba(201,162,39,.3)">
                    ${l==='bn'?'২ জন':'2'}
                </span>
            </div>
            <div class="grid sm:grid-cols-2 gap-5 items-stretch">
                ${masumeen.map((im,idx)=>`
                <div style="min-height:320px">${renderCard(im,idx,MACS,MACS2,MCONIC)}</div>`).join('')}
            </div>
        </div>

        <!-- ── ১২ ইমাম section ── -->
        <div class="reveal">
            <div class="section-heading">
                <span style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;box-shadow:0 4px 14px rgba(5,150,105,.4)">👑</span>
                <h3 class="font-black text-lg" style="color:${d?'#f9fafb':'#111827'}">
                    ${l==='bn'?'বারো ইমাম (আ.)':'The Twelve Imams (AS)'}
                </h3>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                    style="background:rgba(5,150,105,.12);color:#059669;border:1px solid rgba(5,150,105,.25)">
                    ${l==='bn'?'১২ জন':'12'}
                </span>
            </div>
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                ${imams.map((im,idx)=>`
                <div id="imam-anchor-${im.id}">${renderCard(im,idx,ACS,ACS2,CONIC)}</div>`).join('')}
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
    return `
    <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl p-6 fade-in" style="box-shadow:var(--shadow-md)">
        <div class="gold-top-bar" style="border-radius:12px 12px 0 0;margin:-24px -24px 20px"></div>
        <h3 class="text-base font-bold mb-1 text-center">${l==='bn'?'ইমামদের জীবনকাল টাইমলাইন':'Imams Lifetime Timeline'}</h3>
        <p class="text-center text-xs mb-5" style="color:${d?'#6b7280':'#9ca3af'}">${l==='bn'?'খ্রিস্টাব্দ ৬০০–৮৮০':'600 CE – 880 CE'}</p>
        <div class="space-y-2.5">
            ${timelineImams.map((im,idx)=>{
                const startPct=Math.max(0,((im.birthYear-minYear)/range)*100);
                const endYear=typeof im.deathYear==='number'?im.deathYear:maxYear;
                const widthPct=Math.max(2,((endYear-im.birthYear)/range)*100);
                const c=barColors[idx%barColors.length];
                return `
                <div class="flex items-center gap-3">
                    <div class="text-right flex-shrink-0" style="width:130px">
                        <span class="text-xs font-semibold" style="color:${d?'#d1d5db':'#374151'}">${im.icon} ${sanitize(l==='bn'?im.nameBn.replace('ইমাম ',''):im.nameEn.replace('Imam ',''))}</span>
                    </div>
                    <div class="flex-1 relative" style="height:26px">
                        <div class="w-full h-full absolute rounded-full" style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}"></div>
                        <div class="h-full absolute rounded-full flex items-center px-2 overflow-hidden"
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
function renderQuizPage() {
    const d=state.darkMode; const l=state.language;
    if (state.quizFinished) {
        const score=state.quizScore; const total=quizQuestions.length;
        const pct=Math.round(score/total*100);
        return `
        <div class="space-y-8">
            <h2 class="text-3xl font-bold">🧠 ${t('quiz')}</h2>
            <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-10 text-center max-w-lg mx-auto">
                <div class="text-7xl mb-6">${pct>=80?'🏆':pct>=50?'👍':'📖'}</div>
                <h3 class="text-2xl font-bold mb-2">${l==='bn'?'কুইজ সম্পন্ন!':'Quiz Complete!'}</h3>
                <p class="text-5xl font-bold ${d?'text-green-400':'text-green-600'} my-6">${score}/${total}</p>
                <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-xl p-4 mb-8">
                    <div class="h-4 ${d?'bg-gray-700':'bg-gray-200'} rounded-full overflow-hidden">
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
            <h2 class="text-3xl font-bold">🧠 ${t('quiz')}</h2>
            <span class="${d?'text-gray-400':'text-gray-500'} text-sm">${state.quizIndex+1} / ${quizQuestions.length}</span>
        </div>
        <div class="${d?'bg-gray-900':'bg-gray-100'} rounded-full h-2 overflow-hidden">
            <div class="bg-green-500 h-2 rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-8 max-w-2xl mx-auto">
            <p class="text-sm font-medium ${d?'text-green-400':'text-green-600'} mb-4">${l==='bn'?'প্রশ্ন':'Question'} ${state.quizIndex+1}</p>
            <h3 class="text-xl font-bold mb-8">${sanitize(l==='bn'?q.qBn:q.qEn)}</h3>
            <div class="space-y-3">
                ${q.options.map((opt,i)=>{
                    let cls = `quiz-option border-2 ${d?'bg-gray-900 border-gray-700':'bg-gray-50 border-gray-200'} rounded-xl px-5 py-4 w-full text-left font-medium`;
                    if (state.quizAnswered!==null) {
                        if (i===q.correct) cls+=' correct';
                        else if (i===state.quizAnswered) cls+=' wrong';
                    }
                    return `<button data-action="quizAnswer" data-param="${i}" class="${cls}" ${state.quizAnswered!==null?'disabled="disabled"':''}>
                        <span class="${d?'text-gray-400':'text-gray-400'} mr-3">${['A','B','C','D'][i]}.</span>
                        ${sanitize(l==='bn'?opt.bn:opt.en)}
                    </button>`;
                }).join('')}
            </div>
        </div>
        <div class="text-center">
            <p class="${d?'text-gray-400':'text-gray-500'} text-sm">${l==='bn'?'স্কোর':'Score'}: ${state.quizScore}/${state.quizIndex+(state.quizAnswered!==null?1:0)}</p>
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
            <h2 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                📿 ${t('tasbeeh')}
            </h2>
            <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'ডিজিটাল তাসবিহ কাউন্টার':'Digital Tasbeeh Counter'}</p>
        </div>

        <!-- Dhikr selector -->
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 1px 6px" class="reveal">
            <div style="display:flex;gap:8px;width:max-content">
                ${DHIKR.map((dk,i)=>`
                <button data-action="selectTasbeeh" data-param="${i}"
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
                <p class="arabic-text mb-1" dir="rtl" style="font-size:1.7rem;line-height:1.9;color:${ac}">${dhikr.ar}</p>
                <p class="font-bold text-sm mb-5" style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?dhikr.bn:dhikr.en} · ${l==='bn'?'লক্ষ্য':'Target'}: ${dhikr.target}</p>

                <!-- SVG ring progress -->
                <div style="position:relative;width:154px;height:154px;margin:0 auto 1.5rem">
                    <svg width="154" height="154" style="transform:rotate(-90deg)">
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
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                        ${l==='bn'?'রিসেট':'Reset'}
                    </button>
                    <button data-action="saveTasbeehHistory"
                        style="padding:10px 24px;border-radius:50px;font-size:12.5px;font-weight:700;
                        background:${ac}18;color:${ac};border:1.5px solid ${ac}30;cursor:pointer;
                        display:flex;align-items:center;gap:6px;transition:all .2s">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        ${l==='bn'?'সেভ করুন':'Save'}
                    </button>
                </div>
            </div>
        </div>

        <!-- History -->
        ${history.length>0?`
        <div class="reveal">
            <div class="section-heading">
                <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6b7280,#374151);display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0">📊</span>
                <h3 class="font-bold text-sm" style="color:${d?'#f9fafb':'#111827'}">${l==='bn'?'ইতিহাস':'History'}</h3>
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
function renderSearchPage() {
    const d=state.darkMode; const l=state.language;
    const q=(state.searchQuery||'').trim();
    const results=q?performSearch(q):[];
    // Bug fix: highlight matching query text in results
    function hl(text) {
        if(!q||!text) return sanitize(text||'');
        const safe = sanitize(text);
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        if(!escaped) return safe;
        return safe.replace(new RegExp(escaped,'gi'), m=>`<mark style="background:rgba(5,150,105,.25);color:inherit;border-radius:2px;padding:0 1px">${m}</mark>`);
    }

    return `
    <div class="space-y-6 page-enter">

        <!-- Header -->
        <div class="reveal">
            <h2 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#059669,#0369a1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                🔍 ${l==='bn'?'সার্চ':'Search'}
            </h2>
        </div>

        <!-- Search box -->
        <div class="reveal" style="position:relative">
            <div style="position:absolute;left:16px;top:50%;transform:translateY(-50%);pointer-events:none;color:${d?'#6b7280':'#9ca3af'}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            <input
                id="search-input"
                type="search"
                value="${sanitize(q)}"
                placeholder="${l==='bn'?'দোয়া, ইমাম, ব্লগ পোস্ট খুঁজুন...':'Search duas, imams, blog posts...'}"
                oninput="state.searchQuery=this.value;requestAnimationFrame(()=>document.getElementById('search-results')?.replaceWith(createSearchResults()))"
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
            ${q?`<button onclick="state.searchQuery='';render()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:${d?'rgba(255,255,255,.1)':'rgba(0,0,0,.06)'};border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${d?'#9ca3af':'#6b7280'}">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M1 1l12 12M13 1L1 13"/></svg>
            </button>`:''}
        </div>

        <!-- Results -->
        <div id="search-results">
            ${!q?`
            <div class="text-center py-16 reveal" style="color:${d?'#6b7280':'#9ca3af'}">
                <div style="font-size:3.5rem;margin-bottom:1rem;opacity:.4">🔍</div>
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
            </div>`
            :results.length===0?`
            <div class="text-center py-16 reveal" style="color:${d?'#6b7280':'#9ca3af'}">
                <div style="font-size:3rem;margin-bottom:.75rem;opacity:.45">📭</div>
                <p class="font-bold text-base">"${sanitize(q)}" ${l==='bn'?'এর জন্য কোনো ফলাফল নেই':'returned no results'}</p>
                <p class="text-sm mt-1">${l==='bn'?'ভিন্ন শব্দ দিয়ে চেষ্টা করুন':'Try different keywords'}</p>
            </div>`:`
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
                        border:1px solid ${r.color||'#059669'}22">
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
            </div>`}
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
        <h2 class="text-3xl font-bold">ℹ️ ${t('about')}</h2>
        <article class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-8">
            <p class="text-lg mb-6">${l==='bn'?'আহলে বাইত (আ.) ওয়েবসাইটে আপনাকে স্বাগতম। আমরা ইসলামিক জ্ঞান ছড়িয়ে দিতে প্রতিশ্রুতিবদ্ধ।':'Welcome to the Ahl al-Bayt (a.s) website. We are committed to spreading authentic Islamic knowledge.'}</p>
            <div class="space-y-4">
                <h3 class="text-xl font-bold">${l==='bn'?'আমাদের লক্ষ্য':'Our Mission'}</h3>
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
    return `
    <div class="space-y-8">
        <h2 class="text-3xl font-bold">🔖 ${t('bookmarks')}</h2>
        ${bkPosts.length===0?`
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
            </div>`}
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


// ============================================================================
// PAGE: ASMAUL HUSNA (99 Names of Allah)
// ============================================================================
function renderAsmaulHusnaPage() {
    const d=state.darkMode; const l=state.language;
    const colors=['#059669','#b45309','#7c3aed','#0369a1','#dc2626','#0d9488','#c9a227','#065f46'];
    return `
    <div class="space-y-8 page-slide-in">
        <div>
            <h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">☀️ ${l==='bn'?'আসমাউল হুসনা':'Asmaul Husna'}</h2>
            <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'আল্লাহর ৯৯টি সুন্দর নাম':'99 Beautiful Names of Allah'}</p>
        </div>
        <div class="text-center py-4">
            <p class="arabic-text" dir="rtl" style="font-size:2rem;color:${d?'#c9a227':'#92400e'};text-shadow:0 0 20px rgba(201,162,39,.3)">لِلَّهِ الأَسْمَاءُ الحُسْنَى</p>
            <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-2">${l==='bn'?'আল্লাহর জন্যই রয়েছে সুন্দর নামসমূহ (সূরা আল-আরাফ: ১৮০)':'To Allah belong the most beautiful names (Surah Al-A\'raf: 180)'}</p>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            ${asmaulHusna.map((nm,i)=>{
                const c=colors[i%colors.length];
                return `
                <div class="asma-card asma-revealed ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border text-center p-4" style="box-shadow:var(--shadow-sm);border-top:3px solid ${c};animation-delay:${(i%10)*0.04}s">
                    <div class="text-xs font-bold mb-2 w-6 h-6 rounded-full flex items-center justify-center mx-auto" style="background:${c}20;color:${c}">${nm.num}</div>
                    <p class="arabic-text mb-2" dir="rtl" style="font-size:1.3rem;line-height:1.8;color:${c}">${nm.arabic}</p>
                    <p class="text-xs font-bold mb-0.5" style="color:${c}">${nm.name}</p>
                    <p class="text-xs ${d?'text-gray-400':'text-gray-500'} leading-snug">${l==='bn'?nm.meaning:nm.meaningEn}</p>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

// ============================================================================
// PAGE: QIBLA FINDER
// ============================================================================
function initQiblaCompass() {
    if (!window._qiblaOrientBound && window.qiblaAngleForCompass != null) {
        window._qiblaOrientBound = true;
        window.addEventListener('deviceorientationabsolute', _handleQiblaOrient, true);
        window.addEventListener('deviceorientation', _handleQiblaOrient, true);
    }
}
function _handleQiblaOrient(e) {
    const alpha = e.webkitCompassHeading != null ? e.webkitCompassHeading : (360 - (e.alpha || 0));
    const needle = document.querySelector('.qibla-needle');
    if (needle && window.qiblaAngleForCompass != null) {
        needle.style.transform = `rotate(${window.qiblaAngleForCompass - alpha}deg)`;
        needle.style.transformOrigin = '110px 110px';
    }
}
// ✅ FIXED: Cleanup Qibla compass listeners when leaving page (Bug #25)
function cleanupQiblaCompass() {
    if (window._qiblaOrientBound) {
        window.removeEventListener('deviceorientationabsolute', _handleQiblaOrient, true);
        window.removeEventListener('deviceorientation', _handleQiblaOrient, true);
        window._qiblaOrientBound = false;
    }
}
function renderQiblaPage() {
    const d=state.darkMode; const l=state.language;
    const hasLoc = !!state.userLocation;
    const qiblaAngle = hasLoc ? findQibla(state.userLocation.latitude, state.userLocation.longitude) : null;
    window.qiblaAngleForCompass = qiblaAngle;
    if (hasLoc) requestAnimationFrame(initQiblaCompass);
    return `
    <div class="space-y-8 page-slide-in">
        <div>
            <h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🧭 ${l==='bn'?'কিবলা নির্দেশক':'Qibla Finder'}</h2>
            <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'আপনার অবস্থান থেকে কাবার দিক':'Direction to Kaaba from your location'}</p>
        </div>
        <div class="max-w-md mx-auto">
            <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-8 text-center" style="box-shadow:var(--shadow-lg)">
                <div class="gold-top-bar" style="border-radius:var(--r-lg) var(--r-lg) 0 0;margin:-2rem -2rem 1.5rem"></div>
                ${hasLoc ? `
                <div style="position:relative;width:220px;height:220px;margin:0 auto 2rem">
                    <!-- Compass ring -->
                    <svg width="220" height="220" viewBox="0 0 220 220" style="position:absolute;inset:0">
                        <circle cx="110" cy="110" r="100" fill="none" stroke="${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.06)'}" stroke-width="2"/>
                        <circle cx="110" cy="110" r="90" fill="none" stroke="${d?'rgba(5,150,105,.3)':'rgba(5,150,105,.2)'}" stroke-width="1" stroke-dasharray="4 6"/>
                        ${[0,90,180,270].map(a=>{
                            const dirs = ['N','E','S','W']; const dn = [l==='bn'?'উ':'N',l==='bn'?'পূ':'E',l==='bn'?'দ':'S',l==='bn'?'প':'W'];
                            const rad=(a-90)*Math.PI/180; const x=110+95*Math.cos(rad); const y=110+95*Math.sin(rad);
                            return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="${d?'#9ca3af':'#6b7280'}">${dn[a/90]}</text>`;
                        }).join('')}
                        <!-- Qibla needle -->
                        <g class="qibla-needle" style="transform:rotate(${qiblaAngle}deg);transform-origin:110px 110px">
                            <polygon points="110,30 116,110 104,110" fill="url(#qn)" opacity=".9"/>
                            <polygon points="110,190 116,110 104,110" fill="${d?'#374151':'#d1d5db'}"/>
                            <circle cx="110" cy="110" r="8" fill="${d?'#1f2937':'white'}" stroke="#059669" stroke-width="2"/>
                        </g>
                        <defs>
                            <linearGradient id="qn" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="#c9a227"/>
                                <stop offset="100%" stop-color="#059669"/>
                            </linearGradient>
                        </defs>
                        <!-- Kaaba icon at tip -->
                        <g style="transform:rotate(${qiblaAngle}deg);transform-origin:110px 110px">
                            <text x="110" y="22" text-anchor="middle" font-size="14">🕋</text>
                        </g>
                    </svg>
                </div>
                <div class="mb-6">
                    <p class="text-5xl font-black mb-2" style="background:linear-gradient(135deg,#059669,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${qiblaAngle}°</p>
                    <p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'উত্তর থেকে কিবলার কোণ':'Qibla angle from North'}</p>
                </div>
                <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-2xl p-4 mb-4">
                    <p class="text-xs font-semibold ${d?'text-gray-400':'text-gray-500'} mb-1">${l==='bn'?'আপনার অবস্থান':'Your Location'}</p>
                    <p class="font-bold text-sm">${state.userLocation.latitude.toFixed(4)}°N, ${state.userLocation.longitude.toFixed(4)}°E</p>
                </div>
                <p class="text-xs ${d?'text-gray-500':'text-gray-400'} leading-relaxed">${l==='bn'?'* উপরের কম্পাস ডায়াল উত্তর দিকে ধরুন এবং সোনালী তীরের দিকে মুখ করুন।':'* Hold the compass dial facing North and face the golden arrow direction.'}</p>
                ` : `
                <div class="py-8">
                    <div class="text-6xl mb-4">🧭</div>
                    <p class="font-bold text-lg mb-2">${l==='bn'?'অবস্থান প্রয়োজন':'Location Required'}</p>
                    <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mb-6">${l==='bn'?'কিবলার দিক জানতে আপনার অবস্থানের অনুমতি দিন।':'Allow location access to find the Qibla direction.'}</p>
                    <button onclick="getUserLocation()" class="px-6 py-3 rounded-2xl font-bold text-white" style="background:linear-gradient(135deg,#059669,#065f46)">📍 ${l==='bn'?'অবস্থান শেয়ার করুন':'Share Location'}</button>
                </div>
                `}
            </div>
        </div>
    </div>`;
}

// ============================================================================
// BLOG EDITOR MODAL
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
                    if(document.getElementById('ke-type')) extra.type=document.getElementById('ke-type').value;
                    if(document.getElementById('ke-number')) extra.number=document.getElementById('ke-number').value;
                    if(document.getElementById('ke-topic')) extra.topic=document.getElementById('ke-topic').value;
                    if(document.getElementById('ke-occasion')) extra.occasion=document.getElementById('ke-occasion').value;
                    if(document.getElementById('ke-translit')) extra.transliteration=document.getElementById('ke-translit').value;
                    if(document.getElementById('ke-meaningBn')) extra.meaningBn=document.getElementById('ke-meaningBn').value;
                    if(document.getElementById('ke-imamBn')) extra.imamBn=document.getElementById('ke-imamBn').value;
                    if(document.getElementById('ke-imamEn')) extra.imamEn=document.getElementById('ke-imamEn').value;
                    if(document.getElementById('ke-hijriDate')) extra.hijriDate=document.getElementById('ke-hijriDate').value;
                    if(document.getElementById('ke-imam')) extra.imam=document.getElementById('ke-imam').value;
                    if(document.getElementById('ke-dua')) extra.dua=document.getElementById('ke-dua').value;
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

// ✓ renderBlogEditorModal moved to blog.js

// ============================================================================
// DUA / ZIYARAT EDITOR MODAL
// ============================================================================
function renderDuaEditorModal() {
    if (!state.showDuaEditor || !state.editingDua) return '';
    const d=state.darkMode; const l=state.language;
    const item=state.editingDua;
    const type=state.duaEditorType; // 'dua' | 'ziyarat'
    const isNew=!item.id || !((type==='dua'?state.customDuas:state.customZiyarat).find(x=>x.id===item.id));
    const isZiyarat=type==='ziyarat';
    const accentColor=isZiyarat?'amber':'green';
    return `
    <div class="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto" id="dua-editor-overlay">
        <div class="${d?'bg-gray-900 border-gray-700':'bg-white border-gray-200'} border rounded-2xl w-full max-w-2xl shadow-2xl fade-in my-4">
            <!-- Header -->
            <div class="flex justify-between items-center p-6 border-b ${d?'border-gray-700':'border-gray-100'}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style="background:${isZiyarat?'#92400e22':'#05966922'}">${isZiyarat?'☪️':'🤲'}</div>
                    <div>
                        <h3 class="font-bold text-lg">${isNew?(isZiyarat?(l==='bn'?'নতুন যিয়ারত যোগ':'Add New Ziyarat'):(l==='bn'?'নতুন দোয়া যোগ':'Add New Dua')):(isZiyarat?(l==='bn'?'যিয়ারত সম্পাদনা':'Edit Ziyarat'):(l==='bn'?'দোয়া সম্পাদনা':'Edit Dua'))}</h3>
                        <p class="text-xs ${d?'text-gray-400':'text-gray-500'}">${isZiyarat?(l==='bn'?'যিয়ারত ট্যাবে দেখাবে':'Will appear in Ziyarat tab'):(l==='bn'?'দোয়া ট্যাবে দেখাবে':'Will appear in Duas tab')}</p>
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
                        placeholder="${isZiyarat?'যেমন: যিয়ারত আশুরা':'যেমন: দোয়ায়ে কুমাইল'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-${accentColor}-500" />
                </div>
                <!-- Title English -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'শিরোনাম (ইংরেজি)':'Title (English)'}</label>
                    <input id="dua-ed-titleEn" type="text" value="${sanitize(item.titleEn||'')}"
                        placeholder="${isZiyarat?'e.g. Ziyarat Ashura':'e.g. Dua Kumayl'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-${accentColor}-500" />
                </div>
                <!-- Arabic Text -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">عربي — ${l==='bn'?'আরবি পাঠ':'Arabic Text'} <span class="text-red-500">*</span></label>
                    <textarea id="dua-ed-arabic" dir="rtl" lang="ar"
                        placeholder="${l==='bn'?'এখানে আরবি পাঠ লিখুন...':'Enter Arabic text here...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-28 focus:outline-none focus:ring-2 focus:ring-${accentColor}-500"
                        style="font-family:'Amiri',serif;font-size:1.2rem;line-height:2">${sanitize(item.arabic||'')}</textarea>
                </div>
                <!-- Transliteration -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'উচ্চারণ (ঐচ্ছিক)':'Transliteration (optional)'}</label>
                    <input id="dua-ed-translit" type="text" value="${sanitize(item.transliteration||'')}"
                        placeholder="${l==='bn'?'যেমন: Allahumma inni as\'aluka...':'e.g. Allahumma inni as\'aluka...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-${accentColor}-500" />
                </div>
                <!-- Meaning Bengali -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'বাংলা অর্থ':'Bengali Meaning'} <span class="text-red-500">*</span></label>
                    <textarea id="dua-ed-meaningBn"
                        placeholder="${l==='bn'?'বাংলা অনুবাদ লিখুন...':'Enter Bengali translation...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-24 focus:outline-none focus:ring-2 focus:ring-${accentColor}-500">${sanitize(item.meaningBn||'')}</textarea>
                </div>
                <!-- Meaning English -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'ইংরেজি অর্থ':'English Meaning'}</label>
                    <textarea id="dua-ed-meaningEn"
                        placeholder="${l==='bn'?'ইংরেজি অনুবাদ লিখুন...':'Enter English translation...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-20 focus:outline-none focus:ring-2 focus:ring-${accentColor}-500">${sanitize(item.meaningEn||'')}</textarea>
                </div>
                <!-- Full Text Bengali -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'পূর্ণ পাঠ (বাংলা, ঐচ্ছিক)':'Full Text (Bengali, optional)'}</label>
                    <textarea id="dua-ed-fullBn"
                        placeholder="${l==='bn'?'সম্পূর্ণ দোয়া/যিয়ারতের পাঠ ও ব্যাখ্যা...':'Full text and explanation...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-28 focus:outline-none focus:ring-2 focus:ring-${accentColor}-500">${sanitize(item.fullTextBn||'')}</textarea>
                </div>
                <!-- Source -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'উৎস / সূত্র':'Source / Reference'}</label>
                    <input id="dua-ed-source" type="text" value="${sanitize(item.source||'')}"
                        placeholder="${l==='bn'?'যেমন: সাহিফায়ে সাজ্জাদিয়্যা, বিহারুল আনওয়ার...':'e.g. Sahifa al-Sajjadiyya, Bihar al-Anwar...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-${accentColor}-500" />
                </div>
                ${isZiyarat ? `
                <!-- Occasion (Ziyarat only) -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">${l==='bn'?'উপলক্ষ (যিয়ারতের জন্য)':'Occasion (for Ziyarat)'}</label>
                    <input id="dua-ed-occasion" type="text" value="${sanitize(item.occasion||'')}"
                        placeholder="${l==='bn'?'যেমন: আশুরা, প্রতি জুমা...':'e.g. Ashura, Every Friday...'}"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>` : ''}

                <!-- Verses (আয়াত বাই আয়াত) -->
                <div>
                    <label class="block mb-1.5 text-sm font-semibold">
                        📖 ${l==='bn'?'আয়াত বাই আয়াত (JSON, ঐচ্ছিক)':'Verse-by-Verse (JSON, optional)'}
                    </label>
                    <p class="text-xs mb-2 ${d?'text-gray-400':'text-gray-500'}">
                        ${l==='bn'?'প্রতিটি পঙক্তির আরবি + বাংলা অনুবাদ। ফরম্যাট: [{"ar":"আরবি","bn":"বাংলা অর্থ"},...]':'Each line Arabic + Bengali. Format: [{"ar":"Arabic","bn":"Bengali meaning"},...]'}
                    </p>
                    <textarea id="dua-ed-verses"
                        placeholder='[{"ar":"اللَّهُمَّ","bn":"হে আল্লাহ!"},{"ar":"إِنِّي","bn":"নিশ্চয়ই আমি"}]'
                        spellcheck="false"
                        class="${d?'bg-gray-800 border-gray-600 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full h-32 focus:outline-none focus:ring-2 focus:ring-${accentColor}-500 font-mono text-xs">${item.verses ? sanitize(JSON.stringify(item.verses, null, 2)) : ''}</textarea>
                    <div id="dua-ed-verses-error" class="text-xs text-red-500 mt-1 hidden">${l==='bn'?'JSON ফরম্যাট ঠিক নেই! উদাহরণ: [{"ar":"...","bn":"..."}]':'Invalid JSON! Example: [{"ar":"...","bn":"..."}]'}</div>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex gap-3 p-6 border-t ${d?'border-gray-700':'border-gray-100'}">
                <button data-action="saveDuaItem" class="${isZiyarat?'bg-amber-600 hover:bg-amber-700':'bg-green-600 hover:bg-green-700'} text-white flex-1 py-3 rounded-xl font-bold text-base transition-colors">
                    💾 ${isNew?(isZiyarat?(l==='bn'?'যিয়ারত সেভ করুন':'Save Ziyarat'):(l==='bn'?'দোয়া সেভ করুন':'Save Dua')):(l==='bn'?'আপডেট করুন':'Update')}
                </button>
                <button data-action="closeDuaEditor" class="${d?'bg-gray-700 hover:bg-gray-600':'bg-gray-100 hover:bg-gray-200'} px-6 py-3 rounded-xl font-semibold transition-colors">${l==='bn'?'বাতিল':'Cancel'}</button>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// READ ZIYARAT PAGE
// ============================================================================
function renderReadZiyaratPage() {
    const z=state.currentZiyarat; const d=state.darkMode; const l=state.language;
    if(!z) return renderDuaPage();
    const hasVerses = Array.isArray(z.verses) && z.verses.length > 0;

    const versesHtml = hasVerses ? z.verses.map((v, i) => {
        const isRepeat = !!v.repeat100;
        const label = v.repeatLabel || (l==='bn'?'১০০ বার পড়তে হবে':'Read 100 times');
        if(isRepeat) {
            // Special full-width block for 100-time sections
            return `
            <div class="dua-verse-row fade-in" style="
                border-bottom:2px solid ${d?'rgba(180,83,9,.35)':'rgba(180,83,9,.2)'};
                background:${d?'rgba(180,83,9,.09)':'rgba(254,243,199,.6)'};
                transition:background .2s;
            "
            onmouseenter="this.style.background='${d?'rgba(180,83,9,.16)':'rgba(253,230,138,.55)'}'"
            onmouseleave="this.style.background='${d?'rgba(180,83,9,.09)':'rgba(254,243,199,.6)'}'">
                <!-- Repeat-100 badge bar -->
                <div style="
                    display:flex;align-items:center;gap:.6rem;
                    padding:.6rem 1.4rem;
                    border-bottom:1px solid ${d?'rgba(180,83,9,.2)':'rgba(180,83,9,.12)'};
                    background:${d?'rgba(180,83,9,.15)':'rgba(251,191,36,.18)'};
                ">
                    <span style="
                        font-size:.7rem;font-weight:800;letter-spacing:.06em;
                        background:linear-gradient(135deg,#b45309,#d97706);
                        color:#fff;padding:.25rem .75rem;border-radius:999px;
                        white-space:nowrap;
                    ">🔁 ${sanitize(label)}</span>
                    <span style="font-size:.72rem;color:${d?'#fbbf24':'#92400e'};font-weight:600;">
                        ${l==='bn'?'(নিচের পাঠটি ১০০ বার পড়তে হবে)':'(Recite the text below 100 times)'}
                    </span>
                </div>
                <!-- Two-column content -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                    <div style="
                        padding:1.4rem 1.6rem;
                        border-right:2px solid ${d?'rgba(180,83,9,.3)':'rgba(180,83,9,.18)'};
                        text-align:right;direction:rtl;position:relative;
                    ">
                        <span style="
                            position:absolute;top:.7rem;left:.7rem;
                            width:22px;height:22px;border-radius:50%;
                            background:linear-gradient(135deg,#b45309,#d97706);
                            color:#fff;font-size:.6rem;font-weight:700;
                            display:flex;align-items:center;justify-content:center;
                            font-family:sans-serif;direction:ltr;
                        ">${i+1}</span>
                        <p class="arabic-text" lang="ar" style="
                            font-size:1.45rem;line-height:2.2;
                            color:${d?'#fde68a':'#92400e'};
                            text-shadow:0 0 18px ${d?'rgba(253,230,138,.15)':'rgba(180,83,9,.1)'};
                            margin:0;white-space:pre-line;
                        ">${sanitize(v.ar)}</p>
                    </div>
                    <div style="padding:1.4rem 1.6rem;display:flex;align-items:center;">
                        <p style="
                            font-size:.95rem;line-height:1.85;
                            color:${d?'#fde68a':'#92400e'};
                            margin:0;font-weight:500;white-space:pre-line;
                        ">${sanitize(v.bn)}</p>
                    </div>
                </div>
            </div>`;
        }
        // Normal verse row
        return `
        <div class="dua-verse-row fade-in" style="
            display:grid;grid-template-columns:1fr 1fr;gap:0;
            border-bottom:1px solid ${d?'rgba(255,255,255,.06)':'rgba(180,83,9,.08)'};
            transition:background .2s;
        "
        onmouseenter="this.style.background='${d?'rgba(5,150,105,.07)':'rgba(5,150,105,.04)'}'"
        onmouseleave="this.style.background='transparent'">
            <div style="
                padding:1.4rem 1.6rem;
                border-right:2px solid ${d?'rgba(180,83,9,.25)':'rgba(180,83,9,.15)'};
                text-align:right;direction:rtl;position:relative;
            ">
                <span style="
                    position:absolute;top:.7rem;left:.7rem;
                    width:22px;height:22px;border-radius:50%;
                    background:linear-gradient(135deg,#059669,#065f46);
                    color:#fff;font-size:.6rem;font-weight:700;
                    display:flex;align-items:center;justify-content:center;
                    font-family:sans-serif;direction:ltr;
                ">${i+1}</span>
                <p class="arabic-text" lang="ar" style="
                    font-size:1.45rem;line-height:2.2;
                    color:${d?'#fde68a':'#92400e'};
                    text-shadow:0 0 18px ${d?'rgba(253,230,138,.12)':'rgba(180,83,9,.08)'};
                    margin:0;
                ">${sanitize(v.ar)}</p>
            </div>
            <div style="padding:1.4rem 1.6rem;display:flex;align-items:center;">
                <p style="
                    font-size:.95rem;line-height:1.85;
                    color:${d?'#d1fae5':'#065f46'};
                    margin:0;font-weight:500;
                ">${sanitize(v.bn)}</p>
            </div>
        </div>`;
    }).join('') : '';

    const fallbackHtml = `
        <div class="rounded-2xl p-6 mb-4" style="background:${d?'linear-gradient(135deg,rgba(180,83,9,.1),rgba(5,150,105,.06))':'linear-gradient(135deg,#fef9e7,#ecfdf5)'};border:1px solid ${d?'rgba(180,83,9,.18)':'rgba(180,83,9,.12)'}">
            <p class="arabic-text text-center" dir="rtl" lang="ar" style="font-size:1.9rem;line-height:2.5;color:${d?'#fde68a':'#92400e'}">${sanitize(z.arabic)}</p>
        </div>
        <div class="${d?'bg-gray-900/60':'bg-amber-50/60'} rounded-2xl p-5 mb-4" style="border-left:3px solid #b45309">
            <p class="text-base leading-relaxed ${d?'text-gray-200':'text-gray-700'}">${sanitize(z.meaningBn)}</p>
        </div>
    `;

    return `
    <div class="max-w-4xl mx-auto page-enter">

        <button data-action="changePage" data-param="${state.previousPage||'dua'}"
            class="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all"
            style="background:rgba(180,83,9,.1);color:#b45309">
            ← ${l==='bn'?'যিয়ারতে ফিরুন':'Back to Ziyarat'}
        </button>

        <article style="border-radius:var(--r-xl,1rem);overflow:hidden;box-shadow:var(--shadow-lg);border:1px solid ${d?'rgba(255,255,255,.07)':'rgba(180,83,9,.12)'}">

            <!-- Gradient top bar -->
            <div style="height:5px;background:linear-gradient(90deg,#b45309,#fbbf24,#059669,#fbbf24,#b45309);background-size:300%;animation:gradMove 4s linear infinite"></div>

            <!-- Header -->
            <div style="background:${d?'linear-gradient(135deg,#1c1a0e,#1a2219)':'linear-gradient(135deg,#fffbea,#f0fdf4)'};padding:2rem 2rem 1.5rem">
                <div class="flex justify-between items-start gap-4 flex-wrap">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-3 flex-wrap">
                            <span class="text-xs px-3 py-1.5 rounded-full font-bold" style="background:rgba(180,83,9,.15);color:#b45309;border:1px solid rgba(180,83,9,.3)">☪️ ${l==='bn'?'যিয়ারত':'Ziyarat'}</span>
                            ${z.occasion?`<span class="text-xs px-2 py-1 rounded-full font-semibold" style="background:rgba(251,191,36,.15);color:#92400e;border:1px solid rgba(251,191,36,.3)">📅 ${sanitize(z.occasion)}</span>`:''}
                            ${hasVerses?`<span class="text-xs px-2 py-1 rounded-full font-semibold" style="background:rgba(5,150,105,.12);color:#065f46;border:1px solid rgba(5,150,105,.25)">${z.verses.length} ${l==='bn'?'পঙক্তি':'verses'}</span>`:''}
                        </div>
                        <h1 class="text-2xl md:text-3xl font-black leading-tight mb-1">${sanitize(l==='bn'?z.titleBn:z.titleEn)}</h1>
                        ${z.source?`<p class="text-sm mt-2" style="color:${d?'#fbbf24':'#b45309'}">📚 ${sanitize(z.source)}</p>`:''}
                    </div>
                </div>
            </div>

            ${hasVerses ? `
            <!-- Column headers -->
            <div style="
                display:grid;grid-template-columns:1fr 1fr;
                background:${d?'rgba(180,83,9,.12)':'rgba(180,83,9,.07)'};
                border-bottom:2px solid ${d?'rgba(180,83,9,.25)':'rgba(180,83,9,.15)'};
                padding:.6rem 1.6rem;gap:0;
            ">
                <div style="text-align:right;direction:rtl">
                    <span class="text-xs font-black tracking-widest uppercase" style="color:${d?'#fbbf24':'#b45309'}">العربية • আরবি পাঠ</span>
                </div>
                <div>
                    <span class="text-xs font-black tracking-widest uppercase" style="color:${d?'#fbbf24':'#b45309'}">বাংলা অনুবাদ</span>
                </div>
            </div>

            <div style="background:${d?'#130f00':'#fffdf5'}">
                ${versesHtml}
            </div>

            <div style="padding:1.2rem 1.6rem;background:${d?'rgba(180,83,9,.06)':'rgba(180,83,9,.04)'};border-top:1px solid ${d?'rgba(255,255,255,.05)':'rgba(180,83,9,.08)'}">
                <p class="text-xs text-center" style="color:${d?'#6b7280':'#9ca3af'}">
                    ${l==='bn'?'মোট '+z.verses.length+' পঙক্তি — আরবি ও বাংলা অনুবাদ সহ':'Total '+z.verses.length+' verses with Arabic & Bengali translation'}
                    ${z.source?' • '+sanitize(z.source):''}
                </p>
            </div>

            ` : `
            <div style="padding:2rem;background:${d?'#130f00':'#fffdf5'}">
                ${fallbackHtml}
            </div>`}

        </article>
    </div>`;
}

// ============================================================================
// MOBILE BOTTOM NAV
// ============================================================================
function renderMobileBottomNav() {
    const d=state.darkMode; const l=state.language;
    const nav=document.getElementById('mobile-bottom-nav'); // ✅ FIXED: placeholder created in render() (Bug #15)
    if(!nav) return;

    const items=[
        {page:'home',    icon:'🏠', label:l==='bn'?'হোম':'Home'},
        {page:'blog',    icon:'📝', label:l==='bn'?'ব্লগ':'Blog'},
        {page:'library', icon:'📚', label:l==='bn'?'লাইব্রেরি':'Library'},
        {page:'dua',     icon:'🤲', label:l==='bn'?'দোয়া':'Duas'},
        {page:'calendar',icon:'📅', label:l==='bn'?'ক্যালেন্ডার':'Calendar'},
    ];

    nav.style.cssText = `
        background:${d?'rgba(6,14,12,.97)':'rgba(255,255,255,.97)'};
        border-top:1.5px solid ${d?'rgba(52,211,153,.1)':'rgba(5,150,105,.1)'};
        display:flex;
        padding-bottom:env(safe-area-inset-bottom,0px);
    `;

    nav.innerHTML = items.map(item => {
        const isActive = state.currentPage === item.page;
        return `
        <button
            class="bnav-btn ${isActive?'active':''}"
            style="color:${isActive?'#059669':(d?'#6b7280':'#9ca3af')}"
            onclick="changePage('${item.page}')"
            title="${item.label}"
            aria-label="${item.label}"
            aria-current="${isActive?'page':'false'}">
            <span class="bnav-icon">${item.icon}</span>
            <span style="font-size:9.5px;font-weight:${isActive?700:500};line-height:1.2;letter-spacing:${isActive?'0':'.1px'}">${item.label}</span>
        </button>`;
    }).join('');
}

// ============================================================================
// MAIN RENDER (updated)
// ============================================================================
function renderMainContent() {
    const pages={
        home:renderHomePage,
        blog: typeof renderBlogPage === 'function' ? renderBlogPage : () => '<div class="text-center py-8">Blog loading...</div>',
        dua:renderDuaPage, library:renderLibraryPage,
        media:renderMediaPage, calendar:renderCalendarPage,
        contact:renderContactPage, about:renderAboutPage, bookmarks:renderBookmarksPage,
        readPost:renderReadPostPage, readDua:renderReadDuaPage, viewer:renderViewerPage,
        imams:renderImamsPage, imamDetail:renderImamDetailPage,
        tasbeeh:renderTasbeehPage, quiz:renderQuizPage,
        searchPage:renderSearchPage, analytics:renderAnalyticsPage,
        readZiyarat:renderReadZiyaratPage,
        asmaul:renderAsmaulHusnaPage, qibla:renderQiblaPage,
        muharram:renderMuharramPage,
        'shia-days':renderShiaDaysPage,
        familyTree:renderFamilyTreePage,
    };
    return (pages[state.currentPage]||pages.home)();
}

function renderDarkMode() {
    if(state.darkMode){
        document.documentElement.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme','dark');
        document.body.setAttribute('data-theme','dark');
        document.body.style.setProperty('background-color','#061410','important');
        document.body.style.setProperty('color','#f9fafb','important');
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme','light');
        document.body.setAttribute('data-theme','light');
        document.body.style.removeProperty('background-color');
        document.body.style.removeProperty('color');
    }
    document.body.className = (state.darkMode?'bg-gray-950 text-white':'bg-gray-50 text-gray-900') + ' fs-'+state.fontSize+' islamic-pattern-bg';
}

function render() {
    document.documentElement.lang = state.language==='bn'?'bn':'en';
    renderDarkMode();
    
    const appDiv = document.getElementById('app');

    appDiv.innerHTML = `
        ${renderMobileMenu()}
        ${renderHeader()}
        <main class="max-w-7xl mx-auto px-4 py-8" role="main">
            ${renderMainContent()}
        </main>
        ${renderFooter()}
        ${renderUploadModal()}
        ${renderAdminLoginModal()}
        ${typeof renderBlogEditorModal === 'function' ? renderBlogEditorModal() : ''}
        ${renderDuaEditorModal()}
        ${renderHadithEditorModal()}
        ${renderKnowledgeEditorModal()}
        ${renderAyahEditorModal()}
        ${renderMuharramEditorModal()}
        ${renderShiaDayEditorModal()}
        <nav id="mobile-bottom-nav" class="fixed bottom-0 left-0 right-0 md:hidden flex justify-around items-center gap-0.5 z-40" role="navigation" aria-label="Mobile navigation"></nav>
        <button id="scroll-top-btn" onclick="window.scrollTo({top:0,behavior:'smooth'})" class="scroll-top-glass" title="${state.language==='bn'?'উপরে যান':'Scroll to Top'}" aria-label="Scroll to top">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10 16v-12m-4 4l4-4 4 4"/></svg>
        </button>
    `;

    // load lazy images after render
    document.querySelectorAll('img[data-src-id]').forEach(img => {
        const id = img.getAttribute('data-src-id');
        dbGet(id).then(data => { if(data) img.src=data; }).catch(()=>{});
    });
    // mobile bottom nav
    renderMobileBottomNav();
    if(typeof premiumAfterRender==='function') requestAnimationFrame(premiumAfterRender);
    // re-run setup after each render
    requestAnimationFrame(() => {
        setupHeaderScroll();
        setupScrollReveal();
    });
    // close more dropdown on outside click (use replacing listener to avoid leak)
    if(window._moreDropdownHandler) document.removeEventListener('click', window._moreDropdownHandler);
    window._moreDropdownHandler = function(e){
        const dd=document.getElementById('more-dropdown');
        const wrap=document.getElementById('more-menu-wrap');
        if(dd&&wrap&&!wrap.contains(e.target)){dd.classList.add('hidden');}
    };
    document.addEventListener('click', window._moreDropdownHandler);
}

// ============================================================================
// PWA SERVICE WORKER (Inline) — UPGRADED
// ============================================================================
let _pwaInstallPrompt = null; // store beforeinstallprompt event

function registerPWA() {
    // ── 1. Install prompt listener ──
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        _pwaInstallPrompt = e;
        // Show install banner after 3s if not already installed
        setTimeout(() => showPWAInstallBanner(), 3000);
    });

    // ── 2. Service Worker with full offline cache ──
    if (!('serviceWorker' in navigator)) return;
    const swCode = `
const CACHE = 'ahlbayt-v3';
const STATIC = ['./', './index.html', './style.css', './script.js', './blog.js', './duas-data.js', './family-tree-data.js'];
const FONT_CACHE = 'ahlbayt-fonts-v1';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => {
            return Promise.allSettled(STATIC.map(url => c.add(url).catch(()=>{})));
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
                caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                return res;
            }).catch(() => caches.match(e.request))
        );
        return;
    }

    // Everything else → stale-while-revalidate
    e.respondWith(
        caches.match(e.request).then(cached => {
            const net = fetch(e.request).then(res => {
                if (res && res.status === 200 && res.type !== 'opaque') {
                    caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                }
                return res;
            }).catch(() => cached);
            return cached || net;
        })
    );
});

// Background sync for offline actions
self.addEventListener('message', e => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});`;
    try {
        const blob = new Blob([swCode], {type:'application/javascript'});
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl, {scope:'./'})
            .then(reg => {
                console.log('SW registered:', reg.scope);
                // Check for updates every 30 min
                setInterval(() => reg.update(), 30 * 60 * 1000);
            })
            .catch(e => console.log('SW reg failed:', e));
    } catch(e) { console.log('SW blob failed:', e); }

    // ── 3. Dynamic PWA Manifest ──
    try {
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23065f46"/><text x="50" y="62" text-anchor="middle" font-size="52" fill="%23c9a227">☽</text><circle cx="75" cy="22" r="8" fill="white" opacity=".9"/></svg>`;
        const manifest = {
            name: 'আহলে বাইত (আ.)',
            short_name: 'আহলে বাইত',
            description: 'ইসলামিক জ্ঞান ও শিক্ষার জন্য আপনার বিশ্বস্ত উৎস',
            start_url: './',
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#065f46',
            theme_color: '#059669',
            lang: 'bn',
            categories: ['education', 'lifestyle'],
            icons: [
                {src:`data:image/svg+xml,${iconSvg}`, sizes:'any', type:'image/svg+xml'},
                {src:`data:image/svg+xml,${iconSvg}`, sizes:'192x192', type:'image/svg+xml', purpose:'maskable'}
            ],
            shortcuts: [
                {name:'নামাজের সময়', short_name:'নামাজ', url:'./?page=home', icons:[{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="20" font-size="20">🕌</text></svg>',sizes:'24x24'}]},
                {name:'দোয়া', short_name:'দোয়া', url:'./?page=dua', icons:[{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="20" font-size="20">🤲</text></svg>',sizes:'24x24'}]}
            ]
        };
        const mBlob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
        const mUrl = URL.createObjectURL(mBlob);
        document.getElementById('pwa-manifest').href = mUrl;
    } catch(e) {}
}

function showPWAInstallBanner() {
    if (!_pwaInstallPrompt) return;
    if (document.getElementById('pwa-install-banner')) return;
    const l = state.language;
    const d = state.darkMode;
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
        <div style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9997;max-width:360px;width:calc(100% - 32px)">
            <div style="background:${d?'linear-gradient(135deg,#065f46,#047857)':'linear-gradient(135deg,#059669,#065f46)'};border-radius:16px;padding:16px 18px;box-shadow:0 8px 32px rgba(5,150,105,.4);display:flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.15)">
                <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">📲</div>
                <div style="flex:1;min-width:0">
                    <p style="color:white;font-weight:700;font-size:.85rem;margin-bottom:2px">${l==='bn'?'অ্যাপ হিসেবে ইনস্টল করুন':'Install as App'}</p>
                    <p style="color:rgba(255,255,255,.75);font-size:.72rem">${l==='bn'?'অফলাইনেও ব্যবহার করুন':'Works offline too'}</p>
                </div>
                <div style="display:flex;gap:8px;flex-shrink:0">
                    <button id="pwa-install-yes" style="background:white;color:#065f46;border:none;border-radius:8px;padding:7px 14px;font-size:.8rem;font-weight:700;cursor:pointer">${l==='bn'?'ইনস্টল':'Install'}</button>
                    <button id="pwa-install-no" style="background:rgba(255,255,255,.15);color:white;border:none;border-radius:8px;padding:7px 10px;font-size:.85rem;cursor:pointer">✕</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(banner);
    document.getElementById('pwa-install-yes').onclick = async () => {
        if (_pwaInstallPrompt) {
            _pwaInstallPrompt.prompt();
            const { outcome } = await _pwaInstallPrompt.userChoice;
            if (outcome === 'accepted') showToast(l==='bn'?'✅ অ্যাপ ইনস্টল হচ্ছে!':'✅ App installing!', 'success');
            _pwaInstallPrompt = null;
        }
        banner.remove();
    };
    document.getElementById('pwa-install-no').onclick = () => banner.remove();
    setTimeout(() => banner.remove(), 12000);
}

// ============================================================================
// SPLASH SCREEN
// ============================================================================
function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => { if(splash.parentNode) splash.parentNode.removeChild(splash); }, 900);
    }
}

// ============================================================================
// INIT
// ============================================================================

// ============================================================================
// PREMIUM JS — Scroll Reveal + Ripple + Particles + Header scroll
// ============================================================================
function initScrollReveal() {
    const els = document.querySelectorAll('.reveal:not(.visible)');
    if (!els.length) return;
    if (window._scrollRevealObs) window._scrollRevealObs.disconnect();
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.07, rootMargin: '0px 0px -20px 0px' });
    els.forEach(el => io.observe(el));
    window._scrollRevealObs = io;
}
function initHeaderScroll() {
    if (window._headerScrollInit) return; // prevent duplicate listeners
    window._headerScrollInit = true;
    let _ihsTicking = false;
    const fn = () => {
        if (!_ihsTicking) {
            requestAnimationFrame(() => {
                const h = document.querySelector('header');
                if(h) h.classList.toggle('scrolled', window.scrollY > 10);
                _ihsTicking = false;
            });
            _ihsTicking = true;
        }
    };
    window.addEventListener('scroll', fn, { passive: true });
    fn();
}
let _pClk = null;
function startPrayerClock() {
    if (_pClk) { clearInterval(_pClk); _pClk = null; }
    _pClk = setInterval(() => {
        document.querySelectorAll('[id^="pclock-"]').forEach(el => {
            const k = el.id.replace('pclock-', '');
            const v = state.prayerTimes[k]; if (!v) return;
            try {
                const [t, ap] = v.split(' '); let [h, m] = t.split(':').map(Number);
                if (ap==='PM' && h!==12) h+=12; if (ap==='AM' && h===12) h=0;
                const now = new Date(); const tgt = new Date(now);
                tgt.setHours(h, m, 0, 0); if (tgt<=now) tgt.setDate(tgt.getDate()+1);
                const diff = tgt - now;
                const hh=Math.floor(diff/3600000), mm=String(Math.floor((diff%3600000)/60000)).padStart(2,'0'), ss=String(Math.floor((diff%60000)/1000)).padStart(2,'0');
                el.textContent = (state.language==='bn'?'পরবর্তী':'next') + ': ' + hh + 'h ' + mm + 'm ' + ss + 's';
            } catch(e) {}
        });
    }, 1000);
}
function injectSplashParticles() {
    const c = document.getElementById('splash-particles'); if (!c) return;
    for (let i=0; i<16; i++) {
        const p = document.createElement('div');
        const sz = 3 + Math.random()*5;
        p.style.cssText = `position:absolute;border-radius:50%;width:${sz}px;height:${sz}px;left:${Math.random()*100}%;bottom:-8px;background:${['rgba(180,83,9,.85)','rgba(5,150,105,.7)','rgba(255,255,255,.5)','rgba(245,158,11,.9)'][i%4]};animation:heroP linear ${7+Math.random()*7}s ${Math.random()*4}s infinite`;
        c.appendChild(p);
    }
}
function premiumAfterRender() {
    requestAnimationFrame(() => { initScrollReveal(); initHeaderScroll(); startPrayerClock(); initReadingProgress(); startNextPrayerCountdown(); });
}

// Next prayer countdown for home page banner
let _npClock = null;
function startNextPrayerCountdown() {
    if (_npClock) { clearInterval(_npClock); _npClock = null; }
    const update = () => {
        const info = getNextPrayerInfo();
        if (!info) return;
        const nameEl = document.getElementById('next-prayer-name-home');
        const timeEl = document.getElementById('next-prayer-countdown-home');
        if (nameEl) nameEl.textContent = state.language==='bn' ? info.nameBn : info.nameEn;
        if (timeEl) timeEl.textContent = info.timeStr;
    };
    update();
    _npClock = setInterval(update, 1000);
}

function init() {
    loadState();
    applyFontSize();
    registerPWA();
    // ── PWA shortcut handling: ?page=xxx in URL opens that page directly ──
    try {
        const params = new URLSearchParams(window.location.search);
        const pageParam = params.get('page');
        if (pageParam) { state.currentPage = pageParam; }
    } catch(e) {}
    // ── Dark mode CSS override — mobile browser CSS ও style.css কে override করে ──
    (function injectDarkModeCSS(){
        if(document.getElementById('dark-mode-override')) return; // Bug #14 fix: duplicate inject রোধ
        const style=document.createElement('style');
        style.id='dark-mode-override';
        style.textContent=`
            html[data-theme="dark"] body,
            html[data-theme="dark"] #app,
            html[data-theme="dark"] .islamic-pattern-bg {
                background-color: #061410 !important;
                color: #f9fafb !important;
            }
            html[data-theme="dark"] #mobile-bottom-nav {
                background: rgba(6,20,16,0.97) !important;
                border-top-color: rgba(255,255,255,0.08) !important;
            }
            html[data-theme="light"] body,
            html[data-theme="light"] #app,
            html[data-theme="light"] .islamic-pattern-bg {
                background-color: #f0fdf8 !important;
                color: #111827 !important;
            }
            html[data-theme="light"] #mobile-bottom-nav {
                background: rgba(255,255,255,0.97) !important;
                border-top-color: rgba(0,0,0,0.08) !important;
            }
            @media (prefers-color-scheme: dark) {
                html[data-theme="light"] body { background-color: #f0fdf8 !important; color: #111827 !important; }
            }
        `;
        document.head.appendChild(style);
    })();
    setupEventListeners();
    // rotate hadith daily
    const today = new Date().toDateString();
    const lastDay = lsGet('ahlbayt_last_day', '');
    if (today !== lastDay) {
        state.hadithIndex = Math.floor(Math.random()*hadiths.length);
        lsSet('ahlbayt_last_day', today);
        saveState();
    }
    injectSplashParticles();
    render();
    if (state.userLocation) {
        fetchPrayerTimes(state.userLocation.latitude, state.userLocation.longitude);
    } else {
        getUserLocation();
    }
    // schedule notifications if already granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setTimeout(schedulePrayerNotifications, 3000);
    }
    setupScrollTop();
    setupHeaderScroll();
    initReadingProgress(); // একটাই reading progress listener (leak-safe)
    setupScrollReveal();
    // Cloudinary config must be available before cloud fetches
    if (typeof CLOUDINARY_CLOUD_NAME === 'undefined') {
        window.CLOUDINARY_CLOUD_NAME    = "ahlalbayt";
        window.CLOUDINARY_UPLOAD_PRESET = "ahlalbayt_upload";
    }
    try { fetchBlogFromCloud(); } catch(e) { console.warn('[Blog] fetchBlogFromCloud failed:', e); }   // load blog posts from Cloudinary (cross-device)
    try { fetchMediaFromCloud(); } catch(e) { console.warn('[Media] fetchMediaFromCloud failed:', e); } // load media index from Cloudinary (cross-device)
    setTimeout(hideSplash, 2600);
}

// ============================================================================
// IMAM CARD ANIMATIONS — flip & particles
// ============================================================================

/** Toggle 3-D flip on an imam card */
function imamFlip(flipId) {
    const front = document.getElementById(flipId + '-front');
    const back  = document.getElementById(flipId + '-back');
    if (!front || !back) return;
    const isShowingBack = back.style.display !== 'none';
    if (isShowingBack) {
        back.style.display  = 'none';
        front.style.display = 'flex';
    } else {
        front.style.display = 'none';
        back.style.display  = 'flex';
        back.style.flexDirection = 'column';
        back.style.alignItems = 'center';
        back.style.justifyContent = 'center';
    }
}

/** Spawn particle burst on card mouseenter */
function imamCardParticles(cardEl, color) {
    if (window._imamParticleCooldown) return;
    window._imamParticleCooldown = true;
    setTimeout(() => { window._imamParticleCooldown = false; }, 900);

    const directions = [
        'translate(-28px,-32px)','translate(28px,-32px)',
        'translate(-36px,0px)', 'translate(36px,0px)',
        'translate(-22px,28px)','translate(22px,28px)',
        'translate(0px,-38px)', 'translate(12px,-26px)',
    ];
    const rect = cardEl.getBoundingClientRect();
    // anchor particles to top-center of the card (avatar area)
    const ox = rect.width / 2;
    const oy = rect.height * 0.22;

    directions.forEach((tx, i) => {
        const p = document.createElement('div');
        p.className = 'imam-particle';
        p.style.cssText = `
            background:${i % 2 === 0 ? color : '#c9a227'};
            left:${ox}px; top:${oy}px;
            --ptx:${tx};
            animation-delay:${i * 0.06}s;
            width:${4 + (i % 3) * 2}px;
            height:${4 + (i % 3) * 2}px;
        `;
        cardEl.appendChild(p);
        setTimeout(() => p.remove(), 900);
    });
}

init();
// ============================================================================
// মুহাররম / আশুরা কাউন্টডাউন পেজ
// ============================================================================
function getAshuraGregorianDate() {
    const h = approxHijriNow();
    const ashuraYear = (h.month > 1 || (h.month === 1 && h.day > 10)) ? h.year + 1 : h.year;
    const ashuraGreg = hijriToGregorian(10, 1, ashuraYear);
    return { date: ashuraGreg, hijriYear: ashuraYear };
}

// ============================================================================
// মুহাররম / আশুরা পেজ — CRUD সহ
// ============================================================================
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

function renderMuharramPage() {
    const d = state.darkMode, l = state.language;
    const { date: ashuraDate, hijriYear } = getAshuraGregorianDate();
    const today = new Date(); today.setHours(0,0,0,0);
    ashuraDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((ashuraDate - today) / 86400000);
    const isToday = daysLeft === 0;
    const isPast = daysLeft < 0;

    const gregMonthsEn2=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const ashuraDateStr = ashuraDate.getDate()+' '+gregMonthsEn2[ashuraDate.getMonth()]+' '+ashuraDate.getFullYear();

    // Static + custom events merged
    const staticTimeline = [
        {id:'s1', icon:'🚶', date:l==='bn'?'১ মুহাররম':'1 Muharram', color:'#3b82f6', titleBn:l==='bn'?'ইমাম হোসাইন (আ.) মদিনা থেকে যাত্রা শুরু':'Imam Husayn (AS) Departs Madinah', descBn:l==='bn'?'ইয়াজিদের বায়াত প্রত্যাখ্যান করে পরিবার ও সঙ্গীদের নিয়ে মদিনা ত্যাগ করেন।':'Refusing to pledge allegiance to Yazid, he left Madinah with his family and companions.'},
        {id:'s2', icon:'🏜️', date:l==='bn'?'৩ মুহাররম':'3 Muharram', color:'#f59e0b', titleBn:l==='bn'?'কারবালায় পৌঁছানো':'Arrival at Karbala', descBn:l==='bn'?'ইমামের কাফেলা কারবালার প্রান্তরে পৌঁছায়। হুর ইবনে ইয়াযিদের বাহিনী পথ রোধ করে।':"The Imam\'s caravan reaches the plains of Karbala. Hurr ibn Yazid's forces block their path."},
        {id:'s3', icon:'💧', date:l==='bn'?'৭ মুহাররম':'7 Muharram', color:'#ef4444', titleBn:l==='bn'?'পানি সরবরাহ বন্ধ':'Water Supply Cut Off', descBn:l==='bn'?'ফোরাত নদীর পানি সম্পূর্ণ বন্ধ করা হয়। ৭২ সঙ্গী ও শিশুরা পিপাসায় কষ্ট পেতে থাকে।':'Access to the Euphrates river is completely blocked. The 72 companions and children suffer from thirst.'},
        {id:'s4', icon:'🌙', date:l==='bn'?'৯ মুহাররম (তাসুআ)':'9 Muharram (Tasua)', color:'#8b5cf6', titleBn:l==='bn'?'তাসুআ — শেষ রাত':'Tasua — The Last Night', descBn:l==='bn'?'ইমাম সঙ্গীদের মুক্ত করে দেন। রাতভর ইবাদত, নামাজ ও কুরআন তিলাওয়াত।':'The Imam releases his companions from obligation. The night is spent in worship, prayer, and recitation of the Quran.'},
        {id:'s5', icon:'⚔️', date:l==='bn'?'১০ মুহাররম (আশুরা)':'10 Muharram (Ashura)', color:'#dc2626', titleBn:l==='bn'?'🔴 আশুরা — কারবালার মহাশাহাদাত':'🔴 Ashura — The Great Martyrdom of Karbala', descBn:l==='bn'?'৭২ জন বনাম ৩০,০০০ সৈন্য। একে একে সব সঙ্গী শহীদ হন। ইমাম হোসাইন (আ.) আসর নামাজের পর শাহাদাত বরণ করেন।':'72 against 30,000 soldiers. All companions are martyred one by one. Imam Husayn (AS) is martyred after the Asr prayer.'},
        {id:'s6', icon:'⛓️', date:l==='bn'?'১১ মুহাররম':'11 Muharram', color:'#6b7280', titleBn:l==='bn'?'বন্দী কাফেলা কুফার পথে':'Captive Caravan Towards Kufa', descBn:l==='bn'?'হযরত যয়নাব (আ.) সহ মহিলা ও শিশুদের বন্দী করে কুফায় নেওয়া হয়।':'Lady Zaynab (AS) and the women and children are taken captive towards Kufa.'},
        {id:'s7', icon:'🗣️', date:l==='bn'?'সফর মাস':'Month of Safar', color:'#059669', titleBn:l==='bn'?'যয়নাব (আ.)-এর ঐতিহাসিক ভাষণ':"Zaynab (AS)'s Historic Speech", descBn:l==='bn'?'যয়নাব (আ.) ইয়াজিদের দরবারে ঐতিহাসিক ভাষণ দেন। কারবালার বার্তা বিশ্বে ছড়িয়ে দেন।':"Zaynab (AS) delivers her historic speech in Yazid's court, spreading the message of Karbala to the world."},
    ];
    const allTimeline = [...staticTimeline, ...state.muharramEvents];

    const majalis = [
        {icon:'🕌', time:l==='bn'?'১–১০ মুহাররম':'1–10 Muharram', titleBn:l==='bn'?'মজলিস':'Majlis', descBn:l==='bn'?'শোকসভা যেখানে বক্তা কারবালার ঘটনা বর্ণনা করেন।':'A mourning gathering where a speaker narrates the events of Karbala.'},
        {icon:'🕯️', time:l==='bn'?'১০ মুহাররম রাত':'Night of 10 Muharram', titleBn:l==='bn'?'শাম-এ-গরিবান':'Sham-e-Ghariban', descBn:l==='bn'?'আশুরার রাতে মোমবাতি জ্বালিয়ে ইমামের শিবিরে আগুনের স্মরণ।':"Candles are lit on the night of Ashura to commemorate the burning of the Imam\'s camp."},
        {icon:'🌿', time:l==='bn'?'২০ সফর':'20 Safar', titleBn:l==='bn'?'চেহলুম / আরবাঈন':'Chehlum / Arbaeen', descBn:l==='bn'?'শাহাদাতের ৪০তম দিন। যয়নাব ও সুরবীরা এই দিনে কারবালায় ফিরে আসেন।':'The 40th day after the martyrdom. Zaynab and the survivors returned to Karbala on this day.'},
    ];

    const cdHtml = isToday
        ? `<div style="color:#dc2626;font-size:2rem;font-weight:900">${l==='bn'?'🔴 আজ আশুরা!':'🔴 Today is Ashura!'}</div>`
        : isPast
        ? `<div style="font-size:1.1rem;font-weight:700;color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'আগামী বছরের জন্য প্রতীক্ষায়':'Awaiting next year'}</div>`
        : `<div style="font-size:3.5rem;font-weight:900;color:#dc2626;line-height:1">${l==='bn'?toBengaliDigits(daysLeft):daysLeft}</div>
           <div style="font-size:1rem;color:${d?'#9ca3af':'#6b7280'};margin-top:.25rem">${l==='bn'?'দিন বাকি':'days remaining'}</div>`;

    const isStatic = id => id && id.startsWith('s');

    return `<div class="space-y-8 page-enter">
        <button data-action="changePage" data-param="home" class="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all" style="background:${d?'rgba(220,38,38,.15)':'rgba(220,38,38,.08)'};color:#dc2626">← ${l==='bn'?'হোমে ফিরুন':'Back to Home'}</button>

        <div class="relative overflow-hidden rounded-3xl text-center" style="background:linear-gradient(135deg,#1a0000,#3b0000,#1a0000);padding:2.5rem 2rem;box-shadow:0 8px 40px rgba(220,38,38,.35)">
            <div style="font-size:2.5rem;margin-bottom:.5rem">🌙⚔️🌙</div>
            <h2 style="font-size:2rem;font-weight:900;color:#f87171;margin-bottom:.25rem">${l==='bn'?'মুহাররম ও আশুরা':'Muharram & Ashura'}</h2>
            <p class="arabic-text" dir="rtl" style="color:#fca5a5;font-size:1.4rem">يَا أَبَا عَبْدِ اللَّهِ السَّلَامُ عَلَيْكَ</p>
        </div>

        <div class="${d?'bg-gray-800 border-red-900':'bg-red-50 border-red-200'} border-2 rounded-2xl p-6 text-center" style="box-shadow:0 4px 20px rgba(220,38,38,.15)">
            <p class="text-sm font-bold mb-3" style="color:#dc2626">${l==='bn'?'🕐 আশুরা কাউন্টডাউন':'🕐 Ashura Countdown'}</p>
            ${cdHtml}
            <p class="text-sm mt-2 ${d?'text-gray-400':'text-gray-600'}">📅 ${ashuraDateStr}</p>
            <p class="text-xs mt-1 ${d?'text-gray-500':'text-gray-500'}">${l==='bn'?`১০ মুহাররম ${toBengaliDigits(hijriYear)} হিজরি`:`10 Muharram ${hijriYear} AH`}</p>
        </div>

        <div>
            <div class="flex gap-2 flex-wrap mb-5">
                ${[[`tl`, l==='bn'?'📜 কারবালার ঘটনা':'📜 Events of Karbala'],[`sh`, l==='bn'?'🩸 ৭২ শহীদ':'🩸 72 Martyrs'],[`mj`, l==='bn'?'🕌 মজলিস ও আমল':'🕌 Majlis & Practices'],[`zr`, l==='bn'?'🤲 বিশেষ যিয়ারত':'🤲 Special Ziyarat']].map(([id,label],i)=>`
                <button onclick="document.querySelectorAll('.mhp').forEach(p=>p.style.display='none');document.getElementById('mhp-${id}').style.display='block';document.querySelectorAll('.mhtb').forEach(b=>{b.style.background='';b.style.color=''});this.style.background='#dc2626';this.style.color='white'"
                    class="mhtb px-4 py-2 rounded-xl font-semibold text-sm border focus:outline-none ${d?'border-gray-700 text-gray-300':'border-gray-300 text-gray-600'}"
                    style="${i===0?'background:#dc2626;color:white':''}">${label}</button>`).join('')}
            </div>

            <!-- ─── ঘটনাক্রম ─── -->
            <div id="mhp-tl" class="mhp space-y-4">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-xl font-bold">${l==='bn'?'📜 কারবালার ঘটনাক্রম':'📜 Timeline of Karbala'}</h3>
                    ${state.isAdmin?`<button data-action="openMuharramEditor" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white" style="background:#dc2626">${l==='bn'?'＋ নতুন ঘটনা যোগ':'＋ Add New Event'}</button>`:''}
                </div>
                ${allTimeline.map((ev,i)=>`
                <div class="relative" style="padding-left:52px">
                    <div style="position:absolute;left:0;top:16px;width:36px;height:36px;border-radius:50%;background:${ev.color||'#6b7280'};display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;z-index:1">${ev.icon||'🕌'}</div>
                    ${i<allTimeline.length-1?`<div style="position:absolute;left:17px;top:54px;width:2px;height:calc(100% + 8px);background:${d?'#374151':'#e5e7eb'}"></div>`:''}
                    <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl p-4 ${ev.color==='#dc2626'?'border-red-400':''}" style="${ev.color==='#dc2626'?'box-shadow:0 4px 20px rgba(220,38,38,.12)':''}">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1">
                                <span class="text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block" style="background:${ev.color||'#6b7280'}22;color:${ev.color||'#6b7280'}">${ev.date||''}</span>
                                <h4 class="font-bold mb-1">${sanitize(ev.titleBn||'')}</h4>
                                <p class="text-sm ${d?'text-gray-300':'text-gray-700'} leading-relaxed">${sanitize(ev.descBn||'')}</p>
                            </div>
                            ${state.isAdmin && !isStatic(ev.id) ? `<div class="flex gap-1 flex-shrink-0">
                                <button data-action="openMuharramEditor" data-param="${ev.id}" class="text-xs px-2 py-1 rounded-lg font-semibold ${d?'bg-gray-700 text-gray-300':'bg-gray-100 text-gray-600'} hover:opacity-80">✏️</button>
                                <button data-action="deleteMuharramEvent" data-param="${ev.id}" class="text-xs px-2 py-1 rounded-lg font-semibold bg-red-100 text-red-600 hover:bg-red-200">🗑️</button>
                            </div>` : ''}
                        </div>
                    </div>
                </div>`).join('')}
            </div>

            <!-- ─── মজলিস ─── -->
            <div id="mhp-mj" class="mhp space-y-4" style="display:none">
                <h3 class="text-xl font-bold">${l==='bn'?'🕌 মজলিস ও বিশেষ আমল':'🕌 Majlis & Special Practices'}</h3>
                ${majalis.map(m=>`
                <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl p-5" style="border-left:4px solid #dc2626">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span style="font-size:1.4rem">${m.icon}</span>
                        <h4 class="font-bold">${m.titleBn}</h4>
                        <span class="text-xs px-2 py-0.5 rounded-full font-bold" style="background:#dc262622;color:#dc2626">📅 ${m.time}</span>
                    </div>
                    <p class="text-sm ${d?'text-gray-300':'text-gray-700'} leading-relaxed">${m.descBn}</p>
                </div>`).join('')}
                <div class="${d?'bg-red-950 border-red-900':'bg-red-50 border-red-200'} border rounded-2xl p-5">
                    <h4 class="font-bold mb-3" style="color:#dc2626">${l==='bn'?'📌 মুহাররমের বিশেষ আমল':'📌 Special Practices of Muharram'}</h4>
                    <ul class="space-y-1.5 text-sm ${d?'text-gray-300':'text-gray-700'}">
                        ${(l==='bn'?['যিয়ারত আশুরা পাঠ (১–১০ মুহাররম)','ইমাম হোসাইনের জন্য শোক পালন','কারবালার ঘটনা পরিবারে আলোচনা','দোয়ায়ে তাওয়াসসুল পাঠ','মজলিসে অংশগ্রহণ','আশুরার দিন খাবার সীমিত রাখা']:['Recite Ziyarat Ashura (1–10 Muharram)','Mourn for Imam Husayn','Discuss the events of Karbala with family','Recite Dua Tawassul','Attend Majlis gatherings','Limit food on the day of Ashura']).map(a=>`<li>✅ ${a}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <!-- ─── ৭২ শহীদ ─── -->
            <div id="mhp-sh" class="mhp space-y-5" style="display:none">
                <h3 class="text-xl font-bold">${l==='bn'?'🩸 কারবালার ৭২ শহীদ':'🩸 72 Martyrs of Karbala'}</h3>
                <div class="${d?'bg-red-950 border-red-900':'bg-red-50 border-red-200'} border rounded-2xl p-4 text-center">
                    <p class="arabic-text text-xl mb-1" dir="rtl" style="color:${d?'#fca5a5':'#991b1b'}">السَّلَامُ عَلَيْكُمْ يَا شُهَدَاءَ كَرْبَلَاء</p>
                    <p class="text-sm ${d?'text-gray-300':'text-gray-700'}">${l==='bn'?'হে কারবালার শহীদগণ, আপনাদের প্রতি শান্তি বর্ষিত হোক':'Peace be upon you, O martyrs of Karbala'}</p>
                </div>

                <!-- বনি হাশিম শহীদ -->
                <div class="rounded-2xl overflow-hidden border ${d?'border-red-900':'border-red-200'}">
                    <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:12px 18px" class="flex items-center gap-3">
                        <span style="font-size:1.4rem">👑</span>
                        <div>
                            <div class="font-bold text-white">${l==='bn'?'বনি হাশিম — আহলে বাইত ও পরিবার':'Bani Hashim — Ahlul Bayt & Family'}</div>
                            <div class="text-xs text-red-200">${l==='bn'?'১৮ জন শহীদ':'18 Martyrs'}</div>
                        </div>
                    </div>
                    <div class="p-4">
                        <div class="grid grid-cols-1 gap-2">
                        ${[
                            {n:l==='bn'?'১. ইমাম হোসাইন ইবনে আলী (আ.)':'1. Imam Husayn ibn Ali (AS)', a:'الحسين بن علي', t:l==='bn'?'সাইয়্যিদুশ শুহাদা, ইমাম':'Sayyid al-Shuhada, Imam'},
                            {n:l==='bn'?'২. আলী আকবর ইবনে হোসাইন (আ.)':'2. Ali Akbar ibn Husayn (AS)', a:'علي الأكبر', t:l==='bn'?'ইমামের পুত্র, যৌবনের শহীদ':'Son of Imam, martyr of youth'},
                            {n:l==='bn'?'৩. আলী আসগর ইবনে হোসাইন (আ.)':'3. Ali Asghar ibn Husayn (AS)', a:'علي الأصغر', t:l==='bn'?'৬ মাসের শিশু শহীদ':'6-month infant martyr'},
                            {n:l==='bn'?'৪. আবু আব্দুল্লাহ আল-কাসিম ইবনে হাসান (আ.)':'4. al-Qasim ibn Hasan (AS)', a:'القاسم بن الحسن', t:l==='bn'?'ইমাম হাসানের পুত্র':'Son of Imam Hasan'},
                            {n:l==='bn'?'৫. আব্বাস ইবনে আলী (আ.)':'5. Abbas ibn Ali (AS)', a:'العباس بن علي', t:l==='bn'?'আলমদার, পতাকাবাহী':'Standard-bearer, Alamdar'},
                            {n:l==='bn'?'৬. আব্দুল্লাহ ইবনে আলী':'6. Abdullah ibn Ali', a:'عبد الله بن علي', t:l==='bn'?'আমিরুল মুমিনীনের পুত্র':'Son of Amir al-Muminin'},
                            {n:l==='bn'?'৭. জাফর ইবনে আলী':'7. Jafar ibn Ali', a:'جعفر بن علي', t:l==='bn'?'আমিরুল মুমিনীনের পুত্র':'Son of Amir al-Muminin'},
                            {n:l==='bn'?'৮. উসমান ইবনে আলী':'8. Uthman ibn Ali', a:'عثمان بن علي', t:l==='bn'?'আমিরুল মুমিনীনের পুত্র':'Son of Amir al-Muminin'},
                            {n:l==='bn'?'৯. মুহাম্মদ ইবনে আলী (আবু বকর)':'9. Muhammad ibn Ali (Abu Bakr)', a:'محمد بن علي', t:l==='bn'?'আমিরুল মুমিনীনের পুত্র':'Son of Amir al-Muminin'},
                            {n:l==='bn'?'১০. আব্দুল্লাহ ইবনে হাসান':'10. Abdullah ibn Hasan', a:'عبد الله بن الحسن', t:l==='bn'?'ইমাম হাসানের পুত্র':'Son of Imam Hasan'},
                            {n:l==='bn'?'১১. আওন ইবনে আব্দুল্লাহ ইবনে জাফর':'11. Awn ibn Abdullah ibn Jafar', a:'عون بن عبد الله بن جعفر', t:l==='bn'?'হযরত যয়নাবের পুত্র':'Son of Lady Zaynab'},
                            {n:l==='bn'?'১২. মুহাম্মদ ইবনে আব্দুল্লাহ ইবনে জাফর':'12. Muhammad ibn Abdullah ibn Jafar', a:'محمد بن عبد الله بن جعفر', t:l==='bn'?'হযরত যয়নাবের পুত্র':'Son of Lady Zaynab'},
                            {n:l==='bn'?'১৩. আব্দুল্লাহ ইবনে মুসলিম ইবনে আকিল':'13. Abdullah ibn Muslim ibn Aqil', a:'عبد الله بن مسلم بن عقيل', t:l==='bn'?'মুসলিম ইবনে আকিলের পুত্র':'Son of Muslim ibn Aqil'},
                            {n:l==='bn'?'১৪. মুহাম্মদ ইবনে মুসলিম ইবনে আকিল':'14. Muhammad ibn Muslim ibn Aqil', a:'محمد بن مسلم بن عقيل', t:l==='bn'?'মুসলিম ইবনে আকিলের পুত্র':'Son of Muslim ibn Aqil'},
                            {n:l==='bn'?'১৫. জাফর ইবনে মুহাম্মদ ইবনে আকিল':'15. Jafar ibn Muhammad ibn Aqil', a:'جعفر بن محمد بن عقيل', t:l==='bn'?'বনি আকিলের শহীদ':'Martyr of Bani Aqil'},
                            {n:l==='bn'?'১৬. আব্দুর রহমান ইবনে আকিল':'16. Abd al-Rahman ibn Aqil', a:'عبد الرحمن بن عقيل', t:l==='bn'?'বনি আকিলের শহীদ':'Martyr of Bani Aqil'},
                            {n:l==='bn'?'১৭. মুহাম্মদ ইবনে আবি সাঈদ ইবনে আকিল':'17. Muhammad ibn Abi Said ibn Aqil', a:'محمد بن أبي سعيد بن عقيل', t:l==='bn'?'বনি আকিলের শহীদ':'Martyr of Bani Aqil'},
                            {n:l==='bn'?'১৮. আব্দুল্লাহ ইবনে আকিল':'18. Abdullah ibn Aqil', a:'عبد الله بن عقيل', t:l==='bn'?'বনি আকিলের শহীদ':'Martyr of Bani Aqil'},
                        ].map(m=>`
                        <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-xl px-4 py-2.5 flex items-start gap-3">
                            <span style="color:#dc2626;font-size:1rem;flex-shrink:0;margin-top:2px">🌹</span>
                            <div class="flex-1 min-w-0">
                                <div class="font-semibold text-sm">${m.n}</div>
                                <div class="arabic-text text-xs mt-0.5" dir="rtl" style="color:${d?'#fca5a5':'#991b1b'}">${m.a}</div>
                                <div class="text-xs ${d?'text-gray-400':'text-gray-500'} mt-0.5">${m.t}</div>
                            </div>
                        </div>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- অন্যান্য সঙ্গী শহীদ -->
                <div class="rounded-2xl overflow-hidden border ${d?'border-gray-700':'border-gray-200'}">
                    <div style="background:linear-gradient(135deg,#374151,#4b5563);padding:12px 18px" class="flex items-center gap-3">
                        <span style="font-size:1.4rem">⚔️</span>
                        <div>
                            <div class="font-bold text-white">${l==='bn'?'বিশ্বস্ত সঙ্গীগণ':'Faithful Companions'}</div>
                            <div class="text-xs text-gray-300">${l==='bn'?'৫৪ জন শহীদ':'54 Martyrs'}</div>
                        </div>
                    </div>
                    <div class="p-4">
                        <div class="grid grid-cols-1 gap-2">
                        ${[
                            {n:l==='bn'?'১৯. হাবিব ইবনে মাযাহির আল-আসাদি':'19. Habib ibn Mazahir al-Asadi', a:'حبيب بن مظاهر الأسدي', t:l==='bn'?'ইমামের বিশ্বস্ত প্রবীণ সঙ্গী':'Trusted senior companion of the Imam'},
                            {n:l==='bn'?'২০. মুসলিম ইবনে আওসাজা আল-আসাদি':'20. Muslim ibn Awsaja al-Asadi', a:'مسلم بن عوسجة الأسدي', t:l==='bn'?'প্রথম সারির শহীদ':'First to fall in battle'},
                            {n:l==='bn'?'২১. হুর ইবনে ইয়াযিদ আর-রিয়াহি':'21. Hurr ibn Yazid al-Riyahi', a:'الحر بن يزيد الرياحي', t:l==='bn'?'তওবা করে ইমামের পক্ষে শহীদ':'Repented and martyred for the Imam'},
                            {n:l==='bn'?'২২. যুহাইর ইবনে কাইন আল-বাজালি':'22. Zuhayr ibn Qayn al-Bajali', a:'زهير بن القين البجلي', t:l==='bn'?'পথে ইমামের সঙ্গী হন':'Joined the Imam en route'},
                            {n:l==='bn'?'২৩. বুরাইর ইবনে হুযাইর আল-হামদানি':'23. Burayr ibn Khudayr al-Hamdani', a:'بريرة بن خضير الهمداني', t:l==='bn'?'কুরআনের বিশেষজ্ঞ':'Quranic scholar'},
                            {n:l==='bn'?'২৪. নাফি ইবনে হিলাল আল-জামালি':'24. Nafi ibn Hilal al-Jamali', a:'نافع بن هلال الجملي', t:l==='bn'?'বীর তীরন্দাজ':'Brave archer'},
                            {n:l==='bn'?'২৫. আনাস ইবনে কাহিল আল-আসাদি':'25. Anas ibn Kahil al-Asadi', a:'أنس بن كاهل الأسدي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'২৬. কাইস ইবনে মুসাহহার আস-সাইদাউয়ি':'26. Qays ibn Musahhar al-Saydawi', a:'قيس بن مسهر الصيداوي', t:l==='bn'?'ইমামের দূত, কুফায় শহীদ':'Imam\'s messenger, martyred in Kufa'},
                            {n:l==='bn'?'২৭. আব্বাদ ইবনে মুহাজির আল-জুহানি':'27. Abbad ibn Muhajir al-Juhani', a:'عباد بن المهاجر الجهني', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'২৮. আব্দুল্লাহ ইবনে উমাইর আল-কালবি':'28. Abdullah ibn Umayr al-Kalbi', a:'عبد الله بن عمير الكلبي', t:l==='bn'?'স্ত্রীসহ কারবালায় আসেন':'Came to Karbala with his wife'},
                            {n:l==='bn'?'২৯. আমর ইবনে খালিদ আস-সাইদাউয়ি':'29. Amr ibn Khalid al-Saydawi', a:'عمرو بن خالد الصيداوي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৩০. সাদ মাওলা আমর ইবনে খালিদ':'30. Sad, mawla of Amr ibn Khalid', a:'سعد مولى عمرو بن خالد', t:l==='bn'?'আমরের মুক্তিপ্রাপ্ত দাস':'Freed slave of Amr'},
                            {n:l==='bn'?'৩১. জানাদাহ ইবনে কাব আল-আনসারি':'31. Jundab ibn Kab al-Ansari', a:'جندب بن كعب الأنصاري', t:l==='bn'?'আনসারদের শহীদ':'Martyr from the Ansar'},
                            {n:l==='bn'?'৩২. আমর ইবনে কারাযাহ আল-আনসারি':'32. Amr ibn Qarazah al-Ansari', a:'عمرو بن قرظة الأنصاري', t:l==='bn'?'আনসারদের শহীদ':'Martyr from the Ansar'},
                            {n:l==='bn'?'৩৩. হানযালা ইবনে সাদ আশ-শাবামি':'33. Hanzala ibn Sad al-Shabami', a:'حنظلة بن سعد الشبامي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৩৪. আব্দুর রহমান ইবনে আব্দুল্লাহ আল-আরহাবি':'34. Abd al-Rahman ibn Abdillah al-Arhabi', a:'عبد الرحمن بن عبد الله الأرحبي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৩৫. আমর ইবনে জুনাদাহ আল-আনসারি':'35. Amr ibn Junadah al-Ansari', a:'عمرو بن جنادة الأنصاري', t:l==='bn'?'বালক শহীদ, পিতার শাহাদাতের পর':'Young martyr after his father\'s death'},
                            {n:l==='bn'?'৩৬. সাওয়ার ইবনে আবি উমাইর আন-নাহমি':'36. Sawwar ibn Abi Umayr al-Nahmi', a:'سوار بن أبي عمير النهمي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৩৭. আমর ইবনে আব্দুল্লাহ আল-জুনদুয়ি':'37. Amr ibn Abdillah al-Jundui', a:'عمرو بن عبد الله الجندعي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৩৮. আবু সামামাহ আমর ইবনে আব্দুল্লাহ আস-সাইদাউয়ি':'38. Abu Samamah Amr al-Saydawi', a:'أبو ثمامة عمرو الصائدي', t:l==='bn'?'আশুরার দিন জোহরের নামাজের স্মরণ করিয়ে দেন':'Reminded the Imam of Dhuhr prayer on Ashura'},
                            {n:l==='bn'?'৩৯. সাইফ ইবনে হারিস ইবনে সুরাই':'39. Sayf ibn Harith ibn Sari', a:'سيف بن الحارث بن سريع', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৪০. মালিক ইবনে আব্দুল্লাহ ইবনে সুরাই':'40. Malik ibn Abdillah ibn Sari', a:'مالك بن عبد الله بن سريع', t:l==='bn'?'সাইফের ভাই':'Brother of Sayf'},
                            {n:l==='bn'?'৪১. মুজম্মা ইবনে আব্দুল্লাহ আল-আইযি':'41. Mujammi ibn Abdillah al-Aydhi', a:'مجمع بن عبد الله العائذي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৪২. নুআম ইবনে আজলান আল-আনসারি':'42. Nuaym ibn Ajlan al-Ansari', a:'نعيم بن عجلان الأنصاري', t:l==='bn'?'আনসারদের শহীদ':'Martyr from the Ansar'},
                            {n:l==='bn'?'৪৩. ইয়াযিদ ইবনে মাঘফাল আল-জুফি':'43. Yazid ibn Mughfal al-Jufi', a:'يزيد بن مغفل الجعفي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৪৪. আব্দুল্লাহ ইবনে বাশর আল-খাসআমি':'44. Abdullah ibn Bashir al-Khathami', a:'عبد الله بن بشير الخثعمي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৪৫. হাজ্জাজ ইবনে যায়িদ আস-সালামানি':'45. Hajjaj ibn Zayd al-Salamani', a:'الحجاج بن زيد السلامي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৪৬. কাসিম ইবনে হাবিব আল-আযদি':'46. Qasim ibn Habib al-Azdi', a:'القاسم بن حبيب الأزدي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৪৭. আদায় ইবনে আমিম আল-খাসআমি':'47. Uday ibn Amim al-Khathami', a:'عدي بن عميم الخثعمي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৪৮. আমর ইবনে মুতা ইবনে আবি রাহম':'48. Amr ibn Mutah ibn Abi Rahm', a:'عمرو بن مطاع بن أبي رحم', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৪৯. মুসলিম ইবনে কাসিম আল-আনসারি':'49. Muslim ibn Kaysir al-Ansari', a:'مسلم بن كثير الأنصاري', t:l==='bn'?'আনসারদের শহীদ':'Martyr from the Ansar'},
                            {n:l==='bn'?'৫০. যিয়াদ ইবনে আরিব আস-সাহমি':'50. Ziyad ibn Arib al-Sahmi', a:'زياد بن عريب الساهمي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৫১. ইয়াযিদ ইবনে যিয়াদ আল-মাশরাকি':'51. Yazid ibn Ziyad al-Mashraki', a:'يزيد بن زياد المشرقي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৫২. সালমান ইবনে মুযারাব আল-বাজালি':'52. Salman ibn Muzarib al-Bajali', a:'سلمان بن مضارب البجلي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৫৩. আমর ইবনে খালিদ আল-আযদি':'53. Amr ibn Khalid al-Azdi', a:'عمرو بن خالد الأزدي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৫৪. জারগামাহ ইবনে মালিক আত-তাগলিবি':'54. Jargamah ibn Malik al-Taghlabi', a:'جرجمة بن مالك التغلبي', t:l==='bn'?'খ্রিস্টান থেকে ইসলাম গ্রহণ করে শহীদ':'Converted from Christianity, then martyred'},
                            {n:l==='bn'?'৫৫. কাহিল ইবনে আমর আশ-শায়বানি':'55. Kahil ibn Amr al-Shaybani', a:'كاهل بن عمرو الشيباني', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৫৬. আসলাম মাওলা ইমাম হোসাইন (আ.)':'56. Aslam, mawla of Imam Husayn (AS)', a:'أسلم مولى الحسين', t:l==='bn'?'ইমামের বিশ্বস্ত সেবক':'Faithful servant of the Imam'},
                            {n:l==='bn'?'৫৭. কারিম ইবনে আব্দুল্লাহ আল-গিফারি':'57. Karim ibn Abdillah al-Ghifari', a:'كريم بن عبد الله الغفاري', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৫৮. ওয়াদ্ধাহ মাওলা আমর ইবনে খালিদ':'58. Waddah, mawla of Amr ibn Khalid', a:'وضاح مولى عمرو بن خالد', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৫৯. মানিয়া মাওলা বনি দারিম':'59. Mania, mawla of Bani Darim', a:'مانع مولى بني دارم', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৬০. সুলাইমান মাওলা ইমাম হোসাইন (আ.)':'60. Sulayman, mawla of Imam Husayn (AS)', a:'سليمان مولى الحسين', t:l==='bn'?'ইমামের বিশ্বস্ত সেবক':'Faithful servant of the Imam'},
                            {n:l==='bn'?'৬১. কাসিম ইবনে সা\'দ আল-মাযহাজি':'61. Qasim ibn Sa\'d al-Madhaji', a:'قاسم بن سعد المذحجي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৬২. আব্দুল্লাহ মাওলা ইমাম হোসাইন (আ.)':'62. Abdullah, mawla of Imam Husayn (AS)', a:'عبد الله مولى الحسين', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৬৩. সা\'দ মাওলা আলী ইবনে আবি তালিব':'63. Sad, mawla of Ali ibn Abi Talib', a:'سعد مولى علي بن أبي طالب', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৬৪. ইমাম আলী ইবনে হোসাইন আল-আকবর (যয়নুল আবিদিন) — অসুস্থ ছিলেন, শহীদ হননি':'64. Note: Imam Zayn al-Abidin was ill, not martyred', a:'زين العابدين', t:l==='bn'?'৪র্থ ইমাম — বন্দী হয়েছিলেন':'4th Imam — taken captive'},
                            {n:l==='bn'?'৬৫. জাওন মাওলা আবি যার আল-গিফারি':'65. Jawn, mawla of Abi Dhar al-Ghifari', a:'جون مولى أبي ذر الغفاري', t:l==='bn'?'বৃদ্ধ বিশ্বস্ত সেবক':'Elderly faithful servant'},
                            {n:l==='bn'?'৬৬. আনাস ইবনে হারিস আল-কাহিলি':'66. Anas ibn Harith al-Kahili', a:'أنس بن الحارث الكاهلي', t:l==='bn'?'রাসূল (সা.)-এর সাহাবি':'Companion of the Prophet (PBUH)'},
                            {n:l==='bn'?'৬৭. আব্দুল্লাহ ইবনে ইয়াকতার আল-পিনাহানি':'67. Abdullah ibn Yaqtar al-Pinahani', a:'عبد الله بن يقطر', t:l==='bn'?'ইমামের দুধভাই':'Foster brother of the Imam'},
                            {n:l==='bn'?'৬৮. হাশিম ইবনে উতবা আল-মিরকাল':'68. Hashim ibn Utba al-Mirqal (nephew)', a:'هاشم بن عتبة المرقال', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৬৯. আবু আব্দুল্লাহ আয-যুহাইর আল-মাযহাজি':'69. Abu Abdillah al-Zuhayr al-Madhaji', a:'الزهير المذحجي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৭০. সাইফ ইবনে মালিক আল-নামিরি':'70. Sayf ibn Malik al-Namiri', a:'سيف بن مالك النمري', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৭১. বাশির ইবনে আমর আল-হাযরামি':'71. Bashir ibn Amr al-Hadrami', a:'بشير بن عمرو الحضرمي', t:l==='bn'?'বীর সঙ্গী':'Brave companion'},
                            {n:l==='bn'?'৭২. শাবিব মাওলা আল-হারিস আল-জাবালি':'72. Shabib, mawla al-Harith al-Jabali', a:'شبيب مولى الحارث الجبلي', t:l==='bn'?'শেষ শহীদদের একজন':'Among the last to be martyred'},
                        ].map(m=>`
                        <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-xl px-4 py-2.5 flex items-start gap-3">
                            <span style="color:#dc2626;font-size:1rem;flex-shrink:0;margin-top:2px">🩸</span>
                            <div class="flex-1 min-w-0">
                                <div class="font-semibold text-sm">${m.n}</div>
                                <div class="arabic-text text-xs mt-0.5" dir="rtl" style="color:${d?'#fca5a5':'#991b1b'}">${m.a}</div>
                                <div class="text-xs ${d?'text-gray-400':'text-gray-500'} mt-0.5">${m.t}</div>
                            </div>
                        </div>`).join('')}
                        </div>
                    </div>
                </div>

                <div class="${d?'bg-red-950 border-red-900':'bg-red-50 border-red-200'} border rounded-2xl p-4 text-center">
                    <p class="font-bold mb-1" style="color:#dc2626">${l==='bn'?'اَللَّهُمَّ صَلِّ عَلَى الْحُسَيْنِ وَعَلَى آلِ الْحُسَيْن':'اَللَّهُمَّ صَلِّ عَلَى الْحُسَيْنِ وَعَلَى آلِ الْحُسَيْن'}</p>
                    <p class="text-xs ${d?'text-gray-300':'text-gray-700'}">${l==='bn'?'হে আল্লাহ! হোসাইন ও তাঁর পরিবারের উপর দরুদ পাঠাও':'O Allah, send blessings upon Husayn and the family of Husayn'}</p>
                </div>
            </div>

            <!-- ─── যিয়ারত ─── -->
            <div id="mhp-zr" class="mhp space-y-4" style="display:none">
                <h3 class="text-xl font-bold">${l==='bn'?'🤲 বিশেষ যিয়ারত ও দোয়া':'🤲 Special Ziyarat & Dua'}</h3>
                <div class="${d?'bg-gray-800 border-amber-900':'bg-amber-50 border-amber-200'} border rounded-2xl p-6">
                    <h4 class="font-bold mb-3" style="color:#b45309">${l==='bn'?'যিয়ারত আশুরা':'Ziyarat Ashura'}</h4>
                    <p class="arabic-text text-right text-xl mb-3" dir="rtl" style="color:${d?'#fca5a5':'#991b1b'};line-height:2">السَّلَامُ عَلَيْكَ يَا أَبَا عَبْدِ اللَّهِ وَعَلَى الْأَرْوَاحِ الَّتِي حَلَّتْ بِفِنَائِكَ</p>
                    <p class="text-sm ${d?'text-gray-300':'text-gray-700'}">${l==='bn'?'হে আবা আব্দিল্লাহ! আপনার প্রতি এবং আপনার দরগায় অবস্থিত আত্মাদের প্রতি শান্তি বর্ষিত হোক।':'Peace be upon you, O Aba Abdillah, and upon the souls who have gathered in your courtyard.'}</p>
                </div>
                <div class="${d?'bg-gray-800 border-green-900':'bg-green-50 border-green-200'} border rounded-2xl p-6">
                    <h4 class="font-bold mb-2" style="color:#059669">${l==='bn'?'দোয়ায়ে তাওয়াসসুল':'Dua Tawassul'}</h4>
                    <p class="text-sm ${d?'text-gray-300':'text-gray-700'}">${l==='bn'?'ইমাম হোসাইন (আ.) ও আহলে বাইতের মাধ্যমে আল্লাহর কাছে তাওয়াসসুল করা মুস্তাহাব।':'Seeking intercession (tawassul) to Allah through Imam Husayn (AS) and the Ahlul Bayt is recommended.'}</p>
                    <button data-action="changePage" data-param="home" class="mt-3 text-sm font-bold px-4 py-2 rounded-xl" style="background:#05966918;color:#059669">${l==='bn'?'🏠 হোমে যান →':'🏠 Go to Home →'}</button>
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// বিশেষ দিনসমূহ পেজ — CRUD সহ
// ============================================================================
function renderShiaDaysPage() {
    const d = state.darkMode, l = state.language;

    const staticDays = [
        // ── ঈদ ও আনন্দময় দিন (হিজরি মাস অনুযায়ী) ──

        // — মুহাররম —
        {id:'eid13', icon:'🎊', color:'#dc2626', type:'eid', hijriDate:l==='bn'?'১ মুহাররম':'1 Muharram', titleBn:l==='bn'?'ইসলামি নববর্ষ — হিজরি নববর্ষ':'Islamic New Year — Hijri New Year', arabicTitle:'رأس السنة الهجرية', descBn:l==='bn'?'মুহাররমের ১ তারিখ হিজরি ক্যালেন্ডারের নববর্ষ। ৬২২ খ্রিষ্টাব্দে রাসূলুল্লাহ (সা.)-এর মক্কা থেকে মদিনায় হিজরতের স্মৃতিতে এই ক্যালেন্ডার প্রবর্তিত হয়। নববর্ষে দোয়া ও ইবাদতের বিশেষ গুরুত্ব রয়েছে।':'1 Muharram is the new year of the Hijri calendar. This calendar was established in memory of the Prophet\'s (PBUH) migration from Mecca to Medina in 622 CE. Dua and worship carry special importance on the new year.', amaal:l==='bn'?'দোয়া, ইস্তিগফার, তওবা, নতুন বছরের সংকল্প, সালাওয়াত':'Dua, Istighfar, repentance, new year resolutions, Salawat', importance:l==='bn'?'হিজরি নববর্ষ — ইসলামের ঐতিহাসিক হিজরতের স্মৃতি':'Hijri New Year — memory of the historic migration of Islam'},
        {id:'ex3', icon:'🌑', color:'#1e3a8a', type:'eid', hijriDate:l==='bn'?'৯ মুহাররম':'9 Muharram', titleBn:l==='bn'?'তাসুআ — আশুরার আগের দিন':'Tasu\'a — Day Before Ashura', arabicTitle:'تاسوعاء', descBn:l==='bn'?'৯ মুহাররম তাসুআ নামে পরিচিত। ৬১ হিজরিতে এই দিনে ইমাম হোসাইন (আ.)-এর শিবিরে ইয়াযিদের বাহিনী চারদিক থেকে ঘিরে ফেলে। হযরত আব্বাস (আ.)-এর নামে উৎসর্গিত। এই দিনে মজলিস ও শোকসভা অনুষ্ঠিত হয়।':'9 Muharram is known as Tasu\'a. On this day in 61 AH, Yazid\'s forces surrounded Imam Husayn\'s camp on all sides. The day is dedicated to Hazrat Abbas (AS). Majlis and mourning gatherings are held on this day.', amaal:l==='bn'?'মজলিস, শোক পালন, যিয়ারত হযরত আব্বাস, আশুরার প্রস্তুতি':'Majlis, mourning, Ziyarat of Hazrat Abbas, preparation for Ashura', importance:l==='bn'?'আশুরার পূর্বদিন — আব্বাস ইবনে আলীর নামে উৎসর্গিত':'Day before Ashura — dedicated to Abbas ibn Ali'},

        // — রবিউল আউয়াল —
        {id:'eid9', icon:'🌿', color:'#065f46', type:'eid', hijriDate:l==='bn'?'১১ রবিউল আউয়াল':'11 Rabi al-Awwal', titleBn:l==='bn'?'ইমাম আলী রেযা (আ.) জন্মদিন':'Birthday of Imam Ali al-Ridha (AS)', arabicTitle:'مولد علي بن موسى الرضا', descBn:l==='bn'?'১১ রবিউল আউয়াল, ১৪৮ হিজরি — ইমাম রেযা (আ.) মদিনায় জন্মগ্রহণ করেন। অষ্টম ইমাম। মামুনের দরবারে ওলি আহদ (উত্তরাধিকারী) মনোনীত হয়েছিলেন। মাশহাদে তাঁর পবিত্র রওজা শরীফ।':'11 Rabi al-Awwal, 148 AH — Imam Ridha (AS) was born in Medina. The Eighth Imam. He was designated as Wali Ahd (Crown Prince) at Mamun\'s court. His holy shrine is in Mashhad.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম রেযা, দান':'Celebration, Salawat, Ziyarat of Imam Ridha, charity', importance:l==='bn'?'অষ্টম ইমামের জন্মদিন — আর-রেযা, আল্লাহর সন্তুষ্টিপ্রাপ্ত':'Birthday of the 8th Imam — al-Ridha, the Divinely Pleased'},
        {id:'eid8', icon:'☀️', color:'#b45309', type:'eid', hijriDate:l==='bn'?'১৭ রবিউল আউয়াল':'17 Rabi al-Awwal', titleBn:l==='bn'?'মিলাদুন্নবী (সা.) — রাসূলের জন্মদিন':'Mawlid al-Nabi — Birthday of the Prophet (SAW)', arabicTitle:'مولد النبي محمد صلى الله عليه وآله', descBn:l==='bn'?'১৭ রবিউল আউয়াল, ৫৭০ খ্রিষ্টাব্দ (শিয়া মত) — রাসূলুল্লাহ মুহাম্মদ (সা.) মক্কায় জন্মগ্রহণ করেন। তিনি সর্বকালের সর্বশ্রেষ্ঠ মানুষ এবং রহমতুল্লিল আলামিন — সমগ্র সৃষ্টির জন্য রহমত।':'17 Rabi al-Awwal, 570 CE (Shia view) — The Prophet Muhammad (SAW) was born in Mecca. He is the greatest human of all time and Rahmat al-lil Alamin — a mercy for all creation.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, মিলাদ মজলিস, দান, কুরআন তিলাওয়াত, সীরাত আলোচনা':'Celebration, Salawat, Mawlid gatherings, charity, Quran recitation, Seerah discussion', importance:l==='bn'?'সর্বশ্রেষ্ঠ নবীর জন্মদিন — ইমাম সাদিকেরও জন্মদিন (শিয়া মতে একই তারিখ)':'Birthday of the greatest Prophet — also birthday of Imam Sadiq (same date per Shia tradition)'},

        // — রবিউস সানি —
        {id:'eid20', icon:'🌟', color:'#065f46', type:'eid', hijriDate:l==='bn'?'৭ রবিউস সানি':'7 Rabi al-Thani', titleBn:l==='bn'?'ইমাম হাসান আসকারি (আ.) জন্মদিন (বিকল্প মত)':'Birthday of Imam Hasan al-Askari (AS) — Alt. Date', arabicTitle:'مولد الحسن العسكري', descBn:l==='bn'?'কিছু হাদিস গ্রন্থ অনুযায়ী ইমাম আসকারি (আ.)-এর জন্মদিন ৮ রবিউস সানি, আবার কিছুতে ৭ বা ১০ রবিউস সানি উল্লেখ আছে। একাদশ ইমামের জন্মদিনে সালাওয়াত ও ইবাদত করা হয়।':'According to some hadith collections, Imam Askari\'s birthday is 8 Rabi al-Thani; others mention 7 or 10. On the birthday of the Eleventh Imam, Salawat and worship are performed.', amaal:l==='bn'?'সালাওয়াত, যিয়ারত, ইবাদত, দান':'Salawat, Ziyarat, worship, charity', importance:l==='bn'?'একাদশ ইমামের জন্মদিন উদযাপন':'Celebration of the 11th Imam\'s birthday'},
        {id:'eid12', icon:'🌼', color:'#0e7490', type:'eid', hijriDate:l==='bn'?'৮ রবিউস সানি':'8 Rabi al-Thani', titleBn:l==='bn'?'ইমাম হাসান আসকারি (আ.) জন্মদিন':'Birthday of Imam Hasan al-Askari (AS)', arabicTitle:'مولد الحسن بن علي العسكري', descBn:l==='bn'?'৮ রবিউস সানি, ২৩২ হিজরি — ইমাম আসকারি (আ.) মদিনায় জন্মগ্রহণ করেন। একাদশ ইমাম। সামারায় আসকার মহল্লায় বসবাসের কারণে "আসকারি" উপাধি। দ্বাদশ ইমাম মাহদির পিতা।':'8 Rabi al-Thani, 232 AH — Imam Askari (AS) was born in Medina. The Eleventh Imam. The title "Askari" comes from living in the Askar district of Samarra. Father of the Twelfth Imam Mahdi.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম আসকারি, দান':'Celebration, Salawat, Ziyarat of Imam Askari, charity', importance:l==='bn'?'একাদশ ইমামের জন্মদিন — ইমাম মাহদির পিতা':'Birthday of the 11th Imam — father of Imam Mahdi'},

        // — জামাদিউস সানি —
        {id:'st5', icon:'🌹', color:'#be185d', type:'eid', hijriDate:l==='bn'?'২০ জামাদিউস সানি':'20 Jumada al-Thani', titleBn:l==='bn'?'হযরত ফাতেমা যাহরা (আ.) জন্মদিন':'Birthday of Lady Fatima al-Zahra (AS)', arabicTitle:'مولد فاطمة الزهراء', descBn:l==='bn'?'"ফাতেমা আমার হৃদয়ের একটুকরো" — রাসূলুল্লাহ (সা.)। ইসলামের শ্রেষ্ঠ নারী।':'"Fatima is a piece of my heart" — Prophet (PBUH). The greatest woman in Islam.', amaal:l==='bn'?'মহিলাদের সম্মান, দান, দোয়া':'Honouring women, charity, dua', importance:l==='bn'?'ইরানে মহিলা দিবস হিসেবে পালিত':'Celebrated as Women\'s Day in Iran'},

        // — রজব —
        {id:'eid11', icon:'🌱', color:'#059669', type:'eid', hijriDate:l==='bn'?'২ রজব':'2 Rajab', titleBn:l==='bn'?'ইমাম আলী হাদি (আ.) জন্মদিন':'Birthday of Imam Ali al-Hadi (AS)', arabicTitle:'مولد علي بن محمد الهادي', descBn:l==='bn'?'২ রজব, ২১২ হিজরি — ইমাম হাদি (আ.) মদিনার নিকটবর্তী সুরইয়ায় জন্মগ্রহণ করেন। দশম ইমাম। আন-নাকি ও আল-হাদি (পথপ্রদর্শক) নামে পরিচিত। সামারায় দীর্ঘ গৃহবন্দিত্বে থেকেও উম্মাহকে পথ দেখিয়েছেন।':'2 Rajab, 212 AH — Imam Hadi (AS) was born in Suraya near Medina. The Tenth Imam. Known as al-Naqi (the Pure) and al-Hadi (the Guide). He guided the Ummah even through long house arrest in Samarra.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম হাদি, দান':'Celebration, Salawat, Ziyarat of Imam Hadi, charity', importance:l==='bn'?'দশম ইমামের জন্মদিন — আন-নাকি, আল-হাদি':'Birthday of the 10th Imam — al-Naqi, al-Hadi'},
        {id:'eid19', icon:'👶', color:'#0369a1', type:'eid', hijriDate:l==='bn'?'৫ রজব':'5 Rajab', titleBn:l==='bn'?'ইমাম আলী নাকি (হাদি) (আ.) জন্মদিন':'Birthday of Imam Ali al-Naqi al-Hadi (AS)', arabicTitle:'مولد علي بن محمد الهادي النقي', descBn:l==='bn'?'৫ রজব, ২১২ হিজরি (কিছু মতে ২ রজব) — ইমাম হাদি (আ.) জন্মগ্রহণ করেন। মদিনার নিকট সুরইয়া গ্রামে জন্ম। শিশু বয়সে ইমামতের দায়িত্ব পান এবং সামারায় গৃহবন্দি অবস্থায় শিয়া মুসলমানদের নেতৃত্ব দেন।':'5 Rajab, 212 AH (some say 2 Rajab) — Imam Hadi (AS) was born in the village of Suraya near Medina. He assumed Imamate in childhood and led the Shia Muslims while under house arrest in Samarra.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম হাদি, দান':'Celebration, Salawat, Ziyarat of Imam Hadi, charity', importance:l==='bn'?'দশম ইমামের জন্মদিন — আল-হাদি, আন-নাকি':'Birthday of the 10th Imam — al-Hadi, al-Naqi'},
        {id:'eid10', icon:'💫', color:'#7c3aed', type:'eid', hijriDate:l==='bn'?'১০ রজব':'10 Rajab', titleBn:l==='bn'?'ইমাম মুহাম্মদ জওয়াদ (আ.) জন্মদিন':'Birthday of Imam Muhammad al-Jawad (AS)', arabicTitle:'مولد محمد بن علي الجواد', descBn:l==='bn'?'১০ রজব, ১৯৫ হিজরি — ইমাম জওয়াদ (আ.) মদিনায় জন্মগ্রহণ করেন। নবম ইমাম। মাত্র ৯ বছর বয়সে ইমামতের দায়িত্ব পান। আত-তাকি ও আল-জওয়াদ (দানশীল) নামে পরিচিত।':'10 Rajab, 195 AH — Imam Jawad (AS) was born in Medina. The Ninth Imam. He assumed Imamate at only 9 years of age. Known as al-Taqi (the Pious) and al-Jawad (the Generous).', amaal:l==='bn'?'আনন্দ, দান, যিয়ারত ইমাম জওয়াদ, সালাওয়াত':'Celebration, charity, Ziyarat of Imam Jawad, Salawat', importance:l==='bn'?'নবম ইমামের জন্মদিন — সর্বকনিষ্ঠ বয়সে ইমামতপ্রাপ্ত':'Birthday of the 9th Imam — youngest to assume Imamate'},
        {id:'st4', icon:'🦁', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৩ রজব':'13 Rajab', titleBn:l==='bn'?'ইমাম আলী (আ.) জন্মদিন':'Birthday of Imam Ali (AS)', arabicTitle:'مولد علي بن أبي طالب', descBn:l==='bn'?'১৩ রজব — কাবাঘরের ভেতরে ইমাম আলী (আ.)-এর জন্ম।':'13 Rajab — Imam Ali (AS) was born inside the Kaaba.', amaal:l==='bn'?'আনন্দ, দান-সদকা, নামাজ, যিয়ারত':'Celebration, charity, prayer, ziyarat', importance:l==='bn'?'একমাত্র ব্যক্তি যিনি কাবার ভেতরে জন্মগ্রহণ করেছেছেন':'The only person ever born inside the Kaaba'},
        {id:'eid15', icon:'✨', color:'#4f46e5', type:'eid', hijriDate:l==='bn'?'২৭ রজব':'27 Rajab', titleBn:l==='bn'?'ঈদে মাবআস — নবীর নবুওয়াত প্রাপ্তির দিন':'Eid al-Mab\'ath — Day of the Prophet\'s Mission', arabicTitle:'عيد المبعث النبوي', descBn:l==='bn'?'২৭ রজব, ৬১০ খ্রিষ্টাব্দ — হেরা গুহায় রাসূলুল্লাহ (সা.) প্রথম ওহি লাভ করেন। জিবরাইল (আ.) সূরা আলাকের প্রথম আয়াতগুলো নিয়ে আসেন। এই দিনটি শিয়া ইসলামে ঈদ হিসেবে পালিত হয়।':'27 Rajab, 610 CE — The Prophet (PBUH) received the first revelation in the Cave of Hira. Jibrail (AS) brought the first verses of Surah al-Alaq. This day is celebrated as an Eid in Shia Islam.', amaal:l==='bn'?'রোজা, গোসল, ১২ রাকাত নামাজ, দোয়ায়ে মাবআস, সালাওয়াত':'Fasting, Ghusl, 12 Rakat prayer, Dua al-Mab\'ath, Salawat', importance:l==='bn'?'নবুওয়াতের সূচনা — প্রথম ওহির দিন — শিয়া ইসলামের পাঁচ ঈদের একটি':'Beginning of Prophethood — day of first revelation — one of the five Eids of Shia Islam'},

        // — শাবান —
        {id:'st6', icon:'🌸', color:'#059669', type:'eid', hijriDate:l==='bn'?'৩ শাবান':'3 Shaban', titleBn:l==='bn'?'ইমাম হোসাইন (আ.) জন্মদিন':'Birthday of Imam Husayn (AS)', arabicTitle:'مولد الحسين بن علي', descBn:l==='bn'?'৩ শাবান, ৪ হিজরি — ইমাম হোসাইন (আ.) মদিনায় জন্মগ্রহণ করেন। রাসূলুল্লাহ (সা.) বলেছেন: "হোসাইন আমার থেকে, আমি হোসাইন থেকে।" কারবালার মহানায়ক, সাইয়্যিদুশ শুহাদা।':'3 Shaban, 4 AH — Imam Husayn (AS) was born in Medina. The Prophet (PBUH) said: "Husayn is from me, and I am from Husayn." The hero of Karbala, Master of Martyrs.', amaal:l==='bn'?'আনন্দ, দান, যিয়ারত ইমাম হোসাইন, সালাওয়াত':'Celebration, charity, Ziyarat of Imam Husayn, Salawat', importance:l==='bn'?'সাইয়্যিদুশ শুহাদার জন্মদিন — তৃতীয় ইমামের শুভাগমন':'Birthday of the Master of Martyrs — arrival of the 3rd Imam'},
        {id:'eid18', icon:'🌺', color:'#9d174d', type:'eid', hijriDate:l==='bn'?'৪ শাবান':'4 Shaban', titleBn:l==='bn'?'হযরত আলী আকবার (আ.) জন্মদিন':'Birthday of Hazrat Ali Akbar (AS)', arabicTitle:'مولد علي الأكبر بن الحسين', descBn:l==='bn'?'৪ শাবান — হযরত আলী আকবার (আ.) ইমাম হোসাইন (আ.)-এর পুত্র এবং কারবালার বীর শহীদ। তিনি রাসূলুল্লাহ (সা.)-এর চেহারা ও কণ্ঠস্বরে সবচেয়ে সদৃশ ছিলেন। ইরানে এই দিনটি "যুব দিবস" হিসেবে পালিত হয়।':'4 Shaban — Hazrat Ali Akbar (AS) was the son of Imam Husayn (AS) and a heroic martyr of Karbala. He most closely resembled the Prophet (PBUH) in face and voice. In Iran, this day is celebrated as Youth Day.', amaal:l==='bn'?'আনন্দ, তরুণদের সম্মান, দান, যিয়ারত, সালাওয়াত':'Celebration, honouring youth, charity, Ziyarat, Salawat', importance:l==='bn'?'হযরত আলী আকবারের জন্মদিন — ইরানে যুব দিবস':'Birthday of Hazrat Ali Akbar — Youth Day in Iran'},
        {id:'eid7', icon:'🌟', color:'#0369a1', type:'eid', hijriDate:l==='bn'?'৫ শাবান':'5 Shaban', titleBn:l==='bn'?'হযরত আব্বাস ইবনে আলী (আ.) জন্মদিন':'Birthday of Hazrat Abbas ibn Ali (AS)', arabicTitle:'مولد العباس بن علي', descBn:l==='bn'?'৫ শাবান, ২৬ হিজরি — হযরত আব্বাস (আ.) মদিনায় জন্মগ্রহণ করেন। কারবালার পতাকাবাহী, ইমাম হোসাইনের ভাই ও বিশ্বস্ত সেনাপতি। "বাবুল হাওয়াইজ" নামে পরিচিত — হাজতমন্দদের দরজা।':'5 Shaban, 26 AH — Hazrat Abbas (AS) was born in Medina. Standard-bearer of Karbala, brother and loyal commander of Imam Husayn. Known as "Bab al-Hawaij" — the Gate for those in need.', amaal:l==='bn'?'আনন্দ, যিয়ারত আবুল ফযল আব্বাস, দোয়া, দান':'Celebration, Ziyarat of Abu al-Fadl al-Abbas, dua, charity', importance:l==='bn'?'কারবালার পতাকাবাহী হযরত আব্বাসের জন্মদিন':'Birthday of the standard-bearer of Karbala, Hazrat Abbas'},
        {id:'ex4', icon:'🔮', color:'#4f46e5', type:'eid', hijriDate:l==='bn'?'২৬০ হি. (১৫ শাবান, ২৬০ হি.)':'260 AH (15 Shaban, 260 AH)', titleBn:l==='bn'?'গায়বতে সুগরা — ছোট অনুপস্থিতির সূচনা':'Start of Minor Occultation of Imam Mahdi', arabicTitle:'بداية الغيبة الصغرى', descBn:l==='bn'?'২৬০ হিজরিতে ইমাম হাসান আসকারি (আ.)-এর শাহাদাতের পর ইমাম মাহদি (আ.) গায়বতে চলে যান। প্রথমে গায়বতে সুগরা (ছোট অনুপস্থিতি, ৬৯ বছর) শুরু হয়, যেখানে চার জন নায়েবের মাধ্যমে যোগাযোগ রাখা হত।':'After the martyrdom of Imam Hasan al-Askari (AS) in 260 AH, Imam Mahdi (AS) went into occultation. The Minor Occultation (Ghayba al-Sughra, 69 years) began first, where contact was maintained through four deputies.', amaal:l==='bn'?'দোয়ায়ে আহদ, ইমামের জন্য দোয়া, তাড়াতাড়ি আসার প্রার্থনা':'Dua Ahd, dua for the Imam, prayers for his swift return', importance:l==='bn'?'ইমাম মাহদির গায়বতের সূচনা — উম্মাহর জন্য পরীক্ষার সময়':'Beginning of Imam Mahdi\'s occultation — a time of trial for the Ummah'},
        {id:'st3', icon:'🌙', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৫ শাবান':'15 Shaban', titleBn:l==='bn'?'নিমে শাবান — ইমাম মাহদি (আ.) জন্মদিন':'Mid-Shaban — Birthday of Imam Mahdi (AS)', arabicTitle:'نيمه شعبان', descBn:l==='bn'?'১৫ শাবান, ২৫৫ হিজরি — ইমাম মাহদি (আ.) সামারায় জন্মগ্রহণ করেন। দ্বাদশ ইমাম আল্লাহর নির্দেশে গায়বতে আছেন।':'15 Shaban, 255 AH — Imam Mahdi (AS) was born in Samarra. The Twelfth Imam is in occultation by divine command.', amaal:l==='bn'?'দোয়ায়ে নুদবা, দোয়ায়ে আহদ, সালাওয়াত, রোজা':'Dua Nudbah, Dua Ahd, Salawat, Fasting', importance:l==='bn'?'ইমামে যামানার জন্মদিন':'Birthday of the Imam of Our Time'},

        // — শাওয়াল —
        {id:'eid17', icon:'🌙', color:'#059669', type:'eid', hijriDate:l==='bn'?'১ শাওয়াল':'1 Shawwal', titleBn:l==='bn'?'ঈদুল ফিতর — রোজা শেষের ঈদ':'Eid al-Fitr — Festival of Breaking the Fast', arabicTitle:'عيد الفطر', descBn:l==='bn'?'১ শাওয়াল — রমজানের এক মাস রোজার পর এই ঈদ আসে। আল্লাহ তাঁর বান্দাদের সিয়াম পালনের পুরস্কার দেন এই দিনে। ফিতরানা আদায় ও নামাজ পড়া ওয়াজিব।':'1 Shawwal — This Eid comes after one month of fasting in Ramadan. Allah rewards His servants for their fasting on this day. Paying Fitrana and performing the prayer are obligatory.', amaal:l==='bn'?'ঈদের নামাজ, ফিতরানা আদায়, দান, পরিবারের সাথে আনন্দ, মুমিনদের অভিনন্দন':'Eid prayer, paying Fitrana, charity, celebration with family, congratulating believers', importance:l==='bn'?'রমজানের পুরস্কারের দিন — আল্লাহ সিয়াম পালনকারীদের ক্ষমা করেন':'Day of reward for Ramadan — Allah forgives those who fasted'},

        // — যিলকদ —
        {id:'eid14', icon:'🌙', color:'#0369a1', type:'eid', hijriDate:l==='bn'?'২৫ যিলকদ':'25 Dhu al-Qadah', titleBn:l==='bn'?'ঈদে দাহউল আরদ — পৃথিবী বিস্তারের দিন':'Eid Dahw al-Ard — Day of Earth\'s Spreading', arabicTitle:'عيد دحو الأرض', descBn:l==='bn'?'২৫ যিলকদ — হাদিস অনুযায়ী এই দিনে আল্লাহ পৃথিবীকে পানির নিচ থেকে বিস্তার করেছেন, কাবাকে পৃথিবীর কেন্দ্র বানিয়েছেন। এই দিনে রোজা রাখলে ৭০ বছরের রোজার সওয়াব পাওয়া যায় বলে হাদিসে এসেছে।':'25 Dhu al-Qadah — According to hadith, on this day Allah spread the earth from beneath the water and made the Kaaba the center of the earth. Hadith states that fasting on this day earns the reward of 70 years of fasting.', amaal:l==='bn'?'রোজা, গোসল, দোয়ায়ে দাহউল আরদ, ২ রাকাত বিশেষ নামাজ':'Fasting, Ghusl, Dua of Dahw al-Ard, 2 Rakat special prayer', importance:l==='bn'?'পৃথিবী সৃষ্টির বিশেষ দিন — ৭০ বছরের রোজার সওয়াবের দিন':'Special day of earth\'s creation — reward of 70 years of fasting'},

        // — জিলহজ —
        {id:'ex1', icon:'🏔️', color:'#b45309', type:'eid', hijriDate:l==='bn'?'৯ জিলহজ':'9 Dhu al-Hijjah', titleBn:l==='bn'?'ঈদে আরাফা — আরাফার দিন':'Day of Arafah', arabicTitle:'يوم عرفة', descBn:l==='bn'?'৯ জিলহজ হজের সবচেয়ে গুরুত্বপূর্ণ দিন। হাজীরা আরাফার ময়দানে অবস্থান করেন এবং দোয়া করেন। ইমাম হোসাইন (আ.)-এর বিখ্যাত দোয়ায়ে আরাফা এই দিনে পাঠ করা হয়। এই দিনে রোজা রাখলে দুই বছরের গোনাহ মাফ হয় বলে হাদিসে এসেছে।':'9 Dhul Hijjah is the most important day of Hajj. Pilgrims stand on the plain of Arafah and make dua. The famous Dua Arafah of Imam Husayn (AS) is recited on this day. Hadith states that fasting on this day expiates sins of two years.', amaal:l==='bn'?'দোয়ায়ে আরাফা (ইমাম হোসাইন), রোজা, ইস্তিগফার, সালাওয়াত':'Dua Arafah (Imam Husayn), Fasting, Istighfar, Salawat', importance:l==='bn'?'হজের সর্বোচ্চ দিন — দোয়া কবুল ও গোনাহ মাফের দিন':'The peak day of Hajj — day of accepted duas and forgiveness of sins'},
        {id:'eid16', icon:'🎉', color:'#be185d', type:'eid', hijriDate:l==='bn'?'১০ যিলহজ':'10 Dhul Hijjah', titleBn:l==='bn'?'ঈদুল আযহা — কুরবানির ঈদ':'Eid al-Adha — Festival of Sacrifice', arabicTitle:'عيد الأضحى', descBn:l==='bn'?'১০ যিলহজ — হযরত ইব্রাহিম (আ.)-এর পুত্র ইসমাইলকে কুরবানির স্মৃতিতে এই ঈদ পালিত হয়। হাজীরা মিনায় কুরবানি দেন। সারা বিশ্বের মুসলমানরা পশু কুরবানি দেন।':'10 Dhul Hijjah — This Eid commemorates the sacrifice of Prophet Ibrahim\'s (AS) son Ismail. Pilgrims offer sacrifice in Mina. Muslims around the world offer animal sacrifice.', amaal:l==='bn'?'নামাজ, কুরবানি, দান, পরিবারের সাথে আনন্দ':'Prayer, sacrifice, charity, celebration with family', importance:l==='bn'?'ইব্রাহিমের ত্যাগের স্মৃতি — হজের চূড়ান্ত দিন':'Memory of Ibrahim\'s sacrifice — culminating day of Hajj'},
        {id:'st1', icon:'👑', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৮ জিলহজ':'18 Dhul Hijjah', titleBn:l==='bn'?'ঈদে গাদির খুম':'Eid al-Ghadeer Khumm', arabicTitle:'عيد الغدير', descBn:l==='bn'?'১০ম হিজরিতে বিদায় হজ থেকে ফেরার পথে গাদির খুমে রাসূলুল্লাহ (সা.) আল্লাহর নির্দেশে ইমাম আলী (আ.)-কে উম্মাহর নেতা ঘোষণা করেন।':'On returning from the Farewell Hajj in 10 AH, the Prophet (PBUH) declared Imam Ali (AS) as the leader of the Ummah at Ghadir Khumm by divine command.', amaal:l==='bn'?'রোজা, গোসল, নতুন পোশাক, মুমিনদের অভিনন্দন, দোয়ায়ে নুদবা পাঠ':'Fasting, Ghusl, new clothes, congratulating believers, reciting Dua Nudbah', importance:l==='bn'?'শিয়া ইসলামের সর্বোচ্চ উৎসব':'The greatest celebration of Shia Islam'},
        {id:'st2', icon:'✨', color:'#7c3aed', type:'eid', hijriDate:l==='bn'?'২৪ জিলহজ':'24 Dhul Hijjah', titleBn:l==='bn'?'ঈদে মুবাহিলা':'Eid al-Mubahala', arabicTitle:'عيد المباهلة', descBn:l==='bn'?'৯ম হিজরিতে নাজরানের খ্রিস্টানদের সাথে মুবাহিলায় রাসূলুল্লাহ (সা.) ইমাম আলী, ফাতেমা, হাসান ও হোসাইন (আ.)-কে নিলেন। খ্রিস্টানরা পিছিয়ে যায়।':'In 9 AH, for the Mubahala with the Christians of Najran, the Prophet brought Imam Ali, Fatima, Hasan, and Husayn (AS). The Christians withdrew.', amaal:l==='bn'?'রোজা, গোসল, ২ রাকাত নামাজ':'Fasting, Ghusl, 2 Rakat prayer', importance:l==='bn'?'আহলে বাইতের শ্রেষ্ঠত্বের কুরআনি প্রমাণ':'Quranic proof of the excellence of the Ahlul Bayt'},

        // — বিশেষ / নির্দিষ্ট তারিখ নেই —
        {id:'ex2', icon:'🌿', color:'#059669', type:'eid', hijriDate:l==='bn'?'১ ফারভারদিন (২১ মার্চ)':'1 Farvardin (21 March)', titleBn:l==='bn'?'ঈদে নওরোজ — পার্সি নববর্ষ':'Eid Nowruz — Persian New Year', arabicTitle:'عيد النوروز', descBn:l==='bn'?'ইমাম সাদিক (আ.) বলেছেন: নওরোজ সেই দিন যেদিন আল্লাহ তাঁর বান্দাদের কাছ থেকে অঙ্গীকার নিয়েছিলেন। এই দিনে ইমাম আলী (আ.) কুফায় পৌঁছেছিলেন এবং তাঁকে স্বাগত জানানো হয়েছিল। শিয়া হাদিসে এই দিনটির বিশেষ মর্যাদা রয়েছে।':'Imam Sadiq (AS) said: Nowruz is the day when Allah took the covenant from His servants. On this day Imam Ali (AS) arrived in Kufa and was welcomed. This day holds special significance in Shia hadith.', amaal:l==='bn'?'গোসল, নতুন পোশাক, মিষ্টি বিতরণ, দোয়া, পরিবারের সাথে আনন্দ, সালাওয়াত':'Ghusl, new clothes, distributing sweets, dua, celebration with family, Salawat', importance:l==='bn'?'ইমাম সাদিকের হাদিসে উল্লিখিত বিশেষ দিন — পার্সি সংস্কৃতির নববর্ষ':'A special day mentioned in Imam Sadiq\'s hadith — Persian cultural New Year'},

        // ── বিশেষ রাত (হিজরি মাস অনুযায়ী) ──

        // — রবিউল আউয়াল —
        {id:'sn6', icon:'🕌', color:'#065f46', type:'special', hijriDate:l==='bn'?'১৭ রবিউল আউয়াল':'17 Rabi al-Awwal', titleBn:l==='bn'?'শবে মওলুদুন্নবী — নবীর জন্মরাত':'Night of Mawlid al-Nabi — Eve of the Prophet\'s Birthday', arabicTitle:'ليلة مولد النبي محمد صلى الله عليه وآله', descBn:l==='bn'?'১৭ রবিউল আউয়ালের রাত — পরদিন রাসূলুল্লাহ (সা.) জন্মগ্রহণ করেন (শিয়া মত)। এই রাতে আরবের অগ্নিমন্দিরের আগুন নিভে যায়, কিসরার প্রাসাদে ফাটল দেখা দেয় এবং সামাওয়াহর হ্রদ শুকিয়ে যায় — মহানবীর আগমনের নিদর্শন।':'Night of 17 Rabi al-Awwal — the next day the Prophet (PBUH) was born (Shia view). On this night the fires of Persian fire temples went out, cracks appeared in the palace of Khusrow, and Lake Sawah dried up — signs of the great Prophet\'s arrival.', amaal:l==='bn'?'আনন্দ, মিলাদ মজলিস, সালাওয়াত, কুরআন তিলাওয়াত, দান, সীরাত আলোচনা':'Celebration, Mawlid gatherings, Salawat, Quran recitation, charity, Seerah discussion', importance:l==='bn'?'সর্বশ্রেষ্ঠ নবীর জন্মপূর্ব রাত — রহমতুল্লিল আলামিনের আগমনের রাত':'Eve of the greatest Prophet\'s birth — Night of the arrival of Mercy to the Worlds'},

        // — রজব —
        {id:'sn3', icon:'✨', color:'#059669', type:'special', hijriDate:l==='bn'?'১ রজব':'1 Rajab', titleBn:l==='bn'?'শবে রজব — রজবের প্রথম রাত':'Shab-e-Rajab — First Night of Rajab', arabicTitle:'ليلة أول رجب', descBn:l==='bn'?'রজব মাস আল্লাহর অন্যতম হারাম মাস। রজবের প্রথম রাত ইবাদতের জন্য বিশেষ মর্যাদাপূর্ণ। হাদিসে এসেছে এই রাতে দোয়া কবুল হয় এবং আল্লাহর রহমত বিশেষভাবে বর্ষিত হয়।':'Rajab is one of the sacred months of Allah. The first night of Rajab is especially significant for worship. Hadith states that duas are accepted on this night and Allah\'s mercy descends specially.', amaal:l==='bn'?'গোসল, নামাজ, দোয়ায়ে রজব, ইস্তিগফার, কুরআন তিলাওয়াত':'Ghusl, prayer, Dua of Rajab, Istighfar, Quran recitation', importance:l==='bn'?'রজবের প্রারম্ভের মর্যাদাপূর্ণ রাত — দোয়া কবুলের রাত':'The honoured opening night of Rajab — Night of accepted duas'},
        {id:'sn4', icon:'🌟', color:'#b45309', type:'special', hijriDate:l==='bn'?'১৩ রজব':'13 Rajab', titleBn:l==='bn'?'শবে মওলুদে আলী — ইমাম আলীর জন্মরাত':'Night of Ali\'s Birth — Eve of Imam Ali\'s Birthday', arabicTitle:'ليلة مولد علي بن أبي طالب', descBn:l==='bn'?'১৩ রজবের রাত — পরদিন কাবার ভেতরে ইমাম আলী (আ.)-এর জন্ম হয়। এই রাতটি শিয়া মুসলমানদের কাছে আনন্দ ও ইবাদতের রাত। ইমাম আলী একমাত্র ব্যক্তি যিনি কাবার ভেতরে জন্মগ্রহণ করেছেন।':'Night of 13 Rajab — the next day Imam Ali (AS) was born inside the Kaaba. This night is one of joy and worship for Shia Muslims. Imam Ali is the only person ever born inside the Kaaba.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, নামাজ, মজলিস, দান, যিয়ারত ইমাম আলী':'Celebration, Salawat, prayer, Majlis, charity, Ziyarat of Imam Ali', importance:l==='bn'?'আমিরুল মুমিনীনের জন্মপূর্ব রাত — কাবার আলোর রাত':'Eve of the Commander of the Faithful\'s birth — Night of light at the Kaaba'},
        {id:'sn2', icon:'🕯️', color:'#0369a1', type:'special', hijriDate:l==='bn'?'২৭ রজব':'27 Rajab', titleBn:l==='bn'?'শবে মেরাজ — মিরাজের রাত':'Shab-e-Meraj — Night of Ascension', arabicTitle:'ليلة المعراج', descBn:l==='bn'?'২৭ রজব — রাসূলুল্লাহ (সা.) এই রাতে মক্কা থেকে জেরুজালেম (মসজিদুল আকসা) এবং সেখান থেকে সপ্ত আসমান ও সিদরাতুল মুন্তাহা পর্যন্ত মেরাজ করেন। পাঁচ ওয়াক্ত নামাজ এই রাতে ফরজ হয়।':'27 Rajab — On this night the Prophet (PBUH) ascended from Mecca to Jerusalem (Masjid al-Aqsa), then through the seven heavens to Sidrat al-Muntaha. The five daily prayers were made obligatory on this night.', amaal:l==='bn'?'রাতভর ইবাদত, নফল নামাজ, কুরআন তিলাওয়াত, দরুদ পাঠ, দোয়া':'All-night worship, Nafl prayers, Quran recitation, Salawat, Dua', importance:l==='bn'?'নামাজ ফরজ হওয়ার রাত — নবীর মেরাজের রাত':'Night the prayer was made obligatory — Night of the Prophet\'s Ascension'},

        // — শাবান —
        {id:'sn5', icon:'🌺', color:'#be185d', type:'special', hijriDate:l==='bn'?'৩ শাবান':'3 Shaban', titleBn:l==='bn'?'শবে মওলুদে হোসাইন — ইমাম হোসাইনের জন্মরাত':'Night of Husayn\'s Birth — Eve of Imam Husayn\'s Birthday', arabicTitle:'ليلة مولد الحسين بن علي', descBn:l==='bn'?'৩ শাবানের রাত — পরদিন ইমাম হোসাইন (আ.) জন্মগ্রহণ করেন। রাসূলুল্লাহ (সা.) বলেছেন: "হোসাইন আমার থেকে, আমি হোসাইন থেকে।" কারবালার মহানায়কের জন্মের পূর্ব রাত।':'Night of 3 Shaban — the next day Imam Husayn (AS) was born. The Prophet (PBUH) said: "Husayn is from me, and I am from Husayn." The eve before the birth of the hero of Karbala.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম হোসাইন, নামাজ, দান':'Celebration, Salawat, Ziyarat of Imam Husayn, prayer, charity', importance:l==='bn'?'সাইয়্যিদুশ শুহাদার জন্মপূর্ব রাত':'Eve of the birth of the Master of Martyrs'},
        {id:'sn1', icon:'🌙', color:'#7c3aed', type:'special', hijriDate:l==='bn'?'১৫ শাবান':'15 Shaban', titleBn:l==='bn'?'শবে নিমে শাবান (শবে বরাত)':'Shab-e-Nim-e-Shaban (Night of Mid-Shaban)', arabicTitle:'ليلة النصف من شعبان', descBn:l==='bn'?'১৫ শাবানের রাত শিয়া ইসলামে অত্যন্ত মর্যাদাপূর্ণ। এই রাতে ইমাম মাহদি (আ.) জন্মগ্রহণ করেন এবং হাদিস অনুযায়ী এটি বরাত ও মাগফিরাতের রাত। আল্লাহ এই রাতে বান্দাদের রিযিক ও তাকদির নির্ধারণ করেন।':'The night of 15 Shaban is highly significant in Shia Islam. Imam Mahdi (AS) was born on this night and according to hadith it is the night of fate and forgiveness. Allah determines the provisions and destiny of His servants on this night.', amaal:l==='bn'?'দোয়ায়ে কুমাইল, দোয়ায়ে নুদবা, দোয়ায়ে আহদ, সালাওয়াত, নফল নামাজ, ইস্তিগফার':'Dua Kumayl, Dua Nudbah, Dua Ahd, Salawat, Nafl prayer, Istighfar', importance:l==='bn'?'ইমাম মাহদির জন্মরাত — বরাত ও মাগফিরাতের রাত':'Night of Imam Mahdi\'s birth — Night of Fate and Forgiveness'},

        // — রমজান —
        {id:'sn7', icon:'💫', color:'#1e3a8a', type:'special', hijriDate:l==='bn'?'১ রমজান':'1 Ramadan', titleBn:l==='bn'?'শবে রমজান — রমজানের প্রথম রাত':'First Night of Ramadan', arabicTitle:'ليلة أول رمضان', descBn:l==='bn'?'রমজান মাসের প্রথম রাত ইবাদতের মাসের সূচনা। এই রাতে জান্নাতের দরজা খোলা হয়, জাহান্নামের দরজা বন্ধ করা হয় এবং শয়তানকে শৃঙ্খলিত করা হয়। হাদিসে এই রাতে বিশেষ দোয়া পাঠের নির্দেশনা আছে।':'The first night of Ramadan marks the beginning of the month of worship. On this night the gates of Paradise are opened, the gates of Hell are closed and Satan is chained. Hadith gives guidance on special duas to recite on this night.', amaal:l==='bn'?'দোয়ায়ে রমজান, নিয়্যত, তারাবিহ/তাহাজ্জুদ, কুরআন তিলাওয়াত শুরু, ইফতারির প্রস্তুতি':'Dua of Ramadan, Intention, Tarawih/Tahajjud, beginning Quran recitation, preparing for Iftar', importance:l==='bn'?'ইবাদতের মাসের সূচনা — জান্নাতের দরজা উন্মুক্তের রাত':'Beginning of the month of worship — Night the gates of Paradise open'},
        {id:'st7', icon:'⭐', color:'#b45309', type:'special', hijriDate:l==='bn'?'১৯, ২১, ২৩ রমজান':'19, 21, 23 Ramadan', titleBn:l==='bn'?'লাইলাতুল ক্বদর (তিন রাত)':'Laylat al-Qadr (Three Nights)', arabicTitle:'ليلة القدر', descBn:l==='bn'?'১৯ রমজান — ইমাম আলী (আ.) আঘাতপ্রাপ্ত। ২১ রমজান — ইমাম আলী শহীদ। ২৩ রমজান — সর্বোচ্চ সম্ভাব্য ক্বদরের রাত।':'19 Ramadan — Imam Ali (AS) is struck. 21 Ramadan — Imam Ali is martyred. 23 Ramadan — the most probable Night of Qadr.', amaal:l==='bn'?'রাতভর ইবাদত, কুরআন মাথায় রাখা, দোয়ায়ে জওশানে কাবির':'All-night worship, placing the Quran on the head, Dua Jawshan al-Kabir', importance:l==='bn'?'হাজার মাসের চেয়ে উত্তম':'Better than a thousand months'},
        {id:'sn8', icon:'🎇', color:'#dc2626', type:'special', hijriDate:l==='bn'?'২৩ রমজান':'23 Ramadan', titleBn:l==='bn'?'শবে ক্বদর — ২৩ রমজান (সর্বোচ্চ সম্ভাব্য)':'Laylat al-Qadr — 23rd Ramadan (Most Probable)', arabicTitle:'ليلة القدر ٢٣ رمضان', descBn:l==='bn'?'শিয়া হাদিসে ২৩ রমজানকে সবচেয়ে সম্ভাব্য লাইলাতুল ক্বদর বলা হয়েছে। এই রাতে কুরআন নাযিল হয়েছে এবং সকল বিষয়ের ফায়সালা হয়। ফেরেশতারা ও রূহ এই রাতে নাযিল হন।':'Shia hadith designates 23 Ramadan as the most probable Laylat al-Qadr. On this night the Quran was revealed and all matters are decided. The angels and the Spirit descend on this night.', amaal:l==='bn'?'রাতভর ইবাদত, কুরআন মাথায় রেখে দোয়া, দোয়ায়ে জওশানে কাবির, ইস্তিগফার, গোসল':'All-night worship, dua with Quran on head, Dua Jawshan al-Kabir, Istighfar, Ghusl', importance:l==='bn'?'হাজার মাসের চেয়ে উত্তম — তাকদির নির্ধারণের রাত':'Better than a thousand months — Night of destiny'},

        // — জিলহজ —
        {id:'sn9', icon:'🌙', color:'#065f46', type:'special', hijriDate:l==='bn'?'৯ জিলহজ (আরাফার রাত)':'9 Dhu al-Hijjah (Eve of Arafah)', titleBn:l==='bn'?'শবে আরাফা — আরাফার রাত':'Shab-e-Arafah — Night of Arafah', arabicTitle:'ليلة عرفة', descBn:l==='bn'?'আরাফার দিনের পূর্বরাত। হাজীরা মিনায় রাত কাটান এবং ফজরের পর আরাফার ময়দানে যান। এই রাতে ইবাদত ও দোয়ার বিশেষ ফজিলত রয়েছে। ইমাম হোসাইন (আ.) আরাফার দিনের বিখ্যাত দোয়া এই রাতেই রচনা করেছিলেন বলে কথিত।':'The eve before the Day of Arafah. Pilgrims spend the night in Mina and proceed to the plain of Arafah after Fajr. This night holds special merit for worship and dua. Imam Husayn\'s famous Dua of Arafah is associated with this time.', amaal:l==='bn'?'দোয়ায়ে আরাফা (ইমাম হোসাইন), ইস্তিগফার, নফল নামাজ, কুরআন তিলাওয়াত':'Dua Arafah (Imam Husayn), Istighfar, Nafl prayer, Quran recitation', importance:l==='bn'?'হজের সবচেয়ে গুরুত্বপূর্ণ দিনের পূর্বরাত — দোয়া কবুলের শ্রেষ্ঠ সময়':'Eve of the most important day of Hajj — best time for accepted duas'},

        // — বিশেষ / নির্দিষ্ট তারিখ নেই —
        {id:'sn10', icon:'⭐', color:'#1e3a8a', type:'special', hijriDate:l==='bn'?'প্রতি বৃহস্পতিবার রাত (শুক্রবার রাত)':'Every Thursday Night (Laylat al-Jumuah)', titleBn:l==='bn'?'শবে জুমা — জুমার রাত':'Shab-e-Jumah — Night of Friday', arabicTitle:'ليلة الجمعة', descBn:l==='bn'?'প্রতি সপ্তাহে বৃহস্পতিবার রাত (শবে জুমা) শিয়া ইসলামে বিশেষ ইবাদতের রাত। এই রাতে দোয়ায়ে কুমাইল পাঠ করা অত্যন্ত ফজিলতপূর্ণ। ইমাম আলী (আ.) হযরত কুমাইল ইবনে যিয়াদকে এই রাতে এই দোয়া শিখিয়েছিলেন।':'Every Thursday night (Shab-e-Jumah) is a special night of worship in Shia Islam. Reciting Dua Kumayl on this night carries immense merit. Imam Ali (AS) taught this dua to Kumayl ibn Ziyad on such a night.', amaal:l==='bn'?'দোয়ায়ে কুমাইল (সবচেয়ে গুরুত্বপূর্ণ), দোয়ায়ে নুদবা (শুক্রবার সকাল), যিয়ারত ইমাম, সালাওয়াত':'Dua Kumayl (most important), Dua Nudbah (Friday morning), Ziyarat of Imam, Salawat', importance:l==='bn'?'সাপ্তাহিক বিশেষ রাত — দোয়ায়ে কুমাইলের রাত':'Weekly special night — Night of Dua Kumayl'},

        // ── শাহাদাত দিবস (হিজরি মাস অনুযায়ী) ──

        // — মুহাররম —
        {id:'sm3', icon:'🕊️', color:'#0369a1', type:'martyrdom', hijriDate:l==='bn'?'১ মুহাররম বা সফর, ১২২ হি.':'Muharram or Safar, 122 AH', titleBn:l==='bn'?'হযরত যায়দ ইবনে আলী শাহাদাত':'Martyrdom of Zayd ibn Ali', arabicTitle:'شهادة زيد بن علي', descBn:l==='bn'?'১২২ হিজরিতে যায়দ ইবনে আলী হিশাম বিন আব্দুল মালিকের বিরুদ্ধে কুফায় বিদ্রোহ করেন এবং শহীদ হন। ইমাম সাজ্জাদ (আ.)-এর পুত্র। তাঁর নামে যায়দি মাযহাব প্রতিষ্ঠিত হয়।':'In 122 AH, Zayd ibn Ali revolted in Kufa against Hisham ibn Abd al-Malik and was martyred. Son of Imam Sajjad (AS). The Zaydi school of thought is named after him.', amaal:l==='bn'?'শোক পালন, স্মরণ':'Mourning, remembrance', importance:l==='bn'?'ইমাম সাজ্জাদের পুত্রের শাহাদাত — যুলুমের বিরুদ্ধে সংগ্রাম':'Martyrdom of Imam Sajjad\'s son — struggle against oppression'},
        {id:'st10',icon:'🔴', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'১০ মুহাররম':'10 Muharram', titleBn:l==='bn'?'আশুরা — ইমাম হোসাইন (আ.) শাহাদাত':'Ashura — Martyrdom of Imam Husayn (AS)', arabicTitle:'عاشوراء', descBn:l==='bn'?'৬১ হিজরিতে কারবালায় ইমাম হোসাইন (আ.) পরিবার ও ৭২ সঙ্গীসহ শহীদ হন।':'In 61 AH at Karbala, Imam Husayn (AS) was martyred along with his family and 72 companions.', amaal:l==='bn'?'মজলিস, যিয়ারত আশুরা, শোক পালন':'Majlis, Ziyarat Ashura, mourning', importance:l==='bn'?'ইতিহাসের সর্বশ্রেষ্ঠ শাহাদাত':'The greatest martyrdom in history'},
        {id:'st13',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৫ মুহাররম, ৯৫ হি.':'25 Muharram, 95 AH', titleBn:l==='bn'?'ইমাম সাজ্জাদ (আ.) শাহাদাত দিবস':'Martyrdom of Imam Sajjad (AS)', arabicTitle:'شهادة علي بن الحسين زين العابدين', descBn:l==='bn'?'৯৫ হিজরিতে ওয়ালিদ বিন আব্দুল মালিকের নির্দেশে বিষ প্রয়োগে শহীদ হন। কারবালার একমাত্র পুরুষ বেঁচে যাওয়া ইমাম। সাহিফায়ে সাজ্জাদিয়্যার রচয়িতা।':'In 95 AH, martyred by poison on the orders of Walid ibn Abd al-Malik. The only male survivor of Karbala. Author of Sahifa al-Sajjadiyya.', amaal:l==='bn'?'শোক পালন, সাহিফায়ে সাজ্জাদিয়্যা পাঠ':'Mourning, reciting Sahifa al-Sajjadiyya', importance:l==='bn'?'চতুর্থ ইমামের শাহাদাত — ইসলামে দোয়ার মহান শিক্ষক':'Martyrdom of the 4th Imam — the great teacher of dua in Islam'},

        // — সফর —
        {id:'st17',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'১৭ সফর, ২০৩ হি.':'17 Safar, 203 AH', titleBn:l==='bn'?'ইমাম আলী রেযা (আ.) শাহাদাত দিবস':'Martyrdom of Imam Ali al-Ridha (AS)', arabicTitle:'شهادة علي بن موسى الرضا', descBn:l==='bn'?'২০৩ হিজরিতে মামুনুর রশিদের নির্দেশে আঙুরে বিষ প্রয়োগে শহীদ হন। ইরানের মাশহাদে তাঁর পবিত্র মাযার অবস্থিত।':'In 203 AH, martyred by poison in grapes on the orders of Mamun al-Rashid. His holy shrine is located in Mashhad, Iran.', amaal:l==='bn'?'শোক পালন, মাশহাদ যিয়ারত, যিয়ারতুর রেযা':'Mourning, Ziyarat in Mashhad, Ziyarat al-Ridha', importance:l==='bn'?'অষ্টম ইমামের শাহাদাত — আর-রেযা, পরিতুষ্ট':'Martyrdom of the 8th Imam — al-Ridha, the Contented'},
        {id:'st11',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৮ সফর, ১১ হি.':'28 Safar, 11 AH', titleBn:l==='bn'?'রাসূলুল্লাহ (সা.) শাহাদাত দিবস':'Martyrdom of Prophet Muhammad (SAW)', arabicTitle:'وفاة النبي محمد صلى الله عليه وآله', descBn:l==='bn'?'২৮ সফর ১১ হিজরিতে রাসূলুল্লাহ (সা.) মদিনায় শহীদ হন। বিষ প্রয়োগে শাহাদাত বরণ করেন বলে শিয়া মতে বিশ্বাস করা হয়। তাঁর ওফাতের পর আহলে বাইতের উপর জুলুম শুরু হয়।':'On 28 Safar 11 AH, the Prophet Muhammad (SAW) was martyred in Medina. Shia scholars hold that he was poisoned. After his passing, oppression against the Ahlul Bayt began.', amaal:l==='bn'?'শোক পালন, দরুদ পাঠ, যিয়ারতুন নবী':'Mourning, reciting Salawat, Ziyarat al-Nabi', importance:l==='bn'?'সর্বকালের সর্বশ্রেষ্ঠ নবীর বিদায়':'The passing of the greatest Prophet of all time'},
        {id:'st12',icon:'🕊️', color:'#9d174d', type:'martyrdom', hijriDate:l==='bn'?'২৮ সফর, ৫০ হি.':'28 Safar, 50 AH', titleBn:l==='bn'?'ইমাম হাসান (আ.) শাহাদাত দিবস':'Martyrdom of Imam Hasan (AS)', arabicTitle:'شهادة الحسن بن علي', descBn:l==='bn'?'৫০ হিজরিতে ইমাম হাসান (আ.) মুয়াবিয়ার ষড়যন্ত্রে তাঁর স্ত্রী জুয়ায়রিয়ার দেওয়া বিষে শহীদ হন। মদিনায় তাঁকে জান্নাতুল বাকিতে দাফন করা হয়।':'In 50 AH, Imam Hasan (AS) was martyred by poison given by his wife Juayriyah at the instigation of Muawiyah. He was buried in Jannat al-Baqi in Medina.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম হাসান, দোয়া':'Mourning, Ziyarat of Imam Hasan, dua', importance:l==='bn'?'দ্বিতীয় ইমামের শাহাদাত — সন্ধি ও ত্যাগের প্রতীক':'Martyrdom of the 2nd Imam — symbol of patience and sacrifice'},

        // — রবিউল আউয়াল —
        {id:'st20',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৮ রবিউল আউয়াল, ২৬০ হি.':'8 Rabi al-Awwal, 260 AH', titleBn:l==='bn'?'ইমাম হাসান আসকারি (আ.) শাহাদাত দিবস':'Martyrdom of Imam Hasan al-Askari (AS)', arabicTitle:'شهادة الحسن بن علي العسكري', descBn:l==='bn'?'২৬০ হিজরিতে মুতামিদের নির্দেশে বিষ প্রয়োগে শহীদ হন। মাত্র ২৮ বছর বয়সে শহীদ হন। ইমাম মাহদি (আ.)-এর পিতা।':'In 260 AH, martyred by poison on the orders of al-Mutamid. Martyred at only 28 years of age. He is the father of Imam Mahdi (AS).', amaal:l==='bn'?'শোক পালন, সামারা যিয়ারত, যিয়ারত ইমাম আসকারি':'Mourning, Ziyarat in Samarra, Ziyarat of Imam Askari', importance:l==='bn'?'একাদশ ইমামের শাহাদাত — ইমাম মাহদির পিতা':'Martyrdom of the 11th Imam — father of Imam Mahdi'},

        // — জামাদিউস সানি —
        {id:'st9', icon:'🌹', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৩ জামাদিউস সানি':'3 Jumada al-Thani', titleBn:l==='bn'?'হযরত ফাতেমা যাহরা (আ.) শাহাদাত':'Martyrdom of Lady Fatima al-Zahra (AS)', arabicTitle:'شهادة فاطمة الزهراء', descBn:l==='bn'?'রাসূলুল্লাহ (সা.)-এর ওফাতের মাত্র ৭৫-৯৫ দিন পর শহীদ হন।':'She was martyred only 75–95 days after the passing of the Prophet (PBUH).', amaal:l==='bn'?'শোক পালন, ফাতেমার যিয়ারত':'Mourning, reciting Fatima\'s Ziyarat', importance:l==='bn'?'ইসলামের শ্রেষ্ঠ নারীর শাহাদাত':'Martyrdom of the greatest woman in Islam'},

        // — রজব —
        {id:'st19',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৩ রজব, ২৫৪ হি.':'3 Rajab, 254 AH', titleBn:l==='bn'?'ইমাম আলী হাদি (আ.) শাহাদাত দিবস':'Martyrdom of Imam Ali al-Hadi (AS)', arabicTitle:'شهادة علي بن محمد الهادي', descBn:l==='bn'?'২৫৪ হিজরিতে মুতাযের নির্দেশে বিষ প্রয়োগে শহীদ হন। দীর্ঘ গৃহবন্দিত্বেও সামারা থেকে উম্মাহকে পথ দেখিয়েছেন।':'In 254 AH, martyred by poison on the orders of al-Mutazz. He guided the Ummah even through long house arrest in Samarra.', amaal:l==='bn'?'শোক পালন, সামারা যিয়ারত, যিয়ারত ইমাম হাদি':'Mourning, Ziyarat in Samarra, Ziyarat of Imam Hadi', importance:l==='bn'?'দশম ইমামের শাহাদাত — আন-নাকি, পবিত্র':'Martyrdom of the 10th Imam — al-Naqi, the Pure'},
        {id:'st16',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৫ রজব, ১৮৩ হি.':'25 Rajab, 183 AH', titleBn:l==='bn'?'ইমাম মুসা কাযিম (আ.) শাহাদাত দিবস':'Martyrdom of Imam Musa al-Kazim (AS)', arabicTitle:'شهادة موسى بن جعفر الكاظم', descBn:l==='bn'?'১৮৩ হিজরিতে হারুনুর রশিদের নির্দেশে বাগদাদের কারাগারে বিষ প্রয়োগে শহীদ হন। দীর্ঘ কারাবাসেও ইবাদতে মগ্ন থাকতেন।':'In 183 AH, martyred by poison in a Baghdad prison on the orders of Harun al-Rashid. He remained devoted to worship even through long imprisonment.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম কাযিম, কাযিমাইনে যিয়ারত':'Mourning, Ziyarat of Imam Kazim, visiting Kazimayn', importance:l==='bn'?'সপ্তম ইমামের শাহাদাত — আল-কাযিম, রাগ সংবরণকারী':'Martyrdom of the 7th Imam — al-Kazim, the Restrainer of Anger'},

        // — রমজান —
        {id:'st8', icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২১ রমজান':'21 Ramadan', titleBn:l==='bn'?'ইমাম আলী (আ.) শাহাদাত':'Martyrdom of Imam Ali (AS)', arabicTitle:'شهادة علي بن أبي طالب', descBn:l==='bn'?'২১ রমজান — ইমাম আলী (আ.) শহীদ হন।':'21 Ramadan — Imam Ali (AS) is martyred.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম আলী, দোয়ায়ে কুমাইল':'Mourning, Ziyarat of Imam Ali, Dua Kumayl', importance:l==='bn'?'প্রথম ইমামের শাহাদাত ও ক্বদরের রাত':'Martyrdom of the First Imam and the Night of Qadr'},

        // — শাওয়াল —
        {id:'st15',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৫ শাওয়াল, ১৪৮ হি.':'25 Shawwal, 148 AH', titleBn:l==='bn'?'ইমাম সাদিক (আ.) শাহাদাত দিবস':'Martyrdom of Imam Jafar al-Sadiq (AS)', arabicTitle:'شهادة جعفر بن محمد الصادق', descBn:l==='bn'?'১৪৮ হিজরিতে মনসুর দাওয়ানিকির নির্দেশে বিষ প্রয়োগে শহীদ হন। জাফরি মাযহাবের প্রতিষ্ঠাতা। তাঁর হাজারো ছাত্র ছিলেন।':'In 148 AH, martyred by poison on the orders of Mansur al-Dawaniqi. Founder of the Jafari school. He had thousands of students.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম সাদিক':'Mourning, Ziyarat of Imam Sadiq', importance:l==='bn'?'ষষ্ঠ ইমামের শাহাদাত — জাফরি মাযহাবের ইমাম':'Martyrdom of the 6th Imam — Founder of Jafari school'},

        // — যিলকদ —
        {id:'st18',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৩ যিলকদ, ২২০ হি.':'23 Dhu al-Qadah, 220 AH', titleBn:l==='bn'?'ইমাম মুহাম্মদ জওয়াদ (আ.) শাহাদাত দিবস':'Martyrdom of Imam Muhammad al-Jawad (AS)', arabicTitle:'شهادة محمد بن علي الجواد', descBn:l==='bn'?'২২০ হিজরিতে মুতাসিমের নির্দেশে তাঁর স্ত্রী উম্মুল ফযলের দেওয়া বিষে শহীদ হন। মাত্র ৯ বছর বয়সে ইমামতের দায়িত্ব পেয়েছিলেন।':'In 220 AH, martyred by poison given by his wife Umm al-Fadl on the orders of al-Mutasim. He assumed Imamate at just 9 years of age.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম জওয়াদ, কাযিমাইনে যিয়ারত':'Mourning, Ziyarat of Imam Jawad, visiting Kazimayn', importance:l==='bn'?'নবম ইমামের শাহাদাত — আত-তাকি, পরহেজগার':'Martyrdom of the 9th Imam — al-Taqi, the Pious'},

        // — জিলহজ —
        {id:'st14',icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৭ যিলহজ্ব, ১১৪ হি.':'7 Dhu al-Hijjah, 114 AH', titleBn:l==='bn'?'ইমাম বাকির (আ.) শাহাদাত দিবস':'Martyrdom of Imam Muhammad al-Baqir (AS)', arabicTitle:'شهادة محمد بن علي الباقر', descBn:l==='bn'?'১১৪ হিজরিতে হিশাম বিন আব্দুল মালিকের নির্দেশে বিষ প্রয়োগে শহীদ হন। ইমাম বাকির ইসলামি জ্ঞান ও ফিকহে যুগান্তকারী অবদান রাখেন।':'In 114 AH, martyred by poison on the orders of Hisham ibn Abd al-Malik. Imam Baqir made epoch-making contributions to Islamic knowledge and jurisprudence.', amaal:l==='bn'?'শোক পালন, ইলম অর্জন, যিয়ারত ইমাম বাকির':'Mourning, seeking knowledge, Ziyarat of Imam Baqir', importance:l==='bn'?'পঞ্চম ইমামের শাহাদাত — বাকিরুল উলুম':'Martyrdom of the 5th Imam — Splitter of Knowledge'},
        {id:'sm1', icon:'🕊️', color:'#7c3aed', type:'martyrdom', hijriDate:l==='bn'?'৯ জিলহজ, ৬০ হি.':'9 Dhu al-Hijjah, 60 AH', titleBn:l==='bn'?'হযরত মুসলিম ইবনে আকিল শাহাদাত':'Martyrdom of Muslim ibn Aqil (AS)', arabicTitle:'شهادة مسلم بن عقيل', descBn:l==='bn'?'৬০ হিজরিতে ইমাম হোসাইনের দূত মুসলিম ইবনে আকিল কুফায় ইবনে যিয়াদের নির্দেশে শহীদ হন। তিনি ইমামের পক্ষে বাইয়াত নেওয়ার জন্য কুফায় গিয়েছিলেন। তাঁর সাথে হানি ইবনে উরওয়াও শহীদ হন।':'In 60 AH, Muslim ibn Aqil, the envoy of Imam Husayn, was martyred in Kufa on the orders of Ibn Ziyad. He had gone to Kufa to take pledges of allegiance on behalf of the Imam. Hani ibn Urwa was also martyred alongside him.', amaal:l==='bn'?'শোক পালন, মুসলিম ইবনে আকিলের যিয়ারত, কুফায় যিয়ারত':'Mourning, Ziyarat of Muslim ibn Aqil, visiting Kufa', importance:l==='bn'?'ইমামের বিশ্বস্ত দূতের শাহাদাত — কারবালার পটভূমি':'Martyrdom of the Imam\'s trusted envoy — prelude to Karbala'},
        {id:'sm2', icon:'🕊️', color:'#7c3aed', type:'martyrdom', hijriDate:l==='bn'?'৯ জিলহজ, ৬০ হি.':'9 Dhu al-Hijjah, 60 AH', titleBn:l==='bn'?'হযরত হানি ইবনে উরওয়া শাহাদাত':'Martyrdom of Hani ibn Urwa', arabicTitle:'شهادة هاني بن عروة', descBn:l==='bn'?'৬০ হিজরিতে কুফার বিশিষ্ট নেতা হানি ইবনে উরওয়া মুসলিম ইবনে আকিলকে আশ্রয় দেওয়ার কারণে ইবনে যিয়াদের নির্দেশে শহীদ হন। শিয়াদের শ্রদ্ধেয় ব্যক্তিত্ব।':'In 60 AH, Hani ibn Urwa, a prominent leader of Kufa, was martyred on the orders of Ibn Ziyad for sheltering Muslim ibn Aqil. A revered figure among the Shia.', amaal:l==='bn'?'শোক পালন, যিয়ারত, কুফায় স্মরণ':'Mourning, Ziyarat, remembrance in Kufa', importance:l==='bn'?'কুফার বিশ্বস্ত সমর্থকের শাহাদাত':'Martyrdom of a loyal supporter in Kufa'},
    ];
    const allDays = [...staticDays, ...state.shiaSpecialDays];

    const isStatic = id => id && id.startsWith('st');

    // ── Card HTML ────────────────────────────────────────────────────
    const cardHtml = items => items.length===0
        ? `<p class="text-sm ${d?'text-gray-500':'text-gray-400'} text-center py-6">${l==='bn'?'কোনো তথ্য নেই':'No entries yet'}</p>`
        : items.map(item=>`
    <article class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl overflow-hidden card-hover" style="border-top:3px solid ${item.color||'#059669'}">
        <div class="p-5">
            <div class="flex items-start gap-3 mb-3">
                <span style="width:36px;height:36px;border-radius:10px;background:${item.color||'#059669'}18;display:inline-flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${item.icon||'✨'}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5 mb-1">
                        <span class="text-xs ${d?'text-gray-400':'text-gray-500'}">📅 ${sanitize(item.hijriDate||'')}</span>
                    </div>
                    <h3 class="font-bold text-base leading-snug">${sanitize(item.titleBn||'')}</h3>
                    ${item.arabicTitle?`<p class="arabic-text text-right text-sm mt-0.5" dir="rtl" style="color:#9ca3af">${sanitize(item.arabicTitle)}</p>`:''}
                </div>
                ${state.isAdmin && !isStatic(item.id)?`
                <div class="flex gap-1 flex-shrink-0">
                    <button data-action="openShiaDayEditor" data-param="${item.id}" class="text-xs px-2 py-1 rounded-lg ${d?'bg-gray-700 text-gray-300':'bg-gray-100 text-gray-600'} hover:opacity-80">✏️</button>
                    <button data-action="deleteShiaDay" data-param="${item.id}" class="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">🗑️</button>
                </div>`:''}
            </div>
            <p class="text-sm ${d?'text-gray-300':'text-gray-700'} leading-relaxed mb-3">${sanitize(item.descBn||'')}</p>
            ${item.amaal?`<div class="${d?'bg-gray-900 border-gray-700':'bg-emerald-50 border-emerald-100'} border rounded-xl p-3 mb-2">
                <p class="text-xs font-bold mb-1" style="color:#059669">${l==='bn'?'📿 বিশেষ আমল':'📿 Special Practices'}</p>
                <p class="text-xs ${d?'text-gray-300':'text-gray-700'}">${sanitize(item.amaal)}</p>
            </div>`:''}
            ${item.importance?`<div class="${d?'bg-amber-950 border-amber-900':'bg-amber-50 border-amber-200'} border rounded-xl p-3">
                <p class="text-xs font-bold mb-1" style="color:#b45309">${l==='bn'?'✨ গুরুত্ব':'✨ Significance'}</p>
                <p class="text-xs ${d?'text-amber-200':'text-amber-800'}">${sanitize(item.importance)}</p>
            </div>`:''}
        </div>
    </article>`).join('');

    const eids       = allDays.filter(x=>x.type==='eid');
    const specials   = allDays.filter(x=>x.type==='special');
    const martyrdoms = allDays.filter(x=>x.type==='martyrdom');

    // ── Accordion folder builder ─────────────────────────────────────
    const folder = (folderId, icon, gradient, label, count, colorAccent, items) => `
    <div class="rounded-2xl overflow-hidden border ${d?'border-gray-700':'border-gray-200'} mb-4">
        <button onclick="(function(){var c=document.getElementById('folder-${folderId}');var a=document.getElementById('arrow-${folderId}');var open=c.style.display==='none'||c.style.display==='';c.style.display=open?'block':'none';a.style.transform=open?'rotate(90deg)':'rotate(0deg)';})()" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px 20px;background:${d?'rgba(255,255,255,.04)':'rgba(0,0,0,.02)'};cursor:pointer;border:none;text-align:left">
            <span style="width:42px;height:42px;border-radius:12px;background:${gradient};display:inline-flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">${icon}</span>
            <div class="flex-1">
                <div class="font-bold text-base ${d?'text-white':'text-gray-900'}">${label}</div>
                <div class="text-xs ${d?'text-gray-400':'text-gray-500'} mt-0.5">${count} ${l==='bn'?'টি দিন':'entries'}</div>
            </div>
            <span id="arrow-${folderId}" style="font-size:1.1rem;color:${colorAccent};transition:transform .25s;display:inline-block">▶</span>
        </button>
        <div id="folder-${folderId}" style="display:none;padding:16px;background:${d?'rgba(255,255,255,.02)':'rgba(0,0,0,.01)'}">
            <div class="grid md:grid-cols-2 gap-4">${cardHtml(items)}</div>
        </div>
    </div>`;

    return `<div class="space-y-6 page-enter">
        <button data-action="changePage" data-param="home" class="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all" style="background:${d?'rgba(5,150,105,.15)':'rgba(5,150,105,.08)'};color:#059669">← ${l==='bn'?'হোমে ফিরুন':'Back to Home'}</button>

        <!-- Hero -->
        <div class="relative overflow-hidden rounded-3xl text-center" style="background:linear-gradient(135deg,#064e3b,#065f46,#1e3a8a);padding:2rem;box-shadow:0 8px 32px rgba(5,150,105,.3)">
            <div style="font-size:2.5rem;margin-bottom:.5rem">✨🌙⭐</div>
            <h2 style="font-size:1.8rem;font-weight:900;color:white">${l==='bn'?'বিশেষ দিনসমূহ':'Special Days'}</h2>
            <p style="color:rgba(255,255,255,.8);font-size:.9rem;margin-top:.25rem">${l==='bn'?'ঈদে গাদির · মুবাহিলা · শবে ক্বদর · নিমে শাবান · ইমামদের জন্ম-শাহাদাত':'Eid al-Ghadeer · Mubahala · Laylat al-Qadr · Mid-Shaban · Imams\' Birth & Martyrdom'}</p>
        </div>

        ${state.isAdmin?`
        <div class="flex justify-end">
            <button data-action="openShiaDayEditor" class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style="background:linear-gradient(135deg,#059669,#065f46)">＋ ${l==='bn'?'নতুন বিশেষ দিন যোগ করুন':'Add New Special Day'}</button>
        </div>`:''}

        <!-- Folders -->
        ${folder('eid',   '🎉', 'linear-gradient(135deg,#059669,#065f46)', l==='bn'?'ঈদ ও আনন্দময় দিন':'Eids & Celebrations', eids.length,      '#059669', eids)}
        ${folder('night', '⭐', 'linear-gradient(135deg,#b45309,#92400e)', l==='bn'?'বিশেষ রাত':'Special Nights',          specials.length,   '#b45309', specials)}
        ${folder('mart',  '🕊️', 'linear-gradient(135deg,#dc2626,#991b1b)', l==='bn'?'শাহাদাত দিবস':'Days of Martyrdom',     martyrdoms.length, '#dc2626', martyrdoms)}
    </div>`;
}

console.log('✅ ফিচার লোড: মুহাররম, বিশেষ দিনসমূহ CRUD সহ');

// ============ FAMILY TREE PAGE RENDERER ============

function renderFamilyTreePage() {
  const d = state.darkMode; const l = state.language;

  // Bug #12 fix: familyTreeDatabase lives in family-tree-data.js which may not
  // have loaded yet (slow network, load-order issue). Crashing here with
  // "Cannot read property 'prophet' of undefined" takes down the whole page.
  if (typeof familyTreeDatabase === 'undefined' || !familyTreeDatabase) {
    return `<div class="space-y-6 page-enter">
      <h2 class="text-3xl font-black" style="color:${d?'#f9fafb':'#111827'}">🌳 ${l==='bn'?'আহলুল বাইত বংশধারা':'Ahl al-Bayt Family Tree'}</h2>
      <p style="color:${d?'#9ca3af':'#6b7280'}">${l==='bn'?'ডেটা লোড হচ্ছে... একটু অপেক্ষা করুন।':'Loading data… please wait.'}</p>
    </div>`;
  }

  const p = familyTreeDatabase.prophet;

  // Populate the imams grid + wire up modal after the markup is inserted into the DOM
  setTimeout(() => {
    if (typeof initFamilyTree === 'function') {
      initFamilyTree();
    }
  }, 0);

  return `
  <div class="space-y-6 page-enter">
    <div>
        <h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🌳 ${l==='bn'?'আহলুল বাইত বংশধারা':'Ahl al-Bayt Family Tree'}</h2>
        <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'নবী মুহাম্মদ (সা) থেকে ১২ ইমাম পর্যন্ত':'From Prophet Muhammad (PBUH) to the 12 Imams'}</p>
    </div>

    <div class="family-tree-container">
      <!-- Prophet Card -->
      <div class="prophet-card" onclick="showPersonDetail('prophet')">
        <div class="card-badge">${l==='bn'?'প্রথম জ্যোতি':'First Generation'}</div>
        <div class="card-name">${p.arabicName}</div>
        <div class="card-bengali">${l==='bn'?p.bengaliName:(p.englishAbbr||p.englishName)}</div>
      </div>

      <div class="hierarchy-divider"><div class="tree-stem"></div><div class="tree-node"></div><div class="tree-stem"></div></div>

      <!-- Fatima Zahra: genealogical bridge -->
      <div class="fatima-card" onclick="showPersonDetail('fatima')">
        <div class="fatima-role">${l==='bn'?'সংযোগসূত্র · নবীর কন্যা':'The Bridge · Daughter of the Prophet'}</div>
        <div class="fatima-arabic">${familyTreeDatabase.fatima.arabicName}</div>
        <div class="fatima-bengali">${l==='bn'?familyTreeDatabase.fatima.bengaliName:(familyTreeDatabase.fatima.englishAbbr||familyTreeDatabase.fatima.englishName)}</div>
      </div>

      <div class="hierarchy-divider"><div class="tree-stem"></div><div class="tree-node"></div><div class="tree-stem"></div></div>

      <!-- Founding generation: Ali, Hasan, Husain -->
      <div class="tree-section-label">${l==='bn'?'প্রতিষ্ঠাতা প্রজন্ম':'Founding generation'}</div>
      <div class="imams-grid founding-grid" id="founding-imams-container"></div>

      <div class="tree-section-label">${l==='bn'?'ইমামতের ধারা — ৪র্থ থেকে ১১তম':'The lineage — 4th to 11th'}</div>
      <div class="imams-grid lineage-grid" id="lineage-imams-container"></div>

      <!-- 12th Imam: awaited -->
      <div class="mahdi-wrap" id="mahdi-imam-container"></div>
    </div>

    <!-- Detail Modal -->
    <div id="person-detail-modal" class="modal hidden">
      <div class="modal-backdrop" onclick="closePersonDetail()"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="closePersonDetail()">✕</button>
        <div id="modal-body"></div>
      </div>
    </div>
  </div>`;
}

// ============ FAMILY TREE FUNCTIONS ============

// English ordinal helper (1 -> 1st, 2 -> 2nd, 3 -> 3rd, 4 -> 4th, ...)
function ordinalEn(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function renderFamilyTree() {
  const foundingContainer = document.getElementById('founding-imams-container');
  const lineageContainer = document.getElementById('lineage-imams-container');
  const mahdiContainer = document.getElementById('mahdi-imam-container');
  if (!foundingContainer || !lineageContainer || !mahdiContainer || !familyTreeDatabase) return;
  const l = state.language;

  const cardMarkup = (imam, tierClass) => {
    const orderLabel = l === 'bn' ? `${imam.order} ইমাম` : `${ordinalEn(imam.id)} Imam`;
    const nameLabel = l === 'bn' ? imam.bengaliName : `Imam ${imam.englishAbbr || imam.englishName}`;
    return `
    <button class="imam-card ${tierClass}" onclick="showPersonDetail('${imam.id}')">
      <div class="imam-order">${orderLabel}</div>
      <div class="imam-bengali">${nameLabel}</div>
      <div class="imam-arabic">${imam.arabicName}</div>
      ${tierClass === 'tier-mahdi' ? `<div class="mahdi-tag">${l==='bn'?'অপেক্ষিত · গায়বাতে কুবরা':'Awaited · in occultation'}</div>` : ''}
    </button>
  `;
  };

  const founding = familyTreeDatabase.imams.filter(i => i.id >= 1 && i.id <= 3);
  const lineage = familyTreeDatabase.imams.filter(i => i.id >= 4 && i.id <= 11);
  const mahdi = familyTreeDatabase.imams.find(i => i.id === 12);

  foundingContainer.innerHTML = founding.map(imam => cardMarkup(imam, 'tier-founding')).join('');
  lineageContainer.innerHTML = lineage.map(imam => cardMarkup(imam, 'tier-lineage')).join('');
  mahdiContainer.innerHTML = mahdi ? cardMarkup(mahdi, 'tier-mahdi') : '';
}

function showPersonDetail(personId) {
  const modal = document.getElementById('person-detail-modal');
  const modalBody = document.getElementById('modal-body');
  const l = state.language;
  
  let person;
  if (personId === 'prophet') {
    person = familyTreeDatabase.prophet;
  } else if (personId === 'fatima') {
    person = familyTreeDatabase.fatima;
  } else {
    person = familyTreeDatabase.imams.find(i => i.id === parseInt(personId));
  }
  
  if (!person) return;
  
  const L = l === 'bn' ? {
    birth:'জন্ম', death:'মৃত্যু', reign:'মেয়াদ', place:'স্থান',
    parents:'পিতামাতা', spouse:'পত্নী', children:'সন্তান',
    significance:'গুরুত্ব', causeOfDeath:'মৃত্যু কারণ', shrine:'মাজার',
    knowledgeFields:'জ্ঞান ক্ষেত্র', students:'শিক্ষার্থী'
  } : {
    birth:'Birth', death:'Death', reign:'Imamate Period', place:'Place',
    parents:'Parents', spouse:'Spouse', children:'Children',
    significance:'Significance', causeOfDeath:'Cause of Death', shrine:'Shrine',
    knowledgeFields:'Fields of Knowledge', students:'Students'
  };
  
  const displayName = l === 'bn' ? person.bengaliName : (person.englishName || person.englishAbbr || person.bengaliName);
  const avatarLabel = l === 'bn' ? (person.order || '✧') : (person.id ? person.id : '✧');
  
  const html = `
    <div class="modal-header">
      <div class="modal-avatar" style="background-color: ${person.color || '#3B82F6'}; color: ${person.textColor || '#FFFFFF'};">
        ${avatarLabel}
      </div>
      <div class="modal-titles">
        <h2>${displayName}</h2>
        <p>${person.arabicName}</p>
      </div>
    </div>
    
    ${person.description ? `<p class="description-text">${person.description}</p>` : ''}
    
    <div class="info-grid">
      ${person.birth ? `
        <div class="info-box">
          <div class="info-label">${L.birth}</div>
          <div class="info-value">${person.birth}</div>
        </div>
      ` : ''}
      ${person.death ? `
        <div class="info-box">
          <div class="info-label">${L.death}</div>
          <div class="info-value">${person.death}</div>
        </div>
      ` : ''}
      ${person.reignYears ? `
        <div class="info-box">
          <div class="info-label">${L.reign}</div>
          <div class="info-value">${person.reignYears}</div>
        </div>
      ` : ''}
      ${person.deathPlace ? `
        <div class="info-box">
          <div class="info-label">${L.place}</div>
          <div class="info-value">${person.deathPlace}</div>
        </div>
      ` : ''}
    </div>
    
    ${person.features ? `
      <div class="features-list">
        ${person.features.map(f => `<span class="feature-badge">${f}</span>`).join('')}
      </div>
    ` : ''}
    
    ${person.parents ? `<p class="description-text"><strong>${L.parents}:</strong> ${person.parents}</p>` : ''}
    ${person.spouse ? `<p class="description-text"><strong>${L.spouse}:</strong> ${Array.isArray(person.spouse) ? person.spouse.join(', ') : person.spouse}</p>` : ''}
    ${person.children ? `<p class="description-text"><strong>${L.children}:</strong> ${Array.isArray(person.children) ? person.children.join(', ') : person.children}</p>` : ''}
    ${person.significance ? `<p class="description-text"><strong>${L.significance}:</strong> ${person.significance}</p>` : ''}
    ${person.causeOfDeath ? `<p class="description-text"><strong>${L.causeOfDeath}:</strong> ${person.causeOfDeath}</p>` : ''}
    ${person.shrine ? `<p class="description-text"><strong>${L.shrine}:</strong> ${person.shrine}</p>` : ''}
    ${person.knowledgeFields ? `<p class="description-text"><strong>${L.knowledgeFields}:</strong> ${person.knowledgeFields}</p>` : ''}
    ${person.students ? `<p class="description-text"><strong>${L.students}:</strong> ${person.students}</p>` : ''}
  `;
  
  modalBody.innerHTML = html;
  modal.classList.remove('hidden');
}

function closePersonDetail() {
  const modal = document.getElementById('person-detail-modal');
  modal.classList.add('hidden');
}

function initFamilyTree() {
  renderFamilyTree();
}

console.log('✅ Family Tree Functions Loaded');
