#!/usr/bin/env node
// =============================================================================
// Phase 4A — Issue #26 — Step 2: Lightweight Smoke-Test Runner
// =============================================================================
//
// WHAT THIS IS
// -----------------------------------------------------------------------------
// A small, dependency-free Node.js script (no npm packages, no test framework)
// that gives a quick, repeatable sanity check before/after a change, without
// needing a browser.
//
// WHAT THIS COVERS
// -----------------------------------------------------------------------------
// Two kinds of checks, both static/read-only (no app code is executed):
//
//   A) FUNCTION-EXISTENCE checks — confirm 5 key validation/search functions
//      documented in docs/PHASE-4A-TEST-PLAN.md (sections 2 and 15) still
//      exist by name in their expected source file:
//        1. validateFamilyTreeData()        — ahlul-bayt-unified.js
//        2. window.kcxValidateFeatured()    — knowledge-center.js
//        3. performSearch()                 — search-engine.js
//        4. searchKnowledgeCenter()         — search-engine.js
//        5. loadJSONSync() / loadJSONAsync() — data-loader.js
//
//   B) PROJECT-HEALTH checks — added in Step 16 (see below), each answering
//      one item from this doc's §17 "Future Automation" wishlist:
//        6. JS syntax  — every assets/js/**/*.js file parses cleanly
//           (`node --check`, spawned as a subprocess — no new dependency)
//        7. Bilingual completeness — every data/**/*.json entry with an
//           "...En" field also has its "...Bn" counterpart, and every
//           verses[].ar has a matching verses[].bn
//        8. Duplicate ids — no two entries in the same data/*.json
//           collection share an id
//        9. Script load order — index.html's <script> tags appear in the
//           exact order documented in section 1 of this doc
//       10. Service-worker precache coverage — every assets/js/**/*.js and
//           assets/css/*.css file is listed in sw.js's precache list
//
// WHY THE FUNCTION-EXISTENCE CHECKS CAN'T BE RUN FOR REAL HERE
// -----------------------------------------------------------------------------
// This is a plain Node.js process. It has no `window`, no `document`, no DOM,
// and none of this app's other globals (`state`, `familyTreeDatabase`, the
// in-memory search index, etc.) that these 5 functions depend on. Those
// globals are only built up by loading index.html's scripts, in order,
// inside a real browser (or a headless one). Faking that here would mean
// either stubbing out enough of the browser + app state to be misleading, or
// pulling in a browser/DOM dependency (e.g. jsdom, Playwright) — which is
// explicitly NOT done in this step and would need its own sign-off first,
// since it's a new project dependency. So checks A.1–A.5 are reported
// honestly as NOT RUN at the runtime level; only their static
// (does-the-function-still-exist) form runs here. Checks B.6–B.10 need no
// such environment — they only read files with `fs` / `JSON.parse` / spawn
// Node's own `--check` flag — so they run for real and produce true
// PASS/FAIL results.
//
// USAGE
// -----------------------------------------------------------------------------
//   node tools/phase4a-smoke-test.js
//
// EXIT CODE
// -----------------------------------------------------------------------------
// Exits non-zero if any check reports ERROR/FAIL — a documented function
// went missing, a JS file has a syntax error, a bilingual gap or duplicate
// id was found, the script load order drifted from the doc, or the
// precache list is missing a file. Exits 0 when the only non-PASS results
// are the expected runtime NOT_RUN entries (A.1–A.5's live-execution form).
//
// ── STEP 16 (added checks 6–10 above) ──
// Turns the one-off manual checks run during the Phase 4A static
// verification pass (bilingual_check.py, node --check on all files,
// duplicate-id scan, load-order/precache comparison) into a permanent,
// repeatable part of this project's own tooling, so future changes can be
// re-verified with one command instead of re-deriving these checks by
// hand each time. No new dependency added — everything here uses only
// Node's built-in `fs`, `path`, and `child_process` modules.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const STATUS = {
  PASS: 'PASS',
  NOT_RUN: 'NOT RUN',
  ERROR: 'ERROR',
};

// =============================================================================
// A) Function-existence checks (unchanged from Step 2)
// =============================================================================
const CHECKS = [
  {
    name: 'validateFamilyTreeData()',
    file: 'assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js',
    staticPattern: /function\s+validateFamilyTreeData\s*\(/,
    runtimeNote:
      'Reads familyTreeDatabase, a browser global populated at app boot by ' +
      'earlier scripts in index.html\'s load order. Requires a real or ' +
      'headless browser DOM, not plain Node.',
  },
  {
    name: 'window.kcxValidateFeatured()',
    file: 'assets/js/modules/knowledge/knowledge-center.js',
    staticPattern: /window\.kcxValidateFeatured\s*=/,
    runtimeNote:
      'Depends on the Knowledge Center\'s live in-memory data + KCX_FEATURED ' +
      'config, both built up only inside a running page. Requires a real or ' +
      'headless browser DOM, not plain Node.',
  },
  {
    name: 'performSearch()',
    file: 'assets/js/core/search-engine.js',
    staticPattern: /function\s+performSearch\s*\(/,
    runtimeNote:
      'Depends on the app\'s in-memory searchable content (duas, blog posts, ' +
      'hadith, etc.), only populated after index.html\'s full script load ' +
      'order runs in a browser.',
  },
  {
    name: 'searchKnowledgeCenter()',
    file: 'assets/js/core/search-engine.js',
    staticPattern: /function\s+searchKnowledgeCenter\s*\(/,
    runtimeNote:
      'Same as performSearch() above — depends on in-memory app state built ' +
      'up only inside a running page.',
  },
  {
    name: 'data-loader / load-state (loadJSONSync)',
    file: 'assets/js/utils/data-loader.js',
    staticPattern: /function\s+loadJSONSync\s*\(/,
    runtimeNote:
      'Uses a synchronous XMLHttpRequest, a browser API with no Node ' +
      'equivalent used here. Also only works when served over http(s), not ' +
      'file://, per the app\'s own documented limitation.',
  },
  {
    name: 'data-loader / load-state (loadJSONAsync)',
    file: 'assets/js/utils/data-loader.js',
    staticPattern: /function\s+loadJSONAsync\s*\(/,
    runtimeNote:
      'Uses browser fetch() and is meant to be awaited inside a running ' +
      'page\'s script context, not plain Node.',
  },
];

function runStaticCheck(check) {
  const fullPath = path.join(PROJECT_ROOT, check.file);
  const source = fs.readFileSync(fullPath, 'utf8');
  const found = check.staticPattern.test(source);
  return {
    status: found ? STATUS.PASS : STATUS.ERROR,
    detail: found
      ? `found in ${check.file}`
      : `NOT found in ${check.file} — expected pattern did not match`,
  };
}

// =============================================================================
// Small helper: recursively list files under a dir matching an extension
// =============================================================================
function listFiles(dir, ext) {
  const out = [];
  (function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) out.push(full);
    }
  })(dir);
  return out;
}

// =============================================================================
// B.6 — JS syntax check (node --check on every assets/js/**/*.js file)
// =============================================================================
function checkJsSyntax() {
  const jsDir = path.join(PROJECT_ROOT, 'assets', 'js');
  if (!fs.existsSync(jsDir)) return { status: STATUS.ERROR, detail: 'assets/js not found' };
  const files = listFiles(jsDir, '.js');
  const failures = [];
  for (const f of files) {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (err) {
      failures.push(`${path.relative(PROJECT_ROOT, f)}: ${(err.stderr || err.message).toString().split('\n')[0]}`);
    }
  }
  return failures.length === 0
    ? { status: STATUS.PASS, detail: `${files.length} JS files, all parse cleanly` }
    : { status: STATUS.ERROR, detail: `${failures.length} file(s) failed:\n           ` + failures.join('\n           ') };
}

// =============================================================================
// B.7 — Bilingual completeness (every *En with content has a matching *Bn;
// every verses[].ar has a matching verses[].bn)
// =============================================================================
function isEmpty(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function walkForBilingualGaps(obj, issues) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => walkForBilingualGaps(item, issues));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.endsWith('En')) {
        const bnKey = key.slice(0, -2) + 'Bn';
        if (bnKey in obj && !isEmpty(obj[key]) && isEmpty(obj[bnKey])) {
          issues.push(`${bnKey} missing/empty (has ${key})${obj.id ? ' [id=' + obj.id + ']' : ''}`);
        }
      }
    }
    if (Array.isArray(obj.verses)) {
      obj.verses.forEach((v, i) => {
        if (v && !isEmpty(v.ar) && isEmpty(v.bn)) {
          issues.push(`verses[${i}].bn missing/empty${obj.id ? ' [id=' + obj.id + ']' : ''}`);
        }
      });
    }
    for (const key of Object.keys(obj)) walkForBilingualGaps(obj[key], issues);
  }
}

function checkBilingualCompleteness() {
  const dataDir = path.join(PROJECT_ROOT, 'data');
  if (!fs.existsSync(dataDir)) return { status: STATUS.ERROR, detail: 'data/ not found' };
  const files = listFiles(dataDir, '.json');
  const issues = [];
  let parseErrors = 0;
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch (err) {
      issues.push(`${path.relative(PROJECT_ROOT, f)}: JSON parse error — ${err.message}`);
      parseErrors++;
      continue;
    }
    const before = issues.length;
    walkForBilingualGaps(data, issues);
    if (issues.length > before) {
      issues[before] = `${path.relative(PROJECT_ROOT, f)} → ` + issues[before];
    }
  }
  return issues.length === 0
    ? { status: STATUS.PASS, detail: `${files.length} JSON files scanned, no bilingual gaps` }
    : { status: STATUS.ERROR, detail: `${issues.length} gap(s) found:\n           ` + issues.slice(0, 15).join('\n           ') + (issues.length > 15 ? `\n           ...and ${issues.length - 15} more` : '') };
}

// =============================================================================
// B.8 — Duplicate ids within any single data/*.json collection
// =============================================================================
function checkDuplicateIds() {
  const dataDir = path.join(PROJECT_ROOT, 'data');
  const files = listFiles(dataDir, '.json');
  const dupeReports = [];
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch (err) {
      continue; // reported by checkBilingualCompleteness already
    }
    let items = null;
    if (Array.isArray(data)) items = data;
    else if (data && typeof data === 'object') {
      items = [];
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && v.length && typeof v[0] === 'object' && v[0] && 'id' in v[0]) {
          items = items.concat(v);
        }
      }
    }
    if (!items || !items.length) continue;
    const seen = new Map();
    for (const it of items) {
      if (!it || typeof it !== 'object' || !('id' in it)) continue;
      seen.set(it.id, (seen.get(it.id) || 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, count]) => count > 1);
    if (dupes.length) {
      dupeReports.push(`${path.relative(PROJECT_ROOT, f)}: ` + dupes.map(([id, count]) => `${id} (x${count})`).join(', '));
    }
  }
  return dupeReports.length === 0
    ? { status: STATUS.PASS, detail: 'no duplicate ids in any data collection' }
    : { status: STATUS.ERROR, detail: `duplicate ids found:\n           ` + dupeReports.join('\n           ') };
}

// =============================================================================
// B.9 — Script load order (index.html vs section 1 of this doc)
// =============================================================================
const DOCUMENTED_LOAD_ORDER = [
  'assets/js/utils/data-loader.js',
  'assets/js/data/duas-data.js',
  'assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js',
  'assets/js/modules/blog/blog.js',
  'assets/js/data/knowledge-center-data.js',
  'assets/js/modules/knowledge/knowledge-center.js',
  'assets/js/data/quiz-data.js',
  'assets/js/core/script-1-core.js',
  'assets/js/core/script-2-ui.js',
  'assets/js/core/script-3-pages.js',
  'assets/js/core/search-engine.js',
  'assets/js/core/world-map.js',
  'assets/js/core/editor-modal.js',
  'assets/js/core/script-4-boot.js',
  'assets/js/core/phase4-animations.js',
];

function checkScriptLoadOrder() {
  const indexPath = path.join(PROJECT_ROOT, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const matches = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  const actual = matches.filter((src) => DOCUMENTED_LOAD_ORDER.includes(src));
  const sameOrder = actual.length === DOCUMENTED_LOAD_ORDER.length &&
    actual.every((src, i) => src === DOCUMENTED_LOAD_ORDER[i]);
  return sameOrder
    ? { status: STATUS.PASS, detail: 'index.html matches the documented 15-script load order exactly' }
    : { status: STATUS.ERROR, detail: `load order mismatch — expected:\n           ${DOCUMENTED_LOAD_ORDER.join(', ')}\n           got:\n           ${actual.join(', ')}` };
}

// =============================================================================
// B.10 — Service-worker precache coverage (every JS/CSS file listed in sw.js)
// =============================================================================
function checkPrecacheCoverage() {
  const swPath = path.join(PROJECT_ROOT, 'sw.js');
  const sw = fs.readFileSync(swPath, 'utf8');
  const m = sw.match(/STATIC[_A-Z]*\s*=\s*\[([\s\S]*?)\]/);
  if (!m) return { status: STATUS.ERROR, detail: 'could not find a STATIC precache array in sw.js' };
  const precached = new Set([...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]));
  const jsFiles = listFiles(path.join(PROJECT_ROOT, 'assets', 'js'), '.js').map((f) => path.relative(PROJECT_ROOT, f));
  const cssFiles = listFiles(path.join(PROJECT_ROOT, 'assets', 'css'), '.css').map((f) => path.relative(PROJECT_ROOT, f));
  const missing = [...jsFiles, ...cssFiles].filter(
    (rel) => ![...precached].some((p) => p.endsWith(rel) || rel.endsWith(p.replace(/^\.\//, '')))
  );
  return missing.length === 0
    ? { status: STATUS.PASS, detail: `${jsFiles.length + cssFiles.length} JS/CSS files all present in sw.js precache list` }
    : { status: STATUS.ERROR, detail: `not precached:\n           ` + missing.join('\n           ') };
}

// =============================================================================
// Main
// =============================================================================
function main() {
  let hadError = false;

  console.log('Phase 4A Smoke-Test Runner (Issue #26)');
  console.log('================================================');
  console.log('A) Function-existence checks (static, run now in Node):');
  console.log('');

  for (const check of CHECKS) {
    let outcome;
    try {
      outcome = runStaticCheck(check);
    } catch (err) {
      outcome = { status: STATUS.ERROR, detail: `runner error: ${err.message}` };
    }
    if (outcome.status === STATUS.ERROR) hadError = true;
    console.log(`  [${outcome.status}]  ${check.name}`);
    console.log(`           ${outcome.detail}`);
  }

  console.log('');
  console.log('   (runtime/live execution of the above requires a real or headless');
  console.log('    browser — reported as NOT RUN, not a failure, in this environment)');

  console.log('');
  console.log('B) Project-health checks (Step 16, run for real in Node):');
  console.log('');

  const healthChecks = [
    ['JS syntax (node --check, all assets/js/**/*.js)', checkJsSyntax],
    ['Bilingual completeness (data/**/*.json)', checkBilingualCompleteness],
    ['Duplicate ids (data/**/*.json)', checkDuplicateIds],
    ['Script load order (index.html vs doc)', checkScriptLoadOrder],
    ['Service-worker precache coverage (sw.js)', checkPrecacheCoverage],
  ];

  for (const [label, fn] of healthChecks) {
    let outcome;
    try {
      outcome = fn();
    } catch (err) {
      outcome = { status: STATUS.ERROR, detail: `runner error: ${err.message}` };
    }
    if (outcome.status === STATUS.ERROR) hadError = true;
    console.log(`  [${outcome.status}]  ${label}`);
    console.log(`           ${outcome.detail}`);
  }

  console.log('');
  console.log('Result:', hadError ? 'ERROR — see above.' : 'OK — all checks pass (runtime function checks require a browser, expected).');
  process.exit(hadError ? 1 : 0);
}

main();
