// =============================================================================
// seo-page.js  (v230)
// =============================================================================
// Shared HTML template for the static "landing" pages that
//   tools/build-share-pages.js       -> p/<id>.html, p/index.html   (blog posts)
//   tools/build-dua-share-pages.js   -> d/<id>.html, d/index.html   (dua / ziyarat / amal)
// write. Not a command of its own; Node only, no packages.
//
// WHY THESE PAGES EXIST
//   Until v229 every p/ and d/ page was a stub: a title, one line of text and an
//   instant redirect into the single-page app. Google treats an instant meta
//   refresh as a permanent redirect and shows the redirect TARGET, which is the
//   app shell (canonical = home page). So none of the 586 pages could ever rank
//   as content. Now each page carries the full text, its own title / description /
//   canonical / structured data, and an "open in the app" button instead of a
//   redirect. (Run the builders with --stub to get the old redirect stubs back.)
//
// Pages sit exactly one folder below the site root, so every relative link
// below starts with "../" (site root) or is a sibling file.
// =============================================================================
'use strict';

const SITE_NAME = 'আহলে বাইত (আ.) | Ahl al-Bayt (a.s)';
const BRAND = 'আহলে বাইত (আ.)';

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const oneLine = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const len = s => Array.from(s).length;

// Cut at about n characters, preferably at a word boundary, and add an ellipsis.
function clip(s, n) {
    const a = Array.from(s);
    if (a.length <= n) return s;
    let cut = a.slice(0, n - 1);
    const sp = cut.lastIndexOf(' ');
    if (sp > n * 0.6) cut = cut.slice(0, sp);
    return cut.join('').replace(/[\s,;:—–-]+$/, '') + '…';
}

// First candidate "core + tail" that fits a search-result title (about 60 characters);
// otherwise the bare core (never cut: it is also the page's <h1>).
function makeTitle(core, tails) {
    for (let i = 0; i < tails.length; i++) {
        const s = core + tails[i];
        if (len(s) <= 60) return s;
    }
    return core;
}

// JSON for a <script type="application/ld+json"> block ('<' escaped so nothing can close the tag).
const jsonLd = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

// category slug -> Bengali label (mirrors dzxDuaCatFilters / dzxZiyaratCatFilters / dzxAmalCatFilters in
// assets/js/core/script-3-pages.js; the builders report any slug that is missing here)
const DUA_CATS = [
    ['morning', 'সকাল'], ['night', 'রাত'], ['hardship', 'বিপদে'], ['gratitude', 'কৃতজ্ঞতা'], ['daily', 'দৈনন্দিন'],
    ['special-days', 'সাপ্তাহিক'], ['ramadan', 'রমজান'], ['family', 'পরিবার'], ['forgiveness', 'ক্ষমা'],
    ['ahlul-bayt', 'আহলুল বাইত'], ['hajj-umrah', 'হজ্জ-উমরাহ'], ['healing', 'আরোগ্য'], ['knowledge', 'জ্ঞান'],
    ['patience', 'ধৈর্য'], ['protection', 'সুরক্ষা'], ['quranic', 'কুরআনিক'], ['rizq', 'রিযিক'],
    ['sahifa-sajjadiya', 'সহিফা সাজ্জাদিয়া'], ['tasbih', 'তাসবিহ'], ['zikr', 'যিকর']
];
const ZIYARAT_CATS = [['imams', '১২ ইমামের যিয়ারত'], ['masumeen', 'মাসুম (আ.)'], ['comprehensive', 'জামে/সার্বজনীন']];
const AMAL_CATS = [['daily', 'দৈনন্দিন'], ['weekly', 'সাপ্তাহিক'], ['ramadan', 'রমজান'], ['special', 'বিশেষ']];

const CSS = [
    "@font-face{font-family:'Noto Serif Bengali';font-weight:400;font-display:swap;src:url('../assets/fonts/ff-noto-serif-bengali-bengali-400.woff2') format('woff2');unicode-range:U+0951-0952,U+0964-0965,U+0980-09FE,U+200C-200D,U+20B9,U+25CC}",
    "@font-face{font-family:'Noto Serif Bengali';font-weight:700;font-display:swap;src:url('../assets/fonts/ff-noto-serif-bengali-bengali-700.woff2') format('woff2');unicode-range:U+0951-0952,U+0964-0965,U+0980-09FE,U+200C-200D,U+20B9,U+25CC}",
    "@font-face{font-family:'Amiri';font-weight:400;font-display:swap;src:url('../assets/fonts/ff-amiri-arabic-400.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}",
    ':root{color-scheme:light dark;--bg:#f7faf8;--fg:#1f2937;--mut:#5b6472;--acc:#047857;--card:#fff;--bd:#dfe7e2;--note:#92400e}',
    '@media(prefers-color-scheme:dark){:root{--bg:#061410;--fg:#e5e7eb;--mut:#9ca3af;--acc:#34d399;--card:#0b1f19;--bd:#1f3a31;--note:#fcd34d}}',
    '*{box-sizing:border-box}',
    'body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.9 "Noto Serif Bengali","Noto Sans Bengali",Georgia,serif}',
    'a{color:var(--acc)}',
    '.top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;max-width:860px;margin:0 auto;padding:14px 18px}',
    '.brand{font-weight:700;text-decoration:none}',
    'a.btn{display:inline-block;padding:.55em 1.15em;border-radius:.7em;background:#047857;color:#fff;text-decoration:none;font-weight:700;line-height:1.5}',
    'main{max-width:860px;margin:0 auto;padding:6px 18px 40px}',
    '.crumbs{font-size:.85rem;color:var(--mut);margin:0 0 10px}.crumbs a{color:var(--mut)}',
    'article,.box{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:22px 22px 26px}',
    'h1{font-size:1.75rem;line-height:1.45;margin:.1em 0 .35em}h2{font-size:1.25rem;margin:1.6em 0 .5em}h3{font-size:1.05rem;margin:1.3em 0 .3em;color:var(--note)}',
    '.sub,.meta{color:var(--mut);margin:.2em 0;font-size:.95rem}',
    '.lead{font-size:1.05rem;margin:1em 0}',
    '.prose{white-space:pre-line}',
    '.v{padding:14px 0;border-top:1px solid var(--bd)}',
    '.ar{font-family:"Amiri","Noto Naskh Arabic","Scheherazade New","Traditional Arabic",serif;font-size:1.65rem;line-height:2.4;text-align:right;margin:0 0 .35em}',
    '.tr{color:var(--mut);font-style:italic;margin:.2em 0}.bn{margin:.2em 0}',
    '.rep{display:inline-block;font-size:.8rem;border:1px solid var(--bd);border-radius:99px;padding:0 .7em;color:var(--mut)}',
    '.note{color:var(--note);margin:.9em 0}',
    '.src{font-size:.92rem;color:var(--mut)}.src p{margin:.3em 0}',
    '.en{margin-top:2em;padding-top:1em;border-top:2px solid var(--bd);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.75}',
    '.related ul,.idx ul{padding-left:1.2em;margin:.4em 0}.related li,.idx li{margin:.25em 0}',
    '.idx h2{border-bottom:1px solid var(--bd);padding-bottom:.2em}.idx .n{color:var(--mut);font-size:.8rem}',
    'footer{max-width:860px;margin:0 auto;padding:0 18px 34px;color:var(--mut);font-size:.85rem}',
    '@media(max-width:520px){h1{font-size:1.45rem}.ar{font-size:1.45rem}article,.box{padding:16px}}'
].join('\n');

// opts: { title, desc, url, base, type ('article'|'website'), published, section,
//         jsonld: [objects], crumbs: [{name, href, abs}], appHref, appLabel, body }
function page(o) {
    const img = o.base + 'og-image.jpg';
    const head = [
        '<!DOCTYPE html>', '<html lang="bn">', '<head>', '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>' + esc(o.title) + '</title>',
        '<meta name="description" content="' + esc(o.desc) + '">',
        '<meta name="robots" content="index, follow, max-image-preview:large">',
        '<link rel="canonical" href="' + esc(o.url) + '">',
        '<link rel="icon" href="../favicon.ico">',
        '<meta property="og:type" content="' + (o.type || 'article') + '">',
        '<meta property="og:site_name" content="' + esc(SITE_NAME) + '">',
        '<meta property="og:title" content="' + esc(o.ogTitle || o.title) + '">',
        '<meta property="og:description" content="' + esc(o.desc) + '">',
        '<meta property="og:url" content="' + esc(o.url) + '">',
        '<meta property="og:image" content="' + esc(img) + '">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:locale" content="bn_BD">'
    ];
    if (o.published) head.push('<meta property="article:published_time" content="' + esc(o.published) + '">');
    if (o.section) head.push('<meta property="article:section" content="' + esc(o.section) + '">');
    head.push(
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + esc(o.ogTitle || o.title) + '">',
        '<meta name="twitter:description" content="' + esc(o.desc) + '">',
        '<meta name="twitter:image" content="' + esc(img) + '">'
    );
    const crumbs = o.crumbs || [];
    if (crumbs.length) {
        head.push('<script type="application/ld+json">' + jsonLd({
            '@context': 'https://schema.org', '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.abs }))
        }) + '</script>');
    }
    (o.jsonld || []).forEach(j => head.push('<script type="application/ld+json">' + jsonLd(j) + '</script>'));
    head.push('<style>' + CSS + '</style>', '</head>', '<body>');
    const nav = crumbs.length
        ? '<nav class="crumbs" aria-label="breadcrumb">' + crumbs.map((c, i) =>
            i === crumbs.length - 1 ? esc(c.name) : '<a href="' + esc(c.href) + '">' + esc(c.name) + '</a>').join(' › ') + '</nav>'
        : '';
    return head.concat([
        '<header class="top"><a class="brand" href="../">' + esc(SITE_NAME) + '</a>' +
            (o.appHref ? '<a class="btn" href="' + esc(o.appHref) + '">📱 ' + esc(o.appLabel || 'অ্যাপে খুলুন') + '</a>' : '') + '</header>',
        '<main>', nav, o.body, '</main>',
        '<footer><a href="../">' + esc(SITE_NAME) + '</a> — বাংলা ও ইংরেজিতে দোয়া, যিয়ারত, ইমামদের জীবনী ও ইসলামী জ্ঞান।</footer>',
        '</body>', '</html>', ''
    ]).join('\n');
}

module.exports = { SITE_NAME, BRAND, esc, oneLine, len, clip, makeTitle, jsonLd, page, DUA_CATS, ZIYARAT_CATS, AMAL_CATS };
