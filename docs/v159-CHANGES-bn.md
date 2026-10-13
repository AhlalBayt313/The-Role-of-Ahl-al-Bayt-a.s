# v159 — সাইটেশনের সাইট লিংক ঠিক (`getCitationText`)

**সমস্যা:** `ahlul-bayt-unified.js`-এর `getCitationText()` সাইটেশনে `https://ahlalbayt313.github.io/#familyTree` বসাত — রেপোর পাথ (`/The-Role-of-Ahl-al-Bayt-a.s/`) নেই, আর অ্যাপ `#` নয় `?page=` দিয়ে পেজ খোলে। ফলে কপি করা সাইটেশন/প্রিন্ট ফুটারের লিংক অ্যাপে পৌঁছাত না।

**বদল:** শুধু `siteUrl` স্ট্রিং → `https://ahlalbayt313.github.io/The-Role-of-Ahl-al-Bayt-a.s/?page=familyTree` (`index.html`-এর canonical ও `sitemap.xml`-এর `?page=familyTree`-এর সঙ্গে মেলে)। ফাংশন/ID/ক্লাসের নাম বদলায়নি। দুটো ব্যবহারকারী একসঙ্গে ঠিক: `copyPersonCitation` (কপি/শেয়ার) ও `printPersonProfile` (প্রিন্ট ফুটার)। `sw.js` ক্যাশ → v159।

## ⚖️ নোট
- লিংক ফ্যামিলি ট্রি পেজে যায়, নির্দিষ্ট ব্যক্তির কার্ডে নয় (ব্যক্তি-ভিত্তিক ডিপ-লিংক প্যারামিটার অ্যাপে নেই)।
- ইচ্ছাকৃতভাবে ফিক্সড লিংক, `window.location` নয় (লোকালহোস্ট/প্রিভিউ থেকে কপিতে ভুল ঠিকানা ঢুকবে না)। কাস্টম ডোমেইনে গেলে এই স্ট্রিং আবার বদলাতে হবে।
