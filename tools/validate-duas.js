#!/usr/bin/env node
// =============================================================================
// validate-duas.js  (v224)
// =============================================================================
// Checks that data/duas/metadata.json (the light index the app loads first) and
// the full data files (data/duas/<category>.json, ziyarat.json, amal.json) agree,
// and that the generated share pages are current. Node only, changes nothing.
//   node tools/validate-duas.js          exit 0 = clean, exit 1 = problems found
// Errors  = something will break or mislead (missing/duplicate id, entry missing
//           from either side, category/title/sortOrder mismatch, no Arabic text,
//           bad id characters).
// Warnings = worth a look (no source, no meaning, no full data file entry text).
// Run it before committing data changes; CI can run it as is.
// =============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const errors = [], warns = [];
const E = m => errors.push(m), W = m => warns.push(m);

const meta = rd('data/duas/metadata.json');
const groups = [
    ['duas',     'dua',     null],
    ['ziyarats', 'ziyarat', meta.ziyaratFile || 'data/duas/ziyarat.json'],
    ['amals',    'amal',    meta.amalFile || 'data/duas/amal.json'],
];
const seen = {};
// Known, deliberate exceptions: entries that have no Arabic original by design (reported as a warning, not an error).
// v93 added ziyarat-sayyida-ruqayya-short as an English-translation salutation (its source line says no Arabic original was found).
const NO_ARABIC_OK = { 'ziyarat-sayyida-ruqayya-short': true };
const hasArabic = it => !!(it.arabic || (Array.isArray(it.verses) && it.verses.some(v => v && v.ar)));

groups.forEach(([key, type, file]) => {
    const lite = meta[key] || [];
    let full = [];
    if (file) full = rd(file);
    else Object.entries(meta.categoryFiles || {}).forEach(([cat, f]) => { rd(f).forEach(x => { x.__file = f; full.push(x); }); });
    const fullById = {};
    full.forEach(x => {
        if (x.id == null) { E(type + ': entry without id in a full file (' + (x.__file || file) + '): ' + JSON.stringify(x.titleBn || x.titleEn)); return; }
        if (fullById[x.id]) E(type + ': duplicate id in full files: ' + x.id);
        fullById[x.id] = x;
    });
    const liteById = {};
    lite.forEach(x => {
        const id = x && x.id;
        if (id == null || id === '') { E(type + ': index entry without id: ' + JSON.stringify(x && (x.titleBn || x.titleEn))); return; }
        if (!/^[A-Za-z0-9_-]{1,80}$/.test(String(id))) E(type + ': id has characters that break links: ' + id);
        if (liteById[id]) E(type + ': duplicate id in metadata.json: ' + id);
        liteById[id] = x;
        if (seen[id] && seen[id] !== type) E('id used by two kinds (' + seen[id] + ' and ' + type + '): ' + id);
        seen[id] = type;
        const f = fullById[id];
        if (!f) { E(type + ': in metadata.json but missing from the full file: ' + id); return; }
        if ((f.category || '') !== (x.category || '')) E(type + ' ' + id + ': category differs (index "' + x.category + '" vs full "' + f.category + '")');
        if ((f.titleBn || '') !== (x.titleBn || '')) E(type + ' ' + id + ': titleBn differs between index and full file');
        if ((f.sortOrder == null ? null : f.sortOrder) !== (x.sortOrder == null ? null : x.sortOrder)) E(type + ' ' + id + ': sortOrder differs (index ' + x.sortOrder + ' vs full ' + f.sortOrder + ')');
        if (!hasArabic(f) && !hasArabic(x)) (type === 'amal' || NO_ARABIC_OK[id] ? W : E)(type + ' ' + id + ': no Arabic text' + (type === 'amal' ? ' (fine for a letter/instruction-style amal)' : NO_ARABIC_OK[id] ? ' (allowed: no Arabic original by design)' : ' at all'));
        if (!(x.source || f.source)) W(type + ' ' + id + ': no source');
        if (!(x.meaningBn || f.meaningBn || (Array.isArray(f.verses) && f.verses.some(v => v && v.bn)))) W(type + ' ' + id + ': no Bengali meaning');
    });
    Object.keys(fullById).forEach(id => { if (!liteById[id]) E(type + ': in the full file but missing from metadata.json: ' + id); });
    console.log(type.padEnd(8) + ' index ' + String(lite.length).padStart(3) + ' | full ' + String(full.length).padStart(3));
});

const pages = spawnSync(process.execPath, [path.join(__dirname, 'build-dua-share-pages.js'), '--check'], { encoding: 'utf8' });
if (pages.status !== 0) E('share pages out of date — run: node tools/build-dua-share-pages.js');

warns.slice(0, 20).forEach(w => console.log('  warn  ' + w));
if (warns.length > 20) console.log('  … and ' + (warns.length - 20) + ' more warning(s)');
errors.slice(0, 40).forEach(e => console.log('  ERROR ' + e));
if (errors.length > 40) console.log('  … and ' + (errors.length - 40) + ' more error(s)');
console.log(errors.length ? '\nFAILED: ' + errors.length + ' error(s), ' + warns.length + ' warning(s)' : '\nOK: no errors, ' + warns.length + ' warning(s)');
process.exit(errors.length ? 1 : 0);
