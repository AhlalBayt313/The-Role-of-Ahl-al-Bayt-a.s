// ============================================================================
// STATIC MEDIA LIBRARY
// ============================================================================
// লাইভ আপলোড ফিচার বাতিল করা হয়েছে (কারণ: GitHub টোকেন client-side এ রাখা
// যায় না — GitHub নিজের টোকেন কোনো public repo-তে খুঁজে পেলে অটো-revoke করে
// দেয়, বিস্তারিত নোট script-1-core.js এর একদম শুরুতে)। এর বদলে ছবি/ভিডিও/
// অডিও/PDF এখন থেকে সরাসরি এই ফাইলে কোড আকারে যোগ করা হয় — ঠিক blog.js এর
// blogPosts array এর মতোই।
//
// নতুন ফাইল যোগ করার ধাপ:
//   ১. ফাইলটা এই GitHub repo-তে upload করুন (যেকোনো ফোল্ডারে — যেমন
//      library/images/, library/pdfs/ ইত্যাদি; নিজের মতো ফোল্ডার গঠন রাখতে
//      পারেন)
//   ২. GitHub-এ ফাইলটা খুলুন → "Raw" বাটনে right-click → "Copy link address"
//      (অথবা ঠিকানাটা নিজে বসাতে পারেন এই প্যাটার্নে:
//      https://raw.githubusercontent.com/AhlalBayt313/The-Role-of-Ahl-al-Bayt-a.s/main/<repo-এর-ভেতরে-ফাইলের-path>)
//   ৩. নিচের সংশ্লিষ্ট array-তে একটা entry যোগ করুন (নিচের উদাহরণ দেখুন)
//      — id অবশ্যই ইউনিক রাখবেন (যেমন 'img_1', 'img_2', ... বা যেকোনো
//      ইউনিক স্ট্রিং)
//   ৪. git push করুন — কিছুক্ষণের মধ্যে (GitHub Pages এর deploy সময় + সামান্য
//      CDN cache delay) সাইটে দেখা যাবে
//
// প্রতিটা entry-তে যেসব ফিল্ড কাজ করে:
//   id         - ইউনিক আইডি (string, বাধ্যতামূলক)
//   name       - ফাইলের নাম, UI-তে এটাই দেখানো হয় (বাধ্যতামূলক)
//   cloudUrl   - raw.githubusercontent.com লিংক (বাধ্যতামূলক)
//   uploadDate - 'YYYY-MM-DD' ফরম্যাটে তারিখ (ঐচ্ছিক, UI-তে দেখানো হয়)
//   sizeFmt    - যেমন '2.3 MB' (ঐচ্ছিক, UI-তে দেখানো হয়)
//
// উদাহরণ:
//   { id:'img_1', name:'কারবালা.jpg',
//     cloudUrl:'https://raw.githubusercontent.com/AhlalBayt313/The-Role-of-Ahl-al-Bayt-a.s/main/library/images/karbala.jpg',
//     uploadDate:'2026-07-19', sizeFmt:'1.4 MB' },
// ============================================================================
const STATIC_MEDIA = {
    imageList: [
        // এখানে ছবি যোগ করুন
    ],
    videoList: [
        // এখানে ভিডিও যোগ করুন
    ],
    audioList: [
        // এখানে অডিও যোগ করুন
    ],
    pdfList: [
        // এখানে সাধারণ পিডিএফ যোগ করুন
    ],
    nahjulPdfs: [
        { id:'nahjul_1', name:'নাহজুল বালাগা',
          cloudUrl:'https://raw.githubusercontent.com/AhlalBayt313/The-Role-of-Ahl-al-Bayt-a.s/main/Nahaz-Al-Balagha-Bangla.pdf',
          uploadDate:'2026-07-19', sizeFmt:'19.2 MB' },
    ],
    sahifaPdfs: [
        // সহিফায়ে সাজ্জাদিয়া পিডিএফ
    ],
    imamHadithPdfs: [
        // ইমামদের হাদিস পিডিএফ
    ],
    specialDayPdfs: [
        // বিশেষ দিবস সংক্রান্ত পিডিএফ
    ],
    islamicHistoryPdfs: [
        // ইসলামি ইতিহাস পিডিএফ
    ],
};
