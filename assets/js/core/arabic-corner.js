// ============================================================================
// ARABIC READING CORNER  (v206)  —  page `arabic`
// ----------------------------------------------------------------------------
// A small primer for reading the Arabic text of duas and ziyarats:
//   1. Letters  — the 28 letters, their four shapes (generated from the letter
//                 itself, never hand-typed), a rough Bangla sound hint, which
//                 letters do not join forward, which are "heavy" (মোটা);
//   2. Marks    — yabar / yer / pesh, jazm, tashdid, tanwin, madd, hamza, ta marbuta;
//   3. Rules    — "আল" (sun / moon letters), madd, heavy letters, stopping;
//   4. Practice — 10-question rounds: letter names, mark names, sun / moon.
// The teaching text is basic reading guidance only (no Quran / hadith / dua text is
// written here); sound hints are approximate and say so on the page.
// Saved on the device only: localStorage `ahlbayt_arabic_corner`
//   { v:1, seen:[letterIndex…], best:{ letters, marks, sunmoon } }
// (included in the "personal" backup group).
// Own delegated click handler keyed on [data-ac]; the page re-draws only its own
// container, so there is no scroll jump. Needs: state, render (all guarded).
// ============================================================================
(function () {
'use strict';

const KEY = 'ahlbayt_arabic_corner';
const EN = () => (typeof state !== 'undefined' && state.language === 'en');
const T = (b, e) => EN() ? e : b;
const N = n => EN() ? String(n) : (typeof toBengaliDigits === 'function' ? toBengaliDigits(n) : String(n));
const wrapAr = s => String(s).replace(/[\u0600-\u06FF]+(?:[ \u00A0][\u0600-\u06FF]+)*/g, '<span class="ac-ar-inl" lang="ar" dir="rtl">$&</span>');
const TA = (b, e) => wrapAr(T(b, e));
const E = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// marks (written as escapes so they can never be mangled by an editor)
const FATHA = '\u064E', KASRA = '\u0650', DAMMA = '\u064F', SUKUN = '\u0652', SHADDA = '\u0651';
const FATHATAN = '\u064B', KASRATAN = '\u064D', DAMMATAN = '\u064C', TATWEEL = '\u0640';

// ---- the 28 letters:  [char, nameBn, nameEn, hintBn, hintEn] ----------------
const L = [
 ['ا', 'আলিফ', 'Alif', 'নিজে আলাদা আওয়াজ নেই — স্বরের বাহক; হামযা (ء) সাথে থাকলে অ/আ/ই/উ ধ্বনি, আর যবরের পরে এলে টান (মাদ্দ)', 'No sound of its own — a seat for hamza, or a long "aa" after a fatha'],
 ['ب', 'বা', 'Ba', 'ব', 'b'],
 ['ت', 'তা', 'Ta', 'ত', 't'],
 ['ث', 'ছা', 'Tha', 'ছ/স — জিভের ডগা দাঁতের মাঝে রেখে (ইংরেজি think-এর th)', 'like "th" in think'],
 ['ج', 'জীম', 'Jim', 'জ', 'j'],
 ['ح', 'বড় হা', 'Ha (ح)', 'হ — গলার মাঝখান থেকে জোরে নিশ্বাস ছেড়ে', 'strong "h" from the middle of the throat'],
 ['خ', 'খা', 'Kha', 'খ — গলার উপর দিক থেকে ঘষে (মোটা হরফ)', 'rough "kh" from the upper throat (heavy)'],
 ['د', 'দাল', 'Dal', 'দ', 'd'],
 ['ذ', 'যাল', 'Dhal', 'য — জিভের ডগা দাঁতের মাঝে রেখে (ইংরেজি this-এর th)', 'like "th" in this'],
 ['ر', 'রা', 'Ra', 'র', 'r'],
 ['ز', 'যা', 'Zay', 'য/জ — ইংরেজি z-এর মতো', 'z'],
 ['س', 'সীন', 'Sin', 'স', 's'],
 ['ش', 'শীন', 'Shin', 'শ', 'sh'],
 ['ص', 'ছোয়াদ', 'Sad', 'ছ — মোটা (ভারী) করে', 's, pronounced heavy'],
 ['ض', 'দোয়াদ', 'Dad', 'দ্ব — মোটা (ভারী) করে', 'd, pronounced heavy'],
 ['ط', 'তোয়া', 'Ta (heavy)', 'ত্ব — মোটা (ভারী) করে', 't, pronounced heavy'],
 ['ظ', 'জোয়া', 'Zah', 'য — মোটা, জিভের ডগা দাঁতের মাঝে', 'heavy "th" (as in this)'],
 ['ع', 'আইন', 'Ayn', 'আ — গলা চেপে, গভীর থেকে', 'a deep, pressed throat sound'],
 ['غ', 'গাইন', 'Ghayn', 'গ — গলার ভেতরে গড়গড় করে (মোটা হরফ)', 'gargled "gh" (heavy)'],
 ['ف', 'ফা', 'Fa', 'ফ', 'f'],
 ['ق', 'ক্বাফ', 'Qaf', 'ক্ব — গলার গভীর থেকে (মোটা হরফ)', 'deep "q" from the back of the throat (heavy)'],
 ['ك', 'কাফ', 'Kaf', 'ক', 'k'],
 ['ل', 'লাম', 'Lam', 'ল', 'l'],
 ['م', 'মীম', 'Mim', 'ম', 'm'],
 ['ن', 'নূন', 'Nun', 'ন', 'n'],
 ['ه', 'ছোট হা', 'Ha (ه)', 'হ — হালকা, গলার শেষ প্রান্ত থেকে', 'soft "h"'],
 ['و', 'ওয়াও', 'Waw', 'ওয়', 'w'],
 ['ي', 'ইয়া', 'Ya', 'ই/ইয়', 'y']
];
const NO_JOIN = ['ا', 'د', 'ذ', 'ر', 'ز', 'و'];                 // do not join to the letter after them
const HEAVY = ['خ', 'ص', 'ض', 'غ', 'ط', 'ق', 'ظ'];
const SUN = ['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن'];   // 14
// moon letters = the other 14 (ا ب ج ح خ ع غ ف ق ك م ه و ي)

const forms = c => {
    const nj = NO_JOIN.indexOf(c) > -1;
    return { iso: c, ini: nj ? c : c + TATWEEL, med: TATWEEL + c + (nj ? '' : TATWEEL), fin: TATWEEL + c };
};

// ---- marks table: [markShownOnBa, nameBn, nameEn, textBn, textEn] -------------
const MARKS = [
 ['ب' + FATHA, 'যবর', 'Fatha', 'হরফের উপরে ছোট দাগ — ছোট "আ/অ" ধ্বনি', 'a small stroke above — a short "a"'],
 ['ب' + KASRA, 'যের', 'Kasra', 'হরফের নিচে ছোট দাগ — ছোট "ই" ধ্বনি', 'a small stroke below — a short "i"'],
 ['ب' + DAMMA, 'পেশ', 'Damma', 'হরফের উপরে ছোট "ও"-আকৃতি — ছোট "উ" ধ্বনি', 'a small "waw" shape above — a short "u"'],
 ['ب' + SUKUN, 'জযম (সাকিন)', 'Sukun', 'ছোট বৃত্ত — হরফে কোনো স্বর নেই; আগের হরফের সাথে মিলিয়ে হালকা থেমে পড়ুন', 'a small circle — no vowel; the letter closes the syllable'],
 ['ب' + SHADDA, 'তাশদীদ', 'Shadda', 'হরফের উপরে "w"-আকৃতি — হরফটি দুইবার (জোর দিয়ে) পড়ুন', 'a "w" shape above — the letter is doubled and stressed'],
 ['ب' + FATHATAN, 'দুই যবর', 'Fathatan', 'শব্দের শেষে "আন" ধ্বনি', 'adds an "-an" ending'],
 ['ب' + KASRATAN, 'দুই যের', 'Kasratan', 'শব্দের শেষে "ইন" ধ্বনি', 'adds an "-in" ending'],
 ['ب' + DAMMATAN, 'দুই পেশ', 'Dammatan', 'শব্দের শেষে "উন" ধ্বনি', 'adds an "-un" ending']
];
const MARK_NAMES = MARKS.map(m => [m[0], m[1], m[2]]);

// ---- storage -----------------------------------------------------------------
const P = { v: 1, seen: [], best: { letters: 0, marks: 0, sunmoon: 0 } };
(function load() {
    try {
        const r = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!r || typeof r !== 'object') return;
        if (Array.isArray(r.seen)) P.seen = r.seen.filter(i => Number.isInteger(i) && i >= 0 && i < L.length).filter((v, i, a) => a.indexOf(v) === i);
        if (r.best && typeof r.best === 'object') ['letters', 'marks', 'sunmoon'].forEach(k => { const n = Number(r.best[k]); if (isFinite(n) && n >= 0 && n <= 10) P.best[k] = Math.floor(n); });
    } catch (e) { /* defaults */ }
})();
function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignore */ } }

// ---- module state ------------------------------------------------------------
const A = { tab: 'letters', sel: null, quiz: null };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const pick = (arr, n) => shuffle(arr).slice(0, n);
const AR = (s, cls) => `<span class="arabic-text ac-ar ${cls || ''}" lang="ar" dir="rtl">${s}</span>`;

// ---- tab 1: letters ----------------------------------------------------------
function letterDetail(i) {
    const row = L[i], c = row[0], f = forms(c), nj = NO_JOIN.indexOf(c) > -1, hv = HEAVY.indexOf(c) > -1;
    const sound = (c === 'ا') ? null : [c + FATHA, c + KASRA, c + DAMMA];
    return `
    <div class="ac-detail" role="region" aria-label="${E(T(row[1], row[2]))}">
        <div class="ac-detail-top">
            ${AR(c, 'ac-big')}
            <div><h3>${E(T(row[1], row[2]))}</h3><p>${E(T(row[3], row[4]))}</p>
                ${hv ? `<span class="ac-tag ac-heavy">${T('মোটা (ভারী) হরফ', 'Heavy letter')}</span>` : ''}
                ${SUN.indexOf(c) > -1 ? `<span class="ac-tag">${T('শামসী হরফ', 'Sun letter')}</span>` : (c === 'ا' ? '' : `<span class="ac-tag">${T('কামারী হরফ', 'Moon letter')}</span>`)}
            </div>
        </div>
        <div class="ac-forms" role="group" aria-label="${T('হরফের চার আকৃতি', 'Four shapes')}">
            <div><small>${T('শেষে', 'Final')}</small>${AR(f.fin)}</div>
            <div><small>${T('মাঝে', 'Middle')}</small>${AR(f.med)}</div>
            <div><small>${T('শুরুতে', 'Initial')}</small>${AR(f.ini)}</div>
            <div><small>${T('একা', 'Alone')}</small>${AR(f.iso)}</div>
        </div>
        ${nj ? `<p class="ac-note">${T('এই হরফ পরের হরফের সাথে জোড়া লাগে না — তাই "শুরুতে" আকৃতি একা-র মতোই।', 'This letter does not join to the next one, so its initial shape equals the isolated one.')}</p>` : ''}
        ${sound ? `<div class="ac-marks-row" aria-label="${T('তিন হরকতসহ', 'With the three vowels')}">${sound.map(s => AR(s)).join('')}</div>
        <p class="ac-note">${T('যবর, যের, পেশ-এর বিবরণ "চিহ্ন" ট্যাবে।', 'See the "Marks" tab for fatha, kasra and damma.')}</p>` : ''}
    </div>`;
}
function tabLetters() {
    const grid = L.map((r, i) => `
        <button type="button" class="ac-letter ${A.sel === i ? 'on' : ''} ${P.seen.indexOf(i) > -1 ? 'seen' : ''}" data-ac="letter" data-v="${i}" aria-pressed="${A.sel === i}" aria-label="${E(T(r[1], r[2]))}">
            ${AR(r[0])}<small>${E(T(r[1], r[2]))}</small>${P.seen.indexOf(i) > -1 ? '<i class="ac-ck" aria-hidden="true">✓</i>' : ''}
        </button>`).join('');
    return `
    <p class="ac-intro">${T('আরবি ডান থেকে বামে লেখা হয়। একটি হরফ চাপলে তার চার আকৃতি ও উচ্চারণের ইঙ্গিত দেখা যাবে।', 'Arabic is written right to left. Tap a letter to see its four shapes and a sound hint.')}
        <b>${N(P.seen.length)}/${N(L.length)}</b> ${T('টি দেখা হয়েছে', 'viewed')}</p>
    ${A.sel != null ? letterDetail(A.sel) : ''}
    <div class="ac-grid" dir="rtl">${grid}</div>`;
}

// ---- tab 2: marks ---------------------------------------------------------------
function tabMarks() {
    const rows = MARKS.map(m => `
        <div class="ac-mrow">${AR(m[0], 'ac-mark')}<div><b>${E(TA(m[1], m[2]))}</b><p>${E(TA(m[3], m[4]))}</p></div></div>`).join('');
    return `
    <p class="ac-intro">${TA('হরফের উপরে-নিচের ছোট চিহ্নগুলোই বলে দেয় হরফটি কীভাবে পড়তে হবে। উদাহরণে সবসময় "ب" (বা) ব্যবহার করা হয়েছে।', 'The small marks above and below a letter tell you how to read it. The examples use "ب" (ba) throughout.')}</p>
    <div class="ac-mlist">${rows}
        <div class="ac-mrow">${AR('بَا &nbsp; بِي &nbsp; بُو', 'ac-mark')}<div><b>${TA('মাদ্দ (টানা)', 'Madd (lengthening)')}</b><p>${TA('যবরের পর আলিফ (ا), যেরের পর ইয়া (ي), পেশের পর ওয়াও (و) থাকলে প্রায় দুই মাত্রা টেনে পড়তে হয়।', 'A fatha + alif (ا), kasra + ya (ي) or damma + waw (و) is held for about two beats.')}</p></div></div>
        <div class="ac-mrow">${AR('هٰذَا', 'ac-mark')}<div><b>${TA('খাড়া যবর', 'Dagger alif')}</b><p>${TA('হরফের উপরে ছোট খাড়া দাগ (ٰ) — আলিফের মতো টেনে পড়া হয়, যেমন هٰذَا (হা-যা)।', 'A small vertical stroke (ٰ) read like a long "aa", as in هٰذَا (ha-dha).')}</p></div></div>
        <div class="ac-mrow">${AR('ء &nbsp; ة &nbsp; ى', 'ac-mark')}<div><b>${TA('আরও তিনটি চিহ্ন', 'Three more signs')}</b><p>${TA('ء হামযা (গলায় হালকা থামা); ة গোল তা — শব্দের শেষে বসে, থামলে "হ"-এর মতো শোনায়; ى আলিফ মাকসূরা — ইয়া-র মতো দেখতে, বিন্দুহীন, "আ" ধ্বনি দেয়।', 'ء hamza (a light stop in the throat); ة ta marbuta — at the end of a word, sounds like "h" when you stop; ى alif maqsura — a ya without dots, giving an "aa" sound.')}</p></div></div>
    </div>`;
}

// ---- tab 3: rules ---------------------------------------------------------------
function chips(arr) { return `<div class="ac-chips" dir="rtl">${arr.map(c => AR(c, 'ac-chip')).join('')}</div>`; }
function tabRules() {
    const moon = L.map(r => r[0]).filter(c => SUN.indexOf(c) < 0);
    return `
    <div class="ac-rule">
        <h3>1. ${TA('"আল" (ال) — শামসী ও কামারী হরফ', '"Al" (ال) — sun and moon letters')}</h3>
        <p>${TA('"আল"-এর পরে যে হরফ আসে তার ওপর নির্ভর করে "ল" পড়া হবে কি না।', 'Whether the "l" of "al" is pronounced depends on the letter that follows.')}</p>
        <p><b>${TA('শামসী (১৪টি)', 'Sun letters (14)')}</b> — ${TA('"ল" পড়া হয় না; পরের হরফ তাশদীদসহ (দ্বিত্ব) পড়া হয়।', 'the "l" is silent and the next letter is doubled.')}</p>
        ${chips(SUN)}
        ${AR('اَلشَّمْسُ', 'ac-word')}<p class="ac-say">${TA('আশ্-শামসু (সূর্য) — "ল" শোনা যায় না', 'ash-shamsu (the sun) — the "l" is not heard')}</p>
        <p><b>${TA('কামারী (১৪টি)', 'Moon letters (14)')}</b> — ${TA('"ল" স্পষ্ট পড়া হয়।', 'the "l" is pronounced clearly.')}</p>
        ${chips(moon)}
        ${AR('اَلْقَمَرُ', 'ac-word')}<p class="ac-say">${TA('আল্-ক্বামারু (চাঁদ) — "ল" স্পষ্ট', 'al-qamaru (the moon) — the "l" is clear')}</p>
    </div>
    <div class="ac-rule">
        <h3>2. ${TA('মাদ্দ — টেনে পড়া', 'Madd — lengthening')}</h3>
        <p>${TA('তিনটি হরফ স্বরকে লম্বা করে: ا (যবরের পরে), ي (যেরের পরে), و (পেশের পরে)।', 'Three letters lengthen a vowel: ا after a fatha, ي after a kasra, و after a damma.')}</p>
        ${AR('قَالَ &nbsp; قِيلَ &nbsp; يَقُولُ', 'ac-word')}<p class="ac-say">${TA('ক্বা-লা · ক্বী-লা · ইয়াক্বূ-লু', 'qaa-la · qee-la · yaqoo-lu')}</p>
    </div>
    <div class="ac-rule">
        <h3>3. ${TA('মোটা (ভারী) হরফ', 'Heavy letters')}</h3>
        <p>${TA('এই সাতটি হরফ মুখ ভরে, মোটা করে পড়া হয়; বাকিগুলো চিকন।', 'These seven letters are read with a full, heavy mouth; the rest are light.')}</p>
        ${chips(HEAVY)}
        <p class="ac-say">${TA('মুখস্থ সূত্র:', 'Memory aid:')} <span class="arabic-text" lang="ar" dir="rtl">خُصَّ ضَغْطٍ قِظْ</span></p>
    </div>
    <div class="ac-rule">
        <h3>4. ${TA('শব্দের শেষে থামলে', 'When you stop at the end of a word')}</h3>
        <p>${TA('থামলে দুই যের ও দুই পেশের "ন" ধ্বনি বাদ যায় (كِتَابٍ / كِتَابٌ → কিতাব); দুই যবর থামলে "আ"-তে বদলে যায়; গোল তা (ة) "হ"-এর মতো শোনায়।', 'When you stop, the "-n" of kasratan and dammatan drops (كِتَابٍ / كِتَابٌ → kitab); fathatan becomes a long "aa"; ة sounds like "h".')}</p>
    </div>
    <p class="ac-note">${TA('⚠️ এটি পড়া শেখার প্রাথমিক গাইড। তাজবীদের পূর্ণ নিয়ম (ইদগাম, ইখফা, কলকলা ইত্যাদি) ও সঠিক উচ্চারণ যোগ্য উস্তাদের কাছে শুনে শিখুন — বাংলা উচ্চারণ-ইঙ্গিত কেবল আনুমানিক।', '⚠️ This is a basic reading primer. Learn the full tajwid rules and the exact pronunciation from a qualified teacher — the sound hints are only approximate.')}</p>`;
}

// ---- tab 4: practice -----------------------------------------------------------
function mkQuiz(mode) {
    const qs = [];
    if (mode === 'letters') {
        pick(L, 10).forEach(r => {
            const names = L.filter(x => x[0] !== r[0]).map(x => T(x[1], x[2]));
            qs.push({ show: r[0], ask: T('এই হরফটির নাম কী?', 'What is the name of this letter?'), right: T(r[1], r[2]), opts: shuffle([T(r[1], r[2])].concat(pick(names, 3))), why: T(r[3], r[4]) });
        });
    } else if (mode === 'marks') {
        const letters = L.map(x => x[0]).filter(c => c !== 'ا');
        for (let i = 0; i < 10; i++) {
            const c = letters[Math.floor(Math.random() * letters.length)];
            const m = MARK_NAMES[Math.floor(Math.random() * MARK_NAMES.length)];
            const markChar = m[0].slice(1);
            const names = MARK_NAMES.filter(x => x[1] !== m[1]).map(x => T(x[1], x[2]));
            qs.push({ show: c + markChar, ask: T('হরফটির উপর/নিচের চিহ্নটির নাম কী?', 'What is the mark on this letter called?'), right: T(m[1], m[2]), opts: shuffle([T(m[1], m[2])].concat(pick(names, 3))), why: '' });
        }
    } else {
        const letters = L.map(x => x[0]).filter(c => c !== 'ا');
        pick(letters, 10).forEach(c => {
            const sun = SUN.indexOf(c) > -1;
            const A1 = T('"ল" স্পষ্ট পড়া হবে (কামারী)', 'The "l" is pronounced (moon letter)');
            const A2 = T('"ল" পড়া হবে না, পরের হরফ দ্বিত্ব (শামসী)', 'The "l" is silent, next letter doubled (sun letter)');
            qs.push({ show: 'ال' + ' + ' + c, ask: T('"আল"-এর পর এই হরফ এলে কী হবে?', 'What happens to the "l" of "al" before this letter?'), right: sun ? A2 : A1, opts: [A1, A2], why: '' });
        });
    }
    return { mode, qs, i: 0, score: 0, picked: null };
}
function quizBody() {
    const q = A.quiz;
    if (!q) {
        const card = (mode, ic, bn, en, best) => `
            <button type="button" class="ac-mode" data-ac="start" data-v="${mode}">
                <span aria-hidden="true">${ic}</span><span><b>${T(bn, en)}</b><small>${T('সেরা স্কোর', 'Best')}: ${N(best)}/${N(10)}</small></span>
            </button>`;
        return `
        <p class="ac-intro">${T('প্রতি রাউন্ডে ১০টি প্রশ্ন। একটি ধরন বেছে নিন।', '10 questions per round. Pick a type.')}</p>
        <div class="ac-modes">
            ${card('letters', '🔤', 'হরফের নাম চেনা', 'Letter names', P.best.letters)}
            ${card('marks', '✨', 'চিহ্নের নাম চেনা', 'Mark names', P.best.marks)}
            ${card('sunmoon', '☀️', 'শামসী না কামারী', 'Sun or moon letter', P.best.sunmoon)}
        </div>`;
    }
    if (q.i >= q.qs.length) {
        const best = !!q.newBest;
        return `
        <div class="ac-result">
            <div class="ac-score">${N(q.score)}<small>/${N(q.qs.length)}</small></div>
            <p>${q.score >= 9 ? T('মাশাআল্লাহ! চমৎকার।', 'Excellent!') : q.score >= 6 ? T('ভালো হয়েছে — আরেকবার চেষ্টা করুন।', 'Good — try once more.') : T('"হরফ" ও "চিহ্ন" ট্যাবে আবার একবার দেখে নিন।', 'Look through the Letters and Marks tabs once more.')}${best ? ' 🎉 ' + T('নতুন সেরা স্কোর!', 'New best score!') : ''}</p>
            <div class="ac-actions">
                <button type="button" class="ac-btn ac-primary" data-ac="start" data-v="${q.mode}">${T('আবার খেলুন', 'Play again')}</button>
                <button type="button" class="ac-btn" data-ac="quit">${T('অন্য ধরন', 'Other types')}</button>
            </div>
        </div>`;
    }
    const cur = q.qs[q.i];
    const done = q.picked != null;
    const opts = cur.opts.map((o, k) => {
        let cls = '';
        if (done) { if (o === cur.right) cls = 'ok'; else if (k === q.picked) cls = 'bad'; }
        return `<button type="button" class="ac-opt ${cls}" data-ac="ans" data-v="${k}" ${done ? 'disabled' : ''}>${E(o)}</button>`;
    }).join('');
    return `
    <div class="ac-q" role="group" aria-label="${T('প্রশ্ন', 'Question')} ${N(q.i + 1)}">
        <div class="ac-qhead"><span>${T('প্রশ্ন', 'Question')} ${N(q.i + 1)}/${N(q.qs.length)}</span><span>${T('স্কোর', 'Score')}: ${N(q.score)}</span></div>
        <div class="ac-qshow">${AR(E(cur.show), 'ac-big')}</div>
        <p class="ac-qask">${E(cur.ask)}</p>
        <div class="ac-opts">${opts}</div>
        ${done ? `<p class="ac-fb ${cur.opts[q.picked] === cur.right ? 'ok' : 'bad'}" role="status">${cur.opts[q.picked] === cur.right ? '✓ ' + T('সঠিক!', 'Correct!') : '✗ ' + T('সঠিক উত্তর', 'Answer') + ': ' + E(cur.right)}${cur.why ? ' — ' + E(cur.why) : ''}</p>
        <button type="button" class="ac-btn ac-primary" data-ac="next">${q.i + 1 >= q.qs.length ? T('ফলাফল দেখুন', 'See result') : T('পরের প্রশ্ন →', 'Next →')}</button>` : ''}
    </div>`;
}

// ---- page shell ----------------------------------------------------------------
const TABS = [['letters', 'হরফ', 'Letters'], ['marks', 'চিহ্ন', 'Marks'], ['rules', 'নিয়ম', 'Rules'], ['practice', 'অনুশীলন', 'Practice']];
function body() {
    const tabs = TABS.map(t => `<button type="button" role="tab" class="ac-tab ${A.tab === t[0] ? 'on' : ''}" id="ac-t-${t[0]}" aria-selected="${A.tab === t[0]}" aria-controls="ac-panel" data-ac="tab" data-v="${t[0]}">${T(t[1], t[2])}</button>`).join('');
    const inner = A.tab === 'letters' ? tabLetters() : A.tab === 'marks' ? tabMarks() : A.tab === 'rules' ? tabRules() : quizBody();
    return `<div class="ac-tabs" role="tablist" aria-label="${T('আরবি শেখার ধাপ', 'Sections')}">${tabs}</div>
        <div id="ac-panel" role="tabpanel" aria-labelledby="ac-t-${A.tab}" class="ac-panel">${inner}</div>`;
}
function renderArabicPage() {
    const d = state.darkMode;
    return `
    <div class="ac-page page-enter ${d ? 'ac-dark' : ''}">
        <div class="ac-head">
            <h1><span class="ac-em" aria-hidden="true">🔤</span> ${T('আরবি পড়া শেখা', 'Learn to Read Arabic')}</h1>
            <p>${T('দোয়া ও যিয়ারতের আরবি নিজে পড়তে পারার প্রাথমিক ধাপ — হরফ, চিহ্ন, নিয়ম ও অনুশীলন।', 'First steps to reading the Arabic of duas and ziyarats yourself — letters, marks, rules and practice.')}</p>
        </div>
        <div id="ac-root">${body()}</div>
        <div class="ac-foot"><button type="button" class="ac-btn" data-action="changePage" data-param="dua">🤲 ${T('দোয়া পেজে গিয়ে অনুশীলন করুন', 'Practise on the Dua page')}</button></div>
    </div>`;
}
window.renderArabicPage = renderArabicPage;

function refresh(focusSel) {
    const root = document.getElementById('ac-root');
    if (!root) { if (typeof render === 'function') render(); return; }
    root.innerHTML = body();
    if (focusSel) { const f = root.querySelector(focusSel); if (f) f.focus(); }
}

document.addEventListener('click', e => {
    const el = e.target && e.target.closest && e.target.closest('[data-ac]');
    if (!el) return;
    const a = el.getAttribute('data-ac'), v = el.getAttribute('data-v');
    try {
        if (a === 'tab') { A.tab = v; refresh(); }
        else if (a === 'letter') {
            const i = parseInt(v, 10);
            A.sel = (A.sel === i) ? null : i;
            if (A.sel != null && P.seen.indexOf(i) < 0) { P.seen.push(i); save(); }
            refresh();
            if (A.sel != null) { const d = document.querySelector('.ac-detail'); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        }
        else if (a === 'start') { A.quiz = mkQuiz(v); refresh('.ac-opt'); }
        else if (a === 'quit') { A.quiz = null; refresh(); }
        else if (a === 'ans' && A.quiz && A.quiz.picked == null) {
            const k = parseInt(v, 10), q = A.quiz, cur = q.qs[q.i];
            q.picked = k; if (cur.opts[k] === cur.right) q.score++;
            refresh('[data-ac="next"]');
        }
        else if (a === 'next' && A.quiz) {
            const q = A.quiz; q.i++; q.picked = null;
            if (q.i >= q.qs.length && q.score > P.best[q.mode]) { P.best[q.mode] = q.score; q.newBest = true; save(); }
            refresh(q.i >= q.qs.length ? '[data-ac="start"]' : '.ac-opt');
        }
    } catch (err) { /* never break the page */ }
});

})();
