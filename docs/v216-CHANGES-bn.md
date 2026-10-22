# v211–v216 — প্রিমিয়াম ফিনিশ, লোকাল ফন্ট, ট্রানজিশন ও মোবাইল পালিশ

বেসলাইন: v210 · CACHE `ahlbayt-v216`

এই নোটটি পরে লেখা হয়েছে (v211–v216 তৈরির সময় আলাদা নোট লেখা হয়নি)। তথ্য `sw.js`-এর কমেন্ট ও আসল ফাইল (`style.css`, `index.html`, `assets/js/**`) মিলিয়ে নেওয়া। এই নোট যোগ করতে কোনো কোড, CSS বা CACHE বদলায়নি।

## সারাংশ
| সংস্করণ | বিষয় | কোথায় |
|---|---|---|
| v211 | প্রিমিয়াম ফিনিশ লেয়ার (শ্যাডো, ইজিং, সোনালি হেয়ারলাইন, টাইপোগ্রাফি) | `style.css`-এর শেষে একটি ব্লক |
| v212 | লোকাল ফন্ট (Poppins / Amiri / Noto Serif Bengali) | `assets/fonts/ff-*.woff2`, `style.css` `@font-face`, `index.html`, `sw.js` |
| v213 | `transition: all` → নির্দিষ্ট প্রপার্টি তালিকা (CSS) | `style.css`-এর শেষ ব্লক |
| v214 | ইনলাইন `transition:all` → নির্দিষ্ট প্রপার্টি তালিকা (JS টেমপ্লেট) | `script-2-ui.js`, `script-3-pages.js`, `ahlul-bayt-unified.js`, `blog.js` |
| v215 | মোবাইল ফিনিশ (ট্যাপ, শিট, dvh) | `style.css`-এর শেষ ব্লক |
| v216 | v211-এর নিজের দুটি টিউনিং ফিক্স | `style.css` (v211 ব্লকের ভেতর) |

## v211 — প্রিমিয়াম ফিনিশ লেয়ার (শুধু CSS)
`style.css`-এর একদম শেষে একটি ব্লক যোগ হয়েছে। আগের কোনো রুল বদলায়নি, মার্কআপ/JS/টেক্সট অপরিবর্তিত। ব্লকটি মুছলেই v210-এর অবস্থায় ফেরা যায়।
1. **স্তরযুক্ত শ্যাডো:** `--shadow-xs … --shadow-xl`, `--app-shadow-sm`, `--shadow-card`, `--shadow-card-hover` টোকেন নতুন করে সংজ্ঞায়িত। লাইট মোডে গাঢ় পান্না-রঙা, ডার্ক মোডে স্তরযুক্ত কালো। যেসব কম্পোনেন্ট আগে থেকেই এই টোকেন পড়ে, তারা নিজে থেকেই নতুন শ্যাডো পায়।
2. **একই ইজিং কার্ভ:** `--ease-premium` চালু; `--t-fast` (.16s), `--t-base` (.28s), `--t-slow` (.48s) এখন এই কার্ভ ব্যবহার করে। `prefers-reduced-motion: reduce` হলে তিনটিই প্রায় শূন্য (.01s)।
3. **সোনালি হেয়ারলাইন:** `--hairline-gold` টোকেন ও `outline: 1px solid` + `outline-offset: -1px` (কোনো `::before/::after` বা ট্রানজিশনে হাত পড়েনি)। প্রযোজ্য ক্লাস v216-এর পর নিচে দেখুন।
4. **টাইপোগ্রাফি:** শিরোনামে `text-wrap: balance`; অনুচ্ছেদ/তালিকা/উদ্ধৃতিতে `text-wrap: pretty` (আরবি ও `dir="rtl"` বাদে)।
5. **ছোট ফিনিশ:** `::selection` রং (লাইট ও ডার্ক আলাদা), `accent-color` ও `caret-color`, `html { scroll-padding-top: 84px }` (অ্যাঙ্কর/`scrollIntoView` স্টিকি হেডারের নিচে ঢুকবে না)।

## v212 — লোকাল ফন্ট
- Poppins (৪০০–৯০০, ল্যাটিন), Amiri (৪০০/৭০০, আরবি ও ল্যাটিন), Noto Serif Bengali (৪০০/৬০০/৭০০, বাংলা ও ল্যাটিন) এখন নিজস্ব সার্ভার থেকে আসে: `assets/fonts/ff-*.woff2`।
- `style.css`-এর শেষে ১৬টি `@font-face` (ফন্ট-পরিবারের নাম আগের মতোই, তাই বিদ্যমান `font-family` রুল অপরিবর্তিত); `font-display: swap`; `unicode-range` থাকায় যে লিপির লেখা আসে শুধু সেই ফাইলই নামে।
- `index.html` থেকে Google Fonts `<link>`/`preconnect` সরানো (এখন `fonts.googleapis`/`fonts.gstatic` উল্লেখ নেই; `cdnjs` preconnect আগের মতো আছে)।
- ফন্ট ফাইলগুলো `sw.js`-এর STATIC precache তালিকায় যোগ হয়েছে, তাই প্রথম লোড ও অফলাইন একই রকম।
- `assets/fonts/`-এ মোট ২৫টি ফাইল (~৮৬৪ KB); এর মধ্যে `rc-*.woff2` (রমজান কার্ডের ফন্ট) v200 থেকে আগে থেকেই ছিল।

## v213 — `transition: all` (CSS)
`transition: all` লেআউট-সংক্রান্ত প্রপার্টিও (padding, margin, font-size, width/height) অ্যানিমেট করে ও ব্রাউজারকে সব প্রপার্টি ট্র্যাক করায়। ৯টি রুলের জন্য শেষ ব্লকে ওভাররাইড যোগ হয়েছে: একই সিলেক্টর, সময়/ইজিং আগের মতো, শুধু কোন প্রপার্টি অ্যানিমেট হবে তা সংকুচিত।
- `.nav-pill`, `.bnav-btn`, `#scroll-top-btn`, `.prayer-row`, `.quiz-option`, `.quiz-cat-card`, `.quiz-pill` → `color, background, border-color, box-shadow, transform, opacity`
- `.bnav-btn` আলাদা করে `filter` সহ; `.prayer-row` `border-left-color` সহ
- `.nav-pill::after` → `left, right, height, opacity, box-shadow`
- `.imam-coverflow-dot` → `width, border-radius, background, opacity` (যেসব উপাদানের width/left/right সত্যিই অ্যানিমেট হয় তারা সেগুলো রেখেছে)
- মূল `transition: all` লাইনগুলো `style.css`-এ আগের জায়গাতেই আছে (additive-only নিয়ম); ওভাররাইডই কার্যকর। ব্লকটি মুছলে v212-এর আচরণে ফেরে।

## v214 — ইনলাইন `transition:all` (JS টেমপ্লেট)
`script-2-ui.js`, `script-3-pages.js`, `ahlul-bayt-unified.js`, `blog.js`-এর টেমপ্লেটে ২৫টি ইনলাইন `transition:all` ছিল; সবগুলো `color/background/border-color/box-shadow/transform/opacity`-এ সংকুচিত, সময় একই। JS-এর আর কিছু বদলায়নি। যাচাই: `assets/js/**`-এ এখন `transition: all` খুঁজে পাওয়া যায় না (০টি)।

## v215 — মোবাইল ফিনিশ (শুধু CSS, `style.css`-এর শেষ ব্লক)
1. **শুধু টাচ ডিভাইসে** (`hover: none` + `pointer: coarse`; ডেস্কটপ অপরিবর্তিত):
   - বাটন ও ক্লিকযোগ্য কার্ডে (`.card-luxury`, `.kc-card`, `.kcx-card`, `.dc-card`) ধূসর/নীল ট্যাপ-ফ্ল্যাশ বন্ধ (`-webkit-tap-highlight-color: transparent`); বাটনে iOS লং-প্রেস callout বন্ধ। লেখা সিলেক্ট করা যায় আগের মতোই।
   - ক্লিকযোগ্য কার্ডে `:active`-এ `scale(.985)` (শুধু `prefers-reduced-motion: no-preference`-এ)।
2. **বটম শিট (<৬৪০px):** উপরের কোণ `28px`; `.modal`, `.modal-content`, `.pl-sheet`, `.pl-sheet-card`-এ `overscroll-behavior: contain` (শিটের ভেতরে স্ক্রল করলে পেছনের পেজ নড়ে না)।
3. **dvh:** `.modal-content` `88dvh`, `.pl-sheet-card` `80dvh`; স্প্ল্যাশের উচ্চতা `100dvh` (সেফ-এরিয়া ইনসেট বাদ দিয়ে `--sp-h`) — অ্যাড্রেস বার ওঠানামা করলে শিট/স্প্ল্যাশ লাফায় না। সবটাই `@supports (height: 100dvh)`-এর ভেতরে।

## v216 — v211-এর টিউনিং (দুটি ফিক্স, শুধু CSS)
| # | সমস্যা | ফিক্স |
|---|---|---|
| ১ | v211-এর `html[lang="bn"] :where(p, li, blockquote) { line-height: 1.75 }` — `html[lang]`-এর specificity (0,1,1) হওয়ায় Tailwind-এর `.leading-*`, `.text-*` ও কম্পোনেন্টের নিজস্ব line-height (যেমন `.kcx-p` ১.৯৫) ছাপিয়ে যাচ্ছিল | রুলটি সরানো হয়েছে (ব্যাখ্যা-কমেন্ট রেখে); খালি `p`-এর নিজস্ব line-height ১.৭ আছেই |
| ২ | সোনালি হেয়ারলাইন `.kcx-card` ও `.quiz-cat-card`-এর নিজস্ব থিমড বর্ডারের ওপর রং চাপিয়ে দিচ্ছিল (`.kcx-card`-এর নিজস্ব বর্ডার; `.quiz-cat-card`-এর ২px ক্যাটাগরি-রঙা বর্ডার) | এখন শুধু `.card-luxury`, `.feature-card-luxury`, `.kc-card`-এ (যাদের বর্ডার শুধু নিরপেক্ষ Tailwind `border`) |

## যাচাই (এই নোট লেখার সময় ফাইল পড়ে মেলানো)
- `style.css`: v211 / v212 / v213 / v215 ব্লক ও v216-এর কমেন্ট উপস্থিত; v212 ব্লকে `@font-face` ১৬টি (Poppins ৬ + Amiri ৪ + Noto Serif Bengali ৬), প্রতিটির জন্য `assets/fonts/ff-*.woff2` ফাইল আছে।
- `assets/js/**`-এ `transition: all` ০টি; `style.css`-এ `transition: all` যুক্ত ৯টি আসল রুল আছে (সবই v213-এ কভার্ড), বাকি লাইনগুলো কমেন্ট।
- `index.html`-এ Google Fonts রেফারেন্স ০টি।

## সীমা
- এই নোট কোড বা CSS যাচাই নতুন করে চালায়নি; ফোনে চোখে দেখা (শিটের কোণ, ট্যাপ প্রেস, ফন্ট লোড, হেয়ারলাইন) বাকি।
- সম্ভাব্য পরবর্তী কাজ (অনুমোদন বাকি): ম্যানিফেস্টে `screenshots`, শিট swipe-to-dismiss ও grabber হ্যান্ডেল (JS লাগবে), পুল-টু-রিফ্রেশ বিষয়ে সিদ্ধান্ত, `content-visibility: auto` (শুধু স্ক্রল আটকালে)।
