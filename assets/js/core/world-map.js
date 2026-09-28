// ============================================================================
// WORLD MAP MODULE (Leaflet — holy sites of Ahl al-Bayt)
// ============================================================================
// [Phase C1 — extracted from script-4-boot.js] This file was previously the
// "PAGE: WORLD MAP" block at the top of script-4-boot.js. It is loaded as a
// separate <script> tag positioned after script-1-core.js (for `state`,
// `sanitize`) and before script-4-boot.js (whose renderMainContent() page
// map and render() call into renderWorldMapPage() by name, and whose
// script-1-core.js companion calls cleanupWorldMap() directly — see
// index.html for the exact tag order). No behavior, exports, or function
// signatures changed — this is a pure code relocation.
//
// ============================================================================
// PAGE: WORLD MAP (Leaflet — holy sites of Ahl al-Bayt)
// ============================================================================
const WORLD_MAP_SITES = [
    // ---------------- Holy Cities ----------------
    {id:"mecca", lat:21.4225, lng:39.8262, icon:"🕋", category:"city", nameBn:"মক্কা", nameEn:"Mecca", descBn:"রাসূলুল্লাহ (সা.)-এর জন্মস্থান ও কাবা শরিফ — ইসলামের কেন্দ্রবিন্দু।", descEn:"Birthplace of Prophet Muhammad (SAW) and site of the Holy Ka'bah, the center of Islam.", historicalImportance:"The holiest city in Islam; direction of prayer (Qiblah) for all Muslims.", relatedPersonalities:["Prophet Muhammad (SAW)"]},
    {id:"medina", lat:24.4672, lng:39.6111, icon:"🕌", category:"city", nameBn:"মদিনা", nameEn:"Medina", descBn:"মসজিদে নববী ও জান্নাতুল বাকি এখানে — ইমাম হাসান, ইমাম সাজ্জাদ, ইমাম বাকির ও ইমাম সাদিক (আ.) এখানে সমাহিত।", descEn:"Home to Masjid an-Nabawi and Jannat al-Baqi, burial site of Imams Hasan, Zainul Abidin, al-Baqir and al-Sadiq (AS).", historicalImportance:"The Prophet's adopted city and the seat of the early Muslim community.", relatedPersonalities:["Prophet Muhammad (SAW)","Imam Hasan","Imam Zayn al-Abidin","Imam al-Baqir","Imam al-Sadiq"]},
    {id:"najaf", lat:31.996, lng:44.335, icon:"🦁", category:"city", imamId:1, nameBn:"নাজাফ", nameEn:"Najaf", descBn:"ইমাম আলী (আ.)-এর পবিত্র মাজার — বিশ্বের অন্যতম বৃহত্তম শিয়া দর্শনীয় স্থান।", descEn:"Holy shrine of Imam Ali (AS) — one of the largest Shia pilgrimage sites in the world.", historicalImportance:"One of the four holy cities of Shia Islam; major center of Islamic scholarship (Hawza).", relatedPersonalities:["Imam Ali"]},
    {id:"karbala", lat:32.616, lng:44.0248, icon:"⚔️", category:"city", imamId:3, nameBn:"কারবালা", nameEn:"Karbala", descBn:"৬১ হিজরিতে ইমাম হোসাইন (আ.)-এর শাহাদাতের স্থান। তাঁর পবিত্র মাজার এখানেই অবস্থিত।", descEn:"Site of the martyrdom of Imam Husayn (AS) in 61 AH. His holy shrine is located here.", historicalImportance:"Site of the Battle of Karbala; among the most visited pilgrimage cities in the world.", relatedPersonalities:["Imam Husayn"], relatedEvents:["Battle of Karbala, 61 AH"]},
    {id:"kufa", lat:32.0333, lng:44.4028, icon:"🕌", category:"city", nameBn:"কুফা", nameEn:"Kufa", descBn:"কুফা মসজিদে নামাজরত অবস্থায় ইমাম আলী (আ.) আঘাতপ্রাপ্ত হন। মুসলিম ইবনে আকিলের ঘটনাও এখানেই ঘটে।", descEn:"Imam Ali (AS) was struck while praying in the Kufa Mosque. Also the site of Muslim ibn Aqeel's mission.", historicalImportance:"Capital of Imam Ali's caliphate; central to the events leading up to Karbala.", relatedPersonalities:["Imam Ali","Muslim ibn Aqil"]},
    {id:"kazimiya", lat:33.3785, lng:44.3416, icon:"🕊️", category:"city", imamId:7, nameBn:"কাজিমিয়া, বাগদাদ", nameEn:"Kazimiya, Baghdad", descBn:"ইমাম মুসা কাযিম (আ.) ও ইমাম মুহাম্মদ জওয়াদ (আ.)-এর পবিত্র মাজার এখানে অবস্থিত।", descEn:"Holy shrine of Imam Musa al-Kazim (AS) and Imam Muhammad al-Jawad (AS).", historicalImportance:"A twin-shrine complex in northern Baghdad, one of Shia Islam's four holy cities.", relatedPersonalities:["Imam Musa al-Kazim","Imam Muhammad al-Jawad"]},
    {id:"samarra", lat:34.1959, lng:43.8742, icon:"🛡️", category:"city", imamId:11, nameBn:"সামাররা", nameEn:"Samarra", descBn:"ইমাম আলী হাদি (আ.) ও ইমাম হাসান আসকারি (আ.)-এর মাজার। এখান থেকেই ইমাম মাহদির গায়বতে সুগরা শুরু হয়।", descEn:"Shrine of Imam Ali al-Hadi (AS) and Imam Hasan al-Askari (AS). The Minor Occultation of Imam Mahdi (AS) began here.", historicalImportance:"The fourth of Shia Islam's holy cities; site of the Minor Occultation.", relatedPersonalities:["Imam Ali al-Hadi","Imam Hasan al-Askari","Imam al-Mahdi"]},
    {id:"mashhad", lat:36.297, lng:59.6062, icon:"🌹", category:"city", imamId:8, nameBn:"মাশহাদ", nameEn:"Mashhad", descBn:"ইমাম রেজা (আ.)-এর পবিত্র মাজার — ইরানের সবচেয়ে পবিত্র স্থান।", descEn:"Holy shrine of Imam Ali al-Ridha (AS) — Iran's most sacred site.", historicalImportance:"Iran's holiest city and one of the largest pilgrimage destinations in the world.", relatedPersonalities:["Imam Ali al-Ridha"]},
    {id:"damascus", lat:33.4256, lng:36.3378, icon:"🌷", category:"city", nameBn:"দামেস্ক (সাইয়্যিদা যয়নাব)", nameEn:"Damascus (Sayyida Zaynab)", descBn:"হযরত যয়নাব (আ.)-এর মাজার। কারবালার পর বন্দী কাফেলাকে এই অঞ্চলেই ইয়াজিদের দরবারে আনা হয়।", descEn:"Shrine of Lady Zaynab (AS). The captive caravan was brought near here to Yazid's court after Karbala.", historicalImportance:"Endpoint of the Karbala captives' journey; major Shia pilgrimage center in Syria.", relatedPersonalities:["Sayyida Zaynab"]},
    {id:"cairo", lat:30.0444, lng:31.2357, icon:"🕌", category:"city", nameBn:"কায়রো", nameEn:"Cairo", descBn:"আল-হুসাইন মসজিদ — বিশ্বাস করা হয় এখানে ইমাম হোসাইন (আ.)-এর মাথা মোবারকের রওজা আছে। সাইয়্যিদা নাফিসার মাজারও এখানে।", descEn:"Home to the Al-Hussein Mosque, believed to house the shrine of Imam Husayn's (AS) sacred head, and the shrine of Sayyida Nafisa.", historicalImportance:"A major historical center of Islamic learning with several venerated shrines.", relatedPersonalities:["Imam Husayn","Sayyida Nafisa"]},
    {id:"qom", lat:34.6401, lng:50.8764, icon:"📗", category:"city", nameBn:"কোম", nameEn:"Qom", descBn:"ইমাম রেজা (আ.)-এর বোন সাইয়্যিদা ফাতিমা মাসুমা (আ.)-এর মাজার এখানে অবস্থিত এবং এটি বিশ্বের অন্যতম বৃহৎ শিয়া ইলমি কেন্দ্র (হাওজা)।", descEn:"Home to the shrine of Sayyida Fatima Masumeh (sister of Imam Ali al-Ridha) and one of the largest centers of Shia religious scholarship in the world.", historicalImportance:"A leading center of Shia seminary (Hawza) education alongside Najaf.", relatedPersonalities:["Sayyida Fatima Masumeh"]},
    {id:"jerusalem", lat:31.7683, lng:35.2137, icon:"🕌", category:"city", nameBn:"জেরুজালেম", nameEn:"Jerusalem", descBn:"মসজিদুল আকসা এখানে অবস্থিত — ইসলামের প্রথম কিবলা এবং রাসূলুল্লাহ (সা.)-এর মিরাজের স্থান।", descEn:"Home to Masjid al-Aqsa, the first Qiblah of Islam and site of the Prophet's Night Journey (Isra and Mi'raj).", historicalImportance:"The first Qiblah in Islam and the third holiest site after Mecca and Medina.", relatedPersonalities:["Prophet Muhammad (SAW)"]},
    {id:"baghdad", lat:33.3152, lng:44.3661, icon:"🏙️", category:"city", nameBn:"বাগদাদ", nameEn:"Baghdad", descBn:"আব্বাসীয় খিলাফতের রাজধানী; আব্বাসীয় যুগে অনেক ইমামের জীবনের গুরুত্বপূর্ণ ঘটনা এখানে ঘটেছে।", descEn:"Capital of the Abbasid Caliphate; site of major events involving several Imams during the Abbasid era.", historicalImportance:"Center of Abbasid rule and a major hub of early Islamic civilization."},
    {id:"basra", lat:30.5085, lng:47.7804, icon:"🌊", category:"city", nameBn:"বসরা", nameEn:"Basra", descBn:"প্রাথমিক ইসলামি যুগের একটি গুরুত্বপূর্ণ শহর; ৩৬ হিজরিতে জঙ্গে জামালের (উটের যুদ্ধ) স্থান এই অঞ্চলের কাছেই।", descEn:"A major early Islamic garrison city; site of the Battle of the Camel (Jamal) in 36 AH.", historicalImportance:"One of the earliest cities founded in the Islamic era, an early center of learning.", relatedEvents:["Battle of the Camel, 36 AH"]},
    // ---------------- Shrines ----------------
    {id:"imam-ali-shrine", lat:31.9986, lng:44.3138, icon:"🕌", category:"shrine", imamId:1, nameBn:"ইমাম আলী শরিফ", nameEn:"Imam Ali Shrine", descBn:"নাজাফ শহরে ইমাম আলী (আ.)-এর পবিত্র মাজার — প্রথম শিয়া ইমামের সমাধিস্থল।", descEn:"The shrine housing the tomb of Imam Ali (AS), the first Shia Imam, within the holy city of Najaf.", historicalImportance:"One of the most visited shrines in the Islamic world.", relatedPersonalities:["Imam Ali"]},
    {id:"imam-husayn-shrine", lat:32.616, lng:44.0244, icon:"🌟", category:"shrine", imamId:3, nameBn:"ইমাম হোসাইন শরিফ", nameEn:"Imam Husayn Shrine", descBn:"কারবালায় ইমাম হোসাইন (আ.)-এর শাহাদাতস্থলে নির্মিত পবিত্র মাজার।", descEn:"The shrine of Imam Husayn (AS), built at the site of his martyrdom during the Battle of Karbala.", historicalImportance:"One of the most visited pilgrimage sites in the world, especially during Arbaeen.", relatedPersonalities:["Imam Husayn"], relatedEvents:["Battle of Karbala, 61 AH"]},
    {id:"hazrat-abbas-shrine", lat:32.6172, lng:44.0257, icon:"🛡️", category:"shrine", nameBn:"হযরত আব্বাস শরিফ", nameEn:"Hazrat Abbas Shrine", descBn:"ইমাম হোসাইন (আ.)-এর সৎ ভাই ও কারবালার পতাকাবাহী হযরত আব্বাসের মাজার, ইমাম হোসাইনের মাজারের কাছেই অবস্থিত।", descEn:"Shrine of Abbas ibn Ali, Imam Husayn's half-brother and standard-bearer at Karbala, located near the Imam Husayn Shrine.", historicalImportance:"Commemorates Abbas ibn Ali's loyalty and role at the Battle of Karbala.", relatedPersonalities:["Abbas ibn Ali","Imam Husayn"], relatedEvents:["Battle of Karbala, 61 AH"]},
    {id:"imam-hasan-al-askari-shrine", lat:34.1983, lng:43.8747, icon:"🌙", category:"shrine", imamId:11, nameBn:"ইমাম হাসান আসকারি শরিফ", nameEn:"Imam Hasan al-Askari Shrine", descBn:"সামাররায় ইমাম আলী হাদি (আ.) ও ইমাম হাসান আসকারি (আ.)-এর মাজার, ইমাম মাহদির গায়বতে সুগরার স্থানের কাছেই।", descEn:"Shrine of Imam Ali al-Hadi (AS) and Imam Hasan al-Askari (AS) in Samarra, near the site of Imam al-Mahdi's Minor Occultation.", historicalImportance:"Marks the resting place of the tenth and eleventh Imams.", relatedPersonalities:["Imam Ali al-Hadi","Imam Hasan al-Askari"]},
    {id:"kazimayn-shrine", lat:33.3791, lng:44.3406, icon:"🕊️", category:"shrine", imamId:7, nameBn:"কাজিমাইন শরিফ", nameEn:"Imam Musa al-Kazim & Imam Muhammad al-Jawad Shrine", descBn:"বাগদাদের কাজিমিয়ায় সপ্তম ইমাম মুসা কাযিম ও নবম ইমাম মুহাম্মদ জওয়াদ (আ.)-এর যমজ গম্বুজবিশিষ্ট মাজার।", descEn:"Twin-domed shrine in Kazimiya, Baghdad, housing the tombs of the seventh and ninth Imams.", historicalImportance:"One of the four holy shrine cities of Shia Islam.", relatedPersonalities:["Imam Musa al-Kazim","Imam Muhammad al-Jawad"]},
    {id:"imam-ali-al-ridha-shrine", lat:36.288, lng:59.6157, icon:"🌹", category:"shrine", imamId:8, nameBn:"ইমাম রেজা শরিফ", nameEn:"Imam Ali al-Ridha Shrine", descBn:"মাশহাদে অষ্টম ইমাম আলী রেজা (আ.)-এর মাজার — ইরানের সবচেয়ে পরিদর্শিত পবিত্র স্থান।", descEn:"The shrine of Imam Ali al-Ridha (AS), the eighth Imam, in Mashhad — Iran's most visited pilgrimage site.", historicalImportance:"One of the largest mosque-shrine complexes in the world by area.", relatedPersonalities:["Imam Ali al-Ridha"]},
    {id:"sayyida-zaynab-shrine", lat:33.4256, lng:36.3378, icon:"🌷", category:"shrine", nameBn:"সাইয়্যিদা যয়নাব শরিফ", nameEn:"Sayyida Zaynab Shrine", descBn:"দামেস্কের দক্ষিণে হযরত যয়নাব (আ.)-এর মাজার।", descEn:"Shrine of Lady Zaynab (AS), daughter of Imam Ali, south of Damascus.", historicalImportance:"A major Shia pilgrimage site associated with the aftermath of Karbala.", relatedPersonalities:["Sayyida Zaynab"]},
    {id:"sayyida-ruqayya-shrine", lat:33.5115, lng:36.307, icon:"🌺", category:"shrine", nameBn:"সাইয়্যিদা রুকাইয়া শরিফ", nameEn:"Sayyida Ruqayya Shrine", descBn:"পুরাতন দামেস্কে ইমাম হোসাইনের কনিষ্ঠ কন্যা রুকাইয়ার সাথে সম্পর্কিত মাজার, কারবালার পরপরই যাঁর ইন্তেকাল হয় বলে বর্ণিত।", descEn:"Shrine in the Old City of Damascus associated with Ruqayya, young daughter of Imam Husayn, who is said to have died there shortly after Karbala.", historicalImportance:"A site of remembrance for the youngest captives of Karbala.", relatedPersonalities:["Imam Husayn"], relatedEvents:["Battle of Karbala, 61 AH"]},
    {id:"muslim-ibn-aqil-shrine", lat:32.0339, lng:44.4022, icon:"⭐", category:"shrine", nameBn:"মুসলিম ইবনে আকিল শরিফ", nameEn:"Muslim ibn Aqil Shrine", descBn:"কুফা মসজিদ চত্বরে ইমাম হোসাইনের দূত মুসলিম ইবনে আকিলের সম্মানে নির্মিত মাজার।", descEn:"Shrine within the Kufa Mosque complex honoring Muslim ibn Aqil, Imam Husayn's envoy to Kufa.", historicalImportance:"Commemorates Imam Husayn's cousin and representative sent ahead to Kufa.", relatedPersonalities:["Muslim ibn Aqil","Imam Husayn"]},
    {id:"hani-ibn-urwa-shrine", lat:32.03, lng:44.405, icon:"🔷", category:"shrine", nameBn:"হানি ইবনে উরওয়া শরিফ", nameEn:"Hani ibn Urwa Shrine", descBn:"কুফার নেতা হানি ইবনে উরওয়ার মাজার, যিনি মুসলিম ইবনে আকিলকে আশ্রয় দিয়েছিলেন এবং তাঁর সাথেই শহীদ হন।", descEn:"Shrine of Hani ibn Urwa, a Kufan chief who sheltered Muslim ibn Aqil and was martyred alongside him.", historicalImportance:"Honors a Kufan supporter of Imam Husayn's cause.", relatedPersonalities:["Hani ibn Urwa","Muslim ibn Aqil"]},
    {id:"mukhtar-al-thaqafi-tomb", lat:32.031, lng:44.401, icon:"🪦", category:"shrine", nameBn:"মুখতার আল-সাকাফির সমাধি", nameEn:"Mukhtar al-Thaqafi Tomb", descBn:"ইমাম হোসাইনের হত্যার প্রতিশোধ নিতে কুফায় বিদ্রোহের নেতৃত্বদানকারী মুখতার আল-সাকাফির সাথে সম্পর্কিত সমাধি।", descEn:"Tomb associated with Mukhtar al-Thaqafi, who led an uprising in Kufa avenging the killing of Imam Husayn.", historicalImportance:"Linked to the Tawwabin/Mukhtar uprisings avenging Karbala."},
    // ---------------- Mosques ----------------
    {id:"masjid-al-haram", lat:21.4225, lng:39.8262, icon:"🕋", category:"mosque", nameBn:"মসজিদুল হারাম", nameEn:"Masjid al-Haram", descBn:"মক্কায় কাবা শরিফ ঘিরে অবস্থিত মহাপবিত্র মসজিদ — ইসলামের সবচেয়ে পবিত্র স্থান।", descEn:"The Grand Mosque surrounding the Ka'bah in Mecca — the holiest site in Islam.", historicalImportance:"The Qiblah for all Muslim prayer worldwide.", relatedPersonalities:["Prophet Muhammad (SAW)","Imam Ali"]},
    {id:"masjid-an-nabawi", lat:24.4672, lng:39.6111, icon:"🕌", category:"mosque", nameBn:"মসজিদে নববী", nameEn:"Al-Masjid an-Nabawi", descBn:"মদিনায় রাসূলুল্লাহ (সা.)-এর মসজিদ, তাঁর ঘর ও সমাধিস্থলের সাথে সংযুক্ত।", descEn:"The Prophet's Mosque in Medina, built adjoining the Prophet's house and burial place.", historicalImportance:"The second holiest mosque in Islam.", relatedPersonalities:["Prophet Muhammad (SAW)"]},
    {id:"masjid-quba", lat:24.4392, lng:39.6172, icon:"🏛️", category:"mosque", nameBn:"মসজিদে কুবা", nameEn:"Masjid Quba", descBn:"ইসলামের ইতিহাসে নির্মিত প্রথম মসজিদ, মদিনার উপকণ্ঠে অবস্থিত।", descEn:"The first mosque built in Islamic history, on the outskirts of Medina.", historicalImportance:"Marks the Prophet's first stop upon migrating to Medina."},
    {id:"masjid-qiblatayn", lat:24.4759, lng:39.5897, icon:"🧭", category:"mosque", nameBn:"মসজিদে কিবলাতাইন", nameEn:"Masjid Qiblatayn", descBn:"'দুই কিবলার মসজিদ' — যেখানে নামাজের দিক জেরুজালেম থেকে মক্কার দিকে পরিবর্তিত হয়েছিল।", descEn:"The 'Mosque of the Two Qiblahs', where the direction of prayer was changed from Jerusalem to Mecca.", historicalImportance:"Marks the historic change of Qiblah direction."},
    {id:"masjid-kufa", lat:32.0339, lng:44.4022, icon:"⚔️", category:"mosque", nameBn:"কুফা মসজিদ", nameEn:"Masjid Kufa", descBn:"ইসলামের ইতিহাসের অন্যতম প্রাচীন ও গুরুত্বপূর্ণ মসজিদ; এখানেই নামাজরত অবস্থায় ইমাম আলী (আ.) আঘাতপ্রাপ্ত হন।", descEn:"One of the earliest and most significant mosques in Islamic history; Imam Ali was struck here while in prayer.", historicalImportance:"Site of Imam Ali's martyrdom while prostrating in prayer.", relatedPersonalities:["Imam Ali"]},
    {id:"masjid-sahla", lat:32.0242, lng:44.3833, icon:"✨", category:"mosque", nameBn:"মসজিদে সাহলা", nameEn:"Masjid Sahla", descBn:"কুফার কাছে অবস্থিত ঐতিহাসিক মসজিদ, শিয়া ঐতিহ্যে বিশেষভাবে সম্মানিত এবং ইমাম মাহদির সাথে সম্পর্কিত।", descEn:"A historic mosque near Kufa held in high regard in Shia tradition and associated with Imam al-Mahdi.", historicalImportance:"A site of special devotional significance in Shia tradition.", relatedPersonalities:["Imam al-Mahdi"]},
    {id:"masjid-al-khayf", lat:21.4038, lng:39.8592, icon:"⛺", category:"mosque", nameBn:"মসজিদে খাইফ", nameEn:"Masjid al-Khayf", descBn:"মক্কার কাছে মিনায় অবস্থিত ঐতিহাসিক মসজিদ, হজ্জের সময় হাজিরা পরিদর্শন করেন।", descEn:"A historic mosque in Mina, near Mecca, visited by pilgrims during Hajj.", historicalImportance:"Traditionally associated with many earlier prophets."},
    {id:"masjid-al-jinn", lat:21.4149, lng:39.8482, icon:"🌙", category:"mosque", nameBn:"মসজিদুল জিন", nameEn:"Masjid al-Jinn", descBn:"মক্কায় অবস্থিত মসজিদ, কুরআনে বর্ণিত জিনদের রাসূলুল্লাহ (সা.)-এর তিলাওয়াত শোনার ঘটনার সাথে সম্পর্কিত।", descEn:"A mosque in Mecca traditionally associated with the Qur'anic account of jinn listening to the Prophet's recitation.", historicalImportance:"Linked to Surah al-Jinn in the Qur'an."},
    // ---------------- Historical Sites ----------------
    {id:"ghadir-khumm", lat:22.6725, lng:39.1206, icon:"🌴", category:"historical", nameBn:"গাদীরে খুম", nameEn:"Ghadir Khumm", descBn:"মক্কা ও মদিনার মাঝামাঝি স্থান, যেখানে শিয়া বিশ্বাস অনুযায়ী রাসূলুল্লাহ (সা.) ইমাম আলীকে তাঁর উত্তরসূরি ঘোষণা করেন।", descEn:"The site between Mecca and Medina where, according to Shia tradition, the Prophet declared Imam Ali as his successor.", historicalImportance:"Central event in Shia belief regarding the succession of Imam Ali.", relatedPersonalities:["Prophet Muhammad (SAW)","Imam Ali"]},
    {id:"fadak", lat:25.5, lng:39.3, icon:"🌾", category:"historical", nameBn:"ফাদাক", nameEn:"Fadak", descBn:"হযরত ফাতিমাকে দেওয়া একটি বাগান, যা পরবর্তীতে রাসূলুল্লাহ (সা.)-এর ইন্তেকালের পর একটি সুপরিচিত ঐতিহাসিক বিরোধের বিষয় হয়ে ওঠে।", descEn:"An oasis granted to Lady Fatima, later a subject of a well-known historical dispute after the Prophet's passing.", historicalImportance:"Central to a significant early historical dispute involving Lady Fatima.", relatedPersonalities:["Sayyida Fatima al-Zahra"]},
    {id:"saqifah", lat:24.47, lng:39.615, icon:"🏛️", category:"historical", nameBn:"সাকিফা বনি সাইদা", nameEn:"Saqifah Bani Sa'ida", descBn:"মদিনার সেই সমাবেশস্থল, যেখানে রাসূলুল্লাহ (সা.)-এর ইন্তেকালের পর নেতৃত্ব নিয়ে আলোচনা হয়েছিল।", descEn:"The gathering hall in Medina where the succession to the Prophet was discussed following his passing.", historicalImportance:"Site of the historic meeting that determined the early caliphal succession."},
    {id:"dar-al-arqam", lat:21.4265, lng:39.833, icon:"🏠", category:"historical", nameBn:"দারুল আরকাম", nameEn:"Dar al-Arqam", descBn:"মক্কায় প্রথম মুসলিমদের গোপন সমাবেশস্থল হিসেবে ব্যবহৃত ঘর।", descEn:"The house in Mecca used as a secret meeting place by the earliest Muslims.", historicalImportance:"The first center of Islamic teaching in Mecca.", relatedPersonalities:["Prophet Muhammad (SAW)"]},
    {id:"house-of-fatimah", lat:24.4713, lng:39.6117, icon:"🏡", category:"historical", nameBn:"হযরত ফাতিমার ঘর", nameEn:"House of Fatimah", descBn:"মদিনায় মসজিদে নববীর পাশে অবস্থিত হযরত ফাতিমা যাহরার ঐতিহাসিক ঘর।", descEn:"The historic house of Lady Fatima al-Zahra adjoining the Prophet's Mosque in Medina.", historicalImportance:"Home of the Prophet's daughter and the Ahl al-Bayt household.", relatedPersonalities:["Sayyida Fatima al-Zahra"]},
    {id:"house-of-imam-ali", lat:24.471, lng:39.612, icon:"🏘️", category:"historical", imamId:1, nameBn:"ইমাম আলীর ঘর", nameEn:"House of Imam Ali", descBn:"মদিনায় রাসূলুল্লাহর পরিবারের পাশে অবস্থিত ইমাম আলীর ঐতিহাসিক বাসস্থান।", descEn:"The historic residence of Imam Ali in Medina, adjoining the Prophet's household.", historicalImportance:"Home of the first Shia Imam during the Prophet's lifetime.", relatedPersonalities:["Imam Ali"]},
    {id:"house-of-imam-hasan", lat:24.4715, lng:39.6115, icon:"🕊️", category:"historical", imamId:2, nameBn:"ইমাম হাসানের ঘর", nameEn:"House of Imam Hasan", descBn:"মদিনায় ইমাম হাসানের ঐতিহাসিক বাসস্থান।", descEn:"The historic residence of Imam Hasan in Medina.", historicalImportance:"Childhood and adult home of the second Shia Imam.", relatedPersonalities:["Imam Hasan"]},
    {id:"house-of-imam-husayn", lat:24.4718, lng:39.6113, icon:"🌙", category:"historical", imamId:3, nameBn:"ইমাম হোসাইনের ঘর", nameEn:"House of Imam Husayn", descBn:"কারবালার উদ্দেশ্যে যাত্রার আগে মদিনায় ইমাম হোসাইনের ঐতিহাসিক বাসস্থান।", descEn:"The historic residence of Imam Husayn in Medina, before his final journey to Karbala.", historicalImportance:"His home before departing Medina on the journey that ended at Karbala.", relatedPersonalities:["Imam Husayn"]},
    {id:"birthplace-imam-ali", lat:21.4225, lng:39.8262, icon:"🕋", category:"historical", imamId:1, nameBn:"ইমাম আলীর জন্মস্থান (কাবার অভ্যন্তরে)", nameEn:"Birthplace of Imam Ali (Inside the Ka'bah)", descBn:"শিয়া ঐতিহ্য অনুযায়ী, ইমাম আলী মক্কায় কাবা শরিফের ভেতরে জন্মগ্রহণ করেন।", descEn:"According to Shia tradition, Imam Ali was born inside the Ka'bah in Mecca.", historicalImportance:"Traditionally regarded as the only person born within the Ka'bah.", relatedPersonalities:["Imam Ali"]},
    {id:"cave-of-hira", lat:21.4581, lng:39.8595, icon:"⛰️", category:"historical", nameBn:"হেরা গুহা", nameEn:"Cave of Hira", descBn:"মক্কার কাছে জাবালে নূরে অবস্থিত গুহা, যেখানে রাসূলুল্লাহ (সা.) প্রথম ওহি লাভ করেন।", descEn:"The cave on Jabal al-Nour near Mecca where the Prophet received the first Qur'anic revelation.", historicalImportance:"Site of the beginning of Prophethood and Qur'anic revelation.", relatedPersonalities:["Prophet Muhammad (SAW)"]},
    {id:"cave-of-thawr", lat:21.3833, lng:39.8611, icon:"🗻", category:"historical", nameBn:"সাওর গুহা", nameEn:"Cave of Thawr", descBn:"মক্কার দক্ষিণে অবস্থিত গুহা, যেখানে রাসূলুল্লাহ (সা.) ও আবু বকর মদিনায় হিজরতের সময় আশ্রয় নেন।", descEn:"The cave south of Mecca where the Prophet and Abu Bakr sheltered during the migration to Medina.", historicalImportance:"Associated with the Hijrah (migration) to Medina."},
    // ---------------- Cemeteries ----------------
    {id:"jannat-al-baqi", lat:24.468, lng:39.6136, icon:"🪦", category:"cemetery", nameBn:"জান্নাতুল বাকি", nameEn:"Jannat al-Baqi", descBn:"মদিনার ঐতিহাসিক কবরস্থান, যেখানে ইমাম হাসান, ইমাম সাজ্জাদ, ইমাম বাকির ও ইমাম সাদিক (আ.) সহ রাসূলুল্লাহর অনেক পরিবারের সদস্য ও সাহাবি সমাহিত।", descEn:"The historic cemetery in Medina where Imams Hasan, Zayn al-Abidin, al-Baqir and al-Sadiq, along with many companions and family members of the Prophet, are buried.", historicalImportance:"One of the most significant Islamic cemeteries, adjoining the Prophet's Mosque.", relatedPersonalities:["Imam Hasan","Imam Zayn al-Abidin","Imam al-Baqir","Imam al-Sadiq"]},
    {id:"jannat-al-mualla", lat:21.43, lng:39.835, icon:"🪦", category:"cemetery", nameBn:"জান্নাতুল মুয়াল্লা", nameEn:"Jannat al-Mu'alla", descBn:"মক্কার ঐতিহাসিক কবরস্থান, যেখানে রাসূলুল্লাহর স্ত্রী হযরত খাদিজাসহ পরিবারের সদস্যরা সমাহিত।", descEn:"A historic cemetery in Mecca where members of the Prophet's family, including his wife Khadijah, are buried.", historicalImportance:"Burial place of Khadijah bint Khuwaylid and other early figures of Islam.", relatedPersonalities:["Sayyida Khadijah"]},
    {id:"wadi-al-salam", lat:31.9917, lng:44.3236, icon:"🪦", category:"cemetery", nameBn:"ওয়াদিউস সালাম", nameEn:"Wadi al-Salam", descBn:"নাজাফের বিশাল কবরস্থান, বিশ্বের অন্যতম বৃহত্তম, ইমাম আলীর মাজারের পাশে অবস্থিত।", descEn:"A vast cemetery in Najaf, considered one of the largest in the world, adjoining the shrine of Imam Ali.", historicalImportance:"Believed in Shia tradition to be a especially blessed burial ground.", relatedPersonalities:["Imam Ali"]},
    // ---------------- Battlefields ----------------
    {id:"badr", lat:23.755, lng:38.7758, icon:"⚔️", category:"battlefield", nameBn:"বদর", nameEn:"Badr", descBn:"২ হিজরিতে মুসলিম ও মক্কার কুরাইশদের মধ্যে সংঘটিত প্রথম বড় যুদ্ধের স্থান।", descEn:"Site of the first major battle between the early Muslims and the Meccan Quraysh in 2 AH.", historicalImportance:"A decisive early victory for the Muslim community.", relatedEvents:["Battle of Badr, 2 AH"]},
    {id:"uhud", lat:24.5011, lng:39.6122, icon:"⚔️", category:"battlefield", nameBn:"উহুদ", nameEn:"Uhud", descBn:"৩ হিজরিতে মদিনার কাছে সংঘটিত উহুদ যুদ্ধের স্থান, যেখানে রাসূলুল্লাহর চাচা হামজা শহীদ হন।", descEn:"Site of the Battle of Uhud in 3 AH, near Medina, where the Prophet's uncle Hamza was martyred.", historicalImportance:"A significant early battle and lesson in discipline for the Muslim army.", relatedEvents:["Battle of Uhud, 3 AH"]},
    {id:"khandaq", lat:24.482, lng:39.595, icon:"⚔️", category:"battlefield", nameBn:"খন্দক", nameEn:"Khandaq (The Trench)", descBn:"৫ হিজরিতে সংঘটিত খন্দকের যুদ্ধের স্থান, যেখানে মদিনা একটি জোট বাহিনী দ্বারা অবরুদ্ধ হয়েছিল।", descEn:"Site of the Battle of the Trench in 5 AH, where Medina was besieged by a confederate army.", historicalImportance:"Imam Ali's duel with Amr ibn Abd Wudd is a central episode of this battle.", relatedPersonalities:["Imam Ali"], relatedEvents:["Battle of the Trench, 5 AH"]},
    {id:"khaybar", lat:25.69, lng:39.2814, icon:"⚔️", category:"battlefield", nameBn:"খাইবার", nameEn:"Khaybar", descBn:"৭ হিজরিতে সংঘটিত খাইবার যুদ্ধের স্থান, যেখানে ইমাম আলী দুর্গ জয়ে নেতৃত্ব দেন।", descEn:"Site of the Battle of Khaybar in 7 AH, where Imam Ali famously led the conquest of the fortress.", historicalImportance:"Associated with Imam Ali's renowned feat of removing the fortress gate.", relatedPersonalities:["Imam Ali"], relatedEvents:["Battle of Khaybar, 7 AH"]},
    {id:"hunayn", lat:21.5167, lng:40.15, icon:"⚔️", category:"battlefield", nameBn:"হুনাইন", nameEn:"Hunayn", descBn:"৮ হিজরিতে মক্কা বিজয়ের অল্প পরেই সংঘটিত হুনাইন যুদ্ধের স্থান।", descEn:"Site of the Battle of Hunayn in 8 AH, shortly after the conquest of Mecca.", historicalImportance:"A major battle following the Muslim conquest of Mecca.", relatedEvents:["Battle of Hunayn, 8 AH"]},
    {id:"jamal", lat:30.5085, lng:47.7804, icon:"⚔️", category:"battlefield", nameBn:"জামাল (বসরা)", nameEn:"Jamal (Basra)", descBn:"৩৬ হিজরিতে বসরার কাছে সংঘটিত জঙ্গে জামাল (উটের যুদ্ধ), মুসলিম সম্প্রদায়ের প্রথম অভ্যন্তরীণ সংঘাত।", descEn:"Site of the Battle of the Camel in 36 AH, the first major internal conflict of the early Muslim community, fought near Basra.", historicalImportance:"The first battle fought among Muslims themselves, during Imam Ali's caliphate.", relatedPersonalities:["Imam Ali"], relatedEvents:["Battle of the Camel, 36 AH"]},
    {id:"siffin", lat:35.95, lng:38.95, icon:"⚔️", category:"battlefield", nameBn:"সিফফিন", nameEn:"Siffin", descBn:"৩৭ হিজরিতে ইমাম আলী ও মুয়াবিয়ার বাহিনীর মধ্যে সংঘটিত সিফফিনের যুদ্ধের স্থান।", descEn:"Site of the Battle of Siffin in 37 AH between the forces of Imam Ali and Muawiyah.", historicalImportance:"A pivotal conflict during Imam Ali's caliphate, leading to the arbitration crisis.", relatedPersonalities:["Imam Ali"], relatedEvents:["Battle of Siffin, 37 AH"]},
    {id:"nahrawan", lat:33.2, lng:44.65, icon:"⚔️", category:"battlefield", nameBn:"নাহরাওয়ান", nameEn:"Nahrawan", descBn:"৩৮ হিজরিতে ইমাম আলীর বাহিনী ও খারিজিদের মধ্যে সংঘটিত নাহরাওয়ানের যুদ্ধের স্থান।", descEn:"Site of the Battle of Nahrawan in 38 AH, where Imam Ali's forces confronted the Kharijites.", historicalImportance:"Marked the definitive break between Imam Ali and the Kharijite faction.", relatedPersonalities:["Imam Ali"], relatedEvents:["Battle of Nahrawan, 38 AH"]},
    {id:"karbala-battlefield", lat:32.6155, lng:44.023, icon:"⚔️", category:"battlefield", imamId:3, nameBn:"কারবালা রণক্ষেত্র", nameEn:"Karbala Battlefield", descBn:"৬১ হিজরির ১০ মহররম, ইমাম হোসাইন ও তাঁর সঙ্গীদের শেষ প্রতিরোধের স্থান — কারবালার উন্মুক্ত প্রান্তর।", descEn:"The open plain at Karbala where Imam Husayn and his companions made their final stand on 10 Muharram, 61 AH.", historicalImportance:"Site of the Battle of Karbala and Imam Husayn's martyrdom.", relatedPersonalities:["Imam Husayn"], relatedEvents:["Battle of Karbala, 61 AH"]},
    // ---------------- Karbala Special Locations ----------------
    {id:"bayn-al-haramayn", lat:32.6165, lng:44.025, icon:"📍", category:"special", nameBn:"বাইনাল হারামাইন", nameEn:"Bayn al-Haramayn", descBn:"কারবালায় ইমাম হোসাইন ও হযরত আব্বাসের মাজারের মধ্যবর্তী উন্মুক্ত প্রাঙ্গণ।", descEn:"The open courtyard area between the shrines of Imam Husayn and Hazrat Abbas in Karbala.", historicalImportance:"A central gathering space between the two great shrines of Karbala."},
    {id:"tal-al-zaynabiyyah", lat:32.618, lng:44.026, icon:"📍", category:"special", nameBn:"তাল আল-জয়নাবিয়্যাহ", nameEn:"Tal al-Zaynabiyyah", descBn:"কারবালার একটি উঁচু স্থান, প্রচলিত বিশ্বাস অনুযায়ী আশুরার দিন হযরত যয়নাবের সাথে সম্পর্কিত।", descEn:"A raised mound in Karbala traditionally associated with Lady Zaynab during the events of Ashura.", historicalImportance:"Traditionally linked to Lady Zaynab's witnessing of the battle.", relatedPersonalities:["Sayyida Zaynab"]},
    {id:"qatlgah", lat:32.615, lng:44.0225, icon:"📍", category:"special", imamId:3, nameBn:"কাতলগাহ", nameEn:"Qatlgah", descBn:"কারবালা রণক্ষেত্রে ইমাম হোসাইনের শাহাদাতের সুনির্দিষ্ট স্থান বলে চিহ্নিত।", descEn:"The specific spot traditionally identified as the place of Imam Husayn's martyrdom on the Karbala battlefield.", historicalImportance:"Regarded as the exact site of Imam Husayn's martyrdom.", relatedPersonalities:["Imam Husayn"], relatedEvents:["Battle of Karbala, 61 AH"]},
    {id:"khaimah-gah", lat:32.614, lng:44.021, icon:"📍", category:"special", nameBn:"খাইমাগাহ", nameEn:"Khaimah Gah", descBn:"কারবালায় ইমাম হোসাইনের পরিবার ও সঙ্গীদের তাঁবু স্থাপনের ঐতিহাসিক স্থান।", descEn:"The traditional site of the encampment (tents) of Imam Husayn's family and companions at Karbala.", historicalImportance:"Marks where the Karbala caravan set up camp before the battle."},
    {id:"euphrates-river", lat:32.61, lng:44.015, icon:"📍", category:"special", nameBn:"ফোরাত নদী (কারবালা)", nameEn:"Euphrates River (Karbala)", descBn:"কারবালায় সেই নদীতীর, যেখানে যুদ্ধের আগে ইমাম হোসাইনের শিবিরকে পানি থেকে বঞ্চিত করা হয়েছিল।", descEn:"The riverbank at Karbala where Imam Husayn's camp was denied access to water before the battle.", historicalImportance:"Central to the accounts of thirst endured by Imam Husayn's camp."},
    {id:"alqamah-river", lat:32.612, lng:44.018, icon:"📍", category:"special", nameBn:"আলকামা নদী", nameEn:"Alqamah River", descBn:"ফোরাত থেকে উৎপন্ন একটি খাল, কারবালার ঘটনাবলীর বিবরণে উল্লেখিত।", descEn:"A channel from the Euphrates near Karbala, referenced in accounts of the events surrounding the battle.", historicalImportance:"Referenced in historical accounts of the Karbala campaign."},
    {id:"maqam-ali-akbar", lat:32.6158, lng:44.0245, icon:"📍", category:"special", nameBn:"মাকামে আলী আকবর", nameEn:"Maqam Ali Akbar", descBn:"কারবালায় ইমাম হোসাইনের পুত্র আলী আকবরের সাথে সম্পর্কিত স্মৃতিস্থল, যিনি কারবালায় শহীদ হন।", descEn:"A memorial site in Karbala associated with Ali al-Akbar, son of Imam Husayn, martyred at Karbala.", historicalImportance:"Commemorates Ali al-Akbar's martyrdom at Karbala.", relatedPersonalities:["Imam Husayn"], relatedEvents:["Battle of Karbala, 61 AH"]},
    {id:"maqam-ali-asghar", lat:32.6162, lng:44.0248, icon:"📍", category:"special", nameBn:"মাকামে আলী আসগর", nameEn:"Maqam Ali Asghar", descBn:"কারবালায় ইমাম হোসাইনের শিশুপুত্র আলী আসগরের সাথে সম্পর্কিত স্মৃতিস্থল।", descEn:"A memorial site in Karbala associated with Ali al-Asghar, the infant son of Imam Husayn.", historicalImportance:"Commemorates the infant Ali al-Asghar, among the youngest martyrs of Karbala.", relatedPersonalities:["Imam Husayn"], relatedEvents:["Battle of Karbala, 61 AH"]},
];
// ---- Leaflet lazy loader (World Map page only) --------------------------
// Leaflet used to be loaded eagerly via <link>/<script> tags in index.html's
// <head>, blocking every page's initial load even though it's only needed
// here. It's now loaded on demand, the first time renderWorldMapPage() runs,
// via the same CDN URLs/version (1.9.4) that were previously hardcoded in
// index.html. ensureLeafletLoaded() is idempotent/cached (mirrors the
// loadJSONAsync()/section-cache pattern already used by the Dua/Knowledge
// Center/Ahlul Bayt data loaders): a second call while the first is still in
// flight returns the same in-flight Promise instead of injecting duplicate
// <link>/<script> tags, and a call after Leaflet has already loaded resolves
// immediately via the existing `window.L` global. Never throws — resolves to
// null on failure (e.g. offline) so callers can fall back gracefully, same
// contract as loadJSONAsync()/fetchJSONWithRetry() elsewhere in this app.
const LEAFLET_CSS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const LEAFLET_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
let leafletLoadState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'
let leafletPromise = null;

function ensureLeafletLoaded() {
    if (typeof window.L !== 'undefined') {
        leafletLoadState = 'loaded';
        return Promise.resolve(window.L);
    }
    if (leafletPromise) return leafletPromise;

    leafletLoadState = 'loading';
    leafletPromise = new Promise((resolve) => {
        // CSS: safe to append even if it ends up requested twice across
        // rapid calls, since leafletPromise above already prevents that in
        // practice. Guard on an id anyway, defensively.
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS_URL;
            document.head.appendChild(link);
        }

        const script = document.createElement('script');
        script.src = LEAFLET_JS_URL;
        script.onload = () => {
            leafletLoadState = 'loaded';
            resolve(window.L || null);
        };
        script.onerror = () => {
            console.error('[leaflet-lazy-load] Failed to load ' + LEAFLET_JS_URL);
            leafletLoadState = 'error';
            resolve(null);
        };
        document.head.appendChild(script);
    });

    return leafletPromise;
}

function cleanupWorldMap() {
    if (window._worldMapInstance) {
        window._worldMapInstance.remove();
        window._worldMapInstance = null;
    }
}

function initWorldMap() {
    const container = document.getElementById('world-map-leaflet');
    if (!container || typeof L === 'undefined') return; // Leaflet failed to load (e.g. offline) — page shows a fallback message instead
    cleanupWorldMap(); // guard against double-init if render() fires twice in a row

    const map = L.map(container, {scrollWheelZoom:false}).setView([30.5, 43], 4);
    window._worldMapInstance = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);

    const l = state.language;
    WORLD_MAP_SITES.forEach(site => {
        const divIcon = L.divIcon({
            className: 'world-map-pin',
            html: `<div class="world-map-pin-inner"><span>${site.icon}</span></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -30],
        });
        const marker = L.marker([site.lat, site.lng], {icon: divIcon}).addTo(map);
        const name = l==='bn' ? site.nameBn : site.nameEn;
        const desc = l==='bn' ? site.descBn : site.descEn;
        const btnHtml = site.imamId
            ? `<button data-action="viewImam" data-param="${site.imamId}" class="world-map-popup-btn">${l==='bn'?'বিস্তারিত দেখুন':'View Details'} →</button>`
            : '';
        marker.bindPopup(`<div class="world-map-popup"><strong>${sanitize(name)}</strong><p>${sanitize(desc)}</p>${btnHtml}</div>`);
    });
}

function renderWorldMapPage() {
    const d = state.darkMode, l = state.language;
    const leafletReady = typeof L !== 'undefined';

    if (leafletReady) {
        requestAnimationFrame(initWorldMap);
    } else {
        // Kick off the lazy load (no-op / returns existing promise if a load
        // is already in flight from a previous visit to this page — see
        // ensureLeafletLoaded()). Only re-render if the user is still on the
        // World Map page when it settles, mirroring the exact page-guard
        // pattern already used by the Blog/Quiz/Knowledge Center/Dua/Ahlul
        // Bayt async data loaders elsewhere in this app.
        ensureLeafletLoaded().then(() => {
            if (state.currentPage === 'worldMap' && typeof render === 'function') render();
        });
    }

    return `
    <div class="space-y-6 page-enter">
        <div class="reveal">
            <h1 class="font-black" style="font-size:clamp(1.6rem,5vw,2.4rem);background:linear-gradient(135deg,#b45309,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                🗺️ ${l==='bn'?'বিশ্ব মানচিত্র':'World Map'}
            </h1>
            <p class="text-sm mt-1" style="color:${d?'#9ca3af':'#6b7280'}">
                ${l==='bn'?'আহলে বাইত (আ.)-এর পবিত্র স্থানসমূহ — মানচিত্রে পিন ট্যাপ করে বিস্তারিত দেখুন':"The Ahl al-Bayt's (AS) holy sites — tap a pin on the map for details"}
            </p>
        </div>

        ${!leafletReady ? (leafletLoadState === 'error' ? `
        <div class="${d?'bg-gray-800 border-gray-700':'bg-amber-50 border-amber-200'} border rounded-2xl p-8 text-center reveal">
            <div style="font-size:2.5rem;margin-bottom:.5rem">📡</div>
            <p class="font-bold mb-1">${l==='bn'?'মানচিত্র লোড করা যায়নি':'Map could not be loaded'}</p>
            <p class="text-sm ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'এই ফিচারের জন্য ইন্টারনেট সংযোগ প্রয়োজন। সংযোগ পরীক্ষা করে পাতাটি রিলোড করুন।':'This feature needs an internet connection. Please check your connection and reload the page.'}</p>
        </div>` : `
        <div class="${d?'bg-gray-800 border-gray-700':'bg-amber-50 border-amber-200'} border rounded-2xl p-8 text-center reveal">
            <div style="font-size:2.5rem;margin-bottom:.5rem">🗺️</div>
            <p class="font-bold mb-1">${l==='bn'?'মানচিত্র লোড হচ্ছে...':'Loading map…'}</p>
            <p class="text-sm ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'একটু অপেক্ষা করুন।':'Just a moment.'}</p>
        </div>`) : `
        <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl overflow-hidden reveal" style="box-shadow:var(--shadow-md)">
            <div id="world-map-leaflet" style="height:min(65vh,520px);width:100%"></div>
        </div>`}

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 reveal">
            ${WORLD_MAP_SITES.map(site=>`
            <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-xl p-3 text-center">
                <div style="font-size:1.3rem">${site.icon}</div>
                <div class="text-xs font-semibold mt-1">${sanitize(l==='bn'?site.nameBn:site.nameEn)}</div>
            </div>`).join('')}
        </div>
    </div>`;
}
