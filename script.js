// ── Cloudinary Config ─────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME    = window.CLOUDINARY_CLOUD_NAME    || "ahlalbayt";
const CLOUDINARY_UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || "ahlalbayt_upload";
window.CLOUDINARY_CLOUD_NAME    = CLOUDINARY_CLOUD_NAME;
window.CLOUDINARY_UPLOAD_PRESET = CLOUDINARY_UPLOAD_PRESET;

/**
 * Cloudinary-তে ফাইল আপলোড করো (simple)
 * @param {string}   folder  - Cloudinary folder (যেমন "articles")
 * @param {File|Blob} file
 * @returns {Promise<string>} secure_url
 */
window.storageUpload = async function(folder, file) {
    try {
        const mime = file.type || '';
        let resourceType = 'raw';
        if (mime.startsWith('image/')) resourceType = 'image';
        else if (mime.startsWith('video/')) resourceType = 'video';
        else if (mime.startsWith('audio/')) resourceType = 'video'; // audio uses video resource type

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", folder);

        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
            { method: "POST", body: formData }
        );
        if (!res.ok) throw new Error("Cloudinary upload failed: " + res.statusText);
        const data = await res.json();
        console.log(`[Cloudinary] Uploaded → ${data.public_id}`);
        return data.secure_url;
    } catch (e) {
        console.error("[Cloudinary] upload error:", e);
        throw e;
    }
};

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
        else if (mime.startsWith('audio/')) resourceType = 'video'; // audio uses video resource type

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

/**
 * Cloudinary public_id থেকে CDN URL তৈরি করো
 * @param {string} publicId
 * @param {object} [transforms]  - যেমন { width: 800, quality: "auto" }
 * @returns {string}
 */
window.storageGetURL = function(publicId, transforms = {}) {
    const t = Object.entries(transforms).map(([k, v]) => `${k}_${v}`).join(',');
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${t ? t + '/' : ''}${publicId}`;
};

console.log("✅ Cloudinary সফলভাবে যুক্ত হয়েছে — Cloud:", CLOUDINARY_CLOUD_NAME);

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
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
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
    showUploadModal: false,
    uploadType: null,
    uploadProgress: 0,
    isUploading: false,
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
    // custom dua / ziyarat editor
    showDuaEditor: false,
    editingDua: null,
    duaEditorType: 'dua', // 'dua' | 'ziyarat'
    customDuas: [],
    customZiyarat: [],
    // dua tab & ziyarat reader
    duaTab: 'dua',
    currentZiyarat: null,
    // hadith of day index
    hadithIndex: 0,
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
    {textBn:'নিশ্চয়ই আল্লাহ সুন্দর, তিনি সৌন্দর্যকে ভালোবাসেন।',textEn:'Indeed Allah is beautiful and He loves beauty.',sourceBn:'সহিহ মুসলিম',sourceEn:'Sahih Muslim'},
    {textBn:'তোমাদের মধ্যে সেই ব্যক্তি সর্বোত্তম যে নিজের পরিবারের কাছে সর্বোত্তম।',textEn:'The best of you is the one who is best to his family.',sourceBn:'তিরমিযি',sourceEn:'Tirmidhi'},
    {textBn:'জ্ঞান অর্জন করা প্রতিটি মুসলমানের উপর ফরজ।',textEn:'Seeking knowledge is an obligation upon every Muslim.',sourceBn:'ইবনে মাজাহ',sourceEn:'Ibn Majah'},
    {textBn:'মুসলমান সেই ব্যক্তি যার হাত ও মুখ থেকে অন্য মুসলমান নিরাপদ।',textEn:'A Muslim is one from whose tongue and hand other Muslims are safe.',sourceBn:'সহিহ বুখারি',sourceEn:'Sahih Bukhari'},
    {textBn:'দুনিয়া মুমিনের জন্য কারাগার আর কাফেরের জন্য জান্নাত।',textEn:'The world is a prison for the believer and a paradise for the disbeliever.',sourceBn:'সহিহ মুসলিম',sourceEn:'Sahih Muslim'},
    {textBn:'যে ব্যক্তি আল্লাহর উপর ভরসা করে, আল্লাহ তার জন্য যথেষ্ট।',textEn:'Whoever relies upon Allah, He will be sufficient for him.',sourceBn:'তিরমিযি',sourceEn:'Tirmidhi'},
    {textBn:'প্রতিটি ভালো কাজই সদকা।',textEn:'Every act of kindness is charity.',sourceBn:'সহিহ বুখারি',sourceEn:'Sahih Bukhari'},
    {textBn:'নিজের জন্য যা পছন্দ করো, অন্যের জন্যও তা পছন্দ করো।',textEn:'Love for others what you love for yourself.',sourceBn:'সহিহ বুখারি',sourceEn:'Sahih Bukhari'},
    {textBn:'রাগান্বিত অবস্থায় কোনো সিদ্ধান্ত নিও না।',textEn:'Do not make decisions when you are angry.',sourceBn:'আহমদ',sourceEn:'Ahmad'},
    {textBn:'সর্বোত্তম যিকির হলো লা ইলাহা ইল্লাল্লাহ।',textEn:'The best remembrance is La ilaha illa Allah.',sourceBn:'তিরমিযি',sourceEn:'Tirmidhi'},
];

const quizQuestions = [
    {qBn:'ইমাম হোসাইন (আ.) কোথায় শহীদ হন?',qEn:'Where was Imam Hussain (AS) martyred?',options:[{bn:'মদিনা',en:'Medina'},{bn:'কারবালা',en:'Karbala'},{bn:'মক্কা',en:'Mecca'},{bn:'কুফা',en:'Kufa'}],correct:1},
    {qBn:'কুরআনে মোট কয়টি সূরা আছে?',qEn:'How many Surahs are in the Quran?',options:[{bn:'১১৪',en:'114'},{bn:'১২০',en:'120'},{bn:'১১০',en:'110'},{bn:'১০০',en:'100'}],correct:0},
    {qBn:'আহলে বাইতের ইমামের সংখ্যা কত?',qEn:'How many Imams are there in Ahl al-Bayt?',options:[{bn:'১০',en:'10'},{bn:'১১',en:'11'},{bn:'১২',en:'12'},{bn:'১৩',en:'13'}],correct:2},
    {qBn:'দোয়ায়ে কুমাইল কে শিক্ষা দেন?',qEn:'Who taught Dua Kumayl?',options:[{bn:'ইমাম হোসাইন (আ.)',en:'Imam Hussain (AS)'},{bn:'ইমাম আলী (আ.)',en:'Imam Ali (AS)'},{bn:'ইমাম সাজ্জাদ (আ.)',en:'Imam Sajjad (AS)'},{bn:'ইমাম সাদিক (আ.)',en:'Imam Sadiq (AS)'}],correct:1},
    {qBn:'আশুরা কোন তারিখে পালিত হয়?',qEn:'On what date is Ashura observed?',options:[{bn:'১ মহররম',en:'1 Muharram'},{bn:'৫ মহররম',en:'5 Muharram'},{bn:'১০ মহররম',en:'10 Muharram'},{bn:'১৫ মহররম',en:'15 Muharram'}],correct:2},
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
    {arabic:'إِنَّ مَعَ الْعُسْرِ يُسْرًا',ref:'সূরা ইনশিরাহ: ৬',refEn:'Surah Inshirah: 6',meaningBn:'নিশ্চয়ই কষ্টের সাথে রয়েছে সহজ।',meaningEn:'Indeed, with hardship comes ease.'},
    {arabic:'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',ref:'সূরা ত্বালাক: ৩',refEn:'Surah Talaq: 3',meaningBn:'যে আল্লাহর উপর ভরসা করে, তার জন্য আল্লাহই যথেষ্ট।',meaningEn:'Whoever relies upon Allah — then He is sufficient for him.'},
    {arabic:'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ',ref:'সূরা ইউসুফ: ৮৭',refEn:'Surah Yusuf: 87',meaningBn:'এবং আল্লাহর রহমত থেকে নিরাশ হয়ো না।',meaningEn:'Do not despair of the mercy of Allah.'},
    {arabic:'فَاذْكُرُونِي أَذْكُرْكُمْ',ref:'সূরা বাকারা: ১৫২',refEn:'Surah Baqarah: 152',meaningBn:'সুতরাং আমাকে স্মরণ করো, আমি তোমাদের স্মরণ করব।',meaningEn:'Remember Me, and I will remember you.'},
    {arabic:'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',ref:'সূরা বাকারা: ১৫৩',refEn:'Surah Baqarah: 153',meaningBn:'নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সাথে আছেন।',meaningEn:'Indeed, Allah is with the patient.'},
    {arabic:'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ',ref:'সূরা হাদীদ: ৪',refEn:'Surah Hadid: 4',meaningBn:'এবং তোমরা যেখানেই থাকো, তিনি তোমাদের সাথে আছেন।',meaningEn:'And He is with you wherever you are.'},
    {arabic:'قُلْ هُوَ اللَّهُ أَحَدٌ',ref:'সূরা ইখলাস: ১',refEn:'Surah Ikhlas: 1',meaningBn:'বলুন, তিনি আল্লাহ, এক।',meaningEn:'Say: He is Allah, the One.'},
];
function getDailyAyah() {
    const pool = (state.customAyahs && state.customAyahs.length > 0) ? state.customAyahs : dailyAyahs;
    const idx = new Date().getDate() % pool.length;
    return pool[idx];
}
function getDailyHadith() {
    const pool = (state.customHadiths && state.customHadiths.length > 0) ? state.customHadiths : hadiths;
    return pool[state.hadithIndex % pool.length];
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
const blogPosts = [
    {id:1,date:'২০২৪-০১-১৫',titleBn:'রমজান মাসের ফজিলত ও আমল',titleEn:'Virtues of Ramadan',category:'রমজান',readTime:'8 min',excerpt:'রমজান মাসের বিশেষ ফজিলত এবং করণীয় আমল',contentBn:'রমজান মাস ইসলামের পাঁচটি স্তম্ভের একটি। এই মাসে রোজা রাখা ফরজ।\n\nফজিলত:\n১. কুরআন নাজিল\n২. লাইলাতুল কদর\n৩. জান্নাতের দরজা খোলা\n৪. শয়তান শৃঙ্খলিত\n\nআমল:\n১. সাহরি\n২. ইফতার\n৩. কুরআন তিলাওয়াত\n৪. তারাবীহ\n৫. দান-সদকা',contentEn:'Ramadan is a pillar of Islam. Fasting is obligatory.\n\nVirtues:\n1. Quran revealed\n2. Laylatul Qadr\n3. Paradise gates open\n4. Satan chained\n\nPractices:\n1. Suhoor\n2. Iftar\n3. Quran recitation\n4. Taraweeh\n5. Charity'},
    {id:2,date:'২০২৪-০২-১০',titleBn:'ইমাম হোসাইন (আ.)',titleEn:'Imam Hussain (AS)',category:'আহলে বাইত',readTime:'12 min',excerpt:'ইমাম হোসাইন (আ.) এর জীবনী',contentBn:'ইমাম হুসাইন রাসূলের নাতি।\n\nকারবালা:\n৬১ হিজরিতে ইয়াজিদের বিরুদ্ধে। ৭২ জন সঙ্গী নিয়ে শাহাদাত।\n\nশিক্ষা:\nসত্য ও ন্যায়ের জন্য দাঁড়ানো।',contentEn:'Imam Hussain is the Prophet\'s grandson.\n\nKarbala:\n61 AH against Yazid. Martyred with 72 companions.\n\nLesson:\nStanding for truth.'},
    {id:3,date:'২০২৪-০৩-০৫',titleBn:'দোয়ায়ে কুমাইল',titleEn:'Dua Kumayl',category:'দোয়া',readTime:'6 min',excerpt:'দোয়ায়ে কুমাইলের ফজিলত',contentBn:'ইমাম আলী (আ.) এর শিক্ষা।\n\nসময়:\nবৃহস্পতিবার রাত।\n\nফজিলত:\n১. গুনাহ মাফ\n২. রহমত\n৩. আধ্যাত্মিক উন্নতি',contentEn:'Taught by Imam Ali.\n\nTime:\nThursday nights.\n\nBenefits:\n1. Forgiveness\n2. Mercy\n3. Spiritual growth'},
    {id:4,date:'২০২৪-০৩-২০',titleBn:'সূরা ফাতিহা',titleEn:'Surah Fatiha',category:'কুরআন',readTime:'10 min',excerpt:'সূরা ফাতিহার তাফসীর',contentBn:'নামাজের অপরিহার্য অংশ।\n\nআয়াত:\n১. বিসমিল্লাহ\n২. আলহামদুলিল্লাহ\n৩. রহমান রহিম\n৪. সিরাতাল মুস্তাকিম',contentEn:'Essential in prayer.\n\nVerses:\n1. Bismillah\n2. Alhamdulillah\n3. Rahman Rahim\n4. Straight path'},
    {id:5,date:'২০২৪-০৪-০১',titleBn:'নামাজের গুরুত্ব',titleEn:'Importance of Salah',category:'ইবাদত',readTime:'7 min',excerpt:'নামাজের গুরুত্ব',contentBn:'দ্বিতীয় স্তম্ভ।\n\nগুরুত্ব:\n১. ঈমানের পার্থক্য\n২. মুমিনের মিরাজ\n৩. পাপ মোচন',contentEn:'Second pillar.\n\nImportance:\n1. Faith difference\n2. Believer\'s ascension\n3. Sin removal'},
    {id:6,date:'২০২৪-০৪-১৫',titleBn:'ইসলামি নৈতিকতা',titleEn:'Islamic Ethics',category:'আখলাক',readTime:'9 min',excerpt:'নৈতিক মূল্যবোধ',contentBn:'মূল্যবোধ:\n১. সত্যবাদিতা\n২. বিশ্বস্ততা\n৩. ন্যায়\n৪. দয়া\n৫. বিনয়',contentEn:'Values:\n1. Truth\n2. Trust\n3. Justice\n4. Mercy\n5. Humility'}
];

const duas = [
    {titleBn:'দোয়ায়ে কুমাইল',titleEn:'Dua Kumayl',arabic:'اللَّهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ',meaningBn:'হে আল্লাহ! আমি তোমার সেই রহমতের ওসিলায় চাই যা সবকিছু ঘিরে রেখেছে',meaningEn:'O Allah! I ask You through Your mercy which encompasses everything'},
    {titleBn:'যিয়ারত আশুরা',titleEn:'Ziyarat Ashura',arabic:'السَّلَامُ عَلَيْكَ يَا أَبَا عَبْدِ اللَّهِ وَعَلَى الْأَرْوَاحِ الَّتِي حَلَّتْ بِفِنَائِكَ',meaningBn:'হে আবা আবদিল্লাহ! আপনার প্রতি শান্তি এবং যেসব আত্মা আপনার দরগায় অবস্থান করছে তাদের উপর',meaningEn:'Peace be upon you O Aba Abdillah, and upon the souls that gathered in your courtyard'},
    {titleBn:'দোয়ায়ে তাওয়াসসুল',titleEn:'Dua Tawassul',arabic:'يَا اللَّهُ يَا رَبَّنَا بِحَقِّ مُحَمَّدٍ وَآلِ مُحَمَّدٍ',meaningBn:'হে আল্লাহ! হে আমাদের রব! মুহাম্মদ (সা.) ও তাঁর পরিবারের হক্বের ওসিলায়',meaningEn:'O Allah! O our Lord! Through the right of Muhammad and the family of Muhammad'}
];

const hijriMonthsBn = ['মহররম','সফর','রবিউল আউয়াল','রবিউস সানি','জামাদিউল আউয়াল','জামাদিউস সানি','রজব','শাবান','রমজান','শাওয়াল','জিলক্বদ','জিলহজ'];
const hijriMonthsEn = ['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Awwal','Jumada al-Thani','Rajab','Shaban','Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah'];
const hijriEvents = {
    // ── মূল ইসলামিক দিন ──
    '1-1':{bn:'হিজরি নববর্ষ 🌙',en:'Islamic New Year 🌙',type:'special'},
    '1-10':{bn:'🔴 আশুরা — ইমাম হোসাইন (আ.)-এর শাহাদাত',en:'🔴 Ashura — Imam Hussain (AS) Martyrdom',type:'ashura'},
    '2-20':{bn:'চেহলুম — আরবাঈন',en:'Chehlum — Arbaeen',type:'martyrdom'},
    '3-12':{bn:'ঈদে মিলাদুন্নবী (সা.)',en:"Mawlid al-Nabi",type:'eid'},
    '3-17':{bn:'ইমাম সাদিক (আ.) জন্মদিন 🌟',en:'Imam Sadiq (AS) Birthday 🌟',type:'birth'},
    '7-13':{bn:'ইমাম আলী (আ.) জন্মদিন 🦁',en:'Imam Ali (AS) Birthday 🦁',type:'birth'},
    '7-27':{bn:'শবে মেরাজ',en:'Laylat al-Miraj',type:'special'},
    '7-28':{bn:'ইমাম হাসান (আ.) শাহাদাত 🕊️',en:'Imam Hasan (AS) Martyrdom 🕊️',type:'martyrdom'},
    '8-3':{bn:'ইমাম হোসাইন (আ.) জন্মদিন 🌸',en:'Imam Hussain (AS) Birthday 🌸',type:'birth'},
    '8-10':{bn:'ইমাম হাসান আসকারি (আ.) জন্মদিন',en:'Imam Askari (AS) Birthday',type:'birth'},
    '8-15':{bn:'নিমে শাবান — ইমাম মাহদি (আ.) জন্মদিন 🌙',en:"Mid-Shaban — Imam Mahdi (AS) Birthday 🌙",type:'birth'},
    '9-1':{bn:'রমজান শুরু',en:'Ramadan begins',type:'special'},
    '9-19':{bn:'শবে ক্বদর (১৯) — ইমাম আলী (আ.) আঘাতপ্রাপ্ত',en:"Laylat al-Qadr (19) — Imam Ali (AS) struck",type:'martyrdom'},
    '9-21':{bn:'ইমাম আলী (আ.) শাহাদাত 🕊️ / শবে ক্বদর (২১)',en:"Imam Ali (AS) Martyrdom 🕊️ / Laylat al-Qadr (21)",type:'martyrdom'},
    '9-23':{bn:'শবে ক্বদর (২৩ রমজান) ⭐',en:'Laylat al-Qadr (23 Ramadan) ⭐',type:'special'},
    '9-27':{bn:'শবে কদর (২৭)',en:"Laylat al-Qadr (27)",type:'special'},
    '10-1':{bn:'ঈদুল ফিতর 🎉',en:'Eid al-Fitr 🎉',type:'eid'},
    '10-25':{bn:'ইমাম সাদিক (আ.) শাহাদাত 🕊️',en:'Imam Sadiq (AS) Martyrdom 🕊️',type:'martyrdom'},
    '6-3':{bn:'ফাতেমা যাহরা (আ.) শাহাদাত 🌹',en:'Fatima al-Zahra (AS) Martyrdom 🌹',type:'martyrdom'},
    '6-20':{bn:'ফাতেমা যাহরা (আ.) জন্মদিন 🌷',en:'Fatima al-Zahra (AS) Birthday 🌷',type:'birth'},
    '3-8':{bn:'ইমাম আসকারি (আ.) শাহাদাত 🕊️',en:'Imam Askari (AS) Martyrdom 🕊️',type:'martyrdom'},
    '3-15':{bn:'ইমাম হাসান (আ.) জন্মদিন',en:'Imam Hasan (AS) Birthday',type:'birth'},
    '5-25':{bn:'ইমাম কাযিম (আ.) শাহাদাত 🕊️',en:'Imam Kazim (AS) Martyrdom 🕊️',type:'martyrdom'},
    '7-7':{bn:'ইমাম কাযিম (আ.) জন্মদিন / ইমাম বাকির (আ.) শাহাদাত',en:'Imam Kazim (AS) Birthday / Imam Baqir (AS) Martyrdom',type:'mixed'},
    '2-17':{bn:'ইমাম রেজা (আ.) শাহাদাত 🕊️',en:'Imam Ridha (AS) Martyrdom 🕊️',type:'martyrdom'},
    '11-11':{bn:'ইমাম রেজা (আ.) জন্মদিন',en:'Imam Ridha (AS) Birthday',type:'birth'},
    '12-10':{bn:'ঈদুল আযহা 🎉',en:'Eid al-Adha 🎉',type:'eid'},
    '12-18':{bn:'ঈদে গাদির খুম 🎊',en:'Eid al-Ghadeer 🎊',type:'eid'},
    '12-24':{bn:'ঈদে মুবাহিলা ✨',en:'Eid al-Mubahila ✨',type:'eid'},
    '12-15':{bn:'ইমাম হাদি (আ.) জন্মদিন',en:'Imam Hadi (AS) Birthday',type:'birth'},
    '4-3':{bn:'ইমাম হাদি (আ.) শাহাদাত 🕊️',en:'Imam Hadi (AS) Martyrdom 🕊️',type:'martyrdom'},
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
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 300);
    }, {passive:true});
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
        home:'প্রধান পাতা', about:'আমাদের সম্পর্কে', blog:'ইসলামিক ব্লগ',
        calendar:'ইসলামিক ক্যালেন্ডার', library:'পিডিএফ লাইব্রেরি',
        media:'মিডিয়া', dua:'দোয়া ও যিয়ারত', contact:'যোগাযোগ',
        latestPosts:'সর্বশেষ পোস্ট', featuredBooks:'বৈশিষ্ট্যযুক্ত বই',
        readMore:'আরও পড়ুন', download:'ডাউনলোড', read:'পড়ুন',
        search:'অনুসন্ধান', pages:'পৃষ্ঠা', viewAll:'সব দেখুন',
        prayerTimes:'নামাজের সময়', fajr:'ফজর', dhuhr:'যোহর',
        asr:'আসর', maghrib:'মাগরিব', isha:'ইশা', share:'শেয়ার',
        todayVerse:'আজকের আয়াত', menu:'মেনু', darkMode:'ডার্ক মোড',
        lightMode:'লাইট মোড', loading:'লোড হচ্ছে...', error:'ত্রুটি',
        bookmarks:'বুকমার্ক', admin:'অ্যাডমিন', images:'ছবি', videos:'ভিডিও', audios:'অডিও',
        imams:'১২ ইমাম', tasbeeh:'তাসবিহ কাউন্টার', quiz:'ইসলামিক কুইজ', asmaul:'আসমাউল হুসনা', qibla:'কিবলা নির্দেশক',
        searchPage:'সার্চ', analytics:'পরিসংখ্যান', hadithOfDay:'আজকের হাদিস',
        newPost:'নতুন পোস্ট', editPost:'পোস্ট সম্পাদনা', deletePost:'মুছুন',
        savePost:'সংরক্ষণ করুন', cancel:'বাতিল', title:'শিরোনাম', content:'বিষয়বস্তু',
        notifyPrayer:'নামাজের রিমাইন্ডার', enableNotify:'নোটিফিকেশন চালু করুন'
    },
    en:{
        home:'Home', about:'About', blog:'Blog', calendar:'Calendar',
        library:'Library', media:'Media', dua:'Dua', contact:'Contact',
        latestPosts:'Latest Posts', featuredBooks:'Featured Books',
        readMore:'Read More', download:'Download', read:'Read',
        search:'Search', pages:'pages', viewAll:'View All',
        prayerTimes:'Prayer Times', fajr:'Fajr', dhuhr:'Dhuhr',
        asr:'Asr', maghrib:'Maghrib', isha:'Isha', share:'Share',
        todayVerse:"Today's Verse", menu:'Menu', darkMode:'Dark Mode',
        lightMode:'Light Mode', loading:'Loading...', error:'Error',
        bookmarks:'Bookmarks', admin:'Admin', images:'Images', videos:'Videos', audios:'Audios',
        imams:'12 Imams', tasbeeh:'Tasbeeh Counter', quiz:'Islamic Quiz', asmaul:'Asmaul Husna', qibla:'Qibla Finder',
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
    } finally { state.prayerTimesLoading=false; render(); }
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
function closeUploadModal() { state.showUploadModal=false; state.uploadType=null; state.isUploading=false; render(); }

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const maxSize = state.uploadType === 'video' ? 500 : 100; // MB
    if (file.size > maxSize * 1024 * 1024) {
        showToast(state.language==='bn'
            ? `ফাইল ${maxSize}MB এর বেশি হতে পারবে না`
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
    const folder = folderMap[state.uploadType] || 'library/misc';

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
            if      (state.uploadType==='image') state.imageList.push(meta);
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
            if      (state.uploadType==='pdf')   state.pdfList.push(meta);
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
    state.viewerData = null; state.viewerLoading = true;
    state.currentPage = 'viewer'; render();
    // Cloudinary files (all types): use URL directly
    if (item.cloudUrl) {
        state.viewerData = item.cloudUrl;
        state.viewerLoading = false; render();
        return;
    }
    // Local files: load from IndexedDB
    try {
        const data = await dbGet(item.id);
        state.viewerData = data; state.viewerLoading = false; render();
    } catch(e) { state.viewerLoading=false; render(); }
}

async function deleteFile(id, listKey) {
    if (!state.isAdmin) return;
    const msg = state.language==='bn'?'ফাইলটি মুছবেন?':'Delete this file?';
    if (!confirm(msg)) return;
    await dbDelete(id);
    state[listKey] = state[listKey].filter(f => f.id!==id);
    saveState(); render();
    try { await syncMediaToCloud(); } catch(e) { console.warn('[Media] index sync on delete failed:', e); }
}

// ============================================================================
// STATE ACTIONS
// ============================================================================
function toggleDarkMode() { state.darkMode=!state.darkMode; saveState(); render(); }
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
    saveState(); render();
}
function setFontSize(size) { state.fontSize=size; applyFontSize(); saveState(); render(); }
function applyFontSize() {
    document.body.classList.remove('fs-small','fs-medium','fs-large','fs-xlarge');
    document.body.classList.add('fs-'+state.fontSize);
}

// Share
function shareContent(title, text, url) {
    const shareText = title + '\n' + text + '\n\n' + (url||window.location.href);
    if (navigator.share) {
        navigator.share({ title, text: shareText, url: url||window.location.href }).catch(()=>{});
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(()=>{
            showToast(state.language==='bn'?'কপি হয়েছে! পেস্ট করুন':'Copied! Paste to share','success');
        }).catch(()=>{
            // Last resort: open whatsapp
            const wa = 'https://wa.me/?text='+encodeURIComponent(shareText);
            window.open(wa,'_blank');
        });
    }
}
function sharePost(post, l) {
    const title = l==='bn'?post.titleBn:post.titleEn;
    const text = post.excerpt || (l==='bn'?post.contentBn:post.contentEn).substring(0,100)+'...';
    shareContent('📖 '+title, text, '');
}
function shareHadith(hadith, l) {
    const text = (l==='bn'?hadith.textBn:hadith.textEn) + '\n— '+(l==='bn'?hadith.sourceBn:hadith.sourceEn);
    shareContent('📜 '+(l==='bn'?'হাদিস':'Hadith'), text, '');
}
function shareDua(dua, l) {
    const title = l==='bn'?dua.titleBn:dua.titleEn;
    const text = dua.arabic + '\n' + (l==='bn'?dua.meaningBn:dua.meaningEn);
    shareContent('🤲 '+title, text, '');
}
function shareImamQuote(im, l) {
    const name = l==='bn'?im.nameBn:im.nameEn;
    const quote = l==='bn'?im.quoteBn:im.quoteEn;
    shareContent('💬 '+name, '"'+quote+'"', '');
}
function changePage(page) {
    state.previousPage=state.currentPage; state.currentPage=page;
    state.menuOpen=false; state.currentPost=null; state.currentDua=null;
    state.currentZiyarat=null; state.viewerItem=null; state.viewerData=null;
    // analytics tracking
    state.pageViews[page] = (state.pageViews[page]||0) + 1;
    saveState();
    render();
    window.scrollTo(0,0);
}

// ============================================================================
// TASBEEH ACTIONS
// ============================================================================
function tasbeehTap() {
    state.tasbeehCount++;
    // Ripple effect
    const btn=document.getElementById('tasbeeh-main-btn');
    if(btn){
        const ripple=document.createElement('span');
        ripple.className='tasbeeh-ripple';
        ripple.style.left='50%'; ripple.style.top='50%';
        ripple.style.marginLeft='-30px'; ripple.style.marginTop='-30px';
        btn.appendChild(ripple);
        setTimeout(()=>ripple.remove(),700);
        // Update counter display in-place
        const numEl=btn.querySelector('span:first-child');
        if(numEl){
            numEl.style.transform='scale(1.25)';
            numEl.style.transition='transform .1s';
            numEl.textContent=state.tasbeehCount;
            setTimeout(()=>{numEl.style.transform='scale(1)';},120);
        }
    }
    if (state.tasbeehCount >= state.tasbeehTarget) {
        state.tasbeehHistory.unshift({
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
    // Update SVG ring and progress bar without full re-render
    const pct = Math.min(1, state.tasbeehCount / state.tasbeehTarget);
    const R=88, C=2*Math.PI*R, OFF=C*(1-pct);
    const ring = document.querySelector('.tasbeeh-progress-ring circle:last-child, svg circle[stroke="url(#tg)"]');
    if(ring) ring.setAttribute('stroke-dashoffset', OFF.toFixed(1));
    const pBar = document.querySelector('.tasbeeh-progress-inner');
    if(pBar) pBar.style.width = Math.round(pct*100)+'%';
    const pTxt = document.querySelector('.tasbeeh-progress-text');
    if(pTxt) pTxt.textContent = `${state.tasbeehCount} / ${state.tasbeehTarget}`;
    const pPct = document.querySelector('.tasbeeh-progress-pct');
    if(pPct) pPct.textContent = Math.round(pct*100)+'%';
    saveState();
}
function tasbeehReset() { state.tasbeehCount=0; saveState(); render(); }
function tasbeehSetLabel(idx) {
    const lbl = tasbeehLabels[idx];
    if (!lbl) return;
    state.tasbeehLabel = state.language==='bn'?lbl.bn:lbl.en;
    state.tasbeehTarget = lbl.target;
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
function doSearch(query) {
    state.searchQuery = query;
    if (!query.trim()) { state.searchResults=[]; render(); return; }
    const q = query.toLowerCase();
    const results = [];
    // search blog posts
    const allPosts = [...blogPosts, ...state.customPosts];
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
    // Clear previous timers
    _notifTimers.forEach(id => clearTimeout(id));
    _notifTimers = [];
    const prayerNames = Object.entries(state.prayerTimes);
    prayerNames.forEach(([name, time])=>{
        const [timePart, ampm] = time.split(' ');
        let [h,m] = timePart.split(':').map(Number);
        if (ampm==='PM' && h!==12) h+=12;
        if (ampm==='AM' && h===12) h=0;
        const now = new Date();
        const target = new Date();
        target.setHours(h,m,0,0);
        if (target > now) {
            const delay = target - now;
            if (delay < 86400000) { // only schedule within 24h
                const tid = setTimeout(()=>{
                    try {
                        new Notification(state.language==='bn'?`🕌 ${name} নামাজের সময়`:`🕌 ${name} Prayer Time`, {
                            body: state.language==='bn'?`${name} নামাজের সময় হয়েছে`:`It's time for ${name} prayer`,
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
// ADMIN BLOG EDITOR ACTIONS
// ============================================================================
function openBlogEditor(post=null) {
    if (!state.isAdmin) return;
    state.editingPost = post ? {...post} : {id:'custom_'+Date.now(),date:localDate(),titleBn:'',titleEn:'',category:'',readTime:'5 min',excerpt:'',contentBn:'',contentEn:''};
    state.showBlogEditor = true;
    render();
}
function closeBlogEditor() { state.showBlogEditor=false; state.editingPost=null; render(); }
// ── Blog → Cloudinary sync ───────────────────────────────────────────────────
// ── Media index → Cloudinary ─────────────────────────────────────────────────
async function syncMediaToCloud() {
    try {
        const _cn = window.CLOUDINARY_CLOUD_NAME || "ahlalbayt";
        const _pr = window.CLOUDINARY_UPLOAD_PRESET || "ahlalbayt_upload";
        const index = {
            pdfList:   state.pdfList,
            imageList: state.imageList,
            videoList: state.videoList,
            audioList: state.audioList,
        };
        const blob = new Blob([JSON.stringify(index)], { type:'application/json' });
        const file = new File([blob], 'media_index.json', { type:'application/json' });
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', _pr);
        fd.append('folder', 'library');
        fd.append('resource_type', 'raw');
        fd.append('use_filename', 'true');
        fd.append('unique_filename', 'false');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${_cn}/raw/upload`, { method:'POST', body:fd });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        console.log('[Media] index synced →', data.secure_url);
    } catch(e) { console.error('[Media] sync error:', e); throw e; }
}

async function fetchMediaFromCloud() {
    try {
        const _cn = window.CLOUDINARY_CLOUD_NAME || "ahlalbayt";
        const url = `https://res.cloudinary.com/${_cn}/raw/upload/library/media_index.json?cb=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.pdfList)   state.pdfList   = data.pdfList;
        if (data.imageList) state.imageList = data.imageList;
        if (data.videoList) state.videoList = data.videoList;
        if (data.audioList) state.audioList = data.audioList;
        saveState(); render();
        console.log('[Media] loaded from Cloudinary');
    } catch(e) { console.warn('[Media] fetch error:', e.message); }
}

async function syncBlogToCloud(posts) {
    try {
        const blob = new Blob([JSON.stringify(posts)], { type:'application/json' });
        const file = new File([blob], 'posts_index.json', { type:'application/json' });
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        fd.append('folder', 'blog');
        fd.append('resource_type', 'raw');
        fd.append('use_filename', 'true');
        fd.append('unique_filename', 'false');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`, { method:'POST', body:fd });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        console.log('[Blog] Synced →', data.secure_url);
    } catch(e) { console.error('[Blog] sync error:', e); throw e; }
}

async function fetchBlogFromCloud() {
    try {
        const _cn = window.CLOUDINARY_CLOUD_NAME || "ahlalbayt";
        const url = `https://res.cloudinary.com/${_cn}/raw/upload/blog/posts_index.json?cb=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const posts = await res.json();
        if (Array.isArray(posts) && posts.length) { state.customPosts = posts; saveState(); render(); }
    } catch(e) { console.warn('[Blog] fetch error:', e.message); }
}

async function saveBlogPost() {
    if (!state.editingPost) return;
    const g = id => { const el=document.getElementById(id); return el?el.value:''; };
    if(g('blog-editor-titleBn')) state.editingPost.titleBn = g('blog-editor-titleBn');
    if(g('blog-editor-titleEn')) state.editingPost.titleEn = g('blog-editor-titleEn');
    if(g('blog-editor-category')) state.editingPost.category = g('blog-editor-category');
    if(g('blog-editor-readTime')) state.editingPost.readTime = g('blog-editor-readTime');
    if(g('blog-editor-excerpt')) state.editingPost.excerpt = g('blog-editor-excerpt');
    if(g('blog-editor-contentBn')) state.editingPost.contentBn = g('blog-editor-contentBn');
    if(g('blog-editor-contentEn')) state.editingPost.contentEn = g('blog-editor-contentEn');
    if (!state.editingPost.titleBn) {
        showToast(state.language==='bn'?'বাংলা শিরোনাম দিন':'Please enter Bengali title','warning');
        return;
    }
    const idx = state.customPosts.findIndex(p=>p.id===state.editingPost.id);
    if (idx>-1) state.customPosts[idx]=state.editingPost;
    else state.customPosts.unshift(state.editingPost);
    saveState(); closeBlogEditor();
    showToast(state.language==='bn'?'পোস্ট সংরক্ষিত হচ্ছে...':'Saving post...','info');
    try {
        await syncBlogToCloud(state.customPosts);
        showToast(state.language==='bn'?'পোস্ট Cloudinary-তে সেভ হয়েছে ✨':'Post saved to Cloudinary ✨','success');
    } catch(e) {
        showToast(state.language==='bn'?'Cloudinary sync ব্যর্থ — locally সেভ হয়েছে':'Cloudinary sync failed — saved locally','warning');
    }
}

async function deleteCustomPost(id) {
    if (!state.isAdmin) return;
    if (!confirm(state.language==='bn'?'পোস্টটি মুছবেন?':'Delete this post?')) return;
    state.customPosts = state.customPosts.filter(p=>p.id!==id);
    saveState(); render();
    try {
        await syncBlogToCloud(state.customPosts);
        showToast(state.language==='bn'?'পোস্ট মুছে ফেলা হয়েছে ✓':'Post deleted ✓','success');
    } catch(e) {
        showToast(state.language==='bn'?'Cloudinary sync ব্যর্থ':'Cloudinary sync failed','warning');
    }
}

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
    const allPosts = [...blogPosts, ...state.customPosts];
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
        state.currentDua = duas[parseInt(index)];
    }
    state.currentPage='readDua'; render(); window.scrollTo(0,0);
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================
function getHijriMonthDays(month,year) {
    if(month%2===1) return 30;
    if(month===12) return ([2,5,7,10,13,15,18,21,24,26,29].includes(year%30))?30:29;
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

// Arabic digit conversion
function toArabicIndic(n) {
    return String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
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
    setTimeout(()=>{ showToast(state.language==='bn'?'আপনার ইমেইল অ্যাপ খুলছে।':'Your email app is opening.','info'); form.reset(); }, 500);
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
                case 'sharePost': { const allP=[...blogPosts,...state.customPosts]; const p=allP.find(x=>String(x.id)===String(param)); if(p) sharePost(p,state.language); break; }
                case 'shareHadith': shareHadith(getDailyHadith(),state.language); break;
                case 'shareDua': {
                    const allDuas2=[...duas,...state.customDuas];
                    const duaItem=isNaN(param)?allDuas2.find(x=>x.id===param):duas[parseInt(param)];
                    if(duaItem) shareDua(duaItem,state.language); break;
                }
                case 'shareImamQuote': { const im2=imams.find(x=>x.id===parseInt(param)); if(im2) shareImamQuote(im2,state.language); break; }
                case 'toggleBookmark': toggleBookmark(param,param2); break;
                case 'readPost': readPost(param); break;
                case 'readDua': readDua(param); break;
                case 'openUploadModal': openUploadModal(param); break;
                case 'closeUploadModal': closeUploadModal(); break;
                case 'downloadFile': {
                    const name=btn.getAttribute('data-name')||'file';
                    downloadFile(param,name); break;
                }
                case 'openViewer': {
                    const vtype=btn.getAttribute('data-vtype');
                    const listKey=btn.getAttribute('data-listkey');
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
                // TASBEEH
                case 'tasbeehTap': tasbeehTap(); break;
                case 'tasbeehReset': tasbeehReset(); break;
                case 'tasbeehSetLabel': tasbeehSetLabel(parseInt(param)); break;
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
                    const post=state.customPosts.find(p=>p.id===param);
                    if(post) openBlogEditor(post); break;
                }
                case 'closeBlogEditor': closeBlogEditor(); break;
                case 'saveBlogPost': saveBlogPost(); break;
                case 'deleteCustomPost': deleteCustomPost(param); break;
                // DUA / ZIYARAT
                case 'setDuaTab': state.duaTab=param; render(); break;
                case 'openKnowledgeEditor':
            if(!state.isAdmin) return;
            state.knowledgeEditorType = param;
            state.editingKnowledgeItem = {};
            state.editingKnowledgeIdx = -1;
            state.showKnowledgeEditor = true;
            render(); break;
        case 'editKnowledgeItem':
            if(!state.isAdmin) return;
            {const dtype=el.dataset.dtype; const idx=parseInt(param);
            const dataMap2={nahjul:'nahjulBalagha',sahifa:'sahifaSajjadiya',imamhadiths:'imamHadiths',specialdays:'specialDays'};
            const arr=state[dataMap2[dtype]];
            if(arr&&arr[idx]){state.knowledgeEditorType=dtype;state.editingKnowledgeItem={...arr[idx]};state.editingKnowledgeIdx=idx;state.showKnowledgeEditor=true;render();}}
            break;
        case 'deleteKnowledgeItem':
            if(!state.isAdmin) return;
            {const dtype=el.dataset.dtype; const idx=parseInt(param);
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
                    const idx=param!==''?parseInt(param):null;
                    if(idx!=null) state.customHadiths[idx]=item;
                    else state.customHadiths.push(item);
                    state.hadithIndex=0;
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
                    const idx=param!==''?parseInt(param):null;
                    if(idx!=null) state.customAyahs[idx]=item;
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
                    const zitem=state.customZiyarat.find(x=>x.id===param);
                    if(zitem){state.currentZiyarat=zitem;state.previousPage=state.currentPage;state.currentPage='readZiyarat';render();window.scrollTo(0,0);}
                    break;
                }
                // IMAM PAGE
                case 'viewImam': {
                    state.currentImam=imams.find(im=>im.id===parseInt(param));
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
                    me.icon = document.getElementById('mev-icon')?.value?.trim() || '🕌';
                    me.date = document.getElementById('mev-date')?.value?.trim() || '';
                    me.titleBn = document.getElementById('mev-title')?.value?.trim() || '';
                    me.descBn = document.getElementById('mev-desc')?.value?.trim() || '';
                    me.color = document.getElementById('mev-color')?.value || '#dc2626';
                    if(!me.titleBn){alert('শিরোনাম লিখুন');break;}
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
                    sd.icon = document.getElementById('sd-icon')?.value?.trim() || '✨';
                    sd.type = document.getElementById('sd-type')?.value || 'eid';
                    sd.hijriDate = document.getElementById('sd-hijridate')?.value?.trim() || '';
                    sd.titleBn = document.getElementById('sd-title')?.value?.trim() || '';
                    sd.arabicTitle = document.getElementById('sd-arabic')?.value?.trim() || '';
                    sd.descBn = document.getElementById('sd-desc')?.value?.trim() || '';
                    sd.amaal = document.getElementById('sd-amaal')?.value?.trim() || '';
                    sd.importance = document.getElementById('sd-importance')?.value?.trim() || '';
                    sd.color = sd.type==='eid'?'#059669':sd.type==='martyrdom'?'#dc2626':'#b45309';
                    if(!sd.titleBn){alert('শিরোনাম লিখুন');break;}
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
        if(!state.editingPost) return;
        if(e.target.id==='blog-editor-titleBn') state.editingPost.titleBn=e.target.value;
        if(e.target.id==='blog-editor-titleEn') state.editingPost.titleEn=e.target.value;
        if(e.target.id==='blog-editor-category') state.editingPost.category=e.target.value;
        if(e.target.id==='blog-editor-readTime') state.editingPost.readTime=e.target.value;
        if(e.target.id==='blog-editor-excerpt') state.editingPost.excerpt=e.target.value;
        if(e.target.id==='blog-editor-contentBn') state.editingPost.contentBn=e.target.value;
        if(e.target.id==='blog-editor-contentEn') state.editingPost.contentEn=e.target.value;
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

function renderDailyAyahInner(d, l) {
    const ay = getDailyAyah();
    return '<div class="' + (d?'bg-black/20':'bg-white/70') + ' rounded-2xl p-4 mb-3">'
        + '<p class="arabic-text arabic-reveal text-center mb-2" dir="rtl" style="font-size:1.4rem;line-height:2;color:' + (d?'#c9a227':'#92400e') + '">' + ay.arabic + '</p>'
        + '<p class="text-xs text-center ' + (d?'text-gray-300':'text-gray-700') + ' leading-relaxed italic">' + (l==='bn'?ay.meaningBn:ay.meaningEn) + '</p>'
        + '</div>'
        + '<p class="text-xs font-bold text-center" style="color:' + (d?'#6ee7b7':'#059669') + '">' + (l==='bn'?ay.ref:ay.refEn) + '</p>';
}

// ============================================================================
// READING PROGRESS BAR
// ============================================================================
function initReadingProgress() {
    const bar = document.getElementById('reading-progress');
    if (!bar) return;
    const updateProgress = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
        bar.style.width = pct + '%';
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
    const mainPages=['home','imams','dua','blog','tasbeeh'];
    const morePages=['library','media','calendar','quiz','bookmarks','about','contact'];
    const bg=d?'rgba(17,24,39,0.92)':'rgba(255,255,255,0.88)';
    const border=d?'rgba(52,211,153,0.1)':'rgba(5,150,105,0.12)';
    return `
    <header style="background:${bg};border-bottom:1px solid ${border};" class="sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 py-3">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-3">
                    <button data-action="toggleMenu" class="md:hidden p-2 rounded-xl focus:outline-none transition-all hover:scale-110" style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'}">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="4" x2="17" y2="4"/><line x1="1" y1="9" x2="17" y2="9"/><line x1="1" y1="14" x2="17" y2="14"/></svg>
                    </button>
                    <button data-action="changePage" data-param="home" class="flex items-center gap-2.5 focus:outline-none group">
                        <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(5,150,105,.4);transition:transform var(--t-spring)" class="group-hover:scale-110">
                            <span style="font-family:'Amiri',serif;font-size:1.1rem;color:white">☽</span>
                        </div>
                        <div class="hidden sm:block">
                            <div class="font-bold text-sm leading-tight" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${l==='bn'?'আহলে বাইত':'Ahl al-Bayt'}</div>
                            <div class="text-xs leading-tight" style="color:${d?'#34d399':'#059669'}">${l==='bn'?'ইসলামিক জ্ঞান':'Islamic Knowledge'}</div>
                        </div>
                    </button>
                </div>
                <nav class="hidden md:flex items-center gap-1">
                    ${mainPages.map(page=>`
                    <button data-action="changePage" data-param="${page}"
                        class="nav-pill px-3.5 py-2 rounded-xl text-sm font-medium focus:outline-none transition-all
                        ${state.currentPage===page?(d?'bg-emerald-900/60 text-emerald-300':'bg-emerald-50 text-emerald-700'):(d?'text-gray-300 hover:text-white hover:bg-white/5':'text-gray-600 hover:text-gray-900 hover:bg-gray-50')}"
                        ${state.currentPage===page?'style="font-weight:700"':''}
                    >${t(page)}</button>`).join('')}
                    <div class="relative" id="more-menu-wrap">
                        <button onclick="document.getElementById('more-dropdown').classList.toggle('hidden')"
                            class="px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1 focus:outline-none transition-all hover:bg-white/5"
                            style="color:${d?'#9ca3af':'#6b7280'}">
                            ${l==='bn'?'আরো':'More'} <span style="font-size:9px;opacity:.6">▾</span>
                        </button>
                        <div id="more-dropdown" class="hidden absolute right-0 top-full mt-2 w-44 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden"
                            style="background:${d?'rgba(17,24,39,.97)':'rgba(255,255,255,.97)'};backdrop-filter:blur(20px);border:1px solid ${border}">
                            ${morePages.map(page=>`
                            <button data-action="changePage" data-param="${page}"
                                class="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm transition-colors
                                ${state.currentPage===page?(d?'bg-emerald-900/50 text-emerald-300':'bg-emerald-50 text-emerald-700'):(d?'text-gray-300 hover:bg-white/5':'text-gray-700 hover:bg-gray-50')}"
                            >${t(page)}</button>`).join('')}
                        </div>
                    </div>
                </nav>
                <div class="flex items-center gap-1.5">
                    <button data-action="changePage" data-param="searchPage"
                        class="p-2 rounded-xl focus:outline-none transition-all hover:scale-110"
                        style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'};color:${d?'#9ca3af':'#6b7280'}">
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5L18 18"/></svg>
                    </button>
                    <div class="flex items-center gap-0.5 rounded-xl px-1 py-1" style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'}">
                        <button data-action="setFontSize" data-param="${fontSizes[Math.max(0,fontSizes.indexOf(state.fontSize)-1)]}" class="w-6 h-6 rounded-lg flex items-center justify-center font-bold focus:outline-none hover:scale-110 transition-all" style="color:${d?'#9ca3af':'#6b7280'}">−</button>
                        <span class="text-xs font-bold px-0.5 select-none" style="color:${d?'#6b7280':'#9ca3af'}">A</span>
                        <button data-action="setFontSize" data-param="${fontSizes[Math.min(fontSizes.length-1,fontSizes.indexOf(state.fontSize)+1)]}" class="w-6 h-6 rounded-lg flex items-center justify-center font-bold focus:outline-none hover:scale-110 transition-all" style="color:${d?'#9ca3af':'#6b7280'}">+</button>
                    </div>
                    ${adminBtn()}
                    <button data-action="toggleLanguage" class="px-2.5 py-2 rounded-xl text-xs font-bold focus:outline-none hover:scale-105 transition-all" style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'};color:${d?'#d1d5db':'#374151'}">${l==='bn'?'EN':'বাং'}</button>
                    <button data-action="toggleDarkMode" class="p-2 rounded-xl focus:outline-none hover:scale-110 transition-all" style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'};color:${d?'#fbbf24':'#6b7280'}">${d?'☀️':'🌙'}</button>
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
    const allPages=['home','blog','imams','dua','library','media','calendar','tasbeeh','quiz','bookmarks','about','contact','searchPage','analytics'];
    const icons={home:'🏠',blog:'📝',imams:'👑',dua:'🤲',library:'📚',media:'🎬',calendar:'📅',tasbeeh:'📿',quiz:'🧠',bookmarks:'🔖',about:'ℹ️',contact:'📞',searchPage:'🔍',analytics:'📊'};
    return `
    <div id="mobile-menu-backdrop" class="${state.menuOpen?'block':'hidden'} fixed inset-0 z-40" style="background:rgba(0,0,0,.55);backdrop-filter:blur(4px)" data-action="toggleMenu"></div>
    <div class="mobile-menu ${state.menuOpen?'open':''} fixed top-0 left-0 bottom-0 z-50 w-72 overflow-y-auto"
        style="background:${d?'rgba(17,24,39,.98)':'rgba(255,255,255,.98)'};backdrop-filter:blur(20px);box-shadow:8px 0 40px rgba(0,0,0,.2);border-right:1px solid ${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}">
        <div class="flex items-center justify-between p-5 pb-4" style="border-bottom:1px solid ${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}">
            <div class="flex items-center gap-3">
                <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(5,150,105,.4)"><span style="font-family:'Amiri',serif;font-size:1rem;color:white">☽</span></div>
                <span class="font-bold">${l==='bn'?'আহলে বাইত':'Ahl al-Bayt'}</span>
            </div>
            <button data-action="toggleMenu" class="w-8 h-8 rounded-xl flex items-center justify-center hover:scale-110 transition-all" style="background:${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}">✕</button>
        </div>
        <nav class="p-4 space-y-1">
            ${allPages.map(page=>`
            <button data-action="changePage" data-param="${page}"
                class="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.015] focus:outline-none text-left"
                style="${state.currentPage===page
                    ?'background:linear-gradient(135deg,rgba(5,150,105,.16),rgba(5,150,105,.07));color:#059669;border:1px solid rgba(5,150,105,.18)'
                    :(d?'color:#d1d5db;border:1px solid transparent':'color:#374151;border:1px solid transparent')}">
                <span style="width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;${state.currentPage===page?'background:rgba(5,150,105,.14)':'background:'+(d?'rgba(255,255,255,.05)':'rgba(0,0,0,.04)')}">
                    ${icons[page]||'📄'}
                </span>
                ${t(page)}
                ${state.currentPage===page?'<span style="margin-left:auto;color:#059669;font-size:.65rem">●</span>':''}
            </button>`).join('')}
        </nav>
        <div class="p-4" style="border-top:1px solid ${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'}">
            <div class="flex gap-2">
                <button data-action="toggleDarkMode" class="flex-1 py-2.5 rounded-2xl text-sm font-bold hover:scale-[1.02] transition-all" style="background:${d?'rgba(251,191,36,.1)':'rgba(0,0,0,.05)'};color:${d?'#fbbf24':'#6b7280'}">${d?'☀️ Light':'🌙 Dark'}</button>
                <button data-action="toggleLanguage" class="flex-1 py-2.5 rounded-2xl text-sm font-bold hover:scale-[1.02] transition-all" style="background:${d?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)'};color:${d?'#d1d5db':'#374151'}">${l==='bn'?'🌐 EN':'🌐 বাং'}</button>
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
    return `
    <footer class="footer-luxury mt-16">
        <!-- Mosque Silhouette SVG -->
        <div style="width:100%;overflow:hidden;line-height:0;opacity:.18;margin-bottom:-2px">
            <svg viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:80px">
                <!-- Main dome -->
                <path d="M580 80 Q600 10 620 80Z" fill="#059669"/>
                <rect x="575" y="80" width="50" height="40" fill="#059669"/>
                <!-- Left minaret -->
                <rect x="480" y="40" width="18" height="80" fill="#059669"/>
                <path d="M480 40 Q489 10 498 40Z" fill="#c9a227"/>
                <!-- Right minaret -->
                <rect x="702" y="40" width="18" height="80" fill="#059669"/>
                <path d="M702 40 Q711 10 720 40Z" fill="#c9a227"/>
                <!-- Side domes -->
                <path d="M510 80 Q530 45 550 80Z" fill="#047857"/>
                <path d="M650 80 Q670 45 690 80Z" fill="#047857"/>
                <!-- Ground line -->
                <rect x="400" y="118" width="400" height="4" fill="#065f46"/>
                <!-- Stars and crescent -->
                <circle cx="600" cy="25" r="4" fill="#c9a227"/>
                <path d="M585 25 C585 15 595 8 608 12 C600 8 592 15 592 25 Z" fill="#c9a227"/>
            </svg>
        </div>
        <div style="width:100%;height:28px;overflow:hidden;opacity:.25"><svg width="100%" height="28" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><pattern id="fp" x="0" y="0" width="56" height="28" patternUnits="userSpaceOnUse"><path d="M0 14 L14 0 L28 14 L42 0 L56 14 L42 28 L28 14 L14 28Z" fill="none" stroke="#B45309" stroke-width="1"/><circle cx="28" cy="14" r="3" fill="#059669" opacity=".8"/></pattern></defs><rect width="100%" height="28" fill="url(#fp)"/></svg></div>
        <div class="max-w-7xl mx-auto px-4 pt-10 pb-8 relative z-10">
            <div class="grid md:grid-cols-3 gap-10">
                <div>
                    <div class="flex items-center gap-3 mb-4"><div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(5,150,105,.4)"><span style="font-family:'Amiri',serif;font-size:1.2rem;color:white">☽</span></div><h3 class="font-bold text-xl text-white">${l==='bn'?'আহলে বাইত (আ.)':'Ahl al-Bayt (a.s)'}</h3></div>
                    <p class="text-gray-400 text-sm leading-relaxed mb-5">${l==='bn'?'ইসলামিক জ্ঞান ও শিক্ষার জন্য আপনার বিশ্বস্ত উৎস':'Your trusted source for Islamic knowledge and education'}</p>
                    <div class="flex gap-3">
                        ${[
['https://www.facebook.com/profile.php?id=100090495041094','#1877f2','<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'],
['https://www.instagram.com/ahl.al.bayt.a.s/','#e1306c','<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>'],
['https://www.youtube.com/@Ahl_al-Bayt_a.s','#ff0000','<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>'],
['https://x.com/Ahl_al_Bayt_a_s','#e7e9ea','<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>']
].map(([href,c,svg])=>`<a href="${href}" target="_blank" rel="noopener noreferrer" style="width:38px;height:38px;border-radius:10px;background:${c}22;border:1px solid ${c}33;display:flex;align-items:center;justify-content:center;color:${c};transition:transform var(--t-spring)" class="hover:scale-110">${svg}</a>`).join('')}
                    </div>
                </div>
                <div>
                    <h4 class="font-bold text-white mb-4">${l==='bn'?'দ্রুত লিংক':'Quick Links'}</h4>
                    <div class="grid grid-cols-2 gap-y-2">
                        ${['home','blog','imams','dua','library','tasbeeh','quiz','asmaul','qibla','contact'].map(p=>`<button data-action="changePage" data-param="${p}" class="text-left text-sm text-gray-400 hover:text-emerald-400 transition-colors">${t(p)}</button>`).join('')}
                    </div>
                </div>
                <div>
                    <h4 class="font-bold text-white mb-4">${l==='bn'?'যোগাযোগ':'Contact'}</h4>
                    <div class="space-y-3 text-sm text-gray-400">
                        <p>✉ theroleofahlalbaytas@gmail.com</p>
                        <p>☎ +880 1636428274</p>
                    </div>
                </div>
            </div>
            <div class="border-t border-white/5 mt-8 pt-7 text-center">
                <p class="arabic-text mb-2" style="color:#34d399;font-size:1.6rem" dir="rtl">اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ</p>
                <p class="text-sm text-gray-600">© ${new Date().getFullYear()} ${l==='bn'?'আহলে বাইত (আ.)':'Ahl al-Bayt (a.s)'}. ${l==='bn'?'সর্বস্বত্ব সংরক্ষিত।':'All rights reserved.'}</p>
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
    function getActive(){
        const keys=['fajr','dhuhr','asr','maghrib','isha'];
        const now=new Date();
        // Find the next upcoming prayer; active = the one just before it
        let nextIdx=-1;
        for(let i=0;i<keys.length;i++){try{const[t,ap]=state.prayerTimes[keys[i]].split(' ');let[h,m]=t.split(':').map(Number);if(ap==='PM'&&h!==12)h+=12;if(ap==='AM'&&h===12)h=0;const tgt=new Date(now);tgt.setHours(h,m,0,0);if(tgt>now){nextIdx=i;break;}}catch(e){}}
        // All prayers passed today → isha is active; before fajr → no active (return null)
        if(nextIdx===-1) return 'isha';
        if(nextIdx===0) return null;
        return keys[nextIdx-1];
    }
    const activePrayer=getActive();
    // Next prayer = the upcoming prayer (countdown goes here, not on active)
    const nextPrayerInfo=getNextPrayerInfo();
    const nextPrayer=nextPrayerInfo?nextPrayerInfo.key:null;
    return `
    <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border" style="box-shadow:var(--shadow-md)">
        <div class="gold-top-bar" style="border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
        <div class="p-5">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-base flex items-center gap-2"><span style="width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;font-size:.85rem;box-shadow:0 3px 10px rgba(5,150,105,.4)">🕌</span>${t('prayerTimes')}</h3>
            </div>
            ${state.prayerTimesLoading?`<div class="space-y-2">${[1,2,3,4,5].map(()=>`<div class="flex justify-between items-center px-3 py-2.5 rounded-xl ${d?'bg-gray-900':'bg-gray-50'}"><div class="${d?'skeleton-dark':'skeleton'}" style="width:55px;height:12px"></div><div class="${d?'skeleton-dark':'skeleton'}" style="width:60px;height:12px"></div></div>`).join('')}</div>`:
            state.prayerTimesError?`<p class="text-center text-red-500 py-4 text-sm">${sanitize(state.prayerTimesError)}</p>`:
            `<div class="space-y-1">
                ${Object.entries(state.prayerTimes).map(([k,v])=>{
                    const isNext=k===nextPrayer;
                    return `<div class="prayer-row flex justify-between items-center px-3 py-2.5 ${d?'bg-gray-900':'bg-gray-50'} ${isNext?'prayer-row-active':''}">
                        <div class="flex items-center gap-2.5"><span>${prayerIcons[k]||'🕌'}</span><div><p class="font-semibold text-sm ${isNext?(d?'text-emerald-300':'text-emerald-700'):''}">${t(k)}</p>${isNext?`<p class="prayer-countdown" id="pclock-${k}">…</p>`:''}</div>${isNext?`<span class="prayer-pulse w-1.5 h-1.5 rounded-full bg-emerald-500"></span>`:''}</div>
                        <span class="font-bold text-sm ${isNext?(d?'text-emerald-300':'text-emerald-600'):''}">${sanitize(v)}</span>
                    </div>`;
                }).join('')}
            </div>`}
        </div>
    </div>`;
}

// ============================================================================
// PAGE: HOME
// ============================================================================
function renderHomePage()
{
    const d=state.darkMode; const l=state.language;
    return `
    <!-- Hijri Date + Islamic Event Banner -->
    ${renderHijriBanner(d,l)}
    <!-- Next Prayer Countdown Banner -->
    <div class="next-prayer-banner p-5 mb-8 reveal" id="next-prayer-home">
        <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
                <div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#059669,#065f46);display:flex;align-items:center;justify-content:center;font-size:1.4rem;box-shadow:0 4px 16px rgba(5,150,105,.4)">🕌</div>
                <div>
                    <p class="text-xs text-gray-400 font-medium">${l==='bn'?'পরবর্তী নামাজ':'Next Prayer'}</p>
                    <p id="next-prayer-name-home" class="text-white font-bold text-base">${l==='bn'?'লোড হচ্ছে...':'Loading...'}</p>
                </div>
            </div>
            <div id="next-prayer-countdown-home" class="next-prayer-time">--:--:--</div>
        </div>
    </div>
    <div class="${d?'hero-luxury':'hero-luxury-light'} px-6 rounded-3xl mb-12 relative page-enter" style="min-height:420px;display:flex;align-items:center;justify-content:center;padding-top:52px;padding-bottom:52px;color:${d?'white':'inherit'}">
        <div class="hero-geo-bg"></div>
        <div class="islamic-geo-overlay"></div>
        ${d?`<div class="hero-orb hero-orb-1"></div><div class="hero-orb hero-orb-2"></div>`:''}
        ${d?Array.from({length:10},(_,i)=>`<div class="hero-particle" style="width:${4+i%3*2}px;height:${4+i%3*2}px;left:${8+i*9}%;bottom:-8px;background:${i%3===0?'rgba(180,83,9,.8)':i%3===1?'rgba(5,150,105,.6)':'rgba(255,255,255,.4)'};animation-duration:${8+i*1.3}s;animation-delay:${i*.7}s;--drift:${(i%2===0?1:-1)*30}px"></div>`).join(''):''}
        ${!d?`<div class="hero-ornament hero-ornament-tl"></div><div class="hero-ornament hero-ornament-tl2"></div><div class="hero-ornament hero-ornament-br"></div><div class="hero-ornament hero-ornament-br2"></div><div class="hero-float-dot" style="width:7px;height:7px;background:rgba(180,83,9,.45);top:18%;left:12%;animation-duration:4s"></div><div class="hero-float-dot" style="width:5px;height:5px;background:rgba(5,150,105,.45);top:65%;left:8%;animation-duration:5.5s;animation-delay:.8s"></div><div class="hero-float-dot" style="width:6px;height:6px;background:rgba(180,83,9,.35);top:22%;right:10%;animation-duration:6s;animation-delay:.3s"></div><div class="hero-float-dot" style="width:4px;height:4px;background:rgba(5,150,105,.55);top:68%;right:14%;animation-duration:4.5s;animation-delay:1.2s"></div><div class="hero-float-dot" style="width:9px;height:9px;background:rgba(201,162,39,.3);top:40%;left:5%;animation-duration:7s;animation-delay:.5s"></div>`:''}
        <div style="position:relative;z-index:2;text-align:center;max-width:680px;margin:0 auto">
            ${!d?`<div class="hero-bismillah-pill"><div class="hero-bismillah-line"></div><p class="arabic-text" dir="rtl" style="font-size:1.4rem;margin:0;color:#78350f">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p><div class="hero-bismillah-line hero-bismillah-line-r"></div></div>`:
            `<div style="display:inline-flex;align-items:center;gap:10px;padding:10px 24px;border-radius:50px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(8px);margin-bottom:1.5rem"><p class="arabic-text" dir="rtl" style="font-size:1.4rem;margin:0;text-shadow:0 0 30px rgba(180,83,9,.5)">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p></div>`}
            ${!d?`<div class="hero-crescent-badge">☽</div><p class="hero-arabic-sub">آلُ بَيْتِ النَّبِيِّ ﷺ</p>`:''}
            <h2 style="font-size:clamp(2.2rem,6vw,3.4rem);font-weight:900;line-height:1.1;margin-bottom:.5rem;${d?'text-shadow:0 4px 20px rgba(0,0,0,.25)':''};color:${d?'#fff':'#022c22'};font-family:'Amiri',serif">${l==='bn'?'আহলে বাইত (আ.)':'Ahl al-Bayt (a.s)'}</h2>
            ${!d?`<div class="hero-divider-dots"><span class="hero-divider-dot"></span><span class="hero-divider-dot hero-divider-dot-mid"></span><span class="hero-divider-dot"></span></div>`:''}
            <p style="font-size:clamp(.9rem,2.5vw,1.05rem);margin-bottom:2rem;line-height:1.7;color:${d?'rgba(255,255,255,.8)':'rgba(2,44,34,.6)'};max-width:480px;margin-left:auto;margin-right:auto">${l==='bn'?'কুরআন, হাদিস ও পবিত্র ইমামদের শিক্ষায় আলোকিত হোন':'Enlighten yourself with Quran, Hadith & Holy Imams\' teachings'}</p>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                <button data-action="changePage" data-param="dua" class="btn-primary" style="background:linear-gradient(135deg,#b45309,#92400e);color:white;padding:13px 28px;border-radius:50px;font-weight:700;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(180,83,9,.4);display:flex;align-items:center;gap:7px;font-size:.93rem;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 12px 32px rgba(180,83,9,.5)'" onmouseout="this.style.transform='';this.style.boxShadow='0 8px 24px rgba(180,83,9,.4)'">📿 ${l==='bn'?'দোয়া পড়ুন':'Read Duas'}</button>
                <button data-action="changePage" data-param="imams" class="btn-primary" style="background:${d?'rgba(255,255,255,.12)':'rgba(255,255,255,.7)'};color:${d?'white':'#022c22'};padding:13px 28px;border-radius:50px;font-weight:700;border:1.5px solid ${d?'rgba(255,255,255,.3)':'rgba(5,150,105,.3)'};cursor:pointer;backdrop-filter:blur(8px);display:flex;align-items:center;gap:7px;font-size:.93rem;transition:transform .2s,background .2s" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">👑 ${l==='bn'?'ইমামগণ':'The Imams'}</button>
                <button data-action="changePage" data-param="blog" class="btn-primary" style="background:rgba(5,150,105,.12);color:${d?'#6ee7b7':'#065f46'};padding:13px 28px;border-radius:50px;font-weight:700;border:1.5px solid rgba(5,150,105,.28);cursor:pointer;backdrop-filter:blur(8px);display:flex;align-items:center;gap:7px;font-size:.93rem;transition:transform .2s,background .2s" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">📖 ${l==='bn'?'ব্লগ':'Blog'}</button>
            </div>
            ${!d?`<div class="hero-stats-row"><div class="hero-stat-item"><span class="hero-stat-num">${l==='bn'?'১২':'12'}</span><div class="hero-stat-label">${l==='bn'?'পবিত্র ইমাম':'Holy Imams'}</div></div><div class="hero-stat-item"><span class="hero-stat-num">${l==='bn'?'৯৯+':'99+'}</span><div class="hero-stat-label">${l==='bn'?'দোয়া ও যিয়ারত':'Duas & Ziyarat'}</div></div><div class="hero-stat-item"><span class="hero-stat-num">${l==='bn'?'৯৯':'99'}</span><div class="hero-stat-label">${l==='bn'?'আসমাউল হুসনা':'Names of Allah'}</div></div></div>`:''}
        </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-14">
        ${[['📖',l==='bn'?'ব্লগ':'Blog',l==='bn'?'ইসলামিক লেখা':'Islamic writings','blog','#059669','rgba(5,150,105,.1)','rgba(5,150,105,.25)',l==='bn'?'ব্লগ':'Blog'],['📚',l==='bn'?'লাইব্রেরি':'Library',l==='bn'?'ইসলামিক বই':'Islamic books','library','#0369a1','rgba(3,105,161,.1)','rgba(3,105,161,.25)',l==='bn'?'লাইব্রেরি':'Library'],['📿',l==='bn'?'তাসবিহ':'Tasbeeh',l==='bn'?'ডিজিটাল তাসবিহ':'Digital tasbeeh','tasbeeh','#059669','rgba(5,150,105,.1)','rgba(5,150,105,.25)',l==='bn'?'তাসবিহ':'Tasbeeh'],['🧠',l==='bn'?'কুইজ':'Quiz',l==='bn'?'জ্ঞান পরীক্ষা':'Test knowledge','quiz','#dc2626','rgba(220,38,38,.1)','rgba(220,38,38,.25)',l==='bn'?'কুইজ':'Quiz'],['☀️',l==='bn'?'৯৯ নাম':'99 Names',l==='bn'?'আসমাউল হুসনা':'Names of Allah','asmaul','#b45309','rgba(180,83,9,.1)','rgba(180,83,9,.25)',l==='bn'?'৯৯ নাম':'Names'],['🧭',l==='bn'?'কিবলা':'Qibla',l==='bn'?'কিবলার দিক':'Qibla direction','qibla','#0d9488','rgba(13,148,136,.1)','rgba(13,148,136,.25)',l==='bn'?'কিবলা':'Qibla']].map(([icon,title,desc,page,color,bg,faint,badge],fi)=>`
            <button data-action="changePage" data-param="${page}" class="feature-card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border text-left w-full p-5 reveal reveal-delay-${fi%4+1}" style="box-shadow:var(--shadow-sm);--fc-accent:${color};--fc-accent-bg:${bg};--fc-accent-faint:${faint}">
                <span class="feature-card-badge">${badge}</span>
                <div class="feature-card-content">
                    <div class="feature-icon-wrap" style="background:${bg}">${icon}</div>
                    <h3 class="font-bold text-sm mb-1">${title}</h3>
                    <p class="text-xs ${d?'text-gray-400':'text-gray-500'} leading-relaxed">${desc}</p>
                    <div class="feature-card-link">${l==='bn'?'দেখুন':'Explore'} <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg></div>
                </div>
            </button>`).join('')}
    </div>
    <!-- ── ইসলামিক ক্যালেন্ডার কুইক অ্যাকসেস ── -->
    <div class="mb-10">
        <h3 class="text-base font-bold mb-3 flex items-center gap-2">
            <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#dc2626,#7c1d1d);display:inline-flex;align-items:center;justify-content:center">🌙</span>
            ${l==='bn'?'ইসলামিক ক্যালেন্ডার ও বিশেষ দিন':'Islamic Calendar & Special Days'}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5" style="min-height:130px">
            ${(()=>{
                const h=approxHijriNow();
                const ashuraYear=(h.month>1||(h.month===1&&h.day>10))?h.year+1:h.year;
                const ashuraGreg=hijriToGregorian(10,1,ashuraYear);
                const today=new Date(); today.setHours(0,0,0,0); ashuraGreg.setHours(0,0,0,0);
                const daysLeft=Math.ceil((ashuraGreg-today)/86400000);
                const cdLabel=daysLeft===0?'🔴 আজ আশুরা':daysLeft<0?'কারবালার ঘটনা জানুন':`আশুরা ${l==='bn'?toBengaliDigits(daysLeft):daysLeft} দিন বাকি`;
                return [
                    {page:'muharram',icon:'🌙',grad:'linear-gradient(135deg,#7f1d1d,#dc2626)',title:l==='bn'?'মুহাররম ও আশুরা':'Muharram & Ashura',desc:cdLabel},
                    {page:'shia-days',icon:'✨',grad:'linear-gradient(135deg,#1e3a8a,#7c3aed)',title:l==='bn'?'শিয়া বিশেষ দিন':'Shia Special Days',desc:l==='bn'?'ঈদে গাদির · মুবাহিলা · নিমে শাবান':'Ghadeer · Mubahila · Mid-Shaban'},
                    {page:'calendar',icon:'📅',grad:'linear-gradient(135deg,#065f46,#059669)',title:l==='bn'?'হিজরি ক্যালেন্ডার':'Hijri Calendar',desc:l==='bn'?'ইমামদের তারিখ হাইলাইট সহ':'With Imam dates highlighted'},
                ].map(c=>`
                <button data-action="changePage" data-param="${c.page}" class="text-left rounded-2xl hover:brightness-110 transition-all focus:outline-none" style="background:${c.grad};padding:1.1rem 1.1rem 1.4rem;box-shadow:0 4px 16px rgba(0,0,0,.2)">
                    <div style="font-size:1.8rem;margin-bottom:.4rem">${c.icon}</div>
                    <h4 style="font-weight:800;font-size:.93rem;color:white;margin-bottom:.2rem">${c.title}</h4>
                    <p style="font-size:.75rem;color:rgba(255,255,255,.8)">${c.desc}</p>
                </button>`).join('');
            })()}
        </div>
    </div>

    <div class="grid md:grid-cols-3 gap-8 mt-2">
        <div class="md:col-span-2 space-y-8">
            <div>
                <div class="section-heading"><h3 class="section-title">${t('latestPosts')}</h3><button data-action="changePage" data-param="blog" class="text-xs font-bold px-3 py-1.5 rounded-full hover:scale-105 transition-all" style="background:rgba(5,150,105,.1);color:#059669">${t('viewAll')} →</button></div>
                <div class="grid gap-4">
                    ${blogPosts.slice(0,3).map((post,idx)=>{const ac=['#059669','#7c3aed','#b45309'][idx%3];return`
                    <article class="blog-card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border reveal reveal-delay-${idx+1}" style="box-shadow:var(--shadow-sm)">
                        <div style="height:3px;background:linear-gradient(90deg,${ac},${['#7c3aed','#b45309','#059669'][idx%3]});border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
                        <div class="p-5">
                            <div class="flex items-center gap-2 mb-3 flex-wrap"><span class="text-xs px-2.5 py-1 rounded-full font-bold" style="background:${ac}14;color:${ac}">${sanitize(post.category)}</span><span class="text-xs ${d?'text-gray-400':'text-gray-400'}">⏱ ${sanitize(post.readTime)}</span></div>
                            <h4 class="text-lg font-bold mb-2 leading-snug">${sanitize(l==='bn'?post.titleBn:post.titleEn)}</h4>
                            <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mb-4 leading-relaxed">${sanitize(post.excerpt)}</p>
                            <div class="flex items-center gap-3">
                                <button data-action="readPost" data-param="${post.id}" class="btn-primary text-sm font-bold px-4 py-2 rounded-xl" style="background:${ac}14;color:${ac}">${t('readMore')} →</button>
                                <button data-action="toggleBookmark" data-param="${post.id}" data-param2="post" class="ml-auto text-lg hover:scale-125 transition-all">${isBookmarked(post.id,'post')?'🔖':'🤍'}</button>
                            </div>
                        </div>
                    </article>`;}).join('')}
                </div>
            </div>
        </div>
        <div class="space-y-5">
            ${renderPrayerWidget()}
            <div class="card-luxury ${d?'bg-gradient-to-br from-purple-950 to-blue-950 border-purple-900':'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border p-5" style="box-shadow:var(--shadow-md)">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-bold flex items-center gap-2"><span>📜</span>${t('hadithOfDay')}</h3>
                    ${state.isAdmin?`<button data-action="openHadithEditor" class="${d?'bg-purple-800 text-purple-200':'bg-purple-100 text-purple-700'} text-xs px-3 py-1 rounded-lg font-semibold hover:opacity-80">✏️ ${l==='bn'?'এডিট':'Edit'}</button>`:''}
                </div>
                <div class="${d?'bg-black/20':'bg-white/60'} rounded-2xl p-4">
                    <p class="text-sm leading-relaxed mb-3 italic">"${sanitize(l==='bn'?getDailyHadith().textBn:getDailyHadith().textEn)}"</p>
                    <p class="text-xs font-bold" style="${d?'color:#fbbf24':'color:#92400e'}">— ${sanitize(l==='bn'?getDailyHadith().sourceBn:getDailyHadith().sourceEn)}</p>
                </div>
            </div>
            <!-- Daily Ayah Widget -->
            <div class="ayah-widget p-5" style="box-shadow:var(--shadow-md)">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-bold flex items-center gap-2">
                        <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#c9a227,#b45309);display:flex;align-items:center;justify-content:center;font-size:.8rem">📖</span>
                        ${l==='bn'?'আজকের আয়াত':'Today\'s Verse'}
                    </h3>
                    ${state.isAdmin?`<button data-action="openAyahEditor" class="${d?'bg-amber-900 text-amber-200':'bg-amber-100 text-amber-700'} text-xs px-3 py-1 rounded-lg font-semibold hover:opacity-80">✏️ ${l==='bn'?'এডিট':'Edit'}</button>`:''}
                </div>
                ${renderDailyAyahInner(d,l)}
            </div>
            <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-5" style="box-shadow:var(--shadow-sm)">
                <h3 class="text-sm font-bold mb-4">${l==='bn'?'আমাদের অনুসরণ করুন':'Follow Us'}</h3>
                <div class="space-y-2">
                    ${[
['https://www.facebook.com/profile.php?id=100090495041094',l==='bn'?'ফেসবুক পেজ':'Facebook','#1d4ed8','rgba(29,78,216,.12)','<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'],
['https://www.instagram.com/ahl.al.bayt.a.s/',l==='bn'?'ইনস্টাগ্রাম':'Instagram','#be185d','rgba(190,24,93,.12)','<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>'],
['https://www.youtube.com/@Ahl_al-Bayt_a.s',l==='bn'?'ইউটিউব':'YouTube','#dc2626','rgba(220,38,38,.12)','<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>'],
['https://x.com/Ahl_al_Bayt_a_s',l==='bn'?'টুইটার (X)':'Twitter (X)','#000000','rgba(0,0,0,.1)','<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>']
].map(([href,label,color,bg,icon])=>`
                    <a href="${href}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:translate-x-1 hover:scale-[1.01]" style="background:${bg};color:${color};border:1px solid ${color}22">
                        ${icon}<span class="flex-1">${label}</span><svg class="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </a>`).join('')}
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// PAGE: LIBRARY (PDF)
// ============================================================================
function renderLibraryPage() {
    const d=state.darkMode; const l=state.language;
    return `
    <div class="space-y-8">
        <!-- Header with tabs -->
        <div class="flex flex-wrap justify-between items-center gap-4">
            <h2 class="text-3xl font-bold">📕 ${t('library')}</h2>
            ${state.isAdmin?`<button data-action="openUploadModal" data-param="pdf"
                class="${d?'bg-green-900 text-green-300':'bg-green-600 text-white'} px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-green-500"
            >+ ${l==='bn'?'পিডিএফ আপলোড':'Upload PDF'}</button>`
            :`<p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'🔐 অ্যাডমিন আপলোড করবেন':'🔐 Admin uploads content'}</p>`}
        </div>

        <!-- Tab bar -->
        <div class="flex gap-3 flex-wrap">
            <div class="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm" style="background:linear-gradient(135deg,#059669,#065f46);color:white;box-shadow:0 4px 12px rgba(5,150,105,.3)">
                📕 ${l==='bn'?'পিডিএফ লাইব্রেরি':'PDF Library'}
            </div>
            <button data-action="changePage" data-param="dua"
                class="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm border transition-all hover:scale-[1.02]"
                style="background:${d?'rgba(180,83,9,.15)':'rgba(180,83,9,.08)'};color:#b45309;border-color:${d?'rgba(180,83,9,.3)':'rgba(180,83,9,.2)'}">
                🤲 ${l==='bn'?'দোয়া ও যিয়ারত':'Duas & Ziyarat'}
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg>
            </button>
        </div>
        ${state.pdfList.length===0?`
            <div class="text-center py-16 ${d?'text-gray-400':'text-gray-500'}">
                <svg class="mx-auto mb-6" width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="60" cy="60" r="56" fill="${d?'#1f2937':'#f0fdf4'}" stroke="${d?'#374151':'#bbf7d0'}" stroke-width="2"/>
                    <rect x="30" y="38" width="28" height="40" rx="4" fill="${d?'#065f46':'#86efac'}" opacity="0.7"/>
                    <rect x="45" y="32" width="28" height="40" rx="4" fill="${d?'#047857':'#4ade80'}" opacity="0.8"/>
                    <rect x="60" y="38" width="28" height="40" rx="4" fill="${d?'#059669':'#16a34a'}" opacity="0.9"/>
                    <path d="M50 82 Q60 90 70 82" stroke="${d?'#34d399':'#059669'}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    <circle cx="60" cy="72" r="3" fill="${d?'#6ee7b7':'#059669'}">
                        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
                    </circle>
                </svg>
                <p class="text-xl font-bold mb-2">${l==='bn'?'লাইব্রেরি এখনো খালি':'Library is empty'}</p>
                <p class="text-sm mb-4 ${d?'text-gray-500':'text-gray-400'}">${l==='bn'?'এখনো কোনো পিডিএফ আপলোড হয়নি':'No PDFs have been uploaded yet'}</p>
                ${state.isAdmin?`<button data-action="openUploadModal" data-param="pdf" class="${d?'bg-green-800 text-green-200':'bg-green-600 text-white'} px-6 py-2.5 rounded-xl font-semibold hover:opacity-90">${l==='bn'?'+ পিডিএফ আপলোড করুন':'+ Upload PDF'}</button>`:`<p class="text-xs">${l==='bn'?'🔐 অ্যাডমিন শীঘ্রই আপলোড করবেন':'🔐 Admin will upload soon'}</p>`}
            </div>`:`
            
            <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                ${state.pdfList.map(pdf=>`
                    <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-5 fade-in flex flex-col card-hover">
                        <div class="${d?'bg-green-900':'bg-green-50'} w-full h-40 rounded-xl flex items-center justify-center text-5xl mb-4">📕</div>
                        <h3 class="font-bold text-base mb-1 flex-1">${sanitize(pdf.name)}</h3>
                        <p class="text-xs ${d?'text-gray-400':'text-gray-500'} mb-4">${sanitize(pdf.sizeFmt)} • ${sanitize(pdf.uploadDate)}</p>
                        <div class="flex gap-2">
                            <button data-action="openViewer" data-param="${pdf.id}" data-vtype="pdf" data-listkey="pdfList"
                                class="${d?'bg-blue-900 text-blue-300':'bg-blue-600 text-white'} flex-1 py-2 rounded-lg text-sm font-semibold hover:opacity-90 focus:outline-none"
                            >👁 ${l==='bn'?'পড়ুন':'Read'}</button>
                            <button data-action="downloadFile" data-param="${pdf.id}" data-name="${sanitize(pdf.name)}"
                                class="${d?'bg-green-900 text-green-300':'bg-green-600 text-white'} flex-1 py-2 rounded-lg text-sm font-semibold hover:opacity-90 focus:outline-none"
                            >⬇ ${l==='bn'?'ডাউনলোড':'Download'}</button>
                            ${state.isAdmin?`<button data-action="deleteFile" data-param="${pdf.id}" data-listkey="pdfList"
                                class="${d?'bg-red-900 text-red-300':'bg-red-600 text-white'} px-3 py-2 rounded-lg text-sm hover:opacity-90 focus:outline-none"
                            >🗑</button>`:''}
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
    const tabs = [
        {key:'imageList',label:l==='bn'?'ছবি':'Images',icon:'🖼️',type:'image',uploadKey:'image'},
        {key:'videoList',label:l==='bn'?'ভিডিও':'Videos',icon:'🎬',type:'video',uploadKey:'video'},
        {key:'audioList',label:l==='bn'?'অডিও':'Audio',icon:'🎵',type:'audio',uploadKey:'audio'}
    ];
    return `
    <div class="space-y-10">
        <h2 class="text-3xl font-bold">🎭 ${t('media')}</h2>
        ${tabs.map(tab=>`
        <div>
            <div class="flex flex-wrap justify-between items-center mb-5 gap-3">
                <h3 class="text-xl font-bold">${tab.icon} ${tab.label}</h3>
                ${state.isAdmin?`<button data-action="openUploadModal" data-param="${tab.uploadKey}"
                    class="${d?'bg-purple-900 text-purple-300':'bg-purple-600 text-white'} px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 focus:outline-none"
                >+ ${l==='bn'?'আপলোড':'Upload'}</button>`:''}
            </div>
            ${state[tab.key].length===0?`
                <div class="text-center py-12 ${d?'text-gray-500':'text-gray-400'} border-2 border-dashed ${d?'border-gray-700':'border-gray-200'} rounded-2xl">
                    <div class="text-5xl mb-3 opacity-60">${tab.icon}</div>
                    <p class="font-semibold">${l==='bn'?`কোনো ${tab.label} নেই`:`No ${tab.label} yet`}</p>
                    <p class="text-xs mt-1 ${d?'text-gray-600':'text-gray-400'}">${l==='bn'?'অ্যাডমিন শীঘ্রই যোগ করবেন':'Admin will add content soon'}</p>
                </div>`:`
                <div class="grid sm:grid-cols-2 ${tab.type==='audio'?'md:grid-cols-2':'md:grid-cols-3'} gap-5">
                    ${state[tab.key].map(item=>renderMediaCard(item,tab.type,tab.key,d,l)).join('')}
                </div>`}
        </div>`).join('')}
    </div>`;
}

function renderMediaCard(item, type, listKey, d, l) {
    const thumb = type==='image'
        ? `<div class="${d?'bg-gray-700':'bg-gray-100'} h-44 rounded-xl overflow-hidden flex items-center justify-center mb-3">
               ${item.cloudUrl
                   ? `<img src="${item.cloudUrl}" class="w-full h-full object-cover" alt="${sanitize(item.name)}" loading="lazy" />`
                   : `<img src="" data-src-id="${item.id}" class="lazy-img w-full h-full object-cover" alt="${sanitize(item.name)}" loading="lazy" />`
               }
           </div>`
        : type==='video'
        ? `<div class="${d?'bg-gray-900':'bg-gray-800'} h-44 rounded-xl overflow-hidden flex items-center justify-center mb-3 relative">
               ${item.cloudUrl?`<video src="${item.cloudUrl}" class="w-full h-full object-cover opacity-70" muted preload="metadata" style="pointer-events:none"></video>`:`<div class="text-5xl">🎬</div>`}
               <div class="absolute inset-0 flex items-center justify-center">
                   <div class="w-14 h-14 rounded-full flex items-center justify-center" style="background:rgba(5,150,105,0.85);box-shadow:0 4px 20px rgba(5,150,105,.5)"><span style="font-size:1.4rem;margin-left:3px">▶</span></div>
               </div>
           </div>`
        : `<div class="${d?'bg-gradient-to-br from-gray-800 to-gray-900':'bg-gradient-to-br from-green-50 to-emerald-100'} h-28 rounded-xl flex items-center justify-center mb-3">
               <div class="text-4xl">🎵</div>
           </div>`;

    return `
    <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-4 fade-in card-hover">
        ${thumb}
        <h4 class="font-semibold text-sm mb-1 truncate">${sanitize(item.name)}</h4>
        <p class="text-xs ${d?'text-gray-400':'text-gray-500'} mb-3">${sanitize(item.sizeFmt)} • ${sanitize(item.uploadDate)}</p>
        <div class="flex gap-2">
            <button data-action="openViewer" data-param="${item.id}" data-vtype="${type}" data-listkey="${listKey}"
                class="${d?'bg-blue-900 text-blue-300':'bg-blue-600 text-white'} flex-1 py-2 rounded-lg text-xs font-semibold hover:opacity-90"
            >👁 ${l==='bn'?(type==='image'?'দেখুন':type==='video'?'দেখুন':'শুনুন'):(type==='audio'?'Play':'View')}</button>
            <button data-action="downloadFile" data-param="${item.id}" data-name="${sanitize(item.name)}"
                class="${d?'bg-green-900 text-green-300':'bg-green-600 text-white'} flex-1 py-2 rounded-lg text-xs font-semibold hover:opacity-90"
            >⬇ ${l==='bn'?'ডাউনলোড':'Download'}</button>
            ${state.isAdmin?`<button data-action="deleteFile" data-param="${item.id}" data-listkey="${listKey}"
                class="${d?'bg-red-900 text-red-300':'bg-red-600 text-white'} px-3 py-2 rounded-lg text-xs hover:opacity-90"
            >🗑</button>`:''}
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
function renderBlogPage()
{
    const d=state.darkMode; const l=state.language;
    const allPosts=[...state.customPosts,...blogPosts];
    const ac=['#059669','#7c3aed','#b45309','#0369a1','#be185d','#dc2626'];
    const featured=allPosts[0]; const rest=allPosts.slice(1);
    return `
    <div class="space-y-10 page-enter">
        <div class="flex flex-wrap justify-between items-end gap-4">
            <div><h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">📝 ${t('blog')}</h2><p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'ইসলামিক জ্ঞান ও অন্তর্দৃষ্টি':'Islamic knowledge & insights'}</p></div>
            ${state.isAdmin?`<button data-action="openBlogEditor" class="btn-primary px-5 py-2.5 rounded-2xl font-bold text-sm text-white flex items-center gap-2" style="background:linear-gradient(135deg,#059669,#065f46);box-shadow:0 4px 16px rgba(5,150,105,.4)">+ ${t('newPost')}</button>`:''}
        </div>
        ${featured?`
        <article class="blog-card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border reveal" style="box-shadow:var(--shadow-lg)">
            <div style="height:4px;background:linear-gradient(90deg,#059669,#7c3aed,#b45309);border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
            <div class="p-7 md:p-8">
                <div class="flex flex-wrap items-center gap-3 mb-4">
                    <span class="text-xs px-3 py-1.5 rounded-full font-bold" style="background:rgba(5,150,105,.15);color:#059669;border:1px solid rgba(5,150,105,.25)">⭐ ${l==='bn'?'ফিচার্ড':'Featured'}</span>
                    <span class="text-xs px-3 py-1.5 rounded-full font-semibold" style="background:rgba(124,58,237,.12);color:#7c3aed">${sanitize(featured.category||'')}</span>
                    <span class="text-xs ${d?'text-gray-400':'text-gray-400'}">⏱ ${sanitize(featured.readTime||'')}</span>
                </div>
                <h3 class="text-2xl md:text-3xl font-black mb-3 leading-snug">${sanitize(l==='bn'?featured.titleBn:featured.titleEn)}</h3>
                <p class="text-sm md:text-base ${d?'text-gray-400':'text-gray-600'} mb-6 leading-relaxed">${sanitize(featured.excerpt||'')}</p>
                <div class="flex items-center gap-3 flex-wrap">
                    <button data-action="readPost" data-param="${featured.id}" class="btn-primary px-6 py-2.5 rounded-2xl font-bold text-sm text-white flex items-center gap-2" style="background:linear-gradient(135deg,#059669,#065f46);box-shadow:0 6px 20px rgba(5,150,105,.4)">${t('readMore')} →</button>
                    <button data-action="toggleBookmark" data-param="${featured.id}" data-param2="post" class="ml-auto text-xl hover:scale-125 transition-all">${isBookmarked(featured.id,'post')?'🔖':'🤍'}</button>
                    ${state.isAdmin&&String(featured.id).startsWith('custom_')?`<button data-action="openBlogEditorEdit" data-param="${featured.id}" class="text-blue-400 text-sm p-1.5">✏️</button><button data-action="deleteCustomPost" data-param="${featured.id}" class="text-red-400 text-sm p-1.5">🗑</button>`:''}
                </div>
            </div>
        </article>`:''}
        ${rest.length?`
        <div>
            <div class="section-heading"><h3 class="section-title">${l==='bn'?'সকল লেখা':'All Posts'}</h3></div>
            <div class="grid md:grid-cols-2 gap-5">
                ${rest.map((post,idx)=>{const a=ac[idx%ac.length];const d2=(idx%4)+1;return`
                <article class="blog-card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border reveal reveal-delay-${d2}" style="box-shadow:var(--shadow-sm)">
                    <div style="height:3px;background:linear-gradient(90deg,${a},${ac[(idx+2)%ac.length]});border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
                    <div class="p-5">
                        <div class="flex items-center gap-2 mb-3 flex-wrap"><span class="text-xs px-2.5 py-1 rounded-full font-bold" style="background:${a}14;color:${a}">${sanitize(post.category||'')}</span><span class="text-xs ${d?'text-gray-500':'text-gray-400'}">⏱ ${sanitize(post.readTime||'')}</span>${String(post.id).startsWith('custom_')?`<span class="text-xs px-2 py-0.5 rounded-full ${d?'bg-blue-900/60 text-blue-300':'bg-blue-50 text-blue-600'} font-semibold">${l==='bn'?'কাস্টম':'Custom'}</span>`:''}</div>
                        <h3 class="text-lg font-bold mb-2 leading-snug line-clamp-2">${sanitize(l==='bn'?post.titleBn:post.titleEn)}</h3>
                        <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mb-4 leading-relaxed line-clamp-3">${sanitize(post.excerpt||'')}</p>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button data-action="readPost" data-param="${post.id}" class="text-sm font-bold px-4 py-2 rounded-xl hover:scale-[1.03] transition-all" style="background:${a}14;color:${a};border:1px solid ${a}20">${t('readMore')} →</button>
                            <button data-action="toggleBookmark" data-param="${post.id}" data-param2="post" class="ml-auto text-lg hover:scale-125 transition-all">${isBookmarked(post.id,'post')?'🔖':'🤍'}</button>
                            ${state.isAdmin&&String(post.id).startsWith('custom_')?`<button data-action="openBlogEditorEdit" data-param="${post.id}" class="text-blue-400 text-sm p-1">✏️</button><button data-action="deleteCustomPost" data-param="${post.id}" class="text-red-400 text-sm p-1">🗑</button>`:''}
                        </div>
                    </div>
                </article>`}).join('')}
            </div>
        </div>`:'' }
    </div>`;
}

// ============================================================================
// PAGE: DUA
// ============================================================================
function renderDuaPage() {
    const d=state.darkMode; const l=state.language;
    const tab = state.duaTab || 'dua'; // 'dua' | 'ziyarat'
    const allDuas = [...state.customDuas, ...duas];
    const allZiyarat = state.customZiyarat;
    return `
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-center gap-3 page-enter">
            <h2 class="text-3xl font-bold">🤲 ${t('dua')}</h2>
            ${state.isAdmin ? `
            <div class="flex gap-2 flex-wrap">
                ${tab==='dua'?`<button data-action="openDuaEditor" data-param="dua" class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">+ ${l==='bn'?'নতুন দোয়া':'Add Dua'}</button>`:''}
                ${tab==='ziyarat'?`<button data-action="openDuaEditor" data-param="ziyarat" class="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">+ ${l==='bn'?'নতুন যিয়ারত':'Add Ziyarat'}</button>`:''}
                ${tab==='nahjul'?`<button data-action="openKnowledgeEditor" data-param="nahjul" class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">+ ${l==='bn'?'নতুন খুতবা/বাণী যোগ':'Add Sermon/Letter'}</button>`:''}
                ${tab==='sahifa'?`<button data-action="openKnowledgeEditor" data-param="sahifa" class="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">+ ${l==='bn'?'নতুন দুআ যোগ':'Add Prayer'}</button>`:''}
                ${tab==='imamhadiths'?`<button data-action="openKnowledgeEditor" data-param="imamhadiths" class="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">+ ${l==='bn'?'নতুন হাদিস যোগ':'Add Hadith'}</button>`:''}
                ${tab==='specialdays'?`<button data-action="openKnowledgeEditor" data-param="specialdays" class="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">+ ${l==='bn'?'নতুন দিন যোগ':'Add Special Day'}</button>`:''}
            </div>` : ''}
        </div>

        <!-- Tabs -->
        <div class="flex flex-wrap gap-2 ${d?'bg-gray-800':'bg-gray-100'} p-1 rounded-2xl w-fit">
            <button data-action="setDuaTab" data-param="dua"
                class="${tab==='dua'?(d?'bg-green-700 text-white shadow':'bg-white text-green-700 shadow-sm'):(d?'text-gray-400 hover:text-white':'text-gray-500 hover:text-gray-900')} px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                🤲 ${l==='bn'?'দোয়া':'Duas'} <span class="ml-1 text-xs opacity-70">${allDuas.length}</span>
            </button>
            <button data-action="setDuaTab" data-param="ziyarat"
                class="${tab==='ziyarat'?(d?'bg-amber-700 text-white shadow':'bg-white text-amber-700 shadow-sm'):(d?'text-gray-400 hover:text-white':'text-gray-500 hover:text-gray-900')} px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                ☪️ ${l==='bn'?'যিয়ারত':'Ziyarat'} <span class="ml-1 text-xs opacity-70">${allZiyarat.length}</span>
            </button>
            <button data-action="setDuaTab" data-param="nahjul"
                class="${tab==='nahjul'?(d?'bg-blue-700 text-white shadow':'bg-white text-blue-700 shadow-sm'):(d?'text-gray-400 hover:text-white':'text-gray-500 hover:text-gray-900')} px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                📖 ${l==='bn'?'নাহজুল বালাগা':'Nahjul Balagha'} <span class="ml-1 text-xs opacity-70">${state.nahjulBalagha.length}</span>
            </button>
            <button data-action="setDuaTab" data-param="sahifa"
                class="${tab==='sahifa'?(d?'bg-purple-700 text-white shadow':'bg-white text-purple-700 shadow-sm'):(d?'text-gray-400 hover:text-white':'text-gray-500 hover:text-gray-900')} px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                🌹 ${l==='bn'?'সাহিফা সাজ্জাদিয়্যা':'Sahifa Sajjadiya'} <span class="ml-1 text-xs opacity-70">${state.sahifaSajjadiya.length}</span>
            </button>
            <button data-action="setDuaTab" data-param="imamhadiths"
                class="${tab==='imamhadiths'?(d?'bg-teal-700 text-white shadow':'bg-white text-teal-700 shadow-sm'):(d?'text-gray-400 hover:text-white':'text-gray-500 hover:text-gray-900')} px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                ⭐ ${l==='bn'?'ইমামদের হাদিস':'Imam Hadiths'} <span class="ml-1 text-xs opacity-70">${state.imamHadiths.length}</span>
            </button>
            <button data-action="setDuaTab" data-param="specialdays"
                class="${tab==='specialdays'?(d?'bg-rose-700 text-white shadow':'bg-white text-rose-700 shadow-sm'):(d?'text-gray-400 hover:text-white':'text-gray-500 hover:text-gray-900')} px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                ✨ ${l==='bn'?'বিশেষ দিন':'Special Days'} <span class="ml-1 text-xs opacity-70">${state.specialDays.length}</span>
            </button>
        </div>

        <!-- DUA TAB -->
        ${tab==='dua' ? `
        <div class="space-y-5">
            ${allDuas.length===0 ? `
            <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
                <div class="text-5xl mb-3">🤲</div>
                <p>${l==='bn'?'কোনো দোয়া নেই':'No duas yet'}</p>
            </div>` :
            allDuas.map((dua,i)=>{
                const isCustom = !!dua.id;
                const idx = isCustom ? i : (i - state.customDuas.length);
                return `
                <article class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6 card-hover dua-card-accent fade-in" style="box-shadow:var(--shadow-card)">
                    <div class="flex items-start justify-between gap-3 mb-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                ${isCustom ? `<span class="${d?'gold-badge-dark':'gold-badge'}">${l==='bn'?'কাস্টম':'Custom'}</span>` : ''}
                                <h3 class="text-xl font-bold">${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}</h3>
                            </div>
                            ${dua.source ? `<p class="text-xs ${d?'text-gray-400':'text-gray-500'}">${sanitize(dua.source)}</p>` : ''}
                        </div>
                        ${state.isAdmin && isCustom ? `
                        <div class="flex gap-1 flex-shrink-0">
                            <button data-action="editCustomDua" data-param="${dua.id}" data-dtype="dua"
                                class="${d?'bg-blue-900 text-blue-300 hover:bg-blue-800':'bg-blue-100 text-blue-700 hover:bg-blue-200'} p-2 rounded-lg text-sm transition-colors" title="${l==='bn'?'সম্পাদনা':'Edit'}">✏️</button>
                            <button data-action="deleteCustomDua" data-param="${dua.id}" data-dtype="dua"
                                class="${d?'bg-red-900 text-red-300 hover:bg-red-800':'bg-red-100 text-red-700 hover:bg-red-200'} p-2 rounded-lg text-sm transition-colors" title="${l==='bn'?'মুছুন':'Delete'}">🗑</button>
                        </div>` : ''}
                    </div>
                    <div class="${d?'bg-gray-900 border-gray-700':'bg-amber-50 border-amber-100'} border rounded-xl p-5 mb-4">
                        <p class="arabic-text arabic-reveal text-center mb-3" dir="rtl" lang="ar" style="font-size:1.6rem;line-height:2.2">${sanitize(dua.arabic)}</p>
                        ${dua.transliteration ? `<p class="text-center text-xs italic ${d?'text-gray-400':'text-gray-500'} mb-2">${sanitize(dua.transliteration)}</p>` : ''}
                        <p class="text-center text-sm ${d?'text-gray-300':'text-gray-600'} leading-relaxed">${sanitize(l==='bn'?dua.meaningBn:dua.meaningEn)}</p>
                    </div>
                    <button data-action="readDua" data-param="${isCustom?'c'+dua.id:idx}" class="${d?'text-green-400':'text-green-600'} font-semibold hover:underline text-sm">${t('readMore')} →</button>
                </article>`}).join('')}
        </div>` : ''}

        <!-- ZIYARAT TAB -->
        ${tab==='ziyarat' ? `
        <div class="space-y-5">
            ${allZiyarat.length===0 ? `
            <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
                <div class="text-5xl mb-3">☪️</div>
                <p class="text-lg font-medium mb-1">${l==='bn'?'কোনো যিয়ারত নেই':'No Ziyarat yet'}</p>
                ${state.isAdmin ? `<p class="text-sm">${l==='bn'?'উপরের বাটন থেকে যিয়ারত যোগ করুন':'Use the button above to add Ziyarat'}</p>` : ''}
            </div>` :
            allZiyarat.map((z,i)=>`
                <article class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6 card-hover fade-in" style="border-top:3px solid #B45309;box-shadow:var(--shadow-card)">
                    <div class="flex items-start justify-between gap-3 mb-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="${d?'gold-badge-dark':'gold-badge'}">☪️ ${l==='bn'?'যিয়ারত':'Ziyarat'}</span>
                                <h3 class="text-xl font-bold">${sanitize(l==='bn'?z.titleBn:z.titleEn)}</h3>
                            </div>
                            ${z.occasion ? `<p class="text-xs ${d?'text-amber-400':'text-amber-700'} font-medium mt-1">📅 ${sanitize(z.occasion)}</p>` : ''}
                            ${z.source ? `<p class="text-xs ${d?'text-gray-400':'text-gray-500'} mt-0.5">${sanitize(z.source)}</p>` : ''}
                        </div>
                        ${state.isAdmin ? `
                        <div class="flex gap-1 flex-shrink-0">
                            <button data-action="editCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                                class="${d?'bg-blue-900 text-blue-300 hover:bg-blue-800':'bg-blue-100 text-blue-700 hover:bg-blue-200'} p-2 rounded-lg text-sm transition-colors">✏️</button>
                            <button data-action="deleteCustomDua" data-param="${z.id}" data-dtype="ziyarat"
                                class="${d?'bg-red-900 text-red-300 hover:bg-red-800':'bg-red-100 text-red-700 hover:bg-red-200'} p-2 rounded-lg text-sm transition-colors">🗑</button>
                        </div>` : ''}
                    </div>
                    <div class="${d?'bg-gray-900 border-gray-700':'bg-amber-50 border-amber-100'} border rounded-xl p-5 mb-4">
                        <p class="arabic-text text-center mb-3" dir="rtl" lang="ar" style="font-size:1.6rem;line-height:2.3">${sanitize(z.arabic)}</p>
                        ${z.transliteration ? `<p class="text-center text-xs italic ${d?'text-gray-400':'text-gray-500'} mb-2">${sanitize(z.transliteration)}</p>` : ''}
                        <p class="text-center text-sm ${d?'text-gray-300':'text-gray-600'} leading-relaxed">${sanitize(l==='bn'?z.meaningBn:z.meaningEn)}</p>
                    </div>
                    <button data-action="readZiyarat" data-param="${z.id}" class="${d?'text-amber-400':'text-amber-700'} font-semibold hover:underline text-sm">${t('readMore')} →</button>
                </article>`).join('')}
        </div>` : ''}

        <!-- NAHJUL BALAGHA TAB -->
        ${tab==='nahjul' ? `
        <div class="space-y-5">
            ${state.nahjulBalagha.length===0 ? `
            <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
                <div class="text-5xl mb-3">📖</div>
                <p class="text-lg font-medium mb-1">${l==='bn'?'নাহজুল বালাগা থেকে কোনো বাণী নেই':'No entries from Nahjul Balagha yet'}</p>
                ${state.isAdmin?`<p class="text-sm">${l==='bn'?'উপরের বাটন থেকে যোগ করুন':'Use the button above to add'}</p>`:''}
            </div>` :
            state.nahjulBalagha.map((item,i)=>`
            <article class="${d?'bg-gray-800 border-gray-700':'bg-white border-blue-100'} border rounded-2xl p-6 card-hover fade-in" style="border-top:3px solid #1d4ed8;box-shadow:var(--shadow-card)">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="${d?'bg-blue-900 text-blue-200':'bg-blue-100 text-blue-700'} text-xs font-bold px-2 py-0.5 rounded-full">📖 ${item.type==='sermon'?(l==='bn'?'খুতবা':'Sermon'):item.type==='letter'?(l==='bn'?'চিঠি':'Letter'):(l==='bn'?'বাণী':'Saying')} ${item.number?'#'+item.number:''}</span>
                        </div>
                        <h3 class="text-lg font-bold">${sanitize(l==='bn'?item.titleBn:item.titleEn)}</h3>
                        ${item.topic?`<p class="text-xs ${d?'text-blue-400':'text-blue-600'} font-medium mt-1">🏷️ ${sanitize(item.topic)}</p>`:''}
                    </div>
                    ${state.isAdmin?`
                    <div class="flex gap-1 flex-shrink-0">
                        <button data-action="editKnowledgeItem" data-param="${i}" data-dtype="nahjul" class="${d?'bg-blue-900 text-blue-300 hover:bg-blue-800':'bg-blue-100 text-blue-700 hover:bg-blue-200'} p-2 rounded-lg text-sm transition-colors">✏️</button>
                        <button data-action="deleteKnowledgeItem" data-param="${i}" data-dtype="nahjul" class="${d?'bg-red-900 text-red-300 hover:bg-red-800':'bg-red-100 text-red-700 hover:bg-red-200'} p-2 rounded-lg text-sm transition-colors">🗑</button>
                    </div>`:''}
                </div>
                ${item.arabic?`<div class="${d?'bg-gray-900 border-gray-700':'bg-blue-50 border-blue-100'} border rounded-xl p-4 mb-3"><p class="arabic-text text-center" dir="rtl" lang="ar" style="font-size:1.4rem;line-height:2.2">${sanitize(item.arabic)}</p></div>`:''}
                <p class="text-sm ${d?'text-gray-300':'text-gray-700'} leading-relaxed">${sanitize(l==='bn'?item.textBn:item.textEn)}</p>
                ${item.source?`<p class="text-xs ${d?'text-gray-500':'text-gray-400'} mt-2">— ${sanitize(item.source)}</p>`:''}
            </article>`).join('')}
        </div>` : ''}

        <!-- SAHIFA SAJJADIYA TAB -->
        ${tab==='sahifa' ? `
        <div class="space-y-5">
            ${state.sahifaSajjadiya.length===0 ? `
            <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
                <div class="text-5xl mb-3">🌹</div>
                <p class="text-lg font-medium mb-1">${l==='bn'?'সাহিফা সাজ্জাদিয়্যা থেকে কোনো দুআ নেই':'No prayers from Sahifa Sajjadiya yet'}</p>
                ${state.isAdmin?`<p class="text-sm">${l==='bn'?'উপরের বাটন থেকে যোগ করুন':'Use the button above to add'}</p>`:''}
            </div>` :
            state.sahifaSajjadiya.map((item,i)=>`
            <article class="${d?'bg-gray-800 border-gray-700':'bg-white border-purple-100'} border rounded-2xl p-6 card-hover fade-in" style="border-top:3px solid #7c3aed;box-shadow:var(--shadow-card)">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="${d?'bg-purple-900 text-purple-200':'bg-purple-100 text-purple-700'} text-xs font-bold px-2 py-0.5 rounded-full">🌹 ${l==='bn'?'দুআ নং':'Dua No.'} ${item.number||'—'}</span>
                        </div>
                        <h3 class="text-lg font-bold">${sanitize(l==='bn'?item.titleBn:item.titleEn)}</h3>
                        ${item.occasion?`<p class="text-xs ${d?'text-purple-400':'text-purple-600'} font-medium mt-1">📅 ${sanitize(item.occasion)}</p>`:''}
                    </div>
                    ${state.isAdmin?`
                    <div class="flex gap-1 flex-shrink-0">
                        <button data-action="editKnowledgeItem" data-param="${i}" data-dtype="sahifa" class="${d?'bg-purple-900 text-purple-300 hover:bg-purple-800':'bg-purple-100 text-purple-700 hover:bg-purple-200'} p-2 rounded-lg text-sm transition-colors">✏️</button>
                        <button data-action="deleteKnowledgeItem" data-param="${i}" data-dtype="sahifa" class="${d?'bg-red-900 text-red-300 hover:bg-red-800':'bg-red-100 text-red-700 hover:bg-red-200'} p-2 rounded-lg text-sm transition-colors">🗑</button>
                    </div>`:''}
                </div>
                <div class="${d?'bg-gray-900 border-gray-700':'bg-purple-50 border-purple-100'} border rounded-xl p-5 mb-3">
                    <p class="arabic-text text-center mb-3" dir="rtl" lang="ar" style="font-size:1.5rem;line-height:2.2">${sanitize(item.arabic)}</p>
                    ${item.transliteration?`<p class="text-center text-xs italic ${d?'text-gray-400':'text-gray-500'} mb-2">${sanitize(item.transliteration)}</p>`:''}
                    <p class="text-center text-sm ${d?'text-gray-300':'text-gray-600'} leading-relaxed">${sanitize(l==='bn'?item.meaningBn:item.meaningEn)}</p>
                </div>
                ${item.source?`<p class="text-xs ${d?'text-gray-500':'text-gray-400'}">— ${sanitize(item.source)}</p>`:''}
            </article>`).join('')}
        </div>` : ''}

        <!-- IMAM HADITHS TAB -->
        ${tab==='imamhadiths' ? `
        <div class="space-y-5">
            ${state.imamHadiths.length===0 ? `
            <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
                <div class="text-5xl mb-3">⭐</div>
                <p class="text-lg font-medium mb-1">${l==='bn'?'কোনো হাদিস যোগ করা হয়নি':'No hadith added yet'}</p>
                ${state.isAdmin?`<p class="text-sm">${l==='bn'?'উপরের বাটন থেকে যোগ করুন':'Use the button above to add'}</p>`:''}
            </div>` :
            state.imamHadiths.map((item,i)=>`
            <article class="${d?'bg-gray-800 border-gray-700':'bg-white border-teal-100'} border rounded-2xl p-6 card-hover fade-in" style="border-left:4px solid #0d9488;box-shadow:var(--shadow-card)">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="${d?'bg-teal-900 text-teal-200':'bg-teal-100 text-teal-700'} text-xs font-bold px-2 py-0.5 rounded-full">⭐ ${sanitize(l==='bn'?item.imamBn:item.imamEn)}</span>
                            ${item.topic?`<span class="${d?'bg-gray-700 text-gray-300':'bg-gray-100 text-gray-600'} text-xs px-2 py-0.5 rounded-full">🏷️ ${sanitize(item.topic)}</span>`:''}
                        </div>
                    </div>
                    ${state.isAdmin?`
                    <div class="flex gap-1 flex-shrink-0">
                        <button data-action="editKnowledgeItem" data-param="${i}" data-dtype="imamhadiths" class="${d?'bg-teal-900 text-teal-300 hover:bg-teal-800':'bg-teal-100 text-teal-700 hover:bg-teal-200'} p-2 rounded-lg text-sm transition-colors">✏️</button>
                        <button data-action="deleteKnowledgeItem" data-param="${i}" data-dtype="imamhadiths" class="${d?'bg-red-900 text-red-300 hover:bg-red-800':'bg-red-100 text-red-700 hover:bg-red-200'} p-2 rounded-lg text-sm transition-colors">🗑</button>
                    </div>`:''}
                </div>
                ${item.arabic?`<p class="arabic-text text-right mb-3" dir="rtl" lang="ar" style="font-size:1.2rem;line-height:2;color:${d?'#5eead4':'#0f766e'}">${sanitize(item.arabic)}</p>`:''}
                <div class="${d?'bg-teal-950/40 border-teal-900':'bg-teal-50 border-teal-100'} border rounded-xl p-4">
                    <p class="text-sm ${d?'text-gray-200':'text-gray-800'} leading-relaxed italic">"${sanitize(l==='bn'?item.textBn:item.textEn)}"</p>
                </div>
                ${item.source?`<p class="text-xs ${d?'text-gray-500':'text-gray-400'} mt-2">— ${sanitize(item.source)}</p>`:''}
            </article>`).join('')}
        </div>` : ''}

        <!-- SPECIAL DAYS TAB -->
        ${tab==='specialdays' ? `
        <div class="space-y-5">
            ${state.specialDays.length===0 ? `
            <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
                <div class="text-5xl mb-3">✨</div>
                <p class="text-lg font-medium mb-1">${l==='bn'?'কোনো বিশেষ দিন যোগ করা হয়নি':'No special days added yet'}</p>
                ${state.isAdmin?`<p class="text-sm">${l==='bn'?'উপরের বাটন থেকে যোগ করুন':'Use the button above to add'}</p>`:''}
            </div>` :
            state.specialDays.map((item,i)=>`
            <article class="${d?'bg-gray-800 border-gray-700':'bg-white border-rose-100'} border rounded-2xl p-6 card-hover fade-in" style="border-top:3px solid ${item.type==='eid'?'#059669':item.type==='martyrdom'?'#dc2626':'#f59e0b'};box-shadow:var(--shadow-card)">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background:${item.type==='eid'?'#ecfdf5':item.type==='martyrdom'?'#fef2f2':'#fffbeb'};color:${item.type==='eid'?'#065f46':item.type==='martyrdom'?'#991b1b':'#92400e'}">
                                ${item.type==='eid'?(l==='bn'?'🎉 ঈদ/উৎসব':'🎉 Eid/Festival'):item.type==='martyrdom'?(l==='bn'?'⚔️ শাহাদাত':'⚔️ Martyrdom'):(l==='bn'?'⭐ স্মরণীয় দিন':'⭐ Occasion')}
                            </span>
                            ${item.hijriDate?`<span class="text-xs ${d?'text-gray-400':'text-gray-500'}">📅 ${sanitize(item.hijriDate)}</span>`:''}
                        </div>
                        <h3 class="text-lg font-bold">${sanitize(l==='bn'?item.titleBn:item.titleEn)}</h3>
                        ${item.imam?`<p class="text-xs ${d?'text-rose-400':'text-rose-600'} font-medium mt-1">👑 ${sanitize(item.imam)}</p>`:''}
                    </div>
                    ${state.isAdmin?`
                    <div class="flex gap-1 flex-shrink-0">
                        <button data-action="editKnowledgeItem" data-param="${i}" data-dtype="specialdays" class="${d?'bg-rose-900 text-rose-300 hover:bg-rose-800':'bg-rose-100 text-rose-700 hover:bg-rose-200'} p-2 rounded-lg text-sm transition-colors">✏️</button>
                        <button data-action="deleteKnowledgeItem" data-param="${i}" data-dtype="specialdays" class="${d?'bg-red-900 text-red-300 hover:bg-red-800':'bg-red-100 text-red-700 hover:bg-red-200'} p-2 rounded-lg text-sm transition-colors">🗑</button>
                    </div>`:''}
                </div>
                <p class="text-sm ${d?'text-gray-300':'text-gray-700'} leading-relaxed mb-3">${sanitize(l==='bn'?item.descBn:item.descEn)}</p>
                ${item.dua?`<div class="${d?'bg-gray-900 border-gray-700':'bg-amber-50 border-amber-100'} border rounded-xl p-4"><p class="text-xs font-semibold ${d?'text-amber-400':'text-amber-700'} mb-2">${l==='bn'?'বিশেষ দোয়া/আমল:':'Special Dua/Amal:'}</p><p class="text-sm ${d?'text-gray-300':'text-gray-700'} leading-relaxed">${sanitize(item.dua)}</p></div>`:''}
            </article>`).join('')}
        </div>` : ''}

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

                    // Colors
                    const enBigColor = isTodayGreg ? 'white'
                        : isFri ? '#dc2626'
                        : isSat ? '#1d4ed8'
                        : (d?'#f3f4f6':'#111827');
                    const bnGregColor = isTodayGreg ? 'rgba(255,255,255,.9)'
                        : isFri ? '#b91c1c'
                        : isSat ? '#1e40af'
                        : (d?'#93c5fd':'#1d4ed8');
                    const bnHijriColor = isTodayGreg ? 'rgba(255,255,255,.85)'
                        : (d?'#86efac':'#15803d');

                    // ইমাম তারিখ হাইলাইট
                    const evType = ev ? ev.type : null;
                    const isBirth    = evType === 'birth';
                    const isMartyr   = evType === 'martyrdom';
                    const isAshura   = evType === 'ashura';
                    const isEid      = evType === 'eid';

                    const cellBg = isTodayGreg
                        ? '#059669'
                        : isAshura ? (d?'#3b0000':'#fff0f0')
                        : isMartyr ? (d?'#2d1515':'#fff5f5')
                        : isBirth  ? (d?'#052e16':'#f0fdf4')
                        : isEid    ? (d?'#1a2e1a':'#f0fff4')
                        : ev       ? (d?'#292524':'#fef3c7')
                        : (d?'#1f2937':'#ffffff');

                    const dotColor = isAshura ? '#dc2626' : isMartyr ? '#f87171' : isBirth ? '#059669' : isEid ? '#059669' : '#f59e0b';

                    return `<div style="background:${cellBg};min-height:72px;padding:3px 4px;position:relative;display:flex;flex-direction:column;justify-content:space-between;align-items:stretch" role="gridcell"
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
                                    <p style="color:#1d4ed8;font-size:.62rem;font-weight:700;line-height:1.3">${_evBd.str}</p>


                                    <!-- 3rd: Hijri in Bengali language -->
                                    <p style="color:#15803d;font-size:.62rem;font-weight:700;line-height:1.3">${toBengaliDigits(evDay)} ${hijriMonthsBn[month-1]}</p>
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
    const allPosts=[...blogPosts,...state.customPosts];
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
    const idx2=blogPosts.indexOf(post); const a=ac[idx2>=0?idx2%ac.length:0];
    return `
    <div class="max-w-3xl mx-auto page-enter">
        <button data-action="changePage" data-param="${state.previousPage||'blog'}" class="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all" style="background:${a}12;color:${a}">← ${l==='bn'?'ব্লগে ফিরুন':'Back to Blog'}</button>
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
function renderReadDuaPage()
{
    const dua=state.currentDua; const d=state.darkMode; const l=state.language;
    if(!dua) return renderDuaPage();
    const isCustom=!!dua.id;
    return `
    <div class="max-w-3xl mx-auto page-enter">
        <button data-action="changePage" data-param="${state.previousPage||'dua'}" class="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all" style="background:rgba(180,83,9,.1);color:#b45309">← ${l==='bn'?'দোয়ায় ফিরুন':'Back to Duas'}</button>
        <article class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border" style="box-shadow:var(--shadow-lg)">
            <div style="height:4px;background:linear-gradient(90deg,#059669,#b45309,#059669);border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
            <div class="p-7 md:p-10">
                <div class="flex justify-between items-start gap-4 mb-7 flex-wrap">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-3 flex-wrap">
                            <span class="text-xs px-3 py-1.5 rounded-full font-bold" style="background:rgba(5,150,105,.14);color:#059669;border:1px solid rgba(5,150,105,.22)">🤲 ${l==='bn'?'দোয়া':'Dua'}</span>
                            ${isCustom?`<span class="${d?'gold-badge-dark':'gold-badge'}">${l==='bn'?'কাস্টম':'Custom'}</span>`:''}
                            ${dua.source?`<span class="text-xs ${d?'text-gray-500':'text-gray-400'}">📚 ${sanitize(dua.source)}</span>`:''}
                        </div>
                        <h1 class="text-2xl md:text-3xl font-black leading-tight">${sanitize(l==='bn'?dua.titleBn:dua.titleEn)}</h1>
                    </div>
                    <button data-action="shareDua" data-param="${dua.id?dua.id:duas.indexOf(dua)}" class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:scale-105 transition-all" style="background:rgba(5,150,105,.1);color:#059669;border:1px solid rgba(5,150,105,.18)">🔗 ${l==='bn'?'শেয়ার':'Share'}</button>
                </div>
                <div class="rounded-2xl p-7 mb-5 relative overflow-hidden" style="background:${d?'linear-gradient(135deg,rgba(5,150,105,.1),rgba(180,83,9,.06))':'linear-gradient(135deg,#fef9e7,#ecfdf5)'};border:1px solid ${d?'rgba(180,83,9,.18)':'rgba(180,83,9,.12)'}">
                    <h2 class="text-xs font-bold text-center mb-5 tracking-widest uppercase" style="color:${d?'#34d399':'#059669'}">${l==='bn'?'আরবি পাঠ':'Arabic Text'}</h2>
                    <p class="arabic-text text-center" dir="rtl" lang="ar" style="font-size:2rem;line-height:2.6;text-shadow:0 0 24px rgba(180,83,9,.12)">${sanitize(dua.arabic)}</p>
                </div>
                ${dua.transliteration?`<div class="${d?'bg-gray-900/60':'bg-gray-50'} rounded-2xl p-5 mb-5" style="border-left:3px solid #7c3aed"><h2 class="text-xs font-bold mb-3 tracking-widest uppercase" style="color:#7c3aed">${l==='bn'?'উচ্চারণ':'Transliteration'}</h2><p class="italic text-base leading-relaxed ${d?'text-gray-300':'text-gray-700'}">${sanitize(dua.transliteration)}</p></div>`:''}
                <div class="${d?'bg-gray-900/60':'bg-emerald-50/60'} rounded-2xl p-5 mb-5" style="border-left:3px solid #059669"><h2 class="text-xs font-bold mb-3 tracking-widest uppercase" style="color:#059669">${l==='bn'?'বাংলা অর্থ':'Bengali Meaning'}</h2><p class="text-base leading-relaxed ${d?'text-gray-300':'text-gray-700'}">${sanitize(dua.meaningBn)}</p></div>
                ${dua.meaningEn?`<div class="${d?'bg-gray-900/60':'bg-blue-50/60'} rounded-2xl p-5 mb-5" style="border-left:3px solid #0369a1"><h2 class="text-xs font-bold mb-3 tracking-widest uppercase" style="color:#0369a1">${l==='bn'?'ইংরেজি অর্থ':'English Meaning'}</h2><p class="text-base leading-relaxed ${d?'text-gray-300':'text-gray-700'}">${sanitize(dua.meaningEn)}</p></div>`:''}
                ${dua.fullTextBn?`<div class="${d?'bg-gray-900/60':'bg-amber-50/60'} rounded-2xl p-5" style="border-left:3px solid #b45309"><h2 class="text-xs font-bold mb-3 tracking-widest uppercase" style="color:#b45309">${l==='bn'?'বিস্তারিত পাঠ':'Full Text'}</h2><p class="text-base leading-relaxed whitespace-pre-line ${d?'text-gray-300':'text-gray-700'}">${sanitize(dua.fullTextBn)}</p></div>`:''}
            </div>
        </article>
    </div>`;
}

// ============================================================================
// PAGE: IMAMS (12 Imams List)
// ============================================================================
function renderImamsPage()
{
    const d=state.darkMode; const l=state.language;
    const ACS=['#059669','#0d9488','#c9a227','#7c3aed','#0369a1','#d97706','#166534','#be123c','#0e7490','#4f46e5','#0f766e','#c9a227'];
    const ACS2=['#022c22','#134e4a','#7a5c0a','#3b0764','#0c2a4a','#78350f','#052e16','#500724','#083344','#1e1b4b','#042f2e','#065f46'];
    const CONIC=['conic-gradient(from 0deg,#059669,#6ee7b7,#065f46,#34d399,#059669)','conic-gradient(from 0deg,#0d9488,#5eead4,#0f766e,#99f6e4,#0d9488)','conic-gradient(from 0deg,#c9a227,#fde68a,#b45309,#fbbf24,#c9a227)','conic-gradient(from 0deg,#7c3aed,#c4b5fd,#5b21b6,#a78bfa,#7c3aed)','conic-gradient(from 0deg,#0369a1,#7dd3fc,#075985,#38bdf8,#0369a1)','conic-gradient(from 0deg,#d97706,#fcd34d,#b45309,#fbbf24,#d97706)','conic-gradient(from 0deg,#166534,#86efac,#14532d,#4ade80,#166534)','conic-gradient(from 0deg,#be123c,#fda4af,#9f1239,#fb7185,#be123c)','conic-gradient(from 0deg,#0e7490,#67e8f9,#155e75,#22d3ee,#0e7490)','conic-gradient(from 0deg,#4f46e5,#a5b4fc,#4338ca,#818cf8,#4f46e5)','conic-gradient(from 0deg,#0f766e,#5eead4,#115e59,#2dd4bf,#0f766e)','conic-gradient(from 0deg,#c9a227,#fde68a,#059669,#6ee7b7,#c9a227)'];
    return `
    <div class="space-y-8 page-enter">
        <div class="flex flex-wrap justify-between items-center gap-4">
            <div><h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">👑 ${t('imams')}</h2><p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'পবিত্র ১২ ইমামের জীবনী':'The lives of the Holy 12 Imams'}</p></div>
            <button data-action="toggleTimeline" class="btn-primary px-5 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2" style="${state.showTimeline?'background:linear-gradient(135deg,#059669,#065f46);color:white;box-shadow:0 4px 16px rgba(5,150,105,.4)':(d?'background:rgba(255,255,255,.08);color:#9ca3af':'background:rgba(0,0,0,.06);color:#6b7280')}">📅 ${l==='bn'?'টাইমলাইন':'Timeline'} ${state.showTimeline?'✓':''}</button>
        </div>
        ${state.showTimeline?renderImamTimeline(d,l):''}
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            ${imams.map((im,idx)=>{const ac=ACS[idx%12];const ac2=ACS2[idx%12];const conic=CONIC[idx%12];
            const quoteText=sanitize(l==='bn'?im.quoteBn:im.quoteEn);
            const flipId=`imam-flip-${im.id}`;
            return`
            <!-- ═══ IMAM CARD #${im.id} — flip wrapper ═══ -->
            <div class="imam-flip-wrapper" style="height:100%">
              <div class="imam-flip-inner" id="${flipId}" style="min-height:420px">

                <!-- ───── FRONT FACE ───── -->
                <div class="imam-card-luxury imam-card-front border text-center p-6"
                     style="display:flex;flex-direction:column;background:${d?'#1e2d26':'#ffffff'};border-color:${d?'rgba(52,211,153,.18)':'#e8e2db'};box-shadow:var(--shadow-sm);height:100%"
                     onmouseenter="imamCardParticles(this,'${ac}')"
                >
                    <!-- Animated top bar -->
                    <div class="imam-top-bar" style="background:linear-gradient(90deg,${ac},${ac}bb,#c9a227,${ac2},${ac});background-size:300% 100%"></div>

                    <!-- Number badge -->
                    <div class="imam-num" style="background:linear-gradient(135deg,#c9a227,#92400e)">${im.id}</div>

                    <!-- Flip hint -->
                    <button onclick="imamFlip('${flipId}')" title="${l==='bn'?'উক্তি দেখুন':'See quote'}"
                        style="position:absolute;top:14px;left:14px;width:26px;height:26px;border-radius:50%;background:${ac}22;border:1px solid ${ac}40;color:${ac};font-size:.65rem;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:5;transition:transform .3s"
                        onmouseover="this.style.transform='rotate(180deg)'"
                        onmouseout="this.style.transform='rotate(0deg)'">↺</button>

                    <!-- Avatar with rotate + glow -->
                    <div style="position:relative;display:flex;justify-content:center;margin-bottom:1rem">
                        <div class="imam-avatar-inner-wrap" style="width:74px;height:74px;border-radius:50%;position:relative">
                            <div class="imam-avatar-rotate" style="position:absolute;inset:-3px;border-radius:50%;background:${conic};animation:avatarRotate 8s linear infinite;z-index:0"></div>
                            <div style="position:absolute;inset:0;border-radius:50%;background:${d?'#1e2d26':'#ffffff'};z-index:1;display:flex;align-items:center;justify-content:center;font-family:'Amiri',serif;font-size:1rem;font-weight:700;color:${ac};border:2px solid ${d?'rgba(52,211,153,.15)':'rgba(255,255,255,.9)'}">${im.arabicName.split(' ')[0]||im.icon}</div>
                        </div>
                    </div>

                    <!-- Name -->
                    <h3 class="text-base font-bold mb-1 leading-snug">${sanitize(l==='bn'?im.nameBn:im.nameEn)}</h3>

                    <!-- Arabic shimmer name -->
                    <p class="mb-2" style="font-family:'Amiri',serif;font-size:1rem">
                        <span class="imam-arabic-shimmer">${sanitize(im.arabicName)}</span>
                    </p>

                    <!-- Epithet badge with bounce -->
                    <div style="display:flex;justify-content:center;margin-bottom:.75rem">
                        <span class="imam-epithet-badge text-xs font-bold px-3 py-1 rounded-full"
                              style="background:${ac}18;color:${ac};border:1px solid ${ac}30;display:inline-block">
                            ${sanitize(l==='bn'?im.epithetBn:im.epithetEn)}
                        </span>
                    </div>

                    <!-- Description -->
                    <p class="text-xs ${d?'text-gray-400':'text-gray-500'} mb-4 leading-relaxed line-clamp-2">${sanitize(l==='bn'?im.descBn:im.descEn)}</p>

                    <!-- Birth / Martyrdom grid -->
                    <div class="grid grid-cols-2 gap-2 text-xs mb-4">
                        <div class="rounded-xl p-2.5" style="background:${ac}12;border:1px solid ${ac}22">
                            <p class="font-bold mb-0.5" style="color:${ac}">🌙 ${l==='bn'?'জন্ম':'Birth'}</p>
                            <p class="${d?'text-gray-300':'text-gray-700'} leading-snug">${sanitize(l==='bn'?im.birthBn:im.birthEn)}</p>
                        </div>
                        <div class="${d?'bg-red-950/40 border-red-900':'bg-red-50 border-red-100'} rounded-xl p-2.5 border">
                            <p class="${d?'text-red-400':'text-red-600'} font-bold mb-0.5">⚔️ ${l==='bn'?'শাহাদাত':'Martyrdom'}</p>
                            <p class="${d?'text-gray-300':'text-gray-700'} leading-snug">${sanitize(l==='bn'?im.martyrdomBn:im.martyrdomEn)}</p>
                        </div>
                    </div>

                    <!-- Quote — expands on hover -->
                    <div class="imam-quote-wrap rounded-xl p-3 mb-4 text-left" style="border-left:3px solid ${ac};background:${ac}0a;flex:1">
                        <p class="imam-quote-text text-xs italic ${d?'text-gray-300':'text-gray-700'} leading-relaxed"
                           data-quote="${quoteText}">"${quoteText}"</p>
                    </div>

                    <!-- Buttons -->
                    <div class="flex gap-2">
                        <button data-action="viewImam" data-param="${im.id}"
                            class="imam-detail-btn flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                            style="background:linear-gradient(135deg,${ac},${ac2});color:white;box-shadow:0 3px 10px ${ac}45">
                            ${l==='bn'?'বিস্তারিত':'Details'} →
                        </button>
                        <button data-action="shareImamQuote" data-param="${im.id}"
                            class="px-3 py-2 rounded-xl text-xs font-bold hover:scale-110 transition-all"
                            style="background:${ac}15;color:${ac};border:1px solid ${ac}30">🔗</button>
                    </div>
                </div><!-- /front -->

                <!-- ───── BACK FACE (Quote card) ───── -->
                <div class="imam-card-back"
                     style="background:linear-gradient(145deg,${ac2},${d?'#0a1a0e':'#022c22'});color:white;border:1px solid ${ac}40;box-shadow:var(--shadow-lg)">
                    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,${ac}25 0%,transparent 70%);pointer-events:none;border-radius:var(--r-lg)"></div>
                    <div style="position:relative;z-index:2;width:100%;text-align:center">
                        <div style="font-family:'Amiri',serif;font-size:2.2rem;color:${ac};margin-bottom:.5rem;line-height:1">❝</div>
                        <p style="font-family:'Amiri',serif;font-size:1.05rem;line-height:1.7;color:rgba(255,255,255,.92);margin-bottom:1rem;padding:0 .5rem">${sanitize(l==='bn'?im.quoteBn:im.quoteEn)}</p>
                        <div style="width:40px;height:2px;background:${ac};margin:0 auto .75rem"></div>
                        <p style="font-size:.75rem;font-weight:700;color:${ac};letter-spacing:.5px">${sanitize(l==='bn'?im.nameBn:im.nameEn)}</p>
                        <button onclick="imamFlip('${flipId}')"
                            style="margin-top:1.2rem;padding:6px 18px;border-radius:50px;background:${ac}30;border:1px solid ${ac}60;color:white;font-size:.75rem;cursor:pointer;transition:background .2s"
                            onmouseover="this.style.background='${ac}55'"
                            onmouseout="this.style.background='${ac}30'">
                            ← ${l==='bn'?'ফিরে যান':'Back'}
                        </button>
                    </div>
                </div><!-- /back -->

              </div><!-- /flip-inner -->
            </div><!-- /flip-wrapper -->
            `}).join('')}
        </div>
    </div>`;
}

function renderImamTimeline(d, l) {
    // Extract birth years
    const timelineImams = imams.map(im => ({
        ...im,
        birthYear: parseInt((im.birthEn||'').match(/\d+/)?.[0]||0),
        deathYear: (im.martyrdomEn||'').includes('Occultation') ? 'Present' : parseInt((im.martyrdomEn||'').match(/\d+/)?.[0]||0),
    }));
    const minYear = 600; const maxYear = 880;
    const range = maxYear - minYear;
    return `
    <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6 fade-in">
        <h3 class="text-xl font-bold mb-2 text-center">${l==='bn'?'১২ ইমামের জীবনকাল টাইমলাইন':'12 Imams Timeline'}</h3>
        <p class="text-center text-sm ${d?'text-gray-400':'text-gray-500'} mb-6">${l==='bn'?'খ্রিস্টাব্দ ৬০০ - ৮৮০':'600 CE – 880 CE'}</p>
        <!-- Horizontal bar timeline -->
        <div class="space-y-3">
            ${timelineImams.map((im, idx) => {
                const startPct = Math.max(0, ((im.birthYear - minYear) / range) * 100);
                const endYear = typeof im.deathYear === 'number' ? im.deathYear : maxYear;
                const widthPct = Math.max(2, ((endYear - im.birthYear) / range) * 100);
                const colors = ['bg-green-500','bg-blue-500','bg-red-500','bg-purple-500','bg-yellow-500','bg-teal-500','bg-orange-500','bg-pink-500','bg-indigo-500','bg-cyan-500','bg-emerald-500','bg-violet-500'];
                const color = colors[idx % colors.length];
                return `
                <div class="flex items-center gap-3">
                    <div class="text-right flex-shrink-0" style="width:140px">
                        <span class="text-xs font-semibold ${d?'text-gray-300':'text-gray-700'} leading-tight">${im.icon} ${sanitize(l==='bn'?im.nameBn.replace('ইমাম ',''):im.nameEn.replace('Imam ',''))}</span>
                    </div>
                    <div class="flex-1 relative" style="height:28px">
                        <div class="${d?'bg-gray-700':'bg-gray-100'} rounded-full w-full h-full absolute"></div>
                        <div class="${color} rounded-full h-full absolute flex items-center px-2 overflow-hidden"
                            style="left:${startPct.toFixed(1)}%;width:${Math.min(widthPct, 100-startPct).toFixed(1)}%;min-width:28px">
                            <span class="text-white text-xs font-bold truncate whitespace-nowrap">${im.birthYear}</span>
                        </div>
                    </div>
                    <div class="flex-shrink-0 text-xs ${d?'text-gray-400':'text-gray-500'}" style="width:50px">${typeof im.deathYear==='string'?'—':im.deathYear}</div>
                </div>`;
            }).join('')}
        </div>
        <!-- Year markers -->
        <div class="flex justify-between mt-4 px-0 ml-36 mr-16">
            ${[600,650,700,750,800,850].map(yr=>`<span class="text-xs ${d?'text-gray-500':'text-gray-400'}">${yr}</span>`).join('')}
        </div>
    </div>`;
}

// viewImamDetail is handled via 'viewImam' data-action

function renderImamDetailPage()
{
    const d=state.darkMode; const l=state.language;
    const im=state.currentImam;
    if(!im) return renderImamsPage();
    const idx=imams.indexOf(im);
    const prev=idx>0?imams[idx-1]:null;
    const next=idx<imams.length-1?imams[idx+1]:null;
    const ACS=['#059669','#0d9488','#c9a227','#7c3aed','#0369a1','#d97706','#166534','#be123c','#0e7490','#4f46e5','#0f766e','#c9a227'];
    const ACS2=['#022c22','#134e4a','#7a5c0a','#3b0764','#0c2a4a','#78350f','#052e16','#500724','#083344','#1e1b4b','#042f2e','#065f46'];
    const CONIC2=['conic-gradient(from 0deg,#059669,#6ee7b7,#065f46,#34d399,#059669)','conic-gradient(from 0deg,#0d9488,#5eead4,#0f766e,#99f6e4,#0d9488)','conic-gradient(from 0deg,#c9a227,#fde68a,#b45309,#fbbf24,#c9a227)','conic-gradient(from 0deg,#7c3aed,#c4b5fd,#5b21b6,#a78bfa,#7c3aed)','conic-gradient(from 0deg,#0369a1,#7dd3fc,#075985,#38bdf8,#0369a1)','conic-gradient(from 0deg,#d97706,#fcd34d,#b45309,#fbbf24,#d97706)','conic-gradient(from 0deg,#166534,#86efac,#14532d,#4ade80,#166534)','conic-gradient(from 0deg,#be123c,#fda4af,#9f1239,#fb7185,#be123c)','conic-gradient(from 0deg,#0e7490,#67e8f9,#155e75,#22d3ee,#0e7490)','conic-gradient(from 0deg,#4f46e5,#a5b4fc,#4338ca,#818cf8,#4f46e5)','conic-gradient(from 0deg,#0f766e,#5eead4,#115e59,#2dd4bf,#0f766e)','conic-gradient(from 0deg,#c9a227,#fde68a,#059669,#6ee7b7,#c9a227)'];
    const ac=ACS[idx%12]; const ac2=ACS2[idx%12]; const conic2=CONIC2[idx%12];
    return `
    <div class="max-w-2xl mx-auto page-enter">
        <button data-action="changePage" data-param="imams" class="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all" style="background:${ac}12;color:${ac}">← ${l==='bn'?'সকল ইমাম':'All Imams'}</button>
        <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border mb-6" style="box-shadow:var(--shadow-lg);position:relative">
            <div style="height:4px;background:linear-gradient(90deg,${ac},${ac2},${ac});border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
            <div style="background:linear-gradient(135deg,${ac}10,transparent,${ac2}07);padding:2.5rem 2rem 1.5rem;text-align:center;position:relative">
                <div style="position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${ac},${ac2});display:flex;align-items:center;justify-content:center;color:white;font-size:.75rem;font-weight:800;box-shadow:0 3px 10px ${ac}50">${im.id}</div>
                <div style="position:relative;display:flex;justify-content:center;margin-bottom:1.2rem">
                    <div style="width:96px;height:96px;border-radius:50%;position:relative">
                        <div style="position:absolute;inset:-4px;border-radius:50%;background:${conic2};animation:avatarRotate 7s linear infinite;z-index:0"></div>
                        <div style="position:absolute;inset:0;border-radius:50%;background:${d?'#1f2937':'white'};z-index:1;display:flex;align-items:center;justify-content:center;font-family:'Amiri',serif;font-size:2rem;font-weight:700;color:${ac2}">${im.arabicName.split(' ')[0]||im.icon}</div>
                    </div>
                </div>
                <h1 class="text-2xl md:text-3xl font-black mb-2">${sanitize(l==='bn'?im.nameBn:im.nameEn)}</h1>
                <p class="arabic-text mb-3" style="font-size:1.5rem;color:${ac}">${sanitize(im.arabicName)}</p>
                <span class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold" style="background:${ac}18;color:${ac};border:1px solid ${ac}28">✨ ${sanitize(l==='bn'?im.epithetBn:im.epithetEn)}</span>
            </div>
            <div class="p-6 pt-2">
                <div class="grid grid-cols-2 gap-3 mb-5">
                    <div class="rounded-2xl p-4" style="background:${ac}0f;border:1px solid ${ac}1a"><p class="font-bold text-xs mb-1.5" style="color:${ac}">🌙 ${l==='bn'?'জন্ম':'Birth'}</p><p class="font-semibold text-sm">${sanitize(l==='bn'?im.birthBn:im.birthEn)}</p></div>
                    <div class="${d?'bg-red-950/40 border-red-800':'bg-red-50 border-red-100'} rounded-2xl p-4 border"><p class="${d?'text-red-400':'text-red-600'} font-bold text-xs mb-1.5">⚔️ ${l==='bn'?'শাহাদাত':'Martyrdom'}</p><p class="font-semibold text-sm">${sanitize(l==='bn'?im.martyrdomBn:im.martyrdomEn)}</p></div>
                </div>
                <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-2xl p-5 mb-5"><h3 class="font-bold mb-3 text-sm">📝 ${l==='bn'?'পরিচিতি':'About'}</h3><p class="${d?'text-gray-300':'text-gray-700'} leading-relaxed text-sm">${sanitize(l==='bn'?im.descBn:im.descEn)}</p></div>
                <div class="rounded-2xl p-5" style="background:linear-gradient(135deg,${ac}0d,${ac2}07);border-left:4px solid ${ac}">
                    <div class="flex justify-between items-center mb-3"><h3 class="font-bold text-sm flex items-center gap-2"><span style="color:${ac}">💬</span>${l==='bn'?'বিখ্যাত উক্তি':'Famous Quote'}</h3>
                    <button data-action="shareImamQuote" data-param="${im.id}" class="text-xs px-3 py-1.5 rounded-xl font-bold hover:scale-105 transition-all" style="background:${ac}18;color:${ac}">🔗 ${l==='bn'?'শেয়ার':'Share'}</button></div>
                    <p class="text-base italic leading-relaxed">"${sanitize(l==='bn'?im.quoteBn:im.quoteEn)}"</p>
                </div>
            </div>
        </div>
        <div class="flex justify-between gap-4">
            ${prev?`<button data-action="viewImam" data-param="${prev.id}" class="${d?'bg-gray-800 hover:bg-gray-700 border-gray-700':'bg-white hover:bg-gray-50 border-gray-200'} border rounded-2xl px-5 py-3 font-semibold text-sm flex items-center gap-2 hover:scale-[1.02] transition-all" style="flex:1">← ${sanitize(l==='bn'?prev.nameBn:prev.nameEn)}</button>`:'<div style="flex:1"></div>'}
            ${next?`<button data-action="viewImam" data-param="${next.id}" class="${d?'bg-gray-800 hover:bg-gray-700 border-gray-700':'bg-white hover:bg-gray-50 border-gray-200'} border rounded-2xl px-5 py-3 font-semibold text-sm flex items-center gap-2 justify-end hover:scale-[1.02] transition-all" style="flex:1">${sanitize(l==='bn'?next.nameBn:next.nameEn)} →</button>`:'<div style="flex:1"></div>'}
        </div>
    </div>`;
}

// ============================================================================
// PAGE: TASBEEH COUNTER
// ============================================================================
function renderTasbeehPage()
{
    const d=state.darkMode; const l=state.language;
    const curLbl=tasbeehLabels.find(lb=>(l==='bn'?lb.bn:lb.en)===state.tasbeehLabel)||tasbeehLabels[0];
    const pct=Math.min(1,state.tasbeehCount/state.tasbeehTarget);
    const R=88; const C=2*Math.PI*R; const OFF=C*(1-pct);
    return `
    <div class="space-y-8 page-enter">
        <div><h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">📿 ${t('tasbeeh')}</h2><p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'ডিজিটাল তাসবিহ কাউন্টার':'Digital Tasbeeh Counter'}</p></div>
        <div class="grid md:grid-cols-2 gap-8">
            <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-8 text-center" style="box-shadow:var(--shadow-lg);position:relative">
                <div class="gold-top-bar" style="position:absolute;top:0;left:0;right:0;border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
                <div class="mb-6"><p class="arabic-text" style="font-size:2rem">${sanitize(curLbl.arabic)}</p><p class="font-bold text-xl mt-1">${sanitize(l==='bn'?curLbl.bn:curLbl.en)}</p><p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'লক্ষ্য':'Target'}: <span class="${d?'text-emerald-400':'text-emerald-600'} font-bold">${curLbl.target}</span></p></div>
                <div style="position:relative;width:220px;height:220px;margin:0 auto 1.5rem">
                    <svg width="220" height="220" style="position:absolute;inset:0;transform:rotate(-90deg)">
                        <circle cx="110" cy="110" r="${R}" fill="none" stroke="${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)'}" stroke-width="8"/>
                        <circle cx="110" cy="110" r="${R}" fill="none" stroke="url(#tg)" stroke-width="8" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${OFF.toFixed(1)}" stroke-linecap="round" style="transition:stroke-dashoffset .4s ease"/>
                        <defs><linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs>
                    </svg>
                    <button data-action="tasbeehTap" id="tasbeeh-main-btn" class="tasbeeh-btn ${d?'tasbeeh-btn-dark':''}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transition:box-shadow .1s,filter .1s">
                        <span style="font-size:3rem;font-weight:900;font-variant-numeric:tabular-nums;line-height:1">${state.tasbeehCount}</span>
                        <span style="font-size:.78rem;opacity:.65;margin-top:4px">${l==='bn'?'ট্যাপ করুন':'Tap'}</span>
                    </button>
                </div>
                <div class="mb-5"><div class="flex justify-between text-xs font-semibold mb-1.5"><span class="${d?'text-gray-400':'text-gray-500'} tasbeeh-progress-text">${state.tasbeehCount} / ${state.tasbeehTarget}</span><span class="${d?'text-emerald-400':'text-emerald-600'} tasbeeh-progress-pct">${Math.round(pct*100)}%</span></div><div class="${d?'bg-gray-900':'bg-gray-100'} rounded-full h-2 overflow-hidden"><div class="progress-bar tasbeeh-progress-inner h-2 rounded-full" style="width:${Math.round(pct*100)}%"></div></div></div>
                <button data-action="tasbeehReset" class="px-8 py-2.5 rounded-2xl text-sm font-bold hover:scale-105 transition-all" style="background:${d?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)'};border:1px solid ${d?'rgba(255,255,255,.08)':'rgba(0,0,0,.07)'}">🔄 ${l==='bn'?'রিসেট':'Reset'}</button>
            </div>
            <div class="space-y-5">
                <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-6" style="box-shadow:var(--shadow-md)">
                    <h3 class="font-bold text-lg mb-4">${l==='bn'?'তাসবিহ বেছে নিন':'Choose Tasbeeh'}</h3>
                    <div class="space-y-2.5">
                        ${tasbeehLabels.map((lb,i)=>{const act=(l==='bn'?lb.bn:lb.en)===state.tasbeehLabel;return`
                        <button data-action="tasbeehSetLabel" data-param="${i}" class="w-full text-left rounded-2xl px-4 py-3.5 border-2 transition-all hover:scale-[1.01]" style="${act?'border-color:#059669;background:linear-gradient(135deg,rgba(5,150,105,.12),rgba(5,150,105,.06));box-shadow:0 3px 12px rgba(5,150,105,.15)':(d?'border-color:rgba(255,255,255,.07);background:rgba(255,255,255,.03)':'border-color:rgba(0,0,0,.06);background:rgba(0,0,0,.02)')}">
                            <div class="flex justify-between items-center mb-1"><span class="font-bold text-sm ${act?(d?'text-emerald-400':'text-emerald-700'):''}">${sanitize(l==='bn'?lb.bn:lb.en)}</span><span class="text-xs px-2 py-0.5 rounded-full font-bold" style="${act?'background:rgba(5,150,105,.2);color:#059669':(d?'background:rgba(255,255,255,.07);color:#6b7280':'background:rgba(0,0,0,.05);color:#9ca3af')}">${lb.target}×</span></div>
                            <p style="font-family:'Amiri',serif;font-size:.95rem;opacity:.7;line-height:1.4">${sanitize(lb.arabic)}</p>
                        </button>`}).join('')}
                    </div>
                </div>
                ${state.tasbeehHistory.length?`
                <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-6" style="box-shadow:var(--shadow-sm)">
                    <h3 class="font-bold text-lg mb-4">🕒 ${l==='bn'?'ইতিহাস':'History'}</h3>
                    <div class="space-y-2">${state.tasbeehHistory.slice(0,5).map(h=>`<div class="flex justify-between items-center ${d?'bg-gray-900':'bg-gray-50'} rounded-xl px-4 py-3"><span class="text-sm font-semibold">${sanitize(h.label)}</span><span class="${d?'text-emerald-400':'text-emerald-600'} font-bold stat-badge">${h.count}×</span><span class="text-xs ${d?'text-gray-500':'text-gray-400'}">${sanitize(h.date)}</span></div>`).join('')}</div>
                </div>
                <!-- Zikr History Bar Chart -->
                <div class="card-luxury ${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border p-6" style="box-shadow:var(--shadow-sm)">
                    <h3 class="font-bold text-lg mb-4">📊 ${l==='bn'?'যিকির চার্ট':'Zikr Chart'}</h3>
                    ${(()=>{
                        const hist = state.tasbeehHistory.slice(0,7).reverse();
                        const maxC = Math.max(...hist.map(h=>h.count), 1);
                        return `<div class="flex items-end gap-2" style="height:120px">
                            ${hist.map(h=>{
                                const barH = Math.max(8, Math.round((h.count/maxC)*100));
                                const c=h.count>=h.target?'#059669':'#b45309';
                                return `<div class="flex-1 flex flex-col items-center gap-1">
                                    <span class="text-xs font-bold stat-badge" style="color:${c}">${h.count}</span>
                                    <div class="w-full rounded-t-lg hist-bar" style="height:${barH}px;background:linear-gradient(to top,${c},${c}88);--bar-h:${barH}px;min-height:8px"></div>
                                    <span class="text-xs ${d?'text-gray-500':'text-gray-400'} truncate w-full text-center" style="font-size:.6rem">${sanitize(h.label.slice(0,6))}</span>
                                </div>`;
                            }).join('')}
                        </div>`;
                    })()}
                </div>`:''}
            </div>
        </div>
    </div>`;
}

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
function renderSearchPage() {
    const d=state.darkMode; const l=state.language;
    const q=state.searchQuery; const results=state.searchResults;
    function hl(text) {
        if(!q||!text) return sanitize(text||'');
        const safe = sanitize(text);
        const escaped = sanitize(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        if(!escaped) return safe;
        return safe.replace(new RegExp(escaped,'gi'), m=>`<mark>${m}</mark>`);
    }
    return `
    <div class="space-y-8">
        <h2 class="text-3xl font-bold">🔍 ${t('searchPage')}</h2>
        <div class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-6">
            <div class="flex gap-3">
                <input id="search-input" type="search" value="${sanitize(q)}"
                    placeholder="${l==='bn'?'ব্লগ, দোয়া, হাদিস, যিয়ারত, ইমাম, পিডিএফ খুঁজুন...':'Search posts, duas, hadiths, ziyarat, imams, PDFs...'}"
                    class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 flex-1 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                    autofocus />
            </div>
        </div>
        ${q?`
        <p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${results.length} ${l==='bn'?'টি ফলাফল পাওয়া গেছে':'results found'} "${sanitize(q)}" ${l==='bn'?'এর জন্য':'for'}</p>
        ${results.length===0?`
            <div class="text-center py-16 ${d?'text-gray-500':'text-gray-400'}">
                <div class="text-6xl mb-4">🔍</div>
                <p>${l==='bn'?'কোনো ফলাফল পাওয়া যায়নি':'No results found'}</p>
            </div>`:
        `<div class="space-y-4">
            ${results.map(r=>{
                if (r.type==='post') return `
                    <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-5 fade-in">
                        <span class="text-xs px-2 py-0.5 rounded ${d?'bg-blue-900 text-blue-300':'bg-blue-100 text-blue-600'} mb-2 inline-block">${l==='bn'?'ব্লগ':'Blog'}</span>
                        <h3 class="font-bold text-lg mb-1">${hl(l==='bn'?r.item.titleBn:r.item.titleEn)}</h3>
                        <p class="text-sm ${d?'text-gray-400':'text-gray-600'} mb-3">${hl(r.item.excerpt||'')}</p>
                        <button data-action="readPost" data-param="${r.item.id}" class="${d?'text-green-400':'text-green-600'} text-sm font-medium hover:underline">${t('readMore')} →</button>
                    </div>`;
                if (r.type==='dua') return `
                    <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-5 fade-in">
                        <span class="text-xs px-2 py-0.5 rounded ${d?'bg-purple-900 text-purple-300':'bg-purple-100 text-purple-600'} mb-2 inline-block">${l==='bn'?'দোয়া':'Dua'}</span>
                        <h3 class="font-bold text-lg mb-1">${hl(l==='bn'?r.item.titleBn:r.item.titleEn)}</h3>
                        <p class="text-sm ${d?'text-gray-400':'text-gray-600'} mb-3">${hl(l==='bn'?r.item.meaningBn:r.item.meaningEn)}</p>
                        <button data-action="readDua" data-param="${r.index}" class="${d?'text-green-400':'text-green-600'} text-sm font-medium hover:underline">${t('readMore')} →</button>
                    </div>`;
                if (r.type==='imam') return `
                    <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-5 fade-in">
                        <span class="text-xs px-2 py-0.5 rounded ${d?'bg-green-900 text-green-300':'bg-green-100 text-green-600'} mb-2 inline-block">${l==='bn'?'ইমাম':'Imam'}</span>
                        <h3 class="font-bold text-lg mb-1">${r.item.icon} ${hl(l==='bn'?r.item.nameBn:r.item.nameEn)}</h3>
                        <p class="text-sm ${d?'text-gray-400':'text-gray-600'} mb-3">${hl(l==='bn'?r.item.descBn:r.item.descEn)}</p>
                        <button data-action="viewImam" data-param="${r.item.id}" class="${d?'text-green-400':'text-green-600'} text-sm font-medium hover:underline">${l==='bn'?'বিস্তারিত':'Details'} →</button>
                    </div>`;
                if (r.type==='pdf') return `
                    <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-5 fade-in">
                        <span class="text-xs px-2 py-0.5 rounded ${d?'bg-amber-900 text-amber-300':'bg-amber-100 text-amber-700'} mb-2 inline-block">${l==='bn'?'পিডিএফ':'PDF'}</span>
                        <h3 class="font-bold text-lg">${hl(r.item.name)}</h3>
                        <p class="text-xs ${d?'text-gray-500':'text-gray-400'} mt-1">${sanitize(r.item.sizeFmt)}</p>
                    </div>`;
                if (r.type==='hadith') return `
                    <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-5 fade-in">
                        <span class="text-xs px-2 py-0.5 rounded ${d?'bg-teal-900 text-teal-300':'bg-teal-100 text-teal-700'} mb-2 inline-block">${l==='bn'?'হাদিস':'Hadith'}</span>
                        <p class="text-sm ${d?'text-gray-300':'text-gray-700'} mb-2 leading-relaxed">${hl(l==='bn'?r.item.textBn:r.item.textEn)}</p>
                        <p class="text-xs ${d?'text-gray-500':'text-gray-400'}">— ${sanitize(l==='bn'?r.item.sourceBn:r.item.sourceEn)}</p>
                    </div>`;
                if (r.type==='ziyarat') return `
                    <div class="${d?'bg-gray-800':'bg-white'} border rounded-xl p-5 fade-in">
                        <span class="text-xs px-2 py-0.5 rounded ${d?'bg-amber-900 text-amber-300':'bg-amber-100 text-amber-700'} mb-2 inline-block">${l==='bn'?'যিয়ারত':'Ziyarat'}</span>
                        <h3 class="font-bold text-lg mb-1">${hl(l==='bn'?r.item.titleBn:r.item.titleEn)}</h3>
                        <button data-action="readZiyarat" data-param="${r.item.id}" class="${d?'text-amber-400':'text-amber-700'} text-sm font-medium hover:underline">${t('readMore')} →</button>
                    </div>`;
                return '';
            }).join('')}
        </div>`}`:''}
    </div>`;
}

// ============================================================================
// PAGE: ANALYTICS (Admin)
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
    if (!window._qiblaOrientBound && typeof qiblaAngleForCompass !== 'undefined') {
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

function renderBlogEditorModal() {
    if (!state.showBlogEditor || !state.editingPost) return '';
    const d=state.darkMode; const l=state.language;
    const p=state.editingPost;
    const isNew=String(p.id).startsWith('custom_')&&!state.customPosts.find(cp=>cp.id===p.id);
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
                    <input id="blog-editor-titleBn" type="text" value="${sanitize(p.titleBn)}"
                        class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                    <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'শিরোনাম (ইংরেজি)':'Title (English)'}</label>
                    <input id="blog-editor-titleEn" type="text" value="${sanitize(p.titleEn)}"
                        class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'ক্যাটাগরি':'Category'}</label>
                        <input id="blog-editor-category" type="text" value="${sanitize(p.category)}"
                            class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                        <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'পড়ার সময়':'Read Time'}</label>
                        <input id="blog-editor-readTime" type="text" value="${sanitize(p.readTime)}"
                            class="${d?'bg-gray-900 border-gray-700 text-white':'bg-gray-50 border-gray-300'} border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                </div>
                <div>
                    <label class="block mb-1.5 text-sm font-medium">${l==='bn'?'সারসংক্ষেপ':'Excerpt'}</label>
                    <input id="blog-editor-excerpt" type="text" value="${sanitize(p.excerpt)}"
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
    return `
    <div class="max-w-3xl mx-auto">
        <button data-action="changePage" data-param="${state.previousPage||'dua'}" class="${d?'text-amber-400':'text-amber-700'} mb-6 hover:underline flex items-center gap-2">← ${l==='bn'?'ফিরে যান':'Back'}</button>
        <article class="${d?'bg-gray-800':'bg-white'} border rounded-2xl p-8" style="border-top:3px solid #B45309">
            <div class="flex items-center gap-3 mb-6 flex-wrap">
                <span class="${d?'gold-badge-dark':'gold-badge'}">☪️ ${l==='bn'?'যিয়ারত':'Ziyarat'}</span>
                ${z.occasion ? `<span class="text-sm ${d?'text-amber-400':'text-amber-700'} font-medium">📅 ${sanitize(z.occasion)}</span>` : ''}
            </div>
            <h1 class="text-3xl font-bold mb-2">${sanitize(l==='bn'?z.titleBn:z.titleEn)}</h1>
            ${z.source ? `<p class="text-sm ${d?'text-gray-400':'text-gray-500'} mb-6">${sanitize(z.source)}</p>` : '<div class="mb-6"></div>'}

            <div class="${d?'bg-gray-900 border-gray-700':'bg-amber-50 border-amber-200'} border rounded-xl p-8 mb-6">
                <h2 class="text-sm font-bold text-center mb-4 ${d?'text-amber-400':'text-amber-700'}">${l==='bn'?'আরবি পাঠ':'Arabic Text'}</h2>
                <p class="arabic-text text-center leading-loose" dir="rtl" lang="ar" style="font-size:1.8rem;line-height:2.5">${sanitize(z.arabic)}</p>
            </div>
            ${z.transliteration ? `
            <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-xl p-6 mb-6">
                <h2 class="text-sm font-bold mb-3 ${d?'text-gray-300':'text-gray-600'}">${l==='bn'?'উচ্চারণ':'Transliteration'}</h2>
                <p class="italic text-base leading-relaxed">${sanitize(z.transliteration)}</p>
            </div>` : ''}
            <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-xl p-6 mb-6">
                <h2 class="text-sm font-bold mb-3 ${d?'text-amber-400':'text-amber-700'}">${l==='bn'?'বাংলা অর্থ':'Bengali Meaning'}</h2>
                <p class="text-base leading-relaxed">${sanitize(z.meaningBn)}</p>
            </div>
            ${z.meaningEn ? `
            <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-xl p-6 mb-6">
                <h2 class="text-sm font-bold mb-3 ${d?'text-amber-400':'text-amber-700'}">${l==='bn'?'ইংরেজি অর্থ':'English Meaning'}</h2>
                <p class="text-base leading-relaxed">${sanitize(z.meaningEn)}</p>
            </div>` : ''}
            ${z.fullTextBn ? `
            <div class="${d?'bg-gray-900':'bg-gray-50'} rounded-xl p-6">
                <h2 class="text-sm font-bold mb-3 ${d?'text-green-400':'text-green-700'}">${l==='bn'?'বিস্তারিত পাঠ':'Full Text'}</h2>
                <p class="text-base leading-relaxed whitespace-pre-line">${sanitize(z.fullTextBn)}</p>
            </div>` : ''}
        </article>
    </div>`;
}

// ============================================================================
// MOBILE BOTTOM NAV
// ============================================================================
function renderMobileBottomNav() {
    const d=state.darkMode; const l=state.language;
    const nav=document.getElementById('mobile-bottom-nav');
    if(!nav) return;
    const items=[
        {page:'home',icon:'🏠',label:l==='bn'?'হোম':'Home'},
        {page:'imams',icon:'👑',label:l==='bn'?'ইমাম':'Imams'},
        {page:'dua',icon:'🤲',label:l==='bn'?'দোয়া':'Dua'},
        {page:'tasbeeh',icon:'📿',label:l==='bn'?'তাসবিহ':'Tasbeeh'},
        {page:'blog',icon:'📖',label:l==='bn'?'ব্লগ':'Blog'},
    ];
    nav.style.background=d?'rgba(17,24,39,0.96)':'rgba(255,255,255,0.96)';
    nav.style.borderTopColor=d?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)';
    nav.innerHTML=items.map(item=>`
        <button class="bnav-btn ${state.currentPage===item.page?'active':''}"
            style="color:${state.currentPage===item.page?'#059669':(d?'#9ca3af':'#6b7280')}"
            onclick="changePage('${item.page}')">
            <span class="bnav-icon">${item.icon}</span>
            <span>${item.label}</span>
        </button>`).join('');
}

// ============================================================================
// MAIN RENDER (updated)
// ============================================================================
function renderMainContent() {
    const pages={
        home:renderHomePage, blog:renderBlogPage, library:renderLibraryPage,
        media:renderMediaPage, dua:renderDuaPage, calendar:renderCalendarPage,
        contact:renderContactPage, about:renderAboutPage, bookmarks:renderBookmarksPage,
        readPost:renderReadPostPage, readDua:renderReadDuaPage, viewer:renderViewerPage,
        imams:renderImamsPage, imamDetail:renderImamDetailPage,
        tasbeeh:renderTasbeehPage, quiz:renderQuizPage,
        searchPage:renderSearchPage, analytics:renderAnalyticsPage,
        readZiyarat:renderReadZiyaratPage,
        asmaul:renderAsmaulHusnaPage, qibla:renderQiblaPage,
        muharram:renderMuharramPage,
        'shia-days':renderShiaDaysPage,
    };
    return (pages[state.currentPage]||pages.home)();
}

function render() {
    document.documentElement.lang = state.language==='bn'?'bn':'en';
    document.body.className = (state.darkMode?'bg-gray-950 text-white':'bg-gray-50 text-gray-900') + ' fs-'+state.fontSize+' islamic-pattern-bg';
    document.getElementById('app').innerHTML = `
        ${renderMobileMenu()}
        ${renderHeader()}
        <main class="max-w-7xl mx-auto px-4 py-8" role="main">
            ${renderMainContent()}
        </main>
        ${renderFooter()}
        ${renderUploadModal()}
        ${renderAdminLoginModal()}
        ${renderBlogEditorModal()}
        ${renderDuaEditorModal()}
        ${renderHadithEditorModal()}
        ${renderKnowledgeEditorModal()}
        ${renderAyahEditorModal()}
        ${renderMuharramEditorModal()}
        ${renderShiaDayEditorModal()}
    `;
    // load lazy images after render
    document.querySelectorAll('img[data-src-id]').forEach(img => {
        const id = img.getAttribute('data-src-id');
        dbGet(id).then(data => { if(data) img.src=data; }).catch(()=>{});
    });
    // mobile bottom nav
    renderMobileBottomNav();
    if(typeof premiumAfterRender==='function') requestAnimationFrame(premiumAfterRender);
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
// PWA SERVICE WORKER (Inline)
// ============================================================================
function registerPWA() {
    if (!('serviceWorker' in navigator)) return;
    const swCode = `
const CACHE = 'ahlbayt-v1';
const ASSETS = [self.location.href.replace('/sw-inline','')];
self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(caches.match(e.request).then(cached => {
        const net = fetch(e.request).then(res => {
            if (res && res.status === 200) {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return res;
        }).catch(()=>cached);
        return cached || net;
    }));
});`;
    try {
        const blob = new Blob([swCode], {type:'application/javascript'});
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl, {scope:'./'}).then(reg=>{
            console.log('SW registered:', reg.scope);
        }).catch(e=>console.log('SW reg failed:',e));
    } catch(e) { console.log('SW blob failed:',e); }

    // Add dynamic manifest for PWA installability
    try {
        const manifest = {
            name: 'আহলে বাইত (আ.)',
            short_name: 'আহলে বাইত',
            description: 'ইসলামিক জ্ঞান ও শিক্ষার জন্য আপনার বিশ্বস্ত উৎস',
            start_url: './',
            display: 'standalone',
            background_color: '#059669',
            theme_color: '#059669',
            icons: [{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="%23059669"/><text x="20" y="27" text-anchor="middle" font-size="18" fill="white">☽</text></svg>',sizes:'any',type:'image/svg+xml'}]
        };
        const mBlob = new Blob([JSON.stringify(manifest)],{type:'application/json'});
        const mUrl = URL.createObjectURL(mBlob);
        document.getElementById('pwa-manifest').href = mUrl;
    } catch(e) {}
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
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.07, rootMargin: '0px 0px -20px 0px' });
    els.forEach(el => io.observe(el));
}
function initHeaderScroll() {
    if (window._headerScrollInit) return; // prevent duplicate listeners
    window._headerScrollInit = true;
    const fn = () => {
        const h = document.querySelector('header');
        if(h) h.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', fn, { passive: true });
    fn();
}
let _pClk = null;
function startPrayerClock() {
    if (_pClk) return; // already running — don't add another interval
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
    if (_npClock) return; // already running — don't restart on every render
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
    // Cloudinary config must be available before cloud fetches
    if (typeof CLOUDINARY_CLOUD_NAME === 'undefined') {
        window.CLOUDINARY_CLOUD_NAME    = "ahlalbayt";
        window.CLOUDINARY_UPLOAD_PRESET = "ahlalbayt_upload";
    }
    fetchBlogFromCloud();  // load blog posts from Cloudinary (cross-device)
    fetchMediaFromCloud(); // load media index from Cloudinary (cross-device)
    setTimeout(hideSplash, 2600);
}

// ============================================================================
// IMAM CARD ANIMATIONS — flip & particles
// ============================================================================

/** Toggle 3-D flip on an imam card */
function imamFlip(flipId) {
    const wrapper = document.getElementById(flipId);
    if (!wrapper) return;
    const outer = wrapper.closest('.imam-flip-wrapper');
    if (!outer) return;
    outer.classList.toggle('flipped');
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
                    <input id="mev-date" type="text" value="${sanitize(ev.date||'')}" placeholder="যেমন: ১০ মহররম"
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
        {id:'s1', icon:'🚶', date:l==='bn'?'১ মহররম':'1 Muharram', color:'#3b82f6', titleBn:l==='bn'?'ইমাম হোসাইন (আ.) মদিনা থেকে যাত্রা শুরু':'Imam Husayn (AS) Departs Madinah', descBn:l==='bn'?'ইয়াজিদের বায়াত প্রত্যাখ্যান করে পরিবার ও সঙ্গীদের নিয়ে মদিনা ত্যাগ করেন।':'Refusing to pledge allegiance to Yazid, he left Madinah with his family and companions.'},
        {id:'s2', icon:'🏜️', date:l==='bn'?'৩ মহররম':'3 Muharram', color:'#f59e0b', titleBn:l==='bn'?'কারবালায় পৌঁছানো':'Arrival at Karbala', descBn:l==='bn'?'ইমামের কাফেলা কারবালার প্রান্তরে পৌঁছায়। হুর ইবনে ইয়াযিদের বাহিনী পথ রোধ করে।':"The Imam's caravan reaches the plains of Karbala. Hurr ibn Yazid's forces block their path."},
        {id:'s3', icon:'💧', date:l==='bn'?'৭ মহররম':'7 Muharram', color:'#ef4444', titleBn:l==='bn'?'পানি সরবরাহ বন্ধ':'Water Supply Cut Off', descBn:l==='bn'?'ফোরাত নদীর পানি সম্পূর্ণ বন্ধ করা হয়। ৭২ সঙ্গী ও শিশুরা পিপাসায় কষ্ট পেতে থাকে।':'Access to the Euphrates river is completely blocked. The 72 companions and children suffer from thirst.'},
        {id:'s4', icon:'🌙', date:l==='bn'?'৯ মহররম (তাসুআ)':'9 Muharram (Tasua)', color:'#8b5cf6', titleBn:l==='bn'?'তাসুআ — শেষ রাত':'Tasua — The Last Night', descBn:l==='bn'?'ইমাম সঙ্গীদের মুক্ত করে দেন। রাতভর ইবাদত, নামাজ ও কুরআন তিলাওয়াত।':'The Imam releases his companions from obligation. The night is spent in worship, prayer, and recitation of the Quran.'},
        {id:'s5', icon:'⚔️', date:l==='bn'?'১০ মহররম (আশুরা)':'10 Muharram (Ashura)', color:'#dc2626', titleBn:l==='bn'?'🔴 আশুরা — কারবালার মহাশাহাদাত':'🔴 Ashura — The Great Martyrdom of Karbala', descBn:l==='bn'?'৭২ জন বনাম ৩০,০০০ সৈন্য। একে একে সব সঙ্গী শহীদ হন। ইমাম হোসাইন (আ.) আসর নামাজের পর শাহাদাত বরণ করেন।':'72 against 30,000 soldiers. All companions are martyred one by one. Imam Husayn (AS) is martyred after the Asr prayer.'},
        {id:'s6', icon:'⛓️', date:l==='bn'?'১১ মহররম':'11 Muharram', color:'#6b7280', titleBn:l==='bn'?'বন্দী কাফেলা কুফার পথে':'Captive Caravan Towards Kufa', descBn:l==='bn'?'হযরত যয়নাব (আ.) সহ মহিলা ও শিশুদের বন্দী করে কুফায় নেওয়া হয়।':'Lady Zaynab (AS) and the women and children are taken captive towards Kufa.'},
        {id:'s7', icon:'🗣️', date:l==='bn'?'সফর মাস':'Month of Safar', color:'#059669', titleBn:l==='bn'?'যয়নাব (আ.)-এর ঐতিহাসিক ভাষণ':"Zaynab (AS)'s Historic Speech", descBn:l==='bn'?'যয়নাব (আ.) ইয়াজিদের দরবারে ঐতিহাসিক ভাষণ দেন। কারবালার বার্তা বিশ্বে ছড়িয়ে দেন।':"Zaynab (AS) delivers her historic speech in Yazid's court, spreading the message of Karbala to the world."},
    ];
    const allTimeline = [...staticTimeline, ...state.muharramEvents];

    const majalis = [
        {icon:'🕌', time:l==='bn'?'১–১০ মহররম':'1–10 Muharram', titleBn:l==='bn'?'মজলিস':'Majlis', descBn:l==='bn'?'শোকসভা যেখানে বক্তা কারবালার ঘটনা বর্ণনা করেন।':'A mourning gathering where a speaker narrates the events of Karbala.'},
        {icon:'🕯️', time:l==='bn'?'১০ মহররম রাত':'Night of 10 Muharram', titleBn:l==='bn'?'শাম-এ-গরিবান':'Sham-e-Ghariban', descBn:l==='bn'?'আশুরার রাতে মোমবাতি জ্বালিয়ে ইমামের শিবিরে আগুনের স্মরণ।':"Candles are lit on the night of Ashura to commemorate the burning of the Imam's camp."},
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
            <h2 style="font-size:2rem;font-weight:900;color:#f87171;margin-bottom:.25rem">${l==='bn'?'মহররম ও আশুরা':'Muharram & Ashura'}</h2>
            <p class="arabic-text" dir="rtl" style="color:#fca5a5;font-size:1.4rem">يَا أَبَا عَبْدِ اللَّهِ السَّلَامُ عَلَيْكَ</p>
        </div>

        <div class="${d?'bg-gray-800 border-red-900':'bg-red-50 border-red-200'} border-2 rounded-2xl p-6 text-center" style="box-shadow:0 4px 20px rgba(220,38,38,.15)">
            <p class="text-sm font-bold mb-3" style="color:#dc2626">${l==='bn'?'🕐 আশুরা কাউন্টডাউন':'🕐 Ashura Countdown'}</p>
            ${cdHtml}
            <p class="text-sm mt-2 ${d?'text-gray-400':'text-gray-600'}">📅 ${ashuraDateStr}</p>
            <p class="text-xs mt-1 ${d?'text-gray-500':'text-gray-500'}">${l==='bn'?`১০ মহররম ${toBengaliDigits(hijriYear)} হিজরি`:`10 Muharram ${hijriYear} AH`}</p>
        </div>

        <div>
            <div class="flex gap-2 flex-wrap mb-5">
                ${[[`tl`, l==='bn'?'📜 কারবালার ঘটনা':'📜 Events of Karbala'],[`mj`, l==='bn'?'🕌 মজলিস ও আমল':'🕌 Majlis & Practices'],[`zr`, l==='bn'?'🤲 বিশেষ যিয়ারত':'🤲 Special Ziyarat']].map(([id,label],i)=>`
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
                    <h4 class="font-bold mb-3" style="color:#dc2626">${l==='bn'?'📌 মহররমের বিশেষ আমল':'📌 Special Practices of Muharram'}</h4>
                    <ul class="space-y-1.5 text-sm ${d?'text-gray-300':'text-gray-700'}">
                        ${(l==='bn'?['যিয়ারত আশুরা পাঠ (১–১০ মহররম)','ইমাম হোসাইনের জন্য শোক পালন','কারবালার ঘটনা পরিবারে আলোচনা','দোয়ায়ে তাওয়াসসুল পাঠ','মজলিসে অংশগ্রহণ','আশুরার দিন খাবার সীমিত রাখা']:['Recite Ziyarat Ashura (1–10 Muharram)','Mourn for Imam Husayn','Discuss the events of Karbala with family','Recite Dua Tawassul','Attend Majlis gatherings','Limit food on the day of Ashura']).map(a=>`<li>✅ ${a}</li>`).join('')}
                    </ul>
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
                    <button data-action="changePage" data-param="dua" class="mt-3 text-sm font-bold px-4 py-2 rounded-xl" style="background:#05966918;color:#059669">${l==='bn'?'🤲 দোয়া পেজে যান →':'🤲 Go to Dua Page →'}</button>
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// শিয়া বিশেষ দিনসমূহ পেজ — CRUD সহ
// ============================================================================
function renderShiaDaysPage() {
    const d = state.darkMode, l = state.language;

    const staticDays = [
        {id:'st1', icon:'👑', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৮ জিলহজ':'18 Dhul Hijjah', titleBn:l==='bn'?'ঈদে গাদির খুম':'Eid al-Ghadeer Khumm', arabicTitle:'عيد الغدير', descBn:l==='bn'?'১০ম হিজরিতে বিদায় হজ থেকে ফেরার পথে গাদির খুমে রাসূলুল্লাহ (সা.) আল্লাহর নির্দেশে ইমাম আলী (আ.)-কে উম্মাহর নেতা ঘোষণা করেন।':'On returning from the Farewell Hajj in 10 AH, the Prophet (PBUH) declared Imam Ali (AS) as the leader of the Ummah at Ghadir Khumm by divine command.', amaal:l==='bn'?'রোজা, গোসল, নতুন পোশাক, মুমিনদের অভিনন্দন, দোয়ায়ে নুদবা পাঠ':'Fasting, Ghusl, new clothes, congratulating believers, reciting Dua Nudbah', importance:l==='bn'?'শিয়া ইসলামের সর্বোচ্চ উৎসব':'The greatest celebration of Shia Islam'},
        {id:'st2', icon:'✨', color:'#7c3aed', type:'eid', hijriDate:l==='bn'?'২৪ জিলহজ':'24 Dhul Hijjah', titleBn:l==='bn'?'ঈদে মুবাহিলা':'Eid al-Mubahala', arabicTitle:'عيد المباهلة', descBn:l==='bn'?'৯ম হিজরিতে নাজরানের খ্রিস্টানদের সাথে মুবাহিলায় রাসূলুল্লাহ (সা.) ইমাম আলী, ফাতেমা, হাসান ও হোসাইন (আ.)-কে নিলেন। খ্রিস্টানরা পিছিয়ে যায়।':'In 9 AH, for the Mubahala with the Christians of Najran, the Prophet brought Imam Ali, Fatima, Hasan, and Husayn (AS). The Christians withdrew.', amaal:l==='bn'?'রোজা, গোসল, ২ রাকাত নামাজ':'Fasting, Ghusl, 2 Rakat prayer', importance:l==='bn'?'আহলে বাইতের শ্রেষ্ঠত্বের কুরআনি প্রমাণ':'Quranic proof of the excellence of the Ahlul Bayt'},
        {id:'st3', icon:'🌙', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৫ শাবান':'15 Shaban', titleBn:l==='bn'?'নিমে শাবান — ইমাম মাহদি (আ.) জন্মদিন':'Mid-Shaban — Birthday of Imam Mahdi (AS)', arabicTitle:'نيمه شعبان', descBn:l==='bn'?'১৫ শাবান, ২৫৫ হিজরি — ইমাম মাহদি (আ.) সামারায় জন্মগ্রহণ করেন। দ্বাদশ ইমাম আল্লাহর নির্দেশে গায়বতে আছেন।':'15 Shaban, 255 AH — Imam Mahdi (AS) was born in Samarra. The Twelfth Imam is in occultation by divine command.', amaal:l==='bn'?'দোয়ায়ে নুদবা, দোয়ায়ে আহদ, সালাওয়াত, রোজা':'Dua Nudbah, Dua Ahd, Salawat, Fasting', importance:l==='bn'?'ইমামে যামানার জন্মদিন':'Birthday of the Imam of Our Time'},
        {id:'st4', icon:'🦁', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৩ রজব':'13 Rajab', titleBn:l==='bn'?'ইমাম আলী (আ.) জন্মদিন':'Birthday of Imam Ali (AS)', arabicTitle:'مولد علي بن أبي طالب', descBn:l==='bn'?'১৩ রজব — কাবাঘরের ভেতরে ইমাম আলী (আ.)-এর জন্ম।':'13 Rajab — Imam Ali (AS) was born inside the Kaaba.', amaal:l==='bn'?'আনন্দ, দান-সদকা, নামাজ, যিয়ারত':'Celebration, charity, prayer, ziyarat', importance:l==='bn'?'একমাত্র ব্যক্তি যিনি কাবার ভেতরে জন্মগ্রহণ করেছেন':'The only person ever born inside the Kaaba'},
        {id:'st5', icon:'🌹', color:'#be185d', type:'eid', hijriDate:l==='bn'?'২০ জামাদিউস সানি':'20 Jumada al-Thani', titleBn:l==='bn'?'হযরত ফাতেমা যাহরা (আ.) জন্মদিন':'Birthday of Lady Fatima al-Zahra (AS)', arabicTitle:'مولد فاطمة الزهراء', descBn:l==='bn'?'"ফাতেমা আমার হৃদয়ের একটুকরো" — রাসূলুল্লাহ (সা.)। ইসলামের শ্রেষ্ঠ নারী।':'"Fatima is a piece of my heart" — Prophet (PBUH). The greatest woman in Islam.', amaal:l==='bn'?'মহিলাদের সম্মান, দান, দোয়া':'Honouring women, charity, dua', importance:l==='bn'?'ইরানে মহিলা দিবস হিসেবে পালিত':'Celebrated as Women\'s Day in Iran'},
        {id:'st6', icon:'🌸', color:'#059669', type:'eid', hijriDate:l==='bn'?'৩ শাবান':'3 Shaban', titleBn:l==='bn'?'ইমাম হোসাইন (আ.) জন্মদিন':'Birthday of Imam Husayn (AS)', arabicTitle:'مولد الحسين', descBn:l==='bn'?'"হোসাইন আমার থেকে, আমি হোসাইন থেকে।" — রাসূলুল্লাহ (সা.)।':'"Husayn is from me, and I am from Husayn." — Prophet (PBUH).', amaal:l==='bn'?'আনন্দ, দান, যিয়ারত ইমাম হোসাইন':'Celebration, charity, Ziyarat of Imam Husayn', importance:l==='bn'?'সাইয়্যিদুশ শুহাদার জন্মদিন':'Birthday of the Master of Martyrs'},
        {id:'st7', icon:'⭐', color:'#b45309', type:'special', hijriDate:l==='bn'?'১৯, ২১, ২৩ রমজান':'19, 21, 23 Ramadan', titleBn:l==='bn'?'লাইলাতুল ক্বদর (তিন রাত)':'Laylat al-Qadr (Three Nights)', arabicTitle:'ليلة القدر', descBn:l==='bn'?'১৯ রমজান — ইমাম আলী (আ.) আঘাতপ্রাপ্ত। ২১ রমজান — ইমাম আলী শহীদ। ২৩ রমজান — সর্বোচ্চ সম্ভাব্য ক্বদরের রাত।':'19 Ramadan — Imam Ali (AS) is struck. 21 Ramadan — Imam Ali is martyred. 23 Ramadan — the most probable Night of Qadr.', amaal:l==='bn'?'রাতভর ইবাদত, কুরআন মাথায় রাখা, দোয়ায়ে জওশানে কাবির':'All-night worship, placing the Quran on the head, Dua Jawshan al-Kabir', importance:l==='bn'?'হাজার মাসের চেয়ে উত্তম':'Better than a thousand months'},
        {id:'st8', icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২১ রমজান':'21 Ramadan', titleBn:l==='bn'?'ইমাম আলী (আ.) শাহাদাত':'Martyrdom of Imam Ali (AS)', arabicTitle:'شهادة علي بن أبي طالب', descBn:l==='bn'?'২১ রমজান — ইমাম আলী (আ.) শহীদ হন। তিনি বলেছিলেন: "রমজান মাসে ক্বদরের রাতে শাহাদাত — কতই না সৌভাগ্য।"':'21 Ramadan — Imam Ali (AS) is martyred. He said: "To be martyred on the Night of Qadr in Ramadan — what great fortune."', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম আলী, দোয়ায়ে কুমাইল':'Mourning, Ziyarat of Imam Ali, Dua Kumayl', importance:l==='bn'?'প্রথম ইমামের শাহাদাত ও ক্বদরের রাত':'Martyrdom of the First Imam and the Night of Qadr'},
        {id:'st9', icon:'🌹', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৩ জামাদিউস সানি':'3 Jumada al-Thani', titleBn:l==='bn'?'হযরত ফাতেমা যাহরা (আ.) শাহাদাত':'Martyrdom of Lady Fatima al-Zahra (AS)', arabicTitle:'شهادة فاطمة الزهراء', descBn:l==='bn'?'রাসূলুল্লাহ (সা.)-এর ওফাতের মাত্র ৭৫-৯৫ দিন পর শহীদ হন। তাঁর দাফনস্থান অজ্ঞাত।':'She was martyred only 75–95 days after the passing of the Prophet (PBUH). Her burial place remains unknown.', amaal:l==='bn'?'শোক পালন, ফাতেমার যিয়ারত':'Mourning, reciting Fatima\'s Ziyarat', importance:l==='bn'?'ইসলামের শ্রেষ্ঠ নারীর শাহাদাত':'Martyrdom of the greatest woman in Islam'},
        {id:'st10',icon:'🔴', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'১০ মহররম':'10 Muharram', titleBn:l==='bn'?'আশুরা — ইমাম হোসাইন (আ.) শাহাদাত':'Ashura — Martyrdom of Imam Husayn (AS)', arabicTitle:'عاشوراء', descBn:l==='bn'?'৬১ হিজরিতে কারবালায় ইমাম হোসাইন (আ.) পরিবার ও ৭২ সঙ্গীসহ শহীদ হন।':'In 61 AH at Karbala, Imam Husayn (AS) was martyred along with his family and 72 companions.', amaal:l==='bn'?'মজলিস, যিয়ারত আশুরা, শোক পালন':'Majlis, Ziyarat Ashura, mourning', importance:l==='bn'?'ইতিহাসের সর্বশ্রেষ্ঠ শাহাদাত':'The greatest martyrdom in history'},
    ];
    const allDays = [...staticDays, ...state.shiaSpecialDays];

    const typeBg = { eid: d?'#052e16':'#ecfdf5', martyrdom: d?'#1a0000':'#fef2f2', special: d?'#1c1400':'#fffbeb' };
    const typeColor = { eid:'#059669', martyrdom:'#dc2626', special:'#b45309' };
    const typeLabel = {
        eid: l==='bn'?'🎉 ঈদ/উৎসব':'🎉 Eid/Celebration',
        martyrdom: l==='bn'?'🕊️ শাহাদাত':'🕊️ Martyrdom',
        special: l==='bn'?'⭐ বিশেষ দিন':'⭐ Special Day'
    };
    const isStatic = id => id && id.startsWith('st');

    const cardHtml = items => items.map(item=>`
    <article class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl overflow-hidden card-hover" style="border-top:3px solid ${item.color||'#059669'}">
        <div class="p-5">
            <div class="flex items-start gap-3 mb-3">
                <span style="width:36px;height:36px;border-radius:10px;background:${item.color||'#059669'}18;display:inline-flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${item.icon||'✨'}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5 mb-1">
                        <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background:${typeBg[item.type]||typeBg.eid};color:${typeColor[item.type]||'#059669'}">${typeLabel[item.type]||typeLabel.eid}</span>
                        <span class="text-xs ${d?'text-gray-400':'text-gray-500'}">📅 ${sanitize(item.hijriDate||'')}</span>
                    </div>
                    <h3 class="font-bold text-base leading-snug">${sanitize(item.titleBn||'')}</h3>
                    ${item.arabicTitle?`<p class="arabic-text text-right text-sm mt-0.5" dir="rtl" style="color:${d?'#9ca3af':'#9ca3af'}">${sanitize(item.arabicTitle)}</p>`:''}
                </div>
                ${state.isAdmin && !isStatic(item.id)?`
                <div class="flex gap-1 flex-shrink-0">
                    <button data-action="openShiaDayEditor" data-param="${item.id}" class="text-xs px-2 py-1 rounded-lg ${d?'bg-gray-700 text-gray-300':'bg-gray-100 text-gray-600'} hover:opacity-80">✏️</button>
                    <button data-action="deleteShiaDay" data-param="${item.id}" class="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">🗑️</button>
                </div>`:
                state.isAdmin && isStatic(item.id)?'':''
                }
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

    const eids      = allDays.filter(x=>x.type==='eid');
    const specials  = allDays.filter(x=>x.type==='special');
    const martyrdoms= allDays.filter(x=>x.type==='martyrdom');

    return `<div class="space-y-8 page-enter">
        <button data-action="changePage" data-param="home" class="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all" style="background:${d?'rgba(5,150,105,.15)':'rgba(5,150,105,.08)'};color:#059669">← ${l==='bn'?'হোমে ফিরুন':'Back to Home'}</button>

        <div class="relative overflow-hidden rounded-3xl text-center" style="background:linear-gradient(135deg,#064e3b,#065f46,#1e3a8a);padding:2rem;box-shadow:0 8px 32px rgba(5,150,105,.3)">
            <div style="font-size:2.5rem;margin-bottom:.5rem">✨🌙⭐</div>
            <h2 style="font-size:1.8rem;font-weight:900;color:white">${l==='bn'?'শিয়া বিশেষ দিনসমূহ':'Shia Special Days'}</h2>
            <p style="color:rgba(255,255,255,.8);font-size:.9rem;margin-top:.25rem">${l==='bn'?'ঈদে গাদির · মুবাহিলা · শবে ক্বদর · নিমে শাবান · ইমামদের জন্ম-শাহাদাত':'Eid al-Ghadeer · Mubahala · Laylat al-Qadr · Mid-Shaban · Imams\' Birth & Martyrdom'}</p>
        </div>

        ${state.isAdmin?`
        <div class="flex justify-end">
            <button data-action="openShiaDayEditor" class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style="background:linear-gradient(135deg,#059669,#065f46)">＋ ${l==='bn'?'নতুন বিশেষ দিন যোগ করুন':'Add New Special Day'}</button>
        </div>`:''}

        <section>
            <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                <span style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#059669,#065f46);display:inline-flex;align-items:center;justify-content:center">🎉</span>
                ${l==='bn'?'ঈদ ও আনন্দময় দিন':'Eids & Celebrations'}
            </h3>
            <div class="grid md:grid-cols-2 gap-4">${cardHtml(eids)}</div>
        </section>

        <section>
            <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                <span style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#b45309,#92400e);display:inline-flex;align-items:center;justify-content:center">⭐</span>
                ${l==='bn'?'বিশেষ রাত':'Special Nights'}
            </h3>
            <div class="grid md:grid-cols-2 gap-4">${cardHtml(specials)}</div>
        </section>

        <section>
            <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                <span style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#dc2626,#991b1b);display:inline-flex;align-items:center;justify-content:center">🕊️</span>
                ${l==='bn'?'শাহাদাত দিবস':'Days of Martyrdom'}
            </h3>
            <div class="grid md:grid-cols-2 gap-4">${cardHtml(martyrdoms)}</div>
        </section>
    </div>`;
}

console.log('✅ ফিচার লোড: মুহাররম, শিয়া বিশেষ দিন CRUD সহ');
