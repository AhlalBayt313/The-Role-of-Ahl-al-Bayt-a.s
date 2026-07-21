// ============================================================================
// KNOWLEDGE CENTER — DATA (Hadith / Masail / Q&A / Fatwa)
// ============================================================================
// ⚠️ CONTENT NOTE for the site owner:
// - kcHadiths below reuses/extends hadith text already vetted elsewhere in
//   this app (see `hadiths` in script-1-core.js) with real, attributable
//   sources (Nahjul Balagha, Usul al-Kafi, Bihar al-Anwar, Sahifa Sajjadiyya,
//   etc.). A few extra well-known, widely-cited narrations were added to
//   cover categories the original list didn't include (e.g. Lady Fatimah,
//   Imam Hasan). Please double-check exact wording/reference against your
//   own trusted print sources before publishing at scale.
// - kcMasail entries are deliberately written as general, widely-agreed
//   Twelver Fiqh starting points (not tied to one specific Marja's exact
//   ruling/wording) — mark each with your chosen Marja's actual verified
//   ruling before relying on them for real religious guidance.
// - kcQa is general educational content.
// - kcFatwa is SEED/PLACEHOLDER data only — every entry is explicitly
//   flagged `sample:true` and rendered with a visible "নমুনা" (Sample)
//   badge. Real fatwas must be sourced from each Marja's official site/
//   office and entered by the site owner — this app does not (and should
//   not) fabricate or paraphrase actual rulings and attribute them to real,
//   living religious authorities.
// ============================================================================

// ---------------------------------------------------------------------------
// HADITH — categories
// ---------------------------------------------------------------------------
const kcHadithCategories = [
    {key:'prophet',  icon:'🕌', bn:'রাসূলুল্লাহ (সা.)',        en:'Prophet Muhammad (PBUH)'},
    {key:'fatima',   icon:'🌷', bn:'ফাতিমা আয-যাহরা (আ.)',      en:'Lady Fatimah al-Zahra (AS)'},
    {key:'ali',      icon:'⚔️', bn:'ইমাম আলী (আ.)',            en:'Imam Ali (AS)'},
    {key:'hasan',    icon:'🕊️', bn:'ইমাম হাসান (আ.)',           en:'Imam Hasan (AS)'},
    {key:'husayn',   icon:'🌹', bn:'ইমাম হোসাইন (আ.)',          en:'Imam Husayn (AS)'},
    {key:'sajjad',   icon:'📿', bn:'ইমাম যাইনুল আবিদীন (আ.)',   en:'Imam Zayn al-Abidin (AS)'},
    {key:'baqir',    icon:'📖', bn:'ইমাম মুহাম্মদ আল-বাকির (আ.)', en:'Imam Muhammad al-Baqir (AS)'},
    {key:'sadiq',    icon:'💡', bn:'ইমাম জাফর আস-সাদিক (আ.)',   en:"Imam Ja'far al-Sadiq (AS)"},
    {key:'others',   icon:'⭐', bn:'বাকি ইমামগণ (আ.)',           en:'Remaining Imams (AS)'},
    {key:'topical',  icon:'🗂️', bn:'বিষয়ভিত্তিক হাদিস',         en:'Topic-wise Hadith'},
];

// item: {id, category, textBn, textEn, refBn, refEn, sourceBn, sourceEn, narratorBn, narratorEn}
const kcHadiths = [
    // ── Prophet Muhammad (PBUH) ──
    {id:'h001', category:'prophet', textBn:'আমি জ্ঞানের শহর এবং আলী তার দরজা।', textEn:'I am the city of knowledge and Ali is its gate.', refBn:'হাদিসে মাদিনাতুল ইলম', refEn:'Hadith Madinat al-Ilm', sourceBn:'আল-মুস্তাদরাক, হাকিম নিশাপুরি', sourceEn:'al-Mustadrak, al-Hakim al-Nishaburi', narratorBn:'রাসূলুল্লাহ (সা.)', narratorEn:'Prophet Muhammad (PBUH)'},
    {id:'h002', category:'prophet', textBn:'আমি তোমাদের মাঝে দুটি ভারী বস্তু রেখে যাচ্ছি: আল্লাহর কিতাব এবং আমার আহলে বাইত।', textEn:'I am leaving among you two weighty things: the Book of Allah and my Ahlul Bayt.', refBn:'হাদিসে সাকালাইন', refEn:'Hadith al-Thaqalayn', sourceBn:'সহীহ মুসলিম / বিহারুল আনওয়ার', sourceEn:'Sahih Muslim / Bihar al-Anwar', narratorBn:'রাসূলুল্লাহ (সা.)', narratorEn:'Prophet Muhammad (PBUH)'},
    {id:'h004', category:'prophet', textBn:'তোমাদের মধ্যে সর্বোত্তম সে ব্যক্তি যে চরিত্রে সর্বোত্তম।', textEn:'The best among you is the one with the best character.', refBn:'', refEn:'', sourceBn:'সহীহ বুখারি', sourceEn:'Sahih Bukhari', narratorBn:'রাসূলুল্লাহ (সা.)', narratorEn:'Prophet Muhammad (PBUH)'},

    // ── Lady Fatimah al-Zahra (AS) ──
    // ── Lady Fatimah al-Zahra (AS) ──
    {id:'h010', category:'fatima', textBn:'ফাতেমা আমার হৃদয়ের একটুকরো। যা তাকে কষ্ট দেয় তা আমাকে কষ্ট দেয়।', textEn:'Fatima is a piece of my heart. Whatever grieves her grieves me.', refBn:'', refEn:'', sourceBn:'সহীহ বুখারি / বিহারুল আনওয়ার', sourceEn:'Sahih Bukhari / Bihar al-Anwar', narratorBn:'রাসূলুল্লাহ (সা.) — ফাতিমা (আ.) সম্পর্কে', narratorEn:"Prophet Muhammad (PBUH) — about Fatimah (AS)"},
    {id:'h011', category:'fatima', textBn:'ফাতেমা জান্নাতের নারীদের নেত্রী।', textEn:'Fatima is the leader of the women of Paradise.', refBn:'', refEn:'', sourceBn:'সহীহ বুখারি', sourceEn:'Sahih Bukhari', narratorBn:'রাসূলুল্লাহ (সা.) — ফাতিমা (আ.) সম্পর্কে', narratorEn:"Prophet Muhammad (PBUH) — about Fatimah (AS)"},
    {id:'h012', category:'fatima', textBn:'যে ব্যক্তি ফাতেমাকে সন্তুষ্ট করল সে আমাকে সন্তুষ্ট করল, আর যে তাকে রাগান্বিত করল সে আমাকে রাগান্বিত করল।', textEn:'Whoever pleases Fatima has pleased me, and whoever angers her has angered me.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'রাসূলুল্লাহ (সা.) — ফাতিমা (আ.) সম্পর্কে', narratorEn:"Prophet Muhammad (PBUH) — about Fatimah (AS)"},

    // ── Imam Hasan (AS) — additional ──
    {id:'h032', category:'hasan', textBn:'সবচেয়ে বুদ্ধিমান মানুষ সে যে নিজের ত্রুটিগুলো নিয়ে ব্যস্ত থাকে, অন্যের ত্রুটি নিয়ে নয়।', textEn:'The wisest person is one who is preoccupied with his own faults rather than the faults of others.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম হাসান (আ.)', narratorEn:'Imam Hasan (AS)'},

    {id:'h020', category:'ali', textBn:'মানুষ যা জানে না তার শত্রু।', textEn:'Man is the enemy of what he does not know.', refBn:'', refEn:'', sourceBn:'নাহজুল বালাগা', sourceEn:'Nahjul Balagha', narratorBn:'ইমাম আলী (আ.)', narratorEn:'Imam Ali (AS)'},
    {id:'h021', category:'ali', textBn:'যে নিজেকে চেনে সে তার রবকে চেনে।', textEn:'Whoever knows himself knows his Lord.', refBn:'', refEn:'', sourceBn:'গুরারুল হিকাম', sourceEn:'Ghurar al-Hikam', narratorBn:'ইমাম আলী (আ.)', narratorEn:'Imam Ali (AS)'},
    {id:'h022', category:'ali', textBn:'নীরবতা জ্ঞানীদের অলংকার এবং মূর্খদের আবরণ।', textEn:'Silence is the ornament of the wise and the covering of the fool.', refBn:'', refEn:'', sourceBn:'নাহজুল বালাগা', sourceEn:'Nahjul Balagha', narratorBn:'ইমাম আলী (আ.)', narratorEn:'Imam Ali (AS)'},
    {id:'h023', category:'ali', textBn:'মানুষের মূল্য তার গুণ দিয়ে, তার সম্পদ দিয়ে নয়।', textEn:'The value of a person is in his virtue, not his wealth.', refBn:'', refEn:'', sourceBn:'গুরারুল হিকাম', sourceEn:'Ghurar al-Hikam', narratorBn:'ইমাম আলী (আ.)', narratorEn:'Imam Ali (AS)'},

    // ── Imam Hasan (AS) ──
    {id:'h030', category:'hasan', textBn:'উদারতা হলো যা তোমার হাতে আছে তা থেকে দান করা এবং কষ্ট সহ্য করা।', textEn:'Generosity is giving from what you have and bearing hardship.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম হাসান (আ.)', narratorEn:'Imam Hasan (AS)'},
    {id:'h031', category:'hasan', textBn:'যে ব্যক্তি তার ভাইকে গোপনে উপদেশ দেয় সে তাকে সজ্জিত করে, আর যে প্রকাশ্যে দেয় সে তাকে অপমান করে।', textEn:'Whoever advises his brother privately has adorned him, and whoever does so publicly has disgraced him.', refBn:'', refEn:'', sourceBn:'তুহাফুল উকুল', sourceEn:'Tuhaf al-Uqul', narratorBn:'ইমাম হাসান (আ.)', narratorEn:'Imam Hasan (AS)'},

    // ── Imam Husayn (AS) ──
    {id:'h040', category:'husayn', textBn:'মৃত্যু শাহাদাত ছাড়া কিছুই নয়, আর ইয়াজিদের সাথে বাঁচা লজ্জাছাড়া কিছুই নয়।', textEn:'Death is nothing but martyrdom, and life with Yazid is nothing but disgrace.', refBn:'কারবালার খুতবা', refEn:'Sermon at Karbala', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম হোসাইন (আ.)', narratorEn:'Imam Husayn (AS)'},
    {id:'h041', category:'husayn', textBn:'যদি তোমার দ্বীন না থাকে তাহলে অন্তত স্বাধীন মানুষ হও।', textEn:'If you have no religion, at least be free.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম হোসাইন (আ.)', narratorEn:'Imam Husayn (AS)'},

    // ── Imam Zayn al-Abidin / Sajjad (AS) ──
    {id:'h050', category:'sajjad', textBn:'হে আল্লাহ! আমাকে সেই জিনিস দাও যা তুমি জানো আমার জন্য সর্বোত্তম।', textEn:'O Allah, grant me what You know to be best for me.', refBn:'', refEn:'', sourceBn:'সাহিফায়ে সাজ্জাদিয়্যা', sourceEn:'Sahifa al-Sajjadiyya', narratorBn:'ইমাম সাজ্জাদ (আ.)', narratorEn:'Imam Sajjad (AS)'},
    {id:'h051', category:'sajjad', textBn:'আল্লাহ তাঁর বান্দার কাছ থেকে কোনো আমল কবুল করেন না যতক্ষণ না সে তাঁর ওলিদের ওলি এবং তাঁর শত্রুদের শত্রু হয়।', textEn:'Allah accepts no deed from a servant unless he befriends His friends and is an enemy of His enemies.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম সাজ্জাদ (আ.)', narratorEn:'Imam Sajjad (AS)'},

    // ── Imam Muhammad al-Baqir (AS) ──
    {id:'h060', category:'baqir', textBn:'আমাদের শিয়ারা হলো তারা যারা তাকওয়ার পোশাক পরে, আল্লাহকে ভয় করে এবং তাঁর ইবাদত করে।', textEn:'Our Shia are those who wear the garment of piety, fear Allah, and worship Him.', refBn:'', refEn:'', sourceBn:'উসুলে কাফি', sourceEn:'Usul al-Kafi', narratorBn:'ইমাম বাকির (আ.)', narratorEn:'Imam al-Baqir (AS)'},
    {id:'h061', category:'baqir', textBn:'জ্ঞানীদের সাথে বসা — যদিও তারা কথা না বলে — উপকারী।', textEn:'Sitting with the learned — even if they speak not — is beneficial.', refBn:'', refEn:'', sourceBn:'উসুলে কাফি', sourceEn:'Usul al-Kafi', narratorBn:'ইমাম বাকির (আ.)', narratorEn:'Imam al-Baqir (AS)'},

    // ── Imam Ja'far al-Sadiq (AS) ──
    {id:'h070', category:'sadiq', textBn:'যে ব্যক্তি তার ভাইয়ের সমস্যা সমাধান করে, আল্লাহ তার দুনিয়া ও আখিরাতের সমস্যা সমাধান করেন।', textEn:'Whoever resolves a difficulty for his brother, Allah resolves his difficulties in this world and the next.', refBn:'', refEn:'', sourceBn:'উসুলে কাফি', sourceEn:'Usul al-Kafi', narratorBn:'ইমাম সাদিক (আ.)', narratorEn:'Imam al-Sadiq (AS)'},
    {id:'h071', category:'sadiq', textBn:'প্রতিবেশীর সাথে ভালো ব্যবহার করা ঈমানের অংশ।', textEn:'Good treatment of neighbors is part of faith.', refBn:'', refEn:'', sourceBn:'উসুলে কাফি', sourceEn:'Usul al-Kafi', narratorBn:'ইমাম সাদিক (আ.)', narratorEn:'Imam al-Sadiq (AS)'},
    {id:'h072', category:'sadiq', textBn:'নামাজের মধ্যে আল্লাহর সাথে কথা বলো যেন তুমি তাঁকে দেখতে পাচ্ছো।', textEn:'In prayer, speak to Allah as though you can see Him.', refBn:'', refEn:'', sourceBn:'উসুলে কাফি', sourceEn:'Usul al-Kafi', narratorBn:'ইমাম সাদিক (আ.)', narratorEn:'Imam al-Sadiq (AS)'},

    // ── Remaining Imams (AS): Kadhim, Ridha, Jawad, Hadi, Askari, Mahdi ──
    {id:'h080', category:'others', textBn:'আল্লাহর কাছে কৃতজ্ঞতা প্রকাশ করো যা তিনি দিয়েছেন তার জন্য, এবং তাঁর কাছে ক্ষমা চাও যা তুমি ভুলে গেছো তার জন্য।', textEn:'Give thanks to Allah for what He has given you, and seek forgiveness for what you have neglected.', refBn:'', refEn:'', sourceBn:'তুহাফুল উকুল', sourceEn:'Tuhaf al-Uqul', narratorBn:'ইমাম মুসা আল-কাযিম (আ.)', narratorEn:'Imam Musa al-Kadhim (AS)'},
    {id:'h081', category:'others', textBn:'ঈমান হলো হৃদয়ের স্বীকৃতি, মুখের ঘোষণা এবং অঙ্গ-প্রত্যঙ্গের আমল।', textEn:'Faith is acknowledgment of the heart, declaration of the tongue, and action of the limbs.', refBn:'', refEn:'', sourceBn:'উয়ুনে আখবারির রেযা', sourceEn:'Uyun Akhbar al-Ridha', narratorBn:'ইমাম রেযা (আ.)', narratorEn:'Imam Ridha (AS)'},
    {id:'h082', category:'others', textBn:'সবচেয়ে বড় ইবাদত হলো পেট ও লজ্জাস্থানের পবিত্রতা রক্ষা করা।', textEn:'The greatest worship is guarding the stomach and chastity.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম মুহাম্মদ আল-জাওয়াদ (আ.)', narratorEn:'Imam Muhammad al-Jawad (AS)'},

    // ── Topic-wise ──
    {id:'h090', category:'topical', textBn:'জ্ঞান হলো সর্বোত্তম উত্তরাধিকার।', textEn:'Knowledge is the best inheritance.', refBn:'বিষয়: ইলম', refEn:'Topic: Knowledge', sourceBn:'নাহজুল বালাগা — ইমাম আলী (আ.)', sourceEn:'Nahjul Balagha — Imam Ali (AS)', narratorBn:'ইমাম আলী (আ.)', narratorEn:'Imam Ali (AS)'},
    {id:'h091', category:'topical', textBn:'বিনম্রতা হলো জ্ঞানের ফল।', textEn:'Humility is the fruit of knowledge.', refBn:'বিষয়: আখলাক', refEn:'Topic: Akhlaq (character)', sourceBn:'গুরারুল হিকাম — ইমাম আলী (আ.)', sourceEn:'Ghurar al-Hikam — Imam Ali (AS)', narratorBn:'ইমাম আলী (আ.)', narratorEn:'Imam Ali (AS)'},
    {id:'h092', category:'topical', textBn:'যে ব্যক্তি তার ভাইয়ের সমস্যা সমাধান করে, আল্লাহ তার দুনিয়া ও আখিরাতের সমস্যা সমাধান করেন।', textEn:'Whoever resolves a difficulty for his brother, Allah resolves his difficulties in this world and the next.', refBn:'বিষয়: সামাজিক দায়িত্ব', refEn:'Topic: Social responsibility', sourceBn:'উসুলে কাফি — ইমাম সাদিক (আ.)', sourceEn:'Usul al-Kafi — Imam al-Sadiq (AS)', narratorBn:'ইমাম সাদিক (আ.)', narratorEn:'Imam al-Sadiq (AS)'},

    // ── আরও Prophet Muhammad (PBUH) ──
    {id:'h005', category:'prophet', textBn:'তোমাদের মধ্যে সর্বোত্তম সে ব্যক্তি যে তার পরিবারের কাছে সর্বোত্তম, আর আমি আমার পরিবারের কাছে সর্বোত্তম।', textEn:'The best among you is the one best to his family, and I am the best to my family.', refBn:'', refEn:'', sourceBn:'সুনানে তিরমিযি', sourceEn:'Sunan al-Tirmidhi', narratorBn:'রাসূলুল্লাহ (সা.)', narratorEn:'Prophet Muhammad (PBUH)'},
    {id:'h006', category:'prophet', textBn:'জ্ঞান অর্জন করা প্রত্যেক মুসলিম নর-নারীর উপর ফরজ।', textEn:'Seeking knowledge is obligatory upon every Muslim, male and female.', refBn:'', refEn:'', sourceBn:'সুনানে ইবনে মাজাহ', sourceEn:'Sunan Ibn Majah', narratorBn:'রাসূলুল্লাহ (সা.)', narratorEn:'Prophet Muhammad (PBUH)'},

    // ── আরও Fatimah al-Zahra (AS) ──
    {id:'h013', category:'fatima', textBn:'ফাতেমা আমার শরীরের একটি অংশ; যে তাকে কষ্ট দেয় সে যেন আমাকেই কষ্ট দেয়।', textEn:'Fatima is a part of my body; whoever hurts her hurts me.', refBn:'', refEn:'', sourceBn:'সহীহ বুখারি', sourceEn:'Sahih Bukhari', narratorBn:'রাসূলুল্লাহ (সা.) — ফাতিমা (আ.) সম্পর্কে', narratorEn:"Prophet Muhammad (PBUH) — about Fatimah (AS)"},

    // ── আরও Imam Ali (AS) ──
    {id:'h024', category:'ali', textBn:'দুনিয়া মুমিনের জন্য কারাগার এবং কাফিরের জন্য জান্নাত।', textEn:'The world is a prison for the believer and a paradise for the disbeliever.', refBn:'', refEn:'', sourceBn:'নাহজুল বালাগা (হাদিসে নববী উদ্ধৃত)', sourceEn:'Nahjul Balagha (quoting a Prophetic hadith)', narratorBn:'ইমাম আলী (আ.)', narratorEn:'Imam Ali (AS)'},
    {id:'h025', category:'ali', textBn:'তোমার শত্রুর সাথেও ন্যায়বিচার করো, আর তোমার বন্ধুর সাথেও সত্য বলো।', textEn:'Be just even to your enemy, and be truthful even with your friend.', refBn:'', refEn:'', sourceBn:'গুরারুল হিকাম', sourceEn:'Ghurar al-Hikam', narratorBn:'ইমাম আলী (আ.)', narratorEn:'Imam Ali (AS)'},

    // ── আরও Imam Husayn (AS) ──
    {id:'h042', category:'husayn', textBn:'মানুষ দুনিয়ার গোলাম; দ্বীন তাদের জিহ্বার আগায় থাকে যতক্ষণ তাদের জীবিকা নিশ্চিত থাকে।', textEn:'People are slaves of the world; religion is but a fleeting matter on their tongues, so long as their livelihoods remain secure.', refBn:'কারবালার আগের ভাষণ', refEn:'Sermon before Karbala', sourceBn:'তুহাফুল উকুল', sourceEn:'Tuhaf al-Uqul', narratorBn:'ইমাম হোসাইন (আ.)', narratorEn:'Imam Husayn (AS)'},

    // ── আরও Imam Sajjad (আ.) ──
    {id:'h052', category:'sajjad', textBn:'সবচেয়ে বড় সম্পদ হলো লোভ না করা।', textEn:'The greatest wealth is having no greed.', refBn:'', refEn:'', sourceBn:'তুহাফুল উকুল', sourceEn:'Tuhaf al-Uqul', narratorBn:'ইমাম সাজ্জাদ (আ.)', narratorEn:'Imam Sajjad (AS)'},

    // ── আরও Imam al-Baqir (আ.) ──
    {id:'h062', category:'baqir', textBn:'তোমাদের মধ্যে সবচেয়ে দুর্বল ব্যক্তি সে, যে দোয়া করতে অলস।', textEn:'The weakest among you is the one who is too lazy to supplicate.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম বাকির (আ.)', narratorEn:'Imam al-Baqir (AS)'},

    // ── আরও Imam al-Sadiq (আ.) ──
    {id:'h073', category:'sadiq', textBn:'তিনটি জিনিস মুমিনের সম্মান রক্ষা করে: নামাজে রাত জাগা, মানুষের কাছ থেকে কিছু আশা না করা, ইমামদের (আ.) অনুসরণ করা।', textEn:'Three things preserve the believer\u2019s honor: staying up at night in prayer, expecting nothing from people, and following the Imams (AS).', refBn:'', refEn:'', sourceBn:'উসুলে কাফি', sourceEn:'Usul al-Kafi', narratorBn:'ইমাম সাদিক (আ.)', narratorEn:'Imam al-Sadiq (AS)'},
    {id:'h074', category:'sadiq', textBn:'কর্মীর মজুরি ঘাম শুকানোর আগেই পরিশোধ করো।', textEn:'Pay the worker his wages before his sweat dries.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম সাদিক (আ.)', narratorEn:'Imam al-Sadiq (AS)'},

    // ── আরও Remaining Imams (আ.) ──
    {id:'h083', category:'others', textBn:'যে ব্যক্তি নিজের জিহ্বাকে সংযত রাখে, আল্লাহ তার দোষ ঢেকে রাখেন।', textEn:'Whoever restrains his tongue, Allah conceals his faults.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম আলী আন-নাকি (আ.)', narratorEn:'Imam Ali al-Naqi / al-Hadi (AS)'},
    {id:'h084', category:'others', textBn:'যে ব্যক্তি সৎকর্মের পথ দেখায় সে ঐ সৎকর্ম সম্পাদনকারীর সমান সওয়াব পায়।', textEn:'Whoever guides someone to a good deed receives a reward equal to the one who performs it.', refBn:'', refEn:'', sourceBn:'বিহারুল আনওয়ার', sourceEn:'Bihar al-Anwar', narratorBn:'ইমাম হাসান আল-আসকারি (আ.)', narratorEn:'Imam Hasan al-Askari (AS)'},

    // ── আরও Topic-wise ──
    {id:'h093', category:'topical', textBn:'সবচেয়ে বুদ্ধিমান মানুষ সে যে নিজের ত্রুটিগুলো নিয়ে ব্যস্ত থাকে, অন্যের ত্রুটি নিয়ে নয়।', textEn:'The wisest person is one who is preoccupied with his own faults rather than the faults of others.', refBn:'বিষয়: আত্ম-উন্নয়ন', refEn:'Topic: Self-improvement', sourceBn:'বিহারুল আনওয়ার — ইমাম হাসান (আ.)', sourceEn:'Bihar al-Anwar — Imam Hasan (AS)', narratorBn:'ইমাম হাসান (আ.)', narratorEn:'Imam Hasan (AS)'},
    {id:'h094', category:'topical', textBn:'প্রতিবেশীর সাথে ভালো ব্যবহার করা ঈমানের অংশ।', textEn:'Good treatment of neighbors is part of faith.', refBn:'বিষয়: সামাজিক আচরণ', refEn:'Topic: Social conduct', sourceBn:'উসুলে কাফি — ইমাম সাদিক (আ.)', sourceEn:'Usul al-Kafi — Imam al-Sadiq (AS)', narratorBn:'ইমাম সাদিক (আ.)', narratorEn:'Imam al-Sadiq (AS)'},
];

// ---------------------------------------------------------------------------
// MASAIL (ফিকহি মাসআলা) — categories
// ---------------------------------------------------------------------------
const kcMasailCategories = [
    {key:'taharah',   icon:'💧', bn:'তাহারাত',        en:'Taharah'},
    {key:'wudu',      icon:'🤲', bn:'অজু',            en:'Wudu'},
    {key:'ghusl',     icon:'🛁', bn:'গোসল',           en:'Ghusl'},
    {key:'tayammum',  icon:'🪨', bn:'তায়াম্মুম',       en:'Tayammum'},
    {key:'salah',     icon:'🕋', bn:'নামাজ',          en:'Salah'},
    {key:'sawm',      icon:'🌙', bn:'রোজা',           en:'Sawm'},
    {key:'khums',     icon:'💰', bn:'খুমস',           en:'Khums'},
    {key:'zakat',     icon:'🌾', bn:'যাকাত',          en:'Zakat'},
    {key:'hajj',      icon:'🕌', bn:'হজ্ব',            en:'Hajj'},
    {key:'nikah',     icon:'💍', bn:'নিকাহ',          en:'Nikah'},
    {key:'talaq',     icon:'📜', bn:'তালাক',          en:'Talaq'},
    {key:'business',  icon:'💼', bn:'ব্যবসা-বাণিজ্য',  en:'Business'},
    {key:'food',      icon:'🍽️', bn:'খাদ্য ও পানীয়',   en:'Food & Drink'},
    {key:'clothing',  icon:'👕', bn:'পোশাক',          en:'Clothing'},
    {key:'women',     icon:'👩', bn:"নারীদের বিষয়",   en:"Women's Issues"},
    {key:'technology',icon:'💻', bn:'প্রযুক্তি',        en:'Technology'},
    {key:'misc',      icon:'📌', bn:'বিবিধ',          en:'Miscellaneous'},
];

// item: {id, category, questionBn, questionEn, answerBn, answerEn, detailBn, detailEn, sourceBn, sourceEn, marja}
const kcMasail = [
    {id:'m001', category:'taharah', questionBn:'নাপাক (নাজিস) বস্তু কী?', questionEn:'What makes something ritually impure (najis)?',
        answerBn:'ইসলামি ফিকহে নির্দিষ্ট কিছু বস্তু ও তরল (যেমন প্রস্রাব, রক্ত, মৃত জীবের দেহ) নাজিস হিসেবে গণ্য হয় এবং তা স্পর্শ করলে পবিত্রতার নিয়ম প্রযোজ্য হয়।', answerEn:'Islamic fiqh classifies certain substances and fluids (e.g. urine, blood, a corpse) as najis (ritually impure); contact with them brings purification rules into play.',
        detailBn:'সঠিক তালিকা ও ব্যতিক্রম মারজা ভেদে সামান্য ভিন্ন হতে পারে — আপনার অনুসরণীয় মারজার তাওজিহুল মাসায়েল দেখুন।', detailEn:'The exact list and exceptions vary slightly by Marja — consult your Marja\u2019s Tawdih al-Masail for specifics.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m002', category:'wudu', questionBn:'অজু ভঙ্গের কারণগুলো কী কী?', questionEn:'What invalidates Wudu?',
        answerBn:'সাধারণভাবে প্রস্রাব, পায়খানা, বায়ু নির্গমন, গভীর ঘুম এবং জ্ঞান হারানো অজু ভঙ্গ করে।', answerEn:'Generally, urination, defecation, passing gas, deep sleep, and loss of consciousness invalidate Wudu.',
        detailBn:'প্রতিটি ক্ষেত্রের বিস্তারিত শর্ত আপনার মারজার রিসালার সংশ্লিষ্ট অধ্যায়ে পাওয়া যাবে।', detailEn:'Detailed conditions for each case are found in the Wudu chapter of your Marja\u2019s ruling manual.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m010', category:'salah', questionBn:'দৈনিক ওয়াজিব নামাজ কয়টি?', questionEn:'How many obligatory daily prayers are there?',
        answerBn:'পাঁচ ওয়াক্তে মোট ১৭ রাকাত: ফজর (২), যোহর (৪), আসর (৪), মাগরিব (৩), এশা (৪)।', answerEn:'17 units (rak\u2019ahs) across five times: Fajr (2), Dhuhr (4), Asr (4), Maghrib (3), Isha (4).',
        detailBn:'সফরে থাকাকালীন চার রাকাত বিশিষ্ট নামাজ (যোহর/আসর/এশা) দুই রাকাতে সংক্ষিপ্ত (কসর) হয় — শর্তসাপেক্ষে।', detailEn:'While traveling, the four-rak\u2019ah prayers (Dhuhr/Asr/Isha) are shortened to two (Qasr), subject to conditions.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m020', category:'sawm', questionBn:'রোজা কী কী কারণে ভঙ্গ হয়?', questionEn:'What invalidates a fast (Sawm)?',
        answerBn:'ইচ্ছাকৃত পানাহার, স্বামী-স্ত্রী সহবাস, এবং ইচ্ছাকৃতভাবে বমি করা রোজা ভঙ্গের প্রধান কারণ।', answerEn:'Deliberately eating or drinking, marital relations, and intentional vomiting are among the main things that break a fast.',
        detailBn:'অসুস্থতা, সফর ও অন্যান্য শারয়ি ওজরের ক্ষেত্রে ছাড় প্রযোজ্য — বিস্তারিত মারজার রিসালায়।', detailEn:'Exemptions apply for illness, travel, and other valid excuses — see your Marja\u2019s manual for details.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m030', category:'khums', questionBn:'খুমস কী এবং কীসের উপর প্রযোজ্য?', questionEn:'What is Khums and what is it levied on?',
        answerBn:'খুমস হলো বার্ষিক সঞ্চয়ের/উদ্বৃত্ত আয়ের ২০% (এক-পঞ্চমাংশ), যা নির্দিষ্ট খাতে ব্যয় করতে হয়।', answerEn:'Khums is a 20% (one-fifth) levy on annual surplus income/savings, to be spent in specified categories.',
        detailBn:'সাইয়িদের অংশ ও ইমামের অংশের বণ্টন-পদ্ধতি মারজা ভেদে নির্দেশনায় ভিন্ন হতে পারে।', detailEn:'The exact distribution between the Sayyid\u2019s share and the Imam\u2019s share may differ by Marja — follow your Marja\u2019s office.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m040', category:'hajj', questionBn:'হজ্ব কার উপর ওয়াজিব?', questionEn:'On whom is Hajj obligatory?',
        answerBn:'যে ব্যক্তি বালেগ, বিবেকবান এবং আর্থিক ও শারীরিকভাবে সক্ষম (ইস্তিতাআ) তার উপর জীবনে একবার হজ্ব ওয়াজিব।', answerEn:'Hajj is obligatory once in a lifetime upon anyone who is of age, sane, and has the financial and physical capacity (istita\u2019a).',
        detailBn:'ইস্তিতা\u2019আর শর্তাবলি বিস্তারিতভাবে মারজার রিসালায় ব্যাখ্যা করা আছে।', detailEn:'The exact conditions of istita\u2019a are elaborated in your Marja\u2019s ruling manual.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m050', category:'business', questionBn:'সুদ (রিবা) সম্পর্কে ইসলামের বিধান কী?', questionEn:'What is the Islamic ruling on interest (Riba)?',
        answerBn:'ইসলামে সুদ কঠোরভাবে হারাম, চাই তা ঋণে হোক বা লেনদেনে।', answerEn:'Interest (Riba) is strictly forbidden in Islam, whether in loans or trade.',
        detailBn:'বিকল্প শরিয়াহ-সম্মত অর্থায়ন পদ্ধতি (যেমন মুদারাবা, মুশারাকা) সম্পর্কে মারজার নির্দেশনা দেখুন।', detailEn:'See your Marja\u2019s guidance on Shariah-compliant financing alternatives (e.g. Mudaraba, Musharaka).',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m003', category:'taharah', questionBn:'পানি দিয়ে নাপাক জিনিস পবিত্র করার সাধারণ পদ্ধতি কী?', questionEn:'What is the general method for purifying something impure with water?',
        answerBn:'কল/প্রবাহমান পানি হলে একবার ধুলেই সাধারণত পবিত্র হয়ে যায়; জমা পানি (কম পরিমাণ) হলে সাধারণত তিনবার ধুতে হয়, বস্তুভেদে নিয়ম কিছুটা ভিন্ন।', answerEn:'With running/tap water, one wash is generally sufficient; with a small amount of standing water, three washes are typically required — the exact rule varies by object.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m004', category:'wudu', questionBn:'অজুর ফরজ অংশগুলো কী কী?', questionEn:'What are the obligatory parts of Wudu?',
        answerBn:'মুখমণ্ডল ধোয়া, দুই হাত কনুই পর্যন্ত ধোয়া, মাথার সামনের অংশে মাসেহ করা, এবং দুই পায়ে (গোড়ালি পর্যন্ত) মাসেহ করা — এই ক্রম অনুসরণ করে।', answerEn:'Washing the face, washing both arms up to the elbows, wiping the front part of the head, and wiping both feet up to the ankles — performed in this sequence.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m011', category:'salah', questionBn:'নামাজে কিবলামুখী হওয়া কেন জরুরি?', questionEn:'Why is facing the Qibla necessary in prayer?',
        answerBn:'কাবার দিকে মুখ করে নামাজ পড়া নামাজের একটি শর্ত — ইচ্ছাকৃতভাবে ভুল দিকে নামাজ পড়লে তা বাতিল হয়ে যায়, তবে অনিচ্ছাকৃত সামান্য ভুলের ক্ষেত্রে ছাড় থাকতে পারে।', answerEn:'Facing the Kaaba is a condition for a valid prayer — intentionally praying in the wrong direction invalidates it, though minor unintentional deviation may be excused.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m021', category:'sawm', questionBn:'রমজানের রোজা কার উপর ওয়াজিব?', questionEn:'On whom is fasting in Ramadan obligatory?',
        answerBn:'বালেগ, বিবেকবান ও শারীরিকভাবে সক্ষম প্রত্যেক মুসলিম নর-নারীর উপর রমজানের রোজা ওয়াজিব; অসুস্থ, মুসাফির, গর্ভবতী/স্তন্যদানকারী নারী প্রভৃতির জন্য ছাড় বা কাযা/ফিদিয়ার বিধান আছে।', answerEn:'Fasting in Ramadan is obligatory on every adult, sane, physically able Muslim; exemptions or make-up/compensation rules apply for the ill, travelers, pregnant or nursing women, and others.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m031', category:'khums', questionBn:'খুমসের বছর (সাল-ই খুমসি) কী?', questionEn:'What is the \u201cKhums year\u201d?',
        answerBn:'প্রত্যেকে নিজের একটি নির্দিষ্ট বার্ষিক তারিখ ঠিক করে নেয় (যেমন প্রথম উপার্জনের দিন), সেই তারিখে বছরের শুরুতে যা আয় হয়েছিল তার হিসাব করে অব্যয়িত উদ্বৃত্তের উপর খুমস দিতে হয়।', answerEn:'Each person sets a personal annual date (e.g. the day they first earned income); on that date each year, Khums is calculated and paid on whatever surplus income remains unspent.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m041', category:'hajj', questionBn:'হজ্বের প্রধান কাজগুলো (রুকন) কী কী?', questionEn:'What are the main rites (Rukn) of Hajj?',
        answerBn:'ইহরাম বাঁধা, আরাফাতে অবস্থান, মুজদালিফায় রাত্রিযাপন, জামারাতে কঙ্কর নিক্ষেপ, কাবা তাওয়াফ এবং সাফা-মারওয়া সাঈ — এগুলো হজ্বের প্রধান অংশ।', answerEn:'Entering Ihram, standing at Arafat, staying overnight at Muzdalifah, stoning the Jamarat, circling the Kaaba (Tawaf), and walking between Safa and Marwah (Sa\u2019i) are the main rites of Hajj.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m051', category:'business', questionBn:'ব্যবসায় প্রতারণা (গারার) সম্পর্কে ইসলামের অবস্থান কী?', questionEn:'What is the Islamic stance on deceptive uncertainty (Gharar) in trade?',
        answerBn:'অতিরিক্ত অনিশ্চয়তা বা প্রতারণা জড়িত লেনদেন (গারার) ইসলামে নিষিদ্ধ — ক্রেতা-বিক্রেতা উভয়েরই লেনদেনের বস্তু, মূল্য ও শর্ত সম্পর্কে স্পষ্ট ধারণা থাকা আবশ্যক।', answerEn:'Transactions involving excessive uncertainty or deception (Gharar) are forbidden in Islam — both buyer and seller must have clear knowledge of the object, price, and terms of the transaction.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m090', category:'misc', questionBn:'দৈনন্দিন জীবনে কোনো মাসআলা নিয়ে সন্দেহ হলে কী করব?', questionEn:'What should I do if I\u2019m unsure about a ruling in daily life?',
        answerBn:'নিজের অনুসরণীয় (মারজা-এ তাকলিদ) এর তাওজিহুল মাসায়েল দেখুন অথবা তাঁর প্রতিনিধি/অফিসে সরাসরি জিজ্ঞাসা করুন।', answerEn:'Consult your chosen Marja-e Taqlid\u2019s ruling manual (Tawdih al-Masail), or ask their representative/office directly.',
        detailBn:'এই বিভাগের তথ্য সাধারণ সচেতনতার জন্য — নির্দিষ্ট ব্যক্তিগত পরিস্থিতির জন্য সরাসরি মারজার কাছ থেকে ফতোয়া নিন।', detailEn:'Content in this section is for general awareness — for specific personal situations, obtain a ruling directly from a Marja.',
        sourceBn:'', sourceEn:'', marja:'general'},
    {id:'m091', category:'misc', questionBn:'অমুসলিম দেশে বসবাসরত মুসলিমদের জন্য কোনো বিশেষ বিবেচনা আছে কি?', questionEn:'Are there any special considerations for Muslims living in non-Muslim countries?',
        answerBn:'নামাজের সময়, কিবলা নির্ণয়, হালাল খাদ্য প্রাপ্তি ইত্যাদি ক্ষেত্রে স্থানীয় পরিস্থিতি বিবেচনা করে সংশ্লিষ্ট বিধান প্রযোজ্য হয় — এক্ষেত্রেও নিজের মারজার নির্দেশনা অনুসরণ করা উত্তম।', answerEn:'Local circumstances are taken into account for matters like prayer times, determining the Qibla, and access to Halal food — it\u2019s best to follow your Marja\u2019s specific guidance for these situations too.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Ghusl ──
    {id:'m100', category:'ghusl', questionBn:'গোসল কখন ওয়াজিব হয়?', questionEn:'When does Ghusl become obligatory?',
        answerBn:'জানাবাত (বড় নাপাকি), হায়েজ ও নিফাসের পরে, এবং মৃত ব্যক্তিকে স্পর্শ করলে গোসল ওয়াজিব হয়।', answerEn:'Ghusl becomes obligatory after janabah (major impurity), after menstruation and postnatal bleeding, and after touching a corpse.',
        detailBn:'প্রতিটি ধরনের গোসলের নির্দিষ্ট পদ্ধতি ও শর্ত মারজার রিসালায় বিস্তারিত আছে।', detailEn:'The specific method and conditions for each type of Ghusl are detailed in your Marja\u2019s ruling manual.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m101', category:'ghusl', questionBn:'গোসলের দুটি পদ্ধতি কী কী?', questionEn:'What are the two methods of performing Ghusl?',
        answerBn:'তারতিবি (ক্রমানুসারে — মাথা/ঘাড়, ডান পাশ, বাম পাশ) এবং ইরতিমাসি (এক সাথে পুরো শরীর পানিতে ডুবিয়ে)।', answerEn:'Tartibi (sequential — head/neck, right side, left side) and Irtimasi (immersing the whole body in water at once).',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Tayammum ──
    {id:'m110', category:'tayammum', questionBn:'তায়াম্মুম কখন করা যায়?', questionEn:'When is Tayammum permitted?',
        answerBn:'পানি না পাওয়া গেলে, পানি ব্যবহারে ক্ষতির আশঙ্কা থাকলে, বা সময় স্বল্পতার মতো নির্দিষ্ট শারয়ি ওজরের ক্ষেত্রে অজু/গোসলের পরিবর্তে তায়াম্মুম করা যায়।', answerEn:'Tayammum replaces Wudu/Ghusl when water is unavailable, when using water would cause harm, or under other valid Shar\u2019i excuses such as insufficient time.',
        detailBn:'তায়াম্মুমের পদ্ধতি ও উপযুক্ত মাটি/পাথরের শর্তাবলি মারজার রিসালায় দেখুন।', detailEn:'See your Marja\u2019s manual for the method and the conditions for suitable earth/stone.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m111', category:'tayammum', questionBn:'তায়াম্মুমের সাধারণ পদ্ধতি কী?', questionEn:'What is the general method of Tayammum?',
        answerBn:'পবিত্র মাটি/পাথরে দুই হাত রেখে কপালে মাসেহ করা, তারপর দুই হাতের পিঠে মাসেহ করা।', answerEn:'Placing both hands on pure earth/stone, wiping the forehead, then wiping the back of each hand.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Zakat ──
    {id:'m120', category:'zakat', questionBn:'যাকাত কোন কোন সম্পদের উপর ওয়াজিব?', questionEn:'On which types of wealth is Zakat obligatory?',
        answerBn:'নির্দিষ্ট নয়টি জিনিসের উপর যাকাত ওয়াজিব: গম, যব, খেজুর, কিশমিশ, স্বর্ণ, রৌপ্য, উট, গরু ও ছাগল — শর্তসাপেক্ষে (নিসাব পূর্ণ হলে)।', answerEn:'Zakat is obligatory on nine specific categories — wheat, barley, dates, raisins, gold, silver, camels, cows, and sheep — once the Nisab (minimum threshold) is met.',
        detailBn:'প্রতিটি খাতের নিসাব ও হার আলাদা — মারজার রিসালায় বিস্তারিত সারণী পাওয়া যায়।', detailEn:'The Nisab and rate differ for each category — a detailed table is available in your Marja\u2019s manual.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m121', category:'zakat', questionBn:'যাকাত ও খুমসের মধ্যে পার্থক্য কী?', questionEn:'What is the difference between Zakat and Khums?',
        answerBn:'যাকাত নির্দিষ্ট নয় প্রকার সম্পদের উপর প্রযোজ্য একটি পৃথক ওয়াজিব, আর খুমস হলো বছরের উদ্বৃত্ত আয়ের ২০% — দুটি স্বতন্ত্র বিধান।', answerEn:'Zakat applies specifically to nine categories of wealth, while Khums is a 20% levy on annual surplus income — they are two distinct obligations.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Nikah ──
    {id:'m130', category:'nikah', questionBn:'নিকাহ (বিবাহ) বৈধ হওয়ার জন্য মূল শর্ত কী?', questionEn:'What are the basic conditions for a valid Nikah (marriage)?',
        answerBn:'পাত্র-পাত্রীর সম্মতি, নির্দিষ্ট শব্দে ইজাব-কবুল (প্রস্তাব ও গ্রহণ), এবং শারয়ি বাধা (যেমন মাহরাম সম্পর্ক) না থাকা প্রয়োজন।', answerEn:'Mutual consent of both parties, a valid offer-and-acceptance (Ijab-Qabul) formula, and the absence of Shar\u2019i impediments (such as being within a prohibited degree of relation) are required.',
        detailBn:'মোহর নির্ধারণ ও সাক্ষীর প্রয়োজনীয়তা সম্পর্কে বিস্তারিত মারজার রিসালায় দেখুন।', detailEn:'See your Marja\u2019s manual for details on setting the Mahr (dowry) and witness requirements.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m131', category:'nikah', questionBn:'মোহর (দেনমোহর) কী?', questionEn:'What is Mahr (dower)?',
        answerBn:'মোহর হলো বিবাহের সময় স্বামীর পক্ষ থেকে স্ত্রীকে প্রদত্ত একটি অধিকার — এটি স্ত্রীর একান্ত সম্পত্তি।', answerEn:'Mahr is a right given by the husband to the wife at the time of marriage — it belongs solely to the wife.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Talaq ──
    {id:'m140', category:'talaq', questionBn:'তালাক (বিবাহবিচ্ছেদ) বৈধ হওয়ার শর্ত কী?', questionEn:'What are the conditions for a valid Talaq (divorce)?',
        answerBn:'শিয়া ফিকহে তালাক বৈধ হতে নির্দিষ্ট শব্দে উচ্চারণ, দুইজন ন্যায়পরায়ণ সাক্ষীর উপস্থিতি এবং স্ত্রীর তুহর (হায়েজমুক্ত) অবস্থায় হওয়া প্রয়োজন।', answerEn:'In Shia fiqh, a valid Talaq requires the specific verbal formula, the presence of two just witnesses, and that the wife be in a state of Tuhr (free of menstruation).',
        detailBn:'ইদ্দত (অপেক্ষমাণ সময়কাল) ও রুজু\u2019র (প্রত্যাহারের) বিধান মারজার রিসালায় বিস্তারিত।', detailEn:'Rulings on Iddah (the waiting period) and Ruju (revocation) are detailed in your Marja\u2019s manual.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m141', category:'talaq', questionBn:'ইদ্দত কী?', questionEn:'What is Iddah?',
        answerBn:'ইদ্দত হলো তালাক বা স্বামীর মৃত্যুর পর স্ত্রীর জন্য নির্ধারিত অপেক্ষমাণ সময়কাল, যার মধ্যে সে পুনরায় বিবাহ করতে পারে না।', answerEn:'Iddah is a mandated waiting period for a woman after divorce or her husband\u2019s death, during which she may not remarry.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Food & Drink ──
    {id:'m150', category:'food', questionBn:'হালাল ও হারাম খাদ্যের মূল নীতি কী?', questionEn:'What is the basic principle of Halal and Haram food?',
        answerBn:'শুকরের মাংস, রক্ত, অ্যালকোহল এবং শরিয়ত-সম্মতভাবে জবাই না করা প্রাণীর মাংস হারাম; বাকি বেশিরভাগ খাদ্য মৌলিকভাবে হালাল।', answerEn:'Pork, blood, alcohol, and meat from animals not slaughtered according to Shariah are forbidden (Haram); most other food is fundamentally permissible (Halal).',
        detailBn:'সামুদ্রিক প্রাণী ও নির্দিষ্ট কিছু প্রাণীর মাংস সংক্রান্ত বিস্তারিত নিয়ম মারজা ভেদে ভিন্ন হতে পারে।', detailEn:'Detailed rules on seafood and certain animals may vary by Marja.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m151', category:'food', questionBn:'শরয়ি জবাই (জিবাহ)-এর শর্ত কী?', questionEn:'What are the conditions for Shar\u2019i slaughter (Dhabihah)?',
        answerBn:'মুসলিম কর্তৃক আল্লাহর নাম নিয়ে, ধারালো অস্ত্র দিয়ে, প্রাণীর গলার নির্দিষ্ট অংশ কেটে জবাই করতে হয়।', answerEn:'The animal must be slaughtered by a Muslim, invoking the name of Allah, using a sharp instrument, cutting the specified part of the throat.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Clothing ──
    {id:'m160', category:'clothing', questionBn:'নামাজে পুরুষদের পোশাকের ন্যূনতম শর্ত কী?', questionEn:'What is the minimum clothing requirement for men in prayer?',
        answerBn:'নাভি থেকে হাঁটু পর্যন্ত ঢাকা থাকা আবশ্যক, তবে পূর্ণ শালীন পোশাকে নামাজ পড়া উত্তম।', answerEn:'Covering from the navel to the knee is the minimum requirement, though praying in fully modest attire is preferred.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m161', category:'clothing', questionBn:'পুরুষদের জন্য স্বর্ণ ও সিল্ক পরিধানের বিধান কী?', questionEn:'What is the ruling on men wearing gold and pure silk?',
        answerBn:'পুরুষদের জন্য বিশুদ্ধ স্বর্ণ ও খাঁটি সিল্কের কাপড় পরিধান হারাম বলে গণ্য।', answerEn:'Wearing pure gold and pure silk clothing is considered forbidden for men.',
        detailBn:'নামাজে এসব পরিধান করলে নামাজের বিধানের উপরও প্রভাব পড়তে পারে — মারজার রিসালা দেখুন।', detailEn:'Wearing these during prayer may also affect the validity of the prayer — consult your Marja\u2019s manual.',
        sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Women's Issues ──
    {id:'m170', category:'women', questionBn:'হিজাব (পর্দা) সম্পর্কে ইসলামি বিধান কী?', questionEn:'What is the Islamic ruling on Hijab?',
        answerBn:'প্রাপ্তবয়স্ক নারীর জন্য গায়র-মাহরাম পুরুষের সামনে চুল ও শরীর ঢেকে রাখা ওয়াজিব — মুখ ও হাতের কব্জি পর্যন্ত নিয়ে মারজাদের মধ্যে সামান্য মতভেদ আছে।', answerEn:'It is obligatory for an adult woman to cover her hair and body in front of non-Mahram men — there is some difference of opinion among Maraji regarding the face and hands up to the wrist.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m171', category:'women', questionBn:'হায়েজ অবস্থায় কোন কোন ইবাদত নিষিদ্ধ?', questionEn:'Which acts of worship are prohibited during menstruation?',
        answerBn:'হায়েজ অবস্থায় নামাজ, রোজা রাখা, কুরআন স্পর্শ করা এবং মসজিদে প্রবেশ করা নিষিদ্ধ; ছুটে যাওয়া রোজা পরে কাযা করতে হয়, নামাজ কাযা করতে হয় না।', answerEn:'During menstruation, prayer, fasting, touching the Quran\u2019s text, and entering a mosque are prohibited; missed fasts must be made up later, but missed prayers are not.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},

    // ── Technology ──
    {id:'m180', category:'technology', questionBn:'সোশ্যাল মিডিয়া ব্যবহারের ব্যাপারে ইসলামের সাধারণ নীতি কী?', questionEn:'What is the general Islamic principle regarding social media use?',
        answerBn:'যেকোনো প্রযুক্তির মতোই, ব্যবহারের বিষয়বস্তু ও উদ্দেশ্যের উপর বিধান নির্ভর করে — গীবত, মিথ্যা প্রচার বা বেপর্দা কনটেন্ট শেয়ার করা হারাম।', answerEn:'As with any technology, the ruling depends on the content and purpose of use — spreading backbiting, falsehood, or immodest content is forbidden.',
        detailBn:'', detailEn:'', sourceBn:'সাধারণ ফিকহি নীতি', sourceEn:'General fiqh principle', marja:'general'},
    {id:'m181', category:'technology', questionBn:'অনলাইনে ক্রিপ্টোকারেন্সি লেনদেনের ব্যাপারে সাধারণ দৃষ্টিভঙ্গি কী?', questionEn:'What is the general view on online cryptocurrency transactions?',
        answerBn:'এটি একটি অপেক্ষাকৃত নতুন বিষয় যেখানে মারজাদের মধ্যে ভিন্নমত রয়েছে — সিদ্ধান্ত নেওয়ার আগে নিজ মারজার সুনির্দিষ্ট ফতোয়া জেনে নিন।', answerEn:'This is a relatively new area where opinions differ among Maraji — check your specific Marja\u2019s ruling before making decisions.',
        detailBn:'', detailEn:'', sourceBn:'', sourceEn:'', marja:'general'},
];

// ---------------------------------------------------------------------------
// QUESTIONS & ANSWERS — categories
// ---------------------------------------------------------------------------
const kcQaCategories = [
    {key:'aqidah', icon:'☝️', bn:'আকিদা',   en:'Aqidah'},
    {key:'fiqh',   icon:'⚖️', bn:'ফিকহ',    en:'Fiqh'},
    {key:'quran',  icon:'📖', bn:'কুরআন',   en:'Quran'},
    {key:'hadith', icon:'📜', bn:'হাদিস',   en:'Hadith'},
    {key:'general',icon:'💬', bn:'সাধারণ',  en:'General'},
];

// item: {id, category, questionBn, questionEn, answerBn, answerEn}
const kcQa = [
    {id:'q001', category:'aqidah', questionBn:'তাওহিদ বলতে কী বোঝায়?', questionEn:'What does Tawhid mean?',
        answerBn:'তাওহিদ হলো আল্লাহর একত্বে বিশ্বাস — তিনি এক, অদ্বিতীয় এবং তাঁর কোনো শরিক নেই, সৃষ্টিতেও নয়, ইবাদতেও নয়।', answerEn:'Tawhid is belief in the oneness of Allah — that He is one, without partner, in both creation and worship.'},
    {id:'q002', category:'aqidah', questionBn:'ইমামত (আ.) শিয়া আকিদায় কেন গুরুত্বপূর্ণ?', questionEn:'Why is Imamah central to Shia belief?',
        answerBn:'শিয়া আকিদায় ইমামতকে নবুওয়তের ধারাবাহিকতা হিসেবে দেখা হয় — উম্মতের দ্বীনি ও সামাজিক নেতৃত্বের জন্য আল্লাহ কর্তৃক মনোনীত, নিষ্পাপ (মাসুম) নেতা হিসেবে ইমামের ভূমিকা কেন্দ্রীয়।', answerEn:'In Shia belief, Imamah is seen as a continuation of Prophethood — the divinely-appointed, infallible (masum) leader guiding the community religiously and socially.'},
    {id:'q010', category:'fiqh', questionBn:'তাকলিদ কী?', questionEn:'What is Taqlid?',
        answerBn:'তাকলিদ হলো ফিকহের বিশেষজ্ঞ (মুজতাহিদ/মারজা) এর ফতোয়া অনুসরণ করা, যিনি প্রয়োজনীয় শর্ত পূরণ করেন।', answerEn:'Taqlid means following the rulings of a qualified jurist (Mujtahid/Marja) who meets the necessary conditions.'},
    {id:'q020', category:'quran', questionBn:'কুরআনে মোট কতটি সূরা আছে?', questionEn:'How many Surahs are in the Quran?',
        answerBn:'কুরআনে মোট ১১৪টি সূরা রয়েছে।', answerEn:'The Quran contains 114 Surahs.'},
    {id:'q030', category:'hadith', questionBn:'হাদিসে সাকালাইন কী?', questionEn:'What is Hadith al-Thaqalayn?',
        answerBn:'এটি রাসূলুল্লাহ (সা.) এর একটি প্রসিদ্ধ হাদিস, যেখানে তিনি উম্মতের জন্য দুটি ভারী বস্তু — কুরআন ও আহলে বাইত — রেখে যাওয়ার কথা বলেছেন।', answerEn:'This is a well-known narration in which the Prophet (PBUH) states he is leaving behind two weighty things for the Ummah — the Quran and the Ahlul Bayt.'},
    {id:'q040', category:'general', questionBn:'শিয়া ও সুন্নি মুসলিমদের মধ্যে মূল পার্থক্য কী?', questionEn:'What are the main differences between Shia and Sunni Muslims?',
        answerBn:'উভয় দলই ইসলামের মৌলিক স্তম্ভে বিশ্বাসী; মূল পার্থক্য মূলত রাসূলুল্লাহ (সা.) এর পরবর্তী নেতৃত্ব/ইমামত প্রশ্নে ঐতিহাসিক ও ফিকহি দৃষ্টিভঙ্গিতে।', answerEn:'Both groups share the core pillars of Islam; the primary differences are historical and jurisprudential, centering on the question of leadership/Imamah after the Prophet (PBUH).'},

    // ── আরও Aqidah ──
    {id:'q003', category:'aqidah', questionBn:'আদল (আল্লাহর ন্যায়বিচার) শিয়া আকিদার একটি মূলনীতি কেন?', questionEn:'Why is Adl (Divine Justice) a core principle in Shia belief?',
        answerBn:'শিয়া আকিদায় আল্লাহকে সম্পূর্ণ ন্যায়পরায়ণ হিসেবে বিশ্বাস করা হয় — তিনি কখনো অন্যায় করেন না এবং মানুষকে স্বাধীন ইচ্ছাশক্তি দিয়েছেন, যার ফলে মানুষ তার কর্মের জন্য দায়ী।', answerEn:'Shia theology holds Allah to be perfectly just — He never acts unjustly, and has granted humans free will, making them accountable for their actions.'},
    {id:'q004', category:'aqidah', questionBn:'নবুওয়ত (Prophethood) কী?', questionEn:'What is Nubuwwah (Prophethood)?',
        answerBn:'নবুওয়ত হলো আল্লাহ কর্তৃক মনোনীত নবী-রাসূলদের মাধ্যমে মানবজাতির কাছে ওহী পৌঁছে দেওয়ার প্রক্রিয়া, যা মুহাম্মদ (সা.)-এর মাধ্যমে পরিসমাপ্ত হয়েছে।', answerEn:'Nubuwwah is the process by which Allah conveys divine revelation to humanity through chosen prophets, which culminated and concluded with Prophet Muhammad (PBUH).'},
    {id:'q005', category:'aqidah', questionBn:'মাআদ (পুনরুত্থান/আখিরাত) বলতে কী বোঝায়?', questionEn:'What does Ma\u2019ad (Resurrection/Afterlife) mean?',
        answerBn:'মাআদ হলো কিয়ামতের দিন মৃত্যুর পর পুনরুত্থান ও পরকালে বিচারের প্রতি বিশ্বাস — যা ইসলামের মৌলিক আকিদাগুলোর একটি।', answerEn:'Ma\u2019ad is the belief in resurrection after death and judgment in the afterlife on the Day of Resurrection — one of the fundamental tenets of Islamic belief.'},

    // ── আরও Fiqh ──
    {id:'q011', category:'fiqh', questionBn:'মুজতাহিদ কে?', questionEn:'Who is a Mujtahid?',
        answerBn:'মুজতাহিদ হলেন একজন ইসলামি ফিকহ বিশেষজ্ঞ, যিনি কুরআন, হাদিস, ইজমা ও আকল (বুদ্ধিবৃত্তিক প্রমাণ) থেকে স্বাধীনভাবে শরয়ি বিধান নির্ণয় করার যোগ্যতা রাখেন।', answerEn:'A Mujtahid is an Islamic jurisprudence scholar qualified to independently derive religious rulings from the Quran, Hadith, consensus (Ijma), and reason (Aql).'},
    {id:'q012', category:'fiqh', questionBn:'ওয়াজিব, মুস্তাহাব, মাকরুহ ও হারাম — এই পরিভাষাগুলোর অর্থ কী?', questionEn:'What do the terms Wajib, Mustahabb, Makruh, and Haram mean?',
        answerBn:'ওয়াজিব (বাধ্যতামূলক), মুস্তাহাব (প্রস্তাবিত/উত্তম), মাকরুহ (অপছন্দনীয় কিন্তু হারাম নয়), হারাম (নিষিদ্ধ) — এগুলো ফিকহি বিধানের শ্রেণিবিভাগ।', answerEn:'Wajib (obligatory), Mustahabb (recommended), Makruh (disliked but not forbidden), and Haram (forbidden) are the categories used to classify Islamic legal rulings.'},

    // ── আরও Quran ──
    {id:'q021', category:'quran', questionBn:'কুরআন কতদিনে অবতীর্ণ হয়েছিল?', questionEn:'Over how long was the Quran revealed?',
        answerBn:'কুরআন প্রায় ২৩ বছর ধরে রাসূলুল্লাহ (সা.)-এর কাছে ধাপে ধাপে অবতীর্ণ হয়েছিল — মক্কী ও মাদানী দুই পর্বে।', answerEn:'The Quran was revealed to the Prophet (PBUH) gradually over approximately 23 years, in two phases — Meccan and Medinan.'},
    {id:'q022', category:'quran', questionBn:'সবচেয়ে বড় ও ছোট সূরা কোনটি?', questionEn:'What are the longest and shortest Surahs?',
        answerBn:'সবচেয়ে বড় সূরা হলো আল-বাকারা (২৮৬ আয়াত), আর সবচেয়ে ছোট সূরা আল-কাউসার (৩ আয়াত)।', answerEn:'The longest Surah is Al-Baqarah (286 verses), and the shortest is Al-Kawthar (3 verses).'},

    // ── আরও Hadith ──
    {id:'q031', category:'hadith', questionBn:'সহিফায়ে সাজ্জাদিয়্যা কী?', questionEn:'What is the Sahifa al-Sajjadiyya?',
        answerBn:'এটি ইমাম যাইনুল আবিদীন (আ.)-এর দোয়ার একটি সংকলন, যা ইসলামি আধ্যাত্মিক সাহিত্যে "যাবুরে আলে মুহাম্মদ" নামে পরিচিত।', answerEn:'It is a collection of supplications by Imam Zayn al-Abidin (AS), known in Islamic spiritual literature as the "Psalms of the Family of Muhammad".'},
    {id:'q032', category:'hadith', questionBn:'হাদিসে গাদির (গাদিরে খুম) কী?', questionEn:'What is the Hadith of Ghadir (Ghadir Khumm)?',
        answerBn:'এটি রাসূলুল্লাহ (সা.)-এর একটি প্রসিদ্ধ ভাষণ, যেখানে বিদায় হজ্ব থেকে ফেরার পথে গাদিরে খুম নামক স্থানে তিনি আলী (আ.)-কে উম্মতের নেতৃত্বের বিষয়ে উল্লেখ করেন।', answerEn:'This refers to a famous sermon delivered by the Prophet (PBUH) at Ghadir Khumm while returning from his Farewell Pilgrimage, in which he spoke of Ali (AS) in relation to the community\u2019s leadership.'},

    // ── আরও General ──
    {id:'q041', category:'general', questionBn:'আশুরা কী এবং কেন গুরুত্বপূর্ণ?', questionEn:'What is Ashura and why is it significant?',
        answerBn:'আশুরা হলো মুহাররম মাসের দশম দিন, যেদিন ৬১ হিজরিতে কারবালার প্রান্তরে ইমাম হোসাইন (আ.) ও তাঁর সঙ্গীরা শাহাদাত বরণ করেন — শিয়া মুসলিমদের কাছে এটি ত্যাগ ও ন্যায়ের প্রতীক হিসেবে পালিত হয়।', answerEn:'Ashura is the tenth day of Muharram, marking the martyrdom of Imam Husayn (AS) and his companions at Karbala in 61 AH — observed by Shia Muslims as a symbol of sacrifice and standing for justice.'},
    {id:'q042', category:'general', questionBn:'জান্নাতুল বাকি কী?', questionEn:'What is Jannat al-Baqi?',
        answerBn:'জান্নাতুল বাকি মদিনায় অবস্থিত একটি ঐতিহাসিক কবরস্থান, যেখানে রাসূলুল্লাহ (সা.)-এর অনেক পরিবারের সদস্য ও সাহাবি সমাহিত আছেন — চার ইমামও (হাসান, সাজ্জাদ, বাকির, সাদিক আ.) এখানে সমাহিত।', answerEn:'Jannat al-Baqi is a historic cemetery in Medina where many family members and companions of the Prophet (PBUH) are buried — including four Imams (Hasan, Sajjad, al-Baqir, and al-Sadiq, AS).'},
];

// ---------------------------------------------------------------------------
// FATWA — Maraji + SAMPLE/PLACEHOLDER data (see notice at top of file)
// ---------------------------------------------------------------------------
const kcMaraji = [
    {key:'sistani', bn:'আয়াতুল্লাহ সিস্তানি',            en:'Ayatollah Sistani'},
    {key:'khamenei', bn:'আয়াতুল্লাহ খামেনেই',           en:'Ayatollah Khamenei'},
    {key:'makarem', bn:'আয়াতুল্লাহ মাকারেম শিরাজি',      en:'Ayatollah Makarem Shirazi'},
    {key:'wahid', bn:'আয়াতুল্লাহ ওয়াহিদ খোরাসানি',       en:'Ayatollah Wahid Khorasani'},
    {key:'other', bn:'অন্যান্য মারজা',                    en:'Others'},
];

// item: {id, marja, category, questionBn, questionEn, answerBn, answerEn, refBn, refEn, date, sample}
const kcFatwa = [
    {id:'f001', marja:'sistani', category:'salah', questionBn:'নামাজে সন্দেহ (শাক) হলে করণীয় কী?', questionEn:'What should be done when in doubt during prayer?',
        answerBn:'[নমুনা লেখা — অনুগ্রহ করে অফিসিয়াল ও যাচাইকৃত সূত্র থেকে প্রকৃত ফতোয়া দিয়ে প্রতিস্থাপন করুন।]', answerEn:'[Sample placeholder text — please replace with the actual verified ruling from an official source.]',
        refBn:'তাওজিহুল মাসায়েল', refEn:'Tawdih al-Masail', date:'', sample:true},
    {id:'f002', marja:'khamenei', category:'khums', questionBn:'খুমসের হিসাব কখন করতে হয়?', questionEn:'When should Khums be calculated?',
        answerBn:'[নমুনা লেখা — অনুগ্রহ করে অফিসিয়াল ও যাচাইকৃত সূত্র থেকে প্রকৃত ফতোয়া দিয়ে প্রতিস্থাপন করুন।]', answerEn:'[Sample placeholder text — please replace with the actual verified ruling from an official source.]',
        refBn:'অফিসিয়াল ওয়েবসাইট', refEn:'Official website', date:'', sample:true},
    {id:'f003', marja:'makarem', category:'business', questionBn:'ক্রিপ্টোকারেন্সি লেনদেনের বিধান কী?', questionEn:'What is the ruling on cryptocurrency transactions?',
        answerBn:'[নমুনা লেখা — অনুগ্রহ করে অফিসিয়াল ও যাচাইকৃত সূত্র থেকে প্রকৃত ফতোয়া দিয়ে প্রতিস্থাপন করুন।]', answerEn:'[Sample placeholder text — please replace with the actual verified ruling from an official source.]',
        refBn:'অফিসিয়াল ওয়েবসাইট', refEn:'Official website', date:'', sample:true},
    {id:'f004', marja:'wahid', category:'sawm', questionBn:'সফরে রোজার বিধান কী?', questionEn:'What is the ruling on fasting while traveling?',
        answerBn:'[নমুনা লেখা — অনুগ্রহ করে অফিসিয়াল ও যাচাইকৃত সূত্র থেকে প্রকৃত ফতোয়া দিয়ে প্রতিস্থাপন করুন।]', answerEn:'[Sample placeholder text — please replace with the actual verified ruling from an official source.]',
        refBn:'তাওজিহুল মাসায়েল', refEn:'Tawdih al-Masail', date:'', sample:true},
    {id:'f005', marja:'other', category:'misc', questionBn:'নতুন প্রযুক্তি বিষয়ক ফতোয়া কোথায় পাব?', questionEn:'Where can I find rulings on new technology topics?',
        answerBn:'[নমুনা লেখা — আপনার অনুসরণীয় মারজার অফিসিয়াল অফিস/ওয়েবসাইটে যোগাযোগ করুন।]', answerEn:'[Sample placeholder text — contact your Marja\u2019s official office/website directly.]',
        refBn:'', refEn:'', date:'', sample:true},
];

if (typeof window !== 'undefined') {
    window.kcHadithCategories = kcHadithCategories;
    window.kcHadiths = kcHadiths;
    window.kcMasailCategories = kcMasailCategories;
    window.kcMasail = kcMasail;
    window.kcQaCategories = kcQaCategories;
    window.kcQa = kcQa;
    window.kcMaraji = kcMaraji;
    window.kcFatwa = kcFatwa;
}
