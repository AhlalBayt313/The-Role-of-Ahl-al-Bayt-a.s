# v226 — ডেটা অখণ্ডতা + এক কমান্ডের চেক (শুধু ডেটা ও tools; অ্যাপের কোড অপরিবর্তিত)

## কেন
`node tools/validate-duas.js` v225-এ **৫টি error** দেখাচ্ছিল। আসল ক্ষতি: `ziyarat-sayyida-ruqayya-2`, `-3`, `-short` শুধু `ziyarat.json`-এ ছিল, `metadata.json`-এ ছিল না। অ্যাপ লিস্ট বানায় metadata.json থেকে (পূর্ণ ফাইল শুধু ইনডেক্সের আইটেমে merge হয়), তাই এই তিনটি যিয়ারত লিস্টে কখনো আসত না, আর রুকাইয়্যা যিয়ারত একক কার্ড হিসেবে দেখাত (৪-রূপের গ্রুপ নয়)।

## কী বদলেছে
| ফাইল | বদল |
|---|---|
| `data/duas/metadata.json` | `ziyarats`: নতুন ৩টি এন্ট্রি (`-2`, `-3`, `-short`, originalIndex ৫৬–৫৮, sortOrder ১৫); `ziyarat-sayyida-ruqayya`-তে `titleBn`/`titleEn` পূর্ণ ফাইলের সাথে মেলানো + `group`, `groupTitleBn/En`, `variantLabelBn/En` যোগ; `ziyarat-aal-yasin`-এর `titleBn` → "যিয়ারতে আলে ইয়াসিন"। `duas` ও `amals` অপরিবর্তিত। যিয়ারত ৫৬ → ৫৯। |
| `d/` + `sitemap.xml` | `node tools/build-dua-share-pages.js` চালিয়ে ৩টি নতুন শেয়ার পেজ (মোট ৪২১) ও sitemap ব্লক হালনাগাদ। |
| `tools/validate-duas.js` | একটি `NO_ARABIC_OK` তালিকা (শুধু `ziyarat-sayyida-ruqayya-short`)। এই রূপের আরবি মূল Duas.org-এ নেই (v93), তাই "আরবি নেই" এখানে error নয়, warning। বাকি যাচাই অপরিবর্তিত। |
| `tools/check-all.js` | **নতুন**। একবারে সব চেক (নিচে)। |
| `sw.js` | CACHE `ahlbayt-v226` (metadata.json precached)। |

## নতুন: `node tools/check-all.js`
exit 0 = সব ঠিক, exit 1 = কিছু ভেঙেছে। কোনো ধাপ ব্যর্থ হলেও পরের ধাপ চলে, তাই একবারেই সব সমস্যা দেখা যায়।
1. সব `.js`-এ `node --check` (assets/js, sw.js, tools)
2. সব `data/**/*.json` + `manifest.json` পার্স হয় কিনা; `sitemap.xml` ঠিক আছে কিনা (ডুপ্লিকেট `<loc>` নেই)
3. `phase4a-smoke-test.js` (আগের সব চেক)
4. `validate-duas.js` (ইনডেক্স ↔ পূর্ণ ফাইল + `d/` পেজ হালনাগাদ)
5. `build-share-pages.js --check` (ব্লগের `p/` পেজ)
6. `sw.js`: CACHE নামের ফরম্যাট, আর STATIC তালিকার প্রতিটি ফাইল ডিস্কে আছে কিনা (আগে শুধু উল্টো দিক যাচাই হতো)

ডেলিভারির আগের ধাপ: `node --check` + এটা।

## যাচাই
- `check-all.js`: ৮/৮ পাস। পুরনো v225 metadata.json বসিয়ে চালালে ধাপ ৪ ব্যর্থ হয়, exit 1 (নেগেটিভ টেস্ট)।
- jsdom বুট-সিমুলেশন (আসল স্ক্রিপ্ট লোড, async ডেটা সহ): আগে যিয়ারত ৫৬, রুকাইয়্যা গ্রুপ নেই; এখন ৫৯, "৪টি ভিন্ন যিয়ারত" গ্রুপ, খুললে ৪টি রূপ। `?page=dua&open=ziyarat:ziyarat-sayyida-ruqayya-short` রিডার খোলে। দুই ক্ষেত্রেই JS error ০।
- ব্রাউজারে চোখে দেখা বাকি (PWA আপডেটের পর ফোনে যিয়ারত ট্যাব)।

## পুশে যা যা উঠতে হবে
`data/duas/metadata.json`, `d/` (৩টি নতুন ফাইল সহ), `sitemap.xml`, `sw.js`, `tools/`, `docs/v226-CHANGES-bn.md`।

## ⚖️ যাচাই / পার্ক (ঠিক করা হয়নি, অনুমোদন লাগবে)
- ইনডেক্সে `group`/`variantLabel` ফিল্ড নেই কিন্তু পূর্ণ ফাইলে আছে এমন যিয়ারত ~১৪টি (জাওয়াদ, কাজিম, হাদি-১, মাহদি, রেজা ৭–৮ ইত্যাদি)। পূর্ণ ফাইল লোড হলে merge-এ ঠিক হয়ে যায়, তাই ব্যবহারকারী সাধারণত দেখে না; validator এগুলো ধরে না।
- `ziyarat-aal-yasin`-এর ইনডেক্সে `titleEn`/`arabic`/`meaningBn`/`meaningEn`/`source` পূর্ণ ফাইল থেকে আলাদা (শুধু `titleBn` ঠিক করা হয়েছে)। কিছু রেজা যিয়ারতে ইনডেক্সের `meaningEn` ফাঁকা কিন্তু পূর্ণ ফাইলে আছে।
