# v230 — SEO: p/ ও d/ পেজ আসল ল্যান্ডিং পেজ, প্রতি ভিউয়ে title, sitemap/404 (অ্যাপের বিদ্যমান কোড অপরিবর্তিত)

## কেন
v229-এর অডিটে দেখা গিয়েছিল: ৫৮৬টি `p/` (ব্লগ) ও `d/` (দোয়া/যিয়ারত/আমল) শেয়ার-পেজ সবই ছিল redirect stub। `meta refresh 0` কে Google permanent redirect ধরে এবং গন্তব্য দেখায়। গন্তব্য `?page=...` URL-এর canonical আবার হোমপেজ। ফলে এই পেজগুলো কনটেন্ট পেজ হিসেবে সার্চে দাঁড়াতে পারত না। পেজে লেখাও ছিল মাত্র ~১৫০–২২০ অক্ষর; ডেটায় ব্লগের মোট ~২.৩৮ লাখ অক্ষর আর ~১.১ MB দোয়া/যিয়ারত টেক্সট আছে।

## কী বদলেছে
| ফাইল | বদল |
|---|---|
| `p/*.html` (১৬৫ + `index.html`) | পূর্ণ বাংলা লেখা + ইংরেজি সংস্করণ (`lang="en"`), নিজস্ব title/description/canonical/OG, JSON-LD (`Article` + `BreadcrumbList`), "অ্যাপে খুলুন" বাটন, "আরও পড়ুন" (একই বিষয়ের ৫টি), `p/index.html` সূচি। **redirect নেই।** |
| `d/*.html` (৪২১ + `index.html`) | আরবি পাঠ (আয়াত-বাই-আয়াত), তাসলিত/উচ্চারণ, বাংলা অনুবাদ, সূত্র/রেফারেন্স/সংকলক, ইংরেজি অর্থ, `WebPage` + `BreadcrumbList` JSON-LD, যিয়ারতের অন্যান্য রূপের লিংক, একই ক্যাটাগরির ৫টি; `d/index.html` সূচি। **redirect নেই।** |
| `tools/seo-page.js` | **নতুন**। দুই builder-এর ভাগ করা টেমপ্লেট (CSS, title/description বানানো, ক্যাটাগরির বাংলা নাম)। |
| `tools/build-share-pages.js`, `tools/build-dua-share-pages.js` | নতুন `landingFor()`/`indexFor()` যোগ; পুরনো `pageFor()` অপরিবর্তিত। `--stub` দিলে আগের redirect stub ফিরে আসে। দোয়া builder এখন পূর্ণ ফাইলও (category files, ziyarat.json, amal.json) পড়ে। |
| `assets/js/core/page-titles.js` | **নতুন**। `render()` wrapper, প্রতি ভিউয়ে `document.title` (মেনুর নাম বা আইটেমের নিজের শিরোনাম + অ্যাপের নাম; ভাষা অনুযায়ী)। হোমে আগের static title। |
| `index.html` | `page-titles.js`-এর একটি `<script>`, `browser-history.js`-এর আগে। |
| `sitemap.xml` | ১৭টি `?page=...` ডুপ্লিকেট URL সরানো (সব canonical = হোম), `p/` ও `d/` সূচি যোগ। এখন ৫৮৯ URL। |
| `404.html` | **নতুন**। `noindex`, হোম/দোয়া/ব্লগের লিংক। |
| `tools/check-seo.js` | **নতুন**। প্রতি পেজে একটিই h1, description ২৫–১৭০ অক্ষর, self-canonical, redirect নেই, JSON-LD বৈধ, ≥৩০০ অক্ষর টেক্সট, title/description ইউনিক; sitemap সম্পূর্ণ ও `?` URL নেই; 404.html আছে। `check-all.js`-এ ধাপ ৭। |
| `sw.js` | CACHE `ahlbayt-v230`; `page-titles.js` precache। |

## পরিমাপ (আগে → পরে)
- `p/` পেজের মিডিয়ান টেক্সট: ১৬৬ → ৩,১৩৮ অক্ষর। `d/`: ২১৯ → ১,০৮০ অক্ষর (সবচেয়ে বড় `dua-jawshan-al-kabir` ~২৮০ KB HTML)।
- `p/`-এ ৬০ অক্ষরের বেশি title: ১১৪ → ৪৫ (বাকিগুলোর শিরোনামই লম্বা)। `d/`-এ ১৫৫-এর বেশি description: ২১৪ → ০।
- ডুপ্লিকেট title/description: `d/`-এ ১ ও ৫ → ০।
- মোট নতুন পেজ-ওজন ~৯.৫ MB (`p/` ২.৫ + `d/` ৭ MB)।

## একটি ট্রেড-অফ (জেনে রাখুন)
শেয়ার-লিংকে ঢুকলে এখন সরাসরি অ্যাপ খোলে না, আগে পূর্ণ লেখা সহ পেজ দেখায়, উপরে ও নিচে "📱 অ্যাপে খুলুন" বাটন। মানুষকে JS দিয়ে অ্যাপে পাঠানো যেত না, কারণ Google JS redirect-ও অনুসরণ করে এবং একই সমস্যা ফিরে আসে। পুরনো আচরণ ফিরিয়ে আনতে: `node tools/build-share-pages.js --stub` ও `node tools/build-dua-share-pages.js --stub` (তখন `check-seo.js` ব্যর্থ হবে, ইচ্ছাকৃত)।

## যাচাই
- `node tools/check-all.js`: ৯/৯ পাস (নতুন ধাপ ৭ সহ)।
- নেগেটিভ টেস্ট: `--stub` পেজে `check-seo.js` ৩৩৩টি সমস্যা ধরে, exit 1।
- সব ~৫৮৮ পেজ HTML tag-balance, ঠিক একটি `<h1>`, JSON-LD parse: ০ সমস্যা।
- jsdom বুট-সিমুলেশন: ২৪টি পেজ + ভাষা বদল + ডিটেইল পেজ (দোয়া, পোস্ট, ইমাম) + Back-এর পরে title সঠিক; ভিউ রেন্ডারে নতুন JS error নেই। (সিমুলেটরে দেখা canvas/leaflet CDN error পরিবেশের, ইন্টারনেট ও canvas নেই।)
- **বাকি (আপনার ব্রাউজারে):** দুয়েকটি `p/` ও `d/` পেজ ফোনে দেখুন (আরবি ফন্ট, বাটন); Google Rich Results Test-এ একটি পেজ দিন; Search Console-এ sitemap পুনরায় জমা দিন।

## পুশে যা যা উঠতে হবে
`p/`, `d/` (পুরোটা), `sitemap.xml`, `404.html`, `index.html`, `sw.js`, `assets/js/core/page-titles.js`, `tools/` (৫ ফাইল), `docs/v230-CHANGES-bn.md`।

## ⚖️ পার্ক (অনুমোদন লাগবে)
- হোমপেজ বা অ্যাপের ভেতরে `p/` ও `d/` সূচির কোনো দৃশ্যমান লিংক নেই; এখন আবিষ্কার শুধু sitemap দিয়ে। অ্যাপের ফুটারে একটি লিংক যোগ করা যায় (UI বদল)।
- ব্লগ পোস্টে author/image ফিল্ড নেই, তাই JSON-LD-তে `author` নেই। সব পেজে একই og-image।
- ধাপ ৪খ (বাকি lazy-load) এখনো বাকি।
