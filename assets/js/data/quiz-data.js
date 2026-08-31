// ============================================================================
// quiz-data.js — Islamic Quiz data loader
// ----------------------------------------------------------------------------
// 2026-08-09 update: the quiz question bank was moved out of script-1-core.js
// (where it lived as a small hardcoded `quizQuestions` array) into
// data/quiz/questions.json + data/quiz/categories.json, mirroring the same
// migration already done for duas/ziyarat (duas-data.js) and the Knowledge
// Center (knowledge-center-data.js). See those files' headers for the
// original rationale; the short version: content lives in JSON so it can
// grow without touching JS, and the admin panel can manage it in-app.
//
// 2026-08-11 update (Phase 2 of the sync-XHR migration): both JSON files now
// load via loadJSONAsync() (introduced in Phase 1 for the Blog migration)
// instead of loadJSONSync(), so this ~140KB no longer blocks app boot.
//
// PUBLIC API (unchanged name — nothing elsewhere has to change):
//   quizQuestions   -> array, same shape as before (qBn/qEn/options/correct),
//                      plus new fields every question now carries:
//                      id, category, difficulty, explanationBn/En,
//                      sourceBn/En (source may be an empty string).
//                      SAME array reference for the lifetime of the page —
//                      starts empty, filled in place via push() once the
//                      fetch resolves (mirrors the Blog migration's
//                      `blogPosts` — no consumer needs to re-fetch or
//                      re-bind, since every existing render/answer function
//                      already reads this array by reference at call time).
//
// NEW public data:
//   quizCategories  -> array of {key, icon, bn, en}, same reference/pattern
//                      as quizQuestions above.
//
// NEW public state:
//   quizDataLoadState -> 'loading' | 'loaded' | 'error', so the Quiz page
//                      and the Home "Question of the Day" widget can show
//                      an accurate lightweight message instead of silently
//                      looking empty while data is in flight. Mirrors
//                      `blogPostsLoadState` from the Blog migration.
//
// WHY THIS WAS SAFE TO MIGRATE (recap of the audit): every quiz render/
// answer function (renderQuizPage, quizAnswer, getHomeQuizIndex,
// homeQuizAnswer, startQuiz, startDailyQuiz, ...) reads `quizQuestions`
// inside a function body at call time, never at parse time — no top-level/
// module-scope code anywhere in the app reads quizQuestions or
// quizCategories synchronously at load, the same finding that made the Blog
// migration safe. The ONE spot that needed an explicit guard —
// getHomeQuizIndex()'s `dayOfYear % quizQuestions.length` — is fixed in
// script-1-core.js (see that file) to return a sentinel index instead of
// computing % 0 while the array is still empty.
//
// If either JSON file is missing or fails to parse after retries (e.g. a
// stripped-down deployment, or a flaky connection), quizQuestions/
// quizCategories stay empty arrays so the rest of the app (home quiz
// widget, quiz page, admin editor) degrades gracefully instead of throwing
// — same contract as before, just reached asynchronously now.
// ============================================================================

const __quizFiles = {
  categories: 'data/quiz/categories.json',
  questions: 'data/quiz/questions.json',
};

const quizCategories = [];
const quizQuestions = [];
let quizDataLoadState = 'loading';

(function loadQuizDataAsync() {
  if (typeof loadJSONAsync !== 'function') {
    // Extremely defensive fallback — should never happen since
    // data-loader.js always loads before quiz-data.js (see index.html).
    quizDataLoadState = 'error';
    return;
  }

  Promise.all([
    loadJSONAsync(__quizFiles.categories),
    loadJSONAsync(__quizFiles.questions),
  ]).then(([categoriesList, questionsList]) => {
    const categoriesOk = Array.isArray(categoriesList);
    const questionsOk = Array.isArray(questionsList);

    if (categoriesOk) quizCategories.push(...categoriesList);
    if (questionsOk) quizQuestions.push(...questionsList);

    // Both files load together (Promise.all) so the quiz bank and its
    // category labels never appear half-populated relative to each other.
    quizDataLoadState = (categoriesOk && questionsOk) ? 'loaded' : 'error';

    // Only re-render if the user is currently on a page that reads this
    // data — the Quiz page itself, or the Home page (which shows the
    // "Question of the Day" mini widget). Never trigger a global re-render
    // while the user is elsewhere. Guarded with typeof checks because this
    // callback can in principle fire before every other <script> has
    // finished executing. Mirrors the exact guard used by the Blog
    // migration (assets/js/modules/blog/blog.js).
    if (
      typeof state !== 'undefined' &&
      (state.currentPage === 'quiz' || state.currentPage === 'home') &&
      typeof render === 'function'
    ) {
      render();
    }
  });
})();
