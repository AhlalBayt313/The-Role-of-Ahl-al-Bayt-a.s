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
                    <p class="text-xs font-bold leading-snug" style="color:${c}">${l==='bn'?nm.meaning:nm.meaningEn}</p>
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

    if (leafletReady) requestAnimationFrame(initWorldMap);

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

        ${!leafletReady ? `
        <div class="${d?'bg-gray-800 border-gray-700':'bg-amber-50 border-amber-200'} border rounded-2xl p-8 text-center reveal">
            <div style="font-size:2.5rem;margin-bottom:.5rem">📡</div>
            <p class="font-bold mb-1">${l==='bn'?'মানচিত্র লোড করা যায়নি':'Map could not be loaded'}</p>
            <p class="text-sm ${d?'text-gray-400':'text-gray-600'}">${l==='bn'?'এই ফিচারের জন্য ইন্টারনেট সংযোগ প্রয়োজন। সংযোগ পরীক্ষা করে পাতাটি রিলোড করুন।':'This feature needs an internet connection. Please check your connection and reload the page.'}</p>
        </div>` : `
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
        {page:'knowledgeCenter', icon:'📚', label:l==='bn'?'জ্ঞান কেন্দ্র':'Knowledge'},
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
        dua:renderDuaPage,
        knowledgeCenter: typeof renderKnowledgeCenterPage === 'function' ? renderKnowledgeCenterPage : () => '<div class="text-center py-8">Loading...</div>',
        calendar:renderCalendarPage,
        contact:renderContactPage, about:renderAboutPage, bookmarks:renderBookmarksPage,
        readPost:renderReadPostPage, readDua:renderReadDuaPage,
        imams:renderImamsPage, imamDetail:renderImamDetailPage,
        tasbeeh:renderTasbeehPage, quiz:renderQuizPage,
        searchPage:renderSearchPage, analytics:renderAnalyticsPage,
        readZiyarat:renderReadZiyaratPage,
        asmaul:renderAsmaulHusnaPage, qibla:renderQiblaPage, worldMap:renderWorldMapPage,
        muharram:renderMuharramPage,
        'shia-days':renderShiaDaysPage,
        familyTree:renderFamilyTreePage,
        ahlulBaytUnified: typeof renderAhlulBaytUnifiedPage === 'function' ? renderAhlulBaytUnifiedPage : () => '<div class="text-center py-8">Loading...</div>',
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
        ${renderAdminLoginModal()}
        ${typeof renderBlogEditorModal === 'function' ? renderBlogEditorModal() : ''}
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
    // re-run setup after each render
    requestAnimationFrame(() => {
        setupHeaderScroll();
        setupScrollReveal();
        initReadingProgress(); // ✅ CORRECTED: প্রতি render()-এ document height recalibrate করা দরকার (পেজ পাল্টালে content height পাল্টায়); আগে এটা এখন-অপসারিত premiumAfterRender() দিয়ে হতো
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

    // ── 2. Service Worker (real static file — blob: URL registration is
    //      blocked by modern Chrome, which meant this silently never worked) ──
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js', {scope:'./'})
        .then(reg => {
            console.log('SW registered:', reg.scope);
            // Check for updates every 30 min
            setInterval(() => reg.update(), 30 * 60 * 1000);
        })
        .catch(e => console.log('SW reg failed:', e));

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
                {src:'./icon-192.png', sizes:'192x192', type:'image/png', purpose:'any'},
                {src:'./icon-512.png', sizes:'512x512', type:'image/png', purpose:'any'},
                {src:'./icon-512-maskable.png', sizes:'512x512', type:'image/png', purpose:'maskable'}
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
// PREMIUM JS — Ripple + Particles + Prayer Clock
// ============================================================================
// ✅ REMOVED (Production Audit #2): initScrollReveal() ও initHeaderScroll() —
// এই দুটো ছিল setupScrollReveal()/setupHeaderScroll()-এর হুবহু dead duplicate
// (কোথাও call হতো না, শুধু এখন-অপসারিত premiumAfterRender()-এর ভেতরে ছিল)।
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
// ✅ REMOVED (Production Audit #2): premiumAfterRender() — কখনো call হতো না;
// এর কাজ (startPrayerClock/startNextPrayerCountdown) এখন সরাসরি init()-এ হয়।

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
    startPrayerClock();          // ✅ FIXED: prayer-times পেজের next-prayer countdown আগে dead ছিল (Production Audit #1)
    startNextPrayerCountdown();  // ✅ FIXED: হোম ব্যানারের countdown আগে dead ছিল (Production Audit #1)
    setTimeout(hideSplash, 2600);
}

// ⚠️ MOVED 2026-07-17: imamFlip() ও imamCardParticles() এখন
// ahlul-bayt-unified.js ফাইলে আছে (👑 ইমাম ও মাসুমিন মার্জ)।

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

    // ── "আজ" marker: static events map to known Hijri Muharram days ──
    const staticEventDay = {s1:1, s2:3, s3:7, s4:9, s5:10, s6:11}; // s7 = Safar, not matched here
    const hNow = approxHijriNow();
    const isMuharramNow = hNow.month === 1;

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
                ${allTimeline.map((ev,i)=>{
                    const isToday = isMuharramNow && staticEventDay[ev.id]===hNow.day;
                    const isOpen = isToday || (state.expandedMuharramEvents||[]).includes(ev.id);
                    return `
                <div class="relative" style="padding-left:52px">
                    <div class="${isToday?'muharram-today-dot':''}" style="position:absolute;left:0;top:16px;width:36px;height:36px;border-radius:50%;background:${ev.color||'#6b7280'};display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;z-index:1">${ev.icon||'🕌'}</div>
                    ${i<allTimeline.length-1?`<div style="position:absolute;left:17px;top:54px;width:2px;height:calc(100% + 8px);background:${d?'#374151':'#e5e7eb'}"></div>`:''}
                    <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl p-4 ${ev.color==='#dc2626'?'border-red-400':''}" style="${ev.color==='#dc2626'?'box-shadow:0 4px 20px rgba(220,38,38,.12)':''}">
                        <div class="flex items-start justify-between gap-2">
                            <button type="button" data-action="toggleMuharramEvent" data-param="${ev.id}" aria-expanded="${isOpen?'true':'false'}"
                                class="flex-1 text-left focus:outline-none" style="cursor:pointer;background:none;border:none;padding:0">
                                <span class="text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-flex items-center gap-1.5" style="background:${ev.color||'#6b7280'}22;color:${ev.color||'#6b7280'}">
                                    ${ev.date||''}${isToday?`<span style="background:${ev.color||'#dc2626'};color:#fff;padding:1px 7px;border-radius:50px;font-size:10px">${l==='bn'?'আজ':'Today'}</span>`:''}
                                </span>
                                <div class="flex items-center justify-between gap-2">
                                    <h4 class="font-bold mb-0">${sanitize(ev.titleBn||'')}</h4>
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="flex-shrink:0;transition:transform .2s;transform:rotate(${isOpen?180:0}deg);color:${d?'#6b7280':'#9ca3af'}" aria-hidden="true"><path d="M5 7.5l5 5 5-5"/></svg>
                                </div>
                                ${isOpen?`<p class="text-sm ${d?'text-gray-300':'text-gray-700'} leading-relaxed mt-1 fade-in-fast">${sanitize(ev.descBn||'')}</p>`:''}
                            </button>
                            ${state.isAdmin && !isStatic(ev.id) ? `<div class="flex gap-1 flex-shrink-0">
                                <button data-action="openMuharramEditor" data-param="${ev.id}" class="text-xs px-2 py-1 rounded-lg font-semibold ${d?'bg-gray-700 text-gray-300':'bg-gray-100 text-gray-600'} hover:opacity-80">✏️</button>
                                <button data-action="deleteMuharramEvent" data-param="${ev.id}" class="text-xs px-2 py-1 rounded-lg font-semibold bg-red-100 text-red-600 hover:bg-red-200">🗑️</button>
                            </div>` : ''}
                        </div>
                    </div>
                </div>`;}).join('')}
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
// বিশেষ দিনসমূহ — static hijri-dated ঘটনাবলী (ঈদ/বিশেষ রাত/শাহাদাত)
// module-level করা হয়েছে যাতে renderShiaDaysPage() ও Today-in-History উভয়েই reuse করতে পারে
// ============================================================================
function getStaticSpecialDays(l) {
    return [
        // ── ঈদ ও আনন্দময় দিন (হিজরি মাস অনুযায়ী) ──

        // — মুহাররম —
        {id:'eid13',historyDay:1,historyMonth:1,  icon:'🎊', color:'#dc2626', type:'eid', hijriDate:l==='bn'?'১ মুহাররম':'1 Muharram', titleBn:l==='bn'?'ইসলামি নববর্ষ — হিজরি নববর্ষ':'Islamic New Year — Hijri New Year', arabicTitle:'رأس السنة الهجرية', descBn:l==='bn'?'মুহাররমের ১ তারিখ হিজরি ক্যালেন্ডারের নববর্ষ। ৬২২ খ্রিষ্টাব্দে রাসূলুল্লাহ (সা.)-এর মক্কা থেকে মদিনায় হিজরতের স্মৃতিতে এই ক্যালেন্ডার প্রবর্তিত হয়। নববর্ষে দোয়া ও ইবাদতের বিশেষ গুরুত্ব রয়েছে।':'1 Muharram is the new year of the Hijri calendar. This calendar was established in memory of the Prophet\'s (PBUH) migration from Mecca to Medina in 622 CE. Dua and worship carry special importance on the new year.', amaal:l==='bn'?'দোয়া, ইস্তিগফার, তওবা, নতুন বছরের সংকল্প, সালাওয়াত':'Dua, Istighfar, repentance, new year resolutions, Salawat', importance:l==='bn'?'হিজরি নববর্ষ — ইসলামের ঐতিহাসিক হিজরতের স্মৃতি':'Hijri New Year — memory of the historic migration of Islam'},
        {id:'ex3',historyDay:9,historyMonth:1,  icon:'🌑', color:'#1e3a8a', type:'eid', hijriDate:l==='bn'?'৯ মুহাররম':'9 Muharram', titleBn:l==='bn'?'তাসুআ — আশুরার আগের দিন':'Tasu\'a — Day Before Ashura', arabicTitle:'تاسوعاء', descBn:l==='bn'?'৯ মুহাররম তাসুআ নামে পরিচিত। ৬১ হিজরিতে এই দিনে ইমাম হোসাইন (আ.)-এর শিবিরে ইয়াযিদের বাহিনী চারদিক থেকে ঘিরে ফেলে। হযরত আব্বাস (আ.)-এর নামে উৎসর্গিত। এই দিনে মজলিস ও শোকসভা অনুষ্ঠিত হয়।':'9 Muharram is known as Tasu\'a. On this day in 61 AH, Yazid\'s forces surrounded Imam Husayn\'s camp on all sides. The day is dedicated to Hazrat Abbas (AS). Majlis and mourning gatherings are held on this day.', amaal:l==='bn'?'মজলিস, শোক পালন, যিয়ারত হযরত আব্বাস, আশুরার প্রস্তুতি':'Majlis, mourning, Ziyarat of Hazrat Abbas, preparation for Ashura', importance:l==='bn'?'আশুরার পূর্বদিন — আব্বাস ইবনে আলীর নামে উৎসর্গিত':'Day before Ashura — dedicated to Abbas ibn Ali'},

        // — রবিউল আউয়াল —
        {id:'eid9',historyDay:11,historyMonth:3,  icon:'🌿', color:'#065f46', type:'eid', hijriDate:l==='bn'?'১১ রবিউল আউয়াল':'11 Rabi al-Awwal', titleBn:l==='bn'?'ইমাম আলী রেযা (আ.) জন্মদিন':'Birthday of Imam Ali al-Ridha (AS)', arabicTitle:'مولد علي بن موسى الرضا', descBn:l==='bn'?'১১ রবিউল আউয়াল, ১৪৮ হিজরি — ইমাম রেযা (আ.) মদিনায় জন্মগ্রহণ করেন। অষ্টম ইমাম। মামুনের দরবারে ওলি আহদ (উত্তরাধিকারী) মনোনীত হয়েছিলেন। মাশহাদে তাঁর পবিত্র রওজা শরীফ।':'11 Rabi al-Awwal, 148 AH — Imam Ridha (AS) was born in Medina. The Eighth Imam. He was designated as Wali Ahd (Crown Prince) at Mamun\'s court. His holy shrine is in Mashhad.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম রেযা, দান':'Celebration, Salawat, Ziyarat of Imam Ridha, charity', importance:l==='bn'?'অষ্টম ইমামের জন্মদিন — আর-রেযা, আল্লাহর সন্তুষ্টিপ্রাপ্ত':'Birthday of the 8th Imam — al-Ridha, the Divinely Pleased'},
        {id:'eid8',historyDay:17,historyMonth:3,  icon:'☀️', color:'#b45309', type:'eid', hijriDate:l==='bn'?'১৭ রবিউল আউয়াল':'17 Rabi al-Awwal', titleBn:l==='bn'?'মিলাদুন্নবী (সা.) — রাসূলের জন্মদিন':'Mawlid al-Nabi — Birthday of the Prophet (SAW)', arabicTitle:'مولد النبي محمد صلى الله عليه وآله', descBn:l==='bn'?'১৭ রবিউল আউয়াল, ৫৭০ খ্রিষ্টাব্দ (শিয়া মত) — রাসূলুল্লাহ মুহাম্মদ (সা.) মক্কায় জন্মগ্রহণ করেন। তিনি সর্বকালের সর্বশ্রেষ্ঠ মানুষ এবং রহমতুল্লিল আলামিন — সমগ্র সৃষ্টির জন্য রহমত।':'17 Rabi al-Awwal, 570 CE (Shia view) — The Prophet Muhammad (SAW) was born in Mecca. He is the greatest human of all time and Rahmat al-lil Alamin — a mercy for all creation.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, মিলাদ মজলিস, দান, কুরআন তিলাওয়াত, সীরাত আলোচনা':'Celebration, Salawat, Mawlid gatherings, charity, Quran recitation, Seerah discussion', importance:l==='bn'?'সর্বশ্রেষ্ঠ নবীর জন্মদিন — ইমাম সাদিকেরও জন্মদিন (শিয়া মতে একই তারিখ)':'Birthday of the greatest Prophet — also birthday of Imam Sadiq (same date per Shia tradition)'},

        // — রবিউস সানি —
        {id:'eid20',historyDay:7,historyMonth:4,  icon:'🌟', color:'#065f46', type:'eid', hijriDate:l==='bn'?'৭ রবিউস সানি':'7 Rabi al-Thani', titleBn:l==='bn'?'ইমাম হাসান আসকারি (আ.) জন্মদিন (বিকল্প মত)':'Birthday of Imam Hasan al-Askari (AS) — Alt. Date', arabicTitle:'مولد الحسن العسكري', descBn:l==='bn'?'কিছু হাদিস গ্রন্থ অনুযায়ী ইমাম আসকারি (আ.)-এর জন্মদিন ৮ রবিউস সানি, আবার কিছুতে ৭ বা ১০ রবিউস সানি উল্লেখ আছে। একাদশ ইমামের জন্মদিনে সালাওয়াত ও ইবাদত করা হয়।':'According to some hadith collections, Imam Askari\'s birthday is 8 Rabi al-Thani; others mention 7 or 10. On the birthday of the Eleventh Imam, Salawat and worship are performed.', amaal:l==='bn'?'সালাওয়াত, যিয়ারত, ইবাদত, দান':'Salawat, Ziyarat, worship, charity', importance:l==='bn'?'একাদশ ইমামের জন্মদিন উদযাপন':'Celebration of the 11th Imam\'s birthday'},
        {id:'eid12',historyDay:8,historyMonth:4,  icon:'🌼', color:'#0e7490', type:'eid', hijriDate:l==='bn'?'৮ রবিউস সানি':'8 Rabi al-Thani', titleBn:l==='bn'?'ইমাম হাসান আসকারি (আ.) জন্মদিন':'Birthday of Imam Hasan al-Askari (AS)', arabicTitle:'مولد الحسن بن علي العسكري', descBn:l==='bn'?'৮ রবিউস সানি, ২৩২ হিজরি — ইমাম আসকারি (আ.) মদিনায় জন্মগ্রহণ করেন। একাদশ ইমাম। সামারায় আসকার মহল্লায় বসবাসের কারণে "আসকারি" উপাধি। দ্বাদশ ইমাম মাহদির পিতা।':'8 Rabi al-Thani, 232 AH — Imam Askari (AS) was born in Medina. The Eleventh Imam. The title "Askari" comes from living in the Askar district of Samarra. Father of the Twelfth Imam Mahdi.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম আসকারি, দান':'Celebration, Salawat, Ziyarat of Imam Askari, charity', importance:l==='bn'?'একাদশ ইমামের জন্মদিন — ইমাম মাহদির পিতা':'Birthday of the 11th Imam — father of Imam Mahdi'},

        // — জামাদিউস সানি —
        {id:'st5',historyDay:20,historyMonth:6,  icon:'🌹', color:'#be185d', type:'eid', hijriDate:l==='bn'?'২০ জামাদিউস সানি':'20 Jumada al-Thani', titleBn:l==='bn'?'হযরত ফাতেমা যাহরা (আ.) জন্মদিন':'Birthday of Lady Fatima al-Zahra (AS)', arabicTitle:'مولد فاطمة الزهراء', descBn:l==='bn'?'"ফাতেমা আমার হৃদয়ের একটুকরো" — রাসূলুল্লাহ (সা.)। ইসলামের শ্রেষ্ঠ নারী।':'"Fatima is a piece of my heart" — Prophet (PBUH). The greatest woman in Islam.', amaal:l==='bn'?'মহিলাদের সম্মান, দান, দোয়া':'Honouring women, charity, dua', importance:l==='bn'?'ইরানে মহিলা দিবস হিসেবে পালিত':'Celebrated as Women\'s Day in Iran'},

        // — রজব —
        {id:'eid11',historyDay:2,historyMonth:7,  icon:'🌱', color:'#059669', type:'eid', hijriDate:l==='bn'?'২ রজব':'2 Rajab', titleBn:l==='bn'?'ইমাম আলী হাদি (আ.) জন্মদিন':'Birthday of Imam Ali al-Hadi (AS)', arabicTitle:'مولد علي بن محمد الهادي', descBn:l==='bn'?'২ রজব, ২১২ হিজরি — ইমাম হাদি (আ.) মদিনার নিকটবর্তী সুরইয়ায় জন্মগ্রহণ করেন। দশম ইমাম। আন-নাকি ও আল-হাদি (পথপ্রদর্শক) নামে পরিচিত। সামারায় দীর্ঘ গৃহবন্দিত্বে থেকেও উম্মাহকে পথ দেখিয়েছেন।':'2 Rajab, 212 AH — Imam Hadi (AS) was born in Suraya near Medina. The Tenth Imam. Known as al-Naqi (the Pure) and al-Hadi (the Guide). He guided the Ummah even through long house arrest in Samarra.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম হাদি, দান':'Celebration, Salawat, Ziyarat of Imam Hadi, charity', importance:l==='bn'?'দশম ইমামের জন্মদিন — আন-নাকি, আল-হাদি':'Birthday of the 10th Imam — al-Naqi, al-Hadi'},
        {id:'eid19',historyDay:5,historyMonth:7,  icon:'👶', color:'#0369a1', type:'eid', hijriDate:l==='bn'?'৫ রজব':'5 Rajab', titleBn:l==='bn'?'ইমাম আলী নাকি (হাদি) (আ.) জন্মদিন':'Birthday of Imam Ali al-Naqi al-Hadi (AS)', arabicTitle:'مولد علي بن محمد الهادي النقي', descBn:l==='bn'?'৫ রজব, ২১২ হিজরি (কিছু মতে ২ রজব) — ইমাম হাদি (আ.) জন্মগ্রহণ করেন। মদিনার নিকট সুরইয়া গ্রামে জন্ম। শিশু বয়সে ইমামতের দায়িত্ব পান এবং সামারায় গৃহবন্দি অবস্থায় শিয়া মুসলমানদের নেতৃত্ব দেন।':'5 Rajab, 212 AH (some say 2 Rajab) — Imam Hadi (AS) was born in the village of Suraya near Medina. He assumed Imamate in childhood and led the Shia Muslims while under house arrest in Samarra.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম হাদি, দান':'Celebration, Salawat, Ziyarat of Imam Hadi, charity', importance:l==='bn'?'দশম ইমামের জন্মদিন — আল-হাদি, আন-নাকি':'Birthday of the 10th Imam — al-Hadi, al-Naqi'},
        {id:'eid10',historyDay:10,historyMonth:7,  icon:'💫', color:'#7c3aed', type:'eid', hijriDate:l==='bn'?'১০ রজব':'10 Rajab', titleBn:l==='bn'?'ইমাম মুহাম্মদ জওয়াদ (আ.) জন্মদিন':'Birthday of Imam Muhammad al-Jawad (AS)', arabicTitle:'مولد محمد بن علي الجواد', descBn:l==='bn'?'১০ রজব, ১৯৫ হিজরি — ইমাম জওয়াদ (আ.) মদিনায় জন্মগ্রহণ করেন। নবম ইমাম। মাত্র ৯ বছর বয়সে ইমামতের দায়িত্ব পান। আত-তাকি ও আল-জওয়াদ (দানশীল) নামে পরিচিত।':'10 Rajab, 195 AH — Imam Jawad (AS) was born in Medina. The Ninth Imam. He assumed Imamate at only 9 years of age. Known as al-Taqi (the Pious) and al-Jawad (the Generous).', amaal:l==='bn'?'আনন্দ, দান, যিয়ারত ইমাম জওয়াদ, সালাওয়াত':'Celebration, charity, Ziyarat of Imam Jawad, Salawat', importance:l==='bn'?'নবম ইমামের জন্মদিন — সর্বকনিষ্ঠ বয়সে ইমামতপ্রাপ্ত':'Birthday of the 9th Imam — youngest to assume Imamate'},
        {id:'st4',historyDay:13,historyMonth:7,  icon:'🦁', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৩ রজব':'13 Rajab', titleBn:l==='bn'?'ইমাম আলী (আ.) জন্মদিন':'Birthday of Imam Ali (AS)', arabicTitle:'مولد علي بن أبي طالب', descBn:l==='bn'?'১৩ রজব — কাবাঘরের ভেতরে ইমাম আলী (আ.)-এর জন্ম।':'13 Rajab — Imam Ali (AS) was born inside the Kaaba.', amaal:l==='bn'?'আনন্দ, দান-সদকা, নামাজ, যিয়ারত':'Celebration, charity, prayer, ziyarat', importance:l==='bn'?'একমাত্র ব্যক্তি যিনি কাবার ভেতরে জন্মগ্রহণ করেছেছেন':'The only person ever born inside the Kaaba'},
        {id:'eid15',historyDay:27,historyMonth:7,  icon:'✨', color:'#4f46e5', type:'eid', hijriDate:l==='bn'?'২৭ রজব':'27 Rajab', titleBn:l==='bn'?'ঈদে মাবআস — নবীর নবুওয়াত প্রাপ্তির দিন':'Eid al-Mab\'ath — Day of the Prophet\'s Mission', arabicTitle:'عيد المبعث النبوي', descBn:l==='bn'?'২৭ রজব, ৬১০ খ্রিষ্টাব্দ — হেরা গুহায় রাসূলুল্লাহ (সা.) প্রথম ওহি লাভ করেন। জিবরাইল (আ.) সূরা আলাকের প্রথম আয়াতগুলো নিয়ে আসেন। এই দিনটি শিয়া ইসলামে ঈদ হিসেবে পালিত হয়।':'27 Rajab, 610 CE — The Prophet (PBUH) received the first revelation in the Cave of Hira. Jibrail (AS) brought the first verses of Surah al-Alaq. This day is celebrated as an Eid in Shia Islam.', amaal:l==='bn'?'রোজা, গোসল, ১২ রাকাত নামাজ, দোয়ায়ে মাবআস, সালাওয়াত':'Fasting, Ghusl, 12 Rakat prayer, Dua al-Mab\'ath, Salawat', importance:l==='bn'?'নবুওয়াতের সূচনা — প্রথম ওহির দিন — শিয়া ইসলামের পাঁচ ঈদের একটি':'Beginning of Prophethood — day of first revelation — one of the five Eids of Shia Islam'},

        // — শাবান —
        {id:'st6',historyDay:3,historyMonth:8,  icon:'🌸', color:'#059669', type:'eid', hijriDate:l==='bn'?'৩ শাবান':'3 Shaban', titleBn:l==='bn'?'ইমাম হোসাইন (আ.) জন্মদিন':'Birthday of Imam Husayn (AS)', arabicTitle:'مولد الحسين بن علي', descBn:l==='bn'?'৩ শাবান, ৪ হিজরি — ইমাম হোসাইন (আ.) মদিনায় জন্মগ্রহণ করেন। রাসূলুল্লাহ (সা.) বলেছেন: "হোসাইন আমার থেকে, আমি হোসাইন থেকে।" কারবালার মহানায়ক, সাইয়্যিদুশ শুহাদা।':'3 Shaban, 4 AH — Imam Husayn (AS) was born in Medina. The Prophet (PBUH) said: "Husayn is from me, and I am from Husayn." The hero of Karbala, Master of Martyrs.', amaal:l==='bn'?'আনন্দ, দান, যিয়ারত ইমাম হোসাইন, সালাওয়াত':'Celebration, charity, Ziyarat of Imam Husayn, Salawat', importance:l==='bn'?'সাইয়্যিদুশ শুহাদার জন্মদিন — তৃতীয় ইমামের শুভাগমন':'Birthday of the Master of Martyrs — arrival of the 3rd Imam'},
        {id:'eid18',historyDay:4,historyMonth:8,  icon:'🌺', color:'#9d174d', type:'eid', hijriDate:l==='bn'?'৪ শাবান':'4 Shaban', titleBn:l==='bn'?'হযরত আলী আকবার (আ.) জন্মদিন':'Birthday of Hazrat Ali Akbar (AS)', arabicTitle:'مولد علي الأكبر بن الحسين', descBn:l==='bn'?'৪ শাবান — হযরত আলী আকবার (আ.) ইমাম হোসাইন (আ.)-এর পুত্র এবং কারবালার বীর শহীদ। তিনি রাসূলুল্লাহ (সা.)-এর চেহারা ও কণ্ঠস্বরে সবচেয়ে সদৃশ ছিলেন। ইরানে এই দিনটি "যুব দিবস" হিসেবে পালিত হয়।':'4 Shaban — Hazrat Ali Akbar (AS) was the son of Imam Husayn (AS) and a heroic martyr of Karbala. He most closely resembled the Prophet (PBUH) in face and voice. In Iran, this day is celebrated as Youth Day.', amaal:l==='bn'?'আনন্দ, তরুণদের সম্মান, দান, যিয়ারত, সালাওয়াত':'Celebration, honouring youth, charity, Ziyarat, Salawat', importance:l==='bn'?'হযরত আলী আকবারের জন্মদিন — ইরানে যুব দিবস':'Birthday of Hazrat Ali Akbar — Youth Day in Iran'},
        {id:'eid7',historyDay:5,historyMonth:8,  icon:'🌟', color:'#0369a1', type:'eid', hijriDate:l==='bn'?'৫ শাবান':'5 Shaban', titleBn:l==='bn'?'হযরত আব্বাস ইবনে আলী (আ.) জন্মদিন':'Birthday of Hazrat Abbas ibn Ali (AS)', arabicTitle:'مولد العباس بن علي', descBn:l==='bn'?'৫ শাবান, ২৬ হিজরি — হযরত আব্বাস (আ.) মদিনায় জন্মগ্রহণ করেন। কারবালার পতাকাবাহী, ইমাম হোসাইনের ভাই ও বিশ্বস্ত সেনাপতি। "বাবুল হাওয়াইজ" নামে পরিচিত — হাজতমন্দদের দরজা।':'5 Shaban, 26 AH — Hazrat Abbas (AS) was born in Medina. Standard-bearer of Karbala, brother and loyal commander of Imam Husayn. Known as "Bab al-Hawaij" — the Gate for those in need.', amaal:l==='bn'?'আনন্দ, যিয়ারত আবুল ফযল আব্বাস, দোয়া, দান':'Celebration, Ziyarat of Abu al-Fadl al-Abbas, dua, charity', importance:l==='bn'?'কারবালার পতাকাবাহী হযরত আব্বাসের জন্মদিন':'Birthday of the standard-bearer of Karbala, Hazrat Abbas'},
        {id:'ex4',historyDay:15,historyMonth:8,  icon:'🔮', color:'#4f46e5', type:'eid', hijriDate:l==='bn'?'২৬০ হি. (১৫ শাবান, ২৬০ হি.)':'260 AH (15 Shaban, 260 AH)', titleBn:l==='bn'?'গায়বতে সুগরা — ছোট অনুপস্থিতির সূচনা':'Start of Minor Occultation of Imam Mahdi', arabicTitle:'بداية الغيبة الصغرى', descBn:l==='bn'?'২৬০ হিজরিতে ইমাম হাসান আসকারি (আ.)-এর শাহাদাতের পর ইমাম মাহদি (আ.) গায়বতে চলে যান। প্রথমে গায়বতে সুগরা (ছোট অনুপস্থিতি, ৬৯ বছর) শুরু হয়, যেখানে চার জন নায়েবের মাধ্যমে যোগাযোগ রাখা হত।':'After the martyrdom of Imam Hasan al-Askari (AS) in 260 AH, Imam Mahdi (AS) went into occultation. The Minor Occultation (Ghayba al-Sughra, 69 years) began first, where contact was maintained through four deputies.', amaal:l==='bn'?'দোয়ায়ে আহদ, ইমামের জন্য দোয়া, তাড়াতাড়ি আসার প্রার্থনা':'Dua Ahd, dua for the Imam, prayers for his swift return', importance:l==='bn'?'ইমাম মাহদির গায়বতের সূচনা — উম্মাহর জন্য পরীক্ষার সময়':'Beginning of Imam Mahdi\'s occultation — a time of trial for the Ummah'},
        {id:'st3',historyDay:15,historyMonth:8,  icon:'🌙', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৫ শাবান':'15 Shaban', titleBn:l==='bn'?'নিমে শাবান — ইমাম মাহদি (আ.) জন্মদিন':'Mid-Shaban — Birthday of Imam Mahdi (AS)', arabicTitle:'نيمه شعبان', descBn:l==='bn'?'১৫ শাবান, ২৫৫ হিজরি — ইমাম মাহদি (আ.) সামারায় জন্মগ্রহণ করেন। দ্বাদশ ইমাম আল্লাহর নির্দেশে গায়বতে আছেন।':'15 Shaban, 255 AH — Imam Mahdi (AS) was born in Samarra. The Twelfth Imam is in occultation by divine command.', amaal:l==='bn'?'দোয়ায়ে নুদবা, দোয়ায়ে আহদ, সালাওয়াত, রোজা':'Dua Nudbah, Dua Ahd, Salawat, Fasting', importance:l==='bn'?'ইমামে যামানার জন্মদিন':'Birthday of the Imam of Our Time'},

        // — শাওয়াল —
        {id:'eid17',historyDay:1,historyMonth:10,  icon:'🌙', color:'#059669', type:'eid', hijriDate:l==='bn'?'১ শাওয়াল':'1 Shawwal', titleBn:l==='bn'?'ঈদুল ফিতর — রোজা শেষের ঈদ':'Eid al-Fitr — Festival of Breaking the Fast', arabicTitle:'عيد الفطر', descBn:l==='bn'?'১ শাওয়াল — রমজানের এক মাস রোজার পর এই ঈদ আসে। আল্লাহ তাঁর বান্দাদের সিয়াম পালনের পুরস্কার দেন এই দিনে। ফিতরানা আদায় ও নামাজ পড়া ওয়াজিব।':'1 Shawwal — This Eid comes after one month of fasting in Ramadan. Allah rewards His servants for their fasting on this day. Paying Fitrana and performing the prayer are obligatory.', amaal:l==='bn'?'ঈদের নামাজ, ফিতরানা আদায়, দান, পরিবারের সাথে আনন্দ, মুমিনদের অভিনন্দন':'Eid prayer, paying Fitrana, charity, celebration with family, congratulating believers', importance:l==='bn'?'রমজানের পুরস্কারের দিন — আল্লাহ সিয়াম পালনকারীদের ক্ষমা করেন':'Day of reward for Ramadan — Allah forgives those who fasted'},

        // — যিলকদ —
        {id:'eid14',historyDay:25,historyMonth:11,  icon:'🌙', color:'#0369a1', type:'eid', hijriDate:l==='bn'?'২৫ যিলকদ':'25 Dhu al-Qadah', titleBn:l==='bn'?'ঈদে দাহউল আরদ — পৃথিবী বিস্তারের দিন':'Eid Dahw al-Ard — Day of Earth\'s Spreading', arabicTitle:'عيد دحو الأرض', descBn:l==='bn'?'২৫ যিলকদ — হাদিস অনুযায়ী এই দিনে আল্লাহ পৃথিবীকে পানির নিচ থেকে বিস্তার করেছেন, কাবাকে পৃথিবীর কেন্দ্র বানিয়েছেন। এই দিনে রোজা রাখলে ৭০ বছরের রোজার সওয়াব পাওয়া যায় বলে হাদিসে এসেছে।':'25 Dhu al-Qadah — According to hadith, on this day Allah spread the earth from beneath the water and made the Kaaba the center of the earth. Hadith states that fasting on this day earns the reward of 70 years of fasting.', amaal:l==='bn'?'রোজা, গোসল, দোয়ায়ে দাহউল আরদ, ২ রাকাত বিশেষ নামাজ':'Fasting, Ghusl, Dua of Dahw al-Ard, 2 Rakat special prayer', importance:l==='bn'?'পৃথিবী সৃষ্টির বিশেষ দিন — ৭০ বছরের রোজার সওয়াবের দিন':'Special day of earth\'s creation — reward of 70 years of fasting'},

        // — জিলহজ —
        {id:'ex1',historyDay:9,historyMonth:12,  icon:'🏔️', color:'#b45309', type:'eid', hijriDate:l==='bn'?'৯ জিলহজ':'9 Dhu al-Hijjah', titleBn:l==='bn'?'ঈদে আরাফা — আরাফার দিন':'Day of Arafah', arabicTitle:'يوم عرفة', descBn:l==='bn'?'৯ জিলহজ হজের সবচেয়ে গুরুত্বপূর্ণ দিন। হাজীরা আরাফার ময়দানে অবস্থান করেন এবং দোয়া করেন। ইমাম হোসাইন (আ.)-এর বিখ্যাত দোয়ায়ে আরাফা এই দিনে পাঠ করা হয়। এই দিনে রোজা রাখলে দুই বছরের গোনাহ মাফ হয় বলে হাদিসে এসেছে।':'9 Dhul Hijjah is the most important day of Hajj. Pilgrims stand on the plain of Arafah and make dua. The famous Dua Arafah of Imam Husayn (AS) is recited on this day. Hadith states that fasting on this day expiates sins of two years.', amaal:l==='bn'?'দোয়ায়ে আরাফা (ইমাম হোসাইন), রোজা, ইস্তিগফার, সালাওয়াত':'Dua Arafah (Imam Husayn), Fasting, Istighfar, Salawat', importance:l==='bn'?'হজের সর্বোচ্চ দিন — দোয়া কবুল ও গোনাহ মাফের দিন':'The peak day of Hajj — day of accepted duas and forgiveness of sins'},
        {id:'eid16',historyDay:10,historyMonth:12,  icon:'🎉', color:'#be185d', type:'eid', hijriDate:l==='bn'?'১০ যিলহজ':'10 Dhul Hijjah', titleBn:l==='bn'?'ঈদুল আযহা — কুরবানির ঈদ':'Eid al-Adha — Festival of Sacrifice', arabicTitle:'عيد الأضحى', descBn:l==='bn'?'১০ যিলহজ — হযরত ইব্রাহিম (আ.)-এর পুত্র ইসমাইলকে কুরবানির স্মৃতিতে এই ঈদ পালিত হয়। হাজীরা মিনায় কুরবানি দেন। সারা বিশ্বের মুসলমানরা পশু কুরবানি দেন।':'10 Dhul Hijjah — This Eid commemorates the sacrifice of Prophet Ibrahim\'s (AS) son Ismail. Pilgrims offer sacrifice in Mina. Muslims around the world offer animal sacrifice.', amaal:l==='bn'?'নামাজ, কুরবানি, দান, পরিবারের সাথে আনন্দ':'Prayer, sacrifice, charity, celebration with family', importance:l==='bn'?'ইব্রাহিমের ত্যাগের স্মৃতি — হজের চূড়ান্ত দিন':'Memory of Ibrahim\'s sacrifice — culminating day of Hajj'},
        {id:'st1',historyDay:18,historyMonth:12,  icon:'👑', color:'#059669', type:'eid', hijriDate:l==='bn'?'১৮ জিলহজ':'18 Dhul Hijjah', titleBn:l==='bn'?'ঈদে গাদির খুম':'Eid al-Ghadeer Khumm', arabicTitle:'عيد الغدير', descBn:l==='bn'?'১০ম হিজরিতে বিদায় হজ থেকে ফেরার পথে গাদির খুমে রাসূলুল্লাহ (সা.) আল্লাহর নির্দেশে ইমাম আলী (আ.)-কে উম্মাহর নেতা ঘোষণা করেন।':'On returning from the Farewell Hajj in 10 AH, the Prophet (PBUH) declared Imam Ali (AS) as the leader of the Ummah at Ghadir Khumm by divine command.', amaal:l==='bn'?'রোজা, গোসল, নতুন পোশাক, মুমিনদের অভিনন্দন, দোয়ায়ে নুদবা পাঠ':'Fasting, Ghusl, new clothes, congratulating believers, reciting Dua Nudbah', importance:l==='bn'?'শিয়া ইসলামের সর্বোচ্চ উৎসব':'The greatest celebration of Shia Islam'},
        {id:'st2',historyDay:24,historyMonth:12,  icon:'✨', color:'#7c3aed', type:'eid', hijriDate:l==='bn'?'২৪ জিলহজ':'24 Dhul Hijjah', titleBn:l==='bn'?'ঈদে মুবাহিলা':'Eid al-Mubahala', arabicTitle:'عيد المباهلة', descBn:l==='bn'?'৯ম হিজরিতে নাজরানের খ্রিস্টানদের সাথে মুবাহিলায় রাসূলুল্লাহ (সা.) ইমাম আলী, ফাতেমা, হাসান ও হোসাইন (আ.)-কে নিলেন। খ্রিস্টানরা পিছিয়ে যায়।':'In 9 AH, for the Mubahala with the Christians of Najran, the Prophet brought Imam Ali, Fatima, Hasan, and Husayn (AS). The Christians withdrew.', amaal:l==='bn'?'রোজা, গোসল, ২ রাকাত নামাজ':'Fasting, Ghusl, 2 Rakat prayer', importance:l==='bn'?'আহলে বাইতের শ্রেষ্ঠত্বের কুরআনি প্রমাণ':'Quranic proof of the excellence of the Ahlul Bayt'},

        // — বিশেষ / নির্দিষ্ট তারিখ নেই —
        {id:'ex2',gregorianDay:21,gregorianMonth:3,  icon:'🌿', color:'#059669', type:'eid', hijriDate:l==='bn'?'১ ফারভারদিন (২১ মার্চ)':'1 Farvardin (21 March)', titleBn:l==='bn'?'ঈদে নওরোজ — পার্সি নববর্ষ':'Eid Nowruz — Persian New Year', arabicTitle:'عيد النوروز', descBn:l==='bn'?'ইমাম সাদিক (আ.) বলেছেন: নওরোজ সেই দিন যেদিন আল্লাহ তাঁর বান্দাদের কাছ থেকে অঙ্গীকার নিয়েছিলেন। এই দিনে ইমাম আলী (আ.) কুফায় পৌঁছেছিলেন এবং তাঁকে স্বাগত জানানো হয়েছিল। শিয়া হাদিসে এই দিনটির বিশেষ মর্যাদা রয়েছে।':'Imam Sadiq (AS) said: Nowruz is the day when Allah took the covenant from His servants. On this day Imam Ali (AS) arrived in Kufa and was welcomed. This day holds special significance in Shia hadith.', amaal:l==='bn'?'গোসল, নতুন পোশাক, মিষ্টি বিতরণ, দোয়া, পরিবারের সাথে আনন্দ, সালাওয়াত':'Ghusl, new clothes, distributing sweets, dua, celebration with family, Salawat', importance:l==='bn'?'ইমাম সাদিকের হাদিসে উল্লিখিত বিশেষ দিন — পার্সি সংস্কৃতির নববর্ষ':'A special day mentioned in Imam Sadiq\'s hadith — Persian cultural New Year'},

        // ── বিশেষ রাত (হিজরি মাস অনুযায়ী) ──

        // — রবিউল আউয়াল —
        {id:'sn6',historyDay:17,historyMonth:3,  icon:'🕌', color:'#065f46', type:'special', hijriDate:l==='bn'?'১৭ রবিউল আউয়াল':'17 Rabi al-Awwal', titleBn:l==='bn'?'শবে মওলুদুন্নবী — নবীর জন্মরাত':'Night of Mawlid al-Nabi — Eve of the Prophet\'s Birthday', arabicTitle:'ليلة مولد النبي محمد صلى الله عليه وآله', descBn:l==='bn'?'১৭ রবিউল আউয়ালের রাত — পরদিন রাসূলুল্লাহ (সা.) জন্মগ্রহণ করেন (শিয়া মত)। এই রাতে আরবের অগ্নিমন্দিরের আগুন নিভে যায়, কিসরার প্রাসাদে ফাটল দেখা দেয় এবং সামাওয়াহর হ্রদ শুকিয়ে যায় — মহানবীর আগমনের নিদর্শন।':'Night of 17 Rabi al-Awwal — the next day the Prophet (PBUH) was born (Shia view). On this night the fires of Persian fire temples went out, cracks appeared in the palace of Khusrow, and Lake Sawah dried up — signs of the great Prophet\'s arrival.', amaal:l==='bn'?'আনন্দ, মিলাদ মজলিস, সালাওয়াত, কুরআন তিলাওয়াত, দান, সীরাত আলোচনা':'Celebration, Mawlid gatherings, Salawat, Quran recitation, charity, Seerah discussion', importance:l==='bn'?'সর্বশ্রেষ্ঠ নবীর জন্মপূর্ব রাত — রহমতুল্লিল আলামিনের আগমনের রাত':'Eve of the greatest Prophet\'s birth — Night of the arrival of Mercy to the Worlds'},

        // — রজব —
        {id:'sn3',historyDay:1,historyMonth:7,  icon:'✨', color:'#059669', type:'special', hijriDate:l==='bn'?'১ রজব':'1 Rajab', titleBn:l==='bn'?'শবে রজব — রজবের প্রথম রাত':'Shab-e-Rajab — First Night of Rajab', arabicTitle:'ليلة أول رجب', descBn:l==='bn'?'রজব মাস আল্লাহর অন্যতম হারাম মাস। রজবের প্রথম রাত ইবাদতের জন্য বিশেষ মর্যাদাপূর্ণ। হাদিসে এসেছে এই রাতে দোয়া কবুল হয় এবং আল্লাহর রহমত বিশেষভাবে বর্ষিত হয়।':'Rajab is one of the sacred months of Allah. The first night of Rajab is especially significant for worship. Hadith states that duas are accepted on this night and Allah\'s mercy descends specially.', amaal:l==='bn'?'গোসল, নামাজ, দোয়ায়ে রজব, ইস্তিগফার, কুরআন তিলাওয়াত':'Ghusl, prayer, Dua of Rajab, Istighfar, Quran recitation', importance:l==='bn'?'রজবের প্রারম্ভের মর্যাদাপূর্ণ রাত — দোয়া কবুলের রাত':'The honoured opening night of Rajab — Night of accepted duas'},
        {id:'sn4',historyDay:13,historyMonth:7,  icon:'🌟', color:'#b45309', type:'special', hijriDate:l==='bn'?'১৩ রজব':'13 Rajab', titleBn:l==='bn'?'শবে মওলুদে আলী — ইমাম আলীর জন্মরাত':'Night of Ali\'s Birth — Eve of Imam Ali\'s Birthday', arabicTitle:'ليلة مولد علي بن أبي طالب', descBn:l==='bn'?'১৩ রজবের রাত — পরদিন কাবার ভেতরে ইমাম আলী (আ.)-এর জন্ম হয়। এই রাতটি শিয়া মুসলমানদের কাছে আনন্দ ও ইবাদতের রাত। ইমাম আলী একমাত্র ব্যক্তি যিনি কাবার ভেতরে জন্মগ্রহণ করেছেন।':'Night of 13 Rajab — the next day Imam Ali (AS) was born inside the Kaaba. This night is one of joy and worship for Shia Muslims. Imam Ali is the only person ever born inside the Kaaba.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, নামাজ, মজলিস, দান, যিয়ারত ইমাম আলী':'Celebration, Salawat, prayer, Majlis, charity, Ziyarat of Imam Ali', importance:l==='bn'?'আমিরুল মুমিনীনের জন্মপূর্ব রাত — কাবার আলোর রাত':'Eve of the Commander of the Faithful\'s birth — Night of light at the Kaaba'},
        {id:'sn2',historyDay:27,historyMonth:7,  icon:'🕯️', color:'#0369a1', type:'special', hijriDate:l==='bn'?'২৭ রজব':'27 Rajab', titleBn:l==='bn'?'শবে মেরাজ — মিরাজের রাত':'Shab-e-Meraj — Night of Ascension', arabicTitle:'ليلة المعراج', descBn:l==='bn'?'২৭ রজব — রাসূলুল্লাহ (সা.) এই রাতে মক্কা থেকে জেরুজালেম (মসজিদুল আকসা) এবং সেখান থেকে সপ্ত আসমান ও সিদরাতুল মুন্তাহা পর্যন্ত মেরাজ করেন। পাঁচ ওয়াক্ত নামাজ এই রাতে ফরজ হয়।':'27 Rajab — On this night the Prophet (PBUH) ascended from Mecca to Jerusalem (Masjid al-Aqsa), then through the seven heavens to Sidrat al-Muntaha. The five daily prayers were made obligatory on this night.', amaal:l==='bn'?'রাতভর ইবাদত, নফল নামাজ, কুরআন তিলাওয়াত, দরুদ পাঠ, দোয়া':'All-night worship, Nafl prayers, Quran recitation, Salawat, Dua', importance:l==='bn'?'নামাজ ফরজ হওয়ার রাত — নবীর মেরাজের রাত':'Night the prayer was made obligatory — Night of the Prophet\'s Ascension'},

        // — শাবান —
        {id:'sn5',historyDay:3,historyMonth:8,  icon:'🌺', color:'#be185d', type:'special', hijriDate:l==='bn'?'৩ শাবান':'3 Shaban', titleBn:l==='bn'?'শবে মওলুদে হোসাইন — ইমাম হোসাইনের জন্মরাত':'Night of Husayn\'s Birth — Eve of Imam Husayn\'s Birthday', arabicTitle:'ليلة مولد الحسين بن علي', descBn:l==='bn'?'৩ শাবানের রাত — পরদিন ইমাম হোসাইন (আ.) জন্মগ্রহণ করেন। রাসূলুল্লাহ (সা.) বলেছেন: "হোসাইন আমার থেকে, আমি হোসাইন থেকে।" কারবালার মহানায়কের জন্মের পূর্ব রাত।':'Night of 3 Shaban — the next day Imam Husayn (AS) was born. The Prophet (PBUH) said: "Husayn is from me, and I am from Husayn." The eve before the birth of the hero of Karbala.', amaal:l==='bn'?'আনন্দ, সালাওয়াত, যিয়ারত ইমাম হোসাইন, নামাজ, দান':'Celebration, Salawat, Ziyarat of Imam Husayn, prayer, charity', importance:l==='bn'?'সাইয়্যিদুশ শুহাদার জন্মপূর্ব রাত':'Eve of the birth of the Master of Martyrs'},
        {id:'sn1',historyDay:15,historyMonth:8,  icon:'🌙', color:'#7c3aed', type:'special', hijriDate:l==='bn'?'১৫ শাবান':'15 Shaban', titleBn:l==='bn'?'শবে নিমে শাবান (শবে বরাত)':'Shab-e-Nim-e-Shaban (Night of Mid-Shaban)', arabicTitle:'ليلة النصف من شعبان', descBn:l==='bn'?'১৫ শাবানের রাত শিয়া ইসলামে অত্যন্ত মর্যাদাপূর্ণ। এই রাতে ইমাম মাহদি (আ.) জন্মগ্রহণ করেন এবং হাদিস অনুযায়ী এটি বরাত ও মাগফিরাতের রাত। আল্লাহ এই রাতে বান্দাদের রিযিক ও তাকদির নির্ধারণ করেন।':'The night of 15 Shaban is highly significant in Shia Islam. Imam Mahdi (AS) was born on this night and according to hadith it is the night of fate and forgiveness. Allah determines the provisions and destiny of His servants on this night.', amaal:l==='bn'?'দোয়ায়ে কুমাইল, দোয়ায়ে নুদবা, দোয়ায়ে আহদ, সালাওয়াত, নফল নামাজ, ইস্তিগফার':'Dua Kumayl, Dua Nudbah, Dua Ahd, Salawat, Nafl prayer, Istighfar', importance:l==='bn'?'ইমাম মাহদির জন্মরাত — বরাত ও মাগফিরাতের রাত':'Night of Imam Mahdi\'s birth — Night of Fate and Forgiveness'},

        // — রমজান —
        {id:'sn7',historyDay:1,historyMonth:9,  icon:'💫', color:'#1e3a8a', type:'special', hijriDate:l==='bn'?'১ রমজান':'1 Ramadan', titleBn:l==='bn'?'শবে রমজান — রমজানের প্রথম রাত':'First Night of Ramadan', arabicTitle:'ليلة أول رمضان', descBn:l==='bn'?'রমজান মাসের প্রথম রাত ইবাদতের মাসের সূচনা। এই রাতে জান্নাতের দরজা খোলা হয়, জাহান্নামের দরজা বন্ধ করা হয় এবং শয়তানকে শৃঙ্খলিত করা হয়। হাদিসে এই রাতে বিশেষ দোয়া পাঠের নির্দেশনা আছে।':'The first night of Ramadan marks the beginning of the month of worship. On this night the gates of Paradise are opened, the gates of Hell are closed and Satan is chained. Hadith gives guidance on special duas to recite on this night.', amaal:l==='bn'?'দোয়ায়ে রমজান, নিয়্যত, তারাবিহ/তাহাজ্জুদ, কুরআন তিলাওয়াত শুরু, ইফতারির প্রস্তুতি':'Dua of Ramadan, Intention, Tarawih/Tahajjud, beginning Quran recitation, preparing for Iftar', importance:l==='bn'?'ইবাদতের মাসের সূচনা — জান্নাতের দরজা উন্মুক্তের রাত':'Beginning of the month of worship — Night the gates of Paradise open'},
        {id:'st7',historyDay:[19,21,23],historyMonth:9,  icon:'⭐', color:'#b45309', type:'special', hijriDate:l==='bn'?'১৯, ২১, ২৩ রমজান':'19, 21, 23 Ramadan', titleBn:l==='bn'?'লাইলাতুল ক্বদর (তিন রাত)':'Laylat al-Qadr (Three Nights)', arabicTitle:'ليلة القدر', descBn:l==='bn'?'১৯ রমজান — ইমাম আলী (আ.) আঘাতপ্রাপ্ত। ২১ রমজান — ইমাম আলী শহীদ। ২৩ রমজান — সর্বোচ্চ সম্ভাব্য ক্বদরের রাত।':'19 Ramadan — Imam Ali (AS) is struck. 21 Ramadan — Imam Ali is martyred. 23 Ramadan — the most probable Night of Qadr.', amaal:l==='bn'?'রাতভর ইবাদত, কুরআন মাথায় রাখা, দোয়ায়ে জওশানে কাবির':'All-night worship, placing the Quran on the head, Dua Jawshan al-Kabir', importance:l==='bn'?'হাজার মাসের চেয়ে উত্তম':'Better than a thousand months'},
        {id:'sn8',historyDay:23,historyMonth:9,  icon:'🎇', color:'#dc2626', type:'special', hijriDate:l==='bn'?'২৩ রমজান':'23 Ramadan', titleBn:l==='bn'?'শবে ক্বদর — ২৩ রমজান (সর্বোচ্চ সম্ভাব্য)':'Laylat al-Qadr — 23rd Ramadan (Most Probable)', arabicTitle:'ليلة القدر ٢٣ رمضان', descBn:l==='bn'?'শিয়া হাদিসে ২৩ রমজানকে সবচেয়ে সম্ভাব্য লাইলাতুল ক্বদর বলা হয়েছে। এই রাতে কুরআন নাযিল হয়েছে এবং সকল বিষয়ের ফায়সালা হয়। ফেরেশতারা ও রূহ এই রাতে নাযিল হন।':'Shia hadith designates 23 Ramadan as the most probable Laylat al-Qadr. On this night the Quran was revealed and all matters are decided. The angels and the Spirit descend on this night.', amaal:l==='bn'?'রাতভর ইবাদত, কুরআন মাথায় রেখে দোয়া, দোয়ায়ে জওশানে কাবির, ইস্তিগফার, গোসল':'All-night worship, dua with Quran on head, Dua Jawshan al-Kabir, Istighfar, Ghusl', importance:l==='bn'?'হাজার মাসের চেয়ে উত্তম — তাকদির নির্ধারণের রাত':'Better than a thousand months — Night of destiny'},

        // — জিলহজ —
        {id:'sn9',historyDay:9,historyMonth:12,  icon:'🌙', color:'#065f46', type:'special', hijriDate:l==='bn'?'৯ জিলহজ (আরাফার রাত)':'9 Dhu al-Hijjah (Eve of Arafah)', titleBn:l==='bn'?'শবে আরাফা — আরাফার রাত':'Shab-e-Arafah — Night of Arafah', arabicTitle:'ليلة عرفة', descBn:l==='bn'?'আরাফার দিনের পূর্বরাত। হাজীরা মিনায় রাত কাটান এবং ফজরের পর আরাফার ময়দানে যান। এই রাতে ইবাদত ও দোয়ার বিশেষ ফজিলত রয়েছে। ইমাম হোসাইন (আ.) আরাফার দিনের বিখ্যাত দোয়া এই রাতেই রচনা করেছিলেন বলে কথিত।':'The eve before the Day of Arafah. Pilgrims spend the night in Mina and proceed to the plain of Arafah after Fajr. This night holds special merit for worship and dua. Imam Husayn\'s famous Dua of Arafah is associated with this time.', amaal:l==='bn'?'দোয়ায়ে আরাফা (ইমাম হোসাইন), ইস্তিগফার, নফল নামাজ, কুরআন তিলাওয়াত':'Dua Arafah (Imam Husayn), Istighfar, Nafl prayer, Quran recitation', importance:l==='bn'?'হজের সবচেয়ে গুরুত্বপূর্ণ দিনের পূর্বরাত — দোয়া কবুলের শ্রেষ্ঠ সময়':'Eve of the most important day of Hajj — best time for accepted duas'},

        // — বিশেষ / নির্দিষ্ট তারিখ নেই —
        {id:'sn10', icon:'⭐', color:'#1e3a8a', type:'special', hijriDate:l==='bn'?'প্রতি বৃহস্পতিবার রাত (শুক্রবার রাত)':'Every Thursday Night (Laylat al-Jumuah)', titleBn:l==='bn'?'শবে জুমা — জুমার রাত':'Shab-e-Jumah — Night of Friday', arabicTitle:'ليلة الجمعة', descBn:l==='bn'?'প্রতি সপ্তাহে বৃহস্পতিবার রাত (শবে জুমা) শিয়া ইসলামে বিশেষ ইবাদতের রাত। এই রাতে দোয়ায়ে কুমাইল পাঠ করা অত্যন্ত ফজিলতপূর্ণ। ইমাম আলী (আ.) হযরত কুমাইল ইবনে যিয়াদকে এই রাতে এই দোয়া শিখিয়েছিলেন।':'Every Thursday night (Shab-e-Jumah) is a special night of worship in Shia Islam. Reciting Dua Kumayl on this night carries immense merit. Imam Ali (AS) taught this dua to Kumayl ibn Ziyad on such a night.', amaal:l==='bn'?'দোয়ায়ে কুমাইল (সবচেয়ে গুরুত্বপূর্ণ), দোয়ায়ে নুদবা (শুক্রবার সকাল), যিয়ারত ইমাম, সালাওয়াত':'Dua Kumayl (most important), Dua Nudbah (Friday morning), Ziyarat of Imam, Salawat', importance:l==='bn'?'সাপ্তাহিক বিশেষ রাত — দোয়ায়ে কুমাইলের রাত':'Weekly special night — Night of Dua Kumayl'},

        // ── শাহাদাত দিবস (হিজরি মাস অনুযায়ী) ──

        // — মুহাররম —
        {id:'sm3', icon:'🕊️', color:'#0369a1', type:'martyrdom', hijriDate:l==='bn'?'১ মুহাররম বা সফর, ১২২ হি.':'Muharram or Safar, 122 AH', titleBn:l==='bn'?'হযরত যায়দ ইবনে আলী শাহাদাত':'Martyrdom of Zayd ibn Ali', arabicTitle:'شهادة زيد بن علي', descBn:l==='bn'?'১২২ হিজরিতে যায়দ ইবনে আলী হিশাম বিন আব্দুল মালিকের বিরুদ্ধে কুফায় বিদ্রোহ করেন এবং শহীদ হন। ইমাম সাজ্জাদ (আ.)-এর পুত্র। তাঁর নামে যায়দি মাযহাব প্রতিষ্ঠিত হয়।':'In 122 AH, Zayd ibn Ali revolted in Kufa against Hisham ibn Abd al-Malik and was martyred. Son of Imam Sajjad (AS). The Zaydi school of thought is named after him.', amaal:l==='bn'?'শোক পালন, স্মরণ':'Mourning, remembrance', importance:l==='bn'?'ইমাম সাজ্জাদের পুত্রের শাহাদাত — যুলুমের বিরুদ্ধে সংগ্রাম':'Martyrdom of Imam Sajjad\'s son — struggle against oppression'},
        {id:'st10',historyDay:10,historyMonth:1, icon:'🔴', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'১০ মুহাররম':'10 Muharram', titleBn:l==='bn'?'আশুরা — ইমাম হোসাইন (আ.) শাহাদাত':'Ashura — Martyrdom of Imam Husayn (AS)', arabicTitle:'عاشوراء', descBn:l==='bn'?'৬১ হিজরিতে কারবালায় ইমাম হোসাইন (আ.) পরিবার ও ৭২ সঙ্গীসহ শহীদ হন।':'In 61 AH at Karbala, Imam Husayn (AS) was martyred along with his family and 72 companions.', amaal:l==='bn'?'মজলিস, যিয়ারত আশুরা, শোক পালন':'Majlis, Ziyarat Ashura, mourning', importance:l==='bn'?'ইতিহাসের সর্বশ্রেষ্ঠ শাহাদাত':'The greatest martyrdom in history'},
        {id:'st13',historyDay:25,historyMonth:1, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৫ মুহাররম, ৯৫ হি.':'25 Muharram, 95 AH', titleBn:l==='bn'?'ইমাম সাজ্জাদ (আ.) শাহাদাত দিবস':'Martyrdom of Imam Sajjad (AS)', arabicTitle:'شهادة علي بن الحسين زين العابدين', descBn:l==='bn'?'৯৫ হিজরিতে ওয়ালিদ বিন আব্দুল মালিকের নির্দেশে বিষ প্রয়োগে শহীদ হন। কারবালার একমাত্র পুরুষ বেঁচে যাওয়া ইমাম। সাহিফায়ে সাজ্জাদিয়্যার রচয়িতা।':'In 95 AH, martyred by poison on the orders of Walid ibn Abd al-Malik. The only male survivor of Karbala. Author of Sahifa al-Sajjadiyya.', amaal:l==='bn'?'শোক পালন, সাহিফায়ে সাজ্জাদিয়্যা পাঠ':'Mourning, reciting Sahifa al-Sajjadiyya', importance:l==='bn'?'চতুর্থ ইমামের শাহাদাত — ইসলামে দোয়ার মহান শিক্ষক':'Martyrdom of the 4th Imam — the great teacher of dua in Islam'},

        // — সফর —
        {id:'st17',historyDay:17,historyMonth:2, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'১৭ সফর, ২০৩ হি.':'17 Safar, 203 AH', titleBn:l==='bn'?'ইমাম আলী রেযা (আ.) শাহাদাত দিবস':'Martyrdom of Imam Ali al-Ridha (AS)', arabicTitle:'شهادة علي بن موسى الرضا', descBn:l==='bn'?'২০৩ হিজরিতে মামুনুর রশিদের নির্দেশে আঙুরে বিষ প্রয়োগে শহীদ হন। ইরানের মাশহাদে তাঁর পবিত্র মাযার অবস্থিত।':'In 203 AH, martyred by poison in grapes on the orders of Mamun al-Rashid. His holy shrine is located in Mashhad, Iran.', amaal:l==='bn'?'শোক পালন, মাশহাদ যিয়ারত, যিয়ারতুর রেযা':'Mourning, Ziyarat in Mashhad, Ziyarat al-Ridha', importance:l==='bn'?'অষ্টম ইমামের শাহাদাত — আর-রেযা, পরিতুষ্ট':'Martyrdom of the 8th Imam — al-Ridha, the Contented'},
        {id:'st11',historyDay:28,historyMonth:2, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৮ সফর, ১১ হি.':'28 Safar, 11 AH', titleBn:l==='bn'?'রাসূলুল্লাহ (সা.) শাহাদাত দিবস':'Martyrdom of Prophet Muhammad (SAW)', arabicTitle:'وفاة النبي محمد صلى الله عليه وآله', descBn:l==='bn'?'২৮ সফর ১১ হিজরিতে রাসূলুল্লাহ (সা.) মদিনায় শহীদ হন। বিষ প্রয়োগে শাহাদাত বরণ করেন বলে শিয়া মতে বিশ্বাস করা হয়। তাঁর ওফাতের পর আহলে বাইতের উপর জুলুম শুরু হয়।':'On 28 Safar 11 AH, the Prophet Muhammad (SAW) was martyred in Medina. Shia scholars hold that he was poisoned. After his passing, oppression against the Ahlul Bayt began.', amaal:l==='bn'?'শোক পালন, দরুদ পাঠ, যিয়ারতুন নবী':'Mourning, reciting Salawat, Ziyarat al-Nabi', importance:l==='bn'?'সর্বকালের সর্বশ্রেষ্ঠ নবীর বিদায়':'The passing of the greatest Prophet of all time'},
        {id:'st12',historyDay:28,historyMonth:2, icon:'🕊️', color:'#9d174d', type:'martyrdom', hijriDate:l==='bn'?'২৮ সফর, ৫০ হি.':'28 Safar, 50 AH', titleBn:l==='bn'?'ইমাম হাসান (আ.) শাহাদাত দিবস':'Martyrdom of Imam Hasan (AS)', arabicTitle:'شهادة الحسن بن علي', descBn:l==='bn'?'৫০ হিজরিতে ইমাম হাসান (আ.) মুয়াবিয়ার ষড়যন্ত্রে তাঁর স্ত্রী জুয়ায়রিয়ার দেওয়া বিষে শহীদ হন। মদিনায় তাঁকে জান্নাতুল বাকিতে দাফন করা হয়।':'In 50 AH, Imam Hasan (AS) was martyred by poison given by his wife Juayriyah at the instigation of Muawiyah. He was buried in Jannat al-Baqi in Medina.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম হাসান, দোয়া':'Mourning, Ziyarat of Imam Hasan, dua', importance:l==='bn'?'দ্বিতীয় ইমামের শাহাদাত — সন্ধি ও ত্যাগের প্রতীক':'Martyrdom of the 2nd Imam — symbol of patience and sacrifice'},

        // — রবিউল আউয়াল —
        {id:'st20',historyDay:8,historyMonth:3, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৮ রবিউল আউয়াল, ২৬০ হি.':'8 Rabi al-Awwal, 260 AH', titleBn:l==='bn'?'ইমাম হাসান আসকারি (আ.) শাহাদাত দিবস':'Martyrdom of Imam Hasan al-Askari (AS)', arabicTitle:'شهادة الحسن بن علي العسكري', descBn:l==='bn'?'২৬০ হিজরিতে মুতামিদের নির্দেশে বিষ প্রয়োগে শহীদ হন। মাত্র ২৮ বছর বয়সে শহীদ হন। ইমাম মাহদি (আ.)-এর পিতা।':'In 260 AH, martyred by poison on the orders of al-Mutamid. Martyred at only 28 years of age. He is the father of Imam Mahdi (AS).', amaal:l==='bn'?'শোক পালন, সামারা যিয়ারত, যিয়ারত ইমাম আসকারি':'Mourning, Ziyarat in Samarra, Ziyarat of Imam Askari', importance:l==='bn'?'একাদশ ইমামের শাহাদাত — ইমাম মাহদির পিতা':'Martyrdom of the 11th Imam — father of Imam Mahdi'},

        // — জামাদিউস সানি —
        {id:'st9',historyDay:3,historyMonth:6,  icon:'🌹', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৩ জামাদিউস সানি':'3 Jumada al-Thani', titleBn:l==='bn'?'হযরত ফাতেমা যাহরা (আ.) শাহাদাত':'Martyrdom of Lady Fatima al-Zahra (AS)', arabicTitle:'شهادة فاطمة الزهراء', descBn:l==='bn'?'রাসূলুল্লাহ (সা.)-এর ওফাতের মাত্র ৭৫-৯৫ দিন পর শহীদ হন।':'She was martyred only 75–95 days after the passing of the Prophet (PBUH).', amaal:l==='bn'?'শোক পালন, ফাতেমার যিয়ারত':'Mourning, reciting Fatima\'s Ziyarat', importance:l==='bn'?'ইসলামের শ্রেষ্ঠ নারীর শাহাদাত':'Martyrdom of the greatest woman in Islam'},

        // — রজব —
        {id:'st19',historyDay:3,historyMonth:7, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৩ রজব, ২৫৪ হি.':'3 Rajab, 254 AH', titleBn:l==='bn'?'ইমাম আলী হাদি (আ.) শাহাদাত দিবস':'Martyrdom of Imam Ali al-Hadi (AS)', arabicTitle:'شهادة علي بن محمد الهادي', descBn:l==='bn'?'২৫৪ হিজরিতে মুতাযের নির্দেশে বিষ প্রয়োগে শহীদ হন। দীর্ঘ গৃহবন্দিত্বেও সামারা থেকে উম্মাহকে পথ দেখিয়েছেন।':'In 254 AH, martyred by poison on the orders of al-Mutazz. He guided the Ummah even through long house arrest in Samarra.', amaal:l==='bn'?'শোক পালন, সামারা যিয়ারত, যিয়ারত ইমাম হাদি':'Mourning, Ziyarat in Samarra, Ziyarat of Imam Hadi', importance:l==='bn'?'দশম ইমামের শাহাদাত — আন-নাকি, পবিত্র':'Martyrdom of the 10th Imam — al-Naqi, the Pure'},
        {id:'st16',historyDay:25,historyMonth:7, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৫ রজব, ১৮৩ হি.':'25 Rajab, 183 AH', titleBn:l==='bn'?'ইমাম মুসা কাযিম (আ.) শাহাদাত দিবস':'Martyrdom of Imam Musa al-Kazim (AS)', arabicTitle:'شهادة موسى بن جعفر الكاظم', descBn:l==='bn'?'১৮৩ হিজরিতে হারুনুর রশিদের নির্দেশে বাগদাদের কারাগারে বিষ প্রয়োগে শহীদ হন। দীর্ঘ কারাবাসেও ইবাদতে মগ্ন থাকতেন।':'In 183 AH, martyred by poison in a Baghdad prison on the orders of Harun al-Rashid. He remained devoted to worship even through long imprisonment.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম কাযিম, কাযিমাইনে যিয়ারত':'Mourning, Ziyarat of Imam Kazim, visiting Kazimayn', importance:l==='bn'?'সপ্তম ইমামের শাহাদাত — আল-কাযিম, রাগ সংবরণকারী':'Martyrdom of the 7th Imam — al-Kazim, the Restrainer of Anger'},

        // — রমজান —
        {id:'st8',historyDay:21,historyMonth:9,  icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২১ রমজান':'21 Ramadan', titleBn:l==='bn'?'ইমাম আলী (আ.) শাহাদাত':'Martyrdom of Imam Ali (AS)', arabicTitle:'شهادة علي بن أبي طالب', descBn:l==='bn'?'২১ রমজান — ইমাম আলী (আ.) শহীদ হন।':'21 Ramadan — Imam Ali (AS) is martyred.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম আলী, দোয়ায়ে কুমাইল':'Mourning, Ziyarat of Imam Ali, Dua Kumayl', importance:l==='bn'?'প্রথম ইমামের শাহাদাত ও ক্বদরের রাত':'Martyrdom of the First Imam and the Night of Qadr'},

        // — শাওয়াল —
        {id:'st15',historyDay:25,historyMonth:10, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৫ শাওয়াল, ১৪৮ হি.':'25 Shawwal, 148 AH', titleBn:l==='bn'?'ইমাম সাদিক (আ.) শাহাদাত দিবস':'Martyrdom of Imam Jafar al-Sadiq (AS)', arabicTitle:'شهادة جعفر بن محمد الصادق', descBn:l==='bn'?'১৪৮ হিজরিতে মনসুর দাওয়ানিকির নির্দেশে বিষ প্রয়োগে শহীদ হন। জাফরি মাযহাবের প্রতিষ্ঠাতা। তাঁর হাজারো ছাত্র ছিলেন।':'In 148 AH, martyred by poison on the orders of Mansur al-Dawaniqi. Founder of the Jafari school. He had thousands of students.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম সাদিক':'Mourning, Ziyarat of Imam Sadiq', importance:l==='bn'?'ষষ্ঠ ইমামের শাহাদাত — জাফরি মাযহাবের ইমাম':'Martyrdom of the 6th Imam — Founder of Jafari school'},

        // — যিলকদ —
        {id:'st18',historyDay:23,historyMonth:11, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'২৩ যিলকদ, ২২০ হি.':'23 Dhu al-Qadah, 220 AH', titleBn:l==='bn'?'ইমাম মুহাম্মদ জওয়াদ (আ.) শাহাদাত দিবস':'Martyrdom of Imam Muhammad al-Jawad (AS)', arabicTitle:'شهادة محمد بن علي الجواد', descBn:l==='bn'?'২২০ হিজরিতে মুতাসিমের নির্দেশে তাঁর স্ত্রী উম্মুল ফযলের দেওয়া বিষে শহীদ হন। মাত্র ৯ বছর বয়সে ইমামতের দায়িত্ব পেয়েছিলেন।':'In 220 AH, martyred by poison given by his wife Umm al-Fadl on the orders of al-Mutasim. He assumed Imamate at just 9 years of age.', amaal:l==='bn'?'শোক পালন, যিয়ারত ইমাম জওয়াদ, কাযিমাইনে যিয়ারত':'Mourning, Ziyarat of Imam Jawad, visiting Kazimayn', importance:l==='bn'?'নবম ইমামের শাহাদাত — আত-তাকি, পরহেজগার':'Martyrdom of the 9th Imam — al-Taqi, the Pious'},

        // — জিলহজ —
        {id:'st14',historyDay:7,historyMonth:12, icon:'🕊️', color:'#dc2626', type:'martyrdom', hijriDate:l==='bn'?'৭ যিলহজ্ব, ১১৪ হি.':'7 Dhu al-Hijjah, 114 AH', titleBn:l==='bn'?'ইমাম বাকির (আ.) শাহাদাত দিবস':'Martyrdom of Imam Muhammad al-Baqir (AS)', arabicTitle:'شهادة محمد بن علي الباقر', descBn:l==='bn'?'১১৪ হিজরিতে হিশাম বিন আব্দুল মালিকের নির্দেশে বিষ প্রয়োগে শহীদ হন। ইমাম বাকির ইসলামি জ্ঞান ও ফিকহে যুগান্তকারী অবদান রাখেন।':'In 114 AH, martyred by poison on the orders of Hisham ibn Abd al-Malik. Imam Baqir made epoch-making contributions to Islamic knowledge and jurisprudence.', amaal:l==='bn'?'শোক পালন, ইলম অর্জন, যিয়ারত ইমাম বাকির':'Mourning, seeking knowledge, Ziyarat of Imam Baqir', importance:l==='bn'?'পঞ্চম ইমামের শাহাদাত — বাকিরুল উলুম':'Martyrdom of the 5th Imam — Splitter of Knowledge'},
        {id:'sm1',historyDay:9,historyMonth:12,  icon:'🕊️', color:'#7c3aed', type:'martyrdom', hijriDate:l==='bn'?'৯ জিলহজ, ৬০ হি.':'9 Dhu al-Hijjah, 60 AH', titleBn:l==='bn'?'হযরত মুসলিম ইবনে আকিল শাহাদাত':'Martyrdom of Muslim ibn Aqil (AS)', arabicTitle:'شهادة مسلم بن عقيل', descBn:l==='bn'?'৬০ হিজরিতে ইমাম হোসাইনের দূত মুসলিম ইবনে আকিল কুফায় ইবনে যিয়াদের নির্দেশে শহীদ হন। তিনি ইমামের পক্ষে বাইয়াত নেওয়ার জন্য কুফায় গিয়েছিলেন। তাঁর সাথে হানি ইবনে উরওয়াও শহীদ হন।':'In 60 AH, Muslim ibn Aqil, the envoy of Imam Husayn, was martyred in Kufa on the orders of Ibn Ziyad. He had gone to Kufa to take pledges of allegiance on behalf of the Imam. Hani ibn Urwa was also martyred alongside him.', amaal:l==='bn'?'শোক পালন, মুসলিম ইবনে আকিলের যিয়ারত, কুফায় যিয়ারত':'Mourning, Ziyarat of Muslim ibn Aqil, visiting Kufa', importance:l==='bn'?'ইমামের বিশ্বস্ত দূতের শাহাদাত — কারবালার পটভূমি':'Martyrdom of the Imam\'s trusted envoy — prelude to Karbala'},
        {id:'sm2',historyDay:9,historyMonth:12,  icon:'🕊️', color:'#7c3aed', type:'martyrdom', hijriDate:l==='bn'?'৯ জিলহজ, ৬০ হি.':'9 Dhu al-Hijjah, 60 AH', titleBn:l==='bn'?'হযরত হানি ইবনে উরওয়া শাহাদাত':'Martyrdom of Hani ibn Urwa', arabicTitle:'شهادة هاني بن عروة', descBn:l==='bn'?'৬০ হিজরিতে কুফার বিশিষ্ট নেতা হানি ইবনে উরওয়া মুসলিম ইবনে আকিলকে আশ্রয় দেওয়ার কারণে ইবনে যিয়াদের নির্দেশে শহীদ হন। শিয়াদের শ্রদ্ধেয় ব্যক্তিত্ব।':'In 60 AH, Hani ibn Urwa, a prominent leader of Kufa, was martyred on the orders of Ibn Ziyad for sheltering Muslim ibn Aqil. A revered figure among the Shia.', amaal:l==='bn'?'শোক পালন, যিয়ারত, কুফায় স্মরণ':'Mourning, Ziyarat, remembrance in Kufa', importance:l==='bn'?'কুফার বিশ্বস্ত সমর্থকের শাহাদাত':'Martyrdom of a loyal supporter in Kufa'},
    ];
}

// ============================================================================
// TODAY IN ISLAMIC HISTORY — আজকের হিজরি তারিখে মিলে যাওয়া ঘটনাসমূহ
// ============================================================================

// static + admin-added (state.shiaSpecialDays) সব একত্র করে রিটার্ন করে।
// শুধুমাত্র historyDay/historyMonth আছে এমন এন্ট্রি ম্যাচিং-এর জন্য ব্যবহারযোগ্য —
// admin panel দিয়ে যোগ করা এন্ট্রিতে এই ফিল্ড না থাকলে সেগুলো এই widget-এ দেখাবে না।
function getAllHistoryDays(l) {
    return [...getStaticSpecialDays(l), ...state.shiaSpecialDays];
}

// আজকের হিজরি (day, month)-এর সাথে মিলে যাওয়া এন্ট্রি খুঁজে বের করে
function getTodayInHistoryEvents(l) {
    const today = approxHijriNow();
    return getAllHistoryDays(l).filter(item => {
        if (item.historyMonth !== today.month) return false;
        if (Array.isArray(item.historyDay)) return item.historyDay.includes(today.day);
        return item.historyDay === today.day;
    });
}

// Home page widget — আজকের ইসলামিক ইতিহাসের ঘটনা(সমূহ) দেখায়
function renderTodayInHistoryWidget(l, d) {
    const events = getTodayInHistoryEvents(l);
    const typeLabel = { eid: l==='bn'?'আনন্দময় দিন':'Joyous Day', special: l==='bn'?'বিশেষ রাত':'Special Night', martyrdom: l==='bn'?'শাহাদাত দিবস':'Day of Martyrdom' };

    return `
    <div class="${d?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border rounded-2xl p-5 mb-8 reveal" style="box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <div class="flex items-center gap-2 mb-3">
            <span style="width:34px;height:34px;border-radius:10px;background:#c9a22718;display:inline-flex;align-items:center;justify-content:center;font-size:1.05rem">📜</span>
            <h2 class="font-bold text-base">${l==='bn'?'ইতিহাসে আজ':'Today in Islamic History'}</h2>
        </div>
        ${events.length===0
            ? `<p class="text-sm ${d?'text-gray-400':'text-gray-500'}">${l==='bn'?'আজকের হিজরি তারিখে নথিভুক্ত কোনো বিশেষ ঘটনা নেই।':'No recorded event matches the current Hijri date.'}</p>`
            : events.map(item => `
        <div class="flex items-start gap-3 ${events.length>1?'mb-3 pb-3 border-b '+(d?'border-gray-700':'border-gray-100'):''}">
            <span style="width:30px;height:30px;border-radius:9px;background:${item.color||'#059669'}18;display:inline-flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0">${item.icon||'✨'}</span>
            <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold" style="color:${item.color||'#059669'}">${typeLabel[item.type]||''}</p>
                <p class="font-bold text-sm leading-snug">${sanitize(item.titleBn||'')}</p>
                <p class="text-xs ${d?'text-gray-400':'text-gray-500'} mt-1">${sanitize(item.hijriDate||'')}</p>
            </div>
        </div>`).join('')
        }
        <button data-action="changePage" data-param="shia-days" class="mt-2 text-xs font-bold" style="color:#c9a227">${l==='bn'?'সব বিশেষ দিন দেখুন →':'See all special days →'}</button>
    </div>`;
}

// ============================================================================
// বিশেষ দিনসমূহ পেজ — CRUD সহ
// ============================================================================
function renderShiaDaysPage() {
    const d = state.darkMode, l = state.language;

    const staticDays = getStaticSpecialDays(l);
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
      <h2 class="text-3xl font-black" style="color:${d?'#f9fafb':'#111827'}">🌳 ${l==='bn'?'বংশধারা':'Family Tree'}</h2>
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
        <h2 class="text-3xl font-black" style="background:linear-gradient(135deg,#059669,#b45309);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🌳 ${l==='bn'?'বংশধারা':'Family Tree'}</h2>
        <p class="text-sm ${d?'text-gray-400':'text-gray-500'} mt-1">${l==='bn'?'নবী মুহাম্মদ (সা) থেকে ১২ ইমাম পর্যন্ত':'From Prophet Muhammad (PBUH) to the 12 Imams'}</p>
    </div>

    <div class="family-tree-container">
      <!-- Prophet Card -->
      <div class="prophet-card" onclick="showPersonDetail('prophet')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showPersonDetail('prophet');}" role="button" tabindex="0" aria-label="${escapeHtml(l==='bn'?p.bengaliName:(p.englishAbbr||p.englishName))}">
        <div class="card-badge">${l==='bn'?'প্রথম জ্যোতি':'First Generation'}</div>
        <div class="card-name">${p.arabicName}</div>
        <div class="card-bengali">${l==='bn'?p.bengaliName:(p.englishAbbr||p.englishName)}</div>
      </div>

      <div class="hierarchy-divider"><div class="tree-stem"></div><div class="tree-node"></div><div class="tree-stem"></div></div>

      <!-- Fatima Zahra: genealogical bridge -->
      <div class="fatima-card" onclick="showPersonDetail('fatima')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showPersonDetail('fatima');}" role="button" tabindex="0" aria-label="${escapeHtml(l==='bn'?familyTreeDatabase.fatima.bengaliName:(familyTreeDatabase.fatima.englishAbbr||familyTreeDatabase.fatima.englishName))}">
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
    <div id="person-detail-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-body">
      <div class="modal-backdrop" onclick="closePersonDetail()"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="closePersonDetail()" aria-label="${l==='bn'?'বন্ধ করুন':'Close'}">✕</button>
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
  
  let person = _resolveFamilyTreePerson(personId);
  
  if (!person) return;
  
  const L = l === 'bn' ? {
    birth:'জন্ম', death:'মৃত্যু', reign:'মেয়াদ', place:'স্থান',
    parents:'পিতামাতা', spouse:'পত্নী', children:'সন্তান',
    significance:'গুরুত্ব', causeOfDeath:'মৃত্যু কারণ', shrine:'মাজার',
    knowledgeFields:'জ্ঞান ক্ষেত্র', students:'শিক্ষার্থী',
    kunyah:'কুনিয়াত', laqab:'লকব/উপাধি', sources:'সূত্র', fullProfile:'সম্পূর্ণ প্রোফাইল ও উক্তি দেখুন'
  } : {
    birth:'Birth', death:'Death', reign:'Imamate Period', place:'Place',
    parents:'Parents', spouse:'Spouse', children:'Children',
    significance:'Significance', causeOfDeath:'Cause of Death', shrine:'Shrine',
    knowledgeFields:'Fields of Knowledge', students:'Students',
    kunyah:'Kunyah', laqab:'Laqab / Title', sources:'Sources', fullProfile:'View Full Profile & Quote'
  };
  
  // Relationships (linked, within this dataset) + Timeline + Opponents —
  // all derived via family-tree-data.js helpers from data that already
  // exists; nothing new is fabricated here.
  const familyLinks = (typeof getFamilyLinks === 'function') ? getFamilyLinks(personId) : { parents: [], children: [], spouse: [], siblings: [] };
  const timeline = (typeof getPersonTimeline === 'function') ? getPersonTimeline(person) : [];
  const opponentsList = (typeof getPersonOpponents === 'function') ? getPersonOpponents(person) : [];

  const L2 = l === 'bn' ? {
    relationships:'সম্পর্ক (বংশধারায়)', siblings:'ভাই-বোন', timeline:'জীবনরেখা', opponents:'প্রতিপক্ষ'
  } : {
    relationships:'Relationships (in this lineage)', siblings:'Siblings', timeline:'Timeline', opponents:'Opponents'
  };

  // একটি family-link ব্যক্তির জন্য ক্লিকযোগ্য pill বানায়
  const linkPill = (p) => {
    const name = l === 'bn' ? p.bengaliName : (p.englishName || p.englishAbbr || p.bengaliName);
    return `<button class="family-link-pill" onclick="showPersonDetail('${p.refId}')"
      style="background:${p.color || '#3B82F6'}15;color:${p.color || '#3B82F6'};border:1px solid ${p.color || '#3B82F6'}30;
      padding:5px 12px;border-radius:50px;font-size:.78rem;font-weight:600;cursor:pointer;margin:2px">
      ${escapeHtml(name)}
    </button>`;
  };
  const linkGroup = (label, list) => list.length ? `
    <div style="margin-bottom:8px">
      <span style="font-size:.75rem;font-weight:700;opacity:.7">${label}:</span>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px">${list.map(linkPill).join('')}</div>
    </div>` : '';

  // Stats, completion %, badges, citation — reuses family-tree-data.js
  // helpers, no new facts introduced here.
  const stats = (typeof getProfileStats === 'function') ? getProfileStats(personId, person) : null;
  const completion = (typeof getProfileCompletion === 'function') ? getProfileCompletion(person) : null;
  const badges = (typeof getProfileBadges === 'function') ? getProfileBadges(personId, person) : [];

  const L3 = l === 'bn' ? {
    generation:'প্রজন্ম', age:'মৃত্যুকালীন বয়স', childrenCount:'সন্তান সংখ্যা',
    knownRelatives:'পরিচিত আত্মীয় (বংশধারায়)', period:'ঐতিহাসিক পর্যায়',
    completion:'প্রোফাইল সম্পূর্ণতা', missing:'বাকি আছে', copyCitation:'সাইটেশন কপি করুন', print:'প্রিন্ট করুন'
  } : {
    generation:'Generation', age:'Age at Death', childrenCount:'Children Count',
    knownRelatives:'Known Relatives (in lineage)', period:'Historical Period',
    completion:'Profile Completion', missing:'Missing', copyCitation:'Copy Citation', print:'Print'
  };

  const statRow = (label, val) => val ? `<div style="text-align:center;padding:6px 4px">
    <div style="font-size:.68rem;opacity:.65">${label}</div>
    <div style="font-size:.9rem;font-weight:700">${escapeHtml(String(val))}</div>
  </div>` : '';

  const displayName = l === 'bn' ? person.bengaliName : (person.englishName || person.englishAbbr || person.bengaliName);

  const avatarLabel = l === 'bn' ? (person.order || '✧') : (person.id ? person.id : '✧');

  // Cross-link to the richer quote/epithet profile on the Imams & Masumeen
  // page. That page keys the Prophet/Fatima as masumeen ids 'p'/'f', and the
  // 12 Imams as numeric ids 1-12 — same numbering as familyTreeDatabase.imams,
  // so no separate mapping table is needed.
  const crossLinkParam = personId === 'prophet' ? 'p' : (personId === 'fatima' ? 'f' : person.id);
  
  const html = `
    <div class="modal-header">
      <div class="modal-avatar" style="background-color: ${person.color || '#3B82F6'}; color: ${person.textColor || '#FFFFFF'};">
        ${avatarLabel}
      </div>
      <div class="modal-titles">
        <h2>${displayName}</h2>
        <p>${person.arabicName}</p>
        ${(person.kunyah || person.laqab) ? `
        <p class="kunyah-laqab-line" style="font-size:.8rem;opacity:.85;margin-top:2px">
          ${person.kunyah ? `<span>${L.kunyah}: ${escapeHtml(person.kunyah)}</span>` : ''}
          ${(person.kunyah && person.laqab) ? ' · ' : ''}
          ${person.laqab ? `<span>${L.laqab}: ${escapeHtml(person.laqab)}</span>` : ''}
        </p>` : ''}
        ${badges.length ? `
        <div class="badges-row" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
          ${badges.map(b => `<span style="font-size:.7rem;font-weight:700;background:rgba(120,120,120,.12);padding:3px 9px;border-radius:50px">${b.icon} ${escapeHtml(b.label)}</span>`).join('')}
        </div>` : ''}
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

    ${(familyLinks.parents.length || familyLinks.spouse.length || familyLinks.children.length || familyLinks.siblings.length) ? `
    <div class="relationships-block" style="margin-top:14px;padding:12px;border-radius:12px;background:rgba(120,120,120,.06)">
      <p class="description-text" style="margin-bottom:6px"><strong>🔗 ${L2.relationships}</strong></p>
      ${linkGroup(L.parents, familyLinks.parents)}
      ${linkGroup(L2.siblings, familyLinks.siblings)}
      ${linkGroup(L.spouse, familyLinks.spouse)}
      ${linkGroup(L.children, familyLinks.children)}
    </div>` : ''}

    ${opponentsList.length ? `
    <p class="description-text" style="margin-top:10px"><strong>⚔️ ${L2.opponents}:</strong> ${escapeHtml(opponentsList.join(' · '))}</p>` : ''}

    ${timeline.length ? `
    <div class="timeline-block" style="margin-top:14px">
      <p class="description-text" style="margin-bottom:6px"><strong>🕰️ ${L2.timeline}</strong></p>
      <div style="border-inline-start:2px solid ${person.color || '#3B82F6'}40;padding-inline-start:14px">
        ${timeline.map(ev => `
        <div style="margin-bottom:10px;position:relative">
          <p style="font-size:.8rem;font-weight:700;margin:0">${ev.icon} ${escapeHtml(ev.label)}</p>
          <p style="font-size:.78rem;opacity:.8;margin:1px 0 0">${escapeHtml(ev.detail || '')}</p>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${stats ? `
    <div class="stats-block" style="margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border-radius:12px;background:rgba(120,120,120,.06);padding:4px">
      ${statRow(L3.generation, stats.generation ? `#${stats.generation}` : null)}
      ${statRow(L3.age, stats.ageAtDeath)}
      ${statRow(L3.childrenCount, stats.childrenCount || null)}
      ${statRow(L3.knownRelatives, stats.knownRelatives || null)}
      ${statRow(L3.period, stats.historicalPeriod)}
    </div>` : ''}

    ${completion ? `
    <div class="completion-block" style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;font-size:.75rem;opacity:.75">
        <span>${L3.completion}</span><span>${completion.percent}%</span>
      </div>
      <div style="height:6px;border-radius:4px;background:rgba(120,120,120,.15);margin-top:3px;overflow:hidden">
        <div style="height:100%;width:${completion.percent}%;background:${person.color || '#3B82F6'};border-radius:4px"></div>
      </div>
      ${completion.missing.length ? `<p style="font-size:.7rem;opacity:.6;margin-top:3px">${L3.missing}: ${escapeHtml(completion.missing.join(', '))}</p>` : ''}
    </div>` : ''}

    ${(Array.isArray(person.sources) && person.sources.length > 0) ? `
    <div class="sources-list" style="margin-top:12px">
      <p class="description-text" style="margin-bottom:4px"><strong>${L.sources}:</strong></p>
      <ul style="padding-inline-start:1.2em;margin:0">
        ${person.sources.map(s => `<li style="font-size:.85rem;margin-bottom:2px">${escapeHtml([s.book, s.volumeOrPage, s.author].filter(Boolean).join(' · '))}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div style="margin-top:16px;text-align:center;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button class="modal-crosslink-btn" onclick="closePersonDetail()" data-action="viewImam" data-param="${crossLinkParam}"
        style="background:${person.color || '#3B82F6'}18;color:${person.color || '#3B82F6'};border:1px solid ${person.color || '#3B82F6'}30;
        padding:8px 18px;border-radius:50px;font-size:.8rem;font-weight:700;cursor:pointer">
        ${L.fullProfile} →
      </button>
      <button onclick="copyPersonCitation('${personId}')"
        style="background:rgba(120,120,120,.1);color:inherit;border:1px solid rgba(120,120,120,.25);
        padding:8px 18px;border-radius:50px;font-size:.8rem;font-weight:700;cursor:pointer">
        📋 ${L3.copyCitation}
      </button>
      <button onclick="printPersonProfile('${personId}')"
        style="background:rgba(120,120,120,.1);color:inherit;border:1px solid rgba(120,120,120,.25);
        padding:8px 18px;border-radius:50px;font-size:.8rem;font-weight:700;cursor:pointer">
        🖨️ ${L3.print}
      </button>
    </div>
  `;
  
  modalBody.innerHTML = html;
  modal.classList.remove('hidden');

  // ✅ Focus management: remember what had focus, move focus into the
  // modal, and let Escape close it — same behavior the backdrop click
  // and close button already provide, just reachable from the keyboard.
  window._personDetailReturnFocus = document.activeElement;
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.focus();
  if (window._personDetailEscHandler) document.removeEventListener('keydown', window._personDetailEscHandler);
  window._personDetailEscHandler = (e) => { if (e.key === 'Escape') closePersonDetail(); };
  document.addEventListener('keydown', window._personDetailEscHandler);
}

function closePersonDetail() {
  const modal = document.getElementById('person-detail-modal');
  // Defensive: if the page already changed (e.g. via the cross-link button's
  // own navigation, or any future caller), the modal may no longer be in the
  // DOM — guard instead of throwing on `.classList` of null.
  if (modal) modal.classList.add('hidden');
  if (window._personDetailEscHandler) {
    document.removeEventListener('keydown', window._personDetailEscHandler);
    window._personDetailEscHandler = null;
  }
  if (window._personDetailReturnFocus && typeof window._personDetailReturnFocus.focus === 'function') {
    window._personDetailReturnFocus.focus();
  }
  window._personDetailReturnFocus = null;
}

function _resolveFamilyTreePerson(personId) {
  if (personId === 'prophet') return familyTreeDatabase.prophet;
  if (personId === 'fatima') return familyTreeDatabase.fatima;
  return familyTreeDatabase.imams.find(i => i.id === parseInt(personId));
}

// Copy Citation — reuses the existing shareContent() share/clipboard fallback
// chain (navigator.share → clipboard API → textarea trick → WhatsApp) rather
// than re-implementing clipboard handling.
function copyPersonCitation(personId) {
  const person = _resolveFamilyTreePerson(personId);
  if (!person || typeof getCitationText !== 'function') return;
  const l = state.language;
  const citation = getCitationText(personId, person, l);
  const name = l === 'bn' ? person.bengaliName : (person.englishName || person.englishAbbr || person.bengaliName);
  shareContent('📋 ' + (l === 'bn' ? 'সাইটেশন' : 'Citation') + ' — ' + name, citation, '');
}

// Print Profile — builds a small self-contained printable document in a new
// tab (doesn't depend on style.css print rules, which aren't touched here).
function printPersonProfile(personId) {
  const person = _resolveFamilyTreePerson(personId);
  if (!person) return;
  const l = state.language;
  const name = l === 'bn' ? person.bengaliName : (person.englishName || person.englishAbbr || person.bengaliName);
  const win = window.open('', '_blank');
  if (!win) return; // popup blocked — silent no-op, same as elsewhere in the app

  const rows = [
    [l === 'bn' ? 'আরবি নাম' : 'Arabic Name', person.arabicName],
    [l === 'bn' ? 'কুনিয়াত' : 'Kunyah', person.kunyah],
    [l === 'bn' ? 'লকব' : 'Laqab', person.laqab],
    [l === 'bn' ? 'জন্ম' : 'Birth', person.birth],
    [l === 'bn' ? 'জন্মস্থান' : 'Birth Place', person.birthPlace],
    [l === 'bn' ? 'মৃত্যু/ওফাত' : 'Death', person.death],
    [l === 'bn' ? 'মৃত্যুস্থান' : 'Death Place', person.deathPlace],
    [l === 'bn' ? 'পিতামাতা' : 'Parents', person.parents],
    [l === 'bn' ? 'পত্নী' : 'Spouse', person.spouse],
    [l === 'bn' ? 'সন্তান' : 'Children', person.children],
    [l === 'bn' ? 'গুরুত্ব' : 'Significance', person.significance]
  ].filter(([, v]) => !!v);

  const rowsHtml = rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`).join('');
  const descHtml = person.description ? `<p>${escapeHtml(person.description)}</p>` : '';

  win.document.write(`<!DOCTYPE html><html lang="${l === 'bn' ? 'bn' : 'en'}"><head><meta charset="UTF-8">
    <title>${escapeHtml(name)}</title>
    <style>
      body{font-family:'Noto Sans Bengali',Arial,sans-serif;max-width:680px;margin:32px auto;padding:0 16px;color:#1a1a1a}
      h1{margin-bottom:2px} .arabic{font-size:1.1rem;color:#555;margin-top:0}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #ddd;vertical-align:top}
      th{width:150px;color:#555;font-weight:600}
      p{line-height:1.6}
      footer{margin-top:24px;font-size:.75rem;color:#888;border-top:1px solid #eee;padding-top:8px}
    </style></head><body>
    <h1>${escapeHtml(name)}</h1>
    <p class="arabic">${escapeHtml(person.arabicName || '')}</p>
    ${descHtml}
    <table>${rowsHtml}</table>
    <footer>${escapeHtml(typeof getCitationText === 'function' ? getCitationText(personId, person, l) : '')}</footer>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function initFamilyTree() {
  renderFamilyTree();
}

console.log('✅ Family Tree Functions Loaded');
