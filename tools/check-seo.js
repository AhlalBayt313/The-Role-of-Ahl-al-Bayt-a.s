#!/usr/bin/env node
// =============================================================================
// check-seo.js  (v230)
// =============================================================================
// Guards the SEO work of v230 so it cannot quietly regress. Node only, changes nothing.
//   node tools/check-seo.js        exit 0 = fine, exit 1 = at least one problem
// For every p/*.html and d/*.html (and the two index pages) it checks:
//   - exactly one <h1>; a <title>; a meta description of 25–170 characters
//   - the canonical URL is the page's own address
//   - NO instant redirect (<meta http-equiv="refresh"> / location.replace) — that is what
//     made Google index the app shell instead of these pages
//   - every JSON-LD block parses
//   - enough visible text (>= 300 characters)
//   - titles and descriptions are unique across the site
// And for the site: sitemap.xml lists every p/ and d/ page once, has no ?page= duplicates,
// and 404.html exists and is noindex.
// =============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const problems = [];
const bad = m => problems.push(m);
const BASE = 'https://ahlalbayt313.github.io/The-Role-of-Ahl-al-Bayt-a.s/';
const titles = {}, descs = {};
let pages = 0;

['p', 'd'].forEach(dir => {
    fs.readdirSync(path.join(ROOT, dir)).filter(f => /\.html$/.test(f)).forEach(f => {
        pages++;
        const t = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
        const id = dir + '/' + f;
        const h1 = (t.match(/<h1[ >]/g) || []).length;
        if (h1 !== 1) bad(id + ': ' + h1 + ' <h1> (need exactly 1)');
        const title = (/<title>([\s\S]*?)<\/title>/.exec(t) || [])[1];
        if (!title) bad(id + ': no <title>'); else (titles[title] = titles[title] || []).push(id);
        const desc = (/<meta name="description" content="([^"]*)"/.exec(t) || [])[1];
        const dl = desc ? Array.from(desc.replace(/&#39;|&quot;|&amp;|&lt;|&gt;/g, 'x')).length : 0;
        if (!desc) bad(id + ': no meta description');
        else { if (dl < 25 || dl > 170) bad(id + ': description is ' + dl + ' characters (want 25–170)'); (descs[desc] = descs[desc] || []).push(id); }
        const want = BASE + (f === 'index.html' ? dir + '/' : dir + '/' + f);
        const canon = (/rel="canonical" href="([^"]*)"/.exec(t) || [])[1];
        if (canon !== want) bad(id + ': canonical is ' + canon + ' (want ' + want + ')');
        if (/http-equiv="refresh"/i.test(t) || /location\.replace\(/.test(t)) bad(id + ': still contains a redirect (use --stub only on purpose)');
        (t.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []).forEach(b => {
            try { JSON.parse(b.replace(/^<script[^>]*>|<\/script>$/g, '')); } catch (e) { bad(id + ': invalid JSON-LD (' + e.message + ')'); }
        });
        const body = t.slice(t.indexOf('<body>')).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (Array.from(body).length < 300) bad(id + ': only ' + Array.from(body).length + ' characters of visible text');
    });
});
Object.keys(titles).forEach(k => { if (titles[k].length > 1) bad('duplicate title "' + k + '": ' + titles[k].slice(0, 3).join(', ')); });
Object.keys(descs).forEach(k => { if (descs[k].length > 1) bad('duplicate description: ' + descs[k].slice(0, 3).join(', ')); });

const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = (sm.match(/<loc>[^<]+<\/loc>/g) || []).map(x => x.slice(5, -6));
if (locs.some(u => u.indexOf('?') > -1)) bad('sitemap.xml still lists a ?page= URL (they all canonicalise to the home page)');
['p', 'd'].forEach(dir => {
    fs.readdirSync(path.join(ROOT, dir)).filter(f => /\.html$/.test(f)).forEach(f => {
        const u = BASE + (f === 'index.html' ? dir + '/' : dir + '/' + f);
        if (locs.indexOf(u) < 0) bad('sitemap.xml is missing ' + u);
    });
});
if (!fs.existsSync(path.join(ROOT, '404.html')) || !/noindex/.test(fs.readFileSync(path.join(ROOT, '404.html'), 'utf8'))) bad('404.html missing or not noindex');

if (problems.length) {
    console.log('SEO check FAILED (' + problems.length + ' problem(s) in ' + pages + ' pages):');
    problems.slice(0, 25).forEach(x => console.log('  - ' + x));
    if (problems.length > 25) console.log('  … and ' + (problems.length - 25) + ' more');
    process.exit(1);
}
console.log('OK — ' + pages + ' pages: unique titles/descriptions, self-canonical, no redirects, JSON-LD valid, sitemap complete, 404.html present.');
