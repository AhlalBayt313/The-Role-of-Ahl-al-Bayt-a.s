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
// This runner is intended to cover exactly these existing application
// validation functions (see docs/PHASE-4A-TEST-PLAN.md, sections 2 and 15):
//
//   1. validateFamilyTreeData()        — assets/js/modules/ahlul-bayt/ahlul-bayt-unified.js
//   2. window.kcxValidateFeatured()    — assets/js/modules/knowledge/knowledge-center.js
//   3. performSearch()                 — assets/js/core/search-engine.js
//   4. searchKnowledgeCenter()         — assets/js/core/search-engine.js
//   5. data-loader / load-state checks — assets/js/utils/data-loader.js
//                                         (loadJSONSync / loadJSONAsync)
//
// WHY THIS CAN'T *RUN* THOSE FUNCTIONS YET
// -----------------------------------------------------------------------------
// This is a plain Node.js process. It has no `window`, no `document`, no DOM,
// and none of this app's other globals (`state`, `familyTreeDatabase`, the
// in-memory search index, etc.) that these functions depend on. Those globals
// are only built up by loading index.html's scripts, in order, inside a real
// browser (or a headless one). Faking that here would mean either:
//   (a) stubbing out enough of the browser + app state to be misleading
//       ("passing" a test that proves nothing), or
//   (b) pulling in a browser/DOM dependency, which this step explicitly
//       must not do.
// So instead of pretending, every one of the 5 functions above is reported
// honestly as NOT RUN in this environment (see RUNTIME CHECKS below).
//
// WHAT THIS RUNNER *CAN* DO SAFELY, TODAY, IN NODE
// -----------------------------------------------------------------------------
// It can do a read-only STATIC check: confirm that each function this runner
// is supposed to cover still exists (by name) in the source file it's
// documented to live in. This does not execute any application code and
// does not touch/modify any file — it only reads source text with `fs`.
// This is a genuine, useful smoke signal: if one of these functions is ever
// renamed, moved, or accidentally deleted, this check catches that
// immediately, with no browser required.
//
// HOW THIS COULD LATER CONNECT TO A REAL BROWSER ENVIRONMENT
// -----------------------------------------------------------------------------
// None of the following is implemented here — this is documentation only,
// for a future step, and would need explicit sign-off first since it likely
// means adding a headless-browser dependency:
//   - A headless browser (e.g. Playwright/Puppeteer) could load index.html
//     for real, let all 15 scripts execute in their documented order, then
//     call window.validateFamilyTreeData(), window.kcxValidateFeatured(),
//     window.performSearch(q), window.searchKnowledgeCenter(q) directly and
//     inspect their real return values / thrown errors / console output.
//   - Alternatively, a minimal DOM shim (jsdom) could be used to execute the
//     app's scripts without a full browser, at the cost of not being a fully
//     faithful environment.
//   - Either approach would replace the NOT_RUN entries below with real
//     PASS/FAIL results, while the STATIC checks here would remain as a
//     fast first line of defense that runs in plain Node with nothing
//     installed.
//
// USAGE
// -----------------------------------------------------------------------------
//   node tools/phase4a-smoke-test.js
//
// EXIT CODE
// -----------------------------------------------------------------------------
// Exits non-zero ONLY when the runner itself hits a genuine error (e.g. a
// source file it expects to read is missing, or a function documented above
// can no longer be found where it's supposed to be). It exits 0 when checks
// simply report NOT RUN because a browser environment is required — that is
// expected, not a failure.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const STATUS = {
  PASS: 'PASS',
  NOT_RUN: 'NOT RUN',
  ERROR: 'ERROR',
};

// -----------------------------------------------------------------------------
// Registry of checks. Each entry documents ONE existing validation function/
// area this runner is intended to cover, per the list above.
//
//   name           — human-readable label for the summary output
//   file           — path (relative to project root) where it's defined
//   staticPattern  — regex used to confirm the function still exists there
//                    (read-only source-text check; does not execute it)
//   runtimeNote    — why this can't be executed for real in plain Node yet
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Runs the read-only static existence check for one registry entry.
// Only reads a file's text with fs — never requires/executes it.
// Throws on genuine runner problems (e.g. file missing) so the caller can
// tell that apart from "function simply not found".
// -----------------------------------------------------------------------------
function runStaticCheck(check) {
  const fullPath = path.join(PROJECT_ROOT, check.file);
  const source = fs.readFileSync(fullPath, 'utf8'); // throws if file missing/unreadable
  const found = check.staticPattern.test(source);
  return {
    status: found ? STATUS.PASS : STATUS.ERROR,
    detail: found
      ? `found in ${check.file}`
      : `NOT found in ${check.file} — expected pattern did not match`,
  };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
function main() {
  const results = [];
  let runnerHadError = false;

  console.log('Phase 4A Smoke-Test Runner (Issue #26, Step 2)');
  console.log('================================================');
  console.log('Static checks (read-only, run now in Node):');
  console.log('');

  for (const check of CHECKS) {
    let outcome;
    try {
      outcome = runStaticCheck(check);
    } catch (err) {
      // A genuine runner error: e.g. the file itself could not be read.
      outcome = { status: STATUS.ERROR, detail: `runner error: ${err.message}` };
    }
    if (outcome.status === STATUS.ERROR) {
      runnerHadError = true;
    }
    results.push({ name: check.name, ...outcome });
    console.log(`  [${outcome.status}]  ${check.name}`);
    console.log(`           ${outcome.detail}`);
  }

  console.log('');
  console.log('Runtime checks (require a real/headless browser — not run here):');
  console.log('');

  for (const check of CHECKS) {
    results.push({ name: check.name, status: STATUS.NOT_RUN, detail: check.runtimeNote });
    console.log(`  [${STATUS.NOT_RUN}]  ${check.name}`);
    console.log(`           ${check.runtimeNote}`);
  }

  console.log('');
  console.log('Summary');
  console.log('-------');
  const passCount = results.filter((r) => r.status === STATUS.PASS).length;
  const notRunCount = results.filter((r) => r.status === STATUS.NOT_RUN).length;
  const errorCount = results.filter((r) => r.status === STATUS.ERROR).length;
  console.log(`  PASS:    ${passCount}`);
  console.log(`  NOT RUN: ${notRunCount}`);
  console.log(`  ERROR:   ${errorCount}`);
  console.log('');

  if (runnerHadError) {
    console.log('Result: ERROR — one or more expected functions could not be located.');
    process.exit(1);
  } else {
    console.log('Result: OK — static checks passed; runtime checks require a browser (expected).');
    process.exit(0);
  }
}

main();
