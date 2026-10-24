#!/usr/bin/env node
// =============================================================================
// check-all.js  (v226)
// =============================================================================
// ONE command that runs every project check, so nothing is forgotten before a
// delivery / git push. Node only, no packages, changes nothing.
//
//   node tools/check-all.js          exit 0 = all clear, exit 1 = something failed
//
// What it runs (each step is an existing tool or a small new check):
//   1  node --check on every .js file: assets/js/**, sw.js, tools/*.js
//   2  JSON / XML well-formedness: every data/**/*.json, manifest.json, sitemap.xml
//   3  tools/phase4a-smoke-test.js      (function existence, bilingual gaps, duplicate
//                                        ids, load order, SW precache coverage ...)
//   4  tools/validate-duas.js           (metadata.json index <-> full dua/ziyarat/amal
//                                        files, and the d/ share pages are current)
//   5  tools/build-share-pages.js --check   (blog share pages p/ are current)
//   8  Ramadan lazy group (v232): group order, ramadan-lazy.js position, daily-amal/qaza-fidya still eager
//   7  tools/check-seo.js              (v230: p/ d/ pages have text, unique title/description,
//                                        self-canonical, no redirect; sitemap complete; 404.html)
//   6  Service worker: every file listed in sw.js STATIC exists on disk, and the
//      CACHE name is a plain 'ahlbayt-v<number>'
//
// Order matters only for readability: a failing step never stops the later ones,
// so one run shows EVERY problem. The last lines are the summary.
// =============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const results = [];
const record = (name, ok, detail) => {
    results.push({ name: name, ok: ok });
    console.log((ok ? '  [PASS]  ' : '  [FAIL]  ') + name + (detail ? '\n           ' + detail : ''));
};

function walk(dir, test, out) {
    out = out || [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
        if (e.name === 'node_modules' || e.name.charAt(0) === '.') return;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, test, out);
        else if (test(p)) out.push(p);
    });
    return out;
}

function runTool(label, script, args) {
    console.log('\n--- ' + label + ' ---');
    const r = spawnSync(process.execPath, [path.join(__dirname, script)].concat(args || []), { cwd: ROOT, encoding: 'utf8' });
    const text = ((r.stdout || '') + (r.stderr || '')).trimEnd();
    if (text) console.log(text.split('\n').map(l => '    ' + l).join('\n'));
    record(label, r.status === 0, r.status === 0 ? '' : 'exit code ' + r.status);
}

// ---- 1. syntax ---------------------------------------------------------------
console.log('--- 1. JS syntax (node --check) ---');
{
    const files = walk(path.join(ROOT, 'assets', 'js'), p => /\.js$/.test(p))
        .concat([path.join(ROOT, 'sw.js')])
        .concat(walk(path.join(ROOT, 'tools'), p => /\.js$/.test(p)));
    const bad = [];
    files.forEach(f => {
        const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
        if (r.status !== 0) bad.push(rel(f) + '\n' + (r.stderr || '').split('\n').slice(0, 4).join('\n'));
    });
    record('JS syntax (' + files.length + ' files)', bad.length === 0, bad.join('\n'));
}

// ---- 2. data files parse -----------------------------------------------------
console.log('\n--- 2. JSON / XML well-formedness ---');
{
    const jsons = walk(path.join(ROOT, 'data'), p => /\.json$/.test(p)).concat([path.join(ROOT, 'manifest.json')]);
    const bad = [];
    jsons.forEach(f => { try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { bad.push(rel(f) + ': ' + e.message); } });
    record('JSON parses (' + jsons.length + ' files)', bad.length === 0, bad.join('\n'));

    const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const opens = (xml.match(/<url>/g) || []).length, closes = (xml.match(/<\/url>/g) || []).length;
    const locs = (xml.match(/<loc>[^<]+<\/loc>/g) || []);
    const dup = locs.filter((l, i) => locs.indexOf(l) !== i);
    const okXml = /^<\?xml/.test(xml) && /<\/urlset>\s*$/.test(xml) && opens === closes && opens === locs.length && dup.length === 0;
    record('sitemap.xml (' + opens + ' urls)', okXml,
        okXml ? '' : 'unbalanced <url> tags, missing <loc>, or duplicate <loc> (' + dup.slice(0, 3).join(' ') + ')');
}

// ---- 3-5. existing tools -----------------------------------------------------
runTool('3. smoke test (phase4a-smoke-test.js)', 'phase4a-smoke-test.js');
runTool('4. dua data + share pages (validate-duas.js)', 'validate-duas.js');
runTool('5. blog share pages (build-share-pages.js --check)', 'build-share-pages.js', ['--check']);

runTool('7. SEO of p/ d/ pages + sitemap (check-seo.js)', 'check-seo.js');

// ---- 6. service worker -------------------------------------------------------
console.log('\n--- 6. Service worker ---');
{
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const cache = /const CACHE = '([^']*)'/.exec(sw);
    record('CACHE name', !!cache && /^ahlbayt-v\d+$/.test(cache[1]), cache ? cache[1] : 'const CACHE not found');
    const block = /const STATIC = \[([\s\S]*?)\n\];/.exec(sw);
    if (!block) {
        record('sw.js STATIC list', false, 'const STATIC = [ ... ]; block not found');
    } else {
        const entries = (block[1].match(/'(\.[^']*)'/g) || []).map(s => s.slice(1, -1));
        const missing = entries.filter(u => {
            const f = u === './' ? 'index.html' : u.replace(/^\.\//, '').split('?')[0];
            return !fs.existsSync(path.join(ROOT, f));
        });
        const dup = entries.filter((u, i) => entries.indexOf(u) !== i);
        record('sw.js STATIC list (' + entries.length + ' entries all exist, no duplicates)', missing.length === 0 && dup.length === 0,
            (missing.length ? 'listed but missing on disk: ' + missing.join(', ') + '\n           ' : '') + (dup.length ? 'listed twice: ' + dup.join(', ') : ''));
    }
}

// ---- 8. Ramadan lazy group (v232) --------------------------------------------
console.log('\n--- 8. Ramadan lazy group ---');
{
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const ll = fs.readFileSync(path.join(ROOT, 'assets/js/core/lazy-loader.js'), 'utf8');
    const m = /ramadan:\s*\{\s*files:\s*\[([^\]]*)\]/.exec(ll);
    const files = m ? (m[1].match(/'([^']+)'/g) || []).map(x => x.slice(1, -1)) : [];
    const want = ['ramadan-plus.js', 'ramadan-cardart.js', 'iftar-invite.js', 'qadr-walk.js', 'ramadan-journal.js', 'ramadan-home.js', 'ramadan-layout.js'];
    const pos = f => html.indexOf('src="assets/js/core/' + f + '"');
    const probs = [];
    if (files.join() !== want.join()) probs.push('lazy group "ramadan" is [' + files.join(', ') + '] — each file wraps renderRamadanPage, so the order must stay [' + want.join(', ') + '] (ramadan-layout.js LAST)');
    if (!(pos('lazy-loader.js') > -1 && pos('lazy-loader.js') < pos('ramadan-lazy.js') && pos('ramadan-lazy.js') < pos('script-4-boot.js'))) probs.push('ramadan-lazy.js must be a <script> tag between lazy-loader.js and script-4-boot.js');
    want.forEach(f => { if (pos(f) > -1) probs.push(f + ' is back in index.html (it would run twice)'); });
    ['daily-amal.js', 'qaza-fidya.js'].forEach(f => { if (pos(f) < 0) probs.push(f + ' must stay eager (home card / Khums ledger)'); });
    record('Ramadan group: order, gate position, eager neighbours', probs.length === 0, probs.join('\n           '));
}

// ---- summary -----------------------------------------------------------------
const failed = results.filter(r => !r.ok);
console.log('\n================================================');
console.log(failed.length
    ? 'FAILED — ' + failed.length + ' of ' + results.length + ' checks:\n  - ' + failed.map(r => r.name).join('\n  - ')
    : 'ALL CLEAR — ' + results.length + ' checks passed.');
process.exit(failed.length ? 1 : 0);
